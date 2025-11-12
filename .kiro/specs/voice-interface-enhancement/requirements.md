# Requirements Document - Voice Interface Enhancement

## Introduction

This specification defines the enhancement of the CatalAIst voice interface to provide a natural, conversational experience for process classification. The system will support two modes: a streaming conversational mode (like a phone call) and a non-streaming mode with manual controls. Voice capabilities will be automatically enabled based on LLM provider support (OpenAI supports voice, AWS Bedrock does not in this release).

## Glossary

- **Voice Interface**: The audio input/output system that allows users to speak and hear responses
- **Streaming Mode**: Auto-play mode where questions are automatically spoken and responses flow conversationally
- **Non-Streaming Mode**: Manual mode where users control playback and recording with buttons
- **STT (Speech-to-Text)**: Converting spoken audio to text using OpenAI Whisper
- **TTS (Text-to-Speech)**: Converting text to spoken audio using OpenAI TTS
- **Transcription**: The text output from STT conversion
- **Voice Settings**: Configuration options for voice type and streaming mode
- **Conversational Flow**: Continuous back-and-forth dialogue without manual intervention
- **LLM Provider**: The AI service provider (OpenAI or AWS Bedrock)
- **Classifier Page**: The main interface where users describe processes for classification
- **Clarification Phase**: The interview stage where the system asks follow-up questions

## Requirements

### Requirement 1: Voice Capability Detection

**User Story:** As a user, I want the voice interface to be automatically available when my LLM provider supports it, so that I don't have to manually configure voice capabilities.

#### Acceptance Criteria

1. WHEN the user selects OpenAI as the LLM provider, THE System SHALL automatically enable voice capabilities
2. WHEN the user selects AWS Bedrock as the LLM provider, THE System SHALL hide all voice interface options
3. WHEN voice capabilities are enabled, THE System SHALL display the voice button on the Classifier page
4. WHEN voice capabilities are disabled, THE System SHALL hide the voice button on the Classifier page
5. WHEN the user has not configured an LLM provider, THE System SHALL hide the voice button

### Requirement 2: Voice Configuration Settings

**User Story:** As a user, I want to configure my voice preferences including voice type and streaming mode, so that I can customize my interaction experience.

#### Acceptance Criteria

1. WHEN the user is on the LLM Configuration page with OpenAI selected, THE System SHALL display a Voice Settings section
2. WHEN the user is on the LLM Configuration page with AWS Bedrock selected, THE System SHALL hide the Voice Settings section
3. WHERE Voice Settings are displayed, THE System SHALL provide a voice selection dropdown with options: alloy, echo, fable, onyx, nova, shimmer
4. WHERE Voice Settings are displayed, THE System SHALL provide an "Auto-play questions (Streaming Mode)" toggle
5. WHEN the user saves the configuration, THE System SHALL persist voice settings with the LLM configuration
6. THE System SHALL default to voice "alloy" and streaming mode OFF

### Requirement 3: Streaming Mode - Conversational Flow

**User Story:** As a user with streaming mode enabled, I want a natural conversational experience where questions are automatically spoken and I can respond immediately, so that the interaction feels like a phone call.

#### Acceptance Criteria

1. WHEN streaming mode is enabled AND the user clicks the voice button on the Classifier page, THE System SHALL immediately start recording the user's process description
2. WHEN streaming mode is enabled AND the user is recording, THE System SHALL display a visual indicator showing recording is active
3. WHEN streaming mode is enabled AND the user stops speaking for 2 seconds, THE System SHALL automatically stop recording and transcribe the audio
4. WHEN streaming mode is enabled AND transcription completes, THE System SHALL automatically submit the transcription without requiring confirmation
5. WHEN streaming mode is enabled AND the system has a clarification question, THE System SHALL automatically play the question aloud
6. WHEN streaming mode is enabled AND a question finishes playing, THE System SHALL automatically start recording the user's response
7. WHEN streaming mode is enabled AND the user provides a response, THE System SHALL automatically transcribe and submit it
8. WHEN streaming mode is enabled AND there are more questions, THE System SHALL automatically play the next question
9. WHEN streaming mode is enabled, THE System SHALL display real-time transcription of what is being sent
10. WHEN streaming mode is enabled, THE System SHALL provide pause, resume, and stop controls for question playback

### Requirement 4: Non-Streaming Mode - Manual Control Flow

**User Story:** As a user with streaming mode disabled, I want full control over when questions are played and when I record responses, so that I can take my time and review transcriptions before sending.

#### Acceptance Criteria

1. WHEN streaming mode is disabled AND the user clicks the voice button on the Classifier page, THE System SHALL open the voice recorder modal
2. WHEN streaming mode is disabled AND the voice recorder opens, THE System SHALL display a record button
3. WHEN streaming mode is disabled AND the user clicks record, THE System SHALL start recording audio
4. WHEN streaming mode is disabled AND the user clicks stop recording, THE System SHALL stop recording and transcribe the audio
5. WHEN streaming mode is disabled AND transcription completes, THE System SHALL display the transcript in an editable text field
6. WHEN streaming mode is disabled AND the transcript is displayed, THE System SHALL provide "Use This Text" and "Record Again" buttons
7. WHEN streaming mode is disabled AND the user clicks "Use This Text", THE System SHALL submit the transcription
8. WHEN streaming mode is disabled AND the user edits the transcript, THE System SHALL allow text modifications before submission
9. WHEN streaming mode is disabled AND the system has a clarification question, THE System SHALL display the question text with a play button
10. WHEN streaming mode is disabled AND the user clicks the play button, THE System SHALL play the question aloud
11. WHEN streaming mode is disabled AND a question is playing, THE System SHALL provide pause, resume, repeat, and stop controls
12. WHEN streaming mode is disabled AND the user clicks repeat, THE System SHALL replay the current question from the beginning

### Requirement 5: Audio Playback Controls

**User Story:** As a user, I want to control audio playback with pause, resume, repeat, and stop functions, so that I can manage the conversation at my own pace.

#### Acceptance Criteria

1. WHEN a question is being played aloud, THE System SHALL display a pause button
2. WHEN the user clicks pause during playback, THE System SHALL pause the audio at the current position
3. WHEN audio is paused, THE System SHALL display a resume button
4. WHEN the user clicks resume, THE System SHALL continue playback from the paused position
5. WHEN a question is being played or is paused, THE System SHALL display a stop button
6. WHEN the user clicks stop, THE System SHALL stop playback and reset to the beginning
7. WHERE non-streaming mode is active, THE System SHALL display a repeat button
8. WHEN the user clicks repeat, THE System SHALL replay the current question from the beginning
9. THE System SHALL provide visual feedback showing playback status (playing, paused, stopped)

### Requirement 6: Visual Transcription Display

**User Story:** As a user, I want to see a visual transcript of what is being spoken and sent, so that I can verify the accuracy of voice recognition.

#### Acceptance Criteria

1. WHEN audio is being transcribed, THE System SHALL display a loading indicator with text "Transcribing audio..."
2. WHEN transcription completes, THE System SHALL display the transcribed text
3. WHERE streaming mode is enabled, THE System SHALL display transcriptions in a read-only format
4. WHERE non-streaming mode is enabled, THE System SHALL display transcriptions in an editable text field
5. WHEN the user is in the clarification phase, THE System SHALL display both the question text and the user's response transcript
6. THE System SHALL display character count for transcribed text
7. THE System SHALL validate that transcriptions meet minimum length requirements (10 characters)

### Requirement 7: Voice Button Visibility

**User Story:** As a user, I want the voice button to only appear when voice is properly configured and supported, so that I'm not confused by non-functional features.

#### Acceptance Criteria

1. WHEN the user has configured OpenAI as their LLM provider, THE System SHALL display the voice button on the Classifier page
2. WHEN the user has configured AWS Bedrock as their LLM provider, THE System SHALL hide the voice button on the Classifier page
3. WHEN the user has not completed LLM configuration, THE System SHALL hide the voice button
4. WHEN the user is in the clarification phase with voice enabled, THE System SHALL display voice recording options
5. WHEN the user is in the result or feedback phase, THE System SHALL hide voice recording options

### Requirement 8: Error Handling and Fallbacks

**User Story:** As a user, I want clear error messages and fallback options when voice features fail, so that I can continue using the system.

#### Acceptance Criteria

1. WHEN microphone access is denied, THE System SHALL display an error message "Microphone access denied. Please allow microphone access to use voice input."
2. WHEN transcription fails, THE System SHALL display an error message and provide a "Try Again" option
3. WHEN TTS playback fails, THE System SHALL display the question text and allow the user to continue with text input
4. WHEN the user is in streaming mode AND an error occurs, THE System SHALL automatically fall back to non-streaming mode
5. WHEN voice features are unavailable, THE System SHALL always provide text input as an alternative
6. WHEN recording exceeds 5 minutes, THE System SHALL automatically stop recording and process the audio
7. IF transcription produces text shorter than 10 characters, THE System SHALL prompt the user to record again

### Requirement 9: Recording Time Limits and Indicators

**User Story:** As a user, I want to see how long I've been recording and know the time limits, so that I can manage my responses appropriately.

#### Acceptance Criteria

1. WHEN the user is recording, THE System SHALL display a timer showing elapsed recording time in MM:SS format
2. WHEN recording time reaches 4 minutes 30 seconds, THE System SHALL display a warning "30 seconds remaining"
3. WHEN recording time reaches 5 minutes, THE System SHALL automatically stop recording
4. WHERE streaming mode is enabled, THE System SHALL display a visual recording indicator (pulsing red dot)
5. WHERE non-streaming mode is enabled, THE System SHALL display recording time and a stop button
6. THE System SHALL support audio formats: WebM, WAV, MP3, M4A

### Requirement 10: Session State Management

**User Story:** As a user, I want my voice settings to persist throughout my session, so that I don't have to reconfigure them for each classification.

#### Acceptance Criteria

1. WHEN the user saves voice configuration, THE System SHALL store settings in the session
2. WHEN the user starts a new classification, THE System SHALL retain voice settings from the previous classification
3. WHEN the user logs out, THE System SHALL clear voice settings from the session
4. WHEN the user changes LLM provider, THE System SHALL update voice availability accordingly
5. WHEN the user returns to the configuration page, THE System SHALL display current voice settings

### Requirement 11: Accessibility and User Experience

**User Story:** As a user, I want the voice interface to be accessible and provide clear feedback, so that I can use it effectively regardless of my technical expertise.

#### Acceptance Criteria

1. THE System SHALL provide ARIA labels for all voice control buttons
2. THE System SHALL support keyboard navigation for all voice controls
3. THE System SHALL provide screen reader announcements for recording state changes
4. THE System SHALL display clear visual indicators for recording, playing, paused, and stopped states
5. THE System SHALL use color-coded buttons (green for record, red for stop, blue for play)
6. THE System SHALL provide tooltips explaining each control button
7. THE System SHALL maintain WCAG AA color contrast standards for all voice interface elements

### Requirement 12: Integration with Existing Workflow

**User Story:** As a user, I want voice input to integrate seamlessly with the existing classification workflow, so that I can switch between voice and text input as needed.

#### Acceptance Criteria

1. WHEN the user provides voice input for the initial description, THE System SHALL process it identically to text input
2. WHEN the user provides voice answers to clarification questions, THE System SHALL process them identically to text answers
3. WHEN the user is in voice mode, THE System SHALL still display the text input option as a fallback
4. WHEN the user switches from voice to text input mid-session, THE System SHALL preserve the conversation context
5. WHEN classification completes, THE System SHALL store voice interaction metadata in the audit log
6. THE System SHALL track whether each input was provided via voice or text for analytics purposes
