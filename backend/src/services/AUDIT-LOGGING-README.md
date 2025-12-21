# Audit Logging System Implementation

## Overview

The audit logging system provides comprehensive tracking of all user interactions, LLM prompts/responses, and decision matrix evaluations for governance and compliance purposes.

## Requirements Implemented

### Task 10.1: Audit Log Writer Service
- ✅ **Requirement 5.1, 5.2, 5.3, 5.4, 5.5, 21.1**: Async logging with JSONL format
- ✅ **Millisecond-precision timestamps**: ISO 8601 format with milliseconds
- ✅ **Daily file rotation**: Automatic rotation based on date (YYYY-MM-DD.jsonl)
- ✅ **Decision matrix version tracking**: Included in metadata for all classification events
- ✅ **Retry logic**: Single retry on write failure with 100ms delay
- ✅ **Queued writes**: Sequential write queue to prevent race conditions

### Task 10.2: Logging Hooks at All Interaction Points
- ✅ **Requirement 5.1, 21.2**: User input logging with PII scrubbing
- ✅ **Requirement 5.2, 21.2**: LLM prompt and response logging
- ✅ **Requirement 5.3, 21.2**: Feedback and rating logging
- ✅ **Requirement 21.3, 21.4**: Decision matrix evaluation and triggered rules logging
- ✅ **PII scrubbing**: All data passed through PII service before logging

## Architecture

### AuditLogService

Located in: `backend/src/services/audit-log.service.ts`

**Core Methods:**
- `log(entry: AuditLogEntry)`: Generic log method with queued writes
- `logUserInput()`: Log user process descriptions
- `logClarification()`: Log clarification questions and answers
- `logClassification()`: Log classification results with decision matrix info
- `logFeedback()`: Log user feedback (confirm/correct)
- `logRating()`: Log user satisfaction ratings

**Features:**
- Append-only JSONL format for immutability
- Daily file rotation (one file per day)
- Millisecond-precision timestamps
- Sequential write queue to prevent corruption
- Automatic retry on write failure
- Decision matrix version tracking in metadata

### Logging Hooks

#### 1. Session Routes (`backend/src/routes/session.routes.ts`)
- Session creation
- Session retrieval
- Conversation addition
- Session termination

#### 2. Process Routes (`backend/src/routes/process.routes.ts`)
- **POST /api/process/submit**: Logs user input with PII scrubbing
- **POST /api/process/classify**: Logs classification with decision matrix evaluation
- **POST /api/process/clarify**: Logs clarification responses

#### 3. Feedback Routes (`backend/src/routes/feedback.routes.ts`)
- **POST /api/feedback/classification**: Logs feedback (confirm/correct)
- **POST /api/feedback/rating**: Logs user ratings with optional comments

#### 4. Decision Matrix Routes (`backend/src/routes/decision-matrix.routes.ts`)
- **PUT /api/decision-matrix**: Logs matrix updates
- **POST /api/decision-matrix/generate**: Logs AI-generated matrix creation

#### 5. Learning Routes (`backend/src/routes/learning.routes.ts`)
- **POST /api/learning/analyze**: Logs learning analysis triggers
- **POST /api/learning/suggestions/:id/approve**: Logs suggestion approvals

## Data Structure

### AuditLogEntry

```typescript
interface AuditLogEntry {
  sessionId: string;              // Session or 'system' for system events
  timestamp: string;              // ISO 8601 with milliseconds
  eventType: 'input' | 'clarification' | 'classification' | 'feedback' | 'rating';
  userId: string;                 // User identifier
  data: any;                      // Event-specific data (PII scrubbed)
  modelPrompt?: string;           // LLM prompt (if applicable)
  modelResponse?: string;         // LLM response (if applicable)
  piiScrubbed: boolean;          // Whether PII was detected and scrubbed
  metadata: {
    modelVersion?: string;        // LLM model used
    latencyMs?: number;           // Request latency
    llmProvider?: string;         // Provider (e.g., 'openai')
    llmConfigId?: string;         // Configuration ID
    decisionMatrixVersion?: string; // Decision matrix version used
  };
}
```

## File Storage

### Directory Structure
```
/data/audit-logs/
  ├── 2025-01-15.jsonl
  ├── 2025-01-16.jsonl
  └── 2025-01-17.jsonl
```

### File Format
Each line is a complete JSON object (JSONL format):
```json
{"sessionId":"abc-123","timestamp":"2025-01-15T10:30:45.123Z","eventType":"input",...}
{"sessionId":"abc-123","timestamp":"2025-01-15T10:30:47.456Z","eventType":"classification",...}
```

## PII Handling

All user-provided text is passed through the PII service before logging:
1. **Detection**: Regex-based detection of emails, phones, SSN, credit cards
2. **Scrubbing**: Replace with tokens (e.g., `[EMAIL_1]`, `[PHONE_1]`)
3. **Mapping**: Store encrypted mappings separately for authorized access
4. **Logging**: Only scrubbed text is written to audit logs

## Usage Examples

### Reading Audit Logs

```typescript
import { AuditLogService } from './services/audit-log.service';

const auditLog = new AuditLogService('/data');

// Read today's logs
const todayLogs = await auditLog.readLogs(new Date());

// Read logs for a date range
const logs = await auditLog.readLogsRange(
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

// Read logs for a specific session
const sessionLogs = await auditLog.readSessionLogs('session-id-123');

// List all log files
const files = await auditLog.listLogFiles();
```

### Logging Events

```typescript
// Log user input
await auditLog.logUserInput(
  sessionId,
  userId,
  originalDescription,
  scrubbedDescription,
  hasPII,
  { modelVersion: 'gpt-4', llmProvider: 'openai' }
);

// Log classification
await auditLog.logClassification(
  sessionId,
  userId,
  classification,
  decisionMatrixVersion,
  decisionMatrixEvaluation,
  modelPrompt,
  modelResponse,
  piiScrubbed,
  { modelVersion: 'gpt-4', latencyMs: 1234 }
);
```

## Compliance Features

1. **Immutability**: Append-only JSONL format prevents tampering
2. **Completeness**: All interactions logged (inputs, prompts, responses, feedback)
3. **Traceability**: Decision matrix version tracked for each classification
4. **Privacy**: PII automatically scrubbed before logging
5. **Auditability**: Millisecond timestamps and sequential ordering
6. **Retention**: Files retained indefinitely (manual cleanup required)

## Performance Considerations

- **Async writes**: Non-blocking with queued execution
- **File rotation**: Daily rotation prevents large file sizes
- **Retry logic**: Single retry on failure to handle transient errors
- **Sequential queue**: Prevents write conflicts and corruption

## Future Enhancements (Phase 2)

- Cloud storage (S3) for archival
- DynamoDB for queryable audit data
- Automated retention policies
- Real-time audit log streaming
- Advanced search and filtering
- Audit log analytics dashboard
