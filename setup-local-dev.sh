#!/bin/bash

# Local Development Setup Script
# Sets up CatalAIst for local development with ports 4000 (backend) and 4001 (frontend)

set -e

echo "🚀 CatalAIst Local Development Setup"
echo "===================================="
echo ""

# Check if .env exists
if [ -f .env ]; then
    echo "✅ .env file exists"
else
    echo "📝 Creating .env file from example..."
    cp .env.example .env
    
    # Generate secure secrets
    echo "🔐 Generating secure secrets..."
    JWT_SECRET=$(openssl rand -base64 32)
    PII_KEY=$(openssl rand -base64 32)
    CRED_KEY=$(openssl rand -base64 32)
    
    # Update .env with generated secrets
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/your-super-secret-jwt-key-change-this/$JWT_SECRET/" .env
        sed -i '' "s/your-pii-encryption-key-change-this/$PII_KEY/" .env
        sed -i '' "s/your-credentials-key-change-this/$CRED_KEY/" .env
    else
        # Linux
        sed -i "s/your-super-secret-jwt-key-change-this/$JWT_SECRET/" .env
        sed -i "s/your-pii-encryption-key-change-this/$PII_KEY/" .env
        sed -i "s/your-credentials-key-change-this/$CRED_KEY/" .env
    fi
    
    echo "✅ .env file created with secure secrets"
fi

# Check if frontend/.env.local exists
if [ -f frontend/.env.local ]; then
    echo "✅ frontend/.env.local exists"
else
    echo "📝 Creating frontend/.env.local..."
    cp frontend/.env.example frontend/.env.local
    echo "✅ frontend/.env.local created"
fi

# Verify port configuration
echo ""
echo "🔍 Verifying configuration..."
BACKEND_PORT=$(grep "^PORT=" .env | cut -d'=' -f2)
FRONTEND_PORT=$(grep "^PORT=" frontend/.env.local | cut -d'=' -f2)
API_URL=$(grep "^REACT_APP_API_URL=" frontend/.env.local | cut -d'=' -f2)

echo "   Backend port: $BACKEND_PORT"
echo "   Frontend port: $FRONTEND_PORT"
echo "   API URL: $API_URL"

if [ "$BACKEND_PORT" != "4000" ]; then
    echo "⚠️  Warning: Backend port is $BACKEND_PORT, expected 4000"
fi

if [ "$FRONTEND_PORT" != "4001" ]; then
    echo "⚠️  Warning: Frontend port is $FRONTEND_PORT, expected 4001"
fi

if [ "$API_URL" != "http://localhost:4000" ]; then
    echo "⚠️  Warning: API URL is $API_URL, expected http://localhost:4000"
fi

# Check if dependencies are installed
echo ""
echo "📦 Checking dependencies..."

if [ ! -d "backend/node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
    echo "✅ Backend dependencies installed"
else
    echo "✅ Backend dependencies already installed"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
    echo "✅ Frontend dependencies installed"
else
    echo "✅ Frontend dependencies already installed"
fi

# Build backend
echo ""
echo "🔨 Building backend..."
cd backend
npm run build
cd ..
echo "✅ Backend built successfully"

# Create data directories
echo ""
echo "📁 Creating data directories..."
mkdir -p data/{sessions,audit-logs,prompts,audio,audio/cache,analytics,pii-mappings,decision-matrix,learning,users}
echo "✅ Data directories created"

# Check if admin user exists
echo ""
if [ -f "data/users/users.json" ]; then
    echo "✅ Admin user already exists"
else
    echo "👤 Admin user not found"
    echo ""
    echo "Please create an admin user:"
    echo "   cd backend"
    echo "   npm run create-admin:dev"
    echo ""
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Create admin user (if not done):"
echo "   cd backend"
echo "   npm run create-admin:dev"
echo ""
echo "2. Start backend (Terminal 1):"
echo "   cd backend"
echo "   npm run dev"
echo ""
echo "3. Start frontend (Terminal 2):"
echo "   cd frontend"
echo "   npm start"
echo ""
echo "4. Access application:"
echo "   Frontend: http://localhost:4001"
echo "   Backend:  http://localhost:4000"
echo "   Health:   http://localhost:4000/health"
echo ""
echo "🎉 Happy coding!"
