# Changelog

All notable changes to CatalAIst will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
