# Azure Deployment Quick Start Checklist

## 🎯 Pre-Deployment Checklist

### Local Machine Setup
- [ ] Docker & Docker Compose installed
- [ ] Azure Container Registry credentials available
- [ ] SSH key for Azure VM configured
- [ ] Git repository access

### Azure Resources
- [ ] Azure VM created and accessible
- [ ] VM has adequate resources (4GB+ RAM recommended)
- [ ] Port 8000 opened in Azure NSG
- [ ] Static public IP assigned (optional but recommended)

### Required Credentials
- [ ] `ACR_USERNAME` - Azure Container Registry username
- [ ] `ACR_PASSWORD` - Azure Container Registry password
- [ ] `VM_HOST` - VM public IP or hostname
- [ ] `VM_USER` - VM SSH username
- [ ] `VM_SSH_KEY` - SSH private key content
- [ ] `OPENAI_API_KEY` - OpenAI API key for conversational agent
- [ ] `MONGODB_URL` - MongoDB connection string (MongoDB Atlas recommended)

---

## 📋 Manual Deployment Steps (In Order)

### 1. Setup Azure VM (One-time)
```bash
# Copy setup script to VM
scp python_engine/setup_vm.sh <VM_USER>@<VM_HOST>:~/

# SSH to VM and run setup
ssh <VM_USER>@<VM_HOST>
chmod +x setup_vm.sh
./setup_vm.sh

# Logout and login again for Docker group to take effect
exit
ssh <VM_USER>@<VM_HOST>
```
- [ ] VM setup script executed successfully
- [ ] Docker & Docker Compose installed
- [ ] Directories created at `/srv/aesthetiq/`
- [ ] Firewall configured

### 2. Configure ACR on VM
```bash
# Login to Azure Container Registry
docker login aesthetiqregistry.azurecr.io -u <ACR_USERNAME> -p <ACR_PASSWORD>
```
- [ ] Successfully logged into ACR on VM

### 3. Prepare Configuration Files on VM
```bash
cd /srv/aesthetiq/project

# Create .env.prod file
nano .env.prod
# Paste content from python_engine/.env.prod and update:
# - ALLOWED_ORIGINS (your frontend domain)
# - OPENAI_API_KEY (your production key)
# - MONGODB_URL (your MongoDB Atlas connection string)
# - AZURE_STORAGE_CONNECTION_STRING (optional, for image storage)

# Copy docker-compose.prod.yml
nano docker-compose.prod.yml
# Paste content from python_engine/docker-compose.prod.yml
```
- [ ] `.env.prod` created with correct values
- [ ] `docker-compose.prod.yml` copied to VM
- [ ] ALLOWED_ORIGINS includes your frontend domain
- [ ] OPENAI_API_KEY is valid
- [ ] MONGODB_URL is correct

### 4. Build and Push Images (From Local Machine)
```bash
# From project root
cd python_engine

# Login to ACR
docker login aesthetiqregistry.azurecr.io -u <ACR_USERNAME> -p <ACR_PASSWORD>

# Build all images (takes 10-30 minutes)
docker compose -f docker-compose.prod.yml build

# Push to ACR
docker compose -f docker-compose.prod.yml push
```
- [ ] All images built successfully
- [ ] All images pushed to ACR

### 5. Deploy on VM
```bash
# SSH to VM
ssh <VM_USER>@<VM_HOST>
cd /srv/aesthetiq/project

# Pull images from ACR
docker compose -f docker-compose.prod.yml pull

# Start services
docker compose -f docker-compose.prod.yml up -d

# Monitor logs
docker compose -f docker-compose.prod.yml logs -f
```
- [ ] Images pulled successfully
- [ ] All containers started
- [ ] No error messages in logs
- [ ] All services showing as "healthy"

### 6. Verify Deployment
```bash
# On VM
curl http://localhost:8000/health

# From local machine or browser
curl http://<VM_HOST>:8000/health
# Visit: http://<VM_HOST>:8000/docs
```
- [ ] Health endpoint returns `{"status":"healthy"}`
- [ ] API docs accessible at `/docs`
- [ ] Can access from external machine

---

## 🔍 Verification Commands

### Check Service Status
```bash
# All services
docker compose -f docker-compose.prod.yml ps

# Expected: All services "Up" and "(healthy)"
```

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs --tail=50

# Specific service
docker compose -f docker-compose.prod.yml logs gateway --tail=100 -f
```

### Test Endpoints
```bash
# Health check
curl http://<VM_HOST>:8000/health

# API documentation (in browser)
http://<VM_HOST>:8000/docs

# Specific service test (example)
curl -X POST http://<VM_HOST>:8000/api/v1/ml/analyze-face \
  -F "image=@/path/to/test/image.jpg"
```

---

## 🔧 Common Issues & Quick Fixes

### Issue: Container won't start
```bash
# Check logs for specific error
docker compose -f docker-compose.prod.yml logs [service-name]

# Common fixes:
# 1. Check .env.prod has all required values
# 2. Verify MongoDB connection string
# 3. Check OpenAI API key is valid
```

### Issue: "Permission denied" on volumes
```bash
# Fix ownership
sudo chown -R $USER:$USER /srv/aesthetiq
```

### Issue: Port already in use
```bash
# Check what's using port 8000
sudo netstat -tulpn | grep 8000

# Stop conflicting service or change port in docker-compose
```

### Issue: Out of memory
```bash
# Check memory usage
free -h
docker stats

# Add swap if needed
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🚀 After Manual Deployment Works

### Enable GitHub Actions Automation
1. Verify all GitHub secrets are set:
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Confirm: ACR_USERNAME, ACR_PASSWORD, VM_HOST, VM_USER, VM_SSH_KEY

2. Test workflow:
   ```bash
   # Create and push to test branch
   git checkout -b azure_test
   git push origin azure_test
   
   # Watch GitHub Actions tab for deployment
   ```

3. Once verified, merge to main for automatic production deployments

---

## 📊 Monitoring & Maintenance

### Daily Checks
```bash
# Service status
docker compose -f docker-compose.prod.yml ps

# Resource usage
docker stats --no-stream

# Disk space
df -h
```

### Weekly Maintenance
```bash
# Update images and restart
cd /srv/aesthetiq/project
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Clean up unused resources
docker system prune -f
```

### Backup (Recommended)
```bash
# Backup environment file
cp /srv/aesthetiq/project/.env.prod /srv/aesthetiq/backups/.env.prod.backup

# Backup MongoDB (if not using Atlas)
# (MongoDB Atlas has automatic backups)
```

---

## 🎓 Next Steps

- [ ] Set up domain name and SSL (for production)
- [ ] Configure monitoring (Prometheus, Grafana)
- [ ] Set up log aggregation (ELK stack or cloud solution)
- [ ] Implement CI/CD pipeline (GitHub Actions)
- [ ] Add staging environment
- [ ] Configure auto-scaling (if needed)
- [ ] Set up automated backups
- [ ] Document API usage for frontend team

---

## 📚 Reference Documents

- **Full Guide:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Environment Template:** [.env.prod](./.env.prod)
- **Docker Compose:** [docker-compose.prod.yml](./docker-compose.prod.yml)
- **GitHub Workflow:** [../.github/workflows/deploy_python_engine.yml](../.github/workflows/deploy_python_engine.yml)

---

## 🆘 Support

If stuck:
1. Check logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify `.env.prod` configuration
3. Review [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) troubleshooting section
4. Ensure all prerequisites are met
5. Check Azure VM resources (CPU, RAM, disk space)

---

**Status Tracking:**
- [ ] Manual deployment completed successfully
- [ ] Verified deployment works from external access
- [ ] GitHub Actions workflow tested
- [ ] Production deployment automated
- [ ] Monitoring set up
- [ ] Documentation updated

**Deployment Date:** _______________
**Deployed By:** _______________
**VM IP:** _______________
**Frontend URL:** _______________
