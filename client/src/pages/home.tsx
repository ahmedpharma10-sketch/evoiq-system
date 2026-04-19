import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Building2, LogOut } from "lucide-react";
import AddCompany from "@/components/add-company";
import ShowCompanies from "@/components/show-companies";
import { AdminView } from "@/components/admin-view";
import TaskManagement from "@/components/task-management";
import Auditor from "@/components/auditor";
import HRAuditor from "@/components/hr-auditor";
import SLCompanies from "@/components/sl-companies";
import SLIssued from "@/components/sl-issued";
import { SLPrepTaskManager } from "@/components/sl-prep-task-manager";
import { HRTaskManager } from "@/components/hr-task-manager";
import EmployeeFormBuilder from "@/components/employee-form-builder";
import AddEmployeeWizard from "@/components/add-employee-wizard";
import EmployeeList from "@/components/employee-list";
import EmployeeTaskManagement from "@/components/employee-task-management";
import ResidencyManagement from "@/components/residency-management";
import ResidencyTaskManager from "@/components/residency-task-manager";
import ResidencyTasksView from "@/components/residency-tasks-view";
import ResidencyAuditor from "@/components/residency-auditor";
import SLTraining from "@/components/sl-training";
import { api } from "@/lib/api";
import { useScheduledTasks } from "@/hooks/use-scheduled-tasks";
import { queryClient } from "@/lib/queryClient";
import { localStorageService } from "@/lib/localStorage";
import { authService } from "@/lib/authService";
import { generateEmployeeTasks, generateHRTemplateTasks, generateResidencyTemplateTasks, saveGeneratedTasks } from "@/lib/utils/employeeTaskGenerator";
import type { Task, EmployeeTask, EmployeeRecord, PendingDependantRequest, PendingEmployeeStatusChange, PendingCompanySLChange, DeletionRequest } from "@shared/schema";
import { differenceInDays, parseISO, startOfDay } from "date-fns";
import { DateTime } from "luxon";

export default function Home() {
  const [activeTab, setActiveTab] = useState("show-companies");
  
  // Query tasks to calculate counts for tab badges
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
    queryFn: api.getTasks,
  });

  // Calculate due/overdue tasks count (open tasks due within 30 days or overdue)
  const dueTasksCount = tasks.filter((task) => {
    if (task.status !== "open") return false;
    const dueDate = startOfDay(parseISO(task.dueAt));
    const today = startOfDay(new Date());
    const daysUntil = differenceInDays(dueDate, today);
    return daysUntil <= 30; // Includes overdue (negative), today (0), and upcoming (1-30)
  }).length;

  // Query pending SL changes for Company Auditor badge count
  const { data: pendingSLChanges = [] } = useQuery<PendingCompanySLChange[]>({
    queryKey: ["pendingCompanySLChanges"],
    queryFn: () => localStorageService.getPendingCompanySLChanges().filter(r => r.status === "pending"),
  });

  // Query pending deletion requests for Company Auditor badge count
  const { data: pendingDeletionRequests = [] } = useQuery<DeletionRequest[]>({
    queryKey: ["/api", "deletion-requests", "pending"],
    queryFn: api.getPendingDeletionRequests,
  });

  // Calculate unreviewed tasks count (done/cancelled tasks not yet reviewed + pending SL changes + pending deletion requests)
  const unreviewedTasksCount = tasks.filter((task) =>
    (task.status === "done" || task.status === "cancelled") && !task.reviewed
  ).length + pendingSLChanges.length + pendingDeletionRequests.length;

  // Query employee tasks to calculate counts for tab badges
  const { data: employeeTasks = [] } = useQuery<EmployeeTask[]>({
    queryKey: ["employeeTasks"],
    queryFn: () => localStorageService.getEmployeeTasks(),
  });

  // Query employees to filter out tasks for leavers/deactivated
  const { data: employees = [] } = useQuery<EmployeeRecord[]>({
    queryKey: ["employees"],
    queryFn: () => localStorageService.getEmployees(),
  });

  // Filter out tasks for leavers and deactivated employees
  const activeEmployeeTasks = employeeTasks.filter(task => {
    const employee = employees.find(emp => emp.id === task.employeeId);
    return employee && employee.status !== "leaver" && employee.status !== "deactivated";
  });

  // Calculate due/overdue employee tasks count (open tasks due within 30 days or overdue)
  const dueEmployeeTasksCount = activeEmployeeTasks.filter((task) => {
    if (task.status !== "open") return false;
    const dueDate = startOfDay(parseISO(task.dueAt));
    const today = startOfDay(new Date());
    const daysUntil = differenceInDays(dueDate, today);
    return daysUntil <= 30;
  }).length;

  // Filter residency tasks (taskType starts with "residency_template")
  const residencyTasks = activeEmployeeTasks.filter((task) =>
    task.taskType.startsWith("residency_template")
  );

  // Calculate due/overdue residency tasks count (open tasks due within 30 days or overdue)
  const dueResidencyTasksCount = residencyTasks.filter((task) => {
    if (task.status !== "open") return false;
    const dueDate = startOfDay(parseISO(task.dueAt));
    const today = startOfDay(new Date());
    const daysUntil = differenceInDays(dueDate, today);
    return daysUntil <= 30;
  }).length;

  // Calculate unreviewed residency tasks count (completed/skipped/cancelled tasks not yet reviewed)
  const unreviewedResidencyTasksCount = residencyTasks.filter((task) =>
    (task.status === "completed" || task.status === "skipped" || task.status === "cancelled") && !task.reviewed
  ).length;

  // Query pending dependant requests
  const { data: pendingDependantRequests = [] } = useQuery<PendingDependantRequest[]>({
    queryKey: ["pendingDependantRequests"],
    queryFn: () => localStorageService.getPendingDependantRequests(),
  });

  // Calculate pending dependant requests count (status === "pending")
  const pendingDependantRequestsCount = pendingDependantRequests.filter((req) => req.status === "pending").length;

  // Combine counts for Residency Auditor badge (pending requests + unreviewed tasks)
  const residencyAuditorBadgeCount = pendingDependantRequestsCount + unreviewedResidencyTasksCount;

  // Query pending employee status changes
  const { data: pendingEmployeeStatusChanges = [] } = useQuery<PendingEmployeeStatusChange[]>({
    queryKey: ["pendingEmployeeStatusChanges"],
    queryFn: () => localStorageService.getPendingEmployeeStatusChanges(),
  });

  // Calculate pending employee status changes count (status === "pending")
  const pendingEmployeeStatusChangesCount = pendingEmployeeStatusChanges.filter((req) => req.status === "pending").length;

  // Filter non-residency employee tasks
  const nonResidencyTasks = activeEmployeeTasks.filter((task) =>
    !task.taskType.startsWith("residency_template")
  );

  // Calculate unreviewed non-residency employee tasks count
  const unreviewedEmployeeTasksCount = nonResidencyTasks.filter((task) =>
    (task.status === "completed" || task.status === "skipped" || task.status === "cancelled") && !task.reviewed
  ).length;

  // Combine counts for HR Auditor badge (pending status changes + unreviewed employee tasks)
  const hrAuditorBadgeCount = pendingEmployeeStatusChangesCount + unreviewedEmployeeTasksCount;

  // Calculate pending SL Prep tasks count (not completed) across all SL companies
  const slPrepPendingCount = (() => {
    const slPrepTasks = localStorageService.getSLPrepTasks();
    const taskStatuses = localStorageService.getCompanySLPrepTaskStatuses();
    const companies = localStorageService.getCompanies();
    const slCompanies = companies.filter((c) => c.sl);
    
    if (slPrepTasks.length === 0 || slCompanies.length === 0) return 0;
    
    let pendingCount = 0;
    slCompanies.forEach((company) => {
      slPrepTasks.forEach((task) => {
        const status = taskStatuses.find(
          (s) => s.companyId === company.id && s.taskId === task.id
        );
        if (!status?.isCompleted) {
          pendingCount++;
        }
      });
    });
    
    return pendingCount;
  })();

  // Initialize scheduled tasks (2 AM sync, 3 AM task generation)
  useScheduledTasks();

  // Auto-calculate renewal dates and generate tasks on app load
  useEffect(() => {
    const initializeTasks = async () => {
      try {
        // First, calculate renewal dates for any companies missing them
        await api.recalculateRenewalDates();
        
        // Then generate tasks
        await api.generateTasks();
      } catch (error) {
        console.error("Failed to initialize tasks:", error);
      }
    };
    
    initializeTasks();
  }, []);

  // Refresh data and generate tasks when Tasks tab is clicked
  const handleTasksTabClick = async () => {
    try {
      await api.generateTasks();
    } catch (error) {
      console.error("Failed to generate tasks:", error);
    }
    
    // Refetch queries to update UI
    await queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
    await queryClient.refetchQueries({ queryKey: ["last-task-generation"] });
  };

  // Refresh data when Auditor tab is clicked (even if already active)
  const refreshAuditorData = async () => {
    // Refetch queries to update UI
    await queryClient.refetchQueries({ queryKey: ["/api/tasks"] });
    await queryClient.refetchQueries({ queryKey: ["last-task-generation"] });
  };

  // Regenerate employee tasks
  const regenerateEmployeeTasks = async () => {
    try {
      const allEmployees = localStorageService.getEmployees();
      let totalGenerated = 0;
      let errorCount = 0;
      
      // Process each employee with individual error handling
      allEmployees.forEach((employee: EmployeeRecord) => {
        try {
          const employeeTasksResult = generateEmployeeTasks(employee);
          const hrTasksResult = generateHRTemplateTasks(employee);
          const allTasks = [...employeeTasksResult.generatedTasks, ...hrTasksResult.generatedTasks];
          
          if (allTasks.length > 0) {
            saveGeneratedTasks(employee, allTasks);
            totalGenerated += allTasks.length;
          }
        } catch (employeeError) {
          console.error(`Failed to generate tasks for employee ${employee.id}:`, employeeError);
          errorCount++;
        }
      });
      
      // Update last generation timestamp even if some employees failed
      const timestamp = DateTime.now().setZone("Europe/London").toISO();
      if (timestamp) {
        localStorageService.setLastEmployeeTaskGeneration(timestamp);
      }
      
      await queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      
      console.log(`[Tab Click] Generated ${totalGenerated} employee tasks${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
    } catch (error) {
      console.error("Failed to regenerate employee tasks:", error);
    }
  };

  // Handle tab changes (including programmatic navigation)
  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Handler for Employees tab click
  const handleEmployeesTabClick = () => {
    // Fire and forget - don't await to avoid blocking UI
    regenerateEmployeeTasks();
  };

  // Handler for HR Tasks tab click  
  const handleHRTasksTabClick = () => {
    // Fire and forget - don't await to avoid blocking UI
    regenerateEmployeeTasks();
  };

  // Handler for Employee Tasks tab click
  const handleEmployeeTasksTabClick = () => {
    // Fire and forget - don't await to avoid blocking UI
    regenerateEmployeeTasks();
  };

  // Regenerate residency tasks
  const regenerateResidencyTasks = async () => {
    try {
      const allEmployees = localStorageService.getEmployees();
      const residencyEmployees = allEmployees.filter((e: EmployeeRecord) => e.isResidencyService);
      let totalGenerated = 0;
      let errorCount = 0;
      
      // Process each employee with residency service with individual error handling
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
      
      await queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.invalidateQueries({ queryKey: ["lastResidencyTaskGeneration"] });
      
      console.log(`[Tab Click] Generated ${totalGenerated} residency tasks${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
    } catch (error) {
      console.error("Failed to regenerate residency tasks:", error);
    }
  };

  // Handler for Residency tab click
  const handleResidencyTabClick = () => {
    // Fire and forget - don't await to avoid blocking UI
    regenerateResidencyTasks();
  };

  // Handler for Residency Tasks tab click  
  const handleResidencyTasksTabClick = () => {
    // Fire and forget - don't await to avoid blocking UI
    regenerateResidencyTasks();
  };

  // Handler for Residency Auditor tab click
  const handleResidencyAuditorTabClick = () => {
    // Fire and forget - don't await to avoid blocking UI
    regenerateResidencyTasks();
  };

  const handleLogout = () => {
    authService.logout();
    window.location.reload();
  };

  const currentUser = authService.getCurrentUser();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                Corporate Management System
              </h1>
              <p className="text-xs text-muted-foreground">
                Professional company tracking & task automation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser.position}</p>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              data-testid="button-logout"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="mb-8 flex flex-col gap-2">
            {/* Company-related tabs - Row 1 */}
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 h-auto">
              <TabsTrigger 
                value="admin"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-admin"
              >
                Admin
              </TabsTrigger>
              <TabsTrigger 
                value="add-company" 
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-add-company"
              >
                Add Company
              </TabsTrigger>
              <TabsTrigger 
                value="show-companies"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-show-companies"
              >
                Companies
              </TabsTrigger>
              <TabsTrigger 
                value="tasks"
                onClick={handleTasksTabClick}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-tasks"
              >
                Comp. Tasks {dueTasksCount > 0 && `(${dueTasksCount})`}
              </TabsTrigger>
              <TabsTrigger 
                value="sl-prep-task"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-sl-prep-task"
              >
                Create SL Tasks
              </TabsTrigger>
              <TabsTrigger 
                value="sl"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-sl"
              >
                SL Prep {slPrepPendingCount > 0 && `(${slPrepPendingCount})`}
              </TabsTrigger>
              <TabsTrigger 
                value="sl-issued"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-sl-issued"
              >
                SL
              </TabsTrigger>
              <TabsTrigger 
                value="auditor"
                onClick={refreshAuditorData}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-auditor"
              >
                Comp. Auditor {unreviewedTasksCount > 0 && `(${unreviewedTasksCount})`}
              </TabsTrigger>
              <TabsTrigger 
                value="sl-training"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-sl-training"
              >
                SL Training
              </TabsTrigger>
            </TabsList>

            {/* Employee-related tabs - Row 2 */}
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-6 h-auto">
              <TabsTrigger 
                value="employee-form"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-employee-form"
              >
                Employee Form
              </TabsTrigger>
              <TabsTrigger 
                value="add-employee"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-add-employee"
              >
                Add Employee
              </TabsTrigger>
              <TabsTrigger 
                value="employees"
                onClick={handleEmployeesTabClick}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-employees"
              >
                Employees
              </TabsTrigger>
              <TabsTrigger 
                value="hr-tasks"
                onClick={handleHRTasksTabClick}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-hr-tasks"
              >
                Create HR Tasks
              </TabsTrigger>
              <TabsTrigger 
                value="employee-tasks"
                onClick={handleEmployeeTasksTabClick}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-employee-tasks"
              >
                Employee Tasks {dueEmployeeTasksCount > 0 && `(${dueEmployeeTasksCount})`}
              </TabsTrigger>
              <TabsTrigger 
                value="hr-auditor"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-hr-auditor"
              >
                HR Auditor {hrAuditorBadgeCount > 0 && `(${hrAuditorBadgeCount})`}
              </TabsTrigger>
            </TabsList>

            {/* Residency-related tabs - Row 3 */}
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4 h-auto">
              <TabsTrigger 
                value="create-residency-tasks"
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-create-residency-tasks"
              >
                Create Res. Tasks
              </TabsTrigger>
              <TabsTrigger 
                value="residency"
                onClick={handleResidencyTabClick}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-residency"
              >
                Residency
              </TabsTrigger>
              <TabsTrigger 
                value="residency-tasks"
                onClick={handleResidencyTasksTabClick}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-residency-tasks"
              >
                Residency Tasks {dueResidencyTasksCount > 0 && `(${dueResidencyTasksCount})`}
              </TabsTrigger>
              <TabsTrigger 
                value="residency-auditor"
                onClick={handleResidencyAuditorTabClick}
                className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary"
                data-testid="tab-residency-auditor"
              >
                Residency Auditor {residencyAuditorBadgeCount > 0 && `(${residencyAuditorBadgeCount})`}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="add-company" className="mt-0">
            <AddCompany onSuccess={() => setActiveTab("show-companies")} />
          </TabsContent>

          <TabsContent value="show-companies" className="mt-0">
            <ShowCompanies />
          </TabsContent>

          <TabsContent value="tasks" className="mt-0">
            <TaskManagement />
          </TabsContent>

          <TabsContent value="auditor" className="mt-0">
            <Auditor />
          </TabsContent>

          <TabsContent value="sl-training" className="mt-0">
            <SLTraining user={currentUser} />
          </TabsContent>

          <TabsContent value="admin" className="mt-0">
            <AdminView />
          </TabsContent>

          <TabsContent value="sl-prep-task" className="mt-0">
            <SLPrepTaskManager />
          </TabsContent>

          <TabsContent value="sl" className="mt-0">
            <SLCompanies />
          </TabsContent>

          <TabsContent value="sl-issued" className="mt-0">
            <SLIssued />
          </TabsContent>

          <TabsContent value="employee-form" className="mt-0">
            <EmployeeFormBuilder />
          </TabsContent>

          <TabsContent value="add-employee" className="mt-0">
            <AddEmployeeWizard />
          </TabsContent>

          <TabsContent value="employees" className="mt-0">
            <EmployeeList />
          </TabsContent>

          <TabsContent value="hr-tasks" className="mt-0">
            <HRTaskManager />
          </TabsContent>

          <TabsContent value="employee-tasks" className="mt-0">
            <EmployeeTaskManagement />
          </TabsContent>

          <TabsContent value="hr-auditor" className="mt-0">
            <HRAuditor />
          </TabsContent>

          <TabsContent value="create-residency-tasks" className="mt-0">
            <ResidencyTaskManager />
          </TabsContent>

          <TabsContent value="residency" className="mt-0">
            <ResidencyManagement />
          </TabsContent>

          <TabsContent value="residency-tasks" className="mt-0">
            <ResidencyTasksView />
          </TabsContent>

          <TabsContent value="residency-auditor" className="mt-0">
            <ResidencyAuditor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
