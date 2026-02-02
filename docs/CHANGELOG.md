# Changelog

All notable changes to CatalAIst will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [3.2.0] - 2026-02-02

### Added

#### 🧠 Discovery-First Intelligence
- **High-Confidence Auto-Classification**: Threshold raised to 0.95 to ensure accuracy.
- **Mandatory Strategic Evidence**: System now requires evidence for strategic factors before concluding an interview.
- **Information Completeness Algorithm**: New service to assess user descriptions and identify missing data points.
- **Advanced Loop Detection**: Identifies and breaks repetitive LLM clarification cycles.

#### ⚙️ Dynamic Strategic Configuration
- **Admin UI for Strategic Questions**: Real-time management of inquiry factors.
- **Automated Prompt Injection**: questions are dynamically woven into Classification and Attribute Extraction prompts.
- **Priority-Driven Discovery**: Uses strategic questions as weights for confidence assessment.

#### 📊 Robust Attribute Extraction
- **Flexible JSON Parser**: Handles both flat and nested JSON responses from different LLM providers.
- **Attribute Alias Mapping**: Maps variations in attribute naming (e.g., "impact" -> "business_value").
- **Custom Attribute Preservation**: Correctly handles and preserves strategic attributes in the decision matrix.

#### ⏱️ Session Lifecycle Management
- **2-Hour Inactivity Timeout**: Automatically closes stale sessions to maintain system hygiene.
- **Background Cleanup**: Integrated into session listing and creation routes.
- **System Closure Rationale**: Automatically appends termination notes to timed-out sessions.

#### 📂 Git-Integrated Decision Matrix
- **Versioned Matrix Config**: Decision matrix logic is now tracked via Git.
- **Audit History**: Full visibility into evolution of classification logic.

## [3.0.1] - 2025-12-21

### Added
- **Amazon Nova Model Support** (Micro, Lite, Pro)
- **AWS Bedrock Converse API** implementation
- **Nova 2 Sonic** voice interface for Bedrock
- **Unified voice experience** across providers
- **Enhanced error handling** and model detection

### Added

#### 🎤 Complete Voice Interface
- **Speech-to-Text (STT)** using OpenAI Whisper
  - Record audio with visual feedback (timer, waveform, pulsing indicator)
  - Automatic transcription with edit capability
  - 5-minute maximum recording time with warnings
  - Voice Activity Detection (VAD) for automatic silence detection
- **Text-to-Speech (TTS)** using OpenAI TTS-1
  - Questions read aloud automatically
  - 6 voice options: alloy, echo, fable, onyx, nova, shimmer
  - Audio playback controls (play, pause, stop, repeat)
  - Audio caching for repeated questions
- **Two Voice Modes**:
  - **Non-Streaming Mode** (Default): Manual control, edit transcripts before sending
  - **Streaming Mode**: Automatic conversational flow, hands-free operation
  - Auto-fallback from streaming to non-streaming on errors
- **Voice Components**:
  - `AudioRecorder.tsx` - Audio recording with VAD
  - `AudioPlayer.tsx` - Audio playback with controls
  - `TranscriptDisplay.tsx` - Transcript display and editing
  - `VoiceSettings.tsx` - Voice configuration UI
  - `NonStreamingModeController.tsx` - Manual voice flow
  - `StreamingModeController.tsx` - Automatic voice flow
  - `VoiceActivityDetector.ts` - Silence detection utility
- **Voice Configuration**:
  - Auto-enable for OpenAI provider
  - Auto-disable for Bedrock provider (until Bedrock voice support added)
  - Voice type selection in LLM Configuration
  - Streaming mode toggle
  - Session persistence for voice settings

#### 🔄 Enhanced Session Management
- **Start Fresh Button**:
  - Clear current session and start new classification
  - Confirmation dialog prevents accidental data loss
  - Creates new session with same configuration
  - Located next to "Skip Interview" button
- **Enhanced Logout**:
  - Deletes active session from backend before clearing local state
  - Ensures fresh start on next login
  - No continuation of previous sessions
  - Graceful error handling if deletion fails

#### 📚 Comprehensive Documentation
- **Voice Features Guide** (`docs/VOICE_FEATURES_GUIDE.md`):
  - 500+ lines of user documentation
  - Quick start guide
  - Mode comparisons and use cases
  - Recording controls and limits
  - Best practices and tips
  - Complete FAQ (15 questions)
- **Voice Troubleshooting** (`docs/VOICE_TROUBLESHOOTING.md`):
  - 600+ lines of troubleshooting guidance
  - 11 common issues with detailed solutions
  - Advanced debugging techniques
  - Mobile-specific issues (iOS/Android)
  - Browser compatibility guide
  - Complete troubleshooting checklist
- **Voice Interface Patterns** (`.kiro/steering/voice-interface-patterns.md`):
  - Developer guidelines and best practices
  - Authentication patterns
  - API key management patterns
  - OpenAI service call patterns
  - Error handling patterns
  - Code review checklist
  - Testing checklist
- **Start Fresh Feature** (`docs/features/START_FRESH_FEATURE.md`):
  - Feature documentation
  - Implementation details
  - User experience flows
  - Testing guide
- **Fix Documentation** (`docs/fixes/`):
  - `VOICE_AUTHENTICATION_FIX.md` - JWT authentication fix
  - `VOICE_API_CONFIG_FIX.md` - OpenAI service call fix

### Fixed

#### Voice Authentication
- **Issue**: "No token provided" error when using voice features
- **Fix**: Added JWT authentication headers to voice API calls
- **Impact**: Voice features now work correctly for all authenticated users
- **Files**: `frontend/src/services/api.ts`

#### Voice API Configuration
- **Issue**: "OpenAI API key is required" error despite key being configured
- **Fix**: Updated OpenAI service calls to use config object format with `provider` field
- **Impact**: Voice transcription and synthesis now work reliably
- **Files**: `backend/src/routes/voice.routes.ts`

#### API Key Fallback
- **Issue**: API key not found in some scenarios
- **Fix**: Added fallback pattern `this.apiKey || this.llmConfig?.apiKey`
- **Impact**: More reliable API key detection
- **Files**: `frontend/src/services/api.ts`

### Changed

#### UI/UX Improvements
- **Voice Button**: Added 🎤 microphone button to input areas and clarification questions
- **Skip Interview Button**: Updated with ⏭️ icon and improved styling
- **Start Fresh Button**: Added 🔄 icon with gray color scheme
- **Button Layout**: Side-by-side layout with responsive stacking on mobile
- **Help Text**: Improved descriptions for all action buttons
- **Visual Feedback**: Enhanced recording indicators (pulsing dot, timer, waveform)
- **Error Messages**: More specific and actionable error messages

#### Session Management
- **Logout**: Now async, deletes backend session before clearing local state
- **Session Cleanup**: Proper cleanup of voice configuration on logout
- **Fresh Start**: Every login starts with clean state

#### Documentation
- **README.md**: Added voice FAQ section and v3.0.0 information
- **docs/README.md**: Added voice documentation links

### Security

#### Voice Endpoints
- ✅ All voice endpoints require JWT authentication
- ✅ Rate limiting applied (10 requests/minute)
- ✅ Audio files deleted after transcription
- ✅ PII detection and encryption for transcripts
- ✅ Audit logging for all voice interactions

#### Session Management
- ✅ Sessions properly deleted from backend on logout
- ✅ No orphaned sessions accumulating
- ✅ Confirmation dialogs for destructive actions
- ✅ Graceful error handling

### Performance

#### Voice Features
- Transcription: 2-5 seconds (depends on audio length)
- Synthesis: 1-3 seconds (cached after first use)
- Recording: Real-time with minimal latency
- File Size: 25MB max upload (5 minutes audio)

#### Optimizations
- Audio caching for repeated questions
- Lazy loading of voice components
- Debounced VAD checks (100ms interval)
- Efficient audio compression (WebM format)
- Resource cleanup (audio URLs, media streams, audio context)

### Accessibility

#### Voice Interface
- ✅ Full keyboard navigation (Tab, Enter, Space, Escape)
- ✅ Screen reader support with ARIA labels
- ✅ ARIA live regions for state announcements
- ✅ WCAG AA color contrast compliance
- ✅ Visible focus indicators on all controls
- ✅ Touch-friendly mobile interface (44x44px targets)
- ✅ Modal dialogs with proper ARIA attributes

### Browser Compatibility

#### Tested Browsers
- ✅ Chrome 90+ (Desktop & Mobile)
- ✅ Firefox 88+ (Desktop & Mobile)
- ✅ Safari 14+ (Desktop & Mobile)
- ✅ Edge 90+ (Desktop)

#### Required APIs
- MediaRecorder API (audio recording)
- Web Audio API (voice activity detection)
- Audio element (playback)
- FormData (file uploads)

### Known Issues

#### Voice Features
1. **Bedrock Voice Support**: Not yet implemented (planned for future release)
2. **Offline Voice**: Requires internet connection (planned enhancement)
3. **Multi-language**: English only (planned enhancement)

#### Browser Limitations
1. **Safari Autoplay**: Requires user interaction before audio plays (browser security policy)
2. **Mobile Background**: Recording stops when screen locks (mobile OS behavior)

### Migration Guide

#### From v2.x to v3.0.0

**No Breaking Changes** - v3.0.0 is fully backward compatible with v2.x

**Upgrade Steps**:
1. Pull latest code: `git pull origin main`
2. Rebuild containers: `docker-compose build --no-cache`
3. Restart: `docker-compose up -d`
4. Verify: `curl http://localhost:8080/health`

**Configuration**: No changes required. Voice features auto-enable when using OpenAI provider.

### Statistics

#### Code Changes
- Files Added: 15+
- Files Modified: 10+
- Lines of Code: 5,000+
- Documentation: 1,500+ lines

#### Documentation
- User Guides: 2 (Voice Features, Troubleshooting)
- Developer Guides: 1 (Voice Patterns)
- Feature Docs: 1 (Start Fresh)
- Fix Docs: 2 (Authentication, API Config)
- Total Pages: 50+

## [2.2.0] - 2025-11-10

### Added

#### Enhanced Analytics Dashboard - Accessibility Features
- **WCAG 2.1 AA Compliance**: All analytics components now meet accessibility standards
  - Comprehensive ARIA labels and roles on all interactive elements
  - Full keyboard navigation support (Tab, Enter, Space, Escape, Arrow keys)
  - Screen reader announcements for filter changes, page changes, and session count updates
  - Visible focus indicators (3px solid blue outline) on all interactive elements
  - Minimum 4.5:1 color contrast ratio on all text (exceeds requirement)
  - Minimum 14px font size across all components (exceeds 12px requirement)
  - Minimum 44x44px touch targets on mobile for all interactive elements
- **SessionFilters Component**:
  - `role="search"` with proper ARIA labels on all filter controls
  - Real-time screen reader announcements for filter changes
  - `aria-invalid` and `aria-describedby` for form validation
  - Focus management with visible indicators
- **SessionListTable Component**:
  - Semantic table structure with `scope="col"` on headers
  - Screen reader announcements for session count and page changes
  - Keyboard-accessible table rows and pagination
  - Mobile card layout with proper ARIA roles
- **SessionDetailModal Component**:
  - `role="dialog"` with `aria-modal="true"`
  - Accessible tab navigation with proper ARIA attributes
  - Focus trap within modal
  - Escape key to close
- **FilteredMetricsSummary Component**:
  - `role="region"` with descriptive labels
  - Collapsible behavior with `aria-expanded`
  - Accessible metric displays
- **Documentation**: Added `frontend/src/components/ACCESSIBILITY.md` with:
  - Complete implementation details
  - Testing checklist
  - Browser and screen reader compatibility
  - WCAG compliance verification

### Changed
- All interactive elements now have minimum 44x44px touch targets
- All text now uses minimum 14px font size
- Focus indicators are now consistently styled across all components

### Fixed
- Removed unused `useMemo` import from SessionListTable
- Fixed TypeScript compilation warnings

### Documentation
- `frontend/src/components/ACCESSIBILITY.md` - Comprehensive accessibility documentation

### Testing
- Verified keyboard navigation across all components
- Tested with NVDA, JAWS, and VoiceOver screen readers
- Validated color contrast ratios
- Confirmed touch target sizes on mobile devices

---

#### Dynamic Bedrock Model Fetching
- **AWS Bedrock Model Discovery**: Models are now dynamically fetched from AWS Bedrock
  - Uses AWS SDK `ListFoundationModels` API to get available models
  - Filters to Anthropic Claude models with ACTIVE status
  - Automatically sorts by version (newest first)
  - Falls back to static list if API call fails
- **Frontend Integration**: 
  - Models load automatically when AWS credentials are entered
  - Real-time model fetching on credential blur
  - Loading indicator during model fetch
  - Error handling with fallback to defaults
- **Updated IAM Requirements**: 
  - Added `bedrock:ListFoundationModels` permission requirement
  - Updated documentation with new permission
- **API Updates**:
  - New public endpoint: `GET /api/public/models?provider=bedrock`
  - Accepts AWS credentials in headers (no authentication required)
  - Headers: `x-aws-access-key-id`, `x-aws-secret-access-key`, `x-aws-session-token`, `x-aws-region`
  - Models are fetched on-demand when user clicks the model dropdown
- **New Dependencies**: Added `@aws-sdk/client-bedrock` package
- **Test Script**: Added `test-bedrock-models.sh` for testing model listing

### Added

#### Collapsible Audit Trail Sessions
- **Collapse/Expand sessions**: Click on session header to toggle visibility
  - Keeps audit view clean and organized
  - Shows session summary when collapsed
  - "Expand All" and "Collapse All" buttons for bulk operations
  - Arrow indicator (▶/▼) shows current state
  - Sessions start collapsed by default for cleaner view

#### Audit Logging for Model Fetching
- **Model list events logged**: All model fetching attempts are now logged to audit trail
  - `model_list_success`: Successful model fetch with count and list of models
  - `model_list_error`: Failed attempts with error details
  - Includes provider, region, duration, IP address, and error stack traces
- **Enhanced Bedrock logging**: Detailed console logs for debugging
  - Shows total models returned by AWS API
  - Lists all Anthropic models with their lifecycle status
  - Warns when no models pass the filter
  - Logs detailed AWS error metadata
- **Audit trail visibility**: View model fetching activity in the Audit Logs tab

### Changed

#### Flexible Model Support for Bedrock
- **Dynamic model validation**: System now accepts any Anthropic Claude model from AWS Bedrock
  - Removed hardcoded model list validation
  - `isModelSupported()` now checks for `anthropic.claude` prefix
  - Supports new models like `anthropic.claude-haiku-4-5-20251001-v1:0` automatically
  - No code updates needed when AWS releases new Claude models
- **All model statuses included**: Returns models regardless of lifecycle status (ACTIVE, LEGACY, DEPRECATED)
  - AWS marks older models as LEGACY but they still work
  - Users can see and select all available Claude models
  - Status breakdown logged for debugging
- **Provisioned Throughput filtering**: Automatically filters out models that require Provisioned Throughput
  - Models like Claude Haiku 4.5 that only support Provisioned Throughput are excluded
  - Only shows models available with On-Demand access
  - Clear error message if user tries to use a Provisioned Throughput model

#### Model Fetching Behavior
- **Explicit "Fetch Models" button**: Added dedicated button to fetch models
  - Clear, explicit action - no automatic fetching
  - Button appears after credentials are entered
  - Shows loading state while fetching
  - Displays model count after successful fetch
  - Prevents accidental re-fetching when using dropdown
  - Better UX - user controls when to fetch

### Fixed

#### Session Management
- **New session for each classification**: Creates a new session when starting a new classification
  - Prevents session data from previous classifications interfering
  - Each classification has its own session ID
  - Fixes "Session does not have a classification yet" error
  - Added debug logging for session creation

#### Frontend Model Dropdown Issue
- **Fixed Bedrock models not appearing**: useEffect was resetting models to default list
  - Removed model lists from useEffect dependency array
  - Only resets models when provider changes, not when models are fetched
  - Added frontend console logging for debugging
  - Models now persist after being fetched from API

#### TypeScript Build Errors
- **Fixed DecisionMatrixFlowEditor type errors**: Added proper type casting for ReactFlow node updates
- **Removed invalid connectionMode prop**: Removed unsupported `connectionMode="loose"` from ReactFlow configuration
- **Frontend builds successfully**: All TypeScript compilation errors resolved

#### CORS Configuration for AWS Headers
- **Added AWS credential headers** to CORS allowed headers list
  - `x-aws-access-key-id`
  - `x-aws-secret-access-key`
  - `x-aws-session-token`
  - `x-aws-region`
- **Fixes CORS preflight errors** when fetching Bedrock models from frontend
- **Updated security documentation** with complete CORS configuration

## [2.1.0] - 2025-11-10

### Added

#### Skip Interview Feature
- **Manual Skip Button**: Users can now skip the clarification interview at any time
  - "Skip Interview & Classify Now" button in clarification UI
  - Proceeds directly to classification with available information
  - Useful when LLM gets stuck in loops or user has provided sufficient info
- **Interview Limits**: 
  - Soft limit: 8 questions (warning shown)
  - Hard limit: 15 questions (automatic stop)
- **Force Classification API**: New `forceClassify` parameter in `/api/process/classify`
- **Audit Logging**: Skip events logged as `force_classify` with metadata

#### Subject/Area Extraction
- **Automatic Subject Detection**: Extracts business area from process descriptions
  - 3-tier extraction: pattern matching → related terms → LLM → keyword fallback
  - Recognizes 35+ common subjects (Finance, HR, IT, Sales, etc.)
- **Manual Subject Selection**: Users can select or add custom subjects
  - Dropdown with predefined subjects in ChatInterface
  - "Add Custom Subject" option for organization-specific areas
  - Custom subjects persist across sessions
- **Subject-Based Analytics**: 
  - Groups similar processes for consistency checking
  - Subject-specific pattern detection in learning engine
  - Consistency analysis by business area
- **New API Endpoints**:
  - `GET /api/subjects` - Get all subjects
  - `POST /api/subjects` - Add custom subject
  - `DELETE /api/subjects/:subject` - Remove custom subject
- **Data Model Updates**:
  - Added `subject` field to Session and Conversation types
  - Added `subjectConsistency` to LearningAnalysis findings

#### Sentiment-Aware Interview Stopping
- **Frustration Detection**: Automatically detects user frustration
  - Patterns: "already answered", "stop asking", "frustrating", etc.
  - Immediate stop when frustration detected
- **Repetitive Question Detection**: Identifies when questions become similar
  - Analyzes keyword overlap between questions
  - Prevents LLM loops
- **Enhanced Loop Detection**: Catches exact duplicate questions
- **Smart Stopping**: Multi-layer protection
  1. Hard limit (15 questions)
  2. User frustration (2+ questions) - highest priority
  3. Repetitive questions (3+ questions)
  4. Exact duplicates (5+ questions)
  5. Unknown answers (5+ questions)
  6. Soft limit (8+ questions) - warning

### Changed
- **Clarification Service**: Enhanced with sentiment analysis and loop detection
- **Process Routes**: Now accepts optional `subject` parameter
- **Learning Analysis**: Includes subject-based consistency metrics
- **ChatInterface**: Added subject selector dropdown

### Fixed
- LLM loop issues where low-end models get stuck asking repetitive questions
- User frustration from excessive clarification questions
- Lack of subject grouping for similar processes

### Documentation
- `docs/SKIP_INTERVIEW_FEATURE.md` - Skip interview documentation
- `docs/INTERVIEW_LIMITS_REFERENCE.md` - Developer reference for limits
- `docs/SUBJECT_EXTRACTION_FEATURE.md` - Subject extraction documentation
- `docs/MANUAL_SUBJECT_SELECTION.md` - Manual subject selection guide
- `docs/SENTIMENT_AWARE_INTERVIEW.md` - Sentiment detection documentation
- `CHANGELOG_SKIP_INTERVIEW.md` - Detailed skip feature changelog
- `CHANGELOG_SUBJECT_EXTRACTION.md` - Detailed subject feature changelog

### Security
- All new endpoints require authentication
- Rate limiting applies to all new endpoints
- Input validation on all user inputs
- No new security vulnerabilities introduced

### Performance
- Subject extraction: < 1ms for 80% of cases (pattern matching)
- Sentiment detection: < 1ms per check
- No performance degradation on existing features

### Migration
- No migration required - all changes are backward compatible
- Existing sessions without subjects continue to work
- New optional fields added to data models

---

## [2.0.0] - 2025-11-09

### Added
- Initial release of CatalAIst v2.0
- Decision matrix flow visualization
- AI learning engine
- Prompt management system
- Multi-provider LLM support (OpenAI, AWS Bedrock)
- PII detection and scrubbing
- Audit logging
- User authentication and authorization
- Rate limiting
- Security headers and CORS configuration

[2.1.0]: https://github.com/yourusername/catalAIst/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/yourusername/catalAIst/releases/tag/v2.0.0
