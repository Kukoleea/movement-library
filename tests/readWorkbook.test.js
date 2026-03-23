import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import XLSX from 'xlsx';

import { readActionNamesFromWorkbook } from '../src/readWorkbook.js';

test('readActionNamesFromWorkbook reads trimmed unique names from column B', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'musclewiki-workbook-'));
  const workbookPath = path.join(tempDir, 'actions.xlsx');

  const sheet = XLSX.utils.aoa_to_sheet([
    ['编号', '动作库名', '备注'],
    [1, ' 深蹲 ', 'x'],
    [2, '硬拉', 'y'],
    [3, '', 'blank'],
    [4, '硬拉', 'duplicate'],
    [5, null, 'null'],
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  XLSX.writeFile(workbook, workbookPath);

  const actionNames = await readActionNamesFromWorkbook(workbookPath);

  assert.deepEqual(actionNames, ['深蹲', '硬拉']);
});
