# Database Setup Guide

This package includes the complete database schema for the Corporate Management System.

## Files Included

1. **schema.ts** - Drizzle ORM schema definition (source of truth)
2. **schema.sql** - Generated SQL schema (if available)
3. **README.md** - This file

## Quick Start

### Step 1: Prepare Your Database

You need a PostgreSQL database (version 14 or higher). Choose one:

- **Neon Serverless** (Recommended): https://neon.tech
- **Self-hosted PostgreSQL**: Local or cloud-hosted
- **Managed Services**: AWS RDS, Google Cloud SQL, Azure, etc.

### Step 2: Set Database URL

In your .env file, set the DATABASE_URL:

```
DATABASE_URL=postgresql://username:password@host:port/database
```

Example for Neon:
```
DATABASE_URL=postgresql://user:pass@ep-example-123456.region.aws.neon.tech/dbname?sslmode=require
```

### Step 3: Apply Schema

**Option A: Using Drizzle Kit (Recommended)**

```bash
npm run db:push
```

This reads schema.ts and creates all tables automatically.

If you get warnings about data loss:
```bash
npm run db:push --force
```

**Option B: Using SQL File (if included)**

If schema.sql is included, you can apply it directly:

```bash
psql $DATABASE_URL -f database/schema.sql
```

### Step 4: Verify Setup

The system will automatically create a default admin user on first run:
- Username: **Admin**
- Password: **Nogooms12**

⚠️ **IMPORTANT**: Change this password immediately after first login!

## Database Schema Overview

The database contains the following main tables:

### Core Tables
- **users** - User authentication and roles
- **session** - User session storage

### Company Management
- **companies** - UK company records with Companies House integration
- **tasks** - Compliance and operational tasks
- **approval_queue** - Multi-level approval workflows
- **audit_log** - System-wide audit trail

### Employee Management
- **employees** - Employee records and onboarding
- **employee_tasks** - Employee-specific tasks
- **attendance_reports** - Attendance tracking
- **hr_task_templates** - Recurring HR task templates

### Specialized Features
- **sl_prep_tasks** - Sponsorship License preparation tasks
- **residency_services** - Residency management
- **residency_task_templates** - Residency task templates

## Database Commands Reference

### Drizzle Kit Commands
```bash
# Push schema changes to database
npm run db:push

# Force push (if you get warnings)
npm run db:push --force

# Generate SQL migrations
npm run db:generate

# Open Drizzle Studio (visual database GUI)
npm run db:studio
```

### Manual PostgreSQL Commands
```bash
# Connect to database
psql $DATABASE_URL

# Backup database
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql

# List tables
psql $DATABASE_URL -c "\dt"
```

## Schema Updates

When updating the schema:

1. Modify shared/schema.ts
2. Run `npm run db:push` to apply changes
3. Test thoroughly in development
4. Backup production database before applying in production

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure network/firewall allows connection
- For Neon: Check project is not suspended

### Schema Push Fails
- Check PostgreSQL version (14+ required)
- Use `npm run db:push --force` for warnings
- Clear drizzle/ folder and retry
- Check database permissions

### Migration Errors
- Backup database first
- Review schema.ts for syntax errors
- Check for conflicting column/table names
- Ensure all referenced tables exist

## Production Deployment

For production:

1. **Backup first**: Always backup before schema changes
2. **Test migrations**: Run in staging environment first
3. **Use transactions**: Drizzle Kit uses transactions automatically
4. **Monitor**: Check application logs after deployment
5. **Rollback plan**: Keep backup ready

## Security Best Practices

1. Use strong DATABASE_URL credentials
2. Enable SSL/TLS for database connections
3. Restrict database access by IP if possible
4. Regular backups (automated)
5. Monitor audit logs for suspicious activity
6. Rotate database passwords periodically

## Support

For database issues:
1. Check application logs
2. Check PostgreSQL logs
3. Review Drizzle Kit documentation: https://orm.drizzle.team
4. Check Neon documentation (if using Neon): https://neon.tech/docs
