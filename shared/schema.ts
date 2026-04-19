import { z } from "zod";

// Structured sub-schemas for Companies House data

export const directorSchema = z.object({
  name: z.string(),
  officerRole: z.string().optional(),
  appointedOn: z.string().optional(),
  resignedOn: z.string().optional(),
  nationality: z.string().optional(),
  occupation: z.string().optional(),
  countryOfResidence: z.string().optional(),
  address: z.string().optional(),
});

export const pscSchema = z.object({
  name: z.string(),
  kind: z.string().optional(), // individual-person-with-significant-control, corporate-entity-person-with-significant-control, etc.
  naturesOfControl: z.array(z.string()).optional(),
  notifiedOn: z.string().optional(),
  ceasedOn: z.string().optional(),
  nationality: z.string().optional(),
  countryOfResidence: z.string().optional(),
  address: z.string().optional(),
});

export const previousNameSchema = z.object({
  name: z.string(),
  effectiveFrom: z.string().optional(),
  ceasedOn: z.string().optional(),
});

export const chargeSchema = z.object({
  chargeNumber: z.string().optional(),
  createdOn: z.string().optional(),
  deliveredOn: z.string().optional(),
  status: z.string().optional(),
  assetsCeasedReleased: z.string().optional(),
  personsEntitled: z.array(z.string()).optional(),
  transactions: z.array(z.string()).optional(),
  particulars: z.string().optional(),
});

export const insolvencySchema = z.object({
  caseNumber: z.string().optional(),
  type: z.string().optional(),
  date: z.string().optional(),
  practitioners: z.array(z.string()).optional(),
});

export const filingHistorySchema = z.object({
  transactionId: z.string().optional(),
  category: z.string().optional(),
  date: z.string().optional(),
  type: z.string().optional(),
  description: z.string().optional(),
  actionDate: z.string().optional(),
  paperFiled: z.boolean().optional(),
  barcode: z.string().optional(),
  pages: z.number().optional(),
  links: z.object({
    self: z.string().optional(),
    documentMetadata: z.string().optional(),
  }).optional(),
});

export const documentMetadataSchema = z.object({
  id: z.string().optional(),
  category: z.string().optional(),
  filingDate: z.string().optional(),
  description: z.string().optional(),
  pages: z.number().optional(),
  contentLength: z.number().optional(),
  links: z.object({
    document: z.string().optional(),
    self: z.string().optional(),
  }).optional(),
});

export const level1UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
});

// Activity Log Entry - for tracking all system actions
export const activityLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(), // ISO datetime
  action: z.string(), // created, updated, deleted, status_changed, task_completed, etc.
  description: z.string(), // Human-readable description
  user: z.string().optional().default("System"), // Who performed the action
  meta: z.record(z.any()).optional().default({}), // Additional metadata
});

export type ActivityLogEntry = z.infer<typeof activityLogEntrySchema>;

export const companySchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Company name is required"),
  number: z.string().min(1, "Company number is required"),
  address: z.string().optional(),
  incorporationDate: z.string().optional(),
  industryCode: z.string().optional(),
  
  // Legacy text fields (kept for backward compatibility)
  director: z.string().optional(),
  psc: z.string().optional(),
  
  // Structured governance data
  directors: z.array(directorSchema).optional().default([]),
  officers: z.array(directorSchema).optional().default([]), // Same structure as directors
  pscs: z.array(pscSchema).optional().default([]),
  
  // Company history
  previousNames: z.array(previousNameSchema).optional().default([]),
  
  // Charges and insolvency
  charges: z.array(chargeSchema).optional().default([]),
  insolvencyHistory: z.array(insolvencySchema).optional().default([]),
  
  // Filing history
  filings: z.array(filingHistorySchema).optional().default([]),
  
  // Document metadata
  documents: z.array(documentMetadataSchema).optional().default([]),
  
  internalCode: z.string().optional(),
  utr: z.string().optional(),
  governmentGateway: z.string().optional(),
  ownerName: z.string().optional(),
  ownerEmails: z.array(z.string().email("Invalid email")).optional().default([]),
  ownerPhones: z.array(z.string()).optional().default([]),
  // Legacy fields for backward compatibility
  ownerEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  ownerPhone: z.string().optional(),
  // Additional fields from Excel import
  companiesHouseLink: z.string().optional(),
  googleDriveLink: z.string().min(1, "Google Drive Link is required"),
  vendorName: z.string().optional(),
  renewalDate: z.string().optional(),
  hasRenewalFees: z.boolean().default(false),
  renewalFees: z.string().optional(),
  authCode: z.string().optional(),
  pscLink: z.string().optional(),
  shareholders: z.string().optional(),
  shareholdersLink: z.string().optional(),
  directorLink: z.string().optional(),
  // Active/Inactive status
  isActive: z.boolean().default(true),
  // Sponsorship License flag
  sl: z.boolean().default(false),
  // Sponsorship License issuance tracking
  slLicenseIssued: z.boolean().default(false),
  slLicenseNumber: z.string().optional(),
  slLicenseIssueDate: z.string().optional(),
  slPayeReference: z.string().optional(),
  slWorkAddress: z.string().optional(),
  slLevel1Users: z.array(level1UserSchema).optional().default([]),
  slDefinedCOS: z.number().optional(), // Defined unassigned COS count
  slUndefinedCOS: z.number().optional(), // Undefined unassigned COS count
  // Additional Companies House data
  companyStatus: z.string().optional(),
  companyType: z.string().optional(),
  jurisdiction: z.string().optional(),
  hasCharges: z.boolean().optional(),
  hasInsolvency: z.boolean().optional(),
  confirmationStatementDue: z.string().optional(),
  accountsDue: z.string().optional(),
  lastAccountsDate: z.string().optional(),
  confirmationStatementLastMade: z.string().optional(),
  companiesHouseNextRenewalDate: z.string().optional(), // Computed as earliest of confirmation statement or accounts due
  
  // Sync metadata
  lastSyncDate: z.string().optional(),
  syncStatus: z.enum(["never", "success", "partial", "error"]).optional().default("never"),
  
  // Activity Log
  activityLog: z.array(activityLogEntrySchema).optional().default([]),
});

// Base insert schema without refinements
export const baseInsertCompanySchema = companySchema.omit({ id: true });

// Add conditional validation for renewal fees
export const insertCompanySchema = baseInsertCompanySchema.refine(
  (data) => {
    // If hasRenewalFees is true, renewalFees must be provided
    if (data.hasRenewalFees) {
      return data.renewalFees && data.renewalFees.trim().length > 0;
    }
    return true;
  },
  {
    message: "Renewal Fees amount is required when 'Has Renewal Fees' is checked",
    path: ["renewalFees"],
  }
);

export type Company = z.infer<typeof companySchema>;
export type InsertCompany = z.infer<typeof baseInsertCompanySchema>;
export type Director = z.infer<typeof directorSchema>;
export type PSC = z.infer<typeof pscSchema>;
export type PreviousName = z.infer<typeof previousNameSchema>;
export type Charge = z.infer<typeof chargeSchema>;
export type Insolvency = z.infer<typeof insolvencySchema>;
export type FilingHistory = z.infer<typeof filingHistorySchema>;
export type DocumentMetadata = z.infer<typeof documentMetadataSchema>;
export type Level1User = z.infer<typeof level1UserSchema>;

// Task schema - renewal_date based task engine
export const taskSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  dueAt: z.string(), // ISO datetime
  status: z.enum(["open", "done", "skipped", "cancelled"]).default("open"),
  meta: z.record(z.any()).optional().default({}), // JSON metadata
  uniqueKey: z.string(), // pattern: {type}:{companyId}:{renewalDate}
  renewalDate: z.string(), // The renewal_date this task was generated from
  createdAt: z.string().optional(),
  // Review tracking (Phase 2 - Auditor)
  reviewed: z.boolean().optional().default(false),
  reviewedAt: z.string().optional(), // ISO datetime
  reviewerNote: z.string().optional(),
});

export const insertTaskSchema = taskSchema.omit({ id: true, createdAt: true });

export type Task = z.infer<typeof taskSchema>;
export type InsertTask = z.infer<typeof insertTaskSchema>;

// Audit trail for task changes
export const taskAuditSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  taskTitle: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  fromStatus: z.string(),
  toStatus: z.string(),
  reason: z.string().optional(), // Required for cancellation
  timestamp: z.string(), // ISO datetime
  performedBy: z.string().default("System"), // User who performed the action
  meta: z.record(z.any()).optional().default({}), // Additional metadata
});

export const insertTaskAuditSchema = taskAuditSchema.omit({ id: true });

export type TaskAudit = z.infer<typeof taskAuditSchema>;
export type InsertTaskAudit = z.infer<typeof insertTaskAuditSchema>;

// Company activity log for status changes
export const companyActivityLogSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  action: z.string(), // "deactivated", "activated", "removed_from_sl", "added_to_sl"
  reason: z.string(), // Required reason for the action
  timestamp: z.string(), // ISO datetime
  performedBy: z.string().default("System"), // User who performed the action
  meta: z.record(z.any()).optional().default({}), // Additional metadata
});

export const insertCompanyActivityLogSchema = companyActivityLogSchema.omit({ id: true });

export type CompanyActivityLog = z.infer<typeof companyActivityLogSchema>;
export type InsertCompanyActivityLog = z.infer<typeof insertCompanyActivityLogSchema>;

// SL Prep Task - master list of tasks required for UK Sponsorship License preparation
export const slPrepTaskSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Task name is required"),
  order: z.number().default(0), // Display order
  createdAt: z.string(), // ISO datetime
});

export const insertSLPrepTaskSchema = slPrepTaskSchema.omit({ id: true, createdAt: true });

export type SLPrepTask = z.infer<typeof slPrepTaskSchema>;
export type InsertSLPrepTask = z.infer<typeof insertSLPrepTaskSchema>;

// HR Task Template (master tasks that apply to all employees)
export const hrTaskTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  recurrence: z.enum(["one_time", "monthly", "annual"]), // How often this task repeats
  dueDateOffsetDays: z.number().min(0, "Due date offset must be 0 or greater").default(7), // Days after employee start date when task is due
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  order: z.number().default(0), // Display order
  createdAt: z.string(), // ISO datetime
});

export const insertHRTaskTemplateSchema = hrTaskTemplateSchema.omit({ id: true, createdAt: true });

export type HRTaskTemplate = z.infer<typeof hrTaskTemplateSchema>;
export type InsertHRTaskTemplate = z.infer<typeof insertHRTaskTemplateSchema>;

// Leaver Task Template (tasks that apply when employee becomes a leaver)
export const leaverTaskTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  dueDays: z.number().min(0, "Due days must be 0 or greater").default(7), // Days after becoming leaver when task is due
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  order: z.number().default(0), // Display order
  createdAt: z.string(), // ISO datetime
});

export const insertLeaverTaskTemplateSchema = leaverTaskTemplateSchema.omit({ id: true, createdAt: true });

export type LeaverTaskTemplate = z.infer<typeof leaverTaskTemplateSchema>;
export type InsertLeaverTaskTemplate = z.infer<typeof insertLeaverTaskTemplateSchema>;

// Residency Task Template (tasks specific to employees with residency service)
export const residencyTaskTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  recurrence: z.enum(["one_time", "weekly", "monthly", "quarterly", "annually"]), // How often this task repeats
  startDateMode: z.enum(["manual", "offset_days"]), // How to determine task start date
  startDate: z.string().optional(), // ISO datetime - used when startDateMode is "manual"
  offsetDays: z.number().optional(), // Days after employee starting date - used when startDateMode is "offset_days"
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  applicantType: z.enum(["main_only", "main_and_dependants"]).default("main_only"), // Who gets this task
  order: z.number().default(0), // Display order
  createdAt: z.string(), // ISO datetime
});

export const insertResidencyTaskTemplateSchema = residencyTaskTemplateSchema.omit({ id: true, createdAt: true });

export type ResidencyTaskTemplate = z.infer<typeof residencyTaskTemplateSchema>;
export type InsertResidencyTaskTemplate = z.infer<typeof insertResidencyTaskTemplateSchema>;

// Company SL Prep Task Status - tracks completion status per company
export const companySLPrepTaskStatusSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  taskId: z.string(),
  isCompleted: z.boolean().default(false),
  description: z.string().optional(), // Task-specific details/notes entered when completing
  completionNote: z.string().optional(), // Required when marking as completed (min 10 chars)
  completedAt: z.string().optional(), // ISO datetime
});

export const insertCompanySLPrepTaskStatusSchema = companySLPrepTaskStatusSchema.omit({ id: true });

export type CompanySLPrepTaskStatus = z.infer<typeof companySLPrepTaskStatusSchema>;
export type InsertCompanySLPrepTaskStatus = z.infer<typeof insertCompanySLPrepTaskStatusSchema>;

// ===========================
// Employee Management Schemas
// ===========================

// Employee Document
export const employeeDocumentSchema = z.object({
  id: z.string(),
  type: z.enum(["passport", "visa_brp", "cos", "contract", "rtw_evidence", "proof_of_address", "other"]),
  title: z.string().min(1, "Document title is required"),
  link: z.string().optional(), // URL or file path
  issueDate: z.string().optional(), // ISO date
  expiryDate: z.string().optional(), // ISO date
});

export type EmployeeDocument = z.infer<typeof employeeDocumentSchema>;

// Conditional Rule for form fields
export const conditionalRuleSchema = z.object({
  id: z.string(),
  triggerFieldId: z.string(), // ID of the field that triggers this rule
  operator: z.enum(["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"]),
  value: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(), // Value to compare against
  action: z.enum(["show", "hide", "require", "optional", "set_value"]), // What to do when rule is true
  targetFieldIds: z.array(z.string()), // Fields affected by this rule
  targetValue: z.string().optional(), // Value to set (if action is set_value)
});

export type ConditionalRule = z.infer<typeof conditionalRuleSchema>;

// Form Field Option (for dropdowns, radio, checkbox groups)
export const formFieldOptionSchema = z.object({
  label: z.string(),
  value: z.string(),
});

export type FormFieldOption = z.infer<typeof formFieldOptionSchema>;

// Form Field Definition
export const formFieldSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Field name is required"), // Internal name/key
  label: z.string().min(1, "Field label is required"), // Display label
  type: z.enum([
    "text", "email", "tel", "number", "date", "textarea",
    "select", "radio", "checkbox", "checkbox_group",
    "file", "section_header", "info_text"
  ]),
  placeholder: z.string().optional(),
  helperText: z.string().optional(), // Guidance text shown below field
  defaultValue: z.union([z.string(), z.boolean(), z.number(), z.array(z.string())]).optional(),
  required: z.boolean().optional(),
  validation: z.object({
    min: z.number().optional(), // Min length for text, min value for number
    max: z.number().optional(), // Max length for text, max value for number
    pattern: z.string().optional(), // Regex pattern
    customErrorMessage: z.string().optional(),
  }).optional(),
  options: z.array(formFieldOptionSchema).optional(), // For select, radio, checkbox_group
  step: z.number().optional(), // Which step this field belongs to (1, 2, 3, etc.)
  order: z.number().optional(),
  conditionalRules: z.array(conditionalRuleSchema).optional(), // Rules that affect this field's visibility
  width: z.enum(["full", "half"]).optional(),
  maxLength: z.number().optional(), // Maximum character length for text/textarea fields
  autoCalculate: z.object({
    formula: z.enum(["probation_end", "rtw_check_date", "visa_renewal_prep", "report_start_ukvi"]).optional(),
    dependencies: z.array(z.string()).optional(), // Field IDs this calculation depends on
  }).optional(),
});

export type FormField = z.infer<typeof formFieldSchema>;

// Employee Form Template
export const employeeFormTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  version: z.number().default(1),
  isActive: z.boolean().default(true),
  steps: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
  })),
  fields: z.array(formFieldSchema),
  globalRules: z.array(conditionalRuleSchema).optional(), // Rules that span multiple fields
  createdAt: z.string(), // ISO datetime
  updatedAt: z.string(), // ISO datetime
});

export const insertEmployeeFormTemplateSchema = employeeFormTemplateSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export type EmployeeFormTemplate = z.infer<typeof employeeFormTemplateSchema>;
export type InsertEmployeeFormTemplate = z.infer<typeof insertEmployeeFormTemplateSchema>;

// Employee Record
export const employeeRecordSchema = z.object({
  id: z.string(),
  templateId: z.string(), // Which form template was used
  templateVersion: z.number(), // Version of template when this employee was created
  
  // Basic Details
  firstName: z.string().min(1, "First name is required"),
  middleNames: z.string().optional().default(""), // Optional for existing records, but required in form
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string(), // ISO date
  personalMobile: z.string().min(1, "Mobile is required"),
  personalEmail: z.string().email("Invalid email"),
  
  // Address
  ukAddress: z.string().optional(),
  ukAddressProvideLater: z.string().optional(), // "1_week", "2_weeks", "3_weeks", "4_weeks", "5_weeks", "6_weeks", or empty
  overseasAddress: z.string().min(1, "Overseas address is required"),
  ukBankAddress: z.string().optional(),
  ukBankAddressProvideLater: z.string().optional(), // "1_week", "2_weeks", "3_weeks", "4_weeks", "5_weeks", "6_weeks", or empty
  
  // Emergency Contact (all mandatory)
  emergencyContactName: z.string().min(1, "Emergency contact name is required"),
  emergencyContactRelationship: z.string().min(1, "Emergency contact relationship is required"),
  emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
  
  // Employment Details
  companyId: z.string().min(1, "Company is required"),
  companyName: z.string(), // Denormalized for display
  department: z.string().optional(), // Business development, Marketing/Sales/Export, Administration, HR, Finance, Technical
  workLocation: z.string().optional(), // Can be company address or SL work address
  workLocationSource: z.string().optional(), // "companies_house" or "sl_section" - indicates which source was selected
  lineManager: z.string().optional(),
  jobTitle: z.string().min(1, "Job title is required"),
  jobDescription: z.string().optional(),
  contractType: z.enum(["permanent", "fixed_term", "contractor"]),
  startDate: z.string(), // ISO date
  endDate: z.string().optional(), // Required if fixed_term
  workingDays: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])).optional().default(["monday", "tuesday", "wednesday", "thursday", "friday"]), // Default Mon-Fri
  weeklyHours: z.number().min(0),
  dailyWorkingHours: z.number().optional(), // Auto-calculated: weeklyHours / number of working days
  startingWorkingTime: z.string().optional().default("09:00"), // HH:mm format, default 9am
  endingWorkingTime: z.string().optional(), // Auto-calculated: startingWorkingTime + dailyWorkingHours + 1 hour rest
  breakMinutes: z.number().optional().default(60), // Break duration in minutes, default 60 (1 hour)
  vacationDays: z.number().min(0).optional(), // Annual vacation/holiday entitlement in days
  salary: z.number().min(0),
  hourlyRate: z.number().optional(), // If contractor
  overtimeRate: z.number().optional(), // Optional overtime rate (defaults to hourlyRate if not set)
  payeReference: z.string().optional(), // Auto-populated from company, read-only
  nationalInsurance: z.string().optional(),
  nationalInsuranceProvideLater: z.string().optional(), // "1_week", "2_weeks", "3_weeks", "4_weeks", "5_weeks", "6_weeks", or empty
  googleDriveLink: z.string().min(1, "Google Drive link is required"),
  
  // Nationality/Immigration Status
  nationality: z.string().optional(), // Mandatory field for all employees
  immigrationStatus: z.enum(["british", "settled", "other"]),
  isSponsored: z.boolean().optional(), // Only relevant if immigrationStatus = "other"
  
  // Passport Details
  passportNumber: z.string().optional(), // Mandatory field for all employees
  passportExpiry: z.string().optional(), // ISO date - Mandatory field for all employees
  brpShareCode: z.string().optional(),
  
  // Visa/Sponsorship Details (if sponsored)
  visaType: z.string().optional(),
  cosNumber: z.string().optional(),
  sponsorLicenseNumber: z.string().optional(),
  visaIssueDate: z.string().optional(), // ISO date
  visaExpiryDate: z.string().optional(), // ISO date
  
  // Right to Work Details
  rtwBasis: z.string().optional(), // "dependant", "graduate", "student", "eu_presettled", "other"
  rtwCheckDate: z.string().optional(), // ISO date
  rtwEvidenceType: z.string().optional(), // "passport", "brp", "share_code"
  rtwExpiryDateMode: z.string().optional(), // "auto" (match visa expiry) or "manual" (user-specified)
  rtwExpiryDate: z.string().optional(), // ISO date - can be set to specific date or marked as indefinite
  rtwExpiryIndefinite: z.boolean().optional().default(false), // True if RTW expiry is indefinite
  rtwShareCode: z.string().optional(),
  
  // Document Verification Checkboxes (kept copy of documents)
  docPassportCopy: z.boolean().optional().default(false),
  docGraduationCertCopy: z.boolean().optional().default(false),
  docProofOfAddressCopy: z.boolean().optional().default(false),
  docRtwCopy: z.boolean().optional().default(false), // Conditional: only if RTW check required
  docCosCopy: z.boolean().optional().default(false), // Conditional: only if sponsored
  docVisaCopy: z.boolean().optional().default(false), // Conditional: only if has visa
  
  // Compliance & Status
  probationPeriod: z.number().default(3), // Months
  probationEndDate: z.string().optional(), // ISO date (auto-calculated)
  status: z.enum(["onboarding", "active", "on_hold", "leaver", "deactivated"]).default("onboarding"),
  isDraft: z.boolean().optional().default(false), // True if employee is saved incomplete (draft state)
  leaverDate: z.string().optional(), // ISO date - set when status becomes "leaver"
  ukviReportingNotes: z.string().optional(),
  
  // Residency Service
  isResidencyService: z.boolean().optional().default(false),
  residencyStatus: z.enum(["pending", "done"]).optional(),
  residencyLog: z.array(z.object({
    id: z.string(),
    timestamp: z.string(), // ISO datetime
    action: z.enum(["enabled", "disabled", "marked_done"]),
    explanation: z.string(),
    userName: z.string().optional(), // Who made the change
  })).optional().default([]),
  
  // Documents
  documents: z.array(employeeDocumentSchema).optional().default([]),
  
  // Generated Tasks
  generatedTaskIds: z.array(z.string()).optional().default([]), // IDs of auto-generated tasks
  
  // All form responses (flexible storage for custom fields)
  formData: z.record(z.any()).optional().default({}), // Key-value pairs of all field responses
  
  // Activity Log
  activityLog: z.array(activityLogEntrySchema).optional().default([]),
  
  // Metadata
  createdAt: z.string(), // ISO datetime
  updatedAt: z.string(), // ISO datetime
});

export const insertEmployeeRecordSchema = employeeRecordSchema.omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

// Draft employee schema - relaxed validation for "Save for Later"
// Only requires absolute minimum fields, everything else is optional
export const draftEmployeeRecordSchema = insertEmployeeRecordSchema.extend({
  isDraft: z.literal(true),
  // Make most fields optional for drafts
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  templateId: z.string().min(1),
  templateVersion: z.number(),
  dateOfBirth: z.string().optional(),
  personalMobile: z.string().optional(),
  personalEmail: z.string().optional(),
  overseasAddress: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  companyId: z.string().optional(),
  companyName: z.string().optional(),
  jobTitle: z.string().optional(),
  contractType: z.enum(["permanent", "fixed_term", "contractor"]).optional(),
  startDate: z.string().optional(),
  weeklyHours: z.number().optional(),
  salary: z.number().optional(),
  immigrationStatus: z.string().optional(),
  googleDriveLink: z.string().optional(),
}).partial().required({ 
  isDraft: true,
  firstName: true,
  lastName: true,
  templateId: true,
  templateVersion: true,
});

// Helper function to normalize empty strings to undefined
function normalizeEmptyString(value: any): any {
  if (typeof value === 'string' && value.trim() === '') {
    return undefined;
  }
  return value;
}

// Sanitize employee payload by trimming strings and converting empties to undefined
export function sanitizeEmployeePayload(data: any): any {
  const sanitized: any = {};
  
  for (const key in data) {
    const value = data[key];
    if (typeof value === 'string') {
      const trimmed = value.trim();
      sanitized[key] = trimmed === '' ? undefined : trimmed;
    } else if (value !== null && value !== undefined) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Complete employee schema - enforces all required fields when not a draft
export const completeEmployeeRecordSchema = insertEmployeeRecordSchema.extend({
  isDraft: z.literal(false).optional().default(false),
}).superRefine((data: any, ctx) => {
  // When isDraft is false, enforce all required fields
  if (data.isDraft === false || data.isDraft === undefined) {
    // Base required fields (must be non-empty)
    const requiredStringFields: [string, string][] = [
      ["overseasAddress", "Overseas address"],
      ["googleDriveLink", "Google Drive link"],
      ["jobTitle", "Job title"],
      ["emergencyContactName", "Emergency contact name"],
      ["emergencyContactRelationship", "Emergency contact relationship"],
      ["emergencyContactPhone", "Emergency contact phone"],
      ["nationality", "Nationality"],
      ["passportNumber", "Passport number"],
      ["passportExpiry", "Passport expiry date"],
      ["rtwBasis", "RTW basis"],
      ["rtwEvidenceType", "RTW evidence type"],
      ["rtwCheckDate", "RTW check date"],
    ];
    
    requiredStringFields.forEach(([field, label]) => {
      const value = normalizeEmptyString(data[field]);
      if (!value) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${label} is required for complete employees`,
        });
      }
    });
    
    // ALWAYS required document confirmations
    const requiredDocs: [string, string][] = [
      ["docPassportCopy", "Passport copy"],
      ["docGraduationCertCopy", "Graduation certificate copy"],
      ["docProofOfAddressCopy", "Proof of address copy"],
      ["docRtwCopy", "Right to Work document copy"],
    ];
    
    requiredDocs.forEach(([field, label]) => {
      if (!data[field]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${label} must be confirmed for complete employees`,
        });
      }
    });
    
    // Paired requirements: National Insurance
    const nationalInsurance = normalizeEmptyString(data.nationalInsurance);
    const nationalInsuranceProvideLater = normalizeEmptyString(data.nationalInsuranceProvideLater);
    if (!nationalInsurance && !nationalInsuranceProvideLater) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nationalInsurance"],
        message: "National Insurance number or 'Provide Later' option is required",
      });
    }
    
    // Paired requirements: UK Address
    const ukAddress = normalizeEmptyString(data.ukAddress);
    const ukAddressProvideLater = normalizeEmptyString(data.ukAddressProvideLater);
    if (!ukAddress && !ukAddressProvideLater) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ukAddress"],
        message: "UK address or 'Provide Later' option is required",
      });
    }
    
    // RTW Expiry: must have either rtwExpiryIndefinite or rtwExpiryDate
    const rtwExpiryDate = normalizeEmptyString(data.rtwExpiryDate);
    if (!data.rtwExpiryIndefinite && !rtwExpiryDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rtwExpiryDate"],
        message: "RTW expiry date is required (or mark as indefinite)",
      });
    }
    
    // RTW Share Code: required if evidence type is share_code
    const rtwEvidenceType = normalizeEmptyString(data.rtwEvidenceType);
    const rtwShareCode = normalizeEmptyString(data.rtwShareCode);
    if (rtwEvidenceType === 'share_code' && !rtwShareCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rtwShareCode"],
        message: "RTW share code is required when evidence type is 'share code'",
      });
    }
    
    // Immigration status "other" requires visa details
    if (data.immigrationStatus === 'other') {
      const visaExpiryDate = normalizeEmptyString(data.visaExpiryDate);
      const visaIssueDate = normalizeEmptyString(data.visaIssueDate);
      const visaType = normalizeEmptyString(data.visaType);
      
      if (!visaExpiryDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["visaExpiryDate"],
          message: "Visa expiry date is required for immigration status 'other'",
        });
      }
      if (!visaIssueDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["visaIssueDate"],
          message: "Visa issue date is required for immigration status 'other'",
        });
      }
      if (!visaType) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["visaType"],
          message: "Visa type is required for immigration status 'other'",
        });
      }
      
      // Visa copy must be confirmed
      if (!data.docVisaCopy) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["docVisaCopy"],
          message: "Visa copy must be confirmed when visa details are provided",
        });
      }
      
      // Sponsored employees require COS details
      if (data.isSponsored === true) {
        const cosNumber = normalizeEmptyString(data.cosNumber);
        const sponsorLicenseNumber = normalizeEmptyString(data.sponsorLicenseNumber);
        
        if (!cosNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["cosNumber"],
            message: "COS number is required for sponsored employees",
          });
        }
        if (!sponsorLicenseNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["sponsorLicenseNumber"],
            message: "Sponsor license number is required for sponsored employees",
          });
        }
        if (!data.docCosCopy) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["docCosCopy"],
            message: "Certificate of Sponsorship copy must be confirmed for sponsored employees",
          });
        }
      }
    }
    
    // British/Settled employees should have indefinite RTW
    if (['british', 'settled'].includes(data.immigrationStatus) && !data.rtwExpiryIndefinite) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rtwExpiryIndefinite"],
        message: "RTW expiry should be marked as indefinite for British/Settled status",
      });
    }
    
    // Fixed-term contracts require end date
    if (data.contractType === 'fixed_term') {
      const endDate = normalizeEmptyString(data.endDate);
      if (!endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endDate"],
          message: "End date is required for fixed-term contracts",
        });
      }
    }
  }
});

export type EmployeeRecord = z.infer<typeof employeeRecordSchema>;
export type InsertEmployeeRecord = z.infer<typeof insertEmployeeRecordSchema>;
export type DraftEmployeeRecord = z.infer<typeof draftEmployeeRecordSchema>;
export type CompleteEmployeeRecord = z.infer<typeof completeEmployeeRecordSchema>;

// Dependant schema - for tracking dependants of employees with residency service
export const dependantSchema = z.object({
  id: z.string(),
  employeeId: z.string(), // The main employee this dependant belongs to
  employeeName: z.string(), // Denormalized name of main employee for display
  firstName: z.string().min(1, "First name is required"),
  middleName: z.string().optional().default(""),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string(), // ISO date
  relationship: z.enum(["spouse", "child"]),
  whatsAppNumber: z.string().optional().default(""), // Optional for backward compatibility with legacy data
  createdAt: z.string(), // ISO datetime
});

export const insertDependantSchema = dependantSchema.omit({ 
  id: true, 
  createdAt: true 
});

export type Dependant = z.infer<typeof dependantSchema>;
export type InsertDependant = z.infer<typeof insertDependantSchema>;

// Pending Dependant Request schema - for tracking add/remove dependant requests awaiting approval
export const pendingDependantRequestSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  action: z.enum(["add", "remove"]),
  requestedBy: z.string(), // Name of the user who made the request
  requestedAt: z.string(), // ISO datetime
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  reviewedBy: z.string().optional(), // Name of the user who approved/rejected
  reviewedAt: z.string().optional(), // ISO datetime
  reviewNote: z.string().optional(), // Auditor's note
  reason: z.string(), // Reason for add/remove
  // Dependant data (for add requests or storing info for remove requests)
  dependantData: z.object({
    id: z.string().optional(), // For remove requests, this is the dependant ID
    firstName: z.string(),
    middleName: z.string().optional(),
    lastName: z.string(),
    dateOfBirth: z.string(),
    relationship: z.enum(["spouse", "child"]),
    whatsAppNumber: z.string().optional().default(""), // Optional for backward compatibility with legacy data
  }),
});

export const insertPendingDependantRequestSchema = pendingDependantRequestSchema.omit({
  id: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNote: true,
});

export type PendingDependantRequest = z.infer<typeof pendingDependantRequestSchema>;
export type InsertPendingDependantRequest = z.infer<typeof insertPendingDependantRequestSchema>;

// Pending Employee Status Change schema - for tracking employee status change requests awaiting HR Auditor approval
export const pendingEmployeeStatusChangeSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(),
  changeType: z.enum(["status", "deactivation", "reactivation"]),
  currentValue: z.string(), // Current status/active state
  newValue: z.string(), // Proposed status/active state
  reason: z.string(), // Reason for the change
  requestedBy: z.string(), // Name of the user who made the request
  requestedAt: z.string(), // ISO datetime
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  reviewedBy: z.string().optional(), // Name of the HR auditor who approved/rejected
  reviewedAt: z.string().optional(), // ISO datetime
  reviewNote: z.string().optional(), // Auditor's note
});

export const insertPendingEmployeeStatusChangeSchema = pendingEmployeeStatusChangeSchema.omit({
  id: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNote: true,
});

export type PendingEmployeeStatusChange = z.infer<typeof pendingEmployeeStatusChangeSchema>;
export type InsertPendingEmployeeStatusChange = z.infer<typeof insertPendingEmployeeStatusChangeSchema>;

// Pending Company SL Change schema - for tracking company SL section edits awaiting Company Auditor approval
export const pendingCompanySLChangeSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  companyName: z.string(),
  field: z.string(), // Which SL field was changed (e.g., "slStatus", "slNumber", etc.)
  currentValue: z.any(), // Current value
  newValue: z.any(), // Proposed value
  reason: z.string(), // Reason for the change
  requestedBy: z.string(), // Name of the user who made the request
  requestedAt: z.string(), // ISO datetime
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  reviewedBy: z.string().optional(), // Name of the company auditor who approved/rejected
  reviewedAt: z.string().optional(), // ISO datetime
  reviewNote: z.string().optional(), // Auditor's note
});

export const insertPendingCompanySLChangeSchema = pendingCompanySLChangeSchema.omit({
  id: true,
  reviewedBy: true,
  reviewedAt: true,
  reviewNote: true,
});

export type PendingCompanySLChange = z.infer<typeof pendingCompanySLChangeSchema>;
export type InsertPendingCompanySLChange = z.infer<typeof insertPendingCompanySLChangeSchema>;

// User schema - for tracking system users
export const userSchema = z.object({
  id: z.string(),
  userId: z.string(), // Unique visible ID (e.g., "USR-001")
  username: z.string().min(1, "Username is required"),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  position: z.string().min(1, "Position is required"),
  passwordHint: z.string().optional(),
  createdAt: z.string(), // ISO datetime
});

export const insertUserSchema = userSchema.omit({ 
  id: true,
  userId: true,
  createdAt: true 
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Employee Task schema - for tracking employee-related tasks
export const employeeTaskSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(), // Denormalized for display
  companyId: z.string(),
  companyName: z.string(), // Denormalized for display
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  taskType: z.enum([
    "provide_uk_address", 
    "provide_uk_bank_address", 
    "provide_national_insurance",
    "passport_expiry", 
    "visa_expiry",
    "rtw_expiry",
    "probation_review",
    "contract_end",
    "keep_passport_copy",
    "keep_visa_copy",
    "keep_rtw_copy",
    "keep_contract_copy",
    "hr_template",
    "hr_template_monthly",
    "hr_template_annual",
    "residency_template",
    "residency_template_weekly",
    "residency_template_monthly",
    "residency_template_quarterly",
    "residency_template_annually",
    "leaver_task",
    "other"
  ]),
  dueAt: z.string(), // ISO datetime
  status: z.enum(["open", "completed", "skipped", "cancelled"]).default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  completionNote: z.string().optional(),
  cancelReason: z.string().optional(),
  uniqueKey: z.string().optional(), // For idempotent task generation
  meta: z.record(z.any()).optional().default({}), // Additional metadata
  reviewed: z.boolean().optional().default(false), // For HR Auditor - whether task has been reviewed
  reviewerNote: z.string().optional(), // For HR Auditor - reviewer's notes
  createdAt: z.string(), // ISO datetime
  updatedAt: z.string(), // ISO datetime
  completedAt: z.string().optional(), // ISO datetime
});

export const insertEmployeeTaskSchema = employeeTaskSchema.omit({ id: true, createdAt: true, updatedAt: true });

export type EmployeeTask = z.infer<typeof employeeTaskSchema>;
export type InsertEmployeeTask = z.infer<typeof insertEmployeeTaskSchema>;

// Employee Activity Log schema - for tracking all changes to an employee record
export const employeeActivityLogSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeName: z.string(), // Denormalized for display
  action: z.string(), // e.g., "Status Changed", "Personal Details Updated", "Employment Info Updated"
  details: z.string().optional(), // Human-readable description of what changed
  fieldChanged: z.string().optional(), // Specific field that was changed
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  timestamp: z.string(), // ISO datetime
  performedBy: z.string().default("System"), // User who performed the action
  meta: z.record(z.any()).optional().default({}), // Additional metadata
});

export const insertEmployeeActivityLogSchema = employeeActivityLogSchema.omit({ id: true });

export type EmployeeActivityLog = z.infer<typeof employeeActivityLogSchema>;
export type InsertEmployeeActivityLog = z.infer<typeof insertEmployeeActivityLogSchema>;

// User Activity Log schema - for tracking all user management actions
export const userActivityLogSchema = z.object({
  id: z.string(),
  action: z.string(), // e.g., "User Added", "User Updated", "User Deleted"
  targetUsername: z.string(), // The user being affected
  targetName: z.string(), // Name of the affected user
  details: z.string().optional(), // Human-readable description of what changed
  reason: z.string().optional(), // Reason for the action (especially for deletions)
  timestamp: z.string(), // ISO datetime
  performedBy: z.string().default("System"), // User who performed the action
  meta: z.record(z.any()).optional().default({}), // Additional metadata
});

export const insertUserActivityLogSchema = userActivityLogSchema.omit({ id: true });

export type UserActivityLog = z.infer<typeof userActivityLogSchema>;
export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;

// Holiday schema - for tracking official vacation/holidays
export const holidaySchema = z.object({
  id: z.string(),
  date: z.string(), // YYYY-MM-DD format
  day: z.string(), // Day of week (e.g., "Monday", "Tuesday")
  holidayName: z.string().min(1, "Holiday name is required"), // Name of the holiday (e.g., "Christmas", "New Year")
});

export const insertHolidaySchema = holidaySchema.omit({ id: true });

export type Holiday = z.infer<typeof holidaySchema>;
export type InsertHoliday = z.infer<typeof insertHolidaySchema>;

// Attendance Record schema - for tracking daily employee attendance, hours, and pay
export const attendanceRecordSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  
  // Date & Status (Columns 1-3)
  date: z.string(), // YYYY-MM-DD format
  day: z.string(), // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  status: z.enum(["Present", "Absent", "Holiday", "Leave", "Weekend", "Incomplete"]),
  
  // Times (Columns 4-7)
  scheduledStartTime: z.string().optional(), // HH:MM:SS AM/PM format
  actualClockInTime: z.string().optional(), // HH:MM:SS AM/PM format
  scheduledEndTime: z.string().optional(), // HH:MM:SS AM/PM format
  actualClockOutTime: z.string().optional(), // HH:MM:SS AM/PM format
  
  // Break Information (Columns 8-10)
  breakType: z.enum(["Paid", "Unpaid"]).default("Unpaid"),
  breakDuration: z.string().optional(), // HH:MM:SS format (e.g., "00:30:00")
  breakRate: z.number().optional(), // GBP/hour for paid breaks
  
  // Rates (Columns 11, 16)
  hourlyRate: z.number().optional(), // from employee profile
  overtimeRate: z.number().optional(), // defaults to hourlyRate if not set
  
  // Hours (Columns 12-15)
  scheduledWorkingHours: z.number().optional(), // decimal hours (2dp)
  totalWorkingHours: z.number().optional(), // decimal hours (2dp)
  paidWorkingHours: z.number().optional(), // decimal hours (2dp)
  overtimeHours: z.number().optional(), // decimal hours (2dp)
  
  // Pay (Columns 17-20)
  breakCost: z.number().optional(), // currency (2dp)
  basePay: z.number().optional(), // currency (2dp)
  overtimePay: z.number().optional(), // currency (2dp)
  totalDayPay: z.number().optional(), // currency (2dp)
  
  // Notes & Flags (Columns 21-22)
  notes: z.string().optional(),
  anomalyFlag: z.boolean().default(false), // true if working > 16 hours or missing data
});

export const insertAttendanceRecordSchema = attendanceRecordSchema.omit({ id: true });

export type AttendanceRecord = z.infer<typeof attendanceRecordSchema>;
export type InsertAttendanceRecord = z.infer<typeof insertAttendanceRecordSchema>;

// ========================================
// Drizzle ORM Database Tables
// ========================================
// Reference: blueprint:javascript_database

import { pgTable, text, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

// ==================
// Users Table
// ==================
export const users = pgTable("users", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").unique().notNull(), // Unique visible ID (e.g., "USR-001")
  username: varchar("username").unique().notNull(),
  password: varchar("password").notNull(), // Hashed password
  passwordHint: text("password_hint"),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  position: varchar("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  companiesCreated: many(companies),
  employeesCreated: many(employees),
}));

// ==================
// Companies Table
// ==================
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  number: varchar("number").notNull(),
  address: text("address"),
  incorporationDate: varchar("incorporation_date"),
  industryCode: varchar("industry_code"),
  
  // Legacy text fields
  director: text("director"),
  psc: text("psc"),
  
  // Structured governance data (stored as JSONB)
  directors: jsonb("directors").$type<Director[]>().default([]),
  officers: jsonb("officers").$type<Director[]>().default([]),
  pscs: jsonb("pscs").$type<PSC[]>().default([]),
  previousNames: jsonb("previous_names").$type<PreviousName[]>().default([]),
  charges: jsonb("charges").$type<Charge[]>().default([]),
  insolvencyHistory: jsonb("insolvency_history").$type<Insolvency[]>().default([]),
  filings: jsonb("filings").$type<FilingHistory[]>().default([]),
  documents: jsonb("documents").$type<DocumentMetadata[]>().default([]),
  
  // Contact & administrative
  internalCode: varchar("internal_code"),
  utr: varchar("utr"),
  governmentGateway: varchar("government_gateway"),
  ownerName: varchar("owner_name"),
  ownerEmails: jsonb("owner_emails").$type<string[]>().default([]),
  ownerPhones: jsonb("owner_phones").$type<string[]>().default([]),
  ownerEmail: varchar("owner_email"),
  ownerPhone: varchar("owner_phone"),
  companiesHouseLink: varchar("companies_house_link"),
  googleDriveLink: text("google_drive_link").notNull(),
  vendorName: varchar("vendor_name"),
  renewalDate: varchar("renewal_date"),
  hasRenewalFees: boolean("has_renewal_fees").default(false),
  renewalFees: varchar("renewal_fees"),
  authCode: varchar("auth_code"),
  pscLink: varchar("psc_link"),
  shareholders: text("shareholders"),
  shareholdersLink: varchar("shareholders_link"),
  directorLink: varchar("director_link"),
  
  // Status
  isActive: boolean("is_active").default(true),
  sl: boolean("sl").default(false),
  
  // Sponsorship License
  slLicenseIssued: boolean("sl_license_issued").default(false),
  slLicenseNumber: varchar("sl_license_number"),
  slLicenseIssueDate: varchar("sl_license_issue_date"),
  slPayeReference: varchar("sl_paye_reference"),
  slWorkAddress: text("sl_work_address"),
  slLevel1Users: jsonb("sl_level1_users").$type<Level1User[]>().default([]),
  slDefinedCOS: integer("sl_defined_cos"),
  slUndefinedCOS: integer("sl_undefined_cos"),
  slPhone: varchar("sl_phone"),
  slEmail: varchar("sl_email"),
  slWebsite: varchar("sl_website"),
  slHasDebitCard: boolean("sl_has_debit_card").default(false),
  slDebitCardActivated: boolean("sl_debit_card_activated").default(false),
  slDebitCardExpiry: varchar("sl_debit_card_expiry"),
  slHasDirectDebitHmrc: boolean("sl_has_direct_debit_hmrc").default(false),
  slHasDirectDebitNest: boolean("sl_has_direct_debit_nest").default(false),
  slUnassignedDefinedCOS: integer("sl_unassigned_defined_cos"),
  slUnassignedUndefinedCOS: integer("sl_unassigned_undefined_cos"),

  // Companies House data
  companyStatus: varchar("company_status"),
  companyType: varchar("company_type"),
  jurisdiction: varchar("jurisdiction"),
  hasCharges: boolean("has_charges"),
  hasInsolvency: boolean("has_insolvency"),
  confirmationStatementDue: varchar("confirmation_statement_due"),
  accountsDue: varchar("accounts_due"),
  lastAccountsDate: varchar("last_accounts_date"),
  confirmationStatementLastMade: varchar("confirmation_statement_last_made"),
  
  // Sync metadata
  lastSyncDate: varchar("last_sync_date"),
  syncStatus: varchar("sync_status").default("never"),
  
  // Activity Log
  activityLog: jsonb("activity_log").$type<ActivityLogEntry[]>().default([]),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const companiesRelations = relations(companies, ({ many }) => ({
  tasks: many(tasks),
  employees: many(employees),
  slPrepTaskStatuses: many(companySLPrepTaskStatuses),
}));

// ==================
// Tasks Table (Company Compliance Tasks)
// ==================
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at").notNull(),
  status: varchar("status").default("open").notNull(),
  meta: jsonb("meta").$type<Record<string, any>>().default({}),
  uniqueKey: varchar("unique_key").notNull(),
  renewalDate: varchar("renewal_date").notNull(),
  reviewed: boolean("reviewed").default(false),
  reviewedAt: timestamp("reviewed_at"),
  reviewerNote: text("reviewer_note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasksRelations = relations(tasks, ({ one }) => ({
  company: one(companies, {
    fields: [tasks.companyId],
    references: [companies.id],
  }),
}));

// ==================
// Task Audits Table
// ==================
export const taskAudits = pgTable("task_audits", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: varchar("task_id").notNull(),
  taskTitle: text("task_title").notNull(),
  companyId: varchar("company_id").notNull(),
  companyName: text("company_name").notNull(),
  fromStatus: varchar("from_status").notNull(),
  toStatus: varchar("to_status").notNull(),
  reason: text("reason"),
  performedBy: varchar("performed_by").default("System").notNull(),
  meta: jsonb("meta").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ==================
// Company Activity Log Table
// ==================
export const companyActivityLogs = pgTable("company_activity_logs", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar("company_id").notNull(),
  companyName: text("company_name").notNull(),
  action: varchar("action").notNull(),
  reason: text("reason").notNull(),
  performedBy: varchar("performed_by").default("System").notNull(),
  meta: jsonb("meta").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ==================
// SL Prep Tasks Table (Master Templates)
// ==================
export const slPrepTasks = pgTable("sl_prep_tasks", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================
// Company SL Prep Task Statuses
// ==================
export const companySLPrepTaskStatuses = pgTable("company_sl_prep_task_statuses", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  taskId: varchar("task_id").notNull().references(() => slPrepTasks.id, { onDelete: "cascade" }),
  isCompleted: boolean("is_completed").default(false).notNull(),
  description: text("description"),
  completionNote: text("completion_note"),
  completedAt: timestamp("completed_at"),
});

export const companySLPrepTaskStatusesRelations = relations(companySLPrepTaskStatuses, ({ one }) => ({
  company: one(companies, {
    fields: [companySLPrepTaskStatuses.companyId],
    references: [companies.id],
  }),
  task: one(slPrepTasks, {
    fields: [companySLPrepTaskStatuses.taskId],
    references: [slPrepTasks.id],
  }),
}));

// ==================
// HR Task Templates Table
// ==================
export const hrTaskTemplates = pgTable("hr_task_templates", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  recurrence: varchar("recurrence").notNull(),
  dueDateOffsetDays: integer("due_date_offset_days").default(7).notNull(),
  priority: varchar("priority").default("medium").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================
// Leaver Task Templates Table
// ==================
export const leaverTaskTemplates = pgTable("leaver_task_templates", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  dueDays: integer("due_days").default(7).notNull(),
  priority: varchar("priority").default("medium").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================
// Residency Task Templates Table
// ==================
export const residencyTaskTemplates = pgTable("residency_task_templates", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  recurrence: varchar("recurrence").notNull(),
  startDateMode: varchar("start_date_mode").notNull(),
  startDate: varchar("start_date"),
  offsetDays: integer("offset_days"),
  priority: varchar("priority").default("medium").notNull(),
  applicantType: varchar("applicant_type").default("main_only").notNull(),
  order: integer("order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==================
// Employee Form Templates Table
// ==================
export const employeeFormTemplates = pgTable("employee_form_templates", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  steps: jsonb("steps").$type<Array<{id: string; title: string; description?: string; order: number}>>().notNull(),
  fields: jsonb("fields").$type<FormField[]>().notNull(),
  globalRules: jsonb("global_rules").$type<ConditionalRule[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================
// Employees Table
// ==================
export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  templateId: varchar("template_id").notNull(),
  templateVersion: integer("template_version").notNull(),
  
  // Basic Details
  firstName: varchar("first_name").notNull(),
  middleNames: varchar("middle_names").default(""),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: varchar("date_of_birth"),
  personalMobile: varchar("personal_mobile"),
  personalEmail: varchar("personal_email"),

  // Address
  ukAddress: text("uk_address"),
  ukAddressProvideLater: varchar("uk_address_provide_later"),
  overseasAddress: text("overseas_address"),
  ukBankAddress: text("uk_bank_address"),
  ukBankAddressProvideLater: varchar("uk_bank_address_provide_later"),

  // Emergency Contact
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactRelationship: varchar("emergency_contact_relationship"),
  emergencyContactPhone: varchar("emergency_contact_phone"),

  // Employment Details
  companyId: varchar("company_id").references(() => companies.id, { onDelete: "cascade" }),
  companyName: text("company_name"),
  department: varchar("department"),
  workLocation: text("work_location"),
  workLocationSource: varchar("work_location_source"),
  lineManager: varchar("line_manager"),
  jobTitle: varchar("job_title"),
  jobDescription: text("job_description"),
  contractType: varchar("contract_type"),
  startDate: varchar("start_date"),
  endDate: varchar("end_date"),
  workingDays: jsonb("working_days").$type<string[]>().default(["monday", "tuesday", "wednesday", "thursday", "friday"]),
  weeklyHours: integer("weekly_hours"),
  dailyWorkingHours: integer("daily_working_hours"),
  startingWorkingTime: varchar("starting_working_time").default("09:00"),
  endingWorkingTime: varchar("ending_working_time"),
  breakMinutes: integer("break_minutes").default(60),
  salary: integer("salary"),
  vacationDays: integer("vacation_days"),
  hourlyRate: integer("hourly_rate"),
  overtimeRate: integer("overtime_rate"),
  payeReference: varchar("paye_reference"),
  nationalInsurance: varchar("national_insurance"),
  nationalInsuranceProvideLater: varchar("national_insurance_provide_later"),
  googleDriveLink: text("google_drive_link"),

  // Nationality/Immigration
  nationality: varchar("nationality"),
  immigrationStatus: varchar("immigration_status"),
  isSponsored: boolean("is_sponsored"),
  
  // Passport
  passportNumber: varchar("passport_number"),
  passportExpiry: varchar("passport_expiry"),
  brpShareCode: varchar("brp_share_code"),
  
  // Visa/Sponsorship
  visaType: varchar("visa_type"),
  cosNumber: varchar("cos_number"),
  sponsorLicenseNumber: varchar("sponsor_license_number"),
  visaIssueDate: varchar("visa_issue_date"),
  visaExpiryDate: varchar("visa_expiry_date"),
  
  // Right to Work
  rtwBasis: varchar("rtw_basis"),
  rtwCheckDate: varchar("rtw_check_date"),
  rtwEvidenceType: varchar("rtw_evidence_type"),
  rtwExpiryDateMode: varchar("rtw_expiry_date_mode"),
  rtwExpiryDate: varchar("rtw_expiry_date"),
  rtwExpiryIndefinite: boolean("rtw_expiry_indefinite").default(false),
  rtwShareCode: varchar("rtw_share_code"),
  
  // Document Verification
  docPassportCopy: boolean("doc_passport_copy").default(false),
  docGraduationCertCopy: boolean("doc_graduation_cert_copy").default(false),
  docProofOfAddressCopy: boolean("doc_proof_of_address_copy").default(false),
  docRtwCopy: boolean("doc_rtw_copy").default(false),
  docCosCopy: boolean("doc_cos_copy").default(false),
  docVisaCopy: boolean("doc_visa_copy").default(false),
  
  // Compliance & Status
  probationPeriod: integer("probation_period").default(3),
  probationEndDate: varchar("probation_end_date"),
  status: varchar("status").default("onboarding").notNull(),
  isDraft: boolean("is_draft").default(false).notNull(),
  leaverDate: varchar("leaver_date"),
  ukviReportingNotes: text("ukvi_reporting_notes"),
  
  // Residency Service
  isResidencyService: boolean("is_residency_service").default(false),
  residencyStatus: varchar("residency_status"),
  residencyLog: jsonb("residency_log").$type<Array<{id: string; timestamp: string; action: string; explanation: string; userName?: string}>>().default([]),
  
  // Documents & Tasks
  documents: jsonb("documents").$type<EmployeeDocument[]>().default([]),
  generatedTaskIds: jsonb("generated_task_ids").$type<string[]>().default([]),
  
  // Form Data & Activity
  formData: jsonb("form_data").$type<Record<string, any>>().default({}),
  activityLog: jsonb("activity_log").$type<ActivityLogEntry[]>().default([]),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeesRelations = relations(employees, ({ one, many }) => ({
  company: one(companies, {
    fields: [employees.companyId],
    references: [companies.id],
  }),
  tasks: many(employeeTasks),
  dependants: many(dependants),
}));

// ==================
// Dependants Table
// ==================
export const dependants = pgTable("dependants", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  employeeName: text("employee_name").notNull(),
  firstName: varchar("first_name").notNull(),
  middleName: varchar("middle_name").default(""),
  lastName: varchar("last_name").notNull(),
  dateOfBirth: varchar("date_of_birth").notNull(),
  relationship: varchar("relationship").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const dependantsRelations = relations(dependants, ({ one }) => ({
  employee: one(employees, {
    fields: [dependants.employeeId],
    references: [employees.id],
  }),
}));

// ==================
// Pending Dependant Requests Table
// ==================
export const pendingDependantRequests = pgTable("pending_dependant_requests", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id").notNull(),
  employeeName: text("employee_name").notNull(),
  action: varchar("action").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: varchar("status").default("pending").notNull(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
  reason: text("reason").notNull(),
  dependantData: jsonb("dependant_data").$type<{id?: string; firstName: string; middleName?: string; lastName: string; dateOfBirth: string; relationship: string}>().notNull(),
});

// ==================
// Pending Employee Status Changes Table
// ==================
export const pendingEmployeeStatusChanges = pgTable("pending_employee_status_changes", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id").notNull(),
  employeeName: text("employee_name").notNull(),
  changeType: varchar("change_type").notNull(),
  currentValue: varchar("current_value").notNull(),
  newValue: varchar("new_value").notNull(),
  reason: text("reason").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: varchar("status").default("pending").notNull(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
});

// ==================
// Pending Company SL Changes Table
// ==================
export const pendingCompanySLChanges = pgTable("pending_company_sl_changes", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar("company_id").notNull(),
  companyName: text("company_name").notNull(),
  field: varchar("field").notNull(),
  currentValue: jsonb("current_value"),
  newValue: jsonb("new_value"),
  reason: text("reason").notNull(),
  requestedBy: varchar("requested_by").notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: varchar("status").default("pending").notNull(),
  reviewedBy: varchar("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNote: text("review_note"),
});

// ==================
// Employee Tasks Table
// ==================
export const employeeTasks = pgTable("employee_tasks", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  employeeName: text("employee_name").notNull(),
  companyId: varchar("company_id").notNull(),
  companyName: text("company_name").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  taskType: varchar("task_type").notNull(),
  dueAt: timestamp("due_at").notNull(),
  status: varchar("status").default("open").notNull(),
  priority: varchar("priority").default("medium").notNull(),
  completionNote: text("completion_note"),
  cancelReason: text("cancel_reason"),
  uniqueKey: varchar("unique_key"),
  meta: jsonb("meta").$type<Record<string, any>>().default({}),
  reviewed: boolean("reviewed").default(false),
  reviewerNote: text("reviewer_note"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeTasksRelations = relations(employeeTasks, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeTasks.employeeId],
    references: [employees.id],
  }),
}));

// ==================
// Employee Activity Logs Table
// ==================
export const employeeActivityLogs = pgTable("employee_activity_logs", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id").notNull(),
  employeeName: text("employee_name").notNull(),
  action: varchar("action").notNull(),
  details: text("details"),
  fieldChanged: varchar("field_changed"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  performedBy: varchar("performed_by").default("System").notNull(),
  meta: jsonb("meta").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ==================
// User Activity Logs Table
// ==================
export const userActivityLogs = pgTable("user_activity_logs", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  action: varchar("action").notNull(),
  targetUsername: varchar("target_username").notNull(),
  targetName: varchar("target_name").notNull(),
  details: text("details"),
  reason: text("reason"),
  performedBy: varchar("performed_by").default("System").notNull(),
  meta: jsonb("meta").$type<Record<string, any>>().default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// ==================
// Holidays Table
// ==================
export const holidays = pgTable("holidays", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  date: varchar("date").notNull(), // YYYY-MM-DD
  day: varchar("day").notNull(),
  holidayName: varchar("holiday_name").notNull(),
});

// ==================
// Attendance Records Table
// ==================
export const attendanceRecords = pgTable("attendance_records", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  date: varchar("date").notNull(),
  day: varchar("day").notNull(),
  status: varchar("status").notNull(),
  scheduledStartTime: varchar("scheduled_start_time"),
  actualClockInTime: varchar("actual_clock_in_time"),
  scheduledEndTime: varchar("scheduled_end_time"),
  actualClockOutTime: varchar("actual_clock_out_time"),
  breakType: varchar("break_type").default("Unpaid").notNull(),
  breakDuration: varchar("break_duration"),
  breakRate: integer("break_rate"),
  hourlyRate: integer("hourly_rate"),
  overtimeRate: integer("overtime_rate"),
  scheduledWorkingHours: integer("scheduled_working_hours"),
  totalWorkingHours: integer("total_working_hours"),
  paidWorkingHours: integer("paid_working_hours"),
  overtimeHours: integer("overtime_hours"),
  breakCost: integer("break_cost"),
  basePay: integer("base_pay"),
  overtimePay: integer("overtime_pay"),
  totalDayPay: integer("total_day_pay"),
  notes: text("notes"),
  anomalyFlag: boolean("anomaly_flag").default(false),
});

// ==================
// System Settings Table (for storing app-wide settings like Google Drive URL)
// ==================
export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: varchar("key").unique().notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==================
// Deletion Requests Table (for approval workflow)
// ==================
export const deletionRequests = pgTable("deletion_requests", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  companyName: text("company_name").notNull(), // Stored for history even if company is deleted
  reason: text("reason").notNull(),
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  requestedByName: text("requested_by_name").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedByName: text("reviewed_by_name"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
});

// ==================
// General Log Table (for audit trail of all important actions)
// ==================
export const generalLog = pgTable("general_log", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  logRefId: integer("log_ref_id"), // Auto-increment reference ID (e.g., LOG-001)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  action: varchar("action").notNull(), // deletion_requested, deletion_approved, deletion_rejected, company_deleted, etc.
  category: varchar("category").notNull(), // company, employee, task, user, sl, training, etc.
  targetId: varchar("target_id"), // ID of the affected entity
  targetName: text("target_name"), // Name/description of the affected entity
  performedBy: varchar("performed_by").notNull(),
  performedByName: text("performed_by_name").notNull(),
  details: text("details"), // Human-readable description
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
});

// Insert schemas and types
export const insertDeletionRequestSchema = createInsertSchema(deletionRequests).omit({
  id: true,
  status: true,
  reviewedBy: true,
  reviewedByName: true,
  reviewedAt: true,
  reviewNotes: true,
  requestedAt: true,
});

export type InsertDeletionRequest = z.infer<typeof insertDeletionRequestSchema>;
export type DeletionRequest = typeof deletionRequests.$inferSelect;

export const insertGeneralLogSchema = createInsertSchema(generalLog).omit({
  id: true,
  timestamp: true,
}).extend({
  metadata: z.record(z.any()).optional(),
});

export type InsertGeneralLog = z.infer<typeof insertGeneralLogSchema>;
export type GeneralLog = typeof generalLog.$inferSelect;

// ==================
// SL TRAINING SYSTEM
// ==================

// Training Modules - Stores training module information
export const slTrainingModules = pgTable("sl_training_modules", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: varchar("name").notNull(),
  learningMaterials: text("learning_materials"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: varchar("created_by"),
  isActive: boolean("is_active").default(true),
});

// Training Questions - Stores quiz questions for each module
export const slTrainingQuestions = pgTable("sl_training_questions", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  moduleId: varchar("module_id").notNull().references(() => slTrainingModules.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  choice1: text("choice_1").notNull(),
  choice2: text("choice_2").notNull(),
  choice3: text("choice_3").notNull(),
  choice4: text("choice_4").notNull(),
  correctAnswer: integer("correct_answer").notNull(), // 1, 2, 3, or 4
  orderIndex: integer("order_index").default(0),
});

// Training Scores - Stores user scores for each module
export const slTrainingScores = pgTable("sl_training_scores", {
  id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  moduleId: varchar("module_id").notNull().references(() => slTrainingModules.id, { onDelete: "cascade" }),
  score: integer("score").notNull(), // Percentage score (0-100)
  totalQuestions: integer("total_questions").notNull(),
  correctAnswers: integer("correct_answers").notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  lastAnswers: jsonb("last_answers").$type<number[]>().default([]), // User's last answers
});

// Insert schemas and types for SL Training
export const insertSlTrainingModuleSchema = createInsertSchema(slTrainingModules).omit({
  id: true,
  createdAt: true,
});
export type InsertSlTrainingModule = z.infer<typeof insertSlTrainingModuleSchema>;
export type SlTrainingModule = typeof slTrainingModules.$inferSelect;

export const insertSlTrainingQuestionSchema = createInsertSchema(slTrainingQuestions).omit({
  id: true,
});
export type InsertSlTrainingQuestion = z.infer<typeof insertSlTrainingQuestionSchema>;
export type SlTrainingQuestion = typeof slTrainingQuestions.$inferSelect;

export const insertSlTrainingScoreSchema = createInsertSchema(slTrainingScores).omit({
  id: true,
  completedAt: true,
});
export type InsertSlTrainingScore = z.infer<typeof insertSlTrainingScoreSchema>;
export type SlTrainingScore = typeof slTrainingScores.$inferSelect;
