# Audit Log Enhancement - LLM Prompt and Response Data

## Issue

The audit logs were missing critical LLM data:
- **Model Prompt**: The actual prompt sent to the LLM
- **Model Response**: The raw response from the LLM

This made it impossible to:
- Debug classification issues
- Understand why the LLM made certain decisions
- Verify prompt effectiveness
- Troubleshoot Bedrock-specific issues
- Ensure transparency and observability

## What Was Missing

### Before
```json
{
  "eventType": "classification",
  "data": {
    "classification": {
      "category": "Digitise",
      "confidence": 0.85
    }
  },
  "modelPrompt": "Classification prompt",  // ← Generic placeholder
  "modelResponse": "{\"category\":\"Digitise\",...}"  // ← Only parsed result
}
```

### After
```json
{
  "eventType": "classification",
  "data": {
    "classification": {
      "category": "Digitise",
      "confidence": 0.85
    }
  },
  "modelPrompt": "[system]: You are an expert in business transformation...\n\n[user]: Please classify the following business process:\n\nAgents take payment details over the phone...",
  "modelResponse": "{\n  \"category\": \"Digitise\",\n  \"confidence\": 0.85,\n  \"rationale\": \"The process involves manual collection of payment details over the phone and manual transfer of information to a payment platform (Worldpay). This is a prime candidate for digitisation as it's still relying on human intervention for data collection and transfer between systems.\",\n  \"categoryProgression\": \"Elimination is not appropriate as payment processing is essential...\",\n  \"futureOpportunities\": \"Once digitised, this process could be further automated with RPA...\"\n}"
}
```

## Solution

### 1. New Interface
Added `ClassificationWithLLMData` interface:
```typescript
export interface ClassificationWithLLMData {
  result: ClassificationResult;
  llmPrompt: string;
  llmResponse: string;
}
```

### 2. New Methods

#### `classifyWithLLMData()`
Returns classification result with LLM prompt and response:
```typescript
async classifyWithLLMData(request: ClassificationRequest): Promise<ClassificationWithLLMData> {
  const messages = await this.buildClassificationMessages(...);
  const response = await this.llmService.chat(messages, model, config);
  
  // Build prompt string for logging
  const promptString = messages.map(m => `[${m.role}]: ${m.content}`).join('\n\n');
  
  return {
    result: this.parseClassificationResponse(response.content),
    llmPrompt: promptString,
    llmResponse: response.content
  };
}
```

#### `classifyWithRoutingAndLLMData()`
Combines routing logic with LLM data:
```typescript
async classifyWithRoutingAndLLMData(request: ClassificationRequest): Promise<ClassificationWithAction & { llmPrompt: string; llmResponse: string }> {
  const classificationWithLLM = await this.classifyWithLLMData(request);
  const action = this.determineAction(...);
  
  return {
    result: classificationWithLLM.result,
    action,
    llmPrompt: classificationWithLLM.llmPrompt,
    llmResponse: classificationWithLLM.llmResponse
  };
}
```

### 3. Updated All Endpoints

#### `/api/process/submit`
```typescript
const classificationResult = await classificationService.classifyWithRoutingAndLLMData({...});

await auditLogService.logClassification(
  sessionId,
  userId,
  finalClassification,
  decisionMatrix?.version || null,
  decisionMatrixEvaluation,
  classificationResult.llmPrompt,  // ← Actual prompt
  classificationResult.llmResponse, // ← Actual response
  false,
  {...}
);
```

#### `/api/process/classify`
```typescript
const classificationResult = await classificationService.classifyWithRoutingAndLLMData({...});

await auditLogService.logClassification(
  sessionId,
  userId,
  finalClassification,
  decisionMatrix?.version || null,
  decisionMatrixEvaluation,
  classificationResult.llmPrompt,  // ← Actual prompt
  classificationResult.llmResponse, // ← Actual response
  false,
  {...}
);
```

#### `/api/process/clarify` (Normal Flow)
```typescript
const classificationResult = await classificationService.classifyWithRoutingAndLLMData({...});

await auditLogService.logClassification(
  sessionId,
  userId,
  finalClassification,
  decisionMatrix?.version || null,
  decisionMatrixEvaluation,
  classificationResult.llmPrompt,  // ← Actual prompt
  classificationResult.llmResponse, // ← Actual response
  false,
  {...}
);
```

#### `/api/process/clarify` (Loop Detection)
```typescript
const classificationWithLLM = await classificationService.classifyWithLLMData({...});

await auditLogService.logClassification(
  sessionId,
  userId,
  classificationToStore,
  decisionMatrix?.version || null,
  decisionMatrixEvaluation,
  classificationWithLLM.llmPrompt,  // ← Actual prompt
  classificationWithLLM.llmResponse, // ← Actual response
  false,
  {...}
);
```

## Benefits

### 1. Debugging
```bash
# View exact prompt sent to LLM
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.eventType == "classification") | .modelPrompt'

# View raw LLM response
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.eventType == "classification") | .modelResponse'
```

### 2. Transparency
- See exactly what the LLM was asked
- Understand the context provided
- Verify summarization is working
- Check if conversation history is included

### 3. Troubleshooting
- Identify prompt issues
- Debug Bedrock-specific problems
- Verify JSON parsing
- Check for "Clarification N" responses

### 4. Prompt Optimization
- Analyze which prompts work best
- Compare different prompt versions
- A/B test prompt changes
- Measure prompt effectiveness

### 5. Compliance
- Full audit trail of AI decisions
- Transparency for regulatory requirements
- Explainability for users
- Accountability for classifications

## Example Audit Log Entry

```json
{
  "sessionId": "abc-123",
  "timestamp": "2025-11-11T10:00:00.000Z",
  "eventType": "classification",
  "userId": "user-123",
  "data": {
    "classification": {
      "category": "Digitise",
      "confidence": 0.85,
      "rationale": "The process involves manual collection of payment details over the phone and manual transfer of information to a payment platform (Worldpay). This is a prime candidate for digitisation as it's still relying on human intervention for data collection and transfer between systems.",
      "categoryProgression": "Elimination is not appropriate as payment processing is essential. Simplification alone isn't sufficient as the fundamental issue is the manual nature of data collection. Digitisation is the logical first step before considering automation.",
      "futureOpportunities": "Once digitised with a self-service payment portal, this process could be further automated with RPA to handle payment confirmations and reconciliation. Eventually, AI agents could handle payment-related customer inquiries."
    },
    "decisionMatrixVersion": "1.0",
    "decisionMatrixEvaluation": {
      "matrixVersion": "1.0",
      "triggeredRules": [
        {
          "ruleId": "rule-123",
          "ruleName": "Manual Data Entry",
          "action": {
            "type": "adjust_confidence",
            "confidenceAdjustment": 0.05,
            "rationale": "Manual data entry indicates digitisation opportunity"
          }
        }
      ],
      "overridden": false
    }
  },
  "modelPrompt": "[system]: You are an expert in business transformation and process optimization. Your task is to classify business initiatives into one of six transformation categories, evaluated in sequential order:\n\n1. **Eliminate**: Remove the process entirely as it adds no value\n2. **Simplify**: Streamline the process by removing unnecessary steps\n3. **Digitise**: Convert manual or offline steps to digital\n4. **RPA**: Automate repetitive, rule-based tasks with Robotic Process Automation\n5. **AI Agent**: Deploy AI to handle tasks requiring judgment or pattern recognition\n6. **Agentic AI**: Implement autonomous AI systems that can make decisions and take actions\n\n**Classification Guidelines:**\n- Evaluate categories in the order listed above (Eliminate → Simplify → Digitise → RPA → AI Agent → Agentic AI)\n- Choose the most appropriate category based on the process characteristics\n- Explain why the process fits the selected category and not the preceding ones\n- Identify potential for progression to higher categories in the future\n\n**Response Format:**\nProvide your response as a JSON object with the following structure:\n{\n  \"category\": \"<one of the six categories>\",\n  \"confidence\": <number between 0 and 1>,\n  \"rationale\": \"<explanation of why this category was chosen>\",\n  \"categoryProgression\": \"<explanation of why this category and not preceding ones>\",\n  \"futureOpportunities\": \"<potential for progression to higher categories>\"\n}\n\nRespond ONLY with the JSON object, no additional text.\n\n[user]: Please classify the following business process:\n\nAgents take payment details over the phone and manually enter them into the Worldpay platform.",
  "modelResponse": "{\n  \"category\": \"Digitise\",\n  \"confidence\": 0.85,\n  \"rationale\": \"The process involves manual collection of payment details over the phone and manual transfer of information to a payment platform (Worldpay). This is a prime candidate for digitisation as it's still relying on human intervention for data collection and transfer between systems.\",\n  \"categoryProgression\": \"Elimination is not appropriate as payment processing is essential. Simplification alone isn't sufficient as the fundamental issue is the manual nature of data collection. Digitisation is the logical first step before considering automation.\",\n  \"futureOpportunities\": \"Once digitised with a self-service payment portal, this process could be further automated with RPA to handle payment confirmations and reconciliation. Eventually, AI agents could handle payment-related customer inquiries.\"\n}",
  "piiScrubbed": false,
  "metadata": {
    "modelVersion": "anthropic.claude-3-sonnet-20240229-v1:0",
    "llmProvider": "bedrock",
    "latencyMs": 2345,
    "decisionMatrixVersion": "1.0",
    "action": "auto_classify"
  }
}
```

## Querying Audit Logs

### View All Prompts
```bash
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.eventType == "classification") | {sessionId, prompt: .modelPrompt}'
```

### View All Responses
```bash
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.eventType == "classification") | {sessionId, response: .modelResponse}'
```

### Find Failed Parses
```bash
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.eventType == "classification" and (.modelResponse | contains("Clarification")))'
```

### Compare Prompts
```bash
# Get prompts for two sessions
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.sessionId == "abc-123" or .sessionId == "def-456") | {sessionId, prompt: .modelPrompt}'
```

### Analyze Response Patterns
```bash
# Count response types
cat backend/data/audit-logs/2025-11-11.jsonl | \
  jq 'select(.eventType == "classification") | .data.classification.category' | \
  sort | uniq -c
```

## Testing

### Verify LLM Data is Logged
```bash
# 1. Submit a process
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Test process",
    "apiKey": "...",
    "provider": "bedrock",
    "awsAccessKeyId": "...",
    "awsSecretAccessKey": "..."
  }'

# 2. Check audit log
cat backend/data/audit-logs/$(date +%Y-%m-%d).jsonl | \
  jq 'select(.eventType == "classification") | {
    hasPrompt: (.modelPrompt != null and .modelPrompt != ""),
    hasResponse: (.modelResponse != null and .modelResponse != ""),
    promptLength: (.modelPrompt | length),
    responseLength: (.modelResponse | length)
  }'

# Expected:
# {
#   "hasPrompt": true,
#   "hasResponse": true,
#   "promptLength": 2000+,
#   "responseLength": 500+
# }
```

## Files Changed

1. **backend/src/services/classification.service.ts**
   - Added `ClassificationWithLLMData` interface
   - Added `classifyWithLLMData()` method
   - Added `classifyWithRoutingAndLLMData()` method

2. **backend/src/routes/process.routes.ts**
   - Updated `/submit` endpoint to use new method
   - Updated `/classify` endpoint to use new method
   - Updated `/clarify` endpoint (normal flow) to use new method
   - Updated `/clarify` endpoint (loop detection) to use new method

## Build Status

✅ TypeScript compilation successful
✅ No diagnostics errors
✅ All endpoints updated

## Impact

### Before
- ❌ No visibility into LLM prompts
- ❌ No access to raw LLM responses
- ❌ Difficult to debug classification issues
- ❌ No way to verify prompt effectiveness
- ❌ Limited transparency

### After
- ✅ Full visibility into LLM prompts
- ✅ Complete raw LLM responses logged
- ✅ Easy debugging of classification issues
- ✅ Can verify and optimize prompts
- ✅ Complete transparency and observability

## Next Steps

1. ✅ Code complete and builds successfully
2. ⏳ Test with Bedrock to verify logging
3. ⏳ Analyze logged prompts for optimization
4. ⏳ Create dashboard for prompt analysis
5. ⏳ Set up alerts for parsing failures
