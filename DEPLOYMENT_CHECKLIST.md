# 📋 CorpManageSys Hostinger Deployment Checklist

Use this checklist to ensure a smooth deployment process.

---

## 📦 Pre-Deployment Preparation

### Account & Domain Setup
- [ ] Hostinger account created and active
- [ ] Hosting plan selected (VPS recommended, Shared also works)
- [ ] Domain name registered or transferred to Hostinger
- [ ] Domain DNS configured and pointing to hosting server
- [ ] DNS propagation completed (check with `nslookup yourdomain.com`)

### API Keys & Credentials
- [ ] Companies House API key obtained ([Get it here](https://developer.company-information.service.gov.uk/))
- [ ] Session secret generated (use `openssl rand -base64 32`)
- [ ] SSH credentials for VPS ready (if using VPS)
- [ ] FTP/SFTP credentials ready (if using shared hosting)

### Data Backup (If Migrating)
- [ ] Current system data exported using "Export All System CSVs" feature
- [ ] localStorage backup created using `backup-restore-data.html` tool
- [ ] All CSV files downloaded and saved securely
- [ ] Backup JSON file downloaded and saved securely
- [ ] Backup files verified and readable

---

## 🖥️ VPS Deployment Checklist

### Initial Server Setup
- [ ] SSH access to VPS confirmed (`ssh root@your-vps-ip`)
- [ ] System packages updated (`sudo apt update && sudo apt upgrade -y`)
- [ ] Server timezone set to Europe/London (`sudo timedatectl set-timezone Europe/London`)

### Software Installation
- [ ] Node.js v20.x installed and verified (`node --version`)
- [ ] npm installed and verified (`npm --version`)
- [ ] Nginx installed (`nginx -v`)
- [ ] Nginx service started and enabled
- [ ] PM2 installed globally (`pm2 --version`)
- [ ] Git installed (`git --version`)
- [ ] Certbot installed for SSL

### Firewall Configuration
- [ ] UFW enabled
- [ ] Port 22 (SSH) allowed
- [ ] Port 80 (HTTP) allowed
- [ ] Port 443 (HTTPS) allowed
- [ ] 'Nginx Full' profile allowed
- [ ] Firewall status verified (`sudo ufw status`)

### Application Deployment
- [ ] Application directory created (`/var/www/corpmanagesys`)
- [ ] Directory ownership set correctly
- [ ] Source code uploaded to server (via Git, SCP, or File Manager)
- [ ] All project files present and verified
- [ ] `npm install` completed successfully
- [ ] `npm run build` completed without errors
- [ ] `dist` folder created with built files

### Environment Configuration
- [ ] `.env` file created in project root
- [ ] `NODE_ENV=production` set in `.env`
- [ ] `PORT=5000` set in `.env`
- [ ] `COMPANIES_HOUSE_API_KEY` added to `.env`
- [ ] `SESSION_SECRET` added to `.env`
- [ ] `.env` file permissions set correctly (`chmod 600 .env`)

### PM2 Configuration
- [ ] `ecosystem.config.js` file configured with correct paths
- [ ] PM2 started with `pm2 start ecosystem.config.js`
- [ ] Application status verified (`pm2 status`)
- [ ] Application logs checked (`pm2 logs corpmanagesys`)
- [ ] PM2 process list saved (`pm2 save`)
- [ ] PM2 startup script configured
- [ ] Startup script executed
- [ ] Server reboot tested and PM2 auto-starts confirmed

### Nginx Configuration
- [ ] Nginx config file created (`/etc/nginx/sites-available/corpmanagesys`)
- [ ] Domain name updated in Nginx config
- [ ] Proxy settings configured for localhost:5000
- [ ] Symbolic link created to sites-enabled
- [ ] Nginx configuration tested (`sudo nginx -t`)
- [ ] Nginx reloaded (`sudo systemctl reload nginx`)
- [ ] Application accessible via domain (HTTP)

### SSL Certificate
- [ ] Certbot executed for domain (`sudo certbot --nginx -d yourdomain.com`)
- [ ] Email address provided
- [ ] Terms of Service accepted
- [ ] HTTP to HTTPS redirect configured
- [ ] SSL certificate obtained successfully
- [ ] HTTPS access verified
- [ ] Auto-renewal tested (`sudo certbot renew --dry-run`)
- [ ] Certbot timer enabled (`sudo systemctl enable certbot.timer`)

### Security Hardening
- [ ] Non-root user created for management
- [ ] Root SSH login disabled (optional but recommended)
- [ ] Fail2ban installed and configured (optional)
- [ ] Server firewall rules verified
- [ ] Only necessary ports open

---

## 📄 Static Hosting Deployment Checklist

### Local Build Preparation
- [ ] Project dependencies installed (`npm install`)
- [ ] Production build created (`npm run build`)
- [ ] `dist` folder generated successfully
- [ ] `.htaccess` file copied to `dist` folder
- [ ] Build files verified (index.html, assets folder present)

### File Upload
- [ ] Logged into Hostinger control panel
- [ ] File Manager accessed
- [ ] Navigated to `public_html` directory
- [ ] Existing files in `public_html` backed up (if any)
- [ ] Old files removed from `public_html`
- [ ] All contents from `dist` folder uploaded to `public_html`
- [ ] `.htaccess` file present in `public_html`
- [ ] `robots.txt` file present in `public_html`
- [ ] File permissions verified (644 for files, 755 for directories)

### Verification
- [ ] Application accessible via domain
- [ ] Login page loads correctly
- [ ] No console errors in browser
- [ ] Routing works (refresh on different pages)
- [ ] Assets loading correctly

### Limitations Acknowledged
- [ ] Team aware Companies House sync will NOT work on static hosting
- [ ] Manual data entry process documented
- [ ] Users trained on manual company data entry

---

## 💾 Data Migration Checklist

### Export from Source System
- [ ] Logged into current/source system
- [ ] Navigated to Admin Dashboard
- [ ] Clicked "Export All System CSVs"
- [ ] All CSV files downloaded successfully
- [ ] CSV files saved to secure location
- [ ] localStorage backup created using `backup-restore-data.html`
- [ ] Backup JSON file saved securely

### Import to New System
- [ ] Logged into new deployed system
- [ ] Default admin credentials working
- [ ] Navigated to Admin Dashboard
- [ ] SL Prep Tasks imported (if applicable)
- [ ] HR Task Templates imported
- [ ] Residency Task Templates imported
- [ ] Companies added (manual or CSV import)
- [ ] Employees added (manual or CSV import)
- [ ] Data verified in new system

### Alternative localStorage Restore
- [ ] Opened new system in browser
- [ ] Opened browser console (F12)
- [ ] Ran localStorage restore script with backup data
- [ ] Page reloaded
- [ ] All data visible in system
- [ ] Users can login
- [ ] Activity logs present

---

## ⚙️ Post-Deployment Configuration

### Security Configuration
- [ ] Default admin password changed immediately
- [ ] New admin password saved in password manager
- [ ] Password hint updated
- [ ] Admin email verified

### User Management
- [ ] Additional user accounts created
- [ ] Each user has unique credentials
- [ ] User roles and positions assigned
- [ ] Users can log in successfully
- [ ] Activity logging verified for user actions

### System Settings
- [ ] Google Drive folder URL configured (Admin Dashboard)
- [ ] Companies House API tested (VPS only)
- [ ] Sync functionality verified (VPS only)
- [ ] All main features tested

### Initial Data Setup
- [ ] First company added successfully
- [ ] Company details complete
- [ ] SL Prep tasks configured (if applicable)
- [ ] HR Task Templates configured
- [ ] Residency Task Templates configured
- [ ] First employee added
- [ ] Employee tasks generated correctly

---

## 🧪 Testing & Verification

### Functional Testing
- [ ] Login/logout working
- [ ] User creation working
- [ ] Company management (add/edit/delete) working
- [ ] Employee management (add/edit/delete) working
- [ ] Task creation and completion working
- [ ] SL Prep tracking working
- [ ] HR Task Templates working
- [ ] Residency management working
- [ ] CSV export working
- [ ] Activity logs recording correctly

### Performance Testing
- [ ] Page load times acceptable (< 3 seconds)
- [ ] Large data sets handled well
- [ ] Export features work with large datasets
- [ ] No browser crashes or freezes

### Cross-Browser Testing
- [ ] Chrome tested and working
- [ ] Firefox tested and working
- [ ] Safari tested (if applicable)
- [ ] Edge tested and working
- [ ] Mobile browsers tested

### Companies House Integration (VPS Only)
- [ ] API key working
- [ ] Company lookup by number working
- [ ] Auto-sync fetching data correctly
- [ ] Manual sync working
- [ ] Data accurately imported from Companies House

---

## 📚 Documentation & Training

### Team Documentation
- [ ] Deployment guide shared with team
- [ ] User credentials documented securely
- [ ] System access instructions provided
- [ ] Feature guide created for end users
- [ ] Common issues and solutions documented

### User Training
- [ ] Admin users trained
- [ ] Regular users trained
- [ ] Data entry procedures documented
- [ ] Backup procedures explained
- [ ] Support contacts provided

---

## 🔄 Backup & Maintenance Setup

### Backup Schedule
- [ ] Weekly backup schedule established
- [ ] Backup procedure documented
- [ ] Backup storage location defined
- [ ] Backup restoration tested
- [ ] Responsible person assigned

### Monitoring
- [ ] Server monitoring configured (VPS only)
- [ ] Uptime monitoring set up
- [ ] Error logging reviewed
- [ ] PM2 logs checked regularly (VPS only)

### Maintenance Schedule
- [ ] Weekly tasks documented
  - [ ] Data backup
  - [ ] Activity log review
  - [ ] Service status check
- [ ] Monthly tasks documented
  - [ ] Dependency updates
  - [ ] Security patches
  - [ ] SSL certificate check
- [ ] Quarterly tasks documented
  - [ ] Full system audit
  - [ ] Performance review
  - [ ] User access review

---

## 🎉 Final Verification

### Pre-Launch
- [ ] All checklist items completed
- [ ] System tested end-to-end
- [ ] Data verified and accurate
- [ ] Users can access system
- [ ] Support plan in place
- [ ] Rollback plan documented

### Launch Day
- [ ] Team notified of go-live
- [ ] All users have credentials
- [ ] Support available for issues
- [ ] Monitoring active
- [ ] Backup completed before launch

### Post-Launch (First Week)
- [ ] Daily monitoring
- [ ] User feedback collected
- [ ] Issues logged and addressed
- [ ] Performance monitored
- [ ] Data backups verified

### Success Criteria Met
- [ ] System accessible 24/7
- [ ] Users successfully logging in
- [ ] Data persisting correctly
- [ ] No critical errors
- [ ] Team satisfied with deployment
- [ ] Backup system working

---

## 📞 Support Resources

### Technical Support
- Hostinger Support: https://support.hostinger.com
- Companies House API: https://developer.company-information.service.gov.uk/
- PM2 Documentation: https://pm2.keymetrics.io/
- Nginx Documentation: https://nginx.org/en/docs/

### Emergency Contacts
- [ ] Hosting provider support number saved
- [ ] Domain registrar support saved
- [ ] Technical lead contact saved
- [ ] Backup administrator contact saved

---

## ✅ Deployment Complete!

Date Deployed: __________________

Deployed By: __________________

System URL: __________________

Initial Admin User: __________________

Notes:
_____________________________________________
_____________________________________________
_____________________________________________

**Congratulations! Your CorpManageSys is now live! 🚀**
