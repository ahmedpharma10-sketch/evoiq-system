import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertCompanySchema, baseInsertCompanySchema, insertTaskSchema, type InsertCompany, insertEmployeeRecordSchema, draftEmployeeRecordSchema, completeEmployeeRecordSchema, sanitizeEmployeePayload, type InsertEmployeeRecord, insertEmployeeTaskSchema } from "@shared/schema";
import { requireAuth, requireAdmin } from "./middleware/auth";

/**
 * Calculate next renewal date from incorporation date
 * Returns ISO date string (YYYY-MM-DD) in Europe/London timezone
 */
function calculateRenewalDate(incorporationDate: string): string {
  const incDate = new Date(incorporationDate);
  const today = new Date();
  
  // Get this year's anniversary
  let nextRenewal = new Date(
    today.getFullYear(),
    incDate.getMonth(),
    incDate.getDate()
  );
  
  // If this year's anniversary has passed, use next year
  if (nextRenewal <= today) {
    nextRenewal = new Date(
      today.getFullYear() + 1,
      incDate.getMonth(),
      incDate.getDate()
    );
  }
  
  // Format as YYYY-MM-DD
  return nextRenewal.toISOString().split('T')[0];
}

export async function registerRoutes(app: Express): Promise<Server> {
  // ==================
  // Health Check (for Railway deployment)
  // ==================
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // ==================
  // Authentication & User Management Routes
  // ==================
  
  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = z.object({
        username: z.string().min(1),
        password: z.string().min(1),
      }).parse(req.body);

      const user = await storage.authenticateUser(username, password);

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Store user in session (secure, server-side)
      req.session.user = user;

      // CRITICAL: Save session before responding to ensure cookie is set
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Log login
      await storage.createGeneralLog({
        action: "user_login",
        category: "user",
        targetId: user.id,
        targetName: user.name,
        performedBy: user.id,
        performedByName: user.name,
        details: `User "${user.name}" (${user.username}) logged in`,
      });

      // Return user without password hint for security
      const { passwordHint: _, ...userWithoutHint } = user;
      res.json({ success: true, user: userWithoutHint });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Logout
  app.post("/api/auth/logout", async (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to logout" });
      }
      res.json({ success: true });
    });
  });

  // Verify current user's password (for destructive operations)
  app.post("/api/auth/verify-password", requireAuth, async (req, res) => {
    try {
      const { password } = z.object({
        password: z.string().min(1),
      }).parse(req.body);

      const user = await storage.getUserByUsername(req.session.user!.username);
      if (!user) {
        return res.json({ valid: false });
      }

      const result = await storage.authenticateUser(user.username, password);
      res.json({ valid: result !== null });
    } catch (error) {
      res.status(400).json({ valid: false });
    }
  });

  // Get current user from session
  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.user) {
      return res.json({ user: null });
    }

    // Return user without password hint
    const { passwordHint: _, ...userWithoutHint } = req.session.user;
    res.json({ user: userWithoutHint });
  });

  // Get password hint for a username (public endpoint for password recovery)
  app.post("/api/auth/password-hint", async (req, res) => {
    try {
      const { username } = z.object({
        username: z.string().min(1),
      }).parse(req.body);

      const user = await storage.getUserByUsername(username);
      
      if (!user || !user.passwordHint) {
        return res.status(404).json({ error: "No password hint available" });
      }

      // Only return the hint, not any other user data
      res.json({ hint: user.passwordHint });
    } catch (error) {
      res.status(400).json({ error: "Invalid request" });
    }
  });

  // ==================
  // Protected User Management Routes (Admin only)
  // ==================

  // Get all users (admin only - no password hints in response)
  app.get("/api/auth/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove password hints from all users for security
      const usersWithoutHints = users.map(({ passwordHint: _, ...user }) => user);
      res.json(usersWithoutHints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // Create new user (admin only)
  app.post("/api/auth/users", requireAdmin, async (req, res) => {
    try {
      const { username, password, name, email, position, passwordHint } = z.object({
        username: z.string().min(1),
        password: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email(),
        position: z.string().min(1),
        passwordHint: z.string().optional(),
      }).parse(req.body);

      // Check if username already exists
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser(username, password, name, email, position, passwordHint);

      // Log user creation
      const adminName = req.session?.user?.name || "System";
      const adminId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "user_created",
        category: "user",
        targetId: user.id,
        targetName: name,
        performedBy: adminId,
        performedByName: adminName,
        details: `User "${name}" (${username}) created with position "${position}"`,
      });

      // Remove password hint from response
      const { passwordHint: _, ...userWithoutHint } = user;
      res.status(201).json(userWithoutHint);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  // Update user (admin only, excluding password)
  app.patch("/api/auth/users/:id", requireAdmin, async (req, res) => {
    try {
      const updates = z.object({
        username: z.string().optional(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        position: z.string().optional(),
        passwordHint: z.string().optional(),
      }).parse(req.body);

      const user = await storage.updateUser(req.params.id, updates);

      // Log user update
      const adminName = req.session?.user?.name || "System";
      const adminId = req.session?.user?.id || "system";
      const changedFields = Object.keys(updates).filter(k => (updates as any)[k] !== undefined);
      await storage.createGeneralLog({
        action: "user_updated",
        category: "user",
        targetId: user.id,
        targetName: user.name,
        performedBy: adminId,
        performedByName: adminName,
        details: `User "${user.name}" updated. Fields: ${changedFields.join(', ')}`,
      });

      // Remove password hint from response
      const { passwordHint: _, ...userWithoutHint } = user;
      res.json(userWithoutHint);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Update user password (admin only)
  app.patch("/api/auth/users/:id/password", requireAdmin, async (req, res) => {
    try {
      const { newPassword, passwordHint } = z.object({
        newPassword: z.string().min(1),
        passwordHint: z.string().optional(),
      }).parse(req.body);

      const targetUser = await storage.getUserById(req.params.id);
      await storage.updateUserPassword(req.params.id, newPassword, passwordHint);

      // Log password change
      const adminName = req.session?.user?.name || "System";
      const adminId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "user_password_changed",
        category: "user",
        targetId: req.params.id,
        targetName: targetUser?.name || "Unknown",
        performedBy: adminId,
        performedByName: adminName,
        details: `Password changed for user "${targetUser?.name || req.params.id}"`,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  // Delete user (admin only)
  app.delete("/api/auth/users/:id", requireAdmin, async (req, res) => {
    try {
      const targetUser = await storage.getUserById(req.params.id);
      await storage.deleteUser(req.params.id);

      // Log user deletion
      const adminName = req.session?.user?.name || "System";
      const adminId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "user_deleted",
        category: "user",
        targetId: req.params.id,
        targetName: targetUser?.name || "Unknown",
        performedBy: adminId,
        performedByName: adminName,
        details: `User "${targetUser?.name || req.params.id}" deleted`,
      });

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // ==================
  // General Log (Audit Trail) Routes
  // ==================
  app.get("/api/admin/general-log", requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 25;
      const action = req.query.action as string | undefined;
      const category = req.query.category as string | undefined;
      const dateFrom = req.query.dateFrom as string | undefined;
      const dateTo = req.query.dateTo as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await storage.getGeneralLogsPaginated({
        page,
        pageSize,
        action,
        category,
        dateFrom,
        dateTo,
        search,
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch general logs" });
    }
  });

  // ==================
  // Company Routes
  // ==================
  
  app.get("/api/companies", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Get last Companies House sync timestamp (must be before :id route)
  app.get("/api/companies/last-sync", async (req, res) => {
    try {
      const timestamp = await storage.getSystemSetting("last_companies_house_sync");
      res.json({ timestamp });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch last sync timestamp" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
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

  app.post("/api/companies", async (req, res) => {
    try {
      const validatedData = insertCompanySchema.parse(req.body);

      // Auto-calculate renewalDate from incorporationDate if not provided
      if (validatedData.incorporationDate && !validatedData.renewalDate) {
        validatedData.renewalDate = calculateRenewalDate(validatedData.incorporationDate);
      }

      const company = await storage.createCompany(validatedData);

      // Log company creation
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "company_created",
        category: "company",
        targetId: company.id,
        targetName: company.name,
        performedBy: userId,
        performedByName: userName,
        details: `Company "${company.name}" (${company.number}) created`,
      });

      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.patch("/api/companies/:id", async (req, res) => {
    try {
      const updates = req.body;

      // Auto-calculate renewalDate if incorporationDate is being updated
      if (updates.incorporationDate && !updates.renewalDate) {
        updates.renewalDate = calculateRenewalDate(updates.incorporationDate);
      }

      const company = await storage.updateCompany(req.params.id, updates);

      // Log company update
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      const changedFields = Object.keys(updates).filter(k => k !== 'updatedAt').join(', ');
      await storage.createGeneralLog({
        action: "company_updated",
        category: "company",
        targetId: company.id,
        targetName: company.name,
        performedBy: userId,
        performedByName: userName,
        details: `Company "${company.name}" updated. Fields: ${changedFields}`,
        metadata: { changedFields: Object.keys(updates) },
      });

      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
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
        details: `Company "${company?.name || 'Unknown'}" (${company?.number || ''}) deleted`,
      });
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // Bulk import companies from CSV
  app.post("/api/companies/bulk-import", async (req, res) => {
    try {
      const { companies } = z.object({
        companies: z.array(insertCompanySchema).min(1),
      }).parse(req.body);

      const results = {
        successCount: 0,
        failureCount: 0,
        createdIds: [] as string[],
        errors: [] as Array<{ rowIndex?: number; companyNumber?: string; error: string }>,
      };

      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";

      // Process each company
      for (const companyData of companies) {
        try {
          // Validate against schema again (backend validation)
          const validatedData = insertCompanySchema.parse(companyData);

          // Auto-calculate renewalDate from incorporationDate if not provided
          if (validatedData.incorporationDate && !validatedData.renewalDate) {
            validatedData.renewalDate = calculateRenewalDate(validatedData.incorporationDate);
          }

          // Create company
          const company = await storage.createCompany(validatedData);
          results.createdIds.push(company.id);
          results.successCount++;

          // Log company creation
          await storage.createGeneralLog({
            action: "company_created_bulk",
            category: "company",
            targetId: company.id,
            targetName: company.name,
            performedBy: userId,
            performedByName: userName,
            details: `Company "${company.name}" (${company.number}) created via bulk import`,
            metadata: {
              bulkImport: true,
            },
          });
        } catch (error) {
          results.failureCount++;
          results.errors.push({
            companyNumber: companyData.number,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Log bulk import operation
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
            failureCount: results.failureCount,
          },
        });
      }

      res.status(201).json(results);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Invalid data";
      res.status(400).json({ error: errorMessage, message: errorMessage });
    }
  });

  app.post("/api/companies/fetch-by-number", async (req, res) => {
    try {
      const { companyNumber } = req.body;
      
      if (!companyNumber) {
        return res.status(400).json({ error: "Company number is required" });
      }

      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Companies House API key not configured" });
      }

      // Use the comprehensive Companies House service
      const { fetchComprehensiveData } = await import("./companiesHouse");
      
      const companyData = await fetchComprehensiveData(companyNumber, { apiKey });
      
      // Validate the data before sending
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

  app.post("/api/companies/:id/fetch-from-ch", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }

      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Companies House API key not configured" });
      }

      // Use the comprehensive Companies House service
      const { fetchComprehensiveData } = await import("./companiesHouse");
      const chData = await fetchComprehensiveData(company.number, { apiKey });

      // Update company with comprehensive data (always update to keep data fresh)
      const updates: Partial<InsertCompany> = {
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
        syncStatus: chData.syncStatus,
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

  // Utility endpoint to recalculate renewal dates for all companies
  app.post("/api/companies/recalculate-renewal-dates", async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      let updated = 0;
      
      for (const company of companies) {
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

  // Sync all companies with Companies House
  app.post("/api/companies/sync-all", async (req, res) => {
    try {
      const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Companies House API key not configured" });
      }

      const companies = await storage.getCompanies();
      const results: Array<{ companyId: string; companyName: string; success: boolean; error?: string }> = [];
      let updated = 0;
      let failed = 0;

      const { fetchComprehensiveData } = await import("./companiesHouse");

      for (const company of companies) {
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
          const chData = await fetchComprehensiveData(company.number, { apiKey });
          
          // Update company with fetched data (only update empty fields)
          const updates: Partial<InsertCompany> = {};
          
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
          if (chData.hasCharges !== undefined && company.hasCharges === undefined) {
            updates.hasCharges = chData.hasCharges;
          }
          if (chData.hasInsolvency !== undefined && company.hasInsolvency === undefined) {
            updates.hasInsolvency = chData.hasInsolvency;
          }
          
          // Additional structured data
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
          
          // Always update filing history and insolvency history (they change over time)
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

      // Store sync timestamp
      await storage.setSystemSetting("last_companies_house_sync", new Date().toISOString());

      res.json({
        total: companies.length,
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

  // Task API Routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/company/:companyId", async (req, res) => {
    try {
      const tasks = await storage.getTasksByCompany(req.params.companyId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company tasks" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const validatedData = insertTaskSchema.parse(req.body);
      const result = await storage.upsertTask(validatedData);

      // Log task creation
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: result.wasCreated ? "task_created" : "task_updated",
        category: "task",
        targetId: result.task.id,
        targetName: result.task.title,
        performedBy: userId,
        performedByName: userName,
        details: `Company task "${result.task.title}" ${result.wasCreated ? 'created' : 'updated'} for "${result.task.companyName}"`,
        metadata: { companyId: result.task.companyId, companyName: result.task.companyName },
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid data" });
    }
  });

  app.patch("/api/tasks/:id/status", async (req, res) => {
    try {
      const { status, reason } = req.body;
      
      // Validate status
      const validStatuses = ["open", "done", "skipped", "cancelled"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value" });
      }
      
      // Validate reason is provided for cancellation
      if (status === "cancelled" && !reason) {
        return res.status(400).json({ error: "Reason is required for cancellation" });
      }
      
      const task = await storage.updateTaskStatus(req.params.id, status, reason);

      // Log task status change
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "task_status_changed",
        category: "task",
        targetId: task.id,
        targetName: task.title,
        performedBy: userId,
        performedByName: userName,
        details: `Company task "${task.title}" for "${task.companyName}" changed to ${status}${reason ? `. Reason: ${reason}` : ''}`,
        metadata: { newStatus: status, companyId: task.companyId, companyName: task.companyName },
      });

      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task status" });
    }
  });

  app.patch("/api/tasks/:id/review", async (req, res) => {
    try {
      // Validate request body
      const reviewSchema = z.object({
        note: z.string().optional(),
      });
      const { note } = reviewSchema.parse(req.body);
      
      const task = await storage.markTaskAsReviewed(req.params.id, note);

      // Log task review
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "task_reviewed",
        category: "task",
        targetId: task.id,
        targetName: task.title,
        performedBy: userId,
        performedByName: userName,
        details: `Company task "${task.title}" for "${task.companyName}" marked as reviewed${note ? `. Note: ${note}` : ''}`,
        metadata: { companyId: task.companyId, companyName: task.companyName },
      });

      res.json(task);
    } catch (error) {
      console.error(`[PATCH /api/tasks/:id/review] Error:`, error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors,
          message: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
        });
      }
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to mark task as reviewed"
      });
    }
  });

  app.post("/api/tasks/:id/reopen", requireAuth, async (req, res) => {
    try {
      const { reason } = z.object({
        reason: z.string().optional(),
      }).parse(req.body);

      const user = req.session.user!;
      const task = await storage.reopenTask(req.params.id, user.id, user.name, reason);

      // Log task reopen
      await storage.createGeneralLog({
        action: "task_reopened",
        category: "task",
        targetId: task.id,
        targetName: task.title,
        performedBy: user.id,
        performedByName: user.name,
        details: `Company task "${task.title}" for "${task.companyName}" reopened${reason ? `. Reason: ${reason}` : ''}`,
        metadata: { companyId: task.companyId, companyName: task.companyName },
      });

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid reopen data", details: error.errors });
      }
      if (error instanceof Error && error.message === "Task not found") {
        return res.status(404).json({ error: "Task not found" });
      }
      res.status(500).json({ error: "Failed to reopen task" });
    }
  });

  // Audit log endpoints
  app.get("/api/audit", async (req, res) => {
    try {
      const logs = await storage.getAuditLogs();
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });

  app.get("/api/audit/task/:taskId", async (req, res) => {
    try {
      const logs = await storage.getAuditLogsByTask(req.params.taskId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get audit logs for task" });
    }
  });

  app.get("/api/audit/company/:companyId", async (req, res) => {
    try {
      const logs = await storage.getAuditLogsByCompany(req.params.companyId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to get audit logs for company" });
    }
  });

  app.post("/api/tasks/generate", requireAuth, async (req, res) => {
    try {
      const companies = await storage.getCompanies();
      let tasksCreated = 0;
      let tasksSkipped = 0;

      console.log(`[Task Generation] ========== START ==========`);
      console.log(`[Task Generation] Found ${companies.length} total companies`);
      
      const activeCompanies = companies.filter(c => c.isActive && c.renewalDate);
      console.log(`[Task Generation] Active companies with renewal dates: ${activeCompanies.length}`);

      for (const company of companies) {
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
        console.log(`[Task Generation] - Renewal Fees: ${company.renewalFees || '0'}`);
        
        const { generateTaskDefinitions, taskDefinitionsToInsertTasks } = await import("../client/src/lib/utils/taskGenerator");
        const definitions = generateTaskDefinitions(company);
        console.log(`[Task Generation] - Task definitions generated: ${definitions.length}`);
        
        if (definitions.length === 0) {
          console.log(`[Task Generation] - WARNING: No task definitions! Renewal date may be invalid or too far in future`);
        } else {
          console.log(`[Task Generation] - Task types: ${definitions.map(d => d.type).join(', ')}`);
        }
        
        const insertTasks = taskDefinitionsToInsertTasks(company, definitions);
        console.log(`[Task Generation] - Insert tasks prepared: ${insertTasks.length}`);

        for (const task of insertTasks) {
          const { wasCreated } = await storage.upsertTask(task);
          if (wasCreated) {
            console.log(`[Task Generation] - ✓ Created: ${task.title}`);
            tasksCreated++;
          } else {
            console.log(`[Task Generation] - ○ Already exists: ${task.title}`);
            tasksSkipped++;
          }
        }
      }

      console.log(`[Task Generation] ========== COMPLETE ==========`);
      console.log(`[Task Generation] New tasks created: ${tasksCreated}`);
      console.log(`[Task Generation] Existing tasks skipped: ${tasksSkipped}`);
      console.log(`[Task Generation] ===================================`);

      // Save last generation timestamp
      const timestamp = new Date().toISOString();
      await storage.setSystemSetting('last_task_generation', timestamp);
      console.log(`[Task Generation] Saved last generation timestamp: ${timestamp}`);

      // Log task generation
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
        metadata: { tasksCreated, tasksSkipped },
      });

      res.json({
        success: true,
        message: `Generated ${tasksCreated} tasks`,
        tasksCreated,
        tasksSkipped,
        timestamp
      });
    } catch (error) {
      console.error(`[Task Generation] ERROR:`, error);
      console.error(`[Task Generation] Stack:`, error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate tasks" });
    }
  });

  app.get("/api/tasks/last-generation", requireAuth, async (req, res) => {
    try {
      const timestamp = await storage.getSystemSetting('last_task_generation');
      res.json({ timestamp: timestamp || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to get last generation timestamp" });
    }
  });

  // HR Task Generation Endpoints
  app.post("/api/hr-tasks/generate", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      const templates = await storage.getHRTaskTemplates();
      let tasksCreated = 0;
      let tasksSkipped = 0;

      console.log(`[HR Task Generation] ========== START ==========`);
      console.log(`[HR Task Generation] Found ${employees.length} total employees`);
      console.log(`[HR Task Generation] Found ${templates.length} HR templates`);

      const { DateTime } = await import("luxon");
      const UK_TIMEZONE = "Europe/London";

      for (const employee of employees) {
        console.log(`[HR Task Generation] Processing: ${employee.firstName} ${employee.lastName}`);
        
        // Validate employee has a valid start date
        if (!employee.startDate) {
          console.log(`[HR Task Generation] - SKIP: Employee has no start date`);
          continue;
        }

        const now = DateTime.now().setZone(UK_TIMEZONE);
        const startDate = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
        
        if (!startDate.isValid) {
          console.log(`[HR Task Generation] - SKIP: Employee has invalid start date: ${employee.startDate}`);
          continue;
        }
        
        for (const template of templates) {
          // Calculate base due date from employee start date + offset days
          const baseDueDate = startDate.plus({ days: template.dueDateOffsetDays });

          if (!baseDueDate.isValid || baseDueDate < startDate) {
            console.log(`[HR Task Generation] - SKIP: Template ${template.id} invalid offset or date`);
            continue;
          }

          const tasksToCreate: Array<{ title: string; dueAt: string; uniqueKey: string; taskType: string }> = [];

          switch (template.recurrence) {
            case "one_time": {
              const uniqueKey = `hr-template-${template.id}-employee-${employee.id}`;
              tasksToCreate.push({
                title: template.name,
                dueAt: baseDueDate.toISO() || baseDueDate.toUTC().toISO() || new Date().toISOString(),
                uniqueKey,
                taskType: "hr_template"
              });
              break;
            }

            case "monthly": {
              const monthsSinceStart = Math.floor(now.diff(baseDueDate, 'months').months);
              
              // Current period
              const currentPeriodDue = baseDueDate.plus({ months: Math.max(0, monthsSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}-${currentPeriodDue.month}`;
                tasksToCreate.push({
                  title: `${template.name} (${currentPeriodDue.toFormat('MMMM yyyy')})`,
                  dueAt: currentPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "hr_template_monthly"
                });
              }
              
              // Next period
              const nextPeriodDue = baseDueDate.plus({ months: Math.max(0, monthsSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}-${nextPeriodDue.month}`;
                tasksToCreate.push({
                  title: `${template.name} (${nextPeriodDue.toFormat('MMMM yyyy')})`,
                  dueAt: nextPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "hr_template_monthly"
                });
              }
              break;
            }

            case "annual": {
              const yearsSinceStart = Math.floor(now.diff(baseDueDate, 'years').years);
              
              // Current period
              const currentPeriodDue = baseDueDate.plus({ years: Math.max(0, yearsSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}`;
                tasksToCreate.push({
                  title: `${template.name} (${currentPeriodDue.year})`,
                  dueAt: currentPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "hr_template_annual"
                });
              }
              
              // Next period
              const nextPeriodDue = baseDueDate.plus({ years: Math.max(0, yearsSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `hr-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}`;
                tasksToCreate.push({
                  title: `${template.name} (${nextPeriodDue.year})`,
                  dueAt: nextPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "hr_template_annual"
                });
              }
              break;
            }
          }

          // Create tasks
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
                createdAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
                updatedAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
              });
              console.log(`[HR Task Generation] - ✓ Created: ${taskDef.title}`);
              tasksCreated++;
            } else {
              console.log(`[HR Task Generation] - ○ Already exists: ${taskDef.title}`);
              tasksSkipped++;
            }
          }
        }
      }

      console.log(`[HR Task Generation] ========== COMPLETE ==========`);
      console.log(`[HR Task Generation] New tasks created: ${tasksCreated}`);
      console.log(`[HR Task Generation] Existing tasks skipped: ${tasksSkipped}`);

      // Save last generation timestamp
      const timestamp = new Date().toISOString();
      await storage.setSystemSetting('last_hr_task_generation', timestamp);
      console.log(`[HR Task Generation] Saved last generation timestamp: ${timestamp}`);

      // Log the HR task generation
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "hr_tasks_generated",
        category: "task",
        targetId: "hr-tasks",
        targetName: "HR Tasks",
        performedBy: userId,
        performedByName: userName,
        details: `Generated ${tasksCreated} HR tasks (${tasksSkipped} skipped) for ${employees.length} employees`,
      });

      res.json({
        success: true,
        message: `Generated ${tasksCreated} HR tasks`,
        tasksCreated,
        tasksSkipped,
        timestamp
      });
    } catch (error) {
      console.error(`[HR Task Generation] ERROR:`, error);
      console.error(`[HR Task Generation] Stack:`, error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate HR tasks" });
    }
  });

  app.get("/api/hr-tasks/last-generation", requireAuth, async (req, res) => {
    try {
      const timestamp = await storage.getSystemSetting('last_hr_task_generation');
      res.json({ timestamp: timestamp || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to get last HR task generation timestamp" });
    }
  });

  // Residency Task Generation Endpoints
  app.post("/api/residency-tasks/generate", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      const residencyEmployees = employees.filter(e => e.isResidencyService);
      const templates = await storage.getResidencyTaskTemplates();
      let tasksCreated = 0;
      let tasksSkipped = 0;

      console.log(`[Residency Task Generation] ========== START ==========`);
      console.log(`[Residency Task Generation] Found ${residencyEmployees.length} residency service employees`);
      console.log(`[Residency Task Generation] Found ${templates.length} residency templates`);

      const { DateTime } = await import("luxon");
      const UK_TIMEZONE = "Europe/London";

      for (const employee of residencyEmployees) {
        console.log(`[Residency Task Generation] Processing: ${employee.firstName} ${employee.lastName}`);
        const now = DateTime.now().setZone(UK_TIMEZONE);
        
        for (const template of templates) {
          // Calculate base start date based on template mode
          let baseStartDate: any;
          
          if (template.startDateMode === "manual") {
            if (!template.startDate) {
              console.log(`[Residency Task Generation] - SKIP: Template ${template.id} manual mode but no start date`);
              continue;
            }
            baseStartDate = DateTime.fromISO(template.startDate, { zone: UK_TIMEZONE });
          } else {
            // offset_days mode
            if (!employee.startDate) {
              console.log(`[Residency Task Generation] - SKIP: Employee has no start date for offset mode`);
              continue;
            }
            const employeeStart = DateTime.fromFormat(employee.startDate, "yyyy-MM-dd", { zone: UK_TIMEZONE }).set({ hour: 12, minute: 0, second: 0, millisecond: 0 });
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

          const tasksToCreate: Array<{ title: string; dueAt: string; uniqueKey: string; taskType: string }> = [];

          switch (template.recurrence) {
            case "one_time": {
              const uniqueKey = `residency-template-${template.id}-employee-${employee.id}`;
              tasksToCreate.push({
                title: template.name,
                dueAt: baseStartDate.toISO() || new Date().toISOString(),
                uniqueKey,
                taskType: "residency_template"
              });
              break;
            }

            case "weekly": {
              const weeksSinceStart = Math.floor(now.diff(baseStartDate, 'weeks').weeks);
              
              // Current week
              const currentPeriodDue = baseStartDate.plus({ weeks: Math.max(0, weeksSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}-week${currentPeriodDue.weekNumber}`;
                tasksToCreate.push({
                  title: `${template.name} (Week ${currentPeriodDue.weekNumber}, ${currentPeriodDue.year})`,
                  dueAt: currentPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "residency_template_weekly"
                });
              }
              
              // Next week
              const nextPeriodDue = baseStartDate.plus({ weeks: Math.max(0, weeksSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}-week${nextPeriodDue.weekNumber}`;
                tasksToCreate.push({
                  title: `${template.name} (Week ${nextPeriodDue.weekNumber}, ${nextPeriodDue.year})`,
                  dueAt: nextPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "residency_template_weekly"
                });
              }
              break;
            }

            case "monthly": {
              const monthsSinceStart = Math.floor(now.diff(baseStartDate, 'months').months);
              
              // Current period
              const currentPeriodDue = baseStartDate.plus({ months: Math.max(0, monthsSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}-${currentPeriodDue.month}`;
                tasksToCreate.push({
                  title: `${template.name} (${currentPeriodDue.toFormat('MMMM yyyy')})`,
                  dueAt: currentPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "residency_template_monthly"
                });
              }
              
              // Next period
              const nextPeriodDue = baseStartDate.plus({ months: Math.max(0, monthsSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}-${nextPeriodDue.month}`;
                tasksToCreate.push({
                  title: `${template.name} (${nextPeriodDue.toFormat('MMMM yyyy')})`,
                  dueAt: nextPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "residency_template_monthly"
                });
              }
              break;
            }

            case "quarterly": {
              const quartersSinceStart = Math.floor(now.diff(baseStartDate, 'quarters').quarters);
              
              // Current period
              const currentPeriodDue = baseStartDate.plus({ quarters: Math.max(0, quartersSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentQuarter = currentPeriodDue.quarter;
                const currentUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}-Q${currentQuarter}`;
                tasksToCreate.push({
                  title: `${template.name} (Q${currentQuarter} ${currentPeriodDue.year})`,
                  dueAt: currentPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "residency_template_quarterly"
                });
              }
              
              // Next period
              const nextPeriodDue = baseStartDate.plus({ quarters: Math.max(0, quartersSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextQuarter = nextPeriodDue.quarter;
                const nextUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}-Q${nextQuarter}`;
                tasksToCreate.push({
                  title: `${template.name} (Q${nextQuarter} ${nextPeriodDue.year})`,
                  dueAt: nextPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "residency_template_quarterly"
                });
              }
              break;
            }

            case "annually": {
              const yearsSinceStart = Math.floor(now.diff(baseStartDate, 'years').years);
              
              // Current period
              const currentPeriodDue = baseStartDate.plus({ years: Math.max(0, yearsSinceStart) });
              if (currentPeriodDue.isValid) {
                const currentUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${currentPeriodDue.year}`;
                tasksToCreate.push({
                  title: `${template.name} (${currentPeriodDue.year})`,
                  dueAt: currentPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: currentUniqueKey,
                  taskType: "residency_template_annual"
                });
              }
              
              // Next period
              const nextPeriodDue = baseStartDate.plus({ years: Math.max(0, yearsSinceStart) + 1 });
              if (nextPeriodDue.isValid) {
                const nextUniqueKey = `residency-template-${template.id}-employee-${employee.id}-${nextPeriodDue.year}`;
                tasksToCreate.push({
                  title: `${template.name} (${nextPeriodDue.year})`,
                  dueAt: nextPeriodDue.toISO() || new Date().toISOString(),
                  uniqueKey: nextUniqueKey,
                  taskType: "residency_template_annual"
                });
              }
              break;
            }
          }

          // Create tasks for main employee
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
                createdAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
                updatedAt: now.toISO() || now.toUTC().toISO() || new Date().toISOString(),
              });
              console.log(`[Residency Task Generation] - ✓ Created: ${taskDef.title}`);
              tasksCreated++;
            } else {
              console.log(`[Residency Task Generation] - ○ Already exists: ${taskDef.title}`);
              tasksSkipped++;
            }
          }

          // TODO: Add dependant task generation when dependants are migrated to PostgreSQL (Phase 5+)
          // Currently dependants are stored in localStorage and not accessible from the backend
          // Once migrated, check template.applicantType === "main_and_dependants" and generate
          // tasks for each dependant with unique keys like: residency-template-${template.id}-dependant-${dependantId}
        }
      }

      console.log(`[Residency Task Generation] ========== COMPLETE ==========`);
      console.log(`[Residency Task Generation] New tasks created: ${tasksCreated}`);
      console.log(`[Residency Task Generation] Existing tasks skipped: ${tasksSkipped}`);

      // Save last generation timestamp
      const timestamp = new Date().toISOString();
      await storage.setSystemSetting('last_residency_task_generation', timestamp);
      console.log(`[Residency Task Generation] Saved last generation timestamp: ${timestamp}`);

      res.json({ 
        success: true, 
        message: `Generated ${tasksCreated} residency tasks`,
        tasksCreated,
        tasksSkipped,
        timestamp
      });
    } catch (error) {
      console.error(`[Residency Task Generation] ERROR:`, error);
      console.error(`[Residency Task Generation] Stack:`, error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to generate residency tasks" });
    }
  });

  app.get("/api/residency-tasks/last-generation", requireAuth, async (req, res) => {
    try {
      const timestamp = await storage.getSystemSetting('last_residency_task_generation');
      res.json({ timestamp: timestamp || null });
    } catch (error) {
      res.status(500).json({ error: "Failed to get last residency task generation timestamp" });
    }
  });

  app.post("/api/tasks/cancel-company/:companyId", async (req, res) => {
    try {
      await storage.cancelCompanyTasks(req.params.companyId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to cancel company tasks" });
    }
  });

  // ==================
  // Employee Routes
  // ==================
  app.get("/api/employees", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", requireAuth, async (req, res) => {
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

  app.get("/api/companies/:companyId/employees", requireAuth, async (req, res) => {
    try {
      const employees = await storage.getEmployeesByCompany(req.params.companyId);
      res.json(employees);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company employees" });
    }
  });

  app.post("/api/employees", requireAuth, async (req, res) => {
    try {
      // For new employee creation, default to draft mode (isDraft=true) unless explicitly set to false
      // This allows users to save minimal data (firstName, lastName) and fill details later
      const isDraft = req.body.isDraft !== false;
      const dataWithDraft = { ...req.body, isDraft };
      
      // Use appropriate schema based on draft status
      const schema = isDraft ? draftEmployeeRecordSchema : completeEmployeeRecordSchema;
      const validatedData = schema.parse(dataWithDraft);
      
      const employee = await storage.createEmployee(validatedData as InsertEmployeeRecord);

      // Log employee creation
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
        metadata: { companyId: employee.companyId, companyName: employee.companyName, isDraft: employee.isDraft },
      });

      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Format validation errors with detailed explanations
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        // Create a user-friendly message listing missing required fields
        const missingFields = formattedErrors
          .map(e => `• ${e.field}: ${e.message}`)
          .join('\n');

        return res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
          message: `Missing or invalid fields:\n${missingFields}`
        });
      }
      console.error("[POST /api/employees] Error:", error);
      res.status(500).json({ error: "Failed to create employee" });
    }
  });

  app.patch("/api/employees/:id", requireAuth, async (req, res) => {
    try {
      // First validate the partial update data
      const validatedData = insertEmployeeRecordSchema.partial().parse(req.body);
      
      // If setting isDraft to false, we need to ensure all required fields are present
      if (validatedData.isDraft === false) {
        // Get the existing employee data
        const existingEmployee = await storage.getEmployee(req.params.id);
        if (!existingEmployee) {
          return res.status(404).json({ error: "Employee not found" });
        }
        
        // Merge existing data with update data
        const mergedData = { ...existingEmployee, ...validatedData };
        
        // Sanitize the merged payload to normalize empty strings and prevent bypass
        const sanitizedMergedData = sanitizeEmployeePayload(mergedData);
        
        // Validate the sanitized merged data against the complete employee schema
        try {
          completeEmployeeRecordSchema.parse(sanitizedMergedData);
        } catch (validationError) {
          if (validationError instanceof z.ZodError) {
            const formattedErrors = validationError.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }));
            return res.status(400).json({ 
              error: "Cannot mark as complete: missing required fields", 
              details: formattedErrors,
              message: `Cannot mark as complete. Missing required fields: ${formattedErrors.map(e => e.field).join(', ')}`
            });
          }
          throw validationError;
        }
      }
      
      const employee = await storage.updateEmployee(req.params.id, validatedData);

      // Log employee update
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      const changedFields = Object.keys(validatedData).filter(k => k !== 'updatedAt').join(', ');
      await storage.createGeneralLog({
        action: "employee_updated",
        category: "employee",
        targetId: employee.id,
        targetName: `${employee.firstName} ${employee.lastName}`,
        performedBy: userId,
        performedByName: userName,
        details: `Employee "${employee.firstName} ${employee.lastName}" updated. Fields: ${changedFields}`,
        metadata: { changedFields: Object.keys(validatedData), companyName: employee.companyName },
      });

      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
          message: formattedErrors.map(e => `${e.field}: ${e.message}`).join('; ')
        });
      }
      if (error instanceof Error && error.message === "Employee not found") {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.status(500).json({ error: "Failed to update employee" });
    }
  });

  app.delete("/api/employees/:id", requireAuth, async (req, res) => {
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
        details: `Employee "${employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}" deleted`,
      });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });

  // ==================
  // Employee Task Routes
  // ==================
  app.get("/api/employee-tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getEmployeeTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee tasks" });
    }
  });

  app.get("/api/employee-tasks/:id", requireAuth, async (req, res) => {
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

  app.get("/api/employees/:employeeId/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getEmployeeTasksByEmployee(req.params.employeeId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee tasks" });
    }
  });

  app.get("/api/companies/:companyId/employee-tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getEmployeeTasksByCompany(req.params.companyId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company employee tasks" });
    }
  });

  app.post("/api/employee-tasks", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmployeeTaskSchema.parse(req.body);
      // Convert date strings to Date objects
      const taskData = {
        ...validatedData,
        dueAt: new Date(validatedData.dueAt),
        completedAt: validatedData.completedAt ? new Date(validatedData.completedAt) : undefined,
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
        details: `Employee task "${task.title}" created for ${task.employeeName}`,
      });
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee task data", details: error.errors });
      }
      console.error("[employee-tasks POST] Error:", error instanceof Error ? error.message : error);
      res.status(500).json({ error: "Failed to create employee task" });
    }
  });

  app.patch("/api/employee-tasks/:id", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEmployeeTaskSchema.partial().parse(req.body);
      // Convert date strings to Date objects if present
      const taskData: any = { ...validatedData };
      if (taskData.dueAt) taskData.dueAt = new Date(taskData.dueAt);
      if (taskData.completedAt) taskData.completedAt = new Date(taskData.completedAt);
      const task = await storage.updateEmployeeTask(req.params.id, taskData);

      // Log employee task update
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
        metadata: { taskId: task.id, employeeId: task.employeeId },
      });

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid employee task data", details: error.errors });
      }
      if (error instanceof Error && error.message === "Employee task not found") {
        return res.status(404).json({ error: "Employee task not found" });
      }
      res.status(500).json({ error: "Failed to update employee task" });
    }
  });

  app.patch("/api/employee-tasks/:id/status", requireAuth, async (req, res) => {
    try {
      const { status, note } = z.object({
        status: z.enum(["open", "completed", "skipped", "cancelled"]),
        note: z.string().optional(),
      }).parse(req.body);
      const task = await storage.updateEmployeeTaskStatus(req.params.id, status, note);

      // Log employee task status change
      const userName = req.session?.user?.name || "System";
      const userId = req.session?.user?.id || "system";
      await storage.createGeneralLog({
        action: "employee_task_status_changed",
        category: "employee",
        targetId: task.id,
        targetName: task.title,
        performedBy: userId,
        performedByName: userName,
        details: `Employee task "${task.title}" for "${task.employeeName}" changed to ${status}${note ? `. Note: ${note}` : ''}`,
        metadata: { newStatus: status, employeeId: task.employeeId, employeeName: task.employeeName },
      });

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid status data", details: error.errors });
      }
      if (error instanceof Error && error.message === "Employee task not found") {
        return res.status(404).json({ error: "Employee task not found" });
      }
      res.status(500).json({ error: "Failed to update employee task status" });
    }
  });

  app.delete("/api/employee-tasks/:id", requireAuth, async (req, res) => {
    try {
      // Get task before deleting for logging
      const existingTask = await storage.getEmployeeTask(req.params.id);
      await storage.deleteEmployeeTask(req.params.id);

      // Log employee task deletion
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
          metadata: { taskId: req.params.id, employeeId: existingTask.employeeId },
        });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee task" });
    }
  });

  app.post("/api/employee-tasks/:id/reopen", requireAuth, async (req, res) => {
    try {
      const { reason } = z.object({
        reason: z.string().optional(),
      }).parse(req.body);

      const user = req.session.user!;
      const task = await storage.reopenEmployeeTask(req.params.id, user.id, user.name, reason);

      // Log employee task reopen
      await storage.createGeneralLog({
        action: "employee_task_reopened",
        category: "employee",
        targetId: task.employeeId,
        targetName: task.employeeName || "Unknown",
        performedBy: user.id,
        performedByName: user.name,
        details: `Employee task "${task.title}" for "${task.employeeName}" reopened${reason ? `. Reason: ${reason}` : ''}`,
        metadata: { taskId: task.id, employeeId: task.employeeId },
      });

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid reopen data", details: error.errors });
      }
      if (error instanceof Error && error.message === "Employee task not found") {
        return res.status(404).json({ error: "Employee task not found" });
      }
      res.status(500).json({ error: "Failed to reopen employee task" });
    }
  });

  // ==================
  // HR Task Templates Routes
  // ==================
  
  app.get("/api/hr-task-templates", requireAuth, async (_req, res) => {
    try {
      const templates = await storage.getHRTaskTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch HR task templates" });
    }
  });

  app.post("/api/hr-task-templates", requireAuth, async (req, res) => {
    try {
      const { insertHRTaskTemplateSchema } = await import("@shared/schema");
      const validatedData = insertHRTaskTemplateSchema.parse(req.body);
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
        details: `HR task template "${template.name}" created`,
      });

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create HR task template" });
    }
  });

  app.patch("/api/hr-task-templates/:id", requireAuth, async (req, res) => {
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
        details: `HR task template "${template.name}" updated`,
      });

      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update HR task template" });
    }
  });

  app.delete("/api/hr-task-templates/:id", requireAuth, async (req, res) => {
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
        details: `HR task template "${existing?.name || req.params.id}" deleted`,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete HR task template" });
    }
  });

  // ==================
  // Leaver Task Templates Routes
  // ==================

  app.get("/api/leaver-task-templates", requireAuth, async (_req, res) => {
    try {
      const templates = await storage.getLeaverTaskTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaver task templates" });
    }
  });

  app.post("/api/leaver-task-templates", requireAuth, async (req, res) => {
    try {
      const { insertLeaverTaskTemplateSchema } = await import("@shared/schema");
      const validatedData = insertLeaverTaskTemplateSchema.parse(req.body);
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
        details: `Leaver task template "${template.name}" created`,
      });

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create leaver task template" });
    }
  });

  app.patch("/api/leaver-task-templates/:id", requireAuth, async (req, res) => {
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
        details: `Leaver task template "${template.name}" updated`,
      });

      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update leaver task template" });
    }
  });

  app.delete("/api/leaver-task-templates/:id", requireAuth, async (req, res) => {
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
        details: `Leaver task template "${existing?.name || req.params.id}" deleted`,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete leaver task template" });
    }
  });

  // ==================
  // Residency Task Templates Routes
  // ==================

  app.get("/api/residency-task-templates", requireAuth, async (_req, res) => {
    try {
      const templates = await storage.getResidencyTaskTemplates();
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch residency task templates" });
    }
  });

  app.post("/api/residency-task-templates", requireAuth, async (req, res) => {
    try {
      const { insertResidencyTaskTemplateSchema } = await import("@shared/schema");
      const validatedData = insertResidencyTaskTemplateSchema.parse(req.body);
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
        details: `Residency task template "${template.name}" created`,
      });

      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create residency task template" });
    }
  });

  app.patch("/api/residency-task-templates/:id", requireAuth, async (req, res) => {
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
        details: `Residency task template "${template.name}" updated`,
      });

      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to update residency task template" });
    }
  });

  app.delete("/api/residency-task-templates/:id", requireAuth, async (req, res) => {
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
        details: `Residency task template "${existing?.name || req.params.id}" deleted`,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete residency task template" });
    }
  });

  // ==================
  // SL Prep Tasks Routes
  // ==================
  app.get("/api/sl-prep-tasks", requireAuth, async (_req, res) => {
    try {
      const tasks = await storage.getSLPrepTasks();
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SL prep tasks" });
    }
  });

  app.post("/api/sl-prep-tasks", requireAuth, async (req, res) => {
    try {
      const { insertSLPrepTaskSchema } = await import("@shared/schema");
      const validatedData = insertSLPrepTaskSchema.parse(req.body);
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
        details: `SL Prep task "${task.name}" created`,
      });

      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create SL prep task" });
    }
  });

  app.patch("/api/sl-prep-tasks/:id", requireAuth, async (req, res) => {
    try {
      const { insertSLPrepTaskSchema } = await import("@shared/schema");
      // Validate partial updates
      const validatedData = insertSLPrepTaskSchema.partial().parse(req.body);
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
        details: `SL Prep task "${task.name}" updated`,
      });

      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid task data", details: error.errors });
      }
      if (error instanceof Error && error.message === "SL Prep Task not found") {
        return res.status(404).json({ error: "SL Prep Task not found" });
      }
      res.status(500).json({ error: "Failed to update SL prep task" });
    }
  });

  app.delete("/api/sl-prep-tasks/:id", requireAuth, async (req, res) => {
    try {
      // Check if task exists first
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
        details: `SL Prep task "${existingTask.name}" deleted`,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete SL prep task" });
    }
  });

  // ==================
  // Deletion Requests Routes
  // ==================
  app.get("/api/deletion-requests", requireAuth, async (_req, res) => {
    try {
      const requests = await storage.getDeletionRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch deletion requests" });
    }
  });

  app.get("/api/deletion-requests/pending", requireAuth, async (_req, res) => {
    try {
      const requests = await storage.getPendingDeletionRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending deletion requests" });
    }
  });

  app.post("/api/deletion-requests", requireAuth, async (req, res) => {
    try {
      const { insertDeletionRequestSchema } = await import("@shared/schema");
      const validatedData = insertDeletionRequestSchema.parse(req.body);
      const request = await storage.createDeletionRequest(validatedData);
      
      // Log the deletion request
      await storage.createGeneralLog({
        action: "deletion_requested",
        category: "company",
        targetId: request.companyId,
        targetName: request.companyName,
        performedBy: request.requestedBy,
        performedByName: request.requestedByName,
        details: `Deletion request created for ${request.companyName}. Reason: ${request.reason}`,
        metadata: { requestId: request.id },
      });
      
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid deletion request data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create deletion request" });
    }
  });

  app.patch("/api/deletion-requests/:id/approve", requireAuth, async (req, res) => {
    try {
      const { reviewedBy, reviewedByName, reviewNotes } = req.body;
      
      if (!reviewedBy || !reviewedByName) {
        return res.status(400).json({ error: "reviewedBy and reviewedByName are required" });
      }
      
      const request = await storage.approveDeletionRequest(req.params.id, reviewedBy, reviewedByName, reviewNotes);
      
      // Log the approval
      await storage.createGeneralLog({
        action: "deletion_approved",
        category: "company",
        targetId: request.companyId,
        targetName: request.companyName,
        performedBy: reviewedBy,
        performedByName: reviewedByName,
        details: `Deletion request for ${request.companyName} approved by ${reviewedByName}${reviewNotes ? `. Notes: ${reviewNotes}` : ''}`,
        metadata: { requestId: request.id },
      });
      
      // Now actually delete the company
      await storage.deleteCompany(request.companyId);
      
      // Log the actual deletion
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
          reason: request.reason,
        },
      });
      
      res.json(request);
    } catch (error) {
      if (error instanceof Error && error.message === "Deletion request not found") {
        return res.status(404).json({ error: "Deletion request not found" });
      }
      res.status(500).json({ error: "Failed to approve deletion request" });
    }
  });

  app.patch("/api/deletion-requests/:id/reject", requireAuth, async (req, res) => {
    try {
      const { reviewedBy, reviewedByName, reviewNotes } = req.body;
      
      if (!reviewedBy || !reviewedByName) {
        return res.status(400).json({ error: "reviewedBy and reviewedByName are required" });
      }
      
      const request = await storage.rejectDeletionRequest(req.params.id, reviewedBy, reviewedByName, reviewNotes);
      
      // Log the rejection
      await storage.createGeneralLog({
        action: "deletion_rejected",
        category: "company",
        targetId: request.companyId,
        targetName: request.companyName,
        performedBy: reviewedBy,
        performedByName: reviewedByName,
        details: `Deletion request for ${request.companyName} rejected by ${reviewedByName}${reviewNotes ? `. Notes: ${reviewNotes}` : ''}`,
        metadata: { requestId: request.id },
      });
      
      res.json(request);
    } catch (error) {
      if (error instanceof Error && error.message === "Deletion request not found") {
        return res.status(404).json({ error: "Deletion request not found" });
      }
      res.status(500).json({ error: "Failed to reject deletion request" });
    }
  });

  // ==================
  // General Log Routes
  // ==================
  app.get("/api/general-log", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getGeneralLogs(limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch general logs" });
    }
  });

  // Get logs filtered by target entity (company, employee, etc.)
  app.get("/api/general-log/entity/:targetId", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getGeneralLogsByTarget(req.params.targetId, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch entity logs" });
    }
  });

  // Get logs filtered by category
  app.get("/api/general-log/category/:category", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getGeneralLogsByCategory(req.params.category, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch category logs" });
    }
  });

  // ==================
  // Deployment Package Routes
  // ==================
  app.get("/api/deployment/info", requireAdmin, async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      // Check if package exists
      const packagePath = path.join(process.cwd(), "package.json");
      const packageJson = JSON.parse(await fs.readFile(packagePath, "utf-8"));
      
      res.json({
        version: packageJson.version || "1.0.0",
        name: packageJson.name || "corporate-management-system",
        description: "UK Corporate Management System with PostgreSQL database",
        lastGenerated: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get deployment info" });
    }
  });

  app.get("/api/deployment/package", requireAdmin, async (req, res) => {
    try {
      const archiver = (await import("archiver")).default;
      const fs = await import("fs/promises");
      const path = await import("path");
      
      // Create archive
      const archive = archiver("zip", { zlib: { level: 9 } });
      
      // Handle archiver errors
      archive.on("error", (err) => {
        console.error("Archiver error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Failed to create archive" });
        }
      });
      
      // Set response headers
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename=corpmanagesys-railway-${timestamp}.zip`);
      
      // Pipe archive to response
      archive.pipe(res);
      
      // Add files to archive
      const baseDir = process.cwd();
      
      // Files/folders to exclude from the package
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
      
      // Files to replace with Railway-compatible versions
      const filesToReplace = ["package.json", "vite.config.ts"];
      
      // Helper to check if path should be excluded
      const shouldExclude = (filePath: string) => {
        const relativePath = path.relative(baseDir, filePath);
        const baseName = path.basename(relativePath);
        
        // Skip replaced files - we add custom versions
        if (filesToReplace.includes(baseName) && !relativePath.includes('/')) {
          return true;
        }
        
        return excludePatterns.some(pattern => 
          relativePath === pattern || 
          relativePath.startsWith(pattern + '/') || 
          relativePath.includes('/' + pattern + '/')
        );
      };
      
      // Recursively add directory contents
      const addDirectory = async (dirPath: string, archivePath: string = "") => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
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
      
      // Add all project files (excluding replaced ones)
      await addDirectory(baseDir);
      
      // Create Railway-compatible package.json
      const originalPackageJson = JSON.parse(await fs.readFile(path.join(baseDir, "package.json"), "utf-8"));
      
      // Keep ALL original dependencies
      const dependencies = { ...originalPackageJson.dependencies };
      
      // Move ALL devDependencies to dependencies (Railway needs them for build)
      // But remove Replit-specific packages
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
        dependencies: dependencies,
        optionalDependencies: originalPackageJson.optionalDependencies
      };
      archive.append(JSON.stringify(railwayPackageJson, null, 2), { name: "package.json" });
      
      // Create Railway-compatible vite.config.ts (uses fileURLToPath instead of import.meta.dirname)
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
      
      // Create railway.json
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
      
      // Create nixpacks.toml
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
      
      // Create .env.example
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
        "NODE_ENV=production",
      ].join("\n");
      archive.append(envExample, { name: ".env.example" });
      
      // Create comprehensive README
      const postgresRef = "$" + "{{Postgres.DATABASE_URL}}";
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
      
      // Export database schema - add schema.ts and a database setup guide
      try {
        // Add schema.ts to database folder
        const schemaFile = path.join(baseDir, "shared/schema.ts");
        archive.file(schemaFile, { name: "database/schema.ts" });
        
        // Create comprehensive database setup README
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

⚠️ **IMPORTANT**: Change this password immediately after first login!

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
        // Continue anyway - schema.ts is still in the package
      }
      
      // Finalize archive
      await archive.finalize();
      
      // Log the download
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
          metadata: { timestamp }
        });
      }
    } catch (error) {
      console.error("Deployment package error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate deployment package" });
      }
    }
  });

  // ==================
  // SL Training Routes
  // ==================
  
  // Get all training modules
  app.get("/api/sl-training/modules", requireAuth, async (req, res) => {
    try {
      const modules = await storage.getSlTrainingModules();
      res.json(modules);
    } catch (error) {
      console.error("Error fetching training modules:", error);
      res.status(500).json({ error: "Failed to fetch training modules" });
    }
  });

  // Get single training module with questions
  app.get("/api/sl-training/modules/:id", requireAuth, async (req, res) => {
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

  // Create training module (admin only)
  app.post("/api/sl-training/modules", requireAdmin, async (req, res) => {
    try {
      const { name, learningMaterials } = z.object({
        name: z.string().min(1, "Module name is required"),
        learningMaterials: z.string().optional(),
      }).parse(req.body);

      const user = req.session.user!;
      const module = await storage.createSlTrainingModule({
        name,
        learningMaterials: learningMaterials || null,
        createdBy: user.id,
        isActive: true,
      });

      // Log training module creation
      await storage.createGeneralLog({
        action: "training_module_created",
        category: "training",
        targetId: module.id,
        targetName: module.name,
        performedBy: user.id,
        performedByName: user.name,
        details: `Training module "${module.name}" created`,
      });

      res.status(201).json(module);
    } catch (error) {
      console.error("Error creating training module:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to create module" });
    }
  });

  // Update training module (admin only)
  app.patch("/api/sl-training/modules/:id", requireAdmin, async (req, res) => {
    try {
      const { name, learningMaterials, isActive } = z.object({
        name: z.string().min(1).optional(),
        learningMaterials: z.string().optional(),
        isActive: z.boolean().optional(),
      }).parse(req.body);

      const module = await storage.updateSlTrainingModule(req.params.id, {
        ...(name !== undefined && { name }),
        ...(learningMaterials !== undefined && { learningMaterials }),
        ...(isActive !== undefined && { isActive }),
      });

      // Log training module update
      const user = req.session.user!;
      await storage.createGeneralLog({
        action: "training_module_updated",
        category: "training",
        targetId: module.id,
        targetName: module.name,
        performedBy: user.id,
        performedByName: user.name,
        details: `Training module "${module.name}" updated${isActive !== undefined ? ` (${isActive ? 'activated' : 'deactivated'})` : ''}`,
      });

      res.json(module);
    } catch (error) {
      console.error("Error updating training module:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to update module" });
    }
  });

  // Delete training module (admin only)
  app.delete("/api/sl-training/modules/:id", requireAdmin, async (req, res) => {
    try {
      const existingModule = await storage.getSlTrainingModule(req.params.id);
      await storage.deleteSlTrainingModule(req.params.id);

      // Log training module deletion
      const user = req.session.user!;
      await storage.createGeneralLog({
        action: "training_module_deleted",
        category: "training",
        targetId: req.params.id,
        targetName: existingModule?.name || "Unknown",
        performedBy: user.id,
        performedByName: user.name,
        details: `Training module "${existingModule?.name || req.params.id}" deleted`,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting training module:", error);
      res.status(500).json({ error: "Failed to delete module" });
    }
  });

  // Upload questions via CSV content (admin only)
  app.post("/api/sl-training/modules/:id/questions", requireAdmin, async (req, res) => {
    try {
      const { csvContent } = z.object({
        csvContent: z.string().min(1, "CSV content is required"),
      }).parse(req.body);

      const moduleId = req.params.id;
      
      // Verify module exists
      const module = await storage.getSlTrainingModule(moduleId);
      if (!module) {
        return res.status(404).json({ error: "Module not found" });
      }

      // Parse CSV content
      const lines = csvContent.trim().split('\n');
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV must have a header row and at least one question" });
      }

      // Skip header row and parse questions
      const questions: Array<{
        moduleId: string;
        question: string;
        choice1: string;
        choice2: string;
        choice3: string;
        choice4: string;
        correctAnswer: number;
        orderIndex: number;
      }> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line (handle quoted values)
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
          orderIndex: i - 1,
        });
      }

      if (questions.length === 0) {
        return res.status(400).json({ error: "No valid questions found in CSV" });
      }

      // Delete existing questions and add new ones
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

  // Download sample CSV template
  app.get("/api/sl-training/sample-csv", requireAuth, (req, res) => {
    const sampleCSV = `Question,Choice1,Choice2,Choice3,Choice4,CorrectAnswer
"What is the minimum salary for a Skilled Worker visa?","£20,480","£26,200","£38,700","£15,000",3
"How long is a Sponsor Licence valid for?","1 year","2 years","4 years","10 years",3
"What does COS stand for?","Certificate of Sponsorship","Certificate of Status","Compliance Order Sheet","Company Offer Statement",1`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="sample-questions.csv"');
    res.send(sampleCSV);
  });

  // Get user's training progress/scores
  app.get("/api/sl-training/progress", requireAuth, async (req, res) => {
    try {
      const user = req.session.user!;
      const scores = await storage.getSlTrainingScores(user.id);
      res.json(scores);
    } catch (error) {
      console.error("Error fetching training progress:", error);
      res.status(500).json({ error: "Failed to fetch training progress" });
    }
  });

  // Submit quiz answers
  app.post("/api/sl-training/modules/:id/quiz", requireAuth, async (req, res) => {
    try {
      const { answers } = z.object({
        answers: z.array(z.number().min(1).max(4)),
      }).parse(req.body);

      const moduleId = req.params.id;
      const user = req.session.user!;

      // Get module questions
      const questions = await storage.getSlTrainingQuestions(moduleId);
      
      if (questions.length === 0) {
        return res.status(400).json({ error: "This module has no questions" });
      }

      if (answers.length !== questions.length) {
        return res.status(400).json({ 
          error: `Expected ${questions.length} answers, got ${answers.length}` 
        });
      }

      // Calculate score
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
          choices: [q.choice1, q.choice2, q.choice3, q.choice4],
        };
      });

      const score = Math.round((correctCount / questions.length) * 100);

      // Save score
      const savedScore = await storage.upsertSlTrainingScore({
        userId: user.id,
        moduleId,
        score,
        totalQuestions: questions.length,
        correctAnswers: correctCount,
        lastAnswers: answers,
      });

      res.json({
        score,
        correctAnswers: correctCount,
        totalQuestions: questions.length,
        results,
        savedScore,
      });
    } catch (error) {
      console.error("Error submitting quiz:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Failed to submit quiz" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper function to parse CSV line with quoted values
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
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
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}
