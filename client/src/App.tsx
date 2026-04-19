import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/login";
import NotFound from "@/pages/not-found";
import { authService } from "@/lib/authService";
import { localStorageService } from "@/lib/localStorage";

// Lazy-load heavy page components for code splitting
const Home = lazy(() => import("@/pages/home"));
const CompanyDetails = lazy(() => import("@/pages/company-details"));
const EmployeeDetail = lazy(() => import("@/pages/employee-detail"));
const DeploymentDownload = lazy(() => import("@/pages/deployment-download"));

// Migration function to calculate working hours for existing employees
function migrateEmployeeWorkingHours() {
  const migrationKey = "employee-working-hours-migrated";
  if (localStorage.getItem(migrationKey)) {
    return;
  }

  const employees = localStorageService.getEmployees();

  employees.forEach((employee) => {
    if (employee.weeklyHours > 0 && (!employee.dailyWorkingHours || !employee.endingWorkingTime)) {
      const weeklyHours = employee.weeklyHours;
      const startingTime = employee.startingWorkingTime || "09:00";
      const dailyWorkingHours = weeklyHours / 5;

      try {
        const [startHour, startMinute] = startingTime.split(':').map(Number);
        const startTotalMinutes = startHour * 60 + startMinute;
        const dailyMinutes = dailyWorkingHours * 60;
        const restMinutes = 60;
        const endTotalMinutes = startTotalMinutes + dailyMinutes + restMinutes;

        const endHour = Math.floor(endTotalMinutes / 60) % 24;
        const endMinute = Math.floor(endTotalMinutes % 60);
        const endingWorkingTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

        localStorageService.updateEmployee(employee.id, {
          dailyWorkingHours,
          startingWorkingTime: startingTime,
          endingWorkingTime,
        });
      } catch (e) {
        console.error(`[Migration] Error calculating for employee ${employee.id}:`, e);
      }
    }
  });

  localStorage.setItem(migrationKey, "true");
}

// Migration function to add whatsAppNumber field to existing dependants
function migrateDependantWhatsAppNumbers() {
  const migrationKey = "dependant-whatsapp-migrated";
  if (localStorage.getItem(migrationKey)) {
    return;
  }

  localStorageService.migrateWhatsAppNumberField();
  localStorage.setItem(migrationKey, "true");
}

// Run all migrations in sequence
function runMigrations() {
  migrateEmployeeWorkingHours();
  migrateDependantWhatsAppNumbers();
}

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/company/:id" component={CompanyDetails} />
        <Route path="/employee/:id" component={EmployeeDetail} />
        <Route path="/deployment" component={DeploymentDownload} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function verifyAuth() {
      try {
        const response = await fetch('/api/auth/me', { credentials: 'include' });
        if (!response.ok) {
          setIsAuthenticated(false);
          return;
        }
        const data = await response.json();

        if (data.user) {
          authService.setCurrentUser(data.user);
          setIsAuthenticated(true);
          runMigrations();
        } else {
          localStorage.removeItem('currentUser');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth verification failed:', error);
        localStorage.removeItem('currentUser');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    }

    verifyAuth();
  }, []);

  const handleLoginSuccess = () => {
    queryClient.clear();
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <LoginPage onLoginSuccess={handleLoginSuccess} />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
