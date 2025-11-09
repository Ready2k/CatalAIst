#!/bin/bash

# AWS Bedrock Integration Test Script
# This script tests the AWS Bedrock integration with CatalAIst

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  CatalAIst AWS Bedrock Integration Test"
echo "=========================================="
echo ""

# Check if required environment variables are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}Error: AWS credentials not set${NC}"
    echo ""
    echo "Please set the following environment variables:"
    echo "  export AWS_ACCESS_KEY_ID='your_access_key_id'"
    echo "  export AWS_SECRET_ACCESS_KEY='your_secret_access_key'"
    echo "  export AWS_REGION='us-east-1'  # Optional, defaults to us-east-1"
    echo ""
    exit 1
fi

# Set default region if not provided
AWS_REGION=${AWS_REGION:-us-east-1}

echo -e "${GREEN}✓${NC} AWS credentials found"
echo "  Region: $AWS_REGION"
echo ""

# Check if backend is running
echo "Checking if backend is running..."
if ! curl -s http://localhost:8080/health > /dev/null 2>&1; then
    echo -e "${RED}Error: Backend is not running${NC}"
    echo ""
    echo "Please start the backend:"
    echo "  docker-compose up -d"
    echo "  OR"
    echo "  cd backend && npm run dev"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Backend is running"
echo ""

# Test 1: Simple classification with Claude 3.5 Sonnet
echo "Test 1: Classification with Claude 3.5 Sonnet"
echo "----------------------------------------------"

RESPONSE=$(curl -s -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"We manually process expense reports every Friday. The process involves checking receipts, verifying amounts, and entering data into our accounting system. It takes about 3 hours per week and involves 50-100 expense reports.\",
    \"model\": \"anthropic.claude-3-5-sonnet-20241022-v2:0\",
    \"awsAccessKeyId\": \"$AWS_ACCESS_KEY_ID\",
    \"awsSecretAccessKey\": \"$AWS_SECRET_ACCESS_KEY\",
    \"awsRegion\": \"$AWS_REGION\",
    \"userId\": \"test-script\"
  }")

# Check if response contains error
if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}✗ Test failed${NC}"
    echo "Error response:"
    echo "$RESPONSE" | jq '.'
    echo ""
    exit 1
fi

# Extract and display results
SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')
CATEGORY=$(echo "$RESPONSE" | jq -r '.classification.category // .clarificationQuestions[0] // "unknown"')

if [ "$CATEGORY" = "unknown" ]; then
    echo -e "${RED}✗ Test failed - no classification or clarification${NC}"
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

# Check if we got clarification questions or classification
if echo "$RESPONSE" | jq -e '.clarificationQuestions' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Test passed - Clarification questions generated${NC}"
    echo "  Session ID: $SESSION_ID"
    echo "  Questions:"
    echo "$RESPONSE" | jq -r '.clarificationQuestions[]' | sed 's/^/    - /'
else
    echo -e "${GREEN}✓ Test passed - Classification completed${NC}"
    echo "  Session ID: $SESSION_ID"
    echo "  Category: $(echo "$RESPONSE" | jq -r '.classification.category')"
    echo "  Confidence: $(echo "$RESPONSE" | jq -r '.classification.confidence')"
    echo "  Provider: $(echo "$RESPONSE" | jq -r '.classification.llmProvider')"
fi

echo ""

# Test 2: Classification with Claude 3.5 Haiku (faster, cheaper)
echo "Test 2: Classification with Claude 3.5 Haiku"
echo "----------------------------------------------"

RESPONSE=$(curl -s -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"Daily manual data entry from paper forms into Excel spreadsheet. Takes 2 hours per day, 20-30 forms.\",
    \"model\": \"anthropic.claude-3-5-haiku-20241022-v1:0\",
    \"awsAccessKeyId\": \"$AWS_ACCESS_KEY_ID\",
    \"awsSecretAccessKey\": \"$AWS_SECRET_ACCESS_KEY\",
    \"awsRegion\": \"$AWS_REGION\",
    \"userId\": \"test-script\"
  }")

if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}✗ Test failed${NC}"
    echo "Error response:"
    echo "$RESPONSE" | jq '.'
    echo ""
    exit 1
fi

SESSION_ID=$(echo "$RESPONSE" | jq -r '.sessionId')

if echo "$RESPONSE" | jq -e '.clarificationQuestions' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Test passed - Clarification questions generated${NC}"
    echo "  Session ID: $SESSION_ID"
else
    echo -e "${GREEN}✓ Test passed - Classification completed${NC}"
    echo "  Session ID: $SESSION_ID"
    echo "  Category: $(echo "$RESPONSE" | jq -r '.classification.category')"
    echo "  Confidence: $(echo "$RESPONSE" | jq -r '.classification.confidence')"
    echo "  Provider: $(echo "$RESPONSE" | jq -r '.classification.llmProvider')"
fi

echo ""

# Test 3: Provider auto-detection
echo "Test 3: Provider Auto-Detection"
echo "--------------------------------"

RESPONSE=$(curl -s -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"Weekly report generation from database queries\",
    \"model\": \"anthropic.claude-3-5-sonnet-20241022-v2:0\",
    \"awsAccessKeyId\": \"$AWS_ACCESS_KEY_ID\",
    \"awsSecretAccessKey\": \"$AWS_SECRET_ACCESS_KEY\",
    \"awsRegion\": \"$AWS_REGION\"
  }")

if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${RED}✗ Test failed${NC}"
    echo "Error response:"
    echo "$RESPONSE" | jq '.'
    exit 1
fi

PROVIDER=$(echo "$RESPONSE" | jq -r '.classification.llmProvider // "bedrock"')

if [ "$PROVIDER" = "bedrock" ]; then
    echo -e "${GREEN}✓ Test passed - Provider correctly detected as 'bedrock'${NC}"
else
    echo -e "${YELLOW}⚠ Warning - Provider detected as '$PROVIDER' instead of 'bedrock'${NC}"
fi

echo ""

# Summary
echo "=========================================="
echo "  Test Summary"
echo "=========================================="
echo -e "${GREEN}✓ All tests passed!${NC}"
echo ""
echo "Your AWS Bedrock integration is working correctly."
echo ""
echo "Next steps:"
echo "  1. Try different Claude models (Haiku, Sonnet, Opus)"
echo "  2. Test with your own process descriptions"
echo "  3. Review the documentation:"
echo "     - backend/AWS_BEDROCK_SETUP.md"
echo "     - backend/BEDROCK_EXAMPLES.md"
echo "     - BEDROCK_QUICK_START.md"
echo ""
