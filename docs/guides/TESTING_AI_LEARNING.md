# Testing AI Learning Enhancements

## Prerequisites

1. Backend and frontend are running
2. You have an OpenAI API key or AWS Bedrock credentials configured
3. You have at least some sessions with feedback in the system

## Test Scenarios

### 1. Basic Analysis (No Filters)

**Steps:**
1. Navigate to AI Learning Admin tab
2. Click "🔍 Trigger Analysis"
3. Wait for analysis to complete

**Expected:**
- Analysis completes successfully
- Shows analysis report with:
  - Total sessions analyzed
  - Overall agreement rate
  - Identified patterns
  - Common misclassifications
- Generates suggestions (if patterns found)
- Prompts to validate matrix

**Pass/Fail:** ___

---

### 2. Date Range Filtering

**Steps:**
1. Click "📅 Show Filters"
2. Set start date (e.g., 30 days ago)
3. Set end date (today)
4. Click "🔍 Trigger Analysis"

**Expected:**
- Only analyzes sessions within date range
- Shows correct date range in analysis report
- Faster than analyzing all data

**Pass/Fail:** ___

---

### 3. Misclassifications-Only Mode

**Steps:**
1. Show filters
2. Ensure "Misclassifications Only" is checked (default)
3. Trigger analysis

**Expected:**
- Only analyzes sessions where users corrected classification
- Excludes confirmed classifications
- Shows focused patterns on problem areas

**Pass/Fail:** ___

---

### 4. All Feedback Mode

**Steps:**
1. Show filters
2. Uncheck "Misclassifications Only"
3. Trigger analysis

**Expected:**
- Analyzes all sessions with feedback (confirmed + corrected)
- May take longer than misclassifications-only
- Shows broader patterns

**Pass/Fail:** ___

---

### 5. Matrix Validation Testing

**Steps:**
1. Trigger analysis (any mode)
2. Wait for analysis to complete
3. When prompted, click "✓ Yes, Test Matrix"
4. Wait for validation to complete

**Expected:**
- Shows validation prompt after analysis
- Calculates sample size (at least 10% of sessions)
- Re-classifies sampled sessions
- Shows results:
  - Sample size and percentage
  - Improved count
  - Unchanged count
  - Worsened count
  - Improvement rate percentage
- Results are color-coded (green=good, red=bad)

**Pass/Fail:** ___

---

### 6. Skip Validation

**Steps:**
1. Trigger analysis
2. When prompted, click "Skip for Now"

**Expected:**
- Validation prompt closes
- Can still view analysis results
- Can approve/reject suggestions

**Pass/Fail:** ___

---

### 7. Approve Suggestion

**Steps:**
1. Trigger analysis to generate suggestions
2. Review a pending suggestion
3. Optionally add review notes
4. Click "✓ Approve"

**Expected:**
- Suggestion status changes to "approved"
- Suggestion moves to "Reviewed Suggestions" section
- Decision matrix is updated with the change
- New matrix version is created

**Pass/Fail:** ___

---

### 8. Reject Suggestion

**Steps:**
1. Review a pending suggestion
2. Add review notes explaining why
3. Click "✗ Reject"

**Expected:**
- Suggestion status changes to "rejected"
- Suggestion moves to "Reviewed Suggestions" section
- Review notes are saved
- Decision matrix is NOT changed

**Pass/Fail:** ___

---

### 9. Large Dataset Performance

**Setup:** Create 100+ sessions with feedback (or use existing data)

**Steps:**
1. Show filters
2. Select date range with 100+ sessions
3. Enable "Misclassifications Only"
4. Trigger analysis

**Expected:**
- Analysis completes in reasonable time (< 60 seconds)
- No memory errors
- Progress tracking works (if implemented)
- Results are accurate

**Pass/Fail:** ___

---

### 10. Empty Dataset Handling

**Steps:**
1. Set date range with no sessions
2. Trigger analysis

**Expected:**
- Shows error: "No sessions with feedback found in the specified date range"
- Does not crash
- Can try again with different filters

**Pass/Fail:** ___

---

### 11. No LLM Config Error

**Steps:**
1. Logout
2. Login
3. Go to AI Learning without configuring LLM
4. Try to trigger analysis

**Expected:**
- Shows error about missing LLM configuration
- Prompts to configure in Configuration tab
- Does not crash

**Pass/Fail:** ___

---

### 12. Validation with Small Dataset

**Setup:** Ensure < 100 sessions with misclassifications

**Steps:**
1. Trigger analysis
2. Run validation test

**Expected:**
- Sample size is at least 10% of sessions
- Minimum sample size is 10 (if enough sessions exist)
- All sessions tested if < 10 sessions available
- Results are accurate

**Pass/Fail:** ___

---

### 13. Validation with Large Dataset

**Setup:** Ensure 1000+ sessions with misclassifications

**Steps:**
1. Trigger analysis
2. Run validation test

**Expected:**
- Sample size is capped at 1000 sessions
- Sample percentage shown correctly
- Validation completes in reasonable time
- Results are representative

**Pass/Fail:** ___

---

### 14. UI Responsiveness

**Steps:**
1. Test all buttons and interactions
2. Check filter panel expand/collapse
3. Review suggestion cards
4. Check validation results display

**Expected:**
- All buttons respond immediately
- No UI freezing during analysis
- Smooth animations and transitions
- Readable text and proper spacing
- Color coding is clear

**Pass/Fail:** ___

---

### 15. Error Recovery

**Steps:**
1. Trigger analysis with invalid API key
2. Observe error handling
3. Fix API key
4. Try again

**Expected:**
- Shows clear error message
- Does not crash
- Can retry after fixing issue
- Previous state is preserved

**Pass/Fail:** ___

---

## Performance Benchmarks

| Dataset Size | Misclassifications Only | Expected Time | Actual Time |
|--------------|-------------------------|---------------|-------------|
| 10 sessions  | Yes                     | < 5 seconds   | _____       |
| 50 sessions  | Yes                     | < 10 seconds  | _____       |
| 100 sessions | Yes                     | < 20 seconds  | _____       |
| 500 sessions | Yes                     | < 45 seconds  | _____       |
| 1000 sessions| Yes                     | < 60 seconds  | _____       |

## Browser Compatibility

Test in multiple browsers:

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

## Notes

Add any observations, bugs, or suggestions here:

---

## Sign-Off

- **Tester Name:** _______________
- **Date:** _______________
- **Overall Result:** PASS / FAIL
- **Comments:** _______________
