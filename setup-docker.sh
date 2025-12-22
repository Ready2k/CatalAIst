#!/bin/bash
# Docker Setup Script for CatalAIst with Security Features

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "================================"
echo "CatalAIst Docker Setup"
echo "================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if docker-compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: docker-compose is not installed${NC}"
    echo "Please install docker-compose first: https://docs.docker.com/compose/install/"
    exit 1
fi

echo -e "${GREEN}✓ Docker and docker-compose are installed${NC}"
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing .env file"
        SKIP_ENV=true
    fi
fi

# Create .env file
if [ "$SKIP_ENV" != "true" ]; then
    echo "Creating .env file with secure secrets..."
    
    # Generate secure secrets
    JWT_SECRET=$(openssl rand -base64 32)
    PII_KEY=$(openssl rand -base64 32)
    CRED_KEY=$(openssl rand -base64 32)
    
    cat > .env << EOF
# Security Configuration (REQUIRED)
JWT_SECRET=$JWT_SECRET
PII_ENCRYPTION_KEY=$PII_KEY
CREDENTIALS_ENCRYPTION_KEY=$CRED_KEY

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80

# Server Configuration
NODE_ENV=development
PORT=8080
DATA_DIR=/data
LOG_LEVEL=info

# LLM Configuration (Optional)
DEFAULT_MODEL=gpt-4
DEFAULT_VOICE=alloy

# AWS Bedrock Configuration (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_REGION=us-east-1
EOF
    
    echo -e "${GREEN}✓ .env file created with secure random secrets${NC}"
    echo ""
fi

# Ask if user wants to customize ALLOWED_ORIGINS
read -p "Do you want to customize ALLOWED_ORIGINS? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Enter allowed origins (comma-separated):"
    echo "Example: http://localhost:3000,https://myapp.com"
    read -r ORIGINS
    sed -i.bak "s|ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$ORIGINS|" .env
    rm .env.bak 2>/dev/null || true
    echo -e "${GREEN}✓ ALLOWED_ORIGINS updated${NC}"
    echo ""
fi

# Build images
echo "Building Docker images..."
docker-compose build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Docker images built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Docker images${NC}"
    exit 1
fi
echo ""

# Start services
echo "Starting services..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Services started successfully${NC}"
else
    echo -e "${RED}✗ Failed to start services${NC}"
    exit 1
fi
echo ""

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Backend failed to start${NC}"
        echo "Check logs with: docker-compose logs backend"
        exit 1
    fi
    sleep 2
done
echo ""

# Create admin user
echo "================================"
echo "Create Admin User"
echo "================================"
echo ""
echo "You need to create an admin user to access the system."
echo ""

read -p "Do you want to create an admin user now? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    => [frontend build 4/7] COPY frontend ./frontend                               0.0s
 => [frontend build 5/7] WORKDIR /workspace/frontend                            0.0s
 => ERROR [frontend build 6/7] RUN npm ci                                       0.6s
------
 > [frontend build 6/7] RUN npm ci:
0.536 npm warn EBADENGINE Unsupported engine {
0.536 npm warn EBADENGINE   package: 'fix@0.0.3',
0.536 npm warn EBADENGINE   required: { node: '0.2.5' },
0.536 npm warn EBADENGINE   current: { node: 'v20.19.5', npm: '10.8.2' }
0.536 npm warn EBADENGINE }
0.538 npm warn EBADENGINE Unsupported engine {
0.538 npm warn EBADENGINE   package: 'pipe@0.0.1',
0.538 npm warn EBADENGINE   required: { node: '0.2.5' },
0.538 npm warn EBADENGINE   current: { node: 'v20.19.5', npm: '10.8.2' }
0.538 npm warn EBADENGINE }
0.542 npm error code EUSAGE
0.542 npm error
0.542 npm error `npm ci` can only install packages when your package.json and package-lock.json or npm-shrinkwrap.json are in sync. Please update your lock file with `npm install` before continuing.
0.542 npm error
0.542 npm error Missing: yaml@2.8.2 from lock file
0.542 npm error
0.542 npm error Clean install a project
0.542 npm error
0.542 npm error Usage:
0.542 npm error npm ci
0.542 npm error
0.542 npm error Options:
0.542 npm error [--install-strategy <hoisted|nested|shallow|linked>] [--legacy-bundling]
0.542 npm error [--global-style] [--omit <dev|optional|peer> [--omit <dev|optional|peer> ...]]
0.542 npm error [--include <prod|dev|optional|peer> [--include <prod|dev|optional|peer> ...]]
0.542 npm error [--strict-peer-deps] [--foreground-scripts] [--ignore-scripts] [--no-audit]
0.542 npm error [--no-bin-links] [--no-fund] [--dry-run]
0.542 npm error [-w|--workspace <workspace-name> [-w|--workspace <workspace-name> ...]]
0.542 npm error [-ws|--workspaces] [--include-workspace-root] [--install-links]
0.542 npm error
0.542 npm error aliases: clean-install, ic, install-clean, isntall-clean
0.542 npm error
0.542 npm error Run "npm help ci" for more info
0.542 npm error A complete log of this run can be found in: /opt/app-root/src/.npm/_logs/2025-12-21T22_45_15_638Z-debug-0.log
------
Dockerfile:16

--------------------

  14 |     # Install dependencies

  15 |     WORKDIR /workspace/frontend

  16 | >>> RUN npm ci

  17 |     

  18 |     # Build application

--------------------

target frontend: failed to solve: process "/bin/sh -c npm ci" did not complete successfully: exit code: 1



View build de
    
    if [ $? -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Admin user created successfully${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠ Failed to create admin user${NC}"
        echo "You can create it later with: docker-compose exec backend npm run create-admin"
    fi
else
    echo ""
    echo -e "${YELLOW}⚠ Skipping admin user creation${NC}"
    echo "You can create it later with: docker-compose exec backend npm run create-admin"
fi
echo ""

# Run security tests
echo "================================"
echo "Security Tests"
echo "================================"
echo ""

read -p "Do you want to run security tests? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo ""
    docker-compose exec backend ./test-security.sh
else
    echo ""
    echo -e "${YELLOW}⚠ Skipping security tests${NC}"
    echo "You can run them later with: docker-compose exec backend ./test-security.sh"
fi
echo ""

# Summary
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo -e "${GREEN}✓ Docker containers are running${NC}"
echo ""
echo "Services:"
echo "  - Backend:  http://localhost:8080"
echo "  - Frontend: http://localhost:80"
echo "  - Health:   http://localhost:8080/health"
echo ""
echo "Useful commands:"
echo "  - View logs:        docker-compose logs -f backend"
echo "  - Stop services:    docker-compose down"
echo "  - Restart:          docker-compose restart"
echo "  - Create admin:     docker-compose exec backend npm run create-admin"
echo "  - Run tests:        docker-compose exec backend ./test-security.sh"
echo ""
echo "Documentation:"
echo "  - Docker setup:     DOCKER_SECURITY_SETUP.md"
echo "  - Security guide:   SECURITY_SETUP.md"
echo "  - Quick start:      CRITICAL_FIXES_SUMMARY.md"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
