import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api } from "@/lib/api";
import type { Company, Task } from "@shared/schema";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Building2, Calendar, FileCheck, Award } from "lucide-react";
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

export default function SLIssued() {
  const [searchTerm, setSearchTerm] = useState("");
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

  // Filter for companies with issued SL licenses
  const slIssuedCompanies = companies.filter((company) => company.slLicenseIssued === true);

  // Calculate total COS counts for all SL issued companies
  const totalCOS = slIssuedCompanies.reduce((acc, company) => {
    const defined = company.slDefinedCOS || 0;
    const undefined = company.slUndefinedCOS || 0;
    return {
      defined: acc.defined + defined,
      undefined: acc.undefined + undefined,
      total: acc.total + defined + undefined,
    };
  }, { defined: 0, undefined: 0, total: 0 });

  // Apply search filter
  const filteredCompanies = slIssuedCompanies.filter((company) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      company.name.toLowerCase().includes(search) ||
      company.number.toLowerCase().includes(search) ||
      (company.slLicenseNumber && company.slLicenseNumber.toLowerCase().includes(search))
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading companies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex-1 space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                Issued Sponsorship Licenses
              </CardTitle>
              <CardDescription>
                Companies with completed Sponsorship License issuance
              </CardDescription>
              {slIssuedCompanies.length > 0 && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-sm font-semibold text-foreground">Total COS:</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-bold text-sm px-3 py-1" data-testid="badge-sl-issued-defined-cos">
                    Defined: {totalCOS.defined}
                  </Badge>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-bold text-sm px-3 py-1" data-testid="badge-sl-issued-undefined-cos">
                    Undefined: {totalCOS.undefined}
                  </Badge>
                  <Badge variant="outline" className="bg-gray-700 text-white border-gray-700 font-bold text-sm px-3 py-1" data-testid="badge-sl-issued-total-cos">
                    Total: {totalCOS.total}
                  </Badge>
                </div>
              )}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search by name, number, or SL number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search-sl-issued"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium text-foreground">
                {slIssuedCompanies.length === 0 ? "No issued licenses yet" : "No companies found"}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {slIssuedCompanies.length === 0 
                  ? "Companies will appear here once their Sponsorship License is issued"
                  : "Try adjusting your search terms"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <Badge variant="secondary" className="text-sm">
                {filteredCompanies.length} {filteredCompanies.length === 1 ? "company" : "companies"}
              </Badge>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Company</TableHead>
                      <TableHead className="font-semibold">Number</TableHead>
                      <TableHead className="font-semibold">SL Number</TableHead>
                      <TableHead className="font-semibold">SL Issue Date</TableHead>
                      <TableHead className="font-semibold text-center">Defined COS</TableHead>
                      <TableHead className="font-semibold text-center">Undefined COS</TableHead>
                      <TableHead className="font-semibold text-center">Unassigned Def.</TableHead>
                      <TableHead className="font-semibold text-center">Unassigned Undef.</TableHead>
                      <TableHead className="font-semibold">Phone</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Website</TableHead>
                      <TableHead className="font-semibold">Corporate Healthiness</TableHead>
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
                        className="hover-elevate cursor-pointer"
                        data-testid={`row-sl-issued-${company.id}`}
                        onClick={() => setLocation(`/company/${company.id}`)}
                      >
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
                        <TableCell data-testid={`text-sl-number-${company.id}`}>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            {company.slLicenseNumber}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-sl-issue-date-${company.id}`}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{company.slLicenseIssueDate ? format(new Date(company.slLicenseIssueDate), "dd MMM yyyy") : "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-defined-cos-${company.id}`}>
                          {company.slDefinedCOS !== undefined ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {company.slDefinedCOS}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-undefined-cos-${company.id}`}>
                          {company.slUndefinedCOS !== undefined ? (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                              {company.slUndefinedCOS}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-unassigned-defined-cos-${company.id}`}>
                          {(company as any).slUnassignedDefinedCOS !== undefined && (company as any).slUnassignedDefinedCOS !== null ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {(company as any).slUnassignedDefinedCOS}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-unassigned-undefined-cos-${company.id}`}>
                          {(company as any).slUnassignedUndefinedCOS !== undefined && (company as any).slUnassignedUndefinedCOS !== null ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                              {(company as any).slUnassignedUndefinedCOS}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell data-testid={`text-sl-phone-${company.id}`}>
                          <span className="text-sm">{(company as any).slPhone || "—"}</span>
                        </TableCell>
                        <TableCell data-testid={`text-sl-email-${company.id}`}>
                          <span className="text-sm">{(company as any).slEmail || "—"}</span>
                        </TableCell>
                        <TableCell data-testid={`text-sl-website-${company.id}`}>
                          <span className="text-sm">{(company as any).slWebsite || "—"}</span>
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
                          {(() => {
                            const nextRenewal = calculateNextRenewalDate(company.incorporationDate);
                            return nextRenewal ? (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm" data-testid={`text-next-renewal-${company.id}`}>
                                  {format(nextRenewal, "dd MMM yyyy")}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const overdueCount = countOverdueTasks(company.id, tasks);
                            return (
                              <div className="flex justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    overdueCount === 0
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }
                                  data-testid={`badge-overdue-tasks-${company.id}`}
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
                              <div className="flex justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    overdueReviews === 0
                                      ? "bg-green-50 text-green-700 border-green-200"
                                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
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
                            return (
                              <div className="flex justify-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    daysSinceSync === null || daysSinceSync > 2
                                      ? "bg-red-50 text-red-700 border-red-200"
                                      : "bg-green-50 text-green-700 border-green-200"
                                  }
                                  data-testid={`badge-last-sync-${company.id}`}
                                >
                                  {daysSinceSync !== null ? daysSinceSync : "Never"}
                                </Badge>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const completion = calculateDataCompletion(company);
                            return (
                              <div className="flex justify-center">
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
    </div>
  );
}
