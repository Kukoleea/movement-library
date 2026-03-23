import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

import { writeManifestFiles } from './manifest.js';
import { buildDownloadPlan, findExactActionMatch } from './matchers.js';
import { readActionNamesFromWorkbook } from './readWorkbook.js';

const DEFAULT_WORKBOOK = path.resolve('动作库清单.xlsx');
const DEFAULT_OUTPUT_DIR = path.resolve('manifests', 'latest');
const DIRECTORY_URL = 'https://musclewiki.com/zh-cn/directory';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const VIDEO_URL_PATTERN = /https?:\/\/[^\s"'`<>]+?\.(?:mp4|webm|mov|m4v)(?:\?[^\s"'`<>]*)?/gi;

function parseArgs(argv) {
  const options = {
    workbook: DEFAULT_WORKBOOK,
    outputDir: DEFAULT_OUTPUT_DIR,
    headless: true,
    limit: 0,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--workbook') {
      options.workbook = path.resolve(argv[index + 1]);
      index += 1;
    } else if (token === '--output-dir') {
      options.outputDir = path.resolve(argv[index + 1]);
      index += 1;
    } else if (token === '--headed') {
      options.headless = false;
    } else if (token === '--headless') {
      options.headless = true;
    } else if (token === '--limit') {
      options.limit = Number.parseInt(argv[index + 1], 10) || 0;
      index += 1;
    } else if (token === '--help' || token === '-h') {
      options.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return options;
}

function printUsage() {
  console.log(`Usage:
  node src/collect-musclewiki-manifest.js [options]

Options:
  --workbook <path>    Excel workbook path (default: 动作库清单.xlsx)
  --output-dir <path>  Manifest output directory (default: manifests/latest)
  --limit <n>          Only process the first n action names
  --headed             Run Edge with a visible browser window
  --headless           Run headless (default)
  -h, --help           Show this help text`);
}

function normalizeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function toAbsoluteUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).href;
  } catch {
    return null;
  }
}

async function maybeDismissConsent(page) {
  const buttonTexts = ['Accept', 'I agree', '接受', '同意', '允许'];
  for (const label of buttonTexts) {
    const button = page.getByRole('button', { name: label }).first();
    if ((await button.count()) > 0) {
      try {
        await button.click({ timeout: 500 });
        return;
      } catch {
        // Ignore and continue trying other consent buttons.
      }
    }
  }
}

async function collectDirectoryAnchors(page) {
  return page.locator('a[href]').evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      href: anchor.href,
      text: (anchor.textContent || '').replace(/\s+/g, ' ').trim(),
      lines: (anchor.textContent || '')
        .split('\n')
        .map((line) => line.replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    })),
  );
}

async function trySearchInput(page, actionName) {
  const locators = [
    'input[type="search"]',
    'input[placeholder*="搜索"]',
    'input[placeholder*="Search"]',
    'input[name*="search"]',
    'input[aria-label*="搜索"]',
    'input[aria-label*="Search"]',
  ];

  for (const selector of locators) {
    const input = page.locator(selector).first();
    if ((await input.count()) === 0) {
      continue;
    }

    try {
      await input.fill('');
      await input.fill(actionName);
      await page.waitForTimeout(800);
      return true;
    } catch {
      // Try the next selector.
    }
  }

  return false;
}

async function resolveActionMatch(page, actionName) {
  let anchors = await collectDirectoryAnchors(page);
  let match = findExactActionMatch(
    actionName,
    anchors
      .map((anchor) => {
        const exactLine = anchor.lines.find((line) => normalizeText(line) === actionName);
        const exactText = normalizeText(anchor.text) === actionName ? actionName : null;
        const label = exactLine ?? exactText;
        if (!label) {
          return null;
        }
        return {
          label,
          href: anchor.href,
        };
      })
      .filter(Boolean),
  );

  if (match) {
    return match;
  }

  const searched = await trySearchInput(page, actionName);
  if (!searched) {
    return null;
  }

  anchors = await collectDirectoryAnchors(page);
  match = findExactActionMatch(
    actionName,
    anchors
      .map((anchor) => {
        const exactLine = anchor.lines.find((line) => normalizeText(line) === actionName);
        const exactText = normalizeText(anchor.text) === actionName ? actionName : null;
        const label = exactLine ?? exactText;
        if (!label) {
          return null;
        }
        return {
          label,
          href: anchor.href,
        };
      })
      .filter(Boolean),
  );

  return match;
}

async function extractVideoUrls(page) {
  const discovered = await page.evaluate(() => {
    const values = new Set();

    const push = (value) => {
      if (!value) {
        return;
      }
      try {
        values.add(new URL(value, window.location.href).href);
      } catch {
        // Ignore invalid URLs.
      }
    };

    document.querySelectorAll('video[src], video source[src], source[src]').forEach((node) => {
      push(node.getAttribute('src'));
    });

    document.querySelectorAll('a[href]').forEach((node) => {
      const href = node.getAttribute('href') || '';
      if (/\.(mp4|webm|mov|m4v)(\?|$)/i.test(href)) {
        push(href);
      }
    });

    document.querySelectorAll('script').forEach((node) => {
      const text = node.textContent || '';
      const matches = text.match(/https?:\/\/[^\s"'`<>]+?\.(mp4|webm|mov|m4v)(\?[^\s"'`<>]*)?/gi) || [];
      matches.forEach(push);
    });

    return [...values];
  });

  if (discovered.length > 0) {
    return discovered;
  }

  const html = await page.content();
  return [...new Set(html.match(VIDEO_URL_PATTERN) || [])];
}

async function ensureOutputDir(outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
}

async function appendRunLog(outputDir, entry) {
  const logPath = path.join(outputDir, 'collection.log');
  await fs.appendFile(logPath, `${JSON.stringify(entry)}\n`, 'utf8');
}

async function collectManifest(options) {
  const browser = await chromium.launch({
    headless: options.headless,
    channel: 'msedge',
    executablePath: EDGE_PATH,
  });

  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  const actionNames = await readActionNamesFromWorkbook(options.workbook);
  const selectedNames =
    options.limit > 0 ? actionNames.slice(0, options.limit) : actionNames;
  const successes = [];
  const failures = [];

  await ensureOutputDir(options.outputDir);

  try {
    for (const actionName of selectedNames) {
      console.log(`Processing: ${actionName}`);
      await page.goto(DIRECTORY_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(1500);
      await maybeDismissConsent(page);

      const match = await resolveActionMatch(page, actionName);
      if (!match?.href) {
        const failure = { actionName, reason: 'No exact match found' };
        failures.push(failure);
        await appendRunLog(options.outputDir, { type: 'failure', ...failure });
        continue;
      }

      await page.goto(match.href, { waitUntil: 'domcontentloaded', timeout: 120000 });
      await page.waitForTimeout(1500);
      const videoUrls = await extractVideoUrls(page);

      if (videoUrls.length === 0) {
        const failure = { actionName, reason: 'Matched action page has no video URLs' };
        failures.push(failure);
        await appendRunLog(options.outputDir, {
          type: 'failure',
          actionName,
          actionPageUrl: match.href,
          reason: failure.reason,
        });
        continue;
      }

      const downloads = buildDownloadPlan(actionName, videoUrls);
      const success = {
        actionName,
        actionPageUrl: match.href,
        videoUrls,
        downloads,
      };
      successes.push(success);
      await appendRunLog(options.outputDir, {
        type: 'success',
        actionName,
        actionPageUrl: match.href,
        videoCount: videoUrls.length,
      });
    }
  } finally {
    await context.close();
    await browser.close();
  }

  await writeManifestFiles(options.outputDir, { successes, failures });
  return { successes, failures };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  const result = await collectManifest(options);
  console.log(
    JSON.stringify(
      {
        outputDir: options.outputDir,
        successCount: result.successes.length,
        failureCount: result.failures.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
