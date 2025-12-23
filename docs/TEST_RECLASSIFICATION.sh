#!/bin/bash
# Test script for admin reclassification feature

set -e

BASE_URL="http://localhost:8080"
API_KEY="your-api-key-here"
AWS_ACCESS_KEY="your-aws-access-key-here"
AWS_SECRET_KEY="your-aws-secret-key-here"

echo "=== Admin Reclassification Test ==="
echo ""

# Step 1: Create a test session
echo "1. Creating test session..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/process/submit" \
  -H "Content-Type: application/json" \
  -d "{
    \"description\": \"Agents manually enter customer data from paper forms into Excel spreadsheets daily. This takes about 2 hours per day and involves 20 agents.\",
    \"apiKey\": \"$API_KEY\",
    \"provider\": \"openai\",
    \"model\": \"gpt-4\"
  }")

SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')
echo "   Session ID: $SESSION_ID"
echo ""

# Step 2: Get original classification
echo "2. Getting original classification..."
ORIGINAL=$(curl -s "$BASE_URL/api/sessions/$SESSION_ID" | jq '.classification')
ORIGINAL_CATEGORY=$(echo $ORIGINAL | jq -r '.category')
ORIGINAL_CONFIDENCE=$(echo $ORIGINAL | jq -r '.confidence')
ORIGINAL_MATRIX=$(echo $ORIGINAL | jq -r '.decisionMatrixEvaluation.matrixVersion // "none"')

echo "   Category: $ORIGINAL_CATEGORY"
echo "   Confidence: $ORIGINAL_CONFIDENCE"
echo "   Matrix Version: $ORIGINAL_MATRIX"
echo ""

# Step 3: Wait a moment
echo "3. Waiting 2 seconds..."
sleep 2
echo ""

# Step 4: Reclassify
echo "4. Reclassifying with current decision matrix..."
RECLASSIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/process/reclassify" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"apiKey\": \"$API_KEY\",
    \"provider\": \"openai\",
    \"useOriginalModel\": true,
    \"reason\": \"Test reclassification script\"
  }")

echo "$RECLASSIFY_RESPONSE" | jq '.'
echo ""

# Step 5: Extract results
NEW_CATEGORY=$(echo $RECLASSIFY_RESPONSE | jq -r '.new.category')
NEW_CONFIDENCE=$(echo $RECLASSIFY_RESPONSE | jq -r '.new.confidence')
NEW_MATRIX=$(echo $RECLASSIFY_RESPONSE | jq -r '.new.matrixVersion')
CHANGED=$(echo $RECLASSIFY_RESPONSE | jq -r '.changed')
CONFIDENCE_DELTA=$(echo $RECLASSIFY_RESPONSE | jq -r '.confidenceDelta')

echo "5. Reclassification Results:"
echo "   Original: $ORIGINAL_CATEGORY ($ORIGINAL_CONFIDENCE) [Matrix: $ORIGINAL_MATRIX]"
echo "   New:      $NEW_CATEGORY ($NEW_CONFIDENCE) [Matrix: $NEW_MATRIX]"
echo "   Changed:  $CHANGED"
echo "   Confidence Δ: $CONFIDENCE_DELTA"
echo ""

# Step 6: Verify session was updated
echo "6. Verifying session was updated..."
UPDATED=$(curl -s "$BASE_URL/api/sessions/$SESSION_ID" | jq '.classification')
UPDATED_CATEGORY=$(echo $UPDATED | jq -r '.category')
UPDATED_CONFIDENCE=$(echo $UPDATED | jq -r '.confidence')

echo "   Updated Category: $UPDATED_CATEGORY"
echo "   Updated Confidence: $UPDATED_CONFIDENCE"
echo ""

# Step 7: Check audit log
echo "7. Checking audit log..."
AUDIT_LOG="backend/data/audit-logs/$(date +%Y-%m-%d).jsonl"
if [ -f "$AUDIT_LOG" ]; then
  RECLASSIFY_LOG=$(cat "$AUDIT_LOG" | jq "select(.sessionId == \"$SESSION_ID\" and .data.reclassification == true)")
  
  if [ -n "$RECLASSIFY_LOG" ]; then
    echo "   ✓ Reclassification logged in audit trail"
    echo "$RECLASSIFY_LOG" | jq '{
      reason: .data.reason,
      changed: .data.changed,
      confidenceDelta: .data.confidenceDelta
    }'
  else
    echo "   ✗ Reclassification not found in audit log"
  fi
else
  echo "   ⚠ Audit log file not found: $AUDIT_LOG"
fi
echo ""

# Step 8: Summary
echo "=== Test Summary ==="
if [ "$UPDATED_CATEGORY" == "$NEW_CATEGORY" ]; then
  echo "✓ Session successfully updated with new classification"
else
  echo "✗ Session not updated correctly"
fi

if [ "$CHANGED" == "true" ]; then
  echo "✓ Classification changed from $ORIGINAL_CATEGORY to $NEW_CATEGORY"
else
  echo "✓ Classification remained $ORIGINAL_CATEGORY (no change)"
fi

echo ""
echo "Test complete!"
