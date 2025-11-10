# Intelligent Interview Design

## Philosophy

The clarification system should work like a **skilled consultant conducting a discovery interview**, not a rigid questionnaire. The system should:

1. **Ask enough questions** to understand the process thoroughly
2. **Adapt based on responses** - rephrase if user doesn't know, move on if they can't answer
3. **Know when to stop** - when confident or when user can't provide more information
4. **Be conversational** - not overwhelming or robotic

## Design Principles

### 1. Soft Limits, Not Hard Limits

**Old Approach (Rigid):**
- Hard limit of 5 questions
- Stop asking regardless of information quality
- No flexibility for complex processes

**New Approach (Adaptive):**
- Soft limit of 8 questions (warn but continue)
- Hard limit of 15 questions (absolute maximum)
- Stop based on confidence + information completeness, not just count

### 2. Information Completeness Assessment

The system assesses if it has enough information by checking for:

1. **Frequency**: How often the process runs
2. **Volume**: How many transactions/users
3. **Current State**: Manual, digital, automated
4. **Complexity**: Steps, systems, decision points
5. **Pain Points**: What's broken or inefficient
6. **Data Source**: Where data comes from, how it's captured

**Decision Logic:**
- If 4+ out of 6 indicators present + high confidence (>0.90) → Stop asking
- If < 4 indicators → Keep asking (up to limits)

### 3. Detect "I Don't Know" Patterns

The system detects when users can't provide more information:

**Patterns Detected:**
- "don't know", "not sure", "unsure", "no idea"
- "can't say", "unclear", "uncertain"
- "no", "n/a", "unknown", "idk"

**Decision Logic:**
- If 2 out of last 3 answers are "don't know" → Stop asking after 5 questions
- Reason: User likely can't provide more information

### 4. Adaptive Question Count

Questions per round adapt based on conversation progress:

| Questions Asked | Questions Generated | Reasoning |
|----------------|---------------------|-----------|
| 0 (first round) | 2-3 | Broad discovery |
| 1-4 | 2 | Focused follow-up |
| 5-7 | 1 | Targeted clarification |
| 8+ | 1 | Only critical gaps |

### 5. Confidence-Based Stopping

The system considers both confidence AND information quality:

| Confidence | Info Complete | Action |
|-----------|---------------|--------|
| > 0.90 | Yes | Stop asking |
| > 0.90 | No | Keep asking |
| 0.5-0.90 | Yes/No | Keep asking |
| < 0.5 | After 3+ questions | Flag for manual review |

## Implementation

### Limits

```typescript
SOFT_LIMIT_QUESTIONS = 8   // Warn but allow
HARD_LIMIT_QUESTIONS = 15  // Absolute maximum
```

### Stopping Conditions

The system stops asking questions when:

1. **High confidence + enough info**: Confidence > 0.90 AND 4+ key indicators
2. **User doesn't know**: 2+ "don't know" answers in last 3 responses (after 5 questions)
3. **Low confidence persists**: Confidence < 0.5 after 3+ questions → Manual review
4. **Hard limit reached**: 15 questions asked
5. **No more questions**: LLM returns empty array

### Question Generation Logic

```typescript
async generateQuestions(request) {
  // 1. Check hard limit
  if (questionCount >= 15) return stop;
  
  // 2. Check if we have enough info
  if (confidence > 0.90 && hasEnoughInfo) return stop;
  
  // 3. Check if user doesn't know
  if (hasUnknownAnswers && questionCount >= 5) return stop;
  
  // 4. Check if confidence too low
  if (confidence < 0.5 && questionCount >= 3) return manual_review;
  
  // 5. Generate questions (1-3 based on progress)
  return generateQuestions();
}
```

## Examples

### Example 1: Quick Resolution (3 questions)

**User:** "I create weekly reports from our CRM"

**Q1:** "Where does the CRM data come from? Is it automatically captured or manually entered?"  
**A1:** "Automatically captured from sales transactions"

**Q2:** "What format is the report and who uses it?"  
**A2:** "Excel spreadsheet, sent to management team of 5 people"

**Q3:** "Does creating the report involve any interpretation or is it purely data aggregation?"  
**A3:** "Just data aggregation, same format every week"

**Result:** High confidence (0.95), 5/6 indicators present → **Stop asking, classify as RPA**

### Example 2: User Doesn't Know (5 questions)

**User:** "We have a daily checklist process"

**Q1:** "What does the checklist involve?"  
**A1:** "Things we need to check at end of day"

**Q2:** "Where does the information for the checklist come from?"  
**A2:** "Not sure, I just fill it out"

**Q3:** "Who uses the completed checklist?"  
**A3:** "I don't know, maybe the supervisor"

**Q4:** "How long does it take to complete?"  
**A4:** "Maybe 10-15 minutes"

**Q5:** "Is the checklist the same every day or does it change?"  
**A5:** "I don't know, I think it changes"

**Result:** 2/3 recent answers are "don't know" → **Stop asking, proceed with available info**

### Example 3: Complex Process (10 questions)

**User:** "We process customer feedback and create improvement reports"

**Q1-3:** Initial discovery (frequency, volume, current state)  
**Q4-6:** Follow-up on data source and analysis process  
**Q7-8:** Clarify human judgment requirements  
**Q9-10:** Final details on output usage and decision-making

**Result:** Complex process requiring interpretation → **Classify as AI Agent after thorough discovery**

## Benefits

### For Users
- ✅ Natural conversation flow
- ✅ Not overwhelmed with too many questions
- ✅ Can say "I don't know" without breaking the system
- ✅ System adapts to their knowledge level

### For Classification Accuracy
- ✅ Gathers enough information for confident classification
- ✅ Doesn't stop prematurely on complex processes
- ✅ Detects when more questions won't help
- ✅ Better handling of edge cases

### For System Intelligence
- ✅ Learns when to stop asking
- ✅ Adapts question count to conversation progress
- ✅ Balances thoroughness with user experience
- ✅ Provides clear reasoning for decisions

## Monitoring

Track these metrics to tune the system:

1. **Average questions per session**: Should be 3-6 for most cases
2. **Sessions hitting soft limit (8)**: Should be < 10%
3. **Sessions hitting hard limit (15)**: Should be < 1%
4. **"Don't know" detection rate**: Track how often this triggers
5. **Classification confidence after clarification**: Should improve
6. **User satisfaction**: Survey after sessions with 8+ questions

## Future Enhancements

1. **Learn from patterns**: Identify which questions are most valuable
2. **Domain-specific limits**: Different limits for different process types
3. **User expertise detection**: Adjust questioning based on user's knowledge level
4. **Question effectiveness scoring**: Track which questions improve confidence most
5. **Adaptive rephrasing**: Automatically rephrase questions if user doesn't understand
