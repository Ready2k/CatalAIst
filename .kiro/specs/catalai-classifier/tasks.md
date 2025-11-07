# Implementation Plan

- [x] 1. Set up project structure and Docker foundation
  - Create directory structure for frontend (React), backend (Node.js/Python), and shared types
  - Initialize package.json and configure TypeScript/build tools
  - Create Dockerfile for backend with Node.js 20 Alpine or Python 3.11 Slim
  - Create Dockerfile for frontend with Node.js 20 Alpine + nginx
  - Create docker-compose.yml with backend, frontend, and data volume
  - Set up data directory structure: sessions, audit-logs, prompts, audio, analytics, pii-mappings, decision-matrix, learning
  - _Requirements: 15.1, 15.2, 15.3, 15.4_

- [x] 2. Implement core data models and validation
  - [x] 2.1 Create TypeScript interfaces for all data models
    - Define Session, Classification, Feedback, UserRating, AuditLogEntry
    - Define DecisionMatrix, Rule, Attribute, DecisionMatrixEvaluation
    - Define LearningSuggestion, LearningAnalysis, AudioTranscription
    - Add validation schemas using Zod or similar library
    - _Requirements: 1.2, 3.3, 5.3, 19.1, 22.1_
  
  - [x] 2.2 Implement input validation for process descriptions
    - Create validation function for minimum 10 character requirement
    - Add OpenAI API key format validation
    - Add sanitization for user input
    - _Requirements: 1.2, 9.2_
  
  - [ ]* 2.3 Write unit tests for data models and validation
    - Test validation logic for all data models
    - Test edge cases for input validation
    - _Requirements: 1.2_

- [x] 3. Build OpenAI Service Component
  - [x] 3.1 Implement OpenAI API client wrapper
    - Create service class with methods for chat, transcribe, synthesize, listModels
    - Implement retry logic with exponential backoff (3 attempts)
    - Add 30-second timeout handling
    - Accept user-provided API key per request (never persist)
    - _Requirements: 7.1, 9.3, 9.4_
  
  - [x] 3.2 Implement chat completion for classification
    - Create method to send messages to GPT-4/GPT-3.5-turbo
    - Parse and extract classification response
    - Handle API errors and timeouts gracefully
    - _Requirements: 3.1, 3.4, 8.4_
  
  - [ ]* 3.3 Write unit tests for OpenAI service
    - Mock OpenAI API responses
    - Test retry logic and error handling
    - Test API key validation
    - _Requirements: 7.4, 9.2_

- [x] 4. Implement file-based storage layer
  - [x] 4.1 Create storage service for JSON file operations
    - Implement read/write methods for JSON files
    - Add file locking for concurrent access
    - Implement versioning for prompts and decision matrix
    - _Requirements: 5.5, 6.3_
  
  - [x] 4.2 Create storage service for JSONL audit logs
    - Implement append-only JSONL writer
    - Add daily file rotation logic
    - Ensure millisecond-precision timestamps
    - _Requirements: 5.4, 5.5_
  
  - [x] 4.3 Implement session storage
    - Create methods to save/load session JSON files
    - Implement session ID generation
    - Handle corrupted file errors gracefully
    - _Requirements: 10.1, 10.2_
  
  - [ ]* 4.4 Write unit tests for storage layer
    - Test file read/write operations
    - Test concurrent access handling
    - Test error scenarios (disk full, corrupted files)
    - _Requirements: 5.5_

- [x] 5. Build Classification Engine with sequential evaluation
  - [x] 5.1 Create classification prompt template
    - Design structured prompt for six-category classification
    - Include category sequence explanation (Eliminate → Simplify → Digitise → RPA → AI Agent → Agentic AI)
    - Add instructions for confidence scoring and rationale
    - _Requirements: 3.1, 3.2, 11.1, 11.2_
  
  - [x] 5.2 Implement classification logic
    - Send process description + conversation history to OpenAI
    - Extract category, confidence, rationale, categoryProgression, futureOpportunities
    - Implement confidence-based routing (>0.85, 0.6-0.85, <0.6)
    - _Requirements: 2.1, 2.2, 3.1, 3.3, 11.3_
  
  - [x] 5.3 Implement attribute extraction
    - Create prompt to extract business attributes from conversation
    - Extract frequency, business value, complexity, risk, user count, data sensitivity
    - Allow manual adjustment of extracted attributes
    - _Requirements: 22.3, 22.4, 22.5_
  
  - [ ]* 5.4 Write unit tests for classification engine
    - Test confidence routing with different score ranges
    - Mock OpenAI responses for deterministic testing
    - Test attribute extraction logic
    - _Requirements: 2.1, 2.2, 3.1_

- [x] 6. Implement Clarification Loop system
  - [x] 6.1 Create clarification question generation logic
    - Design prompt for generating 1-2 clarifying questions
    - Include attribute-related questions for decision matrix
    - Implement question limit enforcement (max 5 per session)
    - Use conversation history to avoid redundant questions
    - _Requirements: 2.1, 2.3, 22.3_
  
  - [x] 6.2 Build clarification response handling
    - Implement logic to incorporate user responses into classification context
    - Update session state with Q&A pairs
    - Store conversation history for context memory
    - _Requirements: 2.4, 10.3, 10.4_
  
  - [ ]* 6.3 Write integration tests for clarification flow
    - Test multi-turn clarification scenarios
    - Verify question limit enforcement
    - Test context memory across conversations
    - _Requirements: 2.1, 2.3, 2.4, 10.5_

- [x] 7. Build Decision Matrix system
  - [x] 7.1 Implement AI-generated initial decision matrix
    - Create prompt for LLM to generate baseline decision matrix
    - Generate default attributes with weights
    - Generate initial rules based on transformation best practices
    - Save as version 1.0 in /data/decision-matrix/
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
  
  - [x] 7.2 Implement decision matrix evaluation engine
    - Create rule evaluation logic (conditions and operators)
    - Implement weighted scoring for categories
    - Apply rules after LLM classification
    - Generate DecisionMatrixEvaluation with triggered rules
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_
  
  - [x] 7.3 Implement decision matrix management API
    - Create GET /api/decision-matrix endpoints
    - Create PUT /api/decision-matrix endpoint with versioning
    - Allow admin to edit rules, attributes, and weights
    - Store all versions for audit
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6_
  
  - [ ]* 7.4 Write unit tests for decision matrix
    - Test rule evaluation logic
    - Test weighted scoring calculations
    - Test version management
    - _Requirements: 19.6, 20.1, 20.2_

- [x] 8. Build AI Learning Engine
  - [x] 8.1 Implement feedback analysis service
    - Collect misclassifications and user corrections
    - Calculate agreement rates by category
    - Identify common misclassification patterns
    - _Requirements: 12.1, 12.5, 24.1, 24.2_
  
  - [x] 8.2 Implement AI-powered suggestion generation
    - Create prompt for LLM to analyze patterns and suggest improvements
    - Generate suggested rule modifications or new rules
    - Include rationale and impact estimates
    - Store suggestions in /data/learning/
    - _Requirements: 24.3, 24.4, 24.5_
  
  - [x] 8.3 Implement suggestion review and approval workflow
    - Create GET /api/learning/suggestions endpoint
    - Create POST /api/learning/suggestions/:id/approve endpoint
    - Create POST /api/learning/suggestions/:id/reject endpoint
    - Apply approved suggestions to decision matrix (create new version)
    - _Requirements: 24.6, 25.5, 25.6_
  
  - [x] 8.4 Implement automatic and manual analysis triggers
    - Add automatic trigger when agreement rate < 80%
    - Create POST /api/learning/analyze endpoint for manual trigger
    - Generate analysis reports with suggested improvements
    - _Requirements: 12.4, 24.1, 25.1, 25.2, 25.3, 25.4_
  
  - [ ]* 8.5 Write integration tests for learning engine
    - Test pattern identification logic
    - Test suggestion generation
    - Test approval workflow
    - _Requirements: 24.1, 24.2, 24.3_

- [x] 9. Implement PII Detection and Scrubbing
  - [x] 9.1 Create regex-based PII detection service
    - Implement email address detection
    - Implement phone number detection (international formats)
    - Implement SSN and credit card detection
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  
  - [x] 9.2 Implement anonymization and mapping storage
    - Replace detected PII with tokens ([EMAIL_1], [PHONE_1])
    - Store encrypted mappings in /data/pii-mappings/
    - Log access to PII mappings
    - _Requirements: 14.5_
  
  - [ ]* 9.3 Write unit tests for PII detection
    - Test detection patterns with various formats
    - Test anonymization logic
    - Test mapping storage and retrieval
    - _Requirements: 14.1, 14.2, 14.3, 14.4_

- [x] 10. Build Audit Logging system
  - [x] 10.1 Implement audit log writer service
    - Create async logging function for JSONL writes
    - Add millisecond-precision timestamps
    - Include decision matrix version in logs
    - Implement daily file rotation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 21.1_
  
  - [x] 10.2 Add logging hooks to all interaction points
    - Log user inputs at submission
    - Log all LLM prompts and responses
    - Log feedback submissions and ratings
    - Log decision matrix evaluations and triggered rules
    - Pass all data through PII scrubber before logging
    - _Requirements: 5.1, 5.2, 5.3, 21.2, 21.3, 21.4_
  
  - [ ]* 10.3 Write integration tests for audit logging
    - Test logging pipeline with PII scrubbing
    - Test file rotation logic
    - Test decision matrix audit trail
    - _Requirements: 5.5, 21.1, 21.2_

- [x] 11. Implement Voice Services
  - [x] 11.1 Build Speech-to-Text component
    - Create POST /api/voice/transcribe endpoint
    - Implement OpenAI Whisper API integration
    - Support WAV, MP3, M4A, WebM formats
    - Enforce 5-minute max duration and 25MB max file size
    - Save audio temporarily to /data/audio/, delete after transcription
    - _Requirements: 16.1, 16.2, 16.4, 16.5_
  
  - [x] 11.2 Build Text-to-Speech component
    - Create POST /api/voice/synthesize endpoint
    - Implement OpenAI TTS API integration
    - Support voice selection (alloy, echo, fable, onyx, nova, shimmer)
    - Cache generated audio in /data/audio/cache/
    - Implement cache cleanup (remove files > 7 days old)
    - _Requirements: 17.1, 17.2, 17.3, 17.5, 17.6, 18.3_
  
  - [ ]* 11.3 Write integration tests for voice services
    - Test STT with sample audio files
    - Test TTS synthesis and caching
    - Test error handling for unsupported formats
    - _Requirements: 16.4, 17.5_

- [x] 12. Build Analytics Engine
  - [x] 12.1 Implement metrics calculation service
    - Calculate overall agreement rate
    - Calculate agreement rate by category
    - Calculate user satisfaction rate (thumbs up percentage)
    - Calculate average classification time
    - Track total sessions processed
    - _Requirements: 12.1, 12.2, 12.5, 13.4_
  
  - [x] 12.2 Create analytics dashboard API
    - Create GET /api/analytics/dashboard endpoint
    - Recalculate metrics on-demand
    - Flag when agreement rate < 80%
    - Store metrics in /data/analytics/metrics.json
    - _Requirements: 12.2, 12.3, 12.4, 13.5_
  
  - [ ]* 12.3 Write unit tests for analytics
    - Test agreement rate calculations
    - Test satisfaction rate calculations
    - Test alerting logic
    - _Requirements: 12.1, 12.4, 12.5_

- [x] 13. Create Backend REST API
  - [x] 13.1 Implement session management endpoints
    - Create POST /api/sessions endpoint (with API key)
    - Create GET /api/sessions/:id endpoint
    - Create POST /api/sessions/:id/conversations endpoint
    - Create DELETE /api/sessions/:id endpoint (clear API key)
    - _Requirements: 9.1, 9.3, 9.5, 10.1, 10.2_
  
  - [x] 13.2 Implement process submission endpoint
    - Create POST /api/process/submit endpoint
    - Validate input and create/update session
    - Return sessionId with 2-second response time
    - _Requirements: 1.1, 1.3_
  
  - [x] 13.3 Implement classification workflow orchestration
    - Orchestrate classification flow: clarification → classification → decision matrix → response
    - Handle confidence-based routing
    - Integrate all components (classification, clarification, decision matrix, audit)
    - _Requirements: 2.1, 2.2, 3.1, 3.4, 20.1_
  
  - [x] 13.4 Implement feedback endpoints
    - Create POST /api/feedback/classification endpoint
    - Create POST /api/feedback/rating endpoint
    - Store feedback and trigger learning analysis if needed
    - _Requirements: 4.1, 4.2, 4.3, 13.1, 13.2, 13.3_
  
  - [x] 13.5 Implement prompt management endpoints
    - Create GET /api/prompts endpoint
    - Create GET /api/prompts/:id endpoint
    - Create PUT /api/prompts/:id endpoint with validation and versioning
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 13.6 Add health check endpoint
    - Create GET /health endpoint
    - Return 200 OK with system status
    - Check file system access
    - _Requirements: 15.7_
  
  - [ ]* 13.7 Write integration tests for API endpoints
    - Test all endpoints with valid and invalid inputs
    - Verify error handling and response formats
    - Test end-to-end classification workflow
    - _Requirements: 1.3, 3.4, 4.1_

- [x] 14. Build React Frontend application
  - [x] 14.1 Create API key input and session initialization
    - Build API key input component
    - Validate and store API key in session
    - Display error for invalid API key
    - _Requirements: 9.1, 9.2_
  
  - [x] 14.2 Create chat interface for process description
    - Build text input component with validation
    - Add voice recording button for audio input
    - Display submission acknowledgment
    - _Requirements: 1.1, 1.3, 16.1_
  
  - [x] 14.3 Implement voice interface
    - Add audio recording controls
    - Display transcription for confirmation
    - Add voice playback toggle
    - Play audio responses automatically when enabled
    - _Requirements: 16.1, 16.5, 17.1, 17.2, 17.5, 17.6_
  
  - [x] 14.4 Implement clarification question UI
    - Display questions from backend
    - Capture and submit user responses
    - Show progress through clarification loop
    - Support voice input for responses
    - _Requirements: 2.1, 2.4, 16.1_
  
  - [x] 14.5 Build classification results display
    - Show category, confidence score, and rationale
    - Display category progression explanation
    - Show future opportunities
    - Display decision matrix evaluation (if rules were applied)
    - Show original vs final classification if overridden
    - Display results within 5 seconds of completion
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 11.2, 11.3, 20.4, 20.5_
  
  - [x] 14.6 Implement feedback capture UI
    - Add confirm/correct buttons for classification
    - Create correction form for selecting different category
    - Add thumbs up/down buttons with optional comments
    - _Requirements: 4.1, 4.2, 13.1, 13.2_
  
  - [x] 14.7 Create analytics dashboard
    - Display overall agreement rate
    - Display agreement rate by category
    - Display user satisfaction rate
    - Show alert when agreement rate < 80%
    - _Requirements: 12.2, 12.4, 13.5_
  
  - [x] 14.8 Create admin interface for decision matrix
    - Display current decision matrix version
    - Show all rules, attributes, and weights
    - Allow editing rules and attributes
    - Display version history
    - Show AI-generated initial matrix for review
    - _Requirements: 19.6, 23.1, 23.2, 23.3, 23.4_
  
  - [x] 14.9 Create admin interface for AI learning
    - Display pending suggestions from AI
    - Show suggestion rationale and impact estimates
    - Add approve/reject buttons for each suggestion
    - Trigger manual analysis button
    - Display analysis reports
    - _Requirements: 24.4, 25.1, 25.4, 25.5_
  
  - [x] 14.10 Create prompt management admin interface
    - Build prompt template viewer
    - Add prompt editor with syntax validation
    - Display version history
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 15. Deploy and configure Docker environment
  - [x] 15.1 Build and test Docker images
    - Build backend Docker image
    - Build frontend Docker image
    - Test images locally
    - Verify health checks work
    - _Requirements: 15.1, 15.2, 15.7_
  
  - [x] 15.2 Configure docker-compose for local deployment
    - Set up backend service with volume mounts
    - Set up frontend service
    - Configure environment variables
    - Test full stack with docker-compose up
    - _Requirements: 15.3, 15.5_
  
  - [x] 15.3 Create deployment documentation
    - Document environment variables
    - Document data volume structure
    - Document backup/restore procedures
    - Document API endpoints
    - _Requirements: 15.5_
  
  - [x] 15.4 Implement startup initialization
    - Check if decision matrix exists, generate if not
    - Load default prompts if not present
    - Create data directories if missing
    - _Requirements: 19.1, 19.5_

- [ ]* 16. End-to-end testing and validation
  - Test complete user journey from input to classification
  - Test clarification loop with multiple questions
  - Test voice input and output workflows
  - Test decision matrix override scenarios
  - Test AI learning suggestion workflow
  - Test feedback capture and audit logging
  - Test multi-conversation session with context retention
  - Validate performance requirements (response times)
  - Test Docker deployment and data persistence
  - _Requirements: All_
