# Sentiment-Aware Interview Stopping

## Overview

The clarification interview system now includes **sentiment analysis** to automatically detect user frustration and stop asking questions. This prevents poor user experiences and reduces manual intervention.

## Problem Statement

From real session `aba31b02-f94e-4cec-aee8-b8a39efd862b`:
- User answered 9 clarification questions
- Question 9 answer: **"no I've already responded to this question"**
- User feedback: "a bit frustrating with duplicate questions and having to skip ahead"
- User had to **manually skip** the interview

**The system should have detected this frustration automatically.**

## Solution: Multi-Layer Detection

### 1. Frustration Detection

Detects when users show signs of frustration or annoyance.

**Patterns Detected**:
- **Direct frustration**: "frustrating", "annoying", "irritated", "tired of", "sick of"
- **Repetition complaints**: "already said", "already answered", "already responded", "same question"
- **Dismissive responses**: "whatever", "fine", "sure", "ok ok", "yeah yeah", "stop asking"
- **Short dismissive answers**: Single word responses after longer answers
- **Explicit complaints**: "why do you keep asking", "stop", "too many"
- **Sarcasm indicators**: "obviously", "clearly", "as I said", "like I mentioned"

**Trigger**: Any 1 frustration indicator in last 3 answers

**Example from real session**:
```
Question 9: "..."
Answer: "no I've already responded to this question"
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
         Detected: "already responded" pattern
         Action: Stop interview immediately
```

### 2. Repetitive Question Detection

Detects when the LLM is asking similar questions repeatedly.

**How It Works**:
- Analyzes last 5 questions
- Extracts keywords from each question
- Compares keyword overlap between questions
- If 2+ pairs share 2+ keywords → repetitive

**Example**:
```
Question 5: "How often do you perform this task?"
Question 6: "How frequently do you do this process?"
            ^^^^^^^^ Similar keywords: "often/frequently", "perform/do"
            Detected as repetitive
```

### 3. Exact Duplicate Detection

Detects when the same question is asked multiple times.

**How It Works**:
- Checks last 5 questions for exact duplicates
- If < 3 unique questions out of 5 → loop detected

**Example**:
```
Question 3: "What is the frequency?"
Question 5: "What is the frequency?"
Question 7: "What is the frequency?"
            Detected: Only 3 unique questions in 5 attempts
```

### 4. Unknown Answer Detection

Detects when user repeatedly says "I don't know".

**Patterns**:
- "don't know", "not sure", "unsure", "no idea", "can't say"
- "I don't", "we don't", "don't have", "no information"
- Single word: "no", "nope", "n/a", "na", "unknown", "idk"

**Trigger**: 2 out of last 3 answers indicate lack of knowledge

## Implementation

### ClarificationService Methods

**`detectUserFrustration()`**
```typescript
private detectUserFrustration(
  conversationHistory: Array<{ question: string; answer: string }>
): boolean
```
- Checks last 3 answers for frustration patterns
- Returns true if any frustration detected
- Priority detection - stops immediately

**`detectRepetitiveQuestions()`**
```typescript
private detectRepetitiveQuestions(
  conversationHistory: Array<{ question: string; answer: string }>
): boolean
```
- Analyzes last 5 questions for keyword overlap
- Returns true if 2+ pairs are similar
- Prevents LLM loops

**`shouldStopInterview()`**
```typescript
shouldStopInterview(
  conversationHistory: Array<{ question: string; answer: string }>
): { shouldStop: boolean; reason: string }
```
- Orchestrates all detection methods
- Returns stop decision with reason
- Called before generating new questions

### Detection Priority

1. **Hard Limit** (15 questions) - Absolute maximum
2. **User Frustration** (2+ questions) - Highest priority, immediate stop
3. **Repetitive Questions** (3+ questions) - Stop to avoid frustration
4. **Exact Duplicates** (5+ questions) - LLM loop detection
5. **Unknown Answers** (5+ questions) - User lacks information
6. **Soft Limit** (8+ questions) - Warning only

## Automatic Stopping Flow

```
User submits answer
       ↓
Check shouldStopInterview()
       ↓
   ┌───────────────────────┐
   │ Frustration detected? │ → YES → Stop immediately
   └───────────────────────┘
       ↓ NO
   ┌───────────────────────┐
   │ Questions repetitive? │ → YES → Stop to prevent frustration
   └───────────────────────┘
       ↓ NO
   ┌───────────────────────┐
   │ Exact duplicates?     │ → YES → Stop (LLM loop)
   └───────────────────────┘
       ↓ NO
   ┌───────────────────────┐
   │ User doesn't know?    │ → YES → Stop (no more info)
   └───────────────────────┘
       ↓ NO
Continue with next question
```

## Real Session Analysis

### Session: aba31b02-f94e-4cec-aee8-b8a39efd862b

**What Happened**:
- 9 questions asked
- User frustrated by question 9
- User manually skipped
- Negative feedback: "frustrating with duplicate questions"

**What Would Happen Now**:

| Question | Answer | Detection | Action |
|----------|--------|-----------|--------|
| 1-8 | Normal answers | None | Continue |
| 9 | "no I've already responded to this question" | **Frustration** | **Auto-stop** |

**Result**:
- ✅ System stops automatically at question 9
- ✅ No need for manual skip
- ✅ Better user experience
- ✅ Prevents negative feedback

## Benefits

### For Users
- **No manual intervention**: System stops automatically
- **Respects their time**: Doesn't waste time on redundant questions
- **Better experience**: Feels responsive and intelligent
- **Reduces frustration**: Stops before user gets annoyed

### For System
- **Prevents loops**: Catches LLM reasoning failures
- **Saves API costs**: Fewer unnecessary LLM calls
- **Better data quality**: Stops when information is sufficient
- **Improved metrics**: Fewer negative ratings

### For Learning
- **Identifies patterns**: Tracks when/why interviews stop
- **Improves prompts**: Feedback for prompt engineering
- **Better questions**: Learn which questions cause frustration
- **Optimizes flow**: Reduce average question count

## Configuration

### Adjust Sensitivity

**More Sensitive** (stop earlier):
```typescript
// In clarification.service.ts
private readonly SOFT_LIMIT_QUESTIONS = 5;  // Default: 8
private readonly HARD_LIMIT_QUESTIONS = 10; // Default: 15

// In detectUserFrustration()
return frustrationCount >= 1 || shortAnswerCount >= 2; // Default: 3
```

**Less Sensitive** (allow more questions):
```typescript
private readonly SOFT_LIMIT_QUESTIONS = 10; // Default: 8
private readonly HARD_LIMIT_QUESTIONS = 20; // Default: 15

// In detectUserFrustration()
return frustrationCount >= 2 || shortAnswerCount >= 4; // Default: 1, 3
```

## Testing

### Unit Tests

```typescript
describe('Sentiment Detection', () => {
  it('should detect frustration from "already answered"', () => {
    const history = [
      { question: 'Q1', answer: 'Answer 1' },
      { question: 'Q2', answer: 'Answer 2' },
      { question: 'Q3', answer: "I've already answered this" }
    ];
    
    expect(detectUserFrustration(history)).toBe(true);
  });

  it('should detect repetitive questions', () => {
    const history = [
      { question: 'How often do you do this?', answer: 'Weekly' },
      { question: 'What is the frequency?', answer: 'Once a week' },
      { question: 'How frequently does this occur?', answer: 'Every week' }
    ];
    
    expect(detectRepetitiveQuestions(history)).toBe(true);
  });
});
```

### Manual Testing

1. **Test Frustration Detection**:
   - Answer normally for 3-4 questions
   - Answer with "I already said this"
   - Verify interview stops automatically

2. **Test Repetitive Detection**:
   - Submit process description
   - Answer questions normally
   - If questions become similar, verify auto-stop

3. **Test Unknown Answers**:
   - Answer with "I don't know" 2-3 times
   - Verify interview stops

## Monitoring

### Metrics to Track

1. **Auto-stop rate**: % of interviews stopped automatically
2. **Stop reasons**: Distribution of stop reasons
3. **Question count at stop**: Average questions before auto-stop
4. **User satisfaction**: Rating correlation with auto-stop
5. **Manual skip rate**: Should decrease with sentiment detection

### Audit Logs

Auto-stops are logged with reason:
```json
{
  "eventType": "clarification",
  "data": {
    "action": "auto_stop",
    "reason": "User showing signs of frustration - stopping interview",
    "questionCount": 9
  }
}
```

## Future Enhancements

1. **Tone Analysis**: Detect sarcasm and passive-aggressive responses
2. **Response Time**: Track if user is taking longer (disengagement)
3. **Confidence Scoring**: Assign confidence to frustration detection
4. **Personalization**: Learn user-specific frustration patterns
5. **Proactive Messages**: "I notice you're frustrated, would you like to skip?"
6. **Question Quality**: Score questions to avoid repetitive ones

## Related Features

- **Skip Interview Button**: Manual override still available
- **Hard Limit**: 15 questions maximum (unchanged)
- **Soft Limit**: 8 questions warning (unchanged)
- **Loop Detection**: Exact duplicate detection (enhanced)

## Migration

No migration required. Feature is backward compatible and activates automatically.

## Troubleshooting

### False Positives

**Symptom**: Interview stops too early

**Cause**: Overly sensitive frustration detection

**Solution**: Adjust patterns or increase threshold

### False Negatives

**Symptom**: Interview continues despite frustration

**Cause**: User frustration not matching patterns

**Solution**: Add more patterns or review logs for missed cases

### Performance

**Impact**: Minimal (< 1ms per check)

**Optimization**: Patterns are regex-based, very fast

---

**Last Updated**: November 10, 2025
**Version**: 2.1.0
**Tested With**: Real session aba31b02-f94e-4cec-aee8-b8a39efd862b
