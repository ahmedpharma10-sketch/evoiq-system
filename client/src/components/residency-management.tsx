import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { localStorageService } from "@/lib/localStorage";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EmployeeRecord, Dependant } from "@shared/schema";
import { Building, Calendar, FileText, CheckCircle, Clock, Users } from "lucide-react";
import { format, parseISO } from "date-fns";
import { DateTime } from "luxon";

// Combined type for displaying both employees and dependants
type ResidencyEntry = {
  id: string;
  type: "employee" | "dependant";
  name: string;
  email?: string;
  companyName: string;
  status?: "pending" | "done";
  latestLog?: any;
  employeeId?: string; // For dependants, this is the main employee ID
  employeeName?: string; // For dependants, this is the main employee name
  employeeStatus?: "active" | "leaver" | "deactivated" | "onboarding" | "on_hold"; // For sorting and styling
  isDeactivated: boolean; // Quick check for styling
};

export default function ResidencyManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [markDoneDialogOpen, setMarkDoneDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  // Load all employees with residency service
  const { data: residencyEmployees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["residency-employees"],
    queryFn: () => {
      const allEmployees = localStorageService.getEmployees();
      return allEmployees.filter(emp => emp.isResidencyService === true);
    },
  });

  // Load all dependants
  const { data: allDependants = [] } = useQuery<Dependant[]>({
    queryKey: ["dependants"],
    queryFn: () => {
      return localStorageService.getDependants();
    },
  });

  // Combine employees and dependants into a single list
  const residencyEntries: ResidencyEntry[] = [
    // Main employees
    ...residencyEmployees.map(emp => ({
      id: emp.id,
      type: "employee" as const,
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.personalEmail,
      companyName: emp.companyName,
      status: emp.residencyStatus,
      latestLog: emp.residencyLog && emp.residencyLog.length > 0 ? emp.residencyLog[emp.residencyLog.length - 1] : null,
      employeeStatus: emp.status,
      isDeactivated: emp.status === "deactivated" || emp.status === "leaver",
    })),
    // Dependants (only for employees with residency service)
    ...allDependants
      .filter(dep => residencyEmployees.some(emp => emp.id === dep.employeeId))
      .map(dep => {
        const parentEmployee = residencyEmployees.find(emp => emp.id === dep.employeeId);
        const isDeactivated = parentEmployee ? (parentEmployee.status === "deactivated" || parentEmployee.status === "leaver") : false;
        return {
          id: dep.id,
          type: "dependant" as const,
          name: `${dep.firstName} ${dep.middleName ? dep.middleName + ' ' : ''}${dep.lastName}`,
          companyName: `Dependant on ${dep.employeeName}`,
          employeeId: dep.employeeId,
          employeeName: dep.employeeName,
          employeeStatus: parentEmployee?.status,
          isDeactivated,
        };
      }),
  ].sort((a, b) => {
    // Sort: active entries first, deactivated entries last
    if (a.isDeactivated !== b.isDeactivated) {
      return a.isDeactivated ? 1 : -1;
    }
    // Within same activation status, sort employees before dependants
    if (a.type !== b.type) {
      return a.type === "employee" ? -1 : 1;
    }
    // Within same type, sort alphabetically by name
    return a.name.localeCompare(b.name);
  });

  // Mark residency as done mutation
  const markDoneMutation = useMutation({
    mutationFn: async ({ employeeId, note }: { employeeId: string, note: string }) => {
      const employee = localStorageService.getEmployee(employeeId);
      if (!employee) throw new Error("Employee not found");

      const now = DateTime.now().setZone("Europe/London").toISO();
      const logEntry = {
        id: crypto.randomUUID(),
        timestamp: now!,
        action: "marked_done" as const,
        explanation: note,
        userName: "HR Auditor",
      };

      const updatedEmployee: EmployeeRecord = {
        ...employee,
        residencyStatus: "done",
        residencyLog: [...(employee.residencyLog || []), logEntry],
        updatedAt: now!,
      };

      localStorageService.updateEmployee(employeeId, updatedEmployee);
      return updatedEmployee;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["residency-employees"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({
        title: "Success",
        description: "Residency service marked as done",
      });
      setMarkDoneDialogOpen(false);
      setCompletionNote("");
      setSelectedEmployee(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update residency service",
        variant: "destructive",
      });
    },
  });

  const handleMarkDone = (employee: EmployeeRecord) => {
    if (employee.residencyStatus === "done") {
      toast({
        title: "Already Completed",
        description: "This residency service has already been marked as done",
        variant: "destructive",
      });
      return;
    }
    setSelectedEmployee(employee);
    setMarkDoneDialogOpen(true);
  };

  const handleMarkDoneConfirm = () => {
    if (!selectedEmployee || !completionNote.trim()) {
      toast({
        title: "Error",
        description: "Please provide a completion note",
        variant: "destructive",
      });
      return;
    }

    markDoneMutation.mutate({
      employeeId: selectedEmployee.id,
      note: completionNote.trim(),
    });
  };

  const getLatestLog = (employee: EmployeeRecord) => {
    if (!employee.residencyLog || employee.residencyLog.length === 0) return null;
    return employee.residencyLog[employee.residencyLog.length - 1];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Residency Service</CardTitle>
              <CardDescription>
                Manage employees enrolled in residency service ({residencyEmployees.length} {residencyEmployees.length === 1 ? "employee" : "employees"})
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                {residencyEmployees.filter(e => e.residencyStatus === "pending").length} Pending
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                {residencyEmployees.filter(e => e.residencyStatus === "done").length} Done
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {residencyEntries.length === 0 ? (
            <div className="rounded-lg border bg-muted/50 p-8 text-center">
              <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">No employees in residency service</p>
              <p className="text-sm text-muted-foreground">
                Enable residency service for employees from the Employees tab
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company / Main Applicant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latest Activity</TableHead>
                    <TableHead>Explanation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {residencyEntries.map((entry) => {
                    return (
                      <TableRow
                        key={entry.id}
                        data-testid={`row-residency-${entry.id}`}
                        className={`hover-elevate cursor-pointer ${entry.isDeactivated ? 'opacity-50 grayscale' : ''}`}
                        onClick={() => entry.type === "employee" ? setLocation(`/employee/${entry.id}`) : setLocation(`/employee/${entry.employeeId}`)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {entry.type === "dependant" && (
                              <Users className="h-4 w-4 text-purple-600" />
                            )}
                            <div>
                              <p className="font-medium" data-testid={`text-name-${entry.id}`}>
                                {entry.name}
                              </p>
                              {entry.email && (
                                <p className="text-xs text-muted-foreground">{entry.email}</p>
                              )}
                              {entry.type === "dependant" && (
                                <Badge variant="outline" className="text-xs mt-1 bg-purple-50 text-purple-700 border-purple-200">
                                  Dependant
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {entry.type === "employee" ? (
                              <>
                                <Building className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{entry.companyName}</span>
                              </>
                            ) : (
                              <>
                                <Users className="h-3 w-3 text-purple-600" />
                                <span className="text-sm text-purple-700">{entry.companyName}</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {entry.type === "employee" && entry.status && (
                            <Badge
                              variant="outline"
                              className={
                                entry.status === "done"
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"
                              }
                              data-testid={`badge-status-${entry.id}`}
                            >
                              {entry.status === "done" ? (
                                <><CheckCircle className="h-3 w-3 mr-1" /> Done</>
                              ) : (
                                <><Clock className="h-3 w-3 mr-1" /> Pending</>
                              )}
                            </Badge>
                          )}
                          {entry.type === "dependant" && (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.type === "employee" && entry.latestLog && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(entry.latestLog.timestamp), "MMM d, yyyy h:mm a")}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.type === "employee" && entry.latestLog && (
                            <p className="text-sm text-muted-foreground max-w-md truncate">
                              {entry.latestLog.explanation}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-end">
                            {entry.type === "employee" && entry.status !== "done" && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  const employee = residencyEmployees.find(e => e.id === entry.id);
                                  if (employee) handleMarkDone(employee);
                                }}
                                data-testid={`button-mark-done-${entry.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Done
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => entry.type === "employee" ? setLocation(`/employee/${entry.id}`) : setLocation(`/employee/${entry.employeeId}`)}
                              data-testid={`button-view-${entry.id}`}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark Done Dialog */}
      <Dialog open={markDoneDialogOpen} onOpenChange={setMarkDoneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Residency Service as Done</DialogTitle>
            <DialogDescription>
              You are marking the residency service for <strong>{selectedEmployee?.firstName} {selectedEmployee?.lastName}</strong> as completed.
              <br />
              Please provide a completion note:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="completion-note">Completion Note *</Label>
              <Textarea
                id="completion-note"
                placeholder="Enter details about what was done..."
                value={completionNote}
                onChange={(e) => setCompletionNote(e.target.value)}
                rows={4}
                data-testid="textarea-completion-note"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setMarkDoneDialogOpen(false);
                setCompletionNote("");
                setSelectedEmployee(null);
              }}
              data-testid="button-cancel-mark-done"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMarkDoneConfirm}
              disabled={!completionNote.trim() || markDoneMutation.isPending}
              data-testid="button-confirm-mark-done"
            >
              {markDoneMutation.isPending ? "Saving..." : "Mark as Done"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
