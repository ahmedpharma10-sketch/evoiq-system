import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import { localStorageService } from "@/lib/localStorage";
import { authService } from "@/lib/authService";
import { idGenerator } from "@/lib/idGenerator";
import type { Company, Task, SLPrepTask, CompanySLPrepTaskStatus } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Building2, Calendar, FileCheck, CheckCircle2, Circle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, setYear, isAfter, addYears } from "date-fns";
import { calculateDataCompletion } from "@/lib/utils/dataCompletion";
import { DateTime } from "luxon";

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

export default function SLCompanies() {
  const [searchTerm, setSearchTerm] = useState("");
  const [companyToRemoveFromSL, setCompanyToRemoveFromSL] = useState<Company | null>(null);
  const [removeSLReason, setRemoveSLReason] = useState("");
  const [taskStatuses, setTaskStatuses] = useState<CompanySLPrepTaskStatus[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: api.getCompanies,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: api.getTasks,
  });

  const { data: lastSync } = useQuery<string | null>({
    queryKey: ["last-sync"],
    queryFn: api.getLastSyncTimestamp,
  });

  // Fetch SL Prep tasks from API
  const { data: slPrepTasksRaw = [] } = useQuery<SLPrepTask[]>({
    queryKey: ["/api", "sl-prep-tasks"],
  });
  
  // Sort tasks by order field
  const slPrepTasks = [...slPrepTasksRaw].sort((a, b) => a.order - b.order);

  // Load task statuses from localStorage
  useEffect(() => {
    const loadTaskStatuses = () => {
      const statuses = localStorageService.getCompanySLPrepTaskStatuses();
      setTaskStatuses(statuses);
    };
    
    loadTaskStatuses();
    
    // Reload when window gains focus (for cross-tab sync)
    const handleFocus = () => loadTaskStatuses();
    window.addEventListener('focus', handleFocus);
    
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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

  // Calculate SL Prep completion for a company
  const calculateSLPrepCompletion = (companyId: string): number => {
    if (slPrepTasks.length === 0) return 0;
    
    const completedCount = slPrepTasks.filter((task) => {
      const status = taskStatuses.find(
        (s) => s.companyId === companyId && s.taskId === task.id
      );
      return status?.isCompleted || false;
    }).length;
    
    return Math.round((completedCount / slPrepTasks.length) * 100);
  };

  // Calculate total SL Prep completion across all SL companies
  const calculateTotalSLPrepCompletion = () => {
    const slCompanies = companies.filter(c => c.sl === true);
    if (slCompanies.length === 0 || slPrepTasks.length === 0) {
      return { percentage: 0, completed: 0, total: 0 };
    }
    
    const totalTasks = slCompanies.length * slPrepTasks.length;
    let completedTasks = 0;
    
    slCompanies.forEach(company => {
      slPrepTasks.forEach(task => {
        const status = taskStatuses.find(
          (s) => s.companyId === company.id && s.taskId === task.id
        );
        if (status?.isCompleted) {
          completedTasks++;
        }
      });
    });
    
    const percentage = Math.round((completedTasks / totalTasks) * 100);
    return { percentage, completed: completedTasks, total: totalTasks };
  };

  // Show only companies with SL enabled
  // Filter by SL status first, then by search term
  const filteredCompanies = companies.filter((company) => {
    // Only show companies with SL enabled
    if (!company.sl) return false;
    
    // Then filter by search term
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(searchLower) ||
      company.number.toLowerCase().includes(searchLower)
    );
  });

  const totalCompletion = calculateTotalSLPrepCompletion();
  
  // Calculate total COS counts across all SL companies
  const totalCOS = companies
    .filter(c => c.sl === true)
    .reduce((acc, company) => {
      const defined = company.slDefinedCOS || 0;
      const undefined = company.slUndefinedCOS || 0;
      return {
        defined: acc.defined + defined,
        undefined: acc.undefined + undefined,
        total: acc.total + defined + undefined,
      };
    }, { defined: 0, undefined: 0, total: 0 });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="mt-4 text-sm text-muted-foreground">Loading companies...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <FileCheck className="h-6 w-6 text-primary" />
                SL Prep Management
              </CardTitle>
              <CardDescription>
                Manage Sponsorship License preparation for companies with SL enabled.
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
                data-testid="input-search-sl"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                No companies found
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your search terms
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-3">
                {/* COS Totals Summary */}
                {companies.filter(c => c.sl === true).length > 0 && (
                  <div className="flex items-center gap-4 rounded-md border bg-muted/30 p-3">
                    <span className="text-sm font-medium">Total COS across all SL companies:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold" data-testid="badge-total-defined-cos">
                        Defined: {totalCOS.defined}
                      </Badge>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold" data-testid="badge-total-undefined-cos">
                        Undefined: {totalCOS.undefined}
                      </Badge>
                      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 font-semibold" data-testid="badge-total-cos">
                        Total: {totalCOS.total}
                      </Badge>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-sm">
                    {filteredCompanies.length} {filteredCompanies.length === 1 ? "company" : "companies"}
                  </Badge>
                  {companies.filter(c => c.sl === true).length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Total SL Prep Completion:</span>
                      <Badge 
                        variant="outline" 
                        className={
                          totalCompletion.percentage === 100
                            ? "bg-green-50 text-green-700 border-green-200 font-semibold"
                            : totalCompletion.percentage >= 50
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold"
                            : "bg-red-50 text-red-700 border-red-200 font-semibold"
                        }
                        data-testid="badge-total-sl-completion"
                      >
                        {totalCompletion.percentage}% ({totalCompletion.completed} / {totalCompletion.total}) tasks
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16 font-semibold">SL</TableHead>
                      <TableHead className="font-semibold">Company</TableHead>
                      <TableHead className="font-semibold text-center">SL Prep %</TableHead>
                      <TableHead className="font-semibold">Number</TableHead>
                      <TableHead className="font-semibold">SL Number</TableHead>
                      <TableHead className="font-semibold">SL Issue Date</TableHead>
                      <TableHead className="font-semibold">Corporate Healthiness</TableHead>
                      {slPrepTasks.map((task) => {
                        const words = task.name.trim().split(/\s+/);
                        const headerText = words.slice(0, 2).join(' ');
                        return (
                          <TableHead key={task.id} className="w-32 font-semibold text-center">
                            {headerText}
                          </TableHead>
                        );
                      })}
                      <TableHead className="font-semibold">Incorporation Date</TableHead>
                      <TableHead className="font-semibold">Next Renewal Date</TableHead>
                      <TableHead className="font-semibold">Overdue Tasks</TableHead>
                      <TableHead className="font-semibold">Overdue Review</TableHead>
                      <TableHead className="font-semibold">Last C.House Sync (days)</TableHead>
                      <TableHead className="font-semibold">Data Completion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow 
                        key={company.id} 
                        className={`hover-elevate cursor-pointer ${!company.sl ? 'opacity-40 text-muted-foreground' : ''}`}
                        data-testid={`row-sl-company-${company.id}`}
                        onClick={() => setLocation(`/company/${company.id}?from=sl-prep`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={company.sl === true}
                            onCheckedChange={(checked) => {
                              if (checked === false && company.sl === true) {
                                // Show confirmation dialog for removing from SL
                                setCompanyToRemoveFromSL(company);
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
                          {(() => {
                            const completion = calculateSLPrepCompletion(company.id);
                            return (
                              <div className="flex items-center justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    completion === 100
                                      ? "bg-green-50 text-green-700 border-green-200 font-semibold"
                                      : completion >= 50
                                      ? "bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold"
                                      : "bg-red-50 text-red-700 border-red-200 font-semibold"
                                  }
                                  data-testid={`badge-sl-prep-completion-${company.id}`}
                                >
                                  {completion}%
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" data-testid={`text-company-number-${company.id}`}>
                            {company.number}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-sl-number-${company.id}`}>
                          {company.slLicenseNumber ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {company.slLicenseNumber}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-sl-issue-date-${company.id}`}>
                          {company.slLicenseIssueDate ? (
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{format(new Date(company.slLicenseIssueDate), "dd MMM yyyy")}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
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
                        {slPrepTasks.map((task) => {
                          const status = taskStatuses.find(
                            (s) => s.companyId === company.id && s.taskId === task.id
                          );
                          const isCompleted = status?.isCompleted || false;
                          return (
                            <TableCell 
                              key={task.id} 
                              className="text-center"
                              onClick={(e) => e.stopPropagation()}
                              data-testid={`cell-task-${company.id}-${task.id}`}
                            >
                              <div className="flex items-center justify-center">
                                {isCompleted ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                                ) : (
                                  <Circle className="h-5 w-5 text-muted-foreground" />
                                )}
                              </div>
                            </TableCell>
                          );
                        })}
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
                            const overdueReviewCount = countOverdueReviews(company.id, tasks);
                            return (
                              <div className="flex items-center justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    overdueReviewCount === 0
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  }
                                  data-testid={`badge-overdue-review-${company.id}`}
                                >
                                  {overdueReviewCount}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const daysSinceSync = calculateDaysSinceLastSync(lastSync ?? null);
                            return (
                              <div className="flex items-center justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    daysSinceSync !== null && daysSinceSync <= 2
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }
                                  data-testid={`badge-sync-days-${company.id}`}
                                >
                                  {daysSinceSync !== null ? daysSinceSync : "N/A"}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const completion = calculateDataCompletion(company);
                            return (
                              <div className="flex items-center justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    completion.percentage === 100
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  }
                                  data-testid={`badge-completion-${company.id}`}
                                >
                                  {completion.percentage}%
                                </Badge>
                              </div>
                            );
                          })()}
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

      <Dialog open={!!companyToRemoveFromSL} onOpenChange={(open) => {
        if (!open) {
          setCompanyToRemoveFromSL(null);
          setRemoveSLReason("");
        }
      }}>
        <DialogContent data-testid="dialog-remove-from-sl-slpage">
          <DialogHeader>
            <DialogTitle>Remove from SL Prep</DialogTitle>
            <DialogDescription>
              You are about to remove <strong>{companyToRemoveFromSL?.name}</strong> from Sponsorship License preparation. 
              Please provide a reason for this action (minimum 10 characters).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="remove-sl-reason-slpage">Reason for removal *</Label>
              <Textarea
                id="remove-sl-reason-slpage"
                placeholder="Enter reason (minimum 10 characters)..."
                value={removeSLReason}
                onChange={(e) => setRemoveSLReason(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-remove-sl-reason-slpage"
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
              data-testid="button-cancel-remove-sl-slpage"
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
              data-testid="button-confirm-remove-sl-slpage"
            >
              {toggleSLMutation.isPending ? "Removing..." : "Remove from SL Prep"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
