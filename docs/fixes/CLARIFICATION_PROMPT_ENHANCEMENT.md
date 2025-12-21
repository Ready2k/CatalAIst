# Clarification Prompt Enhancement v1.1

## Problem Statement

Session `cec8272f-e254-4107-bb8c-62bc3f12fa09` highlighted a critical gap in the clarification questions being asked. The system was not probing deeply enough into:

1. **Data Source & Nature**: Where does the data come from? Is it observational or transactional?
2. **Output Usage**: What do managers/users do with the reports?
3. **Human Judgment**: Does the process require human interpretation or expertise?
4. **Automation Feasibility**: Can RPA truly replace human observation and judgment?

### Example Scenario

**User Input:** "I create a weekly report showing website clicks"

**What the system might miss:**
- Is the data from observational logs (human-recorded) or automated analytics?
- What format is the report? (Dashboard, spreadsheet, document, presentation)
- Who uses the report and what decisions do they make with it?
- Does creating the report require interpretation or just data aggregation?
- Could the report be fully automated or does it need human oversight?

**Risk:** Classifying as RPA when the process actually requires human judgment (should be AI Agent or not automatable).

## Solution

Enhanced the clarification prompt (v1.1) to be more aggressive about asking critical questions that determine automation feasibility.

### New Question Priority Framework

1. **First Priority**: CURRENT STATE - How is this done today?
2. **Second Priority**: DATA SOURCE - Where does data come from? Observational or transactional?
3. **Third Priority**: OUTPUT USAGE - What happens with the output? Who uses it and how?
4. **Fourth Priority**: HUMAN JUDGMENT - What requires expertise vs. what's mechanical?
5. **Fifth Priority**: SCALE - How often? How many people? How many transactions?
6. **Sixth Priority**: PAIN POINTS - What's broken? What takes too long?

### Critical Questions Added

#### 1. Data Source & Nature
- Where does the data come from? Is it observational, transactional, or generated?
- Is the data created through human observation/judgment or automatically captured?
- Does the data require interpretation or is it raw facts?

#### 2. Output Format & Usage
- What format is the output? (Report, dashboard, spreadsheet, document, etc.)
- Who uses the output and what do they do with it?
- Does the output require human judgment to create or interpret?
- Is the output standardized or does it vary based on context?

#### 3. Human Judgment & Decision-Making
- Are there decision points that require human expertise or judgment?
- Does the process involve interpretation, analysis, or subjective assessment?
- Could the process be fully automated or does it need human oversight?

#### 4. Variability & Exceptions
- Does the process follow the same steps every time?
- Are there exceptions or edge cases that require special handling?
- How much variation is there in inputs, processing, or outputs?

### New Guidelines

**Added to prompt:**
- **ALWAYS ask about data source and output usage if not clear**
- **ALWAYS ask about human judgment requirements if the process involves reports, analysis, or decisions**
- **Be skeptical of automation potential** - dig into what makes the process complex

## Implementation

### Files Changed

1. **`backend/src/services/clarification.service.ts`**
   - Updated fallback prompt with enhanced question framework
   - Added critical questions section
   - Reordered priority framework to emphasize data source and output usage

2. **`data/prompts/clarification-v1.1.txt`** (new)
   - New versioned prompt file
   - Will be automatically loaded by VersionedStorageService
   - Replaces v1.0 as the active prompt

### Backward Compatibility

- v1.0 prompt remains in place for reference
- System automatically loads latest version (v1.1)
- Fallback prompt in code also updated to match v1.1

## Expected Behavior Changes

### Before Enhancement

**User:** "I create a weekly report showing website clicks"

**System Questions (typical):**
1. "How long does this process take?"
2. "How many people are involved?"

**Result:** Classified as RPA without understanding if data is observational or if report requires judgment

### After Enhancement

**User:** "I create a weekly report showing website clicks"

**System Questions (enhanced):**
1. "Where does the website click data come from? Is it automatically captured by analytics tools or do you manually record observations?"
2. "What format is the report, and what do managers do with it once you create it?"
3. "Does creating the report involve any interpretation or analysis, or is it purely data aggregation?"

**Result:** Better understanding of automation feasibility before classification

## Example Scenarios

### Scenario 1: Observational Data (Not Automatable)

**User:** "I create daily reports on customer service quality"

**Critical Questions:**
- "How do you gather the quality data? Is it from automated metrics or your observations?"
- "What does the report include, and how do managers use it to make decisions?"

**Likely Discovery:** Data comes from human observation → **Not suitable for RPA** → Should be **Simplify** or **AI Agent**

### Scenario 2: Transactional Data (Automatable)

**User:** "I create weekly sales reports from our CRM"

**Critical Questions:**
- "Is the sales data automatically captured in the CRM or manually entered?"
- "What format is the report, and is it the same structure every week?"

**Likely Discovery:** Data is transactional, format is standardized → **Suitable for RPA**

### Scenario 3: Mixed (Requires Judgment)

**User:** "I create monthly performance reports for executives"

**Critical Questions:**
- "What data sources do you pull from, and how much interpretation is involved?"
- "Does the report format vary based on the month's events or is it standardized?"
- "What do executives do with the report, and do you provide recommendations?"

**Likely Discovery:** Requires interpretation and recommendations → **AI Agent** or **Agentic AI**

## Testing

The enhanced prompt will be tested through:

1. **Real User Sessions**: Monitor sessions to see if questions are more comprehensive
2. **Classification Accuracy**: Track if classifications are more accurate after clarification
3. **User Feedback**: Collect feedback on whether questions feel thorough but not overwhelming

## Monitoring

After deployment, track:

1. **Question Quality**: Are the new critical questions being asked?
2. **Discovery Depth**: Are we uncovering data source and output usage information?
3. **Classification Changes**: Are classifications different after enhanced clarification?
4. **User Satisfaction**: Do users feel the questions are helpful and relevant?

## Future Enhancements

1. **Domain-Specific Questions**: Tailor questions based on industry or process type
2. **Adaptive Questioning**: Learn which questions are most valuable for different scenarios
3. **Question Templates**: Pre-defined question sets for common process types
4. **Multi-Turn Clarification**: Allow follow-up questions based on previous answers

## Conclusion

The enhanced clarification prompt (v1.1) ensures the system asks critical questions about:
- Data source and nature (observational vs. transactional)
- Output format and usage (who uses it and how)
- Human judgment requirements (interpretation vs. mechanical)
- Process variability (standardized vs. contextual)

This prevents premature classification of processes that appear automatable but actually require human expertise, leading to more accurate recommendations and better user outcomes.
