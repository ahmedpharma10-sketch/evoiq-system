import type { Company } from "@shared/schema";

// Define required fields for completion calculation
export const REQUIRED_FIELDS = [
  'name',
  'number',
  'incorporationDate',
  'ownerName',
  'ownerEmail',
  'ownerPhone',
  'googleDriveLink',
] as const;

export const isFieldRequired = (fieldName: string): boolean => {
  return REQUIRED_FIELDS.includes(fieldName as any);
};

export const isFieldEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

export const calculateDataCompletion = (company: Company): { percentage: number; filled: number; total: number } => {
  // Only count required fields for completion
  const requiredFieldValues = [
    company.name,
    company.number,
    company.incorporationDate,
    company.ownerName,
    company.ownerEmail,
    company.ownerPhone,
    company.googleDriveLink,
  ];

  const filled = requiredFieldValues.filter(f => f && f.trim() !== "").length;
  const total = requiredFieldValues.length;
  const percentage = total > 0 ? Math.round((filled / total) * 100) : 0;

  return { percentage, filled, total };
};
