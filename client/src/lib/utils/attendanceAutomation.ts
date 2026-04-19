import { DateTime } from "luxon";
import { localStorageService } from "../localStorage";
import { generateAttendanceRecordForYesterday, generateAttendanceRecordForDate } from "./attendanceGenerator";

const TIMEZONE = "Europe/London";
const LAST_ATTENDANCE_CHECK_KEY = "last-attendance-automation-check";

/**
 * Auto-generate yesterday's attendance record for all active employees
 * This should run on app startup and will only generate once per day
 */
export function runDailyAttendanceAutomation(): void {
  const today = DateTime.now().setZone(TIMEZONE).startOf('day').toISODate();
  if (!today) {
    console.error("[Attendance Automation] Failed to calculate today's date");
    return;
  }
  
  const lastCheck = localStorage.getItem(LAST_ATTENDANCE_CHECK_KEY);
  
  // Only run once per day
  if (lastCheck === today) {
    console.log("[Attendance Automation] Already ran today, skipping...");
    return;
  }
  
  console.log("[Attendance Automation] Running daily attendance automation...");
  
  // Get all employees
  const employees = localStorageService.getEmployees();
  const holidays = localStorageService.getHolidays();
  const yesterday = DateTime.now().setZone(TIMEZONE).startOf('day').minus({ days: 1 }).toISODate();
  
  if (!yesterday) {
    console.error("[Attendance Automation] Failed to calculate yesterday's date");
    return;
  }
  
  let recordsGenerated = 0;
  let recordsSkipped = 0;
  
  // Get existing attendance records to check for duplicates
  const existingRecords = localStorageService.getAttendanceRecords();
  
  employees.forEach(employee => {
    // Only generate for active employees who have started working
    const isActive = employee.status === "active" || employee.status === "onboarding";
    const hasStarted = employee.startDate && employee.startDate <= yesterday;
    const hasNotEnded = !employee.endDate || employee.endDate >= yesterday;
    
    if (!isActive || !hasStarted || !hasNotEnded) {
      return;
    }
    
    // Check if record already exists for yesterday
    const existingRecord = existingRecords.find(
      r => r.employeeId === employee.id && r.date === yesterday
    );
    
    if (existingRecord) {
      recordsSkipped++;
      return;
    }
    
    // Generate yesterday's attendance record
    const record = generateAttendanceRecordForYesterday(employee, holidays);
    if (record) {
      localStorageService.addAttendanceRecord(record);
      recordsGenerated++;
      console.log(`[Attendance Automation] Generated record for ${employee.firstName} ${employee.lastName} on ${yesterday}`);
    }
  });
  
  // Update last check date
  localStorage.setItem(LAST_ATTENDANCE_CHECK_KEY, today);
  
  console.log(`[Attendance Automation] Completed: ${recordsGenerated} records generated, ${recordsSkipped} skipped (already exist)`);
}

/**
 * Generate missing attendance records for an employee
 * This fills in any gaps between the last recorded date and yesterday
 */
export function fillMissingAttendanceRecords(employeeId: string): number {
  const employee = localStorageService.getEmployees().find(e => e.id === employeeId);
  if (!employee || !employee.startDate) {
    return 0;
  }
  
  const holidays = localStorageService.getHolidays();
  const existingRecords = localStorageService.getAttendanceRecordsByEmployeeId(employeeId);
  const yesterday = DateTime.now().setZone(TIMEZONE).startOf('day').minus({ days: 1 });
  const startDate = DateTime.fromISO(employee.startDate, { zone: TIMEZONE });
  const endDate = employee.endDate 
    ? DateTime.fromISO(employee.endDate, { zone: TIMEZONE })
    : yesterday;
  
  // Find the latest record date
  const sortedRecords = existingRecords.sort((a, b) => b.date.localeCompare(a.date));
  const latestRecordDate = sortedRecords.length > 0
    ? DateTime.fromISO(sortedRecords[0].date, { zone: TIMEZONE })
    : startDate.minus({ days: 1 }); // Start from day before start date if no records
  
  // Generate records from the day after the latest record to yesterday
  let currentDate = latestRecordDate.plus({ days: 1 });
  const finalDate = endDate < yesterday ? endDate : yesterday;
  let recordsGenerated = 0;
  
  const recordsToAdd: any[] = [];
  
  while (currentDate <= finalDate) {
    const dateStr = currentDate.toISODate();
    if (!dateStr) {
      currentDate = currentDate.plus({ days: 1 });
      continue;
    }
    
    // Check if record already exists
    const exists = existingRecords.some(r => r.date === dateStr);
    if (!exists) {
      // Generate record using the existing generation function
      const record = generateAttendanceRecordForDate(employee, dateStr, holidays);
      if (record) {
        recordsToAdd.push(record);
        recordsGenerated++;
      }
    }
    
    currentDate = currentDate.plus({ days: 1 });
  }
  
  // Bulk add all missing records
  if (recordsToAdd.length > 0) {
    localStorageService.addAttendanceRecordsBulk(recordsToAdd);
    console.log(`[Attendance Fill] Generated ${recordsGenerated} missing records for employee ${employeeId}`);
  }
  
  return recordsGenerated;
}
