# Sentiment Monitoring via LLM

## Date
November 12, 2025

## Problem
The regex-based frustration detection was causing false positives, incorrectly identifying normal conversational phrases as signs of frustration.

### Example False Positive
**User answer:** "everyday this is my job but not all of them go offshore"
**Regex match:** Pattern `/\b(this is)\b/i` matched "this is"
**Result:** System incorrectly detected frustration and stopped the interview

## Solution
Removed regex-based sentiment detection and delegated sentiment monitoring to the LLM through the clarification prompt.

## Changes Made

### 1. Removed Regex-Based Frustration Detection

**File:** `backend/src/services/clarification.service.ts`

**Removed:**
- `detectUserFrustration()` method with regex patterns
- Call to frustration detection in `shouldStopInterview()`

**Why:** Regex patterns are too simplistic and cause false positives. Natural language understanding requires context that only an LLM can provide.

### 2. Created New Prompt Version (v1.2)

**File:** `backend/data/prompts/clarification-v1.2.txt`

**Added Sentiment Monitoring Section:**
```
**Sentiment Monitoring:**
IMPORTANT: Monitor the user's sentiment in their answers. If you detect:
- Signs of frustration, annoyance, or impatience
- Dismissive or very short answers after previously detailed ones
- Complaints about repetitive questions
- Statements like "I already told you", "stop asking", "this is too much"
- Lack of knowledge indicated by multiple "I don't know" responses

Then STOP asking questions by returning an empty array [].
```

**Added Stop Conditions:**
```
**When to Stop Asking Questions:**
Return an empty array [] if:
- You have enough information to make a confident classification
- The user shows signs of frustration or impatience
- The user repeatedly says "I don't know" or similar
- You've asked 5+ questions and aren't getting new useful information
- The user's answers are becoming very short or dismissive
```

### 3. Updated Startup Initialization

**File:** `backend/src/startup.ts`

Updated the default clarification prompt to v1.2 with sentiment monitoring instructions.

## Benefits

### 1. Context-Aware Sentiment Analysis
The LLM can understand context and nuance:
- ✅ "this is my job" → Normal statement
- ❌ "this is ridiculous" → Frustration

### 2. Natural Conversation Flow
The LLM naturally adapts to user sentiment without rigid rules.

### 3. Fewer False Positives
No more stopping interviews because of common phrases like "this is", "obviously", etc.

### 4. Better User Experience
Users can provide detailed answers without triggering false alarms.

### 5. Adaptive Behavior
The LLM can detect subtle patterns:
- Decreasing answer length
- Shift in tone
- Repetitive "I don't know" responses
- Actual frustration vs. normal speech

## How It Works

1. **User provides answer** to clarification question
2. **Answer is added** to conversation history
3. **LLM receives** full conversation context including all previous Q&A
4. **LLM analyzes** sentiment and engagement level
5. **LLM decides**:
   - Generate 2-3 more questions if user is engaged
   - Return empty array [] if user shows frustration or lacks knowledge
6. **System respects** LLM decision and stops or continues accordingly

## Remaining Loop Detection

The following loop detection mechanisms remain active:

### 1. Empty Question Rounds
If the LLM generates no questions for 2+ consecutive rounds, stop the interview.

**Why:** Indicates the LLM believes it has enough information or the user can't provide more.

### 2. Repetitive Questions
If questions become repetitive (sharing many keywords), stop the interview.

**Why:** Indicates the LLM is stuck in a loop.

### 3. Unknown Answers
If user provides multiple "I don't know" type answers, the LLM will naturally stop.

**Why:** User doesn't have the information needed.

### 4. Hard Limit
Maximum 15 questions per session.

**Why:** Prevents infinite loops and respects user time.

## Testing

### Test Case 1: Normal Detailed Answers
**Input:** "everyday this is my job but not all of them go offshore"
**Expected:** ✅ Continue asking questions
**Result:** No false positive

### Test Case 2: Actual Frustration
**Input:** "I already told you this! Stop asking the same questions!"
**Expected:** ✅ LLM returns empty array, stops interview
**Result:** Natural sentiment detection

### Test Case 3: Lack of Knowledge
**Input:** "I don't know", "Not sure", "Can't say"
**Expected:** ✅ LLM returns empty array after 2-3 such answers
**Result:** Respects user's knowledge limits

### Test Case 4: Engaged User
**Input:** Multiple detailed, informative answers
**Expected:** ✅ Continue asking questions up to natural completion
**Result:** Full information gathering

## Migration Path

### Existing Sessions
- Will continue to work with existing prompts
- New sessions will use v1.2 prompt automatically

### Prompt Versioning
- Old prompt: `clarification-v1.1.txt`
- New prompt: `clarification-v1.2.txt`
- System loads latest version by default

### Rollback
If needed, can revert to v1.1 by:
1. Updating `CLARIFICATION_PROMPT_VERSION` in service
2. Or deleting v1.2 file to fall back to v1.1

## Files Modified

1. **backend/src/services/clarification.service.ts**
   - Removed `detectUserFrustration()` method
   - Removed frustration check from `shouldStopInterview()`
   - Added comment about LLM-based sentiment monitoring

2. **backend/data/prompts/clarification-v1.2.txt**
   - New prompt version with sentiment monitoring instructions

3. **backend/src/startup.ts**
   - Updated default prompt to v1.2

## Monitoring

To verify the LLM is properly monitoring sentiment:

1. **Check audit logs** for clarification events
2. **Look for empty question arrays** when user shows frustration
3. **Monitor session completion rates** - should improve
4. **Review user feedback** - should see fewer complaints about premature stopping

## Future Enhancements

Potential improvements:
- Add sentiment score to audit logs
- Track sentiment trends across sessions
- Use sentiment data to improve prompts
- Provide feedback to users about their engagement level

---

**Status:** ✅ Complete
**Version:** v1.2
**Impact:** Improved accuracy, fewer false positives, better UX
