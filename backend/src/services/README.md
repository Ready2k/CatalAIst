# Services

This directory contains the core services for CatalAIst backend application.

## Services

### ClarificationService
Generates and manages clarifying questions based on classification confidence.

```typescript
const clarificationService = new ClarificationService();

// Generate clarification questions
const response = await clarificationService.generateQuestions({
  processDescription: "User's process description",
  classification: classificationResult,
  conversationHistory: session.conversations[0].clarificationQA,
  apiKey: userApiKey,
  model: 'gpt-4'
});

if (response.shouldClarify) {
  // Present questions to user
  for (const q of response.questions) {
    console.log(`Question: ${q.question}`);
    console.log(`Purpose: ${q.purpose}`);
  }
}

// Check if more questions can be asked
const canAsk = clarificationService.canAskMoreQuestions(conversationHistory);

// Get remaining question count
const remaining = clarificationService.getRemainingQuestionCount(conversationHistory);
```

**Features:**
- Generates 1-2 targeted questions for medium confidence (0.6-0.85)
- Enforces max 5 questions per session
- Avoids redundant questions using conversation history
- Extracts business attributes for decision matrix
- Context-aware question generation

### JsonStorageService
Generic JSON file storage with file locking and atomic writes.

```typescript
const storage = new JsonStorageService('/data');

// Write JSON
await storage.writeJson('config/settings.json', { key: 'value' });

// Read JSON
const data = await storage.readJson<MyType>('config/settings.json');

// Check existence
const exists = await storage.exists('config/settings.json');

// Delete
await storage.delete('config/settings.json');

// List files
const files = await storage.listFiles('config');
```

### VersionedStorageService
Handles versioned storage for prompts and decision matrices.

```typescript
const versionedStorage = new VersionedStorageService(jsonStorage);

// Save decision matrix
await versionedStorage.saveDecisionMatrix(matrix);

// Get specific version
const matrix = await versionedStorage.getDecisionMatrix('1.0');

// Get latest version
const latest = await versionedStorage.getLatestDecisionMatrix();

// List all versions
const versions = await versionedStorage.listDecisionMatrixVersions();

// Save prompt
const version = await versionedStorage.savePrompt('classification', content);

// Get prompt
const prompt = await versionedStorage.getPrompt('classification', version);
```

### AuditLogService
JSONL append-only audit logging with daily file rotation.

```typescript
const auditLog = new AuditLogService('/data');

// Log an entry
await auditLog.log({
  sessionId: 'uuid',
  timestamp: new Date().toISOString(),
  eventType: 'classification',
  userId: 'user-id',
  data: { /* ... */ },
  piiScrubbed: true,
  metadata: {}
});

// Read logs for a date
const logs = await auditLog.readLogs(new Date());

// Read logs for a session
const sessionLogs = await auditLog.readSessionLogs('session-id');

// List log files
const files = await auditLog.listLogFiles();
```

### SessionStorageService
Session management with conversation history and clarification Q&A handling.

```typescript
const sessionStorage = new SessionStorageService(jsonStorage);

// Create new session
const session = await sessionStorage.createSession('initiative-id', 'gpt-4');

// Add a new conversation
await sessionStorage.addConversation(sessionId, processDescription);

// Add clarification Q&A pairs
await sessionStorage.addClarificationQA(sessionId, question, answer);

// Get current conversation Q&A
const qa = await sessionStorage.getCurrentConversationQA(sessionId);

// Get full conversation history
const history = await sessionStorage.getConversationHistory(sessionId);

// Build classification context from all conversations
const context = await sessionStorage.buildClassificationContext(sessionId);

// Load session
const loaded = await sessionStorage.loadSession(sessionId);

// Update session
const updated = await sessionStorage.updateSession(sessionId, {
  status: 'completed'
});

// Delete session
await sessionStorage.deleteSession(sessionId);

// List all sessions
const sessions = await sessionStorage.listSessions();

// Check existence
const exists = await sessionStorage.sessionExists(sessionId);
```

**Features:**
- Multi-conversation support with context memory
- Clarification Q&A management
- Context building for classification
- Session caching for performance

## Features

- **File Locking**: Prevents concurrent write conflicts
- **Atomic Writes**: Uses temp files and rename for data integrity
- **Versioning**: Automatic versioning for prompts and decision matrices
- **Daily Rotation**: Audit logs rotate daily (YYYY-MM-DD.jsonl)
- **Error Handling**: Graceful handling of corrupted files and missing data
- **Caching**: Session caching for improved performance
- **Type Safety**: Full TypeScript support with Zod validation

## Data Directory Structure

```
/data
├── sessions/
│   └── {sessionId}.json
├── audit-logs/
│   └── {YYYY-MM-DD}.jsonl
├── prompts/
│   └── {promptId}_{version}.txt
├── decision-matrix/
│   └── v{version}.json
├── analytics/
├── audio/
├── pii-mappings/
└── learning/
```
