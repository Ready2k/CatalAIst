#!/bin/bash
# CatalAIst v3.0.0 - Work Device Setup Script
# This script helps you deploy CatalAIst on your work device

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         CatalAIst v3.0.0 - Work Device Setup              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: docker-compose is not installed"
    echo "Please install docker-compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker is installed"
echo ""

# Deployment method selection
echo "Choose deployment method:"
echo ""
echo "1) GitHub Releases"
echo "   - Download pre-built images from GitHub"
echo "   - Requires: Internet access to GitHub"
echo ""
echo "2) Docker Hub"
echo "   - Pull images from Docker Hub registry"
echo "   - Requires: Docker Hub account (optional)"
echo ""
echo "3) Local tar.gz file"
echo "   - Load from catalai-v3.0.0-images.tar.gz"
echo "   - Requires: File in current directory"
echo ""
echo "4) Build from source"
echo "   - Build Docker images locally"
echo "   - Requires: Source code and build tools"
echo ""

read -p "Enter choice (1-4): " choice
echo ""

case $choice in
  1)
    echo "📥 Downloading from GitHub Releases..."
    echo ""
    
    # Check if file already exists
    if [ -f "catalai-v3.0.0-images.tar.gz" ]; then
        read -p "File already exists. Re-download? (y/n): " redownload
        if [ "$redownload" != "y" ]; then
            echo "Using existing file..."
        else
            rm catalai-v3.0.0-images.tar.gz
            echo "Enter your GitHub username:"
            read github_user
            curl -L -O "https://github.com/${github_user}/CatalAIst/releases/download/v3.0.0/catalai-v3.0.0-images.tar.gz"
        fi
    else
        echo "Enter your GitHub username:"
        read github_user
        curl -L -O "https://github.com/${github_user}/CatalAIst/releases/download/v3.0.0/catalai-v3.0.0-images.tar.gz"
    fi
    
    echo ""
    echo "📦 Loading Docker images..."
    docker load < catalai-v3.0.0-images.tar.gz
    ;;
    
  2)
    echo "📥 Pulling from Docker Hub..."
    echo ""
    echo "Enter your Docker Hub username:"
    read docker_user
    
    # Update docker-compose.yml to use Docker Hub images
    echo "Updating docker-compose.yml..."
    
    # Create temporary docker-compose override
    cat > docker-compose.override.yml << EOF
services:
  backend:
    image: ${docker_user}/catalai-backend:3.0.0
    build: null
  
  frontend:
    image: ${docker_user}/catalai-frontend:3.0.0
    build: null
EOF
    
    echo "Pulling images..."
    docker-compose pull
    ;;
    
  3)
    echo "📦 Loading from local tar.gz file..."
    echo ""
    
    if [ ! -f "catalai-v3.0.0-images.tar.gz" ]; then
        echo "❌ Error: catalai-v3.0.0-images.tar.gz not found"
        echo "Please copy the file to this directory first"
        exit 1
    fi
    
    # Verify checksum if available
    if [ -f "catalai-v3.0.0-images.tar.gz.sha256" ]; then
        echo "Verifying checksum..."
        if shasum -a 256 -c catalai-v3.0.0-images.tar.gz.sha256; then
            echo "✅ Checksum verified"
        else
            echo "⚠️  Warning: Checksum verification failed"
            read -p "Continue anyway? (y/n): " continue_load
            if [ "$continue_load" != "y" ]; then
                exit 1
            fi
        fi
    fi
    
    echo "Loading Docker images..."
    docker load < catalai-v3.0.0-images.tar.gz
    ;;
    
  4)
    echo "🔨 Building from source..."
    echo ""
    
    if [ ! -f "backend/Dockerfile" ] || [ ! -f "frontend/Dockerfile" ]; then
        echo "❌ Error: Dockerfile not found"
        echo "Please ensure you're in the CatalAIst root directory"
        exit 1
    fi
    
    echo "Building backend image..."
    docker build -f backend/Dockerfile -t catalai-backend:3.0.0 -t catalai-backend:latest .
    
    echo ""
    echo "Building frontend image..."
    docker build -f frontend/Dockerfile -t catalai-frontend:3.0.0 -t catalai-frontend:latest .
    ;;
    
  *)
    echo "❌ Invalid choice"
    exit 1
    ;;
esac

echo ""
echo "✅ Docker images ready"
echo ""

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found"
    echo ""
    echo "Creating .env file with required variables..."
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "CHANGE_ME_$(date +%s)")
    PII_KEY=$(openssl rand -hex 32 2>/dev/null || echo "CHANGE_ME_$(date +%s)")
    
    cat > .env << EOF
# Security Configuration (REQUIRED)
JWT_SECRET=${JWT_SECRET}
PII_ENCRYPTION_KEY=${PII_KEY}
CREDENTIALS_ENCRYPTION_KEY=${JWT_SECRET}

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80,http://localhost

# AWS Bedrock (Optional - only if using Bedrock)
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_SESSION_TOKEN=
# AWS_REGION=us-east-1
EOF
    
    echo "✅ Created .env file with random secrets"
    echo ""
fi

# Start services
echo "🚀 Starting services..."
echo ""

if command -v docker-compose &> /dev/null; then
    docker-compose up -d
else
    docker compose up -d
fi

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check health
echo ""
echo "🏥 Checking service health..."

backend_health=$(curl -s http://localhost:8080/health || echo "failed")
if [[ $backend_health == *"ok"* ]]; then
    echo "✅ Backend is healthy"
else
    echo "⚠️  Backend health check failed"
fi

frontend_health=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 || echo "000")
if [ "$frontend_health" = "200" ]; then
    echo "✅ Frontend is healthy"
else
    echo "⚠️  Frontend health check failed"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! 🎉                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Access CatalAIst at:"
echo "  Frontend: http://localhost"
echo "  Backend:  http://localhost:8080"
echo ""
echo "Useful commands:"
echo "  View logs:    docker-compose logs -f"
echo "  Stop:         docker-compose down"
echo "  Restart:      docker-compose restart"
echo ""
echo "First-time setup:"
echo "  1. Open http://localhost in your browser"
echo "  2. Click 'Configuration' tab"
echo "  3. Enter your OpenAI API key"
echo "  4. Start classifying!"
echo ""
