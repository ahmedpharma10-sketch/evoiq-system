import { localStorageService } from "./localStorage";
import { DateTime } from "luxon";

export interface CSVExport {
  filename: string;
  content: string;
}

const escapeField = (field: any): string => {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  return `"${str.replace(/"/g, '""')}"`;
};

export const csvExportService = {
  /**
   * Generate all CSVs from the system
   * Returns array of CSV files with formatted filenames
   */
  generateAllCSVs(): CSVExport[] {
    const now = DateTime.now().setZone("Europe/London");
    const timestamp = now.toFormat("yy-MM-dd HH:mm");
    const exports: CSVExport[] = [];

    // 1. Companies Export
    const companies = localStorageService.getCompanies();
    if (companies.length > 0) {
      const companiesCSV = this.generateCompaniesCSV(companies);
      exports.push({
        filename: `${timestamp} Companies.csv`,
        content: companiesCSV,
      });
    }

    // 2. Company Compliance Tasks Export
    const tasks = localStorageService.getTasks();
    if (tasks.length > 0) {
      const tasksCSV = this.generateCompanyTasksCSV(tasks);
      exports.push({
        filename: `${timestamp} Company Compliance Tasks.csv`,
        content: tasksCSV,
      });
    }

    // 3. SL Prep Tasks Export
    const slPrepTasks = localStorageService.getSLPrepTasks();
    if (slPrepTasks.length > 0) {
      const slPrepCSV = this.generateSLPrepTasksCSV(slPrepTasks);
      exports.push({
        filename: `${timestamp} SL Prep Tasks.csv`,
        content: slPrepCSV,
      });
    }

    // 4. HR Task Templates Export
    const hrTemplates = localStorageService.getHRTaskTemplates();
    if (hrTemplates.length > 0) {
      const hrCSV = this.generateHRTaskTemplatesCSV(hrTemplates);
      exports.push({
        filename: `${timestamp} HR Task Templates.csv`,
        content: hrCSV,
      });
    }

    // 5. Residency Task Templates Export
    const residencyTemplates = localStorageService.getResidencyTaskTemplates();
    if (residencyTemplates.length > 0) {
      const residencyCSV = this.generateResidencyTaskTemplatesCSV(residencyTemplates);
      exports.push({
        filename: `${timestamp} Residency Task Templates.csv`,
        content: residencyCSV,
      });
    }

    // 6. Employees Export
    const employees = localStorageService.getEmployees();
    if (employees.length > 0) {
      const employeesCSV = this.generateEmployeesCSV(employees);
      exports.push({
        filename: `${timestamp} Employees.csv`,
        content: employeesCSV,
      });
    }

    // 7. Employee Tasks Export
    const employeeTasks = localStorageService.getEmployeeTasks();
    if (employeeTasks.length > 0) {
      const employeeTasksCSV = this.generateEmployeeTasksCSV(employeeTasks);
      exports.push({
        filename: `${timestamp} Employee Tasks.csv`,
        content: employeeTasksCSV,
      });
    }

    return exports;
  },

  generateCompaniesCSV(companies: any[]): string {
    const headers = [
      "Company ID", "Name", "Number", "Address", "Incorporation Date",
      "Industry Code", "Internal Code", "UTR", "Government Gateway",
      "Owner Name", "Owner Emails (JSON)", "Owner Phones (JSON)",
      "Companies House Link", "Google Drive Link", "Vendor Name",
      "Renewal Date", "Has Renewal Fees", "Renewal Fees", "Auth Code",
      "PSC Link", "Shareholders", "Shareholders Link", "Director Link",
      "Is Active", "SL", "SL License Issued", "SL License Number",
      "SL License Issue Date", "SL PAYE Reference", "SL Work Address",
      "SL Level 1 Users (JSON)", "SL Defined COS", "SL Undefined COS",
      "Company Status", "Company Type", "Jurisdiction", "Has Charges",
      "Has Insolvency", "Confirmation Statement Due", "Accounts Due",
      "Last Accounts Date", "Confirmation Statement Last Made",
      "Last Sync Date", "Sync Status", "Activity Log (JSON)",
      "Directors (JSON)", "Officers (JSON)", "PSCs (JSON)",
      "Previous Names (JSON)", "Charges (JSON)", "Insolvency History (JSON)",
      "Filings (JSON)", "Documents (JSON)"
    ];

    const rows = companies.map(company => [
      escapeField(company.id),
      escapeField(company.name),
      escapeField(company.number),
      escapeField(company.address),
      escapeField(company.incorporationDate),
      escapeField(company.industryCode),
      escapeField(company.internalCode),
      escapeField(company.utr),
      escapeField(company.governmentGateway),
      escapeField(company.ownerName),
      escapeField(JSON.stringify(company.ownerEmails || [])),
      escapeField(JSON.stringify(company.ownerPhones || [])),
      escapeField(company.companiesHouseLink),
      escapeField(company.googleDriveLink),
      escapeField(company.vendorName),
      escapeField(company.renewalDate),
      escapeField(company.hasRenewalFees),
      escapeField(company.renewalFees),
      escapeField(company.authCode),
      escapeField(company.pscLink),
      escapeField(company.shareholders),
      escapeField(company.shareholdersLink),
      escapeField(company.directorLink),
      escapeField(company.isActive),
      escapeField(company.sl),
      escapeField(company.slLicenseIssued),
      escapeField(company.slLicenseNumber),
      escapeField(company.slLicenseIssueDate),
      escapeField(company.slPayeReference),
      escapeField(company.slWorkAddress),
      escapeField(JSON.stringify(company.slLevel1Users || [])),
      escapeField(company.slDefinedCOS),
      escapeField(company.slUndefinedCOS),
      escapeField(company.companyStatus),
      escapeField(company.companyType),
      escapeField(company.jurisdiction),
      escapeField(company.hasCharges),
      escapeField(company.hasInsolvency),
      escapeField(company.confirmationStatementDue),
      escapeField(company.accountsDue),
      escapeField(company.lastAccountsDate),
      escapeField(company.confirmationStatementLastMade),
      escapeField(company.lastSyncDate),
      escapeField(company.syncStatus),
      escapeField(JSON.stringify(company.activityLog || [])),
      escapeField(JSON.stringify(company.directors || [])),
      escapeField(JSON.stringify(company.officers || [])),
      escapeField(JSON.stringify(company.pscs || [])),
      escapeField(JSON.stringify(company.previousNames || [])),
      escapeField(JSON.stringify(company.charges || [])),
      escapeField(JSON.stringify(company.insolvencyHistory || [])),
      escapeField(JSON.stringify(company.filings || [])),
      escapeField(JSON.stringify(company.documents || [])),
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
  },

  generateCompanyTasksCSV(tasks: any[]): string {
    const headers = [
      "Task ID", "Company ID", "Company Name", "Task Title", "Description",
      "Due Date", "Status", "Unique Key", "Renewal Date", "Created At",
      "Reviewed", "Reviewed At", "Reviewer Note"
    ];

    const rows = tasks.map(task => [
      escapeField(task.id),
      escapeField(task.companyId),
      escapeField(task.companyName),
      escapeField(task.title),
      escapeField(task.description),
      escapeField(task.dueAt),
      escapeField(task.status),
      escapeField(task.uniqueKey),
      escapeField(task.renewalDate),
      escapeField(task.createdAt),
      escapeField(task.reviewed),
      escapeField(task.reviewedAt),
      escapeField(task.reviewerNote),
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
  },

  generateSLPrepTasksCSV(tasks: any[]): string {
    const headers = ["Task ID", "Task Name", "Order", "Created At"];

    const rows = tasks.map(task => [
      escapeField(task.id),
      escapeField(task.name),
      escapeField(task.order),
      escapeField(task.createdAt),
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
  },

  generateHRTaskTemplatesCSV(templates: any[]): string {
    const headers = ["Task Name", "Description", "Recurrence", "Due Date Offset Days", "Priority"];

    const rows = templates.map(template => [
      escapeField(template.name),
      escapeField(template.description),
      escapeField(template.recurrence),
      escapeField(template.dueDateOffsetDays),
      escapeField(template.priority),
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
  },

  generateResidencyTaskTemplatesCSV(templates: any[]): string {
    const headers = ["Task Name", "Description", "Recurrence", "Start Date Mode", "Start Date", "Offset Days", "Priority"];

    const rows = templates.map(template => [
      escapeField(template.name),
      escapeField(template.description),
      escapeField(template.recurrence),
      escapeField(template.startDateMode),
      escapeField(template.startDate),
      escapeField(template.offsetDays),
      escapeField(template.priority),
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
  },

  generateEmployeesCSV(employees: any[]): string {
    const getCompanyName = (companyId: string) => {
      const companies = localStorageService.getCompanies();
      const company = companies.find(c => c.id === companyId);
      return company?.name || "";
    };

    const headers = [
      "Employee ID", "First Name", "Middle Names", "Last Name", "Date of Birth",
      "Personal Mobile", "Personal Email", "UK Address", "UK Address Provide Later",
      "Overseas Address", "UK Bank Address", "UK Bank Address Provide Later",
      "Emergency Contact Name", "Emergency Contact Relationship", "Emergency Contact Phone",
      "Company ID", "Company Name", "Department", "Work Location", "Work Location Source",
      "Line Manager", "Job Title", "Job Description", "Contract Type", "Start Date",
      "End Date", "Weekly Hours", "Break Minutes", "Salary", "Vacation Days", "Hourly Rate", "PAYE Reference",
      "National Insurance", "National Insurance Provide Later", "Google Drive Link",
      "Nationality", "Immigration Status", "Is Sponsored", "Passport Number",
      "Passport Expiry", "BRP Share Code", "Visa Type", "COS Number",
      "Sponsor License Number", "Visa Issue Date", "Visa Expiry Date", "RTW Basis",
      "RTW Check Date", "RTW Evidence Type", "RTW Expiry Date Mode", "RTW Expiry Date",
      "RTW Expiry Indefinite", "RTW Share Code", "Doc Passport Copy", "Doc Graduation Cert Copy",
      "Doc Proof of Address Copy", "Doc RTW Copy", "Doc COS Copy", "Doc Visa Copy",
      "Probation Period (Months)", "Probation End Date", "Status", "UKVI Reporting Notes",
      "Is Residency Service", "Residency Status", "Residency Log (JSON)", "Documents (JSON)",
      "Generated Task IDs (JSON)", "Form Data (JSON)", "Activity Log (JSON)",
      "Template ID", "Template Version", "Created At", "Updated At"
    ];

    const rows = employees.map(emp => [
      escapeField(emp.id),
      escapeField(emp.firstName),
      escapeField(emp.middleNames),
      escapeField(emp.lastName),
      escapeField(emp.dateOfBirth),
      escapeField(emp.personalMobile),
      escapeField(emp.personalEmail),
      escapeField(emp.ukAddress),
      escapeField(emp.ukAddressProvideLater),
      escapeField(emp.overseasAddress),
      escapeField(emp.ukBankAddress),
      escapeField(emp.ukBankAddressProvideLater),
      escapeField(emp.emergencyContactName),
      escapeField(emp.emergencyContactRelationship),
      escapeField(emp.emergencyContactPhone),
      escapeField(emp.companyId),
      escapeField(getCompanyName(emp.companyId)),
      escapeField(emp.department),
      escapeField(emp.workLocation),
      escapeField(emp.workLocationSource),
      escapeField(emp.lineManager),
      escapeField(emp.jobTitle),
      escapeField(emp.jobDescription),
      escapeField(emp.contractType),
      escapeField(emp.startDate),
      escapeField(emp.endDate),
      escapeField(emp.weeklyHours),
      escapeField(emp.breakMinutes),
      escapeField(emp.salary),
      escapeField(emp.vacationDays),
      escapeField(emp.hourlyRate),
      escapeField(emp.payeReference),
      escapeField(emp.nationalInsurance),
      escapeField(emp.nationalInsuranceProvideLater),
      escapeField(emp.googleDriveLink),
      escapeField(emp.nationality),
      escapeField(emp.immigrationStatus),
      escapeField(emp.isSponsored),
      escapeField(emp.passportNumber),
      escapeField(emp.passportExpiry),
      escapeField(emp.brpShareCode),
      escapeField(emp.visaType),
      escapeField(emp.cosNumber),
      escapeField(emp.sponsorLicenseNumber),
      escapeField(emp.visaIssueDate),
      escapeField(emp.visaExpiryDate),
      escapeField(emp.rtwBasis),
      escapeField(emp.rtwCheckDate),
      escapeField(emp.rtwEvidenceType),
      escapeField(emp.rtwExpiryDateMode),
      escapeField(emp.rtwExpiryDate),
      escapeField(emp.rtwExpiryIndefinite),
      escapeField(emp.rtwShareCode),
      escapeField(emp.docPassportCopy),
      escapeField(emp.docGraduationCertCopy),
      escapeField(emp.docProofOfAddressCopy),
      escapeField(emp.docRtwCopy),
      escapeField(emp.docCosCopy),
      escapeField(emp.docVisaCopy),
      escapeField(emp.probationPeriod),
      escapeField(emp.probationEndDate),
      escapeField(emp.status),
      escapeField(emp.ukviReportingNotes),
      escapeField(emp.isResidencyService),
      escapeField(emp.residencyStatus),
      escapeField(JSON.stringify(emp.residencyLog || [])),
      escapeField(JSON.stringify(emp.documents || [])),
      escapeField(JSON.stringify(emp.generatedTaskIds || [])),
      escapeField(JSON.stringify(emp.formData || {})),
      escapeField(JSON.stringify(emp.activityLog || [])),
      escapeField(emp.templateId),
      escapeField(emp.templateVersion),
      escapeField(emp.createdAt),
      escapeField(emp.updatedAt),
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
  },

  generateEmployeeTasksCSV(tasks: any[]): string {
    const headers = [
      "Task ID", "Employee ID", "Employee Name", "Company ID", "Company Name",
      "Task Title", "Description", "Due Date", "Status", "Task Type",
      "Source Field", "Created At", "Meta (JSON)"
    ];

    const rows = tasks.map(task => [
      escapeField(task.id),
      escapeField(task.employeeId),
      escapeField(task.employeeName),
      escapeField(task.companyId),
      escapeField(task.companyName),
      escapeField(task.title),
      escapeField(task.description),
      escapeField(task.dueAt),
      escapeField(task.status),
      escapeField(task.taskType),
      escapeField(task.sourceField),
      escapeField(task.createdAt),
      escapeField(JSON.stringify(task.meta || {})),
    ].join(","));

    return [headers.join(","), ...rows].join("\n");
  },
};
