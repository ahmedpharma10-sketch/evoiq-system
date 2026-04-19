# 🚀 CorpManageSys - Hostinger Deployment Package

## 📦 Package Contents

This deployment package contains everything you need to deploy CorpManageSys to Hostinger hosting.

### Files Included:

```
📁 CorpManageSys/
├── 📄 README_DEPLOYMENT.md          ← You are here
├── 📄 DEPLOYMENT_GUIDE.md           ← Complete deployment instructions
├── 📄 DEPLOYMENT_CHECKLIST.md       ← Step-by-step checklist
├── 📄 .htaccess                     ← Apache configuration for static hosting
├── 📄 ecosystem.config.js           ← PM2 configuration for VPS
├── 📄 nginx.conf.example            ← Nginx configuration for VPS
├── 📄 backup-restore-data.html      ← Data backup/restore tool
├── 📁 client/                       ← Frontend React application
├── 📁 server/                       ← Backend Express application
├── 📁 shared/                       ← Shared types and schemas
├── 📄 package.json                  ← Dependencies
├── 📄 vite.config.ts               ← Vite build configuration
├── 📄 tsconfig.json                ← TypeScript configuration
└── ... (other project files)
```

---

## 🎯 Quick Start Guide

### Choose Your Deployment Option:

#### **Option A: VPS Hosting** ⭐ *Recommended*
- ✅ Full functionality including Companies House API
- ✅ Better performance and scalability
- ✅ Custom SSL certificates
- ⏱️ Setup time: ~30-45 minutes
- 📚 **Read:** `DEPLOYMENT_GUIDE.md` → Section "Option A: VPS Deployment"

#### **Option B: Shared Hosting**
- ⚠️ No Companies House API integration
- ✅ Simpler setup, lower cost
- ✅ All localStorage features work
- ⏱️ Setup time: ~15-20 minutes
- 📚 **Read:** `DEPLOYMENT_GUIDE.md` → Section "Option B: Static Hosting"

---

## 📋 Before You Start

### Required Information:

1. **Hostinger Account**
   - VPS or Shared Hosting plan active
   - Domain name configured

2. **Companies House API Key** (for VPS only)
   - Register at: https://developer.company-information.service.gov.uk/
   - Free for basic usage
   - Required for auto-sync features

3. **Access Credentials**
   - SSH access (VPS) or FTP/SFTP (Shared)
   - Admin credentials ready

### System Requirements:

**VPS Deployment:**
- Ubuntu 20.04 or 22.04
- 1GB RAM minimum (2GB recommended)
- 10GB disk space
- Node.js v20.x (installed during setup)
- Nginx (installed during setup)

**Shared Hosting:**
- Apache with mod_rewrite enabled
- PHP not required
- Static file hosting capability

---

## 🚀 Deployment Steps Overview

### For VPS Hosting:

1. **Prepare VPS** (15 min)
   - Connect via SSH
   - Install Node.js, Nginx, PM2, Git, Certbot
   - Configure firewall

2. **Deploy Application** (10 min)
   - Upload source code
   - Install dependencies: `npm install`
   - Build application: `npm run build`
   - Configure environment variables

3. **Configure Services** (10 min)
   - Setup PM2 process manager
   - Configure Nginx reverse proxy
   - Test application

4. **Setup SSL** (5 min)
   - Run Certbot
   - Configure HTTPS
   - Enable auto-renewal

5. **Post-Deployment** (10 min)
   - Change admin password
   - Import data
   - Test all features

**Total Time: ~45 minutes**

### For Shared Hosting:

1. **Build Locally** (5 min)
   - Run `npm install`
   - Run `npm run build`
   - Copy `.htaccess` to `dist` folder

2. **Upload Files** (10 min)
   - Access Hostinger File Manager
   - Upload contents of `dist` folder to `public_html`
   - Verify files uploaded correctly

3. **Post-Deployment** (5 min)
   - Test application access
   - Change admin password
   - Import data

**Total Time: ~20 minutes**

---

## 📖 Documentation Guide

### Start Here:

1. **Read First:**
   ```
   📄 README_DEPLOYMENT.md (this file)
   ```
   Get an overview of the deployment package.

2. **Follow Step-by-Step:**
   ```
   📄 DEPLOYMENT_GUIDE.md
   ```
   Complete deployment instructions with code examples.

3. **Track Progress:**
   ```
   📄 DEPLOYMENT_CHECKLIST.md
   ```
   Check off each step as you complete it.

4. **Backup Your Data:**
   ```
   📄 backup-restore-data.html
   ```
   Open in browser to backup/restore localStorage data.

---

## 💾 Data Migration

### If Migrating from Existing System:

#### Method 1: CSV Export/Import (Recommended)
1. **In your current system:**
   - Login as admin
   - Go to Admin Dashboard
   - Click "Export All System CSVs"
   - Save all downloaded CSV files

2. **In your new system:**
   - Login as admin
   - Use import features for each entity type
   - Verify data imported correctly

#### Method 2: Direct localStorage Transfer
1. **In your current system:**
   - Open `backup-restore-data.html` in browser
   - Click "Download Backup File"
   - Save the JSON file

2. **In your new system:**
   - Open `backup-restore-data.html` in browser
   - Click "Choose Backup File to Restore"
   - Select your backup JSON file
   - Click "Confirm Restore"
   - Reload page

---

## 🔐 Security Best Practices

### Immediately After Deployment:

1. **Change Default Password**
   - Default: Username `Admin`, Password `Nogooms12`
   - Change to strong password immediately
   - Save in password manager

2. **Generate Secure SESSION_SECRET** (VPS only)
   ```bash
   openssl rand -base64 32
   ```
   Add to `.env` file

3. **Protect API Keys** (VPS only)
   - Never commit `.env` file to Git
   - Keep Companies House API key secure
   - Set proper file permissions: `chmod 600 .env`

4. **Enable HTTPS**
   - VPS: Use Certbot for free SSL
   - Shared: Hostinger usually provides SSL automatically

5. **Regular Backups**
   - Export localStorage data weekly
   - Save backups in multiple locations
   - Test restoration process

---

## 🛠️ Configuration Files Explained

### `.htaccess` (Shared Hosting)
- Enables React Router routing
- Configures caching
- Sets security headers
- **Location:** Copy to `public_html` after build

### `ecosystem.config.js` (VPS)
- PM2 process configuration
- Environment variables
- Auto-restart settings
- Log file locations
- **Location:** Project root directory

### `nginx.conf.example` (VPS)
- Nginx reverse proxy settings
- SSL configuration (commented out initially)
- Proxy headers
- Timeout settings
- **Location:** `/etc/nginx/sites-available/corpmanagesys`

---

## 🏗️ Application Architecture

### Key Technologies:
- **Frontend:** React + TypeScript + Vite
- **Backend:** Node.js + Express
- **Data:** Browser localStorage (client-side)
- **Styling:** Tailwind CSS + shadcn/ui
- **API:** Companies House integration

### Data Flow:
```
Browser → localStorage (All Data)
         ↓
Browser → Express Server → Companies House API (VPS only)
```

### Important Notes:
- ✅ All user data stored in **browser localStorage**
- ✅ Each user/browser has separate data
- ✅ No database setup required
- ✅ Server needed ONLY for Companies House API (VPS)
- ⚠️ Regular backups essential (data is browser-specific)

---

## 🧪 Testing After Deployment

### Functional Tests:

1. **Authentication:**
   - [ ] Can login with default credentials
   - [ ] Can logout
   - [ ] Can create new user
   - [ ] Can login with new user

2. **Company Management:**
   - [ ] Can add new company
   - [ ] Can edit company details
   - [ ] Can view company page
   - [ ] Can download company TXT file
   - [ ] Companies House sync works (VPS only)

3. **Employee Management:**
   - [ ] Can add new employee
   - [ ] Can edit employee details
   - [ ] Can deactivate employee
   - [ ] Can add dependants

4. **Task Management:**
   - [ ] Tasks auto-generate correctly
   - [ ] Can complete tasks
   - [ ] Can review tasks (auditor)
   - [ ] SL Prep tasks work

5. **Data Export:**
   - [ ] CSV export works
   - [ ] Excel export works
   - [ ] TXT export works (company page)

### Performance Tests:

- [ ] Page loads < 3 seconds
- [ ] Large data sets handled well
- [ ] No console errors
- [ ] Mobile responsive

---

## 🔧 Troubleshooting

### Common Issues:

#### "Application not accessible"
- VPS: Check PM2 status: `pm2 status`
- VPS: Check Nginx: `sudo nginx -t`
- Shared: Verify files in `public_html`
- Check domain DNS propagation

#### "Login not working"
- Clear browser cache
- Try incognito/private mode
- Check console for errors
- Verify application loaded fully

#### "Companies House not working" (VPS)
- Verify API key in `.env` file
- Check PM2 logs: `pm2 logs corpmanagesys`
- Test API key at Companies House portal
- Ensure server can reach external APIs

#### "Blank page after deployment"
- Check browser console (F12)
- Verify `.htaccess` file present
- Clear browser cache
- Check file permissions

---

## 📞 Support Resources

### Documentation:
- Hostinger Help: https://support.hostinger.com
- Companies House API: https://developer.company-information.service.gov.uk/
- PM2 Docs: https://pm2.keymetrics.io/
- Nginx Docs: https://nginx.org/en/docs/

### Community:
- Hostinger Community: https://www.hostinger.com/tutorials
- Stack Overflow: Tag questions with `hostinger`, `react`, `vite`

---

## 📊 Deployment Comparison

| Feature | VPS Hosting | Shared Hosting |
|---------|-------------|----------------|
| **Companies House API** | ✅ Yes | ❌ No |
| **Environment Variables** | ✅ Yes | ❌ No |
| **Custom SSL** | ✅ Free (Certbot) | ✅ Hostinger SSL |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Setup Complexity** | Medium | Easy |
| **Cost** | Higher | Lower |
| **Full Control** | ✅ Yes | ❌ Limited |
| **Best For** | Production use | Personal/testing |

---

## 🎯 Next Steps After Successful Deployment

1. ✅ **Security First:**
   - Change all default passwords
   - Enable 2FA for Hostinger account
   - Setup backup schedule

2. ✅ **Configure System:**
   - Add your companies
   - Import existing data
   - Configure templates

3. ✅ **User Onboarding:**
   - Create user accounts
   - Send credentials securely
   - Train users on system

4. ✅ **Monitoring:**
   - Setup uptime monitoring
   - Check logs weekly (VPS)
   - Monitor performance

5. ✅ **Maintenance:**
   - Weekly backups
   - Monthly updates
   - Quarterly audits

---

## 📝 Important Reminders

### Data Persistence:
⚠️ **All data is stored in browser localStorage**
- Each user's data is browser-specific
- Clearing browser cache = losing data
- Regular backups are ESSENTIAL
- Use CSV export feature weekly

### Companies House API (VPS Only):
- Free tier: 600 requests per 5 minutes
- API key required
- Monitor usage at Companies House portal
- Handle rate limits gracefully

### Browser Compatibility:
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

---

## 💡 Tips for Success

### Best Practices:

1. **Always backup before major changes**
   - Export data before updates
   - Test in separate browser first
   - Keep multiple backup copies

2. **Monitor system health**
   - Check activity logs regularly
   - Review user actions
   - Watch for errors

3. **Keep system updated**
   - Update dependencies monthly
   - Apply security patches
   - Monitor for new features

4. **Document your processes**
   - Custom configurations
   - User procedures
   - Troubleshooting steps

5. **Plan for scale**
   - Monitor localStorage size
   - Archive old data
   - Consider data limits

---

## 🎉 Congratulations!

You now have everything you need to deploy CorpManageSys to Hostinger!

### Your Deployment Journey:

```
1. Read documentation        → 15 min
2. Prepare environment       → 15 min
3. Deploy application        → 20 min
4. Configure and test        → 15 min
5. Import data and go live   → 15 min
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Total estimated time:       ~80 min
```

### Ready to Deploy?

1. Open `DEPLOYMENT_GUIDE.md`
2. Follow your chosen path (VPS or Shared)
3. Use `DEPLOYMENT_CHECKLIST.md` to track progress
4. Deploy with confidence! 🚀

---

## 📧 Questions?

If you encounter any issues not covered in the documentation:
1. Check `DEPLOYMENT_GUIDE.md` Troubleshooting section
2. Review Hostinger support documentation
3. Check application console for specific errors
4. Consult deployment checklist for missed steps

**Good luck with your deployment!** 🎊
