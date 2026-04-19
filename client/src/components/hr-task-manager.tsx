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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { localStorageService } from "@/lib/localStorage";
import { type HRTaskTemplate, type LeaverTaskTemplate, type EmployeeRecord } from "@shared/schema";
import { CheckCircle2, Plus, Pencil, Trash2, ChevronUp, ChevronDown, Download, Upload, RefreshCw } from "lucide-react";
import { generateHRTemplateTasks, saveGeneratedTasks } from "@/lib/utils/employeeTaskGenerator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { DateTime } from "luxon";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";

export function HRTaskManager() {
  const { toast} = useToast();

  // Fetch HR Task Templates from API
  const { data: templates = [], isLoading: isLoadingHRTemplates } = useQuery<HRTaskTemplate[]>({
    queryKey: ["/api", "hr-task-templates"],
  });

  // Fetch last HR task generation timestamp
  const { data: lastGenerationData } = useQuery<{ timestamp: string | null }>({
    queryKey: ["/api", "hr-tasks", "last-generation"],
  });

  // HR Task Generation Mutation
  const generateHRTasksMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/hr-tasks/generate", {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "HR Tasks Generated",
        description: `Created ${data.tasksCreated} new tasks, ${data.tasksSkipped} already existed`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api", "employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "hr-tasks", "last-generation"] });
    },
    onError: (error) => {
      toast({
        title: "Error Generating Tasks",
        description: error instanceof Error ? error.message : "Failed to generate HR tasks",
        variant: "destructive",
      });
    },
  });

  // Create HR Task Template Mutation
  const createHRTemplate = useMutation({
    mutationFn: async (template: Omit<HRTaskTemplate, "id" | "createdAt">) => {
      return await apiRequest("POST", "/api/hr-task-templates", template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hr-task-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Template",
        description: error instanceof Error ? error.message : "Failed to create HR task template",
        variant: "destructive",
      });
    },
  });

  // Update HR Task Template Mutation
  const updateHRTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HRTaskTemplate> }) => {
      return await apiRequest("PATCH", `/api/hr-task-templates/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hr-task-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Template",
        description: error instanceof Error ? error.message : "Failed to update HR task template",
        variant: "destructive",
      });
    },
  });

  // Delete HR Task Template Mutation
  const deleteHRTemplate = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/hr-task-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "hr-task-templates"] });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Template",
        description: error instanceof Error ? error.message : "Failed to delete HR task template",
        variant: "destructive",
      });
    },
  });

  // HR Template Form State
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<"one_time" | "monthly" | "annual">("one_time");
  const [newTaskDueDateOffset, setNewTaskDueDateOffset] = useState("7");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editingTemplate, setEditingTemplate] = useState<HRTaskTemplate | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskDescription, setEditTaskDescription] = useState("");
  const [editTaskRecurrence, setEditTaskRecurrence] = useState<"one_time" | "monthly" | "annual">("one_time");
  const [editTaskDueDateOffset, setEditTaskDueDateOffset] = useState("7");
  const [editTaskPriority, setEditTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [deletingTemplate, setDeletingTemplate] = useState<HRTaskTemplate | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  
  // Leaver Task Template State (uses API)
  const { data: leaverTemplates = [], isLoading: isLoadingLeaverTemplates } = useQuery<LeaverTaskTemplate[]>({
    queryKey: ["/api", "leaver-task-templates"],
    queryFn: async () => {
      const resp = await fetch("/api/leaver-task-templates", { credentials: "include" });
      if (!resp.ok) return [];
      return resp.json();
    },
  });
  const [newLeaverTaskName, setNewLeaverTaskName] = useState("");
  const [newLeaverTaskDescription, setNewLeaverTaskDescription] = useState("");
  const [newLeaverTaskDueDays, setNewLeaverTaskDueDays] = useState("7");
  const [newLeaverTaskPriority, setNewLeaverTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editingLeaverTemplate, setEditingLeaverTemplate] = useState<LeaverTaskTemplate | null>(null);
  const [editLeaverTaskName, setEditLeaverTaskName] = useState("");
  const [editLeaverTaskDescription, setEditLeaverTaskDescription] = useState("");
  const [editLeaverTaskDueDays, setEditLeaverTaskDueDays] = useState("7");
  const [editLeaverTaskPriority, setEditLeaverTaskPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [deletingLeaverTemplate, setDeletingLeaverTemplate] = useState<LeaverTaskTemplate | null>(null);
  const [deleteLeaverReason, setDeleteLeaverReason] = useState("");

  const handleAddTask = async () => {
    if (!newTaskName.trim()) {
      toast({
        title: "Error",
        description: "Task name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const dueDateOffset = parseInt(newTaskDueDateOffset);
    if (isNaN(dueDateOffset) || dueDateOffset < 0) {
      toast({
        title: "Error",
        description: "Due date offset must be a number greater than or equal to 0",
        variant: "destructive",
      });
      return;
    }
    
    const templateData = {
      name: newTaskName.trim(),
      description: newTaskDescription.trim() || undefined,
      recurrence: newTaskRecurrence,
      dueDateOffsetDays: dueDateOffset,
      priority: newTaskPriority,
      order: templates.length,
    };

    try {
      // Save the new template to database
      await createHRTemplate.mutateAsync(templateData);
      
      // Generate tasks for ALL existing employees (still from API)
      const employeesResponse = await fetch("/api/employees", {
        credentials: "include",
      });
      const allEmployees: EmployeeRecord[] = employeesResponse.ok ? await employeesResponse.json() : [];
      
      let totalTasksGenerated = 0;
      let errorCount = 0;
      
      for (const employee of allEmployees) {
        try {
          const result = generateHRTemplateTasks(employee);
          if (result.generatedTasks.length > 0) {
            await saveGeneratedTasks(employee, result.generatedTasks);
            totalTasksGenerated += result.generatedTasks.length;
          }
        } catch (employeeError) {
          console.error(`Failed to generate HR tasks for employee ${employee.id}:`, employeeError);
          errorCount++;
        }
      }
      
      // Update last generation timestamp
      const timestamp = DateTime.now().setZone("Europe/London").toISO();
      if (timestamp) {
        localStorageService.setLastEmployeeTaskGeneration(timestamp);
      }
      
      // Reset form
      setNewTaskName("");
      setNewTaskDescription("");
      setNewTaskRecurrence("one_time");
      setNewTaskDueDateOffset("7");
      setNewTaskPriority("medium");
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ["/api/employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      
      const description = errorCount > 0
        ? `HR task template added and ${totalTasksGenerated} task${totalTasksGenerated !== 1 ? 's' : ''} generated for ${allEmployees.length} employee${allEmployees.length !== 1 ? 's' : ''}. ${errorCount} employee(s) had errors.`
        : `HR task template added and ${totalTasksGenerated} task${totalTasksGenerated !== 1 ? 's' : ''} generated for ${allEmployees.length} employee${allEmployees.length !== 1 ? 's' : ''}`;
      
      toast({
        title: errorCount > 0 ? "Template added with errors" : "✅ Success!",
        description,
        variant: errorCount > 0 ? "destructive" : "default",
      });
    } catch (error) {
      console.error("Failed to add HR task template:", error);
      // Error toast is already shown by mutation's onError
    }
  };

  const handleStartEdit = (template: HRTaskTemplate) => {
    setEditingTemplate(template);
    setEditTaskName(template.name);
    setEditTaskDescription(template.description || "");
    setEditTaskRecurrence(template.recurrence);
    setEditTaskDueDateOffset(template.dueDateOffsetDays.toString());
    setEditTaskPriority(template.priority);
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

    const dueDateOffset = parseInt(editTaskDueDateOffset);
    if (isNaN(dueDateOffset) || dueDateOffset < 0) {
      toast({
        title: "Error",
        description: "Due date offset must be a number greater than or equal to 0",
        variant: "destructive",
      });
      return;
    }

    if (editingTemplate) {
      try {
        await updateHRTemplate.mutateAsync({
          id: editingTemplate.id,
          updates: {
            name: editTaskName.trim(),
            description: editTaskDescription.trim() || undefined,
            recurrence: editTaskRecurrence,
            dueDateOffsetDays: dueDateOffset,
            priority: editTaskPriority,
          },
        });
        
        setEditingTemplate(null);
        setEditTaskName("");
        setEditTaskDescription("");
        setEditTaskRecurrence("one_time");
        setEditTaskDueDateOffset("7");
        setEditTaskPriority("medium");
        
        toast({
          title: "✅ Success!",
          description: "HR task template updated successfully",
        });
      } catch (error) {
        console.error("Failed to update HR task template:", error);
        // Error toast is already shown by mutation's onError
      }
    }
  };

  const handleStartDelete = (template: HRTaskTemplate) => {
    setDeletingTemplate(template);
    setDeleteReason("");
  };

  const handleConfirmDelete = async () => {
    if (deleteReason.trim().length < 10) {
      return;
    }

    if (deletingTemplate) {
      try {
        await deleteHRTemplate.mutateAsync(deletingTemplate.id);
        
        setDeletingTemplate(null);
        setDeleteReason("");
        
        toast({
          title: "✅ Success!",
          description: "HR task template deleted from all employees",
        });
      } catch (error) {
        console.error("Failed to delete HR task template:", error);
        // Error toast is already shown by mutation's onError
      }
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    
    const newTemplates = [...templates];
    const temp = newTemplates[index];
    newTemplates[index] = newTemplates[index - 1];
    newTemplates[index - 1] = temp;
    
    // Update order values
    newTemplates.forEach((template, i) => {
      localStorageService.updateHRTaskTemplate(template.id, { order: i });
    });
    
    queryClient.invalidateQueries({ queryKey: ["/api", "hr-task-templates"] });
    
    toast({
      title: "Task reordered",
      description: "HR task order updated successfully",
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === templates.length - 1) return;
    
    const newTemplates = [...templates];
    const temp = newTemplates[index];
    newTemplates[index] = newTemplates[index + 1];
    newTemplates[index + 1] = temp;
    
    // Update order values
    newTemplates.forEach((template, i) => {
      localStorageService.updateHRTaskTemplate(template.id, { order: i });
    });
    
    queryClient.invalidateQueries({ queryKey: ["/api", "hr-task-templates"] });
    
    toast({
      title: "Task reordered",
      description: "HR task order updated successfully",
    });
  };

  const deleteReasonLength = deleteReason.trim().length;
  const isDeleteReasonValid = deleteReasonLength >= 10;

  const handleExportCSV = () => {
    if (templates.length === 0) {
      toast({
        title: "No Data",
        description: "There are no HR task templates to export",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = ["Task Name", "Description", "Recurrence", "Due Date Offset Days", "Priority"];
    const csvRows = templates.map(template => 
      `"${template.name.replace(/"/g, '""')}","${(template.description || '').replace(/"/g, '""')}","${template.recurrence}","${template.dueDateOffsetDays}","${template.priority}"`
    );
    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `hr-task-templates-${new Date().toISOString().split('T')[0]}.csv`);
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
    reader.onload = (e) => {
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
        const requiredColumns = ['task name', 'recurrence', 'due date offset days', 'priority'];
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
          
          if (values.length < 5) {
            skipCount++;
            continue;
          }
          
          const taskName = values[0];
          const description = values[1];
          const recurrence = values[2] as "one_time" | "monthly" | "annual";
          const dueDateOffset = parseInt(values[3]);
          const priority = values[4] as "low" | "medium" | "high" | "urgent";

          if (!taskName || !recurrence || isNaN(dueDateOffset) || dueDateOffset < 0 || !priority) {
            skipCount++;
            continue;
          }

          if (!['one_time', 'monthly', 'annual'].includes(recurrence)) {
            skipCount++;
            continue;
          }

          if (!['low', 'medium', 'high', 'urgent'].includes(priority)) {
            skipCount++;
            continue;
          }

          const newTemplate: HRTaskTemplate = {
            id: crypto.randomUUID(),
            name: taskName,
            description: description || undefined,
            recurrence,
            dueDateOffsetDays: dueDateOffset,
            priority,
            order: templates.length + successCount,
            createdAt: new Date().toISOString(),
          };

          localStorageService.addHRTaskTemplate(newTemplate);
          
          const allEmployees = localStorageService.getEmployees();
          allEmployees.forEach((employee: EmployeeRecord) => {
            try {
              const result = generateHRTemplateTasks(employee);
              if (result.generatedTasks.length > 0) {
                saveGeneratedTasks(employee, result.generatedTasks);
              }
            } catch (employeeError) {
              console.error(`Failed to generate HR tasks for employee ${employee.id}:`, employeeError);
            }
          });
          
          successCount++;
        }

        const timestamp = DateTime.now().setZone("Europe/London").toISO();
        if (timestamp) {
          localStorageService.setLastEmployeeTaskGeneration(timestamp);
        }

        queryClient.invalidateQueries({ queryKey: ["/api", "hr-task-templates"] });
        queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["employees"] });
        
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

  // ==================== LEAVER TASK HANDLERS ====================

  const handleAddLeaverTask = async () => {
    if (!newLeaverTaskName.trim()) {
      toast({
        title: "Error",
        description: "Task name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const dueDays = parseInt(newLeaverTaskDueDays);
    if (isNaN(dueDays) || dueDays < 0) {
      toast({
        title: "Error",
        description: "Due days must be a number greater than or equal to 0",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", "/api/leaver-task-templates", {
        name: newLeaverTaskName.trim(),
        description: newLeaverTaskDescription.trim() || undefined,
        dueDays: dueDays,
        priority: newLeaverTaskPriority,
        order: leaverTemplates.length,
      });
      queryClient.invalidateQueries({ queryKey: ["/api", "leaver-task-templates"] });
      setNewLeaverTaskName("");
      setNewLeaverTaskDescription("");
      setNewLeaverTaskDueDays("7");
      setNewLeaverTaskPriority("medium");
      toast({
        title: "Success",
        description: "Leaver task template added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create leaver task template",
        variant: "destructive",
      });
    }
  };

  const handleStartEditLeaver = (template: LeaverTaskTemplate) => {
    setEditingLeaverTemplate(template);
    setEditLeaverTaskName(template.name);
    setEditLeaverTaskDescription(template.description || "");
    setEditLeaverTaskDueDays(template.dueDays.toString());
    setEditLeaverTaskPriority(template.priority);
  };

  const handleSaveEditLeaver = async () => {
    if (!editingLeaverTemplate) return;

    if (!editLeaverTaskName.trim()) {
      toast({
        title: "Error",
        description: "Task name cannot be empty",
        variant: "destructive",
      });
      return;
    }

    const dueDays = parseInt(editLeaverTaskDueDays);
    if (isNaN(dueDays) || dueDays < 0) {
      toast({
        title: "Error",
        description: "Due days must be a number greater than or equal to 0",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("PATCH", `/api/leaver-task-templates/${editingLeaverTemplate.id}`, {
        name: editLeaverTaskName.trim(),
        description: editLeaverTaskDescription.trim() || undefined,
        dueDays: dueDays,
        priority: editLeaverTaskPriority,
      });
      queryClient.invalidateQueries({ queryKey: ["/api", "leaver-task-templates"] });
      setEditingLeaverTemplate(null);
      toast({
        title: "Success",
        description: "Leaver task template updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update leaver task template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLeaver = (template: LeaverTaskTemplate) => {
    setDeletingLeaverTemplate(template);
    setDeleteLeaverReason("");
  };

  const handleConfirmDeleteLeaver = async () => {
    if (!deletingLeaverTemplate) return;

    if (deleteLeaverReason.trim().length < 10) {
      toast({
        title: "Error",
        description: "Deletion reason must be at least 10 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("DELETE", `/api/leaver-task-templates/${deletingLeaverTemplate.id}`);
      queryClient.invalidateQueries({ queryKey: ["/api", "leaver-task-templates"] });
      setDeletingLeaverTemplate(null);
      setDeleteLeaverReason("");
      toast({
        title: "Success",
        description: "Leaver task template deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete leaver task template",
        variant: "destructive",
      });
    }
  };

  const handleMoveLeaverUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...leaverTemplates];
    const tempOrder = updated[index - 1].order;
    try {
      await apiRequest("PATCH", `/api/leaver-task-templates/${updated[index].id}`, { order: tempOrder });
      await apiRequest("PATCH", `/api/leaver-task-templates/${updated[index - 1].id}`, { order: updated[index].order });
      queryClient.invalidateQueries({ queryKey: ["/api", "leaver-task-templates"] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  const handleMoveLeaverDown = async (index: number) => {
    if (index === leaverTemplates.length - 1) return;
    const updated = [...leaverTemplates];
    const tempOrder = updated[index + 1].order;
    try {
      await apiRequest("PATCH", `/api/leaver-task-templates/${updated[index].id}`, { order: tempOrder });
      await apiRequest("PATCH", `/api/leaver-task-templates/${updated[index + 1].id}`, { order: updated[index].order });
      queryClient.invalidateQueries({ queryKey: ["/api", "leaver-task-templates"] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to reorder", variant: "destructive" });
    }
  };

  const handleExportLeaverCSV = () => {
    const headers = ["Task Name", "Description", "Due Days (since becoming leaver)", "Priority"];
    const rows = leaverTemplates.map((template) => [
      template.name,
      template.description || "",
      template.dueDays.toString(),
      template.priority,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const now = DateTime.now().setZone("Europe/London");
    const filename = `Leaver_Task_Templates_${now.toFormat("yy-MM-dd_HH-mm")}.csv`;
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportLeaverCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((line) => line.trim());

        if (lines.length < 2) {
          toast({
            title: "Import Failed",
            description: "CSV file must contain at least a header row and one data row",
            variant: "destructive",
          });
          return;
        }

        let successCount = 0;
        let skipCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const parsedRow: string[] = [];
          let currentCell = "";
          let insideQuotes = false;

          for (let j = 0; j < lines[i].length; j++) {
            const char = lines[i][j];
            const nextChar = lines[i][j + 1];

            if (char === '"' && nextChar === '"') {
              currentCell += '"';
              j++;
            } else if (char === '"') {
              insideQuotes = !insideQuotes;
            } else if (char === "," && !insideQuotes) {
              parsedRow.push(currentCell);
              currentCell = "";
            } else {
              currentCell += char;
            }
          }
          parsedRow.push(currentCell);

          if (parsedRow.length < 4) {
            skipCount++;
            continue;
          }

          const [name, description, dueDaysStr, priority] = parsedRow;

          if (!name.trim()) {
            skipCount++;
            continue;
          }

          const dueDays = parseInt(dueDaysStr);
          if (isNaN(dueDays) || dueDays < 0) {
            skipCount++;
            continue;
          }

          const priorityValue = priority.toLowerCase();
          if (!["low", "medium", "high", "urgent"].includes(priorityValue)) {
            skipCount++;
            continue;
          }

          try {
            await apiRequest("POST", "/api/leaver-task-templates", {
              name: name.trim(),
              description: description.trim() || undefined,
              dueDays: dueDays,
              priority: priorityValue as "low" | "medium" | "high" | "urgent",
              order: leaverTemplates.length + successCount,
            });
            successCount++;
          } catch (e) {
            skipCount++;
          }
        }

        queryClient.invalidateQueries({ queryKey: ["/api", "leaver-task-templates"] });
        
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

  const deleteLeaverReasonLength = deleteLeaverReason.trim().length;
  const isDeleteLeaverReasonValid = deleteLeaverReasonLength >= 10;

  // ==================== HELPER FUNCTIONS ====================

  const getRecurrenceLabel = (recurrence: string) => {
    switch (recurrence) {
      case "one_time": return "One Time";
      case "monthly": return "Monthly";
      case "annual": return "Annual";
      default: return recurrence;
    }
  };

  const getPriorityVariant = (priority: string): "default" | "secondary" | "destructive" => {
    switch (priority) {
      case "urgent": return "destructive";
      case "high": return "default";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <Card data-testid="card-hr-task-manager">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                HR Task Manager
              </CardTitle>
              <CardDescription>
                Manage HR task templates and leaver tasks that automatically apply to employees.
              </CardDescription>
              {lastGenerationData?.timestamp && (
                <p className="text-sm text-muted-foreground" data-testid="text-hr-last-generation">
                  Last generated: {format(new Date(lastGenerationData.timestamp), "dd MMM yyyy 'at' h:mm a")}
                </p>
              )}
              {!lastGenerationData?.timestamp && (
                <p className="text-sm text-muted-foreground" data-testid="text-hr-never-generated">
                  HR tasks have never been generated
                </p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => generateHRTasksMutation.mutate()}
              disabled={generateHRTasksMutation.isPending}
              data-testid="button-generate-hr-tasks"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${generateHRTasksMutation.isPending ? 'animate-spin' : ''}`} />
              {generateHRTasksMutation.isPending ? 'Generating...' : 'Generate HR Tasks'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs defaultValue="hr-templates" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hr-templates" data-testid="tab-hr-templates">HR Templates</TabsTrigger>
              <TabsTrigger value="leaver-tasks" data-testid="tab-leaver-tasks">Leaver Tasks</TabsTrigger>
            </TabsList>
            
            <TabsContent value="hr-templates" className="space-y-6">
              {/* Export/Import Buttons */}
              <div className="flex justify-end gap-2">
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
                  onClick={() => document.getElementById('hr-import-csv')?.click()}
                  data-testid="button-import-csv"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <input
                  id="hr-import-csv"
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  style={{ display: 'none' }}
                  data-testid="input-import-csv"
                />
              </div>

          {/* Add new task */}
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold">Add New HR Task Template</h3>
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-name">Task Name *</Label>
                  <Input
                    id="task-name"
                    placeholder="e.g., Annual Performance Review, Monthly Check-in..."
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    data-testid="input-new-task-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-recurrence">Recurrence *</Label>
                  <Select value={newTaskRecurrence} onValueChange={(value: any) => setNewTaskRecurrence(value)}>
                    <SelectTrigger id="task-recurrence" data-testid="select-recurrence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_time">One Time Only</SelectItem>
                      <SelectItem value="monthly">Repeated Monthly</SelectItem>
                      <SelectItem value="annual">Repeated Annually</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task-due-offset">Due Date (days from start) *</Label>
                  <Input
                    id="task-due-offset"
                    type="number"
                    min="1"
                    placeholder="7"
                    value={newTaskDueDateOffset}
                    onChange={(e) => setNewTaskDueDateOffset(e.target.value)}
                    data-testid="input-due-offset"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-priority">Priority</Label>
                  <Select value={newTaskPriority} onValueChange={(value: any) => setNewTaskPriority(value)}>
                    <SelectTrigger id="task-priority" data-testid="select-priority">
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
              </div>
              <div className="space-y-2">
                <Label htmlFor="task-description">Description (Optional)</Label>
                <Textarea
                  id="task-description"
                  placeholder="Add details about this task..."
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={2}
                  data-testid="textarea-description"
                />
              </div>
              <Button 
                onClick={handleAddTask}
                disabled={!newTaskName.trim()}
                data-testid="button-add-task"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add HR Task Template
              </Button>
            </div>
          </div>

          {/* Task list */}
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tasks">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No HR task templates yet. Add your first template above.</p>
              <p className="text-sm mt-1">Templates will apply to all employees.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead className="w-32">Recurrence</TableHead>
                    <TableHead className="w-24">Priority</TableHead>
                    <TableHead className="w-24">Order</TableHead>
                    <TableHead className="w-40 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template, index) => (
                    <TableRow key={template.id} data-testid={`row-task-${template.id}`}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{template.name}</div>
                          {template.description && (
                            <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getRecurrenceLabel(template.recurrence)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityVariant(template.priority)}>
                          {template.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            data-testid={`button-move-up-${template.id}`}
                            className="h-6 w-6"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === templates.length - 1}
                            data-testid={`button-move-down-${template.id}`}
                            className="h-6 w-6"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(template)}
                            data-testid={`button-edit-${template.id}`}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartDelete(template)}
                            data-testid={`button-delete-${template.id}`}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
            </TabsContent>

            <TabsContent value="leaver-tasks" className="space-y-6">
              {/* Export/Import Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportLeaverCSV}
                  disabled={leaverTemplates.length === 0}
                  data-testid="button-export-leaver-csv"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('leaver-import-csv')?.click()}
                  data-testid="button-import-leaver-csv"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
                <input
                  id="leaver-import-csv"
                  type="file"
                  accept=".csv"
                  onChange={handleImportLeaverCSV}
                  style={{ display: 'none' }}
                  data-testid="input-import-leaver-csv"
                />
              </div>

              {/* Add new leaver task */}
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <h3 className="text-sm font-semibold">Add New Leaver Task</h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="leaver-task-name">Task Name *</Label>
                      <Input
                        id="leaver-task-name"
                        placeholder="e.g., Return Company Equipment, Exit Interview..."
                        value={newLeaverTaskName}
                        onChange={(e) => setNewLeaverTaskName(e.target.value)}
                        data-testid="input-new-leaver-task-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="leaver-task-priority">Priority *</Label>
                      <Select value={newLeaverTaskPriority} onValueChange={(value: any) => setNewLeaverTaskPriority(value)}>
                        <SelectTrigger id="leaver-task-priority" data-testid="select-leaver-priority">
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leaver-task-due-days">Due Date (days since becoming leaver) *</Label>
                    <Input
                      id="leaver-task-due-days"
                      type="number"
                      min="0"
                      placeholder="7"
                      value={newLeaverTaskDueDays}
                      onChange={(e) => setNewLeaverTaskDueDays(e.target.value)}
                      data-testid="input-new-leaver-due-days"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="leaver-task-description">Description</Label>
                    <Textarea
                      id="leaver-task-description"
                      value={newLeaverTaskDescription}
                      onChange={(e) => setNewLeaverTaskDescription(e.target.value)}
                      rows={3}
                      data-testid="textarea-new-leaver-description"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddLeaverTask}
                  disabled={!newLeaverTaskName.trim()}
                  data-testid="button-add-leaver-task"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Leaver Task
                </Button>
              </div>

              {/* Leaver templates table */}
              {leaverTemplates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No leaver task templates yet. Add your first template above.
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Task Name</TableHead>
                        <TableHead>Due Days</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead className="w-24">Order</TableHead>
                        <TableHead className="text-right w-40">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leaverTemplates.map((template, index) => (
                        <TableRow key={template.id} data-testid={`row-leaver-template-${template.id}`}>
                          <TableCell className="font-medium text-muted-foreground">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{template.name}</div>
                              {template.description && (
                                <div className="text-xs text-muted-foreground mt-1">{template.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{template.dueDays} day{template.dueDays !== 1 ? 's' : ''}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getPriorityVariant(template.priority)}>
                              {template.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveLeaverUp(index)}
                                disabled={index === 0}
                                data-testid={`button-move-leaver-up-${template.id}`}
                                className="h-6 w-6"
                              >
                                <ChevronUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMoveLeaverDown(index)}
                                disabled={index === leaverTemplates.length - 1}
                                data-testid={`button-move-leaver-down-${template.id}`}
                                className="h-6 w-6"
                              >
                                <ChevronDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEditLeaver(template)}
                                data-testid={`button-edit-leaver-${template.id}`}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLeaver(template)}
                                data-testid={`button-delete-leaver-${template.id}`}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingTemplate} onOpenChange={(open) => !open && setEditingTemplate(null)}>
        <DialogContent data-testid="dialog-edit-task">
          <DialogHeader>
            <DialogTitle>Edit HR Task Template</DialogTitle>
            <DialogDescription>
              Update the task template details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-name">Task Name *</Label>
              <Input
                id="edit-task-name"
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
                data-testid="input-edit-task-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-task-recurrence">Recurrence *</Label>
                <Select value={editTaskRecurrence} onValueChange={(value: any) => setEditTaskRecurrence(value)}>
                  <SelectTrigger id="edit-task-recurrence">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one_time">One Time Only</SelectItem>
                    <SelectItem value="monthly">Repeated Monthly</SelectItem>
                    <SelectItem value="annual">Repeated Annually</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-task-priority">Priority</Label>
                <Select value={editTaskPriority} onValueChange={(value: any) => setEditTaskPriority(value)}>
                  <SelectTrigger id="edit-task-priority">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task-due-offset">Due Date (days from start) *</Label>
              <Input
                id="edit-task-due-offset"
                type="number"
                min="1"
                placeholder="7"
                value={editTaskDueDateOffset}
                onChange={(e) => setEditTaskDueDateOffset(e.target.value)}
                data-testid="input-edit-due-offset"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={editTaskDescription}
                onChange={(e) => setEditTaskDescription(e.target.value)}
                rows={3}
                data-testid="textarea-edit-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={!editTaskName.trim()}
              data-testid="button-save-edit"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingTemplate} onOpenChange={(open) => !open && setDeletingTemplate(null)}>
        <DialogContent data-testid="dialog-delete-task">
          <DialogHeader>
            <DialogTitle>Delete HR Task Template</DialogTitle>
            <DialogDescription>
              This will remove this task template and all associated employee tasks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="delete-reason">Reason for deletion (minimum 10 characters) *</Label>
              <Textarea
                id="delete-reason"
                placeholder="Explain why this task template is being removed..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={3}
                data-testid="textarea-delete-reason"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {deleteReasonLength}/10 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingTemplate(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!isDeleteReasonValid}
              data-testid="button-confirm-delete"
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaver Task Edit Dialog */}
      <Dialog open={!!editingLeaverTemplate} onOpenChange={(open) => !open && setEditingLeaverTemplate(null)}>
        <DialogContent data-testid="dialog-edit-leaver-task">
          <DialogHeader>
            <DialogTitle>Edit Leaver Task Template</DialogTitle>
            <DialogDescription>
              Update the leaver task template details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-leaver-task-name">Task Name *</Label>
              <Input
                id="edit-leaver-task-name"
                value={editLeaverTaskName}
                onChange={(e) => setEditLeaverTaskName(e.target.value)}
                data-testid="input-edit-leaver-task-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-leaver-task-due-days">Due Days (since becoming leaver) *</Label>
                <Input
                  id="edit-leaver-task-due-days"
                  type="number"
                  min="0"
                  placeholder="7"
                  value={editLeaverTaskDueDays}
                  onChange={(e) => setEditLeaverTaskDueDays(e.target.value)}
                  data-testid="input-edit-leaver-due-days"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-leaver-task-priority">Priority</Label>
                <Select value={editLeaverTaskPriority} onValueChange={(value: any) => setEditLeaverTaskPriority(value)}>
                  <SelectTrigger id="edit-leaver-task-priority">
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-leaver-task-description">Description</Label>
              <Textarea
                id="edit-leaver-task-description"
                value={editLeaverTaskDescription}
                onChange={(e) => setEditLeaverTaskDescription(e.target.value)}
                rows={3}
                data-testid="textarea-edit-leaver-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLeaverTemplate(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEditLeaver}
              disabled={!editLeaverTaskName.trim()}
              data-testid="button-save-leaver-edit"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leaver Task Delete Confirmation Dialog */}
      <Dialog open={!!deletingLeaverTemplate} onOpenChange={(open) => !open && setDeletingLeaverTemplate(null)}>
        <DialogContent data-testid="dialog-delete-leaver-task">
          <DialogHeader>
            <DialogTitle>Delete Leaver Task Template</DialogTitle>
            <DialogDescription>
              This will remove this leaver task template and all associated employee tasks. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="delete-leaver-reason">Reason for deletion (minimum 10 characters) *</Label>
              <Textarea
                id="delete-leaver-reason"
                placeholder="Explain why this leaver task template is being removed..."
                value={deleteLeaverReason}
                onChange={(e) => setDeleteLeaverReason(e.target.value)}
                rows={3}
                data-testid="textarea-delete-leaver-reason"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {deleteLeaverReasonLength}/10 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletingLeaverTemplate(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleConfirmDeleteLeaver}
              disabled={!isDeleteLeaverReasonValid}
              data-testid="button-confirm-delete-leaver"
            >
              Delete Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
