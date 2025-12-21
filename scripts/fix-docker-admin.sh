#!/bin/bash
# Quick fix script for Docker admin creation issue

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "================================"
echo "Docker Admin Creation Fix"
echo "================================"
echo ""

echo "This script will:"
echo "  1. Stop current containers"
echo "  2. Rebuild backend image"
echo "  3. Start services"
echo "  4. Create admin user"
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
echo "Step 2: Rebuilding backend image..."
docker-compose build --no-cache backend

echo ""
echo "Step 3: Starting services..."
docker-compose up -d

echo ""
echo "Step 4: Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s -f http://localhost:8080/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠ Backend took longer than expected${NC}"
        echo "Check logs with: docker-compose logs backend"
    fi
    sleep 2
done

echo ""
echo "Step 5: Creating admin user..."
echo ""
docker-compose exec backend npm run create-admin

echo ""
echo -e "${GREEN}✓ Done!${NC}"
echo ""
echo "Your admin user has been created."
echo "You can now login at http://localhost:80"
echo ""
