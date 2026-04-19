import { useEffect, useRef } from "react";
import { DateTime } from "luxon";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { localStorageService } from "@/lib/localStorage";
import { generateEmployeeTasks, generateHRTemplateTasks, generateResidencyTemplateTasks, saveGeneratedTasks } from "@/lib/utils/employeeTaskGenerator";
import type { EmployeeRecord } from "@shared/schema";

const SYNC_HOUR = 2; // 2 AM UK time
const TASK_GEN_HOUR = 6; // 6 AM UK time (company tasks)
const EMPLOYEE_TASK_GEN_HOUR = 6; // 6 AM UK time (employee tasks)
const RESIDENCY_TASK_GEN_HOUR = 6; // 6 AM UK time (residency tasks)

/**
 * Hook to handle scheduled tasks:
 * - Companies House sync at 2 AM UK time daily
 * - Company task generation at 6 AM UK time daily
 * - Employee task generation at 6 AM UK time daily
 * - Residency task generation at 6 AM UK time daily
 * 
 * Runs checks on page load and periodically while page is active
 */
export function useScheduledTasks() {
  const hasRunSyncToday = useRef(false);
  const hasRunTaskGenToday = useRef(false);
  const hasRunEmployeeTaskGenToday = useRef(false);
  const hasRunResidencyTaskGenToday = useRef(false);

  const shouldRunSync = async (): Promise<boolean> => {
    const now = DateTime.now().setZone("Europe/London");
    const lastSync = await api.getLastSyncTimestamp();
    
    // If never synced, don't auto-run (user should manually initiate first sync)
    if (!lastSync) return false;
    
    const lastSyncTime = DateTime.fromISO(lastSync, { zone: "Europe/London" });
    const todayAt2AM = now.set({ hour: SYNC_HOUR, minute: 0, second: 0, millisecond: 0 });
    
    // Check if current time is past 2 AM today AND last sync was before 2 AM today
    if (now >= todayAt2AM && lastSyncTime < todayAt2AM) {
      return true;
    }
    
    return false;
  };

  const shouldRunTaskGen = async (): Promise<boolean> => {
    const now = DateTime.now().setZone("Europe/London");
    const lastGen = await api.getLastTaskGenerationTimestamp();
    
    // If never generated, don't auto-run (user should manually initiate)
    if (!lastGen) return false;
    
    const lastGenTime = DateTime.fromISO(lastGen, { zone: "Europe/London" });
    const todayAt6AM = now.set({ hour: TASK_GEN_HOUR, minute: 0, second: 0, millisecond: 0 });
    
    // Check if current time is past 6 AM today AND last generation was before 6 AM today
    if (now >= todayAt6AM && lastGenTime < todayAt6AM) {
      return true;
    }
    
    return false;
  };

  const runScheduledSync = async () => {
    if (hasRunSyncToday.current) return;
    
    try {
      const shouldRun = await shouldRunSync();
      if (shouldRun) {
        console.log("[Scheduled Task] Running Companies House sync...");
        await api.syncAllCompaniesWithCH();
        queryClient.invalidateQueries({ queryKey: ["companies"] });
        queryClient.invalidateQueries({ queryKey: ["last-sync"] });
        hasRunSyncToday.current = true;
      }
    } catch (error) {
      console.error("[Scheduled Task] Failed to run sync:", error);
    }
  };

  const runScheduledTaskGen = async () => {
    if (hasRunTaskGenToday.current) return;
    
    try {
      const shouldRun = await shouldRunTaskGen();
      if (shouldRun) {
        console.log("[Scheduled Task] Running task generation...");
        await api.generateTasks();
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["last-task-generation"] });
        hasRunTaskGenToday.current = true;
      }
    } catch (error) {
      console.error("[Scheduled Task] Failed to run task generation:", error);
    }
  };

  const shouldRunEmployeeTaskGen = (): boolean => {
    const now = DateTime.now().setZone("Europe/London");
    const lastGen = localStorageService.getLastEmployeeTaskGeneration();
    
    // If never generated, don't auto-run (user should manually initiate)
    if (!lastGen) return false;
    
    const lastGenTime = DateTime.fromISO(lastGen, { zone: "Europe/London" });
    const todayAt6AM = now.set({ hour: EMPLOYEE_TASK_GEN_HOUR, minute: 0, second: 0, millisecond: 0 });
    
    // Check if current time is past 6 AM today AND last generation was before 6 AM today
    if (now >= todayAt6AM && lastGenTime < todayAt6AM) {
      return true;
    }
    
    return false;
  };

  const runScheduledEmployeeTaskGen = async () => {
    if (hasRunEmployeeTaskGenToday.current) return;
    
    try {
      const shouldRun = shouldRunEmployeeTaskGen();
      if (!shouldRun) return;
      
      console.log("[Scheduled Task] Running employee task generation at 6 AM...");
      const allEmployees = localStorageService.getEmployees();
      let totalGenerated = 0;
      let errorCount = 0;
      
      // Process each employee with individual error handling to prevent cascade failures
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
          console.error(`[Scheduled Task] Failed to generate tasks for employee ${employee.id}:`, employeeError);
          errorCount++;
        }
      });
      
      // Update last generation timestamp even if some employees failed
      const timestamp = DateTime.now().setZone("Europe/London").toISO();
      if (timestamp) {
        localStorageService.setLastEmployeeTaskGeneration(timestamp);
      }
      
      queryClient.invalidateQueries({ queryKey: ["employee-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      
      const message = `[Scheduled Task] Generated ${totalGenerated} employee tasks${errorCount > 0 ? ` (${errorCount} errors)` : ''}`;
      console.log(message);
      hasRunEmployeeTaskGenToday.current = true;
    } catch (error) {
      console.error("[Scheduled Task] Failed to run employee task generation:", error);
    }
  };

  const shouldRunResidencyTaskGen = (): boolean => {
    const now = DateTime.now().setZone("Europe/London");
    const lastGen = localStorageService.getLastResidencyTaskGeneration();
    
    // If never generated, don't auto-run (user should manually initiate)
    if (!lastGen) return false;
    
    const lastGenTime = DateTime.fromISO(lastGen, { zone: "Europe/London" });
    const todayAt6AM = now.set({ hour: RESIDENCY_TASK_GEN_HOUR, minute: 0, second: 0, millisecond: 0 });
    
    // Check if current time is past 6 AM today AND last generation was before 6 AM today
    if (now >= todayAt6AM && lastGenTime < todayAt6AM) {
      return true;
    }
    
    return false;
  };

  const runScheduledResidencyTaskGen = async () => {
    if (hasRunResidencyTaskGenToday.current) return;
    
    try {
      const shouldRun = shouldRunResidencyTaskGen();
      if (!shouldRun) return;
      
      console.log("[Scheduled Task] Running residency task generation at 6 AM...");
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
          console.error(`[Scheduled Task] Failed to generate residency tasks for employee ${employee.id}:`, employeeError);
          errorCount++;
        }
      });
      
      // Update last generation timestamp even if some employees failed
      const timestamp = DateTime.now().setZone("Europe/London").toISO();
      if (timestamp) {
        localStorageService.setLastResidencyTaskGeneration(timestamp);
      }
      
      queryClient.invalidateQueries({ queryKey: ["employeeTasks"] });
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["lastResidencyTaskGeneration"] });
      
      const message = `[Scheduled Task] Generated ${totalGenerated} residency tasks${errorCount > 0 ? ` (${errorCount} errors)` : ''}`;
      console.log(message);
      hasRunResidencyTaskGenToday.current = true;
    } catch (error) {
      console.error("[Scheduled Task] Failed to run residency task generation:", error);
    }
  };

  const checkScheduledTasks = async () => {
    await runScheduledSync();
    await runScheduledTaskGen();
    await runScheduledEmployeeTaskGen();
    await runScheduledResidencyTaskGen();
  };

  useEffect(() => {
    // Run immediately on mount
    checkScheduledTasks();

    // Check every hour while page is active
    const interval = setInterval(checkScheduledTasks, 60 * 60 * 1000);

    // Reset daily flags at midnight
    const now = DateTime.now().setZone("Europe/London");
    const tomorrow = now.plus({ days: 1 }).startOf("day");
    const msUntilMidnight = tomorrow.diff(now).milliseconds;

    const midnightReset = setTimeout(() => {
      hasRunSyncToday.current = false;
      hasRunTaskGenToday.current = false;
      hasRunEmployeeTaskGenToday.current = false;
      hasRunResidencyTaskGenToday.current = false;
      checkScheduledTasks();
    }, msUntilMidnight);

    return () => {
      clearInterval(interval);
      clearTimeout(midnightReset);
    };
  }, []);
}
