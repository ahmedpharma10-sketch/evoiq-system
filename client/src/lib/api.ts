import { localStorageService } from "./localStorage";
import { apiRequest } from "./queryClient";
import type { Company, InsertCompany, Task, InsertTask, TaskAudit } from "@shared/schema";

export const api = {
  async getCompanies(): Promise<Company[]> {
    const res = await fetch("/api/companies", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch companies");
    return res.json();
  },

  async createCompany(data: InsertCompany): Promise<Company> {
    const res = await apiRequest("POST", "/api/companies", data);
    return res.json();
  },

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const res = await apiRequest("PATCH", `/api/companies/${id}`, updates);
    return res.json();
  },

  async deleteCompany(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/companies/${id}`);
  },

  // Task API - renewal_date based task engine
  async getTasks(): Promise<Task[]> {
    const res = await fetch("/api/tasks", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch tasks");
    return res.json();
  },

  async getTasksByCompany(companyId: string): Promise<Task[]> {
    const res = await fetch(`/api/tasks/company/${companyId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch tasks for company");
    return res.json();
  },

  async upsertTask(data: InsertTask): Promise<Task> {
    const res = await apiRequest("POST", "/api/tasks", data);
    return res.json();
  },

  async updateTaskStatus(id: string, status: Task["status"], reason?: string): Promise<Task> {
    const res = await apiRequest("PATCH", `/api/tasks/${id}/status`, { status, reason });
    return res.json();
  },

  async markTaskAsReviewed(id: string, note?: string): Promise<Task> {
    const res = await apiRequest("PATCH", `/api/tasks/${id}/review`, { note });
    return res.json();
  },

  async reopenTask(id: string, reason?: string): Promise<Task> {
    const res = await apiRequest("POST", `/api/tasks/${id}/reopen`, { reason });
    return res.json();
  },

  async reopenEmployeeTask(id: string, reason?: string): Promise<any> {
    const res = await apiRequest("POST", `/api/employee-tasks/${id}/reopen`, { reason });
    return res.json();
  },

  // Audit log API
  async getAuditLogs(): Promise<TaskAudit[]> {
    const res = await fetch("/api/audit", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch audit logs");
    return res.json();
  },

  async getAuditLogsByTask(taskId: string): Promise<TaskAudit[]> {
    const res = await fetch(`/api/audit/task/${taskId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch audit logs for task");
    return res.json();
  },

  async getAuditLogsByCompany(companyId: string): Promise<TaskAudit[]> {
    const res = await fetch(`/api/audit/company/${companyId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch audit logs for company");
    return res.json();
  },

  async generateTasks(): Promise<{ success: boolean; tasksCreated: number; message: string }> {
    const res = await apiRequest("POST", "/api/tasks/generate", {});
    return res.json();
  },

  async getLastTaskGenerationTimestamp(): Promise<string | null> {
    const res = await fetch("/api/tasks/last-generation", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.timestamp;
  },

  async getLastSyncTimestamp(): Promise<string | null> {
    const res = await fetch("/api/companies/last-sync", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.timestamp;
  },

  async cancelCompanyTasks(companyId: string): Promise<void> {
    await apiRequest("POST", `/api/tasks/cancel-company/${companyId}`, {});
  },

  async fetchFromCompaniesHouse(companyId: string): Promise<{ 
    company: Company; 
    updated: boolean; 
    fieldsUpdated?: string[];
    message?: string;
  }> {
    const response = await fetch(`/api/companies/${companyId}/fetch-from-ch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    if (!response.ok) {
      let errorMessage = "Failed to fetch from Companies House";
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        // If response is not JSON, use the status text
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const result = await response.json();
    
    // Update local storage with the updated company data
    if (result.updated && result.company) {
      localStorageService.updateCompany(companyId, result.company);
    }
    
    return result;
  },

  async fetchCompanyDataByNumber(companyNumber: string): Promise<{
    success: boolean;
    data: Partial<Company>;
  }> {
    const response = await fetch("/api/companies/fetch-by-number", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ companyNumber }),
      credentials: "include",
    });

    if (!response.ok) {
      let errorMessage = "Failed to fetch from Companies House";
      let paddedNumber: string | undefined;
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
        paddedNumber = error.paddedNumber;
      } catch {
        errorMessage = response.statusText || errorMessage;
      }
      const error: any = new Error(errorMessage);
      if (paddedNumber) {
        error.paddedNumber = paddedNumber;
      }
      throw error;
    }

    return await response.json();
  },

  async recalculateRenewalDates(): Promise<{ success: boolean; updated: number; message: string }> {
    const companies = localStorageService.getCompanies();
    let updated = 0;
    
    for (const company of companies) {
      if (company.incorporationDate && !company.renewalDate) {
        // Calculate next renewal date from incorporation date
        const incDate = new Date(company.incorporationDate);
        const today = new Date();
        
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
        
        const renewalDate = nextRenewal.toISOString().split('T')[0];
        localStorageService.updateCompany(company.id, { renewalDate });
        updated++;
      }
    }
    
    return {
      success: true,
      updated,
      message: `Updated ${updated} companies with renewal dates`
    };
  },

  async syncAllCompaniesWithCH(): Promise<{
    total: number;
    updated: number;
    failed: number;
    results: Array<{ companyId: string; companyName: string; success: boolean; error?: string }>;
  }> {
    const res = await apiRequest("POST", "/api/companies/sync-all", {});
    return res.json();
  },

  // Deletion Requests API
  async createDeletionRequest(data: {
    companyId: string;
    companyName: string;
    reason: string;
    requestedBy: string;
    requestedByName: string;
  }): Promise<any> {
    const res = await apiRequest("POST", "/api/deletion-requests", data);
    return res.json();
  },

  async getDeletionRequests(): Promise<any[]> {
    const res = await fetch("/api/deletion-requests", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch deletion requests");
    return res.json();
  },

  async getPendingDeletionRequests(): Promise<any[]> {
    const res = await fetch("/api/deletion-requests/pending", { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch pending deletion requests");
    return res.json();
  },

  async approveDeletionRequest(id: string, reviewedBy: string, reviewedByName: string, reviewNotes?: string): Promise<any> {
    const res = await apiRequest("PATCH", `/api/deletion-requests/${id}/approve`, {
      reviewedBy,
      reviewedByName,
      reviewNotes,
    });
    return res.json();
  },

  async rejectDeletionRequest(id: string, reviewedBy: string, reviewedByName: string, reviewNotes?: string): Promise<any> {
    const res = await apiRequest("PATCH", `/api/deletion-requests/${id}/reject`, {
      reviewedBy,
      reviewedByName,
      reviewNotes,
    });
    return res.json();
  },

  // General Log API
  async getGeneralLogs(limit?: number): Promise<any[]> {
    const url = limit ? `/api/general-log?limit=${limit}` : "/api/general-log";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch general logs");
    return res.json();
  },
};
