# Quick Reference - Loop Detection & Fixes

## 🚨 Problem: Clarification Loops

**Symptoms:**
- Same question asked repeatedly
- Empty questions array in audit trail
- User stuck answering forever
- "Clarification N" responses

## ✅ Solution: Multi-Layer Detection

### Detection Points

#### 1️⃣ Early Detection (Answer Submission)
**Location:** `/api/process/clarify` (start)
**Trigger:** Answers submitted without questions
**Action:** Force classification immediately

#### 2️⃣ Late Detection (Question Generation)
**Location:** `/api/process/clarify` (after classification)
**Trigger:** Empty questions array or `shouldClarify = false`
**Action:** Force auto-classify

#### 3️⃣ LLM Detection (Response Parsing)
**Location:** `clarification.service.ts` / `classification.service.ts`
**Trigger:** "Clarification N" pattern in response
**Action:** Return empty array or throw error

## 🔍 How to Check for Loops

### Check Audit Trail
```bash
curl http://localhost:8080/api/audit/session/{sessionId} | jq '.[] | select(.eventType == "clarification")'
```

### Look For
```json
{
  "data": {
    "questions": [],  // ← Empty questions
    "answers": ["..."],
    "questionCount": 0
  }
}
```

### Loop Detected
```json
{
  "data": {
    "loopDetected": true,
    "reason": "Multiple consecutive empty question responses",
    "emptyQuestionCount": 2,
    "action": "forced_auto_classify"
  }
}
```

## 📊 Thresholds

| Threshold | Value | Reason |
|-----------|-------|--------|
| Empty questions to detect loop | 2 | Balance between false positives and user frustration |
| Soft limit (warning) | 8 questions | Alert but continue |
| Hard limit (stop) | 15 questions | Absolute maximum |
| Summarization activation | 5+ Q&As | Prevent token bloat |

## 🔧 Configuration

### Adjust Loop Detection Threshold
**File:** `backend/src/routes/process.routes.ts`
```typescript
if (emptyQuestionCount >= 2) {  // ← Change this
  // Detect loop
}
```

### Adjust Question Limits
**File:** `backend/src/services/clarification.service.ts`
```typescript
private readonly SOFT_LIMIT_QUESTIONS = 8;  // ← Change this
private readonly HARD_LIMIT_QUESTIONS = 15; // ← Change this
```

### Adjust Summarization Threshold
**File:** `backend/src/services/classification.service.ts`
```typescript
if (conversationHistory.length >= 5) {  // ← Change this
  // Use summarization
}
```

## 📝 Log Messages

### ✅ Good
```
[Classification] Using summarized context (8 Q&As)
[Clarification] Stopping clarification: High confidence
Session saved successfully
```

### ⚠️ Warning (Expected)
```
[Clarification Loop Detected] Session abc-123 has 2 consecutive empty question responses
Rule "X" had targetCategory as array, using first value
```

### ❌ Error (Should Not Occur)
```
Failed to save session: Zod validation error
No JSON found in response: Clarification 9
Asking question 16 of 15
```

## 🧪 Quick Test

### Test Loop Detection
```bash
# 1. Submit process
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test process",
    "apiKey": "...",
    "provider": "bedrock",
    "awsAccessKeyId": "...",
    "awsSecretAccessKey": "..."
  }'

# 2. Answer questions normally (2-3 times)
curl -X POST http://localhost:8080/api/process/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "...",
    "questions": ["Q1"],
    "answers": ["A1"]
  }'

# 3. Simulate empty questions (twice)
curl -X POST http://localhost:8080/api/process/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "...",
    "questions": [],
    "answers": ["A2"]
  }'

# 4. Should detect loop and return classification
```

## 🎯 Expected Behavior

### Normal Flow (No Loop)
```
Submit → Ask 2-3 questions → Answer → Classify → Done
Time: 30-60 seconds
Questions: 2-5
```

### Loop Detected Flow
```
Submit → Ask questions → Answer → Ask questions → Answer → 
Empty questions → Answer → [LOOP DETECTED] → Force Classify → Done
Time: 60-90 seconds
Questions: 5-8
```

### LLM Confusion Flow
```
Submit → Ask questions → Answer (5+ times) → 
LLM returns "Clarification 9" → [DETECTED] → 
Empty array → [LOOP DETECTED] → Force Classify → Done
Time: 90-120 seconds
Questions: 5-10
```

## 🔄 Rollback

### If Loop Detection Too Aggressive
```typescript
// In process.routes.ts
if (emptyQuestionCount >= 3) {  // Increase from 2 to 3
  // Detect loop
}
```

### If Loop Detection Too Lenient
```typescript
// In process.routes.ts
if (emptyQuestionCount >= 1) {  // Decrease from 2 to 1
  // Detect loop
}
```

### Disable Loop Detection (Emergency)
```typescript
// Comment out the entire loop detection block
// if (emptyQuestionCount >= 2) {
//   // Detect loop
// }
```

## 📞 Support

### Check Logs
```bash
# Backend logs
cd backend && npm start | grep -E "Loop|Clarification|Error"

# Audit logs
ls -la backend/data/audit-logs/
cat backend/data/audit-logs/$(date +%Y-%m-%d).jsonl | jq .
```

### Check Session
```bash
# View session file
cat backend/data/sessions/{sessionId}.json | jq .

# Check conversations
cat backend/data/sessions/{sessionId}.json | jq '.conversations[].clarificationQA'
```

### Common Issues

**Issue:** Loop still occurring
**Fix:** Check if threshold is too high (increase from 2 to 1)

**Issue:** Classification too early
**Fix:** Check if threshold is too low (decrease from 2 to 3)

**Issue:** LLM still confused
**Fix:** Try different Bedrock model (e.g., claude-3-sonnet instead of haiku)

## 📚 Documentation

- **FIXES_APPLIED.md** - Technical details
- **LOOP_DETECTION_EXPLAINED.md** - Architecture deep dive
- **TESTING_GUIDE.md** - Testing instructions
- **FINAL_SUMMARY.md** - Complete summary

## ✨ Key Takeaways

1. **Multi-layered defense** - 4 independent safety nets
2. **Audit trail tracking** - Every clarification logged
3. **Automatic recovery** - No manual intervention needed
4. **Graceful degradation** - Always returns classification
5. **Clear logging** - Easy to debug and monitor

**Status:** ✅ Production Ready
