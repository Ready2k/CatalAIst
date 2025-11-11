# Test: Analytics Dashboard Session Visibility

## Quick Test - Verify Sessions Appear

### Test 1: Normal Classification
```bash
# 1. Submit process
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Agents manually enter data from paper forms into Excel spreadsheets daily",
    "apiKey": "...",
    "provider": "bedrock",
    "awsAccessKeyId": "...",
    "awsSecretAccessKey": "..."
  }'

# Response: { "sessionId": "abc-123", ... }

# 2. Answer 1-2 questions
curl -X POST http://localhost:8080/api/process/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123",
    "questions": ["How many agents use this process?"],
    "answers": ["About 20 agents"]
  }'

# 3. Check Analytics Dashboard
curl http://localhost:8080/api/analytics/sessions | jq '.sessions[] | select(.sessionId == "abc-123")'

# ✅ Expected: Session appears with classification
```

### Test 2: Loop Detection (Skip Clarification)
```bash
# 1. Submit process
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test process for loop detection",
    "apiKey": "...",
    "provider": "bedrock",
    "awsAccessKeyId": "...",
    "awsSecretAccessKey": "..."
  }'

# Response: { "sessionId": "def-456", ... }

# 2. Answer questions with empty questions array (twice to trigger loop)
curl -X POST http://localhost:8080/api/process/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "def-456",
    "questions": [],
    "answers": ["Answer 1"]
  }'

curl -X POST http://localhost:8080/api/process/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "def-456",
    "questions": [],
    "answers": ["Answer 2"]
  }'

# Response: { "classification": {...}, "loopDetected": true }

# 3. Check session saved
curl http://localhost:8080/api/sessions/def-456 | jq '.classification'

# ✅ Expected: Classification exists

# 4. Check Analytics Dashboard
curl http://localhost:8080/api/analytics/sessions | jq '.sessions[] | select(.sessionId == "def-456")'

# ✅ Expected: Session appears with status='completed'
```

### Test 3: Manual Review
```bash
# 1. Submit vague process (to trigger manual review)
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "We do some stuff",
    "apiKey": "...",
    "provider": "bedrock",
    "awsAccessKeyId": "...",
    "awsSecretAccessKey": "..."
  }'

# Response: { "sessionId": "ghi-789", ... }

# 2. Answer questions (if asked)
# ... (may trigger manual review immediately or after questions)

# 3. Check session saved
curl http://localhost:8080/api/sessions/ghi-789 | jq '.classification, .status'

# ✅ Expected: 
# - classification exists
# - status = "manual_review"

# 4. Check Analytics Dashboard
curl http://localhost:8080/api/analytics/sessions?status=manual_review | jq '.sessions[] | select(.sessionId == "ghi-789")'

# ✅ Expected: Session appears with requiresAttention=true
```

## Visual Test - Frontend

### 1. Open Analytics Dashboard
```
http://localhost:3000/analytics
```

### 2. Check Session List
- ✅ All sessions should appear
- ✅ Loop-detected sessions show status='completed'
- ✅ Manual review sessions show status='manual_review'
- ✅ Session counts are accurate

### 3. Filter by Status
- Select "Manual Review" filter
- ✅ Manual review sessions appear
- Select "Completed" filter
- ✅ Loop-detected sessions appear

### 4. Click on Session
- ✅ Classification details shown
- ✅ Decision matrix evaluation shown (if applicable)
- ✅ Conversation history shown
- ✅ Can provide feedback

## Verification Checklist

After running tests, verify:

### Session Storage
- [ ] Session file exists in `backend/data/sessions/{sessionId}.json`
- [ ] Session has `classification` object
- [ ] Session has correct `status` ('completed' or 'manual_review')
- [ ] Session has `decisionMatrixEvaluation` (if decision matrix exists)

### Audit Trail
- [ ] Classification event logged in audit trail
- [ ] Loop detection logged (if applicable)
- [ ] All events have correct timestamps

### Analytics Dashboard
- [ ] Session appears in session list
- [ ] Session count is accurate
- [ ] Category distribution includes session
- [ ] Confidence metrics include session
- [ ] Can filter by status
- [ ] Can click and view details

### API Responses
- [ ] `/api/sessions/{sessionId}` returns complete session
- [ ] `/api/analytics/sessions` includes session
- [ ] `/api/analytics/metrics` includes session in counts
- [ ] `/api/audit/session/{sessionId}` shows classification event

## Common Issues

### Issue: Session still not appearing

**Check:**
```bash
# 1. Verify session file exists
ls -la backend/data/sessions/ | grep {sessionId}

# 2. Check session content
cat backend/data/sessions/{sessionId}.json | jq .

# 3. Check if classification is null
cat backend/data/sessions/{sessionId}.json | jq '.classification'
```

**If classification is null:**
- Loop detection may not have saved properly
- Check backend logs for errors
- Verify `analyticsService.invalidateCache()` was called

### Issue: Session appears but no classification

**Check:**
```bash
# Check session status
cat backend/data/sessions/{sessionId}.json | jq '.status'

# If status is 'active', classification never completed
# If status is 'completed' or 'manual_review', classification should exist
```

**Fix:**
- Re-run the classification
- Check for errors in backend logs

### Issue: Analytics cache not updating

**Fix:**
```bash
# Restart backend to clear cache
cd backend && npm start
```

## Success Criteria

✅ All tests pass if:
1. Normal classification sessions appear
2. Loop-detected sessions appear with status='completed'
3. Manual review sessions appear with status='manual_review'
4. All sessions have classification data
5. Analytics Dashboard shows accurate counts
6. Can view details of all sessions
7. Can provide feedback on all sessions

## Monitoring

### Watch for these log messages:

**✅ Good:**
```
Session saved successfully: abc-123
[Clarification Loop Detected] Forcing classification
Classification logged for session: abc-123
Analytics cache invalidated
```

**❌ Bad (should not occur):**
```
Failed to save session
Classification is null
Session not found in analytics
```

## Next Steps

After verifying all tests pass:
1. ✅ Mark Analytics Dashboard fix as verified
2. 📊 Monitor session counts in production
3. 🔍 Check for any missing sessions
4. 📈 Verify agreement rate calculations are accurate
5. 🎯 Confirm learning system has complete data
