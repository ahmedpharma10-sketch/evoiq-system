import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type { ResidencyTaskTemplate } from "@shared/schema";
import { Plus, Pencil, Trash2, Calendar, Download, Upload, RefreshCw } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DateTime } from "luxon";
import { generateResidencyTemplateTasks, saveGeneratedTasks } from "@/lib/utils/employeeTaskGenerator";
import type { EmployeeRecord } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";

export function ResidencyTaskManager() {
  const { toast } = useToast();

  // Fetch Residency Task Templates from API
  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery<ResidencyTaskTemplate[]>({
    queryKey: ["/api", "residency-task-templates"],
  });

  // Fetch last residency task generation timestamp
  const { data: lastGenerationData } = useQuery<{ timestamp: string | null }>({
    queryKey: ["/api", "residency-tasks", "last-generation"],
  });

  // Residency Task Generation Mutation
  const generateResidencyTasksMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/residency-tasks/generate", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Residency Tasks Generated",
        description: `Created ${data.tasksCreated} new tasks, ${data.tasksSkipped} already existed`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api", "employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "residency-tasks", "last-generation"] });
    },
    onError: (error) => {
      toast({
        title: "Error Generating Tasks",
        description: error instanceof Error ? error.message : "Failed to generate residency tasks",
        variant: "destructive",
      });
    },
  });

  // Create Residency Task Template Mutation
  const createResidencyTemplate = useMutation({
    mutationFn: async (template: Omit<ResidencyTaskTemplate, "id" | "createdAt">) => {
      return await apiRequest("POST", "/api/residency-task-templates", template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "residency-task-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Template",
        description: error instanceof Error ? error.message : "Failed to create residency task template",
        variant: "destructive",
      });
    },
  });

  // Update Residency Task Template Mutation
  const updateResidencyTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ResidencyTaskTemplate> }) => {
      return await apiRequest("PATCH", `/api/residency-task-templates/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "residency-task-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Template",
        description: error instanceof Error ? error.message : "Failed to update residency task template",
        variant: "destructive",
      });
    },
  });

  // Delete Residency Task Template Mutation
  const deleteResidencyTemplate = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/residency-task-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "residency-task-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Template",
        description: error instanceof Error ? error.message : "Failed to delete residency task template",
        variant: "destructive",
      });
    },
  });

  // Form State
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<"one_time" | "weekly" | "monthly" | "quarterly" | "annually">("one_time");
  const [newTaskStartDateMode, setNewTaskStartDateMode] = useState<"manual" | "offset_days">("offset_days");
  const [newTaskStartDate, setNewTaskStartDate] = useState("");
  const [newTaskOffsetDays, setNewTaskOffsetDays] = useState("0");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newTaskApplicantType, setNewTaskApplicantType] = useState<"main_only" | "main_and_dependants">("main_only");
  const [editingTemplate, setEditingTemplate] = useState<ResidencyTaskTemplate | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskRecurrence, setEditTaskRecurrence] = useState<"one_time" | "weekly" | "monthly" | "quarterly" | "annually">("one_time");
  const [editTaskStartDateMode, setEditTaskStartDateMode] = useState<"manual" | "offset_days">("offset_days");
  const [editTaskStartDate, setEditTaskStartDate] = useState("");
  const [editTaskOffsetDays, setEditTaskOffsetDays] = useState("0");
  const [editTaskPriority, setEditTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editTaskApplicantType, setEditTaskApplicantType] = useState<"main_only" | "main_and_dependants">("main_only");
  const [deletingTemplate, setDeletingTemplate] = useState<ResidencyTaskTemplate | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      toast({
        title: "Error",
        description: "Task name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Validation based on start date mode
    if (newTaskStartDateMode === "manual") {
      if (!newTaskStartDate) {
        toast({
          title: "Error",
          description: "Please select a start date",
          variant: "destructive",
        });
        return;
      }
    } else {
      const offsetDays = parseInt(newTaskOffsetDays);
      if (isNaN(offsetDays) || offsetDays < 0) {
        toast({
          title: "Error",
          description: "Offset days must be a number greater than or equal to 0",
          variant: "destructive",
        });
        return;
      }
    }
    
    const templateData = {
      name: newTaskName.trim(),
      description: newTaskDescription.trim() || undefined,
      recurrence: newTaskRecurrence,
      startDateMode: newTaskStartDateMode,
      startDate: newTaskStartDateMode === "manual" ? newTaskStartDate : undefined,
      offsetDays: newTaskStartDateMode === "offset_days" ? parseInt(newTaskOffsetDays) : undefined,
      priority: newTaskPriority,
      applicantType: newTaskApplicantType,
      order: templates.length,
    };

    try {
      // Save the new template to database
      await createResidencyTemplate.mutateAsync(templateData);
      
      // Generate tasks for all employees with residency service enabled (from API)
      const employeesResponse = await fetch("/api/employees", {
        credentials: "include",
      });
      const allEmployees: EmployeeRecord[] = employeesResponse.ok ? await employeesResponse.json() : [];
      const residencyEmployees = allEmployees.filter((e: EmployeeRecord) => e.isResidencyService);
      
      let totalTasksGenerated = 0;
      let errorCount = 0;
      
      for (const employee of residencyEmployees) {
        try {
          const result = generateResidencyTemplateTasks(employee);
          if (result.generatedTasks.length > 0) {
            await saveGeneratedTasks(employee, result.generatedTasks);
            totalTasksGenerated += result.generatedTasks.length;
          }
        } catch (employeeError) {
          console.error(`Failed to generate residency tasks for employee ${employee.id}:`, employeeError);
          errorCount++;
        }
      }
      
      // Reset form
      setNewTaskName("");
      setNewTaskDescription("");
      setNewTaskRecurrence("one_time");
      setNewTaskStartDateMode("offset_days");
      setNewTaskStartDate("");
      setNewTaskOffsetDays("0");
      setNewTaskPriority("medium");
      setNewTaskApplicantType("main_only");
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      
      const description = errorCount > 0
        ? `Residency task template created and ${totalTasksGenerated} task${totalTasksGenerated !== 1 ? 's' : ''} generated for ${residencyEmployees.length} employee${residencyEmployees.length !== 1 ? 's' : ''}. ${errorCount} employee(s) had errors.`
        : residencyEmployees.length > 0 
          ? `Residency task template created and ${totalTasksGenerated} task${totalTasksGenerated !== 1 ? 's' : ''} generated for ${residencyEmployees.length} employee${residencyEmployees.length !== 1 ? 's' : ''}`
          : "Residency task template created successfully. No employees with residency service yet.";
      
      toast({
        title: errorCount > 0 ? "Template created with errors" : "✅ Success!",
        description,
        variant: errorCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Failed to add residency task template:", error);
      // Error toast is already shown by mutation's onError
    }
  };

  const handleStartEdit = (template: ResidencyTaskTemplate) => {
    setEditingTemplate(template);
    setEditTaskName(template.name);
    setEditTaskDescription(template.description || "");
    setEditTaskRecurrence(template.recurrence);
    setEditTaskStartDateMode(template.startDateMode);
    setEditTaskStartDate(template.startDate || "");
    setEditTaskOffsetDays(template.offsetDays?.toString() || "0");
    setEditTaskPriority(template.priority);
    setEditTaskApplicantType(template.applicantType);
  };

  const handleSaveEdit = async () => {
    if (!editTaskName.trim()) {
      toast({
        title: "Error",
        description: "Task name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    // Validation based on start date mode
    if (editTaskStartDateMode === "manual") {
      if (!editTaskStartDate) {
        toast({
          title: "Error",
          description: "Please select a start date",
          variant: "destructive",
        });
        return;
      }
    } else {
      const offsetDays = parseInt(editTaskOffsetDays);
      if (isNaN(offsetDays) || offsetDays < 0) {
        toast({
          title: "Error",
          description: "Offset days must be a number greater than or equal to 0",
          variant: "destructive",
        });
        return;
      }
    }

    if (editingTemplate) {
      const updates = {
        name: editTaskName.trim(),
        description: editTaskDescription.trim() || undefined,
        recurrence: editTaskRecurrence,
        startDateMode: editTaskStartDateMode,
        startDate: editTaskStartDateMode === "manual" ? editTaskStartDate : undefined,
        offsetDays: editTaskStartDateMode === "offset_days" ? parseInt(editTaskOffsetDays) : undefined,
        priority: editTaskPriority,
        applicantType: editTaskApplicantType,
      };

      try {
        await updateResidencyTemplate.mutateAsync({
          id: editingTemplate.id,
          updates,
        });
        
        // Reset form
        setEditingTemplate(null);
        setEditTaskName("");
        setEditTaskDescription("");
        setEditTaskRecurrence("one_time");
        setEditTaskStartDateMode("offset_days");
        setEditTaskStartDate("");
        setEditTaskOffsetDays("0");
        setEditTaskPriority("medium");
        setEditTaskApplicantType("main_only");
        
        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ["/api/employee-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
        
        toast({
          title: "✅ Success!",
          description: "Residency task template updated successfully",
        });
      } catch (error) {
        console.error("Failed to update residency task template:", error);
        // Error toast is already shown by mutation's onError
      }
    }
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    
    if (!deleteReason.trim() || deleteReason.trim().length < 10) {
      toast({
        title: "Error",
        description: "Please provide a deletion reason (minimum 10 characters)",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await deleteResidencyTemplate.mutateAsync(deletingTemplate.id);
      
      // Reset form
      setDeletingTemplate(null);
      setDeleteReason("");
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      
      toast({
        title: "✅ Success!",
        description: "Residency task template deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete residency task template:", error);
      // Error toast is already shown by mutation's onError
    }
  };

  const handleExportCSV = () => {
    if (templates.length === 0) {
      toast({
        title: "No Data",
        description: "There are no residency task templates to export",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = ["Task Name", "Description", "Recurrence", "Start Date Mode", "Start Date", "Offset Days", "Priority"];
    const csvRows = templates.map(template => 
      `"${template.name.replace(/"/g, '""')}","${(template.description || '').replace(/"/g, '""')}","${template.recurrence}","${template.startDateMode}","${template.startDate || ''}","${template.offsetDays !== undefined ? template.offsetDays : ''}","${template.priority}"`
    );
    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `residency-task-templates-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Exported ${templates.length} template${templates.length !== 1 ? 's' : ''} to CSV`,
    });
  };

  const parseCSV = (text: string): string[][] => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\n' && !inQuotes) {
        currentRow.push(currentField);
        if (currentRow.some(field => field.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else if (char === '\r' && nextChar === '\n' && !inQuotes) {
        currentRow.push(currentField);
        if (currentRow.some(field => field.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
      } else if (char === '\r' && !inQuotes) {
        currentRow.push(currentField);
        if (currentRow.some(field => field.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    if (currentField || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.some(field => field.trim())) {
        rows.push(currentRow);
      }
    }
    
    return rows;
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const rows = parseCSV(text);
        
        if (rows.length < 2) {
          toast({
            title: "Error",
            description: "CSV file is empty or invalid",
            variant: "destructive",
          });
          return;
        }

        const header = rows[0].map(h => h.toLowerCase());
        const requiredColumns = ['task name', 'recurrence', 'start date mode', 'priority'];
        const missingColumns = requiredColumns.filter(col => !header.some(h => h.includes(col)));
        
        if (missingColumns.length > 0) {
          toast({
            title: "Error",
            description: `CSV must have columns: ${requiredColumns.join(', ')}`,
            variant: "destructive",
          });
          return;
        }

        let successCount = 0;
        let skipCount = 0;

        for (let i = 1; i < rows.length; i++) {
          const values = rows[i].map(v => v.trim());
          
          if (values.length < 7) {
            skipCount++;
            continue;
          }
          
          const taskName = values[0];
          const description = values[1];
          const recurrence = values[2] as "one_time" | "weekly" | "monthly" | "quarterly" | "annually";
          const startDateMode = values[3] as "manual" | "offset_days";
          const startDate = values[4];
          const offsetDaysStr = values[5];
          const priority = values[6] as "low" | "medium" | "high" | "urgent";

          if (!taskName || !recurrence || !startDateMode || !priority) {
            skipCount++;
            continue;
          }

          if (!['one_time', 'weekly', 'monthly', 'quarterly', 'annually'].includes(recurrence)) {
            skipCount++;
            continue;
          }

          if (!['manual', 'offset_days'].includes(startDateMode)) {
            skipCount++;
            continue;
          }

          if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
            skipCount++;
            continue;
          }

          if (startDateMode === "manual" && !startDate) {
            skipCount++;
            continue;
          }

          const offsetDays = offsetDaysStr ? parseInt(offsetDaysStr) : undefined;
          if (startDateMode === "offset_days" && (offsetDays === undefined || isNaN(offsetDays) || offsetDays < 0)) {
            skipCount++;
            continue;
          }

          const templateData = {
            name: taskName,
            description: description || undefined,
            recurrence,
            startDateMode,
            startDate: startDateMode === "manual" ? startDate : undefined,
            offsetDays: startDateMode === "offset_days" ? offsetDays : undefined,
            priority,
            applicantType: "main_only", // Default for CSV import
            order: templates.length + successCount,
          };

          try {
            // Save to database using mutation
            await createResidencyTemplate.mutateAsync(templateData);
            
            // Generate tasks for employees with residency service (from API)
            const employeesResponse = await fetch("/api/employees", {
              credentials: "include",
            });
            const allEmployees: EmployeeRecord[] = employeesResponse.ok ? await employeesResponse.json() : [];
            const residencyEmployees = allEmployees.filter((e: EmployeeRecord) => e.isResidencyService);
            
            for (const employee of residencyEmployees) {
              try {
                const result = generateResidencyTemplateTasks(employee);
                if (result.generatedTasks.length > 0) {
                  await saveGeneratedTasks(employee, result.generatedTasks);
                }
              } catch (employeeError) {
                console.error(`Failed to generate residency tasks for employee ${employee.id}:`, employeeError);
              }
            }
            
            successCount++;
          } catch (error) {
            console.error("Failed to import residency task template:", error);
            skipCount++;
          }
        }

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: ["/api", "residency-task-templates"] });
        queryClient.invalidateQueries({ queryKey: ["/api", "employee-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["/api", "employees"] });
        
        toast({
          title: "Import Successful",
          description: `Imported ${successCount} template${successCount !== 1 ? 's' : ''}${skipCount > 0 ? `, skipped ${skipCount} invalid row${skipCount !== 1 ? 's' : ''}` : ''}`,
        });
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to parse CSV file. Please check the format.",
          variant: "destructive",
        });
      }
    };

    reader.readAsText(file);
    event.target.value = "";
  };

  const getRecurrenceLabel = (recurrence: string) => {
    switch (recurrence) {
      case "one_time": return "One Time";
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "quarterly": return "Every 3 Months";
      case "annually": return "Annually";
      default: return recurrence;
    }
  };

  return (
    <div className="space-y-6">
      {/* Task Generation Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Automatic Task Generation
              </CardTitle>
              <CardDescription>
                Residency tasks are automatically generated daily at 6 AM UK time
              </CardDescription>
              {lastGenerationData?.timestamp && (
                <p className="text-sm text-muted-foreground" data-testid="text-residency-last-generation">
                  Last generated: {format(new Date(lastGenerationData.timestamp), "dd MMM yyyy 'at' h:mm a")}
                </p>
              )}
              {!lastGenerationData?.timestamp && (
                <p className="text-sm text-muted-foreground" data-testid="text-residency-never-generated">
                  Residency tasks have never been generated
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateResidencyTasksMutation.mutate()}
              disabled={generateResidencyTasksMutation.isPending}
              data-testid="button-generate-residency-tasks"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${generateResidencyTasksMutation.isPending ? 'animate-spin' : ''}`} />
              {generateResidencyTasksMutation.isPending ? 'Generating...' : 'Generate Tasks'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Template Creation Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create Residency Task Template
              </CardTitle>
              <CardDescription>
                Create task templates that will be applied to all employees with residency service enabled
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={templates.length === 0}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('residency-import-csv')?.click()}
                data-testid="button-import-csv"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <input
                id="residency-import-csv"
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                style={{ display: 'none' }}
                data-testid="input-import-csv"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="task-name" data-testid="label-task-name">Task Name *</Label>
              <Input
                id="task-name"
                placeholder="Enter task name"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                data-testid="input-task-name"
              />
            </div>

            <div>
              <Label htmlFor="task-description" data-testid="label-task-description">Description (Optional)</Label>
              <Textarea
                id="task-description"
                placeholder="Enter task description"
                value={newTaskDescription}
                onChange={(e) => setNewTaskDescription(e.target.value)}
                data-testid="textarea-task-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="task-recurrence" data-testid="label-task-recurrence">Recurrence *</Label>
                <Select value={newTaskRecurrence} onValueChange={(value) => setNewTaskRecurrence(value as any)}>
                  <SelectTrigger id="task-recurrence" data-testid="select-task-recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Every 3 Months</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="task-priority" data-testid="label-task-priority">Priority *</Label>
                <Select value={newTaskPriority} onValueChange={(value) => setNewTaskPriority(value as any)}>
                  <SelectTrigger id="task-priority" data-testid="select-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="task-applicant-type" data-testid="label-task-applicant-type">Applies To *</Label>
                <Select value={newTaskApplicantType} onValueChange={(value) => setNewTaskApplicantType(value as any)}>
                  <SelectTrigger id="task-applicant-type" data-testid="select-task-applicant-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_only">Main applicant only</SelectItem>
                    <SelectItem value="main_and_dependants">Main applicants and dependants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="start-date-mode" data-testid="label-start-date-mode">Task Start Date *</Label>
              <Select value={newTaskStartDateMode} onValueChange={(value) => setNewTaskStartDateMode(value as any)}>
                <SelectTrigger id="start-date-mode" data-testid="select-start-date-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offset_days">Number of days after Starting Date</SelectItem>
                  <SelectItem value="manual">Set manually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newTaskStartDateMode === "manual" ? (
              <div>
                <Label htmlFor="start-date" data-testid="label-start-date">Start Date *</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newTaskStartDate}
                  onChange={(e) => setNewTaskStartDate(e.target.value)}
                  data-testid="input-start-date"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="offset-days" data-testid="label-offset-days">Days after Starting Date *</Label>
                <Input
                  id="offset-days"
                  type="number"
                  min="0"
                  placeholder="e.g., 10"
                  value={newTaskOffsetDays}
                  onChange={(e) => setNewTaskOffsetDays(e.target.value)}
                  data-testid="input-offset-days"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Task will be due this many days after the employee's Starting Date
                </p>
              </div>
            )}

            <Button onClick={handleAddTask} data-testid="button-add-task">
              <Plus className="h-4 w-4 mr-2" />
              Add Task Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Residency Task Templates</CardTitle>
          <CardDescription>
            {templates.length === 0 ? "No residency task templates created yet" : `${templates.length} template${templates.length !== 1 ? 's' : ''} configured`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templates.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task Name</TableHead>
                  <TableHead>Recurrence</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id} data-testid={`template-row-${template.id}`}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{template.name}</p>
                        {template.description && (
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getRecurrenceLabel(template.recurrence)}</Badge>
                    </TableCell>
                    <TableCell>
                      {template.startDateMode === "manual" ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="text-sm">
                            {template.startDate ? DateTime.fromISO(template.startDate).toFormat("MMM d, yyyy") : "N/A"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm">
                          {template.offsetDays} day{template.offsetDays !== 1 ? 's' : ''} after start
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          template.priority === "urgent" ? "bg-red-50 text-red-700 border-red-200" :
                          template.priority === "high" ? "bg-orange-50 text-orange-700 border-orange-200" :
                          template.priority === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                          "bg-blue-50 text-blue-700 border-blue-200"
                        }
                      >
                        {template.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {template.applicantType === "main_and_dependants" ? "Main + Dependants" : "Main Only"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(template)}
                          data-testid={`button-edit-${template.id}`}
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeletingTemplate(template)}
                          data-testid={`button-delete-${template.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editingTemplate !== null} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Residency Task Template</DialogTitle>
            <DialogDescription>
              Update the task template details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="edit-task-name">Task Name *</Label>
              <Input
                id="edit-task-name"
                placeholder="Enter task name"
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
                data-testid="input-edit-task-name"
              />
            </div>

            <div>
              <Label htmlFor="edit-task-description">Description (Optional)</Label>
              <Textarea
                id="edit-task-description"
                placeholder="Enter task description"
                value={editTaskDescription}
                onChange={(e) => setEditTaskDescription(e.target.value)}
                data-testid="textarea-edit-task-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-task-recurrence">Recurrence *</Label>
                <Select value={editTaskRecurrence} onValueChange={(value) => setEditTaskRecurrence(value as any)}>
                  <SelectTrigger id="edit-task-recurrence" data-testid="select-edit-task-recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Every 3 Months</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-task-priority">Priority *</Label>
                <Select value={editTaskPriority} onValueChange={(value) => setEditTaskPriority(value as any)}>
                  <SelectTrigger id="edit-task-priority" data-testid="select-edit-task-priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-task-applicant-type">Applies To *</Label>
                <Select value={editTaskApplicantType} onValueChange={(value) => setEditTaskApplicantType(value as any)}>
                  <SelectTrigger id="edit-task-applicant-type" data-testid="select-edit-task-applicant-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main_only">Main applicant only</SelectItem>
                    <SelectItem value="main_and_dependants">Main applicants and dependants</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="edit-start-date-mode">Task Start Date *</Label>
              <Select value={editTaskStartDateMode} onValueChange={(value) => setEditTaskStartDateMode(value as any)}>
                <SelectTrigger id="edit-start-date-mode" data-testid="select-edit-start-date-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="offset_days">Number of days after Starting Date</SelectItem>
                  <SelectItem value="manual">Set manually</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editTaskStartDateMode === "manual" ? (
              <div>
                <Label htmlFor="edit-start-date">Start Date *</Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={editTaskStartDate}
                  onChange={(e) => setEditTaskStartDate(e.target.value)}
                  data-testid="input-edit-start-date"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="edit-offset-days">Days after Starting Date *</Label>
                <Input
                  id="edit-offset-days"
                  type="number"
                  min="0"
                  placeholder="e.g., 10"
                  value={editTaskOffsetDays}
                  onChange={(e) => setEditTaskOffsetDays(e.target.value)}
                  data-testid="input-edit-offset-days"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Task will be due this many days after the employee's Starting Date
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} data-testid="button-save-edit">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deletingTemplate !== null} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Residency Task Template</DialogTitle>
            <DialogDescription>
              This will delete the template and all associated tasks. Please provide a reason for deletion.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="delete-reason">Deletion Reason *</Label>
              <Textarea
                id="delete-reason"
                placeholder="Enter reason for deletion (minimum 10 characters)"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                data-testid="textarea-delete-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTemplate(null)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} data-testid="button-confirm-delete">
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ResidencyTaskManager;
