# CatalAIst Backend API Endpoints

## Health Check

### GET /health
Check system health and file system access.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "fileSystem": "ok",
    "dataDirectories": "ok"
  }
}
```

## Session Management

### POST /api/sessions
Create a new session with API key.

**Request:**
```json
{
  "apiKey": "sk-...",
  "userId": "user123"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "message": "Session created successfully"
}
```

### GET /api/sessions/:id
Get session details with full conversation history.

**Response:**
```json
{
  "sessionId": "uuid",
  "initiativeId": "uuid",
  "status": "active",
  "conversations": [...],
  "classification": {...}
}
```

### POST /api/sessions/:id/conversations
Add a new conversation to an existing session.

**Request:**
```json
{
  "processDescription": "Process description text...",
  "userId": "user123"
}
```

### DELETE /api/sessions/:id
End session and clear API key from memory.

## Process Classification

### POST /api/process/submit
Submit a process description for classification.

**Request:**
```json
{
  "description": "Process description...",
  "sessionId": "uuid",
  "apiKey": "sk-...",
  "userId": "user123",
  "model": "gpt-4"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "status": "received",
  "responseTime": 150
}
```

### POST /api/process/classify
Classify a process with full workflow orchestration.

**Request:**
```json
{
  "sessionId": "uuid",
  "apiKey": "sk-...",
  "userId": "user123",
  "model": "gpt-4"
}
```

**Response (Auto-classify):**
```json
{
  "action": "auto_classify",
  "classification": {
    "category": "RPA",
    "confidence": 0.92,
    "rationale": "...",
    "categoryProgression": "...",
    "futureOpportunities": "..."
  },
  "decisionMatrixEvaluation": {...},
  "extractedAttributes": {...}
}
```

**Response (Clarify):**
```json
{
  "action": "clarify",
  "questions": ["Question 1?", "Question 2?"],
  "classification": {...}
}
```

### POST /api/process/clarify
Submit answers to clarification questions.

**Request:**
```json
{
  "sessionId": "uuid",
  "answers": ["Answer 1", "Answer 2"],
  "userId": "user123"
}
```

## Feedback

### POST /api/feedback/classification
Submit feedback on classification (confirm or correct).

**Request:**
```json
{
  "sessionId": "uuid",
  "confirmed": false,
  "correctedCategory": "AI Agent",
  "userId": "user123"
}
```

### POST /api/feedback/rating
Submit user satisfaction rating.

**Request:**
```json
{
  "sessionId": "uuid",
  "rating": "up",
  "comments": "Great experience!",
  "userId": "user123"
}
```

### GET /api/feedback/session/:sessionId
Get all feedback for a session.

## Prompt Management

### GET /api/prompts
Get all available prompts with their latest versions.

**Response:**
```json
{
  "prompts": [
    {
      "id": "classification",
      "content": "...",
      "version": "1.0",
      "availableVersions": 3
    }
  ],
  "count": 3
}
```

### GET /api/prompts/:id
Get a specific prompt by ID (returns latest version).

### GET /api/prompts/:id/versions
Get all versions of a specific prompt.

### GET /api/prompts/:id/versions/:version
Get a specific version of a prompt.

### PUT /api/prompts/:id
Update a prompt (creates new version).

**Request:**
```json
{
  "content": "Updated prompt content...",
  "userId": "admin"
}
```

## Decision Matrix

### GET /api/decision-matrix
Get current active decision matrix.

### GET /api/decision-matrix/versions
List all decision matrix versions.

### GET /api/decision-matrix/:version
Get a specific version of the decision matrix.

### PUT /api/decision-matrix
Update decision matrix (creates new version).

## AI Learning

### POST /api/learning/analyze
Trigger manual analysis of classification feedback.

### GET /api/learning/suggestions
Get pending AI-generated suggestions.

### POST /api/learning/suggestions/:id/approve
Approve a suggestion.

### POST /api/learning/suggestions/:id/reject
Reject a suggestion.

## Voice Services

### POST /api/voice/transcribe
Transcribe audio to text using OpenAI Whisper.

**Request:** Multipart form data with audio file

### POST /api/voice/synthesize
Generate speech from text using OpenAI TTS.

**Request:**
```json
{
  "text": "Text to synthesize...",
  "voice": "alloy",
  "apiKey": "sk-..."
}
```

## Analytics

### GET /api/analytics/dashboard
Get analytics dashboard metrics (recalculated on-demand).

**Response:**
```json
{
  "metrics": {
    "overallAgreementRate": 0.85,
    "agreementRateByCategory": {...},
    "userSatisfactionRate": 0.92,
    "totalSessions": 150,
    "averageClassificationTimeMs": 3500,
    "alertTriggered": false
  }
}
```

### GET /api/analytics/metrics
Get cached metrics without recalculation.

### POST /api/analytics/recalculate
Manually trigger metrics recalculation.
