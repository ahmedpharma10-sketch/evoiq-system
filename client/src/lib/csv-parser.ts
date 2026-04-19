import { z } from "zod";
import { insertCompanySchema } from "@shared/schema";
import type { InsertCompany } from "@shared/schema";

interface ParsedCSVRow {
  rowIndex: number;
  data: Partial<InsertCompany>;
  isValid: boolean;
  errors: Array<{ field: string; message: string }>;
}

/**
 * Parse CSV line with proper handling of quoted fields and escaped quotes
 * Based on the server-side parseCSVLine function
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Convert "Yes"/"No" to boolean
 */
function toBoolean(value: string | undefined): boolean | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase().trim();
  if (lower === 'yes') return true;
  if (lower === 'no') return false;
  return undefined;
}

/**
 * Parse array fields separated by semicolon + space
 */
function parseArrayField(value: string | undefined): string[] {
  if (!value || value.trim().length === 0) return [];
  return value.split(';').map(item => item.trim()).filter(item => item.length > 0);
}

/**
 * Parse email array - handles both comma and semicolon separated values
 */
function parseEmailArray(value: string | undefined): string[] {
  if (!value || value.trim().length === 0) return [];
  // Split by either comma or semicolon
  const emails = value.split(/[,;]/).map(item => item.trim()).filter(item => item.length > 0);
  return emails;
}

/**
 * Parse phone array - handles both comma and semicolon separated values
 */
function parsePhoneArray(value: string | undefined): string[] {
  if (!value || value.trim().length === 0) return [];
  // Split by either comma or semicolon
  const phones = value.split(/[,;]/).map(item => item.trim()).filter(item => item.length > 0);
  return phones;
}

/**
 * Parse CSV export format into company records
 * CSV structure (40 columns):
 * 1. Company Name
 * 2. Company Number
 * 3. Address
 * 4. Incorporation Date (YYYY-MM-DD)
 * 5. Industry Code
 * 6. Active Status
 * 7. Directors (semicolon-separated)
 * 8. Officers (semicolon-separated)
 * 9. PSCs
 * 10. Previous Names
 * 11. Internal Code
 * 12. UTR
 * 13. Government Gateway
 * 14. Owner Name
 * 15. Owner Emails
 * 16. Owner Phones
 * 17. Companies House Link
 * 18. Google Drive Link (REQUIRED)
 * 19. PSC Link
 * 20. Shareholders Link
 * 21. Director Link
 * 22. Vendor Name
 * 23. Renewal Date
 * 24. Renewal Fees
 * 25. Auth Code
 * 26. Shareholders
 * 27. Company Status
 * 28. Company Type
 * 29. Jurisdiction
 * 30. Has Charges
 * 31. Has Insolvency
 * 32. Confirmation Statement Due
 * 33. Accounts Due
 * 34. Last Accounts Date
 * 35. Confirmation Statement Last Made
 * 36. Last Sync Date
 * 37. Sync Status
 * 38. Number of Charges (ignored)
 * 39. Number of Insolvency Cases (ignored)
 * 40. Number of Filings (ignored)
 */
export function parseCompaniesCSV(csvText: string): ParsedCSVRow[] {
  const lines = csvText.split('\n');
  const results: ParsedCSVRow[] = [];

  // Skip header row
  const startRow = lines[0].toLowerCase().includes('company name') ? 1 : 0;

  for (let rowNum = startRow; rowNum < lines.length; rowNum++) {
    const line = lines[rowNum].trim();

    // Skip empty lines
    if (!line) continue;

    try {
      const values = parseCSVLine(line);

      // Skip if row doesn't have minimum required columns
      if (values.length < 18) {
        results.push({
          rowIndex: rowNum + 1,
          data: {},
          isValid: false,
          errors: [{ field: 'row', message: 'Row has insufficient columns' }],
        });
        continue;
      }

      // Map CSV columns to schema fields
      const data: Partial<InsertCompany> = {
        name: values[0] || '',
        number: values[1] || '',
        address: values[2] || undefined,
        incorporationDate: values[3] || undefined,
        industryCode: values[4] || undefined,
        isActive: toBoolean(values[5]) ?? true,
        psc: values[8] || undefined,
        internalCode: values[10] || undefined,
        utr: values[11] || undefined,
        governmentGateway: values[12] || undefined,
        ownerName: values[13] || undefined,
        ownerEmails: parseEmailArray(values[14]),
        ownerPhones: parsePhoneArray(values[15]),
        companiesHouseLink: values[16] || undefined,
        googleDriveLink: values[17] || '',
        pscLink: values[18] || undefined,
        shareholdersLink: values[19] || undefined,
        directorLink: values[20] || undefined,
        vendorName: values[21] || undefined,
        renewalDate: values[22] || undefined,
        authCode: values[24] || undefined,
        shareholders: values[25] || undefined,
        companyStatus: values[26] || undefined,
        companyType: values[27] || undefined,
        jurisdiction: values[28] || undefined,
        hasCharges: toBoolean(values[29]),
        hasInsolvency: toBoolean(values[30]),
        confirmationStatementDue: values[31] || undefined,
        accountsDue: values[32] || undefined,
        lastAccountsDate: values[33] || undefined,
        confirmationStatementLastMade: values[34] || undefined,
        lastSyncDate: values[35] || undefined,
        syncStatus: (values[36] as 'never' | 'success' | 'partial' | 'error' | undefined) || 'never',
      };

      // Handle renewal fees (column 24)
      if (values[23] && values[23].trim().length > 0) {
        data.hasRenewalFees = true;
        data.renewalFees = values[23];
      } else {
        data.hasRenewalFees = false;
      }

      // Parse directors as semicolon-separated names (store as simple string for now)
      const directorNames = parseArrayField(values[6]);
      if (directorNames.length > 0) {
        data.director = directorNames.join('; ');
      }

      // Parse officers as semicolon-separated names
      const officerNames = parseArrayField(values[7]);
      // Note: officers field is an array of director objects in schema, but CSV has simple strings
      // Store as legacy field for now
      if (officerNames.length > 0) {
        // Will be handled in form if needed
      }

      // Validate against schema
      const validationResult = insertCompanySchema.safeParse(data);

      if (validationResult.success) {
        results.push({
          rowIndex: rowNum + 1,
          data: validationResult.data,
          isValid: true,
          errors: [],
        });
      } else {
        const errors = validationResult.error.errors.map(err => ({
          field: err.path.join('.') || 'unknown',
          message: err.message,
        }));

        results.push({
          rowIndex: rowNum + 1,
          data,
          isValid: false,
          errors,
        });
      }
    } catch (error) {
      results.push({
        rowIndex: rowNum + 1,
        data: {},
        isValid: false,
        errors: [
          {
            field: 'parsing',
            message: `Failed to parse row: ${error instanceof Error ? error.message : 'Unknown error'}`,
          },
        ],
      });
    }
  }

  return results;
}

/**
 * Validate a single company record
 */
export function validateCompany(data: Partial<InsertCompany>): { isValid: boolean; errors: Array<{ field: string; message: string }> } {
  const result = insertCompanySchema.safeParse(data);

  if (result.success) {
    return { isValid: true, errors: [] };
  } else {
    return {
      isValid: false,
      errors: result.error.errors.map(err => ({
        field: err.path.join('.') || 'unknown',
        message: err.message,
      })),
    };
  }
}
