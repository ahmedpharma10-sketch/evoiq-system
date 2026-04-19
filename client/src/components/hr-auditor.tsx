import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, FileCheck, Users, UserCog } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { EmployeeTask, PendingEmployeeStatusChange, EmployeeRecord } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { localStorageService } from "@/lib/localStorage";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function HRAuditor() {
  const { toast } = useToast();
  const [reviewDialogTask, setReviewDialogTask] = useState<EmployeeTask | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reopenDialogTask, setReopenDialogTask] = useState<EmployeeTask | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [approveDialogRequest, setApproveDialogRequest] = useState<PendingEmployeeStatusChange | null>(null);
  const [rejectDialogRequest, setRejectDialogRequest] = useState<PendingEmployeeStatusChange | null>(null);
  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const { data: employeeTasks = [], isLoading } = useQuery<EmployeeTask[]>({
    queryKey: ["/api", "employee-tasks"],
  });

  const { data: employees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["/api", "employees"],
  });

  const { data: pendingStatusChanges = [] } = useQuery<PendingEmployeeStatusChange[]>({
    queryKey: ["pendingEmployeeStatusChanges"],
    queryFn: () => localStorageService.getPendingEmployeeStatusChanges().filter(r => r.status === "pending"),
  });

  // Filter out tasks for leavers and deactivated employees
  const activeEmployeeTasks = employeeTasks.filter(task => {
    const employee = employees.find(emp => emp.id === task.employeeId);
    return employee && employee.status !== "leaver" && employee.status !== "deactivated";
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const response = await fetch(`/api/employee-tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          reviewed: true,
          reviewerNote: note,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to review task");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "employee-tasks"] });
      setReviewDialogTask(null);
      setReviewNote("");
      toast({
        title: "✅ Success!",
        description: "The employee task has been marked as reviewed successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error reviewing task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReviewClick = (task: EmployeeTask) => {
    setReviewDialogTask(task);
    setReviewNote(task.reviewerNote || "");
  };

  const handleConfirmReview = () => {
    if (!reviewDialogTask) return;
    reviewMutation.mutate({
      id: reviewDialogTask.id,
      note: reviewNote.trim() || undefined,
    });
  };

  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.reopenEmployeeTask(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "employee-tasks"] });
      setReopenDialogTask(null);
      setReopenReason("");
      toast({
        title: "Task reopened",
        description: "The employee task has been reopened successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error reopening task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReopenClick = (task: EmployeeTask) => {
    setReopenDialogTask(task);
    setReopenReason("");
  };

  const handleConfirmReopen = () => {
    if (!reopenDialogTask) return;
    reopenMutation.mutate({
      id: reopenDialogTask.id,
      reason: reopenReason.trim() || undefined,
    });
  };

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => {
      localStorageService.approveEmployeeStatusChange(id, note);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingEmployeeStatusChanges"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeeActivityLog"] });
      setApproveDialogRequest(null);
      setApproveNote("");
      toast({
        title: "Status change approved",
        description: "The employee status change has been approved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error approving change",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => {
      localStorageService.rejectEmployeeStatusChange(id, note);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingEmployeeStatusChanges"] });
      queryClient.invalidateQueries({ queryKey: ["employeeActivityLog"] });
      setRejectDialogRequest(null);
      setRejectNote("");
      toast({
        title: "Status change rejected",
        description: "The employee status change has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error rejecting change",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter tasks: only completed, skipped, or cancelled employee tasks
  const reviewableTasks = activeEmployeeTasks.filter(
    (task) => task.status === "completed" || task.status === "skipped" || task.status === "cancelled"
  );

  // Separate reviewed and unreviewed
  const unreviewedTasks = reviewableTasks.filter((task) => !task.reviewed);
  const reviewedTasks = reviewableTasks.filter((task) => task.reviewed);

  // Sort by due date (earliest first)
  const sortedUnreviewedTasks = [...unreviewedTasks].sort((a, b) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );
  
  const sortedReviewedTasks = [...reviewedTasks].sort((a, b) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );
  
  const sortedAllTasks = [...reviewableTasks].sort((a, b) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );

  const getStatusBadge = (status: EmployeeTask["status"]) => {
    const variants = {
      completed: { variant: "default" as const, label: "Completed" },
      skipped: { variant: "secondary" as const, label: "Skipped" },
      cancelled: { variant: "secondary" as const, label: "Cancelled" },
    };
    const config = variants[status as keyof typeof variants];
    return (
      <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  const getChangeTypeBadge = (changeType: string) => {
    const labels = {
      status: "Status Change",
      deactivation: "Deactivation",
      reactivation: "Reactivation",
    };
    return (
      <Badge variant="outline">
        {labels[changeType as keyof typeof labels] || changeType}
      </Badge>
    );
  };

  const renderPendingApprovalsTable = () => {
    if (isLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading pending approvals...</div>;
    }

    if (pendingStatusChanges.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No pending employee status change approvals
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Change Type</TableHead>
              <TableHead>Current Value</TableHead>
              <TableHead>New Value</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingStatusChanges.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.employeeName}</TableCell>
                <TableCell>{getChangeTypeBadge(request.changeType)}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{request.currentValue}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="default">{request.newValue}</Badge>
                </TableCell>
                <TableCell className="max-w-xs">
                  <span className="text-sm line-clamp-2">{request.reason}</span>
                </TableCell>
                <TableCell>{request.requestedBy}</TableCell>
                <TableCell>
                  {format(parseISO(request.requestedAt), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setApproveDialogRequest(request)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectDialogRequest(request)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                    >
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const renderTaskTable = (tasks: EmployeeTask[], emptyMessage: string) => {
    if (isLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>;
    }

    if (tasks.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-tasks">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reviewed</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => (
              <TableRow key={task.id} data-testid={`row-task-${task.id}`}>
                <TableCell className="font-medium">
                  {task.employeeName}
                </TableCell>
                <TableCell>
                  {task.companyName}
                </TableCell>
                <TableCell>{task.title}</TableCell>
                <TableCell>
                  {format(parseISO(task.dueAt), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>{getStatusBadge(task.status)}</TableCell>
                <TableCell>
                  {task.reviewed ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Reviewed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs">
                  {task.reviewerNote ? (
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {task.reviewerNote}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      No note
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={task.reviewed ? "outline" : "default"}
                      onClick={() => handleReviewClick(task)}
                      disabled={reviewMutation.isPending || reopenMutation.isPending}
                      data-testid={`button-review-${task.id}`}
                    >
                      {task.reviewed ? "Edit Review" : "Review"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReopenClick(task)}
                      disabled={reviewMutation.isPending || reopenMutation.isPending}
                      data-testid={`button-reopen-${task.id}`}
                    >
                      Reopen
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card data-testid="card-hr-auditor">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            HR Task Review - Auditor
          </CardTitle>
          <CardDescription>
            Review completed employee tasks before finalizing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending-approvals" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="pending-approvals" data-testid="tab-pending-approvals">
                <UserCog className="h-3 w-3 mr-1" />
                Pending Approvals ({pendingStatusChanges.length})
              </TabsTrigger>
              <TabsTrigger value="unreviewed" data-testid="tab-unreviewed">
                <AlertCircle className="h-3 w-3 mr-1" />
                Unreviewed ({unreviewedTasks.length})
              </TabsTrigger>
              <TabsTrigger value="reviewed" data-testid="tab-reviewed">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Reviewed ({reviewedTasks.length})
              </TabsTrigger>
              <TabsTrigger value="all" data-testid="tab-all-auditor">
                All ({reviewableTasks.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending-approvals">
              {renderPendingApprovalsTable()}
            </TabsContent>
            
            <TabsContent value="unreviewed">
              {renderTaskTable(sortedUnreviewedTasks, "No tasks pending review")}
            </TabsContent>
            
            <TabsContent value="reviewed">
              {renderTaskTable(sortedReviewedTasks, "No reviewed tasks")}
            </TabsContent>
            
            <TabsContent value="all">
              {renderTaskTable(sortedAllTasks, "No completed or cancelled tasks")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialogTask} onOpenChange={(open) => !open && setReviewDialogTask(null)}>
        <DialogContent data-testid="dialog-review">
          <DialogHeader>
            <DialogTitle>Review Employee Task</DialogTitle>
            <DialogDescription>
              {reviewDialogTask && (
                <>
                  <div className="space-y-2 mt-4">
                    <div className="text-sm">
                      <span className="font-medium">Employee:</span> {reviewDialogTask.employeeName}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Company:</span> {reviewDialogTask.companyName}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Task:</span> {reviewDialogTask.title}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Status:</span> {getStatusBadge(reviewDialogTask.status)}
                    </div>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-note">Review Note (Optional)</Label>
              <Textarea
                id="review-note"
                placeholder="Add any notes about this review..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={3}
                data-testid="textarea-review-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogTask(null)}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReview}
              disabled={reviewMutation.isPending}
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending ? "Reviewing..." : "Mark as Reviewed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Task Dialog */}
      <Dialog open={!!reopenDialogTask} onOpenChange={(open) => !open && setReopenDialogTask(null)}>
        <DialogContent data-testid="dialog-reopen-task">
          <DialogHeader>
            <DialogTitle>Reopen Employee Task</DialogTitle>
            <DialogDescription>
              {reopenDialogTask && (
                <>
                  This will reopen the task and reset it to "open" status. The task will appear in the active tasks list again.
                  <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Employee:</span> {reopenDialogTask.employeeName}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Company:</span> {reopenDialogTask.companyName}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Task:</span> {reopenDialogTask.title}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Current Status:</span> {getStatusBadge(reopenDialogTask.status)}
                    </div>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reopen-reason">Reason for Reopening (Optional)</Label>
              <Textarea
                id="reopen-reason"
                placeholder="Explain why this task is being reopened..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                rows={4}
                data-testid="input-reopen-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReopenDialogTask(null)}
              disabled={reopenMutation.isPending}
              data-testid="button-cancel-reopen"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReopen}
              disabled={reopenMutation.isPending}
              data-testid="button-confirm-reopen"
            >
              {reopenMutation.isPending ? "Reopening..." : "Reopen Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Status Change Dialog */}
      <Dialog open={!!approveDialogRequest} onOpenChange={(open) => !open && setApproveDialogRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Employee Status Change</DialogTitle>
            <DialogDescription>
              {approveDialogRequest && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm">
                    <span className="font-medium">Employee:</span> {approveDialogRequest.employeeName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Change Type:</span> {getChangeTypeBadge(approveDialogRequest.changeType)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">From:</span> <Badge variant="secondary">{approveDialogRequest.currentValue}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">To:</span> <Badge variant="default">{approveDialogRequest.newValue}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason:</span> {approveDialogRequest.reason}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested By:</span> {approveDialogRequest.requestedBy}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-note">Approval Note (Optional)</Label>
              <Textarea
                id="approve-note"
                placeholder="Add any notes about this approval..."
                value={approveNote}
                onChange={(e) => setApproveNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDialogRequest(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveDialogRequest && approveMutation.mutate({
                id: approveDialogRequest.id,
                note: approveNote.trim() || undefined,
              })}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Status Change Dialog */}
      <Dialog open={!!rejectDialogRequest} onOpenChange={(open) => !open && setRejectDialogRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Employee Status Change</DialogTitle>
            <DialogDescription>
              {rejectDialogRequest && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm">
                    <span className="font-medium">Employee:</span> {rejectDialogRequest.employeeName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Change Type:</span> {getChangeTypeBadge(rejectDialogRequest.changeType)}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">From:</span> <Badge variant="secondary">{rejectDialogRequest.currentValue}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">To:</span> <Badge variant="default">{rejectDialogRequest.newValue}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason:</span> {rejectDialogRequest.reason}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested By:</span> {rejectDialogRequest.requestedBy}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-note">Rejection Note (Required)</Label>
              <Textarea
                id="reject-note"
                placeholder="Please explain why this request is being rejected..."
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogRequest(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialogRequest && rejectNote.trim() && rejectMutation.mutate({
                id: rejectDialogRequest.id,
                note: rejectNote.trim(),
              })}
              disabled={rejectMutation.isPending || !rejectNote.trim()}
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
