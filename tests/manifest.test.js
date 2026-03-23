import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { writeManifestFiles } from '../src/manifest.js';

test('writeManifestFiles writes success and failure manifests', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'musclewiki-manifest-'));
  const payload = {
    successes: [
      {
        actionName: '深蹲',
        actionPageUrl: 'https://musclewiki.com/zh-cn/deep-squat',
        videoUrls: ['https://cdn.example.com/squat-1.mp4'],
        downloads: [
          {
            actionName: '深蹲',
            videoUrl: 'https://cdn.example.com/squat-1.mp4',
            fileName: '深蹲_1.mp4',
            index: 1,
          },
        ],
      },
    ],
    failures: [{ actionName: '硬拉', reason: 'No exact match found' }],
  };

  await writeManifestFiles(tempDir, payload);

  const successJson = JSON.parse(
    fs.readFileSync(path.join(tempDir, 'success-manifest.json'), 'utf8'),
  );
  const failureJson = JSON.parse(
    fs.readFileSync(path.join(tempDir, 'failure-manifest.json'), 'utf8'),
  );
  const successCsv = fs.readFileSync(
    path.join(tempDir, 'success-manifest.csv'),
    'utf8',
  );

  assert.equal(successJson.successes[0].downloads[0].fileName, '深蹲_1.mp4');
  assert.equal(failureJson.failures[0].actionName, '硬拉');
  assert.match(successCsv, /深蹲/);
  assert.match(successCsv, /深蹲_1\.mp4/);
});
