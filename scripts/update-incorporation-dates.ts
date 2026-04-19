import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync } from 'fs';
import * as path from 'path';

interface ExcelCompany {
  'Company Name': string;
  'Company NO': number;
  'Renewal date': number | string;
  [key: string]: any;
}

// Read the Excel file as a buffer
const filePath = path.join(process.cwd(), 'attached_assets/companies in UK _1761149444372.xlsx');
const buffer = readFileSync(filePath);

// Parse the workbook
const workbook = XLSX.read(buffer, { type: 'buffer' });
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const excelData: ExcelCompany[] = XLSX.utils.sheet_to_json(worksheet);

// Function to convert Excel serial date to JavaScript Date
function excelDateToJSDate(excelDate: number): Date {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  const excelEpoch = new Date(1899, 11, 30); // Excel's epoch is December 30, 1899
  return new Date(excelEpoch.getTime() + excelDate * millisecondsPerDay);
}

// Function to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Process each company and prepare update data
const updates: Record<string, any> = {};

excelData.forEach((excelCompany) => {
  const companyName = excelCompany['Company Name'];
  const companyNumber = String(excelCompany['Company NO']);
  const renewalDate = excelCompany['Renewal date'];
  
  // Parse renewal date
  let renewalDateParsed: Date | null = null;
  
  if (typeof renewalDate === 'number') {
    // Excel serial date
    renewalDateParsed = excelDateToJSDate(renewalDate);
  } else if (typeof renewalDate === 'string') {
    // Try to parse string date
    const cleaned = renewalDate.trim();
    renewalDateParsed = new Date(cleaned);
  }
  
  if (renewalDateParsed && !isNaN(renewalDateParsed.getTime())) {
    // The renewal date is the next anniversary
    // To get incorporation date, we need to go back years until we find a date in the past
    // This is tricky without knowing the exact year of incorporation
    
    // For now, let's just store the renewal date info
    updates[companyNumber] = {
      name: companyName,
      number: companyNumber,
      renewalDate: formatDate(renewalDateParsed),
    };
  }
});

console.log('Processed companies:');
console.log(JSON.stringify(updates, null, 2));
console.log('\n\nTo get incorporation dates, we need to use Companies House API.');
console.log('Company numbers:', Object.keys(updates).join(', '));
