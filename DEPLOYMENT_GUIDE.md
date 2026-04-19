# Corporate Management System - Deployment Guide

## Technology Stack

### Frontend Technologies
- **React 18.3** - Modern UI library with hooks and concurrent features
- **TypeScript 5.3** - Type-safe JavaScript for better developer experience
- **Vite 5.4** - Fast build tool and development server
- **Wouter 3.3** - Lightweight client-side routing
- **TanStack Query 5.59** - Powerful data synchronization and caching
- **React Hook Form 7.53** - Performant form validation
- **Zod 3.23** - TypeScript-first schema validation

### UI Components & Styling
- **shadcn/ui** - High-quality, accessible component library
- **Radix UI** - Unstyled, accessible UI primitives
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Framer Motion 11.11** - Smooth animations
- **Recharts 2.13** - Composable charting library

### Backend Technologies
- **Node.js 20+** - JavaScript runtime environment
- **Express 4.21** - Minimalist web framework
- **TypeScript** - Type-safe server-side code
- **tsx** - TypeScript execution for development

### Database & ORM
- **PostgreSQL 14+** - Powerful relational database (Neon-hosted)
- **Drizzle ORM 0.36** - TypeScript ORM with SQL-like syntax
- **Drizzle Kit 0.28** - Database migrations and schema management
- **@neondatabase/serverless** - Serverless Postgres driver

### Authentication & Security
- **Passport.js 0.7** - Authentication middleware
- **Passport Local** - Username/password authentication strategy
- **bcrypt 5.1** - Password hashing (10 rounds)
- **express-session 1.18** - Session management
- **connect-pg-simple 10.0** - PostgreSQL session store

### Data Processing & Export
- **XLSX 0.18** - Excel file generation
- **jsPDF 2.5** - PDF generation
- **html2canvas 1.4** - HTML to canvas conversion
- **Luxon 3.5** - DateTime library for timezone handling
- **date-fns 4.1** - Modern date utility library

### External API Integration
- **Companies House API** - UK company data integration
- **googleapis** - Google Drive integration (optional)

## System Architecture

### Application Structure
```
corporate-management-system/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components (routes)
│   │   ├── lib/           # Utilities and helpers
│   │   └── hooks/         # Custom React hooks
├── server/                # Backend Express application
│   ├── index.ts           # Server entry point
│   ├── routes.ts          # API routes
│   ├── storage.ts         # Database interface
│   └── auth.ts            # Authentication logic
├── shared/                # Shared code between client/server
│   └── schema.ts          # Database schema (Drizzle)
└── db/                    # Database migrations
```

### Database Schema
The system uses **PostgreSQL database** with Drizzle ORM for all data persistence. Key tables include:
- **users** - User authentication and roles
- **companies** - UK company records with Companies House integration
- **employees** - Employee management and onboarding with custom forms
- **tasks** - Compliance and operational tasks with timezone-aware deadlines
- **hr_task_templates** - Recurring HR task templates
- **residency_services** - Residency management
- **residency_task_templates** - Residency task templates
- **attendance_reports** - Employee attendance tracking
- **sl_prep_tasks** - Sponsorship License preparation tasks
- **audit_log** - System-wide audit trail
- **approval_queue** - Multi-level approval workflows
- **session** - User session storage

---

## Prerequisites

### System Requirements
- **Node.js** - Version 20.x or higher
- **PostgreSQL** - Version 14.x or higher (Neon Serverless or self-hosted)
- **npm** - Version 10.x or higher
- **Linux/Mac/Windows** - Compatible with all platforms

### Required Services
- **PostgreSQL Database** - Either:
  - Neon Serverless (recommended): https://neon.tech
  - Self-hosted PostgreSQL 14+
  - Managed PostgreSQL (AWS RDS, Azure, Google Cloud SQL, etc.)
- **Companies House API Key** (optional): https://developer.company-information.service.gov.uk/

### Pre-Deployment Checklist
- [ ] PostgreSQL database provisioned
- [ ] Database connection string (DATABASE_URL)
- [ ] Companies House API key obtained (optional but recommended)
- [ ] Deployment package downloaded
- [ ] Domain name (for production deployment)
- [ ] SSL certificate (for production deployment)

---

## Installation Steps

### 1. Extract Deployment Package
```bash
unzip deployment-package.zip
cd corporate-management-system
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env` file in the project root (use `.env.example` as a template):

```bash
# Database (Required)
DATABASE_URL=postgresql://user:password@host:5432/database

# Session Security (Required - Generate with: openssl rand -base64 32)
SESSION_SECRET=your-random-32-character-secret

# Companies House API (Optional - for company data sync)
COMPANIES_HOUSE_API_KEY=your-api-key-here

# Server Configuration
PORT=5000
NODE_ENV=production
```

### 4. Database Setup
```bash
# Push schema to database (creates all tables)
npm run db:push

# If you get warnings about data loss:
npm run db:push --force
```

The system will automatically create a default admin user:
- **Username:** Admin
- **Password:** Nogooms12 (change immediately after first login!)

### 5. Start the Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
# Build frontend
npm run build

# Start server
npm start
```

Application will be available at `http://localhost:5000`

---

## Production Deployment (VPS/Cloud)

### Why VPS?
- ✅ Full Companies House API integration
- ✅ Better performance and control
- ✅ Custom domain + SSL certificates
- ✅ Environment variable support

### Step 1: Initial VPS Setup

#### 1.1 Connect to Your VPS

```bash
ssh root@your-vps-ip
```

#### 1.2 Update System & Install Dependencies

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js v20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git

# Install Certbot (for SSL)
sudo apt install -y python3-certbot-nginx

# Configure firewall
sudo ufw enable
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw allow 22
sudo ufw status
```

### Step 2: Deploy Application

#### 2.1 Create Application Directory

```bash
# Create app directory
sudo mkdir -p /var/www/corpmanagesys
cd /var/www/corpmanagesys

# Set ownership
sudo chown -R $USER:$USER /var/www/corpmanagesys
```

#### 2.2 Upload Application Files

**Option 2.2a: Using Git (if you have a repository)**
```bash
cd /var/www/corpmanagesys
git clone https://your-repo-url.git .
```

**Option 2.2b: Using SCP/SFTP**
From your local machine, upload the entire project:
```bash
# From your local machine (not VPS)
scp -r /path/to/corpmanagesys/* root@your-vps-ip:/var/www/corpmanagesys/
```

**Option 2.2c: Using File Manager**
1. Zip your entire project locally
2. Upload via Hostinger File Manager to `/var/www/corpmanagesys`
3. Extract: `cd /var/www/corpmanagesys && unzip your-zip-file.zip`

#### 2.3 Install Dependencies & Build

```bash
cd /var/www/corpmanagesys

# Install dependencies
npm install

# Build the application
npm run build
```

#### 2.4 Configure Environment Variables

Create a `.env` file in the project root:

```bash
nano .env
```

Add the following content:

```env
NODE_ENV=production
PORT=5000
COMPANIES_HOUSE_API_KEY=your-actual-companies-house-api-key
SESSION_SECRET=your-random-secret-string-min-32-chars
```

**To generate a secure SESSION_SECRET:**
```bash
openssl rand -base64 32
```

Save and exit (Ctrl+X, then Y, then Enter)

#### 2.5 Configure PM2

Edit the `ecosystem.config.js` file:

```bash
nano ecosystem.config.js
```

Update the configuration:

```javascript
module.exports = {
  apps: [
    {
      name: 'corpmanagesys',
      script: 'npm',
      args: 'start',
      cwd: '/var/www/corpmanagesys',
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
```

**Note:** Environment variables are read from `.env` file, so you don't need to duplicate them in ecosystem.config.js

#### 2.6 Start Application with PM2

```bash
# Start the app
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 to start on system boot
pm2 startup
# Follow the command it gives you (usually starts with 'sudo env...')

# Check status
pm2 status
pm2 logs corpmanagesys
```

### Step 3: Configure Nginx

#### 3.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/corpmanagesys
```

Add this configuration (replace `yourdomain.com` with your actual domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Increase max upload size
    client_max_body_size 10M;

    # Logging
    access_log /var/log/nginx/corpmanagesys_access.log;
    error_log /var/log/nginx/corpmanagesys_error.log;
}
```

#### 3.2 Enable Site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/corpmanagesys /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 4: Configure SSL Certificate

```bash
# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Follow the prompts:
# - Enter your email
# - Agree to Terms of Service
# - Choose whether to redirect HTTP to HTTPS (recommended: Yes)

# Test auto-renewal
sudo certbot renew --dry-run

# Enable auto-renewal timer
sudo systemctl enable certbot.timer
```

### Step 5: Verify Deployment

1. Visit `https://yourdomain.com`
2. You should see the login page
3. Test login with default admin credentials:
   - Username: `Admin`
   - Password: `Nogooms12`

### Step 6: Update & Redeploy

When you need to update the application:

```bash
cd /var/www/corpmanagesys

# Pull latest changes (if using Git)
git pull origin main

# Or upload new files via SCP/SFTP

# Install any new dependencies
npm install

# Rebuild
npm run build

# Reload PM2
pm2 reload corpmanagesys

# Check logs
pm2 logs corpmanagesys
```

---

## 📦 Option B: Static Hosting Deployment

### ⚠️ Limitations of Static Hosting:
- ❌ **NO Companies House API integration** (requires backend server)
- ❌ Cannot use environment variables
- ✅ All other features work (localStorage-based data management)
- ✅ Cheaper hosting option

### Step 1: Build Static Files Locally

On your local machine or Replit environment:

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

This creates a `dist` folder with all static files.

### Step 2: Add .htaccess File

The `.htaccess` file is already included in the project root. Copy it to the `dist` folder:

```bash
cp .htaccess dist/.htaccess
```

### Step 3: Upload to Hostinger

#### Option 3.1: File Manager Upload

1. Log into Hostinger control panel
2. Go to **File Manager**
3. Navigate to `public_html` folder
4. **Delete all existing files** in `public_html` (if any)
5. Upload **all contents** from your `dist` folder (not the folder itself)
6. Your structure should be:
   ```
   public_html/
   ├── index.html
   ├── assets/
   │   ├── index-xxxxx.js
   │   ├── index-xxxxx.css
   │   └── ...
   ├── .htaccess
   └── robots.txt
   ```

#### Option 3.2: Import Website (Faster)

1. Zip the contents of your `dist` folder (not the folder itself)
2. Go to Hostinger panel → **Website** → **Import Website**
3. Upload the zip file
4. Extract to `public_html`
5. Verify `.htaccess` file is present

### Step 4: Verify Deployment

1. Visit your domain (e.g., `https://yourdomain.com`)
2. You should see the login page
3. **Note**: Companies House sync features will not work (API calls fail)
4. All localStorage features work normally

### Step 5: Manual Companies House Data Entry

Since API integration doesn't work on static hosting:
- Add companies manually with all details
- Disable automatic Companies House sync
- Use manual data entry for all company information

---

## 💾 Data Migration & Backup

### Export Data from Current System

CorpManageSys stores all data in browser localStorage. Use the built-in export feature:

1. **Login to your current system** (Replit or source environment)
2. **Go to Admin Dashboard**
3. **Click "Export All System CSVs"** - this downloads all data as CSV files
4. **Save the downloaded CSVs** to a safe location

The export includes:
- Companies data
- Company tasks
- SL Prep tasks
- HR templates
- Residency templates
- Employees data
- Employee tasks
- All activity logs

### Backup localStorage Data Using Backup Tool (Recommended)

**IMPORTANT:** The `backup-restore-data.html` tool MUST be accessed from your deployed domain to work correctly due to same-origin security policies.

#### Setup the Backup Tool:

1. **Upload the tool to your server:**
   - Copy `backup-restore-data.html` to your `public_html` folder (shared hosting)
   - Or to `/var/www/corpmanagesys` (VPS - Nginx will serve it)

2. **Access the tool via your domain:**
   - Navigate to `https://yourdomain.com/backup-restore-data.html`
   - ❌ Do NOT open the file locally (`file:///...`) - it won't work!

3. **Use the tool:**
   - Click "Download Backup File" to backup all localStorage data
   - Use "Choose Backup File to Restore" to restore from a backup
   - View current data summary
   - Clear all data (with confirmation)

### Backup localStorage Data (Manual Method)

If you need a full localStorage backup manually:

1. Open browser console (F12) on your current system
2. Run this script:

```javascript
// Export all localStorage data
const backup = {};
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key.startsWith('corporate-management-')) {
    backup[key] = localStorage.getItem(key);
  }
}
console.log(JSON.stringify(backup, null, 2));
// Copy the output and save to a file
```

3. Copy the output and save it as `localStorage-backup.json`

### Import Data to New System

#### Method A: Using CSV Import (Recommended)

1. **Deploy the application** to Hostinger
2. **Login with default admin credentials**
3. **Go to Admin Dashboard**
4. **Use import features** for each entity type:
   - Import SL Prep Tasks (CSV)
   - Import HR Task Templates (CSV)
   - Import Residency Task Templates (CSV)
   - Manually add companies (or import if feature exists)
   - Manually add employees (or import if feature exists)

#### Method B: Direct localStorage Restore

1. **Login to the new system**
2. **Open browser console** (F12)
3. **Run this script** with your backup data:

```javascript
// Restore localStorage from backup
const backup = {
  // Paste your backup JSON here
};

Object.keys(backup).forEach(key => {
  localStorage.setItem(key, backup[key]);
});

// Reload the page
location.reload();
```

### Automated Backup Script

Create a file `backup-localstorage.js` in your project:

```javascript
// Save this as backup-localstorage.js
// Run in browser console to backup all data

(function() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = {};
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('corporate-management-')) {
      backup[key] = localStorage.getItem(key);
    }
  }
  
  // Create downloadable file
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `corpmanagesys-backup-${timestamp}.json`;
  link.click();
  
  console.log('Backup downloaded successfully!');
})();
```

**To use:**
1. Open your application in browser
2. Open console (F12)
3. Paste and run the script
4. A JSON backup file will download automatically

---

## ⚙️ Post-Deployment Configuration

### 1. Change Default Admin Password

**IMPORTANT**: Change the default admin password immediately!

1. Login with default credentials (Admin / Nogooms12)
2. Go to **Admin Dashboard** → **User Management**
3. Edit the Admin user
4. Change password to a strong, unique password
5. Save changes

### 2. Create Additional Users

1. Go to **Admin Dashboard** → **User Management**
2. Click **Add User**
3. Fill in user details:
   - Username
   - Password
   - Name
   - Position
   - Email
4. Save

### 3. Configure System Settings

1. **Google Drive Settings** (Admin Dashboard):
   - Add your Google Drive folder URL for manual CSV uploads
   
2. **Companies House Integration** (VPS only):
   - Verify API key is working
   - Test company sync functionality

### 4. Initial Data Setup

1. **Add your first company**:
   - Go to Companies tab
   - Click "Add New Company"
   - Use Companies House sync (VPS) or manual entry

2. **Configure SL Prep Tasks** (if applicable):
   - Go to SL Prep Tasks tab
   - Import task templates or create manually

3. **Configure HR Task Templates**:
   - Go to HR Task Templates tab
   - Import templates or create manually

4. **Add employees**:
   - Go to Employees tab
   - Add employee records

### 5. Security Recommendations

#### For VPS Deployment:

```bash
# 1. Create a non-root user
sudo adduser corpmanage
sudo usermod -aG sudo corpmanage

# 2. Disable root login via SSH
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
sudo systemctl restart sshd

# 3. Setup fail2ban (optional but recommended)
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 4. Regular updates
sudo apt update && sudo apt upgrade -y
```

#### For All Deployments:

1. **Use HTTPS only** - ensure SSL is configured
2. **Regular backups** - export localStorage data weekly
3. **Strong passwords** - enforce for all users
4. **Monitor activity logs** - check System Activity Log regularly
5. **Keep dependencies updated** - run `npm update` monthly

---

## 🔧 Troubleshooting

### VPS Deployment Issues

#### Problem: Application not starting

```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs corpmanagesys

# Restart app
pm2 restart corpmanagesys
```

#### Problem: Port 5000 already in use

```bash
# Check what's using port 5000
sudo lsof -i :5000

# Kill the process if needed
sudo kill -9 <PID>

# Or change PORT in .env file to another port (e.g., 5001)
```

#### Problem: Nginx not forwarding requests

```bash
# Test Nginx config
sudo nginx -t

# Check Nginx status
sudo systemctl status nginx

# View Nginx error logs
sudo tail -f /var/log/nginx/corpmanagesys_error.log

# Restart Nginx
sudo systemctl restart nginx
```

#### Problem: SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal
```

### Static Hosting Issues

#### Problem: Blank page after deployment

**Solution:**
- Check browser console for errors (F12)
- Verify all files uploaded correctly
- Ensure `.htaccess` file is present and correct
- Clear browser cache

#### Problem: Routes not working (404 on refresh)

**Solution:**
- Verify `.htaccess` file is in `public_html`
- Check mod_rewrite is enabled on server
- Contact Hostinger support to enable mod_rewrite

#### Problem: Assets not loading

**Solution:**
- Check file permissions: `chmod 644` for files, `chmod 755` for directories
- Verify asset paths in build
- Clear Hostinger cache if using caching

### Common Issues (All Deployments)

#### Problem: Login not working

**Solution:**
1. Clear browser cache and localStorage
2. Try incognito/private mode
3. Check browser console for errors
4. Verify application is fully loaded

#### Problem: Data not persisting

**Solution:**
- localStorage data is browser-specific
- Each browser/device has separate data
- Use export/import to transfer data between browsers
- Consider documenting this for users

#### Problem: Companies House sync not working

**VPS:**
- Verify `COMPANIES_HOUSE_API_KEY` in `.env` file
- Check API key is valid at Companies House portal
- View PM2 logs: `pm2 logs corpmanagesys`

**Static Hosting:**
- Companies House sync is NOT supported on static hosting
- Use manual data entry instead

---

## 📞 Support & Maintenance

### Regular Maintenance Tasks

**Weekly:**
- [ ] Export localStorage backup
- [ ] Check system activity logs
- [ ] Verify all services running (VPS)

**Monthly:**
- [ ] Update dependencies: `npm update`
- [ ] Rebuild and redeploy: `npm run build && pm2 reload corpmanagesys`
- [ ] Check SSL certificate status (VPS)
- [ ] Review user accounts and permissions

**Quarterly:**
- [ ] Full system update (VPS): `sudo apt update && sudo apt upgrade`
- [ ] Security audit
- [ ] Review and clean old activity logs

### Getting Help

**Hostinger Support:**
- VPS issues: [Hostinger VPS Support](https://www.hostinger.com/tutorials/vps)
- Shared hosting: [Hostinger Help Center](https://support.hostinger.com)

**Application Issues:**
- Review activity logs in Admin Dashboard
- Check browser console for errors
- Export localStorage data for debugging

---

## ✅ Deployment Checklist

Use this checklist to ensure successful deployment:

### Pre-Deployment
- [ ] Hostinger account set up
- [ ] Domain configured and pointing to hosting
- [ ] Companies House API key obtained
- [ ] Source code downloaded/available
- [ ] Current data exported (if migrating)

### VPS Deployment
- [ ] VPS provisioned and accessible via SSH
- [ ] System packages updated
- [ ] Node.js v20+ installed
- [ ] Nginx installed and configured
- [ ] PM2 installed globally
- [ ] Application files uploaded
- [ ] Dependencies installed (`npm install`)
- [ ] Build completed (`npm run build`)
- [ ] Environment variables configured (`.env` file)
- [ ] PM2 configured and app started
- [ ] Nginx configuration created and enabled
- [ ] SSL certificate obtained and configured
- [ ] Firewall configured (UFW)
- [ ] PM2 startup configured
- [ ] Application accessible via domain
- [ ] Default admin password changed
- [ ] Additional users created
- [ ] Data imported/migrated
- [ ] Backup system configured

### Static Hosting Deployment
- [ ] Application built locally (`npm run build`)
- [ ] `.htaccess` file added to dist folder
- [ ] Files uploaded to `public_html`
- [ ] Application accessible via domain
- [ ] Default admin password changed
- [ ] Users understand Companies House sync is unavailable
- [ ] Data imported/migrated

### Post-Deployment
- [ ] Login tested with admin credentials
- [ ] All main features tested
- [ ] Companies House sync tested (VPS only)
- [ ] User creation tested
- [ ] Data export tested
- [ ] Activity logging verified
- [ ] Performance acceptable
- [ ] Documentation provided to team
- [ ] Backup schedule established

---

## 🎉 Conclusion

Your CorpManageSys application should now be successfully deployed on Hostinger!

**Key Points to Remember:**
- All user data is stored in **browser localStorage** (client-side)
- Each user/browser has their own local data
- Regular backups are essential (use CSV export feature)
- VPS deployment provides full functionality including Companies House integration
- Static hosting works but without Companies House API features

**Next Steps:**
1. Change default admin password
2. Create user accounts for your team
3. Import existing data (if migrating)
4. Configure system settings
5. Train users on the system
6. Establish backup routine

Good luck with your deployment! 🚀
