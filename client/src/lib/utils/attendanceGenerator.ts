import { DateTime } from "luxon";
import type { AttendanceRecord, EmployeeRecord, Holiday } from "@shared/schema";
import { idGenerator } from "../idGenerator";

// Constants
const ABSENCE_PROBABILITY = 0.0824; // 8.24% random absence rate
const TIMEZONE = "Europe/London";

/**
 * Helper function to format time as HH:MM:SS AM/PM
 */
function formatTime12Hour(hour: number, minute: number, second: number = 0): string {
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(hour12).padStart(2, "0")}:${String(minute).padStart(2, "0")}:${String(second).padStart(2, "0")} ${period}`;
}

/**
 * Parse time from HH:MM format to {hour, minute}
 */
function parseTime(timeStr: string): { hour: number; minute: number } {
  const [hour, minute] = timeStr.split(':').map(Number);
  return { hour, minute };
}

/**
 * Generate clock-in time based on scheduled start time
 * 80% of time: 0 to +10 minutes after scheduled start
 * 20% of time: -10 to 0 minutes before scheduled start
 */
function generateClockInTime(scheduledStart: string): string {
  const { hour, minute } = parseTime(scheduledStart);
  const totalMinutes = hour * 60 + minute;
  
  const random = Math.random();
  let variance: number;
  
  if (random < 0.8) {
    // 80%: 0 to +10 minutes
    variance = Math.floor(Math.random() * 11); // 0 to 10
  } else {
    // 20%: -10 to 0 minutes
    variance = Math.floor(Math.random() * 11) - 10; // -10 to 0
  }
  
  const actualMinutes = Math.max(0, totalMinutes + variance);
  const actualHour = Math.floor(actualMinutes / 60) % 24;
  const actualMinute = ((actualMinutes % 60) + 60) % 60;

  return formatTime12Hour(actualHour, actualMinute, Math.floor(Math.random() * 60));
}

/**
 * Generate clock-out time based on scheduled end time
 * 80% of time: 0 to +10 minutes after scheduled end
 * 20% of time: -5 to 0 minutes before scheduled end
 */
function generateClockOutTime(scheduledEnd: string): string {
  const { hour, minute } = parseTime(scheduledEnd);
  const totalMinutes = hour * 60 + minute;

  const random = Math.random();
  let variance: number;

  if (random < 0.8) {
    // 80%: 0 to +10 minutes
    variance = Math.floor(Math.random() * 11); // 0 to 10
  } else {
    // 20%: -5 to 0 minutes
    variance = Math.floor(Math.random() * 6) - 5; // -5 to 0
  }

  const actualMinutes = Math.max(0, totalMinutes + variance);
  const actualHour = Math.floor(actualMinutes / 60) % 24;
  const actualMinute = ((actualMinutes % 60) + 60) % 60;
  
  return formatTime12Hour(actualHour, actualMinute, Math.floor(Math.random() * 60));
}

/**
 * Convert HH:MM:SS AM/PM to decimal hours
 */
function timeStringToDecimalHours(timeStr: string): number {
  try {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0;
    }
    
    return hour24 + (minutes / 60) + (seconds / 3600);
  } catch {
    return 0;
  }
}

/**
 * Calculate time difference in decimal hours
 */
function calculateTimeDifference(startTime: string, endTime: string): number {
  const startHours = timeStringToDecimalHours(startTime);
  const endHours = timeStringToDecimalHours(endTime);
  
  // Handle overnight shifts
  if (endHours < startHours) {
    return (24 - startHours) + endHours;
  }
  
  return endHours - startHours;
}

/**
 * Convert HH:MM:SS to decimal hours
 */
function durationToDecimalHours(duration: string): number {
  try {
    const [hours, minutes, seconds] = duration.split(':').map(Number);
    return hours + (minutes / 60) + (seconds / 3600);
  } catch {
    return 0;
  }
}

/**
 * Round to 2 decimal places
 */
function round2dp(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate all hours and pay for an attendance record
 */
function calculateHoursAndPay(
  scheduledStart: string | undefined,
  scheduledEnd: string | undefined,
  actualClockIn: string | undefined,
  actualClockOut: string | undefined,
  breakType: "Paid" | "Unpaid",
  breakDuration: string | undefined,
  breakRate: number | undefined,
  hourlyRate: number | undefined,
  overtimeRate: number | undefined
): {
  scheduledWorkingHours: number;
  totalWorkingHours: number;
  paidWorkingHours: number;
  overtimeHours: number;
  breakCost: number;
  basePay: number;
  overtimePay: number;
  totalDayPay: number;
  anomalyFlag: boolean;
} {
  const result = {
    scheduledWorkingHours: 0,
    totalWorkingHours: 0,
    paidWorkingHours: 0,
    overtimeHours: 0,
    breakCost: 0,
    basePay: 0,
    overtimePay: 0,
    totalDayPay: 0,
    anomalyFlag: false,
  };

  // Calculate scheduled hours
  if (scheduledStart && scheduledEnd) {
    result.scheduledWorkingHours = round2dp(calculateTimeDifference(scheduledStart, scheduledEnd));
  }

  // Calculate total working hours
  if (actualClockIn && actualClockOut) {
    result.totalWorkingHours = round2dp(calculateTimeDifference(actualClockIn, actualClockOut));
    
    // Flag anomaly if working > 16 hours
    if (result.totalWorkingHours > 16) {
      result.anomalyFlag = true;
    }
  } else if (actualClockIn || actualClockOut) {
    // Missing clock data
    result.anomalyFlag = true;
  }

  // Calculate paid working hours (accounting for breaks)
  const breakHours = breakDuration ? durationToDecimalHours(breakDuration) : 0;
  
  if (breakType === "Unpaid") {
    result.paidWorkingHours = round2dp(Math.max(0, result.totalWorkingHours - breakHours));
  } else {
    result.paidWorkingHours = round2dp(result.totalWorkingHours);
  }

  // Validate break duration doesn't exceed total hours
  if (breakHours > result.totalWorkingHours) {
    result.paidWorkingHours = 0;
    result.anomalyFlag = true;
  }

  // Calculate overtime hours
  result.overtimeHours = round2dp(Math.max(0, result.paidWorkingHours - result.scheduledWorkingHours));

  // Calculate break cost (only for paid breaks)
  if (breakType === "Paid" && breakHours > 0 && breakRate) {
    result.breakCost = round2dp(breakHours * breakRate);
  }

  // Calculate base pay and overtime pay
  if (hourlyRate) {
    const effectiveOvertimeRate = overtimeRate || hourlyRate;
    
    if (result.overtimeHours > 0 && overtimeRate) {
      // Separate overtime rate
      const regularHours = result.paidWorkingHours - result.overtimeHours;
      result.basePay = round2dp(regularHours * hourlyRate);
      result.overtimePay = round2dp(result.overtimeHours * effectiveOvertimeRate);
    } else {
      // No separate overtime rate
      result.basePay = round2dp(result.paidWorkingHours * hourlyRate);
      result.overtimePay = 0;
    }
  }

  // Calculate total day pay
  result.totalDayPay = round2dp(result.basePay + result.overtimePay + result.breakCost);

  return result;
}

/**
 * Check if a date is a holiday
 */
function isHoliday(date: string, holidays: Holiday[]): boolean {
  return holidays.some(h => h.date === date);
}

/**
 * Check if a date is a weekend (Saturday or Sunday)
 */
function isWeekend(date: string): boolean {
  const dt = DateTime.fromISO(date, { zone: TIMEZONE });
  const dayOfWeek = dt.weekday; // 1=Mon, 7=Sun
  return dayOfWeek === 6 || dayOfWeek === 7; // Sat or Sun
}

/**
 * Get day name from date
 */
function getDayName(date: string): string {
  const dt = DateTime.fromISO(date, { zone: TIMEZONE });
  return dt.toFormat('EEE'); // Mon, Tue, Wed, etc.
}

/**
 * Generate a single attendance record for a specific date
 */
export function generateAttendanceRecordForDate(
  employee: EmployeeRecord,
  date: string,
  holidays: Holiday[]
): AttendanceRecord | null {
  const startDate = employee.startDate;
  const endDate = employee.endDate;
  
  // Don't generate if before start date or after end date
  if (date < startDate) return null;
  if (endDate && date > endDate) return null;
  
  const day = getDayName(date);
  let status: AttendanceRecord["status"] = "Present";
  
  // Check for holiday
  if (isHoliday(date, holidays)) {
    return {
      id: idGenerator.generateLogID(),
      employeeId: employee.id,
      date,
      day,
      status: "Holiday",
      breakType: "Unpaid",
      anomalyFlag: false,
      scheduledWorkingHours: 0,
      totalWorkingHours: 0,
      paidWorkingHours: 0,
      overtimeHours: 0,
      breakCost: 0,
      basePay: 0,
      overtimePay: 0,
      totalDayPay: 0,
    };
  }
  
  // Check for weekend
  if (isWeekend(date)) {
    return {
      id: idGenerator.generateLogID(),
      employeeId: employee.id,
      date,
      day,
      status: "Weekend",
      breakType: "Unpaid",
      anomalyFlag: false,
      scheduledWorkingHours: 0,
      totalWorkingHours: 0,
      paidWorkingHours: 0,
      overtimeHours: 0,
      breakCost: 0,
      basePay: 0,
      overtimePay: 0,
      totalDayPay: 0,
    };
  }
  
  // Random absence (8.24% probability)
  if (Math.random() < ABSENCE_PROBABILITY) {
    return {
      id: idGenerator.generateLogID(),
      employeeId: employee.id,
      date,
      day,
      status: "Absent",
      breakType: "Unpaid",
      anomalyFlag: false,
      scheduledWorkingHours: 0,
      totalWorkingHours: 0,
      paidWorkingHours: 0,
      overtimeHours: 0,
      breakCost: 0,
      basePay: 0,
      overtimePay: 0,
      totalDayPay: 0,
    };
  }
  
  // Generate Present day with times
  const scheduledStart = employee.startingWorkingTime || "09:00";
  const scheduledEnd = employee.endingWorkingTime || "17:00";
  
  // Convert HH:MM to HH:MM:SS AM/PM format for scheduled times
  const startTime = parseTime(scheduledStart);
  const scheduledStartFormatted = formatTime12Hour(startTime.hour, startTime.minute, 0);
  const endTime = parseTime(scheduledEnd);
  const scheduledEndFormatted = formatTime12Hour(endTime.hour, endTime.minute, 0);
  
  const actualClockIn = generateClockInTime(scheduledStart);
  const actualClockOut = generateClockOutTime(scheduledEnd);
  
  const breakType: "Paid" | "Unpaid" = "Unpaid"; // Default
  const breakDuration = "00:30:00"; // Default 30 minutes
  const breakRate = employee.hourlyRate; // Use hourly rate as break rate
  const hourlyRate = employee.hourlyRate;
  const overtimeRate = employee.overtimeRate;
  
  const calculations = calculateHoursAndPay(
    scheduledStartFormatted,
    scheduledEndFormatted,
    actualClockIn,
    actualClockOut,
    breakType,
    breakDuration,
    breakRate,
    hourlyRate,
    overtimeRate
  );
  
  return {
    id: idGenerator.generateLogID(),
    employeeId: employee.id,
    date,
    day,
    status: calculations.anomalyFlag ? "Incomplete" : "Present",
    scheduledStartTime: scheduledStartFormatted,
    actualClockInTime: actualClockIn,
    scheduledEndTime: scheduledEndFormatted,
    actualClockOutTime: actualClockOut,
    breakType,
    breakDuration,
    breakRate,
    hourlyRate,
    overtimeRate,
    ...calculations,
  };
}

/**
 * Generate attendance records from start date to yesterday for an employee
 */
export function generateAttendanceRecordsForEmployee(
  employee: EmployeeRecord,
  holidays: Holiday[]
): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  
  if (!employee.startDate) {
    return records;
  }
  
  const today = DateTime.now().setZone(TIMEZONE).startOf('day');
  const yesterday = today.minus({ days: 1 });
  const startDate = DateTime.fromISO(employee.startDate, { zone: TIMEZONE });
  const endDate = employee.endDate 
    ? DateTime.fromISO(employee.endDate, { zone: TIMEZONE })
    : yesterday;
  
  // Use the earlier of yesterday or endDate
  const finalDate = endDate < yesterday ? endDate : yesterday;
  
  let currentDate = startDate;
  
  while (currentDate <= finalDate) {
    const dateStr = currentDate.toISODate();
    if (dateStr) {
      const record = generateAttendanceRecordForDate(employee, dateStr, holidays);
      if (record) {
        records.push(record);
      }
    }
    currentDate = currentDate.plus({ days: 1 });
  }
  
  return records;
}

/**
 * Generate attendance record for yesterday only (for nightly automation)
 */
export function generateAttendanceRecordForYesterday(
  employee: EmployeeRecord,
  holidays: Holiday[]
): AttendanceRecord | null {
  const today = DateTime.now().setZone(TIMEZONE).startOf('day');
  const yesterday = today.minus({ days: 1 });
  const yesterdayStr = yesterday.toISODate();
  
  if (!yesterdayStr) return null;
  
  return generateAttendanceRecordForDate(employee, yesterdayStr, holidays);
}

/**
 * Recalculate hours and pay for an existing attendance record
 * (useful when break type, duration, or rates are updated)
 */
export function recalculateAttendanceRecord(record: AttendanceRecord): AttendanceRecord {
  // Skip calculation for non-working days
  if (record.status === "Holiday" || record.status === "Weekend" || record.status === "Absent") {
    return {
      ...record,
      scheduledWorkingHours: 0,
      totalWorkingHours: 0,
      paidWorkingHours: 0,
      overtimeHours: 0,
      breakCost: 0,
      basePay: 0,
      overtimePay: 0,
      totalDayPay: 0,
      anomalyFlag: false,
    };
  }
  
  const calculations = calculateHoursAndPay(
    record.scheduledStartTime,
    record.scheduledEndTime,
    record.actualClockInTime,
    record.actualClockOutTime,
    record.breakType,
    record.breakDuration,
    record.breakRate,
    record.hourlyRate,
    record.overtimeRate
  );
  
  return {
    ...record,
    ...calculations,
    status: calculations.anomalyFlag ? "Incomplete" : "Present",
  };
}
