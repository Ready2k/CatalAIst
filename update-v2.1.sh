#!/bin/bash
# Update script for v2.1.0 - User Management

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================"
echo "CatalAIst v2.1.0 Update"
echo "User Management Feature"
echo "================================"
echo ""

echo "This will rebuild backend and frontend with user management features."
echo ""

read -p "Continue? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Step 1: Stopping containers..."
docker-compose down

echo ""
echo "Step 2: Rebuilding backend..."
docker-compose build --no-cache backend

echo ""
echo "Step 3: Rebuilding frontend..."
docker-compose build --no-cache frontend

echo ""
echo "Step 4: Starting services..."
docker-compose up -d

echo ""
echo "Step 5: Waiting for services to be ready..."
sleep 5

# Check backend health
if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is ready${NC}"
else
    echo -e "${YELLOW}⚠ Backend might not be ready yet${NC}"
    echo "Check logs with: docker-compose logs backend"
fi

echo ""
echo -e "${GREEN}✓ Update complete!${NC}"
echo ""
echo "New Features in v2.1.0:"
echo "  - User Management GUI (admin only)"
echo "  - Role management (admin/user)"
echo "  - Password reset (admin can reset any user)"
echo "  - User deletion with safety checks"
echo ""
echo "To access:"
echo "  1. Login as admin"
echo "  2. Click 'Users' in navigation"
echo "  3. Manage users through the GUI"
echo ""
echo "Frontend: http://localhost:80"
echo "Backend:  http://localhost:8080"
echo ""
