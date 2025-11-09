# Bug Fix: Clarification Question Limits and Attribute Extraction

## Issues Found

### Issue 1: Question Limit Not Enforced
**Session:** 04bf87cd-fdec-4e4a-8111-0231de33628c

**Problem:**
- System asked 8 clarification questions when MAX_QUESTIONS_PER_SESSION is 5
- No enforcement at the API endpoint level
- Frontend could repeatedly call `/api/process/clarify` beyond the limit

**Impact:**
- Users overwhelmed with too many questions
- Poor user experience
- Potential for infinite question loops

### Issue 2: Questions Not Stored Properly
**Problem:**
- Actual clarification questions weren't being stored in the conversation history
- All questions stored as "Clarification 1", "Clarification 2", etc. (placeholders)
- Made conversation history useless for analysis and debugging

**Example from session 04bf87cd:**
```json
{
  "question": "Clarification 1",  // ❌ Should be actual question
  "answer": "complex, what we've seen that day..."
}
```

**Impact:**
- Cannot review what questions were asked
- Cannot analyze question effectiveness
- Cannot debug classification issues
- Audit trail incomplete

### Issue 3: Attribute Extraction Failures
**Error:** `Attribute extraction failed: Missing required attribute: frequency`

**Problem:**
- Attribute extraction parser was too strict
- Required ALL 6 attributes to be present
- Failed completely if LLM didn't return one attribute
- No graceful degradation

**Impact:**
- Classification failed even when most attributes were extracted
- Lost valuable attribute data
- Forced fallback to classification without decision matrix

## Solutions Implemented

### Fix 1: Enforce Question Limit at API Level

**File:** `backend/src/routes/process.routes.ts`

Added check before processing answers:
```typescript
// Check if we've exceeded the question limit
if (latestConversation.clarificationQA.length >= 5) {
  return res.status(400).json({
    error: 'Question limit exceeded',
    message: 'Maximum of 5 clarification questions per session'
  });
}
```

**Result:**
- API now rejects requests that would exceed the limit
- Clear error message to frontend
- Prevents infinite question loops

### Fix 2: Store Actual Questions

**File:** `backend/src/routes/process.routes.ts`

Modified to accept and store actual questions:
```typescript
const {
  sessionId,
  answers,
  questions,  // ✅ New: Accept questions from frontend
  apiKey,
  userId = 'anonymous',
  model = 'gpt-4'
} = req.body;

// Add Q&A to conversation
for (let i = 0; i < answers.length; i++) {
  // Use provided questions if available, otherwise use placeholder
  const question = questions && questions[i] ? questions[i] : `Clarification ${latestConversation.clarificationQA.length + 1}`;
  
  latestConversation.clarificationQA.push({
    question,  // ✅ Actual question stored
    answer: scrubbedAnswers[i].scrubbedText
  });
}
```

**Result:**
- Actual questions now stored in conversation history
- Better audit trail
- Can analyze question effectiveness
- Frontend needs to pass questions array

### Fix 3: Resilient Attribute Extraction

**File:** `backend/src/services/classification.service.ts`

Made parser fill in missing attributes:
```typescript
// Fill in missing attributes with "unknown"
const result: any = {};
for (const attr of requiredAttributes) {
  if (parsed[attr] && parsed[attr].value) {
    result[attr] = parsed[attr];
  } else {
    console.warn(`Missing attribute ${attr}, using unknown`);
    result[attr] = {
      value: 'unknown',
      explanation: 'Insufficient information provided'
    };
  }
}
```

**Result:**
- Attribute extraction no longer fails completely
- Missing attributes marked as "unknown"
- Decision matrix can still use available attributes
- Graceful degradation instead of complete failure

## Frontend Changes Required

The frontend needs to be updated to pass questions along with answers:

**Before:**
```typescript
fetch('/api/process/clarify', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    answers: ['answer1', 'answer2'],
    apiKey
  })
})
```

**After:**
```typescript
fetch('/api/process/clarify', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    answers: ['answer1', 'answer2'],
    questions: ['question1', 'question2'],  // ✅ Add this
    apiKey
  })
})
```

The frontend should store the questions when they're first received and send them back with the answers.

## Testing

### Test Case 1: Question Limit Enforcement
```bash
# Try to submit 6th answer
curl -X POST http://localhost:8080/api/process/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "answers": ["answer6"],
    "questions": ["question6"],
    "apiKey": "sk-..."
  }'

# Expected: 400 error "Question limit exceeded"
```

### Test Case 2: Questions Stored Properly
```bash
# Submit answers with questions
curl -X POST http://localhost:8080/api/process/clarify \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session",
    "answers": ["Daily"],
    "questions": ["How often does this process run?"],
    "apiKey": "sk-..."
  }'

# Check session data
curl http://localhost:8080/api/sessions/test-session

# Expected: clarificationQA contains actual question text
```

### Test Case 3: Attribute Extraction Resilience
```bash
# Test with incomplete conversation
# Should not fail even if some attributes can't be extracted
# Check logs for "Missing attribute X, using unknown"
```

## Monitoring

After deployment, monitor:

1. **Question Limit Violations**: Check for 400 errors with "Question limit exceeded"
2. **Question Storage**: Verify clarificationQA contains actual questions, not placeholders
3. **Attribute Extraction**: Check for "Missing attribute" warnings in logs
4. **Classification Success Rate**: Should improve with resilient attribute extraction

## Rollback

If issues arise:
```bash
git revert <commit-hash>
docker-compose restart backend
```

## Related Issues

- Session 04bf87cd-fdec-4e4a-8111-0231de33628c: 8 questions asked (exceeded limit)
- Multiple sessions: Attribute extraction failures
- All sessions: Questions not stored properly

## Next Steps

1. **Update Frontend**: Modify to pass questions array with answers
2. **Add Tests**: Unit tests for question limit enforcement
3. **Improve Prompts**: Ensure attribute extraction prompt is clear about all 6 attributes
4. **Add Metrics**: Track question count distribution and attribute extraction success rate
