import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { localStorageService } from "@/lib/localStorage";
import { authService } from "@/lib/authService";
import { idGenerator } from "@/lib/idGenerator";
import type { Company, Task } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Search, Trash2, Building2, Calendar, User, Mail, Phone, FileText, Download, Upload, RefreshCw } from "lucide-react";
import importedCompaniesData from "@/data/imported-companies.json";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, setYear, isAfter, addYears } from "date-fns";
import { calculateDataCompletion } from "@/lib/utils/dataCompletion";
import { DateTime } from "luxon";

type CompanyFilter = "all" | "active" | "inactive";

function calculateNextRenewalDate(incorporationDate: string | undefined): Date | null {
  if (!incorporationDate) return null;
  
  try {
    const incDate = new Date(incorporationDate);
    const today = new Date();
    
    // Get this year's anniversary
    let nextRenewal = setYear(incDate, today.getFullYear());
    
    // If this year's anniversary has already passed, use next year
    if (!isAfter(nextRenewal, today)) {
      nextRenewal = addYears(nextRenewal, 1);
    }
    
    return nextRenewal;
  } catch {
    return null;
  }
}

function countOverdueTasks(companyId: string, tasks: Task[]): number {
  const now = DateTime.now().setZone("Europe/London");
  
  return tasks.filter((task) => {
    // Only count open tasks
    if (task.status !== "open") return false;
    
    // Only count tasks for this company
    if (task.companyId !== companyId) return false;
    
    // Check if overdue
    const dueDate = DateTime.fromISO(task.dueAt, { zone: "Europe/London" });
    return dueDate < now;
  }).length;
}

function countOverdueReviews(companyId: string, tasks: Task[]): number {
  return tasks.filter((task) => {
    // Only count tasks for this company
    if (task.companyId !== companyId) return false;
    
    // Only count done or cancelled tasks that are not reviewed
    if (task.status !== "done" && task.status !== "cancelled") return false;
    
    return !task.reviewed;
  }).length;
}

function calculateDaysSinceLastSync(lastSyncTimestamp: string | null): number | null {
  if (!lastSyncTimestamp) return null;
  
  const now = DateTime.now().setZone("Europe/London");
  const lastSync = DateTime.fromISO(lastSyncTimestamp, { zone: "Europe/London" });
  
  return Math.floor(now.diff(lastSync, "days").days);
}

function calculateCorporateHealthiness(
  company: Company, 
  tasks: Task[], 
  dataCompletion: { percentage: number },
  lastSyncTimestamp: string | null
): { status: "Healthy" | "Need attention"; isHealthy: boolean } {
  // Check data completion is 100%
  if (dataCompletion.percentage !== 100) {
    return { status: "Need attention", isHealthy: false };
  }
  
  // Check no overdue tasks
  const overdueCount = countOverdueTasks(company.id, tasks);
  if (overdueCount > 0) {
    return { status: "Need attention", isHealthy: false };
  }
  
  // Check no overdue reviews
  const overdueReviews = countOverdueReviews(company.id, tasks);
  if (overdueReviews > 0) {
    return { status: "Need attention", isHealthy: false };
  }
  
  // Check C.House sync within 2 days
  const daysSinceSync = calculateDaysSinceLastSync(lastSyncTimestamp);
  if (daysSinceSync === null || daysSinceSync > 2) {
    return { status: "Need attention", isHealthy: false };
  }
  
  return { status: "Healthy", isHealthy: true };
}

export default function ShowCompanies() {
  console.log("🔵 ShowCompanies component rendering");
  
  const [searchTerm, setSearchTerm] = useState("");
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [companyToToggle, setCompanyToToggle] = useState<{ company: Company; newStatus: boolean } | null>(null);
  const [companyToDeactivate, setCompanyToDeactivate] = useState<Company | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("");
  const [companyToRemoveFromSL, setCompanyToRemoveFromSL] = useState<Company | null>(null);
  const [removeSLReason, setRemoveSLReason] = useState("");
  const [filter, setFilter] = useState<CompanyFilter>("all");
  const { toast} = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  console.log("🔵 About to execute useQuery for companies");
  const { data: companies = [], isLoading, error, refetch } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    staleTime: 0, // Always refetch to avoid cached empty data
  });
  console.log("🔵 useQuery executed, companies:", companies, "isLoading:", isLoading, "error:", error);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    staleTime: 0, // Always refetch to avoid cached empty data
  });

  // Debug logging
  useEffect(() => {
    console.log("Companies query state:", {
      companies: companies?.length,
      isLoading,
      error: error?.message,
      hasData: !!companies
    });
  }, [companies, isLoading, error]);

  // Force initial refetch to clear any cached empty data
  useEffect(() => {
    refetch();
  }, []);

  const { data: lastSync } = useQuery<string | null>({
    queryKey: ["last-sync"],
    queryFn: api.getLastSyncTimestamp,
  });

  const requestDeletionMutation = useMutation({
    mutationFn: async (data: { companyId: string; companyName: string; reason: string }) => {
      const currentUser = await authService.getCurrentUser();
      if (!currentUser) throw new Error("Not authenticated");
      
      return await api.createDeletionRequest({
        companyId: data.companyId,
        companyName: data.companyName,
        reason: data.reason,
        requestedBy: currentUser.id,
        requestedByName: currentUser.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "deletion-requests"] });
      toast({
        title: "Deletion request submitted",
        description: "Your request has been sent to the Companies Auditor for approval.",
      });
      setCompanyToDelete(null);
      setDeleteConfirmText("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting deletion request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveStatusMutation = useMutation({
    mutationFn: async ({ id, isActive, reason }: { id: string; isActive: boolean; reason?: string }) => {
      // Update company
      const result = await api.updateCompany(id, { isActive });
      
      // If deactivating (reason provided), log activity
      if (!isActive && reason) {
        const company = companies.find(c => c.id === id);
        if (company) {
          const currentUser = authService.getCurrentUser();
          const activityLog = {
            id: idGenerator.generateLogID(),
            companyId: id,
            companyName: company.name,
            action: "deactivated",
            reason,
            timestamp: new Date().toISOString(),
            performedBy: currentUser?.name || "System",
            meta: {},
          };
          localStorageService.addCompanyActivityLog(activityLog);
        }
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setCompanyToToggle(null);
      setCompanyToDeactivate(null);
      setDeactivateReason("");
      
      if (!variables.isActive) {
        toast({
          title: "Company deactivated",
          description: "The company has been marked as inactive.",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating company status",
        description: error.message,
        variant: "destructive",
      });
      setCompanyToToggle(null);
      setCompanyToDeactivate(null);
      setDeactivateReason("");
    },
  });

  const toggleSLMutation = useMutation({
    mutationFn: async ({ id, sl, reason }: { id: string; sl: boolean; reason?: string }) => {
      // Update company
      const result = await api.updateCompany(id, { sl });
      
      // If removing from SL (reason provided), log activity
      if (!sl && reason) {
        const company = companies.find(c => c.id === id);
        if (company) {
          const currentUser = authService.getCurrentUser();
          const activityLog = {
            id: idGenerator.generateLogID(),
            companyId: id,
            companyName: company.name,
            action: "removed_from_sl",
            reason,
            timestamp: new Date().toISOString(),
            performedBy: currentUser?.name || "System",
            meta: {},
          };
          localStorageService.addCompanyActivityLog(activityLog);
        }
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setCompanyToRemoveFromSL(null);
      setRemoveSLReason("");
      
      toast({
        title: "SL status updated",
        description: variables.sl 
          ? "The company has been marked for Sponsorship License preparation."
          : "The company has been removed from Sponsorship License preparation.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating SL status",
        description: error.message,
        variant: "destructive",
      });
      setCompanyToRemoveFromSL(null);
      setRemoveSLReason("");
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async () => {
      const promises = importedCompaniesData.map(company => 
        api.createCompany(company as any)
      );
      return await Promise.all(promises);
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Import successful!",
        description: `Successfully imported ${results.length} companies from Excel file.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      return await api.syncAllCompaniesWithCH();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["last-sync"] });
      
      toast({
        title: "Sync completed",
        description: `Updated ${result.updated} of ${result.total} companies. ${result.failed > 0 ? `${result.failed} failed.` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredCompanies = companies.filter((company) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch = 
      company.name.toLowerCase().includes(search) ||
      company.number.toLowerCase().includes(search) ||
      (company.ownerName?.toLowerCase().includes(search) ?? false) ||
      (company.ownerEmail?.toLowerCase().includes(search) ?? false);
    
    const matchesFilter = 
      filter === "all" ? true :
      filter === "active" ? company.isActive !== false :
      filter === "inactive" ? company.isActive === false :
      true;
    
    return matchesSearch && matchesFilter;
  });

  const activeCount = companies.filter(c => c.isActive !== false).length;
  const inactiveCount = companies.filter(c => c.isActive === false).length;

  const escapeCSVCell = (cell: string): string => {
    const str = String(cell);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportToCSV = () => {
    const headers = [
      "Company Name",
      "Company Number",
      "Address",
      "Incorporation Date",
      "Industry Code",
      "Active Status",
      "Directors",
      "Officers",
      "PSCs",
      "Previous Names",
      "Internal Code",
      "UTR",
      "Government Gateway",
      "Owner Name",
      "Owner Emails",
      "Owner Phones",
      "Companies House Link",
      "Google Drive Link",
      "PSC Link",
      "Shareholders Link",
      "Director Link",
      "Vendor Name",
      "Renewal Date",
      "Renewal Fees",
      "Auth Code",
      "Shareholders",
      "Company Status",
      "Company Type",
      "Jurisdiction",
      "Has Charges",
      "Has Insolvency",
      "Confirmation Statement Due",
      "Accounts Due",
      "Last Accounts Date",
      "Confirmation Statement Last Made",
      "Last Sync Date",
      "Sync Status",
      "Number of Charges",
      "Number of Insolvency Cases",
      "Number of Filings"
    ];

    const rows = filteredCompanies.map(company => [
      company.name,
      company.number,
      company.address || "",
      company.incorporationDate ? format(new Date(company.incorporationDate), "yyyy-MM-dd") : "",
      company.industryCode || "",
      company.isActive !== false ? "Active" : "Inactive",
      company.directors?.map(d => d.name).join("; ") || company.director || "",
      company.officers?.map(o => o.name).join("; ") || "",
      company.pscs?.map(p => p.name).join("; ") || company.psc || "",
      company.previousNames?.map(pn => pn.name).join("; ") || "",
      company.internalCode || "",
      company.utr || "",
      company.governmentGateway || "",
      company.ownerName || "",
      company.ownerEmails?.join("; ") || company.ownerEmail || "",
      company.ownerPhones?.join("; ") || company.ownerPhone || "",
      company.companiesHouseLink || "",
      company.googleDriveLink || "",
      company.pscLink || "",
      company.shareholdersLink || "",
      company.directorLink || "",
      company.vendorName || "",
      company.renewalDate ? format(new Date(company.renewalDate), "yyyy-MM-dd") : "",
      company.renewalFees || "",
      company.authCode || "",
      company.shareholders || "",
      company.companyStatus || "",
      company.companyType || "",
      company.jurisdiction || "",
      company.hasCharges ? "Yes" : "No",
      company.hasInsolvency ? "Yes" : "No",
      company.confirmationStatementDue ? format(new Date(company.confirmationStatementDue), "yyyy-MM-dd") : "",
      company.accountsDue ? format(new Date(company.accountsDue), "yyyy-MM-dd") : "",
      company.lastAccountsDate ? format(new Date(company.lastAccountsDate), "yyyy-MM-dd") : "",
      company.confirmationStatementLastMade ? format(new Date(company.confirmationStatementLastMade), "yyyy-MM-dd") : "",
      company.lastSyncDate ? format(new Date(company.lastSyncDate), "yyyy-MM-dd HH:mm") : "",
      company.syncStatus || "never",
      String(company.charges?.length ?? 0),
      String(company.insolvencyHistory?.length ?? 0),
      String(company.filings?.length ?? 0)
    ]);

    const csvContent = [
      headers.map(h => escapeCSVCell(h)).join(","),
      ...rows.map(row => row.map(cell => escapeCSVCell(cell || "")).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `companies-export-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export successful",
      description: `Exported ${filteredCompanies.length} companies to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Building2 className="h-6 w-6 text-primary" />
                Companies Directory
              </CardTitle>
              <CardDescription>
                Browse and manage all registered companies
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name or number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                <p className="mt-4 text-sm text-muted-foreground">Loading companies...</p>
              </div>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="space-y-6">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium text-foreground">
                  {searchTerm ? "No companies found" : "No companies yet"}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Get started by importing companies or adding your first company manually"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {filteredCompanies.length} {filteredCompanies.length === 1 ? "company" : "companies"}
                  </Badge>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => syncAllMutation.mutate()}
                      disabled={syncAllMutation.isPending}
                      data-testid="button-sync-all"
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${syncAllMutation.isPending ? 'animate-spin' : ''}`} />
                      {syncAllMutation.isPending ? "Syncing..." : "Sync All with Companies House"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      data-testid="button-export-csv"
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Export to CSV
                    </Button>
                  </div>
                </div>
                {lastSync ? (
                  (() => {
                    const now = DateTime.now().setZone("Europe/London");
                    const lastSyncDate = DateTime.fromISO(lastSync, { zone: "Europe/London" });
                    const daysSinceLastSync = Math.floor(now.diff(lastSyncDate, "days").days);
                    const isOld = daysSinceLastSync > 2;
                    
                    return (
                      <div 
                        className={`text-xs font-medium ${isOld ? "text-red-600" : "text-muted-foreground"}`}
                        data-testid="text-last-sync"
                      >
                        {isOld 
                          ? "⚠️ No recent companies house sync - Click Sync" 
                          : `Last synced: ${format(new Date(lastSync), "MMM d, yyyy 'at' h:mm a")}`
                        }
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-xs font-medium text-red-600" data-testid="text-last-sync">
                    ⚠️ No recent companies house sync - Click Sync
                  </div>
                )}
              </div>
              <Tabs value={filter} onValueChange={(value) => setFilter(value as CompanyFilter)} data-testid="tabs-company-filter">
                <TabsList>
                  <TabsTrigger value="all" data-testid="tab-all-companies">
                    All Companies ({companies.length})
                  </TabsTrigger>
                  <TabsTrigger value="active" data-testid="tab-active-companies">
                    Active ({activeCount})
                  </TabsTrigger>
                  <TabsTrigger value="inactive" data-testid="tab-inactive-companies">
                    Inactive ({inactiveCount})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16 font-semibold">Active</TableHead>
                      <TableHead className="w-16 font-semibold">SL</TableHead>
                      <TableHead className="font-semibold">Company</TableHead>
                      <TableHead className="font-semibold">Number</TableHead>
                      <TableHead className="font-semibold">Corporate Healthiness</TableHead>
                      <TableHead className="font-semibold">Incorporation Date</TableHead>
                      <TableHead className="font-semibold">Next Renewal Date</TableHead>
                      <TableHead className="font-semibold">Overdue Tasks</TableHead>
                      <TableHead className="font-semibold">Overdue Review</TableHead>
                      <TableHead className="font-semibold">Last C.House Sync (days)</TableHead>
                      <TableHead className="font-semibold">Data Completion</TableHead>
                      <TableHead className="w-24 font-semibold">System ID</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow 
                        key={company.id} 
                        className={`hover-elevate cursor-pointer ${company.isActive === false ? "opacity-50" : ""}`}
                        data-testid={`row-company-${company.id}`}
                        onClick={() => setLocation(`/company/${company.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={company.isActive !== false}
                            onCheckedChange={(checked) => {
                              if (checked === false) {
                                // Show confirmation dialog for deactivation
                                setCompanyToDeactivate(company);
                              } else {
                                // Activate without confirmation
                                toggleActiveStatusMutation.mutate({
                                  id: company.id,
                                  isActive: true,
                                });
                              }
                            }}
                            data-testid={`checkbox-active-${company.id}`}
                          />
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={company.sl === true}
                            onCheckedChange={(checked) => {
                              if (checked === false && company.sl === true) {
                                // Cannot uncheck from Show Companies - must go to SL Prep tab
                                toast({
                                  title: "Cannot remove from SL Prep here",
                                  description: "To remove a company from SL Prep, please use the SL Prep tab.",
                                  variant: "destructive",
                                });
                              } else {
                                // Add to SL without confirmation
                                toggleSLMutation.mutate({
                                  id: company.id,
                                  sl: true,
                                });
                              }
                            }}
                            data-testid={`checkbox-sl-${company.id}`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <span data-testid={`text-company-name-${company.id}`}>
                              {company.name}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`text-company-number-${company.id}`}>
                            {company.number}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const completion = calculateDataCompletion(company);
                            const healthiness = calculateCorporateHealthiness(company, tasks, completion, lastSync ?? null);
                            return (
                              <div className="flex items-center justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    healthiness.isHealthy
                                      ? "bg-green-50 text-green-700 border-green-200 font-medium"
                                      : "bg-red-50 text-red-700 border-red-200 font-medium"
                                  }
                                  data-testid={`badge-healthiness-${company.id}`}
                                >
                                  {healthiness.status}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm" data-testid={`text-incorporation-date-${company.id}`}>
                              {company.incorporationDate ? format(new Date(company.incorporationDate), "dd MMM yyyy") : "-"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm font-medium text-primary" data-testid={`text-next-renewal-${company.id}`}>
                              {(() => {
                                const nextRenewal = calculateNextRenewalDate(company.incorporationDate);
                                return nextRenewal ? format(nextRenewal, "dd MMM yyyy") : "-";
                              })()}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const overdueCount = countOverdueTasks(company.id, tasks);
                            return (
                              <div className="flex items-center justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    overdueCount === 0
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }
                                  data-testid={`badge-overdue-${company.id}`}
                                >
                                  {overdueCount}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const overdueReviews = countOverdueReviews(company.id, tasks);
                            return (
                              <div className="flex items-center justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    overdueReviews === 0
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }
                                  data-testid={`badge-overdue-review-${company.id}`}
                                >
                                  {overdueReviews}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const daysSinceSync = calculateDaysSinceLastSync(lastSync ?? null);
                            if (daysSinceSync === null) {
                              return (
                                <div className="flex items-center justify-center">
                                  <Badge
                                    variant="outline"
                                    className="bg-red-50 text-red-700 border-red-200"
                                    data-testid={`badge-sync-days-${company.id}`}
                                  >
                                    Never
                                  </Badge>
                                </div>
                              );
                            }
                            return (
                              <div className="flex items-center justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    daysSinceSync <= 2
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }
                                  data-testid={`badge-sync-days-${company.id}`}
                                >
                                  {daysSinceSync}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const completion = calculateDataCompletion(company);
                            return (
                              <div className="space-y-1 min-w-[120px]">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium" data-testid={`text-completion-${company.id}`}>
                                    {completion.percentage}%
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {completion.filled}/{completion.total}
                                  </span>
                                </div>
                                <Progress value={completion.percentage} className="h-1.5" />
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs" data-testid={`text-company-id-${company.id}`}>
                            {company.id}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setCompanyToDelete(company)}
                            data-testid={`button-delete-${company.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!companyToDelete} onOpenChange={(open) => {
        if (!open) {
          setCompanyToDelete(null);
          setDeleteConfirmText("");
        }
      }}>
        <DialogContent data-testid="dialog-delete-company">
          <DialogHeader>
            <DialogTitle>Request Company Deletion</DialogTitle>
            <DialogDescription>
              You are requesting to delete <strong>{companyToDelete?.name}</strong>. 
              This request will be sent to the Companies Auditor for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground mb-2">Once approved, this will permanently remove:</p>
              <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
                <li>All company tasks and history</li>
                <li>All employee records linked to this company</li>
                <li>All compliance and audit data</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="deletion-reason">
                Reason for deletion request *
              </Label>
              <Textarea
                id="deletion-reason"
                placeholder="Enter reason for requesting deletion (minimum 10 characters)..."
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-deletion-reason"
              />
              {deleteConfirmText.trim().length > 0 && deleteConfirmText.trim().length < 10 && (
                <p className="text-sm text-destructive">
                  Reason must be at least 10 characters ({deleteConfirmText.trim().length}/10)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompanyToDelete(null);
                setDeleteConfirmText("");
              }}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (companyToDelete && deleteConfirmText.trim().length >= 10) {
                  requestDeletionMutation.mutate({
                    companyId: companyToDelete.id,
                    companyName: companyToDelete.name,
                    reason: deleteConfirmText.trim(),
                  });
                }
              }}
              disabled={deleteConfirmText.trim().length < 10 || requestDeletionMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {requestDeletionMutation.isPending ? "Submitting..." : "Submit Deletion Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!companyToDeactivate} onOpenChange={(open) => {
        if (!open) {
          setCompanyToDeactivate(null);
          setDeactivateReason("");
        }
      }}>
        <DialogContent data-testid="dialog-deactivate-company">
          <DialogHeader>
            <DialogTitle>Deactivate Company</DialogTitle>
            <DialogDescription>
              You are about to mark <strong>{companyToDeactivate?.name}</strong> as inactive. 
              Please provide a reason for this action (minimum 10 characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deactivate-reason">Reason for deactivation *</Label>
              <Textarea
                id="deactivate-reason"
                placeholder="Enter reason (minimum 10 characters)..."
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-deactivate-reason"
              />
              {deactivateReason.length > 0 && deactivateReason.length < 10 && (
                <p className="text-sm text-destructive">
                  Reason must be at least 10 characters ({deactivateReason.length}/10)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompanyToDeactivate(null);
                setDeactivateReason("");
              }}
              data-testid="button-cancel-deactivate"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (companyToDeactivate && deactivateReason.length >= 10) {
                  toggleActiveStatusMutation.mutate({
                    id: companyToDeactivate.id,
                    isActive: false,
                    reason: deactivateReason,
                  });
                }
              }}
              disabled={deactivateReason.length < 10 || toggleActiveStatusMutation.isPending}
              data-testid="button-confirm-deactivate"
            >
              {toggleActiveStatusMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!companyToRemoveFromSL} onOpenChange={(open) => {
        if (!open) {
          setCompanyToRemoveFromSL(null);
          setRemoveSLReason("");
        }
      }}>
        <DialogContent data-testid="dialog-remove-from-sl">
          <DialogHeader>
            <DialogTitle>Remove from SL Prep</DialogTitle>
            <DialogDescription>
              You are about to remove <strong>{companyToRemoveFromSL?.name}</strong> from Sponsorship License preparation. 
              Please provide a reason for this action (minimum 10 characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remove-sl-reason">Reason for removal *</Label>
              <Textarea
                id="remove-sl-reason"
                placeholder="Enter reason (minimum 10 characters)..."
                value={removeSLReason}
                onChange={(e) => setRemoveSLReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-remove-sl-reason"
              />
              {removeSLReason.length > 0 && removeSLReason.length < 10 && (
                <p className="text-sm text-destructive">
                  Reason must be at least 10 characters ({removeSLReason.length}/10)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompanyToRemoveFromSL(null);
                setRemoveSLReason("");
              }}
              data-testid="button-cancel-remove-sl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (companyToRemoveFromSL && removeSLReason.length >= 10) {
                  toggleSLMutation.mutate({
                    id: companyToRemoveFromSL.id,
                    sl: false,
                    reason: removeSLReason,
                  });
                }
              }}
              disabled={removeSLReason.length < 10 || toggleSLMutation.isPending}
              data-testid="button-confirm-remove-sl"
            >
              {toggleSLMutation.isPending ? "Removing..." : "Remove from SL Prep"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
