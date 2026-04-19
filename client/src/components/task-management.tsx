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
import { api } from "@/lib/api";
import { formatDueDate, getDaysUntilDue, getTaskStatus } from "@/lib/utils/taskGenerator";
import { CheckCircle2, XCircle, MinusCircle, Circle, RefreshCw, AlertCircle, Clock, Download } from "lucide-react";
import type { Task } from "@shared/schema";
import { DateTime } from "luxon";
import { format } from "date-fns";

type ConfirmAction = {
  taskId: string;
  taskTitle: string;
  status: Task["status"];
} | null;

export default function TaskManagement() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "due" | "open" | "done" | "skipped" | "cancelled">("all");
  const [isGenerating, setIsGenerating] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: api.getTasks,
  });

  const { data: lastGeneration } = useQuery<string | null>({
    queryKey: ["last-task-generation"],
    queryFn: api.getLastTaskGenerationTimestamp,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: Task["status"] }) =>
      api.updateTaskStatus(id, status),
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
      
      // Auto-regenerate tasks when task is marked done or cancelled
      if (variables.status === "done" || variables.status === "cancelled") {
        try {
          await api.generateTasks();
          queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
          queryClient.invalidateQueries({ queryKey: ["last-task-generation"] });
        } catch (error) {
          console.error("Failed to auto-generate tasks:", error);
        }
      }
      
      toast({
        title: "Task status updated",
        description: "The task status has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating task",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      // Clear pending state after mutation completes (success or error)
      setPendingTaskId(null);
      setConfirmAction(null);
    },
  });

  const handleConfirmAction = () => {
    if (!confirmAction) return;
    setPendingTaskId(confirmAction.taskId);
    updateStatusMutation.mutate({ id: confirmAction.taskId, status: confirmAction.status });
  };

  const getConfirmDialogContent = () => {
    if (!confirmAction) return { title: "", description: "", actionLabel: "" };
    
    switch (confirmAction.status) {
      case "done":
        return {
          title: "Mark Task as Done?",
          description: `Are you sure you want to mark "${confirmAction.taskTitle}" as done? This action will be logged in the audit trail.`,
          actionLabel: "DONE",
        };
      case "skipped":
        return {
          title: "Skip Task?",
          description: `Are you sure you want to skip "${confirmAction.taskTitle}"? This action will be logged in the audit trail.`,
          actionLabel: "SKIP",
        };
      case "open":
        return {
          title: "Reopen Task?",
          description: `Are you sure you want to reopen "${confirmAction.taskTitle}"? This action will be logged in the audit trail.`,
          actionLabel: "REOPEN",
        };
      default:
        return { title: "", description: "", actionLabel: "" };
    }
  };

  const handleGenerateTasks = async () => {
    setIsGenerating(true);
    try {
      const result = await api.generateTasks();
      await queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
      await queryClient.refetchQueries({ queryKey: ["last-task-generation"] });
      toast({
        title: "Tasks generated",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Error generating tasks",
        description: error instanceof Error ? error.message : "Failed to generate tasks",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = () => {
    if (tasks.length === 0) {
      toast({
        title: "No Data",
        description: "There are no company tasks to export",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = [
      "Task ID",
      "Company ID", 
      "Company Name",
      "Task Title",
      "Description",
      "Due Date",
      "Status",
      "Unique Key",
      "Renewal Date",
      "Created At",
      "Reviewed",
      "Reviewed At",
      "Reviewer Note"
    ];

    const escapeField = (field: any) => {
      if (field === null || field === undefined) return '""';
      const str = String(field);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const csvRows = tasks.map(task => [
      escapeField(task.id),
      escapeField(task.companyId),
      escapeField(task.companyName),
      escapeField(task.title),
      escapeField(task.description || ''),
      escapeField(task.dueAt),
      escapeField(task.status),
      escapeField(task.uniqueKey),
      escapeField(task.renewalDate),
      escapeField(task.createdAt || ''),
      escapeField(task.reviewed || false),
      escapeField(task.reviewedAt || ''),
      escapeField(task.reviewerNote || '')
    ].join(","));

    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `company-tasks-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Exported ${tasks.length} task${tasks.length !== 1 ? 's' : ''} with all fields to CSV`,
    });
  };

  // Sort tasks by due date (earliest first)
  const sortedTasks = [...tasks].sort((a, b) => {
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
      
      // Show if overdue (negative days), due today, or due within 30 days
      return daysUntil <= 30;
    }
    
    return task.status === filter;
  });

  // Count for "Due" tab (overdue, due today, or due within 30 days)
  const dueCount = tasks.filter((task) => {
    if (task.status !== "open") return false;
    const dueDate = DateTime.fromISO(task.dueAt, { zone: "Europe/London" });
    const now = DateTime.now().setZone("Europe/London");
    const daysUntil = dueDate.diff(now, "days").days;
    return daysUntil <= 30;
  }).length;

  const getStatusBadge = (status: Task["status"]) => {
    switch (status) {
      case "open":
        return <Badge variant="outline" className="gap-1"><Circle className="h-3 w-3" /> Open</Badge>;
      case "done":
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle2 className="h-3 w-3" /> Done</Badge>;
      case "skipped":
        return <Badge variant="secondary" className="gap-1"><MinusCircle className="h-3 w-3" /> Skipped</Badge>;
      case "cancelled":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default:
        return null;
    }
  };

  const getPriorityBadge = (dueAt: string, status: Task["status"]) => {
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

  const getActualDueInfo = (task: Task) => {
    // For CS tasks with advance due date, show actual due date
    if (task.meta?.actualDueAt) {
      const actualDueDays = getDaysUntilDue(task.meta.actualDueAt);
      return {
        actualDate: formatDueDate(task.meta.actualDueAt),
        daysRemaining: actualDueDays,
      };
    }
    return null;
  };

  const taskCounts = {
    all: tasks.length,
    due: dueCount,
    open: tasks.filter(t => t.status === "open").length,
    done: tasks.filter(t => t.status === "done").length,
    skipped: tasks.filter(t => t.status === "skipped").length,
    cancelled: tasks.filter(t => t.status === "cancelled").length,
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
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
              <CardTitle>Task Management</CardTitle>
              <CardDescription>
                <div className="flex flex-col gap-1">
                  <span>Automated tasks generated from company renewal dates</span>
                  {lastGeneration && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last generated: {format(new Date(lastGeneration), "dd MMM yyyy 'at' HH:mm")}
                    </span>
                  )}
                </div>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleExportCSV}
                variant="outline"
                className="gap-2"
                disabled={tasks.length === 0}
                data-testid="button-export-tasks-csv"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button
                onClick={handleGenerateTasks}
                disabled={isGenerating}
                className="gap-2"
                data-testid="button-generate-tasks"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Generate Tasks
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all">
                All ({taskCounts.all})
              </TabsTrigger>
              <TabsTrigger value="due" data-testid="tab-due">
                <span className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Due ({taskCounts.due})
                </span>
              </TabsTrigger>
              <TabsTrigger value="open" data-testid="tab-open">
                Open ({taskCounts.open})
              </TabsTrigger>
              <TabsTrigger value="done" data-testid="tab-done">
                Done ({taskCounts.done})
              </TabsTrigger>
              <TabsTrigger value="skipped" data-testid="tab-skipped">
                Skipped ({taskCounts.skipped})
              </TabsTrigger>
              <TabsTrigger value="cancelled" data-testid="tab-cancelled">
                Cancelled ({taskCounts.cancelled})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-6">
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No tasks found. Click "Generate Tasks" to create tasks from company renewal dates.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed</TableHead>
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
                      <TableRow key={task.id} data-testid={`task-row-${task.id}`} className={rowClassName}>
                        <TableCell className="font-medium">
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
                          <div>
                            <div>{formatDueDate(task.dueAt)}</div>
                            {task.status === "open" && (
                              <div className="text-sm text-muted-foreground">
                                {getDaysUntilText(task.dueAt)}
                              </div>
                            )}
                            {getActualDueInfo(task) && (
                              <div className="mt-1 pt-1 border-t border-dashed">
                                <div className="text-xs font-medium text-primary">
                                  Actual due: {getActualDueInfo(task)?.actualDate}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {getActualDueInfo(task)!.daysRemaining < 0 
                                    ? `${Math.abs(getActualDueInfo(task)!.daysRemaining)} days past`
                                    : `${getActualDueInfo(task)!.daysRemaining} days remaining`
                                  }
                                </div>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPriorityBadge(task.dueAt, task.status)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(task.status)}
                        </TableCell>
                        <TableCell>
                          {(task.status === "done" || task.status === "cancelled") ? (
                            task.reviewed ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200" data-testid={`badge-reviewed-${task.id}`}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Reviewed
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200" data-testid={`badge-pending-${task.id}`}>
                                Pending
                              </Badge>
                            )
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {task.status === "open" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={pendingTaskId === task.id}
                                  onClick={() => setConfirmAction({ taskId: task.id, taskTitle: task.title, status: "done" })}
                                  data-testid={`button-mark-done-${task.id}`}
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
                            {(task.status === "done" || task.status === "skipped") && (
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
          // Only allow closing if no mutation is pending
          if (!open && !updateStatusMutation.isPending) {
            setConfirmAction(null);
          }
        }}
      >
        <AlertDialogContent data-testid="dialog-confirm-action">
          <AlertDialogHeader>
            <AlertDialogTitle>{getConfirmDialogContent().title}</AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmDialogContent().description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={updateStatusMutation.isPending}
              data-testid="button-cancel-action"
            >
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmAction}
              disabled={updateStatusMutation.isPending}
              data-testid="button-confirm-action"
            >
              {getConfirmDialogContent().actionLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
