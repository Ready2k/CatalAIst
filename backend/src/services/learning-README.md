# AI Learning Engine

The AI Learning Engine analyzes user feedback on classifications and generates intelligent suggestions to improve the decision matrix over time.

## Components

### 1. LearningAnalysisService

Collects and analyzes feedback data to identify patterns and calculate performance metrics.

**Key Methods:**
- `analyzeFeedback(triggeredBy, startDate?, endDate?)` - Performs complete feedback analysis
- `collectSessionsWithFeedback(startDate?, endDate?)` - Retrieves sessions with feedback
- `calculateOverallAgreementRate(sessions)` - Calculates overall agreement rate
- `calculateAgreementRateByCategory(sessions)` - Calculates agreement rate per category
- `identifyMisclassifications(sessions)` - Identifies common misclassification patterns
- `checkAgreementThreshold(threshold)` - Checks if agreement rate is below threshold

**Storage:**
- Analysis results saved to `/data/learning/analysis-{analysisId}.json`

### 2. LearningSuggestionService

Uses LLM to generate improvement suggestions based on analysis patterns.

**Key Methods:**
- `generateSuggestions(analysis, apiKey)` - Generates suggestions using LLM
- `loadSuggestion(suggestionId)` - Loads a specific suggestion
- `listSuggestions(status?)` - Lists all suggestions, optionally filtered by status
- `updateSuggestionStatus(suggestionId, status, reviewedBy?, reviewNotes?)` - Updates suggestion status

**Suggestion Types:**
- `new_rule` - Add a new decision rule
- `modify_rule` - Modify an existing rule
- `adjust_weight` - Adjust attribute weight
- `new_attribute` - Add a new attribute

**Storage:**
- Suggestions saved to `/data/learning/suggestion-{suggestionId}.json`

## API Endpoints

### Analysis Endpoints

#### POST /api/learning/analyze
Manually trigger learning analysis and generate suggestions.

**Request:**
```json
{
  "apiKey": "sk-...",
  "startDate": "2024-01-01T00:00:00Z",  // optional
  "endDate": "2024-12-31T23:59:59Z"     // optional
}
```

**Response:**
```json
{
  "message": "Analysis completed",
  "analysis": {
    "analysisId": "uuid",
    "triggeredBy": "manual",
    "triggeredAt": "2024-01-15T10:30:00Z",
    "dataRange": {
      "startDate": "2024-01-01T00:00:00Z",
      "endDate": "2024-01-15T10:30:00Z",
      "totalSessions": 150
    },
    "findings": {
      "overallAgreementRate": 0.82,
      "categoryAgreementRates": {
        "Eliminate": 0.90,
        "Simplify": 0.85,
        "Digitise": 0.78,
        "RPA": 0.75,
        "AI Agent": 0.80,
        "Agentic AI": 0.88
      },
      "commonMisclassifications": [
        {
          "from": "RPA",
          "to": "AI Agent",
          "count": 12,
          "examples": ["session-id-1", "session-id-2"]
        }
      ],
      "identifiedPatterns": [
        "Most common misclassification: RPA → AI Agent (12 occurrences)",
        "Over-classification tendency: 15 cases where system classified higher than correct category"
      ]
    },
    "suggestions": ["suggestion-id-1", "suggestion-id-2"]
  },
  "suggestions": [...],
  "suggestionCount": 3
}
```

#### GET /api/learning/analyses
Get all learning analyses.

**Response:**
```json
{
  "analyses": [...],
  "count": 5
}
```

#### GET /api/learning/analyses/:id
Get a specific analysis with its suggestions.

**Response:**
```json
{
  "analysis": {...},
  "suggestions": [...]
}
```

#### GET /api/learning/check-threshold
Check if agreement rate is below threshold (for automatic triggers).

**Query Parameters:**
- `threshold` - Agreement rate threshold (default: 0.8)

**Response:**
```json
{
  "belowThreshold": true,
  "categories": ["RPA", "Digitise"],
  "overallRate": 0.75,
  "threshold": 0.8,
  "recommendation": "Analysis recommended - agreement rate below threshold"
}
```

### Suggestion Endpoints

#### GET /api/learning/suggestions
Get all suggestions, optionally filtered by status.

**Query Parameters:**
- `status` - Filter by status: `pending`, `approved`, `rejected`, `applied`

**Response:**
```json
{
  "suggestions": [
    {
      "suggestionId": "uuid",
      "createdAt": "2024-01-15T10:30:00Z",
      "analysisId": "uuid",
      "type": "new_rule",
      "status": "pending",
      "rationale": "High-frequency RPA processes with low complexity are being misclassified...",
      "impactEstimate": {
        "affectedCategories": ["RPA", "AI Agent"],
        "expectedImprovementPercent": 15,
        "confidenceLevel": 0.85
      },
      "suggestedChange": {
        "newRule": {
          "ruleId": "uuid",
          "name": "High-frequency RPA override",
          "description": "Override to RPA for high-frequency, low-complexity processes",
          "conditions": [
            {
              "attribute": "frequency",
              "operator": "in",
              "value": ["daily", "weekly"]
            },
            {
              "attribute": "complexity",
              "operator": "==",
              "value": "low"
            }
          ],
          "action": {
            "type": "override",
            "targetCategory": "RPA",
            "rationale": "High-frequency, low-complexity processes are ideal for RPA"
          },
          "priority": 50,
          "active": true
        }
      }
    }
  ],
  "count": 3
}
```

#### GET /api/learning/suggestions/:id
Get a specific suggestion.

#### POST /api/learning/suggestions/:id/approve
Approve a suggestion and apply it to the decision matrix.

**Request:**
```json
{
  "reviewedBy": "admin@example.com",
  "reviewNotes": "Looks good, this should improve RPA classification"
}
```

**Response:**
```json
{
  "message": "Suggestion approved and applied",
  "suggestion": {...},
  "newMatrixVersion": "1.5"
}
```

#### POST /api/learning/suggestions/:id/reject
Reject a suggestion.

**Request:**
```json
{
  "reviewedBy": "admin@example.com",
  "reviewNotes": "This rule is too broad and might cause false positives"
}
```

**Response:**
```json
{
  "message": "Suggestion rejected",
  "suggestion": {...}
}
```

## Workflow

### Automatic Trigger
1. System monitors agreement rate after each feedback submission
2. When agreement rate drops below 80% for any category:
   - Trigger automatic analysis
   - Generate suggestions using LLM
   - Notify administrators of pending suggestions

### Manual Trigger
1. Administrator calls `POST /api/learning/analyze` with API key
2. System analyzes all feedback data (optionally filtered by date range)
3. LLM generates improvement suggestions
4. Suggestions are saved with status `pending`

### Review and Approval
1. Administrator reviews suggestions via `GET /api/learning/suggestions?status=pending`
2. For each suggestion:
   - Review rationale and impact estimate
   - Approve: `POST /api/learning/suggestions/:id/approve`
     - Suggestion is applied to decision matrix
     - New matrix version is created
     - Suggestion status becomes `applied`
   - Reject: `POST /api/learning/suggestions/:id/reject`
     - Suggestion status becomes `rejected`
     - No changes to decision matrix

## Data Flow

```
User Feedback
    ↓
Session Storage (/data/sessions/)
    ↓
Learning Analysis Service
    ↓
Analysis Results (/data/learning/analysis-*.json)
    ↓
Learning Suggestion Service + LLM
    ↓
Suggestions (/data/learning/suggestion-*.json)
    ↓
Admin Review & Approval
    ↓
Decision Matrix Update (/data/decision-matrix/v*.json)
```

## Example Usage

### 1. Check if analysis is needed
```bash
curl http://localhost:8080/api/learning/check-threshold
```

### 2. Trigger manual analysis
```bash
curl -X POST http://localhost:8080/api/learning/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "sk-...",
    "startDate": "2024-01-01T00:00:00Z"
  }'
```

### 3. Review pending suggestions
```bash
curl http://localhost:8080/api/learning/suggestions?status=pending
```

### 4. Approve a suggestion
```bash
curl -X POST http://localhost:8080/api/learning/suggestions/{id}/approve \
  -H "Content-Type: application/json" \
  -d '{
    "reviewedBy": "admin@example.com",
    "reviewNotes": "Approved for testing"
  }'
```

## Integration with Decision Matrix

When a suggestion is approved:
1. Current decision matrix is loaded
2. Changes are applied based on suggestion type:
   - **new_rule**: Rule is added to the rules array
   - **modify_rule**: Existing rule is replaced
   - **adjust_weight**: Attribute weight is updated
   - **new_attribute**: Attribute is added to attributes array
3. New version number is calculated (increment minor version)
4. Updated matrix is saved with new version
5. New matrix becomes active for future classifications

## Performance Considerations

- Analysis can be expensive for large datasets (100+ sessions)
- LLM calls for suggestion generation take 5-15 seconds
- Consider running analysis during off-peak hours
- Cache analysis results to avoid redundant processing
- Limit suggestion generation to top 3-5 most impactful changes

## Future Enhancements

- Automatic A/B testing of suggested rules
- Confidence scoring for suggestions based on data volume
- Rollback mechanism for applied suggestions
- Batch approval/rejection of multiple suggestions
- Scheduled automatic analysis (e.g., weekly)
- Email notifications for administrators when suggestions are ready
