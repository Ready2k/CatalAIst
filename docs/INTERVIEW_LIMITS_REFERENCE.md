# Interview Limits & Loop Prevention - Quick Reference

## Overview

The clarification interview system has built-in safeguards to prevent infinite loops and ensure a good user experience.

## Limits

### Question Limits

| Limit Type | Value | Behavior |
|------------|-------|----------|
| **Soft Limit** | 8 questions | Warning shown to user, interview continues |
| **Hard Limit** | 15 questions | Interview automatically stops, proceeds to classification |
| **Min Questions** | 1 question | Minimum questions per round |
| **Max Questions** | 3 questions | Maximum questions per round |

### Question Generation Strategy

| Round | Questions Asked | Questions Generated |
|-------|----------------|---------------------|
| First (0) | 0 | 2-3 questions |
| Early (1-4) | 1-4 | 2 questions |
| Middle (5-7) | 5-7 | 1 question |
| Late (8+) | 8+ | 1 question (if critical) |

## Loop Detection

### Automatic Detection

The system automatically detects and stops interviews when:

1. **Repetitive Questions**
   - Last 5 questions have < 3 unique questions
   - Indicates LLM is stuck in a loop
   - Action: Stop interview, proceed to classification

2. **Unknown Answers**
   - 2 out of last 3 answers are "don't know" patterns
   - Patterns: "don't know", "not sure", "no idea", "can't say", etc.
   - Action: Stop interview, user lacks information

3. **Hard Limit Reached**
   - 15 questions asked
   - Action: Automatically stop, proceed to classification

### Manual Override

Users can manually skip the interview at any time by clicking "Skip Interview & Classify Now".

## Code Reference

### Backend

**File**: `backend/src/services/clarification.service.ts`

```typescript
// Constants
private readonly SOFT_LIMIT_QUESTIONS = 8;
private readonly HARD_LIMIT_QUESTIONS = 15;
private readonly MIN_QUESTIONS = 1;
private readonly MAX_QUESTIONS = 3;

// Check if interview should stop
shouldStopInterview(conversationHistory): { shouldStop: boolean; reason: string }

// Check if more questions can be asked
canAskMoreQuestions(conversationHistory): boolean

// Get remaining question count
getRemainingQuestionCount(conversationHistory): number
```

**File**: `backend/src/routes/process.routes.ts`

```typescript
// Force classification parameter
const { forceClassify = false } = req.body;

// Skip clarification if forced
if (classificationResult.action === 'clarify' && !forceClassify) {
  // Generate questions
}
```

### Frontend

**File**: `frontend/src/components/ClarificationQuestions.tsx`

```typescript
// Props
interface ClarificationQuestionsProps {
  questions: string[];
  currentQuestionIndex: number;
  totalQuestions: number;
  onAnswer: (answer: string) => void;
  onSkipInterview?: () => void;  // Skip handler
  // ...
}

// Warning display
{currentQuestionIndex >= 8 && (
  <span>({currentQuestionIndex + 1}/15 questions - approaching limit)</span>
)}
```

**File**: `frontend/src/App.tsx`

```typescript
// Skip interview handler
const handleSkipInterview = async () => {
  const response = await apiService.forceClassification();
  if (response.classification) {
    setClassification(response.classification);
    setWorkflowState('result');
  }
};
```

## API Endpoints

### POST /api/process/classify

**Request Body**:
```json
{
  "sessionId": "uuid",
  "apiKey": "sk-...",
  "model": "gpt-4",
  "provider": "openai",
  "forceClassify": true  // Skip interview
}
```

**Response** (when forceClassify=true):
```json
{
  "action": "auto_classify",
  "classification": { ... },
  "sessionId": "uuid"
}
```

## Audit Logging

### Force Classification Event

```json
{
  "eventType": "classification",
  "data": {
    "action": "force_classify",
    "interviewSkipped": true,
    "questionsAsked": 5
  }
}
```

## Best Practices

### For Developers

1. **Always check limits** before generating questions
2. **Use shouldStopInterview()** to detect problematic patterns
3. **Log skip events** for analytics and debugging
4. **Provide clear UI feedback** about question count

### For Users

1. **Answer honestly** - "I don't know" is a valid answer
2. **Skip if stuck** - Don't waste time on circular questions
3. **Watch the counter** - If approaching 8+ questions, consider skipping
4. **Provide context** - More detail in early answers reduces questions

## Troubleshooting

### Issue: LLM keeps asking same questions

**Cause**: Model is stuck in reasoning loop
**Solution**: Click "Skip Interview & Classify Now"
**Prevention**: Use higher-quality models (GPT-4 vs GPT-3.5)

### Issue: Too many questions being asked

**Cause**: Initial description lacks key information
**Solution**: Provide more detail in initial submission
**Prevention**: Include frequency, volume, current state, pain points

### Issue: Interview stops unexpectedly

**Cause**: Hard limit reached or loop detected
**Solution**: Review audit logs for reason
**Prevention**: Provide clear, complete answers early

## Configuration

### Adjusting Limits

To change limits, modify constants in `backend/src/services/clarification.service.ts`:

```typescript
private readonly SOFT_LIMIT_QUESTIONS = 8;   // Warning threshold
private readonly HARD_LIMIT_QUESTIONS = 15;  // Maximum questions
private readonly MIN_QUESTIONS = 1;          // Min per round
private readonly MAX_QUESTIONS = 3;          // Max per round
```

**Note**: Changing these values requires backend restart.

## Monitoring

### Metrics to Track

1. **Average questions per session**
2. **Skip rate** (% of sessions that skip)
3. **Hard limit hits** (% reaching 15 questions)
4. **Loop detection rate**
5. **Classification confidence** (skipped vs completed)

### Query Audit Logs

```bash
# Find force classifications
grep "force_classify" data/audit-logs/*.jsonl

# Count questions per session
jq -r 'select(.eventType=="classification") | .metadata.questionsAsked' data/audit-logs/*.jsonl
```

---

**Last Updated**: November 10, 2025
**Version**: 2.1.0
