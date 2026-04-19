import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, RefreshCw, ChevronLeft, ChevronRight, Radio } from "lucide-react";
import { DateTime } from "luxon";
import type { AttendanceRecord, EmployeeRecord } from "@shared/schema";
import { localStorageService } from "@/lib/localStorage";
import { generateAttendanceRecordsForEmployee } from "@/lib/utils/attendanceGenerator";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AttendanceReportProps {
  employee: EmployeeRecord;
}

export function AttendanceReport({ employee }: AttendanceReportProps) {
  const { toast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  
  const recordsPerPage = 50;

  // Fetch attendance records
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['/api/attendance', employee.id],
    queryFn: () => localStorageService.getAttendanceRecordsByEmployeeId(employee.id),
  });

  // Fetch holidays
  const { data: holidays = [] } = useQuery({
    queryKey: ['/api/holidays'],
    queryFn: () => localStorageService.getHolidays(),
  });
  
  // Fetch last generation data for this employee
  const { data: lastGenerationData } = useQuery({
    queryKey: ['/api/attendance/last-generation', employee.id],
    queryFn: () => {
      const data = localStorage.getItem(`attendance-generation-${employee.id}`);
      return data ? JSON.parse(data) : null;
    },
  });

  // Regenerate all attendance records
  const regenerateMutation = useMutation({
    mutationFn: async () => {
      // Delete existing records
      localStorageService.deleteAttendanceRecordsByEmployeeId(employee.id);
      
      // Generate new records
      const newRecords = generateAttendanceRecordsForEmployee(employee, holidays);
      
      // Save new records
      localStorageService.addAttendanceRecordsBulk(newRecords);
      
      // Store generation metadata
      const generationData = {
        timestamp: DateTime.now().setZone("Europe/London").toISO(),
        recordsGenerated: newRecords.length,
      };
      localStorage.setItem(`attendance-generation-${employee.id}`, JSON.stringify(generationData));
      
      return newRecords;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/attendance', employee.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/attendance/last-generation', employee.id] });
      toast({
        title: "Attendance Regenerated",
        description: "All attendance records have been regenerated successfully.",
      });
    },
  });


  // Sort all records by date (descending - most recent first)
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => b.date.localeCompare(a.date));
  }, [records]);

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / recordsPerPage);
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * recordsPerPage,
    currentPage * recordsPerPage
  );

  // Calculate summary statistics (for all records)
  const summary = useMemo(() => {
    const workingDays = sortedRecords.filter(r => 
      r.status !== "Holiday" && r.status !== "Weekend"
    ).length;
    
    const presentDays = sortedRecords.filter(r => r.status === "Present").length;
    const absentDays = sortedRecords.filter(r => r.status === "Absent").length;
    const incompleteDays = sortedRecords.filter(r => r.status === "Incomplete").length;
    
    const totalWorkingHours = sortedRecords.reduce((sum, r) => sum + (r.totalWorkingHours || 0), 0);
    const paidWorkingHours = sortedRecords.reduce((sum, r) => sum + (r.paidWorkingHours || 0), 0);
    const totalMonthlyPay = sortedRecords.reduce((sum, r) => sum + (r.totalDayPay || 0), 0);
    
    return {
      totalRecords: sortedRecords.length,
      presentDays,
      absentDays,
      incompleteDays,
      totalWorkingHours: totalWorkingHours.toFixed(2),
      totalMonthlyPay: totalMonthlyPay.toFixed(2),
    };
  }, [sortedRecords]);

  // Generate Event ID (9 characters: professional mix of letters and numbers)
  const generateEventId = (record: AttendanceRecord): string => {
    // Create deterministic ID based on employee ID, date, and record ID
    const input = `${record.employeeId}-${record.date}-${record.id}`;
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash = hash & hash;
    }
    
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Professional looking chars (no confusing 0/O, 1/I)
    let eventId = '';
    let num = Math.abs(hash);
    
    for (let i = 0; i < 9; i++) {
      eventId += chars[num % chars.length];
      num = Math.floor(num / chars.length);
      if (num === 0) num = Math.abs(hash) + i;
    }
    
    // Format: XXX-XXX-XXX for readability
    return `${eventId.slice(0, 3)}-${eventId.slice(3, 6)}-${eventId.slice(6, 9)}`;
  };

  // Export to CSV (9 columns matching the table + employee info header)
  const exportToCSV = () => {
    // System Maintenance Notice + Employee Information Header
    const employeeInfo = [
      ["SYSTEM MAINTENANCE NOTICE - CODE: ERR-SYNC-204"],
      [""],
      ["Live update System Maintenance Notice"],
      ["The system is currently undergoing live updates and remote data synchronization."],
      ["Some information may be temporarily interrupted, delayed, or inaccurate."],
      ["Full accuracy will be restored once the update process is complete."],
      [""],
      [""],
      ["EMPLOYEE INFORMATION"],
      [""],
      ["Employee ID", employee.id],
      ["Employee Name", `${employee.firstName} ${employee.lastName}`],
      ["Job Title", employee.jobTitle ?? ""],
      ["Department", employee.department ?? ""],
      ["Company", employee.companyName ?? ""],
      ["Start Date", employee.startDate ?? ""],
      ["Employment Status", employee.status ?? ""],
      ["Weekly Hours", employee.weeklyHours != null ? employee.weeklyHours.toString() : ""],
      ["Daily Hours", employee.dailyWorkingHours != null ? employee.dailyWorkingHours.toFixed(2) : ""],
      [""],
      ["ATTENDANCE RECORDS"],
      [""]
    ];
    
    const headers = [
      "Event ID", "Date", "Day", "Status", "Clock-In Time",
      "Clock-Out Time", "Break Duration", "Total Hours", "Paid Hours"
    ];
    
    const rows = sortedRecords.map(r => [
      generateEventId(r),
      r.date,
      r.day,
      r.status,
      r.actualClockInTime || "",
      r.actualClockOutTime || "",
      r.breakDuration || "",
      r.totalWorkingHours?.toFixed(2) || "",
      r.paidWorkingHours?.toFixed(2) || ""
    ]);
    
    const csvContent = [
      ...employeeInfo.map(row => row.map(cell => `"${cell}"`).join(",")),
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const timestamp = DateTime.now().setZone("Europe/London").toFormat("yy-MM-dd_HH-mm");
    link.download = `${timestamp}_${employee.firstName}_${employee.lastName}_Attendance.csv`;
    link.click();
    
    toast({
      title: "Export Complete",
      description: "Attendance records with employee information have been exported to CSV.",
    });
  };


  // Status color mapping
  const getStatusColor = (status: AttendanceRecord["status"]) => {
    switch (status) {
      case "Present":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "Absent":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Holiday":
      case "Weekend":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "Leave":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "Incomplete":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      default:
        return "";
    }
  };

  if (isLoading) {
    return <div className="p-4">Loading attendance data...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Attendance Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            {lastGenerationData && (
              <div className="text-sm text-muted-foreground">
                Last generated: {DateTime.fromISO(lastGenerationData.timestamp).toFormat("PPP 'at' p")} - {lastGenerationData.recordsGenerated} records
              </div>
            )}
            <div className="flex flex-col gap-2 ml-auto">
              <Button onClick={exportToCSV} variant="outline" size="sm" data-testid="button-export-csv">
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button 
                onClick={() => regenerateMutation.mutate()} 
                variant="outline" 
                size="sm"
                disabled={regenerateMutation.isPending}
                data-testid="button-regenerate"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${regenerateMutation.isPending ? 'animate-spin' : ''}`} />
                System Sync.
              </Button>
            </div>
          </div>
          
          {/* System Maintenance Notice */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-start gap-3">
              <Radio className="h-5 w-5 text-orange-500 mt-0.5 animate-pulse" data-testid="icon-live-update" />
              <div className="flex-1" style={{ fontFamily: 'Inter, Roboto, "Open Sans", sans-serif' }}>
                <div className="font-medium text-orange-600 dark:text-orange-400" style={{ fontSize: '17px', fontWeight: 500 }}>
                  Live update System Maintenance Notice — Code: ERR-SYNC-204
                </div>
                <div className="mt-2 text-muted-foreground leading-relaxed" style={{ fontSize: '14.5px', fontWeight: 500 }}>
                  The system is currently undergoing live updates and remote data synchronization.
                  Some information may be temporarily interrupted, delayed, or inaccurate.
                  Full accuracy will be restored once the update process is complete.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employee Information Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Employee Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1" data-testid="employee-info-id">
              <div className="text-sm font-medium text-muted-foreground">Employee ID</div>
              <div className="text-sm font-semibold">{employee.id}</div>
            </div>
            
            <div className="space-y-1" data-testid="employee-info-name">
              <div className="text-sm font-medium text-muted-foreground">Full Name</div>
              <div className="text-sm font-semibold">{employee.firstName} {employee.lastName}</div>
            </div>
            
            <div className="space-y-1" data-testid="employee-info-job-title">
              <div className="text-sm font-medium text-muted-foreground">Job Title</div>
              <div className="text-sm font-semibold">{employee.jobTitle ?? "N/A"}</div>
            </div>
            
            <div className="space-y-1" data-testid="employee-info-department">
              <div className="text-sm font-medium text-muted-foreground">Department</div>
              <div className="text-sm font-semibold">{employee.department ?? "N/A"}</div>
            </div>
            
            <div className="space-y-1" data-testid="employee-info-company">
              <div className="text-sm font-medium text-muted-foreground">Company</div>
              <div className="text-sm font-semibold">{employee.companyName ?? "N/A"}</div>
            </div>
            
            <div className="space-y-1" data-testid="employee-info-start-date">
              <div className="text-sm font-medium text-muted-foreground">Start Date</div>
              <div className="text-sm font-semibold">{employee.startDate ? DateTime.fromISO(employee.startDate).toFormat("dd MMM yyyy") : "N/A"}</div>
            </div>
            
            <div className="space-y-1" data-testid="employee-info-status">
              <div className="text-sm font-medium text-muted-foreground">Employment Status</div>
              <div className="text-sm">
                <Badge variant={employee.status === "active" ? "default" : "secondary"}>
                  {employee.status ? employee.status.charAt(0).toUpperCase() + employee.status.slice(1) : "N/A"}
                </Badge>
              </div>
            </div>
            
            <div className="space-y-1" data-testid="employee-info-weekly-hours">
              <div className="text-sm font-medium text-muted-foreground">Weekly Hours</div>
              <div className="text-sm font-semibold">{employee.weeklyHours != null ? employee.weeklyHours : "N/A"}</div>
            </div>
            
            <div className="space-y-1" data-testid="employee-info-daily-hours">
              <div className="text-sm font-medium text-muted-foreground">Daily Hours</div>
              <div className="text-sm font-semibold">{employee.dailyWorkingHours != null ? employee.dailyWorkingHours.toFixed(2) : "N/A"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Dashboard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="summary-total-records">{summary.totalRecords}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="summary-present-days">{summary.presentDays}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600" data-testid="summary-absent-days">{summary.absentDays}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="summary-incomplete-days">{summary.incompleteDays}</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clock-In</TableHead>
                  <TableHead>Clock-Out</TableHead>
                  <TableHead>Break Duration</TableHead>
                  <TableHead>Total Hours</TableHead>
                  <TableHead>Paid Hours</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No attendance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedRecords.map((record) => {
                    return (
                      <TableRow 
                        key={record.id} 
                        data-testid={`row-attendance-${record.date}`}
                      >
                        <TableCell className="font-mono text-xs">{generateEventId(record)}</TableCell>
                        <TableCell className="font-medium">{DateTime.fromISO(record.date).toFormat('dd/MM/yyyy')}</TableCell>
                        <TableCell>{record.day}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(record.status)} data-testid={`status-${record.date}`}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{record.actualClockInTime || "-"}</TableCell>
                        <TableCell>{record.actualClockOutTime || "-"}</TableCell>
                        <TableCell>{record.breakDuration || "-"}</TableCell>
                        <TableCell>{record.totalWorkingHours?.toFixed(2) || "0.00"}</TableCell>
                        <TableCell>{record.paidWorkingHours?.toFixed(2) || "0.00"}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * recordsPerPage) + 1} to {Math.min(currentPage * recordsPerPage, sortedRecords.length)} of {sortedRecords.length} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
