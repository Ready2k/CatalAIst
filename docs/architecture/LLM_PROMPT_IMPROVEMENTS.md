# LLM Prompt Improvements for Decision Matrix Generation

## Problem

The AI was generating invalid decision matrices and learning suggestions that caused validation errors:

1. **Non-existent attributes**: Rules referenced attributes like "subject" that didn't exist
2. **Invalid enum values**: Using "low" for `data_sensitivity` instead of "public"
3. **Wrong value types**: Using "daily" for attributes that didn't support it
4. **Invalid categories**: Suggesting categories that don't exist

These errors meant rules couldn't be used, breaking the classification system.

## Root Cause

The LLM prompts were not explicit enough about validation rules. The AI would:
- Create attributes that seemed logical but weren't in the schema
- Use intuitive values like "low" without checking possibleValues
- Not validate against the existing matrix structure

## Solution

### 1. Enhanced Decision Matrix Generation Prompt

**Added Critical Validation Rules Section:**

```
CRITICAL VALIDATION RULES - YOU MUST FOLLOW THESE:
1. **Attribute Names**: Only use these exact attribute names: 
   frequency, business_value, complexity, risk, user_count, data_sensitivity
   
2. **Attribute Values**: ONLY use values from the possibleValues array for each attribute

3. **No Custom Attributes**: Do NOT create attributes like "subject", "domain", "department"

4. **Condition Values**: Every condition value MUST exist in the attribute's possibleValues array

5. **Target Categories**: ONLY use these exact categories: 
   Eliminate, Simplify, Digitise, RPA, AI Agent, Agentic AI
   
6. **Action Types**: ONLY use: override, adjust_confidence, or flag_review

7. **Operators**: ONLY use: ==, !=, >, <, >=, <=, in, not_in
```

**Added Validation Examples:**

```
✅ CORRECT: {"attribute": "frequency", "operator": "in", "value": ["daily", "hourly"]}
❌ WRONG: {"attribute": "frequency", "operator": "in", "value": ["high"]}
❌ WRONG: {"attribute": "subject", "operator": "==", "value": "Finance"}
✅ CORRECT: {"attribute": "complexity", "operator": "==", "value": "low"}
❌ WRONG: {"attribute": "data_sensitivity", "operator": "==", "value": "low"}
```

**Updated Attribute Definitions:**

Changed from vague descriptions to explicit possibleValues:

```typescript
// Before (vague)
frequency: "How often the process runs (categorical: daily, weekly, monthly, quarterly, yearly)"

// After (explicit)
frequency: "How often the process runs (categorical: rare, monthly, weekly, daily, hourly)"
```

### 2. Enhanced Learning Suggestion Prompt

**Added Validation Rules:**

```
CRITICAL VALIDATION RULES - YOU MUST FOLLOW THESE:
1. **Existing Attributes Only**: ONLY reference attributes that exist in the current matrix
2. **Valid Values Only**: Condition values MUST be from the attribute's possibleValues
3. **No New Attributes**: Do NOT suggest new_attribute type
4. **Valid Categories**: targetCategory MUST be one of the 6 valid categories
5. **Valid Operators**: ONLY use the supported operators
6. **Check Existing Rules**: Do NOT duplicate existing rules
```

**Added Pre-Suggestion Checklist:**

```
Before suggesting a rule, verify:
- All attributes in conditions exist in the matrix
- All values are in the attribute's possibleValues
- The targetCategory is valid
- You're not duplicating an existing rule
```

### 3. Enhanced Parsing with Validation

**Decision Matrix Parser:**

Added validation logic that:
- Validates attribute references exist
- Checks categorical values against possibleValues
- Filters out invalid conditions
- Skips rules with no valid conditions
- Validates and sanitizes targetCategory
- Clamps weights and priorities to valid ranges
- Logs warnings for debugging

**Example Validation:**

```typescript
// Validate conditions reference existing attributes
const validatedConditions = rule.conditions.filter((cond: any) => {
  if (!attributeMap.has(cond.attribute)) {
    console.warn(`Rule "${rule.name}" references non-existent attribute "${cond.attribute}"`);
    return false;
  }

  // Validate categorical values
  const possibleValues = attributeMap.get(cond.attribute);
  if (possibleValues) {
    const values = Array.isArray(cond.value) ? cond.value : [cond.value];
    const invalidValues = values.filter((v: string) => !possibleValues.includes(v));
    if (invalidValues.length > 0) {
      console.warn(`Rule "${rule.name}" uses invalid values [${invalidValues.join(', ')}]`);
      return false;
    }
  }

  return true;
});
```

**Learning Suggestion Parser:**

Added validation that:
- Validates targetCategory against valid categories
- Converts arrays to single values
- Clamps weights and priorities
- Filters out new_attribute suggestions (not supported)
- Sanitizes invalid suggestions

### 4. Improved Attribute Definitions

**Standardized possibleValues:**

```typescript
// Frequency
possibleValues: ["rare", "monthly", "weekly", "daily", "hourly"]

// Complexity
possibleValues: ["low", "medium", "high", "very_high"]

// Business Value
possibleValues: ["low", "medium", "high", "critical"]

// Risk
possibleValues: ["low", "medium", "high", "critical"]

// User Count (changed from numeric to categorical)
possibleValues: ["1-10", "11-50", "51-200", "200+"]

// Data Sensitivity
possibleValues: ["public", "internal", "confidential", "restricted"]
```

## Impact

### Before:
```
❌ ERROR: Attribute "subject" does not exist
❌ WARNING: Value "low" not in possible values: [public, internal, confidential, restricted]
❌ WARNING: Value "daily" not in possible values: [daily, weekly, monthly, quarterly, yearly]
```

### After:
```
✅ All attributes validated before use
✅ All values checked against possibleValues
✅ Invalid rules filtered out automatically
✅ Clear warnings logged for debugging
✅ Matrix always valid and usable
```

## Benefits

1. **Robust Generation**: AI can't create invalid matrices
2. **Self-Healing**: Invalid suggestions are filtered out automatically
3. **Better Debugging**: Clear warnings show what was filtered and why
4. **Consistent Quality**: Every generated matrix follows the same rules
5. **No Manual Fixes**: Users don't need to fix AI-generated errors

## Testing

### Test Matrix Generation:

```bash
# Generate a new matrix
POST /api/decision-matrix/generate

# Check logs for warnings
# Should see: "Parsed matrix: X attributes, Y valid rules (Z rules filtered out)"

# Verify no validation errors in UI
# All rules should be valid
```

### Test Learning Suggestions:

```bash
# Trigger analysis
POST /api/learning/analyze

# Check generated suggestions
# Should only reference existing attributes
# Should only use valid values
# Should not suggest new attributes
```

## Monitoring

### Logs to Watch:

```
✅ Good: "Parsed matrix: 6 attributes, 12 valid rules (0 rules filtered out)"
⚠️  Warning: "Parsed matrix: 6 attributes, 10 valid rules (2 rules filtered out)"
❌ Bad: "Failed to parse decision matrix from LLM response"
```

### Metrics to Track:

- **Filter Rate**: How many rules/suggestions are filtered out
- **Validation Errors**: Should be zero after generation
- **User Corrections**: Should decrease over time
- **Matrix Quality**: Measured by validation testing

## Future Improvements

1. **Stricter Prompts**: Add more examples and constraints
2. **Schema Validation**: Validate against JSON schema before parsing
3. **LLM Fine-tuning**: Train on valid examples
4. **Feedback Loop**: Use validation errors to improve prompts
5. **Template System**: Provide rule templates to LLM

## Files Modified

- `backend/src/services/decision-matrix.service.ts`
  - Enhanced generation prompt with validation rules
  - Added validation in parseMatrixResponse()
  - Added filtering of invalid rules

- `backend/src/services/learning-suggestion.service.ts`
  - Enhanced suggestion prompt with validation rules
  - Added validation in parseSuggestions()
  - Added filtering of invalid suggestions

## Related Documentation

- `docs/DECISION_MATRIX_BEST_PRACTICES.md` - User guide
- `docs/QUICK_FIX_DECISION_MATRIX.md` - Quick fixes
- `docs/DECISION_MATRIX_FLOW_VISUALIZATION.md` - Flow editor guide

---

**Implemented:** November 16, 2025  
**Version:** 3.1.3  
**Status:** Complete
