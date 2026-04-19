import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { localStorageService } from "@/lib/localStorage";
import { authService } from "@/lib/authService";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EmployeeRecord, Company, EmployeeTask } from "@shared/schema";
import { Users, Search, Building2, Mail, Phone, Calendar, FileText, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DateTime } from "luxon";

export default function EmployeeList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCompany, setFilterCompany] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [residencyDialogOpen, setResidencyDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [residencyExplanation, setResidencyExplanation] = useState("");
  const [residencyAction, setResidencyAction] = useState<"enable" | "disable">("enable");
  const { toast } = useToast();

  // Load employees from database
  const { data: allEmployees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["/api/employees"],
  });

  // Apply filters client-side
  const employees = allEmployees.filter(emp => {
    if (filterCompany !== "all" && emp.companyId !== filterCompany) return false;
    if (filterStatus !== "all" && emp.status !== filterStatus) return false;
    return true;
  }).sort((a, b) => {
    // Sort leavers and deactivated employees to the end
    const aIsLeaver = a.status === "leaver" || a.status === "deactivated";
    const bIsLeaver = b.status === "leaver" || b.status === "deactivated";
    
    if (aIsLeaver && !bIsLeaver) return 1;
    if (!aIsLeaver && bIsLeaver) return -1;
    
    // Within each group (active/leavers), sort by creation date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Load companies from database
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
  });

  // Load employee tasks from database
  const { data: employeeTasks = [] } = useQuery<EmployeeTask[]>({
    queryKey: ["/api/employee-tasks"],
  });

  // Count overdue tasks per employee
  const getOverdueTaskCount = (employeeId: string): number => {
    const now = DateTime.now().setZone("Europe/London");
    return employeeTasks.filter(task => 
      task.employeeId === employeeId &&
      task.status === "open" &&
      DateTime.fromISO(task.dueAt, { zone: "Europe/London" }) < now
    ).length;
  };

  // Mutation for updating residency service
  const updateResidencyMutation = useMutation({
    mutationFn: async ({ employeeId, enable, explanation }: { employeeId: string, enable: boolean, explanation: string }) => {
      const employee = allEmployees.find(e => e.id === employeeId);
      if (!employee) throw new Error("Employee not found");

      const now = DateTime.now().setZone("Europe/London").toISO();
      const logEntry = {
        id: crypto.randomUUID(),
        timestamp: now!,
        action: enable ? ("enabled" as const) : ("disabled" as const),
        explanation,
        userName: authService.getCurrentUser()?.name || "System",
      };

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          isResidencyService: enable,
          residencyStatus: enable ? "pending" : undefined,
          residencyLog: [...(employee.residencyLog || []), logEntry],
          updatedAt: now!,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update residency service");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["residency-employees"] });
      toast({
        title: "Success",
        description: "Residency service updated successfully",
      });
      setResidencyDialogOpen(false);
      setResidencyExplanation("");
      setSelectedEmployee(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update residency service",
        variant: "destructive",
      });
    },
  });

  // Handle residency checkbox click
  const handleResidencyCheckboxClick = (employee: EmployeeRecord, checked: boolean) => {
    setSelectedEmployee(employee);
    setResidencyAction(checked ? "enable" : "disable");
    setResidencyDialogOpen(true);
  };

  // Handle residency dialog confirm
  const handleResidencyConfirm = () => {
    if (!selectedEmployee || !residencyExplanation.trim()) {
      toast({
        title: "Error",
        description: "Please provide an explanation",
        variant: "destructive",
      });
      return;
    }

    updateResidencyMutation.mutate({
      employeeId: selectedEmployee.id,
      enable: residencyAction === "enable",
      explanation: residencyExplanation.trim(),
    });
  };


  // Filter by search term
  const filteredEmployees = employees.filter(emp => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      emp.firstName?.toLowerCase().includes(search) ||
      emp.lastName?.toLowerCase().includes(search) ||
      emp.personalEmail?.toLowerCase().includes(search) ||
      emp.jobTitle?.toLowerCase().includes(search) ||
      emp.department?.toLowerCase().includes(search)
    );
  });

  const getCompanyName = (companyId: string | null | undefined) => {
    if (!companyId) return "No Company";
    const company = companies.find(c => c.id === companyId);
    return company?.name || "Unknown Company";
  };

  const formatImmigrationStatus = (status: string) => {
    switch (status) {
      case "british":
        return "British/Irish";
      case "settled":
        return "Settled Status";
      case "other":
        return "Other";
      default:
        return status;
    }
  };

  const formatContractType = (type: string) => {
    switch (type) {
      case "permanent":
        return "Permanent";
      case "fixed_term":
        return "Fixed Term";
      case "contractor":
        return "Contractor";
      default:
        return type;
    }
  };

  const calculateCompletionPercentage = (employee: EmployeeRecord): number => {
    const requiredFields = [
      employee.firstName,
      employee.lastName,
      employee.dateOfBirth,
      employee.personalMobile,
      employee.personalEmail,
      employee.overseasAddress,
      employee.emergencyContactName,
      employee.emergencyContactRelationship,
      employee.emergencyContactPhone,
      employee.companyId,
      employee.jobTitle,
      employee.startDate,
      employee.googleDriveLink,
    ];

    const optionalButImportant = [
      employee.ukAddress || employee.ukAddressProvideLater,
      employee.workLocation,
      employee.nationalInsurance || employee.nationalInsuranceProvideLater,
      employee.passportNumber,
      employee.rtwCheckDate,
      employee.workingDays && employee.workingDays.length > 0 ? "present" : "",
      employee.breakMinutes !== undefined && employee.breakMinutes !== null ? "present" : "",
    ];

    const completedRequired = requiredFields.filter(f => f && String(f).trim().length > 0).length;
    const completedOptional = optionalButImportant.filter(f => f && String(f).trim().length > 0).length;

    const totalFields = requiredFields.length + optionalButImportant.length;
    const completedFields = completedRequired + completedOptional;

    return Math.round((completedFields / totalFields) * 100);
  };

  const getExpiryStatus = (expiryDate: string | null | undefined): "valid" | "attention" | "invalid" | "none" => {
    if (!expiryDate) return "none";
    
    const today = DateTime.now().setZone("Europe/London").startOf("day");
    const expiry = DateTime.fromISO(expiryDate, { zone: "Europe/London" }).startOf("day");
    const daysUntilExpiry = expiry.diff(today, "days").days;

    if (daysUntilExpiry < 0) return "invalid"; // Expired
    if (daysUntilExpiry <= 30) return "attention"; // Expires within 30 days
    return "valid"; // Valid
  };

  const formatExpiryDate = (date: string | null | undefined) => {
    if (!date) return null;
    return format(parseISO(date), "MMM d, yyyy");
  };

  const handleExportCSV = () => {
    if (employees.length === 0) {
      toast({
        title: "No Data",
        description: "There are no employees to export",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = [
      "Employee ID",
      "First Name",
      "Middle Names",
      "Last Name",
      "Date of Birth",
      "Personal Mobile",
      "Personal Email",
      "UK Address",
      "UK Address Provide Later",
      "Overseas Address",
      "UK Bank Address",
      "UK Bank Address Provide Later",
      "Emergency Contact Name",
      "Emergency Contact Relationship",
      "Emergency Contact Phone",
      "Company ID",
      "Company Name",
      "Department",
      "Work Location",
      "Work Location Source",
      "Line Manager",
      "Job Title",
      "Job Description",
      "Contract Type",
      "Start Date",
      "End Date",
      "Weekly Hours",
      "Salary",
      "Hourly Rate",
      "PAYE Reference",
      "National Insurance",
      "National Insurance Provide Later",
      "Google Drive Link",
      "Nationality",
      "Immigration Status",
      "Is Sponsored",
      "Passport Number",
      "Passport Expiry",
      "BRP Share Code",
      "Visa Type",
      "COS Number",
      "Sponsor License Number",
      "Visa Issue Date",
      "Visa Expiry Date",
      "RTW Basis",
      "RTW Check Date",
      "RTW Evidence Type",
      "RTW Expiry Date Mode",
      "RTW Expiry Date",
      "RTW Expiry Indefinite",
      "RTW Share Code",
      "Doc Passport Copy",
      "Doc Graduation Cert Copy",
      "Doc Proof of Address Copy",
      "Doc RTW Copy",
      "Doc COS Copy",
      "Doc Visa Copy",
      "Probation Period (Months)",
      "Probation End Date",
      "Status",
      "UKVI Reporting Notes",
      "Is Residency Service",
      "Residency Status",
      "Residency Log (JSON)",
      "Documents (JSON)",
      "Generated Task IDs (JSON)",
      "Form Data (JSON)",
      "Activity Log (JSON)",
      "Template ID",
      "Template Version",
      "Created At",
      "Updated At"
    ];

    const escapeField = (field: any) => {
      if (field === null || field === undefined) return '""';
      const str = String(field);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = employees.map(emp => [
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
      escapeField(emp.salary),
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
      escapeField(emp.updatedAt)
    ].join(","));

    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `employees-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Exported ${employees.length} employee${employees.length !== 1 ? 's' : ''} with all fields to CSV`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                <Users className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Employees</CardTitle>
                <CardDescription>
                  Manage and view all employees ({filteredEmployees.length} {filteredEmployees.length === 1 ? "employee" : "employees"})
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleExportCSV}
              variant="outline"
              className="gap-2"
              disabled={employees.length === 0}
              data-testid="button-export-employees-csv"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, job title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                data-testid="input-search"
              />
            </div>
            <Select value={filterCompany} onValueChange={setFilterCompany}>
              <SelectTrigger data-testid="select-filter-company">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger data-testid="select-filter-status">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="leaver">Leaver</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Employee table */}
          {filteredEmployees.length === 0 ? (
            <div className="rounded-lg border bg-muted/50 p-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No employees found</p>
              <p className="text-sm text-muted-foreground">
                {searchTerm || filterCompany !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first employee using the 'Add Employee' tab"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Residency Service</TableHead>
                    <TableHead className="text-center">Compliance</TableHead>
                    <TableHead className="text-center">Complete %</TableHead>
                    <TableHead>Visa Expiry</TableHead>
                    <TableHead>RTW Expiry</TableHead>
                    <TableHead>Contract Expiry</TableHead>
                    <TableHead>Passport Expiry</TableHead>
                    <TableHead className="text-center">Overdue Tasks</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Employment</TableHead>
                    <TableHead>Immigration</TableHead>
                    <TableHead className="w-24">System ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => {
                    const completion = calculateCompletionPercentage(employee);
                    const visaStatus = getExpiryStatus(employee.visaExpiryDate);
                    const rtwStatus = getExpiryStatus(employee.rtwExpiryDate);
                    const contractStatus = employee.contractType === "fixed_term" ? getExpiryStatus(employee.endDate) : "none";
                    const passportStatus = getExpiryStatus(employee.passportExpiry);
                    const overdueTaskCount = getOverdueTaskCount(employee.id);
                    
                    // Compliance: Healthy if completion=100%, all expiry dates are valid, and no overdue tasks
                    const isCompliant = completion === 100 &&
                      (visaStatus === "valid" || visaStatus === "none") &&
                      (rtwStatus === "valid" || rtwStatus === "none") &&
                      (contractStatus === "valid" || contractStatus === "none") &&
                      (passportStatus === "valid" || passportStatus === "none") &&
                      overdueTaskCount === 0;
                    
                    const isLeaver = employee.status === "leaver" || employee.status === "deactivated";
                    const isDraft = employee.isDraft === true;
                    
                    return (
                      <TableRow 
                        key={employee.id} 
                        data-testid={`row-employee-${employee.id}`}
                        className={`hover-elevate cursor-pointer ${isLeaver ? "opacity-60 grayscale" : isDraft ? "opacity-50" : ""}`}
                        onClick={() => setLocation(`/employee/${employee.id}`)}
                      >
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant={
                                employee.status === "active"
                                  ? "default"
                                  : employee.status === "onboarding"
                                  ? "secondary"
                                  : employee.status === "on_hold"
                                  ? "secondary"
                                  : employee.status === "deactivated"
                                  ? "outline"
                                  : "destructive"
                              }
                              className={isLeaver ? "bg-gray-100 text-gray-500 border-gray-300" : ""}
                            >
                              {employee.status === "active"
                                ? "Active"
                                : employee.status === "onboarding"
                                ? "Onboarding"
                                : employee.status === "on_hold"
                                ? "On Hold"
                                : employee.status === "deactivated"
                                ? "Deactivated"
                                : "Leaver"}
                            </Badge>
                            {isDraft && (
                              <Badge 
                                variant="outline" 
                                className="bg-orange-50 text-orange-700 border-orange-200 text-xs"
                                data-testid={`badge-draft-${employee.id}`}
                              >
                                Draft
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-center gap-1">
                            <Checkbox
                              checked={employee.isResidencyService || false}
                              onCheckedChange={(checked) => handleResidencyCheckboxClick(employee, checked as boolean)}
                              data-testid={`checkbox-residency-${employee.id}`}
                            />
                            {employee.isResidencyService && (
                              <Badge
                                variant="outline"
                                className={
                                  employee.residencyStatus === "done"
                                    ? "bg-green-50 text-green-700 border-green-200 text-xs"
                                    : "bg-yellow-50 text-yellow-700 border-yellow-200 text-xs"
                                }
                                data-testid={`badge-residency-status-${employee.id}`}
                              >
                                {employee.residencyStatus === "done" ? "Done" : "Pending"}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              isCompliant
                                ? "bg-green-50 text-green-700 border-green-200 font-semibold"
                                : "bg-red-50 text-red-700 border-red-200 font-semibold"
                            }
                            data-testid={`badge-compliance-${employee.id}`}
                          >
                            {isCompliant ? "Healthy" : "Need attention"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              completion === 100
                                ? "bg-green-50 text-green-700 border-green-200 font-semibold"
                                : completion >= 50
                                ? "bg-yellow-50 text-yellow-700 border-yellow-200 font-semibold"
                                : "bg-red-50 text-red-700 border-red-200 font-semibold"
                            }
                            data-testid={`badge-completion-${employee.id}`}
                          >
                            {completion}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {visaStatus !== "none" ? (
                            <Badge
                              variant="outline"
                              className={
                                visaStatus === "valid"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : visaStatus === "attention"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }
                              data-testid={`badge-visa-expiry-${employee.id}`}
                            >
                              {formatExpiryDate(employee.visaExpiryDate)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {rtwStatus !== "none" ? (
                            <Badge
                              variant="outline"
                              className={
                                rtwStatus === "valid"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : rtwStatus === "attention"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }
                              data-testid={`badge-rtw-expiry-${employee.id}`}
                            >
                              {formatExpiryDate(employee.rtwExpiryDate)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {contractStatus !== "none" ? (
                            <Badge
                              variant="outline"
                              className={
                                contractStatus === "valid"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : contractStatus === "attention"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }
                              data-testid={`badge-contract-expiry-${employee.id}`}
                            >
                              {formatExpiryDate(employee.endDate)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {passportStatus !== "none" ? (
                            <Badge
                              variant="outline"
                              className={
                                passportStatus === "valid"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : passportStatus === "attention"
                                  ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }
                              data-testid={`badge-passport-expiry-${employee.id}`}
                            >
                              {formatExpiryDate(employee.passportExpiry)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className={
                              overdueTaskCount === 0
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-red-50 text-red-700 border-red-200 font-semibold"
                            }
                            data-testid={`badge-overdue-tasks-${employee.id}`}
                          >
                            {overdueTaskCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground hover:underline" data-testid={`text-name-${employee.id}`}>
                              {employee.firstName} {employee.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Started: {employee.startDate ? format(parseISO(employee.startDate), "MMM d, yyyy") : "Not set"}
                            </p>
                          </div>
                        </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground truncate max-w-[200px]">
                              {employee.personalEmail}
                            </span>
                          </div>
                          {employee.personalMobile && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{employee.personalMobile}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{getCompanyName(employee.companyId)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{employee.jobTitle || "—"}</p>
                          {employee.department && (
                            <p className="text-xs text-muted-foreground">{employee.department}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {employee.contractType ? formatContractType(employee.contractType) : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant="secondary" className="text-xs">
                            {employee.immigrationStatus ? formatImmigrationStatus(employee.immigrationStatus) : "—"}
                          </Badge>
                          {employee.isSponsored && (
                            <Badge variant="default" className="text-xs block w-fit">
                              Sponsored
                            </Badge>
                          )}
                          {employee.visaType && (
                            <p className="text-xs text-muted-foreground">{employee.visaType}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs" data-testid={`text-employee-id-${employee.id}`}>
                          {employee.id}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Employees</CardDescription>
            <CardTitle className="text-3xl">{employees.filter(e => !e.isDraft).length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl">
              {employees.filter(e => e.status === "active" && !e.isDraft).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Sponsored</CardDescription>
            <CardTitle className="text-3xl">
              {employees.filter(e => e.isSponsored).length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Residency Service Explanation Dialog */}
      <Dialog open={residencyDialogOpen} onOpenChange={setResidencyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {residencyAction === "enable" ? "Enable" : "Disable"} Residency Service
            </DialogTitle>
            <DialogDescription>
              {residencyAction === "enable" 
                ? "You are enabling residency service for this employee. This will create a pending task for HR Auditor approval."
                : "You are disabling residency service for this employee."
              }
              <br />
              Please provide an explanation for this change:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="residency-explanation">Explanation *</Label>
              <Textarea
                id="residency-explanation"
                placeholder="Enter explanation for this change..."
                value={residencyExplanation}
                onChange={(e) => setResidencyExplanation(e.target.value)}
                rows={4}
                data-testid="textarea-residency-explanation"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setResidencyDialogOpen(false);
                setResidencyExplanation("");
                setSelectedEmployee(null);
              }}
              data-testid="button-cancel-residency"
            >
              Cancel
            </Button>
            <Button
              onClick={handleResidencyConfirm}
              disabled={!residencyExplanation.trim() || updateResidencyMutation.isPending}
              data-testid="button-confirm-residency"
            >
              {updateResidencyMutation.isPending ? "Saving..." : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
