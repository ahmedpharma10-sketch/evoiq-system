import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { localStorageService } from "@/lib/localStorage";
import { authService } from "@/lib/authService";
import type { Company, InsertCompany, Task, CompanyActivityLog, SLPrepTask, CompanySLPrepTaskStatus, Level1User, PendingCompanySLChange, EmployeeRecord } from "@shared/schema";
import { insertCompanySchema, companySchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Building2, Calendar, User, Mail, Phone, FileText, Globe, FolderOpen, Users, CheckCircle2, Clock, AlertTriangle, Edit, Download, Plus, Trash2, ListTodo, Info, RefreshCw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { calculateDataCompletion } from "@/lib/utils/dataCompletion";
import { formatNextRenewalDate } from "@/lib/utils/renewalDate";
import { getTaskStatus, formatDueDate, getDaysUntilDue } from "@/lib/utils/taskGenerator";

export default function CompanyDetails() {
  const [, params] = useRoute("/company/:id");
  const [, setLocation] = useLocation();
  const companyId = params?.id;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [additionalPhones, setAdditionalPhones] = useState<string[]>([]);
  
  // Check if user came from SL Prep tab
  const urlParams = new URLSearchParams(window.location.search);
  const fromSlPrep = urlParams.get('from') === 'sl-prep';
  
  // SL Prep Tasks state
  const [slPrepTasks, setSlPrepTasks] = useState<SLPrepTask[]>([]);
  const [taskStatuses, setTaskStatuses] = useState<CompanySLPrepTaskStatus[]>([]);
  const [completingTask, setCompletingTask] = useState<SLPrepTask | null>(null);
  const [taskDescription, setTaskDescription] = useState("");
  const [completionNote, setCompletionNote] = useState("");
  
  // SL License Issuance state
  const [slLicenseIssued, setSlLicenseIssued] = useState(false);
  const [slLicenseNumber, setSlLicenseNumber] = useState("");
  const [slLicenseIssueDate, setSlLicenseIssueDate] = useState("");
  const [slPayeReference, setSlPayeReference] = useState("");
  const [slWorkAddress, setSlWorkAddress] = useState("");
  const [slLevel1Users, setSlLevel1Users] = useState<Level1User[]>([]);
  const [slDefinedCOS, setSlDefinedCOS] = useState<number | undefined>(undefined);
  const [slUndefinedCOS, setSlUndefinedCOS] = useState<number | undefined>(undefined);
  const [slPhone, setSlPhone] = useState("");
  const [slEmail, setSlEmail] = useState("");
  const [slWebsite, setSlWebsite] = useState("");
  const [slUnassignedDefinedCOS, setSlUnassignedDefinedCOS] = useState<number | undefined>(undefined);
  const [slUnassignedUndefinedCOS, setSlUnassignedUndefinedCOS] = useState<number | undefined>(undefined);
  const [slHasDebitCard, setSlHasDebitCard] = useState(false);
  const [slDebitCardActivated, setSlDebitCardActivated] = useState(false);
  const [slDebitCardExpiry, setSlDebitCardExpiry] = useState("");
  const [slHasDirectDebitHmrc, setSlHasDirectDebitHmrc] = useState(false);
  const [slHasDirectDebitNest, setSlHasDirectDebitNest] = useState(false);
  const [isLicenseEditMode, setIsLicenseEditMode] = useState(false);
  const [showUncheckConfirmation, setShowUncheckConfirmation] = useState(false);
  const [uncheckReason, setUncheckReason] = useState("");

  const { data: companies, isLoading: companiesLoading } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    queryFn: async () => await api.getCompanies(),
  });

  const company = companies?.find((c: Company) => c.id === companyId);

  // Fetch activity logs from general_log for this company
  const { data: entityLogs = [] } = useQuery<any[]>({
    queryKey: ["/api/general-log/entity", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const resp = await fetch(`/api/general-log/entity/${companyId}?limit=200`, { credentials: "include" });
      if (!resp.ok) return [];
      return resp.json();
    },
    enabled: !!companyId,
  });

  // Load pending SL changes for this company
  const { data: pendingSLChanges = [] } = useQuery<PendingCompanySLChange[]>({
    queryKey: ["pendingCompanySLChanges"],
    queryFn: () => localStorageService.getPendingCompanySLChanges(),
  });

  // Find pending SL change for this company
  const pendingSLChange = pendingSLChanges.find(
    (req) => req.companyId === companyId && req.status === "pending"
  );

  // Fetch tasks for this company
  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["tasks", "company", companyId],
    queryFn: async () => {
      if (!companyId) return [];
      return await api.getTasksByCompany(companyId);
    },
    enabled: !!companyId,
  });

  // Fetch last task generation timestamp
  const { data: lastGenerationData } = useQuery<{ timestamp: string | null }>({
    queryKey: ["/api", "tasks", "last-generation"],
    queryFn: async () => {
      const response = await fetch("/api/tasks/last-generation", {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch last generation timestamp");
      return response.json();
    },
  });

  // Task generation mutation
  const generateTasksMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/tasks/generate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate tasks");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Tasks Generated",
        description: `Created ${data.tasksCreated} new tasks, ${data.tasksSkipped} already existed`,
      });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "tasks", "last-generation"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: error.message,
      });
    },
  });

  // Sort tasks by due date (earliest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  // Fetch employees for this company
  const companyEmployees = companyId ? localStorageService.getEmployeesByCompany(companyId) : [];
  const currentEmployees = companyEmployees.filter(e => e.status !== 'leaver' && e.status !== 'deactivated');
  const pastEmployees = companyEmployees.filter(e => e.status === 'leaver' || e.status === 'deactivated');
  const residencyEmployees = companyEmployees.filter(e => e.isResidencyService);

  const form = useForm<InsertCompany & { isActive: boolean }>({
    resolver: zodResolver(
      companySchema.extend({ isActive: z.boolean() }).omit({ id: true }).refine(
        (data) => {
          if (data.hasRenewalFees) {
            return data.renewalFees && data.renewalFees.trim().length > 0;
          }
          return true;
        },
        {
          message: "Renewal Fees amount is required when 'Has Renewal Fees' is checked",
          path: ["renewalFees"],
        }
      )
    ),
    defaultValues: {
      name: "",
      number: "",
      address: "",
      incorporationDate: "",
      industryCode: "",
      director: "",
      psc: "",
      internalCode: "",
      utr: "",
      governmentGateway: "",
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      ownerEmails: [],
      ownerPhones: [],
      companiesHouseLink: "",
      googleDriveLink: "",
      vendorName: "",
      renewalDate: "",
      hasRenewalFees: false,
      renewalFees: "",
      authCode: "",
      pscLink: "",
      shareholders: "",
      shareholdersLink: "",
      directorLink: "",
      isActive: true,
    },
  });

  useEffect(() => {
    if (company) {
      form.reset({
        name: company.name,
        number: company.number,
        address: company.address || "",
        incorporationDate: company.incorporationDate || "",
        industryCode: company.industryCode || "",
        director: company.director || "",
        psc: company.psc || "",
        internalCode: company.internalCode || "",
        utr: company.utr || "",
        governmentGateway: company.governmentGateway || "",
        ownerName: company.ownerName || "",
        ownerEmail: company.ownerEmail || "",
        ownerPhone: company.ownerPhone || "",
        ownerEmails: company.ownerEmails || [],
        ownerPhones: company.ownerPhones || [],
        companiesHouseLink: company.companiesHouseLink || "",
        googleDriveLink: company.googleDriveLink || "",
        vendorName: company.vendorName || "",
        renewalDate: company.renewalDate || "",
        hasRenewalFees: company.hasRenewalFees || false,
        renewalFees: company.renewalFees || "",
        authCode: company.authCode || "",
        pscLink: company.pscLink || "",
        shareholders: company.shareholders || "",
        shareholdersLink: company.shareholdersLink || "",
        directorLink: company.directorLink || "",
        isActive: company.isActive,
      });
      // Set additional emails/phones from company data
      setAdditionalEmails(company.ownerEmails || []);
      setAdditionalPhones(company.ownerPhones || []);
    }
  }, [company, form]);

  // Load SL prep tasks and company task statuses
  useEffect(() => {
    if (company && company.sl && companyId) {
      const tasks = localStorageService.getSLPrepTasks();
      // Sort tasks by order field
      const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
      const statuses = localStorageService.getCompanySLPrepTaskStatusesByCompany(companyId);
      setSlPrepTasks(sortedTasks);
      setTaskStatuses(statuses);
    }
  }, [company, companyId]);
  
  // Initialize SL License data from company
  useEffect(() => {
    if (company) {
      setSlLicenseIssued(company.slLicenseIssued || false);
      setSlLicenseNumber(company.slLicenseNumber || "");
      setSlLicenseIssueDate(company.slLicenseIssueDate || "");
      setSlPayeReference(company.slPayeReference || "");
      setSlWorkAddress(company.slWorkAddress || "");
      setSlLevel1Users(company.slLevel1Users || []);
      setSlDefinedCOS(company.slDefinedCOS);
      setSlUndefinedCOS(company.slUndefinedCOS);
      setSlPhone((company as any).slPhone || "");
      setSlEmail((company as any).slEmail || "");
      setSlWebsite((company as any).slWebsite || "");
      setSlUnassignedDefinedCOS((company as any).slUnassignedDefinedCOS);
      setSlUnassignedUndefinedCOS((company as any).slUnassignedUndefinedCOS);
      setSlHasDebitCard((company as any).slHasDebitCard || false);
      setSlDebitCardActivated((company as any).slDebitCardActivated || false);
      setSlDebitCardExpiry((company as any).slDebitCardExpiry || "");
      setSlHasDirectDebitHmrc((company as any).slHasDirectDebitHmrc || false);
      setSlHasDirectDebitNest((company as any).slHasDirectDebitNest || false);
      // Set edit mode: true if no license issued yet OR if user came from SL Prep tab
      setIsLicenseEditMode(!company.slLicenseIssued || fromSlPrep);
    }
  }, [company, fromSlPrep]);

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: InsertCompany) => {
      if (!companyId) throw new Error("Company ID is required");
      return await api.updateCompany(companyId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      toast({
        title: "Company updated successfully",
        description: "The company information has been updated.",
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating company",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCompany) => {
    // Include additional emails and phones in the update
    updateCompanyMutation.mutate({
      ...data,
      ownerEmails: additionalEmails,
      ownerPhones: additionalPhones,
    });
  };
  
  const saveLicenseInfo = () => {
    // Close the uncheck confirmation dialog if open
    setShowUncheckConfirmation(false);
    // Trigger the mutation (mode will switch on success)
    updateSLLicenseMutation.mutate();
  };

  const updateSLLicenseMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !company) throw new Error("Company ID is required");
      
      // Validate: all required fields must be filled if license is issued
      if (slLicenseIssued) {
        if (!slLicenseNumber.trim() || !slLicenseIssueDate) {
          throw new Error("License Number and Issue Date are required when marking license as issued");
        }
        if (!slWorkAddress.trim()) {
          throw new Error("Work Address is required when issuing a license");
        }
        if (slLevel1Users.length === 0) {
          throw new Error("At least one Level 1 User is required when issuing a license");
        }
        // Validate all Level 1 users have name and email
        for (const user of slLevel1Users) {
          if (!user.name.trim() || !user.email.trim()) {
            throw new Error("All Level 1 Users must have a name and email");
          }
        }
      }
      
      const currentUser = authService.getCurrentUser();
      const changes: Array<{field: string, currentValue: any, newValue: any}> = [];
      
      // Determine reason for changes
      let changeReason = "";
      if (!slLicenseIssued && company.slLicenseIssued) {
        changeReason = uncheckReason.trim() || "License information clearance requested";
      } else if (slLicenseIssued && !company.slLicenseIssued) {
        changeReason = `License ${slLicenseNumber.trim()} issuance requested (Issue Date: ${slLicenseIssueDate})`;
      } else {
        changeReason = "Sponsorship License information update requested";
      }
      
      // Collect all changed fields
      if (slLicenseIssued !== company.slLicenseIssued) {
        changes.push({
          field: "slLicenseIssued",
          currentValue: company.slLicenseIssued || false,
          newValue: slLicenseIssued
        });
      }
      
      if (slLicenseNumber.trim() !== (company.slLicenseNumber || "")) {
        changes.push({
          field: "slLicenseNumber",
          currentValue: company.slLicenseNumber || "",
          newValue: slLicenseNumber.trim()
        });
      }
      
      if (slLicenseIssueDate !== (company.slLicenseIssueDate || "")) {
        changes.push({
          field: "slLicenseIssueDate",
          currentValue: company.slLicenseIssueDate || "",
          newValue: slLicenseIssueDate
        });
      }
      
      if (slPayeReference.trim() !== (company.slPayeReference || "")) {
        changes.push({
          field: "slPayeReference",
          currentValue: company.slPayeReference || "",
          newValue: slPayeReference.trim()
        });
      }
      
      if (slWorkAddress.trim() !== (company.slWorkAddress || "")) {
        changes.push({
          field: "slWorkAddress",
          currentValue: company.slWorkAddress || "",
          newValue: slWorkAddress.trim()
        });
      }
      
      if (JSON.stringify(slLevel1Users) !== JSON.stringify(company.slLevel1Users || [])) {
        changes.push({
          field: "slLevel1Users",
          currentValue: company.slLevel1Users || [],
          newValue: slLevel1Users
        });
      }
      
      if (slDefinedCOS !== company.slDefinedCOS) {
        changes.push({
          field: "slDefinedCOS",
          currentValue: company.slDefinedCOS || 0,
          newValue: slDefinedCOS || 0
        });
      }
      
      if (slUndefinedCOS !== company.slUndefinedCOS) {
        changes.push({
          field: "slUndefinedCOS",
          currentValue: company.slUndefinedCOS || 0,
          newValue: slUndefinedCOS || 0
        });
      }

      // SL contact & admin fields - direct update (no approval needed)
      const directUpdates: Record<string, any> = {};
      if (slPhone !== ((company as any).slPhone || "")) directUpdates.slPhone = slPhone;
      if (slEmail !== ((company as any).slEmail || "")) directUpdates.slEmail = slEmail;
      if (slWebsite !== ((company as any).slWebsite || "")) directUpdates.slWebsite = slWebsite;
      if (slUnassignedDefinedCOS !== (company as any).slUnassignedDefinedCOS) directUpdates.slUnassignedDefinedCOS = slUnassignedDefinedCOS;
      if (slUnassignedUndefinedCOS !== (company as any).slUnassignedUndefinedCOS) directUpdates.slUnassignedUndefinedCOS = slUnassignedUndefinedCOS;
      if (slHasDebitCard !== ((company as any).slHasDebitCard || false)) directUpdates.slHasDebitCard = slHasDebitCard;
      if (slDebitCardActivated !== ((company as any).slDebitCardActivated || false)) directUpdates.slDebitCardActivated = slDebitCardActivated;
      if (slDebitCardExpiry !== ((company as any).slDebitCardExpiry || "")) directUpdates.slDebitCardExpiry = slDebitCardExpiry;
      if (slHasDirectDebitHmrc !== ((company as any).slHasDirectDebitHmrc || false)) directUpdates.slHasDirectDebitHmrc = slHasDirectDebitHmrc;
      if (slHasDirectDebitNest !== ((company as any).slHasDirectDebitNest || false)) directUpdates.slHasDirectDebitNest = slHasDirectDebitNest;

      // Save direct updates immediately
      if (Object.keys(directUpdates).length > 0) {
        await api.updateCompany(companyId, directUpdates);
      }

      // Create pending approval requests for each change
      for (const change of changes) {
        const request: PendingCompanySLChange = {
          id: crypto.randomUUID(),
          companyId: companyId,
          companyName: company.name,
          field: change.field,
          currentValue: change.currentValue,
          newValue: change.newValue,
          reason: changeReason,
          requestedBy: currentUser?.name || "System",
          requestedAt: new Date().toISOString(),
          status: "pending",
        };
        
        localStorageService.addPendingCompanySLChange(request);
      }
      
      return changes;
    },
    onSuccess: async (changes) => {
      await queryClient.invalidateQueries({ queryKey: ["pendingCompanySLChanges"] });
      await queryClient.invalidateQueries({ queryKey: ["companyActivityLogs"] });
      // Switch to read-only mode AFTER successful save
      setIsLicenseEditMode(false);
      toast({
        title: "SL Change Request Submitted",
        description: `${changes.length} field change${changes.length !== 1 ? 's' : ''} submitted for Company Auditor approval`,
      });
      // Clear the uncheck reason
      setUncheckReason("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error submitting SL change request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const fetchFromCHMutation = useMutation({
    mutationFn: async () => {
      if (!company?.number) throw new Error("Company number is required");
      const result = await api.fetchCompanyDataByNumber(company.number);
      return result;
    },
    onSuccess: async (result) => {
      if (!company) return;
      
      if (result.success && result.data) {
        // Merge the comprehensive data with existing company data
        // Preserve user-edited fields, only update Companies House data
        const updates: Partial<Company> = {
          // Always update these fields from Companies House
          name: result.data.name || company.name,
          address: result.data.address || company.address,
          incorporationDate: result.data.incorporationDate || company.incorporationDate,
          industryCode: result.data.industryCode || company.industryCode,
          director: result.data.director || company.director,
          psc: result.data.psc || company.psc,
          companiesHouseLink: result.data.companiesHouseLink || company.companiesHouseLink,
          
          // Companies House status fields
          companyStatus: result.data.companyStatus || company.companyStatus,
          companyType: result.data.companyType || company.companyType,
          jurisdiction: result.data.jurisdiction || company.jurisdiction,
          hasCharges: result.data.hasCharges ?? company.hasCharges,
          hasInsolvency: result.data.hasInsolvency ?? company.hasInsolvency,
          confirmationStatementDue: result.data.confirmationStatementDue || company.confirmationStatementDue,
          accountsDue: result.data.accountsDue || company.accountsDue,
          lastAccountsDate: result.data.lastAccountsDate || company.lastAccountsDate,
          confirmationStatementLastMade: result.data.confirmationStatementLastMade || company.confirmationStatementLastMade,
          companiesHouseNextRenewalDate: result.data.companiesHouseNextRenewalDate || company.companiesHouseNextRenewalDate,
          
          // Sync metadata
          lastSyncDate: result.data.lastSyncDate || new Date().toISOString(),
          syncStatus: result.data.syncStatus || "success",
          
          // Comprehensive arrays - always override with fresh data
          directors: result.data.directors || company.directors,
          officers: result.data.officers || company.officers,
          pscs: result.data.pscs || company.pscs,
          filings: result.data.filings || company.filings,
          charges: result.data.charges || company.charges,
          insolvencyHistory: result.data.insolvencyHistory || company.insolvencyHistory,
          
          // Preserve user-edited fields
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
          shareholders: company.shareholders,
          pscLink: company.pscLink,
          directorLink: company.directorLink,
        };
        
        // Update the company in local storage
        await api.updateCompany(company.id, updates);
        
        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
        
        toast({
          title: "Data fetched successfully",
          description: "Company data has been updated from Companies House",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error fetching from Companies House",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // SL Prep Task handlers
  const handleTaskCheckboxChange = (task: SLPrepTask, currentStatus: CompanySLPrepTaskStatus | undefined) => {
    if (!companyId) return;

    if (currentStatus?.isCompleted) {
      // Unchecking - toggle directly without confirmation
      localStorageService.toggleCompanySLPrepTaskStatus(companyId, task.id);
      const updatedStatuses = localStorageService.getCompanySLPrepTaskStatusesByCompany(companyId);
      setTaskStatuses(updatedStatuses);
      toast({
        title: "Task unmarked",
        description: `"${task.name}" has been unmarked as complete.`,
      });
    } else {
      // Checking - show confirmation dialog requiring note
      setCompletingTask(task);
      // Load existing description if available
      const existingStatus = currentStatus || localStorageService.getCompanySLPrepTaskStatus(companyId, task.id);
      setTaskDescription(existingStatus?.description || "");
      setCompletionNote("");
    }
  };

  const handleConfirmTaskCompletion = () => {
    if (!completingTask || !companyId) return;
    
    if (completionNote.trim().length < 10) {
      return;
    }

    localStorageService.toggleCompanySLPrepTaskStatus(
      companyId, 
      completingTask.id, 
      taskDescription.trim() || undefined,
      completionNote.trim()
    );
    const updatedStatuses = localStorageService.getCompanySLPrepTaskStatusesByCompany(companyId);
    setTaskStatuses(updatedStatuses);
    
    toast({
      title: "Task completed",
      description: `"${completingTask.name}" has been marked as complete.`,
    });
    
    setCompletingTask(null);
    setTaskDescription("");
    setCompletionNote("");
  };

  // Handler for license checkbox clicks
  const handleLicenseCheckboxChange = (checked: boolean) => {
    if (!checked && company?.slLicenseIssued) {
      // User wants to uncheck - require confirmation
      setShowUncheckConfirmation(true);
    } else {
      // User wants to check - allow immediately
      setSlLicenseIssued(checked);
      if (!checked) {
        // If unchecking when there's no license, just clear the fields
        setSlLicenseNumber("");
        setSlLicenseIssueDate("");
        setSlPayeReference("");
        setSlWorkAddress("");
        setSlLevel1Users([]);
      }
    }
  };

  const confirmUncheckLicense = () => {
    if (uncheckReason.trim().length < 10) {
      toast({
        title: "Reason required",
        description: "Please provide a reason of at least 10 characters",
        variant: "destructive",
      });
      return;
    }
    // Set local state to unchecked/cleared
    setSlLicenseIssued(false);
    setSlLicenseNumber("");
    setSlLicenseIssueDate("");
    setSlPayeReference("");
    setSlWorkAddress("");
    setSlLevel1Users([]);
    // Immediately save the changes (close dialog and switch to read-only mode)
    saveLicenseInfo();
  };
  
  // Helper functions for managing Level 1 users
  const addLevel1User = () => {
    setSlLevel1Users([...slLevel1Users, {
      id: crypto.randomUUID(),
      name: "",
      email: "",
    }]);
  };
  
  const removeLevel1User = (id: string) => {
    setSlLevel1Users(slLevel1Users.filter(user => user.id !== id));
  };
  
  const updateLevel1User = (id: string, field: 'name' | 'email', value: string) => {
    setSlLevel1Users(slLevel1Users.map(user =>
      user.id === id ? { ...user, [field]: value } : user
    ));
  };

  // Export all company data to TXT file
  const handleExportCompanyTXT = () => {
    if (!company) return;

    try {
      // Build comprehensive text content
      let content = `COMPLETE COMPANY RECORD\n`;
      content += `==========================================\n\n`;
      
      // Header
      content += `Company Name: ${company.name}\n`;
      content += `Company Number: ${company.number}\n`;
      content += `Status: ${company.isActive ? 'Active' : 'Inactive'}\n`;
      content += `Data Completion: ${completion.percentage}% (${completion.filled} of ${completion.total} fields)\n\n`;
      
      // ===== BASIC COMPANY INFORMATION =====
      content += `═══════════════════════════════════════════\n`;
      content += `BASIC COMPANY INFORMATION\n`;
      content += `═══════════════════════════════════════════\n\n`;
      
      content += `Company Name: ${company.name || 'N/A'}\n`;
      content += `Company Number: ${company.number || 'N/A'}\n`;
      content += `Incorporation Date: ${company.incorporationDate ? format(new Date(company.incorporationDate), "PPP") : 'N/A'}\n`;
      content += `Industry Code: ${company.industryCode || 'N/A'}\n`;
      content += `Registered Address:\n${company.address || 'N/A'}\n\n`;
      
      if (company.companyStatus) content += `Company Status (CH): ${company.companyStatus}\n`;
      if (company.companyType) content += `Company Type: ${company.companyType}\n`;
      if (company.jurisdiction) content += `Jurisdiction: ${company.jurisdiction}\n`;
      if (company.hasCharges !== undefined) content += `Has Charges: ${company.hasCharges ? 'Yes' : 'No'}\n`;
      if (company.hasInsolvency !== undefined) content += `Has Insolvency: ${company.hasInsolvency ? 'Yes' : 'No'}\n`;
      content += `\n`;
      
      // ===== DIRECTORS & OFFICERS =====
      content += `═══════════════════════════════════════════\n`;
      content += `DIRECTORS & OFFICERS\n`;
      content += `═══════════════════════════════════════════\n\n`;
      
      content += `Director: ${company.director || 'N/A'}\n`;
      if (company.directorLink) content += `Director Link: ${company.directorLink}\n`;
      content += `\n`;
      
      if (company.directors && company.directors.length > 0) {
        content += `All Directors (from Companies House):\n`;
        company.directors.forEach((dir, i) => {
          content += `  ${i + 1}. ${typeof dir === 'string' ? dir : JSON.stringify(dir, null, 2).replace(/\n/g, '\n      ')}\n`;
        });
        content += `\n`;
      }
      
      if (company.officers && company.officers.length > 0) {
        content += `All Officers:\n`;
        company.officers.forEach((officer, i) => {
          content += `  ${i + 1}. ${typeof officer === 'string' ? officer : JSON.stringify(officer, null, 2).replace(/\n/g, '\n      ')}\n`;
        });
        content += `\n`;
      }
      
      // ===== PSC (PERSONS WITH SIGNIFICANT CONTROL) =====
      content += `═══════════════════════════════════════════\n`;
      content += `PERSONS WITH SIGNIFICANT CONTROL (PSC)\n`;
      content += `═══════════════════════════════════════════\n\n`;
      
      content += `PSC: ${company.psc || 'N/A'}\n`;
      if (company.pscLink) content += `PSC Link: ${company.pscLink}\n`;
      content += `\n`;
      
      if (company.pscs && company.pscs.length > 0) {
        content += `All PSCs (from Companies House):\n`;
        company.pscs.forEach((psc, i) => {
          content += `  ${i + 1}. ${typeof psc === 'string' ? psc : JSON.stringify(psc, null, 2).replace(/\n/g, '\n      ')}\n`;
        });
        content += `\n`;
      }
      
      // ===== SHAREHOLDERS =====
      content += `═══════════════════════════════════════════\n`;
      content += `SHAREHOLDERS\n`;
      content += `═══════════════════════════════════════════\n\n`;
      
      content += `Shareholders: ${company.shareholders || 'N/A'}\n`;
      if (company.shareholdersLink) content += `Shareholders Link: ${company.shareholdersLink}\n`;
      content += `\n`;
      
      // ===== TAX & GOVERNANCE =====
      content += `═══════════════════════════════════════════\n`;
      content += `TAX & GOVERNANCE\n`;
      content += `═══════════════════════════════════════════\n\n`;
      
      content += `Internal Code: ${company.internalCode || 'N/A'}\n`;
      content += `UTR (Unique Taxpayer Reference): ${company.utr || 'N/A'}\n`;
      content += `Government Gateway ID: ${company.governmentGateway || 'N/A'}\n`;
      content += `Auth Code: ${company.authCode || 'N/A'}\n\n`;
      
      // ===== RENEWAL & FEES =====
      content += `═══════════════════════════════════════════\n`;
      content += `RENEWAL & FEES\n`;
      content += `═══════════════════════════════════════════\n\n`;
      
      content += `Next Renewal Date: ${formatNextRenewalDate(company.incorporationDate)}\n`;
      content += `Has Renewal Fees: ${company.hasRenewalFees ? 'Yes' : 'No'}\n`;
      if (company.hasRenewalFees && company.renewalFees) {
        content += `Renewal Fees: ${company.renewalFees}\n`;
      }
      content += `Vendor Name: ${company.vendorName || 'N/A'}\n\n`;
      
      // ===== OWNER INFORMATION =====
      content += `═══════════════════════════════════════════\n`;
      content += `OWNER INFORMATION\n`;
      content += `═══════════════════════════════════════════\n\n`;
      
      content += `Owner Name: ${company.ownerName || 'N/A'}\n`;
      content += `Primary Email: ${company.ownerEmail || 'N/A'}\n`;
      content += `Primary Phone: ${company.ownerPhone || 'N/A'}\n\n`;
      
      if (company.ownerEmails && company.ownerEmails.length > 0) {
        content += `All Email Addresses:\n`;
        company.ownerEmails.forEach((email, i) => {
          content += `  ${i + 1}. ${email}\n`;
        });
        content += `\n`;
      }
      
      if (company.ownerPhones && company.ownerPhones.length > 0) {
        content += `All Phone Numbers:\n`;
        company.ownerPhones.forEach((phone, i) => {
          content += `  ${i + 1}. ${phone}\n`;
        });
        content += `\n`;
      }
      
      // ===== LINKS & REFERENCES =====
      content += `═══════════════════════════════════════════\n`;
      content += `LINKS & REFERENCES\n`;
      content += `═══════════════════════════════════════════\n\n`;
      
      content += `Companies House Link: ${company.companiesHouseLink || 'N/A'}\n`;
      content += `Google Drive Link: ${company.googleDriveLink || 'N/A'}\n\n`;
      
      // ===== COMPANIES HOUSE COMPLIANCE =====
      if (company.confirmationStatementDue || company.accountsDue || company.lastAccountsDate || company.confirmationStatementLastMade) {
        content += `═══════════════════════════════════════════\n`;
        content += `COMPANIES HOUSE COMPLIANCE\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        if (company.confirmationStatementDue) content += `Confirmation Statement Due: ${format(new Date(company.confirmationStatementDue), "PPP")}\n`;
        if (company.confirmationStatementLastMade) content += `Confirmation Statement Last Made: ${format(new Date(company.confirmationStatementLastMade), "PPP")}\n`;
        if (company.accountsDue) content += `Accounts Due: ${format(new Date(company.accountsDue), "PPP")}\n`;
        if (company.lastAccountsDate) content += `Last Accounts Date: ${format(new Date(company.lastAccountsDate), "PPP")}\n`;
        content += `\n`;
      }
      
      // ===== SPONSORSHIP LICENSE INFORMATION =====
      if (company.sl) {
        content += `═══════════════════════════════════════════\n`;
        content += `SPONSORSHIP LICENSE (SL) INFORMATION\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        content += `Sponsorship License Status: ${company.slLicenseIssued ? 'ISSUED' : 'In Preparation'}\n\n`;
        
        if (company.slLicenseIssued) {
          content += `License Number: ${company.slLicenseNumber || 'N/A'}\n`;
          content += `License Issue Date: ${company.slLicenseIssueDate ? format(new Date(company.slLicenseIssueDate), "PPP") : 'N/A'}\n`;
          content += `PAYE Reference: ${company.slPayeReference || 'N/A'}\n`;
          content += `Work Address:\n${company.slWorkAddress || 'N/A'}\n\n`;
          
          content += `Certificate of Sponsorship (COS) Tracking:\n`;
          content += `  Defined COS Available: ${company.slDefinedCOS !== undefined ? company.slDefinedCOS : 'N/A'}\n`;
          content += `  Undefined COS Available: ${company.slUndefinedCOS !== undefined ? company.slUndefinedCOS : 'N/A'}\n\n`;
          
          if (company.slLevel1Users && company.slLevel1Users.length > 0) {
            content += `Level 1 Users:\n`;
            company.slLevel1Users.forEach((user, i) => {
              content += `  ${i + 1}. ${user.name} - ${user.email}\n`;
            });
            content += `\n`;
          }
        }
      }
      
      // ===== COMPANY TASKS =====
      if (tasks && tasks.length > 0) {
        content += `═══════════════════════════════════════════\n`;
        content += `COMPANY TASKS (${tasks.length} total)\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        const openTasks = tasks.filter(t => t.status === 'open');
        const doneTasks = tasks.filter(t => t.status === 'done');
        const skippedTasks = tasks.filter(t => t.status === 'skipped');
        const cancelledTasks = tasks.filter(t => t.status === 'cancelled');
        
        content += `Summary:\n`;
        content += `  Open: ${openTasks.length}\n`;
        content += `  Done: ${doneTasks.length}\n`;
        content += `  Skipped: ${skippedTasks.length}\n`;
        content += `  Cancelled: ${cancelledTasks.length}\n\n`;
        
        if (openTasks.length > 0) {
          content += `OPEN TASKS:\n`;
          content += `──────────────────────────────────────────\n`;
          openTasks.forEach((task, i) => {
            content += `${i + 1}. ${task.title}\n`;
            content += `   Due Date: ${format(new Date(task.dueAt), "PPP")}\n`;
            content += `   Days Until Due: ${getDaysUntilDue(task.dueAt)}\n`;
            content += `   Renewal Date: ${task.renewalDate ? format(new Date(task.renewalDate), "PPP") : 'N/A'}\n`;
            if (task.description) content += `   Description: ${task.description}\n`;
            content += `\n`;
          });
        }
        
        if (doneTasks.length > 0) {
          content += `DONE TASKS:\n`;
          content += `──────────────────────────────────────────\n`;
          doneTasks.forEach((task, i) => {
            content += `${i + 1}. ${task.title}\n`;
            content += `   Due Date: ${format(new Date(task.dueAt), "PPP")}\n`;
            content += `   Renewal Date: ${task.renewalDate ? format(new Date(task.renewalDate), "PPP") : 'N/A'}\n`;
            if (task.description) content += `   Description: ${task.description}\n`;
            if (task.reviewed) content += `   Reviewed: Yes\n`;
            if (task.reviewerNote) content += `   Reviewer Note: ${task.reviewerNote}\n`;
            content += `\n`;
          });
        }
        
        if (skippedTasks.length > 0) {
          content += `SKIPPED TASKS:\n`;
          content += `──────────────────────────────────────────\n`;
          skippedTasks.forEach((task, i) => {
            content += `${i + 1}. ${task.title}\n`;
            content += `   Due Date: ${format(new Date(task.dueAt), "PPP")}\n`;
            if (task.description) content += `   Description: ${task.description}\n`;
            content += `\n`;
          });
        }
        
        if (cancelledTasks.length > 0) {
          content += `CANCELLED TASKS:\n`;
          content += `──────────────────────────────────────────\n`;
          cancelledTasks.forEach((task, i) => {
            content += `${i + 1}. ${task.title}\n`;
            content += `   Due Date: ${format(new Date(task.dueAt), "PPP")}\n`;
            if (task.description) content += `   Description: ${task.description}\n`;
            content += `\n`;
          });
        }
      }
      
      // ===== SL PREP TASKS =====
      if (company.sl && slPrepTasks.length > 0) {
        content += `═══════════════════════════════════════════\n`;
        content += `SL PREPARATION TASKS (${slPrepTasks.length} total)\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        slPrepTasks.forEach((task, i) => {
          const status = taskStatuses.find(s => s.companyId === companyId && s.taskId === task.id);
          content += `${i + 1}. ${task.name}\n`;
          content += `   Order: ${task.order}\n`;
          content += `   Status: ${status ? (status.isCompleted ? 'Completed' : 'Pending') : 'Pending'}\n`;
          if (status?.description) content += `   Details: ${status.description}\n`;
          if (status?.isCompleted && status.completedAt) {
            content += `   Completed: ${format(new Date(status.completedAt), "PPP")}\n`;
          }
          if (status?.completionNote) content += `   Note: ${status.completionNote}\n`;
          content += `\n`;
        });
      }
      
      // ===== FILINGS =====
      if (company.filings && company.filings.length > 0) {
        content += `═══════════════════════════════════════════\n`;
        content += `COMPANIES HOUSE FILINGS (${company.filings.length} most recent)\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        company.filings.slice(0, 20).forEach((filing, i) => {
          content += `${i + 1}. ${typeof filing === 'string' ? filing : JSON.stringify(filing, null, 2).replace(/\n/g, '\n   ')}\n`;
        });
        content += `\n`;
      }
      
      // ===== CHARGES =====
      if (company.charges && company.charges.length > 0) {
        content += `═══════════════════════════════════════════\n`;
        content += `CHARGES (${company.charges.length} total)\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        company.charges.forEach((charge, i) => {
          content += `${i + 1}. ${typeof charge === 'string' ? charge : JSON.stringify(charge, null, 2).replace(/\n/g, '\n   ')}\n`;
        });
        content += `\n`;
      }
      
      // ===== INSOLVENCY HISTORY =====
      if (company.insolvencyHistory && company.insolvencyHistory.length > 0) {
        content += `═══════════════════════════════════════════\n`;
        content += `INSOLVENCY HISTORY (${company.insolvencyHistory.length} records)\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        company.insolvencyHistory.forEach((record, i) => {
          content += `${i + 1}. ${typeof record === 'string' ? record : JSON.stringify(record, null, 2).replace(/\n/g, '\n   ')}\n`;
        });
        content += `\n`;
      }
      
      // ===== ACTIVITY LOG =====
      const companyActivityLogs = localStorageService.getCompanyActivityLogs().filter(log => log.companyId === companyId);
      if (companyActivityLogs.length > 0) {
        content += `═══════════════════════════════════════════\n`;
        content += `ACTIVITY LOG (${companyActivityLogs.length} entries)\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        // Sort by timestamp descending (most recent first)
        const sortedLogs = [...companyActivityLogs].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        
        sortedLogs.slice(0, 50).forEach((log, i) => {
          content += `${i + 1}. [${format(new Date(log.timestamp), "PPP")}] ${log.action}\n`;
          if (log.reason) content += `   Details: ${log.reason}\n`;
          content += `   Performed by: ${log.performedBy}\n`;
          content += `\n`;
        });
        
        if (companyActivityLogs.length > 50) {
          content += `... and ${companyActivityLogs.length - 50} more entries\n\n`;
        }
      }
      
      // ===== EMPLOYEES =====
      if (companyEmployees.length > 0) {
        content += `═══════════════════════════════════════════\n`;
        content += `EMPLOYEES (${companyEmployees.length} total)\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        if (currentEmployees.length > 0) {
          content += `CURRENT EMPLOYEES (${currentEmployees.length}):\n`;
          content += `──────────────────────────────────────────\n`;
          currentEmployees.forEach((emp, i) => {
            content += `${i + 1}. ${emp.firstName} ${emp.middleNames ? emp.middleNames + ' ' : ''}${emp.lastName}\n`;
            content += `   Job Title: ${emp.jobTitle}\n`;
            content += `   Department: ${emp.department || 'N/A'}\n`;
            content += `   Status: ${emp.status}\n`;
            content += `   Contract Type: ${emp.contractType}\n`;
            content += `   Start Date: ${emp.startDate ? format(new Date(emp.startDate), "PPP") : 'N/A'}\n`;
            if (emp.endDate) content += `   End Date: ${format(new Date(emp.endDate), "PPP")}\n`;
            content += `   Email: ${emp.personalEmail}\n`;
            content += `   Mobile: ${emp.personalMobile}\n`;
            if (emp.nationality) content += `   Nationality: ${emp.nationality}\n`;
            content += `   Immigration Status: ${emp.immigrationStatus}\n`;
            if (emp.isSponsored) content += `   Sponsored: Yes\n`;
            if (emp.visaType) content += `   Visa Type: ${emp.visaType}\n`;
            if (emp.visaExpiryDate) content += `   Visa Expiry: ${format(new Date(emp.visaExpiryDate), "PPP")}\n`;
            if (emp.passportExpiry) content += `   Passport Expiry: ${format(new Date(emp.passportExpiry), "PPP")}\n`;
            if (emp.rtwExpiryDate) {
              content += `   RTW Expiry: ${emp.rtwExpiryIndefinite ? 'Indefinite' : format(new Date(emp.rtwExpiryDate), "PPP")}\n`;
            }
            content += `   Salary: £${emp.salary}\n`;
            content += `   Weekly Hours: ${emp.weeklyHours}\n`;
            content += `\n`;
          });
        }
        
        if (pastEmployees.length > 0) {
          content += `PAST EMPLOYEES (${pastEmployees.length}):\n`;
          content += `──────────────────────────────────────────\n`;
          pastEmployees.forEach((emp, i) => {
            content += `${i + 1}. ${emp.firstName} ${emp.middleNames ? emp.middleNames + ' ' : ''}${emp.lastName}\n`;
            content += `   Job Title: ${emp.jobTitle}\n`;
            content += `   Status: ${emp.status}\n`;
            content += `   Contract Type: ${emp.contractType}\n`;
            content += `   Start Date: ${emp.startDate ? format(new Date(emp.startDate), "PPP") : 'N/A'}\n`;
            if (emp.leaverDate) content += `   Leaver Date: ${format(new Date(emp.leaverDate), "PPP")}\n`;
            if (emp.endDate) content += `   End Date: ${format(new Date(emp.endDate), "PPP")}\n`;
            content += `   Email: ${emp.personalEmail}\n`;
            content += `\n`;
          });
        }
      }
      
      // ===== RESIDENCY SERVICE =====
      if (residencyEmployees.length > 0) {
        content += `═══════════════════════════════════════════\n`;
        content += `RESIDENCY SERVICE EMPLOYEES (${residencyEmployees.length})\n`;
        content += `═══════════════════════════════════════════\n\n`;
        
        residencyEmployees.forEach((emp, i) => {
          content += `${i + 1}. ${emp.firstName} ${emp.middleNames ? emp.middleNames + ' ' : ''}${emp.lastName}\n`;
          content += `   Job Title: ${emp.jobTitle}\n`;
          content += `   Status: ${emp.status}\n`;
          content += `   Residency Status: ${emp.residencyStatus || 'pending'}\n`;
          content += `   Visa Type: ${emp.visaType || 'N/A'}\n`;
          if (emp.visaExpiryDate) content += `   Visa Expiry: ${format(new Date(emp.visaExpiryDate), "PPP")}\n`;
          content += `   Nationality: ${emp.nationality || 'N/A'}\n`;
          content += `   Email: ${emp.personalEmail}\n`;
          content += `   Mobile: ${emp.personalMobile}\n`;
          
          // Include residency log if available
          if (emp.residencyLog && emp.residencyLog.length > 0) {
            content += `   Residency Log:\n`;
            emp.residencyLog.forEach((log, logIndex) => {
              content += `     ${logIndex + 1}. [${format(new Date(log.timestamp), "PPP")}] ${log.action}\n`;
              content += `        ${log.explanation}\n`;
              if (log.userName) content += `        By: ${log.userName}\n`;
            });
          }
          content += `\n`;
        });
      }
      
      // ===== FOOTER =====
      content += `═══════════════════════════════════════════\n`;
      content += `END OF COMPANY RECORD\n`;
      content += `═══════════════════════════════════════════\n`;
      content += `Generated: ${format(new Date(), "PPP 'at' p")}\n`;
      content += `System: CorpManageSys\n`;
      
      // Create and download file
      const timestamp = format(new Date(), "yyyy-MM-dd-HHmm");
      const filename = `${company.name.replace(/[^a-z0-9]/gi, '-')}-Complete-Record-${timestamp}.txt`;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Company record exported",
        description: `Complete company data downloaded as ${filename}`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export company data",
        variant: "destructive",
      });
    }
  };

  if (companiesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-4 text-muted-foreground">Loading company details...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Company Not Found</h2>
          <p className="text-muted-foreground mb-6">The company you're looking for doesn't exist.</p>
          <Button onClick={() => setLocation("/")} data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  const completion = calculateDataCompletion(company);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation("/")}
                data-testid="button-back-to-companies"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-primary" />
                  <h1 className="text-2xl font-bold" data-testid="text-company-name">{company.name}</h1>
                  {company.isActive ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1 opacity-60">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-company-number">
                  Company Number: {company.number}
                </p>
                <div className="mt-3 flex items-center gap-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Data Completion:</span>
                      <span className="text-xs font-medium" data-testid="text-completion-percentage">
                        {completion.percentage}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({completion.filled} of {completion.total} fields)
                      </span>
                    </div>
                    <Progress value={completion.percentage} className="h-2 w-48" data-testid="progress-completion" />
                  </div>
                  <div className="flex items-center gap-3 px-4 py-2 rounded-md bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Next Renewal Date</p>
                        <p className="text-sm font-semibold text-primary" data-testid="text-next-renewal-date">
                          {formatNextRenewalDate(company.incorporationDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleExportCompanyTXT}
                data-testid="button-export-company-txt"
              >
                <FileText className="h-4 w-4" />
                Download TXT
              </Button>
              <Button 
                variant="outline" 
                className="gap-2" 
                onClick={() => fetchFromCHMutation.mutate()}
                disabled={fetchFromCHMutation.isPending}
                data-testid="button-fetch-ch"
              >
                {fetchFromCHMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Fetch from Companies House
                  </>
                )}
              </Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" className="gap-2" data-testid="button-edit-company">
                    <Edit className="h-4 w-4" />
                    Edit Company
                  </Button>
                </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-2xl">
                    <Edit className="h-6 w-6 text-primary" />
                    Edit Company
                  </DialogTitle>
                  <DialogDescription>
                    Update company details including registration, governance, and contact information
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-medium">
                        <Building2 className="h-5 w-5" />
                        Company Details
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter company name" 
                                  {...field} 
                                  className={!field.value || field.value.trim() === '' ? 'border-red-500 border-2' : ''}
                                  data-testid="input-edit-name" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Number *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g., 12345678" 
                                  {...field} 
                                  className={!field.value || field.value.trim() === '' ? 'border-red-500 border-2' : ''}
                                  data-testid="input-edit-number" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="incorporationDate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                Incorporation Date *
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="date" 
                                  {...field} 
                                  className={!field.value || field.value.trim() === '' ? 'border-red-500 border-2' : ''}
                                  data-testid="input-edit-incorporation-date" 
                                />
                              </FormControl>
                              <FormDescription className="text-xs">
                                Used to calculate task due dates
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="industryCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Industry Code</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., SIC Code" {...field} data-testid="input-edit-industry-code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Registered Address</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter full registered address" className="min-h-[80px]" {...field} data-testid="input-edit-address" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-medium">
                        <User className="h-5 w-5" />
                        Directors & PSC
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="director"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Director Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter director name" {...field} data-testid="input-edit-director" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="psc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Person with Significant Control (PSC)</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter PSC name" {...field} data-testid="input-edit-psc" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="shareholders"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Shareholders</FormLabel>
                              <FormControl>
                                <Textarea placeholder="Enter shareholders" {...field} data-testid="input-edit-shareholders" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-medium">
                        <FileText className="h-5 w-5" />
                        Government & Internal Codes
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="internalCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Internal Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Internal reference code" {...field} data-testid="input-edit-internal-code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="utr"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Unique Taxpayer Reference (UTR)</FormLabel>
                              <FormControl>
                                <Input placeholder="10-digit UTR" {...field} data-testid="input-edit-utr" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="governmentGateway"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Government Gateway ID</FormLabel>
                              <FormControl>
                                <Input placeholder="Gateway user ID" {...field} data-testid="input-edit-government-gateway" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="authCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Auth Code</FormLabel>
                              <FormControl>
                                <Input placeholder="Authorization code" {...field} data-testid="input-edit-auth-code" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-medium">
                        <Phone className="h-5 w-5" />
                        Contact Information
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="ownerName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Owner Name *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter owner name" 
                                  {...field} 
                                  className={!field.value || field.value.trim() === '' ? 'border-red-500 border-2' : ''}
                                  data-testid="input-edit-owner-name" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vendorName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Vendor Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter vendor name" {...field} data-testid="input-edit-vendor-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ownerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Mail className="h-4 w-4" />
                                Owner Email *
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder="owner@example.com" 
                                  {...field} 
                                  className={!field.value || field.value.trim() === '' ? 'border-red-500 border-2' : ''}
                                  data-testid="input-edit-owner-email" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="ownerPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="flex items-center gap-2">
                                <Phone className="h-4 w-4" />
                                Owner Phone *
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="tel" 
                                  placeholder="+44 20 1234 5678" 
                                  {...field} 
                                  className={!field.value || field.value.trim() === '' ? 'border-red-500 border-2' : ''}
                                  data-testid="input-edit-owner-phone" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Additional Emails */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Additional Emails
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAdditionalEmails([...additionalEmails, ""])}
                            data-testid="button-add-email"
                            className="gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Email
                          </Button>
                        </div>
                        {additionalEmails.length > 0 && (
                          <div className="space-y-2">
                            {additionalEmails.map((email, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  type="email"
                                  placeholder="additional@example.com"
                                  value={email}
                                  onChange={(e) => {
                                    const newEmails = [...additionalEmails];
                                    newEmails[index] = e.target.value;
                                    setAdditionalEmails(newEmails);
                                  }}
                                  data-testid={`input-additional-email-${index}`}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setAdditionalEmails(additionalEmails.filter((_, i) => i !== index));
                                  }}
                                  data-testid={`button-remove-email-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Additional Phones */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Additional Phones
                          </Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setAdditionalPhones([...additionalPhones, ""])}
                            data-testid="button-add-phone"
                            className="gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Phone
                          </Button>
                        </div>
                        {additionalPhones.length > 0 && (
                          <div className="space-y-2">
                            {additionalPhones.map((phone, index) => (
                              <div key={index} className="flex gap-2">
                                <Input
                                  type="tel"
                                  placeholder="+44 20 1234 5678"
                                  value={phone}
                                  onChange={(e) => {
                                    const newPhones = [...additionalPhones];
                                    newPhones[index] = e.target.value;
                                    setAdditionalPhones(newPhones);
                                  }}
                                  data-testid={`input-additional-phone-${index}`}
                                  className="flex-1"
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => {
                                    setAdditionalPhones(additionalPhones.filter((_, i) => i !== index));
                                  }}
                                  data-testid={`button-remove-phone-${index}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="hasRenewalFees"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <input
                                  type="checkbox"
                                  checked={field.value}
                                  onChange={(e) => {
                                    field.onChange(e.target.checked);
                                    if (!e.target.checked) {
                                      form.setValue("renewalFees", "");
                                    }
                                  }}
                                  data-testid="checkbox-has-renewal-fees"
                                  className="h-4 w-4 mt-1"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  Has Renewal Fees
                                </FormLabel>
                                <p className="text-sm text-muted-foreground">
                                  Check if this company has renewal fees
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                        {form.watch("hasRenewalFees") && (
                          <FormField
                            control={form.control}
                            name="renewalFees"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Renewal Fees Amount (GBP £) *</FormLabel>
                                <FormControl>
                                  <Input 
                                    type="text" 
                                    placeholder="e.g., 150.00" 
                                    {...field} 
                                    className={form.watch("hasRenewalFees") && (!field.value || field.value.trim() === '') ? 'border-red-500 border-2' : ''}
                                    data-testid="input-edit-renewal-fees" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="flex items-center gap-2 text-lg font-medium">
                        <Globe className="h-5 w-5" />
                        Links & Resources
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="companiesHouseLink"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Companies House Link</FormLabel>
                              <FormControl>
                                <Input placeholder="https://find-and-update.company-information.service.gov.uk/company/..." {...field} data-testid="input-edit-companies-house-link" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="googleDriveLink"
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <FormLabel>Google Drive Link *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="https://drive.google.com/..." 
                                  {...field} 
                                  className={!field.value || field.value.trim() === '' ? 'border-red-500 border-2' : ''}
                                  data-testid="input-edit-google-drive-link" 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                        disabled={updateCompanyMutation.isPending}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={updateCompanyMutation.isPending}
                        data-testid="button-save-company"
                      >
                        {updateCompanyMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Scrollable Page */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {/* SL License Issuance Section (only for companies in SL Prep) */}
          {company.sl && (
            <Card data-testid="card-sl-license" className="border-green-300 bg-green-50/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Sponsorship License Issuance
                  </CardTitle>
                  {!fromSlPrep && (
                    <Badge variant="secondary" className="text-xs">
                      Read-only (access from SL Prep tab to edit)
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Pending SL Changes Indicator */}
                  {pendingSLChange && (
                    <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20" data-testid="alert-pending-sl-changes">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                        <span className="font-semibold">Sponsorship License changes submitted for Company Auditor approval</span>
                        <div className="mt-1 text-sm">
                          Pending changes to SL information
                        </div>
                        <div className="text-sm text-yellow-700 dark:text-yellow-300">
                          Submitted on {format(new Date(pendingSLChange.requestedAt), "PPP 'at' p")} by {pendingSLChange.requestedBy}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Read-only mode - show license info */}
                  {!isLicenseEditMode && (company.slLicenseIssued || slLicenseIssued) && slLicenseNumber && slLicenseIssueDate && (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          License Issued
                        </Badge>
                      </div>
                      <div className="space-y-4 pl-7">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">License Number</Label>
                            <p className="text-base font-medium" data-testid="text-sl-license-number">{slLicenseNumber || company.slLicenseNumber}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Issue Date</Label>
                            <p className="text-base font-medium" data-testid="text-sl-license-issue-date">
                              {(slLicenseIssueDate || company.slLicenseIssueDate) ? format(new Date((slLicenseIssueDate || company.slLicenseIssueDate)!), "dd MMM yyyy") : "N/A"}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">PAYE Reference</Label>
                            <p className="text-base font-medium" data-testid="text-sl-paye-reference">{slPayeReference || company.slPayeReference || "N/A"}</p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Defined COS</Label>
                            <p className="text-base font-medium" data-testid="text-sl-defined-cos-readonly">
                              {slDefinedCOS !== undefined ? slDefinedCOS : (company.slDefinedCOS !== undefined ? company.slDefinedCOS : "Not set")}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-sm text-muted-foreground">Undefined COS</Label>
                            <p className="text-base font-medium" data-testid="text-sl-undefined-cos-readonly">
                              {slUndefinedCOS !== undefined ? slUndefinedCOS : (company.slUndefinedCOS !== undefined ? company.slUndefinedCOS : "Not set")}
                            </p>
                          </div>
                          <div className="space-y-1 md:col-span-2">
                            <Label className="text-sm text-muted-foreground">Work Address</Label>
                            <p className="text-base font-medium whitespace-pre-line" data-testid="text-sl-work-address">{slWorkAddress || company.slWorkAddress || "N/A"}</p>
                          </div>
                        </div>
                        
                        {(slLevel1Users.length > 0 || (company.slLevel1Users && company.slLevel1Users.length > 0)) && (
                          <div className="space-y-2">
                            <Label className="text-sm text-muted-foreground">Level 1 Users</Label>
                            <div className="space-y-2">
                              {(slLevel1Users.length > 0 ? slLevel1Users : company.slLevel1Users || []).map((user, index) => (
                                <div key={user.id} className="border rounded-md p-3 bg-muted/30" data-testid={`readonly-level1-user-${index}`}>
                                  <div className="flex items-start gap-3">
                                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div className="flex-1 space-y-1">
                                      <p className="text-sm font-medium">{user.name}</p>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {user.email}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {fromSlPrep && (
                        <div className="pl-7">
                          <Button
                            variant="outline"
                            onClick={() => setIsLicenseEditMode(true)}
                            data-testid="button-edit-sl-license"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit License Information
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Edit mode - show checkbox and form */}
                  {isLicenseEditMode && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="sl-license-issued"
                          checked={slLicenseIssued}
                          onChange={(e) => handleLicenseCheckboxChange(e.target.checked)}
                          className="h-4 w-4 cursor-pointer"
                          data-testid="checkbox-sl-license-issued"
                          disabled={!fromSlPrep}
                        />
                        <Label htmlFor="sl-license-issued" className="cursor-pointer font-medium text-base">
                          Sponsor License Issued
                        </Label>
                      </div>
                      
                      {slLicenseIssued && (
                        <div className="space-y-6 pl-7">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="sl-license-number">
                                Sponsorship License Number <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="sl-license-number"
                                value={slLicenseNumber}
                                onChange={(e) => setSlLicenseNumber(e.target.value)}
                                placeholder="Enter license number"
                                data-testid="input-sl-license-number"
                                disabled={!fromSlPrep}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="sl-license-issue-date">
                                Issue Date <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="sl-license-issue-date"
                                type="date"
                                value={slLicenseIssueDate}
                                onChange={(e) => setSlLicenseIssueDate(e.target.value)}
                                data-testid="input-sl-license-issue-date"
                                disabled={!fromSlPrep}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="sl-paye-reference">
                                PAYE Reference
                              </Label>
                              <Input
                                id="sl-paye-reference"
                                value={slPayeReference}
                                onChange={(e) => setSlPayeReference(e.target.value)}
                                placeholder="Enter PAYE reference"
                                data-testid="input-sl-paye-reference"
                                disabled={!fromSlPrep}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="sl-defined-cos">
                                Defined COS
                              </Label>
                              <Input
                                id="sl-defined-cos"
                                type="number"
                                min="0"
                                value={slDefinedCOS ?? ""}
                                onChange={(e) => setSlDefinedCOS(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Enter count"
                                data-testid="input-sl-defined-cos"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="sl-undefined-cos">
                                Undefined COS
                              </Label>
                              <Input
                                id="sl-undefined-cos"
                                type="number"
                                min="0"
                                value={slUndefinedCOS ?? ""}
                                onChange={(e) => setSlUndefinedCOS(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Enter count"
                                data-testid="input-sl-undefined-cos"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="sl-unassigned-defined-cos">
                                Unassigned Defined COS
                              </Label>
                              <Input
                                id="sl-unassigned-defined-cos"
                                type="number"
                                min="0"
                                value={slUnassignedDefinedCOS ?? ""}
                                onChange={(e) => setSlUnassignedDefinedCOS(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Enter count"
                                data-testid="input-sl-unassigned-defined-cos"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="sl-unassigned-undefined-cos">
                                Unassigned Undefined COS
                              </Label>
                              <Input
                                id="sl-unassigned-undefined-cos"
                                type="number"
                                min="0"
                                value={slUnassignedUndefinedCOS ?? ""}
                                onChange={(e) => setSlUnassignedUndefinedCOS(e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Enter count"
                                data-testid="input-sl-unassigned-undefined-cos"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="sl-phone">SL Phone Number</Label>
                              <Input
                                id="sl-phone"
                                value={slPhone}
                                onChange={(e) => setSlPhone(e.target.value)}
                                placeholder="Enter phone number"
                                data-testid="input-sl-phone"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="sl-email">SL Email</Label>
                              <Input
                                id="sl-email"
                                type="email"
                                value={slEmail}
                                onChange={(e) => setSlEmail(e.target.value)}
                                placeholder="Enter email address"
                                data-testid="input-sl-email"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="sl-website">SL Website</Label>
                              <Input
                                id="sl-website"
                                value={slWebsite}
                                onChange={(e) => setSlWebsite(e.target.value)}
                                placeholder="Enter website URL"
                                data-testid="input-sl-website"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="sl-debit-card-expiry">Debit Card Expiry</Label>
                              <Input
                                id="sl-debit-card-expiry"
                                type="date"
                                value={slDebitCardExpiry}
                                onChange={(e) => setSlDebitCardExpiry(e.target.value)}
                                data-testid="input-sl-debit-card-expiry"
                              />
                            </div>

                            <div className="flex items-center gap-4 md:col-span-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={slHasDebitCard} onChange={(e) => setSlHasDebitCard(e.target.checked)} />
                                Has Debit Card
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={slDebitCardActivated} onChange={(e) => setSlDebitCardActivated(e.target.checked)} />
                                Debit Card Activated
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={slHasDirectDebitHmrc} onChange={(e) => setSlHasDirectDebitHmrc(e.target.checked)} />
                                Direct Debit HMRC
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={slHasDirectDebitNest} onChange={(e) => setSlHasDirectDebitNest(e.target.checked)} />
                                Direct Debit Nest
                              </label>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                              <Label htmlFor="sl-work-address">
                                Work Address <span className="text-destructive">*</span>
                              </Label>
                              <Textarea
                                id="sl-work-address"
                                value={slWorkAddress}
                                onChange={(e) => setSlWorkAddress(e.target.value)}
                                placeholder="Enter work address"
                                data-testid="input-sl-work-address"
                                disabled={!fromSlPrep}
                                rows={3}
                              />
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <Label>
                                Level 1 Users <span className="text-destructive">*</span>
                                <span className="text-xs text-muted-foreground ml-2">(At least 1 required)</span>
                              </Label>
                              {fromSlPrep && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={addLevel1User}
                                  data-testid="button-add-level1-user"
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add User
                                </Button>
                              )}
                            </div>
                            
                            {slLevel1Users.length === 0 ? (
                              <div className="text-sm text-muted-foreground border rounded-md p-4">
                                No Level 1 users added yet. Click "Add User" to add at least one.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {slLevel1Users.map((user, index) => (
                                  <div key={user.id} className="border rounded-md p-4 space-y-3" data-testid={`level1-user-${index}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <Label className="text-sm font-medium">User {index + 1}</Label>
                                      {fromSlPrep && slLevel1Users.length > 1 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => removeLevel1User(user.id)}
                                          data-testid={`button-remove-level1-user-${index}`}
                                        >
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div className="space-y-1">
                                        <Label htmlFor={`level1-user-name-${index}`} className="text-xs">
                                          Name <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                          id={`level1-user-name-${index}`}
                                          value={user.name}
                                          onChange={(e) => updateLevel1User(user.id, 'name', e.target.value)}
                                          placeholder="Enter name"
                                          data-testid={`input-level1-user-name-${index}`}
                                          disabled={!fromSlPrep}
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label htmlFor={`level1-user-email-${index}`} className="text-xs">
                                          Email <span className="text-destructive">*</span>
                                        </Label>
                                        <Input
                                          id={`level1-user-email-${index}`}
                                          type="email"
                                          value={user.email}
                                          onChange={(e) => updateLevel1User(user.id, 'email', e.target.value)}
                                          placeholder="Enter email"
                                          data-testid={`input-level1-user-email-${index}`}
                                          disabled={!fromSlPrep}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <Button
                              onClick={saveLicenseInfo}
                              disabled={
                                updateSLLicenseMutation.isPending || 
                                !slLicenseNumber.trim() || 
                                !slLicenseIssueDate ||
                                !slWorkAddress.trim() ||
                                slLevel1Users.length === 0 ||
                                !fromSlPrep
                              }
                              data-testid="button-save-sl-license"
                            >
                              {updateSLLicenseMutation.isPending ? "Saving..." : "Save License Information"}
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      {!slLicenseIssued && company.slLicenseNumber && fromSlPrep && (
                        <div className="pl-7 space-y-3">
                          <div className="text-sm text-muted-foreground">
                            License will be cleared: {company.slLicenseNumber} (issued {company.slLicenseIssueDate ? format(new Date(company.slLicenseIssueDate), "dd MMM yyyy") : "unknown date"})
                          </div>
                          <Button
                            onClick={saveLicenseInfo}
                            disabled={updateSLLicenseMutation.isPending || !uncheckReason.trim()}
                            variant="destructive"
                            data-testid="button-clear-sl-license"
                          >
                            {updateSLLicenseMutation.isPending ? "Clearing..." : "Clear License Information"}
                          </Button>
                        </div>
                      )}
                      
                      {!slLicenseIssued && !company.slLicenseNumber && (
                        <div className="pl-7 text-sm text-muted-foreground">
                          Check the box above once the Sponsorship License has been issued to record the license details
                        </div>
                      )}
                    </div>
                  )}

                  {/* No license issued and not in edit mode */}
                  {!isLicenseEditMode && !company.slLicenseIssued && !slLicenseIssued && (
                    <div className="space-y-4">
                      <div className="text-sm text-muted-foreground">
                        No Sponsorship License has been issued for this company yet.
                      </div>
                      {fromSlPrep && (
                        <Button
                          variant="outline"
                          onClick={() => setIsLicenseEditMode(true)}
                          data-testid="button-issue-sl-license"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Issue License
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* SL Prep Tasks (only for companies in SL Prep) */}
          {company.sl && slPrepTasks.length > 0 && (
            <Card data-testid="card-sl-prep-tasks" className="border-primary/30 bg-primary/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-primary" />
                    Sponsorship License Preparation Tasks
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {taskStatuses.filter(s => s.isCompleted).length} / {slPrepTasks.length} completed
                    </span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Progress 
                      value={(taskStatuses.filter(s => s.isCompleted).length / slPrepTasks.length) * 100} 
                      className="flex-1"
                    />
                    <span className="text-sm font-medium">
                      {Math.round((taskStatuses.filter(s => s.isCompleted).length / slPrepTasks.length) * 100)}%
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {slPrepTasks.map((task, index) => {
                    const status = taskStatuses.find(
                      (s) => s.taskId === task.id
                    );
                    const isCompleted = status?.isCompleted || false;

                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 p-4 rounded-md border bg-card hover-elevate"
                        data-testid={`row-sl-task-${task.id}`}
                      >
                        <input
                          type="checkbox"
                          checked={isCompleted}
                          onChange={() => {
                            if (isCompleted) {
                              // Unchecking - toggle directly without confirmation
                              localStorageService.toggleCompanySLPrepTaskStatus(company.id, task.id);
                              const updatedStatuses = localStorageService.getCompanySLPrepTaskStatuses();
                              setTaskStatuses(updatedStatuses.filter(s => s.companyId === company.id));
                              toast({
                                title: "Task unmarked",
                                description: `Task unmarked successfully`,
                              });
                            } else {
                              // Checking - show confirmation dialog requiring note
                              setCompletingTask(task);
                              // Load existing description if available
                              const existingStatus = status || localStorageService.getCompanySLPrepTaskStatus(company.id, task.id);
                              setTaskDescription(existingStatus?.description || "");
                              setCompletionNote("");
                            }
                          }}
                          className="mt-1 h-4 w-4 cursor-pointer"
                          data-testid={`checkbox-sl-task-${task.id}`}
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">#{index + 1}</span>
                            <span className="font-medium" data-testid={`text-sl-task-name-${task.id}`}>
                              {task.name}
                            </span>
                            {isCompleted && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Done
                              </Badge>
                            )}
                          </div>
                          {status?.description && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Description:</span> {status.description}
                            </div>
                          )}
                          {status?.completionNote && (
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium">Note:</span> {status.completionNote}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {slPrepTasks.length === 0 && (
                  <p className="text-center text-muted-foreground py-6" data-testid="text-no-sl-tasks">
                    No SL prep tasks have been created yet. Add tasks in the SL Prep Task tab.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Company Overview Card */}
          <Card data-testid="card-overview">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-medium" data-testid="text-overview-name">{company.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company Number</p>
                  <p className="font-medium" data-testid="text-overview-number">{company.number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Incorporation Date</p>
                  <p className="font-medium" data-testid="text-overview-incorporation-date">
                    {company.incorporationDate
                      ? format(new Date(company.incorporationDate), "dd MMM yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Industry Code</p>
                  <p className="font-medium" data-testid="text-overview-industry-code">
                    {company.industryCode || "-"}
                  </p>
                </div>
                {company.companyStatus && (
                  <div>
                    <p className="text-sm text-muted-foreground">Company Status</p>
                    <p className="font-medium" data-testid="text-overview-company-status">
                      {company.companyStatus}
                    </p>
                  </div>
                )}
                {company.companyType && (
                  <div>
                    <p className="text-sm text-muted-foreground">Company Type</p>
                    <p className="font-medium" data-testid="text-overview-company-type">
                      {company.companyType}
                    </p>
                  </div>
                )}
                {company.jurisdiction && (
                  <div>
                    <p className="text-sm text-muted-foreground">Jurisdiction</p>
                    <p className="font-medium" data-testid="text-overview-jurisdiction">
                      {company.jurisdiction}
                    </p>
                  </div>
                )}
                {company.renewalFees && (
                  <div>
                    <p className="text-sm text-muted-foreground">Renewal Fees</p>
                    <p className="font-medium" data-testid="text-overview-renewal-fees">
                      £{company.renewalFees}
                    </p>
                  </div>
                )}
              </div>

              {company.address && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">Registered Address</p>
                    <p className="font-medium" data-testid="text-overview-address">{company.address}</p>
                  </div>
                </>
              )}

              {(company.ownerName || company.ownerEmail || company.ownerPhone || company.vendorName) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      Contact Information
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {company.ownerName && (
                        <div>
                          <p className="text-sm text-muted-foreground">Owner Name</p>
                          <p className="font-medium" data-testid="text-overview-owner-name">{company.ownerName}</p>
                        </div>
                      )}
                      {company.vendorName && (
                        <div>
                          <p className="text-sm text-muted-foreground">Vendor Name</p>
                          <p className="font-medium" data-testid="text-overview-vendor-name">{company.vendorName}</p>
                        </div>
                      )}
                      {company.ownerEmail && (
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" />
                            Owner Email
                          </p>
                          <a 
                            href={`mailto:${company.ownerEmail}`}
                            className="text-primary hover:underline font-medium break-all"
                            data-testid="link-overview-owner-email"
                          >
                            {company.ownerEmail}
                          </a>
                        </div>
                      )}
                      {company.ownerPhone && (
                        <div>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" />
                            Owner Phone
                          </p>
                          <a 
                            href={`tel:${company.ownerPhone}`}
                            className="text-primary hover:underline font-medium"
                            data-testid="link-overview-owner-phone"
                          >
                            {company.ownerPhone}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {(company.companiesHouseLink || company.googleDriveLink) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Links & Resources</p>
                    {company.companiesHouseLink && (
                      <div>
                        <p className="text-sm text-muted-foreground">Companies House</p>
                        <a
                          href={company.companiesHouseLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium break-all"
                          data-testid="link-overview-companies-house"
                        >
                          {company.companiesHouseLink}
                        </a>
                      </div>
                    )}
                    {company.googleDriveLink && (
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <FolderOpen className="h-3.5 w-3.5" />
                          Google Drive
                        </p>
                        <a
                          href={company.googleDriveLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-medium break-all"
                          data-testid="link-overview-google-drive"
                        >
                          {company.googleDriveLink}
                        </a>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Companies House Compliance Card */}
          {(company.confirmationStatementDue || company.confirmationStatementLastMade || company.accountsDue || company.lastAccountsDate || company.companiesHouseNextRenewalDate) && (
            <Card data-testid="card-companies-house-compliance">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Companies House Compliance
                </CardTitle>
                <CardDescription>
                  Filing deadlines and statutory compliance dates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prominent Next Renewal Date */}
                {company.companiesHouseNextRenewalDate && (
                  <div className="p-4 rounded-md border-2 border-primary bg-primary/5">
                    <p className="text-sm font-medium text-muted-foreground mb-1">Next Renewal Date</p>
                    <p className="text-2xl font-bold text-primary" data-testid="text-ch-next-renewal-date">
                      {format(new Date(company.companiesHouseNextRenewalDate), "dd MMM yyyy")}
                    </p>
                    {(() => {
                      const daysUntilDue = Math.ceil((new Date(company.companiesHouseNextRenewalDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                      if (daysUntilDue < 0) {
                        return <Badge variant="destructive" className="mt-2">Overdue by {Math.abs(daysUntilDue)} days</Badge>;
                      } else if (daysUntilDue <= 14) {
                        return <Badge variant="default" className="mt-2">Due in {daysUntilDue} days</Badge>;
                      } else if (daysUntilDue <= 30) {
                        return <Badge variant="secondary" className="mt-2">Due in {daysUntilDue} days</Badge>;
                      }
                      return null;
                    })()}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {company.confirmationStatementDue && (
                    <div className="p-3 rounded-md border bg-card">
                      <p className="text-sm text-muted-foreground mb-1">Confirmation Statement Due</p>
                      <p className="font-semibold text-lg" data-testid="text-confirmation-statement-due">
                        {format(new Date(company.confirmationStatementDue), "dd MMM yyyy")}
                      </p>
                      {(() => {
                        const daysUntilDue = Math.ceil((new Date(company.confirmationStatementDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysUntilDue < 0) {
                          return <Badge variant="destructive" className="mt-2">Overdue by {Math.abs(daysUntilDue)} days</Badge>;
                        } else if (daysUntilDue <= 14) {
                          return <Badge variant="default" className="mt-2">Due in {daysUntilDue} days</Badge>;
                        } else if (daysUntilDue <= 30) {
                          return <Badge variant="secondary" className="mt-2">Due in {daysUntilDue} days</Badge>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {company.confirmationStatementLastMade && (
                    <div className="p-3 rounded-md border bg-card">
                      <p className="text-sm text-muted-foreground mb-1">Last Confirmation Statement</p>
                      <p className="font-semibold text-lg" data-testid="text-confirmation-statement-last-made">
                        {format(new Date(company.confirmationStatementLastMade), "dd MMM yyyy")}
                      </p>
                    </div>
                  )}
                  {company.accountsDue && (
                    <div className="p-3 rounded-md border bg-card">
                      <p className="text-sm text-muted-foreground mb-1">Accounts Due</p>
                      <p className="font-semibold text-lg" data-testid="text-accounts-due">
                        {format(new Date(company.accountsDue), "dd MMM yyyy")}
                      </p>
                      {(() => {
                        const daysUntilDue = Math.ceil((new Date(company.accountsDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        if (daysUntilDue < 0) {
                          return <Badge variant="destructive" className="mt-2">Overdue by {Math.abs(daysUntilDue)} days</Badge>;
                        } else if (daysUntilDue <= 14) {
                          return <Badge variant="default" className="mt-2">Due in {daysUntilDue} days</Badge>;
                        } else if (daysUntilDue <= 30) {
                          return <Badge variant="secondary" className="mt-2">Due in {daysUntilDue} days</Badge>;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {company.lastAccountsDate && (
                    <div className="p-3 rounded-md border bg-card">
                      <p className="text-sm text-muted-foreground mb-1">Last Accounts Filed</p>
                      <p className="font-semibold text-lg" data-testid="text-last-accounts-date">
                        {format(new Date(company.lastAccountsDate), "dd MMM yyyy")}
                      </p>
                    </div>
                  )}
                </div>
                {company.lastSyncDate && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground" data-testid="text-last-sync-date">
                      Last synced with Companies House: {format(new Date(company.lastSyncDate), "dd MMM yyyy 'at' HH:mm")}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Governance Card */}
          <Card data-testid="card-governance">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Governance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Directors */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Directors</h3>
                {company.directors && company.directors.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-director-name">Name</TableHead>
                          <TableHead data-testid="header-director-role">Role</TableHead>
                          <TableHead data-testid="header-director-appointed">Appointed On</TableHead>
                          <TableHead data-testid="header-director-resigned">Resigned On</TableHead>
                          <TableHead data-testid="header-director-nationality">Nationality</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {company.directors.map((director, index) => (
                          <TableRow key={index} data-testid={`row-director-${index}`}>
                            <TableCell className="font-medium" data-testid={`cell-director-name-${index}`}>
                              {director.name}
                            </TableCell>
                            <TableCell data-testid={`cell-director-role-${index}`}>
                              {director.officerRole || "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-director-appointed-${index}`}>
                              {director.appointedOn
                                ? format(new Date(director.appointedOn), "dd MMM yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-director-resigned-${index}`}>
                              {director.resignedOn
                                ? format(new Date(director.resignedOn), "dd MMM yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-director-nationality-${index}`}>
                              {director.nationality || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-directors">
                    No directors data available
                  </p>
                )}
              </div>

              <Separator />

              {/* Officers */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Officers</h3>
                {company.officers && company.officers.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-officer-name">Name</TableHead>
                          <TableHead data-testid="header-officer-role">Role</TableHead>
                          <TableHead data-testid="header-officer-appointed">Appointed On</TableHead>
                          <TableHead data-testid="header-officer-resigned">Resigned On</TableHead>
                          <TableHead data-testid="header-officer-occupation">Occupation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {company.officers.map((officer, index) => (
                          <TableRow key={index} data-testid={`row-officer-${index}`}>
                            <TableCell className="font-medium" data-testid={`cell-officer-name-${index}`}>
                              {officer.name}
                            </TableCell>
                            <TableCell data-testid={`cell-officer-role-${index}`}>
                              {officer.officerRole || "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-officer-appointed-${index}`}>
                              {officer.appointedOn
                                ? format(new Date(officer.appointedOn), "dd MMM yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-officer-resigned-${index}`}>
                              {officer.resignedOn
                                ? format(new Date(officer.resignedOn), "dd MMM yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-officer-occupation-${index}`}>
                              {officer.occupation || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-officers">
                    No officers data available
                  </p>
                )}
              </div>

              <Separator />

              {/* PSCs */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Persons with Significant Control (PSC)</h3>
                {company.pscs && company.pscs.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead data-testid="header-psc-name">Name</TableHead>
                          <TableHead data-testid="header-psc-kind">Kind</TableHead>
                          <TableHead data-testid="header-psc-control">Natures of Control</TableHead>
                          <TableHead data-testid="header-psc-notified">Notified On</TableHead>
                          <TableHead data-testid="header-psc-nationality">Nationality</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {company.pscs.map((psc, index) => (
                          <TableRow key={index} data-testid={`row-psc-${index}`}>
                            <TableCell className="font-medium" data-testid={`cell-psc-name-${index}`}>
                              {psc.name}
                            </TableCell>
                            <TableCell data-testid={`cell-psc-kind-${index}`}>
                              {psc.kind || "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-psc-control-${index}`}>
                              {psc.naturesOfControl && psc.naturesOfControl.length > 0
                                ? psc.naturesOfControl.join(", ")
                                : "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-psc-notified-${index}`}>
                              {psc.notifiedOn
                                ? format(new Date(psc.notifiedOn), "dd MMM yyyy")
                                : "-"}
                            </TableCell>
                            <TableCell data-testid={`cell-psc-nationality-${index}`}>
                              {psc.nationality || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-pscs">
                    No PSC data available
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Filing History Card */}
          <Card data-testid="card-filings">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Filing History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.filings && company.filings.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="header-filing-date">Date</TableHead>
                        <TableHead data-testid="header-filing-category">Category</TableHead>
                        <TableHead data-testid="header-filing-type">Type</TableHead>
                        <TableHead data-testid="header-filing-description">Description</TableHead>
                        <TableHead data-testid="header-filing-action-date">Action Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {company.filings.map((filing, index) => (
                        <TableRow key={index} data-testid={`row-filing-${index}`}>
                          <TableCell data-testid={`cell-filing-date-${index}`}>
                            {filing.date
                              ? format(new Date(filing.date), "dd MMM yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-filing-category-${index}`}>
                            {filing.category || "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-filing-type-${index}`}>
                            {filing.type || "-"}
                          </TableCell>
                          <TableCell className="max-w-md" data-testid={`cell-filing-description-${index}`}>
                            {filing.description || "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-filing-action-date-${index}`}>
                            {filing.actionDate
                              ? format(new Date(filing.actionDate), "dd MMM yyyy")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-filings">
                  No filing history available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Charges Card */}
          <Card data-testid="card-charges">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Charges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.charges && company.charges.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="header-charge-number">Charge Number</TableHead>
                        <TableHead data-testid="header-charge-created">Created On</TableHead>
                        <TableHead data-testid="header-charge-status">Status</TableHead>
                        <TableHead data-testid="header-charge-entitled">Persons Entitled</TableHead>
                        <TableHead data-testid="header-charge-particulars">Particulars</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {company.charges.map((charge, index) => (
                        <TableRow key={index} data-testid={`row-charge-${index}`}>
                          <TableCell className="font-medium" data-testid={`cell-charge-number-${index}`}>
                            {charge.chargeNumber || "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-charge-created-${index}`}>
                            {charge.createdOn
                              ? format(new Date(charge.createdOn), "dd MMM yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-charge-status-${index}`}>
                            {charge.status || "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-charge-entitled-${index}`}>
                            {charge.personsEntitled && charge.personsEntitled.length > 0
                              ? charge.personsEntitled.join(", ")
                              : "-"}
                          </TableCell>
                          <TableCell className="max-w-md" data-testid={`cell-charge-particulars-${index}`}>
                            {charge.particulars || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-charges">
                  No charges data available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Insolvency Card */}
          <Card data-testid="card-insolvency">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                Insolvency History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {company.insolvencyHistory && company.insolvencyHistory.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="header-insolvency-case">Case Number</TableHead>
                        <TableHead data-testid="header-insolvency-type">Type</TableHead>
                        <TableHead data-testid="header-insolvency-date">Date</TableHead>
                        <TableHead data-testid="header-insolvency-practitioners">Practitioners</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {company.insolvencyHistory.map((insolvency, index) => (
                        <TableRow key={index} data-testid={`row-insolvency-${index}`}>
                          <TableCell className="font-medium" data-testid={`cell-insolvency-case-${index}`}>
                            {insolvency.caseNumber || "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-insolvency-type-${index}`}>
                            {insolvency.type || "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-insolvency-date-${index}`}>
                            {insolvency.date
                              ? format(new Date(insolvency.date), "dd MMM yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell data-testid={`cell-insolvency-practitioners-${index}`}>
                            {insolvency.practitioners && insolvency.practitioners.length > 0
                              ? insolvency.practitioners.join(", ")
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-insolvency">
                  No insolvency history available
                </p>
              )}
            </CardContent>
          </Card>

          {/* Tasks Card */}
          <Card data-testid="card-tasks">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <ListTodo className="h-5 w-5 text-primary" />
                    Compliance Tasks
                  </CardTitle>
                  {lastGenerationData?.timestamp && (
                    <p className="text-sm text-muted-foreground" data-testid="text-last-generation">
                      Last generated: {format(new Date(lastGenerationData.timestamp), "dd MMM yyyy 'at' h:mm a")}
                    </p>
                  )}
                  {!lastGenerationData?.timestamp && (
                    <p className="text-sm text-muted-foreground" data-testid="text-never-generated">
                      Tasks have never been generated
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateTasksMutation.mutate()}
                  disabled={generateTasksMutation.isPending}
                  data-testid="button-generate-tasks"
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${generateTasksMutation.isPending ? 'animate-spin' : ''}`} />
                  {generateTasksMutation.isPending ? 'Generating...' : 'Generate Tasks'}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert data-testid="alert-tasks-readonly">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Tasks are view-only here. To complete or cancel tasks, use the <strong>Tasks</strong> tab on the home page.
                </AlertDescription>
              </Alert>

              {tasksLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-primary border-r-transparent"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading tasks...</p>
                </div>
              ) : sortedTasks.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead data-testid="header-task-status">Status</TableHead>
                        <TableHead data-testid="header-task-title">Task</TableHead>
                        <TableHead data-testid="header-task-due">Due Date</TableHead>
                        <TableHead data-testid="header-task-priority">Priority</TableHead>
                        <TableHead data-testid="header-task-reviewed">Reviewed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTasks.map((task, index) => {
                        const taskPriority = getTaskStatus(task.dueAt);
                        const daysUntil = getDaysUntilDue(task.dueAt);
                        
                        return (
                          <TableRow key={task.id} data-testid={`row-task-${index}`}>
                            <TableCell data-testid={`cell-task-status-${index}`}>
                              <Badge
                                variant={
                                  task.status === "done"
                                    ? "default"
                                    : task.status === "cancelled" || task.status === "skipped"
                                    ? "secondary"
                                    : "outline"
                                }
                                className="capitalize"
                              >
                                {task.status}
                              </Badge>
                            </TableCell>
                            <TableCell data-testid={`cell-task-title-${index}`}>
                              <div>
                                <p className="font-medium">{task.title}</p>
                                {task.description && (
                                  <p className="text-sm text-muted-foreground">{task.description}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell data-testid={`cell-task-due-${index}`}>
                              <div>
                                <p className="font-medium">{formatDueDate(task.dueAt)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {daysUntil > 0 ? `${daysUntil} days` : `${Math.abs(daysUntil)} days ago`}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell data-testid={`cell-task-priority-${index}`}>
                              {task.status === "open" && (
                                <Badge
                                  variant={
                                    taskPriority === "overdue"
                                      ? "destructive"
                                      : taskPriority === "due_soon"
                                      ? "default"
                                      : "secondary"
                                  }
                                >
                                  {taskPriority === "overdue"
                                    ? "Overdue"
                                    : taskPriority === "due_soon"
                                    ? "Due Soon"
                                    : "Upcoming"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell data-testid={`cell-task-reviewed-${index}`}>
                              {(task.status === "done" || task.status === "cancelled") ? (
                                task.reviewed ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Reviewed
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                    Pending
                                  </Badge>
                                )
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-tasks">
                  No tasks available for this company
                </p>
              )}
            </CardContent>
          </Card>

          {/* Company Activity Log (from general_log) */}
          {entityLogs.length > 0 && (
            <Card data-testid="card-activity-log">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Company Activity Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Log ID</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Username</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entityLogs.map((log: any, index: number) => (
                        <TableRow key={log.id} data-testid={`row-activity-log-${index}`}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-mono">
                              LOG-{String(log.logRefId || 0).padStart(3, "0")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {format(new Date(log.timestamp), "dd MMM yyyy")}
                            <br />
                            <span className="text-muted-foreground text-xs">
                              {format(new Date(log.timestamp), "HH:mm:ss")}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={
                              log.action?.includes("created") ? "bg-green-50 text-green-700 border-green-200" :
                              log.action?.includes("updated") ? "bg-blue-50 text-blue-700 border-blue-200" :
                              log.action?.includes("deleted") ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-gray-50 text-gray-700 border-gray-200"
                            }>
                              {log.action?.replace(/_/g, " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-md">
                            <p className="text-sm">{log.details || ""}</p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{log.performedByName || "System"}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Employees Section */}
          {companyEmployees.length > 0 && (
            <Card data-testid="card-employees">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Employees ({companyEmployees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {currentEmployees.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3 text-primary">Current Employees ({currentEmployees.length})</h3>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Name</TableHead>
                            <TableHead>Job Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Contract Type</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>Visa Expiry</TableHead>
                            <TableHead>Passport Expiry</TableHead>
                            <TableHead>RTW Expiry</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {currentEmployees.map((emp, index) => (
                            <TableRow 
                              key={emp.id} 
                              className="hover-elevate cursor-pointer" 
                              onClick={() => setLocation(`/employee/${emp.id}`)}
                              data-testid={`row-current-employee-${index}`}
                            >
                              <TableCell data-testid={`cell-emp-name-${index}`}>
                                <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                                <div className="text-xs text-muted-foreground">{emp.personalEmail}</div>
                              </TableCell>
                              <TableCell data-testid={`cell-emp-job-${index}`}>{emp.jobTitle}</TableCell>
                              <TableCell data-testid={`cell-emp-status-${index}`}>
                                <Badge 
                                  variant={
                                    emp.status === "active" ? "default" :
                                    emp.status === "onboarding" ? "secondary" :
                                    "outline"
                                  }
                                >
                                  {emp.status}
                                </Badge>
                              </TableCell>
                              <TableCell data-testid={`cell-emp-contract-${index}`}>{emp.contractType}</TableCell>
                              <TableCell data-testid={`cell-emp-start-${index}`}>
                                {emp.startDate ? format(new Date(emp.startDate), "dd MMM yyyy") : "N/A"}
                              </TableCell>
                              <TableCell data-testid={`cell-emp-visa-${index}`}>
                                {emp.visaExpiryDate ? format(new Date(emp.visaExpiryDate), "dd MMM yyyy") : "N/A"}
                              </TableCell>
                              <TableCell data-testid={`cell-emp-passport-${index}`}>
                                {emp.passportExpiry ? format(new Date(emp.passportExpiry), "dd MMM yyyy") : "N/A"}
                              </TableCell>
                              <TableCell data-testid={`cell-emp-rtw-${index}`}>
                                {emp.rtwExpiryIndefinite ? "Indefinite" : 
                                 emp.rtwExpiryDate ? format(new Date(emp.rtwExpiryDate), "dd MMM yyyy") : "N/A"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {pastEmployees.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-3 text-muted-foreground">Past Employees ({pastEmployees.length})</h3>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30">
                            <TableHead>Name</TableHead>
                            <TableHead>Job Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Start Date</TableHead>
                            <TableHead>End Date</TableHead>
                            <TableHead>Contract Type</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pastEmployees.map((emp, index) => (
                            <TableRow 
                              key={emp.id} 
                              className="hover-elevate cursor-pointer opacity-70" 
                              onClick={() => setLocation(`/employee/${emp.id}`)}
                              data-testid={`row-past-employee-${index}`}
                            >
                              <TableCell data-testid={`cell-past-emp-name-${index}`}>
                                <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                                <div className="text-xs text-muted-foreground">{emp.personalEmail}</div>
                              </TableCell>
                              <TableCell data-testid={`cell-past-emp-job-${index}`}>{emp.jobTitle}</TableCell>
                              <TableCell data-testid={`cell-past-emp-status-${index}`}>
                                <Badge variant="outline">{emp.status}</Badge>
                              </TableCell>
                              <TableCell data-testid={`cell-past-emp-start-${index}`}>
                                {emp.startDate ? format(new Date(emp.startDate), "dd MMM yyyy") : "N/A"}
                              </TableCell>
                              <TableCell data-testid={`cell-past-emp-end-${index}`}>
                                {emp.leaverDate ? format(new Date(emp.leaverDate), "dd MMM yyyy") : 
                                 emp.endDate ? format(new Date(emp.endDate), "dd MMM yyyy") : "N/A"}
                              </TableCell>
                              <TableCell data-testid={`cell-past-emp-contract-${index}`}>{emp.contractType}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Residency Service Section */}
          {residencyEmployees.length > 0 && (
            <Card data-testid="card-residency">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Residency Service Employees ({residencyEmployees.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead>Name</TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Residency Status</TableHead>
                        <TableHead>Visa Type</TableHead>
                        <TableHead>Visa Expiry</TableHead>
                        <TableHead>Nationality</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {residencyEmployees.map((emp, index) => (
                        <TableRow 
                          key={emp.id} 
                          className="hover-elevate cursor-pointer" 
                          onClick={() => setLocation(`/employee/${emp.id}`)}
                          data-testid={`row-residency-employee-${index}`}
                        >
                          <TableCell data-testid={`cell-res-emp-name-${index}`}>
                            <div className="font-medium">{emp.firstName} {emp.lastName}</div>
                            <div className="text-xs text-muted-foreground">{emp.personalEmail}</div>
                          </TableCell>
                          <TableCell data-testid={`cell-res-emp-job-${index}`}>{emp.jobTitle}</TableCell>
                          <TableCell data-testid={`cell-res-emp-status-${index}`}>
                            <Badge variant={emp.status === "active" ? "default" : "secondary"}>
                              {emp.status}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`cell-res-emp-res-status-${index}`}>
                            <Badge 
                              variant={emp.residencyStatus === "done" ? "default" : "outline"}
                              className={emp.residencyStatus === "done" ? "bg-green-50 text-green-700 border-green-200" : ""}
                            >
                              {emp.residencyStatus || "pending"}
                            </Badge>
                          </TableCell>
                          <TableCell data-testid={`cell-res-emp-visa-${index}`}>{emp.visaType || "N/A"}</TableCell>
                          <TableCell data-testid={`cell-res-emp-visa-exp-${index}`}>
                            {emp.visaExpiryDate ? format(new Date(emp.visaExpiryDate), "dd MMM yyyy") : "N/A"}
                          </TableCell>
                          <TableCell data-testid={`cell-res-emp-nationality-${index}`}>{emp.nationality || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      </div>

      {/* SL Prep Task Completion Dialog */}
      <Dialog open={!!completingTask} onOpenChange={(open) => !open && setCompletingTask(null)}>
        <DialogContent data-testid="dialog-complete-sl-task" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Complete Task</DialogTitle>
            <DialogDescription>
              Mark "{completingTask?.name}" as complete. Please provide task details and completion notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Task Description (optional)
              </label>
              <Textarea
                placeholder="Enter specific details about this task (e.g., account number, reference codes, specific information)..."
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                maxLength={250000}
                data-testid="input-task-description"
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                This field is for task-specific information that you want to record for this company (up to 50,000 words).
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Completion Note (minimum 10 characters) *
              </label>
              <Textarea
                placeholder="Please describe what was done to complete this task..."
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                maxLength={250000}
                data-testid="input-completion-note"
                rows={3}
              />
              {completionNote.trim().length > 0 && completionNote.trim().length < 10 && (
                <p className="text-sm text-destructive" data-testid="text-completion-note-error">
                  Note must be at least 10 characters ({completionNote.trim().length}/10)
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Up to 50,000 words
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCompletingTask(null);
                setTaskDescription("");
                setCompletionNote("");
              }}
              data-testid="button-cancel-complete"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmTaskCompletion}
              disabled={completionNote.trim().length < 10}
              data-testid="button-confirm-complete"
            >
              Mark as Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Uncheck License Confirmation Dialog */}
      <Dialog open={showUncheckConfirmation} onOpenChange={setShowUncheckConfirmation}>
        <DialogContent data-testid="dialog-uncheck-license">
          <DialogHeader>
            <DialogTitle>Clear Sponsorship License Information</DialogTitle>
            <DialogDescription>
              You are about to remove the Sponsorship License from this company. This action will clear the license number and issue date. Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="uncheck-reason">
                Reason for clearing license (minimum 10 characters) *
              </Label>
              <Textarea
                id="uncheck-reason"
                placeholder="Please explain why the Sponsorship License is being cleared..."
                value={uncheckReason}
                onChange={(e) => setUncheckReason(e.target.value)}
                maxLength={500}
                data-testid="input-uncheck-reason"
                rows={3}
              />
              {uncheckReason.trim().length > 0 && uncheckReason.trim().length < 10 && (
                <p className="text-sm text-destructive">
                  Reason must be at least 10 characters ({uncheckReason.trim().length}/10)
                </p>
              )}
            </div>
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-sm text-yellow-800">
                Current license: <strong>{company?.slLicenseNumber}</strong> (issued {company?.slLicenseIssueDate ? format(new Date(company.slLicenseIssueDate), "dd MMM yyyy") : "unknown date"})
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowUncheckConfirmation(false);
                setUncheckReason("");
              }}
              data-testid="button-cancel-uncheck"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmUncheckLicense}
              disabled={uncheckReason.trim().length < 10}
              variant="destructive"
              data-testid="button-confirm-uncheck"
            >
              Clear License
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
