import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { localStorageService } from "@/lib/localStorage";
import type { EmployeeRecord, EmployeeTask, Company, EmployeeActivityLog, Dependant, PendingDependantRequest, PendingEmployeeStatusChange } from "@shared/schema";
import { 
  ArrowLeft, User, Building2, Mail, Phone, Calendar, FileText, 
  MapPin, Shield, Briefcase, Edit2, Save, X, Clock, CheckCircle2, FileCheck, Download, AlertCircle, AlertTriangle, XCircle,
  Plus, Pencil, Trash2, Users
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, parseISO } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { generateEmployeeTasks, generateHRTemplateTasks } from "@/lib/utils/employeeTaskGenerator";
import { authService } from "@/lib/authService";
import { fillMissingAttendanceRecords } from "@/lib/utils/attendanceAutomation";
import { DateTime } from "luxon";
import { AttendanceReport } from "@/components/attendance-report";

export default function EmployeeDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<EmployeeRecord["status"]>("onboarding");
  const [statusChangeNote, setStatusChangeNote] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  
  // Handle attendance tab click - generate missing records
  const handleAttendanceTabClick = () => {
    if (activeTab !== "attendance" && employee) {
      const recordsGenerated = fillMissingAttendanceRecords(employee.id);
      if (recordsGenerated > 0) {
        // Store generation metadata
        const generationData = {
          timestamp: DateTime.now().setZone("Europe/London").toISO(),
          recordsGenerated,
        };
        localStorage.setItem(`attendance-generation-${employee.id}`, JSON.stringify(generationData));
        
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['/api/attendance', employee.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/attendance/last-generation', employee.id] });
      }
    }
    setActiveTab("attendance");
  };

  // Dependant management state
  const [dependantDialogOpen, setDependantDialogOpen] = useState(false);
  const [editingDependant, setEditingDependant] = useState<Dependant | null>(null);
  const [deletingDependant, setDeletingDependant] = useState<Dependant | null>(null);
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [dependantActionReason, setDependantActionReason] = useState("");
  const [pendingDependantAction, setPendingDependantAction] = useState<"add" | "remove" | null>(null);
  const [dependantForm, setDependantForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    relationship: "spouse" as "spouse" | "child",
    whatsAppNumber: "",
  });

  // Local state for editing
  const [editedEmployee, setEditedEmployee] = useState<Partial<EmployeeRecord>>({});

  // Load employee from database
  const { data: employee, isLoading } = useQuery<EmployeeRecord | null>({
    queryKey: ["/api/employees", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(`/api/employees/${id}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!id,
  });

  // Load company from database
  const { data: company } = useQuery<Company | null>({
    queryKey: ["/api/companies", employee?.companyId],
    queryFn: async () => {
      if (!employee || !employee.companyId) return null;
      const response = await fetch(`/api/companies/${employee.companyId}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: !!employee && !!employee.companyId,
  });

  // Load employee tasks from database
  const { data: employeeTasks = [] } = useQuery<EmployeeTask[]>({
    queryKey: ["/api/employee-tasks", "employee", id],
    queryFn: async () => {
      if (!id) return [];
      const response = await fetch(`/api/employees/${id}/tasks`, {
        credentials: "include",
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!id,
  });

  // Load activity logs (from localStorage legacy)
  const { data: activityLogs = [] } = useQuery<EmployeeActivityLog[]>({
    queryKey: ["employeeActivityLogs", id],
    queryFn: () => {
      if (!id) return [];
      return localStorageService.getEmployeeActivityLogsByEmployee(id);
    },
    enabled: !!id,
  });

  // Load general logs from API (new system)
  const { data: entityGeneralLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/general-log/entity", id],
    queryFn: async () => {
      if (!id) return [];
      const resp = await fetch(`/api/general-log/entity/${id}?limit=200`, { credentials: "include" });
      if (!resp.ok) return [];
      return resp.json();
    },
    enabled: !!id,
  });

  // Load dependants
  const { data: dependants = [] } = useQuery<Dependant[]>({
    queryKey: ["dependants", id],
    queryFn: () => {
      if (!id) return [];
      return localStorageService.getDependantsByEmployee(id);
    },
    enabled: !!id && !!employee?.isResidencyService,
  });

  // Load pending dependant "add" requests for this employee
  const { data: allPendingRequests = [] } = useQuery<PendingDependantRequest[]>({
    queryKey: ["pendingDependantRequests"],
    queryFn: () => localStorageService.getPendingDependantRequests(),
  });

  // Filter pending "add" requests for this employee with status "pending"
  const pendingAddRequests = allPendingRequests.filter(
    (req) => req.employeeId === id && req.action === "add" && req.status === "pending"
  );

  // Load pending employee status changes for this employee
  const { data: pendingStatusChanges = [] } = useQuery<PendingEmployeeStatusChange[]>({
    queryKey: ["pendingEmployeeStatusChanges"],
    queryFn: () => localStorageService.getPendingEmployeeStatusChanges(),
  });

  // Find pending status change for this employee
  const pendingStatusChange = pendingStatusChanges.find(
    (req) => req.employeeId === id && req.status === "pending"
  );

  // Add dependant request mutation (creates pending request)
  const addDependantMutation = useMutation({
    mutationFn: async ({ dependantData, reason }: { dependantData: typeof dependantForm & { employeeId: string; employeeName: string }; reason: string }) => {
      if (!employee) throw new Error("Employee not found");
      const currentUser = authService.getCurrentUser();
      const request: PendingDependantRequest = {
        id: crypto.randomUUID(),
        employeeId: dependantData.employeeId,
        employeeName: dependantData.employeeName,
        action: "add",
        requestedBy: currentUser?.name || "System",
        requestedAt: new Date().toISOString(),
        status: "pending",
        reason,
        dependantData: {
          firstName: dependantData.firstName,
          middleName: dependantData.middleName,
          lastName: dependantData.lastName,
          dateOfBirth: dependantData.dateOfBirth,
          relationship: dependantData.relationship,
          whatsAppNumber: dependantData.whatsAppNumber,
        },
      };
      localStorageService.addPendingDependantRequest(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingDependantRequests"] });
      setDependantDialogOpen(false);
      setReasonDialogOpen(false);
      setDependantActionReason("");
      setPendingDependantAction(null);
      setDependantForm({
        firstName: "",
        middleName: "",
        lastName: "",
        dateOfBirth: "",
        relationship: "spouse",
        whatsAppNumber: "",
      });
      toast({
        title: "Request Submitted",
        description: "Dependant add request has been submitted for approval.",
      });
    },
  });

  // Update dependant mutation
  const updateDependantMutation = useMutation({
    mutationFn: async ({ id: depId, updates }: { id: string; updates: Partial<Dependant> }) => {
      localStorageService.updateDependant(depId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dependants"] });
      setEditingDependant(null);
      setDependantForm({
        firstName: "",
        middleName: "",
        lastName: "",
        dateOfBirth: "",
        relationship: "spouse",
        whatsAppNumber: "",
      });
      toast({
        title: "Dependant Updated",
        description: "Dependant has been updated successfully.",
      });
    },
  });

  // Delete dependant request mutation (creates pending request)
  const deleteDependantMutation = useMutation({
    mutationFn: async ({ dependant, reason }: { dependant: Dependant; reason: string }) => {
      if (!employee) throw new Error("Employee not found");
      const currentUser = authService.getCurrentUser();
      const request: PendingDependantRequest = {
        id: crypto.randomUUID(),
        employeeId: dependant.employeeId,
        employeeName: dependant.employeeName,
        action: "remove",
        requestedBy: currentUser?.name || "System",
        requestedAt: new Date().toISOString(),
        status: "pending",
        reason,
        dependantData: {
          id: dependant.id,
          firstName: dependant.firstName,
          middleName: dependant.middleName,
          lastName: dependant.lastName,
          dateOfBirth: dependant.dateOfBirth,
          relationship: dependant.relationship,
          whatsAppNumber: dependant.whatsAppNumber,
        },
      };
      localStorageService.addPendingDependantRequest(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingDependantRequests"] });
      setDeletingDependant(null);
      setReasonDialogOpen(false);
      setDependantActionReason("");
      setPendingDependantAction(null);
      toast({
        title: "Request Submitted",
        description: "Dependant remove request has been submitted for approval.",
      });
    },
  });

  // Status change mutation - creates pending approval request
  const statusChangeMutation = useMutation({
    mutationFn: async ({ status, note }: { status: EmployeeRecord["status"]; note: string }) => {
      if (!employee) throw new Error("Employee not found");
      
      const oldStatus = employee.status;
      const currentUser = authService.getCurrentUser();
      
      // Determine change type
      let changeType: "status" | "deactivation" | "reactivation" = "status";
      if (status === "deactivated" && oldStatus !== "deactivated") {
        changeType = "deactivation";
      } else if (oldStatus === "deactivated" && status !== "deactivated") {
        changeType = "reactivation";
      }
      
      // Create pending status change request
      const request: PendingEmployeeStatusChange = {
        id: crypto.randomUUID(),
        employeeId: employee.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        changeType,
        currentValue: oldStatus,
        newValue: status,
        reason: note || "Status change requested",
        requestedBy: currentUser?.name || "System",
        requestedAt: new Date().toISOString(),
        status: "pending",
      };
      
      localStorageService.addPendingEmployeeStatusChange(request);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingEmployeeStatusChanges"] });
      queryClient.invalidateQueries({ queryKey: ["employeeActivityLogs"] });
      setStatusDialogOpen(false);
      setStatusChangeNote("");
      toast({
        title: "Status Change Requested",
        description: "Your status change request has been submitted for HR Auditor approval.",
      });
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (updates: Partial<EmployeeRecord>) => {
      if (!employee) throw new Error("Employee not found");
      
      // Update via API
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to update employee" }));
        console.error("Update employee error:", errorData);
        throw new Error(errorData.error || "Failed to update employee");
      }
      
      const updatedEmployee = await response.json();
      
      // Also update localStorage for consistency
      localStorageService.updateEmployee(employee.id, updates);
      
      // Log each changed field
      const currentUser = authService.getCurrentUser();
      Object.entries(updates).forEach(([field, newValue]) => {
        const oldValue = employee[field as keyof EmployeeRecord];
        if (oldValue !== newValue && field !== "updatedAt") {
          const log: EmployeeActivityLog = {
            id: crypto.randomUUID(),
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            action: "Field Updated",
            details: `${field} updated`,
            fieldChanged: field,
            oldValue: String(oldValue || ""),
            newValue: String(newValue || ""),
            timestamp: new Date().toISOString(),
            performedBy: currentUser?.name || "System",
            meta: {},
          };
          localStorageService.addEmployeeActivityLog(log);
        }
      });
      
      return updatedEmployee;
    },
    onSuccess: () => {
      // Regenerate employee tasks after update
      const updatedEmployee = localStorageService.getEmployees().find(e => e.id === employee!.id);
      if (updatedEmployee) {
        try {
          // Generate employee-specific tasks
          const { generatedTasks } = generateEmployeeTasks(updatedEmployee);
          generatedTasks.forEach(task => {
            localStorageService.addEmployeeTask(task);
          });
          
          // Generate HR template tasks
          const hrTasks = generateHRTemplateTasks(updatedEmployee);
          hrTasks.generatedTasks.forEach(task => {
            localStorageService.addEmployeeTask(task);
          });
          
          console.log(`[Employee Update] Generated ${generatedTasks.length + hrTasks.generatedTasks.length} new tasks after employee update`);
        } catch (error) {
          console.error('[Employee Update] Error generating tasks:', error);
        }
      }
      
      // Invalidate the specific employee query
      queryClient.invalidateQueries({ queryKey: ["/api/employees", id] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeeActivityLogs"] });
      queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
      setIsEditing(false);
      setEditedEmployee({});
      toast({
        title: "Employee Updated",
        description: "Employee information has been updated successfully.",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading employee...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <p className="text-muted-foreground mb-4">Employee not found</p>
        <Button onClick={() => setLocation("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Employees
        </Button>
      </div>
    );
  }

  // Helper function to get expiry status
  const getExpiryStatus = (expiryDate: string | undefined) => {
    if (!expiryDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return {
        status: "invalid",
        label: "Invalid",
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50 dark:bg-red-950/20",
        borderColor: "border-red-200 dark:border-red-800",
        icon: XCircle,
      };
    }
    
    if (daysUntilExpiry <= 30) {
      return {
        status: "warning",
        label: "Need attention",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/20",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        icon: AlertTriangle,
      };
    }
    
    return {
      status: "valid",
      label: "Valid",
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800",
      icon: CheckCircle2,
    };
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditedEmployee({ ...employee, middleNames: employee.middleNames || "" });
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedEmployee({});
  };

  const handleSaveEdit = () => {
    if (!employee) return;
    
    // Start with only the fields that were actually edited
    let updatedEmployee: Partial<EmployeeRecord> = {};
    
    // Only include fields that were actually changed (compare with original employee)
    Object.keys(editedEmployee).forEach((key) => {
      const newValue = editedEmployee[key as keyof typeof editedEmployee];
      const oldValue = employee[key as keyof EmployeeRecord];
      
      // Only include if the value actually changed
      if (newValue !== oldValue) {
        // Convert empty strings to null for optional fields
        if (newValue === "") {
          updatedEmployee[key as keyof EmployeeRecord] = null as any;
        } else {
          updatedEmployee[key as keyof EmployeeRecord] = newValue as any;
        }
      }
    });
    
    // Convert all numeric fields from strings to numbers
    if (updatedEmployee.weeklyHours !== undefined && updatedEmployee.weeklyHours !== null) {
      updatedEmployee.weeklyHours = typeof updatedEmployee.weeklyHours === 'string' 
        ? parseFloat(updatedEmployee.weeklyHours) 
        : updatedEmployee.weeklyHours;
    }
    if (updatedEmployee.salary !== undefined && updatedEmployee.salary !== null) {
      updatedEmployee.salary = typeof updatedEmployee.salary === 'string' 
        ? parseFloat(updatedEmployee.salary) 
        : updatedEmployee.salary;
    }
    if (updatedEmployee.hourlyRate !== undefined && updatedEmployee.hourlyRate !== null) {
      updatedEmployee.hourlyRate = typeof updatedEmployee.hourlyRate === 'string' 
        ? parseFloat(updatedEmployee.hourlyRate) 
        : updatedEmployee.hourlyRate;
    }
    if (updatedEmployee.breakMinutes !== undefined && updatedEmployee.breakMinutes !== null) {
      updatedEmployee.breakMinutes = typeof updatedEmployee.breakMinutes === 'string' 
        ? parseFloat(updatedEmployee.breakMinutes) 
        : updatedEmployee.breakMinutes;
    }
    if (updatedEmployee.vacationDays !== undefined && updatedEmployee.vacationDays !== null) {
      updatedEmployee.vacationDays = typeof updatedEmployee.vacationDays === 'string' 
        ? parseFloat(updatedEmployee.vacationDays) 
        : updatedEmployee.vacationDays;
    }
    
    // Calculate working hours if weeklyHours was edited
    const weeklyHours = updatedEmployee.weeklyHours !== undefined 
      ? updatedEmployee.weeklyHours 
      : employee.weeklyHours;
    
    if (updatedEmployee.weeklyHours !== undefined && weeklyHours && weeklyHours > 0) {
      const startingTime = (updatedEmployee.startingWorkingTime || employee.startingWorkingTime || "09:00") as string;
      
      // Calculate daily working hours: weeklyHours / 5
      const dailyWorkingHours = weeklyHours / 5;
      
      // Calculate ending working time: startingTime + dailyWorkingHours + 1 hour rest
      try {
        const [startHour, startMinute] = startingTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const dailyMinutes = dailyWorkingHours * 60;
        const restMinutes = 60; // 1 hour rest
        const endTotalMinutes = startTotalMinutes + dailyMinutes + restMinutes;
        
        const endHour = Math.floor(endTotalMinutes / 60) % 24;
        const endMinute = Math.floor(endTotalMinutes % 60);
        const endingWorkingTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        updatedEmployee = {
          ...updatedEmployee,
          dailyWorkingHours,
          endingWorkingTime,
        };
      } catch (e) {
        console.error("Error calculating working times:", e);
      }
    }
    
    console.log("Sending employee update:", updatedEmployee);
    updateEmployeeMutation.mutate(updatedEmployee);
  };

  const handleStatusChange = (status: EmployeeRecord["status"]) => {
    // Check if there's already a pending status change for this employee
    if (pendingStatusChange) {
      toast({
        title: "Pending Approval Exists",
        description: "There is already a pending status change approval for this employee. Please wait for the current request to be reviewed before submitting a new one.",
        variant: "destructive",
      });
      return;
    }
    setNewStatus(status);
    setStatusDialogOpen(true);
  };

  const handleExportTXT = () => {
    try {
      // Build text content with all employee information
      let content = `EMPLOYEE DETAILS\n`;
      content += `==========================================\n\n`;
      
      // Header
      content += `Name: ${employee.firstName} ${employee.lastName}\n`;
      content += `Job Title: ${employee.jobTitle || "Not set"}\n`;
      content += `Company: ${company?.name || employee.companyName || "Not set"}\n`;
      content += `Status: ${employee.status}\n`;
      content += `Completion: ${calculateCompletionPercentage()}%\n\n`;
      
      // Starting Date
      content += `Starting Date: `;
      if (employee.visaIssueDate) {
        content += `${format(parseISO(employee.visaIssueDate), "PPP")} (Visa Issue Date)\n`;
      } else if (employee.startDate) {
        content += `${format(parseISO(employee.startDate), "PPP")} (Contract Start Date)\n`;
      } else {
        content += `Not set\n`;
      }
      
      // Ending Date
      content += `Ending Date: `;
      if (employee.status === "leaver" && employee.leaverDate) {
        content += `${format(parseISO(employee.leaverDate), "PPP")} (Leaver Date)\n\n`;
      } else if (employee.isSponsored && employee.visaExpiryDate) {
        content += `${format(parseISO(employee.visaExpiryDate), "PPP")} (Visa Expiry)\n\n`;
      } else if (employee.endDate) {
        content += `${format(parseISO(employee.endDate), "PPP")} (Contract End)\n\n`;
      } else {
        content += `Not applicable\n\n`;
      }
      
      // Personal Information
      content += `PERSONAL INFORMATION\n`;
      content += `------------------------------------------\n`;
      content += `First Name: ${employee.firstName}\n`;
      if (employee.middleNames) {
        content += `Middle Names: ${employee.middleNames}\n`;
      }
      content += `Last Name: ${employee.lastName}\n`;
      content += `Date of Birth: ${employee.dateOfBirth ? format(parseISO(employee.dateOfBirth), "PPP") : "Not set"}\n`;
      content += `Personal Mobile: ${employee.personalMobile || "Not set"}\n`;
      content += `Personal Email: ${employee.personalEmail || "Not set"}\n\n`;
      
      // Address Information
      content += `ADDRESS INFORMATION\n`;
      content += `------------------------------------------\n`;
      content += `UK Address: ${employee.ukAddress || (employee.ukAddressProvideLater ? `Will provide ${employee.ukAddressProvideLater.replace("_", " ")}` : "Not set")}\n`;
      content += `Overseas Address: ${employee.overseasAddress || "Not set"}\n`;
      content += `UK Bank Address: ${employee.ukBankAddress || (employee.ukBankAddressProvideLater ? `Will provide ${employee.ukBankAddressProvideLater.replace("_", " ")}` : "Not set")}\n\n`;
      
      // Emergency Contact
      content += `EMERGENCY CONTACT\n`;
      content += `------------------------------------------\n`;
      content += `Name: ${employee.emergencyContactName || "Not set"}\n`;
      content += `Relationship: ${employee.emergencyContactRelationship || "Not set"}\n`;
      content += `Phone: ${employee.emergencyContactPhone || "Not set"}\n\n`;
      
      // Employment Details
      content += `EMPLOYMENT DETAILS\n`;
      content += `------------------------------------------\n`;
      content += `Company: ${company?.name || employee.companyName || "Not set"}\n`;
      content += `Job Title: ${employee.jobTitle || "Not set"}\n`;
      content += `Department: ${employee.department || "Not set"}\n`;
      content += `Line Manager: ${employee.lineManager || "Not set"}\n`;
      content += `Contract Type: ${employee.contractType ? employee.contractType.replace("_", " ") : "Not set"}\n`;
      content += `Start Date: ${employee.startDate ? format(parseISO(employee.startDate), "PPP") : "Not set"}\n`;
      if (employee.endDate) {
        content += `End Date: ${format(parseISO(employee.endDate), "PPP")}\n`;
      }
      content += `Weekly Hours: ${employee.weeklyHours ?? "Not set"}\n`;
      if (employee.dailyWorkingHours) {
        content += `Daily Working Hours: ${employee.dailyWorkingHours.toFixed(2)} hours\n`;
      }
      if (employee.startingWorkingTime) {
        content += `Starting Working Time: ${employee.startingWorkingTime}\n`;
      }
      if (employee.endingWorkingTime) {
        content += `Ending Working Time: ${employee.endingWorkingTime}\n`;
      }
      if (employee.breakMinutes !== undefined && employee.breakMinutes !== null) {
        content += `Break Duration: ${employee.breakMinutes} minutes\n`;
      }
      content += `Annual Salary: ${employee.salary != null ? `£${employee.salary.toLocaleString()}` : "Not set"}\n`;
      if (employee.vacationDays !== undefined && employee.vacationDays !== null) {
        content += `Annual Vacation Days: ${employee.vacationDays}\n`;
      }
      if (employee.hourlyRate) {
        content += `Hourly Rate: £${employee.hourlyRate.toFixed(2)}\n`;
      }
      content += `PAYE Reference: ${employee.payeReference || "Not set"}\n`;
      content += `National Insurance: ${employee.nationalInsurance || (employee.nationalInsuranceProvideLater ? `Will provide ${employee.nationalInsuranceProvideLater.replace("_", " ")}` : "Not set")}\n`;
      content += `Google Drive Link: ${employee.googleDriveLink || "Not set"}\n`;
      content += `Work Location: ${employee.workLocation || "Not set"}\n\n`;
      
      // Immigration & Visa Details
      content += `IMMIGRATION & VISA DETAILS\n`;
      content += `------------------------------------------\n`;
      content += `Immigration Status: ${employee.immigrationStatus || "Not set"}\n`;
      if (employee.immigrationStatus === "other") {
        content += `Sponsored: ${employee.isSponsored ? "Yes" : "No"}\n`;
      }
      content += `Passport Number: ${employee.passportNumber || "Not set"}\n`;
      if (employee.passportExpiry) {
        content += `Passport Expiry: ${format(parseISO(employee.passportExpiry), "PPP")}\n`;
      }
      if (employee.visaType) {
        content += `Visa Type: ${employee.visaType}\n`;
      }
      if (employee.visaIssueDate) {
        content += `Visa Issue Date: ${format(parseISO(employee.visaIssueDate), "PPP")}\n`;
      }
      if (employee.visaExpiryDate) {
        content += `Visa Expiry Date: ${format(parseISO(employee.visaExpiryDate), "PPP")}\n`;
      }
      if (employee.cosNumber) {
        content += `COS Number: ${employee.cosNumber}\n`;
      }
      if (employee.sponsorLicenseNumber) {
        content += `Sponsor License Number: ${employee.sponsorLicenseNumber}\n`;
      }
      content += `\n`;
      
      // Right to Work
      content += `RIGHT TO WORK\n`;
      content += `------------------------------------------\n`;
      if (employee.rtwBasis) {
        content += `RTW Basis: ${employee.rtwBasis}\n`;
      }
      if (employee.rtwCheckDate) {
        content += `RTW Check Date: ${format(parseISO(employee.rtwCheckDate), "PPP")}\n`;
      }
      if (employee.rtwEvidenceType) {
        content += `RTW Evidence Type: ${employee.rtwEvidenceType}\n`;
      }
      if (employee.rtwExpiryDate && !employee.rtwExpiryIndefinite) {
        content += `RTW Expiry Date: ${format(parseISO(employee.rtwExpiryDate), "PPP")}\n`;
      } else if (employee.rtwExpiryIndefinite) {
        content += `RTW Expiry: Indefinite\n`;
      }
      content += `\n`;
      
      // Document Verification
      content += `DOCUMENT VERIFICATION\n`;
      content += `------------------------------------------\n`;
      content += `Passport Copy: ${employee.docPassportCopy ? "Yes" : "No"}\n`;
      content += `Graduation Certificate Copy: ${employee.docGraduationCertCopy ? "Yes" : "No"}\n`;
      content += `Proof of Address Copy: ${employee.docProofOfAddressCopy ? "Yes" : "No"}\n`;
      content += `RTW Document Copy: ${employee.docRtwCopy ? "Yes" : "No"}\n`;
      content += `COS Copy: ${employee.docCosCopy ? "Yes" : "No"}\n`;
      content += `Visa Copy: ${employee.docVisaCopy ? "Yes" : "No"}\n`;
      content += `\n`;
      
      // Probation
      if (employee.probationPeriod) {
        content += `PROBATION\n`;
        content += `------------------------------------------\n`;
        content += `Probation Period: ${employee.probationPeriod} months\n`;
        content += `\n`;
      }
      
      content += `\n==========================================\n`;
      content += `Generated: ${format(new Date(), "PPP pp")}\n`;

      // Create blob and download
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${employee.firstName}_${employee.lastName}_Employee_Details.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Employee details exported as ${employee.firstName}_${employee.lastName}_Employee_Details.txt`,
      });
    } catch (error) {
      console.error("Error exporting text:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export employee details. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Dependant handlers
  const handleAddDependant = () => {
    setEditingDependant(null);
    setDependantForm({
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      relationship: "spouse",
      whatsAppNumber: "",
    });
    setDependantDialogOpen(true);
  };

  const handleEditDependant = (dependant: Dependant) => {
    setEditingDependant(dependant);
    // Defensive normalization: ensure whatsAppNumber is always a string
    const normalizedWhatsApp = dependant.whatsAppNumber ?? "";
    setDependantForm({
      firstName: dependant.firstName,
      middleName: dependant.middleName || "",
      lastName: dependant.lastName,
      dateOfBirth: dependant.dateOfBirth,
      relationship: dependant.relationship,
      whatsAppNumber: normalizedWhatsApp, // Fallback for legacy data without whatsAppNumber
    });
    setDependantDialogOpen(true);
  };

  const handleSaveDependant = () => {
    if (!employee) return;

    if (editingDependant) {
      // Update existing dependant (direct update - no approval needed for edits)
      updateDependantMutation.mutate({
        id: editingDependant.id,
        updates: {
          ...dependantForm,
          employeeName: `${employee.firstName} ${employee.lastName}`,
        },
      });
    } else {
      // Add new dependant - show reason dialog
      setPendingDependantAction("add");
      setReasonDialogOpen(true);
    }
  };

  const handleConfirmDependantAction = () => {
    if (!employee) return;
    if (!dependantActionReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this action.",
        variant: "destructive",
      });
      return;
    }

    if (pendingDependantAction === "add") {
      // Submit add request
      addDependantMutation.mutate({
        dependantData: {
          ...dependantForm,
          employeeId: employee.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
        },
        reason: dependantActionReason,
      });
    } else if (pendingDependantAction === "remove" && deletingDependant) {
      // Submit remove request
      deleteDependantMutation.mutate({
        dependant: deletingDependant,
        reason: dependantActionReason,
      });
    }
  };

  const handleDeleteDependantClick = (dependant: Dependant) => {
    setDeletingDependant(dependant);
    setPendingDependantAction("remove");
    setReasonDialogOpen(true);
  };

  const calculateCompletionPercentage = (): number => {
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

  const completionPercentage = calculateCompletionPercentage();

  return (
    <div className="space-y-6 p-6" id="employee-detail-content">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {employee.firstName}{employee.middleNames ? ` ${employee.middleNames}` : ""} {employee.lastName}
            </h1>
            <p className="text-muted-foreground">{employee.jobTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant="outline" 
            className={
              completionPercentage === 100
                ? "bg-green-50 text-green-700 border-green-200"
                : completionPercentage >= 50
                ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                : "bg-red-50 text-red-700 border-red-200"
            }
            data-testid="badge-completion-percentage"
          >
            {completionPercentage}% Complete
          </Badge>
          {!isEditing && (
            <>
              <Button onClick={handleExportTXT} variant="outline" data-testid="button-export-txt">
                <Download className="h-4 w-4 mr-2" />
                Export TXT
              </Button>
              <Button onClick={handleStartEdit} data-testid="button-edit">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </>
          )}
          {isEditing && (
            <>
              <Button variant="outline" onClick={handleCancelEdit} data-testid="button-cancel">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} data-testid="button-save">
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs for Details and Attendance */}
      <Tabs value={activeTab} onValueChange={(value) => value === "attendance" ? handleAttendanceTabClick() : setActiveTab(value)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details" data-testid="tab-details">Details</TabsTrigger>
          <TabsTrigger value="attendance" data-testid="tab-attendance">Attendance</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 mt-6">
          {/* Status Card */}
          <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Pending Status Change Indicator */}
          {pendingStatusChange && (
            <Alert className="mb-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-pending-status-change">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <span className="font-semibold">Status change submitted for HR approval</span>
                <div className="mt-1 text-sm">
                  Requested change: <span className="font-medium">{pendingStatusChange.currentValue}</span> → <span className="font-medium">{pendingStatusChange.newValue}</span>
                </div>
                <div className="text-sm text-yellow-700 dark:text-yellow-300">
                  Submitted on {format(parseISO(pendingStatusChange.requestedAt), "PPP 'at' p")} by {pendingStatusChange.requestedBy}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex items-center gap-4 flex-wrap">
            <Badge
              variant={
                employee.status === "active" ? "default" :
                employee.status === "onboarding" ? "secondary" :
                "outline"
              }
              className="text-base px-4 py-2"
              data-testid="badge-status"
            >
              {employee.status}
            </Badge>
            <Select
              value={employee.status}
              onValueChange={(value) => handleStatusChange(value as EmployeeRecord["status"])}
              data-testid="select-status"
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="onboarding">Onboarding</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="deactivated">Deactivated</SelectItem>
                <SelectItem value="leaver">Leaver</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2" data-testid="status-starting-date">
              <span className="text-sm font-medium text-muted-foreground">Starting Date:</span>
              <span className="text-base font-semibold">
                {employee.visaIssueDate ? (
                  <>
                    {format(parseISO(employee.visaIssueDate), "PPP")}
                    <span className="text-xs text-muted-foreground ml-1">(Visa Issue Date)</span>
                  </>
                ) : employee.startDate ? (
                  <>
                    {format(parseISO(employee.startDate), "PPP")}
                    <span className="text-xs text-muted-foreground ml-1">(Contract Start Date)</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </span>
            </div>
            
            <div className="flex items-center gap-2" data-testid="status-ending-date">
              <span className="text-sm font-medium text-muted-foreground">Ending Date:</span>
              <span className="text-base font-semibold">
                {employee.status === "leaver" && employee.leaverDate ? (
                  <>
                    {format(parseISO(employee.leaverDate), "PPP")}
                    <span className="text-xs text-muted-foreground ml-1">(Leaver Date)</span>
                  </>
                ) : employee.isSponsored && employee.visaExpiryDate ? (
                  <>
                    {format(parseISO(employee.visaExpiryDate), "PPP")}
                    <span className="text-xs text-muted-foreground ml-1">(Visa Expiry)</span>
                  </>
                ) : employee.endDate ? (
                  <>
                    {format(parseISO(employee.endDate), "PPP")}
                    <span className="text-xs text-muted-foreground ml-1">(Contract End)</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Not applicable</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Expiry Dates */}
      <Card data-testid="card-expiry-dates">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Important Expiry Dates
          </CardTitle>
          <CardDescription>
            Monitor critical dates for compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Visa Expiry Date - Only show if sponsored */}
            {employee.isSponsored && employee.visaExpiryDate && (
              <div className={`p-4 rounded-md border ${getExpiryStatus(employee.visaExpiryDate)?.borderColor} ${getExpiryStatus(employee.visaExpiryDate)?.bgColor}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Visa Expiry Date</p>
                    <p className="text-base font-semibold mb-2">{format(parseISO(employee.visaExpiryDate), "PPP")}</p>
                  </div>
                  {getExpiryStatus(employee.visaExpiryDate) && (
                    <div className={`flex items-center gap-1 ${getExpiryStatus(employee.visaExpiryDate)?.color}`}>
                      {(() => {
                        const Icon = getExpiryStatus(employee.visaExpiryDate)!.icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      <span className="text-sm font-semibold">{getExpiryStatus(employee.visaExpiryDate)?.label}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RTW Expiry Date - Only show if applicable and not indefinite */}
            {employee.rtwExpiryDate && !employee.rtwExpiryIndefinite && (
              <div className={`p-4 rounded-md border ${getExpiryStatus(employee.rtwExpiryDate)?.borderColor} ${getExpiryStatus(employee.rtwExpiryDate)?.bgColor}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">RTW Expiry Date</p>
                    <p className="text-base font-semibold mb-2">{format(parseISO(employee.rtwExpiryDate), "PPP")}</p>
                  </div>
                  {getExpiryStatus(employee.rtwExpiryDate) && (
                    <div className={`flex items-center gap-1 ${getExpiryStatus(employee.rtwExpiryDate)?.color}`}>
                      {(() => {
                        const Icon = getExpiryStatus(employee.rtwExpiryDate)!.icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      <span className="text-sm font-semibold">{getExpiryStatus(employee.rtwExpiryDate)?.label}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Contract Expiry Date - Only show if fixed_term contract */}
            {employee.contractType === "fixed_term" && employee.endDate && (
              <div className={`p-4 rounded-md border ${getExpiryStatus(employee.endDate)?.borderColor} ${getExpiryStatus(employee.endDate)?.bgColor}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Contract Expiry Date</p>
                    <p className="text-base font-semibold mb-2">{format(parseISO(employee.endDate), "PPP")}</p>
                  </div>
                  {getExpiryStatus(employee.endDate) && (
                    <div className={`flex items-center gap-1 ${getExpiryStatus(employee.endDate)?.color}`}>
                      {(() => {
                        const Icon = getExpiryStatus(employee.endDate)!.icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      <span className="text-sm font-semibold">{getExpiryStatus(employee.endDate)?.label}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Passport Expiry Date - Always show if available */}
            {employee.passportExpiry && (
              <div className={`p-4 rounded-md border ${getExpiryStatus(employee.passportExpiry)?.borderColor} ${getExpiryStatus(employee.passportExpiry)?.bgColor}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Passport Expiry Date</p>
                    <p className="text-base font-semibold mb-2">{format(parseISO(employee.passportExpiry), "PPP")}</p>
                  </div>
                  {getExpiryStatus(employee.passportExpiry) && (
                    <div className={`flex items-center gap-1 ${getExpiryStatus(employee.passportExpiry)?.color}`}>
                      {(() => {
                        const Icon = getExpiryStatus(employee.passportExpiry)!.icon;
                        return <Icon className="h-4 w-4" />;
                      })()}
                      <span className="text-sm font-semibold">{getExpiryStatus(employee.passportExpiry)?.label}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Show a message if no expiry dates are applicable */}
          {!employee.passportExpiry && 
           !employee.rtwExpiryDate && 
           (!employee.isSponsored || !employee.visaExpiryDate) && 
           (employee.contractType !== "fixed_term" || !employee.endDate) && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No expiry dates to display. Add passport, visa, RTW, or contract dates to monitor compliance.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">First Name</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.firstName || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, firstName: e.target.value })}
                  data-testid="input-first-name"
                />
              ) : (
                <p className="text-base" data-testid="text-first-name">{employee.firstName}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Middle Names</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.middleNames || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, middleNames: e.target.value })}
                  data-testid="input-middle-names"
                />
              ) : (
                <p className="text-base" data-testid="text-middle-names">{employee.middleNames || "-"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Last Name</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.lastName || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, lastName: e.target.value })}
                  data-testid="input-last-name"
                />
              ) : (
                <p className="text-base" data-testid="text-last-name">{employee.lastName}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedEmployee.dateOfBirth || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, dateOfBirth: e.target.value })}
                  data-testid="input-dob"
                />
              ) : (
                <p className="text-base" data-testid="text-dob">
                  {employee.dateOfBirth ? format(parseISO(employee.dateOfBirth), "PPP") : "Not set"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Personal Mobile</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.personalMobile || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, personalMobile: e.target.value })}
                  data-testid="input-mobile"
                />
              ) : (
                <p className="text-base" data-testid="text-mobile">{employee.personalMobile}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Personal Email</label>
              {isEditing ? (
                <Input
                  type="email"
                  value={editedEmployee.personalEmail || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, personalEmail: e.target.value })}
                  data-testid="input-email"
                />
              ) : (
                <p className="text-base" data-testid="text-email">{employee.personalEmail}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nationality</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.nationality || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, nationality: e.target.value })}
                  data-testid="input-nationality"
                />
              ) : (
                <p className="text-base" data-testid="text-nationality">{employee.nationality || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Passport Number</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.passportNumber || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, passportNumber: e.target.value })}
                  data-testid="input-passport-number"
                />
              ) : (
                <p className="text-base" data-testid="text-passport-number">{employee.passportNumber || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Passport Expiry Date</label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedEmployee.passportExpiry || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, passportExpiry: e.target.value })}
                  data-testid="input-passport-expiry"
                />
              ) : (
                <p className="text-base" data-testid="text-passport-expiry">
                  {employee.passportExpiry ? format(parseISO(employee.passportExpiry), "PPP") : "Not set"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Address Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">UK Address</label>
              {isEditing ? (
                <Textarea
                  value={editedEmployee.ukAddress || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, ukAddress: e.target.value })}
                  data-testid="input-uk-address"
                />
              ) : (
                <p className="text-base" data-testid="text-uk-address">
                  {employee.ukAddress || (employee.ukAddressProvideLater ? `Will provide ${employee.ukAddressProvideLater.replace("_", " ")}` : "Not set")}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Overseas Address</label>
              {isEditing ? (
                <Textarea
                  value={editedEmployee.overseasAddress || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, overseasAddress: e.target.value })}
                  data-testid="input-overseas-address"
                />
              ) : (
                <p className="text-base" data-testid="text-overseas-address">{employee.overseasAddress || "Not set"}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">UK Bank Address</label>
              {isEditing ? (
                <Textarea
                  value={editedEmployee.ukBankAddress || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, ukBankAddress: e.target.value })}
                  data-testid="input-uk-bank-address"
                />
              ) : (
                <p className="text-base" data-testid="text-uk-bank-address">
                  {employee.ukBankAddress || (employee.ukBankAddressProvideLater ? `Will provide ${employee.ukBankAddressProvideLater.replace("_", " ")}` : "Not set")}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Work Location</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.workLocation || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, workLocation: e.target.value })}
                  data-testid="input-work-location"
                />
              ) : (
                <p className="text-base" data-testid="text-work-location">{employee.workLocation || "Not set"}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Emergency Contact
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Name</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.emergencyContactName || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, emergencyContactName: e.target.value })}
                  data-testid="input-emergency-name"
                />
              ) : (
                <p className="text-base" data-testid="text-emergency-name">{employee.emergencyContactName || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Relationship</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.emergencyContactRelationship || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, emergencyContactRelationship: e.target.value })}
                  data-testid="input-emergency-relationship"
                />
              ) : (
                <p className="text-base" data-testid="text-emergency-relationship">{employee.emergencyContactRelationship || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Phone</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.emergencyContactPhone || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, emergencyContactPhone: e.target.value })}
                  data-testid="input-emergency-phone"
                />
              ) : (
                <p className="text-base" data-testid="text-emergency-phone">{employee.emergencyContactPhone || "Not set"}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Company</label>
              <p className="text-base" data-testid="text-company">{company?.name || employee.companyName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Job Title</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.jobTitle || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, jobTitle: e.target.value })}
                  data-testid="input-job-title"
                />
              ) : (
                <p className="text-base" data-testid="text-job-title">{employee.jobTitle}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Department</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.department || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, department: e.target.value })}
                  data-testid="input-department"
                />
              ) : (
                <p className="text-base" data-testid="text-department">{employee.department || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Line Manager</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.lineManager || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, lineManager: e.target.value })}
                  data-testid="input-line-manager"
                />
              ) : (
                <p className="text-base" data-testid="text-line-manager">{employee.lineManager || "Not set"}</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Job Description</label>
              {isEditing ? (
                <Textarea
                  value={editedEmployee.jobDescription || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, jobDescription: e.target.value })}
                  data-testid="input-job-description"
                  rows={3}
                />
              ) : (
                <p className="text-base" data-testid="text-job-description">{employee.jobDescription || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contract Type</label>
              {isEditing ? (
                <select
                  value={editedEmployee.contractType || "permanent"}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, contractType: e.target.value as "permanent" | "fixed_term" | "contractor" })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-base"
                  data-testid="select-contract-type"
                >
                  <option value="permanent">Permanent</option>
                  <option value="fixed_term">Fixed Term</option>
                  <option value="contractor">Contractor</option>
                </select>
              ) : (
                <p className="text-base capitalize" data-testid="text-contract-type">{employee.contractType ? employee.contractType.replace("_", " ") : "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Start Date</label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedEmployee.startDate || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, startDate: e.target.value })}
                  data-testid="input-start-date"
                />
              ) : (
                <p className="text-base" data-testid="text-start-date">
                  {employee.startDate ? format(parseISO(employee.startDate), "PPP") : "Not set"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Starting Date</label>
              <p className="text-base" data-testid="text-starting-date">
                {employee.visaIssueDate ? (
                  <>
                    {format(parseISO(employee.visaIssueDate), "PPP")}
                    <span className="text-xs text-muted-foreground ml-2">(Visa Issue Date)</span>
                  </>
                ) : employee.startDate ? (
                  <>
                    {format(parseISO(employee.startDate), "PPP")}
                    <span className="text-xs text-muted-foreground ml-2">(Contract Start Date)</span>
                  </>
                ) : (
                  "Not set"
                )}
              </p>
            </div>
            {(employee.contractType === "fixed_term" || employee.endDate) && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">End Date</label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editedEmployee.endDate || ""}
                    onChange={(e) => setEditedEmployee({ ...editedEmployee, endDate: e.target.value })}
                    data-testid="input-end-date"
                  />
                ) : (
                  <p className="text-base" data-testid="text-end-date">
                    {employee.endDate ? format(parseISO(employee.endDate), "PPP") : "Not set"}
                  </p>
                )}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">Working Days</label>
              {isEditing ? (
                <div className="text-sm text-muted-foreground italic">Edit working days in the form builder</div>
              ) : (
                <p className="text-base" data-testid="text-working-days">
                  {employee.workingDays && employee.workingDays.length > 0 
                    ? employee.workingDays.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(", ")
                    : "Not set"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Weekly Hours</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedEmployee.weeklyHours || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, weeklyHours: parseFloat(e.target.value) })}
                  data-testid="input-weekly-hours"
                />
              ) : (
                <p className="text-base" data-testid="text-weekly-hours">{employee.weeklyHours || 0}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Daily Working Hours</label>
              <p className="text-base text-muted-foreground" data-testid="text-daily-hours">
                {employee.dailyWorkingHours ? `${employee.dailyWorkingHours.toFixed(2)} hours` : "Not calculated"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Starting Working Time</label>
              {isEditing ? (
                <Input
                  type="time"
                  value={editedEmployee.startingWorkingTime || "09:00"}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, startingWorkingTime: e.target.value })}
                  data-testid="input-starting-time"
                />
              ) : (
                <p className="text-base" data-testid="text-starting-time">{employee.startingWorkingTime || "09:00"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Ending Working Time</label>
              <p className="text-base text-muted-foreground" data-testid="text-ending-time">
                {employee.endingWorkingTime || "Not calculated"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Break Duration</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedEmployee.breakMinutes != null ? editedEmployee.breakMinutes : ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, breakMinutes: parseFloat(e.target.value) })}
                  data-testid="input-break-minutes"
                  placeholder="Minutes"
                />
              ) : (
                <p className="text-base" data-testid="text-break-minutes">
                  {employee.breakMinutes !== undefined && employee.breakMinutes !== null 
                    ? `${employee.breakMinutes} minutes` 
                    : "Not set"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Annual Salary</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedEmployee.salary || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, salary: parseFloat(e.target.value) })}
                  data-testid="input-salary"
                />
              ) : (
                <p className="text-base" data-testid="text-salary">£{employee.salary?.toLocaleString() || 0}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Annual Vacation Days</label>
              {isEditing ? (
                <Input
                  type="number"
                  value={editedEmployee.vacationDays != null ? editedEmployee.vacationDays : ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, vacationDays: e.target.value ? parseFloat(e.target.value) : undefined })}
                  data-testid="input-vacationDays"
                  placeholder="Days per year"
                />
              ) : (
                <p className="text-base" data-testid="text-vacation-days">
                  {employee.vacationDays !== undefined && employee.vacationDays !== null 
                    ? `${employee.vacationDays} days` 
                    : "Not set"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Hourly Rate</label>
              {isEditing ? (
                <Input
                  type="number"
                  step="0.01"
                  value={editedEmployee.hourlyRate || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, hourlyRate: parseFloat(e.target.value) || 0 })}
                  data-testid="input-hourly-rate"
                />
              ) : (
                <p className="text-base" data-testid="text-hourly-rate">£{(employee.hourlyRate || 0).toFixed(2)}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">PAYE Reference</label>
              <p className="text-base" data-testid="text-paye-reference">{employee.payeReference || "Not set"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">National Insurance Number</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.nationalInsurance || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, nationalInsurance: e.target.value })}
                  data-testid="input-ni-number"
                />
              ) : (
                <p className="text-base" data-testid="text-ni-number">
                  {employee.nationalInsurance || (employee.nationalInsuranceProvideLater ? `Will provide ${employee.nationalInsuranceProvideLater.replace("_", " ")}` : "Not set")}
                </p>
              )}
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-muted-foreground">Google Drive Link</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.googleDriveLink || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, googleDriveLink: e.target.value })}
                  data-testid="input-google-drive"
                />
              ) : (
                <p className="text-base" data-testid="text-google-drive">
                  {employee.googleDriveLink ? (
                    <a href={employee.googleDriveLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {employee.googleDriveLink}
                    </a>
                  ) : "Not set"}
                </p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Probation Period</label>
              <p className="text-base" data-testid="text-probation-period">{employee.probationPeriod || 3} months</p>
            </div>
            {employee.probationEndDate && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Probation End Date</label>
                <p className="text-base" data-testid="text-probation-end">
                  {format(parseISO(employee.probationEndDate), "PPP")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Immigration & Right to Work */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Immigration & Right to Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Immigration Status</label>
              {isEditing ? (
                <select
                  value={editedEmployee.immigrationStatus || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, immigrationStatus: e.target.value as "british" | "settled" | "other" })}
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-base"
                  data-testid="select-immigration-status"
                >
                  <option value="">Select status</option>
                  <option value="british">British</option>
                  <option value="settled">Settled</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <p className="text-base capitalize" data-testid="text-immigration-status">{employee.immigrationStatus || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Sponsored</label>
              {isEditing ? (
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    checked={editedEmployee.isSponsored || false}
                    onCheckedChange={(checked) => setEditedEmployee({ ...editedEmployee, isSponsored: checked as boolean })}
                    data-testid="checkbox-sponsored"
                  />
                  <span className="text-sm">Employee is sponsored</span>
                </div>
              ) : (
                <Badge variant={employee.isSponsored ? "default" : "outline"} data-testid="badge-sponsored">
                  {employee.isSponsored ? "Yes" : "No"}
                </Badge>
              )}
            </div>
            {(employee.brpShareCode || isEditing) && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">BRP Share Code</label>
                {isEditing ? (
                  <Input
                    value={editedEmployee.brpShareCode || ""}
                    onChange={(e) => setEditedEmployee({ ...editedEmployee, brpShareCode: e.target.value })}
                    data-testid="input-brp-code"
                    placeholder="Enter BRP share code"
                  />
                ) : (
                  <p className="text-base" data-testid="text-brp-code">{employee.brpShareCode}</p>
                )}
              </div>
            )}
            {((isEditing && editedEmployee.isSponsored) || (!isEditing && employee.isSponsored)) && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Visa Type</label>
                  {isEditing ? (
                    <Input
                      value={editedEmployee.visaType || ""}
                      onChange={(e) => setEditedEmployee({ ...editedEmployee, visaType: e.target.value })}
                      data-testid="input-visa-type"
                      placeholder="e.g., Skilled Worker"
                    />
                  ) : (
                    <p className="text-base" data-testid="text-visa-type">{employee.visaType || "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">COS Number</label>
                  {isEditing ? (
                    <Input
                      value={editedEmployee.cosNumber || ""}
                      onChange={(e) => setEditedEmployee({ ...editedEmployee, cosNumber: e.target.value })}
                      data-testid="input-cos-number"
                      placeholder="Enter COS number"
                    />
                  ) : (
                    <p className="text-base" data-testid="text-cos-number">{employee.cosNumber || "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sponsor License Number</label>
                  {isEditing ? (
                    <Input
                      value={editedEmployee.sponsorLicenseNumber || ""}
                      onChange={(e) => setEditedEmployee({ ...editedEmployee, sponsorLicenseNumber: e.target.value })}
                      data-testid="input-sponsor-license"
                      placeholder="Enter license number"
                    />
                  ) : (
                    <p className="text-base" data-testid="text-sponsor-license">{employee.sponsorLicenseNumber || "Not set"}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Visa Issue Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedEmployee.visaIssueDate || ""}
                      onChange={(e) => setEditedEmployee({ ...editedEmployee, visaIssueDate: e.target.value })}
                      data-testid="input-visa-issue"
                    />
                  ) : employee.visaIssueDate ? (
                    <p className="text-base" data-testid="text-visa-issue">
                      {format(parseISO(employee.visaIssueDate), "PPP")}
                    </p>
                  ) : (
                    <p className="text-base text-muted-foreground">Not set</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Visa Expiry Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedEmployee.visaExpiryDate || ""}
                      onChange={(e) => setEditedEmployee({ ...editedEmployee, visaExpiryDate: e.target.value })}
                      data-testid="input-visa-expiry"
                    />
                  ) : employee.visaExpiryDate ? (
                    <p className="text-base" data-testid="text-visa-expiry">
                      {format(parseISO(employee.visaExpiryDate), "PPP")}
                    </p>
                  ) : (
                    <p className="text-base text-muted-foreground">Not set</p>
                  )}
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">RTW Basis</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.rtwBasis || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, rtwBasis: e.target.value })}
                  data-testid="input-rtw-basis"
                  placeholder="e.g., British Passport"
                />
              ) : (
                <p className="text-base" data-testid="text-rtw-basis">{employee.rtwBasis?.replace("_", " ") || "Not set"}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">RTW Check Date</label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editedEmployee.rtwCheckDate || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, rtwCheckDate: e.target.value })}
                  data-testid="input-rtw-check"
                />
              ) : employee.rtwCheckDate ? (
                <p className="text-base" data-testid="text-rtw-check">
                  {format(parseISO(employee.rtwCheckDate), "PPP")}
                </p>
              ) : (
                <p className="text-base text-muted-foreground">Not set</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">RTW Evidence Type</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.rtwEvidenceType || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, rtwEvidenceType: e.target.value })}
                  data-testid="input-rtw-evidence"
                  placeholder="e.g., Passport"
                />
              ) : employee.rtwEvidenceType ? (
                <p className="text-base capitalize" data-testid="text-rtw-evidence">{employee.rtwEvidenceType}</p>
              ) : (
                <p className="text-base text-muted-foreground">Not set</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">RTW Expiry Indefinite</label>
              {isEditing ? (
                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    checked={editedEmployee.rtwExpiryIndefinite || false}
                    onCheckedChange={(checked) => setEditedEmployee({ ...editedEmployee, rtwExpiryIndefinite: checked as boolean })}
                    data-testid="checkbox-rtw-indefinite"
                  />
                  <span className="text-sm">Indefinite right to work</span>
                </div>
              ) : employee.rtwExpiryIndefinite ? (
                <Badge variant="default" data-testid="badge-rtw-indefinite">Indefinite</Badge>
              ) : (
                <p className="text-base text-muted-foreground">No</p>
              )}
            </div>
            {((isEditing && !editedEmployee.rtwExpiryIndefinite) || (!isEditing && !employee.rtwExpiryIndefinite)) && (
              <>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">RTW Expiry Mode</label>
                  {isEditing ? (
                    <select
                      value={editedEmployee.rtwExpiryDateMode || "manual"}
                      onChange={(e) => setEditedEmployee({ ...editedEmployee, rtwExpiryDateMode: e.target.value as "auto" | "manual" })}
                      className="w-full px-3 py-2 border border-input bg-background rounded-md text-base"
                      data-testid="select-rtw-expiry-mode"
                    >
                      <option value="manual">Manual</option>
                      <option value="auto">Auto (Matches Visa Expiry)</option>
                    </select>
                  ) : employee.rtwExpiryDateMode ? (
                    <Badge variant="outline" data-testid="badge-rtw-expiry-mode">
                      {employee.rtwExpiryDateMode === "auto" ? "Auto (Matches Visa Expiry)" : "Manual"}
                    </Badge>
                  ) : (
                    <p className="text-base text-muted-foreground">Not set</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">RTW Expiry Date</label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editedEmployee.rtwExpiryDate || ""}
                      onChange={(e) => setEditedEmployee({ ...editedEmployee, rtwExpiryDate: e.target.value })}
                      data-testid="input-rtw-expiry"
                      disabled={editedEmployee.rtwExpiryDateMode === "auto"}
                    />
                  ) : employee.rtwExpiryDate ? (
                    <p className="text-base" data-testid="text-rtw-expiry">
                      {format(parseISO(employee.rtwExpiryDate), "PPP")}
                      {employee.rtwExpiryDateMode === "auto" && (
                        <span className="text-xs text-muted-foreground ml-2">(Auto-set from visa expiry)</span>
                      )}
                    </p>
                  ) : (
                    <p className="text-base text-muted-foreground">Not set</p>
                  )}
                </div>
              </>
            )}
            <div>
              <label className="text-sm font-medium text-muted-foreground">RTW Share Code</label>
              {isEditing ? (
                <Input
                  value={editedEmployee.rtwShareCode || ""}
                  onChange={(e) => setEditedEmployee({ ...editedEmployee, rtwShareCode: e.target.value })}
                  data-testid="input-rtw-share-code"
                  placeholder="Enter RTW share code"
                />
              ) : employee.rtwShareCode ? (
                <p className="text-base" data-testid="text-rtw-share-code">{employee.rtwShareCode}</p>
              ) : (
                <p className="text-base text-muted-foreground">Not set</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Document Verification
          </CardTitle>
          <CardDescription>Confirm copies of documents kept on file</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isEditing ? editedEmployee.docPassportCopy : employee.docPassportCopy} 
                disabled={!isEditing}
                onCheckedChange={(checked) => isEditing && setEditedEmployee({ ...editedEmployee, docPassportCopy: checked as boolean })}
                data-testid="checkbox-passport-copy" 
              />
              <label className="text-sm">Passport Copy</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isEditing ? editedEmployee.docGraduationCertCopy : employee.docGraduationCertCopy} 
                disabled={!isEditing}
                onCheckedChange={(checked) => isEditing && setEditedEmployee({ ...editedEmployee, docGraduationCertCopy: checked as boolean })}
                data-testid="checkbox-grad-cert-copy" 
              />
              <label className="text-sm">Graduation Certificate Copy</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isEditing ? editedEmployee.docProofOfAddressCopy : employee.docProofOfAddressCopy} 
                disabled={!isEditing}
                onCheckedChange={(checked) => isEditing && setEditedEmployee({ ...editedEmployee, docProofOfAddressCopy: checked as boolean })}
                data-testid="checkbox-proof-address-copy" 
              />
              <label className="text-sm">Proof of Address Copy</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isEditing ? editedEmployee.docRtwCopy : employee.docRtwCopy} 
                disabled={!isEditing}
                onCheckedChange={(checked) => isEditing && setEditedEmployee({ ...editedEmployee, docRtwCopy: checked as boolean })}
                data-testid="checkbox-rtw-copy" 
              />
              <label className="text-sm">RTW Document Copy</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isEditing ? editedEmployee.docCosCopy : employee.docCosCopy} 
                disabled={!isEditing}
                onCheckedChange={(checked) => isEditing && setEditedEmployee({ ...editedEmployee, docCosCopy: checked as boolean })}
                data-testid="checkbox-cos-copy" 
              />
              <label className="text-sm">COS Copy</label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isEditing ? editedEmployee.docVisaCopy : employee.docVisaCopy} 
                disabled={!isEditing}
                onCheckedChange={(checked) => isEditing && setEditedEmployee({ ...editedEmployee, docVisaCopy: checked as boolean })}
                data-testid="checkbox-visa-copy" 
              />
              <label className="text-sm">Visa Copy</label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* UKVI Reporting Notes */}
      {employee.ukviReportingNotes && (
        <Card>
          <CardHeader>
            <CardTitle>UKVI Reporting Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base whitespace-pre-wrap" data-testid="text-ukvi-notes">{employee.ukviReportingNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Residency Tasks - Only for employees with residency service */}
      {employee.isResidencyService && (() => {
        const residencyTasks = employeeTasks.filter(task => 
          task.taskType.startsWith("residency_template")
        );
        
        return (
          <Card data-testid="card-residency-tasks" className="border-purple-500/30 bg-purple-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-purple-600" />
                Residency Tasks ({residencyTasks.length})
              </CardTitle>
              <CardDescription>
                Residency service tasks assigned to this employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              {residencyTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No residency tasks assigned yet. Residency tasks will automatically appear here when templates are added in the Create Res. Tasks tab.</p>
              ) : (
                <div className="space-y-2">
                  {residencyTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                      data-testid={`residency-task-${task.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {task.taskType.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Due: {format(parseISO(task.dueAt), "PPP")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          task.status === "completed" ? "default" :
                          task.status === "open" ? "secondary" :
                          "outline"
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* HR Tasks - Organization-wide tasks */}
      {(() => {
        const hrTasks = employeeTasks.filter(task => 
          task.taskType.startsWith("hr_template")
        );
        
        return (
          <Card data-testid="card-hr-tasks" className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                HR Tasks ({hrTasks.length})
              </CardTitle>
              <CardDescription>
                Organization-wide HR tasks assigned to this employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* RTW Expiry Date - Important Info */}
              {employee.rtwExpiryDate && !employee.rtwExpiryIndefinite && (
                <div className="mb-4 p-3 border-2 border-orange-500 dark:border-orange-600 rounded-md bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-500" />
                    <div className="flex-1">
                      <p className="font-semibold text-orange-900 dark:text-orange-100">RTW Expiry Date</p>
                      <p className="text-sm text-orange-800 dark:text-orange-200">
                        {format(parseISO(employee.rtwExpiryDate), "PPP")}
                        {employee.rtwExpiryDateMode === "auto" && (
                          <span className="ml-2 text-xs">(Auto-set from visa expiry)</span>
                        )}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">
                      {(() => {
                        const days = Math.floor((new Date(employee.rtwExpiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (days < 0) return `${Math.abs(days)} days overdue`;
                        if (days === 0) return "Expires today";
                        if (days <= 30) return `${days} days remaining`;
                        return `${days} days`;
                      })()}
                    </Badge>
                  </div>
                </div>
              )}
              
              {hrTasks.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No HR tasks assigned yet. HR tasks will automatically appear here when templates are added in the HR Tasks tab.</p>
              ) : (
                <div className="space-y-2">
                  {hrTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 border rounded-md bg-card hover-elevate"
                      data-testid={`hr-task-${task.id}`}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground">{task.description}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {task.taskType === "hr_template" ? "One Time" :
                             task.taskType === "hr_template_monthly" ? "Monthly" :
                             task.taskType === "hr_template_annual" ? "Annual" : 
                             task.taskType.replace(/_/g, " ")}
                          </Badge>
                          <Badge 
                            variant={
                              task.priority === "urgent" ? "destructive" :
                              task.priority === "high" ? "default" :
                              "secondary"
                            }
                            className="text-xs"
                          >
                            {task.priority}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Due: {format(parseISO(task.dueAt), "PPP")}
                          </span>
                        </div>
                      </div>
                      <Badge
                        variant={
                          task.status === "completed" ? "default" :
                          task.status === "open" ? "secondary" :
                          "outline"
                        }
                      >
                        {task.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Employee Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            All Employee Tasks ({employeeTasks.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employeeTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No tasks found for this employee</p>
          ) : (
            <div className="space-y-2">
              {employeeTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                  data-testid={`task-${task.id}`}
                >
                  <div className="flex-1">
                    <p className="font-medium">{task.title}</p>
                    {task.description && (
                      <p className="text-sm text-muted-foreground">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {task.taskType.replace(/_/g, " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Due: {format(parseISO(task.dueAt), "PPP")}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      task.status === "completed" ? "default" :
                      task.status === "open" ? "secondary" :
                      "outline"
                    }
                  >
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Residency Service */}
      {employee.isResidencyService && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Residency Service
            </CardTitle>
            <CardDescription>
              Status and activity log for residency service
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Current Status */}
              <div className="flex items-center justify-between p-4 border rounded-md">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                  <p className="text-lg font-semibold">
                    {employee.residencyStatus === "done" ? "Completed" : "Pending HR Approval"}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    employee.residencyStatus === "done"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }
                  data-testid="badge-residency-status"
                >
                  {employee.residencyStatus === "done" ? (
                    <><CheckCircle2 className="h-3 w-3 mr-1" /> Done</>
                  ) : (
                    <><Clock className="h-3 w-3 mr-1" /> Pending</>
                  )}
                </Badge>
              </div>

              {/* Activity Log */}
              {employee.residencyLog && employee.residencyLog.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Activity History</p>
                  <div className="space-y-2">
                    {employee.residencyLog.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 border rounded-md"
                        data-testid={`residency-log-${log.id}`}
                      >
                        <div className="flex items-start justify-between mb-1">
                          <Badge variant="outline" className="text-xs">
                            {log.action === "enabled" ? "Enabled" : log.action === "disabled" ? "Disabled" : "Marked Done"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(log.timestamp), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm mt-2">{log.explanation}</p>
                        {log.userName && (
                          <p className="text-xs text-muted-foreground mt-1">By: {log.userName}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dependants - Only for employees with residency service */}
      {employee.isResidencyService && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Dependants
                </CardTitle>
                <CardDescription>
                  Manage dependants for this employee's residency service
                </CardDescription>
              </div>
              <Button onClick={handleAddDependant} data-testid="button-add-dependant">
                <Plus className="h-4 w-4 mr-2" />
                Add Dependant
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dependants.length === 0 && pendingAddRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No dependants added yet</p>
            ) : (
              <div className="space-y-2">
                {/* Show approved dependants */}
                {dependants.map((dependant) => (
                  <div
                    key={dependant.id}
                    className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                    data-testid={`dependant-${dependant.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium">
                        {dependant.firstName} {dependant.middleName && `${dependant.middleName} `}{dependant.lastName}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">
                          {dependant.relationship}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          DOB: {format(parseISO(dependant.dateOfBirth), "PPP")}
                        </span>
                        <span className="text-xs text-muted-foreground" data-testid={`text-dependant-whatsapp-${dependant.id}`}>
                          WhatsApp: {dependant.whatsAppNumber || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditDependant(dependant)}
                        data-testid={`button-edit-dependant-${dependant.id}`}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDeleteDependantClick(dependant)}
                        data-testid={`button-delete-dependant-${dependant.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                {/* Show pending "add" requests with faded styling */}
                {pendingAddRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-md opacity-50"
                    data-testid={`pending-dependant-${request.id}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-muted-foreground">
                        {request.dependantData.firstName}{' '}
                        {request.dependantData.middleName && `${request.dependantData.middleName} `}
                        {request.dependantData.lastName}
                      </p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs capitalize">
                          {request.dependantData.relationship}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          DOB: {format(parseISO(request.dependantData.dateOfBirth), "PPP")}
                        </span>
                        <span className="text-xs text-muted-foreground" data-testid={`text-pending-dependant-whatsapp-${request.id}`}>
                          WhatsApp: {request.dependantData.whatsAppNumber || "—"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Pending Approval
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Activity Log (merged: general_log API + legacy localStorage) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Log
          </CardTitle>
          <CardDescription>
            Complete history of all changes to this employee record
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            // Merge general_log entries with legacy activity logs, dedup by id
            const allLogs = [
              ...entityGeneralLogs.map((log: any) => ({
                id: log.id,
                logRefId: log.logRefId,
                timestamp: log.timestamp,
                action: log.action,
                details: log.details || `${log.action?.replace(/_/g, " ")} - ${log.targetName || ""}`,
                performedByName: log.performedByName || "System",
                source: "api" as const,
              })),
              ...activityLogs.map((log) => ({
                id: log.id,
                logRefId: null,
                timestamp: log.timestamp,
                action: log.action,
                details: log.details,
                performedByName: log.performedBy || "System",
                source: "legacy" as const,
              })),
            ];
            // Dedup by id and sort by timestamp descending
            const seen = new Set<string>();
            const uniqueLogs = allLogs.filter(l => {
              if (seen.has(l.id)) return false;
              seen.add(l.id);
              return true;
            }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            if (uniqueLogs.length === 0) {
              return <p className="text-muted-foreground text-center py-4">No activity yet</p>;
            }
            return (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Log ID</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Username</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniqueLogs.map((log) => (
                      <TableRow key={log.id} data-testid={`log-${log.id}`}>
                        <TableCell>
                          {log.logRefId ? (
                            <Badge variant="outline" className="text-xs font-mono">
                              LOG-{String(log.logRefId).padStart(3, "0")}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {format(parseISO(log.timestamp), "dd MMM yyyy")}
                          <br />
                          <span className="text-muted-foreground text-xs">
                            {format(parseISO(log.timestamp), "HH:mm:ss")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            log.action?.includes("created") ? "bg-green-50 text-green-700 border-green-200" :
                            log.action?.includes("updated") ? "bg-blue-50 text-blue-700 border-blue-200" :
                            log.action?.includes("deleted") || log.action?.includes("removed") ? "bg-red-50 text-red-700 border-red-200" :
                            log.action?.includes("status") ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-gray-50 text-gray-700 border-gray-200"
                          }>
                            {log.action?.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-md">{log.details}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{log.performedByName}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            );
          })()}
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6 mt-6">
          {employee && <AttendanceReport employee={employee} />}
        </TabsContent>
      </Tabs>

      {/* Status Change Confirmation Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              You are changing the status from "{employee.status}" to "{newStatus}".
              This will be logged in the employee's activity history.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <Textarea
                placeholder="Add a note about this status change..."
                value={statusChangeNote}
                onChange={(e) => setStatusChangeNote(e.target.value)}
                data-testid="textarea-status-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusDialogOpen(false)}
              data-testid="button-cancel-status"
            >
              Cancel
            </Button>
            <Button
              onClick={() => statusChangeMutation.mutate({ status: newStatus, note: statusChangeNote })}
              data-testid="button-confirm-status"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dependant Dialog */}
      <Dialog open={dependantDialogOpen} onOpenChange={setDependantDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDependant ? "Edit Dependant" : "Add Dependant"}</DialogTitle>
            <DialogDescription>
              {editingDependant ? "Update dependant details" : "Add a new dependant for this employee"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">First Name *</label>
              <Input
                placeholder="First name"
                value={dependantForm.firstName}
                onChange={(e) => setDependantForm({ ...dependantForm, firstName: e.target.value })}
                data-testid="input-dependant-firstname"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Middle Name</label>
              <Input
                placeholder="Middle name (optional)"
                value={dependantForm.middleName}
                onChange={(e) => setDependantForm({ ...dependantForm, middleName: e.target.value })}
                data-testid="input-dependant-middlename"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Last Name *</label>
              <Input
                placeholder="Last name"
                value={dependantForm.lastName}
                onChange={(e) => setDependantForm({ ...dependantForm, lastName: e.target.value })}
                data-testid="input-dependant-lastname"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date of Birth *</label>
              <Input
                type="date"
                value={dependantForm.dateOfBirth}
                onChange={(e) => setDependantForm({ ...dependantForm, dateOfBirth: e.target.value })}
                data-testid="input-dependant-dob"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Relationship *</label>
              <Select
                value={dependantForm.relationship}
                onValueChange={(value: "spouse" | "child") => setDependantForm({ ...dependantForm, relationship: value })}
              >
                <SelectTrigger data-testid="select-dependant-relationship">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="spouse">Spouse</SelectItem>
                  <SelectItem value="child">Child</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">WhatsApp Number *</label>
              <Input
                type="tel"
                placeholder="+44 1234 567890"
                value={dependantForm.whatsAppNumber}
                onChange={(e) => setDependantForm({ ...dependantForm, whatsAppNumber: e.target.value })}
                data-testid="input-dependant-whatsapp"
              />
              <p className="text-xs text-muted-foreground mt-1">Include country code (e.g., +44)</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDependantDialogOpen(false)}
              data-testid="button-cancel-dependant"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDependant}
              disabled={!dependantForm.firstName || !dependantForm.lastName || !dependantForm.dateOfBirth || !dependantForm.whatsAppNumber}
              data-testid="button-save-dependant"
            >
              {editingDependant ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reason Dialog for Add/Remove Dependant */}
      <Dialog open={reasonDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setReasonDialogOpen(false);
          setDependantActionReason("");
          setPendingDependantAction(null);
          setDeletingDependant(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pendingDependantAction === "add" ? "Add Dependant - Approval Required" : "Remove Dependant - Approval Required"}
            </DialogTitle>
            <DialogDescription>
              {pendingDependantAction === "add" 
                ? `This request to add ${dependantForm.firstName} ${dependantForm.lastName} will be sent to the Residency Auditor for approval.`
                : `This request to remove ${deletingDependant?.firstName} ${deletingDependant?.lastName} will be sent to the Residency Auditor for approval.`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dependant-reason">Reason for {pendingDependantAction === "add" ? "Adding" : "Removing"}</Label>
              <Textarea
                id="dependant-reason"
                placeholder={`Enter reason for ${pendingDependantAction === "add" ? "adding" : "removing"} this dependant...`}
                value={dependantActionReason}
                onChange={(e) => setDependantActionReason(e.target.value)}
                rows={3}
                data-testid="textarea-dependant-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setReasonDialogOpen(false);
                setDependantActionReason("");
                setPendingDependantAction(null);
                setDeletingDependant(null);
              }}
              data-testid="button-cancel-dependant-action"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDependantAction}
              disabled={!dependantActionReason.trim()}
              data-testid="button-confirm-dependant-action"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
