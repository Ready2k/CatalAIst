# Testing Guide - Bedrock Connection Fixes

## Quick Start Testing

### 1. Start the Backend
```bash
cd backend
npm start
```

Expected output:
```
✓ Environment variables validated
✓ Directory exists: sessions
✓ Prompt exists: classification-v1.1.txt
✓ Decision matrix will be auto-generated on first use
=== Initialization Complete ===
Server running on port 8080
```

### 2. Test Scenario: Payment Processing Example

Use the same example that caused the original errors:

**Process Description:**
```
Agents take payment details over the phone and manually enter them into the Worldpay platform.
```

**Expected Flow:**
1. System asks 2-3 initial clarification questions
2. You answer each question
3. After 5+ questions, summarization should activate
4. System classifies the process
5. Session saves successfully

### 3. What to Watch For

#### ✅ Success Indicators

**In Console Logs:**
```
[Bedrock] Found 5 Anthropic Claude models
[Classification] Raw LLM response: { "category": "Digitise" ...
Auto-extracted subject: Finance
```

**After 5+ Questions:**
```
[Classification] Using summarized context (8 Q&As)
Key Information Gathered:
- Process frequency: daily
- Current state: Manual/paper-based
```

**Session Save:**
```
Session saved successfully: <session-id>
```

#### ⚠️ Expected Warnings (Handled)

```
WARNING: TLS certificate validation is disabled
Rule "X" had targetCategory as array, using first value: Digitise
```

These are informational and handled automatically.

#### ❌ Errors That Should NOT Occur

```
❌ Failed to save session: Expected string, received array
❌ No JSON found in response. Full content: Clarification 9
❌ ZodError: targetCategory validation failed
```

If you see these, the fixes didn't work as expected.

## Detailed Test Cases

### Test Case 1: Short Conversation (< 5 Q&As)

**Goal:** Verify normal flow works

**Steps:**
1. Submit process description
2. Answer 2-3 clarification questions
3. Get classification

**Expected:**
- Full conversation history sent to LLM
- No summarization
- Classification completes
- Session saves

### Test Case 2: Long Conversation (5+ Q&As)

**Goal:** Verify summarization activates

**Steps:**
1. Submit process description
2. Answer 5+ clarification questions
3. Get classification

**Expected:**
- Summarization activates after 5th Q&A
- Log shows "Key Information Gathered"
- Classification completes with summarized context
- Session saves

**Check Logs For:**
```
[Classification] Building summarized context for 8 Q&As
Key Information Gathered:
- Process frequency: daily
- Scale: 50 users
- Current state: Manual/paper-based

Recent Questions and Answers (last 3 of 8):
Q: How many people use this process?
A: About 50 agents
```

### Test Case 3: Decision Matrix with Array TargetCategory

**Goal:** Verify array sanitization works

**Steps:**
1. Generate a new decision matrix (if needed)
2. Trigger a rule that has targetCategory as array
3. Verify it's converted to string

**Expected:**
- Warning in logs: "Rule X had targetCategory as array"
- Session saves successfully
- No Zod validation errors

### Test Case 4: Clarification Loop Detection

**Goal:** Verify loop detection works

**Steps:**
1. Submit process description
2. Answer 3-4 clarification questions
3. If system returns empty questions or asks same question twice
4. System should detect loop and force classification

**Expected:**
- Loop detected after 2 consecutive empty question responses
- Log shows: `[Clarification Loop Detected]`
- Classification returned automatically
- Audit trail shows `loopDetected: true`

**Check Audit Trail:**
```bash
# Get session logs
curl http://localhost:8080/api/audit/session/{sessionId}

# Look for:
{
  "eventType": "clarification",
  "data": {
    "loopDetected": true,
    "reason": "Multiple consecutive empty question responses",
    "action": "forced_auto_classify"
  }
}
```

### Test Case 5: LLM Confusion Detection

**Goal:** Verify "Clarification N" detection works

**Steps:**
1. If LLM returns "Clarification N" (rare with Bedrock)
2. System should detect and handle gracefully

**Expected:**
- Clarification service: Returns empty array, stops asking
- Classification service: Throws descriptive error
- Loop detection catches it and forces classification
- No infinite loops

## Monitoring Commands

### Watch Logs in Real-Time
```bash
# In backend directory
npm start | grep -E "\[Classification\]|\[Clarification\]|Error|WARNING"
```

### Check Session Files
```bash
# View saved sessions
ls -la backend/data/sessions/

# View latest session
cat backend/data/sessions/<session-id>.json | jq .
```

### Check Decision Matrix
```bash
# View decision matrix
ls -la backend/data/decision-matrix/

# View latest matrix
cat backend/data/decision-matrix/v*.json | jq .
```

## Performance Testing

### Token Usage Comparison

**Before Fixes (8 Q&As):**
```
Tokens: ~2500
Context: Full 8 Q&A pairs sent
```

**After Fixes (8 Q&As):**
```
Tokens: ~1000
Context: Key facts + last 3 Q&As
Savings: 60%
```

### Measure Token Usage
Enable debug logging in LLM service to see token counts.

## Troubleshooting

### Issue: Session Still Fails to Save

**Check:**
1. Is targetCategory still an array in the session JSON?
2. Look for Zod validation errors in logs
3. Verify the sanitization code is running

**Debug:**
```bash
# Check the session file directly
cat backend/data/sessions/<session-id>.json | jq '.classification.decisionMatrixEvaluation.triggeredRules[].action.targetCategory'
```

Should show strings, not arrays.

### Issue: LLM Still Returns "Clarification N"

**Check:**
1. Which Bedrock model are you using?
2. How many questions were asked?
3. Is summarization activating?

**Try:**
- Use a different Claude model (e.g., claude-3-sonnet instead of haiku)
- Reduce max questions in clarification service
- Check if prompt is too long

### Issue: Summarization Not Activating

**Check:**
1. Are you reaching 5+ Q&As?
2. Look for log message about summarization

**Debug:**
Add console.log in buildSummarizedContext():
```typescript
console.log(`[DEBUG] Summarization activated for ${conversationHistory.length} Q&As`);
```

## Success Criteria

✅ All tests pass if:
1. Sessions save without Zod errors
2. No "Clarification N" responses
3. Summarization activates after 5+ Q&As
4. Classification completes successfully
5. No infinite loops
6. Token usage reduced for long conversations

## Reporting Issues

If you encounter problems, collect:
1. Full error logs from console
2. Session JSON file (if created)
3. Number of Q&As before error
4. Bedrock model used
5. Process description used

Share these in the error report for faster debugging.

## Next Steps After Testing

Once testing confirms everything works:
1. ✅ Mark fixes as verified
2. 📝 Update documentation if needed
3. 🚀 Deploy to production (if applicable)
4. 📊 Monitor agreement rates for improvement
5. 🔧 Tune decision matrix based on feedback
