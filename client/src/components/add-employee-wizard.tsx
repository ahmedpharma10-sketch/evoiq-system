import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { localStorageService } from "@/lib/localStorage";
import { queryClient } from "@/lib/queryClient";
import { api } from "@/lib/api";
import { idGenerator } from "@/lib/idGenerator";
import { createDefaultEmployeeFormTemplate } from "@/lib/employee/defaultTemplate";
import { 
  generateEmployeeTasks,
  generateHRTemplateTasks,
  saveGeneratedTasks
} from "@/lib/utils/employeeTaskGenerator";
import { generateAttendanceRecordsForEmployee } from "@/lib/utils/attendanceGenerator";
import type { EmployeeFormTemplate, FormField as TemplateField, EmployeeRecord, Company, EmployeeTask } from "@shared/schema";
import { UserPlus, ChevronLeft, ChevronRight, CheckCircle2, Info, Sparkles, FileDown, X } from "lucide-react";
import { format, addMonths, addYears } from "date-fns";

// Helper to evaluate a single conditional rule
function evaluateRule(
  rule: { triggerFieldId: string; operator: string; value?: any },
  formValues: Record<string, any>,
  fieldIdToNameMap: Record<string, string>
): boolean {
  // Get the field name from the trigger field ID
  const triggerFieldName = fieldIdToNameMap[rule.triggerFieldId];
  if (!triggerFieldName) {
    return true; // If we can't find the trigger field, allow the field
  }
  
  const fieldValue = formValues[triggerFieldName];
  
  switch (rule.operator) {
    case "equals":
      return fieldValue === rule.value;
    case "not_equals":
      return fieldValue !== rule.value;
    case "contains":
      return typeof fieldValue === "string" && typeof rule.value === "string" && fieldValue.includes(rule.value);
    case "not_contains":
      return typeof fieldValue === "string" && typeof rule.value === "string" && !fieldValue.includes(rule.value);
    case "is_empty":
      return !fieldValue || fieldValue === "";
    case "is_not_empty":
      return !!fieldValue && fieldValue !== "";
    default:
      return true;
  }
}

// Check if field should be visible based on conditional rules
function isFieldVisible(
  field: TemplateField, 
  formValues: Record<string, any>,
  fieldIdToNameMap: Record<string, string>
): boolean {
  if (!field.conditionalRules || field.conditionalRules.length === 0) {
    return true;
  }

  // All rules must pass for field to be visible (AND logic)
  return field.conditionalRules.every((rule) => {
    if (rule.action !== "show" && rule.action !== "hide") {
      return true; // Ignore non-visibility rules
    }

    const conditionMet = evaluateRule(rule, formValues, fieldIdToNameMap);

    if (rule.action === "show") {
      return conditionMet;
    } else if (rule.action === "hide") {
      return !conditionMet;
    }

    return true;
  });
}

// Check if field should be enabled based on conditional rules
function isFieldEnabled(
  field: TemplateField, 
  formValues: Record<string, any>,
  fieldIdToNameMap: Record<string, string>
): boolean {
  if (!field.conditionalRules || field.conditionalRules.length === 0) {
    return true;
  }

  const disableRules = field.conditionalRules.filter(
    (rule) => rule.action === "require" || rule.action === "optional"
  );

  if (disableRules.length === 0) {
    return true;
  }

  return disableRules.every((rule) => {
    const conditionMet = evaluateRule(rule, formValues, fieldIdToNameMap);

    if (rule.action === "require") {
      return conditionMet;
    } else if (rule.action === "optional") {
      return !conditionMet;
    }

    return true;
  });
}

// Auto-calculate field values
function calculateFieldValue(
  field: TemplateField,
  formValues: Record<string, any>
): string | undefined {
  if (!field.autoCalculate) {
    return undefined;
  }

  const { formula, dependencies } = field.autoCalculate;

  if (formula === "probation_end" && dependencies?.[0]) {
    const startDate = formValues[dependencies[0]];
    if (startDate) {
      const result = addMonths(new Date(startDate), 3);
      return format(result, "yyyy-MM-dd");
    }
  }

  if (formula === "rtw_check_date" && dependencies?.[0]) {
    const expiryDate = formValues[dependencies[0]];
    if (expiryDate) {
      const result = addMonths(new Date(expiryDate), -3);
      return format(result, "yyyy-MM-dd");
    }
  }

  return undefined;
}

export default function AddEmployeeWizard() {
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdEmployee, setCreatedEmployee] = useState<EmployeeRecord | null>(null);
  const [createdTasks, setCreatedTasks] = useState<EmployeeTask[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load active template
  const { data: template } = useQuery<EmployeeFormTemplate | null>({
    queryKey: ["employee-form-template"],
    queryFn: () => {
      const templates = localStorageService.getEmployeeFormTemplates();
      let activeTemplate = templates.find(t => t.isActive) || null;
      const latestTemplate = createDefaultEmployeeFormTemplate();
      
      // Initialize with default template if none exists OR if version is outdated
      if (!activeTemplate || activeTemplate.version < latestTemplate.version) {
        // Delete old template if exists
        if (activeTemplate) {
          localStorageService.deleteEmployeeFormTemplate(activeTemplate.id);
        }
        // Add new template
        activeTemplate = latestTemplate;
        localStorageService.addEmployeeFormTemplate(activeTemplate);
      }
      
      return activeTemplate;
    },
  });

  // Load companies for dropdown from database
  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/companies"],
    select: (data) => data.filter(c => c.isActive),
  });

  // Build dynamic Zod schema from template - all fields optional for wizard navigation
  const formSchema = useMemo(() => {
    if (!template) return z.object({});

    const schemaFields: Record<string, z.ZodTypeAny> = {};

    template.fields.forEach((field) => {
      if (field.type === "section_header" || field.type === "info_text") {
        return;
      }

      let fieldSchema: z.ZodTypeAny;

      // Special handling for fields that store arrays
      if (field.name === "workingDays" || field.name === "documents" || field.name === "generatedTaskIds") {
        fieldSchema = z.array(z.string()).optional();
      } else {
        switch (field.type) {
          case "text":
          case "tel":
          case "textarea":
          case "select":
          case "radio":
            fieldSchema = z.string().optional();
            break;
          case "email":
            fieldSchema = z.string().email("Invalid email address").optional().or(z.literal(""));
            break;
          case "number":
            fieldSchema = z.coerce.number().optional();
            break;
          case "date":
            fieldSchema = z.string().optional();
            break;
          case "checkbox":
            fieldSchema = z.boolean().default(false);
            break;
          case "file":
            fieldSchema = z.string().optional();
            break;
          default:
            fieldSchema = z.string().optional();
        }
      }

      schemaFields[field.name] = fieldSchema;
    });

    // Create base schema with all fields optional
    return z.object(schemaFields);
  }, [template]);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...(template?.fields.reduce((acc, field) => {
        // Special handling for array fields
        if (field.name === "workingDays") {
          acc[field.name] = ["monday", "tuesday", "wednesday", "thursday", "friday"];
        } else if (field.name === "documents" || field.name === "generatedTaskIds") {
          acc[field.name] = [];
        } else if (field.type === "checkbox") {
          acc[field.name] = false;
        } else if (field.defaultValue) {
          acc[field.name] = field.defaultValue;
        } else {
          acc[field.name] = "";
        }
        return acc;
      }, {} as Record<string, any>) || {}),
      // Initialize working time fields
      startingWorkingTime: "09:00",
      dailyWorkingHours: "",
      endingWorkingTime: "",
    } as Record<string, any>,
  });

  // Watch all form values for conditional rendering
  const formValues = form.watch();

  // Auto-calculate fields when dependencies change
  useMemo(() => {
    if (!template) return;

    template.fields.forEach((field) => {
      if (field.autoCalculate) {
        const calculatedValue = calculateFieldValue(field, formValues);
        if (calculatedValue !== undefined && formValues[field.name] !== calculatedValue) {
          form.setValue(field.name, calculatedValue);
        }
      }
    });
  }, [formValues, template, form]);

  // Auto-populate PAYE Reference and Sponsor License Number when company changes
  useEffect(() => {
    const selectedCompanyId = formValues.companyId;
    if (!selectedCompanyId) return;

    const selectedCompany = companies.find(c => c.id === selectedCompanyId);
    if (!selectedCompany) return;

    // Auto-fill PAYE Reference from SL Issuance data (resets on company change)
    if (selectedCompany.slPayeReference) {
      form.setValue('payeReference', selectedCompany.slPayeReference);
    } else {
      form.setValue('payeReference', '');
    }
    
    // Auto-fill Sponsor License Number if employee is sponsored AND company has SL
    const isSponsored = formValues.isSponsored === "true" || formValues.isSponsored === true;
    if (isSponsored && selectedCompany.slLicenseNumber) {
      form.setValue('sponsorLicenseNumber', selectedCompany.slLicenseNumber);
    } else if (isSponsored) {
      form.setValue('sponsorLicenseNumber', '');
    }
  }, [formValues.companyId, formValues.isSponsored, companies, form]);

  // Auto-set working days based on preset selection
  useEffect(() => {
    const preset = formValues.workingDaysPreset;
    
    if (preset === "mon-fri") {
      // Set working days to Monday-Friday
      form.setValue('workingDays', ["monday", "tuesday", "wednesday", "thursday", "friday"]);
    }
    // If preset is "custom", user manually selects days (no auto-setting needed)
  }, [formValues.workingDaysPreset, form]);

  // Auto-calculate working hours and times
  useEffect(() => {
    const weeklyHours = parseFloat(formValues.weeklyHours) || 0;
    const startingTime = formValues.startingWorkingTime || "09:00";
    const workingDays = formValues.workingDays || ["monday", "tuesday", "wednesday", "thursday", "friday"];
    const numberOfWorkingDays = Array.isArray(workingDays) ? workingDays.length : 5;

    console.log("[Auto-calc] weeklyHours:", weeklyHours, "startingTime:", startingTime, "workingDays:", numberOfWorkingDays);

    if (weeklyHours > 0 && numberOfWorkingDays > 0) {
      // Calculate daily working hours: weeklyHours / number of working days
      const dailyHours = weeklyHours / numberOfWorkingDays;
      form.setValue('dailyWorkingHours', dailyHours);

      // Calculate ending working time: startingTime + dailyHours + 1 hour rest
      try {
        const [startHour, startMinute] = startingTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const dailyMinutes = dailyHours * 60;
        const restMinutes = 60; // 1 hour rest
        const endTotalMinutes = startTotalMinutes + dailyMinutes + restMinutes;
        
        const endHour = Math.floor(endTotalMinutes / 60) % 24;
        const endMinute = Math.floor(endTotalMinutes % 60);
        const endingTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
        
        console.log("[Auto-calc] Calculated dailyHours:", dailyHours, "endingTime:", endingTime);
        form.setValue('endingWorkingTime', endingTime);
      } catch (e) {
        console.error("[Auto-calc] Error calculating ending time:", e);
        // If time parsing fails, set to empty
        form.setValue('endingWorkingTime', '');
      }
    } else {
      form.setValue('dailyWorkingHours', undefined);
      form.setValue('endingWorkingTime', '');
    }
  }, [formValues.weeklyHours, formValues.startingWorkingTime, formValues.workingDays, form]);

  // Save employee mutation
  const saveEmployeeMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      console.log("[Add Employee Wizard] Mutation started with data:", data);
      
      // Check session before submitting - prevents "Authentication required" errors
      const authCheck = await fetch("/api/auth/me", { credentials: "include" });
      const authData = await authCheck.json();
      if (!authData.user) {
        throw new Error("Your session has expired. Please log in again and retry.");
      }
      
      // Get company name for the employee record
      const company = companies.find(c => c.id === data.companyId);
      const companyName = company?.name || "Unknown Company";
      
      // Calculate working hours and times
      const weeklyHours = parseFloat(data.weeklyHours) || 0;
      const startingTime = data.startingWorkingTime || "09:00";
      const workingDays = data.workingDays || ["monday", "tuesday", "wednesday", "thursday", "friday"];
      const numberOfWorkingDays = Array.isArray(workingDays) ? workingDays.length : 5;
      
      let dailyWorkingHours: number | undefined = undefined;
      let endingWorkingTime: string | undefined = undefined;
      
      if (weeklyHours > 0 && numberOfWorkingDays > 0) {
        // Calculate daily working hours: weeklyHours / number of working days
        dailyWorkingHours = weeklyHours / numberOfWorkingDays;
        
        // Calculate ending working time: startingTime + dailyWorkingHours + 1 hour rest
        try {
          const [startHour, startMinute] = startingTime.split(':').map(Number);
          const startTotalMinutes = startHour * 60 + startMinute;
          const dailyMinutes = dailyWorkingHours * 60;
          const restMinutes = 60; // 1 hour rest
          const endTotalMinutes = startTotalMinutes + dailyMinutes + restMinutes;
          
          const endHour = Math.floor(endTotalMinutes / 60) % 24;
          const endMinute = Math.floor(endTotalMinutes % 60);
          endingWorkingTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;
          
          console.log("[Save Employee] weeklyHours:", weeklyHours, "dailyWorkingHours:", dailyWorkingHours, "startingTime:", startingTime, "endingTime:", endingWorkingTime);
        } catch (e) {
          console.error("[Save Employee] Error calculating ending time:", e);
          endingWorkingTime = undefined;
        }
      }
      
      const employee: EmployeeRecord = {
        id: idGenerator.generateEmployeeID(),
        templateId: template?.id || "",
        templateVersion: template?.version || 1,
        
        // Basic Details
        firstName: data.firstName,
        middleNames: data.middleNames,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth,
        personalMobile: data.personalMobile,
        personalEmail: data.personalEmail,
        
        // Address
        ukAddress: data.ukAddress,
        ukAddressProvideLater: data.ukAddressProvideLater,
        overseasAddress: data.overseasAddress,
        ukBankAddress: data.ukBankAddress,
        ukBankAddressProvideLater: data.ukBankAddressProvideLater,
        nationalInsurance: data.nationalInsurance,
        nationalInsuranceProvideLater: data.nationalInsuranceProvideLater,
        googleDriveLink: data.googleDriveLink,
        
        // Emergency Contact
        emergencyContactName: data.emergencyContactName,
        emergencyContactRelationship: data.emergencyContactRelationship,
        emergencyContactPhone: data.emergencyContactPhone,
        
        // Employment Details
        companyId: data.companyId,
        companyName: companyName,
        department: data.department,
        workLocation: data.workLocation,
        workLocationSource: data.workLocationSource,
        lineManager: data.lineManager,
        jobTitle: data.jobTitle,
        jobDescription: data.jobDescription,
        contractType: data.contractType || "permanent",
        startDate: data.startDate,
        endDate: data.endDate,
        workingDays: workingDays,
        weeklyHours: weeklyHours,
        dailyWorkingHours: dailyWorkingHours,
        startingWorkingTime: startingTime,
        endingWorkingTime: endingWorkingTime,
        breakMinutes: data.breakMinutes ? parseFloat(data.breakMinutes) : 60,
        vacationDays: data.vacationDays ? parseFloat(data.vacationDays) : undefined,
        salary: parseFloat(data.salary) || 0,
        hourlyRate: data.hourlyRate ? parseFloat(data.hourlyRate) : undefined,
        payeReference: data.payeReference,
        
        // Immigration Status
        immigrationStatus: data.immigrationStatus || "british",
        isSponsored: data.isSponsored === "true" || data.isSponsored === true,
        
        // Passport Details
        passportNumber: data.passportNumber,
        passportExpiry: data.passportExpiry,
        brpShareCode: data.brpShareCode,
        
        // Visa/Sponsorship Details
        visaType: data.visaType,
        cosNumber: data.cosNumber,
        sponsorLicenseNumber: data.sponsorLicenseNumber,
        visaIssueDate: data.visaIssueDate,
        visaExpiryDate: data.visaExpiryDate,
        
        // Right to Work Details
        rtwBasis: data.rtwBasis,
        rtwCheckDate: data.rtwCheckDate,
        rtwEvidenceType: data.rtwEvidenceType,
        rtwExpiryDate: data.rtwExpiryDate,
        rtwExpiryIndefinite: data.rtwExpiryIndefinite === "true" || data.rtwExpiryIndefinite === true || false,
        rtwShareCode: data.rtwShareCode,
        
        // Document Verification
        docPassportCopy: data.docPassportCopy === "true" || data.docPassportCopy === true || false,
        docGraduationCertCopy: data.docGraduationCertCopy === "true" || data.docGraduationCertCopy === true || false,
        docProofOfAddressCopy: data.docProofOfAddressCopy === "true" || data.docProofOfAddressCopy === true || false,
        docRtwCopy: data.docRtwCopy === "true" || data.docRtwCopy === true || false,
        docCosCopy: data.docCosCopy === "true" || data.docCosCopy === true || false,
        docVisaCopy: data.docVisaCopy === "true" || data.docVisaCopy === true || false,
        
        // Compliance & Status
        probationPeriod: parseFloat(data.probationPeriod) || 3,
        probationEndDate: data.probationEndDate,
        status: data.status || "onboarding",
        ukviReportingNotes: data.ukviReportingNotes,
        
        // Documents
        documents: [],
        
        // Generated Tasks
        generatedTaskIds: [],
        
        // All form responses
        formData: data,
        
        // Residency Service (optional fields)
        isResidencyService: false,
        residencyLog: [],
        
        // Activity Log
        activityLog: [],
        
        // Metadata
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("[Add Employee Wizard] Saving employee to database:", employee);
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(employee),
      });

      if (!response.ok) {
        // Try to get detailed error message from response
        let errorMessage = "Failed to save employee to database";
        try {
          const errorData = await response.json();
          if (errorData.details && Array.isArray(errorData.details)) {
            // Zod validation errors
            const fieldErrors = errorData.details.map((err: any) => {
              const field = err.path?.join('.') || 'unknown';
              return `${field}: ${err.message}`;
            }).join('; ');
            errorMessage = `Validation failed: ${fieldErrors}`;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          // If we can't parse the error, use the default message
          console.error("[Add Employee Wizard] Failed to parse error response:", parseError);
        }
        console.error("[Add Employee Wizard] Server error response:", errorMessage);
        throw new Error(errorMessage);
      }

      const savedEmployee = await response.json();
      console.log("[Add Employee Wizard] Employee saved successfully:", savedEmployee);

      // Use the server-assigned ID for task generation (DB generates UUID, not the client ID)
      const employeeWithDbId = { ...employee, id: savedEmployee.id };

      // Employee creation succeeded - now try to generate tasks (but don't fail if this errors)
      let allGeneratedTasks: EmployeeTask[] = [];
      let taskGenerationErrors: string[] = [];

      try {
        // Fetch existing tasks to avoid duplicates
        const existingTasksResponse = await fetch("/api/employee-tasks", {
          credentials: "include",
        });
        const existingTasks = existingTasksResponse.ok ? await existingTasksResponse.json() : [];

        // Generate and save employee tasks
        try {
          const { generatedTasks, skippedDuplicates } = generateEmployeeTasks(employeeWithDbId, existingTasks);
          if (generatedTasks.length > 0) {
            await saveGeneratedTasks(employeeWithDbId, generatedTasks);
            allGeneratedTasks.push(...generatedTasks);
          }
        } catch (taskError) {
          console.error("[Add Employee Wizard] Error generating employee tasks:", taskError);
          taskGenerationErrors.push("Some employee tasks could not be created");
        }

        // Generate and save HR template tasks
        try {
          const hrTasksResult = generateHRTemplateTasks(employeeWithDbId, existingTasks);
          if (hrTasksResult.generatedTasks.length > 0) {
            await saveGeneratedTasks(employeeWithDbId, hrTasksResult.generatedTasks);
            allGeneratedTasks.push(...hrTasksResult.generatedTasks);
          }
        } catch (taskError) {
          console.error("[Add Employee Wizard] Error generating HR tasks:", taskError);
          taskGenerationErrors.push("Some HR tasks could not be created");
        }
        
        // Generate attendance records from start date to yesterday
        try {
          const holidays = localStorageService.getHolidays();
          const attendanceRecords = generateAttendanceRecordsForEmployee(employeeWithDbId, holidays);
          if (attendanceRecords.length > 0) {
            localStorageService.addAttendanceRecordsBulk(attendanceRecords);
            console.log(`[Add Employee Wizard] Generated ${attendanceRecords.length} attendance records`);
          }
        } catch (attendanceError) {
          console.error("[Add Employee Wizard] Error generating attendance records:", attendanceError);
        }
      } catch (error) {
        console.error("[Add Employee Wizard] Error in task generation process:", error);
        taskGenerationErrors.push("Task generation encountered errors");
      }
      
      // Return employee and tasks for confirmation dialog
      return { 
        employee, 
        generatedTasks: allGeneratedTasks,
        taskGenerationErrors 
      };
    },
    onSuccess: (data) => {
      console.log("[Add Employee Wizard] Mutation success, data:", data);
      
      // Clear validation errors
      setValidationError(null);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employee-tasks"] });
      
      // Set data for confirmation dialog
      setCreatedEmployee(data.employee);
      setCreatedTasks(data.generatedTasks);
      setShowConfirmation(true);
      
      // Show success message
      const employeeName = `${data.employee.firstName} ${data.employee.lastName}`;
      const tasksGenerated = data.generatedTasks.length;
      
      if (data.taskGenerationErrors && data.taskGenerationErrors.length > 0) {
        // Employee created but some tasks failed
        toast({
          title: "✅ Employee Added Successfully!",
          description: `${employeeName} has been added to the system. ${tasksGenerated} tasks were generated. Note: ${data.taskGenerationErrors.join(", ")}`,
          duration: 6000,
        });
      } else {
        // Complete success
        toast({
          title: "✅ Employee Added Successfully!",
          description: `${employeeName} has been added to the system with ${tasksGenerated} automated tasks generated.`,
          duration: 5000,
        });
      }
      
      // Reset form
      form.reset();
      setCurrentStep(1);
    },
    onError: (error) => {
      console.error("[Add Employee Wizard] Mutation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to add employee. Please try again.";
      setValidationError(errorMessage);
      toast({
        title: "Error Adding Employee",
        description: errorMessage,
        variant: "destructive",
      });
      // Scroll to top to show the error alert
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  // Save draft mutation - minimal validation
  const saveDraftMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      console.log("[Save Draft] Saving draft employee:", data);
      
      // Check session before submitting - prevents "Authentication required" errors
      const authCheck = await fetch("/api/auth/me", { credentials: "include" });
      const authData = await authCheck.json();
      if (!authData.user) {
        throw new Error("Your session has expired. Please log in again and retry.");
      }
      
      // Minimal draft employee object
      const draftEmployee = {
        id: idGenerator.generateEmployeeID(),
        templateId: template?.id || "",
        templateVersion: template?.version || 1,
        isDraft: true,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        // Optional fields - save whatever is filled in
        middleNames: data.middleNames,
        dateOfBirth: data.dateOfBirth,
        personalMobile: data.personalMobile,
        personalEmail: data.personalEmail,
        overseasAddress: data.overseasAddress,
        ukAddress: data.ukAddress,
        emergencyContactName: data.emergencyContactName,
        emergencyContactRelationship: data.emergencyContactRelationship,
        emergencyContactPhone: data.emergencyContactPhone,
        companyId: data.companyId,
        companyName: data.companyId ? companies.find(c => c.id === data.companyId)?.name : undefined,
        jobTitle: data.jobTitle,
        contractType: data.contractType,
        startDate: data.startDate,
        weeklyHours: data.weeklyHours ? parseFloat(data.weeklyHours) : undefined,
        salary: data.salary ? parseFloat(data.salary) : undefined,
        immigrationStatus: data.immigrationStatus,
        googleDriveLink: data.googleDriveLink,
        status: "onboarding",
        formData: data,
        documents: [],
        generatedTaskIds: [],
        isResidencyService: false,
        residencyLog: [],
        activityLog: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      console.log("[Save Draft] Draft employee object:", draftEmployee);
      
      const response = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(draftEmployee),
      });

      if (!response.ok) {
        let errorMessage = "Failed to save draft employee";
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error("[Save Draft] Failed to parse error response:", parseError);
        }
        console.error("[Save Draft] Server error response:", errorMessage);
        throw new Error(errorMessage);
      }

      const savedEmployee = await response.json();
      console.log("[Save Draft] Draft employee saved successfully:", savedEmployee);
      return savedEmployee;
    },
    onSuccess: (savedEmployee) => {
      console.log("[Save Draft] Success:", savedEmployee);
      setValidationError(null);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      
      const employeeName = `${savedEmployee.firstName} ${savedEmployee.lastName}`;
      toast({
        title: "✅ Draft Saved Successfully!",
        description: `${employeeName} has been saved as a draft. You can complete it later from the employee list.`,
        duration: 5000,
      });
      
      // Reset form
      form.reset();
      setCurrentStep(1);
    },
    onError: (error) => {
      console.error("[Save Draft] Error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to save draft. Please try again.";
      setValidationError(errorMessage);
      toast({
        title: "Error Saving Draft",
        description: errorMessage,
        variant: "destructive",
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  // Create mapping from field ID to field name
  const fieldIdToNameMap = useMemo(() => {
    if (!template) return {};
    return template.fields.reduce((acc, field) => {
      acc[field.id] = field.name;
      return acc;
    }, {} as Record<string, string>);
  }, [template]);

  if (!template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const currentStepConfig = template.steps.find((s) => s.order === currentStep);
  const stepFields = template.fields
    .filter((f) => f.step === currentStep)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const visibleFields = stepFields.filter((field) => isFieldVisible(field, formValues, fieldIdToNameMap));

  const handleNext = async () => {
    // Get current form values
    const currentValues = form.getValues();
    
    // Validate current step's required visible fields
    const requiredFields = visibleFields
      .filter((f) => f.type !== "section_header" && f.type !== "info_text" && f.required)
      .map((f) => f.name);

    console.log("[handleNext] Validating fields:", requiredFields);
    console.log("[handleNext] Current values:", currentValues);

    // Check if required fields are filled
    const errors: Record<string, { message: string }> = {};
    let hasErrors = false;

    requiredFields.forEach((fieldName) => {
      const value = currentValues[fieldName];
      // Handle different types: strings, numbers, arrays
      const isEmpty = value === "" || value === null || value === undefined || 
                     (typeof value === 'string' && value.trim() === "");
      
      console.log(`[handleNext] Field ${fieldName}: value="${value}", isEmpty=${isEmpty}`);
      
      if (isEmpty) {
        const field = visibleFields.find(f => f.name === fieldName);
        errors[fieldName] = { message: `${field?.label || fieldName} is required` };
        form.setError(fieldName as any, {
          type: "manual",
          message: `${field?.label || fieldName} is required`,
        });
        hasErrors = true;
      }
    });

    if (!hasErrors) {
      console.log("[handleNext] Validation passed, moving to next step");
      // Clear any previous errors
      requiredFields.forEach((fieldName) => {
        form.clearErrors(fieldName as any);
      });
      
      if (currentStep < template.steps.length) {
        setCurrentStep(currentStep + 1);
      }
    } else {
      console.log("[handleNext] Validation failed, errors:", errors);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle "Save for Later" button click
  const handleSaveForLater = () => {
    const currentValues = form.getValues();
    
    // Minimal validation - just check first and last name
    if (!currentValues.firstName || !currentValues.lastName) {
      toast({
        title: "Missing Required Fields",
        description: "Please enter at least the employee's first name and last name to save as draft.",
        variant: "destructive",
      });
      return;
    }
    
    // Save as draft
    saveDraftMutation.mutate(currentValues);
  };

  const onSubmit = (data: Record<string, any>) => {
    console.log("============================================");
    console.log("[Add Employee Wizard] FORM SUBMIT TRIGGERED");
    console.log("[Add Employee Wizard] Current step:", currentStep);
    console.log("[Add Employee Wizard] Form data:", data);
    console.log("[Add Employee Wizard] Form errors:", form.formState.errors);
    console.log("============================================");
    
    // Clear any previous validation errors
    setValidationError(null);
    
    // Validate ALL required visible fields across ALL steps before final submission
    const allRequiredFields = template?.fields
      .filter((f) => {
        // Check if field is visible based on conditional rules
        const isVisible = isFieldVisible(f, data, fieldIdToNameMap);
        // Only include visible required fields (not section headers or info text)
        const isRequiredField = isVisible && f.required && f.type !== "section_header" && f.type !== "info_text";
        
        if (isRequiredField) {
          console.log(`[Validation] Required field: ${f.name} (${f.label}) - Value:`, data[f.name]);
        }
        
        return isRequiredField;
      })
      .map((f) => ({ name: f.name, label: f.label })) || [];

    console.log(`[Validation] Total required fields to check: ${allRequiredFields.length}`);

    // Check for empty required fields
    const missingFields: string[] = [];
    allRequiredFields.forEach(({ name, label }) => {
      const value = data[name];
      const isEmpty = value === "" || value === null || value === undefined;
      
      if (isEmpty) {
        console.log(`[Validation] MISSING FIELD: ${name} (${label})`);
        missingFields.push(label);
        form.setError(name as any, {
          type: "manual",
          message: `${label} is required`,
        });
      }
    });

    if (missingFields.length > 0) {
      console.log(`[Validation] FAILED - ${missingFields.length} missing fields:`, missingFields);
      const errorMessage = `Please fill in the following required fields: ${missingFields.join(", ")}`;
      setValidationError(errorMessage);
      toast({
        title: "Missing Required Fields",
        description: errorMessage,
        variant: "destructive",
      });
      // Scroll to top to show the error alert
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return; // Don't submit
    }

    // Auto-set RTW expiry date if mode is "auto" and visa expiry date exists
    if (data.rtwExpiryDateMode === "auto" && data.visaExpiryDate) {
      data.rtwExpiryDate = data.visaExpiryDate;
      console.log("[Add Employee Wizard] Auto-set RTW expiry date to match visa expiry:", data.visaExpiryDate);
    }

    // All validation passed, proceed with submission
    console.log("[Validation] PASSED - Calling mutation...");
    console.log("============================================");
    saveEmployeeMutation.mutate(data);
  };

  // Export employee confirmation as PDF (simple text format)
  const exportToPDF = () => {
    if (!createdEmployee) return;
    
    const content = `
EMPLOYEE CONFIRMATION
=====================

Employee Details:
-----------------
Name: ${createdEmployee.firstName} ${createdEmployee.lastName}
Email: ${createdEmployee.personalEmail}
Mobile: ${createdEmployee.personalMobile}
Date of Birth: ${createdEmployee.dateOfBirth}

Company: ${createdEmployee.companyName}
Job Title: ${createdEmployee.jobTitle}
${createdEmployee.jobDescription ? `Job Description: ${createdEmployee.jobDescription}` : ''}
Department: ${createdEmployee.department || 'N/A'}
Contract Type: ${createdEmployee.contractType}
Start Date: ${createdEmployee.startDate}
Salary: £${createdEmployee.salary}

Immigration Status: ${createdEmployee.immigrationStatus}
${createdEmployee.isSponsored ? 'Sponsored: Yes' : ''}

Generated Tasks (${createdTasks.length}):
${'='.repeat(40)}
${createdTasks.map((task, idx) => `
${idx + 1}. ${task.title}
   Type: ${task.taskType}
   Priority: ${task.priority}
   Due: ${format(new Date(task.dueAt), 'dd/MM/yyyy')}
   ${task.description ? `Description: ${task.description}` : ''}
`).join('\n')}

Generated on: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
    `.trim();
    
    // Create a blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${createdEmployee.firstName}_${createdEmployee.lastName}_confirmation.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported",
      description: "Employee confirmation exported successfully",
    });
  };
  
  const closeConfirmation = () => {
    setShowConfirmation(false);
    setCreatedEmployee(null);
    setCreatedTasks([]);
    form.reset();
    setCurrentStep(1);
  };

  // Generate random dummy data for testing
  const fillDummyData = () => {
    const firstNames = ["John", "Emma", "Michael", "Sarah", "David", "Sophie", "James", "Emily", "Daniel", "Olivia"];
    const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];
    const randomFirst = firstNames[Math.floor(Math.random() * firstNames.length)];
    const randomLast = lastNames[Math.floor(Math.random() * lastNames.length)];
    const randomId = Math.floor(Math.random() * 1000);
    
    // Get selected company or default to first
    const selectedCompany = companies[0];

    const dummyData: Record<string, any> = {
      firstName: randomFirst,
      middleNames: "",
      lastName: randomLast,
      dateOfBirth: "1990-05-15",
      personalMobile: `07${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      personalEmail: `${randomFirst.toLowerCase()}.${randomLast.toLowerCase()}${randomId}@example.com`,
      ukAddressProvideLater: "providing_now",
      ukAddress: `${Math.floor(Math.random() * 200)} High Street, London, SE1 ${Math.floor(Math.random() * 9)}AA`,
      overseasAddress: `${Math.floor(Math.random() * 100)} Main Street, New York, NY 10001, USA`,
      ukBankDetailsProvideLater: "providing_now",
      emergencyContactName: `Emergency Contact ${randomLast}`,
      nationality: "United Kingdom",
      passportNumber: `P${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      passportExpiry: format(addYears(new Date(), 5), "yyyy-MM-dd"),
      emergencyContactRelationship: ["Spouse", "Parent", "Sibling", "Friend"][Math.floor(Math.random() * 4)],
      emergencyContactPhone: `07${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
      companyId: selectedCompany?.id || "",
      workLocation: selectedCompany?.address || "123 Business Park, London, EC1A 1BB",
      workLocationSource: "companies_house",
      lineManager: "John Manager",
      department: ["business_development", "marketing_sales_export", "administration", "hr", "finance", "technical"][Math.floor(Math.random() * 6)],
      jobTitle: ["Software Engineer", "Marketing Manager", "Sales Executive", "HR Specialist", "Accountant", "Technical Lead"][Math.floor(Math.random() * 6)],
      jobDescription: "Responsible for managing day-to-day operations and contributing to team success.",
      contractType: ["permanent", "fixed_term", "contractor"][Math.floor(Math.random() * 3)],
      startDate: format(new Date(), "yyyy-MM-dd"),
      weeklyHours: "40",
      workingDaysPreset: "mon-fri",
      workingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
      startingWorkingTime: "09:00",
      breakMinutes: "60",
      salary: `${30000 + Math.floor(Math.random() * 50000)}`,
      nationalInsuranceProvideLater: "providing_now",
      nationalInsurance: `AB${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}C`,
      googleDriveLink: `https://drive.google.com/drive/folders/${randomId}`,
      immigrationStatus: ["british", "settled", "other"][Math.floor(Math.random() * 3)],
      probationPeriod: "3",
      status: "onboarding",
      // Document verification checkboxes
      docPassportCopy: true,
      docGraduationCertCopy: true,
      docProofOfAddressCopy: true,
      docRtwCopy: true,
      docCosCopy: false,
      docVisaCopy: false,
    };
    
    // Fill all fields with dummy data
    Object.keys(dummyData).forEach(key => {
      form.setValue(key, dummyData[key]);
    });

    // Set workLocation after a tick to ensure companyId-related effects have settled
    if (selectedCompany?.address) {
      setTimeout(() => {
        form.setValue("workLocation", selectedCompany.address);
        form.setValue("workLocationSource", "companies_house");
        console.log("[DummyData] workLocation set via timeout:", form.getValues("workLocation"));
      }, 100);
    }

    toast({
      title: "Dummy Data Loaded",
      description: "Form filled with random test data. You can modify any field before submitting.",
    });
  };

  const renderField = (field: TemplateField) => {
    const isDisabled = !isFieldEnabled(field, formValues, fieldIdToNameMap);

    if (field.type === "section_header") {
      return (
        <div key={field.id} className="col-span-2">
          <h3 className="text-base font-semibold text-foreground">{field.label}</h3>
          <Separator className="mt-2" />
        </div>
      );
    }

    if (field.type === "info_text") {
      return (
        <div key={field.id} className="col-span-2 flex items-start gap-2 rounded-md bg-muted p-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-sm text-muted-foreground">{field.label}</p>
        </div>
      );
    }

    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem className={field.width === "half" ? "" : "col-span-2"}>
            <FormLabel>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              {field.type === "text" || field.type === "email" || field.type === "tel" || field.type === "number" ? (
                <Input
                  {...formField}
                  value={formField.value ?? ""}
                  type={field.type}
                  placeholder={field.placeholder}
                  disabled={isDisabled || field.autoCalculate !== undefined}
                  data-testid={`input-${field.name}`}
                />
              ) : field.type === "date" ? (
                <Input
                  {...formField}
                  value={formField.value ?? ""}
                  type="date"
                  disabled={isDisabled || field.autoCalculate !== undefined}
                  data-testid={`input-${field.name}`}
                />
              ) : field.type === "textarea" ? (
                <Textarea
                  {...formField}
                  value={formField.value ?? ""}
                  placeholder={field.placeholder}
                  disabled={isDisabled}
                  rows={3}
                  maxLength={field.maxLength}
                  data-testid={`textarea-${field.name}`}
                />
              ) : field.type === "select" ? (
                <Select
                  onValueChange={(value) => {
                    if (field.name === "workLocation") {
                      try {
                        const parsed = JSON.parse(value);
                        formField.onChange(parsed.address);
                        form.setValue("workLocationSource", parsed.source);
                      } catch {
                        formField.onChange(value);
                      }
                    } else {
                      formField.onChange(value);
                    }
                  }}
                  value={field.name === "workLocation" && formField.value && formValues.workLocationSource
                    ? JSON.stringify({ address: formField.value, source: formValues.workLocationSource })
                    : (formField.value || "")
                  }
                  disabled={isDisabled}
                >
                  <SelectTrigger data-testid={`select-${field.name}`}>
                    <SelectValue placeholder={field.placeholder || "Select..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.name === "companyId" ? (
                      companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))
                    ) : field.name === "workLocation" ? (
                      (() => {
                        const selectedCompany = companies.find(c => c.id === formValues.companyId);
                        if (!selectedCompany) {
                          return (
                            <SelectItem value="__no_company__" disabled>
                              Please select a company first
                            </SelectItem>
                          );
                        }
                        
                        const options = [];
                        
                        // Add Company Registered Address
                        if (selectedCompany.address) {
                          options.push(
                            <SelectItem 
                              key="registered" 
                              value={JSON.stringify({ address: selectedCompany.address, source: "companies_house" })}
                              data-testid="select-item-company-address"
                            >
                              Company Registered Address: {selectedCompany.address}
                            </SelectItem>
                          );
                        }
                        
                        // Add SL Work Address
                        if (selectedCompany.slWorkAddress) {
                          options.push(
                            <SelectItem 
                              key="sl-work" 
                              value={JSON.stringify({ address: selectedCompany.slWorkAddress, source: "sl_section" })}
                              data-testid="select-item-sl-work-address"
                            >
                              SL Work Address: {selectedCompany.slWorkAddress}
                            </SelectItem>
                          );
                        }
                        
                        if (options.length === 0) {
                          return (
                            <SelectItem value="__no_address__" disabled>
                              No work addresses available for this company
                            </SelectItem>
                          );
                        }
                        
                        return options;
                      })()
                    ) : (
                      field.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              ) : field.type === "radio" ? (
                <RadioGroup
                  onValueChange={formField.onChange}
                  value={formField.value}
                  disabled={isDisabled}
                >
                  <div className="flex flex-col space-y-2">
                    {field.options?.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`${field.name}-${option.value}`} />
                        <label htmlFor={`${field.name}-${option.value}`} className="text-sm">
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              ) : field.type === "checkbox" ? (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={formField.value}
                    onCheckedChange={formField.onChange}
                    disabled={isDisabled}
                    data-testid={`checkbox-${field.name}`}
                  />
                  <label className="text-sm">{field.helperText}</label>
                </div>
              ) : field.type === "checkbox_group" ? (
                <div className="flex flex-col space-y-3">
                  {field.options?.map((option) => {
                    const currentValues = Array.isArray(formField.value) ? formField.value : [];
                    const isChecked = currentValues.includes(option.value);
                    
                    return (
                      <div key={option.value} className="flex items-center space-x-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => {
                            const newValues = checked
                              ? [...currentValues, option.value]
                              : currentValues.filter((v) => v !== option.value);
                            formField.onChange(newValues);
                          }}
                          disabled={isDisabled}
                          data-testid={`checkbox-${field.name}-${option.value}`}
                        />
                        <label htmlFor={`${field.name}-${option.value}`} className="text-sm">
                          {option.label}
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Input {...formField} value={formField.value ?? ""} disabled={isDisabled} />
              )}
            </FormControl>
            {field.helperText && field.type !== "checkbox" && field.type !== "checkbox_group" && (
              <FormDescription>{field.helperText}</FormDescription>
            )}
            {field.autoCalculate && (
              <FormDescription className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Auto-calculated
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
                <UserPlus className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Add New Employee</CardTitle>
                <CardDescription>Multi-step wizard for employee onboarding</CardDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fillDummyData}
              className="flex items-center gap-2"
              data-testid="button-dummy-data"
            >
              <Sparkles className="h-4 w-4" />
              Dummy Data
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="flex items-center justify-between mb-6">
            {template.steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                      currentStep > step.order
                        ? "bg-primary border-primary text-primary-foreground"
                        : currentStep === step.order
                        ? "border-primary text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.order ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-semibold">{step.order}</span>
                    )}
                  </div>
                  <p className="text-xs mt-1 text-center max-w-[100px] hidden md:block">
                    {step.title}
                  </p>
                </div>
                {index < template.steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step.order ? "bg-primary" : "bg-muted-foreground/30"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Current step form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Validation Error Alert */}
              {validationError && (
                <Alert variant="destructive" data-testid="alert-validation-error">
                  <AlertTitle className="flex items-center gap-2">
                    <X className="h-4 w-4" />
                    Validation Error
                  </AlertTitle>
                  <AlertDescription>
                    {validationError}
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Loading State Alert */}
              {saveEmployeeMutation.isPending && (
                <Alert data-testid="alert-saving">
                  <AlertTitle className="flex items-center gap-2">
                    <Info className="h-4 w-4 animate-pulse" />
                    Saving Employee
                  </AlertTitle>
                  <AlertDescription>
                    Please wait while we save the employee and generate tasks...
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    {currentStepConfig?.title}
                  </h3>
                  {currentStepConfig?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {currentStepConfig.description}
                    </p>
                  )}
                </div>
                <Separator className="mb-6" />
                <div className="grid grid-cols-2 gap-6">
                  {visibleFields.map(renderField)}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  data-testid="button-back"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleSaveForLater}
                    disabled={saveDraftMutation.isPending || saveEmployeeMutation.isPending}
                    data-testid="button-save-for-later"
                  >
                    {saveDraftMutation.isPending ? "Saving..." : "Save for Later"}
                  </Button>
                  
                  {currentStep < template.steps.length ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      data-testid="button-next"
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={saveEmployeeMutation.isPending}
                      data-testid="button-submit"
                    >
                      {saveEmployeeMutation.isPending ? "Saving..." : "Add Employee"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Employee Successfully Added
            </DialogTitle>
            <DialogDescription>
              The employee has been added and {createdTasks.length} task(s) have been generated.
            </DialogDescription>
          </DialogHeader>

          {createdEmployee && (
            <div className="space-y-6">
              {/* Employee Details */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">Employee Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{createdEmployee.firstName} {createdEmployee.lastName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{createdEmployee.personalEmail}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Company:</span>
                    <p className="font-medium">{createdEmployee.companyName}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Job Title:</span>
                    <p className="font-medium">{createdEmployee.jobTitle}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Start Date:</span>
                    <p className="font-medium">{format(new Date(createdEmployee.startDate), 'dd/MM/yyyy')}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline">{createdEmployee.status}</Badge>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Generated Tasks */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  Generated Tasks ({createdTasks.length})
                </h3>
                {createdTasks.length > 0 ? (
                  <div className="space-y-2">
                    {createdTasks.map((task, idx) => (
                      <div key={task.id} className="rounded-md border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{idx + 1}. {task.title}</p>
                            {task.description && (
                              <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                            )}
                          </div>
                          <Badge 
                            variant={task.priority === "urgent" ? "destructive" : task.priority === "high" ? "default" : "secondary"}
                          >
                            {task.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Type: {task.taskType.replace(/_/g, ' ')}</span>
                          <span>Due: {format(new Date(task.dueAt), 'dd/MM/yyyy')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No tasks generated for this employee.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportToPDF}
              className="flex items-center gap-2"
              data-testid="button-export-pdf"
            >
              <FileDown className="h-4 w-4" />
              Export as Text
            </Button>
            <Button
              onClick={closeConfirmation}
              data-testid="button-close-confirmation"
            >
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
