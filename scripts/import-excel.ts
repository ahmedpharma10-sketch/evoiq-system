import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Read the Excel file
const filePath = path.join(process.cwd(), 'attached_assets', 'companies in UK _1761140417092.xlsx');
const workbook = XLSX.readFile(filePath);

// Get the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Sheet Name:', sheetName);
console.log('Total rows:', data.length);
console.log('\nFirst row (sample):');
console.log(JSON.stringify(data[0], null, 2));
console.log('\nAll column names:');
if (data.length > 0) {
  console.log(Object.keys(data[0]));
}
console.log('\nFirst 3 rows:');
console.log(JSON.stringify(data.slice(0, 3), null, 2));
