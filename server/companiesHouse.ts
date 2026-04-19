/**
 * Companies House API Service
 * Modular service for fetching comprehensive company data from Companies House UK API
 */

import type { 
  Director, 
  PSC, 
  PreviousName, 
  Charge, 
  Insolvency, 
  FilingHistory,
  DocumentMetadata 
} from "@shared/schema";

const BASE_URL = "https://api.company-information.service.gov.uk";

interface CompaniesHouseAuth {
  apiKey: string;
}

/**
 * Get authorization header for Companies House API
 */
function getAuthHeader(auth: CompaniesHouseAuth): string {
  const trimmedApiKey = auth.apiKey.trim();
  return `Basic ${Buffer.from(trimmedApiKey + ":").toString("base64")}`;
}

/**
 * Clean and pad UK company number to 8 characters
 */
export function cleanAndPadCompanyNumber(companyNumber: string): string {
  let cleanNumber = companyNumber.replace(/\s/g, "").toUpperCase();
  
  if (cleanNumber.length < 8) {
    const prefixMatch = cleanNumber.match(/^([A-Z]{1,2})(\d+)$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const numericPart = prefixMatch[2];
      const targetLength = 8 - prefix.length;
      cleanNumber = prefix + numericPart.padStart(targetLength, '0');
    } else if (/^\d+$/.test(cleanNumber)) {
      cleanNumber = cleanNumber.padStart(8, '0');
    }
  }
  
  return cleanNumber;
}

/**
 * Format Companies House address object to string
 */
function formatAddress(addr: any): string {
  if (!addr) return "";
  const addressParts = [
    addr.address_line_1,
    addr.address_line_2,
    addr.locality,
    addr.region,
    addr.postal_code,
    addr.country
  ].filter(Boolean);
  return addressParts.join(", ");
}

/**
 * Fetch company profile data
 */
export async function fetchCompanyProfile(companyNumber: string, auth: CompaniesHouseAuth) {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(auth),
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Company ${cleanNumber} not found in Companies House`);
    }
    throw new Error(`Companies House API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return {
    name: data.company_name,
    number: cleanNumber,
    address: formatAddress(data.registered_office_address),
    incorporationDate: data.date_of_creation,
    industryCode: data.sic_codes?.join(", ") || "",
    companyStatus: data.company_status,
    companyType: data.type,
    jurisdiction: data.jurisdiction,
    hasCharges: data.has_charges === true,
    hasInsolvency: data.has_insolvency_history === true,
    confirmationStatementDue: data.confirmation_statement?.next_due,
    confirmationStatementLastMade: data.confirmation_statement?.last_made_up_to,
    accountsDue: data.accounts?.next_due,
    lastAccountsDate: data.accounts?.last_accounts?.made_up_to,
    companiesHouseLink: `https://find-and-update.company-information.service.gov.uk/company/${cleanNumber}`,
    previousNames: [] as PreviousName[], // Will be populated if data exists
  };
}

/**
 * Fetch company officers (directors and other officers)
 */
export async function fetchOfficers(companyNumber: string, auth: CompaniesHouseAuth): Promise<Director[]> {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/officers`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth),
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch officers for ${cleanNumber}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((officer: any): Director => ({
      name: officer.name || "",
      officerRole: officer.officer_role,
      appointedOn: officer.appointed_on,
      resignedOn: officer.resigned_on,
      nationality: officer.nationality,
      occupation: officer.occupation,
      countryOfResidence: officer.country_of_residence,
      address: formatAddress(officer.address),
    }));
  } catch (error) {
    console.error(`Error fetching officers for ${cleanNumber}:`, error);
    return [];
  }
}

/**
 * Fetch Persons with Significant Control (PSC)
 */
export async function fetchPSC(companyNumber: string, auth: CompaniesHouseAuth): Promise<PSC[]> {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/persons-with-significant-control`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth),
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch PSC for ${cleanNumber}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((psc: any): PSC => ({
      name: psc.name || (psc.name_elements?.forename && psc.name_elements?.surname ? `${psc.name_elements.forename} ${psc.name_elements.surname}` : ""),
      kind: psc.kind,
      naturesOfControl: psc.natures_of_control || [],
      notifiedOn: psc.notified_on,
      ceasedOn: psc.ceased_on,
      nationality: psc.nationality,
      countryOfResidence: psc.country_of_residence,
      address: formatAddress(psc.address),
    }));
  } catch (error) {
    console.error(`Error fetching PSC for ${cleanNumber}:`, error);
    return [];
  }
}

/**
 * Fetch filing history
 */
export async function fetchFilingHistory(
  companyNumber: string, 
  auth: CompaniesHouseAuth,
  limit: number = 25
): Promise<FilingHistory[]> {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/filing-history?items_per_page=${limit}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth),
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch filing history for ${cleanNumber}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((filing: any): FilingHistory => ({
      transactionId: filing.transaction_id,
      category: filing.category,
      date: filing.date,
      type: filing.type,
      description: filing.description,
      actionDate: filing.action_date,
      paperFiled: filing.paper_filed,
      barcode: filing.barcode,
      pages: filing.pages,
      links: {
        self: filing.links?.self,
        documentMetadata: filing.links?.document_metadata,
      },
    }));
  } catch (error) {
    console.error(`Error fetching filing history for ${cleanNumber}:`, error);
    return [];
  }
}

/**
 * Fetch charges (mortgages and debentures)
 */
export async function fetchCharges(companyNumber: string, auth: CompaniesHouseAuth): Promise<Charge[]> {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/charges`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth),
      },
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch charges for ${cleanNumber}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((charge: any): Charge => ({
      chargeNumber: charge.charge_number?.toString(),
      createdOn: charge.created_on,
      deliveredOn: charge.delivered_on,
      status: charge.status,
      assetsCeasedReleased: charge.assets_ceased_released,
      personsEntitled: charge.persons_entitled?.map((p: any) => p.name) || [],
      transactions: charge.transactions?.map((t: any) => t.filing_type) || [],
      particulars: charge.particulars?.description,
    }));
  } catch (error) {
    console.error(`Error fetching charges for ${cleanNumber}:`, error);
    return [];
  }
}

/**
 * Fetch insolvency history
 */
export async function fetchInsolvency(companyNumber: string, auth: CompaniesHouseAuth): Promise<Insolvency[]> {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/insolvency`;
  
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth),
      },
    });
    
    if (!response.ok) {
      // Insolvency endpoint returns 404 if no insolvency history
      if (response.status === 404) {
        return [];
      }
      console.error(`Failed to fetch insolvency for ${cleanNumber}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    if (!Array.isArray(data.cases)) {
      return [];
    }

    return data.cases.map((insolvency: any): Insolvency => ({
      caseNumber: insolvency.number?.toString(),
      type: insolvency.type,
      date: insolvency.dates?.wound_up_on || insolvency.dates?.concluded_winding_up_on,
      practitioners: insolvency.practitioners?.map((p: any) => p.name) || [],
    }));
  } catch (error) {
    console.error(`Error fetching insolvency for ${cleanNumber}:`, error);
    return [];
  }
}

/**
 * Fetch all comprehensive company data
 */
export async function fetchComprehensiveData(companyNumber: string, auth: CompaniesHouseAuth) {
  const profile = await fetchCompanyProfile(companyNumber, auth);
  
  console.log(`[Companies House] Fetching comprehensive data for ${companyNumber}`);
  
  // Fetch all additional data in parallel
  const [officers, pscs, filings, charges, insolvencyHistory] = await Promise.all([
    fetchOfficers(companyNumber, auth),
    fetchPSC(companyNumber, auth),
    fetchFilingHistory(companyNumber, auth, 25),
    fetchCharges(companyNumber, auth),
    fetchInsolvency(companyNumber, auth),
  ]);

  console.log(`[Companies House] Fetched data counts:`, {
    officers: officers.length,
    pscs: pscs.length,
    filings: filings.length,
    charges: charges.length,
    insolvency: insolvencyHistory.length
  });

  // Separate active and resigned officers
  const activeOfficers = officers.filter(o => !o.resignedOn);
  const directors = activeOfficers.filter(o => 
    o.officerRole?.toLowerCase().includes('director')
  );

  // Extract active PSCs
  const activePSCs = pscs.filter(p => !p.ceasedOn);

  console.log(`[Companies House] Filtered counts:`, {
    activeOfficers: activeOfficers.length,
    directors: directors.length,
    activePSCs: activePSCs.length
  });

  // Legacy director and PSC text fields for backward compatibility
  const directorText = directors.map(d => d.name).join(", ");
  const pscText = activePSCs.map(p => p.name).join(", ");

  // Calculate next renewal date as the earliest of confirmation statement or accounts due dates
  let companiesHouseNextRenewalDate: string | undefined;
  const confirmationDue = profile.confirmationStatementDue;
  const accountsDue = profile.accountsDue;
  
  console.log(`[Companies House] Calculating next renewal date:`, {
    confirmationDue,
    accountsDue
  });
  
  if (confirmationDue && accountsDue) {
    // Both exist - take the earliest
    const confirmationDate = new Date(confirmationDue);
    const accountsDate = new Date(accountsDue);
    companiesHouseNextRenewalDate = confirmationDate < accountsDate ? confirmationDue : accountsDue;
    console.log(`[Companies House] Both dates exist, using earliest: ${companiesHouseNextRenewalDate}`);
  } else if (confirmationDue) {
    // Only confirmation statement exists
    companiesHouseNextRenewalDate = confirmationDue;
    console.log(`[Companies House] Only confirmation due exists: ${companiesHouseNextRenewalDate}`);
  } else if (accountsDue) {
    // Only accounts exists
    companiesHouseNextRenewalDate = accountsDue;
    console.log(`[Companies House] Only accounts due exists: ${companiesHouseNextRenewalDate}`);
  } else {
    console.log(`[Companies House] No renewal dates available`);
  }

  return {
    ...profile,
    // Structured arrays
    directors,
    officers: activeOfficers,
    pscs: activePSCs,
    filings,
    charges,
    insolvencyHistory,
    // Legacy text fields
    director: directorText,
    psc: pscText,
    // Computed next renewal date (earliest of confirmation statement or accounts due)
    companiesHouseNextRenewalDate,
    // Sync metadata
    lastSyncDate: new Date().toISOString(),
    syncStatus: "success" as const,
  };
}
