import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { localStorageService } from "@/lib/localStorage";
import type { EmployeeTask, EmployeeRecord } from "@shared/schema";
import { CheckCircle2, X, ListTodo, Calendar, RefreshCw, Check, Users, CalendarClock } from "lucide-react";
import { DateTime } from "luxon";
import { queryClient } from "@/lib/queryClient";
import { generateResidencyTemplateTasks, saveGeneratedTasks } from "@/lib/utils/employeeTaskGenerator";

export function ResidencyTasksView() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    task: EmployeeTask | null;
    newStatus: EmployeeTask["status"] | null;
  }>({ open: false, task: null, newStatus: null });
  const [confirmNote, setConfirmNote] = useState("");
  const [modifyDueDateDialog, setModifyDueDateDialog] = useState<{
    open: boolean;
    task: EmployeeTask | null;
  }>({ open: false, task: null });
  const [newDueDate, setNewDueDate] = useState("");
  const { toast } = useToast();

  // Query for last generation timestamp (so it can be invalidated and refetched)
  const { data: lastGeneration = null } = useQuery<string | null>({
    queryKey: ["lastResidencyTaskGeneration"],
    queryFn: () => localStorageService.getLastResidencyTaskGeneration(),
  });

  const { data: allTasks = [] } = useQuery<EmployeeTask[]>({
    queryKey: ["employeeTasks"],
    queryFn: () => localStorageService.getEmployeeTasks(),
  });

  const { data: employees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["employees"],
    queryFn: () => localStorageService.getEmployees(),
  });

  // Filter for residency tasks only, excluding leavers and deactivated employees
  const residencyTasks = allTasks.filter(task => {
    if (!task.taskType.startsWith("residency_template")) return false;
    const employee = employees.find(emp => emp.id === task.employeeId);
    return employee && employee.status !== "leaver" && employee.status !== "deactivated";
  });

  // Apply status filter
  const filteredTasks = residencyTasks.filter(task => {
    if (statusFilter === "all") return true;
    if (statusFilter === "due") {
      // Due Now = overdue + due today + within 30 days
      const now = DateTime.now().setZone("Europe/London");
      const dueDate = DateTime.fromISO(task.dueAt);
      const in30Days = now.plus({ days: 30 });
      return task.status === "open" && dueDate <= in30Days;
    }
    return task.status === statusFilter;
  });
  
  // Calculate counts for tabs
  const allCount = residencyTasks.length;
  const now = DateTime.now().setZone("Europe/London");
  const in30Days = now.plus({ days: 30 });
  const dueCount = residencyTasks.filter(t => 
    t.status === "open" && DateTime.fromISO(t.dueAt) <= in30Days
  ).length;
  const openCount = residencyTasks.filter(t => t.status === "open").length;
  const completedCount = residencyTasks.filter(t => t.status === "completed").length;
  const skippedCount = residencyTasks.filter(t => t.status === "skipped").length;
  const cancelledCount = residencyTasks.filter(t => t.status === "cancelled").length;

  const handleStatusChange = (task: EmployeeTask, newStatus: EmployeeTask["status"]) => {
    setConfirmDialog({ open: true, task, newStatus });
  };

  const handleConfirmStatusChange = () => {
    if (!confirmDialog.task || !confirmDialog.newStatus) return;

    if ((confirmDialog.newStatus === "completed" || confirmDialog.newStatus === "skipped" || confirmDialog.newStatus === "cancelled") && 
        confirmNote.trim().length < 10) {
      toast({
        title: "Error",
        description: "Please provide a note (minimum 10 characters)",
        variant: "destructive",
      });
      return;
    }

    const updatedTask = {
      ...confirmDialog.task,
      status: confirmDialog.newStatus,
      completionNote: confirmNote.trim() || undefined,
    };

    localStorageService.updateEmployeeTask(confirmDialog.task.id, updatedTask);
    queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });

    toast({
      title: "Success",
      description: `Task marked as ${confirmDialog.newStatus}`,
    });

    setConfirmDialog({ open: false, task: null, newStatus: null });
    setConfirmNote("");
  };

  const handleModifyDueDate = (task: EmployeeTask) => {
    // Format the current due date for the date input (YYYY-MM-DD)
    const currentDate = DateTime.fromISO(task.dueAt).toFormat("yyyy-MM-dd");
    setNewDueDate(currentDate);
    setModifyDueDateDialog({ open: true, task });
  };

  const handleConfirmModifyDueDate = () => {
    if (!modifyDueDateDialog.task || !newDueDate) return;

    // Convert the selected date to ISO string with Europe/London timezone
    const selectedDate = DateTime.fromISO(newDueDate, { zone: "Europe/London" });
    const updatedTask = {
      ...modifyDueDateDialog.task,
      dueAt: selectedDate.toISO() || selectedDate.toUTC().toISO() || new Date().toISOString(),
    };

    localStorageService.updateEmployeeTask(modifyDueDateDialog.task.id, updatedTask);
    queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });

    toast({
      title: "Success",
      description: `Due date updated to ${selectedDate.toFormat("MMM d, yyyy")}`,
    });

    setModifyDueDateDialog({ open: false, task: null });
    setNewDueDate("");
  };

  // Regenerate all residency tasks mutation
  const regenerateTasksMutation = useMutation({
    mutationFn: async () => {
      const allEmployees = localStorageService.getEmployees();
      const residencyEmployees = allEmployees.filter((e: EmployeeRecord) => e.isResidencyService);
      let totalGenerated = 0;
      let errorCount = 0;
      
      residencyEmployees.forEach((employee: EmployeeRecord) => {
        try {
          const result = generateResidencyTemplateTasks(employee);
          if (result.generatedTasks.length > 0) {
            saveGeneratedTasks(employee, result.generatedTasks);
            totalGenerated += result.generatedTasks.length;
          }
        } catch (employeeError) {
          console.error(`Failed to generate residency tasks for employee ${employee.id}:`, employeeError);
          errorCount++;
        }
      });
      
      // Update last generation timestamp
      const timestamp = DateTime.now().setZone("Europe/London").toISO();
      if (timestamp) {
        localStorageService.setLastResidencyTaskGeneration(timestamp);
      }
      
      return { totalGenerated, errorCount };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["lastResidencyTaskGeneration"] });
      
      toast({
        title: "Success",
        description: `Generated ${data.totalGenerated} residency tasks${data.errorCount > 0 ? ` (${data.errorCount} errors)` : ''}`,
      });
    },
    onError: (error) => {
      console.error("Failed to regenerate residency tasks:", error);
      toast({
        title: "Error",
        description: "Failed to regenerate residency tasks. Please try again.",
        variant: "destructive",
      });
    },
  });

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
        message: `Last generated ${Math.floor(hoursDiff * 60)} minutes ago`,
        isRecent: true 
      };
    } else if (hoursDiff < 24) {
      return { 
        message: `Last generated ${Math.floor(hoursDiff)} hours ago`,
        isRecent: true 
      };
    } else {
      return { 
        message: `Last generated ${Math.floor(hoursDiff / 24)} days ago`,
        isRecent: false 
      };
    }
  };

  const generationStatus = getGenerationStatus();

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: "bg-red-50 text-red-700 border-red-200",
      high: "bg-orange-50 text-orange-700 border-orange-200",
      medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
      low: "bg-blue-50 text-blue-700 border-blue-200",
    };
    return variants[priority as keyof typeof variants] || variants.medium;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "open":
        return "secondary";
      case "skipped":
      case "cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };

  const isOverdue = (task: EmployeeTask) => {
    if (task.status !== "open") return false;
    return DateTime.fromISO(task.dueAt) < DateTime.now().setZone("Europe/London");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Residency Tasks
          </CardTitle>
          <CardDescription>
            All residency-related tasks for employees with residency service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                variant="outline"
                onClick={() => regenerateTasksMutation.mutate()}
                disabled={regenerateTasksMutation.isPending}
                data-testid="button-regenerate-residency-tasks"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regenerateTasksMutation.isPending ? 'animate-spin' : ''}`} />
                {regenerateTasksMutation.isPending ? 'Regenerating...' : 'Regenerate All Tasks'}
              </Button>
              <div className={`flex items-center gap-1 text-xs ${generationStatus.isRecent ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                {generationStatus.isRecent ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <RefreshCw className="h-3 w-3" />
                )}
                <span>{generationStatus.message}</span>
              </div>
            </div>
          </div>
          
          <Tabs value={statusFilter} onValueChange={setStatusFilter} className="mb-4">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="all" data-testid="tab-all">
                All ({allCount})
              </TabsTrigger>
              <TabsTrigger value="due" data-testid="tab-due">
                Due Now ({dueCount})
              </TabsTrigger>
              <TabsTrigger value="open" data-testid="tab-open">
                Open ({openCount})
              </TabsTrigger>
              <TabsTrigger value="completed" data-testid="tab-completed">
                Completed ({completedCount})
              </TabsTrigger>
              <TabsTrigger value="skipped" data-testid="tab-skipped">
                Skipped ({skippedCount})
              </TabsTrigger>
              <TabsTrigger value="cancelled" data-testid="tab-cancelled">
                Cancelled ({cancelledCount})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {residencyTasks.length === 0 
                ? "No residency tasks found. Create task templates to get started."
                : "No tasks match the selected filter."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow 
                      key={task.id} 
                      data-testid={`task-row-${task.id}`}
                      className={isOverdue(task) ? "bg-red-50" : ""}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {task.meta?.dependantName ? (
                            <>
                              <Users className="h-4 w-4 text-purple-600" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span>{task.meta.dependantName}</span>
                                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                    Dependant
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  of {task.employeeName}
                                </p>
                              </div>
                            </>
                          ) : (
                            <span>{task.employeeName}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{task.companyName}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-sm text-muted-foreground">{task.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className={isOverdue(task) ? "text-red-600 font-semibold" : ""}>
                            {DateTime.fromISO(task.dueAt).toFormat("MMM d, yyyy")}
                          </span>
                        </div>
                        {isOverdue(task) && (
                          <Badge variant="outline" className="mt-1 bg-red-50 text-red-700 border-red-200 text-xs">
                            Overdue
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getPriorityBadge(task.priority)}>
                          {task.priority}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadge(task.status)}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 flex-wrap">
                          {task.status === "open" && (
                            <>
                              {/* Show Modify Due Date button only for one_time tasks */}
                              {task.meta?.recurrence === "one_time" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleModifyDueDate(task)}
                                  data-testid={`button-modify-due-date-${task.id}`}
                                >
                                  <CalendarClock className="h-3 w-3 mr-1" />
                                  Modify Due Date
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task, "completed")}
                                data-testid={`button-complete-${task.id}`}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Complete
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(task, "skipped")}
                                data-testid={`button-skip-${task.id}`}
                              >
                                <X className="h-3 w-3 mr-1" />
                                Skip
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Change Confirmation Dialog */}
      <Dialog 
        open={confirmDialog.open} 
        onOpenChange={(open) => !open && setConfirmDialog({ open: false, task: null, newStatus: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              You are changing the status to "{confirmDialog.newStatus}". Please provide a note explaining this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="confirm-note">Note * (minimum 10 characters)</Label>
              <Textarea
                id="confirm-note"
                placeholder="Enter a note explaining this status change"
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                data-testid="textarea-confirm-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog({ open: false, task: null, newStatus: null });
                setConfirmNote("");
              }}
              data-testid="button-cancel-confirm"
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmStatusChange} data-testid="button-confirm-status">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modify Due Date Dialog */}
      <Dialog 
        open={modifyDueDateDialog.open} 
        onOpenChange={(open) => !open && setModifyDueDateDialog({ open: false, task: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modify Due Date</DialogTitle>
            <DialogDescription>
              Change the due date for this one-time residency task: {modifyDueDateDialog.task?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-due-date">New Due Date *</Label>
              <Input
                id="new-due-date"
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                data-testid="input-new-due-date"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setModifyDueDateDialog({ open: false, task: null });
                setNewDueDate("");
              }}
              data-testid="button-cancel-modify-due-date"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmModifyDueDate} 
              data-testid="button-confirm-modify-due-date"
              disabled={!newDueDate}
            >
              Update Due Date
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ResidencyTasksView;
