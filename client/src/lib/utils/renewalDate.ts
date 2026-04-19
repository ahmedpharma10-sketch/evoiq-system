import { setYear, isAfter, addYears, format } from "date-fns";

export function calculateNextRenewalDate(incorporationDate: string | undefined): Date | null {
  if (!incorporationDate) return null;
  
  try {
    const incDate = new Date(incorporationDate);
    const today = new Date();
    
    // Get this year's anniversary
    let nextRenewal = setYear(incDate, today.getFullYear());
    
    // If this year's anniversary has already passed, use next year
    if (!isAfter(nextRenewal, today)) {
      nextRenewal = addYears(nextRenewal, 1);
    }
    
    return nextRenewal;
  } catch {
    return null;
  }
}

export function formatNextRenewalDate(incorporationDate: string | undefined): string {
  const nextRenewal = calculateNextRenewalDate(incorporationDate);
  return nextRenewal ? format(nextRenewal, "dd MMM yyyy") : "-";
}
