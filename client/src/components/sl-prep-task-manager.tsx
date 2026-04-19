import { useState } from "react";
import type { SLPrepTask } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, CheckCircle2, AlertTriangle, ChevronUp, ChevronDown, Download, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

export function SLPrepTaskManager() {
  const { toast } = useToast();
  
  // Fetch SL Prep Tasks from API
  const { data: tasks = [], isLoading: isLoadingTasks } = useQuery<SLPrepTask[]>({
    queryKey: ["/api", "sl-prep-tasks"],
  });

  // Create SL Prep Task Mutation
  const createSLPrepTask = useMutation({
    mutationFn: async (task: Omit<SLPrepTask, "id" | "createdAt">) => {
      return await apiRequest("POST", "/api/sl-prep-tasks", task);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "sl-prep-tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error Creating Task",
        description: error instanceof Error ? error.message : "Failed to create SL prep task",
        variant: "destructive",
      });
    },
  });

  // Update SL Prep Task Mutation
  const updateSLPrepTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SLPrepTask> }) => {
      return await apiRequest("PATCH", `/api/sl-prep-tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "sl-prep-tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error Updating Task",
        description: error instanceof Error ? error.message : "Failed to update SL prep task",
        variant: "destructive",
      });
    },
  });

  // Delete SL Prep Task Mutation
  const deleteSLPrepTask = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/sl-prep-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "sl-prep-tasks"] });
    },
    onError: (error) => {
      toast({
        title: "Error Deleting Task",
        description: error instanceof Error ? error.message : "Failed to delete SL prep task",
        variant: "destructive",
      });
    },
  });

  // Form State
  const [newTaskName, setNewTaskName] = useState("");
  const [editingTask, setEditingTask] = useState<SLPrepTask | null>(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [deletingTask, setDeletingTask] = useState<SLPrepTask | null>(null);
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

    const taskData = {
      name: newTaskName.trim(),
      order: tasks.length,
    };

    try {
      await createSLPrepTask.mutateAsync(taskData);
      setNewTaskName("");
      
      toast({
        title: "✅ Success!",
        description: "Task added successfully",
      });
    } catch (error) {
      console.error("Failed to add SL prep task:", error);
      // Error toast is already shown by mutation's onError
    }
  };

  const handleStartEdit = (task: SLPrepTask) => {
    setEditingTask(task);
    setEditTaskName(task.name);
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

    if (editingTask) {
      const updates = {
        name: editTaskName.trim(),
      };

      try {
        await updateSLPrepTask.mutateAsync({
          id: editingTask.id,
          updates,
        });
        
        setEditingTask(null);
        setEditTaskName("");
        
        toast({
          title: "✅ Success!",
          description: "Task updated successfully",
        });
      } catch (error) {
        console.error("Failed to update SL prep task:", error);
        // Error toast is already shown by mutation's onError
      }
    }
  };

  const handleStartDelete = (task: SLPrepTask) => {
    setDeletingTask(task);
    setDeleteReason("");
  };

  const handleConfirmDelete = async () => {
    if (deleteReason.trim().length < 10) {
      return;
    }

    if (deletingTask) {
      try {
        await deleteSLPrepTask.mutateAsync(deletingTask.id);
        
        setDeletingTask(null);
        setDeleteReason("");
        
        toast({
          title: "✅ Success!",
          description: "Task deleted from all companies",
        });
      } catch (error) {
        console.error("Failed to delete SL prep task:", error);
        // Error toast is already shown by mutation's onError
      }
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    
    const newTasks = [...tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[index - 1];
    newTasks[index - 1] = temp;
    
    try {
      // Update order values
      for (let i = 0; i < newTasks.length; i++) {
        await updateSLPrepTask.mutateAsync({
          id: newTasks[i].id,
          updates: { order: i },
        });
      }
      
      toast({
        title: "Task reordered",
        description: "Task order updated successfully",
      });
    } catch (error) {
      console.error("Failed to reorder tasks:", error);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === tasks.length - 1) return;
    
    const newTasks = [...tasks];
    const temp = newTasks[index];
    newTasks[index] = newTasks[index + 1];
    newTasks[index + 1] = temp;
    
    try {
      // Update order values
      for (let i = 0; i < newTasks.length; i++) {
        await updateSLPrepTask.mutateAsync({
          id: newTasks[i].id,
          updates: { order: i },
        });
      }
      
      toast({
        title: "Task reordered",
        description: "Task order updated successfully",
      });
    } catch (error) {
      console.error("Failed to reorder tasks:", error);
    }
  };

  const deleteReasonLength = deleteReason.trim().length;
  const isDeleteReasonValid = deleteReasonLength >= 10;

  const handleExportCSV = () => {
    if (tasks.length === 0) {
      toast({
        title: "No Data",
        description: "There are no tasks to export",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = ["Task ID", "Task Name", "Order", "Created At"];
    const csvRows = tasks.map(task => {
      const escapeField = (field: string | number) => `"${String(field).replace(/"/g, '""')}"`;
      return [
        escapeField(task.id),
        escapeField(task.name),
        escapeField(task.order),
        escapeField(task.createdAt)
      ].join(",");
    });
    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sl-prep-tasks-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export Successful",
      description: `Exported ${tasks.length} task${tasks.length !== 1 ? 's' : ''} with all fields to CSV`,
    });
  };

  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(line => line.trim());
        
        if (lines.length < 2) {
          toast({
            title: "Error",
            description: "CSV file is empty or invalid",
            variant: "destructive",
          });
          return;
        }

        const header = lines[0].toLowerCase();
        if (!header.includes("task name")) {
          toast({
            title: "Error",
            description: "CSV must have 'Task Name' column",
            variant: "destructive",
          });
          return;
        }

        let successCount = 0;
        let skipCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          const taskName = line.replace(/^"(.*)"$/, '$1').replace(/""/g, '"').trim();
          
          if (!taskName) {
            skipCount++;
            continue;
          }

          const taskData = {
            name: taskName,
            order: tasks.length + successCount,
          };

          try {
            await createSLPrepTask.mutateAsync(taskData);
            successCount++;
          } catch (error) {
            console.error("Failed to import task:", error);
            skipCount++;
          }
        }
        
        toast({
          title: "Import Successful",
          description: `Imported ${successCount} task${successCount !== 1 ? 's' : ''}${skipCount > 0 ? `, skipped ${skipCount}` : ''}`,
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

  return (
    <div className="space-y-6">
      <Card data-testid="card-sl-prep-task-manager">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                SL Prep Task Manager
              </CardTitle>
              <CardDescription>
                Manage the master list of tasks required for UK Sponsorship License preparation.
                These tasks will appear on all company pages marked for SL Prep.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                disabled={tasks.length === 0}
                data-testid="button-export-csv"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('sl-import-csv')?.click()}
                data-testid="button-import-csv"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <input
                id="sl-import-csv"
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                style={{ display: 'none' }}
                data-testid="input-import-csv"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add new task */}
          <div className="flex gap-2">
            <Input
              placeholder="Enter task name (e.g., Open bank account, Register HMRC, Issue UTR...)"
              value={newTaskName}
              onChange={(e) => setNewTaskName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTaskName.trim()) {
                  handleAddTask();
                }
              }}
              data-testid="input-new-task-name"
              className="flex-1"
            />
            <Button 
              onClick={handleAddTask}
              disabled={!newTaskName.trim()}
              data-testid="button-add-task"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>

          {/* Task list */}
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tasks">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No SL prep tasks yet. Add your first task above.</p>
              <p className="text-sm mt-1">Tasks will appear on all company pages marked for SL Prep.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Task Name</TableHead>
                    <TableHead className="w-24">Order</TableHead>
                    <TableHead className="w-32 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.map((task, index) => (
                    <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        {task.name}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            data-testid={`button-move-up-${task.id}`}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === tasks.length - 1}
                            data-testid={`button-move-down-${task.id}`}
                            className="h-7 w-7 p-0"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartEdit(task)}
                            data-testid={`button-edit-task-${task.id}`}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleStartDelete(task)}
                            data-testid={`button-delete-task-${task.id}`}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent data-testid="dialog-edit-task">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update the task name. Changes will be reflected on all company pages.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Task name"
              value={editTaskName}
              onChange={(e) => setEditTaskName(e.target.value)}
              data-testid="input-edit-task-name"
              onKeyDown={(e) => {
                if (e.key === "Enter" && editTaskName.trim()) {
                  handleSaveEdit();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingTask(null)}
              data-testid="button-cancel-edit"
            >
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

      {/* Delete Task Warning Dialog */}
      <Dialog open={!!deletingTask} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <DialogContent data-testid="dialog-delete-task">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete Task - Warning
            </DialogTitle>
            <DialogDescription>
              This action will permanently delete "{deletingTask?.name}" from the master task list 
              and remove it from ALL company pages. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Reason for deletion (minimum 10 characters) *
              </label>
              <Textarea
                placeholder="Please provide a reason for deleting this task..."
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                data-testid="input-delete-reason"
                rows={3}
              />
              {deleteReasonLength > 0 && deleteReasonLength < 10 && (
                <p className="text-sm text-destructive" data-testid="text-delete-reason-error">
                  Reason must be at least 10 characters ({deleteReasonLength}/10)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingTask(null)}
              data-testid="button-cancel-delete"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={!isDeleteReasonValid}
              data-testid="button-confirm-delete"
            >
              Delete Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
