# Railway Deployment Guide for CorpManageSys

## IMPORTANT: Configure Build Command Manually

Railway may ignore the `railway.json` and use `npm run build` by default, which can cause build failures. **You must configure the build command in the Railway dashboard.**

---

## Quick Start

### 1. Create Railway Project

1. Go to [Railway](https://railway.app) and sign in
2. Click "New Project" -> "Deploy from GitHub repo"
3. Connect your GitHub account and select this repository

### 2. Add PostgreSQL Database

1. In your Railway project, click "New" -> "Database" -> "Add PostgreSQL"
2. Railway automatically creates the database and sets environment variables

### 3. Configure Build & Start Commands (CRITICAL)

**In the Railway Dashboard:**

1. Click on your service (the app, not the database)
2. Go to **Settings** tab
3. Scroll to **Build & Deploy** section
4. Set **Build Command** to:

```bash
npx vite build --config vite.config.railway.ts && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

5. Set **Start Command** to:

```bash
NODE_ENV=production node dist/index.js
```

### 4. Configure Environment Variables

Go to your service -> "Variables" tab and add:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Use `${{Postgres.DATABASE_URL}}` to reference Railway PostgreSQL |
| `SESSION_SECRET` | Yes | Generate with `openssl rand -base64 32` |
| `COMPANIES_HOUSE_API_KEY` | Optional | Your Companies House API key |

**Note:** Individual PG variables (PGHOST, PGPORT, etc.) are not needed if DATABASE_URL is set.

### 5. Deploy

Click "Deploy" or push to your connected branch. Railway will build and deploy.

### 6. Initialize Database

After first deployment, the database tables are created automatically via Drizzle ORM.

Default admin credentials:
- **Username:** Admin
- **Password:** Nogooms12

**IMPORTANT:** Change the admin password immediately after first login!

### 7. Generate Domain

1. Go to your service -> "Settings" -> "Networking"
2. Click "Generate Domain" to get a public URL
3. Or configure a custom domain

---

## Troubleshooting

### Build Error: "Could not resolve entry module client/index.html"

**Cause:** Railway is using the default `npm run build` instead of the custom build command.

**Solution:** Set the custom build command in Railway dashboard (Step 3 above):
```bash
npx vite build --config vite.config.railway.ts && npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
```

### Database Connection Errors
- Verify DATABASE_URL is correctly set using Railway's reference syntax: `${{Postgres.DATABASE_URL}}`
- Check that PostgreSQL service is running
- Ensure the database is in the same Railway project

### Application Not Starting
- Check Railway deploy logs
- Verify the `dist/` folder was created during build
- Ensure PORT is not hardcoded (Railway sets it automatically on port 5000)

### Session Issues
- Verify SESSION_SECRET is set (generate with `openssl rand -base64 32`)
- Ensure cookies are configured for production

---

## Configuration Files

| File | Purpose |
|------|---------|
| `railway.json` | Railway configuration (may be ignored by Railway) |
| `nixpacks.toml` | Nixpacks build configuration |
| `vite.config.railway.ts` | Production Vite config (use in build command) |

---

## Health Check

Railway uses `/api/health` for health checks. This endpoint returns:
```json
{
  "status": "ok",
  "timestamp": "2024-12-20T12:00:00.000Z",
  "uptime": 123.456
}
```

---

## Environment Variables Reference

```bash
# Database (use Railway reference)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Session (required - generate your own)
SESSION_SECRET=your-secure-random-string-here

# Companies House API (optional)
COMPANIES_HOUSE_API_KEY=your-api-key
```

---

## Manual Build (Alternative)

If you need to build manually:

```bash
# Install dependencies
npm ci

# Build frontend with Railway config
npx vite build --config vite.config.railway.ts

# Build server
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Run
NODE_ENV=production node dist/index.js
```

---

## Support

- Railway Docs: https://docs.railway.com
- Companies House API: https://developer.company-information.service.gov.uk/
