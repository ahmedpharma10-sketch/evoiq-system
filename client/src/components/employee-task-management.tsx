import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { localStorageService } from "@/lib/localStorage";
import { formatDueDate, getDaysUntilDue, getTaskStatus } from "@/lib/utils/taskGenerator";
import { generateEmployeeTasks, generateHRTemplateTasks, saveGeneratedTasks } from "@/lib/utils/employeeTaskGenerator";
import { CheckCircle2, XCircle, MinusCircle, Circle, AlertCircle, UserCircle, RefreshCw, Check } from "lucide-react";
import type { EmployeeTask, EmployeeRecord } from "@shared/schema";
import { DateTime } from "luxon";
import { format } from "date-fns";
import { useEffect } from "react";

type ConfirmAction = {
  taskId: string;
  taskTitle: string;
  status: EmployeeTask["status"];
} | null;

export default function EmployeeTaskManagement() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "due" | "open" | "completed" | "skipped" | "cancelled">("all");
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [lastGeneration, setLastGeneration] = useState<string | null>(null);

  const { data: employeeTasks = [], isLoading } = useQuery<EmployeeTask[]>({
    queryKey: ["/api", "employee-tasks"],
  });

  const { data: employees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["/api", "employees"],
  });

  // Filter out tasks for leavers and deactivated employees
  const activeEmployeeTasks = employeeTasks.filter(task => {
    const employee = employees.find(emp => emp.id === task.employeeId);
    return employee && employee.status !== "leaver" && employee.status !== "deactivated";
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EmployeeTask["status"] }) => {
      const response = await fetch(`/api/employee-tasks/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update task status");
      }
      
      return response.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api", "employees"] });
      
      toast({
        title: "✅ Success!",
        description: "The employee task status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating employee task",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPendingTaskId(null);
      setConfirmAction(null);
    },
  });

  const regenerateTasksMutation = useMutation({
    mutationFn: async () => {
      // Fetch employees and existing tasks from database
      const [employeesResponse, tasksResponse] = await Promise.all([
        fetch("/api/employees", { credentials: "include" }),
        fetch("/api/employee-tasks", { credentials: "include" })
      ]);

      if (!employeesResponse.ok || !tasksResponse.ok) {
        throw new Error("Failed to fetch employees or tasks from database");
      }

      const allEmployees: EmployeeRecord[] = await employeesResponse.json();
      const existingTasks: EmployeeTask[] = await tasksResponse.json();
      let totalGenerated = 0;
      let errorCount = 0;
      
      // Process each employee with individual error handling to prevent cascade failures
      for (const employee of allEmployees) {
        try {
          // Generate both employee-specific tasks (RTW, probation, etc.) and HR template tasks
          const employeeTasksResult = generateEmployeeTasks(employee, existingTasks);
          const hrTasksResult = generateHRTemplateTasks(employee, existingTasks);
          
          // Combine both sets of tasks and save in one operation to preserve task IDs
          const allTasks = [...employeeTasksResult.generatedTasks, ...hrTasksResult.generatedTasks];
          
          if (allTasks.length > 0) {
            await saveGeneratedTasks(employee, allTasks);
            totalGenerated += allTasks.length;
          }
        } catch (employeeError) {
          console.error(`Failed to generate tasks for employee ${employee.id}:`, employeeError);
          errorCount++;
        }
      }
      
      // Update last generation timestamp even if some employees failed
      const timestamp = DateTime.now().setZone("Europe/London").toISO();
      if (timestamp) {
        localStorageService.setLastEmployeeTaskGeneration(timestamp);
        setLastGeneration(timestamp);
      }
      
      return { totalGenerated, totalEmployees: allEmployees.length, errorCount };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      
      const description = result.errorCount > 0
        ? `Generated ${result.totalGenerated} new task(s) for ${result.totalEmployees} employee(s). ${result.errorCount} employee(s) had errors - check console for details.`
        : `Generated ${result.totalGenerated} new task(s) for ${result.totalEmployees} employee(s). RTW expiry tasks are now visible!`;
      
      toast({
        title: result.errorCount > 0 ? "Tasks regenerated with errors" : "Tasks regenerated successfully",
        description,
        variant: result.errorCount > 0 ? "destructive" : "default",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error regenerating tasks",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Load last generation timestamp on mount
  useEffect(() => {
    const lastGen = localStorageService.getLastEmployeeTaskGeneration();
    setLastGeneration(lastGen);
  }, []);

  // Helper to get generation status
  const getGenerationStatus = () => {
    if (!lastGeneration) {
      return { message: "Never generated", isRecent: false };
    }
    
    const lastGenTime = DateTime.fromISO(lastGeneration, { zone: "Europe/London" });
    const now = DateTime.now().setZone("Europe/London");
    const hoursDiff = now.diff(lastGenTime, 'hours').hours;
    
    if (hoursDiff < 1) {
      return { 
        message: `Last generated ${Math.round(hoursDiff * 60)} minutes ago`, 
        isRecent: true 
      };
    }
    
    return { 
      message: `Last generated ${Math.round(hoursDiff)} hours ago - Click to refresh`, 
      isRecent: false 
    };
  };

  const generationStatus = getGenerationStatus();

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    setPendingTaskId(confirmAction.taskId);
    updateStatusMutation.mutate({ id: confirmAction.taskId, status: confirmAction.status });
  };

  const getConfirmDialogContent = () => {
    if (!confirmAction) return { title: "", description: "", actionLabel: "" };
    
    switch (confirmAction.status) {
      case "completed":
        return {
          title: "Mark Task as Completed?",
          description: `Are you sure you want to mark "${confirmAction.taskTitle}" as completed?`,
          actionLabel: "COMPLETE",
        };
      case "skipped":
        return {
          title: "Skip Task?",
          description: `Are you sure you want to skip "${confirmAction.taskTitle}"?`,
          actionLabel: "SKIP",
        };
      case "cancelled":
        return {
          title: "Cancel Task?",
          description: `Are you sure you want to cancel "${confirmAction.taskTitle}"?`,
          actionLabel: "CANCEL TASK",
        };
      case "open":
        return {
          title: "Reopen Task?",
          description: `Are you sure you want to reopen "${confirmAction.taskTitle}"?`,
          actionLabel: "REOPEN",
        };
      default:
        return { title: "", description: "", actionLabel: "" };
    }
  };

  // Sort tasks by due date (earliest first)
  const sortedTasks = [...activeEmployeeTasks].sort((a, b) => {
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });

  const filteredTasks = sortedTasks.filter((task) => {
    if (filter === "all") return true;
    
    // Due: overdue, due today, or due within 30 days
    if (filter === "due") {
      if (task.status !== "open") return false;
      
      const dueDate = DateTime.fromISO(task.dueAt, { zone: "Europe/London" });
      const now = DateTime.now().setZone("Europe/London");
      const daysUntil = dueDate.diff(now, "days").days;
      
      return daysUntil <= 30;
    }
    
    return task.status === filter;
  });

  // Count for "Due" tab (overdue, due today, or due within 30 days)
  const dueCount = activeEmployeeTasks.filter((task) => {
    if (task.status !== "open") return false;
    const dueDate = DateTime.fromISO(task.dueAt, { zone: "Europe/London" });
    const now = DateTime.now().setZone("Europe/London");
    const daysUntil = dueDate.diff(now, "days").days;
    return daysUntil <= 30;
  }).length;

  const getStatusBadge = (status: EmployeeTask["status"]) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="gap-1"><Circle className="h-3 w-3" /> Open</Badge>;
      case "completed":
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
      case "skipped":
        return <Badge variant="secondary" className="gap-1"><MinusCircle className="h-3 w-3" /> Skipped</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (dueAt: string, status: EmployeeTask["status"]) => {
    if (status !== "open") return null;
    
    const taskStatus = getTaskStatus(dueAt);
    switch (taskStatus) {
      case "overdue":
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" /> Overdue</Badge>;
      case "due_soon":
        return <Badge variant="default" className="gap-1 bg-yellow-500 text-white"><AlertCircle className="h-3 w-3" /> Due Soon</Badge>;
      default:
        return null;
    }
  };

  const getDaysUntilText = (dueAt: string) => {
    const days = getDaysUntilDue(dueAt);
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `${days} days`;
  };

  const getTaskTypeBadge = (taskType: EmployeeTask["taskType"]) => {
    const labels: Record<EmployeeTask["taskType"], string> = {
      provide_uk_address: "UK Address",
      provide_uk_bank_address: "Bank Address",
      provide_national_insurance: "NI Number",
      passport_expiry: "Passport",
      visa_expiry: "Visa",
      rtw_expiry: "RTW Check",
      probation_review: "Probation",
      contract_end: "Contract End",
      keep_passport_copy: "Copy Passport",
      keep_visa_copy: "Copy Visa",
      keep_rtw_copy: "Copy RTW",
      keep_contract_copy: "Copy Contract",
      hr_template: "HR Task",
      hr_template_monthly: "HR Monthly",
      hr_template_annual: "HR Annual",
      residency_template: "Residency Task",
      residency_template_weekly: "Residency Weekly",
      residency_template_monthly: "Residency Monthly",
      residency_template_quarterly: "Residency Quarterly",
      residency_template_annually: "Residency Annual",
      leaver_task: "Leaver Task",
      other: "Other",
    };
    return <Badge variant="outline" className="text-xs">{labels[taskType]}</Badge>;
  };

  const taskCounts = {
    all: activeEmployeeTasks.length,
    due: dueCount,
    open: activeEmployeeTasks.filter(t => t.status === "open").length,
    completed: activeEmployeeTasks.filter(t => t.status === "completed").length,
    skipped: activeEmployeeTasks.filter(t => t.status === "skipped").length,
    cancelled: activeEmployeeTasks.filter(t => t.status === "cancelled").length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Circle className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-5 w-5" />
                Employee Task Management
              </CardTitle>
              <CardDescription>
                Track and manage employee-specific tasks
              </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={() => regenerateTasksMutation.mutate()}
                disabled={regenerateTasksMutation.isPending}
                variant="outline"
                data-testid="button-regenerate-tasks"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regenerateTasksMutation.isPending ? 'animate-spin' : ''}`} />
                {regenerateTasksMutation.isPending ? 'Regenerating...' : 'Regenerate All Tasks'}
              </Button>
              <div className={`flex items-center gap-1 text-xs ${generationStatus.isRecent ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {generationStatus.isRecent ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <AlertCircle className="h-3 w-3" />
                )}
                <span>{generationStatus.message}</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all" data-testid="employee-tab-all">
                All ({taskCounts.all})
              </TabsTrigger>
              <TabsTrigger value="due" data-testid="employee-tab-due">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Due ({taskCounts.due})
                </span>
              </TabsTrigger>
              <TabsTrigger value="open" data-testid="employee-tab-open">
                Open ({taskCounts.open})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="employee-tab-completed">
                Completed ({taskCounts.completed})
              </TabsTrigger>
              <TabsTrigger value="skipped" data-testid="employee-tab-skipped">
                Skipped ({taskCounts.skipped})
              </TabsTrigger>
              <TabsTrigger value="cancelled" data-testid="employee-tab-cancelled">
                Cancelled ({taskCounts.cancelled})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-6">
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No employee tasks found. Tasks are automatically created when adding employees.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>RTW Expiry</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTasks.map((task) => {
                      const taskStatus = task.status === "open" ? getTaskStatus(task.dueAt) : null;
                      const rowClassName = taskStatus === "overdue" 
                        ? "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30" 
                        : taskStatus === "due_soon" 
                        ? "bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/30"
                        : "";
                      
                      return (
                      <TableRow key={task.id} data-testid={`employee-task-row-${task.id}`} className={rowClassName}>
                        <TableCell className="font-medium">
                          {task.employeeName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {task.companyName}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{task.title}</div>
                            {task.description && (
                              <div className="text-sm text-muted-foreground">{task.description}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTaskTypeBadge(task.taskType)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{formatDueDate(task.dueAt)}</div>
                            {task.status === "open" && (
                              <div className="text-sm text-muted-foreground">
                                {getDaysUntilText(task.dueAt)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const employee = employees.find(e => e.id === task.employeeId);
                            if (!employee?.rtwExpiryDate || employee.rtwExpiryIndefinite) {
                              return <span className="text-sm text-muted-foreground">-</span>;
                            }
                            const rtwDate = new Date(employee.rtwExpiryDate);
                            const days = Math.floor((rtwDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                            return (
                              <div>
                                <div className="text-sm">{format(rtwDate, "PP")}</div>
                                <div className={`text-xs ${days < 0 ? 'text-red-600' : days <= 30 ? 'text-orange-600' : 'text-muted-foreground'}`}>
                                  {days < 0 ? `${Math.abs(days)}d overdue` : days <= 30 ? `${days}d left` : ''}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {getPriorityBadge(task.dueAt, task.status)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(task.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {task.status === "open" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={pendingTaskId === task.id}
                                  onClick={() => setConfirmAction({ taskId: task.id, taskTitle: task.title, status: "completed" })}
                                  data-testid={`button-mark-completed-${task.id}`}
                                >
                                  <CheckCircle2 className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={pendingTaskId === task.id}
                                  onClick={() => setConfirmAction({ taskId: task.id, taskTitle: task.title, status: "skipped" })}
                                  data-testid={`button-mark-skipped-${task.id}`}
                                >
                                  <MinusCircle className="h-3 w-3" />
                                </Button>
                              </>
                            )}
                            {(task.status === "completed" || task.status === "skipped") && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={pendingTaskId === task.id}
                                onClick={() => setConfirmAction({ taskId: task.id, taskTitle: task.title, status: "open" })}
                                data-testid={`button-reopen-${task.id}`}
                              >
                                <Circle className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog 
        open={!!confirmAction} 
        onOpenChange={(open) => {
          if (!open && !updateStatusMutation.isPending) {
            setConfirmAction(null);
          }
        }}
      >
        <AlertDialogContent data-testid="employee-dialog-confirm-action">
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={updateStatusMutation.isPending}
              data-testid="employee-button-cancel-action"
            >
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              disabled={updateStatusMutation.isPending}
              data-testid="employee-button-confirm-action"
            >
              {getConfirmDialogContent().actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
