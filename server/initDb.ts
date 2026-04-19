import { db } from "./db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export async function initializeDatabase() {
  console.log("[initDb] Initializing database schema...");

  // Create all tables using raw SQL (PGlite doesn't support drizzle push)
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR UNIQUE NOT NULL,
      username VARCHAR UNIQUE NOT NULL,
      password VARCHAR NOT NULL,
      password_hint TEXT,
      name VARCHAR NOT NULL,
      email VARCHAR NOT NULL,
      position VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS companies (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      number VARCHAR NOT NULL,
      address TEXT,
      incorporation_date VARCHAR,
      industry_code VARCHAR,
      director TEXT,
      psc TEXT,
      directors JSONB DEFAULT '[]',
      officers JSONB DEFAULT '[]',
      pscs JSONB DEFAULT '[]',
      previous_names JSONB DEFAULT '[]',
      charges JSONB DEFAULT '[]',
      insolvency_history JSONB DEFAULT '[]',
      filings JSONB DEFAULT '[]',
      documents JSONB DEFAULT '[]',
      internal_code VARCHAR,
      utr VARCHAR,
      government_gateway VARCHAR,
      owner_name VARCHAR,
      owner_emails JSONB DEFAULT '[]',
      owner_phones JSONB DEFAULT '[]',
      owner_email VARCHAR,
      owner_phone VARCHAR,
      companies_house_link VARCHAR,
      google_drive_link TEXT NOT NULL DEFAULT '',
      vendor_name VARCHAR,
      renewal_date VARCHAR,
      has_renewal_fees BOOLEAN DEFAULT FALSE,
      renewal_fees VARCHAR,
      auth_code VARCHAR,
      psc_link VARCHAR,
      shareholders TEXT,
      shareholders_link VARCHAR,
      director_link VARCHAR,
      is_active BOOLEAN DEFAULT TRUE,
      sl BOOLEAN DEFAULT FALSE,
      sl_license_issued BOOLEAN DEFAULT FALSE,
      sl_license_number VARCHAR,
      sl_license_issue_date VARCHAR,
      sl_paye_reference VARCHAR,
      sl_work_address TEXT,
      sl_level1_users JSONB DEFAULT '[]',
      sl_defined_cos INTEGER,
      sl_undefined_cos INTEGER,
      company_status VARCHAR,
      company_type VARCHAR,
      jurisdiction VARCHAR,
      has_charges BOOLEAN,
      has_insolvency BOOLEAN,
      confirmation_statement_due VARCHAR,
      accounts_due VARCHAR,
      last_accounts_date VARCHAR,
      confirmation_statement_last_made VARCHAR,
      last_sync_date VARCHAR,
      sync_status VARCHAR DEFAULT 'never',
      activity_log JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_at TIMESTAMP NOT NULL,
      status VARCHAR DEFAULT 'open' NOT NULL,
      meta JSONB DEFAULT '{}',
      unique_key VARCHAR NOT NULL,
      renewal_date VARCHAR NOT NULL,
      reviewed BOOLEAN DEFAULT FALSE,
      reviewed_at TIMESTAMP,
      reviewer_note TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS task_audits (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id VARCHAR NOT NULL,
      task_title TEXT NOT NULL,
      company_id VARCHAR NOT NULL,
      company_name TEXT NOT NULL,
      from_status VARCHAR NOT NULL,
      to_status VARCHAR NOT NULL,
      reason TEXT,
      performed_by VARCHAR DEFAULT 'System' NOT NULL,
      meta JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_activity_logs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL,
      company_name TEXT NOT NULL,
      action VARCHAR NOT NULL,
      reason TEXT NOT NULL,
      performed_by VARCHAR DEFAULT 'System' NOT NULL,
      meta JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sl_prep_tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS company_sl_prep_task_statuses (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      task_id VARCHAR NOT NULL REFERENCES sl_prep_tasks(id) ON DELETE CASCADE,
      is_completed BOOLEAN DEFAULT FALSE NOT NULL,
      description TEXT,
      completion_note TEXT,
      completed_at TIMESTAMP
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS hr_task_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      recurrence VARCHAR NOT NULL,
      due_date_offset_days INTEGER DEFAULT 7 NOT NULL,
      priority VARCHAR DEFAULT 'medium' NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS leaver_task_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      due_days INTEGER DEFAULT 7 NOT NULL,
      priority VARCHAR DEFAULT 'medium' NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS residency_task_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      recurrence VARCHAR NOT NULL,
      start_date_mode VARCHAR NOT NULL,
      start_date VARCHAR,
      offset_days INTEGER,
      priority VARCHAR DEFAULT 'medium' NOT NULL,
      applicant_type VARCHAR DEFAULT 'main_only' NOT NULL,
      "order" INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS employee_form_templates (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      version INTEGER DEFAULT 1 NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      steps JSONB NOT NULL,
      fields JSONB NOT NULL,
      global_rules JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      template_id VARCHAR NOT NULL,
      template_version INTEGER NOT NULL,
      first_name VARCHAR NOT NULL,
      middle_names VARCHAR DEFAULT '',
      last_name VARCHAR NOT NULL,
      date_of_birth VARCHAR,
      personal_mobile VARCHAR,
      personal_email VARCHAR,
      uk_address TEXT,
      uk_address_provide_later VARCHAR,
      overseas_address TEXT,
      uk_bank_address TEXT,
      uk_bank_address_provide_later VARCHAR,
      emergency_contact_name VARCHAR,
      emergency_contact_relationship VARCHAR,
      emergency_contact_phone VARCHAR,
      company_id VARCHAR REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT,
      department VARCHAR,
      work_location TEXT,
      work_location_source VARCHAR,
      line_manager VARCHAR,
      job_title VARCHAR,
      job_description TEXT,
      contract_type VARCHAR,
      start_date VARCHAR,
      end_date VARCHAR,
      working_days JSONB DEFAULT '["monday","tuesday","wednesday","thursday","friday"]',
      weekly_hours INTEGER,
      daily_working_hours INTEGER,
      starting_working_time VARCHAR DEFAULT '09:00',
      ending_working_time VARCHAR,
      break_minutes INTEGER DEFAULT 60,
      salary INTEGER,
      vacation_days INTEGER,
      hourly_rate INTEGER,
      overtime_rate INTEGER,
      paye_reference VARCHAR,
      national_insurance VARCHAR,
      national_insurance_provide_later VARCHAR,
      google_drive_link TEXT DEFAULT '',
      nationality VARCHAR,
      immigration_status VARCHAR,
      is_sponsored BOOLEAN,
      passport_number VARCHAR,
      passport_expiry VARCHAR,
      brp_share_code VARCHAR,
      visa_type VARCHAR,
      cos_number VARCHAR,
      sponsor_license_number VARCHAR,
      visa_issue_date VARCHAR,
      visa_expiry_date VARCHAR,
      rtw_basis VARCHAR,
      rtw_check_date VARCHAR,
      rtw_evidence_type VARCHAR,
      rtw_expiry_date_mode VARCHAR,
      rtw_expiry_date VARCHAR,
      rtw_expiry_indefinite BOOLEAN DEFAULT FALSE,
      rtw_share_code VARCHAR,
      doc_passport_copy BOOLEAN DEFAULT FALSE,
      doc_graduation_cert_copy BOOLEAN DEFAULT FALSE,
      doc_proof_of_address_copy BOOLEAN DEFAULT FALSE,
      doc_rtw_copy BOOLEAN DEFAULT FALSE,
      doc_cos_copy BOOLEAN DEFAULT FALSE,
      doc_visa_copy BOOLEAN DEFAULT FALSE,
      probation_period INTEGER DEFAULT 3,
      probation_end_date VARCHAR,
      status VARCHAR DEFAULT 'onboarding' NOT NULL,
      is_draft BOOLEAN DEFAULT FALSE NOT NULL,
      leaver_date VARCHAR,
      ukvi_reporting_notes TEXT,
      is_residency_service BOOLEAN DEFAULT FALSE,
      residency_status VARCHAR,
      residency_log JSONB DEFAULT '[]',
      documents JSONB DEFAULT '[]',
      generated_task_ids JSONB DEFAULT '[]',
      form_data JSONB DEFAULT '{}',
      activity_log JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS dependants (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_name TEXT NOT NULL,
      first_name VARCHAR NOT NULL,
      middle_name VARCHAR DEFAULT '',
      last_name VARCHAR NOT NULL,
      date_of_birth VARCHAR NOT NULL,
      relationship VARCHAR NOT NULL,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pending_dependant_requests (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL,
      employee_name TEXT NOT NULL,
      action VARCHAR NOT NULL,
      requested_by VARCHAR NOT NULL,
      requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
      status VARCHAR DEFAULT 'pending' NOT NULL,
      reviewed_by VARCHAR,
      reviewed_at TIMESTAMP,
      review_note TEXT,
      reason TEXT NOT NULL,
      dependant_data JSONB NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pending_employee_status_changes (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL,
      employee_name TEXT NOT NULL,
      change_type VARCHAR NOT NULL,
      current_value VARCHAR NOT NULL,
      new_value VARCHAR NOT NULL,
      reason TEXT NOT NULL,
      requested_by VARCHAR NOT NULL,
      requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
      status VARCHAR DEFAULT 'pending' NOT NULL,
      reviewed_by VARCHAR,
      reviewed_at TIMESTAMP,
      review_note TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pending_company_sl_changes (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL,
      company_name TEXT NOT NULL,
      field VARCHAR NOT NULL,
      current_value JSONB,
      new_value JSONB,
      reason TEXT NOT NULL,
      requested_by VARCHAR NOT NULL,
      requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
      status VARCHAR DEFAULT 'pending' NOT NULL,
      reviewed_by VARCHAR,
      reviewed_at TIMESTAMP,
      review_note TEXT
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS employee_tasks (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      employee_name TEXT NOT NULL,
      company_id VARCHAR NOT NULL,
      company_name TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      task_type VARCHAR NOT NULL,
      due_at TIMESTAMP NOT NULL,
      status VARCHAR DEFAULT 'open' NOT NULL,
      priority VARCHAR DEFAULT 'medium' NOT NULL,
      completion_note TEXT,
      cancel_reason TEXT,
      unique_key VARCHAR,
      meta JSONB DEFAULT '{}',
      reviewed BOOLEAN DEFAULT FALSE,
      reviewer_note TEXT,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS employee_activity_logs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL,
      employee_name TEXT NOT NULL,
      action VARCHAR NOT NULL,
      details TEXT,
      field_changed VARCHAR,
      old_value TEXT,
      new_value TEXT,
      performed_by VARCHAR DEFAULT 'System' NOT NULL,
      meta JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_activity_logs (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      action VARCHAR NOT NULL,
      target_username VARCHAR NOT NULL,
      target_name VARCHAR NOT NULL,
      details TEXT,
      reason TEXT,
      performed_by VARCHAR DEFAULT 'System' NOT NULL,
      meta JSONB DEFAULT '{}',
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS holidays (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      date VARCHAR NOT NULL,
      day VARCHAR NOT NULL,
      holiday_name VARCHAR NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id VARCHAR NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date VARCHAR NOT NULL,
      day VARCHAR NOT NULL,
      status VARCHAR NOT NULL,
      scheduled_start_time VARCHAR,
      actual_clock_in_time VARCHAR,
      scheduled_end_time VARCHAR,
      actual_clock_out_time VARCHAR,
      break_type VARCHAR DEFAULT 'Unpaid' NOT NULL,
      break_duration VARCHAR,
      break_rate INTEGER,
      hourly_rate INTEGER,
      overtime_rate INTEGER,
      scheduled_working_hours INTEGER,
      total_working_hours INTEGER,
      paid_working_hours INTEGER,
      overtime_hours INTEGER,
      break_cost INTEGER,
      base_pay INTEGER,
      overtime_pay INTEGER,
      total_day_pay INTEGER,
      notes TEXT,
      anomaly_flag BOOLEAN DEFAULT FALSE
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS system_settings (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      key VARCHAR UNIQUE NOT NULL,
      value TEXT,
      updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS deletion_requests (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id VARCHAR NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      reason TEXT NOT NULL,
      requested_by VARCHAR NOT NULL REFERENCES users(id),
      requested_by_name TEXT NOT NULL,
      status VARCHAR NOT NULL DEFAULT 'pending',
      reviewed_by VARCHAR REFERENCES users(id),
      reviewed_by_name TEXT,
      reviewed_at TIMESTAMP,
      review_notes TEXT,
      requested_at TIMESTAMP DEFAULT NOW() NOT NULL
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS general_log (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      log_ref_id SERIAL,
      timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
      action VARCHAR NOT NULL,
      category VARCHAR NOT NULL,
      target_id VARCHAR,
      target_name TEXT,
      performed_by VARCHAR NOT NULL,
      performed_by_name TEXT NOT NULL,
      details TEXT,
      metadata JSONB DEFAULT '{}'
    )
  `);

  // Add log_ref_id column if it doesn't exist (migration for existing databases)
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'general_log' AND column_name = 'log_ref_id') THEN
        CREATE SEQUENCE IF NOT EXISTS general_log_ref_seq;
        ALTER TABLE general_log ADD COLUMN log_ref_id INTEGER DEFAULT nextval('general_log_ref_seq');
      END IF;
    END $$
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sl_training_modules (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR NOT NULL,
      learning_materials TEXT,
      created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      created_by VARCHAR,
      is_active BOOLEAN DEFAULT TRUE
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sl_training_questions (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      module_id VARCHAR NOT NULL REFERENCES sl_training_modules(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      choice_1 TEXT NOT NULL,
      choice_2 TEXT NOT NULL,
      choice_3 TEXT NOT NULL,
      choice_4 TEXT NOT NULL,
      correct_answer INTEGER NOT NULL,
      order_index INTEGER DEFAULT 0
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS sl_training_scores (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      module_id VARCHAR NOT NULL REFERENCES sl_training_modules(id) ON DELETE CASCADE,
      score INTEGER NOT NULL,
      total_questions INTEGER NOT NULL,
      correct_answers INTEGER NOT NULL,
      completed_at TIMESTAMP DEFAULT NOW() NOT NULL,
      last_answers JSONB DEFAULT '[]'
    )
  `);

  // Session table for connect-pg-simple
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "user_sessions" (
      "sid" VARCHAR NOT NULL COLLATE "default",
      "sess" JSON NOT NULL,
      "expire" TIMESTAMP(6) NOT NULL,
      PRIMARY KEY ("sid")
    )
  `);

  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "user_sessions" ("expire")
  `);

  // Migration: Add new SL company fields if they don't exist
  await db.execute(sql`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'sl_phone') THEN
        ALTER TABLE companies ADD COLUMN sl_phone VARCHAR;
        ALTER TABLE companies ADD COLUMN sl_email VARCHAR;
        ALTER TABLE companies ADD COLUMN sl_website VARCHAR;
        ALTER TABLE companies ADD COLUMN sl_has_debit_card BOOLEAN DEFAULT FALSE;
        ALTER TABLE companies ADD COLUMN sl_debit_card_activated BOOLEAN DEFAULT FALSE;
        ALTER TABLE companies ADD COLUMN sl_debit_card_expiry VARCHAR;
        ALTER TABLE companies ADD COLUMN sl_has_direct_debit_hmrc BOOLEAN DEFAULT FALSE;
        ALTER TABLE companies ADD COLUMN sl_has_direct_debit_nest BOOLEAN DEFAULT FALSE;
        ALTER TABLE companies ADD COLUMN sl_unassigned_defined_cos INTEGER;
        ALTER TABLE companies ADD COLUMN sl_unassigned_undefined_cos INTEGER;
      END IF;
    END $$
  `);

  console.log("[initDb] All tables created successfully");

  // Seed admin user if no users exist
  const existingUsers = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
  const userCount = Number(existingUsers.rows?.[0]?.count || existingUsers[0]?.count || 0);

  if (userCount === 0) {
    console.log("[initDb] Seeding default admin user...");
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await db.execute(sql`
      INSERT INTO users (id, user_id, username, password, password_hint, name, email, position)
      VALUES (
        gen_random_uuid(),
        'USR-001',
        'admin',
        ${hashedPassword},
        'Default admin password',
        'System Administrator',
        'admin@company.com',
        'admin'
      )
    `);
    console.log("[initDb] Admin user created (username: admin, password: admin123)");
  }

  // Seed default HR task templates if none exist
  const existingHRTemplates = await db.execute(sql`SELECT COUNT(*) as count FROM hr_task_templates`);
  const hrTemplateCount = Number(existingHRTemplates.rows?.[0]?.count || existingHRTemplates[0]?.count || 0);

  if (hrTemplateCount === 0) {
    console.log("[initDb] Seeding default HR task templates...");
    const hrTemplates = [
      { name: "Setup Recurring Salary Payment", description: "Set up recurring salary payment for the employee in the payroll system", recurrence: "one_time", due_date_offset_days: 7, priority: "high", order: 1 },
      { name: "Keep Copy of Visa", description: "Obtain and file a copy of the employee's visa document", recurrence: "one_time", due_date_offset_days: 3, priority: "high", order: 2 },
      { name: "First Month Pension Enrollment", description: "Enroll the employee in the company pension scheme during their first month", recurrence: "one_time", due_date_offset_days: 30, priority: "high", order: 3 },
      { name: "Record Tax Code", description: "Record and verify the employee's tax code from HMRC", recurrence: "one_time", due_date_offset_days: 14, priority: "medium", order: 4 },
      { name: "Issue Payslip", description: "Issue monthly payslip to the employee", recurrence: "monthly", due_date_offset_days: 28, priority: "medium", order: 5 },
      { name: "Keep Payslip Record", description: "File and maintain a copy of the employee's payslip", recurrence: "monthly", due_date_offset_days: 28, priority: "medium", order: 6 },
      { name: "Quarterly RTI Submission", description: "Submit Real Time Information (RTI) report to HMRC for this employee", recurrence: "monthly", due_date_offset_days: 90, priority: "high", order: 7 },
      { name: "Quarterly Attendance vs COS Check", description: "Verify quarterly that the attendance sheet matches the Certificate of Sponsorship requirements", recurrence: "monthly", due_date_offset_days: 90, priority: "high", order: 8 },
      { name: "First Month Pension Proof", description: "Obtain proof of pension enrollment from the first month", recurrence: "one_time", due_date_offset_days: 35, priority: "high", order: 9 },
      { name: "Tax Code Revised Check", description: "Check if tax code has been revised by HMRC and update records", recurrence: "annual", due_date_offset_days: 365, priority: "medium", order: 10 },
      { name: "P60 End of Year", description: "Issue P60 to the employee by the end of the tax year", recurrence: "annual", due_date_offset_days: 365, priority: "high", order: 11 },
      { name: "Pension Re-enrollment (3 Year)", description: "Re-enroll the employee in pension scheme (required every 3 years)", recurrence: "annual", due_date_offset_days: 1095, priority: "high", order: 12 },
      { name: "Pension Opt-Out Proof (3 Year)", description: "If employee opted out of pension, keep proof of opt-out (renew every 3 years)", recurrence: "annual", due_date_offset_days: 1095, priority: "medium", order: 13 },
      { name: "Keep Proof Employee Wished to Leave Pension", description: "Maintain documentation proving employee voluntarily chose to leave the pension scheme", recurrence: "one_time", due_date_offset_days: 30, priority: "medium", order: 14 },
      { name: "Screenshot Migrant Activity Report", description: "Take screenshot of reporting migrant activity stop in the migrant file for records", recurrence: "one_time", due_date_offset_days: 7, priority: "medium", order: 15 },
      { name: "First Manual COS Review", description: "Perform first manual review of Certificate of Sponsorship against the system records", recurrence: "one_time", due_date_offset_days: 14, priority: "high", order: 16 },
      { name: "Second Manual COS Review", description: "Perform second manual review of Certificate of Sponsorship against the system records", recurrence: "one_time", due_date_offset_days: 30, priority: "high", order: 17 },
      { name: "Last Month Remove Salary Recurrence", description: "Task at the last month of contract to remove recurring salary payment", recurrence: "one_time", due_date_offset_days: 0, priority: "urgent", order: 18 },
    ];

    for (const t of hrTemplates) {
      await db.execute(sql`
        INSERT INTO hr_task_templates (id, name, description, recurrence, due_date_offset_days, priority, "order")
        VALUES (gen_random_uuid(), ${t.name}, ${t.description}, ${t.recurrence}, ${t.due_date_offset_days}, ${t.priority}, ${t.order})
      `);
    }
    console.log(`[initDb] ${hrTemplates.length} HR task templates seeded`);
  }

  // Seed default Leaver task templates if none exist
  const existingLeaverTemplates = await db.execute(sql`SELECT COUNT(*) as count FROM leaver_task_templates`);
  const leaverTemplateCount = Number(existingLeaverTemplates.rows?.[0]?.count || existingLeaverTemplates[0]?.count || 0);

  if (leaverTemplateCount === 0) {
    console.log("[initDb] Seeding default Leaver task templates...");
    const leaverTemplates = [
      { name: "Stop Salary / Recurring Payments", description: "Immediately stop all recurring salary payments and payroll deductions for the departing employee", due_days: 1, priority: "urgent", order: 1 },
      { name: "Upload Resignation/Firing Letter", description: "Upload and file the resignation letter or termination notice in the employee's records", due_days: 2, priority: "high", order: 2 },
      { name: "Inform Home Office (COS Holder - 10 Day Deadline)", description: "URGENT: If the employee holds a Certificate of Sponsorship, notify the Home Office within 10 days of their departure. Failure to do so may affect your sponsor licence.", due_days: 10, priority: "urgent", order: 3 },
      { name: "Report to UKVI (Sponsored Employee)", description: "Report the sponsored employee's departure to UK Visas & Immigration as required by sponsor licence obligations", due_days: 10, priority: "urgent", order: 4 },
      { name: "Inform Accountant", description: "Notify the company accountant about the employee's departure for payroll and tax record adjustments", due_days: 3, priority: "high", order: 5 },
      { name: "Stop Payslip Issuance", description: "Ensure no further payslips are generated or issued for the departing employee", due_days: 1, priority: "high", order: 6 },
      { name: "Issue P45", description: "Generate and issue a P45 form to the departing employee and submit to HMRC", due_days: 14, priority: "high", order: 7 },
      { name: "Process Resignation / Handle Exit", description: "Complete all resignation/termination processing including final pay calculations, holiday pay settlements, and exit paperwork", due_days: 7, priority: "high", order: 8 },
    ];

    for (const t of leaverTemplates) {
      await db.execute(sql`
        INSERT INTO leaver_task_templates (id, name, description, due_days, priority, "order")
        VALUES (gen_random_uuid(), ${t.name}, ${t.description}, ${t.due_days}, ${t.priority}, ${t.order})
      `);
    }
    console.log(`[initDb] ${leaverTemplates.length} Leaver task templates seeded`);
  }

  // Seed default Residency task templates if none exist
  const existingResidencyTemplates = await db.execute(sql`SELECT COUNT(*) as count FROM residency_task_templates`);
  const residencyTemplateCount = Number(existingResidencyTemplates.rows?.[0]?.count || existingResidencyTemplates[0]?.count || 0);

  if (residencyTemplateCount === 0) {
    console.log("[initDb] Seeding default Residency task templates...");
    const residencyTemplates = [
      { name: "Deactivate Employee After Citizenship", description: "Remove or deactivate the employee from sponsored status after they have obtained British citizenship", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 0, priority: "high", applicant_type: "main_only", order: 1 },
      { name: "Add Dependants to Profile", description: "Add all dependants (family members) to the employee's residency profile for visa and immigration tracking", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 7, priority: "medium", applicant_type: "main_only", order: 2 },
      { name: "Track Family Members Over 13 Years", description: "Track employee family members over 13 years of age for immigration compliance purposes", recurrence: "annually", start_date_mode: "offset_days", offset_days: 365, priority: "medium", applicant_type: "main_and_dependants", order: 3 },
      { name: "Sign UK Passport with Black Ballpoint Pen", description: "Reminder: UK passport must be signed using a black ballpoint pen only. This is a requirement for passport validity.", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 0, priority: "low", applicant_type: "main_and_dependants", order: 4 },
      { name: "Inform Original Country of New Citizenship", description: "Inform the authority of the employee's original country about their new British citizenship as required", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 30, priority: "medium", applicant_type: "main_only", order: 5 },
      { name: "Passport Interview Preparation", description: "Prepare for the passport interview including Q&A practice and checklist review. Refer to the Google Drive link for interview preparation materials.", recurrence: "one_time", start_date_mode: "offset_days", offset_days: 14, priority: "high", applicant_type: "main_and_dependants", order: 6 },
    ];

    for (const t of residencyTemplates) {
      await db.execute(sql`
        INSERT INTO residency_task_templates (id, name, description, recurrence, start_date_mode, offset_days, priority, applicant_type, "order")
        VALUES (gen_random_uuid(), ${t.name}, ${t.description}, ${t.recurrence}, ${t.start_date_mode}, ${t.offset_days}, ${t.priority}, ${t.applicant_type}, ${t.order})
      `);
    }
    console.log(`[initDb] ${residencyTemplates.length} Residency task templates seeded`);
  }

  // Seed default SL Prep tasks if none exist
  const existingSLPrepTasks = await db.execute(sql`SELECT COUNT(*) as count FROM sl_prep_tasks`);
  const slPrepTaskCount = Number(existingSLPrepTasks.rows?.[0]?.count || existingSLPrepTasks[0]?.count || 0);

  if (slPrepTaskCount === 0) {
    console.log("[initDb] Seeding default SL Prep tasks...");
    const slPrepTasks = [
      { name: "Review Company Working Address", order: 1 },
      { name: "Review A Rating Status", order: 2 },
      { name: "Update SL with Unassigned COS Numbers", order: 3 },
      { name: "Connect Direct Debit with HMRC", order: 4 },
      { name: "Verify Monthly HMRC Direct Debit Active", order: 5 },
      { name: "Monthly HMRC Payment", order: 6 },
      { name: "Quarterly Address Verification on License", order: 7 },
      { name: "Monthly Inspection Training", order: 8 },
      { name: "Check Company Name on Door", order: 9 },
      { name: "Verify Debit Card Status and Expiry", order: 10 },
      { name: "Direct Debit Setup for HMRC", order: 11 },
      { name: "Direct Debit Setup for Nest Pension", order: 12 },
    ];

    for (const t of slPrepTasks) {
      await db.execute(sql`
        INSERT INTO sl_prep_tasks (id, name, "order")
        VALUES (gen_random_uuid(), ${t.name}, ${t.order})
      `);
    }
    console.log(`[initDb] ${slPrepTasks.length} SL Prep tasks seeded`);
  }

  console.log("[initDb] Database initialization complete");
}
