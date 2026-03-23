import process from 'node:process';
import { chromium } from 'playwright';

const DIRECTORY_URL = 'https://musclewiki.com/zh-cn/directory';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const actionName = process.argv[2] ?? '';

const browser = await chromium.launch({
  headless: true,
  channel: 'msedge',
  executablePath: EDGE_PATH,
});

const context = await browser.newContext();
const page = await context.newPage();
const responses = [];

page.on('response', async (response) => {
  const request = response.request();
  const resourceType = request.resourceType();
  if (!['fetch', 'xhr', 'document', 'script'].includes(resourceType)) {
    return;
  }

  responses.push({
    url: response.url(),
    status: response.status(),
    resourceType,
  });
});

await page.goto(DIRECTORY_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForTimeout(3000);

if (actionName) {
  const searchInput = page.locator('input[placeholder="搜索"], input[name="desktopSearch"]').first();
  if ((await searchInput.count()) > 0) {
    await searchInput.fill(actionName);
    await searchInput.press('Enter');
    await page.waitForTimeout(1500);
  }
}

const payload = await page.evaluate((targetName) => {
  const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

  const inputs = Array.from(document.querySelectorAll('input, textarea')).map((node) => ({
    tag: node.tagName.toLowerCase(),
    type: node.getAttribute('type'),
    placeholder: node.getAttribute('placeholder'),
    ariaLabel: node.getAttribute('aria-label'),
    name: node.getAttribute('name'),
  }));

  const anchors = Array.from(document.querySelectorAll('a[href]')).map((node) => ({
    href: node.href,
    text: normalize(node.textContent),
  }));

  const interactiveSample = Array.from(
    document.querySelectorAll('a[href], button, [role="button"], [role="link"]'),
  )
    .map((node) => ({
      tag: node.tagName.toLowerCase(),
      href: node.href || null,
      role: node.getAttribute('role'),
      text: normalize(node.textContent),
    }))
    .filter((node) => node.text)
    .slice(0, 80);

  const partialMatches = anchors.filter((anchor) =>
    targetName ? anchor.text.toLowerCase().includes(targetName.toLowerCase()) : false,
  );

  return {
    title: document.title,
    url: window.location.href,
    inputCount: inputs.length,
    inputs,
    anchorCount: anchors.length,
    anchorSample: anchors.filter((anchor) => anchor.text).slice(0, 50),
    interactiveSample,
    partialMatches: partialMatches.slice(0, 20),
    bodySnippet: normalize(document.body.innerText).slice(0, 2000),
  };
}, actionName);

payload.networkSample = responses.slice(0, 80);

console.log(JSON.stringify(payload, null, 2));

await context.close();
await browser.close();
