import { DateTime } from "luxon";
import type { Company, Task, InsertTask } from "@shared/schema";

export interface TaskDates {
  fees: DateTime;
  cs: DateTime;
  prep: DateTime;
  submit: DateTime;
  hmrc: DateTime;
}

export interface TaskDefinition {
  type: string;
  title: string;
  description: string;
  dueAt: DateTime;
  kind: "pre" | "post";
  requiresFees?: boolean;
  actualDueAt?: DateTime; // For tasks with advance due dates (e.g., CS tasks 15 days early)
}

/**
 * Parse renewal date - supports both DD/MM/YYYY and ISO formats
 * Returns invalid DateTime if parsing fails
 */
export function parseRenewalDate(renewalDate: string): DateTime {
  let dt = DateTime.fromISO(renewalDate, { zone: "Europe/London" });
  
  if (!dt.isValid) {
    dt = DateTime.fromFormat(renewalDate, "dd/MM/yyyy", { zone: "Europe/London" });
  }
  
  if (!dt.isValid && typeof window !== 'undefined') {
    console.error(`[Task Generator] Invalid renewal date format: "${renewalDate}"`);
  }
  
  return dt;
}

/**
 * Compute all task due dates relative to renewal_date
 * Uses Europe/London timezone as per UK company requirements
 * @param renewalDate - Base renewal date
 * @param confirmationStatementDue - Optional actual CS due date from Companies House
 */
export function computeTaskDates(renewalDate: string, confirmationStatementDue?: string | null): TaskDates {
  const base = parseRenewalDate(renewalDate);
  
  // Use actual Companies House CS due date if available, otherwise calculate
  let csDate: DateTime;
  if (confirmationStatementDue) {
    csDate = DateTime.fromISO(confirmationStatementDue, { zone: "Europe/London" });
    if (!csDate.isValid) {
      // Fallback to calculated date if parsing fails
      csDate = base.minus({ months: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    } else {
      // Set to 9 AM on the due date
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
    hmrc: base.plus({ weeks: 6 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
  };
}

/**
 * Determine if a task should be created based on its due date and type
 * - Pre-renewal tasks: if in the future OR overdue but within last 90 days (still relevant)
 * - Post-renewal tasks: if within last 30 days or future
 */
export function shouldCreateTask(date: DateTime, kind: "pre" | "post"): boolean {
  const now = DateTime.now().setZone("Europe/London");
  
  if (kind === "pre") {
    // Allow overdue pre-renewal tasks if still within last 90 days
    // This ensures collection fees and CS tasks show even if overdue
    return date > now.minus({ days: 90 });
  }
  
  // For post-renewal tasks: allow last 30 days
  return date > now.minus({ days: 30 });
}

/**
 * Check if renewal date is too far in the future (> 18 months)
 * Guards against bad data
 */
export function isRenewalDateValid(renewalDate: string): boolean {
  const renewal = parseRenewalDate(renewalDate);
  
  if (!renewal.isValid) {
    if (typeof window !== 'undefined') {
      console.warn(`[Task Generator] Invalid renewal date, skipping: "${renewalDate}"`);
    }
    return false;
  }
  
  const now = DateTime.now().setZone("Europe/London");
  const maxFuture = now.plus({ months: 18 });
  
  return renewal <= maxFuture;
}

/**
 * Generate all task definitions for a company based on renewal_date
 * Uses actual Companies House dates when available
 */
export function generateTaskDefinitions(company: Company): TaskDefinition[] {
  if (!company.renewalDate) return [];
  if (!isRenewalDateValid(company.renewalDate)) return [];
  
  // Pass actual confirmation statement due date from Companies House if available
  const dates = computeTaskDates(company.renewalDate, company.confirmationStatementDue);
  const definitions: TaskDefinition[] = [];
  
  // 1. Collect renewal fees (only if fees > 0)
  const fees = parseFloat(company.renewalFees || "0");
  if (fees > 0 && shouldCreateTask(dates.fees, "pre")) {
    definitions.push({
      type: "fees",
      title: "Collect renewal fees from client",
      description: "Issue invoice and confirm receipt of renewal fees.",
      dueAt: dates.fees,
      kind: "pre",
      requiresFees: true,
    });
  }
  
  // 2. File Confirmation Statement
  if (shouldCreateTask(dates.cs, "pre")) {
    const actualCsDue = dates.cs;
    const csDueAdvance = actualCsDue.minus({ days: 15 }); // Task due 15 days before actual date
    definitions.push({
      type: "cs",
      title: "File Confirmation Statement (Companies House)",
      description: "Prepare CS01 and file at Companies House.",
      dueAt: csDueAdvance,
      actualDueAt: actualCsDue,
      kind: "pre",
    });
  }
  
  // 3. Prepare annual accounts
  if (shouldCreateTask(dates.prep, "post")) {
    definitions.push({
      type: "prep-accounts",
      title: "Prepare annual accounts",
      description: "Compile year-end accounts (ledgers, adjustments, review).",
      dueAt: dates.prep,
      kind: "post",
    });
  }
  
  // 4. Submit annual accounts to Companies House
  if (shouldCreateTask(dates.submit, "post")) {
    definitions.push({
      type: "submit-accounts",
      title: "Submit annual accounts to Companies House",
      description: "File statutory accounts to CH.",
      dueAt: dates.submit,
      kind: "post",
    });
  }
  
  // 5. HMRC notification
  if (shouldCreateTask(dates.hmrc, "post")) {
    definitions.push({
      type: "hmrc",
      title: "HMRC notification / follow-up",
      description: "Confirm any HMRC follow-ups or notices after year-end.",
      dueAt: dates.hmrc,
      kind: "post",
    });
  }
  
  return definitions;
}

/**
 * Build unique key for a task
 * Pattern: {type}:{companyId}:{renewalDate}
 */
export function buildUniqueKey(type: string, companyId: string, renewalDate: string): string {
  return `${type}:${companyId}:${renewalDate}`;
}

/**
 * Convert task definitions to InsertTask objects
 */
export function taskDefinitionsToInsertTasks(
  company: Company,
  definitions: TaskDefinition[]
): InsertTask[] {
  if (!company.renewalDate) return [];
  
  const renewalDate = company.renewalDate;
  
  return definitions.map((def) => {
    const meta: Record<string, any> = {};
    
    // Add renewal fees if applicable
    if (def.requiresFees) {
      meta.renewal_fees = company.renewalFees;
    }
    
    // Add actual due date for tasks with advance due dates (e.g., CS)
    if (def.actualDueAt) {
      meta.actualDueAt = def.actualDueAt.toISO();
    }
    
    return {
      companyId: company.id,
      companyName: company.name,
      title: def.title,
      description: def.description,
      dueAt: def.dueAt.toISO() || def.dueAt.toUTC().toISO() || "", // Convert Luxon DateTime to ISO string
      status: "open" as const,
      meta,
      uniqueKey: buildUniqueKey(def.type, company.id, renewalDate),
      renewalDate: renewalDate,
      reviewed: false,
    };
  });
}

/**
 * Get task status based on due date
 */
export function getTaskStatus(dueAt: string): "overdue" | "due_soon" | "upcoming" {
  const due = DateTime.fromISO(dueAt, { zone: "Europe/London" });
  const now = DateTime.now().setZone("Europe/London");
  
  if (due < now) return "overdue";
  if (due < now.plus({ days: 7 })) return "due_soon";
  return "upcoming";
}

/**
 * Format due date for display
 */
export function formatDueDate(dueAt: string): string {
  const due = DateTime.fromISO(dueAt, { zone: "Europe/London" });
  return due.toFormat("dd MMM yyyy");
}

/**
 * Get days until/overdue
 */
export function getDaysUntilDue(dueAt: string): number {
  const due = DateTime.fromISO(dueAt, { zone: "Europe/London" }).startOf("day");
  const now = DateTime.now().setZone("Europe/London").startOf("day");
  
  return Math.floor(due.diff(now, "days").days);
}
