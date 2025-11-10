#!/bin/bash
# Quick script to update frontend with authentication

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================"
echo "Frontend Authentication Update"
echo "================================"
echo ""

echo "This will rebuild the frontend with the new login page."
echo ""

read -p "Continue? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Step 1: Building frontend image..."
docker-compose build frontend

echo ""
echo "Step 2: Restarting frontend..."
docker-compose restart frontend

echo ""
echo "Step 3: Waiting for frontend to be ready..."
sleep 3

echo ""
echo -e "${GREEN}✓ Frontend updated successfully!${NC}"
echo ""
echo "You can now access the application:"
echo "  - Frontend: http://localhost:80"
echo "  - Backend:  http://localhost:8080"
echo ""
echo "Login with your admin credentials or register a new account."
echo ""
