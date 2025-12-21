#!/bin/bash

# Quick script to create frontend/.env.local

echo "Creating frontend/.env.local..."

cat > frontend/.env.local << 'EOF'
# Frontend Local Development Configuration

# Frontend port
PORT=4001

# Backend API URL
REACT_APP_API_URL=http://localhost:4000
EOF

echo "✅ Created frontend/.env.local"
echo ""
echo "Contents:"
cat frontend/.env.local
