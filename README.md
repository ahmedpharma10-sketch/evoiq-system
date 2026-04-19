# Corporate Management System - Railway Deployment Package

## Quick Start (Railway)

### 1. Create Railway Project
1. Go to [Railway](https://railway.app) and sign in
2. Click "New Project" -> "Deploy from GitHub repo" OR "Empty Project"
3. If using GitHub, connect and select your repository

### 2. Add PostgreSQL Database
1. In your Railway project, click "New" -> "Database" -> "Add PostgreSQL"
2. Wait for the database to provision

### 3. Configure Environment Variables
Go to your service -> "Variables" tab and add:

| Variable | Value |
|----------|-------|
| DATABASE_URL | ${{Postgres.DATABASE_URL}} |
| SESSION_SECRET | Generate with: openssl rand -base64 32 |
| COMPANIES_HOUSE_API_KEY | Your API key (optional) |

### 4. Deploy
Railway will automatically:
- Install dependencies (npm ci)
- Build the application (npm run build)
- Start the server (npm start)

### 5. Access Your App
1. Go to "Settings" -> "Networking"
2. Click "Generate Domain"
3. Your app is live!

## Default Login
- **Username:** Admin
- **Password:** Nogooms12

**IMPORTANT: Change this password immediately after first login!**

---

## Manual Deployment (VPS/Cloud)

    # Clone/upload the package
    cd corpmanagesys

    # Install dependencies
    npm ci

    # Configure environment
    cp .env.example .env
    # Edit .env with your values

    # Setup database
    npm run db:push

    # Build for production
    npm run build

    # Start server
    npm start

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:push` | Push schema to database |
| `npm run db:generate` | Generate migrations |
| `npm run db:studio` | Open Drizzle Studio |

---

## System Requirements

- **Node.js:** 20.x or higher
- **npm:** 10.x or higher
- **PostgreSQL:** 14 or higher

---

## Features

- Multi-company UK corporate management
- Companies House API integration
- Employee onboarding & management
- Sponsorship License workflows
- Compliance task automation
- Audit logging & approvals
- SL Training system

---

## Health Check

The application exposes `/api/health` for monitoring:

```json
{
  "status": "ok",
  "timestamp": "2024-12-20T12:00:00.000Z",
  "uptime": 123.456
}
```

---

## Troubleshooting

### Database Connection Failed
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure SSL is enabled for cloud databases

### Build Fails
- Check Node.js version (20+ required)
- Run `npm ci` to reinstall dependencies
- Check for TypeScript errors

### Session Issues
- Ensure SESSION_SECRET is set
- Must be a strong random string

---

## Support

- Railway Docs: https://docs.railway.com
- Companies House API: https://developer.company-information.service.gov.uk/
