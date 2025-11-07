# Design Document

## Overview

CatalAIst is a conversational assistant deployed as Docker containers. The system uses a confidence-based classification approach where high-confidence classifications are automatic, medium-confidence triggers clarification questions, and low-confidence flags for manual review.

### Phase 1 - Proof of Concept (Current Design)

The PoC focuses on validating core functionality with a simplified architecture:
- **Single Provider**: OpenAI for LLM (GPT models), STT (Whisper), and TTS
- **Local Storage**: File system within Docker containers with volume persistence
- **Modular Design**: Provider abstraction layer ready for Phase 2 expansion

### Phase 2 - Future Expansion

The architecture supports adding:
- Additional LLM providers (Bedrock, Copilot) via provider adapters
- Additional voice providers (AWS Transcribe, Polly) via voice adapters
- Cloud storage backends (S3, DynamoDB) via storage adapters
- Multi-user authentication and authorization
- AWS container orchestration (ECS/EKS)

## Architecture

### High-Level Flow
```
[User Input] → [Clarification Loop] → [Classification Engine] → [Decision Matrix Evaluation] → [Output + Feedback] → [Audit Log]
                                                                            ↓
                                                                    [AI Learning Engine]
```

### Infrastructure Components (Phase 1 - PoC)

**Containerization Layer:**
- Docker containers for frontend and backend applications
- Docker Compose for local deployment
- Docker volumes for persistent data storage
- Health check endpoints for container monitoring

**Frontend Layer:**
- React Web Application (containerized)
- Chat interface for process description and clarification
- Voice interface with audio recording and playback controls
- OpenAI API key input
- Analytics dashboard for metrics

**Backend Layer:**
- Node.js or Python FastAPI application (containerized)
- REST API endpoints
- Stateless application logic (state in storage layer)

**AI/ML Layer (Phase 1):**
- OpenAI API integration:
  - GPT-4 or GPT-3.5-turbo for classification and clarification
  - Whisper for Speech-to-Text
  - TTS-1 for Text-to-Speech
- User-provided API key per session
- Handles classification and clarification question generation
- Confidence scoring for decision routing

**AI/ML Layer (Phase 2 - Future):**
- Provider abstraction layer with pluggable adapters:
  - OpenAI adapter (Phase 1)
  - Bedrock adapter (Phase 2)
  - Copilot adapter (Phase 2)
- Dynamic model discovery from each provider
- Voice provider abstraction (AWS Transcribe, Polly)

**Storage Layer (Phase 1):**
- Local file system with Docker volumes:
  - `/data/sessions` - Session data with conversation history (JSON files)
  - `/data/audit-logs` - Audit logs (JSONL files)
  - `/data/prompts` - Prompt templates (text files with versioning)
  - `/data/audio` - Temporary audio files (auto-cleanup after 24 hours)
  - `/data/analytics` - Aggregated metrics (JSON files)
  - `/data/pii-mappings` - PII anonymization mappings (encrypted JSON)
  - `/data/decision-matrix` - Decision matrix versions (JSON files with versioning)
  - `/data/learning` - AI learning analysis and suggestions (JSON files)

**Storage Layer (Phase 2 - Future):**
- Storage abstraction layer with pluggable backends:
  - File system adapter (Phase 1)
  - DynamoDB adapter (Phase 2)
  - S3 adapter (Phase 2)

**Governance Layer:**
- PII Detection and Scrubbing service (regex-based for Phase 1)
- Audit logging to local files
- Analytics engine for agreement rate calculation
- Basic access logging

## Components and Interfaces

### 1. OpenAI Service Component (Phase 1)
- **Responsibility:** Manage OpenAI API interactions for LLM, STT, and TTS
- **Interface:** Internal service with methods for each API
- **Operations:**
  - `chat(messages, model, apiKey)` - Send chat completion request
  - `transcribe(audioFile, apiKey)` - Transcribe audio using Whisper
  - `synthesize(text, voice, apiKey)` - Generate speech using TTS
  - `listModels(apiKey)` - Retrieve available models
- **API Key Management:** Accepts user-provided key per request, never persisted
- **Error Handling:** Retry logic with exponential backoff
- **Future:** Abstract to provider interface for Phase 2 multi-provider support

### 2. Session Management Component
- **Responsibility:** Manage multi-conversation sessions with context memory
- **Interface:** REST API endpoints `/api/sessions/*`
- **Operations:**
  - `POST /api/sessions` - Create new session with API key
  - `GET /api/sessions/:id` - Retrieve session with full conversation history
  - `POST /api/sessions/:id/conversations` - Add new conversation to existing session
  - `DELETE /api/sessions/:id` - End session and clear API key from memory
- **Storage (Phase 1):** JSON files in `/data/sessions/{sessionId}.json`
- **Storage (Phase 2):** Pluggable storage adapter (DynamoDB, etc.)
- **Context Retrieval:** Loads all prior conversations when continuing a session
- **API Key Handling:** Stored in memory only, cleared on session end

### 3. Input Collection Component
- **Responsibility:** Capture and validate user process descriptions
- **Interface:** REST API endpoint `/api/process/submit`
- **Input:** JSON with `{ "description": string, "sessionId": string?, "apiKey": string }`
- **Output:** `{ "sessionId": string, "status": "received" }`
- **Validation:** Minimum 10 characters, OpenAI API key format validation

### 4. Clarification Engine
- **Responsibility:** Generate and manage clarifying questions based on confidence
- **Interface:** Internal service called by classification workflow
- **Logic:**
  - Confidence > 0.85: Skip clarification
  - Confidence 0.6-0.85: Generate 1-2 questions
  - Confidence < 0.6: Flag for manual review
  - Max 5 questions per session
- **Context-Aware:** Uses conversation history to avoid redundant questions
- **Input:** Initial classification with confidence score + conversation history
- **Output:** Array of clarifying questions or skip signal

### 5. Classification Engine
- **Responsibility:** Classify initiatives into transformation categories with sequential evaluation
- **Interface:** Internal service using OpenAI Service Component
- **Input:** Process description + clarification responses + conversation history + API key
- **Output:** 
  ```json
  {
    "category": "Eliminate|Simplify|Digitise|RPA|AI Agent|Agentic AI",
    "confidence": 0.0-1.0,
    "rationale": "string",
    "categoryProgression": "string",
    "futureOpportunities": "string"
  }
  ```
- **Sequential Evaluation:** Explains why initiative fits category and not preceding ones
- **Model Selection:** Uses GPT-4 by default, configurable to GPT-3.5-turbo
- **Future:** Provider abstraction for Phase 2 multi-provider support

### 6. PII Detection and Scrubbing Component
- **Responsibility:** Detect and anonymize personally identifiable information
- **Interface:** Internal service called before audit logging
- **Detection Patterns (Phase 1 - Regex-based):**
  - Email addresses (regex)
  - Phone numbers (regex with international formats)
  - Common PII patterns (SSN, credit cards)
- **Detection Patterns (Phase 2 - ML-based):**
  - Names (using NER models)
  - Addresses
  - Custom entity recognition
- **Anonymization:** Replace with tokens (e.g., `[EMAIL_1]`, `[PHONE_1]`)
- **Mapping Storage (Phase 1):** Encrypted JSON files in `/data/pii-mappings/`
- **Mapping Storage (Phase 2):** Encrypted S3 storage with strict access controls
- **Input:** Raw user text
- **Output:** Anonymized text + mapping metadata

### 7. Feedback Capture Component
- **Responsibility:** Collect user confirmation, corrections, and satisfaction ratings
- **Interface:** REST API endpoints `/api/feedback/*`
- **Operations:**
  - `POST /api/feedback/classification` - Confirm or correct classification
  - `POST /api/feedback/rating` - Submit thumbs up/down with optional comments
- **Input:** `{ "sessionId": string, "confirmed": boolean, "correctedCategory": string?, "rating": "up|down", "comments": string? }`
- **Output:** `{ "status": "recorded" }`

### 8. Analytics Engine
- **Responsibility:** Calculate and track system performance metrics
- **Interface:** REST API endpoint `/api/analytics/dashboard`
- **Metrics Calculated:**
  - Overall agreement rate
  - Agreement rate by category
  - User satisfaction percentage (thumbs up ratio)
  - Average classification time
  - Total sessions processed
- **Update Frequency:** Recalculates on-demand when dashboard is accessed
- **Alerting:** Flags when agreement rate < 80%
- **Storage (Phase 1):** JSON file in `/data/analytics/metrics.json`
- **Storage (Phase 2):** DynamoDB for aggregated metrics

### 9. Audit Logger
- **Responsibility:** Persist all interactions for governance with PII scrubbing
- **Interface:** Internal service with async writes
- **Storage (Phase 1):** JSONL files in `/data/audit-logs/{date}.jsonl` (one file per day)
- **Storage (Phase 2):** DynamoDB for queryable data, S3 for archival
- **Data Structure:**
  ```json
  {
    "sessionId": "string",
    "timestamp": "ISO8601",
    "eventType": "input|clarification|classification|feedback|rating",
    "data": {},
    "modelPrompt": "string",
    "modelResponse": "string",
    "piiScrubbed": true,
    "metadata": {
      "modelVersion": "string",
      "latencyMs": number,
      "llmProvider": "openai"
    }
  }
  ```
- **PII Handling:** All data passed through PII scrubber before storage
- **File Rotation:** New file created daily, old files retained indefinitely

### 10. Prompt Management Component
- **Responsibility:** Store, version, and serve prompt templates
- **Interface:** REST API endpoints `/api/prompts/*`
- **Storage (Phase 1):** Text files in `/data/prompts/` with timestamp suffixes for versions
- **Storage (Phase 2):** S3 with versioning enabled
- **Operations:** GET, PUT with validation
- **Versioning:** Automatic timestamp-based versioning on updates
- **Default Prompts:** Classification, clarification, category progression prompts included

### 11. Speech-to-Text Component
- **Responsibility:** Transcribe audio input to text using OpenAI Whisper
- **Interface:** REST API endpoint `/api/voice/transcribe`
- **Input:** Audio file (multipart/form-data) + session API key
- **Output:** `{ "transcription": string, "confidence": number, "duration": number }`
- **Supported Formats:** WAV, MP3, M4A, WebM
- **Max Duration:** 5 minutes per audio clip
- **Implementation (Phase 1):** Direct OpenAI Whisper API call
- **Implementation (Phase 2):** Provider abstraction for AWS Transcribe support
- **Temporary Storage:** Audio files saved to `/data/audio/` temporarily, deleted after transcription
- **Response Time:** < 3 seconds for typical 30-second audio

### 12. Text-to-Speech Component
- **Responsibility:** Generate audio from text responses using OpenAI TTS
- **Interface:** REST API endpoint `/api/voice/synthesize`
- **Input:** `{ "text": string, "voice": string, "apiKey": string }`
- **Output:** Audio file stream (MP3 format)
- **Implementation (Phase 1):** Direct OpenAI TTS API call, stream audio response
- **Implementation (Phase 2):** Provider abstraction for AWS Polly support
- **Voice Selection:** Configurable OpenAI voice (alloy, echo, fable, onyx, nova, shimmer)
- **Default Voice:** "alloy"
- **Caching (Phase 1):** Cache generated audio in `/data/audio/cache/` for repeated phrases
- **Cache Cleanup:** Remove cached files older than 7 days

### 13. Decision Matrix Component
- **Responsibility:** Manage and apply business rules to classification decisions
- **Interface:** REST API endpoints `/api/decision-matrix/*` and internal evaluation service
- **Operations:**
  - `GET /api/decision-matrix` - Get current active decision matrix
  - `GET /api/decision-matrix/versions` - List all versions
  - `GET /api/decision-matrix/:version` - Get specific version
  - `PUT /api/decision-matrix` - Update decision matrix (creates new version)
  - `POST /api/decision-matrix/evaluate` - Evaluate rules against classification (internal)
- **Storage (Phase 1):** JSON files in `/data/decision-matrix/v{version}.json`
- **Versioning:** Automatic versioning with timestamp on every update
- **Initial Generation:** On first startup, uses LLM to generate baseline decision matrix
- **Rule Evaluation:** Applies rules after LLM classification, before returning result to user

### 14. AI Learning Engine Component
- **Responsibility:** Analyze feedback and suggest decision matrix improvements
- **Interface:** REST API endpoints `/api/learning/*` and background analysis service
- **Operations:**
  - `POST /api/learning/analyze` - Trigger manual analysis
  - `GET /api/learning/suggestions` - Get pending suggestions
  - `POST /api/learning/suggestions/:id/approve` - Approve a suggestion
  - `POST /api/learning/suggestions/:id/reject` - Reject a suggestion
- **Automatic Triggers:**
  - When agreement rate drops below 80% for any category
  - Weekly scheduled analysis of all feedback
- **Analysis Process:**
  1. Collect misclassifications and user corrections
  2. Use LLM to identify patterns and root causes
  3. Generate suggested rule modifications
  4. Present suggestions to administrator with rationale
- **Storage (Phase 1):** JSON files in `/data/learning/analysis-{timestamp}.json`
- **Suggestion Lifecycle:** pending → approved/rejected → applied (if approved)

## Data Models

### SystemConfiguration (Phase 1)
```typescript
interface SystemConfiguration {
  defaultModel: 'gpt-4' | 'gpt-3.5-turbo';
  defaultVoice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  whisperModel: 'whisper-1';
  ttsModel: 'tts-1' | 'tts-1-hd';
  confidenceThresholds: {
    autoClassify: 0.85;
    clarify: 0.6;
  };
}
```

### LLMConfiguration (Phase 2 - Future)
```typescript
interface LLMConfiguration {
  configId: string;
  name: string;
  provider: 'openai' | 'bedrock' | 'copilot';
  modelId: string;
  connectionParams: {
    endpoint?: string;
    region?: string;
    apiVersion?: string;
  };
  requiresUserToken: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### Session
```typescript
interface Session {
  sessionId: string;
  initiativeId: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'manual_review';
  apiKey: string; // In-memory only, not persisted to file
  modelUsed: string;
  conversations: Array<Conversation>;
  classification?: Classification;
  feedback?: Feedback;
  userRating?: UserRating;
}

interface Conversation {
  conversationId: string;
  timestamp: string;
  processDescription: string;
  clarificationQA: Array<{question: string, answer: string}>;
}
```

### Classification
```typescript
interface Classification {
  category: 'Eliminate' | 'Simplify' | 'Digitise' | 'RPA' | 'AI Agent' | 'Agentic AI';
  confidence: number;
  rationale: string;
  categoryProgression: string; // Why this category and not preceding ones
  futureOpportunities: string; // Potential for higher categories
  timestamp: string;
  modelUsed: string;
  llmProvider: string;
  decisionMatrixEvaluation?: DecisionMatrixEvaluation; // Present if rules were applied
}
```

### Feedback
```typescript
interface Feedback {
  confirmed: boolean;
  correctedCategory?: 'Eliminate' | 'Simplify' | 'Digitise' | 'RPA' | 'AI Agent' | 'Agentic AI';
  timestamp: string;
}
```

### UserRating
```typescript
interface UserRating {
  rating: 'up' | 'down';
  comments?: string;
  timestamp: string;
}
```

### AuditLogEntry
```typescript
interface AuditLogEntry {
  sessionId: string;
  timestamp: string;
  eventType: 'input' | 'clarification' | 'classification' | 'feedback' | 'rating';
  userId: string;
  data: any;
  modelPrompt?: string;
  modelResponse?: string;
  piiScrubbed: boolean;
  metadata: {
    modelVersion?: string;
    latencyMs?: number;
    llmProvider?: string;
    llmConfigId?: string;
  };
}
```

### AnalyticsMetrics
```typescript
interface AnalyticsMetrics {
  metricId: string;
  calculatedAt: string;
  overallAgreementRate: number;
  agreementRateByCategory: {
    [category: string]: number;
  };
  userSatisfactionRate: number; // Percentage of thumbs up
  totalSessions: number;
  averageClassificationTimeMs: number;
  alertTriggered: boolean;
}
```

### PIIMapping
```typescript
interface PIIMapping {
  mappingId: string;
  sessionId: string;
  mappings: Array<{
    token: string; // e.g., [NAME_1]
    originalValue: string; // encrypted
    type: 'name' | 'email' | 'phone';
  }>;
  createdAt: string;
  accessLog: Array<{
    userId: string;
    timestamp: string;
    purpose: string;
  }>;
}
```

### AudioTranscription (Phase 1)
```typescript
interface AudioTranscription {
  transcriptionId: string;
  sessionId: string;
  audioFilePath: string; // Local path, deleted after transcription
  transcription: string;
  durationSeconds: number;
  timestamp: string;
}
```

### DecisionMatrix
```typescript
interface DecisionMatrix {
  version: string; // e.g., "1.0", "1.1", "2.0"
  createdAt: string;
  createdBy: 'ai' | 'admin';
  description: string;
  attributes: Array<Attribute>;
  rules: Array<Rule>;
  active: boolean;
}

interface Attribute {
  name: string; // e.g., "frequency", "business_value"
  type: 'categorical' | 'numeric' | 'boolean';
  possibleValues?: Array<string>; // For categorical
  weight: number; // 0.0 to 1.0
  description: string;
}

interface Rule {
  ruleId: string;
  name: string;
  description: string;
  conditions: Array<Condition>;
  action: RuleAction;
  priority: number; // Higher priority rules evaluated first
  active: boolean;
}

interface Condition {
  attribute: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in';
  value: any;
}

interface RuleAction {
  type: 'override' | 'adjust_confidence' | 'flag_review';
  targetCategory?: 'Eliminate' | 'Simplify' | 'Digitise' | 'RPA' | 'AI Agent' | 'Agentic AI';
  confidenceAdjustment?: number; // +/- adjustment to confidence score
  rationale: string;
}
```

### DecisionMatrixEvaluation
```typescript
interface DecisionMatrixEvaluation {
  matrixVersion: string;
  originalClassification: Classification;
  extractedAttributes: { [key: string]: any };
  triggeredRules: Array<{
    ruleId: string;
    ruleName: string;
    action: RuleAction;
  }>;
  finalClassification: Classification;
  overridden: boolean;
}
```

### LearningSuggestion
```typescript
interface LearningSuggestion {
  suggestionId: string;
  createdAt: string;
  analysisId: string;
  type: 'new_rule' | 'modify_rule' | 'adjust_weight' | 'new_attribute';
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  rationale: string;
  impactEstimate: {
    affectedCategories: Array<string>;
    expectedImprovementPercent: number;
    confidenceLevel: number;
  };
  suggestedChange: {
    // For new_rule
    newRule?: Rule;
    // For modify_rule
    ruleId?: string;
    modifiedRule?: Rule;
    // For adjust_weight
    attributeName?: string;
    newWeight?: number;
    // For new_attribute
    newAttribute?: Attribute;
  };
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNotes?: string;
}
```

### LearningAnalysis
```typescript
interface LearningAnalysis {
  analysisId: string;
  triggeredBy: 'automatic' | 'manual';
  triggeredAt: string;
  dataRange: {
    startDate: string;
    endDate: string;
    totalSessions: number;
  };
  findings: {
    overallAgreementRate: number;
    categoryAgreementRates: { [category: string]: number };
    commonMisclassifications: Array<{
      from: string;
      to: string;
      count: number;
      examples: Array<string>; // Session IDs
    }>;
    identifiedPatterns: Array<string>;
  };
  suggestions: Array<string>; // Suggestion IDs
}
```

### VoiceConfiguration (Phase 2 - Future)
```typescript
interface VoiceConfiguration {
  configId: string;
  serviceType: 'stt' | 'tts';
  provider: 'openai' | 'aws';
  providerConfig: {
    // For OpenAI
    model?: 'whisper-1' | 'tts-1' | 'tts-1-hd';
    voice?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
    // For AWS
    region?: string;
    languageCode?: string;
    voiceId?: string; // e.g., 'Joanna', 'Matthew'
  };
  enabled: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
```

## Deployment Architecture

### Docker Containerization (Phase 1 - PoC)

**Backend Container:**
- Base image: Node.js 20 Alpine or Python 3.11 Slim
- Exposed port: 8080
- Health check endpoint: `/health`
- Environment variables:
  - `DEFAULT_MODEL` (default: gpt-4)
  - `DEFAULT_VOICE` (default: alloy)
  - `DATA_DIR` (default: /data)
  - `LOG_LEVEL` (default: info)
- Docker volumes:
  - `/data` - Persistent storage for sessions, logs, prompts, analytics

**Frontend Container:**
- Base image: Node.js 20 Alpine with nginx
- Exposed port: 80
- Health check endpoint: `/`
- Environment variables:
  - `REACT_APP_API_URL` (default: http://localhost:8080)

**Docker Compose Configuration:**
```yaml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8080:8080"
    volumes:
      - catalai-data:/data
    environment:
      - DEFAULT_MODEL=gpt-4
      - DEFAULT_VOICE=alloy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    environment:
      - REACT_APP_API_URL=http://localhost:8080
    depends_on:
      - backend

volumes:
  catalai-data:
```

**Data Persistence:**
- All data stored in Docker volume `catalai-data`
- Volume persists across container restarts
- Data lost if volume is deleted (acceptable for PoC)
- Backup strategy: Manual volume backup using `docker cp`

### AWS Deployment (Phase 2 - Future)
- ECS Fargate or EKS for container orchestration
- Application Load Balancer for traffic distribution
- EFS for persistent storage (replaces Docker volumes)
- Auto-scaling based on CPU/memory metrics
- CloudWatch Container Insights for monitoring

## Error Handling

### Classification Errors
- **LLM API Failure:** Retry up to 3 times with exponential backoff, then flag for manual review
- **Timeout:** Set 30-second timeout for LLM calls, fallback to manual review
- **Invalid Response:** Log error, request re-classification with modified prompt
- **Invalid API Token:** Return 401 with clear error message to user
- **Model Not Available:** Return 503 with list of available models

### Storage Errors (Phase 1)
- **File Write Failure:** Retry up to 3 times, return 500 if persistent
- **Disk Space Full:** Return 507 Insufficient Storage, alert administrator
- **Session Not Found:** Return 404 with option to create new session
- **Corrupted Session File:** Log error, return 500, suggest creating new session

### Storage Errors (Phase 2 - Future)
- **DynamoDB Write Failure:** Retry with exponential backoff, queue to dead-letter queue after 3 attempts
- **S3 Upload Failure:** Buffer logs locally, retry async upload

### User Input Errors
- **Invalid Format:** Return 400 error with clear validation message
- **Missing Required Fields:** Return 400 with field-specific error messages
- **Description Too Short:** Return 400 indicating minimum 10 characters required
- **Invalid OpenAI API Key:** Return 401 with message to check API key

### PII Detection Errors
- **Detection Service Failure:** Log warning, proceed without scrubbing but flag in audit log
- **Mapping Storage Failure:** Retry with exponential backoff, alert administrators

### Voice Service Errors
- **STT Transcription Failure:** Return 500 with error message, allow user to retry or switch to text input
- **Audio Format Not Supported:** Return 400 with list of supported formats (WAV, MP3, M4A, WebM)
- **Audio Too Long:** Return 400 indicating maximum 5-minute duration
- **Audio File Too Large:** Return 413 indicating maximum 25MB file size
- **TTS Synthesis Failure:** Return 500 with error message, display text response as fallback
- **Voice Service Unavailable:** Gracefully disable voice features, show text-only interface

### Container Health Check Failures
- **Backend Unhealthy:** Container restart after 3 consecutive failures
- **Frontend Unhealthy:** Container restart after 3 consecutive failures
- **Startup Timeout:** Fail container if health check not passing within 30 seconds

## Testing Strategy

### Unit Tests
- Test confidence routing logic (>0.85, 0.6-0.85, <0.6)
- Test prompt template validation
- Test data model serialization/deserialization
- Test PII detection patterns (names, emails, phone numbers)
- Test API token validation logic
- Test agreement rate calculation
- Test LLM provider adapters with mocked responses
- Test STT provider adapters with mock audio files
- Test TTS provider adapters with mock text
- Test voice feature availability logic based on LLM provider
- Test audio format validation

### Integration Tests
- Test end-to-end classification flow with mock LLM
- Test audit logging pipeline with PII scrubbing
- Test feedback capture and storage
- Test multi-conversation session management
- Test LLM configuration CRUD operations
- Test model discovery from each provider
- Test analytics metrics calculation
- Test voice configuration CRUD operations
- Test STT transcription with sample audio files
- Test TTS synthesis and audio streaming
- Test voice interface disabled when Copilot selected

### E2E Tests
- Test complete user journey from input to classification
- Test clarification loop with multiple questions
- Test prompt editing and versioning workflow
- Test multi-conversation session with context retention
- Test user rating submission flow
- Test admin LLM configuration workflow
- Test user LLM selection and API token provision
- Test voice input workflow: record → transcribe → confirm → process
- Test voice output workflow: classification → synthesize → playback
- Test switching between text and voice modes
- Test voice features hidden when Copilot is selected

### Container Tests
- Test Docker image builds successfully
- Test health check endpoints respond correctly
- Test containers start within 30 seconds
- Test docker-compose local environment setup
- Test environment variable configuration

### Performance Tests
- Verify classification response time < 5 seconds
- Verify audit log write latency < 1 second
- Verify model list retrieval < 5 seconds
- Verify STT transcription time < 3 seconds for 30-second audio
- Verify TTS synthesis and streaming latency
- Load test with concurrent sessions
- Test container auto-scaling under load
- Test audio file upload and processing performance

### Security Tests
- Test API token is cleared after session ends
- Test PII mapping access controls
- Test encrypted storage of sensitive data
- Test SQL injection and XSS prevention
- Test rate limiting on API endpoints
