#!/bin/bash
# Quick setup script for Azure VM
# Run this script on your Azure VM after SSH'ing in

set -e

echo "🚀 Aesthetiq Python Engine - Azure VM Setup Script"
echo "=================================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Please don't run as root. Run as regular user with sudo privileges."
   exit 1
fi

# Update system
echo ""
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo ""
    echo "🐋 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
    
    # Restart Docker daemon to load new libraries
    echo "🔄 Restarting Docker daemon..."
    sudo systemctl restart docker
    sudo systemctl enable docker
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    echo "✅ Docker installed and daemon restarted."
    echo "⚠️  You need to log out and back in for group changes to take effect."
else
    echo "✅ Docker already installed"
    # Restart daemon anyway if it was just updated
    echo "🔄 Restarting Docker daemon to ensure latest libraries are loaded..."
    sudo systemctl restart docker
fi

# Install Docker Compose
if ! command -v docker compose &> /dev/null; then
    echo ""
    echo "🔧 Installing Docker Compose plugin..."
    sudo apt-get install -y docker-compose-plugin
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Create directory structure
echo ""
echo "📁 Creating project directories..."
sudo mkdir -p /srv/aesthetiq/project
sudo mkdir -p /srv/aesthetiq/face_analysis_weights
sudo mkdir -p /srv/aesthetiq/uploads
sudo mkdir -p /srv/aesthetiq/logs
sudo mkdir -p /srv/aesthetiq/crawler_service/config
sudo mkdir -p /srv/aesthetiq/backups

# Set ownership
sudo chown -R $USER:$USER /srv/aesthetiq
echo "✅ Directories created at /srv/aesthetiq/"

# Install UFW if not present
if ! command -v ufw &> /dev/null; then
    echo ""
    echo "🔥 Installing UFW firewall..."
    sudo apt-get install -y ufw
fi

# Configure firewall
echo ""
echo "🔒 Configuring firewall..."
sudo ufw --force enable
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 8000/tcp comment 'Aesthetiq API Gateway'
echo "✅ Firewall configured"

# Check Docker versions
echo ""
echo "📋 Installed versions:"
docker --version
docker compose version

echo ""
echo "✅ VM setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Login to Azure Container Registry:"
echo "   docker login aesthetiqregistry.azurecr.io -u <ACR_USERNAME> -p <ACR_PASSWORD>"
echo ""
echo "2. Create /srv/aesthetiq/project/.env.prod with your configuration"
echo ""
echo "3. Copy docker-compose.prod.yml to /srv/aesthetiq/project/"
echo ""
echo "4. Pull and start services:"
echo "   cd /srv/aesthetiq/project"
echo "   docker compose -f docker-compose.prod.yml pull"
echo "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo "See DEPLOYMENT_GUIDE.md for detailed instructions."
