#!/bin/bash
# Test the new users endpoint

echo "Testing v2.1.0 User Management Endpoints"
echo "========================================"
echo ""

# Get admin token
echo "1. Logging in as admin..."
read -p "Enter admin username: " USERNAME
read -sp "Enter admin password: " PASSWORD
echo ""

TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | jq -r '.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    echo "❌ Login failed"
    exit 1
fi

echo "✓ Login successful"
echo ""

# Test users endpoint
echo "2. Testing GET /api/auth/users..."
RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:8080/api/auth/users \
  -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo "✓ Users endpoint works!"
    echo ""
    echo "Users:"
    echo "$BODY" | jq '.users[] | {username, role, createdAt}'
else
    echo "❌ Failed with status $HTTP_CODE"
    echo "$BODY"
    exit 1
fi

echo ""
echo "✅ All tests passed!"
echo ""
echo "You can now access user management:"
echo "  1. Login as admin at http://localhost"
echo "  2. Click 'Users' in navigation"
echo "  3. Manage users through the GUI"
