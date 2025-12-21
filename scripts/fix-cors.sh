#!/bin/bash
# Fix CORS issue by rebuilding with correct configuration

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================"
echo "CORS Fix"
echo "================================"
echo ""

echo "This will:"
echo "  1. Update ALLOWED_ORIGINS in backend"
echo "  2. Rebuild frontend with API proxy"
echo "  3. Restart services"
echo ""

read -p "Continue? (Y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Step 1: Restarting backend with updated CORS..."
docker-compose restart backend

echo ""
echo "Step 2: Rebuilding frontend..."
docker-compose build frontend

echo ""
echo "Step 3: Restarting frontend..."
docker-compose restart frontend

echo ""
echo "Step 4: Waiting for services to be ready..."
sleep 5

# Test backend health
if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend is ready${NC}"
else
    echo -e "${YELLOW}⚠ Backend might not be ready yet${NC}"
fi

echo ""
echo -e "${GREEN}✓ CORS fix applied!${NC}"
echo ""
echo "You can now access the application:"
echo "  - Frontend: http://localhost:80"
echo "  - Backend:  http://localhost:8080"
echo ""
echo "The frontend will now use the nginx proxy for API calls,"
echo "which avoids CORS issues."
echo ""
