# Azure VM Deployment Guide - Aesthetiq Python Engine

## 🚀 Manual Deployment Setup (Before Automation)

Follow these steps to manually deploy your Python Engine to Azure VM before setting up automated deployments.

---

## Prerequisites

### On Your Local Machine
- [x] Docker and Docker Compose installed
- [x] Azure Container Registry credentials (ACR_USERNAME, ACR_PASSWORD)
- [x] SSH access to Azure VM (VM_HOST, VM_USER, VM_SSH_KEY)
- [x] Azure VM with port 8000 opened

### Required GitHub Secrets (Already Set)
- `ACR_PASSWORD` - Azure Container Registry password
- `ACR_USERNAME` - Azure Container Registry username  
- `VM_HOST` - Azure VM public IP or hostname
- `VM_SSH_KEY` - SSH private key for VM access
- `VM_USER` - SSH username for VM

---

## Step 1: Prepare Your Azure VM

SSH into your Azure VM:
```bash
ssh <VM_USER>@<VM_HOST>
```

### 1.1 Install Docker and Docker Compose
```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group (to run docker without sudo)
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt-get install docker-compose-plugin -y

# Verify installations
docker --version
docker compose version
```

### 1.2 Create Project Directory Structure
```bash
# Create main project directory
sudo mkdir -p /srv/aesthetiq/project
sudo mkdir -p /srv/aesthetiq/face_analysis_weights
sudo mkdir -p /srv/aesthetiq/uploads
sudo mkdir -p /srv/aesthetiq/logs
sudo mkdir -p /srv/aesthetiq/crawler_service/config

# Set ownership to your user
sudo chown -R $USER:$USER /srv/aesthetiq

# Verify directory structure
ls -la /srv/aesthetiq/
```

### 1.3 Login to Azure Container Registry
```bash
# Login to ACR (use your credentials)
docker login aesthetiqregistry.azurecr.io -u <ACR_USERNAME> -p <ACR_PASSWORD>
```

---

## Step 2: Prepare Configuration Files on VM

### 2.1 Create Production Environment File
```bash
cd /srv/aesthetiq/project

# Create .env.prod file
nano .env.prod
```

Copy and paste the content from `python_engine/.env.prod` and update these critical values:

**REQUIRED UPDATES:**
```bash
# Update with your actual frontend domain(s)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,http://your-vm-ip:8000

# Add your production OpenAI API key
OPENAI_API_KEY=sk-your-actual-production-key

# Update MongoDB connection (use MongoDB Atlas for production)
MONGODB_URL=mongodb+srv://username:password@your-cluster.mongodb.net/
MONGODB_DB_NAME=aesthetiq

# Optional: Azure Storage for images
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=...
AZURE_STORAGE_CONTAINER_NAME=images
```

Save the file (Ctrl+O, Enter, Ctrl+X in nano).

### 2.2 Copy docker-compose.prod.yml to VM
```bash
# Still in /srv/aesthetiq/project
nano docker-compose.prod.yml
```

Copy the entire content of `python_engine/docker-compose.prod.yml` into this file and save.

---

## Step 3: Prepare Model Weights

### 3.1 Upload Face Analysis Model Weights
If you have pre-trained model weights:

```bash
# From your local machine, copy weights to VM
scp -r python_engine/weights/* <VM_USER>@<VM_HOST>:/srv/aesthetiq/face_analysis_weights/

# Or download them on the VM directly if stored in cloud storage
# ssh to VM then:
cd /srv/aesthetiq/face_analysis_weights
# Download your model files here
```

If you don't have weights yet, the service will download them on first run (may take time).

---

## Step 4: Build and Push Images from Local Machine

From your local machine (in the project root):

```bash
# Navigate to python_engine directory
cd /mnt/data/TUM_Master/GenAI/Proj/aesthetiq/python_engine

# Login to Azure Container Registry
docker login aesthetiqregistry.azurecr.io -u <ACR_USERNAME> -p <ACR_PASSWORD>

# Build all Docker images for production
docker compose -f docker-compose.prod.yml build

# This will build:
# - aesthetiqregistry.azurecr.io/gateway:latest
# - aesthetiqregistry.azurecr.io/face_analysis:latest
# - aesthetiqregistry.azurecr.io/conversational_agent:latest
# - aesthetiqregistry.azurecr.io/embedding_service:latest
# - aesthetiqregistry.azurecr.io/try_on_service:latest
# - aesthetiqregistry.azurecr.io/mcp_servers:latest
# - aesthetiqregistry.azurecr.io/crawler_service:latest

# Push all images to Azure Container Registry
docker compose -f docker-compose.prod.yml push
```

**Note:** This step may take 10-30 minutes depending on your internet speed and image sizes.

---

## Step 5: Deploy on Azure VM

SSH back into your Azure VM:

```bash
ssh <VM_USER>@<VM_HOST>
cd /srv/aesthetiq/project
```

### 5.1 Pull Images from ACR
```bash
# Pull all images from Azure Container Registry
docker compose -f docker-compose.prod.yml pull
```

### 5.2 Start Services
```bash
# Start all services in detached mode
docker compose -f docker-compose.prod.yml up -d

# This will start:
# - gateway (port 8000)
# - face_analysis
# - conversational_agent
# - embedding_service
# - try_on_service
# - mcp_servers
# - crawler_service
```

### 5.3 Monitor Startup
```bash
# Watch logs for all services
docker compose -f docker-compose.prod.yml logs -f

# Or watch specific service
docker compose -f docker-compose.prod.yml logs -f gateway

# Check service status
docker compose -f docker-compose.prod.yml ps

# Check health status
docker ps
```

**Expected Output:**
All containers should show status as `Up` and health as `healthy` after a few minutes.

---

## Step 6: Verify Deployment

### 6.1 Check Service Health
```bash
# Test gateway health endpoint
curl http://localhost:8000/health

# Expected response:
# {"status":"healthy","services":{"face_analysis":"healthy","conversational_agent":"healthy"}}
```

### 6.2 Test from External Machine
From your local machine:
```bash
# Test public endpoint
curl http://<VM_HOST>:8000/health

# Test API documentation
# Open in browser: http://<VM_HOST>:8000/docs
```

### 6.3 Check Individual Service Logs
```bash
# Gateway logs
docker compose -f docker-compose.prod.yml logs gateway --tail=100

# Face analysis logs
docker compose -f docker-compose.prod.yml logs face_analysis --tail=100

# Conversational agent logs
docker compose -f docker-compose.prod.yml logs conversational_agent --tail=100
```

---

## Step 7: Configure Firewall (Security)

### 7.1 Azure Network Security Group (NSG)
In Azure Portal:
1. Go to your VM → Networking → Network Security Group
2. Add inbound rule:
   - **Priority:** 1000
   - **Name:** AllowHTTP8000
   - **Port:** 8000
   - **Protocol:** TCP
   - **Source:** Any (or specific IPs for better security)
   - **Destination:** Any
   - **Action:** Allow

### 7.2 VM Firewall (UFW)
```bash
# Enable UFW if not already enabled
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow port 8000
sudo ufw allow 8000/tcp

# Check status
sudo ufw status
```

---

## Step 8: Update Frontend to Point to VM

Update your frontend environment variables:

```bash
# In your frontend .env file
NEXT_PUBLIC_API_URL=http://<VM_HOST>:8000/api/v1

# Or for production with domain:
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
```

---

## Common Commands Reference

### Service Management
```bash
# Start services
docker compose -f docker-compose.prod.yml up -d

# Stop services
docker compose -f docker-compose.prod.yml down

# Restart specific service
docker compose -f docker-compose.prod.yml restart gateway

# View logs
docker compose -f docker-compose.prod.yml logs -f [service_name]

# Check status
docker compose -f docker-compose.prod.yml ps
```

### Updates and Maintenance
```bash
# Pull latest images
docker compose -f docker-compose.prod.yml pull

# Recreate containers with new images
docker compose -f docker-compose.prod.yml up -d --force-recreate

# Clean up old images and containers
docker system prune -a -f
```

### Debugging
```bash
# Execute command in running container
docker compose -f docker-compose.prod.yml exec gateway bash

# View resource usage
docker stats

# Inspect specific container
docker inspect aesthetiq-gateway
```

---

## Troubleshooting

### Issue: Services won't start
```bash
# Check logs for errors
docker compose -f docker-compose.prod.yml logs

# Check if ports are already in use
sudo netstat -tulpn | grep 8000

# Verify .env.prod file exists and has correct values
cat .env.prod
```

### Issue: "Permission denied" errors
```bash
# Fix directory permissions
sudo chown -R $USER:$USER /srv/aesthetiq

# Ensure Docker is running
sudo systemctl status docker
```

### Issue: Can't connect from outside
```bash
# Check if service is listening
sudo netstat -tulpn | grep 8000

# Check firewall rules
sudo ufw status

# Verify NSG rules in Azure Portal
```

### Issue: Out of memory
```bash
# Check memory usage
free -h
docker stats

# Add swap space
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## Production Recommendations

### 1. Use HTTPS with Domain
- Set up a domain pointing to your VM
- Install Nginx as reverse proxy
- Add SSL certificate with Let's Encrypt
- Update ALLOWED_ORIGINS in .env.prod

### 2. Set Up Monitoring
```bash
# Install monitoring tools
docker run -d --name=cadvisor --restart=always \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/docker/:/var/lib/docker:ro \
  gcr.io/cadvisor/cadvisor:latest
```

### 3. Enable Automatic Backups
```bash
# Create backup script
cat > /srv/aesthetiq/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose -f /srv/aesthetiq/project/docker-compose.prod.yml exec -T gateway \
  mongodump --uri="$MONGODB_URL" --out=/tmp/backup_$DATE
tar -czf /srv/aesthetiq/backups/backup_$DATE.tar.gz /tmp/backup_$DATE
rm -rf /tmp/backup_$DATE
EOF

chmod +x /srv/aesthetiq/backup.sh

# Add to crontab for daily backups
crontab -e
# Add: 0 2 * * * /srv/aesthetiq/backup.sh
```

### 4. Set Up Log Rotation
```bash
# Docker handles log rotation, but configure limits
cat > /etc/docker/daemon.json << 'EOF'
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

sudo systemctl restart docker
```

---

## Next Steps: Automating with GitHub Actions

Once you've verified manual deployment works:

1. **Test the GitHub workflow:**
   ```bash
   # Push to azure_test branch to trigger deployment
   git checkout -b azure_test
   git push origin azure_test
   ```

2. **Monitor workflow in GitHub Actions tab**

3. **Switch to main branch for production deployments**

4. **Add staging environment** (optional):
   - Create separate VM for staging
   - Add staging-specific secrets
   - Modify workflow for multi-environment support

---

## Security Checklist

- [ ] .env.prod file has strong, unique secrets
- [ ] MongoDB uses strong password and is not publicly accessible
- [ ] Azure NSG allows only necessary ports
- [ ] VM firewall (UFW) is enabled and configured
- [ ] Docker images are from trusted sources
- [ ] Regular security updates scheduled
- [ ] Monitoring and alerting set up
- [ ] Backups configured and tested
- [ ] HTTPS enabled for production (with domain)
- [ ] API rate limiting configured

---

## Support & Logs

If you encounter issues:
1. Check service logs: `docker compose -f docker-compose.prod.yml logs`
2. Verify .env.prod configuration
3. Ensure all GitHub secrets are correctly set
4. Check Azure VM resources (CPU, memory, disk)
5. Review this guide's troubleshooting section

---

## Summary

You've now:
✅ Configured production docker-compose.prod.yml
✅ Created production environment file (.env.prod)
✅ Set up Azure VM with Docker
✅ Manually deployed services
✅ Verified deployment works
✅ Ready to automate with GitHub Actions

**Ready for GitHub Actions automation!** 🎉
