import XLSX from 'xlsx';

export async function readActionNamesFromWorkbook(workbookPath) {
  const workbook = XLSX.readFile(workbookPath);
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: false,
    defval: '',
  });

  const uniqueNames = new Set();

  for (const row of rows.slice(1)) {
    const actionName = String(row[1] ?? '').trim();
    if (actionName) {
      uniqueNames.add(actionName);
    }
  }

  return [...uniqueNames];
}
