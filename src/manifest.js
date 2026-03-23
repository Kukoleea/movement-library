import fs from 'node:fs/promises';
import path from 'node:path';

function escapeCsv(value) {
  const text = String(value ?? '');
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function buildSuccessCsv(successes) {
  const header = [
    'actionName',
    'actionPageUrl',
    'videoIndex',
    'videoUrl',
    'fileName',
  ];
  const lines = [header.join(',')];

  for (const success of successes) {
    for (const download of success.downloads) {
      lines.push(
        [
          success.actionName,
          success.actionPageUrl,
          download.index,
          download.videoUrl,
          download.fileName,
        ]
          .map(escapeCsv)
          .join(','),
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

export async function writeManifestFiles(outputDir, payload) {
  await fs.mkdir(outputDir, { recursive: true });

  const successJsonPath = path.join(outputDir, 'success-manifest.json');
  const failureJsonPath = path.join(outputDir, 'failure-manifest.json');
  const successCsvPath = path.join(outputDir, 'success-manifest.csv');

  await fs.writeFile(
    successJsonPath,
    JSON.stringify({ successes: payload.successes }, null, 2),
    'utf8',
  );
  await fs.writeFile(
    failureJsonPath,
    JSON.stringify({ failures: payload.failures }, null, 2),
    'utf8',
  );
  await fs.writeFile(successCsvPath, buildSuccessCsv(payload.successes), 'utf8');
}
