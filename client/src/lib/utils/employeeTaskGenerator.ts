import { DateTime } from "luxon";
import type { EmployeeRecord, EmployeeTask, HRTaskTemplate, ResidencyTaskTemplate, LeaverTaskTemplate } from "@shared/schema";
import { localStorageService } from "../localStorage";

const UK_TIMEZONE = "Europe/London";

interface TaskGenerationResult {
  generatedTasks: EmployeeTask[];
  skippedDuplicates: number;
}

export function generateEmployeeTasks(employee: EmployeeRecord, existingTasks: EmployeeTask[] = []): TaskGenerationResult {
  const generatedTasks: EmployeeTask[] = [];
  let skippedDuplicates = 0;
  
  const now = DateTime.now().setZone(UK_TIMEZONE);
  const baseTask = {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    companyId: employee.companyId,
    companyName: employee.companyName,
    status: "open" as const,
    meta: {},
    reviewed: false,
    createdAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
    updatedAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
  };

  // Helper to check if task already exists
  const taskExists = (uniqueKey: string) => existingTasks.some(t => t.uniqueKey === uniqueKey);

  // Task 1: Provide UK Address (if provideLater is set and not "providing_now")
  if (employee.ukAddressProvideLater && employee.ukAddressProvideLater !== "providing_now") {
    const dueDate = calculateDueDate(employee.ukAddressProvideLater);
    const uniqueKey = `employee-${employee.id}-provide-uk-address`;
    
    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Provide UK Address",
        description: `Employee needs to provide their UK address (scheduled for ${employee.ukAddressProvideLater.replace('_', ' ')})`,
        taskType: "provide_uk_address",
        dueAt: dueDate,
        priority: "medium",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 2: Provide UK Bank Address (if provideLater is set and not "providing_now")
  if (employee.ukBankAddressProvideLater && employee.ukBankAddressProvideLater !== "providing_now") {
    const dueDate = calculateDueDate(employee.ukBankAddressProvideLater);
    const uniqueKey = `employee-${employee.id}-provide-uk-bank-address`;
    
    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Provide UK Bank Address",
        description: `Employee needs to provide their UK bank address (scheduled for ${employee.ukBankAddressProvideLater.replace('_', ' ')})`,
        taskType: "provide_uk_bank_address",
        dueAt: dueDate,
        priority: "medium",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 3: Provide National Insurance Number (if provideLater is set and not "providing_now")
  if (employee.nationalInsuranceProvideLater && employee.nationalInsuranceProvideLater !== "providing_now") {
    const dueDate = calculateDueDate(employee.nationalInsuranceProvideLater);
    const uniqueKey = `employee-${employee.id}-provide-national-insurance`;
    
    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Provide National Insurance Number",
        description: `Employee needs to provide their National Insurance Number (scheduled for ${employee.nationalInsuranceProvideLater.replace('_', ' ')})`,
        taskType: "provide_national_insurance",
        dueAt: dueDate,
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 4: RTW Expiry Check (if expiry date exists and not indefinite)
  // Always create this task immediately so it's visible in Employee Tasks
  if (employee.rtwExpiryDate && !employee.rtwExpiryIndefinite) {
    const expiryDate = DateTime.fromISO(employee.rtwExpiryDate, { zone: UK_TIMEZONE });
    const now = DateTime.now().setZone(UK_TIMEZONE);
    const reminderDate = expiryDate.minus({ days: 30 }); // 30 days before expiry
    
    // Use reminder date if in future, otherwise use actual expiry date
    const dueDate = reminderDate > now ? reminderDate : expiryDate;
    const uniqueKey = `employee-${employee.id}-rtw-expiry-${employee.rtwExpiryDate}`;
    
    if (!taskExists(uniqueKey)) {
      const daysUntilExpiry = Math.floor(expiryDate.diff(now, 'days').days);
      const isOverdue = daysUntilExpiry < 0;
      const isPastReminder = daysUntilExpiry <= 30;
      
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: isOverdue ? "RTW EXPIRED - Urgent Action Required" : "RTW Expiry Check",
        description: isOverdue 
          ? `CRITICAL: Employee's Right to Work EXPIRED on ${expiryDate.toFormat('dd/MM/yyyy')}. Immediate action required.`
          : isPastReminder
          ? `Employee's Right to Work expires on ${expiryDate.toFormat('dd/MM/yyyy')} (${daysUntilExpiry} days). Follow up to ensure renewal/extension.`
          : `Employee's Right to Work expires on ${expiryDate.toFormat('dd/MM/yyyy')}. Monitor and prepare for renewal.`,
        taskType: "rtw_expiry",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: isOverdue ? "urgent" : isPastReminder ? "urgent" : "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 5: Visa Expiry Reminder (if visa expiry exists)
  if (employee.visaExpiryDate) {
    const expiryDate = DateTime.fromISO(employee.visaExpiryDate, { zone: UK_TIMEZONE });
    const reminderDate = expiryDate.minus({ days: 60 }); // 60 days before expiry
    const uniqueKey = `employee-${employee.id}-visa-expiry-${employee.visaExpiryDate}`;
    
    if (!taskExists(uniqueKey) && reminderDate > DateTime.now().setZone(UK_TIMEZONE)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Visa Expiry Reminder",
        description: `Employee's visa expires on ${expiryDate.toFormat('dd/MM/yyyy')}. Coordinate renewal or extension.`,
        taskType: "visa_expiry",
        dueAt: reminderDate.toISO() || reminderDate.toUTC().toISO() || new Date().toISOString(),
        priority: "urgent",
        uniqueKey,
      });
    } else if (taskExists(uniqueKey)) {
      skippedDuplicates++;
    }
  }

  // Task 6: Probation Review (based on start date + probation period)
  if (employee.startDate && employee.probationPeriod) {
    // Parse date-only string as local date in UK timezone and set time to noon to avoid timezone boundary issues
    const startDate = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
    const probationEndDate = startDate.plus({ months: employee.probationPeriod });
    const reviewDate = probationEndDate.minus({ days: 7 }); // 1 week before end
    const uniqueKey = `employee-${employee.id}-probation-review`;
    
    if (!taskExists(uniqueKey) && reviewDate > DateTime.now().setZone(UK_TIMEZONE)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Probation Review",
        description: `Employee's probation period ends on ${probationEndDate.toFormat('dd/MM/yyyy')}. Schedule review meeting.`,
        taskType: "probation_review",
        dueAt: reviewDate.toISO() || reviewDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else if (taskExists(uniqueKey)) {
      skippedDuplicates++;
    }
  }

  // Task 7: Passport Expiry Reminder (if passport expiry exists)
  if (employee.passportExpiry) {
    const expiryDate = DateTime.fromISO(employee.passportExpiry, { zone: UK_TIMEZONE });
    const reminderDate = expiryDate.minus({ months: 6 }); // 6 months before expiry
    const uniqueKey = `employee-${employee.id}-passport-expiry-${employee.passportExpiry}`;
    
    if (!taskExists(uniqueKey) && reminderDate > DateTime.now().setZone(UK_TIMEZONE)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Passport Expiry Reminder",
        description: `Employee's passport expires on ${expiryDate.toFormat('dd/MM/yyyy')}. Request updated copy.`,
        taskType: "passport_expiry",
        dueAt: reminderDate.toISO() || reminderDate.toUTC().toISO() || new Date().toISOString(),
        priority: "medium",
        uniqueKey,
      });
    } else if (taskExists(uniqueKey)) {
      skippedDuplicates++;
    }
  }

  // Task 8: Keep Copy of Renewed Passport (on expiry date)
  if (employee.passportExpiry) {
    const expiryDate = DateTime.fromISO(employee.passportExpiry, { zone: UK_TIMEZONE });
    const uniqueKey = `employee-${employee.id}-keep-passport-copy-${employee.passportExpiry}`;
    
    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Keep Copy of Renewed Passport",
        description: `Passport expires ${expiryDate.toFormat('dd/MM/yyyy')}. Once renewed, obtain and file a copy of the new passport.`,
        taskType: "keep_passport_copy",
        dueAt: expiryDate.toISO() || expiryDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 9: Keep Copy of Renewed Visa (on expiry date)
  if (employee.visaExpiryDate) {
    const expiryDate = DateTime.fromISO(employee.visaExpiryDate, { zone: UK_TIMEZONE });
    const uniqueKey = `employee-${employee.id}-keep-visa-copy-${employee.visaExpiryDate}`;
    
    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Keep Copy of Renewed Visa",
        description: `Visa expires ${expiryDate.toFormat('dd/MM/yyyy')}. Once renewed, obtain and file a copy of the new visa.`,
        taskType: "keep_visa_copy",
        dueAt: expiryDate.toISO() || expiryDate.toUTC().toISO() || new Date().toISOString(),
        priority: "urgent",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 10: Keep Copy of Renewed RTW Document (on expiry date)
  if (employee.rtwExpiryDate && !employee.rtwExpiryIndefinite) {
    const expiryDate = DateTime.fromISO(employee.rtwExpiryDate, { zone: UK_TIMEZONE });
    const uniqueKey = `employee-${employee.id}-keep-rtw-copy-${employee.rtwExpiryDate}`;
    
    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Keep Copy of Renewed RTW Document",
        description: `Right to Work expires ${expiryDate.toFormat('dd/MM/yyyy')}. Once renewed, obtain and file a copy of the new RTW document.`,
        taskType: "keep_rtw_copy",
        dueAt: expiryDate.toISO() || expiryDate.toUTC().toISO() || new Date().toISOString(),
        priority: "urgent",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 11: Keep Copy of Visa (one-time, 3 days after start)
  if (employee.visaExpiryDate || employee.visaType) {
    const startDate = employee.startDate
      ? DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12 })
      : now;
    const dueDate = startDate.plus({ days: 3 });
    const uniqueKey = `employee-${employee.id}-keep-visa-copy`;

    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Keep Copy of Visa",
        description: `Obtain and file a copy of the employee's visa document for records.`,
        taskType: "keep_visa_copy",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 12: First Month Pension Enrollment
  if (employee.startDate) {
    const startDate = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12 });
    const dueDate = startDate.plus({ days: 30 });
    const uniqueKey = `employee-${employee.id}-first-month-pension`;

    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "First Month Pension Enrollment",
        description: `Enroll the employee in the company pension scheme during their first month of employment.`,
        taskType: "hr_template",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 13: Record Tax Code (one-time, 14 days after start)
  if (employee.startDate) {
    const startDate = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12 });
    const dueDate = startDate.plus({ days: 14 });
    const uniqueKey = `employee-${employee.id}-record-tax-code`;

    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Record Tax Code",
        description: `Record and verify the employee's tax code from HMRC.`,
        taskType: "hr_template",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: "medium",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 14: Setup Recurring Salary Payment (one-time, 7 days after start)
  if (employee.startDate) {
    const startDate = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12 });
    const dueDate = startDate.plus({ days: 7 });
    const uniqueKey = `employee-${employee.id}-setup-salary`;

    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Setup Recurring Salary Payment",
        description: `Set up recurring salary payment for the employee in the payroll system.`,
        taskType: "hr_template",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 15: First Manual COS Review (if sponsored, 14 days after start)
  if (employee.isSponsored && employee.cosNumber) {
    const startDate = employee.startDate
      ? DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12 })
      : now;
    const dueDate = startDate.plus({ days: 14 });
    const uniqueKey = `employee-${employee.id}-first-cos-review`;

    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "First Manual COS Review",
        description: `Perform first manual review of Certificate of Sponsorship (${employee.cosNumber}) against the system records.`,
        taskType: "hr_template",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 16: Second Manual COS Review (if sponsored, 30 days after start)
  if (employee.isSponsored && employee.cosNumber) {
    const startDate = employee.startDate
      ? DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12 })
      : now;
    const dueDate = startDate.plus({ days: 30 });
    const uniqueKey = `employee-${employee.id}-second-cos-review`;

    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Second Manual COS Review",
        description: `Perform second manual review of Certificate of Sponsorship (${employee.cosNumber}) against the system records.`,
        taskType: "hr_template",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 17: First Month Pension Proof (one-time, 35 days after start)
  if (employee.startDate) {
    const startDate = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12 });
    const dueDate = startDate.plus({ days: 35 });
    const uniqueKey = `employee-${employee.id}-pension-proof`;

    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "First Month Pension Proof",
        description: `Obtain proof of pension enrollment from the first month of employment.`,
        taskType: "hr_template",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 18: Inform Home Office if Sponsored Employee Leaves (leaver + sponsored)
  if (employee.status === "leaver" && employee.isSponsored) {
    const leaveDate = employee.leaverDate
      ? DateTime.fromISO(employee.leaverDate, { zone: UK_TIMEZONE })
      : now;
    const dueDate = leaveDate.plus({ days: 10 }); // Must report within 10 days
    const uniqueKey = `employee-${employee.id}-inform-home-office`;

    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "URGENT: Inform Home Office (10 Day Deadline)",
        description: `CRITICAL: Employee holds a Certificate of Sponsorship. The Home Office must be notified within 10 days of departure. Failure may affect your sponsor licence.`,
        taskType: "residency_template",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: "urgent",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  // Task 19: Keep Copy of Renewed Contract (on contract end date for fixed-term contracts)
  if (employee.contractType === "fixed_term" && employee.endDate) {
    const endDate = DateTime.fromISO(employee.endDate, { zone: UK_TIMEZONE });
    const uniqueKey = `employee-${employee.id}-keep-contract-copy-${employee.endDate}`;
    
    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: "Keep Copy of Renewed Contract",
        description: `Fixed-term contract ends ${endDate.toFormat('dd/MM/yyyy')}. If renewed, obtain and file a copy of the new contract.`,
        taskType: "keep_contract_copy",
        dueAt: endDate.toISO() || endDate.toUTC().toISO() || new Date().toISOString(),
        priority: "high",
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  }

  return {
    generatedTasks,
    skippedDuplicates,
  };
}

function calculateDueDate(provideLater: string): string {
  const now = DateTime.now().setZone(UK_TIMEZONE);
  
  let dueDate: DateTime;
  switch (provideLater) {
    case "1_week":
      dueDate = now.plus({ weeks: 1 });
      break;
    case "2_weeks":
      dueDate = now.plus({ weeks: 2 });
      break;
    case "3_weeks":
      dueDate = now.plus({ weeks: 3 });
      break;
    case "4_weeks":
      dueDate = now.plus({ weeks: 4 });
      break;
    case "5_weeks":
      dueDate = now.plus({ weeks: 5 });
      break;
    case "6_weeks":
      dueDate = now.plus({ weeks: 6 });
      break;
    default:
      dueDate = now.plus({ weeks: 1 });
  }
  
  return dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString();
}

export async function saveGeneratedTasks(employee: EmployeeRecord, tasks: EmployeeTask[]): Promise<void> {
  // Save tasks to database in parallel
  const taskPromises = tasks.map(async (task) => {
    const response = await fetch("/api/employee-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(task),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to save employee task "${task.title}": ${error}`);
    }
    
    return task.id;
  });
  
  // Wait for all tasks to be saved, will throw if any fail
  await Promise.all(taskPromises);
  
  // Update employee record with generated task IDs
  const taskIds = tasks.map(t => t.id);
  const response = await fetch(`/api/employees/${employee.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      generatedTaskIds: [...(employee.generatedTaskIds || []), ...taskIds],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update employee with generated task IDs: ${error}`);
  }
}

/**
 * Generate employee tasks from HR task templates
 * Handles one-time, monthly, and annual recurrence
 */
export function generateHRTemplateTasks(employee: EmployeeRecord, existingTasks: EmployeeTask[] = []): TaskGenerationResult {
  const generatedTasks: EmployeeTask[] = [];
  let skippedDuplicates = 0;
  
  const now = DateTime.now().setZone(UK_TIMEZONE);
  const baseTask = {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    companyId: employee.companyId,
    companyName: employee.companyName,
    status: "open" as const,
    meta: {},
    reviewed: false,
    createdAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
    updatedAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
  };

  // Helper to check if task already exists
  const taskExists = (uniqueKey: string) => existingTasks.some(t => t.uniqueKey === uniqueKey);

  // Get all HR task templates (still from localStorage for now - Phase 2 will migrate these)
  const templates = localStorageService.getHRTaskTemplates();

  templates.forEach((template: HRTaskTemplate) => {
    const tasks = generateTasksFromTemplate(employee, template, baseTask, now);
    
    tasks.forEach(task => {
      if (task.uniqueKey && !taskExists(task.uniqueKey)) {
        generatedTasks.push(task);
      } else if (task.uniqueKey) {
        skippedDuplicates++;
      }
    });
  });

  return {
    generatedTasks,
    skippedDuplicates,
  };
}

/**
 * Generate task(s) from a single HR template based on recurrence type
 */
function generateTasksFromTemplate(
  employee: EmployeeRecord,
  template: HRTaskTemplate,
  baseTask: Partial<EmployeeTask>,
  now: DateTime
): EmployeeTask[] {
  const tasks: EmployeeTask[] = [];
  
  // Calculate base due date from employee start date + offset days
  // Parse date-only string as local date in UK timezone and set time to noon to avoid timezone boundary issues
  const startDate = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
  const baseDueDate = startDate.plus({ days: template.dueDateOffsetDays });

  // Safeguard: if the base due date is before the employee start date, skip task generation
  // This should not happen with proper validation, but provides defense in depth
  if (baseDueDate < startDate) {
    console.warn(`HR template ${template.id} has invalid offset that would create tasks before employee ${employee.id} start date. Skipping.`);
    return tasks;
  }

  switch (template.recurrence) {
    case "one_time": {
      // Generate a single task for this employee
      const uniqueKey = `hr-template-${template.id}-employee-${employee.id}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: template.name,
        description: template.description || `HR Task: ${template.name}`,
        taskType: "hr_template",
        dueAt: baseDueDate.toISO() || baseDueDate.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey,
      } as EmployeeTask);
      break;
    }

    case "monthly": {
      // Generate monthly recurring tasks
      // Calculate how many months have passed since the base due date
      const monthsSinceStart = Math.floor(now.diff(baseDueDate, 'months').months);
      
      // Generate task for current period
      const currentPeriodDue = baseDueDate.plus({ months: Math.max(0, monthsSinceStart) });
      const currentYear = currentPeriodDue.year;
      const currentMonth = currentPeriodDue.month;
      const currentUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${currentYear}-${currentMonth}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (${currentPeriodDue.toFormat('MMMM yyyy')})`,
        description: template.description || `Monthly HR Task: ${template.name}`,
        taskType: "hr_template_monthly",
        dueAt: currentPeriodDue.toISO() || currentPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: currentUniqueKey,
      } as EmployeeTask);
      
      // Generate task for next period
      const nextPeriodDue = baseDueDate.plus({ months: Math.max(0, monthsSinceStart) + 1 });
      const nextYear = nextPeriodDue.year;
      const nextMonth = nextPeriodDue.month;
      const nextUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${nextYear}-${nextMonth}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (${nextPeriodDue.toFormat('MMMM yyyy')})`,
        description: template.description || `Monthly HR Task: ${template.name}`,
        taskType: "hr_template_monthly",
        dueAt: nextPeriodDue.toISO() || nextPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: nextUniqueKey,
      } as EmployeeTask);
      break;
    }

    case "annual": {
      // Generate annual recurring tasks
      // Calculate how many years have passed since the base due date
      const yearsSinceStart = Math.floor(now.diff(baseDueDate, 'years').years);
      
      // Generate task for current period
      const currentPeriodDue = baseDueDate.plus({ years: Math.max(0, yearsSinceStart) });
      const currentYear = currentPeriodDue.year;
      const currentUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${currentYear}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (${currentYear})`,
        description: template.description || `Annual HR Task: ${template.name}`,
        taskType: "hr_template_annual",
        dueAt: currentPeriodDue.toISO() || currentPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: currentUniqueKey,
      } as EmployeeTask);
      
      // Generate task for next period
      const nextPeriodDue = baseDueDate.plus({ years: Math.max(0, yearsSinceStart) + 1 });
      const nextYear = nextPeriodDue.year;
      const nextUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${nextYear}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (${nextYear})`,
        description: template.description || `Annual HR Task: ${template.name}`,
        taskType: "hr_template_annual",
        dueAt: nextPeriodDue.toISO() || nextPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: nextUniqueKey,
      } as EmployeeTask);
      break;
    }
  }

  return tasks;
}

/**
 * Generate employee tasks from Residency task templates
 * Only applies to employees with residency service enabled
 * Handles one-time, weekly, monthly, quarterly, and annual recurrence
 * Also generates tasks for dependants when template is marked as "main_and_dependants"
 */
export function generateResidencyTemplateTasks(employee: EmployeeRecord): TaskGenerationResult {
  const generatedTasks: EmployeeTask[] = [];
  let skippedDuplicates = 0;
  
  // Only generate residency tasks for employees with residency service
  if (!employee.isResidencyService) {
    return { generatedTasks, skippedDuplicates };
  }
  
  const now = DateTime.now().setZone(UK_TIMEZONE);
  const baseTask = {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    companyId: employee.companyId,
    companyName: employee.companyName,
    status: "open" as const,
    meta: {},
    reviewed: false,
    createdAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
    updatedAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
  };

  // Get all Residency task templates
  const templates = localStorageService.getResidencyTaskTemplates();
  
  // Get dependants for this employee
  const dependants = localStorageService.getDependantsByEmployee(employee.id);

  templates.forEach((template: ResidencyTaskTemplate) => {
    // Generate tasks for main employee
    const mainEmployeeTasks = generateTasksFromResidencyTemplate(employee, template, baseTask, now, "employee");
    
    mainEmployeeTasks.forEach(task => {
      if (task.uniqueKey && !localStorageService.getEmployeeTaskByUniqueKey(task.uniqueKey)) {
        generatedTasks.push(task);
      } else if (task.uniqueKey) {
        skippedDuplicates++;
      }
    });
    
    // Generate tasks for dependants if template applies to them
    if (template.applicantType === "main_and_dependants" && dependants.length > 0) {
      dependants.forEach(dependant => {
        const dependantBaseTask = {
          ...baseTask,
          meta: {
            dependantId: dependant.id,
            dependantName: `${dependant.firstName} ${dependant.middleName ? dependant.middleName + ' ' : ''}${dependant.lastName}`,
            relationship: dependant.relationship,
          },
        };
        
        const dependantTasks = generateTasksFromResidencyTemplate(
          employee, 
          template, 
          dependantBaseTask, 
          now, 
          "dependant",
          dependant.id
        );
        
        dependantTasks.forEach(task => {
          if (task.uniqueKey && !localStorageService.getEmployeeTaskByUniqueKey(task.uniqueKey)) {
            generatedTasks.push(task);
          } else if (task.uniqueKey) {
            skippedDuplicates++;
          }
        });
      });
    }
  });

  return {
    generatedTasks,
    skippedDuplicates,
  };
}

/**
 * Generate task(s) from a single Residency template based on recurrence type
 */
function generateTasksFromResidencyTemplate(
  employee: EmployeeRecord,
  template: ResidencyTaskTemplate,
  baseTask: Partial<EmployeeTask>,
  now: DateTime,
  applicantType: "employee" | "dependant" = "employee",
  dependantId?: string
): EmployeeTask[] {
  const tasks: EmployeeTask[] = [];
  
  // Calculate base start date based on template mode
  let baseStartDate: DateTime;
  
  if (template.startDateMode === "manual") {
    if (!template.startDate) {
      console.warn(`Residency template ${template.id} has manual mode but no start date set. Skipping.`);
      return tasks;
    }
    baseStartDate = DateTime.fromISO(template.startDate, { zone: UK_TIMEZONE });
  } else {
    // offset_days mode - calculate from employee's startDate
    if (!employee.startDate) {
      console.warn(`Employee ${employee.id} has no start date. Cannot generate residency tasks with offset mode.`);
      return tasks;
    }
    const employeeStart = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
    baseStartDate = employeeStart.plus({ days: template.offsetDays || 0 });
  }

  switch (template.recurrence) {
    case "one_time": {
      // Generate a single task for this employee or dependant
      const uniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}`
        : `residency-template-${template.id}-employee-${employee.id}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: template.name,
        description: template.description || `Residency Task: ${template.name}`,
        taskType: "residency_template",
        dueAt: baseStartDate.toISO() || baseStartDate.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence, // Store recurrence for UI to determine if due date can be modified
          templateId: template.id, // Store template ID for future reference
        },
      } as EmployeeTask);
      break;
    }

    case "weekly": {
      // Generate weekly recurring tasks
      const weeksSinceStart = Math.floor(now.diff(baseStartDate, 'weeks').weeks);
      
      // Generate task for current week
      const currentPeriodDue = baseStartDate.plus({ weeks: Math.max(0, weeksSinceStart) });
      const currentWeek = currentPeriodDue.weekNumber;
      const currentYear = currentPeriodDue.year;
      const currentUniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}-${currentYear}-week${currentWeek}`
        : `residency-template-${template.id}-employee-${employee.id}-${currentYear}-week${currentWeek}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (Week ${currentWeek}, ${currentYear})`,
        description: template.description || `Weekly Residency Task: ${template.name}`,
        taskType: "residency_template_weekly",
        dueAt: currentPeriodDue.toISO() || currentPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: currentUniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence,
          templateId: template.id,
        },
      } as EmployeeTask);
      
      // Generate task for next week
      const nextPeriodDue = baseStartDate.plus({ weeks: Math.max(0, weeksSinceStart) + 1 });
      const nextWeek = nextPeriodDue.weekNumber;
      const nextYear = nextPeriodDue.year;
      const nextUniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}-${nextYear}-week${nextWeek}`
        : `residency-template-${template.id}-employee-${employee.id}-${nextYear}-week${nextWeek}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (Week ${nextWeek}, ${nextYear})`,
        description: template.description || `Weekly Residency Task: ${template.name}`,
        taskType: "residency_template_weekly",
        dueAt: nextPeriodDue.toISO() || nextPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: nextUniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence,
          templateId: template.id,
        },
      } as EmployeeTask);
      break;
    }

    case "monthly": {
      // Generate monthly recurring tasks
      const monthsSinceStart = Math.floor(now.diff(baseStartDate, 'months').months);
      
      // Generate task for current period
      const currentPeriodDue = baseStartDate.plus({ months: Math.max(0, monthsSinceStart) });
      const currentYear = currentPeriodDue.year;
      const currentMonth = currentPeriodDue.month;
      const currentUniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}-${currentYear}-${currentMonth}`
        : `residency-template-${template.id}-employee-${employee.id}-${currentYear}-${currentMonth}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (${currentPeriodDue.toFormat('MMMM yyyy')})`,
        description: template.description || `Monthly Residency Task: ${template.name}`,
        taskType: "residency_template_monthly",
        dueAt: currentPeriodDue.toISO() || currentPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: currentUniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence,
          templateId: template.id,
        },
      } as EmployeeTask);
      
      // Generate task for next period
      const nextPeriodDue = baseStartDate.plus({ months: Math.max(0, monthsSinceStart) + 1 });
      const nextYear = nextPeriodDue.year;
      const nextMonth = nextPeriodDue.month;
      const nextUniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}-${nextYear}-${nextMonth}`
        : `residency-template-${template.id}-employee-${employee.id}-${nextYear}-${nextMonth}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (${nextPeriodDue.toFormat('MMMM yyyy')})`,
        description: template.description || `Monthly Residency Task: ${template.name}`,
        taskType: "residency_template_monthly",
        dueAt: nextPeriodDue.toISO() || nextPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: nextUniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence,
          templateId: template.id,
        },
      } as EmployeeTask);
      break;
    }

    case "quarterly": {
      // Generate quarterly recurring tasks (every 3 months)
      const monthsSinceStart = Math.floor(now.diff(baseStartDate, 'months').months);
      const quartersSinceStart = Math.floor(monthsSinceStart / 3);
      
      // Generate task for current quarter
      const currentPeriodDue = baseStartDate.plus({ months: Math.max(0, quartersSinceStart * 3) });
      const currentQuarter = Math.floor((currentPeriodDue.month - 1) / 3) + 1;
      const currentYear = currentPeriodDue.year;
      const currentUniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}-${currentYear}-Q${currentQuarter}`
        : `residency-template-${template.id}-employee-${employee.id}-${currentYear}-Q${currentQuarter}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (Q${currentQuarter} ${currentYear})`,
        description: template.description || `Quarterly Residency Task: ${template.name}`,
        taskType: "residency_template_quarterly",
        dueAt: currentPeriodDue.toISO() || currentPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: currentUniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence,
          templateId: template.id,
        },
      } as EmployeeTask);
      
      // Generate task for next quarter
      const nextPeriodDue = baseStartDate.plus({ months: Math.max(0, (quartersSinceStart + 1) * 3) });
      const nextQuarter = Math.floor((nextPeriodDue.month - 1) / 3) + 1;
      const nextYear = nextPeriodDue.year;
      const nextUniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}-${nextYear}-Q${nextQuarter}`
        : `residency-template-${template.id}-employee-${employee.id}-${nextYear}-Q${nextQuarter}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (Q${nextQuarter} ${nextYear})`,
        description: template.description || `Quarterly Residency Task: ${template.name}`,
        taskType: "residency_template_quarterly",
        dueAt: nextPeriodDue.toISO() || nextPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: nextUniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence,
          templateId: template.id,
        },
      } as EmployeeTask);
      break;
    }

    case "annually": {
      // Generate annual recurring tasks
      const yearsSinceStart = Math.floor(now.diff(baseStartDate, 'years').years);
      
      // Generate task for current period
      const currentPeriodDue = baseStartDate.plus({ years: Math.max(0, yearsSinceStart) });
      const currentYear = currentPeriodDue.year;
      const currentUniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}-${currentYear}`
        : `residency-template-${template.id}-employee-${employee.id}-${currentYear}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (${currentYear})`,
        description: template.description || `Annual Residency Task: ${template.name}`,
        taskType: "residency_template_annually",
        dueAt: currentPeriodDue.toISO() || currentPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: currentUniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence,
          templateId: template.id,
        },
      } as EmployeeTask);
      
      // Generate task for next period
      const nextPeriodDue = baseStartDate.plus({ years: Math.max(0, yearsSinceStart) + 1 });
      const nextYear = nextPeriodDue.year;
      const nextUniqueKey = applicantType === "dependant" && dependantId
        ? `residency-template-${template.id}-dependant-${dependantId}-${nextYear}`
        : `residency-template-${template.id}-employee-${employee.id}-${nextYear}`;
      
      tasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: `${template.name} (${nextYear})`,
        description: template.description || `Annual Residency Task: ${template.name}`,
        taskType: "residency_template_annually",
        dueAt: nextPeriodDue.toISO() || nextPeriodDue.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey: nextUniqueKey,
        meta: {
          ...baseTask.meta,
          recurrence: template.recurrence,
          templateId: template.id,
        },
      } as EmployeeTask);
      break;
    }
  }

  return tasks;
}

/**
 * Generate leaver tasks when an employee becomes a leaver
 * @param employee The employee record
 * @param existingTasks Existing tasks to check for duplicates
 * @param leaverTemplates Leaver task templates fetched from the API
 */
export function generateLeaverTasks(employee: EmployeeRecord, existingTasks: EmployeeTask[] = [], leaverTemplates: LeaverTaskTemplate[] = []): TaskGenerationResult {
  const generatedTasks: EmployeeTask[] = [];
  let skippedDuplicates = 0;

  const now = DateTime.now().setZone(UK_TIMEZONE);
  const baseTask = {
    employeeId: employee.id,
    employeeName: `${employee.firstName} ${employee.lastName}`,
    companyId: employee.companyId,
    companyName: employee.companyName,
    status: "open" as const,
    meta: {},
    reviewed: false,
    createdAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
    updatedAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
  };

  // Helper to check if task already exists
  const taskExists = (uniqueKey: string) => existingTasks.some(t => t.uniqueKey === uniqueKey);

  // Use leaver task templates passed in (fetched from API)
  const templates = leaverTemplates;

  templates.forEach((template: LeaverTaskTemplate) => {
    // Calculate due date: current date + dueDays from template
    const dueDate = now.plus({ days: template.dueDays });
    
    // Create unique key to prevent duplicate generation
    const uniqueKey = `leaver-template-${template.id}-employee-${employee.id}`;
    
    // Only create task if it doesn't already exist
    if (!taskExists(uniqueKey)) {
      generatedTasks.push({
        ...baseTask,
        id: crypto.randomUUID(),
        title: template.name,
        description: template.description || `Leaver Task: ${template.name}`,
        taskType: "leaver_task",
        dueAt: dueDate.toISO() || dueDate.toUTC().toISO() || new Date().toISOString(),
        priority: template.priority,
        uniqueKey,
      });
    } else {
      skippedDuplicates++;
    }
  });

  return {
    generatedTasks,
    skippedDuplicates,
  };
}
