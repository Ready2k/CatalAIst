# Changelog

All notable changes to CatalAIst will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-07

### Added

#### Core Features
- **6-tier transformation classification framework**: Eliminate, Simplify, Digitise, RPA, AI Agent, Agentic AI
- **Confidence-based routing**: Auto-classify (>0.85), clarify (0.6-0.85), manual review (<0.6)
- **Conversational interface**: Natural language input with clarification questions
- **Voice support**: Speech-to-text input and text-to-speech output using OpenAI Whisper and TTS
- **Session management**: Stateful conversations with full history tracking

#### Admin Dashboard
- **Analytics Dashboard**: 
  - Overall agreement rate tracking
  - Agreement rate by category
  - User satisfaction metrics
  - Average classification time
  - Alert system for agreement rate below 80%
- **Decision Matrix Admin**:
  - Configure business rules that influence classifications
  - Version control with full history
  - Rule activation/deactivation
  - Attribute weight management
- **AI Learning Admin**:
  - Review AI-generated improvement suggestions
  - Approve/reject suggestions with notes
  - Trigger manual analysis
  - Pattern detection for common misclassifications
- **Prompt Management**:
  - Edit classification, clarification, and attribute extraction prompts
  - Version control with audit trail
  - Validation and syntax checking
- **Audit Trail**:
  - Session-based view of all activities
  - Filter by date, event type, and session ID
  - PII scrubbing indicators
  - Expandable event details with full JSON data

#### Security & Compliance
- **PII Detection & Scrubbing**: Automatic detection and anonymization of sensitive data
- **Audit Logging**: JSONL-based append-only logs with daily rotation
- **Session tracking**: Complete traceability from input to classification to feedback
- **Encrypted PII mappings**: Reversible anonymization for audit purposes

#### Data Persistence
- **Docker volume storage**: All data persists across container restarts
- **File-based storage**: JSON for structured data, JSONL for audit logs
- **Automatic initialization**: Creates required directories and default prompts on first run
- **Backup support**: Simple tar-based backup and restore procedures

#### API
- Session management endpoints
- Process classification endpoints
- Feedback and rating endpoints
- Analytics endpoints
- Decision matrix endpoints
- Learning endpoints
- Prompt management endpoints
- Audit log endpoints
- Voice transcription and synthesis endpoints

### Technical Details

#### Backend
- Node.js 20 with TypeScript
- Express.js REST API
- OpenAI GPT-4 integration
- File-based storage with versioning
- Health check endpoint
- Comprehensive error handling
- Request validation with Zod schemas

#### Frontend
- React 18 with TypeScript
- Responsive design with inline styles
- Real-time feedback and validation
- Admin dashboard with multiple views
- Session-based audit trail viewer
- Nginx production server with logging

#### Infrastructure
- Docker Compose orchestration
- Alpine Linux base images
- Health checks with auto-restart
- Volume-based data persistence
- Environment variable configuration
- Production-ready nginx configuration

### Documentation
- Comprehensive README with quick start guide
- Detailed DEPLOYMENT.md with production guidelines
- API endpoint documentation
- Architecture overview
- Troubleshooting guide
- Backup and restore procedures

### Known Limitations
- Single-node deployment only (no clustering)
- File-based storage (not suitable for high-volume production without modifications)
- Voice features require OpenAI API access
- No built-in user authentication (API key per session)
- Decision matrix auto-generation requires manual trigger

### Future Enhancements
- Multi-user authentication and authorization
- Database backend option (PostgreSQL/MongoDB)
- Horizontal scaling support
- Advanced analytics and reporting
- Batch classification API
- Export functionality for audit logs
- Custom transformation categories
- Integration with external systems

[1.0.0]: https://github.com/yourusername/CatalAIst/releases/tag/v1.0.0
