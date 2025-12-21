# Requirements Document

## Introduction

CatalAIst is a conversational assistant that helps transformation leads classify business initiatives into six transformation categories: Eliminate, Simplify, Digitise, RPA, AI Agent, and Agentic AI. The system uses an LLM-powered classification engine with confidence-based clarification loops and comprehensive audit logging for governance.

### Implementation Phases

**Phase 1 - Proof of Concept (Current Scope):**
- OpenAI as the sole LLM provider (GPT models)
- OpenAI Whisper for Speech-to-Text
- OpenAI TTS for Text-to-Speech
- Local file system storage within Docker containers
- Single-user deployment focus

**Phase 2 - Future Expansion:**
- Additional LLM providers (Amazon Bedrock, GitHub Copilot)
- Additional voice providers (AWS Transcribe, AWS Polly)
- Cloud storage (AWS S3, DynamoDB)
- Multi-user deployment with authentication
- AWS container orchestration (ECS/EKS)

The architecture is designed to be modular, allowing Phase 2 providers to be added as plug-in adapters without refactoring core logic.

## Glossary

- **CatalAIst System**: The conversational assistant application that classifies business initiatives
- **User**: A transformation lead who describes business processes for classification
- **Classification Engine**: The LLM-powered component that categorizes initiatives
- **Confidence Score**: A numerical value (0-1) indicating classification certainty
- **Clarification Loop**: An interactive question-answer session to gather additional information
- **Audit Log**: A persistent record of all model interactions, inputs, and outputs
- **Transformation Category**: One of six categories: Eliminate, Simplify, Digitise, RPA, AI Agent, Agentic AI
- **Administrator**: A user with elevated privileges who configures system settings
- **LLM Provider**: A service that provides large language model capabilities (OpenAI, Bedrock, or Copilot)
- **LLM Configuration**: Settings that define how the system connects to an LLM Provider
- **Model**: A specific large language model variant available from an LLM Provider
- **API Token**: A secure credential used to authenticate with an LLM Provider
- **Session**: A series of related interactions between a User and the system for evaluating one initiative
- **Initiative**: A business process or improvement idea being evaluated for transformation
- **Context Memory**: The system's ability to retain information across multiple conversations within a session
- **Agreement Rate**: The percentage of classifications that match human expert evaluation
- **Container**: A Docker container that packages the application with its dependencies
- **Container Orchestration Service**: An AWS service that runs and manages containers (such as ECS or EKS)
- **Speech-to-Text (STT)**: A service that converts spoken audio into text transcription
- **Text-to-Speech (TTS)**: A service that converts text into spoken audio
- **Voice Interface**: An audio-based interaction mode using STT and TTS services
- **Audio Transcription Service**: A service provider for STT capabilities (OpenAI Whisper or AWS Transcribe)
- **Decision Matrix**: A configurable set of rules and weights that influence classification decisions
- **Rule**: A condition-based logic statement that can override or adjust LLM classifications
- **Attribute**: A characteristic of an initiative used in decision rules (e.g., frequency, value, complexity)
- **Weight**: A numerical value indicating the importance of an attribute in classification decisions

## Requirements

### Requirement 1

**User Story:** As a transformation lead, I want to describe a business process in plain language, so that I can receive an initial classification without technical complexity

#### Acceptance Criteria

1. THE CatalAIst System SHALL accept free-text process descriptions as input
2. THE CatalAIst System SHALL process descriptions containing a minimum of 10 characters
3. WHEN a User submits a process description, THE CatalAIst System SHALL acknowledge receipt within 2 seconds

### Requirement 2

**User Story:** As a transformation lead, I want the system to ask clarifying questions when needed, so that the classification is accurate

#### Acceptance Criteria

1. WHEN the Confidence Score is between 0.6 and 0.85, THE CatalAIst System SHALL generate 1 to 2 clarifying questions
2. WHEN the Confidence Score is below 0.6, THE CatalAIst System SHALL flag the initiative for manual review
3. THE CatalAIst System SHALL limit the Clarification Loop to a maximum of 5 questions per session
4. WHEN a User provides a response to a clarifying question, THE CatalAIst System SHALL incorporate the response into the classification analysis

### Requirement 3

**User Story:** As a transformation lead, I want to receive a classification with rationale, so that I understand why the system made its decision

#### Acceptance Criteria

1. WHEN the Confidence Score exceeds 0.85, THE CatalAIst System SHALL automatically classify the initiative into one Transformation Category
2. THE CatalAIst System SHALL provide a text rationale explaining the classification decision
3. THE CatalAIst System SHALL display the Confidence Score alongside the classification result
4. THE CatalAIst System SHALL present the classification result within 5 seconds of completing the Clarification Loop

### Requirement 4

**User Story:** As a transformation lead, I want to confirm or correct the classification, so that the system learns from my feedback

#### Acceptance Criteria

1. WHEN a classification result is presented, THE CatalAIst System SHALL provide options to confirm or correct the classification
2. WHEN a User corrects a classification, THE CatalAIst System SHALL capture the corrected Transformation Category
3. THE CatalAIst System SHALL store user feedback alongside the original classification in the Audit Log

### Requirement 5

**User Story:** As a governance officer, I want all model interactions logged, so that I can audit AI decisions for compliance

#### Acceptance Criteria

1. THE CatalAIst System SHALL log every prompt sent to the Classification Engine
2. THE CatalAIst System SHALL log every response received from the Classification Engine
3. THE CatalAIst System SHALL log all User inputs and feedback
4. THE CatalAIst System SHALL include timestamps with millisecond precision in all Audit Log entries
5. THE CatalAIst System SHALL persist Audit Log entries to local file system storage within 1 second of the interaction (Phase 1)
6. THE CatalAIst System SHALL support cloud storage for audit logs in future phases (Phase 2)

### Requirement 6

**User Story:** As a system administrator, I want to view and edit prompt templates, so that I can improve classification accuracy over time

#### Acceptance Criteria

1. THE CatalAIst System SHALL provide access to all prompt templates used by the Classification Engine
2. WHEN an administrator edits a prompt template, THE CatalAIst System SHALL validate the template syntax before saving
3. WHEN an administrator saves a prompt template, THE CatalAIst System SHALL version the template with a timestamp
4. THE CatalAIst System SHALL apply updated prompt templates to subsequent classification requests

### Requirement 7

**User Story:** As an Administrator, I want to configure OpenAI connection settings, so that the system can connect to the LLM provider

#### Acceptance Criteria

1. THE CatalAIst System SHALL support configuration for OpenAI as the LLM Provider (Phase 1)
2. THE CatalAIst System SHALL use a modular provider architecture to support future LLM providers (Phase 2)
3. WHEN an Administrator configures OpenAI, THE CatalAIst System SHALL store the API key and connection parameters
4. THE CatalAIst System SHALL validate the OpenAI API key before saving the configuration

### Requirement 8

**User Story:** As an Administrator, I want to select available OpenAI models, so that users can leverage the most appropriate model for classification

#### Acceptance Criteria

1. THE CatalAIst System SHALL retrieve the list of available Models from OpenAI
2. THE CatalAIst System SHALL display the list of available Models within 5 seconds of the request
3. WHEN an Administrator selects a Model, THE CatalAIst System SHALL store that Model selection in the configuration
4. THE CatalAIst System SHALL default to GPT-4 if no model is explicitly selected
5. WHEN OpenAI returns an error, THE CatalAIst System SHALL display an error message to the Administrator

### Requirement 9

**User Story:** As a User, I want to provide my OpenAI API key, so that I can use my own API access for classifications

#### Acceptance Criteria

1. THE CatalAIst System SHALL prompt the User for an OpenAI API key at the start of a session
2. THE CatalAIst System SHALL validate the API key format before accepting it
3. WHEN a User provides an API key, THE CatalAIst System SHALL store the key securely in memory for the duration of the session
4. THE CatalAIst System SHALL use the User-provided API key for all LLM, STT, and TTS requests during that session
5. WHEN a session ends, THE CatalAIst System SHALL clear the User-provided API key from memory

### Requirement 10

**User Story:** As a transformation lead, I want to have multiple conversations about the same initiative, so that the system builds understanding over time

#### Acceptance Criteria

1. THE CatalAIst System SHALL maintain Context Memory across multiple conversations within a Session
2. WHEN a User continues a previous Session, THE CatalAIst System SHALL retrieve all prior conversation history for that Initiative
3. THE CatalAIst System SHALL incorporate information from previous conversations when generating clarifying questions
4. THE CatalAIst System SHALL allow a User to add new information to an Initiative across multiple conversations
5. WHEN a User provides contradictory information, THE CatalAIst System SHALL ask for clarification about which information is correct

### Requirement 11

**User Story:** As a transformation lead, I want the system to guide me through the transformation categories in order, so that I understand the logical progression from manual to autonomous

#### Acceptance Criteria

1. THE CatalAIst System SHALL evaluate initiatives using the category sequence: Eliminate, Simplify, Digitise, RPA, AI Agent, Agentic AI
2. WHEN presenting rationale, THE CatalAIst System SHALL explain why an Initiative fits its category and not the preceding categories
3. THE CatalAIst System SHALL include in the rationale whether the Initiative could progress to a higher category in the future
4. WHEN an Initiative is classified as Digitise, THE CatalAIst System SHALL explain what manual or offline steps would be converted to digital

### Requirement 12

**User Story:** As a governance officer, I want to measure classification accuracy, so that I can validate the system is performing within acceptable thresholds

#### Acceptance Criteria

1. THE CatalAIst System SHALL calculate the Agreement Rate between AI classifications and User confirmations
2. THE CatalAIst System SHALL display the Agreement Rate on an analytics dashboard
3. THE CatalAIst System SHALL update the Agreement Rate within 1 hour of receiving User feedback
4. THE CatalAIst System SHALL flag when the Agreement Rate falls below 80 percent
5. THE CatalAIst System SHALL track Agreement Rate separately for each Transformation Category

### Requirement 13

**User Story:** As a User, I want to provide thumbs up or thumbs down feedback on the overall experience, so that the team can improve the system

#### Acceptance Criteria

1. WHEN a Session is completed, THE CatalAIst System SHALL prompt the User for thumbs up or thumbs down feedback
2. THE CatalAIst System SHALL allow the User to optionally provide text comments with their feedback
3. THE CatalAIst System SHALL store feedback ratings in the Audit Log
4. THE CatalAIst System SHALL calculate the percentage of thumbs up ratings across all Sessions
5. THE CatalAIst System SHALL display user satisfaction metrics on an analytics dashboard

### Requirement 14

**User Story:** As a governance officer, I want personally identifiable information automatically scrubbed from logs, so that we maintain privacy compliance

#### Acceptance Criteria

1. THE CatalAIst System SHALL detect personally identifiable information in User inputs before storing to the Audit Log
2. THE CatalAIst System SHALL replace detected names with anonymized tokens
3. THE CatalAIst System SHALL replace detected email addresses with anonymized tokens
4. THE CatalAIst System SHALL replace detected phone numbers with anonymized tokens
5. THE CatalAIst System SHALL maintain a mapping between original and anonymized data for authorized audit purposes only

### Requirement 15

**User Story:** As a DevOps engineer, I want the application packaged as Docker containers, so that I can deploy it consistently

#### Acceptance Criteria

1. THE CatalAIst System SHALL provide a Dockerfile for the backend application
2. THE CatalAIst System SHALL provide a Dockerfile for the frontend application
3. THE CatalAIst System SHALL include a docker-compose configuration for local development and testing
4. THE CatalAIst System SHALL use Docker volumes for persistent data storage (Phase 1)
5. THE CatalAIst System SHALL document all required environment variables for container configuration
6. THE CatalAIst System SHALL support deployment to AWS Container Orchestration Services (Phase 2)
7. WHEN containers start, THE CatalAIst System SHALL perform health checks within 30 seconds

### Requirement 16

**User Story:** As a transformation lead, I want to describe processes using voice input, so that I can interact naturally without typing

#### Acceptance Criteria

1. THE CatalAIst System SHALL provide a voice input interface for process descriptions
2. THE CatalAIst System SHALL support OpenAI Whisper as the Audio Transcription Service (Phase 1)
3. THE CatalAIst System SHALL use a modular voice provider architecture to support future STT services (Phase 2)
4. WHEN a User records audio, THE CatalAIst System SHALL transcribe the audio to text within 3 seconds
5. THE CatalAIst System SHALL display the transcribed text to the User for confirmation before processing

### Requirement 17

**User Story:** As a transformation lead, I want to hear system responses spoken aloud, so that I can have a conversational experience

#### Acceptance Criteria

1. THE CatalAIst System SHALL provide audio playback for clarifying questions
2. THE CatalAIst System SHALL provide audio playback for classification results
3. THE CatalAIst System SHALL support OpenAI TTS as the Text-to-Speech service (Phase 1)
4. THE CatalAIst System SHALL use a modular voice provider architecture to support future TTS services (Phase 2)
5. WHEN a User enables voice mode, THE CatalAIst System SHALL automatically play audio responses
6. THE CatalAIst System SHALL allow the User to toggle audio playback on or off

### Requirement 18

**User Story:** As an Administrator, I want to configure OpenAI voice services, so that users can use speech-to-text and text-to-speech features

#### Acceptance Criteria

1. THE CatalAIst System SHALL use the same OpenAI API key for LLM, STT, and TTS services
2. THE CatalAIst System SHALL allow an Administrator to select the Whisper model for Speech-to-Text
3. THE CatalAIst System SHALL allow an Administrator to select the TTS model and voice for Text-to-Speech
4. THE CatalAIst System SHALL validate the OpenAI API key supports voice services before enabling them

### Requirement 19

**User Story:** As a system, I want to generate an initial decision matrix using AI, so that the system has intelligent baseline rules without manual configuration

#### Acceptance Criteria

1. WHEN the CatalAIst System is first deployed, THE CatalAIst System SHALL use the LLM to generate an initial Decision Matrix
2. THE CatalAIst System SHALL generate Rules based on the six transformation categories and their logical progression
3. THE CatalAIst System SHALL generate default Attributes (frequency, business value, complexity, risk, user count, data sensitivity)
4. THE CatalAIst System SHALL generate default Weights for each Attribute based on transformation best practices
5. THE CatalAIst System SHALL store the AI-generated Decision Matrix as version 1.0
6. THE CatalAIst System SHALL present the generated Decision Matrix to an Administrator for review and approval

### Requirement 23

**User Story:** As an Administrator, I want to review and modify the AI-generated decision matrix, so that I can align it with organizational policies

#### Acceptance Criteria

1. THE CatalAIst System SHALL allow an Administrator to view the AI-generated Decision Matrix
2. THE CatalAIst System SHALL allow an Administrator to edit Rules, Attributes, and Weights
3. WHEN an Administrator modifies the Decision Matrix, THE CatalAIst System SHALL create a new version with a timestamp
4. THE CatalAIst System SHALL allow an Administrator to add custom Attributes beyond the defaults
5. THE CatalAIst System SHALL allow an Administrator to activate or deactivate specific Rules
6. THE CatalAIst System SHALL store all Decision Matrix versions for audit purposes

### Requirement 20

**User Story:** As a transformation lead, I want the system to apply decision rules to classifications, so that business logic overrides or adjusts LLM suggestions when appropriate

#### Acceptance Criteria

1. WHEN the Classification Engine produces a result, THE CatalAIst System SHALL evaluate all active Rules in the Decision Matrix
2. WHEN a Rule condition is met, THE CatalAIst System SHALL apply the Rule to override or adjust the classification
3. THE CatalAIst System SHALL calculate a weighted score for each Transformation Category based on Attributes and Weights
4. WHEN a Rule overrides the LLM classification, THE CatalAIst System SHALL include both the original and final classification in the result
5. THE CatalAIst System SHALL provide rationale explaining which Rules were applied and why

### Requirement 21

**User Story:** As a governance officer, I want to see which decision matrix version was used for each classification, so that I can audit the decision-making process

#### Acceptance Criteria

1. THE CatalAIst System SHALL log the Decision Matrix version identifier with each classification in the Audit Log
2. THE CatalAIst System SHALL log all Rules that were evaluated for each classification
3. THE CatalAIst System SHALL log which Rules were triggered and their impact on the final classification
4. THE CatalAIst System SHALL log the weighted scores for each Transformation Category
5. WHEN a User views a historical classification, THE CatalAIst System SHALL display the Decision Matrix that was active at that time

### Requirement 22

**User Story:** As an Administrator, I want to define common business attributes for initiatives, so that the decision matrix can evaluate them consistently

#### Acceptance Criteria

1. THE CatalAIst System SHALL support the following Attributes: frequency, business value, complexity, risk, user count, data sensitivity
2. THE CatalAIst System SHALL allow an Administrator to add custom Attributes
3. WHEN the Classification Engine asks clarifying questions, THE CatalAIst System SHALL include questions to determine Attribute values
4. THE CatalAIst System SHALL extract Attribute values from User responses using the LLM
5. THE CatalAIst System SHALL allow Users to manually adjust Attribute values before final classification

### Requirement 24

**User Story:** As a system, I want to analyze classification feedback and suggest decision matrix improvements, so that the rules evolve based on real-world usage

#### Acceptance Criteria

1. WHEN the Agreement Rate falls below 80 percent for a Transformation Category, THE CatalAIst System SHALL analyze misclassifications
2. THE CatalAIst System SHALL use the LLM to identify patterns in User corrections
3. THE CatalAIst System SHALL generate suggested Rule modifications or new Rules based on the analysis
4. THE CatalAIst System SHALL present suggested improvements to an Administrator for review
5. THE CatalAIst System SHALL include rationale explaining why each Rule change is suggested
6. WHEN an Administrator approves suggested changes, THE CatalAIst System SHALL update the Decision Matrix and create a new version

### Requirement 25

**User Story:** As an Administrator, I want to manually trigger AI analysis of the decision matrix, so that I can proactively improve classification accuracy

#### Acceptance Criteria

1. THE CatalAIst System SHALL provide an interface for an Administrator to request Decision Matrix analysis
2. WHEN an Administrator requests analysis, THE CatalAIst System SHALL analyze recent classifications and User feedback
3. THE CatalAIst System SHALL use the LLM to evaluate current Rule effectiveness
4. THE CatalAIst System SHALL generate a report with suggested improvements and their expected impact
5. THE CatalAIst System SHALL allow an Administrator to accept, reject, or modify each suggestion
6. THE CatalAIst System SHALL log all AI-suggested changes and Administrator decisions in the Audit Log
