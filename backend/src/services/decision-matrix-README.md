# Decision Matrix System

This module implements the decision matrix system for CatalAIst, which provides rule-based classification logic that can override or adjust LLM classifications.

## Components

### 1. DecisionMatrixService (`decision-matrix.service.ts`)
Handles AI-generated initial decision matrix creation and management.

**Key Features:**
- Generates baseline decision matrix using GPT-4
- Creates default attributes (frequency, business_value, complexity, risk, user_count, data_sensitivity)
- Generates initial rules based on transformation best practices
- Saves matrix as version 1.0 in `/data/decision-matrix/`

**Methods:**
- `generateInitialMatrix(apiKey, model)` - Generate AI-powered decision matrix
- `hasInitialMatrix()` - Check if matrix exists
- `ensureInitialMatrix(apiKey, model)` - Get existing or generate new matrix

### 2. DecisionMatrixEvaluatorService (`decision-matrix-evaluator.service.ts`)
Evaluates decision matrix rules against classifications.

**Key Features:**
- Rule evaluation with condition matching (==, !=, >, <, >=, <=, in, not_in)
- Weighted scoring for categories based on attributes
- Rule actions: override, adjust_confidence, flag_review
- Priority-based rule processing (highest priority first)
- Attribute extraction from conversation context

**Methods:**
- `evaluateMatrix(matrix, classification, attributes)` - Apply rules to classification
- `extractAttributesFromContext(description, qa)` - Extract attributes using heuristics

### 3. Decision Matrix API Routes (`routes/decision-matrix.routes.ts`)
REST API endpoints for managing decision matrices.

**Endpoints:**

#### GET `/api/decision-matrix`
Get the current active decision matrix.

**Response:**
```json
{
  "version": "1.0",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "createdBy": "ai",
  "description": "AI-generated baseline decision matrix",
  "attributes": [...],
  "rules": [...],
  "active": true
}
```

#### GET `/api/decision-matrix/versions`
List all decision matrix versions.

**Response:**
```json
{
  "versions": ["1.0", "1.1", "2.0"],
  "count": 3
}
```

#### GET `/api/decision-matrix/:version`
Get a specific version of the decision matrix.

**Response:** Same as GET `/api/decision-matrix`

#### PUT `/api/decision-matrix`
Update the decision matrix (creates a new version).

**Request Body:** Complete DecisionMatrix object
**Response:**
```json
{
  "message": "Decision matrix updated successfully",
  "version": "1.1",
  "matrix": {...}
}
```

#### POST `/api/decision-matrix/generate`
Generate initial decision matrix using AI.

**Request Body:**
```json
{
  "apiKey": "sk-...",
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "message": "Decision matrix generated successfully",
  "matrix": {...}
}
```

#### POST `/api/decision-matrix/evaluate`
Evaluate a classification against the decision matrix (internal use).

**Request Body:**
```json
{
  "classification": {...},
  "extractedAttributes": {
    "frequency": "daily",
    "business_value": "high",
    "complexity": "medium",
    "risk": "low",
    "user_count": 50,
    "data_sensitivity": "internal"
  }
}
```

**Response:**
```json
{
  "matrixVersion": "1.0",
  "originalClassification": {...},
  "extractedAttributes": {...},
  "triggeredRules": [
    {
      "ruleId": "uuid",
      "ruleName": "High frequency low risk automation",
      "action": {...}
    }
  ],
  "finalClassification": {...},
  "overridden": true
}
```

## Data Models

### DecisionMatrix
```typescript
{
  version: string;
  createdAt: string;
  createdBy: 'ai' | 'admin';
  description: string;
  attributes: Attribute[];
  rules: Rule[];
  active: boolean;
}
```

### Attribute
```typescript
{
  name: string;
  type: 'categorical' | 'numeric' | 'boolean';
  possibleValues?: string[];
  weight: number; // 0-1
  description: string;
}
```

### Rule
```typescript
{
  ruleId: string;
  name: string;
  description: string;
  conditions: Condition[];
  action: RuleAction;
  priority: number;
  active: boolean;
}
```

### Condition
```typescript
{
  attribute: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  value: any;
}
```

### RuleAction
```typescript
{
  type: 'override' | 'adjust_confidence' | 'flag_review';
  targetCategory?: TransformationCategory;
  confidenceAdjustment?: number;
  rationale: string;
}
```

## Usage Example

```typescript
import { DecisionMatrixService, DecisionMatrixEvaluatorService } from './services';

// Generate initial matrix
const matrixService = new DecisionMatrixService(openAIService, versionedStorage);
const matrix = await matrixService.generateInitialMatrix(apiKey, 'gpt-4');

// Evaluate a classification
const evaluator = new DecisionMatrixEvaluatorService();
const evaluation = evaluator.evaluateMatrix(
  matrix,
  classification,
  {
    frequency: 'daily',
    business_value: 'high',
    complexity: 'low',
    risk: 'low',
    user_count: 100,
    data_sensitivity: 'internal'
  }
);

console.log('Final category:', evaluation.finalClassification.category);
console.log('Overridden:', evaluation.overridden);
console.log('Triggered rules:', evaluation.triggeredRules);
```

## Storage

Decision matrices are stored as versioned JSON files in `/data/decision-matrix/`:
- `v1.0.json` - Initial AI-generated matrix
- `v1.1.json` - First admin update
- `v2.0.json` - Major version update

All versions are retained for audit purposes.

## Requirements Satisfied

- **19.1-19.5**: AI-generated initial decision matrix with attributes, rules, and weights
- **20.1-20.5**: Rule evaluation engine with condition matching and weighted scoring
- **23.1-23.6**: Decision matrix management API with versioning and CRUD operations
