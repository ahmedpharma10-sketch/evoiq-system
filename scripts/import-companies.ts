import XLSX from 'xlsx';
import * as path from 'path';
import { randomBytes } from 'crypto';

// Simple UUID generator
function generateId(): string {
  return randomBytes(16).toString('hex');
}

// Read the Excel file
const filePath = path.join(process.cwd(), 'attached_assets', 'companies in UK _1761140417092.xlsx');
const workbook = XLSX.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`Found ${data.length} companies in Excel file\n`);

// Convert Excel serial date to YYYY-MM-DD format
function excelSerialToDate(serial: number): string {
  if (!serial || isNaN(serial)) return '';
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  const year = date_info.getFullYear();
  const month = String(date_info.getMonth() + 1).padStart(2, '0');
  const day = String(date_info.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Clean up text fields (remove extra whitespace, newlines, carriage returns)
function cleanText(text: any): string {
  if (!text) return '';
  return String(text).trim().replace(/\r\n/g, ', ').replace(/\n/g, ', ').replace(/\r/g, ', ');
}

// Map Excel data to our company schema
const companies = data.map((row: any) => ({
  id: generateId(),
  name: cleanText(row['Company Name']) || '',
  number: String(row['Company NO']) || '',
  address: '', // Not in Excel
  incorporationDate: '', // Not in Excel, could estimate from renewal date
  industryCode: '', // Not in Excel
  director: cleanText(row['Director']) || '',
  psc: cleanText(row['psc']) || '',
  internalCode: cleanText(row['Auth. Code']) || '',
  utr: '', // Not in Excel
  governmentGateway: '', // Not in Excel
  ownerName: cleanText(row['Company owner']) || '',
  ownerEmail: '', // Not in Excel
  ownerPhone: '', // Not in Excel
  // Additional fields from Excel
  companiesHouseLink: cleanText(row['Companies house link']) || '',
  googleDriveLink: cleanText(row['Company link on Google Drive']) || '',
  vendorName: cleanText(row['Vendor Name']) || '',
  renewalDate: row['Renewal date'] ? excelSerialToDate(row['Renewal date']) : '',
  renewalFees: cleanText(row['Renewal fees (GBP)']) || '',
  authCode: cleanText(row['Auth. Code']) || '',
  pscLink: cleanText(row['psc link']) || '',
  shareholders: cleanText(row['shareholders']) || '',
  shareholdersLink: cleanText(row['shareholders link']) || '',
  directorLink: cleanText(row['Director link']) || '',
}));

// Output as JSON for import
console.log(JSON.stringify(companies, null, 2));
console.log(`\n✅ Successfully mapped ${companies.length} companies`);
console.log('\nSample company:');
console.log(JSON.stringify(companies[0], null, 2));
