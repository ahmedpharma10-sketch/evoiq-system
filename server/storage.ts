import type { Company, InsertCompany, Task, InsertTask, TaskAudit, InsertTaskAudit, HRTaskTemplate, InsertHRTaskTemplate, LeaverTaskTemplate, InsertLeaverTaskTemplate, ResidencyTaskTemplate, InsertResidencyTaskTemplate, SLPrepTask, InsertSLPrepTask, DeletionRequest, InsertDeletionRequest, GeneralLog, InsertGeneralLog, SlTrainingModule, InsertSlTrainingModule, SlTrainingQuestion, InsertSlTrainingQuestion, SlTrainingScore, InsertSlTrainingScore } from "@shared/schema";
import bcrypt from "bcrypt";
import { db } from "./db";
import { users, companies, tasks as tasksTable, taskAudits as taskAuditsTable, employees as employeesTable, employeeTasks as employeeTasksTable, hrTaskTemplates as hrTaskTemplatesTable, leaverTaskTemplates as leaverTaskTemplatesTable, residencyTaskTemplates as residencyTaskTemplatesTable, slPrepTasks, systemSettings, deletionRequests as deletionRequestsTable, generalLog as generalLogTable, slTrainingModules, slTrainingQuestions, slTrainingScores } from "@shared/schema";
import { eq, desc, and, gte, lte, like, sql, count } from "drizzle-orm";

// Safe date converter - handles Date objects, strings, null, and undefined
function toISOStringSafe(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value; // Already a string
  if (value instanceof Date) return value.toISOString();
  // Try to convert if it has toISOString method
  if (typeof (value as any).toISOString === 'function') {
    return (value as any).toISOString();
  }
  // Last resort - try Date constructor
  try {
    return new Date(value as any).toISOString();
  } catch {
    return null;
  }
}

// Normalize task object with safe date conversions for API responses
function normalizeTask(task: any): Task {
  return {
    ...task,
    dueAt: toISOStringSafe(task.dueAt) || new Date().toISOString(),
    createdAt: toISOStringSafe(task.createdAt) || new Date().toISOString(),
    reviewedAt: toISOStringSafe(task.reviewedAt),
  };
}

// Employee types
type Employee = typeof employeesTable.$inferSelect;
type InsertEmployee = typeof employeesTable.$inferInsert;
type EmployeeTask = typeof employeeTasksTable.$inferSelect;
type InsertEmployeeTask = typeof employeeTasksTable.$inferInsert;

// Database User type (from Drizzle)
type DBUser = typeof users.$inferSelect;

// Safe User type (without password) for API responses
export type SafeUser = {
  id: string;
  userId: string;
  username: string;
  name: string;
  email: string;
  position: string;
  passwordHint: string | null;
  createdAt: string;
};

export interface IStorage {
  // ==================
  // Authentication & Users
  // ==================
  getUserById(id: string): Promise<SafeUser | undefined>;
  getUserByUsername(username: string): Promise<DBUser | undefined>;
  createUser(username: string, password: string, name: string, email: string, position: string, passwordHint?: string): Promise<SafeUser>;
  updateUser(id: string, updates: Partial<Omit<SafeUser, 'id'>>): Promise<SafeUser>;
  updateUserPassword(id: string, newPassword: string, passwordHint?: string): Promise<void>;
  deleteUser(id: string): Promise<void>;
  getAllUsers(): Promise<SafeUser[]>;
  authenticateUser(username: string, password: string): Promise<SafeUser | null>;
  
  // ==================
  // Companies
  // ==================
  getCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<Company>;
  deleteCompany(id: string): Promise<void>;
  
  // ==================
  // Tasks
  // ==================
  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  getTasksByCompany(companyId: string): Promise<Task[]>;
  getTaskByUniqueKey(uniqueKey: string): Promise<Task | undefined>;
  upsertTask(task: InsertTask): Promise<{ task: Task; wasCreated: boolean }>;
  updateTaskStatus(id: string, status: Task["status"], reason?: string): Promise<Task>;
  cancelCompanyTasks(companyId: string): Promise<void>;
  markTaskAsReviewed(id: string, note?: string): Promise<Task>;
  reopenTask(id: string, reopenedById: string, reopenedByName: string, reason?: string): Promise<Task>;
  
  // Audit trail
  createAuditLog(audit: InsertTaskAudit): Promise<TaskAudit>;
  getAuditLogs(): Promise<TaskAudit[]>;
  getAuditLogsByTask(taskId: string): Promise<TaskAudit[]>;
  getAuditLogsByCompany(companyId: string): Promise<TaskAudit[]>;
  
  // ==================
  // Employees
  // ==================
  getEmployees(): Promise<Employee[]>;
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeesByCompany(companyId: string): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee>;
  deleteEmployee(id: string): Promise<void>;
  
  // ==================
  // Employee Tasks
  // ==================
  getEmployeeTasks(): Promise<EmployeeTask[]>;
  getEmployeeTask(id: string): Promise<EmployeeTask | undefined>;
  getEmployeeTaskByUniqueKey(uniqueKey: string): Promise<EmployeeTask | undefined>;
  getEmployeeTasksByEmployee(employeeId: string): Promise<EmployeeTask[]>;
  getEmployeeTasksByCompany(companyId: string): Promise<EmployeeTask[]>;
  createEmployeeTask(task: InsertEmployeeTask): Promise<EmployeeTask>;
  updateEmployeeTask(id: string, updates: Partial<InsertEmployeeTask>): Promise<EmployeeTask>;
  updateEmployeeTaskStatus(id: string, status: EmployeeTask["status"], note?: string): Promise<EmployeeTask>;
  deleteEmployeeTask(id: string): Promise<void>;
  reopenEmployeeTask(id: string, reopenedById: string, reopenedByName: string, reason?: string): Promise<EmployeeTask>;
  
  // ==================
  // HR Task Templates
  // ==================
  getHRTaskTemplates(): Promise<HRTaskTemplate[]>;
  getHRTaskTemplate(id: string): Promise<HRTaskTemplate | undefined>;
  createHRTaskTemplate(template: InsertHRTaskTemplate): Promise<HRTaskTemplate>;
  updateHRTaskTemplate(id: string, updates: Partial<InsertHRTaskTemplate>): Promise<HRTaskTemplate>;
  deleteHRTaskTemplate(id: string): Promise<void>;
  
  // ==================
  // Leaver Task Templates
  // ==================
  getLeaverTaskTemplates(): Promise<LeaverTaskTemplate[]>;
  getLeaverTaskTemplate(id: string): Promise<LeaverTaskTemplate | undefined>;
  createLeaverTaskTemplate(template: InsertLeaverTaskTemplate): Promise<LeaverTaskTemplate>;
  updateLeaverTaskTemplate(id: string, updates: Partial<InsertLeaverTaskTemplate>): Promise<LeaverTaskTemplate>;
  deleteLeaverTaskTemplate(id: string): Promise<void>;

  // ==================
  // Residency Task Templates
  // ==================
  getResidencyTaskTemplates(): Promise<ResidencyTaskTemplate[]>;
  getResidencyTaskTemplate(id: string): Promise<ResidencyTaskTemplate | undefined>;
  createResidencyTaskTemplate(template: InsertResidencyTaskTemplate): Promise<ResidencyTaskTemplate>;
  updateResidencyTaskTemplate(id: string, updates: Partial<InsertResidencyTaskTemplate>): Promise<ResidencyTaskTemplate>;
  deleteResidencyTaskTemplate(id: string): Promise<void>;
  
  // ==================
  // SL Prep Tasks
  // ==================
  getSLPrepTasks(): Promise<SLPrepTask[]>;
  getSLPrepTask(id: string): Promise<SLPrepTask | undefined>;
  createSLPrepTask(task: InsertSLPrepTask): Promise<SLPrepTask>;
  updateSLPrepTask(id: string, updates: Partial<InsertSLPrepTask>): Promise<SLPrepTask>;
  deleteSLPrepTask(id: string): Promise<void>;
  
  // ==================
  // System Settings
  // ==================
  getSystemSetting(key: string): Promise<string | null>;
  setSystemSetting(key: string, value: string): Promise<void>;
  
  // ==================
  // Deletion Requests
  // ==================
  getDeletionRequests(): Promise<DeletionRequest[]>;
  getPendingDeletionRequests(): Promise<DeletionRequest[]>;
  getDeletionRequest(id: string): Promise<DeletionRequest | undefined>;
  createDeletionRequest(request: InsertDeletionRequest): Promise<DeletionRequest>;
  approveDeletionRequest(id: string, reviewedBy: string, reviewedByName: string, reviewNotes?: string): Promise<DeletionRequest>;
  rejectDeletionRequest(id: string, reviewedBy: string, reviewedByName: string, reviewNotes?: string): Promise<DeletionRequest>;
  
  // ==================
  // General Log (Audit Trail)
  // ==================
  getGeneralLogs(limit?: number): Promise<GeneralLog[]>;
  getGeneralLogsPaginated(params: {
    page: number;
    pageSize: number;
    action?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<{
    items: GeneralLog[];
    total: number;
    page: number;
    pageSize: number;
  }>;
  createGeneralLog(log: InsertGeneralLog): Promise<GeneralLog>;
  getGeneralLogsByTarget(targetId: string, limit?: number): Promise<GeneralLog[]>;
  getGeneralLogsByCategory(category: string, limit?: number): Promise<GeneralLog[]>;

  // ==================
  // SL Training
  // ==================
  getSlTrainingModules(): Promise<SlTrainingModule[]>;
  getSlTrainingModule(id: string): Promise<SlTrainingModule | undefined>;
  createSlTrainingModule(module: InsertSlTrainingModule): Promise<SlTrainingModule>;
  updateSlTrainingModule(id: string, updates: Partial<InsertSlTrainingModule>): Promise<SlTrainingModule>;
  deleteSlTrainingModule(id: string): Promise<void>;
  
  getSlTrainingQuestions(moduleId: string): Promise<SlTrainingQuestion[]>;
  createSlTrainingQuestions(questions: InsertSlTrainingQuestion[]): Promise<SlTrainingQuestion[]>;
  deleteSlTrainingQuestions(moduleId: string): Promise<void>;
  
  getSlTrainingScores(userId: string): Promise<SlTrainingScore[]>;
  getSlTrainingScore(userId: string, moduleId: string): Promise<SlTrainingScore | undefined>;
  upsertSlTrainingScore(score: InsertSlTrainingScore): Promise<SlTrainingScore>;
}

// ==================
// Database Storage Implementation
// ==================
export class DatabaseStorage implements IStorage {
  private readonly SALT_ROUNDS = 10;

  // Helper to convert DB user to safe user (remove password, convert date)
  private toSafeUser(user: DBUser): SafeUser {
    return {
      id: user.id,
      userId: user.userId,
      username: user.username,
      name: user.name,
      email: user.email,
      position: user.position,
      passwordHint: user.passwordHint,
      createdAt: user.createdAt.toISOString(),
    };
  }

  // Helper to generate next userId (USR-001, USR-002, etc.)
  private async generateNextUserId(): Promise<string> {
    const allUsers = await db.select().from(users);
    if (allUsers.length === 0) {
      return "USR-001";
    }
    
    const numbers = allUsers
      .map(u => parseInt(u.userId.replace("USR-", "")))
      .filter(n => !isNaN(n));
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    
    return `USR-${String(nextNumber).padStart(3, "0")}`;
  }

  // ==================
  // Authentication & Users
  // ==================
  async getUserById(id: string): Promise<SafeUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ? this.toSafeUser(user) : undefined;
  }

  async getUserByUsername(username: string): Promise<DBUser | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(
    username: string,
    password: string,
    name: string,
    email: string,
    position: string,
    passwordHint?: string
  ): Promise<SafeUser> {
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
    const userId = await this.generateNextUserId();

    const [newUser] = await db
      .insert(users)
      .values({
        userId,
        username,
        password: hashedPassword,
        name,
        email,
        position,
        passwordHint: passwordHint || null,
      })
      .returning();

    return this.toSafeUser(newUser);
  }

  async updateUser(id: string, updates: Partial<Omit<SafeUser, 'id'>>): Promise<SafeUser> {
    const [updatedUser] = await db
      .update(users)
      .set(updates as any)
      .where(eq(users.id, id))
      .returning();

    if (!updatedUser) {
      throw new Error("User not found");
    }

    return this.toSafeUser(updatedUser);
  }

  async updateUserPassword(id: string, newPassword: string, passwordHint?: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    const updateData: any = { password: hashedPassword };
    
    if (passwordHint !== undefined) {
      updateData.passwordHint = passwordHint;
    }

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const allUsers = await db.select().from(users);
    return allUsers.map(u => this.toSafeUser(u));
  }

  async authenticateUser(username: string, password: string): Promise<SafeUser | null> {
    const user = await this.getUserByUsername(username);

    if (!user) {
      console.log(`[AUTH] User not found: ${username}`);
      return null;
    }

    console.log(`[AUTH] User found: ${username}`);
    console.log(`[AUTH] Password length: ${password.length}, Hash length: ${user.password.length}`);
    console.log(`[AUTH] Hash type: ${typeof user.password}`);
    console.log(`[AUTH] Hash starts with: ${user.password.substring(0, 20)}`);

    const isValid = await bcrypt.compare(password, user.password);

    console.log(`[AUTH] Bcrypt compare result: ${isValid}`);

    if (!isValid) {
      console.log(`[AUTH] Password verification failed for user: ${username}`);
      return null;
    }

    console.log(`[AUTH] Authentication successful for user: ${username}`);
    return this.toSafeUser(user);
  }

  // ==================
  // Companies (PostgreSQL database)
  // ==================
  async getCompanies(): Promise<Company[]> {
    const allCompanies = await db.select().from(companies);
    return allCompanies;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db
      .insert(companies)
      .values(company)
      .returning();
    return newCompany;
  }

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const [updatedCompany] = await db
      .update(companies)
      .set(updates)
      .where(eq(companies.id, id))
      .returning();

    if (!updatedCompany) {
      throw new Error("Company not found");
    }

    return updatedCompany;
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  // ==================
  // Tasks (PostgreSQL database)
  // ==================
  async getTasks(): Promise<Task[]> {
    const allTasks = await db.select().from(tasksTable);
    return allTasks;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, id));
    return task || undefined;
  }

  async getTasksByCompany(companyId: string): Promise<Task[]> {
    const companyTasks = await db.select().from(tasksTable).where(eq(tasksTable.companyId, companyId));
    return companyTasks;
  }

  async getTaskByUniqueKey(uniqueKey: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.uniqueKey, uniqueKey));
    return task || undefined;
  }

  async upsertTask(task: InsertTask): Promise<{ task: Task; wasCreated: boolean }> {
    // Ensure dueAt is a proper Date object (may arrive as ISO string from task generators)
    const dueAtDate = task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt);

    // Check if task with this uniqueKey already exists
    const existing = await this.getTaskByUniqueKey(task.uniqueKey);

    if (existing) {
      // Normalize dates for comparison (convert both to ISO strings)
      const existingDueDate = new Date(existing.dueAt).toISOString();
      const newDueDate = dueAtDate.toISOString();

      // Check if due date has changed (e.g., from Companies House update)
      if (existingDueDate !== newDueDate) {
        // Update the due date to reflect the latest Companies House data
        const [updatedTask] = await db
          .update(tasksTable)
          .set({ dueAt: dueAtDate })
          .where(eq(tasksTable.id, existing.id))
          .returning();

        return { task: normalizeTask(updatedTask), wasCreated: false };
      }

      // Task already exists with same due date, return it (idempotent)
      return { task: normalizeTask(existing), wasCreated: false };
    }

    // Create new task with proper Date object
    const [newTask] = await db
      .insert(tasksTable)
      .values({ ...task, dueAt: dueAtDate })
      .returning();
    
    return { task: normalizeTask(newTask), wasCreated: true };
  }

  async updateTaskStatus(id: string, status: Task["status"], reason?: string): Promise<Task> {
    const task = await this.getTask(id);
    
    if (!task) {
      throw new Error("Task not found");
    }

    const fromStatus = task.status;

    // Update task status
    const [updatedTask] = await db
      .update(tasksTable)
      .set({ status })
      .where(eq(tasksTable.id, id))
      .returning();

    // Create audit log
    await this.createAuditLog({
      taskId: updatedTask.id,
      taskTitle: updatedTask.title,
      companyId: updatedTask.companyId,
      companyName: updatedTask.companyName,
      fromStatus,
      toStatus: status,
      reason,
      performedBy: "System",
      timestamp: new Date().toISOString(),
      meta: {},
    });

    return updatedTask;
  }

  async cancelCompanyTasks(companyId: string): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // Get all open tasks for this company
    const openTasks = await db
      .select()
      .from(tasksTable)
      .where(eq(tasksTable.companyId, companyId));

    // Update all open tasks to cancelled
    for (const task of openTasks) {
      if (task.status === "open") {
        await db
          .update(tasksTable)
          .set({ status: "cancelled" })
          .where(eq(tasksTable.id, task.id));

        // Create audit log
        await this.createAuditLog({
          taskId: task.id,
          taskTitle: task.title,
          companyId: task.companyId,
          companyName: task.companyName,
          fromStatus: task.status,
          toStatus: "cancelled",
          reason: "Company deactivated or renewal date changed",
          performedBy: "System",
          timestamp,
          meta: {},
        });
      }
    }
  }

  async markTaskAsReviewed(id: string, note?: string): Promise<Task> {
    const task = await this.getTask(id);
    
    if (!task) {
      throw new Error("Task not found");
    }
    
    if (task.status !== "done" && task.status !== "cancelled") {
      throw new Error("Only done or cancelled tasks can be reviewed");
    }

    const result = await db
      .update(tasksTable)
      .set({
        reviewed: true,
        reviewedAt: new Date(),
        reviewerNote: note || null,
      })
      .where(eq(tasksTable.id, id))
      .returning();

    const updatedTask = result?.[0];
    if (!updatedTask) {
      throw new Error("Failed to update task");
    }

    return normalizeTask(updatedTask);
  }

  async reopenTask(id: string, reopenedById: string, reopenedByName: string, reason?: string): Promise<Task> {
    const task = await this.getTask(id);
    
    if (!task) {
      throw new Error("Task not found");
    }
    
    if (task.status !== "done" && task.status !== "cancelled") {
      throw new Error("Only done or cancelled tasks can be reopened");
    }

    const oldStatus = task.status;

    // Update task atomically: reset status and clear review metadata
    const result = await db
      .update(tasksTable)
      .set({
        status: "open",
        reviewed: false,
        reviewedAt: null,
        reviewerNote: null,
      })
      .where(eq(tasksTable.id, id))
      .returning();

    const rawTask = result?.[0];
    if (!rawTask) {
      throw new Error("Failed to reopen task");
    }
    
    const updatedTask = normalizeTask(rawTask);

    // Create audit log entry
    await this.createAuditLog({
      id: crypto.randomUUID(),
      taskId: id,
      action: "reopened",
      performedBy: reopenedByName,
      oldValue: oldStatus,
      newValue: "open",
      reason: reason || `Task reopened by ${reopenedByName}`,
      timestamp: new Date().toISOString(),
    });

    return updatedTask;
  }

  async createAuditLog(audit: InsertTaskAudit): Promise<TaskAudit> {
    // Ensure timestamp is a proper Date object
    const values = {
      ...audit,
      timestamp: audit.timestamp instanceof Date ? audit.timestamp : new Date(audit.timestamp || Date.now()),
    };
    const [newAudit] = await db
      .insert(taskAuditsTable)
      .values(values)
      .returning();

    return newAudit;
  }

  async getAuditLogs(): Promise<TaskAudit[]> {
    const audits = await db.select().from(taskAuditsTable);
    // Sort by timestamp descending (newest first)
    return audits.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getAuditLogsByTask(taskId: string): Promise<TaskAudit[]> {
    const audits = await db.select().from(taskAuditsTable).where(eq(taskAuditsTable.taskId, taskId));
    return audits.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  async getAuditLogsByCompany(companyId: string): Promise<TaskAudit[]> {
    const audits = await db.select().from(taskAuditsTable).where(eq(taskAuditsTable.companyId, companyId));
    return audits.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // ==================
  // Employees (PostgreSQL database)
  // ==================
  async getEmployees(): Promise<Employee[]> {
    const allEmployees = await db.select().from(employeesTable);
    return allEmployees;
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    return employee || undefined;
  }

  async getEmployeesByCompany(companyId: string): Promise<Employee[]> {
    const companyEmployees = await db.select().from(employeesTable).where(eq(employeesTable.companyId, companyId));
    return companyEmployees;
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const [newEmployee] = await db
      .insert(employeesTable)
      .values(employee)
      .returning();
    return newEmployee;
  }

  async updateEmployee(id: string, updates: Partial<InsertEmployee>): Promise<Employee> {
    const [updatedEmployee] = await db
      .update(employeesTable)
      .set(updates)
      .where(eq(employeesTable.id, id))
      .returning();

    if (!updatedEmployee) {
      throw new Error("Employee not found");
    }

    return updatedEmployee;
  }

  async deleteEmployee(id: string): Promise<void> {
    await db.delete(employeesTable).where(eq(employeesTable.id, id));
  }

  // ==================
  // Employee Tasks (PostgreSQL database)
  // ==================
  async getEmployeeTasks(): Promise<EmployeeTask[]> {
    const allTasks = await db.select().from(employeeTasksTable);
    return allTasks;
  }

  async getEmployeeTask(id: string): Promise<EmployeeTask | undefined> {
    const [task] = await db.select().from(employeeTasksTable).where(eq(employeeTasksTable.id, id));
    return task || undefined;
  }

  async getEmployeeTaskByUniqueKey(uniqueKey: string): Promise<EmployeeTask | undefined> {
    const [task] = await db.select().from(employeeTasksTable).where(eq(employeeTasksTable.uniqueKey, uniqueKey));
    return task || undefined;
  }

  async getEmployeeTasksByEmployee(employeeId: string): Promise<EmployeeTask[]> {
    const tasks = await db.select().from(employeeTasksTable).where(eq(employeeTasksTable.employeeId, employeeId));
    return tasks;
  }

  async getEmployeeTasksByCompany(companyId: string): Promise<EmployeeTask[]> {
    const tasks = await db.select().from(employeeTasksTable).where(eq(employeeTasksTable.companyId, companyId));
    return tasks;
  }

  async createEmployeeTask(task: InsertEmployeeTask): Promise<EmployeeTask> {
    // Ensure timestamp fields are proper Date objects
    const values = {
      ...task,
      dueAt: task.dueAt instanceof Date ? task.dueAt : new Date(task.dueAt),
      completedAt: task.completedAt ? (task.completedAt instanceof Date ? task.completedAt : new Date(task.completedAt)) : undefined,
    };
    const [newTask] = await db
      .insert(employeeTasksTable)
      .values(values)
      .returning();
    return newTask;
  }

  async updateEmployeeTask(id: string, updates: Partial<InsertEmployeeTask>): Promise<EmployeeTask> {
    // Ensure timestamp fields are proper Date objects
    const safeUpdates = { ...updates } as any;
    if (safeUpdates.dueAt && !(safeUpdates.dueAt instanceof Date)) safeUpdates.dueAt = new Date(safeUpdates.dueAt);
    if (safeUpdates.completedAt && !(safeUpdates.completedAt instanceof Date)) safeUpdates.completedAt = new Date(safeUpdates.completedAt);
    const [updatedTask] = await db
      .update(employeeTasksTable)
      .set(safeUpdates)
      .where(eq(employeeTasksTable.id, id))
      .returning();

    if (!updatedTask) {
      throw new Error("Employee task not found");
    }

    return updatedTask;
  }

  async updateEmployeeTaskStatus(id: string, status: EmployeeTask["status"], note?: string): Promise<EmployeeTask> {
    const updates: Partial<EmployeeTask> = { status };
    
    // Set completedAt timestamp when task is completed
    if (status === "completed") {
      updates.completedAt = new Date();
      if (note) {
        updates.completionNote = note;
      }
    } else if (status === "cancelled" && note) {
      updates.cancelReason = note;
    }

    const [updatedTask] = await db
      .update(employeeTasksTable)
      .set(updates)
      .where(eq(employeeTasksTable.id, id))
      .returning();

    if (!updatedTask) {
      throw new Error("Employee task not found");
    }

    return updatedTask;
  }

  async reopenEmployeeTask(id: string, reopenedById: string, reopenedByName: string, reason?: string): Promise<EmployeeTask> {
    const task = await this.getEmployeeTask(id);
    
    if (!task) {
      throw new Error("Employee task not found");
    }
    
    if (task.status !== "completed" && task.status !== "cancelled" && task.status !== "skipped") {
      throw new Error("Only completed, cancelled, or skipped tasks can be reopened");
    }

    const oldStatus = task.status;

    // Update task atomically: reset status and clear all completion metadata
    const [updatedTask] = await db
      .update(employeeTasksTable)
      .set({
        status: "open",
        reviewed: false,
        reviewerNote: null,
        completedAt: null,
        completionNote: null,
        cancelReason: null,
      })
      .where(eq(employeeTasksTable.id, id))
      .returning();

    // Create general log entry for audit trail
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
        reason: reason || `Task reopened by ${reopenedByName}`,
      },
      timestamp: new Date().toISOString(),
    });

    return updatedTask;
  }

  async deleteEmployeeTask(id: string): Promise<void> {
    await db.delete(employeeTasksTable).where(eq(employeeTasksTable.id, id));
  }
  
  // ==================
  // HR Task Templates
  // ==================
  async getHRTaskTemplates(): Promise<HRTaskTemplate[]> {
    const templates = await db.select().from(hrTaskTemplatesTable);
    return templates.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }));
  }
  
  async getHRTaskTemplate(id: string): Promise<HRTaskTemplate | undefined> {
    const [template] = await db.select().from(hrTaskTemplatesTable).where(eq(hrTaskTemplatesTable.id, id));
    if (!template) return undefined;
    return {
      ...template,
      createdAt: template.createdAt.toISOString(),
    };
  }
  
  async createHRTaskTemplate(template: InsertHRTaskTemplate): Promise<HRTaskTemplate> {
    const [newTemplate] = await db
      .insert(hrTaskTemplatesTable)
      .values(template)
      .returning();
    return {
      ...newTemplate,
      createdAt: newTemplate.createdAt.toISOString(),
    };
  }
  
  async updateHRTaskTemplate(id: string, updates: Partial<InsertHRTaskTemplate>): Promise<HRTaskTemplate> {
    const [updated] = await db
      .update(hrTaskTemplatesTable)
      .set(updates)
      .where(eq(hrTaskTemplatesTable.id, id))
      .returning();
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    };
  }
  
  async deleteHRTaskTemplate(id: string): Promise<void> {
    await db.delete(hrTaskTemplatesTable).where(eq(hrTaskTemplatesTable.id, id));
  }

  // ==================
  // Leaver Task Templates
  // ==================
  async getLeaverTaskTemplates(): Promise<LeaverTaskTemplate[]> {
    const templates = await db.select().from(leaverTaskTemplatesTable);
    return templates.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async getLeaverTaskTemplate(id: string): Promise<LeaverTaskTemplate | undefined> {
    const [template] = await db.select().from(leaverTaskTemplatesTable).where(eq(leaverTaskTemplatesTable.id, id));
    if (!template) return undefined;
    return {
      ...template,
      createdAt: template.createdAt.toISOString(),
    };
  }

  async createLeaverTaskTemplate(template: InsertLeaverTaskTemplate): Promise<LeaverTaskTemplate> {
    const [newTemplate] = await db
      .insert(leaverTaskTemplatesTable)
      .values(template)
      .returning();
    return {
      ...newTemplate,
      createdAt: newTemplate.createdAt.toISOString(),
    };
  }

  async updateLeaverTaskTemplate(id: string, updates: Partial<InsertLeaverTaskTemplate>): Promise<LeaverTaskTemplate> {
    const [updated] = await db
      .update(leaverTaskTemplatesTable)
      .set(updates)
      .where(eq(leaverTaskTemplatesTable.id, id))
      .returning();
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async deleteLeaverTaskTemplate(id: string): Promise<void> {
    await db.delete(leaverTaskTemplatesTable).where(eq(leaverTaskTemplatesTable.id, id));
  }

  // ==================
  // Residency Task Templates
  // ==================
  async getResidencyTaskTemplates(): Promise<ResidencyTaskTemplate[]> {
    const templates = await db.select().from(residencyTaskTemplatesTable);
    return templates.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }));
  }
  
  async getResidencyTaskTemplate(id: string): Promise<ResidencyTaskTemplate | undefined> {
    const [template] = await db.select().from(residencyTaskTemplatesTable).where(eq(residencyTaskTemplatesTable.id, id));
    if (!template) return undefined;
    return {
      ...template,
      createdAt: template.createdAt.toISOString(),
    };
  }
  
  async createResidencyTaskTemplate(template: InsertResidencyTaskTemplate): Promise<ResidencyTaskTemplate> {
    const [newTemplate] = await db
      .insert(residencyTaskTemplatesTable)
      .values(template)
      .returning();
    return {
      ...newTemplate,
      createdAt: newTemplate.createdAt.toISOString(),
    };
  }
  
  async updateResidencyTaskTemplate(id: string, updates: Partial<InsertResidencyTaskTemplate>): Promise<ResidencyTaskTemplate> {
    const [updated] = await db
      .update(residencyTaskTemplatesTable)
      .set(updates)
      .where(eq(residencyTaskTemplatesTable.id, id))
      .returning();
    return {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    };
  }
  
  async deleteResidencyTaskTemplate(id: string): Promise<void> {
    await db.delete(residencyTaskTemplatesTable).where(eq(residencyTaskTemplatesTable.id, id));
  }
  
  // ==================
  // SL Prep Tasks
  // ==================
  async getSLPrepTasks(): Promise<SLPrepTask[]> {
    const tasks = await db.select().from(slPrepTasks).orderBy(slPrepTasks.order);
    return tasks.map(t => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }));
  }

  async getSLPrepTask(id: string): Promise<SLPrepTask | undefined> {
    const [task] = await db.select().from(slPrepTasks).where(eq(slPrepTasks.id, id));
    return task ? {
      ...task,
      createdAt: task.createdAt.toISOString(),
    } : undefined;
  }

  async createSLPrepTask(taskData: InsertSLPrepTask): Promise<SLPrepTask> {
    const [newTask] = await db.insert(slPrepTasks).values(taskData).returning();
    return {
      ...newTask,
      createdAt: newTask.createdAt.toISOString(),
    };
  }

  async updateSLPrepTask(id: string, updates: Partial<InsertSLPrepTask>): Promise<SLPrepTask> {
    const [updatedTask] = await db
      .update(slPrepTasks)
      .set(updates)
      .where(eq(slPrepTasks.id, id))
      .returning();
    
    if (!updatedTask) {
      throw new Error("SL Prep Task not found");
    }
    
    return {
      ...updatedTask,
      createdAt: updatedTask.createdAt.toISOString(),
    };
  }

  async deleteSLPrepTask(id: string): Promise<void> {
    await db.delete(slPrepTasks).where(eq(slPrepTasks.id, id));
  }
  
  // ==================
  // System Settings
  // ==================
  async getSystemSetting(key: string): Promise<string | null> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting?.value ?? null;
  }

  async setSystemSetting(key: string, value: string): Promise<void> {
    const existing = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    
    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemSettings.key, key));
    } else {
      await db.insert(systemSettings).values({ key, value });
    }
  }
  
  // ==================
  // Deletion Requests
  // ==================
  async getDeletionRequests(): Promise<DeletionRequest[]> {
    const requests = await db.select().from(deletionRequestsTable).orderBy(desc(deletionRequestsTable.requestedAt));
    return requests.map(r => ({
      ...r,
      requestedAt: r.requestedAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    }));
  }

  async getPendingDeletionRequests(): Promise<DeletionRequest[]> {
    const requests = await db
      .select()
      .from(deletionRequestsTable)
      .where(eq(deletionRequestsTable.status, "pending"))
      .orderBy(desc(deletionRequestsTable.requestedAt));
    
    return requests.map(r => ({
      ...r,
      requestedAt: r.requestedAt.toISOString(),
      reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    }));
  }

  async getDeletionRequest(id: string): Promise<DeletionRequest | undefined> {
    const [request] = await db.select().from(deletionRequestsTable).where(eq(deletionRequestsTable.id, id));
    if (!request) return undefined;
    
    return {
      ...request,
      requestedAt: request.requestedAt.toISOString(),
      reviewedAt: request.reviewedAt ? request.reviewedAt.toISOString() : null,
    };
  }

  async createDeletionRequest(requestData: InsertDeletionRequest): Promise<DeletionRequest> {
    const [newRequest] = await db.insert(deletionRequestsTable).values(requestData).returning();
    return {
      ...newRequest,
      requestedAt: newRequest.requestedAt.toISOString(),
      reviewedAt: newRequest.reviewedAt ? newRequest.reviewedAt.toISOString() : null,
    };
  }

  async approveDeletionRequest(
    id: string, 
    reviewedBy: string, 
    reviewedByName: string, 
    reviewNotes?: string
  ): Promise<DeletionRequest> {
    const [updated] = await db
      .update(deletionRequestsTable)
      .set({
        status: "approved",
        reviewedBy,
        reviewedByName,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(deletionRequestsTable.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Deletion request not found");
    }
    
    return {
      ...updated,
      requestedAt: updated.requestedAt.toISOString(),
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
    };
  }

  async rejectDeletionRequest(
    id: string, 
    reviewedBy: string, 
    reviewedByName: string, 
    reviewNotes?: string
  ): Promise<DeletionRequest> {
    const [updated] = await db
      .update(deletionRequestsTable)
      .set({
        status: "rejected",
        reviewedBy,
        reviewedByName,
        reviewedAt: new Date(),
        reviewNotes,
      })
      .where(eq(deletionRequestsTable.id, id))
      .returning();
    
    if (!updated) {
      throw new Error("Deletion request not found");
    }
    
    return {
      ...updated,
      requestedAt: updated.requestedAt.toISOString(),
      reviewedAt: updated.reviewedAt ? updated.reviewedAt.toISOString() : null,
    };
  }
  
  // ==================
  // General Log (Audit Trail)
  // ==================
  async getGeneralLogs(limit: number = 100): Promise<GeneralLog[]> {
    const logs = await db
      .select()
      .from(generalLogTable)
      .orderBy(desc(generalLogTable.timestamp))
      .limit(limit);
    
    return logs.map(log => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    }));
  }

  async getGeneralLogsPaginated(params: {
    page: number;
    pageSize: number;
    action?: string;
    category?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  }): Promise<{
    items: GeneralLog[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const { page, pageSize, action, category, dateFrom, dateTo, search } = params;
    const offset = (page - 1) * pageSize;

    // Build where conditions array
    const conditions = [];
    
    if (action) {
      conditions.push(eq(generalLogTable.action, action));
    }
    
    if (category) {
      conditions.push(eq(generalLogTable.category, category));
    }
    
    if (dateFrom) {
      conditions.push(gte(generalLogTable.timestamp, new Date(dateFrom)));
    }
    
    if (dateTo) {
      conditions.push(lte(generalLogTable.timestamp, new Date(dateTo)));
    }
    
    if (search) {
      // Search in targetName and details fields
      conditions.push(
        sql`(${generalLogTable.targetName} ILIKE ${'%' + search + '%'} OR ${generalLogTable.details} ILIKE ${'%' + search + '%'})`
      );
    }

    // Build where clause (use 'and' if we have multiple conditions)
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [{ value: total }] = await db
      .select({ value: count() })
      .from(generalLogTable)
      .where(whereClause);

    // Get paginated results
    const logs = await db
      .select()
      .from(generalLogTable)
      .where(whereClause)
      .orderBy(desc(generalLogTable.timestamp))
      .limit(pageSize)
      .offset(offset);

    return {
      items: logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
      total: Number(total),
      page,
      pageSize,
    };
  }

  async createGeneralLog(logData: InsertGeneralLog): Promise<GeneralLog> {
    const [newLog] = await db.insert(generalLogTable).values(logData).returning();
    return {
      ...newLog,
      timestamp: newLog.timestamp.toISOString(),
    };
  }

  async getGeneralLogsByTarget(targetId: string, limit: number = 100): Promise<GeneralLog[]> {
    const logs = await db
      .select()
      .from(generalLogTable)
      .where(eq(generalLogTable.targetId, targetId))
      .orderBy(desc(generalLogTable.timestamp))
      .limit(limit);
    return logs.map(log => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    }));
  }

  async getGeneralLogsByCategory(category: string, limit: number = 100): Promise<GeneralLog[]> {
    const logs = await db
      .select()
      .from(generalLogTable)
      .where(eq(generalLogTable.category, category))
      .orderBy(desc(generalLogTable.timestamp))
      .limit(limit);
    return logs.map(log => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    }));
  }

  // ==================
  // SL Training
  // ==================
  async getSlTrainingModules(): Promise<SlTrainingModule[]> {
    const modules = await db.select().from(slTrainingModules).orderBy(desc(slTrainingModules.createdAt));
    return modules.map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async getSlTrainingModule(id: string): Promise<SlTrainingModule | undefined> {
    const [module] = await db.select().from(slTrainingModules).where(eq(slTrainingModules.id, id));
    if (!module) return undefined;
    return {
      ...module,
      createdAt: module.createdAt.toISOString(),
    };
  }

  async createSlTrainingModule(module: InsertSlTrainingModule): Promise<SlTrainingModule> {
    const [newModule] = await db.insert(slTrainingModules).values(module).returning();
    return {
      ...newModule,
      createdAt: newModule.createdAt.toISOString(),
    };
  }

  async updateSlTrainingModule(id: string, updates: Partial<InsertSlTrainingModule>): Promise<SlTrainingModule> {
    const [updatedModule] = await db.update(slTrainingModules).set(updates).where(eq(slTrainingModules.id, id)).returning();
    if (!updatedModule) throw new Error("Module not found");
    return {
      ...updatedModule,
      createdAt: updatedModule.createdAt.toISOString(),
    };
  }

  async deleteSlTrainingModule(id: string): Promise<void> {
    await db.delete(slTrainingModules).where(eq(slTrainingModules.id, id));
  }

  async getSlTrainingQuestions(moduleId: string): Promise<SlTrainingQuestion[]> {
    return await db.select().from(slTrainingQuestions).where(eq(slTrainingQuestions.moduleId, moduleId)).orderBy(slTrainingQuestions.orderIndex);
  }

  async createSlTrainingQuestions(questions: InsertSlTrainingQuestion[]): Promise<SlTrainingQuestion[]> {
    if (questions.length === 0) return [];
    const newQuestions = await db.insert(slTrainingQuestions).values(questions).returning();
    return newQuestions;
  }

  async deleteSlTrainingQuestions(moduleId: string): Promise<void> {
    await db.delete(slTrainingQuestions).where(eq(slTrainingQuestions.moduleId, moduleId));
  }

  async getSlTrainingScores(userId: string): Promise<SlTrainingScore[]> {
    const scores = await db.select().from(slTrainingScores).where(eq(slTrainingScores.userId, userId));
    return scores.map(s => ({
      ...s,
      completedAt: s.completedAt.toISOString(),
    }));
  }

  async getSlTrainingScore(userId: string, moduleId: string): Promise<SlTrainingScore | undefined> {
    const [score] = await db.select().from(slTrainingScores)
      .where(and(eq(slTrainingScores.userId, userId), eq(slTrainingScores.moduleId, moduleId)));
    if (!score) return undefined;
    return {
      ...score,
      completedAt: score.completedAt.toISOString(),
    };
  }

  async upsertSlTrainingScore(scoreData: InsertSlTrainingScore): Promise<SlTrainingScore> {
    // Check if score exists for this user and module
    const existing = await this.getSlTrainingScore(scoreData.userId, scoreData.moduleId);
    
    if (existing) {
      // Update existing score
      const [updated] = await db.update(slTrainingScores)
        .set({
          score: scoreData.score,
          totalQuestions: scoreData.totalQuestions,
          correctAnswers: scoreData.correctAnswers,
          lastAnswers: scoreData.lastAnswers,
          completedAt: new Date(),
        })
        .where(eq(slTrainingScores.id, existing.id))
        .returning();
      return {
        ...updated,
        completedAt: updated.completedAt.toISOString(),
      };
    } else {
      // Create new score
      const [newScore] = await db.insert(slTrainingScores).values(scoreData).returning();
      return {
        ...newScore,
        completedAt: newScore.completedAt.toISOString(),
      };
    }
  }
}

// Export DatabaseStorage as a lazy singleton (for serverless compatibility)
let storageInstance: DatabaseStorage | null = null;

export function getStorage(): DatabaseStorage {
  if (!storageInstance) {
    storageInstance = new DatabaseStorage();
  }
  return storageInstance;
}

// For backward compatibility, export as a getter property
export const storage = new Proxy({} as any, {
  get: (target, prop, receiver) => {
    return getStorage()[prop as keyof DatabaseStorage];
  }
});
