import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import * as path from 'path';

// Read the Excel file as a buffer
const filePath = path.join(process.cwd(), 'attached_assets/companies in UK _1761149444372.xlsx');
const buffer = readFileSync(filePath);

// Parse the workbook
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

// Display the data
console.log(JSON.stringify(data, null, 2));
