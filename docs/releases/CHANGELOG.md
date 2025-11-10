# Changelog

All notable changes to CatalAIst will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-11-09

### Added - Decision Matrix Flow Visualization
- **Interactive Flow Diagram**: Visual representation of decision matrix logic
  - ReactFlow-based graph visualization with custom node types
  - 5 node types: Attributes, Rules, Conditions, Actions, Categories
  - Color-coded nodes by type and state (active/inactive rules)
  - Visual connections showing data flow from attributes through rules to categories
  - Automatic layout engine with column-based positioning
  - Priority-based rule sorting (highest priority at top)
  
- **Full Accessibility Support**:
  - Complete keyboard navigation (Tab, Arrow keys, Enter, Escape)
  - Arrow Left/Right navigates between connected nodes
  - Arrow Up/Down navigates between nodes of same type
  - Enter key selects/edits focused nodes
  - Escape key deselects nodes and closes panels
  - Comprehensive ARIA labels on all interactive elements
  - Screen reader announcements for node selection
  - WCAG AA compliant color contrast
  - Visible focus indicators (3px outline with 2px offset)
  - Minimum font sizes increased to 11-12px
  
- **Responsive Design**:
  - Mobile-first responsive layout (< 768px, 768-1024px, > 1024px breakpoints)
  - Property panel adapts: 100% width on mobile, 350px on tablet, 400px on desktop
  - Toolbar stacks vertically on mobile
  - Touch-optimized interactions (pinch-to-zoom, disabled drag on mobile)
  - Minimap hidden on mobile to save screen space
  - Reduced edge stroke width on mobile (1.5px vs 2px)
  
- **Interactive Property Panels**:
  - Edit attributes (name, type, weight, description, possible values)
  - Edit rules (name, priority, active status, conditions)
  - Edit actions (type, target category, confidence adjustment, rationale)
  - Real-time validation with error messages
  - Dirty state tracking with unsaved changes indicator
  - Keyboard shortcuts (Escape to close)
  
- **Help System**:
  - Welcome tour for first-time users
  - Node legend with type descriptions
  - Contextual tooltips on all nodes
  - Comprehensive help panel with usage guide
  - Interactive node highlighting from legend
  
- **Validation System**:
  - Real-time validation of decision matrix structure
  - Validation summary panel with error/warning counts
  - Click-to-navigate from validation errors to nodes
  - Attribute validation (weight range, required fields)
  - Rule validation (priority, conditions, actions)
  - Condition validation (operator compatibility, value types)
  - Action validation (target category, confidence range)
  
- **Performance Monitoring**:
  - Built-in performance measurement utilities
  - Interaction timing tracking
  - Performance budget checking
  - Debounced validation (200ms delay)
  - Optimized re-rendering with React.memo
  
### Changed
- **Decision Matrix Admin**: Replaced table view with interactive flow visualization
  - More intuitive understanding of decision logic
  - Visual representation of rule priorities and connections
  - Easier identification of gaps and overlaps in rules
  - Better understanding of attribute influence on classifications
  
### Fixed
- **Validation Error**: Fixed runtime error where `validateMatrix` was receiving wrong data structure
  - Now correctly extracts attributes and rules from flow nodes before validation
  - Prevents "Cannot read properties of undefined (reading 'forEach')" error
  
- **Layout Issue**: Fixed blank screen on initial load
  - Removed extra wrapper div that broke ReactFlow layout
  - ReactFlow now renders directly in container with proper dimensions
  - Applied automatic layout algorithm to position nodes correctly
  
### Technical Details
- **New Dependencies**:
  - `@xyflow/react` v12.0.0 - Flow diagram library
  - `dagre` v0.8.5 - Graph layout algorithm
  
- **New Components**:
  - `DecisionMatrixFlowEditor` - Main flow editor component
  - `AttributeNode`, `RuleNode`, `ConditionNode`, `ActionNode`, `CategoryNode` - Custom node types
  - `AttributePropertyPanel`, `RulePropertyPanel`, `ActionPropertyPanel` - Property editors
  - `ValidationSummary` - Validation error display
  - `WelcomeTour`, `NodeLegend`, `HelpPanel`, `ContextualTooltip` - Help system
  
- **New Utilities**:
  - `matrixToFlow` - Convert decision matrix to flow graph
  - `flowToMatrix` - Convert flow graph back to decision matrix
  - `layoutEngine` - Automatic node positioning with dagre
  - `validation` - Comprehensive validation logic
  - `nodeValidation` - Node-specific validation rules
  - `performanceMonitor` - Performance tracking utilities
  - `debounce` - Debounced function execution
  
### Breaking Changes
- Decision Matrix admin interface completely redesigned
- Previous table-based editing replaced with visual flow editor
- API endpoints remain unchanged (backward compatible)

## [1.2.0] - 2025-11-09

### Added
- **AWS Bedrock Integration**: Full support for AWS Bedrock as an alternative LLM provider
  - Support for Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus, and other Claude models
  - Automatic provider detection based on model name
  - AWS credential support (Access Key ID, Secret Access Key, Session Token, Region)
  - Clean provider abstraction layer for easy addition of future LLM providers
  - Comprehensive documentation: AWS_BEDROCK_SETUP.md, BEDROCK_EXAMPLES.md, BEDROCK_QUICK_START.md
  - Usage examples in Bash, JavaScript, TypeScript, and Python
- **LLM Provider Abstraction**: New architecture for multi-provider support
  - `ILLMProvider` interface for consistent provider implementation
  - `LLMService` factory for provider selection and routing
  - `BedrockService` implementation for AWS Bedrock
  - Refactored `OpenAIService` to implement common interface
- **Enhanced API Endpoints**: All classification endpoints now support both OpenAI and Bedrock
  - `/api/process/submit` - Accept AWS credentials
  - `/api/process/classify` - Accept AWS credentials
  - `/api/process/clarify` - Accept AWS credentials

### Changed
- **Classification Service**: Updated to use LLM provider abstraction
  - `ClassificationRequest` now includes AWS credential parameters
  - Automatic provider detection and configuration
  - Backward compatible with existing OpenAI usage
- **Clarification Service**: Updated to use LLM provider abstraction
  - `ClarificationRequest` now includes AWS credential parameters
  - Seamless provider switching
- **Frontend Configuration**: Replaced ApiKeyInput with LLMConfiguration component
  - Tab-based interface for selecting OpenAI or AWS Bedrock
  - Provider-specific credential forms
  - Model selection based on provider
  - Advanced options for AWS temporary credentials
- **API Service**: Enhanced to support multiple LLM providers
  - Stores complete LLM configuration (provider, model, credentials)
  - Automatically includes correct credentials in API requests
  - Backward compatible with existing OpenAI-only code
- **Docker Configuration**: Added AWS environment variables to docker-compose.yml
  - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_SESSION_TOKEN`, `AWS_REGION`
- **Dependencies**: Added `@aws-sdk/client-bedrock-runtime` for Bedrock support

### Documentation
- Added comprehensive AWS Bedrock setup guide
- Added usage examples for multiple programming languages
- Added quick start guide for 5-minute setup
- Updated README with LLM provider information
- Added architecture diagrams and troubleshooting guides

### Technical
- Zero breaking changes - fully backward compatible
- Type-safe implementation with TypeScript
- Comprehensive error handling for both providers
- Retry logic with exponential backoff for both providers
- Timeout handling (30 seconds for chat completions)
- Model validation for each provider

## [1.1.0] - 2025-11-08

### Added
- **Decision Matrix Auto-Initialization**: 
  - New "Generate Decision Matrix" button in Decision Matrix admin interface
  - Automatic detection when decision matrix hasn't been initialized
  - User-friendly initialization screen with clear explanation of what will be generated
  - AI-powered generation of initial decision matrix with attributes, rules, and decision logic
  - Seamless integration with existing edit and version control features
- **Description Quality Assessment**:
  - New quality assessment logic that evaluates process descriptions before classification
  - Analyzes word count and key information indicators (frequency, volume, current state, complexity, pain points)
  - Comprehensive test suite with 10 test cases validating quality assessment behavior

### Changed
- Decision Matrix admin now shows initialization screen instead of error when matrix doesn't exist
- Improved user experience for first-time setup with clear guidance
- **Enhanced Clarification Logic**: Classification routing now considers both confidence score AND description quality
  - Brief descriptions (< 20 words) trigger clarification even with high confidence
  - Marginal descriptions (20-50 words) with medium-high confidence trigger clarification
  - Only detailed descriptions (> 50 words) with very high confidence auto-classify
  - Prevents premature classification of vague or incomplete descriptions
- **Enhanced Clarification Prompt (v1.1)**: More aggressive questioning about critical automation factors
  - New priority framework emphasizing data source, output usage, and human judgment requirements
  - Added critical questions about observational vs. transactional data
  - Questions now probe whether processes require human interpretation or expertise
  - Better detection of processes that appear automatable but require human judgment
  - Prevents misclassification of observational/analytical work as RPA-suitable

### Fixed
- Decision Matrix navigation button no longer shows error message when matrix hasn't been initialized
- Better error handling for 404 responses from decision matrix endpoints
- **Clarification Bypass Issue**: Fixed issue where brief/vague descriptions with high confidence scores (>0.9) would skip clarification questions entirely (Session 801ab993)
  - System now asks clarifying questions for insufficient descriptions regardless of confidence
  - Improves classification accuracy by gathering more context before making recommendations
- **Intelligent Interview System**: Redesigned clarification to work like a skilled consultant interview
  - Replaced rigid 5-question limit with adaptive soft limit (8) and hard limit (15)
  - System now stops based on confidence + information completeness, not just question count
  - Detects "I don't know" patterns and stops asking when user can't provide more info
  - Adapts question count based on conversation progress (3 → 2 → 1 questions per round)
  - Assesses information completeness across 6 key indicators before stopping
  - Prevents overwhelming users while ensuring thorough discovery for complex processes
- **Question Storage**: Fixed issue where actual clarification questions weren't being stored
  - Questions were stored as placeholders ("Clarification 1", "Clarification 2", etc.)
  - Now accepts and stores actual question text from frontend
  - Improves audit trail and enables question effectiveness analysis
- **Attribute Extraction Resilience**: Fixed issue where attribute extraction would fail completely if any attribute was missing
  - Now fills missing attributes with "unknown" instead of failing
  - Provides graceful degradation for incomplete data
  - Allows decision matrix evaluation with partial attribute data

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

### Future Enhancements
- Multi-user authentication and authorization
- Database backend option (PostgreSQL/MongoDB)
- Horizontal scaling support
- Advanced analytics and reporting
- Batch classification API
- Export functionality for audit logs
- Custom transformation categories
- Integration with external systems

[1.1.0]: https://github.com/yourusername/CatalAIst/releases/tag/v1.1.0
[1.0.0]: https://github.com/yourusername/CatalAIst/releases/tag/v1.0.0
