import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, Home } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import type { EmployeeTask, PendingDependantRequest } from "@shared/schema";
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

export default function ResidencyAuditor() {
  const { toast } = useToast();
  const [reviewDialogTask, setReviewDialogTask] = useState<EmployeeTask | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reopenDialogTask, setReopenDialogTask] = useState<EmployeeTask | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [approvingRequest, setApprovingRequest] = useState<PendingDependantRequest | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<PendingDependantRequest | null>(null);
  const [approvalNote, setApprovalNote] = useState("");
  const [rejectionNote, setRejectionNote] = useState("");

  const { data: employeeTasks = [], isLoading } = useQuery<EmployeeTask[]>({
    queryKey: ["employeeTasks"],
    queryFn: () => localStorageService.getEmployeeTasks(),
  });

  const { data: pendingRequests = [], isLoading: isLoadingRequests } = useQuery<PendingDependantRequest[]>({
    queryKey: ["pendingDependantRequests"],
    queryFn: () => localStorageService.getPendingDependantRequests().filter(r => r.status === "pending"),
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => {
      const task = localStorageService.getEmployeeTasks().find(t => t.id === id);
      if (!task) throw new Error("Task not found");
      
      localStorageService.updateEmployeeTask(id, {
        reviewed: true,
        reviewerNote: note,
        updatedAt: new Date().toISOString(),
      });
      
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
      setReviewDialogTask(null);
      setReviewNote("");
      toast({
        title: "Task reviewed",
        description: "The residency task has been marked as reviewed successfully.",
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

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => {
      localStorageService.approveDependantRequest(id, note);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingDependantRequests"] });
      // Invalidate all dependants queries (scoped and unscoped)
      queryClient.invalidateQueries({ queryKey: ["dependants"] });
      // Invalidate all employee activity logs (scoped and unscoped)
      queryClient.invalidateQueries({ queryKey: ["employeeActivityLogs"] });
      // Invalidate employees queries in case any employee data changed
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setApprovingRequest(null);
      setApprovalNote("");
      toast({
        title: "Request Approved",
        description: "The dependant request has been approved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error approving request",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => {
      localStorageService.rejectDependantRequest(id, note);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingDependantRequests"] });
      // Invalidate all employee activity logs (scoped and unscoped)
      queryClient.invalidateQueries({ queryKey: ["employeeActivityLogs"] });
      // Invalidate employees queries in case any employee data changed
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setRejectingRequest(null);
      setRejectionNote("");
      toast({
        title: "Request Rejected",
        description: "The dependant request has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error rejecting request",
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
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => {
      // Use atomic helper from localStorage service with built-in rollback safeguards
      localStorageService.reopenResidencyTask({ taskId: id, reason });
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
      queryClient.invalidateQueries({ queryKey: ["employeeActivityLogs"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setReopenDialogTask(null);
      setReopenReason("");
      toast({
        title: "Task reopened",
        description: "The residency task has been reopened successfully.",
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

  // Filter tasks: only residency tasks that are completed, skipped, or cancelled
  const residencyTasks = employeeTasks.filter(
    (task) => 
      task.taskType.startsWith("residency_template") &&
      (task.status === "completed" || task.status === "skipped" || task.status === "cancelled")
  );

  // Separate reviewed and unreviewed
  const unreviewedTasks = residencyTasks.filter((task) => !task.reviewed);
  const reviewedTasks = residencyTasks.filter((task) => task.reviewed);

  // Sort by due date (earliest first)
  const sortedUnreviewedTasks = [...unreviewedTasks].sort((a, b) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );
  
  const sortedReviewedTasks = [...reviewedTasks].sort((a, b) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
  );
  
  const sortedAllTasks = [...residencyTasks].sort((a, b) =>
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
      <Card data-testid="card-residency-auditor">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Residency Task Review - Auditor
          </CardTitle>
          <CardDescription>
            Review completed residency tasks before finalizing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending-approvals" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="pending-approvals" data-testid="tab-pending-approvals">
                <AlertCircle className="h-3 w-3 mr-1" />
                Pending Approvals ({pendingRequests.length})
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
                All ({residencyTasks.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending-approvals">
              {isLoadingRequests ? (
                <div className="text-center py-8 text-muted-foreground">Loading requests...</div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground" data-testid="text-no-pending-requests">
                  No pending dependant requests
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Dependant</TableHead>
                        <TableHead>Relationship</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead>Requested At</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingRequests.map((request) => (
                        <TableRow key={request.id} data-testid={`row-request-${request.id}`}>
                          <TableCell className="font-medium">
                            {request.employeeName}
                          </TableCell>
                          <TableCell>
                            <Badge variant={request.action === "add" ? "default" : "secondary"}>
                              {request.action === "add" ? "Add" : "Remove"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {request.dependantData.firstName} {request.dependantData.middleName && `${request.dependantData.middleName} `}{request.dependantData.lastName}
                          </TableCell>
                          <TableCell className="capitalize">
                            {request.dependantData.relationship}
                          </TableCell>
                          <TableCell data-testid={`text-request-whatsapp-${request.id}`}>
                            {request.dependantData.whatsAppNumber || "—"}
                          </TableCell>
                          <TableCell>{request.requestedBy}</TableCell>
                          <TableCell>
                            {format(parseISO(request.requestedAt), "MMM dd, yyyy p")}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <span className="text-sm line-clamp-2">{request.reason}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => setApprovingRequest(request)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                data-testid={`button-approve-${request.id}`}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setRejectingRequest(request)}
                                disabled={approveMutation.isPending || rejectMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
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
              )}
            </TabsContent>
            
            <TabsContent value="unreviewed">
              {renderTaskTable(sortedUnreviewedTasks, "No residency tasks pending review")}
            </TabsContent>
            
            <TabsContent value="reviewed">
              {renderTaskTable(sortedReviewedTasks, "No reviewed residency tasks")}
            </TabsContent>
            
            <TabsContent value="all">
              {renderTaskTable(sortedAllTasks, "No completed or cancelled residency tasks")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={!!reviewDialogTask} onOpenChange={(open) => !open && setReviewDialogTask(null)}>
        <DialogContent data-testid="dialog-review">
          <DialogHeader>
            <DialogTitle>Review Residency Task</DialogTitle>
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
            <DialogTitle>Reopen Residency Task</DialogTitle>
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

      {/* Approve Request Dialog */}
      <Dialog open={!!approvingRequest} onOpenChange={(open) => {
        if (!open) {
          setApprovingRequest(null);
          setApprovalNote("");
        }
      }}>
        <DialogContent data-testid="dialog-approve">
          <DialogHeader>
            <DialogTitle>Approve Dependant Request</DialogTitle>
            <DialogDescription>
              {approvingRequest && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm">
                    <span className="font-medium">Employee:</span> {approvingRequest.employeeName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Action:</span> {approvingRequest.action === "add" ? "Add" : "Remove"} Dependant
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Dependant:</span> {approvingRequest.dependantData.firstName} {approvingRequest.dependantData.middleName && `${approvingRequest.dependantData.middleName} `}{approvingRequest.dependantData.lastName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Relationship:</span> {approvingRequest.dependantData.relationship}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">WhatsApp Number:</span> {approvingRequest.dependantData.whatsAppNumber || "—"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested By:</span> {approvingRequest.requestedBy}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason:</span> {approvingRequest.reason}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approval-note">Approval Note (Optional)</Label>
              <Textarea
                id="approval-note"
                placeholder="Add any notes about this approval..."
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                rows={3}
                data-testid="textarea-approval-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApprovingRequest(null);
                setApprovalNote("");
              }}
              data-testid="button-cancel-approve"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (approvingRequest) {
                  approveMutation.mutate({ id: approvingRequest.id, note: approvalNote.trim() || undefined });
                }
              }}
              disabled={approveMutation.isPending}
              data-testid="button-confirm-approve"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Request Dialog */}
      <Dialog open={!!rejectingRequest} onOpenChange={(open) => {
        if (!open) {
          setRejectingRequest(null);
          setRejectionNote("");
        }
      }}>
        <DialogContent data-testid="dialog-reject">
          <DialogHeader>
            <DialogTitle>Reject Dependant Request</DialogTitle>
            <DialogDescription>
              {rejectingRequest && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm">
                    <span className="font-medium">Employee:</span> {rejectingRequest.employeeName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Action:</span> {rejectingRequest.action === "add" ? "Add" : "Remove"} Dependant
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Dependant:</span> {rejectingRequest.dependantData.firstName} {rejectingRequest.dependantData.middleName && `${rejectingRequest.dependantData.middleName} `}{rejectingRequest.dependantData.lastName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Relationship:</span> {rejectingRequest.dependantData.relationship}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">WhatsApp Number:</span> {rejectingRequest.dependantData.whatsAppNumber || "—"}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested By:</span> {rejectingRequest.requestedBy}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason:</span> {rejectingRequest.reason}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-note">Rejection Reason (Required)</Label>
              <Textarea
                id="rejection-note"
                placeholder="Enter reason for rejection..."
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                rows={3}
                data-testid="textarea-rejection-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectingRequest(null);
                setRejectionNote("");
              }}
              data-testid="button-cancel-reject"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectingRequest && rejectionNote.trim()) {
                  rejectMutation.mutate({ id: rejectingRequest.id, note: rejectionNote.trim() });
                } else {
                  toast({
                    title: "Rejection Reason Required",
                    description: "Please provide a reason for rejection.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={rejectMutation.isPending || !rejectionNote.trim()}
              data-testid="button-confirm-reject"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
