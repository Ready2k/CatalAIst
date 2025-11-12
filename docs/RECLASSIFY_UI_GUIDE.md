# Reclassify Button - UI Guide

## Where to Find It

### 1. Analytics Dashboard
```
Analytics Dashboard
  ↓
Click on any Session ID
  ↓
Session Detail Modal Opens
  ↓
Click "Classification" Tab
  ↓
See "🔄 Reclassify" Button (top right)
```

## Visual Layout

```
┌─────────────────────────────────────────────────────────┐
│  Session Details                                    [X] │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Conversations] [Classification] [...]      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Classification Details          [🔄 Reclassify]        │
│  ─────────────────────────────────────────────          │
│                                                          │
│  Category:  [Digitise]                                  │
│  Confidence: 75%  ████████████░░░░░░░░                  │
│                                                          │
│  Rationale:                                             │
│  The process involves manual collection...              │
│                                                          │
│  Category Progression:                                  │
│  Elimination is not appropriate...                      │
│                                                          │
│  Future Opportunities:                                  │
│  Once digitised, this process could...                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## What Happens When You Click

### Step 1: Confirmation Dialog
```
┌─────────────────────────────────────────────┐
│  Confirm Reclassification                   │
├─────────────────────────────────────────────┤
│                                             │
│  Are you sure you want to reclassify       │
│  this session with the current decision    │
│  matrix?                                    │
│                                             │
│  [Cancel]              [OK]                 │
└─────────────────────────────────────────────┘
```

### Step 2: Processing
```
┌─────────────────────────────────────────────────────────┐
│  Classification Details    [🔄 Reclassifying...]        │
│  ─────────────────────────────────────────────          │
│                                                          │
│  (Button is disabled and shows loading state)           │
└─────────────────────────────────────────────────────────┘
```

### Step 3: Result Display

#### If Classification Changed:
```
┌─────────────────────────────────────────────────────────┐
│  ✅ Classification Changed!                              │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Original:              →              New:             │
│  [Digitise]                           [RPA]             │
│  Confidence: 75%                      Confidence: 82%   │
│  Matrix: 1.0                          Matrix: 2.0       │
│                                                          │
│  Confidence change: +7.0%                               │
│                                                          │
│  Page will reload in 3 seconds to show updated          │
│  classification...                                      │
└─────────────────────────────────────────────────────────┘
```

#### If Classification Unchanged:
```
┌─────────────────────────────────────────────────────────┐
│  ℹ️ Classification Unchanged                             │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Original:              →              New:             │
│  [Digitise]                           [Digitise]        │
│  Confidence: 75%                      Confidence: 77%   │
│  Matrix: 1.0                          Matrix: 2.0       │
│                                                          │
│  Confidence change: +2.0%                               │
│                                                          │
│  Page will reload in 3 seconds to show updated          │
│  classification...                                      │
└─────────────────────────────────────────────────────────┘
```

### Step 4: Auto-Reload
After 3 seconds, the page automatically reloads to show the updated classification.

## Features

### ✅ Visual Comparison
- Side-by-side view of original vs new classification
- Color-coded category badges
- Confidence percentage display
- Decision matrix version shown

### ✅ Clear Feedback
- Green box if classification changed
- Blue box if classification unchanged
- Shows confidence delta
- Auto-reload notification

### ✅ Error Handling
```
┌─────────────────────────────────────────────────────────┐
│  ❌ Error: Failed to reclassify session                  │
│                                                          │
│  Missing AWS credentials. Please check your             │
│  credentials in settings.                               │
└─────────────────────────────────────────────────────────┘
```

### ✅ Accessibility
- Keyboard accessible
- Screen reader friendly
- Clear visual feedback
- Confirmation dialog prevents accidents

## Use Cases

### 1. After Updating Decision Matrix
```
1. Update decision matrix rules
2. Go to Analytics Dashboard
3. Select a session to test
4. Click Classification tab
5. Click "🔄 Reclassify"
6. Review the changes
```

### 2. Quality Assurance
```
1. User disputes a classification
2. Find the session in Analytics
3. Review the classification details
4. Click "🔄 Reclassify" to verify
5. Compare original vs new
```

### 3. Testing Improvements
```
1. Make changes to prompts or matrix
2. Select sample sessions
3. Reclassify each one
4. Measure improvement
```

## Technical Details

### What Gets Sent
```json
{
  "sessionId": "abc-123",
  "useOriginalModel": true,
  "reason": "Admin reclassification from UI",
  "provider": "bedrock",
  "awsAccessKeyId": "...",
  "awsSecretAccessKey": "..."
}
```

### What You Get Back
```json
{
  "sessionId": "abc-123",
  "reclassified": true,
  "original": {
    "category": "Digitise",
    "confidence": 0.75,
    "matrixVersion": "1.0"
  },
  "new": {
    "category": "RPA",
    "confidence": 0.82,
    "matrixVersion": "2.0"
  },
  "changed": true,
  "confidenceDelta": 0.07,
  "decisionMatrixEvaluation": {...},
  "extractedAttributes": {...}
}
```

## Credentials

The button automatically uses credentials from `sessionStorage`:
- For OpenAI: Uses `apiKey`
- For Bedrock: Uses `awsAccessKeyId`, `awsSecretAccessKey`, `awsSessionToken`, `awsRegion`

Make sure credentials are stored in `sessionStorage` under the key `llmCredentials`:
```javascript
sessionStorage.setItem('llmCredentials', JSON.stringify({
  apiKey: 'sk-...',
  // or for Bedrock:
  awsAccessKeyId: 'AKIA...',
  awsSecretAccessKey: '...',
  awsSessionToken: '...',
  awsRegion: 'us-east-1'
}));
```

## Troubleshooting

### Button Not Appearing
- Check that you're on the "Classification" tab
- Verify the session has a classification
- Refresh the page

### Reclassification Fails
- Check credentials in sessionStorage
- Verify backend is running
- Check browser console for errors
- Review backend logs

### No Changes After Reclassification
- Decision matrix may not have changed
- Same rules triggered
- Check decision matrix version in result

### Page Doesn't Reload
- Check browser console for errors
- Manually refresh the page
- Result is still saved in backend

## Best Practices

### 1. Test on Sample First
Before batch reclassifying:
- Test on 2-3 sessions first
- Review the changes
- Verify decision matrix is working as expected

### 2. Document Changes
When reclassifying:
- Note why you're reclassifying
- Record the decision matrix version
- Track which sessions were affected

### 3. Monitor Results
After reclassification:
- Check Analytics Dashboard for updated metrics
- Review agreement rates
- Verify improvements

### 4. Communicate Changes
If classifications change significantly:
- Notify stakeholders
- Explain the improvements
- Provide examples

## Future Enhancements

Planned improvements:
- [ ] Bulk reclassification (select multiple sessions)
- [ ] Reclassification history view
- [ ] Compare different models side-by-side
- [ ] Preview changes before applying
- [ ] Undo reclassification
- [ ] Export reclassification report

## Summary

The Reclassify button provides a powerful, user-friendly way to:
- ✅ Test decision matrix updates
- ✅ Verify classifications
- ✅ Compare before/after
- ✅ Ensure quality
- ✅ Continuous improvement

All from the familiar Analytics Dashboard interface!
