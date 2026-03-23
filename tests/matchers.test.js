import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDownloadPlan,
  findExactActionMatch,
} from '../src/matchers.js';

test('findExactActionMatch returns only exact label matches', () => {
  const match = findExactActionMatch('深蹲', [
    { label: '深蹲', href: '/squat' },
    { label: '杠铃深蹲', href: '/barbell-squat' },
  ]);

  const noMatch = findExactActionMatch('卧推', [
    { label: '上斜卧推', href: '/incline-bench-press' },
  ]);

  assert.deepEqual(match, { label: '深蹲', href: '/squat' });
  assert.equal(noMatch, null);
});

test('buildDownloadPlan preserves the excel name and adds index suffixes', () => {
  const plan = buildDownloadPlan('深蹲', [
    'https://cdn.example.com/clip-1.mp4',
    'https://cdn.example.com/clip-2.webm',
  ]);

  assert.deepEqual(plan, [
    {
      actionName: '深蹲',
      videoUrl: 'https://cdn.example.com/clip-1.mp4',
      fileName: '深蹲_1.mp4',
      index: 1,
    },
    {
      actionName: '深蹲',
      videoUrl: 'https://cdn.example.com/clip-2.webm',
      fileName: '深蹲_2.webm',
      index: 2,
    },
  ]);
});
