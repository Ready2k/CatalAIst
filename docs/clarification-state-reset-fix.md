# Clarification Questions State Reset Fix

## Date
November 12, 2025

## Problem
When the second batch of clarification questions arrived, the submit button didn't work. Users had to click "Skip Interview" to proceed.

**Session ID:** aff67c9a-4e23-425e-aff8-cde70f1dd1d5

## Root Cause
The `answers` state in the ClarificationQuestions component was initialized with `useState(questions.map(() => ''))` only once on component mount. When new questions arrived (second batch), the state wasn't reset.

### What Happened:
1. First batch: 3 questions arrive
2. State initialized: `answers = ['', '', '']`
3. User fills answers: `answers = ['answer1', 'answer2', 'answer3']`
4. User submits, answers sent to backend
5. Second batch: 2 questions arrive
6. **BUG:** State still has 3 elements: `answers = ['answer1', 'answer2', 'answer3']`
7. Component renders 2 textareas but state has 3 elements
8. User types in textareas but updates wrong indices
9. Submit button validates and finds old answers, appears to work but doesn't

## Solution
Added `useEffect` hook to reset the state whenever the `questions` prop changes.

### Code Change

**Before:**
```typescript
const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
const [errors, setErrors] = useState<string[]>(questions.map(() => ''));
```

**After:**
```typescript
const [answers, setAnswers] = useState<string[]>(questions.map(() => ''));
const [errors, setErrors] = useState<string[]>(questions.map(() => ''));

// Reset answers when questions change (new batch arrives)
useEffect(() => {
  setAnswers(questions.map(() => ''));
  setErrors(questions.map(() => ''));
}, [questions]);
```

## How It Works Now

1. First batch: 3 questions arrive
2. `useEffect` runs: `answers = ['', '', '']`
3. User fills answers: `answers = ['answer1', 'answer2', 'answer3']`
4. User submits, answers sent to backend
5. Second batch: 2 questions arrive
6. **FIXED:** `useEffect` runs: `answers = ['', '']` (reset!)
7. Component renders 2 textareas with empty state
8. User types in textareas, updates correct indices
9. Submit button works correctly

## Testing

### Test Case 1: First Batch
**Input:** 3 questions
**Expected:** 
- 3 empty textareas
- User can type and submit
- ✅ Works

### Test Case 2: Second Batch
**Input:** 2 questions after first batch
**Expected:**
- State resets to 2 empty textareas
- User can type and submit
- ✅ Works (fixed!)

### Test Case 3: Multiple Batches
**Input:** 3 questions, then 2, then 1
**Expected:**
- Each batch resets state correctly
- Submit works for all batches
- ✅ Works

## Files Modified

1. **frontend/src/components/ClarificationQuestions.tsx**
   - Added `useEffect` import
   - Added effect to reset state on questions change

## Impact

- **Before:** Second batch of questions was unusable
- **After:** All batches work correctly
- **User Experience:** Smooth multi-batch interview flow

## Related Issues

This is a common React pattern issue:
- `useState` only initializes once
- Props changing don't trigger state reset
- Need `useEffect` to sync state with props

## Prevention

When creating components with state derived from props:
1. Always consider: "What happens when props change?"
2. Use `useEffect` to sync state with props
3. Test with multiple prop changes, not just initial render

---

**Status:** ✅ Fixed
**Version:** 2.2.1
**Priority:** Critical (blocking user workflow)
