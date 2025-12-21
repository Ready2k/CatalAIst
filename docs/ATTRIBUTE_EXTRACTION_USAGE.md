# Attribute Extraction - Current Usage

## Overview

The **attribute extraction prompt** is **actively being used** in the CatalAIst classification workflow. It extracts structured business attributes from process descriptions and conversation history, which are then used by the decision matrix to refine classifications.

## When It's Used

Attribute extraction is called in **4 endpoints**:

### 1. `/api/process/submit` - Initial Process Submission
**When**: After initial classification, before returning results
**Purpose**: Extract attributes for decision matrix evaluation on first submission

```typescript
const extractedAttributes = await classificationService.extractAttributes(
  scrubbedInput.scrubbedText,
  [], // No conversation history yet
  { processDescription, model, provider, apiKey, ... }
);
```

### 2. `/api/process/classify` - Force Classification
**When**: When user skips clarification interview or after clarification
**Purpose**: Extract attributes with full conversation context

```typescript
const extractedAttributes = await classificationService.extractAttributes(
  latestConversation.processDescription,
  conversationHistory, // Includes all Q&A
  { processDescription, conversationHistory, model, provider, apiKey, ... }
);
```

### 3. `/api/process/clarify` - After Clarification Answers
**When**: After user answers clarification questions and classification proceeds
**Purpose**: Extract attributes with enriched context from clarification

```typescript
const extractedAttributes = await classificationService.extractAttributes(
  latestConversation.processDescription,
  latestConversation.clarificationQA, // Full Q&A history
  { processDescription, conversationHistory, model, provider, apiKey, ... }
);
```

### 4. `/api/process/reclassify` - Admin Reclassification
**When**: Admin triggers reclassification with updated decision matrix
**Purpose**: Re-extract attributes with current prompt version

```typescript
const extractedAttributes = await classificationService.extractAttributes(
  latestConversation.processDescription,
  latestConversation.clarificationQA,
  { processDescription, conversationHistory, model, provider, apiKey, ... }
);
```

## What Attributes Are Extracted

The LLM extracts **6 key business attributes**:

| Attribute | Type | Possible Values | Purpose |
|-----------|------|-----------------|---------|
| **frequency** | categorical | hourly, daily, weekly, monthly, quarterly, annually, ad-hoc | How often the process runs |
| **business_value** | categorical | critical, high, medium, low | Business impact |
| **complexity** | categorical | very_high, high, medium, low, very_low | Process complexity |
| **risk** | categorical | critical, high, medium, low | Risk if process fails |
| **user_count** | categorical | 1-5, 6-20, 21-50, 51-100, 100+ | Number of users affected |
| **data_sensitivity** | categorical | public, internal, confidential, restricted | Data sensitivity level |

Each attribute includes:
- **value**: The extracted value
- **explanation**: Brief explanation of how it was determined

## How Extracted Attributes Are Used

### 1. Decision Matrix Evaluation

Extracted attributes are passed to the decision matrix evaluator:

```typescript
const attributeValues: { [key: string]: any } = {};
for (const [key, value] of Object.entries(extractedAttributes)) {
  attributeValues[key] = value.value; // Extract just the value
}

const decisionMatrix = await versionedStorage.getLatestDecisionMatrix();
const decisionMatrixEvaluation = evaluatorService.evaluateMatrix(
  decisionMatrix,
  classificationResult.result,
  attributeValues // Attributes used here
);
```

### 2. Rule Matching

Decision matrix rules use these attributes to:
- **Override classifications**: Force a specific category based on attributes
- **Adjust confidence**: Increase/decrease confidence based on attributes
- **Flag for review**: Mark sessions requiring manual review

Example rule:
```json
{
  "name": "High Risk Requires Review",
  "conditions": [
    { "attribute": "risk", "operator": "==", "value": "critical" }
  ],
  "action": {
    "type": "flag_review",
    "rationale": "Critical risk processes require manual review"
  }
}
```

### 3. Storage

Extracted attributes are stored in the session:

```typescript
session.classification = {
  category: finalClassification.category,
  confidence: finalClassification.confidence,
  // ...
  decisionMatrixEvaluation: {
    matrixVersion: "1.0",
    originalClassification: {...},
    extractedAttributes: {  // ← Stored here
      frequency: { value: "daily", explanation: "..." },
      business_value: { value: "high", explanation: "..." },
      // ...
    },
    triggeredRules: [...],
    finalClassification: {...}
  }
};
```

### 4. Admin Visibility

For admin users, extracted attributes are returned in the API response:

```json
{
  "sessionId": "...",
  "classification": {...},
  "decisionMatrixEvaluation": {...},
  "extractedAttributes": {
    "frequency": {
      "value": "daily",
      "explanation": "Process runs every business day"
    },
    "business_value": {
      "value": "high",
      "explanation": "Critical for monthly financial reporting"
    },
    // ...
  }
}
```

## Workflow Diagram

```
User submits process description
         ↓
    LLM Classification
         ↓
    [Clarification?] → Yes → Ask questions → Get answers
         ↓ No                                      ↓
    Extract Attributes ←─────────────────────────┘
         ↓
    {
      frequency: "daily",
      business_value: "high",
      complexity: "medium",
      risk: "low",
      user_count: "21-50",
      data_sensitivity: "internal"
    }
         ↓
    Evaluate Decision Matrix Rules
         ↓
    Apply rule actions (override/adjust/flag)
         ↓
    Final Classification
         ↓
    Store in session + Return to admin
```

## Error Handling

If attribute extraction fails, the system gracefully degrades:

```typescript
try {
  extractedAttributes = await classificationService.extractAttributes(...);
  // Use decision matrix with attributes
} catch (attrError) {
  console.warn('Attribute extraction failed, using classification without decision matrix:', attrError);
  // Continue with LLM classification only
}
```

This ensures classification always succeeds even if attribute extraction fails.

## Benefits of Attribute Extraction

### 1. Structured Data
- Converts unstructured text into structured attributes
- Enables rule-based decision making
- Provides consistent attribute format

### 2. Decision Matrix Integration
- Attributes feed into decision matrix rules
- Enables sophisticated classification logic
- Allows non-technical users to define rules

### 3. Analytics & Reporting
- Track attribute distributions across processes
- Identify patterns (e.g., "high-risk processes are often misclassified")
- Compare attributes across categories

### 4. Explainability
- Each attribute includes an explanation
- Shows why the LLM assigned each value
- Helps users understand the classification

### 5. Audit Trail
- Attributes stored with each classification
- Can review what attributes influenced decisions
- Enables retrospective analysis

## Current Limitations

### 1. Not Visible in UI
**Issue**: Extracted attributes are returned to admins but not displayed in the frontend UI

**Impact**: Admins can't see what attributes were extracted unless they inspect API responses

**Recommendation**: Add an "Attributes" section to the ClassificationResult component

### 2. No Attribute History
**Issue**: Can't track how attributes change over time or across similar processes

**Impact**: Can't analyze attribute trends or consistency

**Recommendation**: Add attribute analytics dashboard

### 3. No Manual Override
**Issue**: If LLM extracts wrong attribute value, admin can't correct it

**Impact**: Incorrect attributes may trigger wrong rules

**Recommendation**: Add attribute editing in admin review workflow

### 4. Limited Validation
**Issue**: LLM might return values not in possibleValues list

**Impact**: Decision matrix rules may not match

**Recommendation**: Add strict validation and fallback to "unknown"

## Recommendations for Improvement

### 1. Display Attributes in UI

Add to `ClassificationResult.tsx`:

```typescript
{classification.decisionMatrixEvaluation?.extractedAttributes && (
  <div style={{ marginTop: '20px' }}>
    <h3>Extracted Attributes</h3>
    <table>
      <thead>
        <tr>
          <th>Attribute</th>
          <th>Value</th>
          <th>Explanation</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(classification.decisionMatrixEvaluation.extractedAttributes).map(([key, attr]) => (
          <tr key={key}>
            <td>{key}</td>
            <td><strong>{attr.value}</strong></td>
            <td>{attr.explanation}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
```

### 2. Add Attribute Analytics

Create new analytics endpoint:

```typescript
GET /api/analytics/attributes
```

Returns:
- Attribute value distributions
- Correlation between attributes and categories
- Attribute consistency by subject
- Common attribute patterns

### 3. Enable Attribute Editing

In admin review workflow, allow editing attributes:

```typescript
POST /api/admin/review/:sessionId/attributes
{
  "frequency": "weekly",  // Corrected value
  "reason": "User clarified in follow-up"
}
```

Then re-evaluate decision matrix with corrected attributes.

### 4. Add Attribute Validation

In `ClassificationService.parseAttributeExtractionResponse()`:

```typescript
// Validate against possibleValues
const validValues = {
  frequency: ['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'ad-hoc'],
  business_value: ['critical', 'high', 'medium', 'low'],
  // ...
};

if (!validValues[attr].includes(value)) {
  console.warn(`Invalid value "${value}" for ${attr}, using "unknown"`);
  result[attr].value = 'unknown';
}
```

### 5. Add Attribute Confidence Scores

Enhance prompt to return confidence for each attribute:

```json
{
  "frequency": {
    "value": "daily",
    "confidence": 0.95,
    "explanation": "Explicitly stated in description"
  }
}
```

Use confidence to:
- Flag low-confidence attributes for review
- Weight attributes differently in decision matrix
- Show uncertainty in UI

## Testing Attribute Extraction

### Manual Test

1. Submit a process with clear attributes:
```
"We process customer invoices every day. About 50 people use this system. 
It's a critical process for our business. The data includes customer PII 
and payment information. The process has 15 steps and involves 3 different systems."
```

2. Check extracted attributes (admin view):
```json
{
  "frequency": { "value": "daily", "explanation": "..." },
  "business_value": { "value": "critical", "explanation": "..." },
  "complexity": { "value": "high", "explanation": "15 steps, 3 systems" },
  "risk": { "value": "high", "explanation": "..." },
  "user_count": { "value": "51-100", "explanation": "About 50 people" },
  "data_sensitivity": { "value": "confidential", "explanation": "PII and payment info" }
}
```

3. Verify decision matrix uses attributes correctly

### Automated Test

```typescript
describe('Attribute Extraction', () => {
  it('should extract all 6 attributes', async () => {
    const result = await classificationService.extractAttributes(
      processDescription,
      [],
      { provider: 'openai', apiKey, model: 'gpt-4' }
    );
    
    expect(result).toHaveProperty('frequency');
    expect(result).toHaveProperty('business_value');
    expect(result).toHaveProperty('complexity');
    expect(result).toHaveProperty('risk');
    expect(result).toHaveProperty('user_count');
    expect(result).toHaveProperty('data_sensitivity');
    
    expect(result.frequency.value).toMatch(/hourly|daily|weekly|monthly|quarterly|annually|ad-hoc|unknown/);
  });
});
```

## Conclusion

The attribute extraction prompt is **fully integrated and actively used** in the classification workflow. It provides structured data that enables sophisticated decision matrix rules and improves classification accuracy.

The main opportunity for improvement is **visibility** - making extracted attributes visible in the UI so admins can see and validate them.

---

**Last Updated**: November 16, 2025
**Status**: ✅ Fully Implemented and Active
