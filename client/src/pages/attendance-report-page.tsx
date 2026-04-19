import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, RefreshCw, Calendar, Clock } from "lucide-react";
import { localStorageService } from "@/lib/localStorage";
import { fillMissingAttendanceRecords } from "@/lib/utils/attendanceAutomation";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DateTime } from "luxon";
import type { AttendanceRecord, EmployeeRecord } from "@shared/schema";

export default function AttendanceReportPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  const recordsPerPage = 50;

  // Query all employees
  const { data: employees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["employees"],
    queryFn: () => localStorageService.getEmployees(),
  });

  // Query all attendance records
  const { data: allRecords = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ["attendanceRecords"],
    queryFn: () => localStorageService.getAttendanceRecords(),
  });

  // Query last generation metadata
  const { data: lastGenerationData } = useQuery({
    queryKey: ["lastAttendanceGeneration"],
    queryFn: () => {
      const data = localStorage.getItem("last-attendance-generation");
      return data ? JSON.parse(data) : null;
    },
  });

  // Get employee name helper
  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown";
  };

  // Filter records
  const filteredRecords = allRecords.filter((record) => {
    const employeeName = getEmployeeName(record.employeeId).toLowerCase();
    const matchesSearch = searchQuery === "" || employeeName.includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort by date descending (most recent first)
  const sortedRecords = [...filteredRecords].sort((a, b) => b.date.localeCompare(a.date));

  // Paginate
  const totalPages = Math.ceil(sortedRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + recordsPerPage);

  // Handle generate all
  const handleGenerateAll = async () => {
    try {
      const activeEmployees = employees.filter(
        e => e.status === "active" || e.status === "onboarding"
      );

      let totalGenerated = 0;
      activeEmployees.forEach(employee => {
        const generated = fillMissingAttendanceRecords(employee.id);
        totalGenerated += generated;
      });

      // Store generation metadata
      const generationData = {
        timestamp: DateTime.now().setZone("Europe/London").toISO(),
        recordsGenerated: totalGenerated,
        employeesProcessed: activeEmployees.length,
      };
      localStorage.setItem("last-attendance-generation", JSON.stringify(generationData));

      await queryClient.invalidateQueries({ queryKey: ["attendanceRecords"] });
      await queryClient.invalidateQueries({ queryKey: ["lastAttendanceGeneration"] });

      toast({
        title: "Attendance Generated",
        description: `Generated ${totalGenerated} attendance records for ${activeEmployees.length} employees`,
      });
    } catch (error) {
      console.error("Failed to generate attendance:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate attendance records",
        variant: "destructive",
      });
    }
  };

  // Export to CSV
  const handleExport = () => {
    const headers = [
      "Employee Name",
      "Date",
      "Day",
      "Status",
      "Clock In",
      "Clock Out",
      "Break Type",
      "Break Duration (min)",
      "Scheduled Hours",
      "Total Hours",
      "Paid Hours",
      "Overtime Hours",
      "Hourly Rate",
      "Overtime Rate",
      "Break Cost",
      "Base Pay",
      "Overtime Pay",
      "Total Day Pay",
      "Is Anomaly",
      "Notes"
    ];

    const csvRows = [headers.join(",")];

    sortedRecords.forEach((record) => {
      const row = [
        `"${getEmployeeName(record.employeeId)}"`,
        record.date,
        record.day,
        record.status,
        record.actualClockInTime || "",
        record.actualClockOutTime || "",
        record.breakType || "",
        record.breakDuration || "",
        record.scheduledWorkingHours?.toFixed(2) || "",
        record.totalWorkingHours?.toFixed(2) || "",
        record.paidWorkingHours?.toFixed(2) || "",
        record.overtimeHours?.toFixed(2) || "",
        record.hourlyRate?.toFixed(2) || "",
        record.overtimeRate?.toFixed(2) || "",
        record.breakCost?.toFixed(2) || "",
        record.basePay?.toFixed(2) || "",
        record.overtimePay?.toFixed(2) || "",
        record.totalDayPay?.toFixed(2) || "",
        record.anomalyFlag ? "Yes" : "No",
        `"${record.notes || ""}"`
      ];
      csvRows.push(row.join(","));
    });

    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    
    const now = DateTime.now().setZone("Europe/London");
    const filename = `Attendance_Report_${now.toFormat("yy-MM-dd_HH-mm")}.csv`;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Format time for display
  const formatTime = (time: string | null | undefined) => {
    if (!time) return "-";
    return time;
  };

  // Calculate summary stats
  const stats = {
    totalRecords: filteredRecords.length,
    present: filteredRecords.filter(r => r.status === "Present").length,
    absent: filteredRecords.filter(r => r.status === "Absent").length,
    incomplete: filteredRecords.filter(r => r.status === "Incomplete").length,
    totalHours: filteredRecords.reduce((sum, r) => sum + (r.totalWorkingHours || 0), 0),
    totalPay: filteredRecords.reduce((sum, r) => sum + (r.totalDayPay || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Report</h2>
          <p className="text-muted-foreground">Complete attendance records for all employees</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={sortedRecords.length === 0}
            data-testid="button-export-attendance"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            onClick={handleGenerateAll}
            data-testid="button-generate-attendance"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Generate Missing Records
          </Button>
        </div>
      </div>

      {/* Last Generation Info */}
      {lastGenerationData && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Last Generation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Time: </span>
                <span className="font-medium">
                  {DateTime.fromISO(lastGenerationData.timestamp).toFormat("dd/MM/yyyy HH:mm:ss")}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Records Generated: </span>
                <span className="font-medium">{lastGenerationData.recordsGenerated}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Employees Processed: </span>
                <span className="font-medium">{lastGenerationData.employeesProcessed}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecords}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.present}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.absent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incomplete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.incomplete}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalHours.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pay</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£{stats.totalPay.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by employee name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="input-search-attendance"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="Incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Records</CardTitle>
          <CardDescription>
            Showing {startIndex + 1} to {Math.min(startIndex + recordsPerPage, sortedRecords.length)} of {sortedRecords.length} records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading attendance records...</div>
          ) : sortedRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No attendance records found. Click "Generate Missing Records" to create them.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Day</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Clock In</TableHead>
                      <TableHead>Clock Out</TableHead>
                      <TableHead>Break Type</TableHead>
                      <TableHead>Break (min)</TableHead>
                      <TableHead>Total Hours</TableHead>
                      <TableHead>Paid Hours</TableHead>
                      <TableHead>Overtime</TableHead>
                      <TableHead>Total Pay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRecords.map((record) => (
                      <TableRow key={record.id} data-testid={`row-attendance-${record.id}`}>
                        <TableCell className="font-medium">{getEmployeeName(record.employeeId)}</TableCell>
                        <TableCell>{DateTime.fromISO(record.date).toFormat("dd/MM/yyyy")}</TableCell>
                        <TableCell>{record.day}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.status === "Present" ? "default" :
                              record.status === "Absent" ? "destructive" :
                              "secondary"
                            }
                            className={
                              record.status === "Present" ? "bg-green-600 hover:bg-green-700" :
                              record.status === "Absent" ? "bg-red-600 hover:bg-red-700" :
                              "bg-yellow-600 hover:bg-yellow-700"
                            }
                          >
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatTime(record.actualClockInTime)}</TableCell>
                        <TableCell>{formatTime(record.actualClockOutTime)}</TableCell>
                        <TableCell>{record.breakType || "-"}</TableCell>
                        <TableCell>{record.breakDuration || "-"}</TableCell>
                        <TableCell>{record.totalWorkingHours?.toFixed(2) || "-"}</TableCell>
                        <TableCell>{record.paidWorkingHours?.toFixed(2) || "-"}</TableCell>
                        <TableCell>{record.overtimeHours?.toFixed(2) || "-"}</TableCell>
                        <TableCell>£{record.totalDayPay?.toFixed(2) || "0.00"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
