#!/bin/bash
# Local Development Setup Script (No Docker)

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "================================"
echo "CatalAIst Local Development Setup"
echo "================================"
echo ""

# Check Node.js
echo "Checking prerequisites..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠ Node.js not found${NC}"
    echo "Please install Node.js 20+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
    echo -e "${YELLOW}⚠ Node.js version $NODE_VERSION is too old${NC}"
    echo "Please upgrade to Node.js 20+ from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"
echo ""

# Create .env if it doesn't exist
if [ -f .env ]; then
    echo -e "${YELLOW}⚠ .env file already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing .env file"
        SKIP_ENV=true
    fi
fi

if [ "$SKIP_ENV" != "true" ]; then
    echo "Creating .env file with secure secrets..."
    
    JWT_SECRET=$(openssl rand -base64 32)
    PII_KEY=$(openssl rand -base64 32)
    CRED_KEY=$(openssl rand -base64 32)
    
    cat > .env << EOF
# Security Configuration (REQUIRED)
JWT_SECRET=$JWT_SECRET
PII_ENCRYPTION_KEY=$PII_KEY
CREDENTIALS_ENCRYPTION_KEY=$CRED_KEY

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8080

# Server Configuration
NODE_ENV=development
PORT=8080
DATA_DIR=./data
LOG_LEVEL=debug

# LLM Configuration (Optional)
DEFAULT_MODEL=gpt-4
DEFAULT_VOICE=alloy

# AWS Bedrock Configuration (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_REGION=us-east-1
EOF
    
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
fi

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
echo ""

# Build backend
echo "Building backend..."
npm run build
echo -e "${GREEN}✓ Backend built${NC}"
echo ""

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd ../frontend
npm install
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
echo ""

# Create data directories
echo "Creating data directories..."
cd ..
mkdir -p data/{sessions,audit-logs,prompts,audio,audio/cache,analytics,pii-mappings,decision-matrix,learning,users}
echo -e "${GREEN}✓ Data directories created${NC}"
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
    cd backend
    npm run create-admin:dev
    cd ..
    echo ""
    echo -e "${GREEN}✓ Admin user created${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠ Skipping admin user creation${NC}"
    echo "You can create it later with: cd backend && npm run create-admin:dev"
fi
echo ""

# Summary
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo -e "${GREEN}✓ Backend built${NC}"
echo -e "${GREEN}✓ Environment configured${NC}"
echo -e "${GREEN}✓ Data directories created${NC}"
echo ""
echo "To start development:"
echo ""
echo -e "${BLUE}Terminal 1 (Backend):${NC}"
echo "  cd backend"
echo "  npm run dev"
echo ""
echo -e "${BLUE}Terminal 2 (Frontend):${NC}"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "Then access:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend:  http://localhost:8080"
echo ""
echo "Documentation:"
echo "  - LOCAL_DEVELOPMENT.md - Complete local dev guide"
echo "  - README.md - Main documentation"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
echo ""
