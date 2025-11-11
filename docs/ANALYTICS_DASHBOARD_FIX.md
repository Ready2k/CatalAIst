# Analytics Dashboard Fix - Sessions Not Appearing

## Issue

When skipping clarification (via loop detection) or triggering manual review, sessions were not appearing in the Analytics Dashboard.

## Root Cause

Two code paths in `/api/process/clarify` were returning classification results **without saving them to the session**:

### 1. Early Loop Detection
```typescript
// ❌ Before: Returned classification without saving
if (emptyQuestionCount >= 2) {
  const classificationResult = await classificationService.classify(...);
  
  return res.json({
    classification: classificationResult,  // ← Not saved to session!
    loopDetected: true,
    sessionId
  });
}
```

### 2. Manual Review
```typescript
// ❌ Before: Saved status but not classification
if (classificationResult.action === 'manual_review') {
  session.status = 'manual_review';  // ← Only status saved
  await sessionStorage.saveSession(session);
  
  return res.json({
    classification: classificationResult.result,  // ← Not in session!
    requiresManualReview: true,
    sessionId
  });
}
```

## Solution

Added complete session save logic to both paths:

### 1. Early Loop Detection - Complete Flow
```typescript
if (emptyQuestionCount >= 2) {
  // 1. Classify
  const classificationResult = await classificationService.classify(...);
  
  // 2. Extract attributes
  const extractedAttributes = await classificationService.extractAttributes(...);
  
  // 3. Apply decision matrix
  const decisionMatrix = await versionedStorage.getLatestDecisionMatrix();
  let decisionMatrixEvaluation = null;
  if (decisionMatrix) {
    decisionMatrixEvaluation = evaluatorService.evaluateMatrix(...);
  }
  
  // 4. Create classification object
  const classificationToStore: Classification = {
    category: finalClassification.category,
    confidence: finalClassification.confidence,
    rationale: finalClassification.rationale,
    categoryProgression: finalClassification.categoryProgression,
    futureOpportunities: finalClassification.futureOpportunities,
    timestamp: new Date().toISOString(),
    modelUsed: model,
    llmProvider,
    decisionMatrixEvaluation: decisionMatrixEvaluation || undefined
  };
  
  // 5. Save to session
  session.classification = classificationToStore;
  session.status = 'completed';
  session.updatedAt = new Date().toISOString();
  await sessionStorage.saveSession(session);
  analyticsService.invalidateCache();
  
  // 6. Log classification
  await auditLogService.logClassification(...);
  
  // 7. Return
  return res.json({
    classification: classificationToStore,
    loopDetected: true,
    sessionId
  });
}
```

### 2. Manual Review - Complete Flow
```typescript
if (classificationResult.action === 'manual_review') {
  // 1. Create classification object
  const classificationToStore: Classification = {
    category: classificationResult.result.category,
    confidence: classificationResult.result.confidence,
    rationale: classificationResult.result.rationale,
    categoryProgression: classificationResult.result.categoryProgression,
    futureOpportunities: classificationResult.result.futureOpportunities,
    timestamp: new Date().toISOString(),
    modelUsed: model,
    llmProvider
  };
  
  // 2. Save to session
  session.classification = classificationToStore;
  session.status = 'manual_review';
  await sessionStorage.saveSession(session);
  analyticsService.invalidateCache();
  
  // 3. Log classification
  await auditLogService.logClassification(...);
  
  // 4. Return
  return res.json({
    classification: classificationToStore,
    requiresManualReview: true,
    sessionId
  });
}
```

## What Gets Saved

### Session Object
```json
{
  "sessionId": "abc-123",
  "status": "completed",  // or "manual_review"
  "classification": {
    "category": "Digitise",
    "confidence": 0.75,
    "rationale": "...",
    "categoryProgression": "...",
    "futureOpportunities": "...",
    "timestamp": "2025-11-11T10:00:00.000Z",
    "modelUsed": "anthropic.claude-3-sonnet",
    "llmProvider": "bedrock",
    "decisionMatrixEvaluation": {
      "matrixVersion": "1.0",
      "triggeredRules": [...],
      "overridden": false
    }
  }
}
```

### Audit Log
```json
{
  "sessionId": "abc-123",
  "eventType": "classification",
  "data": {
    "classification": {...},
    "decisionMatrixVersion": "1.0",
    "decisionMatrixEvaluation": {...}
  },
  "metadata": {
    "modelVersion": "anthropic.claude-3-sonnet",
    "llmProvider": "bedrock",
    "loopDetected": true  // Only for loop detection
  }
}
```

## Analytics Dashboard Impact

### Before Fix
```
Analytics Dashboard:
- Total Sessions: 10
- Visible Sessions: 7
- Missing: 3 (loop detected or manual review)
```

### After Fix
```
Analytics Dashboard:
- Total Sessions: 10
- Visible Sessions: 10
- Missing: 0
```

## Testing

### Test Loop Detection Session Appears
```bash
# 1. Create session with loop
POST /api/process/submit
POST /api/process/clarify (with empty questions, twice)

# 2. Check session saved
GET /api/sessions/{sessionId}
# Should return session with classification

# 3. Check Analytics Dashboard
GET /api/analytics/sessions
# Should include the session
```

### Test Manual Review Session Appears
```bash
# 1. Create session with low confidence
POST /api/process/submit
# (Provide vague description to trigger manual review)

# 2. Check session saved
GET /api/sessions/{sessionId}
# Should return session with classification and status='manual_review'

# 3. Check Analytics Dashboard
GET /api/analytics/sessions?status=manual_review
# Should include the session
```

## Verification Checklist

After this fix, verify:
- ✅ Loop-detected sessions appear in Analytics Dashboard
- ✅ Manual review sessions appear in Analytics Dashboard
- ✅ Session status is correct ('completed' or 'manual_review')
- ✅ Classification data is saved
- ✅ Decision matrix evaluation is included (if applicable)
- ✅ Audit log contains classification event
- ✅ Analytics cache is invalidated
- ✅ Session counts are accurate

## Related Issues

This fix also ensures:
- Agreement rate calculations include all sessions
- Category distribution is accurate
- Confidence metrics include all classifications
- Feedback can be provided on all sessions
- Learning system has complete data

## Files Changed

- `backend/src/routes/process.routes.ts`
  - Added session save logic to early loop detection (lines ~700-780)
  - Added session save logic to manual review (lines ~990-1020)

## Build Status

✅ TypeScript compilation successful
✅ No diagnostics errors
✅ All tests pass

## Deployment Notes

This is a **critical fix** for production:
- Sessions were being lost from analytics
- Metrics were inaccurate
- User feedback couldn't be collected on missing sessions
- Learning system had incomplete data

**Priority:** High
**Risk:** Low (only adds missing save logic)
**Testing:** Required before deployment
