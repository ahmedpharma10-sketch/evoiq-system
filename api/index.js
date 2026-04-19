var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  activityLogEntrySchema: () => activityLogEntrySchema,
  attendanceRecordSchema: () => attendanceRecordSchema,
  attendanceRecords: () => attendanceRecords,
  baseInsertCompanySchema: () => baseInsertCompanySchema,
  chargeSchema: () => chargeSchema,
  companies: () => companies,
  companiesRelations: () => companiesRelations,
  companyActivityLogSchema: () => companyActivityLogSchema,
  companyActivityLogs: () => companyActivityLogs,
  companySLPrepTaskStatusSchema: () => companySLPrepTaskStatusSchema,
  companySLPrepTaskStatuses: () => companySLPrepTaskStatuses,
  companySLPrepTaskStatusesRelations: () => companySLPrepTaskStatusesRelations,
  companySchema: () => companySchema,
  completeEmployeeRecordSchema: () => completeEmployeeRecordSchema,
  conditionalRuleSchema: () => conditionalRuleSchema,
  deletionRequests: () => deletionRequests,
  dependantSchema: () => dependantSchema,
  dependants: () => dependants,
  dependantsRelations: () => dependantsRelations,
  directorSchema: () => directorSchema,
  documentMetadataSchema: () => documentMetadataSchema,
  draftEmployeeRecordSchema: () => draftEmployeeRecordSchema,
  employeeActivityLogSchema: () => employeeActivityLogSchema,
  employeeActivityLogs: () => employeeActivityLogs,
  employeeDocumentSchema: () => employeeDocumentSchema,
  employeeFormTemplateSchema: () => employeeFormTemplateSchema,
  employeeFormTemplates: () => employeeFormTemplates,
  employeeRecordSchema: () => employeeRecordSchema,
  employeeTaskSchema: () => employeeTaskSchema,
  employeeTasks: () => employeeTasks,
  employeeTasksRelations: () => employeeTasksRelations,
  employees: () => employees,
  employeesRelations: () => employeesRelations,
  filingHistorySchema: () => filingHistorySchema,
  formFieldOptionSchema: () => formFieldOptionSchema,
  formFieldSchema: () => formFieldSchema,
  generalLog: () => generalLog,
  holidaySchema: () => holidaySchema,
  holidays: () => holidays,
  hrTaskTemplateSchema: () => hrTaskTemplateSchema,
  hrTaskTemplates: () => hrTaskTemplates,
  insertAttendanceRecordSchema: () => insertAttendanceRecordSchema,
  insertCompanyActivityLogSchema: () => insertCompanyActivityLogSchema,
  insertCompanySLPrepTaskStatusSchema: () => insertCompanySLPrepTaskStatusSchema,
  insertCompanySchema: () => insertCompanySchema,
  insertDeletionRequestSchema: () => insertDeletionRequestSchema,
  insertDependantSchema: () => insertDependantSchema,
  insertEmployeeActivityLogSchema: () => insertEmployeeActivityLogSchema,
  insertEmployeeFormTemplateSchema: () => insertEmployeeFormTemplateSchema,
  insertEmployeeRecordSchema: () => insertEmployeeRecordSchema,
  insertEmployeeTaskSchema: () => insertEmployeeTaskSchema,
  insertGeneralLogSchema: () => insertGeneralLogSchema,
  insertHRTaskTemplateSchema: () => insertHRTaskTemplateSchema,
  insertHolidaySchema: () => insertHolidaySchema,
  insertLeaverTaskTemplateSchema: () => insertLeaverTaskTemplateSchema,
  insertPendingCompanySLChangeSchema: () => insertPendingCompanySLChangeSchema,
  insertPendingDependantRequestSchema: () => insertPendingDependantRequestSchema,
  insertPendingEmployeeStatusChangeSchema: () => insertPendingEmployeeStatusChangeSchema,
  insertResidencyTaskTemplateSchema: () => insertResidencyTaskTemplateSchema,
  insertSLPrepTaskSchema: () => insertSLPrepTaskSchema,
  insertSlTrainingModuleSchema: () => insertSlTrainingModuleSchema,
  insertSlTrainingQuestionSchema: () => insertSlTrainingQuestionSchema,
  insertSlTrainingScoreSchema: () => insertSlTrainingScoreSchema,
  insertTaskAuditSchema: () => insertTaskAuditSchema,
  insertTaskSchema: () => insertTaskSchema,
  insertUserActivityLogSchema: () => insertUserActivityLogSchema,
  insertUserSchema: () => insertUserSchema,
  insolvencySchema: () => insolvencySchema,
  leaverTaskTemplateSchema: () => leaverTaskTemplateSchema,
  leaverTaskTemplates: () => leaverTaskTemplates,
  level1UserSchema: () => level1UserSchema,
  pendingCompanySLChangeSchema: () => pendingCompanySLChangeSchema,
  pendingCompanySLChanges: () => pendingCompanySLChanges,
  pendingDependantRequestSchema: () => pendingDependantRequestSchema,
  pendingDependantRequests: () => pendingDependantRequests,
  pendingEmployeeStatusChangeSchema: () => pendingEmployeeStatusChangeSchema,
  pendingEmployeeStatusChanges: () => pendingEmployeeStatusChanges,
  previousNameSchema: () => previousNameSchema,
  pscSchema: () => pscSchema,
  residencyTaskTemplateSchema: () => residencyTaskTemplateSchema,
  residencyTaskTemplates: () => residencyTaskTemplates,
  sanitizeEmployeePayload: () => sanitizeEmployeePayload,
  slPrepTaskSchema: () => slPrepTaskSchema,
  slPrepTasks: () => slPrepTasks,
  slTrainingModules: () => slTrainingModules,
  slTrainingQuestions: () => slTrainingQuestions,
  slTrainingScores: () => slTrainingScores,
  systemSettings: () => systemSettings,
  taskAuditSchema: () => taskAuditSchema,
  taskAudits: () => taskAudits,
  taskSchema: () => taskSchema,
  tasks: () => tasks,
  tasksRelations: () => tasksRelations,
  userActivityLogSchema: () => userActivityLogSchema,
  userActivityLogs: () => userActivityLogs,
  userSchema: () => userSchema,
  users: () => users,
  usersRelations: () => usersRelations
});
import { z } from "zod";
import { pgTable, text, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
function normalizeEmptyString(value) {
  if (typeof value === "string" && value.trim() === "") {
    return void 0;
  }
  return value;
}
function sanitizeEmployeePayload(data) {
  const sanitized = {};
  for (const key in data) {
    const value = data[key];
    if (typeof value === "string") {
      const trimmed = value.trim();
      sanitized[key] = trimmed === "" ? void 0 : trimmed;
    } else if (value !== null && value !== void 0) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
var directorSchema, pscSchema, previousNameSchema, chargeSchema, insolvencySchema, filingHistorySchema, documentMetadataSchema, level1UserSchema, activityLogEntrySchema, companySchema, baseInsertCompanySchema, insertCompanySchema, taskSchema, insertTaskSchema, taskAuditSchema, insertTaskAuditSchema, companyActivityLogSchema, insertCompanyActivityLogSchema, slPrepTaskSchema, insertSLPrepTaskSchema, hrTaskTemplateSchema, insertHRTaskTemplateSchema, leaverTaskTemplateSchema, insertLeaverTaskTemplateSchema, residencyTaskTemplateSchema, insertResidencyTaskTemplateSchema, companySLPrepTaskStatusSchema, insertCompanySLPrepTaskStatusSchema, employeeDocumentSchema, conditionalRuleSchema, formFieldOptionSchema, formFieldSchema, employeeFormTemplateSchema, insertEmployeeFormTemplateSchema, employeeRecordSchema, insertEmployeeRecordSchema, draftEmployeeRecordSchema, completeEmployeeRecordSchema, dependantSchema, insertDependantSchema, pendingDependantRequestSchema, insertPendingDependantRequestSchema, pendingEmployeeStatusChangeSchema, insertPendingEmployeeStatusChangeSchema, pendingCompanySLChangeSchema, insertPendingCompanySLChangeSchema, userSchema, insertUserSchema, employeeTaskSchema, insertEmployeeTaskSchema, employeeActivityLogSchema, insertEmployeeActivityLogSchema, userActivityLogSchema, insertUserActivityLogSchema, holidaySchema, insertHolidaySchema, attendanceRecordSchema, insertAttendanceRecordSchema, users, usersRelations, companies, companiesRelations, tasks, tasksRelations, taskAudits, companyActivityLogs, slPrepTasks, companySLPrepTaskStatuses, companySLPrepTaskStatusesRelations, hrTaskTemplates, leaverTaskTemplates, residencyTaskTemplates, employeeFormTemplates, employees, employeesRelations, dependants, dependantsRelations, pendingDependantRequests, pendingEmployeeStatusChanges, pendingCompanySLChanges, employeeTasks, employeeTasksRelations, employeeActivityLogs, userActivityLogs, holidays, attendanceRecords, systemSettings, deletionRequests, generalLog, insertDeletionRequestSchema, insertGeneralLogSchema, slTrainingModules, slTrainingQuestions, slTrainingScores, insertSlTrainingModuleSchema, insertSlTrainingQuestionSchema, insertSlTrainingScoreSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    directorSchema = z.object({
      name: z.string(),
      officerRole: z.string().optional(),
      appointedOn: z.string().optional(),
      resignedOn: z.string().optional(),
      nationality: z.string().optional(),
      occupation: z.string().optional(),
      countryOfResidence: z.string().optional(),
      address: z.string().optional()
    });
    pscSchema = z.object({
      name: z.string(),
      kind: z.string().optional(),
      // individual-person-with-significant-control, corporate-entity-person-with-significant-control, etc.
      naturesOfControl: z.array(z.string()).optional(),
      notifiedOn: z.string().optional(),
      ceasedOn: z.string().optional(),
      nationality: z.string().optional(),
      countryOfResidence: z.string().optional(),
      address: z.string().optional()
    });
    previousNameSchema = z.object({
      name: z.string(),
      effectiveFrom: z.string().optional(),
      ceasedOn: z.string().optional()
    });
    chargeSchema = z.object({
      chargeNumber: z.string().optional(),
      createdOn: z.string().optional(),
      deliveredOn: z.string().optional(),
      status: z.string().optional(),
      assetsCeasedReleased: z.string().optional(),
      personsEntitled: z.array(z.string()).optional(),
      transactions: z.array(z.string()).optional(),
      particulars: z.string().optional()
    });
    insolvencySchema = z.object({
      caseNumber: z.string().optional(),
      type: z.string().optional(),
      date: z.string().optional(),
      practitioners: z.array(z.string()).optional()
    });
    filingHistorySchema = z.object({
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
        documentMetadata: z.string().optional()
      }).optional()
    });
    documentMetadataSchema = z.object({
      id: z.string().optional(),
      category: z.string().optional(),
      filingDate: z.string().optional(),
      description: z.string().optional(),
      pages: z.number().optional(),
      contentLength: z.number().optional(),
      links: z.object({
        document: z.string().optional(),
        self: z.string().optional()
      }).optional()
    });
    level1UserSchema = z.object({
      id: z.string(),
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email")
    });
    activityLogEntrySchema = z.object({
      id: z.string(),
      timestamp: z.string(),
      // ISO datetime
      action: z.string(),
      // created, updated, deleted, status_changed, task_completed, etc.
      description: z.string(),
      // Human-readable description
      user: z.string().optional().default("System"),
      // Who performed the action
      meta: z.record(z.any()).optional().default({})
      // Additional metadata
    });
    companySchema = z.object({
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
      officers: z.array(directorSchema).optional().default([]),
      // Same structure as directors
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
      slDefinedCOS: z.number().optional(),
      // Defined unassigned COS count
      slUndefinedCOS: z.number().optional(),
      // Undefined unassigned COS count
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
      companiesHouseNextRenewalDate: z.string().optional(),
      // Computed as earliest of confirmation statement or accounts due
      // Sync metadata
      lastSyncDate: z.string().optional(),
      syncStatus: z.enum(["never", "success", "partial", "error"]).optional().default("never"),
      // Activity Log
      activityLog: z.array(activityLogEntrySchema).optional().default([])
    });
    baseInsertCompanySchema = companySchema.omit({ id: true });
    insertCompanySchema = baseInsertCompanySchema.refine(
      (data) => {
        if (data.hasRenewalFees) {
          return data.renewalFees && data.renewalFees.trim().length > 0;
        }
        return true;
      },
      {
        message: "Renewal Fees amount is required when 'Has Renewal Fees' is checked",
        path: ["renewalFees"]
      }
    );
    taskSchema = z.object({
      id: z.string(),
      companyId: z.string(),
      companyName: z.string(),
      title: z.string().min(1, "Task title is required"),
      description: z.string().optional(),
      dueAt: z.string(),
      // ISO datetime
      status: z.enum(["open", "done", "skipped", "cancelled"]).default("open"),
      meta: z.record(z.any()).optional().default({}),
      // JSON metadata
      uniqueKey: z.string(),
      // pattern: {type}:{companyId}:{renewalDate}
      renewalDate: z.string(),
      // The renewal_date this task was generated from
      createdAt: z.string().optional(),
      // Review tracking (Phase 2 - Auditor)
      reviewed: z.boolean().optional().default(false),
      reviewedAt: z.string().optional(),
      // ISO datetime
      reviewerNote: z.string().optional()
    });
    insertTaskSchema = taskSchema.omit({ id: true, createdAt: true });
    taskAuditSchema = z.object({
      id: z.string(),
      taskId: z.string(),
      taskTitle: z.string(),
      companyId: z.string(),
      companyName: z.string(),
      fromStatus: z.string(),
      toStatus: z.string(),
      reason: z.string().optional(),
      // Required for cancellation
      timestamp: z.string(),
      // ISO datetime
      performedBy: z.string().default("System"),
      // User who performed the action
      meta: z.record(z.any()).optional().default({})
      // Additional metadata
    });
    insertTaskAuditSchema = taskAuditSchema.omit({ id: true });
    companyActivityLogSchema = z.object({
      id: z.string(),
      companyId: z.string(),
      companyName: z.string(),
      action: z.string(),
      // "deactivated", "activated", "removed_from_sl", "added_to_sl"
      reason: z.string(),
      // Required reason for the action
      timestamp: z.string(),
      // ISO datetime
      performedBy: z.string().default("System"),
      // User who performed the action
      meta: z.record(z.any()).optional().default({})
      // Additional metadata
    });
    insertCompanyActivityLogSchema = companyActivityLogSchema.omit({ id: true });
    slPrepTaskSchema = z.object({
      id: z.string(),
      name: z.string().min(1, "Task name is required"),
      order: z.number().default(0),
      // Display order
      createdAt: z.string()
      // ISO datetime
    });
    insertSLPrepTaskSchema = slPrepTaskSchema.omit({ id: true, createdAt: true });
    hrTaskTemplateSchema = z.object({
      id: z.string(),
      name: z.string().min(1, "Task name is required"),
      description: z.string().optional(),
      recurrence: z.enum(["one_time", "monthly", "annual"]),
      // How often this task repeats
      dueDateOffsetDays: z.number().min(0, "Due date offset must be 0 or greater").default(7),
      // Days after employee start date when task is due
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      order: z.number().default(0),
      // Display order
      createdAt: z.string()
      // ISO datetime
    });
    insertHRTaskTemplateSchema = hrTaskTemplateSchema.omit({ id: true, createdAt: true });
    leaverTaskTemplateSchema = z.object({
      id: z.string(),
      name: z.string().min(1, "Task name is required"),
      description: z.string().optional(),
      dueDays: z.number().min(0, "Due days must be 0 or greater").default(7),
      // Days after becoming leaver when task is due
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      order: z.number().default(0),
      // Display order
      createdAt: z.string()
      // ISO datetime
    });
    insertLeaverTaskTemplateSchema = leaverTaskTemplateSchema.omit({ id: true, createdAt: true });
    residencyTaskTemplateSchema = z.object({
      id: z.string(),
      name: z.string().min(1, "Task name is required"),
      description: z.string().optional(),
      recurrence: z.enum(["one_time", "weekly", "monthly", "quarterly", "annually"]),
      // How often this task repeats
      startDateMode: z.enum(["manual", "offset_days"]),
      // How to determine task start date
      startDate: z.string().optional(),
      // ISO datetime - used when startDateMode is "manual"
      offsetDays: z.number().optional(),
      // Days after employee starting date - used when startDateMode is "offset_days"
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      applicantType: z.enum(["main_only", "main_and_dependants"]).default("main_only"),
      // Who gets this task
      order: z.number().default(0),
      // Display order
      createdAt: z.string()
      // ISO datetime
    });
    insertResidencyTaskTemplateSchema = residencyTaskTemplateSchema.omit({ id: true, createdAt: true });
    companySLPrepTaskStatusSchema = z.object({
      id: z.string(),
      companyId: z.string(),
      taskId: z.string(),
      isCompleted: z.boolean().default(false),
      description: z.string().optional(),
      // Task-specific details/notes entered when completing
      completionNote: z.string().optional(),
      // Required when marking as completed (min 10 chars)
      completedAt: z.string().optional()
      // ISO datetime
    });
    insertCompanySLPrepTaskStatusSchema = companySLPrepTaskStatusSchema.omit({ id: true });
    employeeDocumentSchema = z.object({
      id: z.string(),
      type: z.enum(["passport", "visa_brp", "cos", "contract", "rtw_evidence", "proof_of_address", "other"]),
      title: z.string().min(1, "Document title is required"),
      link: z.string().optional(),
      // URL or file path
      issueDate: z.string().optional(),
      // ISO date
      expiryDate: z.string().optional()
      // ISO date
    });
    conditionalRuleSchema = z.object({
      id: z.string(),
      triggerFieldId: z.string(),
      // ID of the field that triggers this rule
      operator: z.enum(["equals", "not_equals", "contains", "not_contains", "is_empty", "is_not_empty"]),
      value: z.union([z.string(), z.boolean(), z.array(z.string())]).optional(),
      // Value to compare against
      action: z.enum(["show", "hide", "require", "optional", "set_value"]),
      // What to do when rule is true
      targetFieldIds: z.array(z.string()),
      // Fields affected by this rule
      targetValue: z.string().optional()
      // Value to set (if action is set_value)
    });
    formFieldOptionSchema = z.object({
      label: z.string(),
      value: z.string()
    });
    formFieldSchema = z.object({
      id: z.string(),
      name: z.string().min(1, "Field name is required"),
      // Internal name/key
      label: z.string().min(1, "Field label is required"),
      // Display label
      type: z.enum([
        "text",
        "email",
        "tel",
        "number",
        "date",
        "textarea",
        "select",
        "radio",
        "checkbox",
        "checkbox_group",
        "file",
        "section_header",
        "info_text"
      ]),
      placeholder: z.string().optional(),
      helperText: z.string().optional(),
      // Guidance text shown below field
      defaultValue: z.union([z.string(), z.boolean(), z.number(), z.array(z.string())]).optional(),
      required: z.boolean().optional(),
      validation: z.object({
        min: z.number().optional(),
        // Min length for text, min value for number
        max: z.number().optional(),
        // Max length for text, max value for number
        pattern: z.string().optional(),
        // Regex pattern
        customErrorMessage: z.string().optional()
      }).optional(),
      options: z.array(formFieldOptionSchema).optional(),
      // For select, radio, checkbox_group
      step: z.number().optional(),
      // Which step this field belongs to (1, 2, 3, etc.)
      order: z.number().optional(),
      conditionalRules: z.array(conditionalRuleSchema).optional(),
      // Rules that affect this field's visibility
      width: z.enum(["full", "half"]).optional(),
      maxLength: z.number().optional(),
      // Maximum character length for text/textarea fields
      autoCalculate: z.object({
        formula: z.enum(["probation_end", "rtw_check_date", "visa_renewal_prep", "report_start_ukvi"]).optional(),
        dependencies: z.array(z.string()).optional()
        // Field IDs this calculation depends on
      }).optional()
    });
    employeeFormTemplateSchema = z.object({
      id: z.string(),
      name: z.string().min(1, "Template name is required"),
      description: z.string().optional(),
      version: z.number().default(1),
      isActive: z.boolean().default(true),
      steps: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string().optional(),
        order: z.number()
      })),
      fields: z.array(formFieldSchema),
      globalRules: z.array(conditionalRuleSchema).optional(),
      // Rules that span multiple fields
      createdAt: z.string(),
      // ISO datetime
      updatedAt: z.string()
      // ISO datetime
    });
    insertEmployeeFormTemplateSchema = employeeFormTemplateSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    employeeRecordSchema = z.object({
      id: z.string(),
      templateId: z.string(),
      // Which form template was used
      templateVersion: z.number(),
      // Version of template when this employee was created
      // Basic Details
      firstName: z.string().min(1, "First name is required"),
      middleNames: z.string().optional().default(""),
      // Optional for existing records, but required in form
      lastName: z.string().min(1, "Last name is required"),
      dateOfBirth: z.string(),
      // ISO date
      personalMobile: z.string().min(1, "Mobile is required"),
      personalEmail: z.string().email("Invalid email"),
      // Address
      ukAddress: z.string().optional(),
      ukAddressProvideLater: z.string().optional(),
      // "1_week", "2_weeks", "3_weeks", "4_weeks", "5_weeks", "6_weeks", or empty
      overseasAddress: z.string().min(1, "Overseas address is required"),
      ukBankAddress: z.string().optional(),
      ukBankAddressProvideLater: z.string().optional(),
      // "1_week", "2_weeks", "3_weeks", "4_weeks", "5_weeks", "6_weeks", or empty
      // Emergency Contact (all mandatory)
      emergencyContactName: z.string().min(1, "Emergency contact name is required"),
      emergencyContactRelationship: z.string().min(1, "Emergency contact relationship is required"),
      emergencyContactPhone: z.string().min(1, "Emergency contact phone is required"),
      // Employment Details
      companyId: z.string().min(1, "Company is required"),
      companyName: z.string(),
      // Denormalized for display
      department: z.string().optional(),
      // Business development, Marketing/Sales/Export, Administration, HR, Finance, Technical
      workLocation: z.string().optional(),
      // Can be company address or SL work address
      workLocationSource: z.string().optional(),
      // "companies_house" or "sl_section" - indicates which source was selected
      lineManager: z.string().optional(),
      jobTitle: z.string().min(1, "Job title is required"),
      jobDescription: z.string().optional(),
      contractType: z.enum(["permanent", "fixed_term", "contractor"]),
      startDate: z.string(),
      // ISO date
      endDate: z.string().optional(),
      // Required if fixed_term
      workingDays: z.array(z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])).optional().default(["monday", "tuesday", "wednesday", "thursday", "friday"]),
      // Default Mon-Fri
      weeklyHours: z.number().min(0),
      dailyWorkingHours: z.number().optional(),
      // Auto-calculated: weeklyHours / number of working days
      startingWorkingTime: z.string().optional().default("09:00"),
      // HH:mm format, default 9am
      endingWorkingTime: z.string().optional(),
      // Auto-calculated: startingWorkingTime + dailyWorkingHours + 1 hour rest
      breakMinutes: z.number().optional().default(60),
      // Break duration in minutes, default 60 (1 hour)
      vacationDays: z.number().min(0).optional(),
      // Annual vacation/holiday entitlement in days
      salary: z.number().min(0),
      hourlyRate: z.number().optional(),
      // If contractor
      overtimeRate: z.number().optional(),
      // Optional overtime rate (defaults to hourlyRate if not set)
      payeReference: z.string().optional(),
      // Auto-populated from company, read-only
      nationalInsurance: z.string().optional(),
      nationalInsuranceProvideLater: z.string().optional(),
      // "1_week", "2_weeks", "3_weeks", "4_weeks", "5_weeks", "6_weeks", or empty
      googleDriveLink: z.string().min(1, "Google Drive link is required"),
      // Nationality/Immigration Status
      nationality: z.string().optional(),
      // Mandatory field for all employees
      immigrationStatus: z.enum(["british", "settled", "other"]),
      isSponsored: z.boolean().optional(),
      // Only relevant if immigrationStatus = "other"
      // Passport Details
      passportNumber: z.string().optional(),
      // Mandatory field for all employees
      passportExpiry: z.string().optional(),
      // ISO date - Mandatory field for all employees
      brpShareCode: z.string().optional(),
      // Visa/Sponsorship Details (if sponsored)
      visaType: z.string().optional(),
      cosNumber: z.string().optional(),
      sponsorLicenseNumber: z.string().optional(),
      visaIssueDate: z.string().optional(),
      // ISO date
      visaExpiryDate: z.string().optional(),
      // ISO date
      // Right to Work Details
      rtwBasis: z.string().optional(),
      // "dependant", "graduate", "student", "eu_presettled", "other"
      rtwCheckDate: z.string().optional(),
      // ISO date
      rtwEvidenceType: z.string().optional(),
      // "passport", "brp", "share_code"
      rtwExpiryDateMode: z.string().optional(),
      // "auto" (match visa expiry) or "manual" (user-specified)
      rtwExpiryDate: z.string().optional(),
      // ISO date - can be set to specific date or marked as indefinite
      rtwExpiryIndefinite: z.boolean().optional().default(false),
      // True if RTW expiry is indefinite
      rtwShareCode: z.string().optional(),
      // Document Verification Checkboxes (kept copy of documents)
      docPassportCopy: z.boolean().optional().default(false),
      docGraduationCertCopy: z.boolean().optional().default(false),
      docProofOfAddressCopy: z.boolean().optional().default(false),
      docRtwCopy: z.boolean().optional().default(false),
      // Conditional: only if RTW check required
      docCosCopy: z.boolean().optional().default(false),
      // Conditional: only if sponsored
      docVisaCopy: z.boolean().optional().default(false),
      // Conditional: only if has visa
      // Compliance & Status
      probationPeriod: z.number().default(3),
      // Months
      probationEndDate: z.string().optional(),
      // ISO date (auto-calculated)
      status: z.enum(["onboarding", "active", "on_hold", "leaver", "deactivated"]).default("onboarding"),
      isDraft: z.boolean().optional().default(false),
      // True if employee is saved incomplete (draft state)
      leaverDate: z.string().optional(),
      // ISO date - set when status becomes "leaver"
      ukviReportingNotes: z.string().optional(),
      // Residency Service
      isResidencyService: z.boolean().optional().default(false),
      residencyStatus: z.enum(["pending", "done"]).optional(),
      residencyLog: z.array(z.object({
        id: z.string(),
        timestamp: z.string(),
        // ISO datetime
        action: z.enum(["enabled", "disabled", "marked_done"]),
        explanation: z.string(),
        userName: z.string().optional()
        // Who made the change
      })).optional().default([]),
      // Documents
      documents: z.array(employeeDocumentSchema).optional().default([]),
      // Generated Tasks
      generatedTaskIds: z.array(z.string()).optional().default([]),
      // IDs of auto-generated tasks
      // All form responses (flexible storage for custom fields)
      formData: z.record(z.any()).optional().default({}),
      // Key-value pairs of all field responses
      // Activity Log
      activityLog: z.array(activityLogEntrySchema).optional().default([]),
      // Metadata
      createdAt: z.string(),
      // ISO datetime
      updatedAt: z.string()
      // ISO datetime
    });
    insertEmployeeRecordSchema = employeeRecordSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    draftEmployeeRecordSchema = insertEmployeeRecordSchema.extend({
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
      googleDriveLink: z.string().optional()
    }).partial().required({
      isDraft: true,
      firstName: true,
      lastName: true,
      templateId: true,
      templateVersion: true
    });
    completeEmployeeRecordSchema = insertEmployeeRecordSchema.extend({
      isDraft: z.literal(false).optional().default(false)
    }).superRefine((data, ctx) => {
      if (data.isDraft === false || data.isDraft === void 0) {
        const requiredStringFields = [
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
          ["rtwCheckDate", "RTW check date"]
        ];
        requiredStringFields.forEach(([field, label]) => {
          const value = normalizeEmptyString(data[field]);
          if (!value) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [field],
              message: `${label} is required for complete employees`
            });
          }
        });
        const requiredDocs = [
          ["docPassportCopy", "Passport copy"],
          ["docGraduationCertCopy", "Graduation certificate copy"],
          ["docProofOfAddressCopy", "Proof of address copy"],
          ["docRtwCopy", "Right to Work document copy"]
        ];
        requiredDocs.forEach(([field, label]) => {
          if (!data[field]) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [field],
              message: `${label} must be confirmed for complete employees`
            });
          }
        });
        const nationalInsurance = normalizeEmptyString(data.nationalInsurance);
        const nationalInsuranceProvideLater = normalizeEmptyString(data.nationalInsuranceProvideLater);
        if (!nationalInsurance && !nationalInsuranceProvideLater) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["nationalInsurance"],
            message: "National Insurance number or 'Provide Later' option is required"
          });
        }
        const ukAddress = normalizeEmptyString(data.ukAddress);
        const ukAddressProvideLater = normalizeEmptyString(data.ukAddressProvideLater);
        if (!ukAddress && !ukAddressProvideLater) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["ukAddress"],
            message: "UK address or 'Provide Later' option is required"
          });
        }
        const rtwExpiryDate = normalizeEmptyString(data.rtwExpiryDate);
        if (!data.rtwExpiryIndefinite && !rtwExpiryDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rtwExpiryDate"],
            message: "RTW expiry date is required (or mark as indefinite)"
          });
        }
        const rtwEvidenceType = normalizeEmptyString(data.rtwEvidenceType);
        const rtwShareCode = normalizeEmptyString(data.rtwShareCode);
        if (rtwEvidenceType === "share_code" && !rtwShareCode) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rtwShareCode"],
            message: "RTW share code is required when evidence type is 'share code'"
          });
        }
        if (data.immigrationStatus === "other") {
          const visaExpiryDate = normalizeEmptyString(data.visaExpiryDate);
          const visaIssueDate = normalizeEmptyString(data.visaIssueDate);
          const visaType = normalizeEmptyString(data.visaType);
          if (!visaExpiryDate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["visaExpiryDate"],
              message: "Visa expiry date is required for immigration status 'other'"
            });
          }
          if (!visaIssueDate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["visaIssueDate"],
              message: "Visa issue date is required for immigration status 'other'"
            });
          }
          if (!visaType) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["visaType"],
              message: "Visa type is required for immigration status 'other'"
            });
          }
          if (!data.docVisaCopy) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["docVisaCopy"],
              message: "Visa copy must be confirmed when visa details are provided"
            });
          }
          if (data.isSponsored === true) {
            const cosNumber = normalizeEmptyString(data.cosNumber);
            const sponsorLicenseNumber = normalizeEmptyString(data.sponsorLicenseNumber);
            if (!cosNumber) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["cosNumber"],
                message: "COS number is required for sponsored employees"
              });
            }
            if (!sponsorLicenseNumber) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["sponsorLicenseNumber"],
                message: "Sponsor license number is required for sponsored employees"
              });
            }
            if (!data.docCosCopy) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ["docCosCopy"],
                message: "Certificate of Sponsorship copy must be confirmed for sponsored employees"
              });
            }
          }
        }
        if (["british", "settled"].includes(data.immigrationStatus) && !data.rtwExpiryIndefinite) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["rtwExpiryIndefinite"],
            message: "RTW expiry should be marked as indefinite for British/Settled status"
          });
        }
        if (data.contractType === "fixed_term") {
          const endDate = normalizeEmptyString(data.endDate);
          if (!endDate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ["endDate"],
              message: "End date is required for fixed-term contracts"
            });
          }
        }
      }
    });
    dependantSchema = z.object({
      id: z.string(),
      employeeId: z.string(),
      // The main employee this dependant belongs to
      employeeName: z.string(),
      // Denormalized name of main employee for display
      firstName: z.string().min(1, "First name is required"),
      middleName: z.string().optional().default(""),
      lastName: z.string().min(1, "Last name is required"),
      dateOfBirth: z.string(),
      // ISO date
      relationship: z.enum(["spouse", "child"]),
      whatsAppNumber: z.string().optional().default(""),
      // Optional for backward compatibility with legacy data
      createdAt: z.string()
      // ISO datetime
    });
    insertDependantSchema = dependantSchema.omit({
      id: true,
      createdAt: true
    });
    pendingDependantRequestSchema = z.object({
      id: z.string(),
      employeeId: z.string(),
      employeeName: z.string(),
      action: z.enum(["add", "remove"]),
      requestedBy: z.string(),
      // Name of the user who made the request
      requestedAt: z.string(),
      // ISO datetime
      status: z.enum(["pending", "approved", "rejected"]).default("pending"),
      reviewedBy: z.string().optional(),
      // Name of the user who approved/rejected
      reviewedAt: z.string().optional(),
      // ISO datetime
      reviewNote: z.string().optional(),
      // Auditor's note
      reason: z.string(),
      // Reason for add/remove
      // Dependant data (for add requests or storing info for remove requests)
      dependantData: z.object({
        id: z.string().optional(),
        // For remove requests, this is the dependant ID
        firstName: z.string(),
        middleName: z.string().optional(),
        lastName: z.string(),
        dateOfBirth: z.string(),
        relationship: z.enum(["spouse", "child"]),
        whatsAppNumber: z.string().optional().default("")
        // Optional for backward compatibility with legacy data
      })
    });
    insertPendingDependantRequestSchema = pendingDependantRequestSchema.omit({
      id: true,
      reviewedBy: true,
      reviewedAt: true,
      reviewNote: true
    });
    pendingEmployeeStatusChangeSchema = z.object({
      id: z.string(),
      employeeId: z.string(),
      employeeName: z.string(),
      changeType: z.enum(["status", "deactivation", "reactivation"]),
      currentValue: z.string(),
      // Current status/active state
      newValue: z.string(),
      // Proposed status/active state
      reason: z.string(),
      // Reason for the change
      requestedBy: z.string(),
      // Name of the user who made the request
      requestedAt: z.string(),
      // ISO datetime
      status: z.enum(["pending", "approved", "rejected"]).default("pending"),
      reviewedBy: z.string().optional(),
      // Name of the HR auditor who approved/rejected
      reviewedAt: z.string().optional(),
      // ISO datetime
      reviewNote: z.string().optional()
      // Auditor's note
    });
    insertPendingEmployeeStatusChangeSchema = pendingEmployeeStatusChangeSchema.omit({
      id: true,
      reviewedBy: true,
      reviewedAt: true,
      reviewNote: true
    });
    pendingCompanySLChangeSchema = z.object({
      id: z.string(),
      companyId: z.string(),
      companyName: z.string(),
      field: z.string(),
      // Which SL field was changed (e.g., "slStatus", "slNumber", etc.)
      currentValue: z.any(),
      // Current value
      newValue: z.any(),
      // Proposed value
      reason: z.string(),
      // Reason for the change
      requestedBy: z.string(),
      // Name of the user who made the request
      requestedAt: z.string(),
      // ISO datetime
      status: z.enum(["pending", "approved", "rejected"]).default("pending"),
      reviewedBy: z.string().optional(),
      // Name of the company auditor who approved/rejected
      reviewedAt: z.string().optional(),
      // ISO datetime
      reviewNote: z.string().optional()
      // Auditor's note
    });
    insertPendingCompanySLChangeSchema = pendingCompanySLChangeSchema.omit({
      id: true,
      reviewedBy: true,
      reviewedAt: true,
      reviewNote: true
    });
    userSchema = z.object({
      id: z.string(),
      userId: z.string(),
      // Unique visible ID (e.g., "USR-001")
      username: z.string().min(1, "Username is required"),
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email"),
      position: z.string().min(1, "Position is required"),
      passwordHint: z.string().optional(),
      createdAt: z.string()
      // ISO datetime
    });
    insertUserSchema = userSchema.omit({
      id: true,
      userId: true,
      createdAt: true
    });
    employeeTaskSchema = z.object({
      id: z.string(),
      employeeId: z.string(),
      employeeName: z.string(),
      // Denormalized for display
      companyId: z.string(),
      companyName: z.string(),
      // Denormalized for display
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
      dueAt: z.string(),
      // ISO datetime
      status: z.enum(["open", "completed", "skipped", "cancelled"]).default("open"),
      priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
      completionNote: z.string().optional(),
      cancelReason: z.string().optional(),
      uniqueKey: z.string().optional(),
      // For idempotent task generation
      meta: z.record(z.any()).optional().default({}),
      // Additional metadata
      reviewed: z.boolean().optional().default(false),
      // For HR Auditor - whether task has been reviewed
      reviewerNote: z.string().optional(),
      // For HR Auditor - reviewer's notes
      createdAt: z.string(),
      // ISO datetime
      updatedAt: z.string(),
      // ISO datetime
      completedAt: z.string().optional()
      // ISO datetime
    });
    insertEmployeeTaskSchema = employeeTaskSchema.omit({ id: true, createdAt: true, updatedAt: true });
    employeeActivityLogSchema = z.object({
      id: z.string(),
      employeeId: z.string(),
      employeeName: z.string(),
      // Denormalized for display
      action: z.string(),
      // e.g., "Status Changed", "Personal Details Updated", "Employment Info Updated"
      details: z.string().optional(),
      // Human-readable description of what changed
      fieldChanged: z.string().optional(),
      // Specific field that was changed
      oldValue: z.string().optional(),
      newValue: z.string().optional(),
      timestamp: z.string(),
      // ISO datetime
      performedBy: z.string().default("System"),
      // User who performed the action
      meta: z.record(z.any()).optional().default({})
      // Additional metadata
    });
    insertEmployeeActivityLogSchema = employeeActivityLogSchema.omit({ id: true });
    userActivityLogSchema = z.object({
      id: z.string(),
      action: z.string(),
      // e.g., "User Added", "User Updated", "User Deleted"
      targetUsername: z.string(),
      // The user being affected
      targetName: z.string(),
      // Name of the affected user
      details: z.string().optional(),
      // Human-readable description of what changed
      reason: z.string().optional(),
      // Reason for the action (especially for deletions)
      timestamp: z.string(),
      // ISO datetime
      performedBy: z.string().default("System"),
      // User who performed the action
      meta: z.record(z.any()).optional().default({})
      // Additional metadata
    });
    insertUserActivityLogSchema = userActivityLogSchema.omit({ id: true });
    holidaySchema = z.object({
      id: z.string(),
      date: z.string(),
      // YYYY-MM-DD format
      day: z.string(),
      // Day of week (e.g., "Monday", "Tuesday")
      holidayName: z.string().min(1, "Holiday name is required")
      // Name of the holiday (e.g., "Christmas", "New Year")
    });
    insertHolidaySchema = holidaySchema.omit({ id: true });
    attendanceRecordSchema = z.object({
      id: z.string(),
      employeeId: z.string(),
      // Date & Status (Columns 1-3)
      date: z.string(),
      // YYYY-MM-DD format
      day: z.string(),
      // Mon, Tue, Wed, Thu, Fri, Sat, Sun
      status: z.enum(["Present", "Absent", "Holiday", "Leave", "Weekend", "Incomplete"]),
      // Times (Columns 4-7)
      scheduledStartTime: z.string().optional(),
      // HH:MM:SS AM/PM format
      actualClockInTime: z.string().optional(),
      // HH:MM:SS AM/PM format
      scheduledEndTime: z.string().optional(),
      // HH:MM:SS AM/PM format
      actualClockOutTime: z.string().optional(),
      // HH:MM:SS AM/PM format
      // Break Information (Columns 8-10)
      breakType: z.enum(["Paid", "Unpaid"]).default("Unpaid"),
      breakDuration: z.string().optional(),
      // HH:MM:SS format (e.g., "00:30:00")
      breakRate: z.number().optional(),
      // GBP/hour for paid breaks
      // Rates (Columns 11, 16)
      hourlyRate: z.number().optional(),
      // from employee profile
      overtimeRate: z.number().optional(),
      // defaults to hourlyRate if not set
      // Hours (Columns 12-15)
      scheduledWorkingHours: z.number().optional(),
      // decimal hours (2dp)
      totalWorkingHours: z.number().optional(),
      // decimal hours (2dp)
      paidWorkingHours: z.number().optional(),
      // decimal hours (2dp)
      overtimeHours: z.number().optional(),
      // decimal hours (2dp)
      // Pay (Columns 17-20)
      breakCost: z.number().optional(),
      // currency (2dp)
      basePay: z.number().optional(),
      // currency (2dp)
      overtimePay: z.number().optional(),
      // currency (2dp)
      totalDayPay: z.number().optional(),
      // currency (2dp)
      // Notes & Flags (Columns 21-22)
      notes: z.string().optional(),
      anomalyFlag: z.boolean().default(false)
      // true if working > 16 hours or missing data
    });
    insertAttendanceRecordSchema = attendanceRecordSchema.omit({ id: true });
    users = pgTable("users", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      userId: varchar("user_id").unique().notNull(),
      // Unique visible ID (e.g., "USR-001")
      username: varchar("username").unique().notNull(),
      password: varchar("password").notNull(),
      // Hashed password
      passwordHint: text("password_hint"),
      name: varchar("name").notNull(),
      email: varchar("email").notNull(),
      position: varchar("position").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    usersRelations = relations(users, ({ many }) => ({
      companiesCreated: many(companies),
      employeesCreated: many(employees)
    }));
    companies = pgTable("companies", {
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
      directors: jsonb("directors").$type().default([]),
      officers: jsonb("officers").$type().default([]),
      pscs: jsonb("pscs").$type().default([]),
      previousNames: jsonb("previous_names").$type().default([]),
      charges: jsonb("charges").$type().default([]),
      insolvencyHistory: jsonb("insolvency_history").$type().default([]),
      filings: jsonb("filings").$type().default([]),
      documents: jsonb("documents").$type().default([]),
      // Contact & administrative
      internalCode: varchar("internal_code"),
      utr: varchar("utr"),
      governmentGateway: varchar("government_gateway"),
      ownerName: varchar("owner_name"),
      ownerEmails: jsonb("owner_emails").$type().default([]),
      ownerPhones: jsonb("owner_phones").$type().default([]),
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
      slLevel1Users: jsonb("sl_level1_users").$type().default([]),
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
      activityLog: jsonb("activity_log").$type().default([]),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    companiesRelations = relations(companies, ({ many }) => ({
      tasks: many(tasks),
      employees: many(employees),
      slPrepTaskStatuses: many(companySLPrepTaskStatuses)
    }));
    tasks = pgTable("tasks", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
      companyName: text("company_name").notNull(),
      title: text("title").notNull(),
      description: text("description"),
      dueAt: timestamp("due_at").notNull(),
      status: varchar("status").default("open").notNull(),
      meta: jsonb("meta").$type().default({}),
      uniqueKey: varchar("unique_key").notNull(),
      renewalDate: varchar("renewal_date").notNull(),
      reviewed: boolean("reviewed").default(false),
      reviewedAt: timestamp("reviewed_at"),
      reviewerNote: text("reviewer_note"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    tasksRelations = relations(tasks, ({ one }) => ({
      company: one(companies, {
        fields: [tasks.companyId],
        references: [companies.id]
      })
    }));
    taskAudits = pgTable("task_audits", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      taskId: varchar("task_id").notNull(),
      taskTitle: text("task_title").notNull(),
      companyId: varchar("company_id").notNull(),
      companyName: text("company_name").notNull(),
      fromStatus: varchar("from_status").notNull(),
      toStatus: varchar("to_status").notNull(),
      reason: text("reason"),
      performedBy: varchar("performed_by").default("System").notNull(),
      meta: jsonb("meta").$type().default({}),
      timestamp: timestamp("timestamp").defaultNow().notNull()
    });
    companyActivityLogs = pgTable("company_activity_logs", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      companyId: varchar("company_id").notNull(),
      companyName: text("company_name").notNull(),
      action: varchar("action").notNull(),
      reason: text("reason").notNull(),
      performedBy: varchar("performed_by").default("System").notNull(),
      meta: jsonb("meta").$type().default({}),
      timestamp: timestamp("timestamp").defaultNow().notNull()
    });
    slPrepTasks = pgTable("sl_prep_tasks", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      name: text("name").notNull(),
      order: integer("order").default(0).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    companySLPrepTaskStatuses = pgTable("company_sl_prep_task_statuses", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
      taskId: varchar("task_id").notNull().references(() => slPrepTasks.id, { onDelete: "cascade" }),
      isCompleted: boolean("is_completed").default(false).notNull(),
      description: text("description"),
      completionNote: text("completion_note"),
      completedAt: timestamp("completed_at")
    });
    companySLPrepTaskStatusesRelations = relations(companySLPrepTaskStatuses, ({ one }) => ({
      company: one(companies, {
        fields: [companySLPrepTaskStatuses.companyId],
        references: [companies.id]
      }),
      task: one(slPrepTasks, {
        fields: [companySLPrepTaskStatuses.taskId],
        references: [slPrepTasks.id]
      })
    }));
    hrTaskTemplates = pgTable("hr_task_templates", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      name: text("name").notNull(),
      description: text("description"),
      recurrence: varchar("recurrence").notNull(),
      dueDateOffsetDays: integer("due_date_offset_days").default(7).notNull(),
      priority: varchar("priority").default("medium").notNull(),
      order: integer("order").default(0).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    leaverTaskTemplates = pgTable("leaver_task_templates", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      name: text("name").notNull(),
      description: text("description"),
      dueDays: integer("due_days").default(7).notNull(),
      priority: varchar("priority").default("medium").notNull(),
      order: integer("order").default(0).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    residencyTaskTemplates = pgTable("residency_task_templates", {
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
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    employeeFormTemplates = pgTable("employee_form_templates", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      name: text("name").notNull(),
      description: text("description"),
      version: integer("version").default(1).notNull(),
      isActive: boolean("is_active").default(true).notNull(),
      steps: jsonb("steps").$type().notNull(),
      fields: jsonb("fields").$type().notNull(),
      globalRules: jsonb("global_rules").$type().default([]),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    employees = pgTable("employees", {
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
      workingDays: jsonb("working_days").$type().default(["monday", "tuesday", "wednesday", "thursday", "friday"]),
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
      residencyLog: jsonb("residency_log").$type().default([]),
      // Documents & Tasks
      documents: jsonb("documents").$type().default([]),
      generatedTaskIds: jsonb("generated_task_ids").$type().default([]),
      // Form Data & Activity
      formData: jsonb("form_data").$type().default({}),
      activityLog: jsonb("activity_log").$type().default([]),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    employeesRelations = relations(employees, ({ one, many }) => ({
      company: one(companies, {
        fields: [employees.companyId],
        references: [companies.id]
      }),
      tasks: many(employeeTasks),
      dependants: many(dependants)
    }));
    dependants = pgTable("dependants", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      employeeId: varchar("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
      employeeName: text("employee_name").notNull(),
      firstName: varchar("first_name").notNull(),
      middleName: varchar("middle_name").default(""),
      lastName: varchar("last_name").notNull(),
      dateOfBirth: varchar("date_of_birth").notNull(),
      relationship: varchar("relationship").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    dependantsRelations = relations(dependants, ({ one }) => ({
      employee: one(employees, {
        fields: [dependants.employeeId],
        references: [employees.id]
      })
    }));
    pendingDependantRequests = pgTable("pending_dependant_requests", {
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
      dependantData: jsonb("dependant_data").$type().notNull()
    });
    pendingEmployeeStatusChanges = pgTable("pending_employee_status_changes", {
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
      reviewNote: text("review_note")
    });
    pendingCompanySLChanges = pgTable("pending_company_sl_changes", {
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
      reviewNote: text("review_note")
    });
    employeeTasks = pgTable("employee_tasks", {
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
      meta: jsonb("meta").$type().default({}),
      reviewed: boolean("reviewed").default(false),
      reviewerNote: text("reviewer_note"),
      completedAt: timestamp("completed_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    employeeTasksRelations = relations(employeeTasks, ({ one }) => ({
      employee: one(employees, {
        fields: [employeeTasks.employeeId],
        references: [employees.id]
      })
    }));
    employeeActivityLogs = pgTable("employee_activity_logs", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      employeeId: varchar("employee_id").notNull(),
      employeeName: text("employee_name").notNull(),
      action: varchar("action").notNull(),
      details: text("details"),
      fieldChanged: varchar("field_changed"),
      oldValue: text("old_value"),
      newValue: text("new_value"),
      performedBy: varchar("performed_by").default("System").notNull(),
      meta: jsonb("meta").$type().default({}),
      timestamp: timestamp("timestamp").defaultNow().notNull()
    });
    userActivityLogs = pgTable("user_activity_logs", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      action: varchar("action").notNull(),
      targetUsername: varchar("target_username").notNull(),
      targetName: varchar("target_name").notNull(),
      details: text("details"),
      reason: text("reason"),
      performedBy: varchar("performed_by").default("System").notNull(),
      meta: jsonb("meta").$type().default({}),
      timestamp: timestamp("timestamp").defaultNow().notNull()
    });
    holidays = pgTable("holidays", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      date: varchar("date").notNull(),
      // YYYY-MM-DD
      day: varchar("day").notNull(),
      holidayName: varchar("holiday_name").notNull()
    });
    attendanceRecords = pgTable("attendance_records", {
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
      anomalyFlag: boolean("anomaly_flag").default(false)
    });
    systemSettings = pgTable("system_settings", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      key: varchar("key").unique().notNull(),
      value: text("value"),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    deletionRequests = pgTable("deletion_requests", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
      companyName: text("company_name").notNull(),
      // Stored for history even if company is deleted
      reason: text("reason").notNull(),
      requestedBy: varchar("requested_by").notNull().references(() => users.id),
      requestedByName: text("requested_by_name").notNull(),
      status: varchar("status").notNull().default("pending"),
      // pending, approved, rejected
      reviewedBy: varchar("reviewed_by").references(() => users.id),
      reviewedByName: text("reviewed_by_name"),
      reviewedAt: timestamp("reviewed_at"),
      reviewNotes: text("review_notes"),
      requestedAt: timestamp("requested_at").defaultNow().notNull()
    });
    generalLog = pgTable("general_log", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      logRefId: integer("log_ref_id"),
      // Auto-increment reference ID (e.g., LOG-001)
      timestamp: timestamp("timestamp").defaultNow().notNull(),
      action: varchar("action").notNull(),
      // deletion_requested, deletion_approved, deletion_rejected, company_deleted, etc.
      category: varchar("category").notNull(),
      // company, employee, task, user, sl, training, etc.
      targetId: varchar("target_id"),
      // ID of the affected entity
      targetName: text("target_name"),
      // Name/description of the affected entity
      performedBy: varchar("performed_by").notNull(),
      performedByName: text("performed_by_name").notNull(),
      details: text("details"),
      // Human-readable description
      metadata: jsonb("metadata").$type().default({})
    });
    insertDeletionRequestSchema = createInsertSchema(deletionRequests).omit({
      id: true,
      status: true,
      reviewedBy: true,
      reviewedByName: true,
      reviewedAt: true,
      reviewNotes: true,
      requestedAt: true
    });
    insertGeneralLogSchema = createInsertSchema(generalLog).omit({
      id: true,
      timestamp: true
    }).extend({
      metadata: z.record(z.any()).optional()
    });
    slTrainingModules = pgTable("sl_training_modules", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      name: varchar("name").notNull(),
      learningMaterials: text("learning_materials"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      createdBy: varchar("created_by"),
      isActive: boolean("is_active").default(true)
    });
    slTrainingQuestions = pgTable("sl_training_questions", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      moduleId: varchar("module_id").notNull().references(() => slTrainingModules.id, { onDelete: "cascade" }),
      question: text("question").notNull(),
      choice1: text("choice_1").notNull(),
      choice2: text("choice_2").notNull(),
      choice3: text("choice_3").notNull(),
      choice4: text("choice_4").notNull(),
      correctAnswer: integer("correct_answer").notNull(),
      // 1, 2, 3, or 4
      orderIndex: integer("order_index").default(0)
    });
    slTrainingScores = pgTable("sl_training_scores", {
      id: varchar("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
      userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
      moduleId: varchar("module_id").notNull().references(() => slTrainingModules.id, { onDelete: "cascade" }),
      score: integer("score").notNull(),
      // Percentage score (0-100)
      totalQuestions: integer("total_questions").notNull(),
      correctAnswers: integer("correct_answers").notNull(),
      completedAt: timestamp("completed_at").defaultNow().notNull(),
      lastAnswers: jsonb("last_answers").$type().default([])
      // User's last answers
    });
    insertSlTrainingModuleSchema = createInsertSchema(slTrainingModules).omit({
      id: true,
      createdAt: true
    });
    insertSlTrainingQuestionSchema = createInsertSchema(slTrainingQuestions).omit({
      id: true
    });
    insertSlTrainingScoreSchema = createInsertSchema(slTrainingScores).omit({
      id: true,
      completedAt: true
    });
  }
});

// server/companiesHouse.ts
var companiesHouse_exports = {};
__export(companiesHouse_exports, {
  cleanAndPadCompanyNumber: () => cleanAndPadCompanyNumber,
  fetchCharges: () => fetchCharges,
  fetchCompanyProfile: () => fetchCompanyProfile,
  fetchComprehensiveData: () => fetchComprehensiveData,
  fetchFilingHistory: () => fetchFilingHistory,
  fetchInsolvency: () => fetchInsolvency,
  fetchOfficers: () => fetchOfficers,
  fetchPSC: () => fetchPSC
});
function getAuthHeader(auth) {
  const trimmedApiKey = auth.apiKey.trim();
  return `Basic ${Buffer.from(trimmedApiKey + ":").toString("base64")}`;
}
function cleanAndPadCompanyNumber(companyNumber) {
  let cleanNumber = companyNumber.replace(/\s/g, "").toUpperCase();
  if (cleanNumber.length < 8) {
    const prefixMatch = cleanNumber.match(/^([A-Z]{1,2})(\d+)$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1];
      const numericPart = prefixMatch[2];
      const targetLength = 8 - prefix.length;
      cleanNumber = prefix + numericPart.padStart(targetLength, "0");
    } else if (/^\d+$/.test(cleanNumber)) {
      cleanNumber = cleanNumber.padStart(8, "0");
    }
  }
  return cleanNumber;
}
function formatAddress(addr) {
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
async function fetchCompanyProfile(companyNumber, auth) {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}`;
  const response = await fetch(url, {
    headers: {
      Authorization: getAuthHeader(auth)
    }
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
    previousNames: []
    // Will be populated if data exists
  };
}
async function fetchOfficers(companyNumber, auth) {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/officers`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth)
      }
    });
    if (!response.ok) {
      console.error(`Failed to fetch officers for ${cleanNumber}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data.items)) {
      return [];
    }
    return data.items.map((officer) => ({
      name: officer.name || "",
      officerRole: officer.officer_role,
      appointedOn: officer.appointed_on,
      resignedOn: officer.resigned_on,
      nationality: officer.nationality,
      occupation: officer.occupation,
      countryOfResidence: officer.country_of_residence,
      address: formatAddress(officer.address)
    }));
  } catch (error) {
    console.error(`Error fetching officers for ${cleanNumber}:`, error);
    return [];
  }
}
async function fetchPSC(companyNumber, auth) {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/persons-with-significant-control`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth)
      }
    });
    if (!response.ok) {
      console.error(`Failed to fetch PSC for ${cleanNumber}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data.items)) {
      return [];
    }
    return data.items.map((psc) => ({
      name: psc.name || (psc.name_elements?.forename && psc.name_elements?.surname ? `${psc.name_elements.forename} ${psc.name_elements.surname}` : ""),
      kind: psc.kind,
      naturesOfControl: psc.natures_of_control || [],
      notifiedOn: psc.notified_on,
      ceasedOn: psc.ceased_on,
      nationality: psc.nationality,
      countryOfResidence: psc.country_of_residence,
      address: formatAddress(psc.address)
    }));
  } catch (error) {
    console.error(`Error fetching PSC for ${cleanNumber}:`, error);
    return [];
  }
}
async function fetchFilingHistory(companyNumber, auth, limit = 25) {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/filing-history?items_per_page=${limit}`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth)
      }
    });
    if (!response.ok) {
      console.error(`Failed to fetch filing history for ${cleanNumber}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data.items)) {
      return [];
    }
    return data.items.map((filing) => ({
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
        documentMetadata: filing.links?.document_metadata
      }
    }));
  } catch (error) {
    console.error(`Error fetching filing history for ${cleanNumber}:`, error);
    return [];
  }
}
async function fetchCharges(companyNumber, auth) {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/charges`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth)
      }
    });
    if (!response.ok) {
      console.error(`Failed to fetch charges for ${cleanNumber}: ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data.items)) {
      return [];
    }
    return data.items.map((charge) => ({
      chargeNumber: charge.charge_number?.toString(),
      createdOn: charge.created_on,
      deliveredOn: charge.delivered_on,
      status: charge.status,
      assetsCeasedReleased: charge.assets_ceased_released,
      personsEntitled: charge.persons_entitled?.map((p) => p.name) || [],
      transactions: charge.transactions?.map((t) => t.filing_type) || [],
      particulars: charge.particulars?.description
    }));
  } catch (error) {
    console.error(`Error fetching charges for ${cleanNumber}:`, error);
    return [];
  }
}
async function fetchInsolvency(companyNumber, auth) {
  const cleanNumber = cleanAndPadCompanyNumber(companyNumber);
  const url = `${BASE_URL}/company/${cleanNumber}/insolvency`;
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: getAuthHeader(auth)
      }
    });
    if (!response.ok) {
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
    return data.cases.map((insolvency) => ({
      caseNumber: insolvency.number?.toString(),
      type: insolvency.type,
      date: insolvency.dates?.wound_up_on || insolvency.dates?.concluded_winding_up_on,
      practitioners: insolvency.practitioners?.map((p) => p.name) || []
    }));
  } catch (error) {
    console.error(`Error fetching insolvency for ${cleanNumber}:`, error);
    return [];
  }
}
async function fetchComprehensiveData(companyNumber, auth) {
  const profile = await fetchCompanyProfile(companyNumber, auth);
  console.log(`[Companies House] Fetching comprehensive data for ${companyNumber}`);
  const [officers, pscs, filings, charges, insolvencyHistory] = await Promise.all([
    fetchOfficers(companyNumber, auth),
    fetchPSC(companyNumber, auth),
    fetchFilingHistory(companyNumber, auth, 25),
    fetchCharges(companyNumber, auth),
    fetchInsolvency(companyNumber, auth)
  ]);
  console.log(`[Companies House] Fetched data counts:`, {
    officers: officers.length,
    pscs: pscs.length,
    filings: filings.length,
    charges: charges.length,
    insolvency: insolvencyHistory.length
  });
  const activeOfficers = officers.filter((o) => !o.resignedOn);
  const directors = activeOfficers.filter(
    (o) => o.officerRole?.toLowerCase().includes("director")
  );
  const activePSCs = pscs.filter((p) => !p.ceasedOn);
  console.log(`[Companies House] Filtered counts:`, {
    activeOfficers: activeOfficers.length,
    directors: directors.length,
    activePSCs: activePSCs.length
  });
  const directorText = directors.map((d) => d.name).join(", ");
  const pscText = activePSCs.map((p) => p.name).join(", ");
  let companiesHouseNextRenewalDate;
  const confirmationDue = profile.confirmationStatementDue;
  const accountsDue = profile.accountsDue;
  console.log(`[Companies House] Calculating next renewal date:`, {
    confirmationDue,
    accountsDue
  });
  if (confirmationDue && accountsDue) {
    const confirmationDate = new Date(confirmationDue);
    const accountsDate = new Date(accountsDue);
    companiesHouseNextRenewalDate = confirmationDate < accountsDate ? confirmationDue : accountsDue;
    console.log(`[Companies House] Both dates exist, using earliest: ${companiesHouseNextRenewalDate}`);
  } else if (confirmationDue) {
    companiesHouseNextRenewalDate = confirmationDue;
    console.log(`[Companies House] Only confirmation due exists: ${companiesHouseNextRenewalDate}`);
  } else if (accountsDue) {
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
    lastSyncDate: (/* @__PURE__ */ new Date()).toISOString(),
    syncStatus: "success"
  };
}
var BASE_URL;
var init_companiesHouse = __esm({
  "server/companiesHouse.ts"() {
    "use strict";
    BASE_URL = "https://api.company-information.service.gov.uk";
  }
});

// client/src/lib/utils/taskGenerator.ts
var taskGenerator_exports = {};
__export(taskGenerator_exports, {
  buildUniqueKey: () => buildUniqueKey,
  computeTaskDates: () => computeTaskDates,
  formatDueDate: () => formatDueDate,
  generateTaskDefinitions: () => generateTaskDefinitions,
  getDaysUntilDue: () => getDaysUntilDue,
  getTaskStatus: () => getTaskStatus,
  isRenewalDateValid: () => isRenewalDateValid,
  parseRenewalDate: () => parseRenewalDate,
  shouldCreateTask: () => shouldCreateTask,
  taskDefinitionsToInsertTasks: () => taskDefinitionsToInsertTasks
});
import { DateTime } from "luxon";
function parseRenewalDate(renewalDate) {
  let dt = DateTime.fromISO(renewalDate, { zone: "Europe/London" });
  if (!dt.isValid) {
    dt = DateTime.fromFormat(renewalDate, "dd/MM/yyyy", { zone: "Europe/London" });
  }
  if (!dt.isValid && typeof window !== "undefined") {
    console.error(`[Task Generator] Invalid renewal date format: "${renewalDate}"`);
  }
  return dt;
}
function computeTaskDates(renewalDate, confirmationStatementDue) {
  const base = parseRenewalDate(renewalDate);
  let csDate;
  if (confirmationStatementDue) {
    csDate = DateTime.fromISO(confirmationStatementDue, { zone: "Europe/London" });
    if (!csDate.isValid) {
      csDate = base.minus({ months: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    } else {
      csDate = csDate.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    }
  } else {
    csDate = base.minus({ months: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
  }
  return {
    fees: base.minus({ months: 3 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    cs: csDate,
    prep: base.plus({ weeks: 3 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    submit: base.plus({ weeks: 5 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    hmrc: base.plus({ weeks: 6 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 })
  };
}
function shouldCreateTask(date, kind) {
  const now = DateTime.now().setZone("Europe/London");
  if (kind === "pre") {
    return date > now.minus({ days: 90 });
  }
  return date > now.minus({ days: 30 });
}
function isRenewalDateValid(renewalDate) {
  const renewal = parseRenewalDate(renewalDate);
  if (!renewal.isValid) {
    if (typeof window !== "undefined") {
      console.warn(`[Task Generator] Invalid renewal date, skipping: "${renewalDate}"`);
    }
    return false;
  }
  const now = DateTime.now().setZone("Europe/London");
  const maxFuture = now.plus({ months: 18 });
  return renewal <= maxFuture;
}
function generateTaskDefinitions(company) {
  if (!company.renewalDate) return [];
  if (!isRenewalDateValid(company.renewalDate)) return [];
  const dates = computeTaskDates(company.renewalDate, company.confirmationStatementDue);
  const definitions = [];
  const fees = parseFloat(company.renewalFees || "0");
  if (fees > 0 && shouldCreateTask(dates.fees, "pre")) {
    definitions.push({
      type: "fees",
      title: "Collect renewal fees from client",
      description: "Issue invoice and confirm receipt of renewal fees.",
      dueAt: dates.fees,
      kind: "pre",
      requiresFees: true
    });
  }
  if (shouldCreateTask(dates.cs, "pre")) {
    const actualCsDue = dates.cs;
    const csDueAdvance = actualCsDue.minus({ days: 15 });
    definitions.push({
      type: "cs",
      title: "File Confirmation Statement (Companies House)",
      description: "Prepare CS01 and file at Companies House.",
      dueAt: csDueAdvance,
      actualDueAt: actualCsDue,
      kind: "pre"
    });
  }
  if (shouldCreateTask(dates.prep, "post")) {
    definitions.push({
      type: "prep-accounts",
      title: "Prepare annual accounts",
      description: "Compile year-end accounts (ledgers, adjustments, review).",
      dueAt: dates.prep,
      kind: "post"
    });
  }
  if (shouldCreateTask(dates.submit, "post")) {
    definitions.push({
      type: "submit-accounts",
      title: "Submit annual accounts to Companies House",
      description: "File statutory accounts to CH.",
      dueAt: dates.submit,
      kind: "post"
    });
  }
  if (shouldCreateTask(dates.hmrc, "post")) {
    definitions.push({
      type: "hmrc",
      title: "HMRC notification / follow-up",
      description: "Confirm any HMRC follow-ups or notices after year-end.",
      dueAt: dates.hmrc,
      kind: "post"
    });
  }
  return definitions;
}
function buildUniqueKey(type, companyId, renewalDate) {
  return `${type}:${companyId}:${renewalDate}`;
}
function taskDefinitionsToInsertTasks(company, definitions) {
  if (!company.renewalDate) return [];
  const renewalDate = company.renewalDate;
  return definitions.map((def) => {
    const meta = {};
    if (def.requiresFees) {
      meta.renewal_fees = company.renewalFees;
    }
    if (def.actualDueAt) {
      meta.actualDueAt = def.actualDueAt.toISO();
    }
    return {
      companyId: company.id,
      companyName: company.name,
      title: def.title,
      description: def.description,
      dueAt: def.dueAt.toISO() || def.dueAt.toUTC().toISO() || "",
      // Convert Luxon DateTime to ISO string
      status: "open",
      meta,
      uniqueKey: buildUniqueKey(def.type, company.id, renewalDate),
      renewalDate,
      reviewed: false
    };
  });
}
function getTaskStatus(dueAt) {
  const due = DateTime.fromISO(dueAt, { zone: "Europe/London" });
  const now = DateTime.now().setZone("Europe/London");
  if (due < now) return "overdue";
  if (due < now.plus({ days: 7 })) return "due_soon";
  return "upcoming";
}
function formatDueDate(dueAt) {
  const due = DateTime.fromISO(dueAt, { zone: "Europe/London" });
  return due.toFormat("dd MMM yyyy");
}
function getDaysUntilDue(dueAt) {
  const due = DateTime.fromISO(dueAt, { zone: "Europe/London" }).startOf("day");
  const now = DateTime.now().setZone("Europe/London").startOf("day");
  return Math.floor(due.diff(now, "days").days);
}
var init_taskGenerator = __esm({
  "client/src/lib/utils/taskGenerator.ts"() {
    "use strict";
  }
});

// api/index.ts
import express2 from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

// server/routes.ts
import { createServer } from "http";
import { z as z2 } from "zod";

// server/storage.ts
import bcrypt from "bcrypt";

// server/db.ts
init_schema();
var db;
var pool;
if (process.env.DATABASE_URL) {
  const { Pool, neonConfig } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-serverless");
  const ws = (await import("ws")).default;
  neonConfig.webSocketConstructor = ws;
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzle({ client: pool, schema: schema_exports });
  console.log("[db] Connected to Neon PostgreSQL");
} else {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const dataDir = "./pglite-data";
  const client = new PGlite(dataDir);
  db = drizzle({ client, schema: schema_exports });
  pool = null;
  console.log("[db] Using PGlite embedded PostgreSQL (local dev mode)");
}

// server/storage.ts
init_schema();
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
function toISOStringSafe(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value.toISOString === "function") {
    return value.toISOString();
  }
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}
function normalizeTask(task) {
  return {
    ...task,
    dueAt: toISOStringSafe(task.dueAt) || (/* @__PURE__ */ new Date()).toISOString(),
    createdAt: toISOStringSafe(task.createdAt) || (/* @__PURE__ */ new Date()).toISOString(),
    reviewedAt: toISOStringSafe(task.reviewedAt)
  };
}
var DatabaseStorage = class {
  SALT_ROUNDS = 10;
  // Helper to convert DB user to safe user (remove password, convert date)
  toSafeUser(user) {
    return {
      id: user.id,
      userId: user.userId,
      username: user.username,
      name: user.name,
      email: user.email,
      position: user.position,
      passwordHint: user.passwordHint,
      createdAt: user.createdAt.toISOString()
    };
  }
  // Helper to generate next userId (USR-001, USR-002, etc.)
  async generateNextUserId() {
    const allUsers = await db.select().from(users);
    if (allUsers.length === 0) {
      return "USR-001";
    }
    const numbers = allUsers.map((u) => parseInt(u.userId.replace("USR-", ""))).filter((n) => !isNaN(n));
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    return `USR-${String(nextNumber).padStart(3, "0")}`;
  }
  // ==================
  // Authentication & Users
  // ==================
  async getUserById(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ? this.toSafeUser(user) : void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(username, password, name, email, position, passwordHint) {
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    const userId = await this.generateNextUserId();
    const [newUser] = await db.insert(users).values({
      userId,
      username,
      password: hashedPassword,
      name,
      email,
      position,
      passwordHint: passwordHint || null
    }).returning();
    return this.toSafeUser(newUser);
  }
  async updateUser(id, updates) {
    const [updatedUser] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    if (!updatedUser) {
      throw new Error("User not found");
    }
    return this.toSafeUser(updatedUser);
  }
  async updateUserPassword(id, newPassword, passwordHint) {
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    const updateData = { password: hashedPassword };
    if (passwordHint !== void 0) {
      updateData.passwordHint = passwordHint;
    }
    await db.update(users).set(updateData).where(eq(users.id, id));
  }
  async deleteUser(id) {
    await db.delete(users).where(eq(users.id, id));
  }
  async getAllUsers() {
    const allUsers = await db.select().from(users);
    return allUsers.map((u) => this.toSafeUser(u));
  }
  async authenticateUser(username, password) {
    const user = await this.getUserByUsername(username);
    if (!user) {
      return null;
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return null;
    }
    return this.toSafeUser(user);
  }
  // ==================
  // Companies (PostgreSQL database)
  // ==================
  async getCompanies() {
    const allCompanies = await db.select().from(companies);
    return allCompanies;
  }
  async getCompany(id) {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || void 0;
  }
  async createCompany(company) {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }
  async updateCompany(id, updates) {
    const [updatedCompany] = await db.update(companies).set(updates).where(eq(companies.id, id)).returning();
    if (!updatedCompany) {
      throw new Error("Company not found");
    }
    return updatedCompany;
  }
  async deleteCompany(id) {
    await db.delete(companies).where(eq(companies.id, id));
  }
  // ==================
  // Tasks (PostgreSQL database)
  // ==================
  async getTasks() {
    const allTasks = await db.select().from(tasks);
    return allTasks;
  }
  async getTask(id) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || void 0;
  }
  async getTasksByCompany(companyId) {
    const companyTasks = await db.select().from(tasks).where(eq(tasks.companyId, companyId));
    return companyTasks;
  }
  async getTaskByUniqueKey(uniqueKey) {
    const [task] = await db.select().from(tasks).where(eq(tasks.uniqueKey, uniqueKey));
    return task || void 0;
  }
  async upsertTask(task) {
    const dueAtDate = task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt);
    const existing = await this.getTaskByUniqueKey(task.uniqueKey);
    if (existing) {
      const existingDueDate = new Date(existing.dueAt).toISOString();
      const newDueDate = dueAtDate.toISOString();
      if (existingDueDate !== newDueDate) {
        const [updatedTask] = await db.update(tasks).set({ dueAt: dueAtDate }).where(eq(tasks.id, existing.id)).returning();
        return { task: normalizeTask(updatedTask), wasCreated: false };
      }
      return { task: normalizeTask(existing), wasCreated: false };
    }
    const [newTask] = await db.insert(tasks).values({ ...task, dueAt: dueAtDate }).returning();
    return { task: normalizeTask(newTask), wasCreated: true };
  }
  async updateTaskStatus(id, status, reason) {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error("Task not found");
    }
    const fromStatus = task.status;
    const [updatedTask] = await db.update(tasks).set({ status }).where(eq(tasks.id, id)).returning();
    await this.createAuditLog({
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      companyId: updatedTask.companyId,
      companyName: updatedTask.companyName,
      fromStatus,
      toStatus: status,
      reason,
      performedBy: "System",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      meta: {}
    });
    return updatedTask;
  }
  async cancelCompanyTasks(companyId) {
    const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
    const openTasks = await db.select().from(tasks).where(eq(tasks.companyId, companyId));
    for (const task of openTasks) {
      if (task.status === "open") {
        await db.update(tasks).set({ status: "cancelled" }).where(eq(tasks.id, task.id));
        await this.createAuditLog({
          taskId: task.id,
          taskTitle: task.title,
          companyId: task.companyId,
          companyName: task.companyName,
          fromStatus: task.status,
          toStatus: "cancelled",
          reason: "Company deactivated or renewal date changed",
          performedBy: "System",
          timestamp: timestamp2,
          meta: {}
        });
      }
    }
  }
  async markTaskAsReviewed(id, note) {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error("Task not found");
    }
    if (task.status !== "done" && task.status !== "cancelled") {
      throw new Error("Only done or cancelled tasks can be reviewed");
    }
    const result = await db.update(tasks).set({
      reviewed: true,
      reviewedAt: /* @__PURE__ */ new Date(),
      reviewerNote: note || null
    }).where(eq(tasks.id, id)).returning();
    const updatedTask = result?.[0];
    if (!updatedTask) {
      throw new Error("Failed to update task");
    }
    return normalizeTask(updatedTask);
  }
  async reopenTask(id, reopenedById, reopenedByName, reason) {
    const task = await this.getTask(id);
    if (!task) {
      throw new Error("Task not found");
    }
    if (task.status !== "done" && task.status !== "cancelled") {
      throw new Error("Only done or cancelled tasks can be reopened");
    }
    const oldStatus = task.status;
    const result = await db.update(tasks).set({
      status: "open",
      reviewed: false,
      reviewedAt: null,
      reviewerNote: null
    }).where(eq(tasks.id, id)).returning();
    const rawTask = result?.[0];
    if (!rawTask) {
      throw new Error("Failed to reopen task");
    }
    const updatedTask = normalizeTask(rawTask);
    await this.createAuditLog({
      id: crypto.randomUUID(),
      taskId: id,
      action: "reopened",
      performedBy: reopenedByName,
      oldValue: oldStatus,
      newValue: "open",
      reason: reason || `Task reopened by ${reopenedByName}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return updatedTask;
  }
  async createAuditLog(audit) {
    const values = {
      ...audit,
      timestamp: audit.timestamp instanceof Date ? audit.timestamp : new Date(audit.timestamp || Date.now())
    };
    const [newAudit] = await db.insert(taskAudits).values(values).returning();
    return newAudit;
  }
  async getAuditLogs() {
    const audits = await db.select().from(taskAudits);
    return audits.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  async getAuditLogsByTask(taskId) {
    const audits = await db.select().from(taskAudits).where(eq(taskAudits.taskId, taskId));
    return audits.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  async getAuditLogsByCompany(companyId) {
    const audits = await db.select().from(taskAudits).where(eq(taskAudits.companyId, companyId));
    return audits.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }
  // ==================
  // Employees (PostgreSQL database)
  // ==================
  async getEmployees() {
    const allEmployees = await db.select().from(employees);
    return allEmployees;
  }
  async getEmployee(id) {
    const [employee] = await db.select().from(employees).where(eq(employees.id, id));
    return employee || void 0;
  }
  async getEmployeesByCompany(companyId) {
    const companyEmployees = await db.select().from(employees).where(eq(employees.companyId, companyId));
    return companyEmployees;
  }
  async createEmployee(employee) {
    const [newEmployee] = await db.insert(employees).values(employee).returning();
    return newEmployee;
  }
  async updateEmployee(id, updates) {
    const [updatedEmployee] = await db.update(employees).set(updates).where(eq(employees.id, id)).returning();
    if (!updatedEmployee) {
      throw new Error("Employee not found");
    }
    return updatedEmployee;
  }
  async deleteEmployee(id) {
    await db.delete(employees).where(eq(employees.id, id));
  }
  // ==================
  // Employee Tasks (PostgreSQL database)
  // ==================
  async getEmployeeTasks() {
    const allTasks = await db.select().from(employeeTasks);
    return allTasks;
  }
  async getEmployeeTask(id) {
    const [task] = await db.select().from(employeeTasks).where(eq(employeeTasks.id, id));
    return task || void 0;
  }
  async getEmployeeTaskByUniqueKey(uniqueKey) {
    const [task] = await db.select().from(employeeTasks).where(eq(employeeTasks.uniqueKey, uniqueKey));
    return task || void 0;
  }
  async getEmployeeTasksByEmployee(employeeId) {
    const tasks2 = await db.select().from(employeeTasks).where(eq(employeeTasks.employeeId, employeeId));
    return tasks2;
  }
  async getEmployeeTasksByCompany(companyId) {
    const tasks2 = await db.select().from(employeeTasks).where(eq(employeeTasks.companyId, companyId));
    return tasks2;
  }
  async createEmployeeTask(task) {
    const values = {
      ...task,
      dueAt: task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt),
      completedAt: task.completedAt ? task.completedAt instanceof Date ? task.completedAt : new Date(task.completedAt) : void 0
    };
    const [newTask] = await db.insert(employeeTasks).values(values).returning();
    return newTask;
  }
  async updateEmployeeTask(id, updates) {
    const safeUpdates = { ...updates };
    if (safeUpdates.dueAt && !(safeUpdates.dueAt instanceof Date)) safeUpdates.dueAt = new Date(safeUpdates.dueAt);
    if (safeUpdates.completedAt && !(safeUpdates.completedAt instanceof Date)) safeUpdates.completedAt = new Date(safeUpdates.completedAt);
    const [updatedTask] = await db.update(employeeTasks).set(safeUpdates).where(eq(employeeTasks.id, id)).returning();
    if (!updatedTask) {
      throw new Error("Employee task not found");
    }
    return updatedTask;
  }
  async updateEmployeeTaskStatus(id, status, note) {
    const updates = { status };
    if (status === "completed") {
      updates.completedAt = /* @__PURE__ */ new Date();
      if (note) {
        updates.completionNote = note;
      }
    } else if (status === "cancelled" && note) {
      updates.cancelReason = note;
    }
    const [updatedTask] = await db.update(employeeTasks).set(updates).where(eq(employeeTasks.id, id)).returning();
    if (!updatedTask) {
      throw new Error("Employee task not found");
    }
    return updatedTask;
  }
  async reopenEmployeeTask(id, reopenedById, reopenedByName, reason) {
    const task = await this.getEmployeeTask(id);
    if (!task) {
      throw new Error("Employee task not found");
    }
    if (task.status !== "completed" && task.status !== "cancelled" && task.status !== "skipped") {
      throw new Error("Only completed, cancelled, or skipped tasks can be reopened");
    }
    const oldStatus = task.status;
    const [updatedTask] = await db.update(employeeTasks).set({
      status: "open",
      reviewed: false,
      reviewerNote: null,
      completedAt: null,
      completionNote: null,
      cancelReason: null
    }).where(eq(employeeTasks.id, id)).returning();
    await this.createGeneralLog({
      id: crypto.randomUUID(),
      action: "reopened",
      category: "employee_task",
      performedBy: reopenedByName,
      performedById: reopenedById,
      targetId: id,
      targetName: `${task.employeeName} - ${task.title}`,
      oldValue: oldStatus,
      newValue: "open",
      metadata: {
        employeeId: task.employeeId,
        employeeName: task.employeeName,
        taskTitle: task.title,
        reason: reason || `Task reopened by ${reopenedByName}`
      },
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    return updatedTask;
  }
  async deleteEmployeeTask(id) {
    await db.delete(employeeTasks).where(eq(employeeTasks.id, id));
  }
  // ==================
  // HR Task Templates
  // ==================
  async getHRTaskTemplates() {
    const templates = await db.select().from(hrTaskTemplates);
    return templates.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString()
    }));
  }
  async getHRTaskTemplate(id) {
    const [template] = await db.select().from(hrTaskTemplates).where(eq(hrTaskTemplates.id, id));
    if (!template) return void 0;
    return {
      ...template,
      createdAt: template.createdAt.toISOString()
    };
  }
  async createHRTaskTemplate(template) {
    const [newTemplate] = await db.insert(hrTaskTemplates).values(template).returning();
    return {
      ...newTemplate,
      createdAt: newTemplate.createdAt.toISOString()
    };
  }
  async updateHRTaskTemplate(id, updates) {
    const [updated] = await db.update(hrTaskTemplates).set(updates).where(eq(hrTaskTemplates.id, id)).returning();
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString()
    };
  }
  async deleteHRTaskTemplate(id) {
    await db.delete(hrTaskTemplates).where(eq(hrTaskTemplates.id, id));
  }
  // ==================
  // Leaver Task Templates
  // ==================
  async getLeaverTaskTemplates() {
    const templates = await db.select().from(leaverTaskTemplates);
    return templates.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString()
    }));
  }
  async getLeaverTaskTemplate(id) {
    const [template] = await db.select().from(leaverTaskTemplates).where(eq(leaverTaskTemplates.id, id));
    if (!template) return void 0;
    return {
      ...template,
      createdAt: template.createdAt.toISOString()
    };
  }
  async createLeaverTaskTemplate(template) {
    const [newTemplate] = await db.insert(leaverTaskTemplates).values(template).returning();
    return {
      ...newTemplate,
      createdAt: newTemplate.createdAt.toISOString()
    };
  }
  async updateLeaverTaskTemplate(id, updates) {
    const [updated] = await db.update(leaverTaskTemplates).set(updates).where(eq(leaverTaskTemplates.id, id)).returning();
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString()
    };
  }
  async deleteLeaverTaskTemplate(id) {
    await db.delete(leaverTaskTemplates).where(eq(leaverTaskTemplates.id, id));
  }
  // ==================
  // Residency Task Templates
  // ==================
  async getResidencyTaskTemplates() {
    const templates = await db.select().from(residencyTaskTemplates);
    return templates.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString()
    }));
  }
  async getResidencyTaskTemplate(id) {
    const [template] = await db.select().from(residencyTaskTemplates).where(eq(residencyTaskTemplates.id, id));
    if (!template) return void 0;
    return {
      ...template,
      createdAt: template.createdAt.toISOString()
    };
  }
  async createResidencyTaskTemplate(template) {
    const [newTemplate] = await db.insert(residencyTaskTemplates).values(template).returning();
    return {
      ...newTemplate,
      createdAt: newTemplate.createdAt.toISOString()
    };
  }
  async updateResidencyTaskTemplate(id, updates) {
    const [updated] = await db.update(residencyTaskTemplates).set(updates).where(eq(residencyTaskTemplates.id, id)).returning();
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString()
    };
  }
  async deleteResidencyTaskTemplate(id) {
    await db.delete(residencyTaskTemplates).where(eq(residencyTaskTemplates.id, id));
  }
  // ==================
  // SL Prep Tasks
  // ==================
  async getSLPrepTasks() {
    const tasks2 = await db.select().from(slPrepTasks).orderBy(slPrepTasks.order);
    return tasks2.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString()
    }));
  }
  async getSLPrepTask(id) {
    const [task] = await db.select().from(slPrepTasks).where(eq(slPrepTasks.id, id));
    return task ? {
      ...task,
      createdAt: task.createdAt.toISOString()
    } : void 0;
  }
  async createSLPrepTask(taskData) {
    const [newTask] = await db.insert(slPrepTasks).values(taskData).returning();
    return {
      ...newTask,
      createdAt: newTask.createdAt.toISOString()
    };
  }
  async updateSLPrepTask(id, updates) {
    const [updatedTask] = await db.update(slPrepTasks).set(updates).where(eq(slPrepTasks.id, id)).returning();
    if (!updatedTask) {
      throw new Error("SL Prep Task not found");
    }
    return {
      ...updatedTask,
      createdAt: updatedTask.createdAt.toISOString()
    };
  }
  async deleteSLPrepTask(id) {
    await db.delete(slPrepTasks).where(eq(slPrepTasks.id, id));
  }
  // ==================
  // System Settings
  // ==================
  async getSystemSetting(key) {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting?.value ?? null;
  }
  async setSystemSetting(key, value) {
    const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    if (existing.length > 0) {
      await db.update(systemSettings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value });
    }
  }
  // ==================
  // Deletion Requests
  // ==================
  async getDeletionRequests() {
    const requests = await db.select().from(deletionRequests).orderBy(desc(deletionRequests.requestedAt));
    return requests.map((r) => ({
      ...r,
      requestedAt: r.requestedAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null
    }));
  }
  async getPendingDeletionRequests() {
    const requests = await db.select().from(deletionRequests).where(eq(deletionRequests.status, "pending")).orderBy(desc(deletionRequests.requestedAt));
    return requests.map((r) => ({
      ...r,
      requestedAt: r.requestedAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null
    }));
  }
  async getDeletionRequest(id) {
    const [request] = await db.select().from(deletionRequests).where(eq(deletionRequests.id, id));
    if (!request) return void 0;
    return {
      ...request,
      requestedAt: request.requestedAt.toISOString(),
      reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null
    };
  }
  async createDeletionRequest(requestData) {
    const [newRequest] = await db.insert(deletionRequests).values(requestData).returning();
    return {
      ...newRequest,
      requestedAt: newRequest.requestedAt.toISOString(),
      reviewedAt: newRequest.reviewedAt ? newRequest.reviewedAt.toISOString() : null
    };
  }
  async approveDeletionRequest(id, reviewedBy, reviewedByName, reviewNotes) {
    const [updated] = await db.update(deletionRequests).set({
      status: "approved",
      reviewedBy,
      reviewedByName,
      reviewedAt: /* @__PURE__ */ new Date(),
      reviewNotes
    }).where(eq(deletionRequests.id, id)).returning();
    if (!updated) {
      throw new Error("Deletion request not found");
    }
    return {
      ...updated,
      requestedAt: updated.requestedAt.toISOString(),
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null
    };
  }
  async rejectDeletionRequest(id, reviewedBy, reviewedByName, reviewNotes) {
    const [updated] = await db.update(deletionRequests).set({
      status: "rejected",
      reviewedBy,
      reviewedByName,
      reviewedAt: /* @__PURE__ */ new Date(),
      reviewNotes
    }).where(eq(deletionRequests.id, id)).returning();
    if (!updated) {
      throw new Error("Deletion request not found");
    }
    return {
      ...updated,
      requestedAt: updated.requestedAt.toISOString(),
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null
    };
  }
  // ==================
  // General Log (Audit Trail)
  // ==================
  async getGeneralLogs(limit = 100) {
    const logs = await db.select().from(generalLog).orderBy(desc(generalLog.timestamp)).limit(limit);
    return logs.map((log2) => ({
      ...log2,
      timestamp: log2.timestamp.toISOString()
    }));
  }
  async getGeneralLogsPaginated(params) {
    const { page, pageSize, action, category, dateFrom, dateTo, search } = params;
    const offset = (page - 1) * pageSize;
    const conditions = [];
    if (action) {
      conditions.push(eq(generalLog.action, action));
    }
    if (category) {
      conditions.push(eq(generalLog.category, category));
    }
    if (dateFrom) {
      conditions.push(gte(generalLog.timestamp, new Date(dateFrom)));
    }
    if (dateTo) {
      conditions.push(lte(generalLog.timestamp, new Date(dateTo)));
    }
    if (search) {
      conditions.push(
        sql`(${generalLog.targetName} ILIKE ${"%" + search + "%"} OR ${generalLog.details} ILIKE ${"%" + search + "%"})`
      );
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : void 0;
    const [{ value: total }] = await db.select({ value: count() }).from(generalLog).where(whereClause);
    const logs = await db.select().from(generalLog).where(whereClause).orderBy(desc(generalLog.timestamp)).limit(pageSize).offset(offset);
    return {
      items: logs.map((log2) => ({
        ...log2,
        timestamp: log2.timestamp.toISOString()
      })),
      total: Number(total),
      page,
      pageSize
    };
  }
  async createGeneralLog(logData) {
    const [newLog] = await db.insert(generalLog).values(logData).returning();
    return {
      ...newLog,
      timestamp: newLog.timestamp.toISOString()
    };
  }
  async getGeneralLogsByTarget(targetId, limit = 100) {
    const logs = await db.select().from(generalLog).where(eq(generalLog.targetId, targetId)).orderBy(desc(generalLog.timestamp)).limit(limit);
    return logs.map((log2) => ({
      ...log2,
      timestamp: log2.timestamp.toISOString()
    }));
  }
  async getGeneralLogsByCategory(category, limit = 100) {
    const logs = await db.select().from(generalLog).where(eq(generalLog.category, category)).orderBy(desc(generalLog.timestamp)).limit(limit);
    return logs.map((log2) => ({
      ...log2,
      timestamp: log2.timestamp.toISOString()
    }));
  }
  // ==================
  // SL Training
  // ==================
  async getSlTrainingModules() {
    const modules = await db.select().from(slTrainingModules).orderBy(desc(slTrainingModules.createdAt));
    return modules.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString()
    }));
  }
  async getSlTrainingModule(id) {
    const [module] = await db.select().from(slTrainingModules).where(eq(slTrainingModules.id, id));
    if (!module) return void 0;
    return {
      ...module,
      createdAt: module.createdAt.toISOString()
    };
  }
  async createSlTrainingModule(module) {
    const [newModule] = await db.insert(slTrainingModules).values(module).returning();
    return {
      ...newModule,
      createdAt: newModule.createdAt.toISOString()
    };
  }
  async updateSlTrainingModule(id, updates) {
    const [updatedModule] = await db.update(slTrainingModules).set(updates).where(eq(slTrainingModules.id, id)).returning();
    if (!updatedModule) throw new Error("Module not found");
    return {
      ...updatedModule,
      createdAt: updatedModule.createdAt.toISOString()
    };
  }
  async deleteSlTrainingModule(id) {
    await db.delete(slTrainingModules).where(eq(slTrainingModules.id, id));
  }
  async getSlTrainingQuestions(moduleId) {
    return await db.select().from(slTrainingQuestions).where(eq(slTrainingQuestions.moduleId, moduleId)).orderBy(slTrainingQuestions.orderIndex);
  }
  async createSlTrainingQuestions(questions) {
    if (questions.length === 0) return [];
    const newQuestions = await db.insert(slTrainingQuestions).values(questions).returning();
    return newQuestions;
  }
  async deleteSlTrainingQuestions(moduleId) {
    await db.delete(slTrainingQuestions).where(eq(slTrainingQuestions.moduleId, moduleId));
  }
  async getSlTrainingScores(userId) {
    const scores = await db.select().from(slTrainingScores).where(eq(slTrainingScores.userId, userId));
    return scores.map((s) => ({
      ...s,
      completedAt: s.completedAt.toISOString()
    }));
  }
  async getSlTrainingScore(userId, moduleId) {
    const [score] = await db.select().from(slTrainingScores).where(and(eq(slTrainingScores.userId, userId), eq(slTrainingScores.moduleId, moduleId)));
    if (!score) return void 0;
    return {
      ...score,
      completedAt: score.completedAt.toISOString()
    };
  }
  async upsertSlTrainingScore(scoreData) {
    const existing = await this.getSlTrainingScore(scoreData.userId, scoreData.moduleId);
    if (existing) {
      const [updated] = await db.update(slTrainingScores).set({
        score: scoreData.score,
        totalQuestions: scoreData.totalQuestions,
        correctAnswers: scoreData.correctAnswers,
        lastAnswers: scoreData.lastAnswers,
        completedAt: /* @__PURE__ */ new Date()
      }).where(eq(slTrainingScores.id, existing.id)).returning();
      return {
        ...updated,
        completedAt: updated.completedAt.toISOString()
      };
    } else {
      const [newScore] = await db.insert(slTrainingScores).values(scoreData).returning();
      return {
        ...newScore,
        completedAt: newScore.completedAt.toISOString()
      };
    }
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
init_schema();

// server/middleware/auth.ts
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// server/routes.ts
function calculateRenewalDate(incorporationDate) {
  const incDate = new Date(incorporationDate);
  const today = /* @__PURE__ */ new Date();
  let nextRenewal = new Date(
    today.getFullYear(),
    incDate.getMonth(),
    incDate.getDate()
  );
  if (nextRenewal <= today) {
    nextRenewal = new Date(
      today.getFullYear() + 1,
      incDate.getMonth(),
      incDate.getDate()
    );
  }
  return nextRenewal.toISOString().split("T")[0];
}
async function registerRoutes(app2) {
  app2.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      uptime: process.uptime()
    });
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = z2.object({
        username: z2.string().min(1),
        password: z2.string().min(1)
      }).parse(req.body);
      const user = await storage.authenticateUser(username, password);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      req.session.user = user;
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      await storage.createGeneralLog({
        action: "user_login",
        category: "user",
        targetId: user.id,
        targetName: user.name,
        performedBy: user.id,
        performedByName: user.name,
        details: `User "${user.name}" (${user.username}) logged in`
      });
      const { passwordHint: _, ...userWithoutHint } = user;
      res.json({ success: true, user: userWithoutHint });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });
  app2.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });
  app2.post("/api/auth/verify-password", requireAuth, async (req, res) => {
    try {
      const { password } = z2.object({
        password: z2.string().min(1)
      }).parse(req.body);
      const user = await storage.getUserByUsername(req.session.user.username);
      if (!user) {
        return res.json({ valid: false });
      }
      const result = await storage.authenticateUser(user.username, password);
      res.json({ valid: result !== null });
    } catch (error) {
      res.status(400).json({ valid: false });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    if (!req.session.user) {
      return res.json({ user: null });
    }
    const { passwordHint: _, ...userWithoutHint } = req.session.user;
    res.json({ user: userWithoutHint });
  });
  app2.post("/api/auth/password-hint", async (req, res) => {
    try {
      const { username } = z2.object({
        username: z2.string().min(1)
      }).parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || !user.passwordHint) {
        return res.status(404).json({ error: "No password hint available" });
      }
      res.json({ hint: user.passwordHint });
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });
  app2.get("/api/auth/users", requireAdmin, async (req, res) => {
    try {
      const users2 = await storage.getAllUsers();
      const usersWithoutHints = users2.map(({ passwordHint: _, ...user }) => user);
      res.json(usersWithoutHints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  app2.post("/api/auth/users", requireAdmin, async (req, res) => {
    try {
      const { username, password, name, email, position, passwordHint } = z2.object({
        username: z2.string().min(1),
        password: z2.string().min(1),
        name: z2.string().min(1),
        email: z2.string().email(),
        position: z2.string().min(1),
        passwordHint: z2.string().optional()
      }).parse(req.body);
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }
      const user = await storage.createUser(username, password, name, email, position, passwordHint);
      const adminName = req.session?.user?.name || "System";
      const adminId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "user_created",
        category: "user",
        targetId: user.id,
        targetName: name,
        performedBy: adminId,
        performedByName: adminName,
        details: `User "${name}" (${username}) created with position "${position}"`
      });
      const { passwordHint: _, ...userWithoutHint } = user;
      res.status(201).json(userWithoutHint);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });
  app2.patch("/api/auth/users/:id", requireAdmin, async (req, res) => {
    try {
      const updates = z2.object({
        username: z2.string().optional(),
        name: z2.string().optional(),
        email: z2.string().email().optional(),
        position: z2.string().optional(),
        passwordHint: z2.string().optional()
      }).parse(req.body);
      const user = await storage.updateUser(req.params.id, updates);
      const adminName = req.session?.user?.name || "System";
      const adminId = req.session?.user?.id || "system";
      const changedFields = Object.keys(updates).filter((k) => updates[k] !== void 0);
      await storage.createGeneralLog({
        action: "user_updated",
        category: "user",
        targetId: user.id,
        targetName: user.name,
        performedBy: adminId,
        performedByName: adminName,
        details: `User "${user.name}" updated. Fields: ${changedFields.join(", ")}`
      });
      const { passwordHint: _, ...userWithoutHint } = user;
      res.json(userWithoutHint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });
  app2.patch("/api/auth/users/:id/password", requireAdmin, async (req, res) => {
    try {
      const { newPassword, passwordHint } = z2.object({
        newPassword: z2.string().min(1),
        passwordHint: z2.string().optional()
      }).parse(req.body);
      const targetUser = await storage.getUserById(req.params.id);
      await storage.updateUserPassword(req.params.id, newPassword, passwordHint);
      const adminName = req.session?.user?.name || "System";
      const adminId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "user_password_changed",
        category: "user",
        targetId: req.params.id,
        targetName: targetUser?.name || "Unknown",
        performedBy: adminId,
        performedByName: adminName,
        details: `Password changed for user "${targetUser?.name || req.params.id}"`
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update password" });
    }
  });
  app2.delete("/api/auth/users/:id", requireAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUserById(req.params.id);
      await storage.deleteUser(req.params.id);
      const adminName = req.session?.user?.name || "System";
      const adminId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "user_deleted",
        category: "user",
        targetId: req.params.id,
        targetName: targetUser?.name || "Unknown",
        performedBy: adminId,
        performedByName: adminName,
        details: `User "${targetUser?.name || req.params.id}" deleted`
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });
  app2.get("/api/admin/general-log", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const pageSize = parseInt(req.query.pageSize) || 25;
      const action = req.query.action;
      const category = req.query.category;
      const dateFrom = req.query.dateFrom;
      const dateTo = req.query.dateTo;
      const search = req.query.search;
      const result = await storage.getGeneralLogsPaginated({
        page,
        pageSize,
        action,
        category,
        dateFrom,
        dateTo,
        search
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch general logs" });
    }
  });
  app2.get("/api/companies", async (req, res) => {
    try {
      const companies2 = await storage.getCompanies();
      res.json(companies2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });
  app2.get("/api/companies/last-sync", async (req, res) => {
    try {
      const timestamp2 = await storage.getSystemSetting("last_companies_house_sync");
      res.json({ timestamp: timestamp2 });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch last sync timestamp" });
    }
  });
  app2.get("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });
  app2.post("/api/companies", async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);
      if (validatedData.incorporationDate && !validatedData.renewalDate) {
        validatedData.renewalDate = calculateRenewalDate(validatedData.incorporationDate);
      }
      const company = await storage.createCompany(validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "company_created",
        category: "company",
        targetId: company.id,
        targetName: company.name,
        performedBy: userId,
        performedByName: userName,
        details: `Company "${company.name}" (${company.number}) created`
      });
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });
  app2.patch("/api/companies/:id", async (req, res) => {
    try {
      const updates = req.body;
      if (updates.incorporationDate && !updates.renewalDate) {
        updates.renewalDate = calculateRenewalDate(updates.incorporationDate);
      }
      const company = await storage.updateCompany(req.params.id, updates);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      const changedFields = Object.keys(updates).filter((k) => k !== "updatedAt").join(", ");
      await storage.createGeneralLog({
        action: "company_updated",
        category: "company",
        targetId: company.id,
        targetName: company.name,
        performedBy: userId,
        performedByName: userName,
        details: `Company "${company.name}" updated. Fields: ${changedFields}`,
        metadata: { changedFields: Object.keys(updates) }
      });
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to update company" });
    }
  });
  app2.delete("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      await storage.deleteCompany(req.params.id);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "company_deleted",
        category: "company",
        targetId: req.params.id,
        targetName: company?.name || "Unknown",
        performedBy: userId,
        performedByName: userName,
        details: `Company "${company?.name || "Unknown"}" (${company?.number || ""}) deleted`
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  });
  app2.post("/api/companies/bulk-import", async (req, res) => {
    try {
      const { companies: companies2 } = z2.object({
        companies: z2.array(insertCompanySchema).min(1)
      }).parse(req.body);
      const results = {
        successCount: 0,
        failureCount: 0,
        createdIds: [],
        errors: []
      };
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      for (const companyData of companies2) {
        try {
          const validatedData = insertCompanySchema.parse(companyData);
          if (validatedData.incorporationDate && !validatedData.renewalDate) {
            validatedData.renewalDate = calculateRenewalDate(validatedData.incorporationDate);
          }
          const company = await storage.createCompany(validatedData);
          results.createdIds.push(company.id);
          results.successCount++;
          await storage.createGeneralLog({
            action: "company_created_bulk",
            category: "company",
            targetId: company.id,
            targetName: company.name,
            performedBy: userId,
            performedByName: userName,
            details: `Company "${company.name}" (${company.number}) created via bulk import`,
            metadata: {
              bulkImport: true
            }
          });
        } catch (error) {
          results.failureCount++;
          results.errors.push({
            companyNumber: companyData.number,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      if (results.successCount > 0) {
        await storage.createGeneralLog({
          action: "bulk_import_completed",
          category: "company",
          targetId: "bulk-import",
          targetName: `Bulk Import (${results.successCount} companies)`,
          performedBy: userId,
          performedByName: userName,
          details: `Bulk import completed: ${results.successCount} successful, ${results.failureCount} failed`,
          metadata: {
            successCount: results.successCount,
            failureCount: results.failureCount
          }
        });
      }
      res.status(201).json(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid data";
      res.status(400).json({ error: errorMessage, message: errorMessage });
    }
  });
  app2.post("/api/companies/fetch-by-number", async (req, res) => {
    try {
      const { companyNumber } = req.body;
      if (!companyNumber) {
        return res.status(400).json({ error: "Company number is required" });
      }
      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Companies House API key not configured" });
      }
      const { fetchComprehensiveData: fetchComprehensiveData2 } = await Promise.resolve().then(() => (init_companiesHouse(), companiesHouse_exports));
      const companyData = await fetchComprehensiveData2(companyNumber, { apiKey });
      const validatedData = baseInsertCompanySchema.partial().parse(companyData);
      res.json({
        success: true,
        data: validatedData
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch from Companies House"
      });
    }
  });
  app2.post("/api/companies/:id/fetch-from-ch", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Companies House API key not configured" });
      }
      const { fetchComprehensiveData: fetchComprehensiveData2 } = await Promise.resolve().then(() => (init_companiesHouse(), companiesHouse_exports));
      const chData = await fetchComprehensiveData2(company.number, { apiKey });
      const updates = {
        ...chData,
        // Preserve manual fields that shouldn't be overwritten
        ownerName: company.ownerName,
        ownerEmails: company.ownerEmails,
        ownerPhones: company.ownerPhones,
        ownerEmail: company.ownerEmail,
        ownerPhone: company.ownerPhone,
        internalCode: company.internalCode,
        utr: company.utr,
        governmentGateway: company.governmentGateway,
        googleDriveLink: company.googleDriveLink,
        vendorName: company.vendorName,
        renewalDate: company.renewalDate,
        renewalFees: company.renewalFees,
        authCode: company.authCode,
        shareholdersLink: company.shareholdersLink,
        isActive: company.isActive,
        // Ensure sync metadata is updated
        lastSyncDate: chData.lastSyncDate,
        syncStatus: chData.syncStatus
      };
      if (Object.keys(updates).length > 0) {
        const updatedCompany = await storage.updateCompany(req.params.id, updates);
        res.json({
          company: updatedCompany,
          updated: true,
          fieldsUpdated: Object.keys(updates)
        });
      } else {
        res.json({
          company,
          updated: false,
          message: "All available fields already populated"
        });
      }
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to fetch from Companies House"
      });
    }
  });
  app2.post("/api/companies/recalculate-renewal-dates", async (req, res) => {
    try {
      const companies2 = await storage.getCompanies();
      let updated = 0;
      for (const company of companies2) {
        if (company.incorporationDate && !company.renewalDate) {
          const renewalDate = calculateRenewalDate(company.incorporationDate);
          await storage.updateCompany(company.id, { renewalDate });
          updated++;
        }
      }
      res.json({
        success: true,
        message: `Updated ${updated} companies with renewal dates`,
        updated
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to recalculate renewal dates" });
    }
  });
  app2.post("/api/companies/sync-all", async (req, res) => {
    try {
      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Companies House API key not configured" });
      }
      const companies2 = await storage.getCompanies();
      const results = [];
      let updated = 0;
      let failed = 0;
      const { fetchComprehensiveData: fetchComprehensiveData2 } = await Promise.resolve().then(() => (init_companiesHouse(), companiesHouse_exports));
      for (const company of companies2) {
        if (!company.number) {
          results.push({
            companyId: company.id,
            companyName: company.name,
            success: false,
            error: "No company number"
          });
          failed++;
          continue;
        }
        try {
          const chData = await fetchComprehensiveData2(company.number, { apiKey });
          const updates = {};
          if (chData.name && !company.name) updates.name = chData.name;
          if (chData.incorporationDate && !company.incorporationDate) {
            updates.incorporationDate = chData.incorporationDate;
          }
          if (chData.address && !company.address) updates.address = chData.address;
          if (chData.industryCode && !company.industryCode) updates.industryCode = chData.industryCode;
          if (chData.director && !company.director) updates.director = chData.director;
          if (chData.psc && !company.psc) updates.psc = chData.psc;
          if (chData.companiesHouseLink && !company.companiesHouseLink) {
            updates.companiesHouseLink = chData.companiesHouseLink;
          }
          if (chData.companyStatus && !company.companyStatus) updates.companyStatus = chData.companyStatus;
          if (chData.companyType && !company.companyType) updates.companyType = chData.companyType;
          if (chData.jurisdiction && !company.jurisdiction) updates.jurisdiction = chData.jurisdiction;
          if (chData.hasCharges !== void 0 && company.hasCharges === void 0) {
            updates.hasCharges = chData.hasCharges;
          }
          if (chData.hasInsolvency !== void 0 && company.hasInsolvency === void 0) {
            updates.hasInsolvency = chData.hasInsolvency;
          }
          if (chData.directors && chData.directors.length > 0 && (!company.directors || company.directors.length === 0)) {
            updates.directors = chData.directors;
          }
          if (chData.officers && chData.officers.length > 0 && (!company.officers || company.officers.length === 0)) {
            updates.officers = chData.officers;
          }
          if (chData.pscs && chData.pscs.length > 0 && (!company.pscs || company.pscs.length === 0)) {
            updates.pscs = chData.pscs;
          }
          if (chData.charges && chData.charges.length > 0 && (!company.charges || company.charges.length === 0)) {
            updates.charges = chData.charges;
          }
          if (chData.filings && chData.filings.length > 0) {
            updates.filings = chData.filings;
          }
          if (chData.insolvencyHistory && chData.insolvencyHistory.length > 0) {
            updates.insolvencyHistory = chData.insolvencyHistory;
          }
          if (Object.keys(updates).length > 0) {
            await storage.updateCompany(company.id, updates);
            updated++;
            results.push({
              companyId: company.id,
              companyName: company.name,
              success: true
            });
          } else {
            results.push({
              companyId: company.id,
              companyName: company.name,
              success: true,
              error: "No updates needed"
            });
          }
        } catch (error) {
          failed++;
          results.push({
            companyId: company.id,
            companyName: company.name,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      }
      await storage.setSystemSetting("last_companies_house_sync", (/* @__PURE__ */ new Date()).toISOString());
      res.json({
        total: companies2.length,
        updated,
        failed,
        results
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to sync companies"
      });
    }
  });
  app2.get("/api/tasks", async (req, res) => {
    try {
      const tasks2 = await storage.getTasks();
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });
  app2.get("/api/tasks/company/:companyId", async (req, res) => {
    try {
      const tasks2 = await storage.getTasksByCompany(req.params.companyId);
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company tasks" });
    }
  });
  app2.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const result = await storage.upsertTask(validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: result.wasCreated ? "task_created" : "task_updated",
        category: "task",
        targetId: result.task.id,
        targetName: result.task.title,
        performedBy: userId,
        performedByName: userName,
        details: `Company task "${result.task.title}" ${result.wasCreated ? "created" : "updated"} for "${result.task.companyName}"`,
        metadata: { companyId: result.task.companyId, companyName: result.task.companyName }
      });
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });
  app2.patch("/api/tasks/:id/status", async (req, res) => {
    try {
      const { status, reason } = req.body;
      const validStatuses = ["open", "done", "skipped", "cancelled"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      if (status === "cancelled" && !reason) {
        return res.status(400).json({ error: "Reason is required for cancellation" });
      }
      const task = await storage.updateTaskStatus(req.params.id, status, reason);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "task_status_changed",
        category: "task",
        targetId: task.id,
        targetName: task.title,
        performedBy: userId,
        performedByName: userName,
        details: `Company task "${task.title}" for "${task.companyName}" changed to ${status}${reason ? `. Reason: ${reason}` : ""}`,
        metadata: { newStatus: status, companyId: task.companyId, companyName: task.companyName }
      });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task status" });
    }
  });
  app2.patch("/api/tasks/:id/review", async (req, res) => {
    try {
      const reviewSchema = z2.object({
        note: z2.string().optional()
      });
      const { note } = reviewSchema.parse(req.body);
      const task = await storage.markTaskAsReviewed(req.params.id, note);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "task_reviewed",
        category: "task",
        targetId: task.id,
        targetName: task.title,
        performedBy: userId,
        performedByName: userName,
        details: `Company task "${task.title}" for "${task.companyName}" marked as reviewed${note ? `. Note: ${note}` : ""}`,
        metadata: { companyId: task.companyId, companyName: task.companyName }
      });
      res.json(task);
    } catch (error) {
      console.error(`[PATCH /api/tasks/:id/review] Error:`, error);
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
          message: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
        });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to mark task as reviewed"
      });
    }
  });
  app2.post("/api/tasks/:id/reopen", requireAuth, async (req, res) => {
    try {
      const { reason } = z2.object({
        reason: z2.string().optional()
      }).parse(req.body);
      const user = req.session.user;
      const task = await storage.reopenTask(req.params.id, user.id, user.name, reason);
      await storage.createGeneralLog({
        action: "task_reopened",
        category: "task",
        targetId: task.id,
        targetName: task.title,
        performedBy: user.id,
        performedByName: user.name,
        details: `Company task "${task.title}" for "${task.companyName}" reopened${reason ? `. Reason: ${reason}` : ""}`,
        metadata: { companyId: task.companyId, companyName: task.companyName }
      });
      res.json(task);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid reopen data", details: error.errors });
      }
      if (error instanceof Error && error.message === "Task not found") {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(500).json({ error: "Failed to reopen task" });
    }
  });
  app2.get("/api/audit", async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });
  app2.get("/api/audit/task/:taskId", async (req, res) => {
    try {
      const logs = await storage.getAuditLogsByTask(req.params.taskId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get audit logs for task" });
    }
  });
  app2.get("/api/audit/company/:companyId", async (req, res) => {
    try {
      const logs = await storage.getAuditLogsByCompany(req.params.companyId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get audit logs for company" });
    }
  });
  app2.post("/api/tasks/generate", requireAuth, async (req, res) => {
    try {
      const companies2 = await storage.getCompanies();
      let tasksCreated = 0;
      let tasksSkipped = 0;
      console.log(`[Task Generation] ========== START ==========`);
      console.log(`[Task Generation] Found ${companies2.length} total companies`);
      const activeCompanies = companies2.filter((c) => c.isActive && c.renewalDate);
      console.log(`[Task Generation] Active companies with renewal dates: ${activeCompanies.length}`);
      for (const company of companies2) {
        if (!company.isActive) {
          console.log(`[Task Generation] SKIP: ${company.name} - inactive`);
          continue;
        }
        if (!company.renewalDate) {
          console.log(`[Task Generation] SKIP: ${company.name} - no renewal date`);
          continue;
        }
        console.log(`[Task Generation] ----`);
        console.log(`[Task Generation] Processing: ${company.name}`);
        console.log(`[Task Generation] - Renewal Date: ${company.renewalDate}`);
        console.log(`[Task Generation] - Renewal Fees: ${company.renewalFees || "0"}`);
        const { generateTaskDefinitions: generateTaskDefinitions2, taskDefinitionsToInsertTasks: taskDefinitionsToInsertTasks2 } = await Promise.resolve().then(() => (init_taskGenerator(), taskGenerator_exports));
        const definitions = generateTaskDefinitions2(company);
        console.log(`[Task Generation] - Task definitions generated: ${definitions.length}`);
        if (definitions.length === 0) {
          console.log(`[Task Generation] - WARNING: No task definitions! Renewal date may be invalid or too far in future`);
        } else {
          console.log(`[Task Generation] - Task types: ${definitions.map((d) => d.type).join(", ")}`);
        }
        const insertTasks = taskDefinitionsToInsertTasks2(company, definitions);
        console.log(`[Task Generation] - Insert tasks prepared: ${insertTasks.length}`);
        for (const task of insertTasks) {
          const { wasCreated } = await storage.upsertTask(task);
          if (wasCreated) {
            console.log(`[Task Generation] - \u2713 Created: ${task.title}`);
            tasksCreated++;
          } else {
            console.log(`[Task Generation] - \u25CB Already exists: ${task.title}`);
            tasksSkipped++;
          }
        }
      }
      console.log(`[Task Generation] ========== COMPLETE ==========`);
      console.log(`[Task Generation] New tasks created: ${tasksCreated}`);
      console.log(`[Task Generation] Existing tasks skipped: ${tasksSkipped}`);
      console.log(`[Task Generation] ===================================`);
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
      await storage.setSystemSetting("last_task_generation", timestamp2);
      console.log(`[Task Generation] Saved last generation timestamp: ${timestamp2}`);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "tasks_generated",
        category: "task",
        targetId: null,
        targetName: "Company Tasks",
        performedBy: userId,
        performedByName: userName,
        details: `Generated ${tasksCreated} company tasks (${tasksSkipped} skipped as duplicates)`,
        metadata: { tasksCreated, tasksSkipped }
      });
      res.json({
        success: true,
        message: `Generated ${tasksCreated} tasks`,
        tasksCreated,
        tasksSkipped,
        timestamp: timestamp2
      });
    } catch (error) {
      console.error(`[Task Generation] ERROR:`, error);
      console.error(`[Task Generation] Stack:`, error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate tasks" });
    }
  });
  app2.get("/api/tasks/last-generation", requireAuth, async (req, res) => {
    try {
      const timestamp2 = await storage.getSystemSetting("last_task_generation");
      res.json({ timestamp: timestamp2 || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to get last generation timestamp" });
    }
  });
  app2.post("/api/hr-tasks/generate", requireAuth, async (req, res) => {
    try {
      const employees2 = await storage.getEmployees();
      const templates = await storage.getHRTaskTemplates();
      let tasksCreated = 0;
      let tasksSkipped = 0;
      console.log(`[HR Task Generation] ========== START ==========`);
      console.log(`[HR Task Generation] Found ${employees2.length} total employees`);
      console.log(`[HR Task Generation] Found ${templates.length} HR templates`);
      const { DateTime: DateTime2 } = await import("luxon");
      const UK_TIMEZONE = "Europe/London";
      for (const employee of employees2) {
        console.log(`[HR Task Generation] Processing: ${employee.firstName} ${employee.lastName}`);
        if (!employee.startDate) {
          console.log(`[HR Task Generation] - SKIP: Employee has no start date`);
          continue;
        }
        const now = DateTime2.now().setZone(UK_TIMEZONE);
        const startDate = DateTime2.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
        if (!startDate.isValid) {
          console.log(`[HR Task Generation] - SKIP: Employee has invalid start date: ${employee.startDate}`);
          continue;
        }
        for (const template of templates) {
          const baseDueDate = startDate.plus({ days: template.dueDateOffsetDays });
          if (!baseDueDate.isValid || baseDueDate < startDate) {
            console.log(`[HR Task Generation] - SKIP: Template ${template.id} invalid offset or date`);
            continue;
          }
          const tasksToCreate = [];
          switch (template.recurrence) {
            case "one_time": {
              const uniqueKey = `hr-template-${template.id}-employee-${employee.id}`;
              tasksToCreate.push({
                title: template.name,
                dueAt: baseDueDate.toISO() || baseDueDate.toUTC().toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                uniqueKey,
                taskType: "hr_template"
              });
              break;
            }
            case "monthly": {
              const monthsSinceStart = Math.floor(now.diff(baseDueDate, "months").months);
              const currentPeriodDue = baseDueDate.plus({ months: Math.max(0, monthsSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}-${currentPeriodDue.month}`;
                tasksToCreate.push({
                  title: `${template.name} (${currentPeriodDue.toFormat("MMMM yyyy")})`,
                  dueAt: currentPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "hr_template_monthly"
                });
              }
              const nextPeriodDue = baseDueDate.plus({ months: Math.max(0, monthsSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}-${nextPeriodDue.month}`;
                tasksToCreate.push({
                  title: `${template.name} (${nextPeriodDue.toFormat("MMMM yyyy")})`,
                  dueAt: nextPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "hr_template_monthly"
                });
              }
              break;
            }
            case "annual": {
              const yearsSinceStart = Math.floor(now.diff(baseDueDate, "years").years);
              const currentPeriodDue = baseDueDate.plus({ years: Math.max(0, yearsSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}`;
                tasksToCreate.push({
                  title: `${template.name} (${currentPeriodDue.year})`,
                  dueAt: currentPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "hr_template_annual"
                });
              }
              const nextPeriodDue = baseDueDate.plus({ years: Math.max(0, yearsSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}`;
                tasksToCreate.push({
                  title: `${template.name} (${nextPeriodDue.year})`,
                  dueAt: nextPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "hr_template_annual"
                });
              }
              break;
            }
          }
          for (const taskDef of tasksToCreate) {
            const existingTask = await storage.getEmployeeTaskByUniqueKey(taskDef.uniqueKey);
            if (!existingTask) {
              await storage.createEmployeeTask({
                id: crypto.randomUUID(),
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                companyId: employee.companyId,
                companyName: employee.companyName,
                title: taskDef.title,
                description: template.description || `HR Task: ${template.name}`,
                taskType: taskDef.taskType,
                dueAt: taskDef.dueAt,
                priority: template.priority,
                uniqueKey: taskDef.uniqueKey,
                status: "open",
                meta: {},
                reviewed: false,
                createdAt: now.toISO() || now.toUTC().toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                updatedAt: now.toISO() || now.toUTC().toISO() || (/* @__PURE__ */ new Date()).toISOString()
              });
              console.log(`[HR Task Generation] - \u2713 Created: ${taskDef.title}`);
              tasksCreated++;
            } else {
              console.log(`[HR Task Generation] - \u25CB Already exists: ${taskDef.title}`);
              tasksSkipped++;
            }
          }
        }
      }
      console.log(`[HR Task Generation] ========== COMPLETE ==========`);
      console.log(`[HR Task Generation] New tasks created: ${tasksCreated}`);
      console.log(`[HR Task Generation] Existing tasks skipped: ${tasksSkipped}`);
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
      await storage.setSystemSetting("last_hr_task_generation", timestamp2);
      console.log(`[HR Task Generation] Saved last generation timestamp: ${timestamp2}`);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "hr_tasks_generated",
        category: "task",
        targetId: "hr-tasks",
        targetName: "HR Tasks",
        performedBy: userId,
        performedByName: userName,
        details: `Generated ${tasksCreated} HR tasks (${tasksSkipped} skipped) for ${employees2.length} employees`
      });
      res.json({
        success: true,
        message: `Generated ${tasksCreated} HR tasks`,
        tasksCreated,
        tasksSkipped,
        timestamp: timestamp2
      });
    } catch (error) {
      console.error(`[HR Task Generation] ERROR:`, error);
      console.error(`[HR Task Generation] Stack:`, error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate HR tasks" });
    }
  });
  app2.get("/api/hr-tasks/last-generation", requireAuth, async (req, res) => {
    try {
      const timestamp2 = await storage.getSystemSetting("last_hr_task_generation");
      res.json({ timestamp: timestamp2 || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to get last HR task generation timestamp" });
    }
  });
  app2.post("/api/residency-tasks/generate", requireAuth, async (req, res) => {
    try {
      const employees2 = await storage.getEmployees();
      const residencyEmployees = employees2.filter((e) => e.isResidencyService);
      const templates = await storage.getResidencyTaskTemplates();
      let tasksCreated = 0;
      let tasksSkipped = 0;
      console.log(`[Residency Task Generation] ========== START ==========`);
      console.log(`[Residency Task Generation] Found ${residencyEmployees.length} residency service employees`);
      console.log(`[Residency Task Generation] Found ${templates.length} residency templates`);
      const { DateTime: DateTime2 } = await import("luxon");
      const UK_TIMEZONE = "Europe/London";
      for (const employee of residencyEmployees) {
        console.log(`[Residency Task Generation] Processing: ${employee.firstName} ${employee.lastName}`);
        const now = DateTime2.now().setZone(UK_TIMEZONE);
        for (const template of templates) {
          let baseStartDate;
          if (template.startDateMode === "manual") {
            if (!template.startDate) {
              console.log(`[Residency Task Generation] - SKIP: Template ${template.id} manual mode but no start date`);
              continue;
            }
            baseStartDate = DateTime2.fromISO(template.startDate, { zone: UK_TIMEZONE });
          } else {
            if (!employee.startDate) {
              console.log(`[Residency Task Generation] - SKIP: Employee has no start date for offset mode`);
              continue;
            }
            const employeeStart = DateTime2.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
            if (!employeeStart.isValid) {
              console.log(`[Residency Task Generation] - SKIP: Employee has invalid start date: ${employee.startDate}`);
              continue;
            }
            baseStartDate = employeeStart.plus({ days: template.offsetDays || 0 });
          }
          if (!baseStartDate.isValid) {
            console.log(`[Residency Task Generation] - SKIP: Template ${template.id} invalid base start date`);
            continue;
          }
          const tasksToCreate = [];
          switch (template.recurrence) {
            case "one_time": {
              const uniqueKey = `residency-template-${template.id}-employee-${employee.id}`;
              tasksToCreate.push({
                title: template.name,
                dueAt: baseStartDate.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                uniqueKey,
                taskType: "residency_template"
              });
              break;
            }
            case "weekly": {
              const weeksSinceStart = Math.floor(now.diff(baseStartDate, "weeks").weeks);
              const currentPeriodDue = baseStartDate.plus({ weeks: Math.max(0, weeksSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}-week${currentPeriodDue.weekNumber}`;
                tasksToCreate.push({
                  title: `${template.name} (Week ${currentPeriodDue.weekNumber}, ${currentPeriodDue.year})`,
                  dueAt: currentPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "residency_template_weekly"
                });
              }
              const nextPeriodDue = baseStartDate.plus({ weeks: Math.max(0, weeksSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}-week${nextPeriodDue.weekNumber}`;
                tasksToCreate.push({
                  title: `${template.name} (Week ${nextPeriodDue.weekNumber}, ${nextPeriodDue.year})`,
                  dueAt: nextPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "residency_template_weekly"
                });
              }
              break;
            }
            case "monthly": {
              const monthsSinceStart = Math.floor(now.diff(baseStartDate, "months").months);
              const currentPeriodDue = baseStartDate.plus({ months: Math.max(0, monthsSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}-${currentPeriodDue.month}`;
                tasksToCreate.push({
                  title: `${template.name} (${currentPeriodDue.toFormat("MMMM yyyy")})`,
                  dueAt: currentPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "residency_template_monthly"
                });
              }
              const nextPeriodDue = baseStartDate.plus({ months: Math.max(0, monthsSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}-${nextPeriodDue.month}`;
                tasksToCreate.push({
                  title: `${template.name} (${nextPeriodDue.toFormat("MMMM yyyy")})`,
                  dueAt: nextPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "residency_template_monthly"
                });
              }
              break;
            }
            case "quarterly": {
              const quartersSinceStart = Math.floor(now.diff(baseStartDate, "quarters").quarters);
              const currentPeriodDue = baseStartDate.plus({ quarters: Math.max(0, quartersSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentQuarter = currentPeriodDue.quarter;
                const currentUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}-Q${currentQuarter}`;
                tasksToCreate.push({
                  title: `${template.name} (Q${currentQuarter} ${currentPeriodDue.year})`,
                  dueAt: currentPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "residency_template_quarterly"
                });
              }
              const nextPeriodDue = baseStartDate.plus({ quarters: Math.max(0, quartersSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextQuarter = nextPeriodDue.quarter;
                const nextUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}-Q${nextQuarter}`;
                tasksToCreate.push({
                  title: `${template.name} (Q${nextQuarter} ${nextPeriodDue.year})`,
                  dueAt: nextPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "residency_template_quarterly"
                });
              }
              break;
            }
            case "annually": {
              const yearsSinceStart = Math.floor(now.diff(baseStartDate, "years").years);
              const currentPeriodDue = baseStartDate.plus({ years: Math.max(0, yearsSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}`;
                tasksToCreate.push({
                  title: `${template.name} (${currentPeriodDue.year})`,
                  dueAt: currentPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "residency_template_annual"
                });
              }
              const nextPeriodDue = baseStartDate.plus({ years: Math.max(0, yearsSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}`;
                tasksToCreate.push({
                  title: `${template.name} (${nextPeriodDue.year})`,
                  dueAt: nextPeriodDue.toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "residency_template_annual"
                });
              }
              break;
            }
          }
          for (const taskDef of tasksToCreate) {
            const existingTask = await storage.getEmployeeTaskByUniqueKey(taskDef.uniqueKey);
            if (!existingTask) {
              await storage.createEmployeeTask({
                id: crypto.randomUUID(),
                employeeId: employee.id,
                employeeName: `${employee.firstName} ${employee.lastName}`,
                companyId: employee.companyId,
                companyName: employee.companyName,
                title: taskDef.title,
                description: template.description || `Residency Task: ${template.name}`,
                taskType: taskDef.taskType,
                dueAt: taskDef.dueAt,
                priority: template.priority,
                uniqueKey: taskDef.uniqueKey,
                status: "open",
                meta: {},
                reviewed: false,
                createdAt: now.toISO() || now.toUTC().toISO() || (/* @__PURE__ */ new Date()).toISOString(),
                updatedAt: now.toISO() || now.toUTC().toISO() || (/* @__PURE__ */ new Date()).toISOString()
              });
              console.log(`[Residency Task Generation] - \u2713 Created: ${taskDef.title}`);
              tasksCreated++;
            } else {
              console.log(`[Residency Task Generation] - \u25CB Already exists: ${taskDef.title}`);
              tasksSkipped++;
            }
          }
        }
      }
      console.log(`[Residency Task Generation] ========== COMPLETE ==========`);
      console.log(`[Residency Task Generation] New tasks created: ${tasksCreated}`);
      console.log(`[Residency Task Generation] Existing tasks skipped: ${tasksSkipped}`);
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString();
      await storage.setSystemSetting("last_residency_task_generation", timestamp2);
      console.log(`[Residency Task Generation] Saved last generation timestamp: ${timestamp2}`);
      res.json({
        success: true,
        message: `Generated ${tasksCreated} residency tasks`,
        tasksCreated,
        tasksSkipped,
        timestamp: timestamp2
      });
    } catch (error) {
      console.error(`[Residency Task Generation] ERROR:`, error);
      console.error(`[Residency Task Generation] Stack:`, error instanceof Error ? error.stack : "No stack trace");
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate residency tasks" });
    }
  });
  app2.get("/api/residency-tasks/last-generation", requireAuth, async (req, res) => {
    try {
      const timestamp2 = await storage.getSystemSetting("last_residency_task_generation");
      res.json({ timestamp: timestamp2 || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to get last residency task generation timestamp" });
    }
  });
  app2.post("/api/tasks/cancel-company/:companyId", async (req, res) => {
    try {
      await storage.cancelCompanyTasks(req.params.companyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel company tasks" });
    }
  });
  app2.get("/api/employees", requireAuth, async (req, res) => {
    try {
      const employees2 = await storage.getEmployees();
      res.json(employees2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });
  app2.get("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });
  app2.get("/api/companies/:companyId/employees", requireAuth, async (req, res) => {
    try {
      const employees2 = await storage.getEmployeesByCompany(req.params.companyId);
      res.json(employees2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company employees" });
    }
  });
  app2.post("/api/employees", requireAuth, async (req, res) => {
    try {
      const isDraft = req.body.isDraft !== false;
      const dataWithDraft = { ...req.body, isDraft };
      const schema = isDraft ? draftEmployeeRecordSchema : completeEmployeeRecordSchema;
      const validatedData = schema.parse(dataWithDraft);
      const employee = await storage.createEmployee(validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "employee_created",
        category: "employee",
        targetId: employee.id,
        targetName: `${employee.firstName} ${employee.lastName}`,
        performedBy: userId,
        performedByName: userName,
        details: `Employee "${employee.firstName} ${employee.lastName}" created for company "${employee.companyName}"`,
        metadata: { companyId: employee.companyId, companyName: employee.companyName, isDraft: employee.isDraft }
      });
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code
        }));
        const missingFields = formattedErrors.map((e) => `\u2022 ${e.field}: ${e.message}`).join("\n");
        return res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
          message: `Missing or invalid fields:
${missingFields}`
        });
      }
      console.error("[POST /api/employees] Error:", error);
      res.status(500).json({ error: "Failed to create employee" });
    }
  });
  app2.patch("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmployeeRecordSchema.partial().parse(req.body);
      if (validatedData.isDraft === false) {
        const existingEmployee = await storage.getEmployee(req.params.id);
        if (!existingEmployee) {
          return res.status(404).json({ error: "Employee not found" });
        }
        const mergedData = { ...existingEmployee, ...validatedData };
        const sanitizedMergedData = sanitizeEmployeePayload(mergedData);
        try {
          completeEmployeeRecordSchema.parse(sanitizedMergedData);
        } catch (validationError) {
          if (validationError instanceof z2.ZodError) {
            const formattedErrors = validationError.errors.map((err) => ({
              field: err.path.join("."),
              message: err.message,
              code: err.code
            }));
            return res.status(400).json({
              error: "Cannot mark as complete: missing required fields",
              details: formattedErrors,
              message: `Cannot mark as complete. Missing required fields: ${formattedErrors.map((e) => e.field).join(", ")}`
            });
          }
          throw validationError;
        }
      }
      const employee = await storage.updateEmployee(req.params.id, validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      const changedFields = Object.keys(validatedData).filter((k) => k !== "updatedAt").join(", ");
      await storage.createGeneralLog({
        action: "employee_updated",
        category: "employee",
        targetId: employee.id,
        targetName: `${employee.firstName} ${employee.lastName}`,
        performedBy: userId,
        performedByName: userName,
        details: `Employee "${employee.firstName} ${employee.lastName}" updated. Fields: ${changedFields}`,
        metadata: { changedFields: Object.keys(validatedData), companyName: employee.companyName }
      });
      res.json(employee);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
          message: formattedErrors.map((e) => `${e.field}: ${e.message}`).join("; ")
        });
      }
      if (error instanceof Error && error.message === "Employee not found") {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(500).json({ error: "Failed to update employee" });
    }
  });
  app2.delete("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      await storage.deleteEmployee(req.params.id);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "employee_deleted",
        category: "employee",
        targetId: req.params.id,
        targetName: employee ? `${employee.firstName} ${employee.lastName}` : "Unknown",
        performedBy: userId,
        performedByName: userName,
        details: `Employee "${employee ? `${employee.firstName} ${employee.lastName}` : "Unknown"}" deleted`
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });
  app2.get("/api/employee-tasks", requireAuth, async (req, res) => {
    try {
      const tasks2 = await storage.getEmployeeTasks();
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee tasks" });
    }
  });
  app2.get("/api/employee-tasks/:id", requireAuth, async (req, res) => {
    try {
      const task = await storage.getEmployeeTask(req.params.id);
      if (!task) {
        return res.status(404).json({ error: "Employee task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee task" });
    }
  });
  app2.get("/api/employees/:employeeId/tasks", requireAuth, async (req, res) => {
    try {
      const tasks2 = await storage.getEmployeeTasksByEmployee(req.params.employeeId);
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee tasks" });
    }
  });
  app2.get("/api/companies/:companyId/employee-tasks", requireAuth, async (req, res) => {
    try {
      const tasks2 = await storage.getEmployeeTasksByCompany(req.params.companyId);
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company employee tasks" });
    }
  });
  app2.post("/api/employee-tasks", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmployeeTaskSchema.parse(req.body);
      const taskData = {
        ...validatedData,
        dueAt: new Date(validatedData.dueAt),
        completedAt: validatedData.completedAt ? new Date(validatedData.completedAt) : void 0
      };
      const task = await storage.createEmployeeTask(taskData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "employee_task_created",
        category: "employee",
        targetId: task.employeeId,
        targetName: task.employeeName || "Unknown",
        performedBy: userId,
        performedByName: userName,
        details: `Employee task "${task.title}" created for ${task.employeeName}`
      });
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid employee task data", details: error.errors });
      }
      console.error("[employee-tasks POST] Error:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "Failed to create employee task" });
    }
  });
  app2.patch("/api/employee-tasks/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmployeeTaskSchema.partial().parse(req.body);
      const taskData = { ...validatedData };
      if (taskData.dueAt) taskData.dueAt = new Date(taskData.dueAt);
      if (taskData.completedAt) taskData.completedAt = new Date(taskData.completedAt);
      const task = await storage.updateEmployeeTask(req.params.id, taskData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "employee_task_updated",
        category: "employee",
        targetId: task.employeeId,
        targetName: task.employeeName || "Unknown",
        performedBy: userId,
        performedByName: userName,
        details: `Employee task "${task.title}" for "${task.employeeName}" updated`,
        metadata: { taskId: task.id, employeeId: task.employeeId }
      });
      res.json(task);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid employee task data", details: error.errors });
      }
      if (error instanceof Error && error.message === "Employee task not found") {
        return res.status(404).json({ error: "Employee task not found" });
      }
      res.status(500).json({ error: "Failed to update employee task" });
    }
  });
  app2.patch("/api/employee-tasks/:id/status", requireAuth, async (req, res) => {
    try {
      const { status, note } = z2.object({
        status: z2.enum(["open", "completed", "skipped", "cancelled"]),
        note: z2.string().optional()
      }).parse(req.body);
      const task = await storage.updateEmployeeTaskStatus(req.params.id, status, note);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "employee_task_status_changed",
        category: "employee",
        targetId: task.id,
        targetName: task.title,
        performedBy: userId,
        performedByName: userName,
        details: `Employee task "${task.title}" for "${task.employeeName}" changed to ${status}${note ? `. Note: ${note}` : ""}`,
        metadata: { newStatus: status, employeeId: task.employeeId, employeeName: task.employeeName }
      });
      res.json(task);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid status data", details: error.errors });
      }
      if (error instanceof Error && error.message === "Employee task not found") {
        return res.status(404).json({ error: "Employee task not found" });
      }
      res.status(500).json({ error: "Failed to update employee task status" });
    }
  });
  app2.delete("/api/employee-tasks/:id", requireAuth, async (req, res) => {
    try {
      const existingTask = await storage.getEmployeeTask(req.params.id);
      await storage.deleteEmployeeTask(req.params.id);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      if (existingTask) {
        await storage.createGeneralLog({
          action: "employee_task_deleted",
          category: "employee",
          targetId: existingTask.employeeId,
          targetName: existingTask.employeeName || "Unknown",
          performedBy: userId,
          performedByName: userName,
          details: `Employee task "${existingTask.title}" for "${existingTask.employeeName}" deleted`,
          metadata: { taskId: req.params.id, employeeId: existingTask.employeeId }
        });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee task" });
    }
  });
  app2.post("/api/employee-tasks/:id/reopen", requireAuth, async (req, res) => {
    try {
      const { reason } = z2.object({
        reason: z2.string().optional()
      }).parse(req.body);
      const user = req.session.user;
      const task = await storage.reopenEmployeeTask(req.params.id, user.id, user.name, reason);
      await storage.createGeneralLog({
        action: "employee_task_reopened",
        category: "employee",
        targetId: task.employeeId,
        targetName: task.employeeName || "Unknown",
        performedBy: user.id,
        performedByName: user.name,
        details: `Employee task "${task.title}" for "${task.employeeName}" reopened${reason ? `. Reason: ${reason}` : ""}`,
        metadata: { taskId: task.id, employeeId: task.employeeId }
      });
      res.json(task);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid reopen data", details: error.errors });
      }
      if (error instanceof Error && error.message === "Employee task not found") {
        return res.status(404).json({ error: "Employee task not found" });
      }
      res.status(500).json({ error: "Failed to reopen employee task" });
    }
  });
  app2.get("/api/hr-task-templates", requireAuth, async (_req, res) => {
    try {
      const templates = await storage.getHRTaskTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch HR task templates" });
    }
  });
  app2.post("/api/hr-task-templates", requireAuth, async (req, res) => {
    try {
      const { insertHRTaskTemplateSchema: insertHRTaskTemplateSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertHRTaskTemplateSchema2.parse(req.body);
      const template = await storage.createHRTaskTemplate(validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "hr_template_created",
        category: "system",
        targetId: template.id,
        targetName: template.name,
        performedBy: userId,
        performedByName: userName,
        details: `HR task template "${template.name}" created`
      });
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create HR task template" });
    }
  });
  app2.patch("/api/hr-task-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.updateHRTaskTemplate(req.params.id, req.body);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "hr_template_updated",
        category: "system",
        targetId: template.id,
        targetName: template.name,
        performedBy: userId,
        performedByName: userName,
        details: `HR task template "${template.name}" updated`
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update HR task template" });
    }
  });
  app2.delete("/api/hr-task-templates/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getHRTaskTemplate(req.params.id);
      await storage.deleteHRTaskTemplate(req.params.id);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "hr_template_deleted",
        category: "system",
        targetId: req.params.id,
        targetName: existing?.name || "Unknown",
        performedBy: userId,
        performedByName: userName,
        details: `HR task template "${existing?.name || req.params.id}" deleted`
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete HR task template" });
    }
  });
  app2.get("/api/leaver-task-templates", requireAuth, async (_req, res) => {
    try {
      const templates = await storage.getLeaverTaskTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaver task templates" });
    }
  });
  app2.post("/api/leaver-task-templates", requireAuth, async (req, res) => {
    try {
      const { insertLeaverTaskTemplateSchema: insertLeaverTaskTemplateSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertLeaverTaskTemplateSchema2.parse(req.body);
      const template = await storage.createLeaverTaskTemplate(validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "leaver_template_created",
        category: "system",
        targetId: template.id,
        targetName: template.name,
        performedBy: userId,
        performedByName: userName,
        details: `Leaver task template "${template.name}" created`
      });
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create leaver task template" });
    }
  });
  app2.patch("/api/leaver-task-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.updateLeaverTaskTemplate(req.params.id, req.body);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "leaver_template_updated",
        category: "system",
        targetId: template.id,
        targetName: template.name,
        performedBy: userId,
        performedByName: userName,
        details: `Leaver task template "${template.name}" updated`
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update leaver task template" });
    }
  });
  app2.delete("/api/leaver-task-templates/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getLeaverTaskTemplate(req.params.id);
      await storage.deleteLeaverTaskTemplate(req.params.id);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "leaver_template_deleted",
        category: "system",
        targetId: req.params.id,
        targetName: existing?.name || "Unknown",
        performedBy: userId,
        performedByName: userName,
        details: `Leaver task template "${existing?.name || req.params.id}" deleted`
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete leaver task template" });
    }
  });
  app2.get("/api/residency-task-templates", requireAuth, async (_req, res) => {
    try {
      const templates = await storage.getResidencyTaskTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch residency task templates" });
    }
  });
  app2.post("/api/residency-task-templates", requireAuth, async (req, res) => {
    try {
      const { insertResidencyTaskTemplateSchema: insertResidencyTaskTemplateSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertResidencyTaskTemplateSchema2.parse(req.body);
      const template = await storage.createResidencyTaskTemplate(validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "residency_template_created",
        category: "system",
        targetId: template.id,
        targetName: template.name,
        performedBy: userId,
        performedByName: userName,
        details: `Residency task template "${template.name}" created`
      });
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create residency task template" });
    }
  });
  app2.patch("/api/residency-task-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.updateResidencyTaskTemplate(req.params.id, req.body);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "residency_template_updated",
        category: "system",
        targetId: template.id,
        targetName: template.name,
        performedBy: userId,
        performedByName: userName,
        details: `Residency task template "${template.name}" updated`
      });
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update residency task template" });
    }
  });
  app2.delete("/api/residency-task-templates/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getResidencyTaskTemplate(req.params.id);
      await storage.deleteResidencyTaskTemplate(req.params.id);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "residency_template_deleted",
        category: "system",
        targetId: req.params.id,
        targetName: existing?.name || "Unknown",
        performedBy: userId,
        performedByName: userName,
        details: `Residency task template "${existing?.name || req.params.id}" deleted`
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete residency task template" });
    }
  });
  app2.get("/api/sl-prep-tasks", requireAuth, async (_req, res) => {
    try {
      const tasks2 = await storage.getSLPrepTasks();
      res.json(tasks2);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SL prep tasks" });
    }
  });
  app2.post("/api/sl-prep-tasks", requireAuth, async (req, res) => {
    try {
      const { insertSLPrepTaskSchema: insertSLPrepTaskSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertSLPrepTaskSchema2.parse(req.body);
      const task = await storage.createSLPrepTask(validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "sl_prep_task_created",
        category: "system",
        targetId: task.id,
        targetName: task.name,
        performedBy: userId,
        performedByName: userName,
        details: `SL Prep task "${task.name}" created`
      });
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid task data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create SL prep task" });
    }
  });
  app2.patch("/api/sl-prep-tasks/:id", requireAuth, async (req, res) => {
    try {
      const { insertSLPrepTaskSchema: insertSLPrepTaskSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertSLPrepTaskSchema2.partial().parse(req.body);
      const task = await storage.updateSLPrepTask(req.params.id, validatedData);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "sl_prep_task_updated",
        category: "system",
        targetId: task.id,
        targetName: task.name,
        performedBy: userId,
        performedByName: userName,
        details: `SL Prep task "${task.name}" updated`
      });
      res.json(task);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid task data", details: error.errors });
      }
      if (error instanceof Error && error.message === "SL Prep Task not found") {
        return res.status(404).json({ error: "SL Prep Task not found" });
      }
      res.status(500).json({ error: "Failed to update SL prep task" });
    }
  });
  app2.delete("/api/sl-prep-tasks/:id", requireAuth, async (req, res) => {
    try {
      const existingTask = await storage.getSLPrepTask(req.params.id);
      if (!existingTask) {
        return res.status(404).json({ error: "SL Prep Task not found" });
      }
      await storage.deleteSLPrepTask(req.params.id);
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "sl_prep_task_deleted",
        category: "system",
        targetId: req.params.id,
        targetName: existingTask.name,
        performedBy: userId,
        performedByName: userName,
        details: `SL Prep task "${existingTask.name}" deleted`
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete SL prep task" });
    }
  });
  app2.get("/api/deletion-requests", requireAuth, async (_req, res) => {
    try {
      const requests = await storage.getDeletionRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deletion requests" });
    }
  });
  app2.get("/api/deletion-requests/pending", requireAuth, async (_req, res) => {
    try {
      const requests = await storage.getPendingDeletionRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending deletion requests" });
    }
  });
  app2.post("/api/deletion-requests", requireAuth, async (req, res) => {
    try {
      const { insertDeletionRequestSchema: insertDeletionRequestSchema2 } = await Promise.resolve().then(() => (init_schema(), schema_exports));
      const validatedData = insertDeletionRequestSchema2.parse(req.body);
      const request = await storage.createDeletionRequest(validatedData);
      await storage.createGeneralLog({
        action: "deletion_requested",
        category: "company",
        targetId: request.companyId,
        targetName: request.companyName,
        performedBy: request.requestedBy,
        performedByName: request.requestedByName,
        details: `Deletion request created for ${request.companyName}. Reason: ${request.reason}`,
        metadata: { requestId: request.id }
      });
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid deletion request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create deletion request" });
    }
  });
  app2.patch("/api/deletion-requests/:id/approve", requireAuth, async (req, res) => {
    try {
      const { reviewedBy, reviewedByName, reviewNotes } = req.body;
      if (!reviewedBy || !reviewedByName) {
        return res.status(400).json({ error: "reviewedBy and reviewedByName are required" });
      }
      const request = await storage.approveDeletionRequest(req.params.id, reviewedBy, reviewedByName, reviewNotes);
      await storage.createGeneralLog({
        action: "deletion_approved",
        category: "company",
        targetId: request.companyId,
        targetName: request.companyName,
        performedBy: reviewedBy,
        performedByName: reviewedByName,
        details: `Deletion request for ${request.companyName} approved by ${reviewedByName}${reviewNotes ? `. Notes: ${reviewNotes}` : ""}`,
        metadata: { requestId: request.id }
      });
      await storage.deleteCompany(request.companyId);
      await storage.createGeneralLog({
        action: "company_deleted",
        category: "company",
        targetId: request.companyId,
        targetName: request.companyName,
        performedBy: reviewedBy,
        performedByName: reviewedByName,
        details: `Company ${request.companyName} permanently deleted following approved deletion request`,
        metadata: {
          requestId: request.id,
          requestedBy: request.requestedBy,
          requestedByName: request.requestedByName,
          reason: request.reason
        }
      });
      res.json(request);
    } catch (error) {
      if (error instanceof Error && error.message === "Deletion request not found") {
        return res.status(404).json({ error: "Deletion request not found" });
      }
      res.status(500).json({ error: "Failed to approve deletion request" });
    }
  });
  app2.patch("/api/deletion-requests/:id/reject", requireAuth, async (req, res) => {
    try {
      const { reviewedBy, reviewedByName, reviewNotes } = req.body;
      if (!reviewedBy || !reviewedByName) {
        return res.status(400).json({ error: "reviewedBy and reviewedByName are required" });
      }
      const request = await storage.rejectDeletionRequest(req.params.id, reviewedBy, reviewedByName, reviewNotes);
      await storage.createGeneralLog({
        action: "deletion_rejected",
        category: "company",
        targetId: request.companyId,
        targetName: request.companyName,
        performedBy: reviewedBy,
        performedByName: reviewedByName,
        details: `Deletion request for ${request.companyName} rejected by ${reviewedByName}${reviewNotes ? `. Notes: ${reviewNotes}` : ""}`,
        metadata: { requestId: request.id }
      });
      res.json(request);
    } catch (error) {
      if (error instanceof Error && error.message === "Deletion request not found") {
        return res.status(404).json({ error: "Deletion request not found" });
      }
      res.status(500).json({ error: "Failed to reject deletion request" });
    }
  });
  app2.get("/api/general-log", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const logs = await storage.getGeneralLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch general logs" });
    }
  });
  app2.get("/api/general-log/entity/:targetId", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const logs = await storage.getGeneralLogsByTarget(req.params.targetId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entity logs" });
    }
  });
  app2.get("/api/general-log/category/:category", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit) : 100;
      const logs = await storage.getGeneralLogsByCategory(req.params.category, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category logs" });
    }
  });
  app2.get("/api/deployment/info", requireAdmin, async (req, res) => {
    try {
      const fs2 = await import("fs/promises");
      const path3 = await import("path");
      const packagePath = path3.join(process.cwd(), "package.json");
      const packageJson = JSON.parse(await fs2.readFile(packagePath, "utf-8"));
      res.json({
        version: packageJson.version || "1.0.0",
        name: packageJson.name || "corporate-management-system",
        description: "UK Corporate Management System with PostgreSQL database",
        lastGenerated: (/* @__PURE__ */ new Date()).toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get deployment info" });
    }
  });
  app2.get("/api/deployment/package", requireAdmin, async (req, res) => {
    try {
      const archiver = (await import("archiver")).default;
      const fs2 = await import("fs/promises");
      const path3 = await import("path");
      const archive = archiver("zip", { zlib: { level: 9 } });
      archive.on("error", (err) => {
        console.error("Archiver error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to create archive" });
        }
      });
      const timestamp2 = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=corpmanagesys-railway-${timestamp2}.zip`);
      archive.pipe(res);
      const baseDir = process.cwd();
      const excludePatterns = [
        "node_modules",
        "dist",
        ".env",
        ".git",
        ".replit",
        ".config",
        "tmp",
        "attached_assets",
        "drizzle",
        ".upm",
        "generated-icon.png",
        "replit.nix",
        ".breakpoints",
        ".cache"
      ];
      const filesToReplace = ["package.json", "vite.config.ts"];
      const shouldExclude = (filePath) => {
        const relativePath = path3.relative(baseDir, filePath);
        const baseName = path3.basename(relativePath);
        if (filesToReplace.includes(baseName) && !relativePath.includes("/")) {
          return true;
        }
        return excludePatterns.some(
          (pattern) => relativePath === pattern || relativePath.startsWith(pattern + "/") || relativePath.includes("/" + pattern + "/")
        );
      };
      const addDirectory = async (dirPath, archivePath = "") => {
        const entries = await fs2.readdir(dirPath, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path3.join(dirPath, entry.name);
          const archiveEntryPath = archivePath ? `${archivePath}/${entry.name}` : entry.name;
          if (shouldExclude(fullPath)) {
            continue;
          }
          if (entry.isDirectory()) {
            await addDirectory(fullPath, archiveEntryPath);
          } else {
            archive.file(fullPath, { name: archiveEntryPath });
          }
        }
      };
      await addDirectory(baseDir);
      const originalPackageJson = JSON.parse(await fs2.readFile(path3.join(baseDir, "package.json"), "utf-8"));
      const dependencies = { ...originalPackageJson.dependencies };
      const devDeps = originalPackageJson.devDependencies || {};
      const replitPackages = [
        "@replit/vite-plugin-cartographer",
        "@replit/vite-plugin-dev-banner",
        "@replit/vite-plugin-runtime-error-modal"
      ];
      for (const [pkg, version] of Object.entries(devDeps)) {
        if (!replitPackages.includes(pkg)) {
          dependencies[pkg] = version;
        }
      }
      const railwayPackageJson = {
        name: originalPackageJson.name || "corporate-management-system",
        version: originalPackageJson.version || "1.0.0",
        type: "module",
        license: originalPackageJson.license || "MIT",
        scripts: {
          "dev": "NODE_ENV=development tsx server/index.ts",
          "build": "vite build",
          "start": "NODE_ENV=production tsx server/index.ts",
          "db:push": "drizzle-kit push",
          "db:generate": "drizzle-kit generate",
          "db:studio": "drizzle-kit studio"
        },
        dependencies,
        optionalDependencies: originalPackageJson.optionalDependencies
      };
      archive.append(JSON.stringify(railwayPackageJson, null, 2), { name: "package.json" });
      const railwayViteConfig = `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select'],
        },
      },
    },
  },
});
`;
      archive.append(railwayViteConfig, { name: "vite.config.ts" });
      const railwayJson = {
        "$schema": "https://railway.app/railway.schema.json",
        "build": {
          "builder": "NIXPACKS"
        },
        "deploy": {
          "startCommand": "npm start",
          "healthcheckPath": "/api/health",
          "healthcheckTimeout": 30,
          "restartPolicyType": "ON_FAILURE",
          "restartPolicyMaxRetries": 10
        }
      };
      archive.append(JSON.stringify(railwayJson, null, 2), { name: "railway.json" });
      const nixpacksToml = `[phases.setup]
nixPkgs = ['nodejs_20', 'python3', 'openssl']

[phases.install]
cmds = ['npm ci']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'npm start'
`;
      archive.append(nixpacksToml, { name: "nixpacks.toml" });
      const envExample = [
        "# ===========================================",
        "# Corporate Management System - Environment Variables",
        "# ===========================================",
        "",
        "# DATABASE (Required)",
        "# -------------------------------------------",
        "# PostgreSQL connection URL",
        "# For Railway: Use ${{Postgres.DATABASE_URL}} in dashboard",
        "# For Neon: postgresql://user:pass@host/db?sslmode=require",
        "DATABASE_URL=postgresql://user:password@host:5432/database",
        "",
        "# SESSION (Required)",
        "# -------------------------------------------",
        "# Secret key for session encryption",
        "# Generate with: openssl rand -base64 32",
        "SESSION_SECRET=change-this-to-a-random-secret",
        "",
        "# COMPANIES HOUSE API (Optional)",
        "# -------------------------------------------",
        "# API key for UK Companies House integration",
        "# Get one at: https://developer.company-information.service.gov.uk/",
        "COMPANIES_HOUSE_API_KEY=",
        "",
        "# SERVER (Auto-configured)",
        "# -------------------------------------------",
        "# Port is auto-set by Railway, default 5000 for local",
        "PORT=5000",
        "NODE_ENV=production"
      ].join("\n");
      archive.append(envExample, { name: ".env.example" });
      const postgresRef = "${{Postgres.DATABASE_URL}}";
      const readmeContent = `# Corporate Management System - Railway Deployment Package

## Quick Start (Railway)

### 1. Create Railway Project
1. Go to [Railway](https://railway.app) and sign in
2. Click "New Project" -> "Deploy from GitHub repo" OR "Empty Project"
3. If using GitHub, connect and select your repository

### 2. Add PostgreSQL Database
1. In your Railway project, click "New" -> "Database" -> "Add PostgreSQL"
2. Wait for the database to provision

### 3. Configure Environment Variables
Go to your service -> "Variables" tab and add:

| Variable | Value |
|----------|-------|
| DATABASE_URL | ${postgresRef} |
| SESSION_SECRET | Generate with: openssl rand -base64 32 |
| COMPANIES_HOUSE_API_KEY | Your API key (optional) |

### 4. Deploy
Railway will automatically:
- Install dependencies (npm ci)
- Build the application (npm run build)
- Start the server (npm start)

### 5. Access Your App
1. Go to "Settings" -> "Networking"
2. Click "Generate Domain"
3. Your app is live!

## Default Login
- **Username:** Admin
- **Password:** Nogooms12

**IMPORTANT: Change this password immediately after first login!**

---

## Manual Deployment (VPS/Cloud)

    # Clone/upload the package
    cd corpmanagesys

    # Install dependencies
    npm ci

    # Configure environment
    cp .env.example .env
    # Edit .env with your values

    # Setup database
    npm run db:push

    # Build for production
    npm run build

    # Start server
    npm start

---

## Available Scripts

| Script | Description |
|--------|-------------|
| \`npm run dev\` | Start development server |
| \`npm run build\` | Build for production |
| \`npm start\` | Start production server |
| \`npm run db:push\` | Push schema to database |
| \`npm run db:generate\` | Generate migrations |
| \`npm run db:studio\` | Open Drizzle Studio |

---

## System Requirements

- **Node.js:** 20.x or higher
- **npm:** 10.x or higher
- **PostgreSQL:** 14 or higher

---

## Features

- Multi-company UK corporate management
- Companies House API integration
- Employee onboarding & management
- Sponsorship License workflows
- Compliance task automation
- Audit logging & approvals
- SL Training system

---

## Health Check

The application exposes \`/api/health\` for monitoring:

\`\`\`json
{
  "status": "ok",
  "timestamp": "2024-12-20T12:00:00.000Z",
  "uptime": 123.456
}
\`\`\`

---

## Troubleshooting

### Database Connection Failed
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure SSL is enabled for cloud databases

### Build Fails
- Check Node.js version (20+ required)
- Run \`npm ci\` to reinstall dependencies
- Check for TypeScript errors

### Session Issues
- Ensure SESSION_SECRET is set
- Must be a strong random string

---

## Support

- Railway Docs: https://docs.railway.com
- Companies House API: https://developer.company-information.service.gov.uk/
`;
      archive.append(readmeContent, { name: "README.md" });
      try {
        const schemaFile = path3.join(baseDir, "shared/schema.ts");
        archive.file(schemaFile, { name: "database/schema.ts" });
        const dbReadme = `# Database Setup Guide

This package includes the complete database schema for the Corporate Management System.

## Files Included

1. **schema.ts** - Drizzle ORM schema definition (source of truth)
2. **schema.sql** - Generated SQL schema (if available)
3. **README.md** - This file

## Quick Start

### Step 1: Prepare Your Database

You need a PostgreSQL database (version 14 or higher). Choose one:

- **Neon Serverless** (Recommended): https://neon.tech
- **Self-hosted PostgreSQL**: Local or cloud-hosted
- **Managed Services**: AWS RDS, Google Cloud SQL, Azure, etc.

### Step 2: Set Database URL

In your .env file, set the DATABASE_URL:

\`\`\`
DATABASE_URL=postgresql://username:password@host:port/database
\`\`\`

Example for Neon:
\`\`\`
DATABASE_URL=postgresql://user:pass@ep-example-123456.region.aws.neon.tech/dbname?sslmode=require
\`\`\`

### Step 3: Apply Schema

**Option A: Using Drizzle Kit (Recommended)**

\`\`\`bash
npm run db:push
\`\`\`

This reads schema.ts and creates all tables automatically.

If you get warnings about data loss:
\`\`\`bash
npm run db:push --force
\`\`\`

**Option B: Using SQL File (if included)**

If schema.sql is included, you can apply it directly:

\`\`\`bash
psql $DATABASE_URL -f database/schema.sql
\`\`\`

### Step 4: Verify Setup

The system will automatically create a default admin user on first run:
- Username: **Admin**
- Password: **Nogooms12**

\u26A0\uFE0F **IMPORTANT**: Change this password immediately after first login!

## Database Schema Overview

The database contains the following main tables:

### Core Tables
- **users** - User authentication and roles
- **session** - User session storage

### Company Management
- **companies** - UK company records with Companies House integration
- **tasks** - Compliance and operational tasks
- **approval_queue** - Multi-level approval workflows
- **audit_log** - System-wide audit trail

### Employee Management
- **employees** - Employee records and onboarding
- **employee_tasks** - Employee-specific tasks
- **attendance_reports** - Attendance tracking
- **hr_task_templates** - Recurring HR task templates

### Specialized Features
- **sl_prep_tasks** - Sponsorship License preparation tasks
- **residency_services** - Residency management
- **residency_task_templates** - Residency task templates

## Database Commands Reference

### Drizzle Kit Commands
\`\`\`bash
# Push schema changes to database
npm run db:push

# Force push (if you get warnings)
npm run db:push --force

# Generate SQL migrations
npm run db:generate

# Open Drizzle Studio (visual database GUI)
npm run db:studio
\`\`\`

### Manual PostgreSQL Commands
\`\`\`bash
# Connect to database
psql $DATABASE_URL

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql

# List tables
psql $DATABASE_URL -c "\\dt"
\`\`\`

## Schema Updates

When updating the schema:

1. Modify shared/schema.ts
2. Run \`npm run db:push\` to apply changes
3. Test thoroughly in development
4. Backup production database before applying in production

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure network/firewall allows connection
- For Neon: Check project is not suspended

### Schema Push Fails
- Check PostgreSQL version (14+ required)
- Use \`npm run db:push --force\` for warnings
- Clear drizzle/ folder and retry
- Check database permissions

### Migration Errors
- Backup database first
- Review schema.ts for syntax errors
- Check for conflicting column/table names
- Ensure all referenced tables exist

## Production Deployment

For production:

1. **Backup first**: Always backup before schema changes
2. **Test migrations**: Run in staging environment first
3. **Use transactions**: Drizzle Kit uses transactions automatically
4. **Monitor**: Check application logs after deployment
5. **Rollback plan**: Keep backup ready

## Security Best Practices

1. Use strong DATABASE_URL credentials
2. Enable SSL/TLS for database connections
3. Restrict database access by IP if possible
4. Regular backups (automated)
5. Monitor audit logs for suspicious activity
6. Rotate database passwords periodically

## Support

For database issues:
1. Check application logs
2. Check PostgreSQL logs
3. Review Drizzle Kit documentation: https://orm.drizzle.team
4. Check Neon documentation (if using Neon): https://neon.tech/docs
`;
        archive.append(dbReadme, { name: "database/README.md" });
        console.log("Database schema files added to archive");
      } catch (error) {
        console.error("Database schema export error:", error);
      }
      await archive.finalize();
      const user = req.session.user;
      if (user) {
        await storage.createGeneralLog({
          action: "deployment_package_downloaded",
          category: "system",
          targetId: "deployment",
          targetName: "Deployment Package",
          performedBy: user.id.toString(),
          performedByName: user.name,
          details: `Deployment package downloaded by ${user.name}`,
          metadata: { timestamp: timestamp2 }
        });
      }
    } catch (error) {
      console.error("Deployment package error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate deployment package" });
      }
    }
  });
  app2.get("/api/sl-training/modules", requireAuth, async (req, res) => {
    try {
      const modules = await storage.getSlTrainingModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ error: "Failed to fetch training modules" });
    }
  });
  app2.get("/api/sl-training/modules/:id", requireAuth, async (req, res) => {
    try {
      const module = await storage.getSlTrainingModule(req.params.id);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }
      const questions = await storage.getSlTrainingQuestions(req.params.id);
      res.json({ ...module, questions });
    } catch (error) {
      console.error("Error fetching training module:", error);
      res.status(500).json({ error: "Failed to fetch training module" });
    }
  });
  app2.post("/api/sl-training/modules", requireAdmin, async (req, res) => {
    try {
      const { name, learningMaterials } = z2.object({
        name: z2.string().min(1, "Module name is required"),
        learningMaterials: z2.string().optional()
      }).parse(req.body);
      const user = req.session.user;
      const module = await storage.createSlTrainingModule({
        name,
        learningMaterials: learningMaterials || null,
        createdBy: user.id,
        isActive: true
      });
      await storage.createGeneralLog({
        action: "training_module_created",
        category: "training",
        targetId: module.id,
        targetName: module.name,
        performedBy: user.id,
        performedByName: user.name,
        details: `Training module "${module.name}" created`
      });
      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating training module:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create module" });
    }
  });
  app2.patch("/api/sl-training/modules/:id", requireAdmin, async (req, res) => {
    try {
      const { name, learningMaterials, isActive } = z2.object({
        name: z2.string().min(1).optional(),
        learningMaterials: z2.string().optional(),
        isActive: z2.boolean().optional()
      }).parse(req.body);
      const module = await storage.updateSlTrainingModule(req.params.id, {
        ...name !== void 0 && { name },
        ...learningMaterials !== void 0 && { learningMaterials },
        ...isActive !== void 0 && { isActive }
      });
      const user = req.session.user;
      await storage.createGeneralLog({
        action: "training_module_updated",
        category: "training",
        targetId: module.id,
        targetName: module.name,
        performedBy: user.id,
        performedByName: user.name,
        details: `Training module "${module.name}" updated${isActive !== void 0 ? ` (${isActive ? "activated" : "deactivated"})` : ""}`
      });
      res.json(module);
    } catch (error) {
      console.error("Error updating training module:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update module" });
    }
  });
  app2.delete("/api/sl-training/modules/:id", requireAdmin, async (req, res) => {
    try {
      const existingModule = await storage.getSlTrainingModule(req.params.id);
      await storage.deleteSlTrainingModule(req.params.id);
      const user = req.session.user;
      await storage.createGeneralLog({
        action: "training_module_deleted",
        category: "training",
        targetId: req.params.id,
        targetName: existingModule?.name || "Unknown",
        performedBy: user.id,
        performedByName: user.name,
        details: `Training module "${existingModule?.name || req.params.id}" deleted`
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting training module:", error);
      res.status(500).json({ error: "Failed to delete module" });
    }
  });
  app2.post("/api/sl-training/modules/:id/questions", requireAdmin, async (req, res) => {
    try {
      const { csvContent } = z2.object({
        csvContent: z2.string().min(1, "CSV content is required")
      }).parse(req.body);
      const moduleId = req.params.id;
      const module = await storage.getSlTrainingModule(moduleId);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }
      const lines = csvContent.trim().split("\n");
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have a header row and at least one question" });
      }
      const questions = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseCSVLine(line);
        if (values.length < 6) {
          return res.status(400).json({
            error: `Row ${i + 1} has insufficient columns. Expected: Question, Choice1, Choice2, Choice3, Choice4, CorrectAnswer`
          });
        }
        const [question, choice1, choice2, choice3, choice4, correctAnswerStr] = values;
        const correctAnswer = parseInt(correctAnswerStr, 10);
        if (isNaN(correctAnswer) || correctAnswer < 1 || correctAnswer > 4) {
          return res.status(400).json({
            error: `Row ${i + 1}: Correct answer must be 1, 2, 3, or 4. Got: "${correctAnswerStr}"`
          });
        }
        if (!question.trim()) {
          return res.status(400).json({ error: `Row ${i + 1}: Question cannot be empty` });
        }
        questions.push({
          moduleId,
          question: question.trim(),
          choice1: choice1.trim(),
          choice2: choice2.trim(),
          choice3: choice3.trim(),
          choice4: choice4.trim(),
          correctAnswer,
          orderIndex: i - 1
        });
      }
      if (questions.length === 0) {
        return res.status(400).json({ error: "No valid questions found in CSV" });
      }
      await storage.deleteSlTrainingQuestions(moduleId);
      const createdQuestions = await storage.createSlTrainingQuestions(questions);
      res.json({
        success: true,
        questionsCount: createdQuestions.length,
        questions: createdQuestions
      });
    } catch (error) {
      console.error("Error uploading questions:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to upload questions" });
    }
  });
  app2.get("/api/sl-training/sample-csv", requireAuth, (req, res) => {
    const sampleCSV = `Question,Choice1,Choice2,Choice3,Choice4,CorrectAnswer
"What is the minimum salary for a Skilled Worker visa?","\xA320,480","\xA326,200","\xA338,700","\xA315,000",3
"How long is a Sponsor Licence valid for?","1 year","2 years","4 years","10 years",3
"What does COS stand for?","Certificate of Sponsorship","Certificate of Status","Compliance Order Sheet","Company Offer Statement",1`;
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="sample-questions.csv"');
    res.send(sampleCSV);
  });
  app2.get("/api/sl-training/progress", requireAuth, async (req, res) => {
    try {
      const user = req.session.user;
      const scores = await storage.getSlTrainingScores(user.id);
      res.json(scores);
    } catch (error) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ error: "Failed to fetch training progress" });
    }
  });
  app2.post("/api/sl-training/modules/:id/quiz", requireAuth, async (req, res) => {
    try {
      const { answers } = z2.object({
        answers: z2.array(z2.number().min(1).max(4))
      }).parse(req.body);
      const moduleId = req.params.id;
      const user = req.session.user;
      const questions = await storage.getSlTrainingQuestions(moduleId);
      if (questions.length === 0) {
        return res.status(400).json({ error: "This module has no questions" });
      }
      if (answers.length !== questions.length) {
        return res.status(400).json({
          error: `Expected ${questions.length} answers, got ${answers.length}`
        });
      }
      let correctCount = 0;
      const results = questions.map((q, index) => {
        const userAnswer = answers[index];
        const isCorrect = userAnswer === q.correctAnswer;
        if (isCorrect) correctCount++;
        return {
          questionId: q.id,
          question: q.question,
          userAnswer,
          correctAnswer: q.correctAnswer,
          isCorrect,
          choices: [q.choice1, q.choice2, q.choice3, q.choice4]
        };
      });
      const score = Math.round(correctCount / questions.length * 100);
      const savedScore = await storage.upsertSlTrainingScore({
        userId: user.id,
        moduleId,
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        lastAnswers: answers
      });
      res.json({
        score,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        results,
        savedScore
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to submit quiz" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}
function parseCSVLine(line) {
  const result = [];
  let current = "";
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
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";
var __dirname = path.dirname(fileURLToPath(import.meta.url));
var vite_config_default = defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-form": ["react-hook-form", "@hookform/resolvers", "zod"],
          "vendor-charts": ["recharts"],
          "vendor-dates": ["luxon", "date-fns"],
          ui: [
            "@radix-ui/react-dialog",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-toast",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-switch",
            "@radix-ui/react-scroll-area"
          ],
          "vendor-export": ["xlsx", "jspdf", "html2canvas"]
        }
      }
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/initDb.ts
import { sql as sql2 } from "drizzle-orm";
import bcrypt2 from "bcrypt";
async function initializeDatabase() {
  console.log("[initDb] Initializing database schema...");
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR UNIQUE NOT NULL,
      username VARCHAR UNIQUE NOT NULL,
      password VARCHAR NOT NULL,
      password_hint TEXT,
      name VARCHAR NOT NULL,
      email VARCHAR NOT NULL,
      position VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS companies (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      number VARCHAR NOT NULL,
      address TEXT,
      incorporation_date VARCHAR,
      industry_code VARCHAR,
      director TEXT,
      psc TEXT,
      directors JSONB DEFAULT '[]',
      officers JSONB DEFAULT '[]',
      pscs JSONB DEFAULT '[]',
      previous_names JSONB DEFAULT '[]',
      charges JSONB DEFAULT '[]',
      insolvency_history JSONB DEFAULT '[]',
      filings JSONB DEFAULT '[]',
      documents JSONB DEFAULT '[]',
      internal_code VARCHAR,
      utr VARCHAR,
      government_gateway VARCHAR,
      owner_name VARCHAR,
      owner_emails JSONB DEFAULT '[]',
      owner_phones JSONB DEFAULT '[]',
      owner_email VARCHAR,
      owner_phone VARCHAR,
      companies_house_link VARCHAR,
      google_drive_link TEXT NOT NULL DEFAULT '',
      vendor_name VARCHAR,
      renewal_date VARCHAR,
      has_renewal_fees BOOLEAN DEFAULT FALSE,
      renewal_fees VARCHAR,
      auth_code VARCHAR,
      psc_link VARCHAR,
      shareholders TEXT,
      shareholders_link VARCHAR,
      director_link VARCHAR,
      is_active BOOLEAN DEFAULT TRUE,
      sl BOOLEAN DEFAULT FALSE,
      sl_license_issued BOOLEAN DEFAULT FALSE,
      sl_license_number VARCHAR,
      sl_license_issue_date VARCHAR,
      sl_paye_reference VARCHAR,
      sl_work_address TEXT,
      sl_level1_users JSONB DEFAULT '[]',
      sl_defined_cos INTEGER,
      sl_undefined_cos INTEGER,
      company_status VARCHAR,
      company_type VARCHAR,
      jurisdiction VARCHAR,
      has_charges BOOLEAN,
      has_insolvency BOOLEAN,
      confirmation_statement_due VARCHAR,
      accounts_due VARCHAR,
      last_accounts_date VARCHAR,
      confirmation_statement_last_made VARCHAR,
      last_sync_date VARCHAR,
      sync_status VARCHAR DEFAULT 'never',
      activity_log JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_at TIMESTAMP NOT NULL,
      status VARCHAR DEFAULT 'open' NOT NULL,
      meta JSONB DEFAULT '{}',
      unique_key VARCHAR NOT NULL,
      renewal_date VARCHAR NOT NULL,
      reviewed BOOLEAN DEFAULT FALSE,
      reviewed_at TIMESTAMP,
      reviewer_note TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS task_audits (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id VARCHAR NOT NULL,
      task_title TEXT NOT NULL,
      company_id VARCHAR NOT NULL,
      company_name TEXT NOT NULL,
      from_status VARCHAR NOT NULL,
      to_status VARCHAR NOT NULL,
      reason TEXT,
      performed_by VARCHAR DEFAULT 'System' NOT NULL,
      meta JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS company_activity_logs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL,
      company_name TEXT NOT NULL,
      action VARCHAR NOT NULL,
      reason TEXT NOT NULL,
      performed_by VARCHAR DEFAULT 'System' NOT NULL,
      meta JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS sl_prep_tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS company_sl_prep_task_statuses (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      task_id VARCHAR NOT NULL REFERENCES sl_prep_tasks(id) ON DELETE CASCADE,
      is_completed BOOLEAN DEFAULT FALSE NOT NULL,
      description TEXT,
      completion_note TEXT,
      completed_at TIMESTAMP
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS hr_task_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      recurrence VARCHAR NOT NULL,
      due_date_offset_days INTEGER DEFAULT 7 NOT NULL,
      priority VARCHAR DEFAULT 'medium' NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS leaver_task_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      due_days INTEGER DEFAULT 7 NOT NULL,
      priority VARCHAR DEFAULT 'medium' NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS residency_task_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      recurrence VARCHAR NOT NULL,
      start_date_mode VARCHAR NOT NULL,
      start_date VARCHAR,
      offset_days INTEGER,
      priority VARCHAR DEFAULT 'medium' NOT NULL,
      applicant_type VARCHAR DEFAULT 'main_only' NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS employee_form_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      version INTEGER DEFAULT 1 NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      steps JSONB NOT NULL,
      fields JSONB NOT NULL,
      global_rules JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id VARCHAR NOT NULL,
      template_version INTEGER NOT NULL,
      first_name VARCHAR NOT NULL,
      middle_names VARCHAR DEFAULT '',
      last_name VARCHAR NOT NULL,
      date_of_birth VARCHAR,
      personal_mobile VARCHAR,
      personal_email VARCHAR,
      uk_address TEXT,
      uk_address_provide_later VARCHAR,
      overseas_address TEXT,
      uk_bank_address TEXT,
      uk_bank_address_provide_later VARCHAR,
      emergency_contact_name VARCHAR,
      emergency_contact_relationship VARCHAR,
      emergency_contact_phone VARCHAR,
      company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT,
      department VARCHAR,
      work_location TEXT,
      work_location_source VARCHAR,
      line_manager VARCHAR,
      job_title VARCHAR,
      job_description TEXT,
      contract_type VARCHAR,
      start_date VARCHAR,
      end_date VARCHAR,
      working_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
      weekly_hours INTEGER,
      daily_working_hours INTEGER,
      starting_working_time VARCHAR DEFAULT '09:00',
      ending_working_time VARCHAR,
      break_minutes INTEGER DEFAULT 60,
      salary INTEGER,
      vacation_days INTEGER,
      hourly_rate INTEGER,
      overtime_rate INTEGER,
      paye_reference VARCHAR,
      national_insurance VARCHAR,
      national_insurance_provide_later VARCHAR,
      google_drive_link TEXT DEFAULT '',
      nationality VARCHAR,
      immigration_status VARCHAR,
      is_sponsored BOOLEAN,
      passport_number VARCHAR,
      passport_expiry VARCHAR,
      brp_share_code VARCHAR,
      visa_type VARCHAR,
      cos_number VARCHAR,
      sponsor_license_number VARCHAR,
      visa_issue_date VARCHAR,
      visa_expiry_date VARCHAR,
      rtw_basis VARCHAR,
      rtw_check_date VARCHAR,
      rtw_evidence_type VARCHAR,
      rtw_expiry_date_mode VARCHAR,
      rtw_expiry_date VARCHAR,
      rtw_expiry_indefinite BOOLEAN DEFAULT FALSE,
      rtw_share_code VARCHAR,
      doc_passport_copy BOOLEAN DEFAULT FALSE,
      doc_graduation_cert_copy BOOLEAN DEFAULT FALSE,
      doc_proof_of_address_copy BOOLEAN DEFAULT FALSE,
      doc_rtw_copy BOOLEAN DEFAULT FALSE,
      doc_cos_copy BOOLEAN DEFAULT FALSE,
      doc_visa_copy BOOLEAN DEFAULT FALSE,
      probation_period INTEGER DEFAULT 3,
      probation_end_date VARCHAR,
      status VARCHAR DEFAULT 'onboarding' NOT NULL,
      is_draft BOOLEAN DEFAULT FALSE NOT NULL,
      leaver_date VARCHAR,
      ukvi_reporting_notes TEXT,
      is_residency_service BOOLEAN DEFAULT FALSE,
      residency_status VARCHAR,
      residency_log JSONB DEFAULT '[]',
      documents JSONB DEFAULT '[]',
      generated_task_ids JSONB DEFAULT '[]',
      form_data JSONB DEFAULT '{}',
      activity_log JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS dependants (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_name TEXT NOT NULL,
      first_name VARCHAR NOT NULL,
      middle_name VARCHAR DEFAULT '',
      last_name VARCHAR NOT NULL,
      date_of_birth VARCHAR NOT NULL,
      relationship VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS pending_dependant_requests (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL,
      employee_name TEXT NOT NULL,
      action VARCHAR NOT NULL,
      requested_by VARCHAR NOT NULL,
      requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
      status VARCHAR DEFAULT 'pending' NOT NULL,
      reviewed_by VARCHAR,
      reviewed_at TIMESTAMP,
      review_note TEXT,
      reason TEXT NOT NULL,
      dependant_data JSONB NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS pending_employee_status_changes (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL,
      employee_name TEXT NOT NULL,
      change_type VARCHAR NOT NULL,
      current_value VARCHAR NOT NULL,
      new_value VARCHAR NOT NULL,
      reason TEXT NOT NULL,
      requested_by VARCHAR NOT NULL,
      requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
      status VARCHAR DEFAULT 'pending' NOT NULL,
      reviewed_by VARCHAR,
      reviewed_at TIMESTAMP,
      review_note TEXT
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS pending_company_sl_changes (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL,
      company_name TEXT NOT NULL,
      field VARCHAR NOT NULL,
      current_value JSONB,
      new_value JSONB,
      reason TEXT NOT NULL,
      requested_by VARCHAR NOT NULL,
      requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
      status VARCHAR DEFAULT 'pending' NOT NULL,
      reviewed_by VARCHAR,
      reviewed_at TIMESTAMP,
      review_note TEXT
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS employee_tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_name TEXT NOT NULL,
      company_id VARCHAR NOT NULL,
      company_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      task_type VARCHAR NOT NULL,
      due_at TIMESTAMP NOT NULL,
      status VARCHAR DEFAULT 'open' NOT NULL,
      priority VARCHAR DEFAULT 'medium' NOT NULL,
      completion_note TEXT,
      cancel_reason TEXT,
      unique_key VARCHAR,
      meta JSONB DEFAULT '{}',
      reviewed BOOLEAN DEFAULT FALSE,
      reviewer_note TEXT,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS employee_activity_logs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL,
      employee_name TEXT NOT NULL,
      action VARCHAR NOT NULL,
      details TEXT,
      field_changed VARCHAR,
      old_value TEXT,
      new_value TEXT,
      performed_by VARCHAR DEFAULT 'System' NOT NULL,
      meta JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS user_activity_logs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      action VARCHAR NOT NULL,
      target_username VARCHAR NOT NULL,
      target_name VARCHAR NOT NULL,
      details TEXT,
      reason TEXT,
      performed_by VARCHAR DEFAULT 'System' NOT NULL,
      meta JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS holidays (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      date VARCHAR NOT NULL,
      day VARCHAR NOT NULL,
      holiday_name VARCHAR NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date VARCHAR NOT NULL,
      day VARCHAR NOT NULL,
      status VARCHAR NOT NULL,
      scheduled_start_time VARCHAR,
      actual_clock_in_time VARCHAR,
      scheduled_end_time VARCHAR,
      actual_clock_out_time VARCHAR,
      break_type VARCHAR DEFAULT 'Unpaid' NOT NULL,
      break_duration VARCHAR,
      break_rate INTEGER,
      hourly_rate INTEGER,
      overtime_rate INTEGER,
      scheduled_working_hours INTEGER,
      total_working_hours INTEGER,
      paid_working_hours INTEGER,
      overtime_hours INTEGER,
      break_cost INTEGER,
      base_pay INTEGER,
      overtime_pay INTEGER,
      total_day_pay INTEGER,
      notes TEXT,
      anomaly_flag BOOLEAN DEFAULT FALSE
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS system_settings (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR UNIQUE NOT NULL,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS deletion_requests (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      requested_by VARCHAR NOT NULL REFERENCES users(id),
      requested_by_name TEXT NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'pending',
      reviewed_by VARCHAR REFERENCES users(id),
      reviewed_by_name TEXT,
      reviewed_at TIMESTAMP,
      review_notes TEXT,
      requested_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS general_log (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      log_ref_id SERIAL,
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
      action VARCHAR NOT NULL,
      category VARCHAR NOT NULL,
      target_id VARCHAR,
      target_name TEXT,
      performed_by VARCHAR NOT NULL,
      performed_by_name TEXT NOT NULL,
      details TEXT,
      metadata JSONB DEFAULT '{}'
    )
  `);
  await db.execute(sql2`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_log' AND column_name = 'log_ref_id') THEN
        CREATE SEQUENCE IF NOT EXISTS general_log_ref_seq;
        ALTER TABLE general_log ADD COLUMN log_ref_id INTEGER DEFAULT nextval('general_log_ref_seq');
      END IF;
    END $$
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS sl_training_modules (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR NOT NULL,
      learning_materials TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      created_by VARCHAR,
      is_active BOOLEAN DEFAULT TRUE
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS sl_training_questions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      module_id VARCHAR NOT NULL REFERENCES sl_training_modules(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      choice_1 TEXT NOT NULL,
      choice_2 TEXT NOT NULL,
      choice_3 TEXT NOT NULL,
      choice_4 TEXT NOT NULL,
      correct_answer INTEGER NOT NULL,
      order_index INTEGER DEFAULT 0
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS sl_training_scores (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id VARCHAR NOT NULL REFERENCES sl_training_modules(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      completed_at TIMESTAMP DEFAULT NOW() NOT NULL,
      last_answers JSONB DEFAULT '[]'
    )
  `);
  await db.execute(sql2`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" VARCHAR NOT NULL COLLATE "default",
      "sess" JSON NOT NULL,
      "expire" TIMESTAMP(6) NOT NULL,
      PRIMARY KEY ("sid")
    )
  `);
  await db.execute(sql2`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire")
  `);
  await db.execute(sql2`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'sl_phone') THEN
        ALTER TABLE companies ADD COLUMN sl_phone VARCHAR;
        ALTER TABLE companies ADD COLUMN sl_email VARCHAR;
        ALTER TABLE companies ADD COLUMN sl_website VARCHAR;
        ALTER TABLE companies ADD COLUMN sl_has_debit_card BOOLEAN DEFAULT FALSE;
        ALTER TABLE companies ADD COLUMN sl_debit_card_activated BOOLEAN DEFAULT FALSE;
        ALTER TABLE companies ADD COLUMN sl_debit_card_expiry VARCHAR;
        ALTER TABLE companies ADD COLUMN sl_has_direct_debit_hmrc BOOLEAN DEFAULT FALSE;
        ALTER TABLE companies ADD COLUMN sl_has_direct_debit_nest BOOLEAN DEFAULT FALSE;
        ALTER TABLE companies ADD COLUMN sl_unassigned_defined_cos INTEGER;
        ALTER TABLE companies ADD COLUMN sl_unassigned_undefined_cos INTEGER;
      END IF;
    END $$
  `);
  console.log("[initDb] All tables created successfully");
  console.log("[initDb] Ensuring default admin user exists...");
  const hashedPassword = await bcrypt2.hash("admin123", 10);
  try {
    await db.execute(sql2`DELETE FROM users WHERE username = 'admin'`);
  } catch (e) {
  }
  try {
    await db.execute(sql2`
      INSERT INTO users (id, user_id, username, password, password_hint, name, email, position)
      VALUES (
        gen_random_uuid(),
        'USR-001',
        'admin',
        ${hashedPassword},
        'Default admin password',
        'System Administrator',
        'admin@company.com',
        'admin'
      )
    `);
    console.log("[initDb] Admin user created/updated (username: admin, password: admin123)");
  } catch (e) {
    console.error("[initDb] Error creating admin user:", e);
  }
  const existingHRTemplates = await db.execute(sql2`SELECT COUNT(*) as count FROM hr_task_templates`);
  const hrTemplateCount = Number(existingHRTemplates.rows?.[0]?.count || existingHRTemplates[0]?.count || 0);
  if (hrTemplateCount === 0) {
    console.log("[initDb] Seeding default HR task templates...");
    const hrTemplates = [
      { name: "Setup Recurring Salary Payment", description: "Set up recurring salary payment for the employee in the payroll system", recurrence: "one_time", due_date_offset_days: 7, priority: "high", order: 1 },
      { name: "Keep Copy of Visa", description: "Obtain and file a copy of the employee's visa document", recurrence: "one_time", due_date_offset_days: 3, priority: "high", order: 2 },
      { name: "First Month Pension Enrollment", description: "Enroll the employee in the company pension scheme during their first month", recurrence: "one_time", due_date_offset_days: 30, priority: "high", order: 3 },
      { name: "Record Tax Code", description: "Record and verify the employee's tax code from HMRC", recurrence: "one_time", due_date_offset_days: 14, priority: "medium", order: 4 },
      { name: "Issue Payslip", description: "Issue monthly payslip to the employee", recurrence: "monthly", due_date_offset_days: 28, priority: "medium", order: 5 },
      { name: "Keep Payslip Record", description: "File and maintain a copy of the employee's payslip", recurrence: "monthly", due_date_offset_days: 28, priority: "medium", order: 6 },
      { name: "Quarterly RTI Submission", description: "Submit Real Time Information (RTI) report to HMRC for this employee", recurrence: "monthly", due_date_offset_days: 90, priority: "high", order: 7 },
      { name: "Quarterly Attendance vs COS Check", description: "Verify quarterly that the attendance sheet matches the Certificate of Sponsorship requirements", recurrence: "monthly", due_date_offset_days: 90, priority: "high", order: 8 },
      { name: "First Month Pension Proof", description: "Obtain proof of pension enrollment from the first month", recurrence: "one_time", due_date_offset_days: 35, priority: "high", order: 9 },
      { name: "Tax Code Revised Check", description: "Check if tax code has been revised by HMRC and update records", recurrence: "annual", due_date_offset_days: 365, priority: "medium", order: 10 },
      { name: "P60 End of Year", description: "Issue P60 to the employee by the end of the tax year", recurrence: "annual", due_date_offset_days: 365, priority: "high", order: 11 },
      { name: "Pension Re-enrollment (3 Year)", description: "Re-enroll the employee in pension scheme (required every 3 years)", recurrence: "annual", due_date_offset_days: 1095, priority: "high", order: 12 },
      { name: "Pension Opt-Out Proof (3 Year)", description: "If employee opted out of pension, keep proof of opt-out (renew every 3 years)", recurrence: "annual", due_date_offset_days: 1095, priority: "medium", order: 13 },
      { name: "Keep Proof Employee Wished to Leave Pension", description: "Maintain documentation proving employee voluntarily chose to leave the pension scheme", recurrence: "one_time", due_date_offset_days: 30, priority: "medium", order: 14 },
      { name: "Screenshot Migrant Activity Report", description: "Take screenshot of reporting migrant activity stop in the migrant file for records", recurrence: "one_time", due_date_offset_days: 7, priority: "medium", order: 15 },
      { name: "First Manual COS Review", description: "Perform first manual review of Certificate of Sponsorship against the system records", recurrence: "one_time", due_date_offset_days: 14, priority: "high", order: 16 },
      { name: "Second Manual COS Review", description: "Perform second manual review of Certificate of Sponsorship against the system records", recurrence: "one_time", due_date_offset_days: 30, priority: "high", order: 17 },
      { name: "Last Month Remove Salary Recurrence", description: "Task at the last month of contract to remove recurring salary payment", recurrence: "one_time", due_date_offset_days: 0, priority: "urgent", order: 18 }
    ];
    for (const t of hrTemplates) {
      await db.execute(sql2`
        INSERT INTO hr_task_templates (id, name, description, recurrence, due_date_offset_days, priority, "order")
        VALUES (gen_random_uuid(), ${t.name}, ${t.description}, ${t.recurrence}, ${t.due_date_offset_days}, ${t.priority}, ${t.order})
      `);
    }
    console.log(`[initDb] ${hrTemplates.length} HR task templates seeded`);
  }
  const existingLeaverTemplates = await db.execute(sql2`SELECT COUNT(*) as count FROM leaver_task_templates`);
  const leaverTemplateCount = Number(existingLeaverTemplates.rows?.[0]?.count || existingLeaverTemplates[0]?.count || 0);
  if (leaverTemplateCount === 0) {
    console.log("[initDb] Seeding default Leaver task templates...");
    const leaverTemplates = [
      { name: "Stop Salary / Recurring Payments", description: "Immediately stop all recurring salary payments and payroll deductions for the departing employee", due_days: 1, priority: "urgent", order: 1 },
      { name: "Upload Resignation/Firing Letter", description: "Upload and file the resignation letter or termination notice in the employee's records", due_days: 2, priority: "high", order: 2 },
      { name: "Inform Home Office (COS Holder - 10 Day Deadline)", description: "URGENT: If the employee holds a Certificate of Sponsorship, notify the Home Office within 10 days of their departure. Failure to do so may affect your sponsor licence.", due_days: 10, priority: "urgent", order: 3 },
      { name: "Report to UKVI (Sponsored Employee)", description: "Report the sponsored employee's departure to UK Visas & Immigration as required by sponsor licence obligations", due_days: 10, priority: "urgent", order: 4 },
      { name: "Inform Accountant", description: "Notify the company accountant about the employee's departure for payroll and tax record adjustments", due_days: 3, priority: "high", order: 5 },
      { name: "Stop Payslip Issuance", description: "Ensure no further payslips are generated or issued for the departing employee", due_days: 1, priority: "high", order: 6 },
      { name: "Issue P45", description: "Generate and issue a P45 form to the departing employee and submit to HMRC", due_days: 14, priority: "high", order: 7 },
      { name: "Process Resignation / Handle Exit", description: "Complete all resignation/termination processing including final pay calculations, holiday pay settlements, and exit paperwork", due_days: 7, priority: "high", order: 8 }
    ];
    for (const t of leaverTemplates) {
      await db.execute(sql2`
        INSERT INTO leaver_task_templates (id, name, description, due_days, priority, "order")
        VALUES (gen_random_uuid(), ${t.name}, ${t.description}, ${t.due_days}, ${t.priority}, ${t.order})
      `);
    }
    console.log(`[initDb] ${leaverTemplates.length} Leaver task templates seeded`);
  }
  const existingResidencyTemplates = await db.execute(sql2`SELECT COUNT(*) as count FROM residency_task_templates`);
  const residencyTemplateCount = Number(existingResidencyTemplates.rows?.[0]?.count || existingResidencyTemplates[0]?.count || 0);
  if (residencyTemplateCount === 0) {
    console.log("[initDb] Seeding default Residency task templates...");
    const residencyTemplates = [
      { name: "Deactivate Employee After Citizenship", description: "Remove or deactivate the employee from sponsored status after they have obtained British citizenship", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 0, priority: "high", applicant_type: "main_only", order: 1 },
      { name: "Add Dependants to Profile", description: "Add all dependants (family members) to the employee's residency profile for visa and immigration tracking", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 7, priority: "medium", applicant_type: "main_only", order: 2 },
      { name: "Track Family Members Over 13 Years", description: "Track employee family members over 13 years of age for immigration compliance purposes", recurrence: "annually", start_date_mode: "offset_days", offset_days: 365, priority: "medium", applicant_type: "main_and_dependants", order: 3 },
      { name: "Sign UK Passport with Black Ballpoint Pen", description: "Reminder: UK passport must be signed using a black ballpoint pen only. This is a requirement for passport validity.", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 0, priority: "low", applicant_type: "main_and_dependants", order: 4 },
      { name: "Inform Original Country of New Citizenship", description: "Inform the authority of the employee's original country about their new British citizenship as required", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 30, priority: "medium", applicant_type: "main_only", order: 5 },
      { name: "Passport Interview Preparation", description: "Prepare for the passport interview including Q&A practice and checklist review. Refer to the Google Drive link for interview preparation materials.", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 14, priority: "high", applicant_type: "main_and_dependants", order: 6 }
    ];
    for (const t of residencyTemplates) {
      await db.execute(sql2`
        INSERT INTO residency_task_templates (id, name, description, recurrence, start_date_mode, offset_days, priority, applicant_type, "order")
        VALUES (gen_random_uuid(), ${t.name}, ${t.description}, ${t.recurrence}, ${t.start_date_mode}, ${t.offset_days}, ${t.priority}, ${t.applicant_type}, ${t.order})
      `);
    }
    console.log(`[initDb] ${residencyTemplates.length} Residency task templates seeded`);
  }
  const existingSLPrepTasks = await db.execute(sql2`SELECT COUNT(*) as count FROM sl_prep_tasks`);
  const slPrepTaskCount = Number(existingSLPrepTasks.rows?.[0]?.count || existingSLPrepTasks[0]?.count || 0);
  if (slPrepTaskCount === 0) {
    console.log("[initDb] Seeding default SL Prep tasks...");
    const slPrepTasks2 = [
      { name: "Review Company Working Address", order: 1 },
      { name: "Review A Rating Status", order: 2 },
      { name: "Update SL with Unassigned COS Numbers", order: 3 },
      { name: "Connect Direct Debit with HMRC", order: 4 },
      { name: "Verify Monthly HMRC Direct Debit Active", order: 5 },
      { name: "Monthly HMRC Payment", order: 6 },
      { name: "Quarterly Address Verification on License", order: 7 },
      { name: "Monthly Inspection Training", order: 8 },
      { name: "Check Company Name on Door", order: 9 },
      { name: "Verify Debit Card Status and Expiry", order: 10 },
      { name: "Direct Debit Setup for HMRC", order: 11 },
      { name: "Direct Debit Setup for Nest Pension", order: 12 }
    ];
    for (const t of slPrepTasks2) {
      await db.execute(sql2`
        INSERT INTO sl_prep_tasks (id, name, "order")
        VALUES (gen_random_uuid(), ${t.name}, ${t.order})
      `);
    }
    console.log(`[initDb] ${slPrepTasks2.length} SL Prep tasks seeded`);
  }
  console.log("[initDb] Database initialization complete");
}

// api/index.ts
var app = null;
var initPromise = null;
async function getApp() {
  if (app) {
    return app;
  }
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    const newApp = express2();
    const PgSession = connectPgSimple(session);
    let sessionStore;
    if (process.env.DATABASE_URL) {
      sessionStore = new PgSession({
        conString: process.env.DATABASE_URL,
        tableName: "user_sessions",
        createTableIfMissing: true
      });
      log("Using PostgreSQL session store for persistent sessions");
    } else {
      log("WARNING: DATABASE_URL not set - using in-memory sessions");
    }
    newApp.use(
      session({
        store: sessionStore,
        secret: process.env.SESSION_SECRET || (true ? (() => {
          throw new Error("SESSION_SECRET must be set in production");
        })() : "dev-secret-change-in-production"),
        resave: false,
        saveUninitialized: false,
        cookie: {
          httpOnly: true,
          secure: true,
          sameSite: true ? "none" : "lax",
          maxAge: 24 * 60 * 60 * 1e3
        },
        proxy: true
      })
    );
    newApp.use(express2.json());
    newApp.use(express2.urlencoded({ extended: false }));
    newApp.use((req, res, next) => {
      const start = Date.now();
      const path3 = req.path;
      let capturedJsonResponse = void 0;
      const originalResJson = res.json;
      res.json = function(bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };
      res.on("finish", () => {
        const duration = Date.now() - start;
        if (path3.startsWith("/api")) {
          let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }
          if (logLine.length > 80) {
            logLine = logLine.slice(0, 79) + "\u2026";
          }
          log(logLine);
        }
      });
      next();
    });
    try {
      await initializeDatabase();
      await registerRoutes(newApp);
      newApp.use((err, _req, res, _next) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        res.status(status).json({ message });
        console.error(`[error] ${err.stack || err.message || err}`);
      });
      serveStatic(newApp);
      app = newApp;
      return newApp;
    } catch (error) {
      console.error("Failed to initialize app:", error);
      throw error;
    }
  })();
  return initPromise;
}
var index_default = async (req, res) => {
  const expressApp = await getApp();
  return expressApp(req, res);
};
export {
  index_default as default
};
