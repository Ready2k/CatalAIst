# Decision Matrix Best Practices & Common Issues

## Common Problems & Solutions

### 1. Missing Attributes

**Problem:** Rules reference attributes that don't exist in the matrix.

**Example Error:**
```
ERROR: Attribute "subject" does not exist
```

**Solution:**
- Either add the missing attribute to the matrix
- Or remove/update rules that reference it

**How to Fix:**
1. Go to Decision Matrix Admin
2. Check which attributes are defined (frequency, complexity, business_value, etc.)
3. Ensure all rule conditions only use these attributes
4. If "subject" is needed, add it as an attribute first

### 2. Invalid Enum Values

**Problem:** Conditions use values that aren't in the attribute's possible values list.

**Example Error:**
```
WARNING: Value "low" is not in possible values: [public, internal, confidential, restricted]
```

**Solution:**
- Check the attribute's `possibleValues` array
- Use only values from that list
- Or update the attribute to include the new value

**Common Attributes & Their Values:**

```typescript
// Frequency
possibleValues: ["rare", "monthly", "weekly", "daily", "hourly"]

// Complexity  
possibleValues: ["low", "medium", "high", "very_high"]

// Business Value
possibleValues: ["low", "medium", "high", "critical"]

// Risk
possibleValues: ["low", "medium", "high", "critical"]

// Data Sensitivity
possibleValues: ["public", "internal", "confidential", "restricted"]

// User Count
possibleValues: ["1-10", "11-50", "51-200", "200+"]
```

### 3. Unused or Redundant Rules

**Problem:** Rules that never trigger or are overridden by higher priority rules.

**Signs:**
- Rule priority is too low
- Conditions are too specific
- Overlaps with other rules
- Never appears in classification rationale

**Solution:**
- Review rule priorities (higher number = higher priority)
- Simplify overly complex conditions
- Remove duplicate or redundant rules
- Test rules with real data

## Decision Matrix Structure

### Recommended Attributes

**Core Attributes (Always Include):**
1. **frequency** - How often the process runs
   - Type: categorical
   - Values: ["rare", "monthly", "weekly", "daily", "hourly"]
   - Weight: 0.8-1.0

2. **complexity** - Technical complexity
   - Type: categorical
   - Values: ["low", "medium", "high", "very_high"]
   - Weight: 0.7-0.9

3. **business_value** - Business impact
   - Type: categorical
   - Values: ["low", "medium", "high", "critical"]
   - Weight: 0.9-1.0

4. **risk** - Risk of automation failure
   - Type: categorical
   - Values: ["low", "medium", "high", "critical"]
   - Weight: 0.6-0.8

5. **user_count** - Number of users affected
   - Type: categorical
   - Values: ["1-10", "11-50", "51-200", "200+"]
   - Weight: 0.5-0.7

6. **data_sensitivity** - Data classification
   - Type: categorical
   - Values: ["public", "internal", "confidential", "restricted"]
   - Weight: 0.6-0.8

**Optional Attributes:**
- **manual_effort** - Hours per execution
- **error_rate** - Current error percentage
- **integration_complexity** - Number of systems involved
- **regulatory_requirements** - Compliance needs

### Rule Priority Guidelines

**Priority Ranges:**
- **90-100**: Override rules (special cases)
- **70-89**: High-priority business rules
- **50-69**: Standard classification rules
- **30-49**: Fallback rules
- **10-29**: Default rules

**Example Priority Structure:**
```
Priority 95: High-value + High-frequency → AI Agent
Priority 85: High-complexity + High-risk → Manual Review
Priority 75: Low-complexity + High-frequency → RPA
Priority 65: Medium-complexity + Medium-value → Digitise
Priority 50: Low-value + Low-frequency → Eliminate
Priority 30: Default fallback → Simplify
```

## Validation Rules

### Attribute Validation

✅ **Valid Attribute:**
```json
{
  "name": "frequency",
  "type": "categorical",
  "possibleValues": ["rare", "monthly", "weekly", "daily", "hourly"],
  "weight": 0.8,
  "description": "How often the process is executed"
}
```

❌ **Invalid Attribute:**
```json
{
  "name": "frequency",
  "type": "categorical",
  "possibleValues": [],  // ❌ Empty values
  "weight": 1.5,         // ❌ Weight > 1.0
  "description": ""      // ❌ No description
}
```

### Rule Validation

✅ **Valid Rule:**
```json
{
  "ruleId": "uuid",
  "name": "High Frequency RPA",
  "description": "Processes that run daily or more",
  "priority": 75,
  "active": true,
  "conditions": [
    {
      "attribute": "frequency",      // ✅ Exists in attributes
      "operator": "in",
      "value": ["daily", "hourly"]   // ✅ Valid enum values
    }
  ],
  "action": {
    "type": "override",
    "targetCategory": "RPA",
    "rationale": "High frequency justifies automation"
  }
}
```

❌ **Invalid Rule:**
```json
{
  "ruleId": "uuid",
  "name": "Bad Rule",
  "priority": 75,
  "conditions": [
    {
      "attribute": "subject",        // ❌ Doesn't exist
      "operator": "==",
      "value": "low"                 // ❌ Wrong enum value
    }
  ],
  "action": {
    "type": "override",
    "targetCategory": "Unknown"      // ❌ Invalid category
  }
}
```

## How to Fix Your Current Matrix

### Step 1: Fix Missing "subject" Attribute

**Option A: Remove references to "subject"**
1. Open Flow Editor
2. Find all rules with "subject" conditions
3. Delete those conditions or change to a different attribute

**Option B: Add "subject" attribute**
1. Click "Add Attribute" (if available)
2. Or edit matrix JSON to add:
```json
{
  "name": "subject",
  "type": "categorical",
  "possibleValues": ["Finance", "HR", "Sales", "Operations", "IT"],
  "weight": 0.5,
  "description": "Business area or department"
}
```

### Step 2: Fix Invalid Enum Values

**For "low" error:**
1. Find the condition using "low"
2. Check which attribute it's for
3. If it's `data_sensitivity`, change to: "public", "internal", "confidential", or "restricted"
4. If it's `complexity`, ensure attribute has "low" in possibleValues

**For "daily" error:**
1. Find the condition using "daily"
2. Check the attribute
3. Ensure attribute's possibleValues includes "daily"
4. If using `frequency`, add "daily" to possibleValues

### Step 3: Clean Up Unused Rules

1. Review rules with very low priority (< 30)
2. Check if they ever trigger (look at classification rationale in sessions)
3. Remove rules that:
   - Never appear in rationale
   - Are overridden by higher priority rules
   - Have impossible conditions

### Step 4: Test & Validate

1. Click "Save Changes"
2. Check validation summary
3. Fix any remaining errors
4. Test with sample processes
5. Review classification results

## Maintenance Best Practices

### Regular Reviews

**Monthly:**
- Review classification accuracy
- Check for unused rules
- Update weights based on feedback

**Quarterly:**
- Analyze misclassification patterns
- Add new rules for edge cases
- Remove obsolete rules

**After Major Changes:**
- Export matrix as backup
- Test with validation feature
- Monitor first 50 classifications

### Version Control

1. **Export before changes**: Always export current version
2. **Document changes**: Add description when saving
3. **Test incrementally**: Make small changes, test, repeat
4. **Keep history**: Don't delete old versions

### Testing Strategy

**Test Cases to Cover:**
1. High-frequency, low-complexity → RPA
2. High-value, high-complexity → AI Agent
3. Low-value, low-frequency → Eliminate
4. High-risk, any complexity → Manual Review
5. Edge cases specific to your business

## Common Patterns

### Pattern 1: Frequency-Based Classification

```
IF frequency = "hourly" OR "daily"
  AND complexity = "low" OR "medium"
  THEN RPA

IF frequency = "hourly" OR "daily"  
  AND complexity = "high"
  THEN AI Agent
```

### Pattern 2: Value-Based Classification

```
IF business_value = "critical"
  AND complexity = "high"
  THEN AI Agent

IF business_value = "low"
  AND frequency = "rare"
  THEN Eliminate
```

### Pattern 3: Risk-Based Classification

```
IF risk = "critical" OR "high"
  THEN Manual Review (adjust_confidence -0.3)

IF risk = "low"
  AND complexity = "low"
  THEN RPA
```

## Troubleshooting

### Matrix Won't Save

**Causes:**
- Validation errors present
- Missing required fields
- Invalid JSON structure
- Network timeout

**Solutions:**
1. Check validation summary
2. Fix all errors (red)
3. Consider fixing warnings (yellow)
4. Try saving again

### Rules Not Triggering

**Causes:**
- Priority too low
- Conditions too specific
- Attribute values don't match
- Rule is inactive

**Solutions:**
1. Increase priority
2. Simplify conditions
3. Check attribute values match data
4. Ensure rule is active

### Inconsistent Classifications

**Causes:**
- Conflicting rules
- Incorrect weights
- Missing rules for edge cases
- LLM attribute extraction varies

**Solutions:**
1. Review rule priorities
2. Adjust attribute weights
3. Add rules for edge cases
4. Use validation testing feature

## Tools & Features

### Flow Editor
- Visual rule editing
- Drag-and-drop connections
- Real-time validation
- Node properties panel

### Validation Summary
- Lists all errors and warnings
- Click to jump to problem
- Color-coded severity
- Blocks saving if errors exist

### Export/Import
- Backup before changes
- Share between environments
- Version control
- Disaster recovery

### Validation Testing
- Test matrix improvements
- Random sampling
- Compare before/after
- Measure improvement rate

## Getting Help

### Documentation
- `docs/DECISION_MATRIX_FLOW_VISUALIZATION.md` - Flow editor guide
- `docs/DECISION_MATRIX_EXPORT_IMPORT.md` - Backup/restore guide
- `docs/AI_LEARNING_ENHANCEMENTS.md` - Improvement suggestions

### Support
- Check validation summary for specific errors
- Export matrix and review JSON
- Test with validation feature
- Review audit logs for patterns

---

**Last Updated:** November 16, 2025  
**Version:** 3.1.0
