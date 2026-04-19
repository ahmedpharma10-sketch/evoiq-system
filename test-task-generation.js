// Diagnostic script to test task generation logic
import { DateTime } from "luxon";

// Sample company from database
const testCompany = {
  id: "bf039db6-1696-4470-be75-37f14a9b265f",
  name: "INFINITY GLOBAL CORPORATION & INVESTMENT - IGCI LTD",
  renewalDate: "2025-12-11",  // ISO format from database
  renewalFees: null,  // No fees
  isActive: true
};

// Copy of parseRenewalDate function
function parseRenewalDate(renewalDate) {
  let dt = DateTime.fromISO(renewalDate, { zone: "Europe/London" });
  
  if (!dt.isValid) {
    dt = DateTime.fromFormat(renewalDate, "dd/MM/yyyy", { zone: "Europe/London" });
  }
  
  if (!dt.isValid) {
    console.error(`Invalid renewal date format: "${renewalDate}"`);
  }
  
  return dt;
}

// Copy of isRenewalDateValid function
function isRenewalDateValid(renewalDate) {
  const renewal = parseRenewalDate(renewalDate);
  
  if (!renewal.isValid) {
    console.warn(`Invalid renewal date, skipping: "${renewalDate}"`);
    return false;
  }
  
  const now = DateTime.now().setZone("Europe/London");
  const maxFuture = now.plus({ months: 18 });
  
  console.log(`Renewal: ${renewal.toISO()}, Max: ${maxFuture.toISO()}, Valid: ${renewal <= maxFuture}`);
  return renewal <= maxFuture;
}

// Copy of computeTaskDates function
function computeTaskDates(renewalDate) {
  const base = parseRenewalDate(renewalDate);
  
  return {
    fees: base.minus({ months: 3 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    cs: base.minus({ months: 1 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    prep: base.plus({ weeks: 3 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    submit: base.plus({ weeks: 5 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
    hmrc: base.plus({ weeks: 6 }).set({ hour: 9, minute: 0, second: 0, millisecond: 0 }),
  };
}

// Copy of shouldCreateTask function
function shouldCreateTask(date, kind) {
  const now = DateTime.now().setZone("Europe/London");
  
  if (kind === "pre") {
    const result = date > now.minus({ days: 90 });
    console.log(`  Pre-task check: ${date.toISO()} > ${now.minus({ days: 90 }).toISO()} = ${result}`);
    return result;
  }
  
  const result = date > now.minus({ days: 30 });
  console.log(`  Post-task check: ${date.toISO()} > ${now.minus({ days: 30 }).toISO()} = ${result}`);
  return result;
}

// Test the logic
console.log("=== TESTING TASK GENERATION LOGIC ===\n");
console.log(`Company: ${testCompany.name}`);
console.log(`Renewal Date: ${testCompany.renewalDate}`);
console.log(`Renewal Fees: ${testCompany.renewalFees || '(null)'}\n`);

console.log("Step 1: Check if renewal date is valid");
const isValid = isRenewalDateValid(testCompany.renewalDate);
console.log(`Result: ${isValid}\n`);

if (!isValid) {
  console.log("FAILED: Renewal date rejected!");
  process.exit(1);
}

console.log("Step 2: Compute task dates");
const dates = computeTaskDates(testCompany.renewalDate);
console.log(`Fees due: ${dates.fees.toISO()}`);
console.log(`CS due: ${dates.cs.toISO()}`);
console.log(`Prep due: ${dates.prep.toISO()}`);
console.log(`Submit due: ${dates.submit.toISO()}`);
console.log(`HMRC due: ${dates.hmrc.toISO()}\n`);

console.log("Step 3: Check which tasks should be created");
const fees = parseFloat(testCompany.renewalFees || "0");
console.log(`\n1. Fees task (requires fees > 0 = ${fees > 0}):`);
if (fees > 0 && shouldCreateTask(dates.fees, "pre")) {
  console.log("  ✓ CREATE");
} else {
  console.log("  ✗ SKIP (no fees)");
}

console.log(`\n2. CS task:`);
if (shouldCreateTask(dates.cs, "pre")) {
  console.log("  ✓ CREATE");
} else {
  console.log("  ✗ SKIP");
}

console.log(`\n3. Prep accounts task:`);
if (shouldCreateTask(dates.prep, "post")) {
  console.log("  ✓ CREATE");
} else {
  console.log("  ✗ SKIP");
}

console.log(`\n4. Submit accounts task:`);
if (shouldCreateTask(dates.submit, "post")) {
  console.log("  ✓ CREATE");
} else {
  console.log("  ✗ SKIP");
}

console.log(`\n5. HMRC task:`);
if (shouldCreateTask(dates.hmrc, "post")) {
  console.log("  ✓ CREATE");
} else {
  console.log("  ✗ SKIP");
}

console.log("\n=== TEST COMPLETE ===");
