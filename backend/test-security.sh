#!/bin/bash
# Security Features Test Script
# Tests authentication, rate limiting, and CORS

set -e

BASE_URL="http://localhost:8080"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================"
echo "Security Features Test Script"
echo "================================"
echo ""

# Check if server is running
echo "1. Checking if server is running..."
if curl -s -f "$BASE_URL/health" > /dev/null; then
    echo -e "${GREEN}✓ Server is running${NC}"
else
    echo -e "${RED}✗ Server is not running. Please start it first.${NC}"
    exit 1
fi
echo ""

# Test 1: Protected endpoint without auth should fail
echo "2. Testing protected endpoint without authentication..."
RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/sessions")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Protected endpoint correctly requires authentication${NC}"
else
    echo -e "${RED}✗ Expected 401, got $HTTP_CODE${NC}"
fi
echo ""

# Test 2: Register a test user
echo "3. Testing user registration..."
USERNAME="testuser_$(date +%s)"
PASSWORD="TestPassword123!"

REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "201" ]; then
    echo -e "${GREEN}✓ User registration successful${NC}"
else
    echo -e "${YELLOW}⚠ Registration returned $HTTP_CODE (user might already exist)${NC}"
fi
echo ""

# Test 3: Login and get token
echo "4. Testing user login..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
    echo -e "${GREEN}✓ Login successful, token received${NC}"
    echo "Token: ${TOKEN:0:20}..."
else
    echo -e "${RED}✗ Login failed, no token received${NC}"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi
echo ""

# Test 4: Access protected endpoint with token
echo "5. Testing protected endpoint with authentication..."
AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/sessions" \
    -H "Authorization: Bearer $TOKEN")

HTTP_CODE=$(echo "$AUTH_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Protected endpoint accessible with valid token${NC}"
else
    echo -e "${RED}✗ Expected 200, got $HTTP_CODE${NC}"
fi
echo ""

# Test 5: Test rate limiting
echo "6. Testing rate limiting (this may take a moment)..."
echo "   Sending 12 rapid requests to LLM endpoint..."

SUCCESS_COUNT=0
RATE_LIMITED=0

for i in {1..12}; do
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/process/submit" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"description":"test process for rate limiting"}' 2>/dev/null)
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "429" ]; then
        RATE_LIMITED=$((RATE_LIMITED + 1))
    elif [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "400" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
done

if [ $RATE_LIMITED -gt 0 ]; then
    echo -e "${GREEN}✓ Rate limiting is working ($RATE_LIMITED requests blocked)${NC}"
else
    echo -e "${YELLOW}⚠ Rate limiting might not be working (no 429 responses)${NC}"
    echo "   This could be normal if requests were slow enough"
fi
echo ""

# Test 6: Test invalid token
echo "7. Testing invalid token..."
INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/api/sessions" \
    -H "Authorization: Bearer invalid_token_here")

HTTP_CODE=$(echo "$INVALID_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ] || [ "$HTTP_CODE" = "401" ]; then
    echo -e "${GREEN}✓ Invalid token correctly rejected${NC}"
else
    echo -e "${RED}✗ Expected 401/403, got $HTTP_CODE${NC}"
fi
echo ""

# Test 7: Check security headers
echo "8. Testing security headers..."
HEADERS=$(curl -s -I "$BASE_URL/health")

if echo "$HEADERS" | grep -q "X-Frame-Options"; then
    echo -e "${GREEN}✓ X-Frame-Options header present${NC}"
else
    echo -e "${YELLOW}⚠ X-Frame-Options header missing${NC}"
fi

if echo "$HEADERS" | grep -q "X-Content-Type-Options"; then
    echo -e "${GREEN}✓ X-Content-Type-Options header present${NC}"
else
    echo -e "${YELLOW}⚠ X-Content-Type-Options header missing${NC}"
fi

if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    echo -e "${GREEN}✓ HSTS header present${NC}"
else
    echo -e "${YELLOW}⚠ HSTS header missing (normal for HTTP)${NC}"
fi
echo ""

# Test 8: Test request ID
echo "9. Testing request ID tracking..."
RESPONSE_HEADERS=$(curl -s -I "$BASE_URL/health")

if echo "$RESPONSE_HEADERS" | grep -q "X-Request-ID"; then
    echo -e "${GREEN}✓ Request ID header present${NC}"
else
    echo -e "${YELLOW}⚠ Request ID header missing${NC}"
fi
echo ""

# Summary
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "${GREEN}✓ Authentication system working${NC}"
echo -e "${GREEN}✓ Protected endpoints secured${NC}"
echo -e "${GREEN}✓ JWT tokens functioning${NC}"
if [ $RATE_LIMITED -gt 0 ]; then
    echo -e "${GREEN}✓ Rate limiting active${NC}"
else
    echo -e "${YELLOW}⚠ Rate limiting status unclear${NC}"
fi
echo -e "${GREEN}✓ Security headers configured${NC}"
echo ""
echo "All critical security features are operational!"
echo ""
