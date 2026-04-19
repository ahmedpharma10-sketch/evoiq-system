import type { Company, Task, TaskAudit, CompanyActivityLog, SLPrepTask, CompanySLPrepTaskStatus, HRTaskTemplate, LeaverTaskTemplate, ResidencyTaskTemplate, EmployeeFormTemplate, EmployeeRecord, EmployeeTask, EmployeeActivityLog, Dependant, PendingDependantRequest, PendingEmployeeStatusChange, PendingCompanySLChange, UserActivityLog, Holiday, AttendanceRecord } from "@shared/schema";
import { authService } from "./authService";
import { idGenerator } from "./idGenerator";
import { generateLeaverTasks } from "./utils/employeeTaskGenerator";

const COMPANIES_KEY = "corporate-management-companies";
const TASKS_KEY = "corporate-management-tasks";
const AUDIT_LOGS_KEY = "corporate-management-audit-logs";
const COMPANY_ACTIVITY_LOGS_KEY = "corporate-management-company-activity-logs";
const LAST_SYNC_KEY = "corporate-management-last-sync";
const SL_PREP_TASKS_KEY = "corporate-management-sl-prep-tasks";
const COMPANY_SL_PREP_TASK_STATUS_KEY = "corporate-management-company-sl-prep-task-status";
const HR_TASK_TEMPLATES_KEY = "corporate-management-hr-task-templates";
const LEAVER_TASK_TEMPLATES_KEY = "corporate-management-leaver-task-templates";
const RESIDENCY_TASK_TEMPLATES_KEY = "corporate-management-residency-task-templates";
const EMPLOYEE_FORM_TEMPLATES_KEY = "corporate-management-employee-form-templates";
const EMPLOYEES_KEY = "corporate-management-employees";
const EMPLOYEE_TASKS_KEY = "corporate-management-employee-tasks";
const EMPLOYEE_ACTIVITY_LOGS_KEY = "corporate-management-employee-activity-logs";
const DEPENDANTS_KEY = "corporate-management-dependants";
const PENDING_DEPENDANT_REQUESTS_KEY = "corporate-management-pending-dependant-requests";
const PENDING_EMPLOYEE_STATUS_CHANGES_KEY = "corporate-management-pending-employee-status-changes";
const PENDING_COMPANY_SL_CHANGES_KEY = "corporate-management-pending-company-sl-changes";
const USER_ACTIVITY_LOGS_KEY = "corporate-management-user-activity-logs";
const HOLIDAYS_KEY = "corporate-management-holidays";
const ATTENDANCE_RECORDS_KEY = "corporate-management-attendance-records";

// Helper function to get current user name
function getCurrentUserName(): string {
  const currentUser = authService.getCurrentUser();
  return currentUser ? currentUser.name : "System";
}

export const localStorageService = {
  getCompanies(): Company[] {
    try {
      const data = localStorage.getItem(COMPANIES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setCompanies(companies: Company[]): void {
    localStorage.setItem(COMPANIES_KEY, JSON.stringify(companies));
  },

  addCompany(company: Company): void {
    const companies = this.getCompanies();
    companies.push(company);
    this.setCompanies(companies);
  },

  updateCompany(id: string, updates: Partial<Company>): void {
    const companies = this.getCompanies();
    const index = companies.findIndex((c) => c.id === id);
    if (index !== -1) {
      companies[index] = { ...companies[index], ...updates };
      this.setCompanies(companies);
    }
  },

  deleteCompany(id: string): void {
    const companies = this.getCompanies().filter((c) => c.id !== id);
    this.setCompanies(companies);
  },

  getTasks(): Task[] {
    try {
      const data = localStorage.getItem(TASKS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setTasks(tasks: Task[]): void {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  },

  addTask(task: Task): void {
    const tasks = this.getTasks();
    tasks.push(task);
    this.setTasks(tasks);
  },

  updateTaskStatus(id: string, status: Task["status"], reason?: string): void {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      const oldTask = tasks[index];
      const fromStatus = oldTask.status;
      
      // Validate: cancelled status requires reason
      if (status === "cancelled" && !reason) {
        throw new Error("Reason is required when cancelling a task");
      }
      
      // Update task status
      tasks[index] = { ...tasks[index], status };
      this.setTasks(tasks);
      
      // Create audit log
      const audit: TaskAudit = {
        id: idGenerator.generateLogID(),
        taskId: oldTask.id,
        taskTitle: oldTask.title,
        companyId: oldTask.companyId,
        companyName: oldTask.companyName,
        fromStatus,
        toStatus: status,
        reason,
        timestamp: new Date().toISOString(),
        performedBy: getCurrentUserName(),
        meta: {},
      };
      this.addAuditLog(audit);
    }
  },

  cancelCompanyTasks(companyId: string): void {
    const tasks = this.getTasks();
    const timestamp = new Date().toISOString();
    
    const updated = tasks.map(task => {
      if (task.companyId === companyId && task.status === "open") {
        // Create audit log for this cancellation using addAuditLog helper
        this.addAuditLog({
          id: idGenerator.generateLogID(),
          taskId: task.id,
          taskTitle: task.title,
          companyId: task.companyId,
          companyName: task.companyName,
          fromStatus: task.status,
          toStatus: "cancelled",
          reason: "Company deactivated or renewal date changed",
          timestamp,
          performedBy: getCurrentUserName(),
          meta: {},
        });
        
        return { ...task, status: "cancelled" as const };
      }
      return task;
    });
    this.setTasks(updated);
  },

  markTaskAsReviewed(id: string, note?: string): void {
    const tasks = this.getTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      const task = tasks[index];
      
      // Only done and cancelled tasks can be reviewed
      if (task.status !== "done" && task.status !== "cancelled") {
        throw new Error("Only done or cancelled tasks can be reviewed");
      }
      
      tasks[index] = {
        ...task,
        reviewed: true,
        reviewedAt: new Date().toISOString(),
        reviewerNote: note,
      };
      this.setTasks(tasks);
    }
  },

  // Audit log methods
  getAuditLogs(): TaskAudit[] {
    try {
      const data = localStorage.getItem(AUDIT_LOGS_KEY);
      const logs: TaskAudit[] = data ? JSON.parse(data) : [];
      // Sort by timestamp (newest first)
      return logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  },

  setAuditLogs(logs: TaskAudit[]): void {
    localStorage.setItem(AUDIT_LOGS_KEY, JSON.stringify(logs));
  },

  addAuditLog(log: TaskAudit): void {
    const data = localStorage.getItem(AUDIT_LOGS_KEY);
    const logs: TaskAudit[] = data ? JSON.parse(data) : [];
    logs.push(log);
    // Don't sort here - sorting is done on read in getAuditLogs()
    this.setAuditLogs(logs);
  },

  getAuditLogsByTask(taskId: string): TaskAudit[] {
    return this.getAuditLogs().filter(log => log.taskId === taskId);
  },

  getAuditLogsByCompany(companyId: string): TaskAudit[] {
    return this.getAuditLogs().filter(log => log.companyId === companyId);
  },

  getLastSyncTimestamp(): string | null {
    try {
      return localStorage.getItem(LAST_SYNC_KEY);
    } catch {
      return null;
    }
  },

  setLastSyncTimestamp(timestamp: string): void {
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
  },

  getLastTaskGenerationTimestamp(): string | null {
    try {
      return localStorage.getItem("corporate-management-last-task-generation");
    } catch {
      return null;
    }
  },

  setLastTaskGenerationTimestamp(timestamp: string): void {
    localStorage.setItem("corporate-management-last-task-generation", timestamp);
  },

  // Company activity log methods
  getCompanyActivityLogs(): CompanyActivityLog[] {
    try {
      const data = localStorage.getItem(COMPANY_ACTIVITY_LOGS_KEY);
      const logs: CompanyActivityLog[] = data ? JSON.parse(data) : [];
      // Sort by timestamp (newest first)
      return logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  },

  setCompanyActivityLogs(logs: CompanyActivityLog[]): void {
    localStorage.setItem(COMPANY_ACTIVITY_LOGS_KEY, JSON.stringify(logs));
  },

  addCompanyActivityLog(log: CompanyActivityLog): void {
    const data = localStorage.getItem(COMPANY_ACTIVITY_LOGS_KEY);
    const logs: CompanyActivityLog[] = data ? JSON.parse(data) : [];
    // Ensure performedBy is set
    const logWithUser = {
      ...log,
      performedBy: log.performedBy || getCurrentUserName(),
    };
    logs.push(logWithUser);
    this.setCompanyActivityLogs(logs);
  },

  getCompanyActivityLogsByCompany(companyId: string): CompanyActivityLog[] {
    return this.getCompanyActivityLogs().filter(log => log.companyId === companyId);
  },

  // SL Prep Task methods (master list of tasks)
  getSLPrepTasks(): SLPrepTask[] {
    try {
      const data = localStorage.getItem(SL_PREP_TASKS_KEY);
      const tasks: SLPrepTask[] = data ? JSON.parse(data) : [];
      // Sort by order, then by createdAt
      return tasks.sort((a, b) => a.order - b.order || 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch {
      return [];
    }
  },

  setSLPrepTasks(tasks: SLPrepTask[]): void {
    localStorage.setItem(SL_PREP_TASKS_KEY, JSON.stringify(tasks));
  },

  addSLPrepTask(task: SLPrepTask): void {
    const tasks = this.getSLPrepTasks();
    tasks.push(task);
    this.setSLPrepTasks(tasks);
  },

  updateSLPrepTask(id: string, updates: Partial<SLPrepTask>): void {
    const tasks = this.getSLPrepTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates };
      this.setSLPrepTasks(tasks);
    }
  },

  deleteSLPrepTask(id: string): void {
    const tasks = this.getSLPrepTasks().filter((t) => t.id !== id);
    this.setSLPrepTasks(tasks);
    
    // Also delete all company task statuses for this task
    const statuses = this.getCompanySLPrepTaskStatuses().filter((s) => s.taskId !== id);
    this.setCompanySLPrepTaskStatuses(statuses);
  },

  // HR Task Template methods (master list of tasks for all employees)
  getHRTaskTemplates(): HRTaskTemplate[] {
    try {
      const data = localStorage.getItem(HR_TASK_TEMPLATES_KEY);
      const templates: HRTaskTemplate[] = data ? JSON.parse(data) : [];
      // Sort by order, then by createdAt
      return templates.sort((a, b) => a.order - b.order || 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch {
      return [];
    }
  },

  setHRTaskTemplates(templates: HRTaskTemplate[]): void {
    localStorage.setItem(HR_TASK_TEMPLATES_KEY, JSON.stringify(templates));
  },

  addHRTaskTemplate(template: HRTaskTemplate): void {
    const templates = this.getHRTaskTemplates();
    templates.push(template);
    this.setHRTaskTemplates(templates);
  },

  updateHRTaskTemplate(id: string, updates: Partial<HRTaskTemplate>): void {
    const templates = this.getHRTaskTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updates };
      this.setHRTaskTemplates(templates);
    }
  },

  deleteHRTaskTemplate(id: string): void {
    const templates = this.getHRTaskTemplates().filter((t) => t.id !== id);
    this.setHRTaskTemplates(templates);
    
    // Also delete all employee tasks generated from this template
    const employeeTasks = this.getEmployeeTasks().filter((t) => 
      !t.uniqueKey || !t.uniqueKey.includes(`hr-template-${id}`)
    );
    this.setEmployeeTasks(employeeTasks);
  },

  // Leaver Task Template methods (tasks that apply when employee becomes leaver)
  getLeaverTaskTemplates(): LeaverTaskTemplate[] {
    try {
      const data = localStorage.getItem(LEAVER_TASK_TEMPLATES_KEY);
      const templates: LeaverTaskTemplate[] = data ? JSON.parse(data) : [];
      // Sort by order, then by createdAt
      return templates.sort((a, b) => a.order - b.order || 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch {
      return [];
    }
  },

  setLeaverTaskTemplates(templates: LeaverTaskTemplate[]): void {
    localStorage.setItem(LEAVER_TASK_TEMPLATES_KEY, JSON.stringify(templates));
  },

  addLeaverTaskTemplate(template: LeaverTaskTemplate): void {
    const templates = this.getLeaverTaskTemplates();
    templates.push(template);
    this.setLeaverTaskTemplates(templates);
  },

  updateLeaverTaskTemplate(id: string, updates: Partial<LeaverTaskTemplate>): void {
    const templates = this.getLeaverTaskTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updates };
      this.setLeaverTaskTemplates(templates);
    }
  },

  deleteLeaverTaskTemplate(id: string): void {
    const templates = this.getLeaverTaskTemplates().filter((t) => t.id !== id);
    this.setLeaverTaskTemplates(templates);
    
    // Also delete all employee tasks generated from this template
    const employeeTasks = this.getEmployeeTasks().filter((t) => 
      !t.uniqueKey || !t.uniqueKey.includes(`leaver-template-${id}`)
    );
    this.setEmployeeTasks(employeeTasks);
  },

  // Residency Task Template methods (tasks for employees with residency service)
  getResidencyTaskTemplates(): ResidencyTaskTemplate[] {
    try {
      const data = localStorage.getItem(RESIDENCY_TASK_TEMPLATES_KEY);
      const templates: ResidencyTaskTemplate[] = data ? JSON.parse(data) : [];
      // Sort by order, then by createdAt
      return templates.sort((a, b) => a.order - b.order || 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } catch {
      return [];
    }
  },

  setResidencyTaskTemplates(templates: ResidencyTaskTemplate[]): void {
    localStorage.setItem(RESIDENCY_TASK_TEMPLATES_KEY, JSON.stringify(templates));
  },

  addResidencyTaskTemplate(template: ResidencyTaskTemplate): void {
    const templates = this.getResidencyTaskTemplates();
    templates.push(template);
    this.setResidencyTaskTemplates(templates);
  },

  updateResidencyTaskTemplate(id: string, updates: Partial<ResidencyTaskTemplate>): void {
    const templates = this.getResidencyTaskTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updates };
      this.setResidencyTaskTemplates(templates);
    }
  },

  deleteResidencyTaskTemplate(id: string): void {
    const templates = this.getResidencyTaskTemplates().filter((t) => t.id !== id);
    this.setResidencyTaskTemplates(templates);
    
    // Also delete all employee tasks generated from this template
    const employeeTasks = this.getEmployeeTasks().filter((t) => 
      !t.uniqueKey || !t.uniqueKey.includes(`residency-template-${id}`)
    );
    this.setEmployeeTasks(employeeTasks);
  },

  // Company SL Prep Task Status methods (per-company tracking)
  getCompanySLPrepTaskStatuses(): CompanySLPrepTaskStatus[] {
    try {
      const data = localStorage.getItem(COMPANY_SL_PREP_TASK_STATUS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setCompanySLPrepTaskStatuses(statuses: CompanySLPrepTaskStatus[]): void {
    localStorage.setItem(COMPANY_SL_PREP_TASK_STATUS_KEY, JSON.stringify(statuses));
  },

  addCompanySLPrepTaskStatus(status: CompanySLPrepTaskStatus): void {
    const statuses = this.getCompanySLPrepTaskStatuses();
    statuses.push(status);
    this.setCompanySLPrepTaskStatuses(statuses);
  },

  updateCompanySLPrepTaskStatus(id: string, updates: Partial<CompanySLPrepTaskStatus>): void {
    const statuses = this.getCompanySLPrepTaskStatuses();
    const index = statuses.findIndex((s) => s.id === id);
    if (index !== -1) {
      statuses[index] = { ...statuses[index], ...updates };
      this.setCompanySLPrepTaskStatuses(statuses);
    }
  },

  getCompanySLPrepTaskStatusesByCompany(companyId: string): CompanySLPrepTaskStatus[] {
    return this.getCompanySLPrepTaskStatuses().filter((s) => s.companyId === companyId);
  },

  getCompanySLPrepTaskStatus(companyId: string, taskId: string): CompanySLPrepTaskStatus | null {
    const statuses = this.getCompanySLPrepTaskStatuses();
    return statuses.find((s) => s.companyId === companyId && s.taskId === taskId) || null;
  },

  toggleCompanySLPrepTaskStatus(companyId: string, taskId: string, description?: string, completionNote?: string): void {
    const statuses = this.getCompanySLPrepTaskStatuses();
    const existingIndex = statuses.findIndex((s) => s.companyId === companyId && s.taskId === taskId);
    
    if (existingIndex !== -1) {
      // Update existing status
      const existing = statuses[existingIndex];
      statuses[existingIndex] = {
        ...existing,
        isCompleted: !existing.isCompleted,
        description: !existing.isCompleted ? description : existing.description,
        completionNote: !existing.isCompleted ? completionNote : undefined,
        completedAt: !existing.isCompleted ? new Date().toISOString() : undefined,
      };
    } else {
      // Create new status (marking as completed)
      statuses.push({
        id: idGenerator.generateLogID(),
        companyId,
        taskId,
        isCompleted: true,
        description,
        completionNote,
        completedAt: new Date().toISOString(),
      });
    }
    
    this.setCompanySLPrepTaskStatuses(statuses);
  },

  // Employee Form Template methods
  getEmployeeFormTemplates(): EmployeeFormTemplate[] {
    try {
      const data = localStorage.getItem(EMPLOYEE_FORM_TEMPLATES_KEY);
      const templates: EmployeeFormTemplate[] = data ? JSON.parse(data) : [];
      // Sort by createdAt (newest first)
      return templates.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      return [];
    }
  },

  setEmployeeFormTemplates(templates: EmployeeFormTemplate[]): void {
    localStorage.setItem(EMPLOYEE_FORM_TEMPLATES_KEY, JSON.stringify(templates));
  },

  addEmployeeFormTemplate(template: EmployeeFormTemplate): void {
    const templates = this.getEmployeeFormTemplates();
    templates.push(template);
    this.setEmployeeFormTemplates(templates);
  },

  updateEmployeeFormTemplate(id: string, updates: Partial<EmployeeFormTemplate>): void {
    const templates = this.getEmployeeFormTemplates();
    const index = templates.findIndex((t) => t.id === id);
    if (index !== -1) {
      templates[index] = { 
        ...templates[index], 
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.setEmployeeFormTemplates(templates);
    }
  },

  deleteEmployeeFormTemplate(id: string): void {
    const templates = this.getEmployeeFormTemplates().filter((t) => t.id !== id);
    this.setEmployeeFormTemplates(templates);
  },

  getActiveEmployeeFormTemplate(): EmployeeFormTemplate | null {
    const templates = this.getEmployeeFormTemplates();
    return templates.find((t) => t.isActive) || null;
  },

  // Employee Record methods
  getEmployees(): EmployeeRecord[] {
    try {
      const data = localStorage.getItem(EMPLOYEES_KEY);
      const employees: EmployeeRecord[] = data ? JSON.parse(data) : [];
      // Sort by createdAt (newest first)
      return employees.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch {
      return [];
    }
  },

  setEmployees(employees: EmployeeRecord[]): void {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
  },

  getEmployee(id: string): EmployeeRecord | null {
    const employees = this.getEmployees();
    return employees.find((e) => e.id === id) || null;
  },

  addEmployee(employee: EmployeeRecord): void {
    const employees = this.getEmployees();
    employees.push(employee);
    this.setEmployees(employees);
  },

  updateEmployee(id: string, updates: Partial<EmployeeRecord>): void {
    const employees = this.getEmployees();
    const index = employees.findIndex((e) => e.id === id);
    if (index !== -1) {
      employees[index] = { 
        ...employees[index], 
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.setEmployees(employees);
    }
  },

  deleteEmployee(id: string): void {
    const employees = this.getEmployees().filter((e) => e.id !== id);
    this.setEmployees(employees);
  },

  getEmployeesByCompany(companyId: string): EmployeeRecord[] {
    return this.getEmployees().filter((e) => e.companyId === companyId);
  },

  getEmployeesByStatus(status: EmployeeRecord["status"]): EmployeeRecord[] {
    return this.getEmployees().filter((e) => e.status === status);
  },

  // Employee Task methods
  getEmployeeTasks(): EmployeeTask[] {
    try {
      const data = localStorage.getItem(EMPLOYEE_TASKS_KEY);
      const tasks: EmployeeTask[] = data ? JSON.parse(data) : [];
      // Sort by dueAt (earliest first), then by createdAt
      return tasks.sort((a, b) => {
        if (a.dueAt && b.dueAt) {
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        }
        if (a.dueAt) return -1;
        if (b.dueAt) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    } catch {
      return [];
    }
  },

  setEmployeeTasks(tasks: EmployeeTask[]): void {
    localStorage.setItem(EMPLOYEE_TASKS_KEY, JSON.stringify(tasks));
  },

  addEmployeeTask(task: EmployeeTask): void {
    const tasks = this.getEmployeeTasks();
    tasks.push(task);
    this.setEmployeeTasks(tasks);
  },

  updateEmployeeTask(id: string, updates: Partial<EmployeeTask>): void {
    const tasks = this.getEmployeeTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      tasks[index] = { 
        ...tasks[index], 
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.setEmployeeTasks(tasks);
    }
  },

  updateEmployeeTaskStatus(id: string, status: EmployeeTask["status"], note?: string): void {
    const tasks = this.getEmployeeTasks();
    const index = tasks.findIndex((t) => t.id === id);
    if (index !== -1) {
      tasks[index] = {
        ...tasks[index],
        status,
        completionNote: note,
        completedAt: status === "completed" ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString(),
      };
      this.setEmployeeTasks(tasks);
    }
  },

  deleteEmployeeTask(id: string): void {
    const tasks = this.getEmployeeTasks().filter((t) => t.id !== id);
    this.setEmployeeTasks(tasks);
  },

  getEmployeeTasksByEmployee(employeeId: string): EmployeeTask[] {
    return this.getEmployeeTasks().filter((t) => t.employeeId === employeeId);
  },

  getEmployeeTasksByCompany(companyId: string): EmployeeTask[] {
    return this.getEmployeeTasks().filter((t) => t.companyId === companyId);
  },

  getEmployeeTasksByStatus(status: EmployeeTask["status"]): EmployeeTask[] {
    return this.getEmployeeTasks().filter((t) => t.status === status);
  },

  getEmployeeTaskByUniqueKey(uniqueKey: string): EmployeeTask | null {
    return this.getEmployeeTasks().find((t) => t.uniqueKey === uniqueKey) || null;
  },

  deleteEmployeeTasksByEmployee(employeeId: string): void {
    const tasks = this.getEmployeeTasks().filter((t) => t.employeeId !== employeeId);
    this.setEmployeeTasks(tasks);
  },

  /**
   * Atomically reopens a residency task and logs the action to employee activity log.
   * Uses structuredClone and fresh array copies for best-effort localStorage atomicity.
   */
  reopenResidencyTask({ taskId, reason }: { taskId: string; reason?: string }): void {
    // 1. Load original collections (for fallback)
    const originalTasks = this.getEmployeeTasks();
    const originalEmployees = this.getEmployees();
    
    // 2. Find and validate task
    const taskIndex = originalTasks.findIndex((t) => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error("Task not found");
    }
    
    const task = originalTasks[taskIndex];
    
    // 3. Validate reopen eligibility
    const reopenableStatuses: EmployeeTask["status"][] = ["completed", "cancelled", "skipped"];
    if (!reopenableStatuses.includes(task.status)) {
      throw new Error(`Cannot reopen task with status "${task.status}". Only completed, cancelled, or skipped tasks can be reopened.`);
    }
    
    // 4. Find and validate employee
    const employeeIndex = originalEmployees.findIndex((e) => e.id === task.employeeId);
    if (employeeIndex === -1) {
      throw new Error("Employee not found - cannot log reopen action");
    }
    
    const employee = originalEmployees[employeeIndex];
    const statusFrom = task.status;
    
    // 5. Clone collections for safe mutation (preserves types)
    const tasks = typeof structuredClone !== 'undefined' ? structuredClone(originalTasks) : JSON.parse(JSON.stringify(originalTasks));
    const employees = typeof structuredClone !== 'undefined' ? structuredClone(originalEmployees) : JSON.parse(JSON.stringify(originalEmployees));
    
    // 6. Prepare updated task
    tasks[taskIndex] = {
      ...tasks[taskIndex],
      status: "open",
      reviewed: false,
      reviewerNote: undefined,
      completedAt: undefined,
      completionNote: undefined,
      cancelReason: undefined,
      updatedAt: new Date().toISOString(),
    };
    
    // 7. Append new activity log entry (mutate in place to preserve prior entries)
    const currentLog = employees[employeeIndex].activityLog ?? (employees[employeeIndex].activityLog = []);
    currentLog.push({
      id: idGenerator.generateLogID(),
      timestamp: new Date().toISOString(),
      action: `Reopened residency task: ${task.title}`,
      description: reason ? `Reason: ${reason}` : "Reopened without specified reason",
      user: getCurrentUserName(),
      meta: { taskId, statusFrom, statusTo: "open", reason: reason ?? "" },
    });
    employees[employeeIndex].updatedAt = new Date().toISOString();
    
    // 8. Persist both mutations (fail fast, rollback to originals on error)
    try {
      this.setEmployeeTasks(tasks);
      this.setEmployees(employees);
    } catch (persistError) {
      // Rollback: write original unmodified collections back to localStorage
      try {
        this.setEmployeeTasks(originalTasks);
        this.setEmployees(originalEmployees);
      } catch (rollbackError) {
        console.error("Critical: Rollback failed during reopenResidencyTask", rollbackError);
      }
      throw new Error(`Failed to reopen residency task: ${persistError instanceof Error ? persistError.message : String(persistError)}`);
    }
  },

  // Employee Activity Log methods
  getEmployeeActivityLogs(): EmployeeActivityLog[] {
    try {
      const data = localStorage.getItem(EMPLOYEE_ACTIVITY_LOGS_KEY);
      const logs: EmployeeActivityLog[] = data ? JSON.parse(data) : [];
      // Sort by timestamp (newest first)
      return logs.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch {
      return [];
    }
  },

  setEmployeeActivityLogs(logs: EmployeeActivityLog[]): void {
    localStorage.setItem(EMPLOYEE_ACTIVITY_LOGS_KEY, JSON.stringify(logs));
  },

  addEmployeeActivityLog(log: EmployeeActivityLog): void {
    const logs = this.getEmployeeActivityLogs();
    // Ensure performedBy is set
    const logWithUser = {
      ...log,
      performedBy: log.performedBy || getCurrentUserName(),
    };
    logs.push(logWithUser);
    this.setEmployeeActivityLogs(logs);
  },

  getEmployeeActivityLogsByEmployee(employeeId: string): EmployeeActivityLog[] {
    return this.getEmployeeActivityLogs()
      .filter((log) => log.employeeId === employeeId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },

  deleteEmployeeActivityLogsByEmployee(employeeId: string): void {
    const logs = this.getEmployeeActivityLogs().filter((log) => log.employeeId !== employeeId);
    this.setEmployeeActivityLogs(logs);
  },

  // Activity Log Utilities - for tracking all system actions
  addCompanyActivityLogEntry(companyId: string, action: string, description: string, user: string = getCurrentUserName(), meta: Record<string, any> = {}): void {
    const companies = this.getCompanies();
    const index = companies.findIndex((c) => c.id === companyId);
    if (index !== -1) {
      const activityLog = companies[index].activityLog || [];
      activityLog.push({
        id: idGenerator.generateLogID(),
        timestamp: new Date().toISOString(),
        action,
        description,
        user,
        meta,
      });
      companies[index].activityLog = activityLog;
      this.setCompanies(companies);
    }
  },

  addEmployeeActivityLogEntry(employeeId: string, action: string, description: string, user: string = getCurrentUserName(), meta: Record<string, any> = {}): void {
    const employees = this.getEmployees();
    const index = employees.findIndex((e) => e.id === employeeId);
    if (index !== -1) {
      const activityLog = employees[index].activityLog || [];
      activityLog.push({
        id: idGenerator.generateLogID(),
        timestamp: new Date().toISOString(),
        action,
        description,
        user,
        meta,
      });
      employees[index].activityLog = activityLog;
      this.setEmployees(employees);
    }
  },

  getAllSystemActivityLogs(): Array<{
    id: string;
    timestamp: string;
    action: string;
    description: string;
    user: string;
    entityType: "company" | "employee";
    entityId: string;
    entityName: string;
    meta: Record<string, any>;
  }> {
    const companies = this.getCompanies();
    const employees = this.getEmployees();
    
    const allLogs: Array<{
      id: string;
      timestamp: string;
      action: string;
      description: string;
      user: string;
      entityType: "company" | "employee";
      entityId: string;
      entityName: string;
      meta: Record<string, any>;
    }> = [];

    // Collect company activity logs
    companies.forEach(company => {
      const logs = company.activityLog || [];
      logs.forEach(log => {
        allLogs.push({
          ...log,
          entityType: "company",
          entityId: company.id,
          entityName: company.name,
        });
      });
    });

    // Collect employee activity logs
    employees.forEach(employee => {
      const logs = employee.activityLog || [];
      logs.forEach(log => {
        allLogs.push({
          ...log,
          entityType: "employee",
          entityId: employee.id,
          entityName: `${employee.firstName} ${employee.lastName}`,
        });
      });
    });

    // Sort by timestamp (newest first)
    return allLogs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  getCompanyActivityLogsFromRecord(companyId: string): Array<{
    id: string;
    timestamp: string;
    action: string;
    description: string;
    user: string;
    meta: Record<string, any>;
  }> {
    const companies = this.getCompanies();
    const company = companies.find((c) => c.id === companyId);
    if (!company) return [];
    
    const logs = company.activityLog || [];
    // Sort by timestamp (newest first)
    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  getEmployeeActivityLogsFromRecord(employeeId: string): Array<{
    id: string;
    timestamp: string;
    action: string;
    description: string;
    user: string;
    meta: Record<string, any>;
  }> {
    const employees = this.getEmployees();
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return [];
    
    const logs = employee.activityLog || [];
    // Sort by timestamp (newest first)
    return logs.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  },

  // Last employee task generation timestamp
  getLastEmployeeTaskGeneration(): string | null {
    return localStorage.getItem("corporate-management-last-employee-task-generation");
  },

  setLastEmployeeTaskGeneration(timestamp: string): void {
    localStorage.setItem("corporate-management-last-employee-task-generation", timestamp);
  },

  // Last residency task generation timestamp
  getLastResidencyTaskGeneration(): string | null {
    return localStorage.getItem("corporate-management-last-residency-task-generation");
  },

  setLastResidencyTaskGeneration(timestamp: string): void {
    localStorage.setItem("corporate-management-last-residency-task-generation", timestamp);
  },

  // User Activity Log Management
  getUserActivityLogs(): UserActivityLog[] {
    const data = localStorage.getItem(USER_ACTIVITY_LOGS_KEY);
    try {
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setUserActivityLogs(logs: UserActivityLog[]): void {
    localStorage.setItem(USER_ACTIVITY_LOGS_KEY, JSON.stringify(logs));
  },

  addUserActivityLog(log: UserActivityLog): void {
    const logs = this.getUserActivityLogs();
    // Ensure performedBy is set
    const logWithUser = {
      ...log,
      performedBy: log.performedBy || getCurrentUserName(),
    };
    logs.push(logWithUser);
    this.setUserActivityLogs(logs);
  },

  // Dependant Management
  getDependants(): Dependant[] {
    try {
      const data = localStorage.getItem(DEPENDANTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setDependants(dependants: Dependant[]): void {
    localStorage.setItem(DEPENDANTS_KEY, JSON.stringify(dependants));
  },

  addDependant(dependant: Dependant): void {
    const dependants = this.getDependants();
    dependants.push(dependant);
    this.setDependants(dependants);
  },

  updateDependant(id: string, updates: Partial<Dependant>): void {
    const dependants = this.getDependants();
    const index = dependants.findIndex((d) => d.id === id);
    if (index !== -1) {
      dependants[index] = { ...dependants[index], ...updates };
      this.setDependants(dependants);
    }
  },

  deleteDependant(id: string): void {
    const dependants = this.getDependants().filter((d) => d.id !== id);
    this.setDependants(dependants);
  },

  getDependantsByEmployee(employeeId: string): Dependant[] {
    return this.getDependants().filter((d) => d.employeeId === employeeId);
  },

  // Pending Dependant Request Management
  getPendingDependantRequests(): PendingDependantRequest[] {
    try {
      const data = localStorage.getItem(PENDING_DEPENDANT_REQUESTS_KEY);
      if (!data) return [];
      
      const allRequests = JSON.parse(data);
      // Filter to only pending requests and auto-cleanup old processed ones
      const pendingOnly = allRequests.filter((r: PendingDependantRequest) => r.status === "pending");
      
      // If we filtered out any processed requests, update localStorage to clean it up
      if (pendingOnly.length !== allRequests.length) {
        this.setPendingDependantRequests(pendingOnly);
      }
      
      return pendingOnly;
    } catch {
      return [];
    }
  },

  setPendingDependantRequests(requests: PendingDependantRequest[]): void {
    localStorage.setItem(PENDING_DEPENDANT_REQUESTS_KEY, JSON.stringify(requests));
  },

  addPendingDependantRequest(request: PendingDependantRequest): void {
    const requests = this.getPendingDependantRequests();
    requests.push(request);
    this.setPendingDependantRequests(requests);
  },

  updatePendingDependantRequest(id: string, updates: Partial<PendingDependantRequest>): void {
    const requests = this.getPendingDependantRequests();
    const index = requests.findIndex((r) => r.id === id);
    if (index !== -1) {
      requests[index] = { ...requests[index], ...updates };
      this.setPendingDependantRequests(requests);
    }
  },

  deletePendingDependantRequest(id: string): void {
    const requests = this.getPendingDependantRequests().filter((r) => r.id !== id);
    this.setPendingDependantRequests(requests);
  },

  getPendingDependantRequestsByEmployee(employeeId: string): PendingDependantRequest[] {
    return this.getPendingDependantRequests().filter((r) => r.employeeId === employeeId && r.status === "pending");
  },

  approveDependantRequest(requestId: string, reviewNote?: string): void {
    const request = this.getPendingDependantRequests().find((r) => r.id === requestId);
    if (!request) throw new Error("Request not found");

    const currentUser = getCurrentUserName();
    const now = new Date().toISOString();

    // Execute the action
    if (request.action === "add") {
      // Add the dependant - normalize whatsAppNumber for backward compatibility with legacy pending requests
      const newDependant: Dependant = {
        id: idGenerator.generateEmployeeID(), // Use employee ID generator for dependants too
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        firstName: request.dependantData.firstName,
        middleName: request.dependantData.middleName || "",
        lastName: request.dependantData.lastName,
        dateOfBirth: request.dependantData.dateOfBirth,
        relationship: request.dependantData.relationship,
        whatsAppNumber: request.dependantData.whatsAppNumber || "", // Ensure empty string for legacy data
        createdAt: now,
      };
      this.addDependant(newDependant);
    } else if (request.action === "remove" && request.dependantData.id) {
      // Remove the dependant
      this.deleteDependant(request.dependantData.id);
    }

    // Log the action
    const employee = this.getEmployee(request.employeeId);
    if (employee) {
      this.addEmployeeActivityLog({
        id: idGenerator.generateLogID(),
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        action: request.action === "add" ? "dependant_added" : "dependant_removed",
        details: `Dependant ${request.dependantData.firstName} ${request.dependantData.lastName} ${request.action === "add" ? "added" : "removed"} - Approved by ${currentUser}. Reason: ${request.reason}`,
        timestamp: now,
        performedBy: currentUser,
        meta: {},
      });
    }

    // Remove the approved request from localStorage to keep data clean
    const requests = this.getPendingDependantRequests().filter((r) => r.id !== requestId);
    this.setPendingDependantRequests(requests);
  },

  rejectDependantRequest(requestId: string, reviewNote: string): void {
    const request = this.getPendingDependantRequests().find((r) => r.id === requestId);
    if (!request) throw new Error("Request not found");

    const currentUser = getCurrentUserName();
    const now = new Date().toISOString();

    // Log the action
    const employee = this.getEmployee(request.employeeId);
    if (employee) {
      this.addEmployeeActivityLog({
        id: idGenerator.generateLogID(),
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        action: "dependant_request_rejected",
        details: `Request to ${request.action} dependant ${request.dependantData.firstName} ${request.dependantData.lastName} was rejected by ${currentUser}. Reason: ${reviewNote}`,
        timestamp: now,
        performedBy: currentUser,
        meta: {},
      });
    }

    // Remove the rejected request from localStorage to keep data clean
    const requests = this.getPendingDependantRequests().filter((r) => r.id !== requestId);
    this.setPendingDependantRequests(requests);
  },

  // Pending Employee Status Change Management
  getPendingEmployeeStatusChanges(): PendingEmployeeStatusChange[] {
    try {
      const data = localStorage.getItem(PENDING_EMPLOYEE_STATUS_CHANGES_KEY);
      if (!data) return [];
      
      const allRequests = JSON.parse(data);
      // Filter to only pending requests and auto-cleanup old processed ones
      const pendingOnly = allRequests.filter((r: PendingEmployeeStatusChange) => r.status === "pending");
      
      // If we filtered out any processed requests, update localStorage to clean it up
      if (pendingOnly.length !== allRequests.length) {
        this.setPendingEmployeeStatusChanges(pendingOnly);
      }
      
      return pendingOnly;
    } catch {
      return [];
    }
  },

  setPendingEmployeeStatusChanges(requests: PendingEmployeeStatusChange[]): void {
    localStorage.setItem(PENDING_EMPLOYEE_STATUS_CHANGES_KEY, JSON.stringify(requests));
  },

  addPendingEmployeeStatusChange(request: PendingEmployeeStatusChange): void {
    const requests = this.getPendingEmployeeStatusChanges();
    requests.push(request);
    this.setPendingEmployeeStatusChanges(requests);
  },

  updatePendingEmployeeStatusChange(id: string, updates: Partial<PendingEmployeeStatusChange>): void {
    const requests = this.getPendingEmployeeStatusChanges();
    const index = requests.findIndex((r) => r.id === id);
    if (index !== -1) {
      requests[index] = { ...requests[index], ...updates };
      this.setPendingEmployeeStatusChanges(requests);
    }
  },

  async approveEmployeeStatusChange(requestId: string, reviewNote?: string): Promise<void> {
    const request = this.getPendingEmployeeStatusChanges().find((r) => r.id === requestId);
    if (!request) throw new Error("Request not found");

    const currentUser = getCurrentUserName();
    const now = new Date().toISOString();

    // Apply the status change to the employee
    const employee = this.getEmployee(request.employeeId);
    if (employee) {
      if (request.changeType === "status") {
        const updates: Partial<EmployeeRecord> = { status: request.newValue as any };
        // If changing to leaver status, record the leaver date
        if (request.newValue === "leaver") {
          updates.leaverDate = now;
        }
        this.updateEmployee(request.employeeId, updates);
      } else if (request.changeType === "deactivation") {
        this.updateEmployee(request.employeeId, { status: "deactivated" });
      } else if (request.changeType === "reactivation") {
        this.updateEmployee(request.employeeId, { status: "active" });
      }

      // Log the action
      this.addEmployeeActivityLog({
        id: idGenerator.generateLogID(),
        employeeId: request.employeeId,
        employeeName: request.employeeName,
        action: "status_change_approved",
        details: `Status change from "${request.currentValue}" to "${request.newValue}" approved by ${currentUser}${reviewNote ? `: ${reviewNote}` : ""}. Reason: ${request.reason}`,
        timestamp: now,
        performedBy: currentUser,
        meta: {},
      });

      // If the new status is "leaver", automatically generate leaver tasks
      if (request.newValue === "leaver") {
        const updatedEmployee = this.getEmployee(request.employeeId);
        if (updatedEmployee) {
          // Fetch leaver task templates from API
          let leaverTemplates: any[] = [];
          try {
            const resp = await fetch("/api/leaver-task-templates", { credentials: "include" });
            if (resp.ok) leaverTemplates = await resp.json();
          } catch (e) {
            console.error("Failed to fetch leaver templates from API:", e);
          }
          const { generatedTasks, skippedDuplicates } = generateLeaverTasks(updatedEmployee, [], leaverTemplates);

          // Save all generated tasks
          generatedTasks.forEach(task => {
            this.addEmployeeTask(task);
          });

          // Log the leaver task generation
          if (generatedTasks.length > 0) {
            this.addEmployeeActivityLog({
              id: idGenerator.generateLogID(),
              employeeId: request.employeeId,
              employeeName: request.employeeName,
              action: "leaver_tasks_generated",
              details: `Generated ${generatedTasks.length} leaver task(s) automatically (${skippedDuplicates} duplicates skipped). Performed by ${currentUser}`,
              timestamp: new Date().toISOString(),
              performedBy: currentUser,
              meta: {},
            });
          }
        }
      }
    }

    // Remove the approved request from localStorage to keep data clean
    const requests = this.getPendingEmployeeStatusChanges().filter((r) => r.id !== requestId);
    this.setPendingEmployeeStatusChanges(requests);
  },

  rejectEmployeeStatusChange(requestId: string, reviewNote: string): void {
    const request = this.getPendingEmployeeStatusChanges().find((r) => r.id === requestId);
    if (!request) throw new Error("Request not found");

    const currentUser = getCurrentUserName();
    const now = new Date().toISOString();

    // Log the action
    this.addEmployeeActivityLog({
      id: idGenerator.generateLogID(),
      employeeId: request.employeeId,
      employeeName: request.employeeName,
      action: "status_change_rejected",
      details: `Status change from "${request.currentValue}" to "${request.newValue}" rejected by ${currentUser}: ${reviewNote}. Original reason: ${request.reason}`,
      timestamp: now,
      performedBy: currentUser,
      meta: {},
    });

    // Remove the rejected request from localStorage to keep data clean
    const requests = this.getPendingEmployeeStatusChanges().filter((r) => r.id !== requestId);
    this.setPendingEmployeeStatusChanges(requests);
  },

  // Pending Company SL Change Management
  getPendingCompanySLChanges(): PendingCompanySLChange[] {
    try {
      const data = localStorage.getItem(PENDING_COMPANY_SL_CHANGES_KEY);
      if (!data) return [];
      
      const allRequests = JSON.parse(data);
      // Filter to only pending requests and auto-cleanup old processed ones
      const pendingOnly = allRequests.filter((r: PendingCompanySLChange) => r.status === "pending");
      
      // If we filtered out any processed requests, update localStorage to clean it up
      if (pendingOnly.length !== allRequests.length) {
        this.setPendingCompanySLChanges(pendingOnly);
      }
      
      return pendingOnly;
    } catch {
      return [];
    }
  },

  setPendingCompanySLChanges(requests: PendingCompanySLChange[]): void {
    localStorage.setItem(PENDING_COMPANY_SL_CHANGES_KEY, JSON.stringify(requests));
  },

  addPendingCompanySLChange(request: PendingCompanySLChange): void {
    const requests = this.getPendingCompanySLChanges();
    
    // Check if a pending change for this field already exists to prevent duplicates
    const existingIndex = requests.findIndex(
      (r) => r.companyId === request.companyId && r.field === request.field && r.status === "pending"
    );
    
    if (existingIndex !== -1) {
      // Update existing request instead of adding duplicate
      requests[existingIndex] = request;
    } else {
      // Add new request
      requests.push(request);
    }
    
    this.setPendingCompanySLChanges(requests);
  },

  updatePendingCompanySLChange(id: string, updates: Partial<PendingCompanySLChange>): void {
    const requests = this.getPendingCompanySLChanges();
    const index = requests.findIndex((r) => r.id === id);
    if (index !== -1) {
      requests[index] = { ...requests[index], ...updates };
      this.setPendingCompanySLChanges(requests);
    }
  },

  approveCompanySLChange(requestId: string, reviewNote?: string): void {
    try {
      const request = this.getPendingCompanySLChanges().find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      const currentUser = getCurrentUserName();
      const now = new Date().toISOString();

      // Update request status
      this.updatePendingCompanySLChange(requestId, {
        status: "approved",
        reviewedBy: currentUser,
        reviewedAt: now,
        reviewNote: reviewNote || "",
      });

      // Apply the change to the company
      const company = this.getCompanies().find((c) => c.id === request.companyId);
      if (company) {
        const updates: any = {};
        updates[request.field] = request.newValue;
        this.updateCompany(request.companyId, updates);

        // Log the action
        this.addCompanyActivityLog({
          id: idGenerator.generateLogID(),
          companyId: request.companyId,
          companyName: request.companyName,
          action: "sl_change_approved",
          reason: `SL field "${request.field}" changed from "${request.currentValue}" to "${request.newValue}" - Approved by ${currentUser}${reviewNote ? `: ${reviewNote}` : ""}. Original reason: ${request.reason}`,
          timestamp: now,
          performedBy: currentUser,
          meta: {},
        });
      }
    } catch (error) {
      throw new Error(`Failed to approve SL change: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  rejectCompanySLChange(requestId: string, reviewNote: string): void {
    try {
      const request = this.getPendingCompanySLChanges().find((r) => r.id === requestId);
      if (!request) throw new Error("Request not found");

      const currentUser = getCurrentUserName();
      const now = new Date().toISOString();

      // Update request status
      this.updatePendingCompanySLChange(requestId, {
        status: "rejected",
        reviewedBy: currentUser,
        reviewedAt: now,
        reviewNote: reviewNote || "",
      });

      // Log the action
      this.addCompanyActivityLog({
        id: idGenerator.generateLogID(),
        companyId: request.companyId,
        companyName: request.companyName,
        action: "sl_change_rejected",
        reason: `SL field "${request.field}" change from "${request.currentValue}" to "${request.newValue}" rejected by ${currentUser}: ${reviewNote}. Original reason: ${request.reason}`,
        timestamp: now,
        performedBy: currentUser,
        meta: {},
      });
    } catch (error) {
      throw new Error(`Failed to reject SL change: ${error instanceof Error ? error.message : String(error)}`);
    }
  },

  // ===== HOLIDAYS =====
  getHolidays(): Holiday[] {
    try {
      const data = localStorage.getItem(HOLIDAYS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setHolidays(holidays: Holiday[]): void {
    localStorage.setItem(HOLIDAYS_KEY, JSON.stringify(holidays));
  },

  addHoliday(holiday: Holiday): void {
    const holidays = this.getHolidays();
    holidays.push(holiday);
    this.setHolidays(holidays);
  },

  deleteHoliday(id: string): void {
    const holidays = this.getHolidays().filter((h) => h.id !== id);
    this.setHolidays(holidays);
  },

  clearAllHolidays(): void {
    this.setHolidays([]);
  },

  // Attendance Records Methods
  getAttendanceRecords(): AttendanceRecord[] {
    try {
      const data = localStorage.getItem(ATTENDANCE_RECORDS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  setAttendanceRecords(records: AttendanceRecord[]): void {
    localStorage.setItem(ATTENDANCE_RECORDS_KEY, JSON.stringify(records));
  },

  getAttendanceRecordsByEmployeeId(employeeId: string): AttendanceRecord[] {
    return this.getAttendanceRecords().filter(r => r.employeeId === employeeId);
  },

  addAttendanceRecord(record: AttendanceRecord): void {
    const records = this.getAttendanceRecords();
    records.push(record);
    this.setAttendanceRecords(records);
  },

  addAttendanceRecordsBulk(records: AttendanceRecord[]): void {
    const existing = this.getAttendanceRecords();
    existing.push(...records);
    this.setAttendanceRecords(existing);
  },

  updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): void {
    const records = this.getAttendanceRecords();
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
      records[index] = { ...records[index], ...updates };
      this.setAttendanceRecords(records);
    }
  },

  deleteAttendanceRecord(id: string): void {
    const records = this.getAttendanceRecords().filter(r => r.id !== id);
    this.setAttendanceRecords(records);
  },

  deleteAttendanceRecordsByEmployeeId(employeeId: string): void {
    const records = this.getAttendanceRecords().filter(r => r.employeeId !== employeeId);
    this.setAttendanceRecords(records);
  },

  clearAllAttendanceRecords(): void {
    this.setAttendanceRecords([]);
  },

  // Migration: Ensure all dependants and pending requests have whatsAppNumber field
  // This fixes backward compatibility with legacy data created before whatsAppNumber was added
  // Handles both null and undefined values, as well as non-string types
  migrateWhatsAppNumberField(): void {
    let migrated = false;

    // Normalize existing dependants - handle null, undefined, and non-string values
    const dependants = this.getDependants();
    const normalizedDependants = dependants.map(dep => {
      if (dep.whatsAppNumber == null || typeof dep.whatsAppNumber !== 'string') {
        migrated = true;
        return { ...dep, whatsAppNumber: "" };
      }
      return dep;
    });
    if (migrated) {
      this.setDependants(normalizedDependants);
    }

    // Normalize existing pending dependant requests - handle null, undefined, and non-string values
    migrated = false;
    const pendingRequests = this.getPendingDependantRequests();
    const normalizedRequests = pendingRequests.map(req => {
      if (req.dependantData.whatsAppNumber == null || typeof req.dependantData.whatsAppNumber !== 'string') {
        migrated = true;
        return {
          ...req,
          dependantData: { ...req.dependantData, whatsAppNumber: "" }
        };
      }
      return req;
    });
    if (migrated) {
      this.setPendingDependantRequests(normalizedRequests);
    }
  },
};
