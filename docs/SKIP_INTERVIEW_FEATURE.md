# Skip Interview Feature

## Overview

The Skip Interview feature allows users to bypass the clarification question loop and proceed directly to classification with the information already provided. This is particularly useful when:

1. **LLM Loop Detection**: Low-end LLM models may get stuck in a reasoning loop and continue asking questions indefinitely
2. **User Preference**: The user has provided sufficient information and wants to proceed immediately
3. **Time Constraints**: The user wants a quick classification without answering multiple questions

## How It Works

### Frontend

1. **UI Component**: A "Skip Interview & Classify Now" button appears in the `ClarificationQuestions` component
2. **User Action**: When clicked, it calls `handleSkipInterview()` in `App.tsx`
3. **API Call**: The frontend calls `apiService.forceClassification()` which sets `forceClassify: true`

### Backend

1. **Force Classification Flag**: The `/api/process/classify` endpoint accepts a `forceClassify` parameter
2. **Bypass Clarification**: When `forceClassify` is true, the endpoint skips:
   - Generating additional clarification questions
   - Checking if manual review is needed (unless confidence is extremely low)
3. **Direct Classification**: Proceeds directly to classification with available information
4. **Audit Logging**: Logs the action as `force_classify` with metadata about questions asked

## Implementation Details

### Frontend Changes

**File**: `frontend/src/components/ClarificationQuestions.tsx`
- Added `onSkipInterview` prop
- Added "Skip Interview & Classify Now" button with clear warning text

**File**: `frontend/src/App.tsx`
- Added `handleSkipInterview()` function
- Passes handler to `ClarificationQuestions` component

**File**: `frontend/src/services/api.ts`
- Added `forceClassification()` method
- Sends `forceClassify: true` to backend

### Backend Changes

**File**: `backend/src/routes/process.routes.ts`
- Added `forceClassify` parameter to `/api/process/classify` endpoint
- Modified clarification check: `if (classificationResult.action === 'clarify' && !forceClassify)`
- Modified manual review check: `if (classificationResult.action === 'manual_review' && !forceClassify)`
- Added audit metadata: `action: forceClassify ? 'force_classify' : 'auto_classify'`

## Safety Measures

### Hard Limit Protection

The clarification service already has built-in limits:
- **Soft Limit**: 8 questions (warning)
- **Hard Limit**: 15 questions (automatic stop)

When the hard limit is reached, the service automatically returns an empty question array and proceeds to classification.

### Audit Trail

All force classifications are logged with:
- Action type: `force_classify`
- Interview skipped: `true`
- Questions asked: Number of questions answered before skipping

## User Experience

### Button Appearance

The skip button:
- Has a red outline (warning color)
- Includes explanatory text: "Use this if the LLM is stuck in a loop or you want to proceed with available information"
- Is disabled during processing
- Has hover effects for better UX

### When to Use

Users should skip the interview when:
1. The LLM is asking repetitive or circular questions
2. They've already provided all available information
3. They want a quick classification for exploratory purposes
4. The interview has exceeded 5-8 questions without progress

## Testing

### Manual Testing

1. Start a new session and submit a process description
2. Answer 2-3 clarification questions
3. Click "Skip Interview & Classify Now"
4. Verify classification is returned immediately
5. Check audit logs for `force_classify` action

### Edge Cases

1. **No Questions Asked**: Skip button works even if no questions have been answered
2. **Low Confidence**: Classification proceeds even with low confidence (user's choice)
3. **Network Errors**: Standard error handling applies

## Future Enhancements

Potential improvements:
1. **Smart Detection**: Automatically detect LLM loops and suggest skipping
2. **Confidence Warning**: Show warning if skipping with very low confidence
3. **Question Limit Display**: Show "X/15 questions asked" to inform users
4. **Skip Confirmation**: Add confirmation dialog for first-time users

## Related Files

- `frontend/src/components/ClarificationQuestions.tsx`
- `frontend/src/App.tsx`
- `frontend/src/services/api.ts`
- `backend/src/routes/process.routes.ts`
- `backend/src/services/clarification.service.ts`

## Security Considerations

- ✅ Requires authentication (standard auth middleware)
- ✅ Rate limiting applies (same as other endpoints)
- ✅ Audit logging enabled
- ✅ No additional security risks introduced

## Performance Impact

- **Positive**: Reduces LLM API calls when skipping
- **Neutral**: No performance degradation
- **User Control**: Gives users control over processing time

---

**Last Updated**: November 10, 2025
**Version**: 2.1.0
