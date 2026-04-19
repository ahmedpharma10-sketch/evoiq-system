import XLSX from 'xlsx';
import * as path from 'path';
import { randomBytes } from 'crypto';
import * as fs from 'fs';

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

// Clean up text fields
function cleanText(text: any): string {
  if (!text) return '';
  return String(text).trim().replace(/\r\n/g, ', ').replace(/\n/g, ', ').replace(/\r/g, ', ');
}

// Map Excel data to our company schema
const companies = data.map((row: any) => ({
  id: generateId(),
  name: cleanText(row['Company Name']) || '',
  number: String(row['Company NO']) || '',
  address: '', 
  incorporationDate: '', 
  industryCode: '', 
  director: cleanText(row['Director']) || '',
  psc: cleanText(row['psc']) || '',
  internalCode: cleanText(row['Auth. Code']) || '',
  utr: '', 
  governmentGateway: '', 
  ownerName: cleanText(row['Company owner']) || '',
  ownerEmail: '', 
  ownerPhone: '', 
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

// Write to a JSON file that can be imported
const outputPath = path.join(process.cwd(), 'client', 'src', 'data', 'imported-companies.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(companies, null, 2));

console.log(`✅ Successfully exported ${companies.length} companies to ${outputPath}`);
console.log('\nCompanies:');
companies.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.name} (${c.number})`);
});
