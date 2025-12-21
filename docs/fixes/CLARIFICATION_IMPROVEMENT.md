# Clarification Logic Improvement

## Problem

Session `801ab993-d43b-4eb7-8c7b-9ecfbf5ed722` demonstrated a critical issue with the clarification logic:

**User Input:**
> "I have a weekly report thats shows the number of people that have clicked on our website, to get this report i login to our webserver, then run a cli command, copy the output and paste into excel, in excel i make it readable"

**What Happened:**
- Classification confidence: 0.9
- Clarification questions asked: **0** (none)
- Result: Classified as RPA and user confirmed

**What Should Have Happened:**
The system should have asked clarifying questions because the description lacked critical information:
- **Volume/Frequency**: How many times per week? Just once or multiple?
- **Data Complexity**: What does "make it readable" mean? Simple formatting or complex transformations?
- **Variability**: Does the CLI command change? Are there decision points?
- **Integration**: What webserver? What CLI tool?
- **Pain Points**: How long does this take? What goes wrong?
- **Excel Output**: Is it shared? Does it feed into other systems?

## Root Cause

The clarification logic only considered **confidence score** (0-1) and ignored **description quality**:

```typescript
// OLD LOGIC
if (confidence > 0.90) {
  return 'auto_classify';  // ❌ Skipped clarification
}
```

This meant brief, vague descriptions with high confidence scores bypassed clarification entirely.

## Solution

Enhanced the `determineAction()` method to assess **both confidence AND description quality**:

### New Logic Flow

1. **Low confidence (<0.5)** → Manual review
2. **Medium confidence (0.5-0.90)** → Always clarify
3. **High confidence (>0.90)** → Check description quality:
   - **Poor quality** → Clarify (unless already asked questions)
   - **Marginal quality + confidence ≤0.92** → Clarify
   - **Good quality OR very high confidence** → Auto-classify

### Description Quality Assessment

The system now evaluates descriptions based on:

**Word Count:**
- < 20 words: Poor
- 20-50 words: Marginal
- \> 50 words: Good (if has key info)

**Key Information Indicators:**
- Frequency: "daily", "weekly", "monthly", "every", etc.
- Volume: Numbers, "many", "hundreds", etc.
- Current State: "manual", "paper", "digital", "automated", "system", etc.
- Complexity: "steps", "process", "workflow", "involves", "systems", etc.
- Pain Points: "problem", "slow", "error", "difficult", "time-consuming", etc.

**Quality Scoring:**
- **Poor**: < 20 words OR < 2 key indicators
- **Good**: > 50 words AND ≥ 3 key indicators
- **Marginal**: Everything in between

## Implementation

### Modified Files

1. **`backend/src/services/classification.service.ts`**
   - Enhanced `determineAction()` to accept description and conversation history
   - Added `assessDescriptionQuality()` private method
   - Updated logic to check quality before auto-classifying

2. **`backend/jest.config.js`** (new)
   - Added Jest configuration for TypeScript support

3. **`backend/src/services/__tests__/classification-quality.test.ts`** (new)
   - Comprehensive test suite with 10 test cases
   - Validates the session 801ab993 scenario
   - Tests edge cases and quality assessment

### Test Results

All 10 tests pass:
- ✓ Brief descriptions trigger clarification even with high confidence
- ✓ Session 801ab993 description now triggers clarification
- ✓ Detailed descriptions auto-classify with high confidence
- ✓ Conversation history improves quality assessment
- ✓ Low confidence triggers manual review
- ✓ Marginal descriptions with medium-high confidence clarify
- ✓ Quality assessment correctly identifies poor/marginal/good descriptions

## Impact

### Before Fix
- **Session 801ab993**: 0 clarification questions → Potentially incorrect classification
- Brief descriptions with high confidence: Auto-classified without questions

### After Fix
- **Session 801ab993 scenario**: Would now ask 2-3 clarifying questions
- Brief descriptions: Always trigger clarification (unless very high confidence + good quality)
- Better discovery process: More information gathered before classification

## Example Scenarios

### Scenario 1: Brief Description (Now Fixed)
**Input:** "I have a weekly report that shows website clicks"
- **Before:** Auto-classify (if confidence > 0.9)
- **After:** Clarify (poor quality, < 20 words)

### Scenario 2: Session 801ab993 (Now Fixed)
**Input:** "I have a weekly report thats shows the number of people that have clicked on our website, to get this report i login to our webserver, then run a cli command, copy the output and paste into excel, in excel i make it readable"
- **Before:** Auto-classify (confidence 0.9)
- **After:** Clarify (marginal quality, ~35 words, missing key details)

### Scenario 3: Detailed Description (Still Works)
**Input:** "Every Monday morning, our finance team of 5 people manually processes 200+ expense reports. The current process involves logging into our legacy accounting system, downloading CSV files, copying data into Excel spreadsheets, applying complex validation rules with 15+ steps, and emailing results to department heads. This takes 4-6 hours each week and is error-prone, causing delays in reimbursements and frustration among employees."
- **Before:** Auto-classify (confidence > 0.9)
- **After:** Auto-classify (good quality, >50 words, 5+ key indicators)

## Testing

Run the test suite:
```bash
cd backend
npm test -- classification-quality.test.ts
```

## Future Enhancements

1. **Machine Learning**: Train a model to better assess description quality
2. **Adaptive Thresholds**: Adjust quality thresholds based on historical accuracy
3. **Context-Aware**: Consider industry/domain when assessing quality
4. **User Feedback**: Learn from cases where users correct classifications

## Conclusion

This fix ensures the system asks clarifying questions when descriptions lack sufficient detail, regardless of confidence score. This improves classification accuracy and provides a better discovery experience for users.
