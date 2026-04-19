import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, AlertCircle, FileCheck, Building2, Trash2 } from "lucide-react";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Task, PendingCompanySLChange } from "@shared/schema";
import { format, parseISO } from "date-fns";
import { localStorageService } from "@/lib/localStorage";
import { authService } from "@/lib/authService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function Auditor() {
  const { toast } = useToast();
  const [reviewDialogTask, setReviewDialogTask] = useState<Task | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reopenDialogTask, setReopenDialogTask] = useState<Task | null>(null);
  const [reopenReason, setReopenReason] = useState("");
  const [approveSLDialogRequest, setApproveSLDialogRequest] = useState<PendingCompanySLChange | null>(null);
  const [rejectSLDialogRequest, setRejectSLDialogRequest] = useState<PendingCompanySLChange | null>(null);
  const [approveSLNote, setApproveSLNote] = useState("");
  const [rejectSLNote, setRejectSLNote] = useState("");
  const [approveDeletionDialogRequest, setApproveDeletionDialogRequest] = useState<any | null>(null);
  const [rejectDeletionDialogRequest, setRejectDeletionDialogRequest] = useState<any | null>(null);
  const [approveDeletionNote, setApproveDeletionNote] = useState("");
  const [rejectDeletionNote, setRejectDeletionNote] = useState("");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: api.getTasks,
  });

  const { data: pendingSLChanges = [] } = useQuery<PendingCompanySLChange[]>({
    queryKey: ["pendingCompanySLChanges"],
    queryFn: () => localStorageService.getPendingCompanySLChanges().filter(r => r.status === "pending"),
  });

  const { data: pendingDeletionRequests = [], isLoading: isDeletionRequestsLoading } = useQuery<any[]>({
    queryKey: ["/api", "deletion-requests", "pending"],
    queryFn: api.getPendingDeletionRequests,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      api.markTaskAsReviewed(id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setReviewDialogTask(null);
      setReviewNote("");
      toast({
        title: "Task reviewed",
        description: "The task has been marked as reviewed successfully.",
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

  const reopenMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.reopenTask(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setReopenDialogTask(null);
      setReopenReason("");
      toast({
        title: "Task reopened",
        description: "The task has been reopened successfully.",
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

  const handleReviewClick = (task: Task) => {
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

  const handleReopenClick = (task: Task) => {
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

  const approveSLMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => {
      localStorageService.approveCompanySLChange(id, note);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingCompanySLChanges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      queryClient.invalidateQueries({ queryKey: ["companyActivityLog"] });
      setApproveSLDialogRequest(null);
      setApproveSLNote("");
      toast({
        title: "SL change approved",
        description: "The company SL field change has been approved successfully.",
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

  const rejectSLMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => {
      localStorageService.rejectCompanySLChange(id, note);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingCompanySLChanges"] });
      queryClient.invalidateQueries({ queryKey: ["companyActivityLog"] });
      setRejectSLDialogRequest(null);
      setRejectSLNote("");
      toast({
        title: "SL change rejected",
        description: "The company SL field change has been rejected.",
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

  const approveDeletionMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error("Not authenticated");
      
      return api.approveDeletionRequest(id, currentUser.id, currentUser.name, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "deletion-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/companies"] });
      setApproveDeletionDialogRequest(null);
      setApproveDeletionNote("");
      toast({
        title: "Deletion approved",
        description: "The company has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error approving deletion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rejectDeletionMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) throw new Error("Not authenticated");
      
      return api.rejectDeletionRequest(id, currentUser.id, currentUser.name, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api", "deletion-requests"] });
      setRejectDeletionDialogRequest(null);
      setRejectDeletionNote("");
      toast({
        title: "Deletion rejected",
        description: "The deletion request has been rejected.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error rejecting deletion",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter tasks: only done or cancelled tasks
  const reviewableTasks = tasks.filter(
    (task) => task.status === "done" || task.status === "cancelled"
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

  const getStatusBadge = (status: Task["status"]) => {
    const variants = {
      done: { variant: "default" as const, label: "Done" },
      cancelled: { variant: "secondary" as const, label: "Cancelled" },
    };
    const config = variants[status as keyof typeof variants];
    return (
      <Badge variant={config.variant} data-testid={`badge-status-${status}`}>
        {config.label}
      </Badge>
    );
  };

  // Helper function to format SL field values for display
  const formatSLValue = (value: any): string => {
    if (value === null || value === undefined) return "(empty)";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "string") return value || "(empty)";
    if (typeof value === "number") return value.toString();
    if (Array.isArray(value)) {
      // Handle Level1Users array
      if (value.length === 0) return "(empty)";
      if (value[0] && typeof value[0] === "object" && "name" in value[0]) {
        return `${value.length} user${value.length !== 1 ? 's' : ''}: ${value.map((u: any) => u.name).join(", ")}`;
      }
      return JSON.stringify(value);
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const renderPendingDeletionRequestsTable = () => {
    if (isDeletionRequestsLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading deletion requests...</div>;
    }

    if (pendingDeletionRequests.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground" data-testid="text-no-deletion-requests">
          No pending company deletion requests
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingDeletionRequests.map((request) => (
              <TableRow key={request.id} data-testid={`row-deletion-request-${request.id}`}>
                <TableCell className="font-medium">{request.companyName}</TableCell>
                <TableCell className="max-w-md">
                  <span className="text-sm line-clamp-3">{request.reason}</span>
                </TableCell>
                <TableCell>{request.requestedByName}</TableCell>
                <TableCell>
                  {format(parseISO(request.requestedAt), "MMM dd, yyyy HH:mm")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setApproveDeletionDialogRequest(request)}
                      disabled={approveDeletionMutation.isPending || rejectDeletionMutation.isPending}
                      data-testid={`button-approve-deletion-${request.id}`}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectDeletionDialogRequest(request)}
                      disabled={approveDeletionMutation.isPending || rejectDeletionMutation.isPending}
                      data-testid={`button-reject-deletion-${request.id}`}
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

  const renderPendingSLChangesTable = () => {
    if (isLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading pending SL changes...</div>;
    }

    if (pendingSLChanges.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No pending company SL field change approvals
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Current Value</TableHead>
              <TableHead>New Value</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Requested By</TableHead>
              <TableHead>Requested At</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingSLChanges.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.companyName}</TableCell>
                <TableCell>
                  <Badge variant="outline">{request.field}</Badge>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{formatSLValue(request.currentValue)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">{formatSLValue(request.newValue)}</span>
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
                      onClick={() => setApproveSLDialogRequest(request)}
                      disabled={approveSLMutation.isPending || rejectSLMutation.isPending}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectSLDialogRequest(request)}
                      disabled={approveSLMutation.isPending || rejectSLMutation.isPending}
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

  const renderTaskTable = (tasks: Task[], emptyMessage: string) => {
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
      <Card data-testid="card-auditor">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Task Review - Auditor
          </CardTitle>
          <CardDescription>
            Review completed and cancelled tasks before finalizing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="deletion-requests" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="deletion-requests" data-testid="tab-deletion-requests">
                <Trash2 className="h-3 w-3 mr-1" />
                Deletion Requests ({pendingDeletionRequests.length})
              </TabsTrigger>
              <TabsTrigger value="pending-sl-changes" data-testid="tab-pending-sl-changes">
                <Building2 className="h-3 w-3 mr-1" />
                Pending SL Changes ({pendingSLChanges.length})
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
            
            <TabsContent value="deletion-requests">
              {renderPendingDeletionRequestsTable()}
            </TabsContent>
            
            <TabsContent value="pending-sl-changes">
              {renderPendingSLChangesTable()}
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

      <Dialog open={!!reviewDialogTask} onOpenChange={(open) => !open && setReviewDialogTask(null)}>
        <DialogContent data-testid="dialog-review-task">
          <DialogHeader>
            <DialogTitle>Review Task</DialogTitle>
            <DialogDescription>
              {reviewDialogTask && (
                <>
                  Mark this task as reviewed and optionally add notes for future reference.
                  <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
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
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="review-note">Reviewer Note (Optional)</Label>
              <Textarea
                id="review-note"
                placeholder="Add any notes about this task review..."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                rows={4}
                data-testid="input-review-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewDialogTask(null)}
              disabled={reviewMutation.isPending}
              data-testid="button-cancel-review"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmReview}
              disabled={reviewMutation.isPending}
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending ? "Saving..." : "Mark as Reviewed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Task Dialog */}
      <Dialog open={!!reopenDialogTask} onOpenChange={(open) => !open && setReopenDialogTask(null)}>
        <DialogContent data-testid="dialog-reopen-task">
          <DialogHeader>
            <DialogTitle>Reopen Task</DialogTitle>
            <DialogDescription>
              {reopenDialogTask && (
                <>
                  This will reopen the task and reset it to "open" status. The task will appear in the active tasks list again.
                  <div className="mt-4 p-3 bg-muted rounded-md space-y-2">
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

      {/* Approve SL Change Dialog */}
      <Dialog open={!!approveSLDialogRequest} onOpenChange={(open) => !open && setApproveSLDialogRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Company SL Field Change</DialogTitle>
            <DialogDescription>
              {approveSLDialogRequest && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm">
                    <span className="font-medium">Company:</span> {approveSLDialogRequest.companyName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Field:</span> <Badge variant="outline">{approveSLDialogRequest.field}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">From:</span> <span className="text-muted-foreground">{formatSLValue(approveSLDialogRequest.currentValue)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">To:</span> <span className="font-medium">{formatSLValue(approveSLDialogRequest.newValue)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason:</span> {approveSLDialogRequest.reason}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested By:</span> {approveSLDialogRequest.requestedBy}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-sl-note">Approval Note (Optional)</Label>
              <Textarea
                id="approve-sl-note"
                placeholder="Add any notes about this approval..."
                value={approveSLNote}
                onChange={(e) => setApproveSLNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveSLDialogRequest(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => approveSLDialogRequest && approveSLMutation.mutate({
                id: approveSLDialogRequest.id,
                note: approveSLNote.trim() || undefined,
              })}
              disabled={approveSLMutation.isPending}
            >
              {approveSLMutation.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject SL Change Dialog */}
      <Dialog open={!!rejectSLDialogRequest} onOpenChange={(open) => !open && setRejectSLDialogRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Company SL Field Change</DialogTitle>
            <DialogDescription>
              {rejectSLDialogRequest && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm">
                    <span className="font-medium">Company:</span> {rejectSLDialogRequest.companyName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Field:</span> <Badge variant="outline">{rejectSLDialogRequest.field}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">From:</span> <span className="text-muted-foreground">{formatSLValue(rejectSLDialogRequest.currentValue)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">To:</span> <span className="font-medium">{formatSLValue(rejectSLDialogRequest.newValue)}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason:</span> {rejectSLDialogRequest.reason}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested By:</span> {rejectSLDialogRequest.requestedBy}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-sl-note">Rejection Note (Required)</Label>
              <Textarea
                id="reject-sl-note"
                placeholder="Please explain why this request is being rejected..."
                value={rejectSLNote}
                onChange={(e) => setRejectSLNote(e.target.value)}
                rows={3}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectSLDialogRequest(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectSLDialogRequest && rejectSLNote.trim() && rejectSLMutation.mutate({
                id: rejectSLDialogRequest.id,
                note: rejectSLNote.trim(),
              })}
              disabled={rejectSLMutation.isPending || !rejectSLNote.trim()}
            >
              {rejectSLMutation.isPending ? "Rejecting..." : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Deletion Request Dialog */}
      <Dialog open={!!approveDeletionDialogRequest} onOpenChange={(open) => !open && setApproveDeletionDialogRequest(null)}>
        <DialogContent data-testid="dialog-approve-deletion">
          <DialogHeader>
            <DialogTitle>Approve Company Deletion</DialogTitle>
            <DialogDescription>
              {approveDeletionDialogRequest && (
                <div className="space-y-3 mt-4">
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm font-medium text-destructive">⚠️ Warning: This action cannot be undone</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Approving this request will permanently delete all company data, including employees, tasks, and compliance records.
                    </p>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Company:</span> {approveDeletionDialogRequest.companyName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason for deletion:</span>
                    <p className="mt-1 p-2 bg-muted rounded-md">{approveDeletionDialogRequest.reason}</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested By:</span> {approveDeletionDialogRequest.requestedByName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested At:</span> {format(parseISO(approveDeletionDialogRequest.requestedAt), "MMM dd, yyyy HH:mm")}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-deletion-note">Approval Note (Optional)</Label>
              <Textarea
                id="approve-deletion-note"
                placeholder="Add any notes about this approval..."
                value={approveDeletionNote}
                onChange={(e) => setApproveDeletionNote(e.target.value)}
                rows={3}
                data-testid="input-approve-deletion-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveDeletionDialogRequest(null)}
              data-testid="button-cancel-approve-deletion"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => approveDeletionDialogRequest && approveDeletionMutation.mutate({
                id: approveDeletionDialogRequest.id,
                note: approveDeletionNote.trim() || undefined,
              })}
              disabled={approveDeletionMutation.isPending}
              data-testid="button-confirm-approve-deletion"
            >
              {approveDeletionMutation.isPending ? "Deleting..." : "Approve & Delete Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Deletion Request Dialog */}
      <Dialog open={!!rejectDeletionDialogRequest} onOpenChange={(open) => !open && setRejectDeletionDialogRequest(null)}>
        <DialogContent data-testid="dialog-reject-deletion">
          <DialogHeader>
            <DialogTitle>Reject Company Deletion Request</DialogTitle>
            <DialogDescription>
              {rejectDeletionDialogRequest && (
                <div className="space-y-2 mt-4">
                  <div className="text-sm">
                    <span className="font-medium">Company:</span> {rejectDeletionDialogRequest.companyName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Reason for deletion:</span>
                    <p className="mt-1 p-2 bg-muted rounded-md">{rejectDeletionDialogRequest.reason}</p>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested By:</span> {rejectDeletionDialogRequest.requestedByName}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Requested At:</span> {format(parseISO(rejectDeletionDialogRequest.requestedAt), "MMM dd, yyyy HH:mm")}
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-deletion-note">Rejection Note (Required)</Label>
              <Textarea
                id="reject-deletion-note"
                placeholder="Please explain why this deletion request is being rejected..."
                value={rejectDeletionNote}
                onChange={(e) => setRejectDeletionNote(e.target.value)}
                rows={3}
                required
                data-testid="input-reject-deletion-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDeletionDialogRequest(null)}
              data-testid="button-cancel-reject-deletion"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectDeletionDialogRequest && rejectDeletionNote.trim() && rejectDeletionMutation.mutate({
                id: rejectDeletionDialogRequest.id,
                note: rejectDeletionNote.trim(),
              })}
              disabled={rejectDeletionMutation.isPending || !rejectDeletionNote.trim()}
              data-testid="button-confirm-reject-deletion"
            >
              {rejectDeletionMutation.isPending ? "Rejecting..." : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
