import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { localStorageService } from "@/lib/localStorage";
import { csvExportService } from "@/lib/csvExportService";
import { googleDriveService } from "@/lib/googleDriveService";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { authService } from "@/lib/authService";
import { idGenerator } from "@/lib/idGenerator";
import { AlertTriangle, Building2, Users, ClipboardCheck, RefreshCw, Download, Activity, FileSpreadsheet, Trash2, TrendingDown, TrendingUp, Upload, Settings, ListChecks, Briefcase, UserCheck, Globe2, FileText, UserPlus, Pencil, Award, Package } from "lucide-react";
import { DateTime } from "luxon";
import * as XLSX from "xlsx";
import type { Company, EmployeeRecord, Task, EmployeeTask, SLPrepTask, HRTaskTemplate, ResidencyTaskTemplate, EmployeeFormTemplate, PendingCompanySLChange, PendingEmployeeStatusChange, PendingDependantRequest, Holiday } from "@shared/schema";
import type { User } from "@/lib/authService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function AdminView() {
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showGoogleDriveSettings, setShowGoogleDriveSettings] = useState(false);
  const [googleDriveFolderUrl, setGoogleDriveFolderUrl] = useState(
    googleDriveService.getSettings().folderUrl
  );
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteReason, setDeleteReason] = useState("");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // User management state
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [showEditUserDialog, setShowEditUserDialog] = useState(false);
  const [showDeleteUserDialog, setShowDeleteUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [userDeletePassword, setUserDeletePassword] = useState("");
  const [userDeleteReason, setUserDeleteReason] = useState("");
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    passwordHint: "",
    name: "",
    email: "",
    position: "",
  });
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>("all");
  
  // Holiday management state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploadingHolidays, setIsUploadingHolidays] = useState(false);

  // Fetch all data from database
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    throwOnError: false,
  });

  const { data: employees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["employees"],
    queryFn: () => localStorageService.getEmployees(),
  });

  const { data: companyTasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: () => localStorageService.getTasks(),
  });

  const { data: employeeTasks = [] } = useQuery<EmployeeTask[]>({
    queryKey: ["employeeTasks"],
    queryFn: () => localStorageService.getEmployeeTasks(),
  });

  const { data: systemLogs = [] } = useQuery({
    queryKey: ["systemActivityLogs"],
    queryFn: () => localStorageService.getAllSystemActivityLogs(),
  });

  const { data: userActivityLogs = [] } = useQuery({
    queryKey: ["userActivityLogs"],
    queryFn: () => localStorageService.getUserActivityLogs(),
  });

  // Fetch general logs from the server (audit trail with logRefId)
  const { data: generalLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/general-log"],
    queryFn: async () => {
      const resp = await fetch("/api/general-log?limit=500", { credentials: "include" });
      if (!resp.ok) return [];
      return resp.json();
    },
  });

  const { data: holidays = [] } = useQuery<Holiday[]>({
    queryKey: ["holidays"],
    queryFn: () => localStorageService.getHolidays(),
  });

  // Merge system logs, user activity logs, and general logs (server-side audit trail)
  const allActivityLogs = [
    ...systemLogs,
    ...userActivityLogs.map(log => ({
      id: log.id,
      timestamp: log.timestamp,
      action: log.action,
      description: log.details || `${log.action} - ${log.targetName}`,
      user: log.performedBy,
      entityType: "user" as const,
      entityId: log.targetUsername,
      entityName: log.targetName,
      meta: log.meta || {},
    })),
    ...generalLogs.map((log: any) => ({
      id: log.id,
      logRefId: log.logRefId,
      timestamp: log.timestamp,
      action: log.action,
      description: log.details || `${log.action} - ${log.targetName || ''}`,
      user: log.performedByName,
      entityType: log.category as string,
      entityId: log.targetId || '',
      entityName: log.targetName || '',
      meta: log.metadata || {},
    }))
  ]
  // Deduplicate by id (general logs may overlap with system logs)
  .filter((log, index, self) => self.findIndex(l => l.id === log.id) === index)
  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const { data: lastSyncTimestamp = null } = useQuery<string | null>({
    queryKey: ["lastSyncTimestamp"],
    queryFn: () => localStorageService.getLastSyncTimestamp(),
  });

  // Fetch template and form data
  const { data: slPrepTasks = [] } = useQuery<SLPrepTask[]>({
    queryKey: ["slPrepTasks"],
    queryFn: () => localStorageService.getSLPrepTasks(),
  });

  const { data: hrTaskTemplates = [] } = useQuery<HRTaskTemplate[]>({
    queryKey: ["hrTaskTemplates"],
    queryFn: () => localStorageService.getHRTaskTemplates(),
  });

  const { data: residencyTaskTemplates = [] } = useQuery<ResidencyTaskTemplate[]>({
    queryKey: ["residencyTaskTemplates"],
    queryFn: () => localStorageService.getResidencyTaskTemplates(),
  });

  const { data: employeeFormTemplate } = useQuery<EmployeeFormTemplate | null>({
    queryKey: ["activeEmployeeFormTemplate"],
    queryFn: () => localStorageService.getActiveEmployeeFormTemplate(),
  });

  // Fetch users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => authService.getUsersForDisplay(),
    retry: false,
    // Don't throw on error - just return empty array
    throwOnError: false,
  });

  // Fetch pending approvals for auditor red flags
  const { data: pendingSLChanges = [] } = useQuery<PendingCompanySLChange[]>({
    queryKey: ["pendingCompanySLChanges"],
    queryFn: () => localStorageService.getPendingCompanySLChanges().filter(r => r.status === "pending"),
  });

  const { data: pendingEmployeeStatusChanges = [] } = useQuery<PendingEmployeeStatusChange[]>({
    queryKey: ["pendingEmployeeStatusChanges"],
    queryFn: () => localStorageService.getPendingEmployeeStatusChanges().filter(r => r.status === "pending"),
  });

  const { data: pendingDependantRequests = [] } = useQuery<PendingDependantRequest[]>({
    queryKey: ["pendingDependantRequests"],
    queryFn: () => localStorageService.getPendingDependantRequests().filter(r => r.status === "pending"),
  });

  // Calculate statistics
  const stats = {
    totalCompanies: companies.length,
    activeCompanies: companies.filter((c) => c.isActive).length,
    inactiveCompanies: companies.filter((c) => !c.isActive).length,
    companiesWithSL: companies.filter((c) => c.sl).length,
    companiesInSLPrep: companies.filter((c) => c.sl && !c.slLicenseIssued).length,
    companiesSLIssued: companies.filter((c) => c.sl && c.slLicenseIssued).length,
    totalEmployees: employees.filter((e) => !e.isDraft).length,
    activeEmployees: employees.filter((e) => e.status === "active" && !e.isDraft).length,
    onboardingEmployees: employees.filter((e) => e.status === "onboarding" && !e.isDraft).length,
    deactivatedEmployees: employees.filter((e) => e.status === "deactivated" && !e.isDraft).length,
    residencyEmployees: employees.filter((e) => e.isResidencyService && !e.isDraft).length,
    totalCompanyTasks: companyTasks.length,
    openCompanyTasks: companyTasks.filter((t) => t.status === "open").length,
    doneCompanyTasks: companyTasks.filter((t) => t.status === "done").length,
    totalEmployeeTasks: employeeTasks.length,
    openEmployeeTasks: employeeTasks.filter((t) => t.status === "open").length,
    completedEmployeeTasks: employeeTasks.filter((t) => t.status === "completed").length,
    // Template statistics
    slPrepTasksCount: slPrepTasks.length,
    hrTaskTemplatesCount: hrTaskTemplates.length,
    hrOneTimeTemplates: hrTaskTemplates.filter((t) => t.recurrence === "one_time").length,
    hrMonthlyTemplates: hrTaskTemplates.filter((t) => t.recurrence === "monthly").length,
    hrAnnualTemplates: hrTaskTemplates.filter((t) => t.recurrence === "annual").length,
    residencyTemplatesCount: residencyTaskTemplates.length,
    residencyOneTimeTemplates: residencyTaskTemplates.filter((t) => t.recurrence === "one_time").length,
    residencyWeeklyTemplates: residencyTaskTemplates.filter((t) => t.recurrence === "weekly").length,
    residencyMonthlyTemplates: residencyTaskTemplates.filter((t) => t.recurrence === "monthly").length,
    residencyQuarterlyTemplates: residencyTaskTemplates.filter((t) => t.recurrence === "quarterly").length,
    residencyAnnuallyTemplates: residencyTaskTemplates.filter((t) => t.recurrence === "annually").length,
    formFieldsCount: employeeFormTemplate?.fields.length || 0,
    formConditionalFieldsCount: employeeFormTemplate?.fields.filter((f) => f.conditionalRules && f.conditionalRules.length > 0).length || 0,
    // COS statistics (for SL companies)
    totalDefinedCOS: companies.filter(c => c.sl).reduce((sum, c) => sum + (c.slDefinedCOS || 0), 0),
    totalUndefinedCOS: companies.filter(c => c.sl).reduce((sum, c) => sum + (c.slUndefinedCOS || 0), 0),
    totalCOS: companies.filter(c => c.sl).reduce((sum, c) => sum + (c.slDefinedCOS || 0) + (c.slUndefinedCOS || 0), 0),
    // Auditor statistics
    unreviewedCompanyTasks: companyTasks.filter((t) => (t.status === "done" || t.status === "cancelled") && !t.reviewed).length,
    unreviewedHRTasks: employeeTasks.filter((t) => 
      (t.status === "completed" || t.status === "skipped" || t.status === "cancelled") && 
      !t.reviewed &&
      (t.taskType === "hr_template" || t.taskType === "hr_template_monthly" || t.taskType === "hr_template_annual")
    ).length,
    unreviewedResidencyTasks: employeeTasks.filter((t) => 
      (t.status === "completed" || t.status === "skipped" || t.status === "cancelled") && 
      !t.reviewed &&
      (t.taskType.startsWith("residency_template"))
    ).length,
  };

  // Calculate red flags (tasks overdue more than 1 week)
  const now = DateTime.now().setZone("Europe/London");
  const oneWeekAgo = now.minus({ weeks: 1 });

  const overdueCompanyTasks = companyTasks.filter((task) => {
    if (task.status !== "open") return false;
    const dueDate = DateTime.fromISO(task.dueAt, { zone: "Europe/London" });
    return dueDate < oneWeekAgo;
  });

  const overdueEmployeeTasks = employeeTasks.filter((task) => {
    if (task.status !== "open") return false;
    if (!task.dueAt) return false;
    const dueDate = DateTime.fromISO(task.dueAt, { zone: "Europe/London" });
    return dueDate < oneWeekAgo;
  });

  // Group employee tasks by type for better analysis
  const overdueHRTasks = overdueEmployeeTasks.filter((t) => 
    t.taskType === "hr_template" || t.taskType === "hr_template_monthly" || t.taskType === "hr_template_annual"
  );
  const overdueResidencyTasks = overdueEmployeeTasks.filter((t) => 
    t.taskType === "residency_template" || t.taskType === "residency_template_weekly" || 
    t.taskType === "residency_template_monthly" || t.taskType === "residency_template_quarterly" || 
    t.taskType === "residency_template_annually"
  );
  const overdueOtherEmployeeTasks = overdueEmployeeTasks.filter((t) => 
    !overdueHRTasks.includes(t) && !overdueResidencyTasks.includes(t)
  );

  const totalRedFlags = overdueCompanyTasks.length + overdueEmployeeTasks.length;

  // Calculate statistics for red flags
  const calculateTaskStats = (tasks: (Task | EmployeeTask)[]) => {
    if (tasks.length === 0) return { avgDaysOverdue: 0, maxDaysOverdue: 0, worstTask: null };
    
    const daysOverdueArray = tasks.map((task) => {
      // Check if it's a Task (has companyId but not employeeId) or EmployeeTask
      const isCompanyTask = "companyId" in task && !("employeeId" in task);
      const taskDueAt = isCompanyTask ? (task as Task).dueAt : ((task as EmployeeTask).dueAt || "");
      const dueDate = DateTime.fromISO(taskDueAt, { zone: "Europe/London" });
      return Math.floor(now.diff(dueDate, "days").days);
    });

    const avgDaysOverdue = Math.floor(daysOverdueArray.reduce((a, b) => a + b, 0) / daysOverdueArray.length);
    const maxDaysOverdue = Math.max(...daysOverdueArray);
    const worstTaskIndex = daysOverdueArray.indexOf(maxDaysOverdue);
    
    return { avgDaysOverdue, maxDaysOverdue, worstTask: tasks[worstTaskIndex] };
  };

  const companyTaskStats = calculateTaskStats(overdueCompanyTasks);
  const employeeTaskStats = calculateTaskStats(overdueEmployeeTasks);
  const hrTaskStats = calculateTaskStats(overdueHRTasks);
  const residencyTaskStats = calculateTaskStats(overdueResidencyTasks);
  const otherEmployeeTaskStats = calculateTaskStats(overdueOtherEmployeeTasks);

  // Calculate auditor red flags (items >7 days old without action)
  const sevenDaysAgo = now.minus({ days: 7 });

  // Company Auditor red flags: pending SL changes >7 days old
  const companyAuditorPendingSLChanges = pendingSLChanges.filter((change) => {
    const requestedDate = DateTime.fromISO(change.requestedAt, { zone: "Europe/London" });
    return requestedDate < sevenDaysAgo;
  });

  // Also include unreviewed company tasks that are >7 days past their completion (using reviewedAt absence and dueAt as proxy)
  const companyAuditorUnreviewedTasks = companyTasks.filter((t) => {
    if (!((t.status === "done" || t.status === "cancelled") && !t.reviewed)) return false;
    // Use dueAt as a proxy for when the task was likely completed
    const dueDate = DateTime.fromISO(t.dueAt, { zone: "Europe/London" });
    return dueDate < sevenDaysAgo;
  });

  const companyAuditorRedFlags = companyAuditorUnreviewedTasks.length + companyAuditorPendingSLChanges.length;

  // HR Auditor red flags: pending employee status changes >7 days old
  const hrAuditorPendingStatusChanges = pendingEmployeeStatusChanges.filter((change) => {
    const requestedDate = DateTime.fromISO(change.requestedAt, { zone: "Europe/London" });
    return requestedDate < sevenDaysAgo;
  });

  // Also include unreviewed HR tasks that are >7 days past completion
  const hrAuditorUnreviewedTasks = employeeTasks.filter((t) => {
    if (!((t.status === "completed" || t.status === "skipped" || t.status === "cancelled") && !t.reviewed)) return false;
    if (!(t.taskType === "hr_template" || t.taskType === "hr_template_monthly" || t.taskType === "hr_template_annual")) return false;
    // Use completedAt if available, otherwise use updatedAt
    const completedDate = t.completedAt ? DateTime.fromISO(t.completedAt, { zone: "Europe/London" }) : DateTime.fromISO(t.updatedAt, { zone: "Europe/London" });
    return completedDate < sevenDaysAgo;
  });

  const hrAuditorRedFlags = hrAuditorUnreviewedTasks.length + hrAuditorPendingStatusChanges.length;

  // Residency Auditor red flags: pending dependant requests >7 days old
  const residencyAuditorPendingDependantRequests = pendingDependantRequests.filter((request) => {
    const requestedDate = DateTime.fromISO(request.requestedAt, { zone: "Europe/London" });
    return requestedDate < sevenDaysAgo;
  });

  // Also include unreviewed residency tasks that are >7 days past completion
  const residencyAuditorUnreviewedTasks = employeeTasks.filter((t) => {
    if (!((t.status === "completed" || t.status === "skipped" || t.status === "cancelled") && !t.reviewed)) return false;
    if (!t.taskType.startsWith("residency_template")) return false;
    // Use completedAt if available, otherwise use updatedAt
    const completedDate = t.completedAt ? DateTime.fromISO(t.completedAt, { zone: "Europe/London" }) : DateTime.fromISO(t.updatedAt, { zone: "Europe/London" });
    return completedDate < sevenDaysAgo;
  });

  const residencyAuditorRedFlags = residencyAuditorUnreviewedTasks.length + residencyAuditorPendingDependantRequests.length;

  const totalAuditorRedFlags = companyAuditorRedFlags + hrAuditorRedFlags + residencyAuditorRedFlags;

  // Save Google Drive settings
  const saveGoogleDriveSettings = () => {
    googleDriveService.saveSettings({ folderUrl: googleDriveFolderUrl });
    toast({
      title: "Settings Saved",
      description: "Google Drive folder URL has been updated.",
    });
    setShowGoogleDriveSettings(false);
  };

  // Export all CSVs to Google Drive (or download locally)
  const handleExportAllCSVs = async () => {
    setIsExporting(true);
    try {
      const csvExports = csvExportService.generateAllCSVs();
      
      if (csvExports.length === 0) {
        toast({
          title: "No Data to Export",
          description: "There is no data in the system to export.",
          variant: "destructive",
        });
        setIsExporting(false);
        return;
      }

      // Download locally (Google Drive OAuth integration would require backend setup)
      googleDriveService.downloadCSVsLocally(csvExports);
      
      toast({
        title: "Export Complete",
        description: `Successfully exported ${csvExports.length} CSV files. To upload to Google Drive, please upload them manually to your folder.`,
      });
      
      setIsExporting(false);
    } catch (error) {
      setIsExporting(false);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export CSVs",
        variant: "destructive",
      });
    }
  };

  // Delete all data mutation with server-side password verification
  const deleteAllDataMutation = useMutation({
    mutationFn: async ({ password, reason }: { password: string; reason: string }) => {
      if (!reason || reason.trim().length === 0) {
        throw new Error("Deletion reason is required");
      }
      // Verify password via server-side authentication
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error("Not authenticated");
      const verifyRes = await apiRequest("POST", "/api/auth/verify-password", { password });
      const verifyData = await verifyRes.json();
      if (!verifyData.valid) {
        throw new Error("Incorrect password");
      }
      localStorage.clear();
      return { reason };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast({
        title: "All Data Deleted",
        description: `System has been reset. Reason: ${data.reason}`,
        variant: "destructive",
      });
      setTimeout(() => window.location.reload(), 1500);
    },
    onError: (error) => {
      toast({
        title: "Deletion Failed",
        description: error instanceof Error ? error.message : "Failed to delete data",
        variant: "destructive",
      });
    },
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      setIsSyncing(true);
      // Trigger client-side Companies House sync
      const result = await api.syncAllCompaniesWithCH();
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["lastSyncTimestamp"] });
      setIsSyncing(false);
      toast({
        title: "Sync Complete",
        description: `Synchronized ${result.updated} of ${result.total} companies. ${result.failed > 0 ? `${result.failed} failed.` : ''}`,
      });
    },
    onError: (error) => {
      setIsSyncing(false);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync data",
        variant: "destructive",
      });
    },
  });

  // Export full system report
  const exportSystemReport = () => {
    try {
      // Prepare companies data
      const companiesData = companies.map((c) => ({
        Name: c.name,
        Number: c.number,
        Status: c.isActive ? "Active" : "Inactive",
        "SL Status": c.sl ? "Yes" : "No",
        "SL Issued": c.slLicenseIssued ? "Yes" : "No",
        "Renewal Date": c.renewalDate || "",
        "Last Sync": c.lastSyncDate || "",
      }));

      // Prepare employees data
      const employeesData = employees.map((e) => ({
        "First Name": e.firstName,
        "Last Name": e.lastName,
        Company: e.companyName,
        Status: e.status,
        "Job Title": e.jobTitle,
        "Start Date": e.startDate,
        Department: e.department || "",
        "Residency Service": e.isResidencyService ? "Yes" : "No",
      }));

      // Prepare company tasks data
      const companyTasksData = companyTasks.map((t) => ({
        Company: t.companyName,
        Title: t.title,
        "Due Date": t.dueAt,
        Status: t.status,
        Reviewed: t.reviewed ? "Yes" : "No",
      }));

      // Prepare employee tasks data
      const employeeTasksData = employeeTasks.map((t) => ({
        Employee: t.employeeName || "",
        Company: t.companyName || "",
        Title: t.title,
        "Due Date": t.dueAt || "",
        Status: t.status,
        Type: t.taskType,
        Reviewed: t.reviewed ? "Yes" : "No",
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();
      const wsCompanies = XLSX.utils.json_to_sheet(companiesData);
      const wsEmployees = XLSX.utils.json_to_sheet(employeesData);
      const wsCompanyTasks = XLSX.utils.json_to_sheet(companyTasksData);
      const wsEmployeeTasks = XLSX.utils.json_to_sheet(employeeTasksData);

      XLSX.utils.book_append_sheet(wb, wsCompanies, "Companies");
      XLSX.utils.book_append_sheet(wb, wsEmployees, "Employees");
      XLSX.utils.book_append_sheet(wb, wsCompanyTasks, "Company Tasks");
      XLSX.utils.book_append_sheet(wb, wsEmployeeTasks, "Employee Tasks");

      // Download
      const timestamp = DateTime.now().setZone("Europe/London").toFormat("yyyy-MM-dd_HHmmss");
      XLSX.writeFile(wb, `system-report-${timestamp}.xlsx`);

      toast({
        title: "Export Complete",
        description: "System report has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export system report",
        variant: "destructive",
      });
    }
  };

  // User management handlers
  const handleAddUser = async () => {
    try {
      if (!newUser.username || !newUser.password || !newUser.name || !newUser.email || !newUser.position) {
        toast({
          title: "Validation Error",
          description: "All fields are required (except password hint)",
          variant: "destructive",
        });
        return;
      }

      await authService.addUser(newUser.username, newUser.password, newUser.name, newUser.email, newUser.position, newUser.passwordHint);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      // Log the user addition
      localStorageService.addUserActivityLog({
        id: crypto.randomUUID(),
        action: "User Added",
        targetUsername: newUser.username,
        targetName: newUser.name,
        details: `User ${newUser.name} (${newUser.username}) was added with position: ${newUser.position}`,
        timestamp: new Date().toISOString(),
        performedBy: authService.getCurrentUser()?.name || "System",
        meta: {},
      });
      queryClient.invalidateQueries({ queryKey: ["userActivityLogs"] });
      
      toast({
        title: "User Added",
        description: `${newUser.name} has been added to the system.`,
      });

      setNewUser({ username: "", password: "", passwordHint: "", name: "", email: "", position: "" });
      setShowAddUserDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async () => {
    if (!editingUser) return;

    try {
      const updates: any = {
        username: editingUser.username,
        name: editingUser.name,
        email: editingUser.email,
        position: editingUser.position,
      };

      // Only include password and passwordHint if they're provided
      if ((editingUser as any).newPassword) {
        updates.password = (editingUser as any).newPassword;
      }
      if ((editingUser as any).newPasswordHint !== undefined) {
        updates.passwordHint = (editingUser as any).newPasswordHint;
      }

      await authService.updateUser(editingUser.id, updates);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      // Log the user update
      const changedFields = [];
      if ((editingUser as any).newPassword) changedFields.push("password");
      if ((editingUser as any).newPasswordHint !== undefined) changedFields.push("password hint");
      
      localStorageService.addUserActivityLog({
        id: crypto.randomUUID(),
        action: "User Updated",
        targetUsername: editingUser.username,
        targetName: editingUser.name,
        details: `User ${editingUser.name} (${editingUser.username}) information was updated${changedFields.length > 0 ? `. Changed: ${changedFields.join(", ")}` : ""}`,
        timestamp: new Date().toISOString(),
        performedBy: authService.getCurrentUser()?.name || "System",
        meta: {},
      });
      queryClient.invalidateQueries({ queryKey: ["userActivityLogs"] });
      
      toast({
        title: "User Updated",
        description: `${editingUser.name}'s information has been updated.`,
      });

      setEditingUser(null);
      setShowEditUserDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setShowDeleteUserDialog(true);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;

    // Verify password via server
    try {
      const verifyRes = await apiRequest("POST", "/api/auth/verify-password", { password: userDeletePassword });
      const verifyData = await verifyRes.json();
      if (!verifyData.valid) {
        toast({
          title: "Invalid Password",
          description: "The password you entered is incorrect.",
          variant: "destructive",
        });
        return;
      }
    } catch {
      toast({
        title: "Invalid Password",
        description: "The password you entered is incorrect.",
        variant: "destructive",
      });
      return;
    }

    // Validate reason
    if (!userDeleteReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for deleting this user.",
        variant: "destructive",
      });
      return;
    }

    try {
      await authService.deleteUser(deletingUser.id);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      
      // Log the user deletion
      localStorageService.addUserActivityLog({
        id: crypto.randomUUID(),
        action: "User Deleted",
        targetUsername: deletingUser.username,
        targetName: deletingUser.name,
        details: `User ${deletingUser.name} (${deletingUser.username}) was deleted`,
        reason: userDeleteReason,
        timestamp: new Date().toISOString(),
        performedBy: authService.getCurrentUser()?.name || "System",
        meta: {},
      });
      queryClient.invalidateQueries({ queryKey: ["userActivityLogs"] });
      
      toast({
        title: "User Deleted",
        description: `${deletingUser.name} has been removed from the system.`,
      });

      // Reset state
      setDeletingUser(null);
      setUserDeletePassword("");
      setUserDeleteReason("");
      setShowDeleteUserDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  // Format sync status
  const getSyncStatus = () => {
    if (!lastSyncTimestamp) {
      return { text: "Never synced", color: "orange", age: "N/A" };
    }

    const lastSync = DateTime.fromISO(lastSyncTimestamp, { zone: "Europe/London" });
    const hoursSince = now.diff(lastSync, "hours").hours;

    if (hoursSince < 24) {
      return { text: "Recent", color: "green", age: `${Math.floor(hoursSince)} hours ago` };
    } else if (hoursSince < 72) {
      return { text: "Needs attention", color: "orange", age: `${Math.floor(hoursSince / 24)} days ago` };
    } else {
      return { text: "Outdated", color: "red", age: `${Math.floor(hoursSince / 24)} days ago` };
    }
  };

  const syncStatus = getSyncStatus();

  // Handle CSV upload for holidays
  const handleHolidayUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingHolidays(true);
    setUploadedFile(file);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error("CSV file is empty");
      }

      // Parse CSV (assuming format: date, day, holiday name)
      const parsedHolidays: Holiday[] = [];
      
      // Skip header if present
      const startIndex = lines[0].toLowerCase().includes('date') ? 1 : 0;
      
      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Split by comma, but handle quotes
        const parts: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        parts.push(current.trim());
        
        if (parts.length >= 3) {
          const [date, day, holidayName] = parts;
          parsedHolidays.push({
            id: idGenerator.generateLogID(),
            date: date.replace(/"/g, '').trim(),
            day: day.replace(/"/g, '').trim(),
            holidayName: holidayName.replace(/"/g, '').trim(),
          });
        }
      }

      if (parsedHolidays.length === 0) {
        throw new Error("No valid holidays found in CSV file");
      }

      // Clear existing holidays and add new ones
      localStorageService.clearAllHolidays();
      parsedHolidays.forEach(holiday => localStorageService.addHoliday(holiday));

      // Invalidate query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["holidays"] });

      toast({
        title: "Success",
        description: `Uploaded ${parsedHolidays.length} holidays successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload holidays",
        variant: "destructive",
      });
    } finally {
      setIsUploadingHolidays(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-admin">Admin Dashboard</h1>
          <p className="text-muted-foreground">System overview and monitoring</p>
        </div>
        <Button
          onClick={exportSystemReport}
          variant="outline"
          size="default"
          data-testid="button-export-report"
        >
          <Download className="mr-2 h-4 w-4" />
          Export Full Report
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="holidays" data-testid="tab-holidays">Official Holidays</TabsTrigger>
          <TabsTrigger value="audit-log" data-testid="tab-audit-log">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">

      {/* System Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-companies">{stats.totalCompanies}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCompanies} active, {stats.inactiveCompanies} inactive
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.companiesWithSL} with SL
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total COS</CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="stat-total-cos-main">{stats.totalCOS}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold text-xs" data-testid="badge-main-defined-cos">
                D: {stats.totalDefinedCOS}
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 font-semibold text-xs" data-testid="badge-main-undefined-cos">
                U: {stats.totalUndefinedCOS}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              All SL companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-employees">{stats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeEmployees} active, {stats.onboardingEmployees} onboarding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Company Tasks</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-company-tasks">{stats.totalCompanyTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.openCompanyTasks} open, {stats.doneCompanyTasks} done
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Employee Tasks</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-employee-tasks">{stats.totalEmployeeTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.openEmployeeTasks} open, {stats.completedEmployeeTasks} completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Templates & Configuration Overview */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4">Templates & Configuration</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SL Prep Tasks</CardTitle>
              <ListChecks className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-sl-prep-tasks">{stats.slPrepTasksCount}</div>
              <p className="text-xs text-muted-foreground">
                Master task templates
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.companiesInSLPrep} in prep, {stats.companiesSLIssued} issued
              </p>
              <div className="mt-2 pt-2 border-t flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium">COS Total:</p>
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs" data-testid="badge-admin-defined-cos">
                  D: {stats.totalDefinedCOS}
                </Badge>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs" data-testid="badge-admin-undefined-cos">
                  U: {stats.totalUndefinedCOS}
                </Badge>
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 text-xs" data-testid="badge-admin-total-cos">
                  Total: {stats.totalCOS}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">HR Templates</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-hr-templates">{stats.hrTaskTemplatesCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.hrOneTimeTemplates} one-time, {stats.hrMonthlyTemplates} monthly, {stats.hrAnnualTemplates} annual
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Residency Templates</CardTitle>
              <Globe2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-residency-templates">{stats.residencyTemplatesCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.residencyEmployees} employees enrolled
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.residencyWeeklyTemplates} weekly, {stats.residencyMonthlyTemplates} monthly
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employee Form</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-form-fields">{stats.formFieldsCount}</div>
              <p className="text-xs text-muted-foreground">
                Total form fields
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.formConditionalFieldsCount} with conditional logic
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auditors Overview */}
      <div className="mt-6">
        <h2 className="text-2xl font-bold mb-4">Auditors Summary</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Company Auditor</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-unreviewed-company">{stats.unreviewedCompanyTasks}</div>
              <p className="text-xs text-muted-foreground">
                Tasks awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">HR Auditor</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-unreviewed-hr">{stats.unreviewedHRTasks}</div>
              <p className="text-xs text-muted-foreground">
                HR tasks awaiting review
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Residency Auditor</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-unreviewed-residency">{stats.unreviewedResidencyTasks}</div>
              <p className="text-xs text-muted-foreground">
                Residency tasks awaiting review
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Auditor Red Flags Overview */}
      <div className="flex items-center justify-between mb-4 mt-8">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h2 className="text-2xl font-bold">Auditor Red Flags</h2>
          <Badge variant={totalAuditorRedFlags > 0 ? "destructive" : "outline"} data-testid="badge-auditor-red-flags-count">
            {totalAuditorRedFlags} total
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Items pending &gt; 7 days</p>
      </div>

      {/* Auditor Red Flags Grid */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        {/* Company Auditor Red Flags */}
        <Card className={companyAuditorRedFlags > 0 ? "border-destructive" : ""} data-testid="card-company-auditor-red-flags">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Company Auditor</CardTitle>
              <Badge variant={companyAuditorRedFlags > 0 ? "destructive" : "outline"}>
                {companyAuditorRedFlags}
              </Badge>
            </div>
            {companyAuditorRedFlags > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Unreviewed tasks: {companyAuditorUnreviewedTasks.length}</p>
                <p>Pending SL changes: {companyAuditorPendingSLChanges.length}</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {companyAuditorRedFlags === 0 ? (
              <Alert>
                <AlertDescription>All items reviewed or pending &lt; 7 days</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Items waiting for Company Auditor action for more than 7 days</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* HR Auditor Red Flags */}
        <Card className={hrAuditorRedFlags > 0 ? "border-destructive" : ""} data-testid="card-hr-auditor-red-flags">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">HR Auditor</CardTitle>
              <Badge variant={hrAuditorRedFlags > 0 ? "destructive" : "outline"}>
                {hrAuditorRedFlags}
              </Badge>
            </div>
            {hrAuditorRedFlags > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Unreviewed tasks: {hrAuditorUnreviewedTasks.length}</p>
                <p>Pending status changes: {hrAuditorPendingStatusChanges.length}</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {hrAuditorRedFlags === 0 ? (
              <Alert>
                <AlertDescription>All items reviewed or pending &lt; 7 days</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Items waiting for HR Auditor action for more than 7 days</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Residency Auditor Red Flags */}
        <Card className={residencyAuditorRedFlags > 0 ? "border-destructive" : ""} data-testid="card-residency-auditor-red-flags">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Residency Auditor</CardTitle>
              <Badge variant={residencyAuditorRedFlags > 0 ? "destructive" : "outline"}>
                {residencyAuditorRedFlags}
              </Badge>
            </div>
            {residencyAuditorRedFlags > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Unreviewed tasks: {residencyAuditorUnreviewedTasks.length}</p>
                <p>Pending dependant requests: {residencyAuditorPendingDependantRequests.length}</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {residencyAuditorRedFlags === 0 ? (
              <Alert>
                <AlertDescription>All items reviewed or pending &lt; 7 days</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Items waiting for Residency Auditor action for more than 7 days</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Red Flags Overview */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <h2 className="text-2xl font-bold">Red Flags</h2>
          <Badge variant={totalRedFlags > 0 ? "destructive" : "outline"} data-testid="badge-red-flags-count">
            {totalRedFlags} total
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">Tasks overdue &gt; 1 week</p>
      </div>

      {/* Red Flags Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Company Tasks Red Flags */}
        <Card className={overdueCompanyTasks.length > 0 ? "border-destructive" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Company Tasks</CardTitle>
              <Badge variant={overdueCompanyTasks.length > 0 ? "destructive" : "outline"}>
                {overdueCompanyTasks.length}
              </Badge>
            </div>
            {overdueCompanyTasks.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Avg: {companyTaskStats.avgDaysOverdue} days overdue</p>
                <p>Worst: {companyTaskStats.maxDaysOverdue} days overdue</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {overdueCompanyTasks.length === 0 ? (
              <Alert>
                <AlertDescription>All company tasks on track</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {overdueCompanyTasks.map((task) => {
                    const dueDate = DateTime.fromISO(task.dueAt, { zone: "Europe/London" });
                    const daysOverdue = Math.floor(now.diff(dueDate, "days").days);
                    const company = companies.find((c) => c.id === task.companyId);
                    return (
                      <div key={task.id} className="p-3 rounded-lg border bg-card hover-elevate" data-testid={`red-flag-task-${task.id}`}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-tight">{task.title}</p>
                            <Badge variant="destructive" className="shrink-0">
                              {daysOverdue}d
                            </Badge>
                          </div>
                          {company && (
                            <Link href={`/company/${company.id}`}>
                              <Button variant="ghost" className="h-auto p-0 text-xs text-primary hover:underline" data-testid={`link-company-${company.id}`}>
                                {task.companyName}
                              </Button>
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Due: {dueDate.toFormat("dd MMM yyyy")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* HR Tasks Red Flags */}
        <Card className={overdueHRTasks.length > 0 ? "border-destructive" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">HR Tasks</CardTitle>
              <Badge variant={overdueHRTasks.length > 0 ? "destructive" : "outline"}>
                {overdueHRTasks.length}
              </Badge>
            </div>
            {overdueHRTasks.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Avg: {hrTaskStats.avgDaysOverdue} days overdue</p>
                <p>Worst: {hrTaskStats.maxDaysOverdue} days overdue</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {overdueHRTasks.length === 0 ? (
              <Alert>
                <AlertDescription>All HR tasks on track</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {overdueHRTasks.map((task) => {
                    const dueDate = DateTime.fromISO(task.dueAt!, { zone: "Europe/London" });
                    const daysOverdue = Math.floor(now.diff(dueDate, "days").days);
                    const employee = employees.find((e) => e.id === task.employeeId);
                    return (
                      <div key={task.id} className="p-3 rounded-lg border bg-card hover-elevate" data-testid={`red-flag-task-${task.id}`}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-tight">{task.title}</p>
                            <Badge variant="destructive" className="shrink-0">
                              {daysOverdue}d
                            </Badge>
                          </div>
                          {employee && (
                            <Link href={`/employee/${employee.id}`}>
                              <Button variant="ghost" className="h-auto p-0 text-xs text-primary hover:underline" data-testid={`link-employee-${employee.id}`}>
                                {task.employeeName}
                              </Button>
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">{task.companyName}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {dueDate.toFormat("dd MMM yyyy")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Residency Tasks Red Flags */}
        <Card className={overdueResidencyTasks.length > 0 ? "border-destructive" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Residency Tasks</CardTitle>
              <Badge variant={overdueResidencyTasks.length > 0 ? "destructive" : "outline"}>
                {overdueResidencyTasks.length}
              </Badge>
            </div>
            {overdueResidencyTasks.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Avg: {residencyTaskStats.avgDaysOverdue} days overdue</p>
                <p>Worst: {residencyTaskStats.maxDaysOverdue} days overdue</p>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {overdueResidencyTasks.length === 0 ? (
              <Alert>
                <AlertDescription>All residency tasks on track</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {overdueResidencyTasks.map((task) => {
                    const dueDate = DateTime.fromISO(task.dueAt!, { zone: "Europe/London" });
                    const daysOverdue = Math.floor(now.diff(dueDate, "days").days);
                    const employee = employees.find((e) => e.id === task.employeeId);
                    return (
                      <div key={task.id} className="p-3 rounded-lg border bg-card hover-elevate" data-testid={`red-flag-task-${task.id}`}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-tight">{task.title}</p>
                            <Badge variant="destructive" className="shrink-0">
                              {daysOverdue}d
                            </Badge>
                          </div>
                          {employee && (
                            <Link href={`/employee/${employee.id}`}>
                              <Button variant="ghost" className="h-auto p-0 text-xs text-primary hover:underline" data-testid={`link-employee-${employee.id}`}>
                                {task.employeeName}
                              </Button>
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">{task.companyName}</p>
                          <p className="text-xs text-muted-foreground">
                            Due: {dueDate.toFormat("dd MMM yyyy")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Other Employee Tasks Red Flags */}
        {overdueOtherEmployeeTasks.length > 0 && (
          <Card className="border-destructive">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Other Employee Tasks</CardTitle>
                <Badge variant="destructive">
                  {overdueOtherEmployeeTasks.length}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Probation, RTW, Visa, etc.</p>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {overdueOtherEmployeeTasks.map((task) => {
                    const dueDate = DateTime.fromISO(task.dueAt!, { zone: "Europe/London" });
                    const daysOverdue = Math.floor(now.diff(dueDate, "days").days);
                    const employee = employees.find((e) => e.id === task.employeeId);
                    return (
                      <div key={task.id} className="p-3 rounded-lg border bg-card hover-elevate" data-testid={`red-flag-task-${task.id}`}>
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-medium text-sm leading-tight">{task.title}</p>
                            <Badge variant="destructive" className="shrink-0">
                              {daysOverdue}d
                            </Badge>
                          </div>
                          {employee && (
                            <Link href={`/employee/${employee.id}`}>
                              <Button variant="ghost" className="h-auto p-0 text-xs text-primary hover:underline" data-testid={`link-employee-${employee.id}`}>
                                {task.employeeName}
                              </Button>
                            </Link>
                          )}
                          <p className="text-xs text-muted-foreground">{task.companyName}</p>
                          <Badge variant="outline" className="text-xs">{task.taskType}</Badge>
                          <p className="text-xs text-muted-foreground">
                            Due: {dueDate.toFormat("dd MMM yyyy")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sync Status & System Logs */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Last Sync Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Companies House Sync</CardTitle>
              <Badge variant={
                syncStatus.color === "green" ? "default" :
                syncStatus.color === "orange" ? "secondary" :
                "destructive"
              } data-testid="badge-sync-status">
                {syncStatus.text}
              </Badge>
            </div>
            <CardDescription>Last synchronized {syncStatus.age}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lastSyncTimestamp && (
              <div className="text-sm text-muted-foreground">
                <p>Last sync: {DateTime.fromISO(lastSyncTimestamp, { zone: "Europe/London" }).toFormat("dd MMM yyyy, HH:mm")}</p>
              </div>
            )}
            <Button
              onClick={() => syncMutation.mutate()}
              disabled={isSyncing}
              className="w-full"
              data-testid="button-sync-now"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>System management and exports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              onClick={exportSystemReport}
              variant="outline"
              className="w-full justify-start"
              data-testid="button-export-excel"
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export System Report (Excel)
            </Button>
            <Button
              onClick={handleExportAllCSVs}
              variant="outline"
              disabled={isExporting}
              className="w-full justify-start"
              data-testid="button-export-all-csvs"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "Exporting..." : "Export All System CSVs"}
            </Button>
            <Button
              onClick={() => setShowGoogleDriveSettings(!showGoogleDriveSettings)}
              variant="outline"
              className="w-full justify-start"
              data-testid="button-google-drive-settings"
            >
              <Settings className="mr-2 h-4 w-4" />
              Google Drive Settings
            </Button>
            <Button
              onClick={() => queryClient.invalidateQueries()}
              variant="outline"
              className="w-full justify-start"
              data-testid="button-refresh-data"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh All Data
            </Button>
            <Separator className="my-2" />
            <Link href="/deployment">
              <Button
                variant="outline"
                className="w-full justify-start"
                data-testid="button-download-deployment"
              >
                <Package className="mr-2 h-4 w-4" />
                Download Deployment Package
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Google Drive Settings */}
      {showGoogleDriveSettings && (
        <Card>
          <CardHeader>
            <CardTitle>Google Drive Settings</CardTitle>
            <CardDescription>Configure your Google Drive folder for automatic CSV uploads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="google-drive-url">Google Drive Folder URL</Label>
              <Input
                id="google-drive-url"
                type="url"
                value={googleDriveFolderUrl}
                onChange={(e) => setGoogleDriveFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                data-testid="input-google-drive-url"
              />
              <p className="text-xs text-muted-foreground">
                Enter the full URL of your Google Drive folder where CSV files will be uploaded
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={saveGoogleDriveSettings} data-testid="button-save-google-drive">
                Save Settings
              </Button>
              <Button variant="outline" onClick={() => setShowGoogleDriveSettings(false)} data-testid="button-cancel-google-drive">
                Cancel
              </Button>
            </div>
            <Alert>
              <AlertDescription>
                <strong>Note:</strong> CSV files will be downloaded to your computer with properly formatted names (YY-MM-DD HH:MM Name). 
                Please manually upload them to your Google Drive folder. Full Google Drive integration requires backend OAuth setup.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* User Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage system users and track their activity</CardDescription>
            </div>
            <Dialog open={showAddUserDialog} onOpenChange={setShowAddUserDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-user">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>Create a new user account with login credentials</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-username">Username</Label>
                    <Input
                      id="new-username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                      placeholder="Enter username"
                      data-testid="input-new-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Enter password"
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-password-hint">Password Hint (Optional)</Label>
                    <Input
                      id="new-password-hint"
                      value={newUser.passwordHint}
                      onChange={(e) => setNewUser({ ...newUser, passwordHint: e.target.value })}
                      placeholder="Enter password hint"
                      data-testid="input-new-password-hint"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-name">Full Name</Label>
                    <Input
                      id="new-name"
                      value={newUser.name}
                      onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                      placeholder="Enter full name"
                      data-testid="input-new-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-email">Email</Label>
                    <Input
                      id="new-email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="Enter email address"
                      data-testid="input-new-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-position">Position</Label>
                    <Input
                      id="new-position"
                      value={newUser.position}
                      onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                      placeholder="Enter position/title"
                      data-testid="input-new-position"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowAddUserDialog(false)} data-testid="button-cancel-add-user">
                    Cancel
                  </Button>
                  <Button onClick={handleAddUser} data-testid="button-save-user">
                    Add User
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} data-testid={`user-row-${user.id}`}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{user.userId}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.position}</TableCell>
                      <TableCell>
                        {DateTime.fromISO(user.createdAt).toFormat("dd MMM yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingUser(user);
                              setShowEditUserDialog(true);
                            }}
                            data-testid={`button-edit-user-${user.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            data-testid={`button-delete-user-${user.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={showEditUserDialog} onOpenChange={setShowEditUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  data-testid="input-edit-username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-new-password">New Password (Leave blank to keep current)</Label>
                <Input
                  id="edit-new-password"
                  type="password"
                  value={(editingUser as any).newPassword || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, newPassword: e.target.value } as any)}
                  placeholder="Enter new password"
                  data-testid="input-edit-new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-password-hint">Password Hint (Optional)</Label>
                <Input
                  id="edit-password-hint"
                  value={(editingUser as any).newPasswordHint ?? editingUser.passwordHint ?? ""}
                  onChange={(e) => setEditingUser({ ...editingUser, newPasswordHint: e.target.value } as any)}
                  placeholder="Enter password hint"
                  data-testid="input-edit-password-hint"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  data-testid="input-edit-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  data-testid="input-edit-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-position">Position</Label>
                <Input
                  id="edit-position"
                  value={editingUser.position}
                  onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                  data-testid="input-edit-position"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditUserDialog(false)} data-testid="button-cancel-edit-user">
              Cancel
            </Button>
            <Button onClick={handleEditUser} data-testid="button-update-user">
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteUserDialog} onOpenChange={setShowDeleteUserDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              {deletingUser && (
                <>
                  <div>
                    <p>You are about to permanently delete the following user:</p>
                    <div className="bg-muted p-3 rounded-md mt-2 space-y-1">
                      <p className="font-medium">{deletingUser.name}</p>
                      <p className="text-sm text-muted-foreground">Username: {deletingUser.username}</p>
                      <p className="text-sm text-muted-foreground">Email: {deletingUser.email}</p>
                      <p className="text-sm text-muted-foreground">Position: {deletingUser.position}</p>
                    </div>
                  </div>
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Impact:</strong> This user will no longer be able to log in to the system. All activity logs showing this user's actions will be preserved for auditing purposes.
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2">
                    <div>
                      <Label htmlFor="user-delete-password" className="text-sm font-medium">Password</Label>
                      <Input
                        id="user-delete-password"
                        type="password"
                        value={userDeletePassword}
                        onChange={(e) => setUserDeletePassword(e.target.value)}
                        placeholder="Enter password"
                        className="mt-1"
                        data-testid="input-user-delete-password"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Hint: Starts12</p>
                    </div>
                    <div>
                      <Label htmlFor="user-delete-reason" className="text-sm font-medium">Reason for Deletion</Label>
                      <Textarea
                        id="user-delete-reason"
                        value={userDeleteReason}
                        onChange={(e) => setUserDeleteReason(e.target.value)}
                        placeholder="Explain why you are deleting this user..."
                        className="mt-1 min-h-[80px]"
                        data-testid="textarea-user-delete-reason"
                      />
                    </div>
                  </div>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteUserDialog(false);
              setUserDeletePassword("");
              setUserDeleteReason("");
              setDeletingUser(null);
            }} data-testid="button-cancel-delete-user">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" data-testid="button-confirm-delete-user">
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Restore closing div for Sync Status & System Logs grid */}
      <div className="hidden">
      </div>

      {/* System-wide Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>System Activity Log</CardTitle>
          <CardDescription>All activities across the system, sorted by date and time</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Label htmlFor="user-filter" className="whitespace-nowrap">Filter by user:</Label>
              <Select value={selectedUserFilter} onValueChange={setSelectedUserFilter}>
                <SelectTrigger id="user-filter" className="w-[250px]" data-testid="select-user-filter">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.name}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUserFilter !== "all" && (
                <Badge variant="secondary">{allActivityLogs.filter(log => log.user === selectedUserFilter).length} activities</Badge>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const filteredLogs = allActivityLogs.filter(log => selectedUserFilter === "all" || log.user === selectedUserFilter);
                const csvContent = [
                  ["Log ID", "Date", "Time", "Category", "Entity Name", "Action", "Description", "Username"],
                  ...filteredLogs.map((log, idx) => {
                    const timestamp = DateTime.fromISO(log.timestamp, { zone: "Europe/London" });
                    const entityTypeLabel = log.entityType === "company" ? "Company" : log.entityType === "employee" ? "Employee" : log.entityType === "task" ? "Task" : log.entityType === "training" ? "Training" : log.entityType === "sl" ? "SL" : log.entityType === "user" ? "User" : log.entityType;
                    return [
                      `LOG-${String((log as any).logRefId || idx + 1).padStart(3, '0')}`,
                      timestamp.toFormat("dd MMM yyyy"),
                      timestamp.toFormat("HH:mm:ss"),
                      entityTypeLabel,
                      log.entityName,
                      log.action,
                      log.description,
                      log.user
                    ];
                  })
                ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");

                const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
                const link = document.createElement("a");
                const url = URL.createObjectURL(blob);
                link.setAttribute("href", url);
                const now = DateTime.now().setZone("Europe/London");
                link.setAttribute("download", `System_Activity_Log_${now.toFormat("yy-MM-dd_HHmm")}.csv`);
                link.style.visibility = "hidden";
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              data-testid="button-download-activity-log-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
          {allActivityLogs.length === 0 ? (
            <Alert>
              <AlertDescription>No activity logs yet. Actions will be recorded here.</AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Log ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Entity Name</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Username</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allActivityLogs.filter(log => selectedUserFilter === "all" || log.user === selectedUserFilter).map((log, index) => {
                    const timestamp = DateTime.fromISO(log.timestamp, { zone: "Europe/London" });
                    const entityTypeLabel = log.entityType === "company" ? "Company" : log.entityType === "employee" ? "Employee" : log.entityType === "task" ? "Task" : log.entityType === "training" ? "Training" : log.entityType === "sl" ? "SL" : log.entityType === "user" ? "User" : log.entityType;
                    return (
                      <TableRow key={log.id} data-testid={`activity-log-${index}`}>
                        <TableCell data-testid={`cell-log-ref-${index}`} className="whitespace-nowrap font-mono text-xs">
                          <Badge variant="outline" className="text-xs font-mono">
                            LOG-{String(log.logRefId || index + 1).padStart(3, '0')}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-log-date-${index}`} className="whitespace-nowrap">
                          {timestamp.toFormat("dd MMM yyyy")}<br/>
                          <span className="text-xs text-muted-foreground">{timestamp.toFormat("HH:mm:ss")}</span>
                        </TableCell>
                        <TableCell data-testid={`cell-log-entity-type-${index}`}>
                          <Badge variant="outline" className="text-xs">
                            {entityTypeLabel}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-log-entity-name-${index}`} className="font-medium">
                          {log.entityName}
                        </TableCell>
                        <TableCell data-testid={`cell-log-action-${index}`}>
                          <Badge variant="secondary" className="text-xs">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`cell-log-description-${index}`} className="max-w-md">
                          <p className="text-sm">{log.description}</p>
                        </TableCell>
                        <TableCell data-testid={`cell-log-user-${index}`}>
                          <Badge variant="secondary">{log.user}</Badge>
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

      {/* Danger Zone - Compact version at end of page */}
      <Card className="border-destructive mt-6">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Danger Zone</span>
            </div>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="button-delete-all-data">
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete All System Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <div>
                      <p>This will permanently delete:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                        <li>{stats.totalCompanies} companies</li>
                        <li>{stats.totalEmployees} employees</li>
                        <li>{stats.totalCompanyTasks} company tasks</li>
                        <li>{stats.totalEmployeeTasks} employee tasks</li>
                        <li>All activity logs and system data</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label htmlFor="delete-password" className="text-sm font-medium">Password</Label>
                        <Input
                          id="delete-password"
                          type="password"
                          value={deletePassword}
                          onChange={(e) => setDeletePassword(e.target.value)}
                          placeholder="Enter password"
                          className="mt-1"
                          data-testid="input-delete-password"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Hint: Starts12</p>
                      </div>
                      <div>
                        <Label htmlFor="delete-reason" className="text-sm font-medium">Reason for Deletion</Label>
                        <Textarea
                          id="delete-reason"
                          value={deleteReason}
                          onChange={(e) => setDeleteReason(e.target.value)}
                          placeholder="Enter reason for deleting all system data..."
                          className="mt-1"
                          rows={3}
                          data-testid="input-delete-reason"
                        />
                      </div>
                    </div>
                    <p className="text-destructive font-semibold">This action cannot be undone!</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel 
                    onClick={() => {
                      setDeletePassword("");
                      setDeleteReason("");
                    }}
                    data-testid="button-cancel-delete"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      deleteAllDataMutation.mutate({ password: deletePassword, reason: deleteReason });
                      setDeletePassword("");
                      setDeleteReason("");
                    }}
                    className="bg-destructive hover:bg-destructive/90"
                    data-testid="button-confirm-delete"
                    disabled={!deletePassword || !deleteReason.trim()}
                  >
                    Yes, Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="holidays" className="space-y-6 mt-6">
        <Card data-testid="card-holidays">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Official Vacation & Holidays
            </CardTitle>
            <CardDescription>
              Upload a CSV file with official holidays (format: date, day, holiday name)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Section */}
            <div className="flex items-center gap-4">
              <Label htmlFor="holiday-csv-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover-elevate active-elevate-2">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </div>
                <Input
                  id="holiday-csv-upload"
                  type="file"
                  accept=".csv"
                  onChange={handleHolidayUpload}
                  className="hidden"
                  data-testid="input-holiday-csv"
                  disabled={isUploadingHolidays}
                />
              </Label>
              {isUploadingHolidays && <p className="text-sm text-muted-foreground">Uploading...</p>}
            </div>

            {/* Holidays Table */}
            {holidays.length > 0 ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total holidays: <span className="font-semibold">{holidays.length}</span>
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (confirm("Are you sure you want to delete all holidays?")) {
                        localStorageService.clearAllHolidays();
                        queryClient.invalidateQueries({ queryKey: ["holidays"] });
                        toast({
                          title: "Success",
                          description: "All holidays deleted",
                        });
                      }
                    }}
                    data-testid="button-clear-holidays"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Holiday Name</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays.map((holiday, index) => (
                        <TableRow key={holiday.id} data-testid={`row-holiday-${index}`}>
                          <TableCell data-testid={`cell-holiday-date-${index}`}>{holiday.date}</TableCell>
                          <TableCell data-testid={`cell-holiday-day-${index}`}>{holiday.day}</TableCell>
                          <TableCell data-testid={`cell-holiday-name-${index}`}>{holiday.holidayName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No holidays uploaded yet</p>
                <p className="text-sm mt-2">Upload a CSV file to get started</p>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="audit-log" className="space-y-6 mt-6">
        <AuditLogViewer />
      </TabsContent>
    </Tabs>
    </div>
  );
}

// ==================
// Audit Log Viewer Component
// ==================
function AuditLogViewer() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // Reset page to 1 when filters change
  const handleActionFilterChange = (value: string) => {
    setActionFilter(value);
    setPage(1);
  };

  const handleCategoryFilterChange = (value: string) => {
    setCategoryFilter(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  // Build query key with filters
  const queryKey = [
    "/api/admin/general-log",
    { page, pageSize, action: actionFilter !== "all" ? actionFilter : undefined, category: categoryFilter !== "all" ? categoryFilter : undefined, search: searchTerm || undefined }
  ];

  const { data, isLoading } = useQuery<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("pageSize", pageSize.toString());
      if (actionFilter !== "all") params.append("action", actionFilter);
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(`/api/admin/general-log?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      return response.json();
    },
    retry: false,
  });

  const logs = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Card data-testid="card-audit-log">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          System Audit Log
        </CardTitle>
        <CardDescription>
          Complete audit trail of all system actions and changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="action-filter">Action</Label>
            <Select value={actionFilter} onValueChange={handleActionFilterChange}>
              <SelectTrigger id="action-filter" data-testid="select-action-filter">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="deletion_requested">Deletion Requested</SelectItem>
                <SelectItem value="deletion_approved">Deletion Approved</SelectItem>
                <SelectItem value="deletion_rejected">Deletion Rejected</SelectItem>
                <SelectItem value="company_deleted">Company Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category-filter">Category</Label>
            <Select value={categoryFilter} onValueChange={handleCategoryFilterChange}>
              <SelectTrigger id="category-filter" data-testid="select-category-filter">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="search-filter">Search</Label>
            <Input
              id="search-filter"
              placeholder="Search target or details..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="input-search-filter"
            />
          </div>
        </div>

        {/* Clear Filters Button */}
        {(actionFilter !== "all" || categoryFilter !== "all" || searchTerm) && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setActionFilter("all");
                setCategoryFilter("all");
                setSearchTerm("");
                setPage(1);
              }}
              data-testid="button-clear-filters"
            >
              Clear Filters
            </Button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20 animate-spin" />
            <p>Loading audit logs...</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && logs.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Metadata</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow key={log.id} data-testid={`row-audit-log-${index}`}>
                    <TableCell className="text-sm whitespace-nowrap" data-testid={`cell-timestamp-${index}`}>
                      {DateTime.fromISO(log.timestamp).toLocaleString(DateTime.DATETIME_SHORT)}
                    </TableCell>
                    <TableCell data-testid={`cell-action-${index}`}>
                      <Badge variant="outline" className="text-xs">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell data-testid={`cell-category-${index}`}>
                      <Badge variant="secondary" className="text-xs">
                        {log.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-md" data-testid={`cell-target-${index}`}>
                      <div className="truncate text-sm">
                        {log.targetName || log.targetId || "-"}
                      </div>
                    </TableCell>
                    <TableCell data-testid={`cell-performed-by-${index}`}>
                      <div className="text-sm">{log.performedByName}</div>
                    </TableCell>
                    <TableCell className="max-w-md" data-testid={`cell-details-${index}`}>
                      <div className="truncate text-sm text-muted-foreground">
                        {log.details || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                          data-testid={`button-view-metadata-${index}`}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && logs.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No audit logs found</p>
            <p className="text-sm mt-2">Try adjusting your filters</p>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Metadata Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent data-testid="dialog-metadata">
          <DialogHeader>
            <DialogTitle>Log Metadata</DialogTitle>
            <DialogDescription>
              Additional information for this audit log entry
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-2">
              <div className="rounded-md bg-muted p-4">
                <pre className="text-xs overflow-auto max-h-96">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
