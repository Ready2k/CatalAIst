# Quick Fix Guide for Your Decision Matrix

## Your Current Errors

Based on the screenshot, you have:
1. ❌ **ERROR**: Attribute "subject" does not exist
2. ⚠️ **WARNING**: Value "low" is not in possible values: [public, internal, confidential, restricted]
3. ⚠️ **WARNING**: Value "daily" is not in possible values: [daily, weekly, monthly, quarterly, yearly]

## Immediate Fixes

### Fix 1: Remove "subject" Attribute References

**The Problem:**
Rules are checking for an attribute called "subject" that doesn't exist in your matrix.

**The Fix:**
1. In Flow Editor, look for condition nodes that say "subject"
2. Click on each one
3. Either:
   - **Option A**: Delete the condition (click 🗑️ Delete)
   - **Option B**: Change to a different attribute (like "business_value" or "complexity")

**Why This Happens:**
- Someone added rules referencing "subject" but never created the attribute
- Or the attribute was deleted but rules weren't updated

### Fix 2: Fix "low" Value Error

**The Problem:**
A rule is checking if `data_sensitivity == "low"`, but data_sensitivity only accepts: [public, internal, confidential, restricted]

**The Fix:**
1. Find the condition checking for "low"
2. Change the value to one of:
   - "public" (if you meant low sensitivity)
   - "internal" (if you meant medium-low)
   - "confidential" (if you meant medium-high)
   - "restricted" (if you meant high)

**Alternative Fix:**
If you meant to check `complexity` or `risk` for "low":
1. Change the attribute from `data_sensitivity` to `complexity` or `risk`
2. Keep the value as "low"

### Fix 3: Fix "daily" Value Error

**The Problem:**
A rule is checking for "daily" but the attribute's possible values are: [daily, weekly, monthly, quarterly, yearly]

**Wait... "daily" IS in the list!**

This might be a display bug. Try:
1. Click on the condition
2. Re-select "daily" from the dropdown
3. Save the rule

If that doesn't work:
1. Check if there's a typo (extra space, different case)
2. Delete the condition and recreate it

## Step-by-Step Fix Process

### Step 1: Export Current Matrix (Backup!)
```
1. Click "📥 Export" button
2. Save the file somewhere safe
3. Now you can fix without fear
```

### Step 2: Fix Errors First (Red)
```
1. Look at validation summary
2. Click "View Node" on the error
3. Fix or delete the problematic condition
4. Repeat for all errors
```

### Step 3: Fix Warnings (Yellow)
```
1. Warnings won't block saving, but fix them anyway
2. Click "View Node" on each warning
3. Update values to match possible values
4. Or update attribute to include the value
```

### Step 4: Save & Test
```
1. Click "Save Changes"
2. Should save successfully now
3. Test with a sample process
4. Check classification works
```

## Recommended Matrix Structure

Here's a clean, working matrix structure you can use:

### Attributes (6 core ones)

```json
[
  {
    "name": "frequency",
    "type": "categorical",
    "possibleValues": ["rare", "monthly", "weekly", "daily", "hourly"],
    "weight": 0.8,
    "description": "How often the process runs"
  },
  {
    "name": "complexity",
    "type": "categorical",
    "possibleValues": ["low", "medium", "high", "very_high"],
    "weight": 0.7,
    "description": "Technical complexity of the process"
  },
  {
    "name": "business_value",
    "type": "categorical",
    "possibleValues": ["low", "medium", "high", "critical"],
    "weight": 1.0,
    "description": "Business impact and value"
  },
  {
    "name": "risk",
    "type": "categorical",
    "possibleValues": ["low", "medium", "high", "critical"],
    "weight": 0.6,
    "description": "Risk of automation failure"
  },
  {
    "name": "user_count",
    "type": "categorical",
    "possibleValues": ["1-10", "11-50", "51-200", "200+"],
    "weight": 0.5,
    "description": "Number of users affected"
  },
  {
    "name": "data_sensitivity",
    "type": "categorical",
    "possibleValues": ["public", "internal", "confidential", "restricted"],
    "weight": 0.7,
    "description": "Data classification level"
  }
]
```

### Sample Rules (Start Simple)

**Rule 1: High Frequency RPA (Priority 80)**
```
IF frequency IN ["daily", "hourly"]
AND complexity IN ["low", "medium"]
THEN override → RPA
```

**Rule 2: High Value AI Agent (Priority 85)**
```
IF business_value = "critical"
AND complexity IN ["high", "very_high"]
THEN override → AI Agent
```

**Rule 3: Low Value Eliminate (Priority 70)**
```
IF business_value = "low"
AND frequency IN ["rare", "monthly"]
THEN override → Eliminate
```

**Rule 4: Simple Digitise (Priority 60)**
```
IF complexity = "low"
AND business_value IN ["medium", "high"]
THEN override → Digitise
```

**Rule 5: Default Simplify (Priority 30)**
```
(No conditions - catches everything else)
THEN adjust_confidence -0.2 → Simplify
```

## Prevention Tips

### 1. Start Simple
- Begin with 3-5 rules
- Add more as you learn
- Don't over-complicate

### 2. Test Frequently
- Save after each rule
- Test with real data
- Use validation feature

### 3. Document Changes
- Add descriptions to rules
- Note why you made changes
- Export after major updates

### 4. Review Regularly
- Check unused rules monthly
- Remove redundant rules
- Update based on feedback

## If You're Still Stuck

### Nuclear Option: Start Fresh

If the matrix is too broken:

1. **Export current matrix** (for reference)
2. **Generate new matrix**:
   - Go to Decision Matrix Admin
   - Click "Generate Decision Matrix"
   - Let AI create a clean baseline
3. **Manually add your custom rules**:
   - Use the generated matrix as foundation
   - Add your specific business rules
   - Test as you go

### Get Help

1. **Check validation summary** - Tells you exactly what's wrong
2. **Review exported JSON** - Sometimes easier to see structure
3. **Use AI Learning** - Suggests improvements based on feedback
4. **Test with validation** - Measures if changes help

## Quick Reference

### Valid Operators
- `==` - Equals
- `!=` - Not equals
- `in` - In list
- `not_in` - Not in list
- `>` - Greater than (numeric)
- `<` - Less than (numeric)
- `>=` - Greater than or equal
- `<=` - Less than or equal

### Valid Categories
- Eliminate
- Simplify
- Digitise
- RPA
- AI Agent
- Agentic AI

### Valid Action Types
- `override` - Force specific category
- `adjust_confidence` - Increase/decrease confidence
- `require_review` - Flag for manual review

---

**Need More Help?**
- See: `docs/DECISION_MATRIX_BEST_PRACTICES.md`
- See: `docs/DECISION_MATRIX_FLOW_VISUALIZATION.md`
