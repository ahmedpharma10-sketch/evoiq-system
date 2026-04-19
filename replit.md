# Corporate Management System

## Overview
A professional web application designed to manage multiple UK companies, integrating with Companies House for real-time data and automating compliance task generation. Its primary goal is to streamline corporate administration, ensure timely adherence to deadlines, and minimize manual oversight. Key features include comprehensive company and task management, Sponsorship License preparation, employee onboarding with dedicated tracking, and robust auditing capabilities. The system aims to be a cross-browser and cross-device accessible solution for corporate administration. The project has an ambition to provide a comprehensive, compliant, and efficient corporate management solution with significant market potential in the UK.

## User Preferences
I prefer simple language and explanations. I want iterative development with frequent, small updates. Please ask me before making any major architectural changes or adding new external dependencies. I value clear, concise communication and prefer that you highlight the most impactful changes in any update. Do not make changes to the `server/` directory without explicit instruction.

## System Architecture
The application is built with React and TypeScript, utilizing Tailwind CSS and shadcn/ui for a corporate aesthetic. Data is persisted in a PostgreSQL database (Neon-backed) using Drizzle ORM for type-safe database operations. User authentication uses bcrypt for secure password hashing. Luxon handles timezone-aware date calculations. State management is powered by TanStack Query, and forms use React Hook Form with Zod for validation.

**UI/UX Decisions:**
- Professional blue and white corporate aesthetic.
- Three-row responsive tab navigation for company, employee, and residency features.
- Responsive grid layouts, real-time search/filtering, confirmation dialogs, and consistent badge systems.
- Employee detail pages feature tabbed navigation for organized information.

**Technical Implementations:**
- **Authentication & Security:** PostgreSQL database authentication with bcrypt, full CRUD user management via REST API, activity tracking, and multi-level approval workflows for critical changes. Includes a default admin user and session management. Search engine exclusion is enforced.
- **Multi-Company Management:** Detailed company profiles, Companies House data integration with compliance deadline tracking, and CSV/Excel export. The Companies House Compliance card displays confirmation statement due dates, accounts due dates, and last filed dates with color-coded warning badges for upcoming/overdue deadlines. The bulk "Sync All with Companies House" feature now properly fetches and saves filing history and insolvency history for all companies.
- **Sponsorship License (SL) Management:** Dedicated section for SL preparation, COS tracking, Level 1 Users management, and master SL prep task management with CSV import/export. Tasks are fetched from the database API and displayed as columns in the SL Prep table.
- **Compliance Task Automation:** Generates 5 types of compliance tasks based on `renewal_date` with timezone awareness and idempotent generation. Task due dates automatically sync with actual Companies House filing deadlines (confirmation statement due, accounts due) and auto-update when Companies House data changes.
- **Auditing Systems:** Dedicated tabs for reviewing completed/cancelled tasks, including review workflows and pending approvals for company deletions. Includes a comprehensive audit log viewer.
- **Employee Management System:** Form builder for onboarding with conditional logic, critical date tracking, employee list with deactivation, configurable working days, and employee-specific task management.
- **Task Template Systems:** HR Task Templates (organization-wide recurring tasks) and Residency Service & Task System (comprehensive residency management with customizable task templates).
- **Attendance Report System:** Comprehensive attendance tracking per employee with generation, summary dashboard, and CSV export.
- **Admin Dashboard:** Centralized system monitoring with real-time statistics, template overviews, auditor summaries, red flag cards, Companies House sync status, system-wide CSV export, Google Drive settings, and an enhanced danger zone.
- **Automated Scheduling:** Daily scheduled tasks for Companies House data sync and compliance task generation, specifically at 6 AM UK time for all task types.
- **Core Technologies:** PostgreSQL (Neon) with Drizzle ORM, bcrypt, Luxon, React Hook Form/Zod, TanStack Query, custom conditional logic engine, and a unique key pattern for idempotent task generation.

## External Dependencies
- **PostgreSQL (Neon)**: Primary database.
- **Drizzle ORM**: Type-safe database operations.
- **bcrypt**: Secure password hashing.
- **Luxon**: Date and time calculations.
- **TanStack Query**: Data fetching, caching, and synchronization.
- **React Hook Form**: Form management.
- **Zod**: Schema validation.
- **Tailwind CSS**: Utility-first CSS styling.
- **shadcn/ui**: Pre-built UI components.
- **Companies House API**: For real-time company data integration.