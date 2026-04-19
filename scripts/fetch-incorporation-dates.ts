import * as XLSX from 'xlsx';
import { readFileSync } from 'fs';
import * as path from 'path';

interface ExcelCompany {
  'Company Name': string;
  'Company NO': number;
  [key: string]: any;
}

interface CompanyUpdate {
  name: string;
  number: string;
  incorporationDate: string | null;
  status: 'success' | 'error';
  error?: string;
}

// Read the Excel file
const filePath = path.join(process.cwd(), 'attached_assets/companies in UK _1761149444372.xlsx');
const buffer = readFileSync(filePath);
const workbook = XLSX.read(buffer, { type: 'buffer' });
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const excelData: ExcelCompany[] = XLSX.utils.sheet_to_json(worksheet);

// Function to fetch company data from Companies House API
async function fetchIncorporationDate(companyNumber: string): Promise<string | null> {
  const paddedNumber = String(companyNumber).padStart(8, '0');
  const url = `https://api.company-information.service.gov.uk/company/${paddedNumber}`;
  
  try {
    // The Companies House API requires basic auth with just the API key as username
    // For public data, we can try without auth first
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.date_of_creation || null;
  } catch (error) {
    console.error(`Error fetching ${paddedNumber}:`, error);
    return null;
  }
}

// Function to delay between requests (rate limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Main function
async function main() {
  const updates: CompanyUpdate[] = [];
  
  console.log(`Processing ${excelData.length} companies...\n`);
  
  for (let i = 0; i < excelData.length; i++) {
    const company = excelData[i];
    const companyNumber = String(company['Company NO']);
    const companyName = company['Company Name'];
    
    console.log(`[${i + 1}/${excelData.length}] Fetching ${companyName} (${companyNumber})...`);
    
    const incorporationDate = await fetchIncorporationDate(companyNumber);
    
    if (incorporationDate) {
      updates.push({
        name: companyName,
        number: companyNumber,
        incorporationDate,
        status: 'success'
      });
      console.log(`  ✓ Incorporation Date: ${incorporationDate}`);
    } else {
      updates.push({
        name: companyName,
        number: companyNumber,
        incorporationDate: null,
        status: 'error',
        error: 'Failed to fetch'
      });
      console.log(`  ✗ Failed to fetch`);
    }
    
    // Rate limiting: wait 100ms between requests (well below 600/5min limit)
    if (i < excelData.length - 1) {
      await delay(100);
    }
  }
  
  console.log('\n\n=== SUMMARY ===');
  console.log(`Total companies: ${updates.length}`);
  console.log(`Successful: ${updates.filter(u => u.status === 'success').length}`);
  console.log(`Failed: ${updates.filter(u => u.status === 'error').length}`);
  
  console.log('\n\n=== INCORPORATION DATES ===');
  updates.filter(u => u.status === 'success').forEach(u => {
    console.log(`${u.name} (${u.number}): ${u.incorporationDate}`);
  });
  
  // Export as JSON for importing
  const jsonOutput = updates
    .filter(u => u.status === 'success')
    .map(u => ({
      companyNumber: u.number,
      companyName: u.name,
      incorporationDate: u.incorporationDate
    }));
  
  console.log('\n\n=== JSON OUTPUT ===');
  console.log(JSON.stringify(jsonOutput, null, 2));
}

main().catch(console.error);
