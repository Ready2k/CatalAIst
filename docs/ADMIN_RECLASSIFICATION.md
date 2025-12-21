# Admin Reclassification Feature

## Overview

The Admin Reclassification feature allows administrators to re-evaluate existing classifications using the current decision matrix. This is essential when:
- Decision matrix rules have been updated
- Prompts have been improved
- New attributes have been added
- You want to test the impact of changes

## Use Cases

### 1. After Decision Matrix Updates
```
Scenario: You've added a new rule that adjusts confidence for high-risk processes
Action: Reclassify all sessions to see which ones are affected
Result: Updated classifications with new decision matrix applied
```

### 2. Prompt Optimization
```
Scenario: You've improved the classification prompt
Action: Reclassify a sample of sessions to compare results
Result: Measure improvement in classification accuracy
```

### 3. Model Comparison
```
Scenario: You want to compare Claude 3 Sonnet vs Claude 3.5 Sonnet
Action: Reclassify with different model
Result: Side-by-side comparison of model performance
```

### 4. Quality Assurance
```
Scenario: User disputes a classification
Action: Reclassify with current matrix to verify
Result: Confirm or update classification
```

## API Endpoint

### POST /api/process/reclassify

**Authentication:** Admin required (implement auth middleware)

**Request Body:**
```json
{
  "sessionId": "abc-123",
  "apiKey": "sk-...",
  "provider": "bedrock",
  "awsAccessKeyId": "AKIA...",
  "awsSecretAccessKey": "...",
  "awsRegion": "us-east-1",
  "userId": "admin@example.com",
  "useOriginalModel": true,
  "reason": "Testing new decision matrix v2.0"
}
```

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `sessionId` | string | Yes | - | Session to reclassify |
| `apiKey` | string | Conditional | - | OpenAI API key (if using OpenAI) |
| `awsAccessKeyId` | string | Conditional | - | AWS access key (if using Bedrock) |
| `awsSecretAccessKey` | string | Conditional | - | AWS secret key (if using Bedrock) |
| `awsSessionToken` | string | No | - | AWS session token (if using temporary credentials) |
| `awsRegion` | string | No | 'us-east-1' | AWS region for Bedrock |
| `provider` | string | No | From original | LLM provider ('openai' or 'bedrock') |
| `userId` | string | No | 'admin' | Admin user ID for audit trail |
| `model` | string | No | From original | Specific model to use |
| `useOriginalModel` | boolean | No | true | Use the model from original classification |
| `reason` | string | No | 'Admin reclassification' | Reason for reclassification |

**Response:**
```json
{
  "sessionId": "abc-123",
  "reclassified": true,
  "original": {
    "category": "Digitise",
    "confidence": 0.75,
    "matrixVersion": "1.0"
  },
  "new": {
    "category": "RPA",
    "confidence": 0.82,
    "matrixVersion": "2.0"
  },
  "changed": true,
  "confidenceDelta": 0.07,
  "decisionMatrixEvaluation": {
    "matrixVersion": "2.0",
    "triggeredRules": [
      {
        "ruleId": "rule-456",
        "ruleName": "High Frequency Low Complexity",
        "action": {
          "type": "override",
          "targetCategory": "RPA",
          "rationale": "Daily repetitive task with low complexity favors RPA"
        }
      }
    ],
    "overridden": true
  },
  "extractedAttributes": {
    "frequency": { "value": "daily", "explanation": "..." },
    "complexity": { "value": "low", "explanation": "..." }
  },
  "responseTime": 3456
}
```

## Examples

### Example 1: Reclassify with Current Matrix
```bash
curl -X POST http://localhost:8080/api/process/reclassify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "sessionId": "abc-123",
    "apiKey": "sk-...",
    "reason": "Testing decision matrix v2.0"
  }'
```

**Expected Response:**
```json
{
  "sessionId": "abc-123",
  "reclassified": true,
  "original": {
    "category": "Digitise",
    "confidence": 0.75,
    "matrixVersion": "1.0"
  },
  "new": {
    "category": "RPA",
    "confidence": 0.82,
    "matrixVersion": "2.0"
  },
  "changed": true,
  "confidenceDelta": 0.07
}
```

### Example 2: Reclassify with Different Model
```bash
curl -X POST http://localhost:8080/api/process/reclassify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "sessionId": "abc-123",
    "provider": "bedrock",
    "awsAccessKeyId": "AKIA...",
    "awsSecretAccessKey": "...",
    "model": "anthropic.claude-3-7-sonnet-20250219-v1:0",
    "useOriginalModel": false,
    "reason": "Comparing Claude 3.5 Sonnet performance"
  }'
```

### Example 3: Batch Reclassification Script
```bash
#!/bin/bash
# Reclassify all sessions from a specific date

SESSIONS=$(curl http://localhost:8080/api/analytics/sessions?dateFrom=2025-11-01 | jq -r '.sessions[].sessionId')

for SESSION_ID in $SESSIONS; do
  echo "Reclassifying $SESSION_ID..."
  
  curl -X POST http://localhost:8080/api/process/reclassify \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <admin-token>" \
    -d "{
      \"sessionId\": \"$SESSION_ID\",
      \"apiKey\": \"sk-...\",
      \"reason\": \"Batch reclassification with matrix v2.0\"
    }"
  
  sleep 1  # Rate limiting
done
```

## Audit Trail

Every reclassification is logged with full details:

```json
{
  "sessionId": "abc-123",
  "timestamp": "2025-11-11T15:30:00.000Z",
  "eventType": "classification",
  "userId": "admin@example.com",
  "data": {
    "reclassification": true,
    "reason": "Testing new decision matrix v2.0",
    "originalClassification": {
      "category": "Digitise",
      "confidence": 0.75,
      "matrixVersion": "1.0"
    },
    "newClassification": {
      "category": "RPA",
      "confidence": 0.82,
      "matrixVersion": "2.0"
    },
    "changed": true,
    "confidenceDelta": 0.07
  },
  "modelPrompt": "[system]: You are an expert...",
  "modelResponse": "{\"category\": \"RPA\", ...}",
  "metadata": {
    "modelVersion": "anthropic.claude-3-sonnet-20240229-v1:0",
    "llmProvider": "bedrock",
    "latencyMs": 2345,
    "decisionMatrixVersion": "2.0"
  }
}
```

## Comparison Analysis

### View Reclassification History
```bash
# Get all reclassifications for a session
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.sessionId == "abc-123" and .data.reclassification == true)'
```

### Compare Original vs Reclassified
```bash
# Get classification changes
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.data.reclassification == true) | {
    sessionId,
    original: .data.originalClassification.category,
    new: .data.newClassification.category,
    changed: .data.changed,
    confidenceDelta: .data.confidenceDelta
  }'
```

### Measure Matrix Impact
```bash
# Count how many classifications changed
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.data.reclassification == true and .data.changed == true)' | \
  wc -l
```

## Best Practices

### 1. Document Reason
Always provide a clear reason for reclassification:
```json
{
  "reason": "Testing decision matrix v2.0 - added high-frequency RPA rule"
}
```

### 2. Test on Sample First
Before batch reclassification:
1. Reclassify 5-10 sessions manually
2. Review the changes
3. Verify decision matrix is working as expected
4. Then proceed with batch

### 3. Compare Models
When testing new models:
```bash
# Original model
curl -X POST .../reclassify -d '{"sessionId": "...", "useOriginalModel": true}'

# New model
curl -X POST .../reclassify -d '{"sessionId": "...", "model": "new-model", "useOriginalModel": false}'
```

### 4. Monitor Confidence Changes
Track confidence delta to measure improvement:
```bash
# Average confidence change
cat backend/data/audit-logs/*.jsonl | \
  jq 'select(.data.reclassification == true) | .data.confidenceDelta' | \
  awk '{sum+=$1; count++} END {print sum/count}'
```

### 5. Preserve Original
The original classification is preserved in the audit log, so you can always:
- Compare before/after
- Rollback if needed
- Analyze the impact

## Security Considerations

### Authentication Required
This endpoint should be protected with admin authentication:

```typescript
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

router.post('/reclassify', 
  authenticateToken, 
  requireRole('admin'), 
  async (req: Request, res: Response) => {
    // Reclassification logic
  }
);
```

### Rate Limiting
Implement stricter rate limits for reclassification:

```typescript
import rateLimit from 'express-rate-limit';

const reclassifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per 15 minutes
  message: { error: 'Too many reclassification requests' }
});

router.post('/reclassify', reclassifyLimiter, ...);
```

### Audit Logging
All reclassifications are logged with:
- Admin user ID
- Reason for reclassification
- Original and new classifications
- Full LLM prompt and response

## Error Handling

### Session Not Found
```json
{
  "error": "Session not found",
  "sessionId": "invalid-id"
}
```

### No Classification
```json
{
  "error": "No classification found",
  "message": "Session has not been classified yet"
}
```

### Missing Credentials
```json
{
  "error": "Missing AWS credentials",
  "message": "AWS Access Key ID and Secret Access Key are required for Bedrock"
}
```

## Performance Considerations

### Batch Reclassification
For large batches:
1. Use rate limiting (1-2 requests/second)
2. Process in chunks (e.g., 100 sessions at a time)
3. Monitor LLM API costs
4. Consider running during off-peak hours

### Cost Estimation
```
Cost per reclassification:
- LLM API call: ~$0.01-0.05 (depending on model)
- Attribute extraction: ~$0.01-0.02
- Total: ~$0.02-0.07 per session

For 1000 sessions: ~$20-70
```

## Integration with Analytics

### Update Analytics After Reclassification
The endpoint automatically:
- Updates the session with new classification
- Invalidates analytics cache
- Triggers recalculation of metrics

### View Impact in Dashboard
After reclassification:
1. Go to Analytics Dashboard
2. Filter by date range
3. Compare metrics before/after
4. Check agreement rate changes

## Testing

### Test Reclassification
```bash
# 1. Create a test session
SESSION_ID=$(curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test process",
    "apiKey": "..."
  }' | jq -r '.sessionId')

# 2. Get original classification
curl http://localhost:8080/api/sessions/$SESSION_ID | \
  jq '.classification'

# 3. Reclassify
curl -X POST http://localhost:8080/api/process/reclassify \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"apiKey\": \"...\",
    \"reason\": \"Test reclassification\"
  }"

# 4. Verify new classification
curl http://localhost:8080/api/sessions/$SESSION_ID | \
  jq '.classification'
```

## Future Enhancements

1. **Bulk Reclassification API**
   - Reclassify multiple sessions in one request
   - Progress tracking
   - Batch results summary

2. **Scheduled Reclassification**
   - Automatically reclassify when matrix updates
   - Configurable rules for auto-reclassification

3. **A/B Testing**
   - Compare two decision matrices
   - Statistical significance testing
   - Recommendation engine

4. **Rollback Feature**
   - Revert to previous classification
   - Undo reclassification
   - Version history

5. **Impact Preview**
   - Estimate impact before reclassifying
   - Show which sessions would change
   - Confidence distribution changes

## Files Changed

- `backend/src/routes/process.routes.ts` - Added `/reclassify` endpoint

## Build Status

✅ TypeScript compilation successful
✅ No diagnostics errors
✅ Ready for testing

## Next Steps

1. ✅ Code complete and builds successfully
2. ⏳ Add admin authentication middleware
3. ⏳ Add rate limiting
4. ⏳ Test with Bedrock
5. ⏳ Create frontend UI for reclassification
6. ⏳ Add bulk reclassification feature
