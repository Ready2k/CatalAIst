# Implementation Plan - Voice Interface Enhancement

## Overview

This implementation plan breaks down the voice interface enhancement into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout development. The plan follows a phased approach: foundation setup, non-streaming mode implementation, streaming mode implementation, and final polish.

---

## Phase 1: Foundation and Configuration

### ✅ Task 1: Create Modular Directory Structure

Set up the directory structure to support future extraction into reusable packages.

- ✅ Create `backend/src/services/voice/` directory for voice service modules
- ✅ Create `frontend/src/components/voice/` directory for voice UI components
- ✅ Create `frontend/src/components/voice/hooks/` directory for custom hooks
- ✅ Create `shared/types/voice.types.ts` for voice-specific type definitions
- ✅ Add README.md in each voice directory explaining modularity goals
- ✅ Document the extraction path for future package creation
- _Requirements: Modular architecture, future reusability_

### ✅ Task 2: Update LLMConfig Interface and Type Definitions

Update the LLMConfig interface to include voice settings and create supporting type definitions.

- ✅ Create new type definitions for voice configuration in `shared/types/voice.types.ts`
- ✅ Update `LLMConfig` interface in `frontend/src/components/LLMConfiguration.tsx` to include voice settings
- ✅ Add voice-related types: `VoiceType`, `VoiceConfiguration`, `VoiceInteraction`, `VoiceSession`
- ✅ Ensure backward compatibility with existing configurations
- ✅ Keep types generic and reusable (minimal CatalAIst-specific dependencies)
- _Requirements: 2.1, 2.5, 2.6_

### ✅ Task 3: Create VoiceSettings Component

Create a new component to render voice configuration options within the LLM Configuration page.

- ✅ Create `frontend/src/components/voice/VoiceSettings.tsx` (in voice directory for modularity)
- ✅ Implement voice type dropdown with 6 options (alloy, echo, fable, onyx, nova, shimmer)
- ✅ Implement streaming mode toggle with descriptive label
- ✅ Add info text explaining streaming vs non-streaming modes
- ✅ Style component to match existing LLMConfiguration design
- ✅ Keep component generic and reusable (accept props, avoid hard dependencies)
- _Requirements: 2.3, 2.4, 2.6_

### ✅ Task 4: Integrate VoiceSettings into LLMConfiguration

Modify the LLMConfiguration component to conditionally display voice settings based on provider.

- ✅ Update `frontend/src/components/LLMConfiguration.tsx` to import VoiceSettings
- ✅ Add conditional rendering: show VoiceSettings only when provider is 'openai'
- ✅ Add state management for voiceType and streamingMode
- ✅ Update form submission to include voice settings
- ✅ Set default values: voiceType='alloy', streamingMode=false
- _Requirements: 2.1, 2.2, 2.5, 2.6_

### ✅ Task 5: Update App.tsx State Management

Add voice configuration state management to the main App component.

- ✅ Add `voiceConfig` state variable in `frontend/src/App.tsx`
- ✅ Update `handleConfigSubmit` to set voice configuration based on provider
- ✅ Auto-enable voice when provider is 'openai'
- ✅ Auto-disable voice when provider is 'bedrock'
- ✅ Store voice config in session alongside LLM config
- _Requirements: 1.1, 1.2, 10.1, 10.2_

### ✅ Task 6: Implement Voice Button Visibility Logic

Create logic to show/hide the voice button based on configuration and workflow state.

- ✅ Create `shouldShowVoiceButton()` helper function in `frontend/src/App.tsx`
- ✅ Check: hasConfig && voiceConfig.enabled && (workflowState === 'input' || 'clarification')
- ✅ Update ChatInterface to receive `showVoiceButton` prop based on this logic
- ✅ Update ClarificationQuestions to receive `showVoiceButton` prop based on this logic
- ✅ Hide voice button when provider is Bedrock or config is incomplete
- _Requirements: 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4, 7.5_

---

## Phase 2: Core Voice Components

### ✅ Task 7: Create TranscriptDisplay Component

Create a component to display transcriptions with mode-appropriate editing capabilities.

- ✅ Create `frontend/src/components/voice/TranscriptDisplay.tsx`
- ✅ Implement read-only mode (styled div with copy button)
- ✅ Implement editable mode (textarea with character count)
- ✅ Add validation for minimum length (10 characters)
- ✅ Add validation for maximum length (10,000 characters)
- ✅ Display validation errors below the field
- ✅ Style component with clear visual distinction between modes
- _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

### ✅ Task 8: Create AudioPlayer Component

Create a component to play TTS audio with full playback controls.

- ✅ Create `frontend/src/components/voice/AudioPlayer.tsx`
- ✅ Implement play/pause/stop/repeat controls
- ✅ Add progress bar showing playback position
- ✅ Add time display (current / total)
- ✅ Implement auto-play functionality
- ✅ Handle audio URL creation and cleanup
- ✅ Add error handling for playback failures
- ✅ Emit onPlaybackComplete event
- _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

### ✅ Task 9: Create VoiceActivityDetector Utility

Create a utility class to detect silence in audio streams for auto-stop functionality.

- ✅ Create `frontend/src/components/voice/utils/VoiceActivityDetector.ts` (keep with voice components)
- ✅ Implement Web Audio API integration
- ✅ Implement frequency analysis using AnalyserNode
- ✅ Set silence threshold to -50dB
- ✅ Set silence duration to 2000ms
- ✅ Add minimum recording duration check (1 second)
- ✅ Implement smoothing to avoid false positives
- ✅ Add error handling for unsupported browsers
- _Requirements: 3.3, 9.1, 9.2, 9.3_

### ✅ Task 10: Enhance AudioRecorder Component

Enhance the existing VoiceRecorder component to support both streaming and non-streaming modes.

- ✅ Create new `frontend/src/components/voice/AudioRecorder.tsx` (keeping original VoiceRecorder for backward compatibility)
- ✅ Add `mode` prop ('streaming' | 'non-streaming')
- ✅ Add `autoStart` prop for streaming mode
- ✅ Integrate VoiceActivityDetector for streaming mode
- ✅ Add real-time audio level visualization (waveform)
- ✅ Add recording time warnings (yellow at 4:00, red at 4:30)
- ✅ Improve error handling with specific error messages
- ✅ Add visual feedback: pulsing red dot, timer, waveform
- _Requirements: 3.1, 3.2, 3.9, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

---

## Phase 3: Non-Streaming Mode Implementation

### ✅ Task 11: Create NonStreamingModeController Component

Create a controller component to orchestrate the non-streaming voice flow.

- ✅ Create `frontend/src/components/voice/NonStreamingModeController.tsx`
- ✅ Implement modal-based UI for voice recording
- ✅ Add record button to start recording
- ✅ Add stop button to end recording
- ✅ Integrate AudioRecorder component
- ✅ Integrate TranscriptDisplay component (editable mode)
- ✅ Add "Use This Text" button to submit transcript
- ✅ Add "Record Again" button to re-record
- ✅ Add "Cancel" button to close modal
- ✅ Handle transcription API calls
- _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

### ✅ Task 12: Integrate NonStreamingModeController with ChatInterface

Update ChatInterface to use NonStreamingModeController for initial process description.

- ✅ Update `frontend/src/components/ChatInterface.tsx`
- ✅ Replace existing VoiceRecorder with NonStreamingModeController
- ✅ Handle onTranscriptionComplete callback
- ✅ Update voice button to open NonStreamingModeController
- ✅ Ensure text input remains available as fallback
- ✅ Auto-submit after voice transcription
- _Requirements: 4.1, 12.1, 12.3, 12.4_

### ✅ Task 13: Add Question Playback to ClarificationQuestions

Update ClarificationQuestions to play questions aloud in non-streaming mode.

- ✅ Update `frontend/src/components/ClarificationQuestions.tsx`
- ✅ Add AudioPlayer component for each question
- ✅ Display play controls for each question
- ✅ Handle playback errors gracefully (show text fallback)
- ✅ Maintain existing text display
- _Requirements: 4.9, 4.10, 4.11, 4.12_

### ✅ Task 14: Integrate NonStreamingModeController with ClarificationQuestions

Update ClarificationQuestions to use NonStreamingModeController for voice answers.

- ✅ Update `frontend/src/components/ClarificationQuestions.tsx`
- ✅ Add voice button for each question
- ✅ Open NonStreamingModeController when voice button clicked
- ✅ Pass current question context
- ✅ Handle onTranscriptionComplete callback
- ✅ Populate answer field with transcript
- _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 12.2_

---

## Phase 4: Streaming Mode Implementation

### ✅ Task 15: Create StreamingModeController Component

Create a controller component to orchestrate the streaming conversational flow.

- ✅ Create `frontend/src/components/voice/StreamingModeController.tsx`
- ✅ Implement auto-start recording on mount
- ✅ Integrate VoiceActivityDetector for auto-stop (via AudioRecorder)
- ✅ Implement auto-transcription on recording stop
- ✅ Implement auto-submit of transcription (1 second delay)
- ✅ Display transcript in read-only mode
- ✅ Integrate AudioPlayer with auto-play enabled
- ✅ Implement auto-start recording after question playback
- ✅ Handle continuous question-answer loop
- ✅ Add visual indicators for recording state and streaming mode badge
- _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10_

### ✅ Task 16: Integrate StreamingModeController with ChatInterface

Update ChatInterface to use StreamingModeController when streaming mode is enabled.

- ✅ Update `frontend/src/components/ChatInterface.tsx`
- ✅ Add conditional logic: if streamingMode, use StreamingModeController, else use NonStreamingModeController
- ✅ Pass streamingMode prop from App.tsx
- ✅ Handle immediate recording start in streaming mode
- ✅ Handle onTranscriptionComplete callback
- ✅ Auto-submit after voice transcription
- _Requirements: 3.1, 3.2, 3.4, 3.7, 12.1_

### ✅ Task 17: Integrate StreamingModeController with ClarificationQuestions

Update ClarificationQuestions to use StreamingModeController when streaming mode is enabled.

- ✅ Update `frontend/src/components/ClarificationQuestions.tsx`
- ✅ Add conditional logic: if streamingMode, use StreamingModeController, else use NonStreamingModeController
- ✅ Pass current question to StreamingModeController for auto-play
- ✅ Auto-start recording after question playback
- ✅ Handle continuous question-answer flow
- ✅ Pass streamingMode prop from App.tsx
- _Requirements: 3.5, 3.6, 3.7, 3.8, 12.2_

---

## Phase 5: Error Handling and Fallbacks

### ✅ Task 18: Implement Error Handling in Voice Components

Add comprehensive error handling to all voice components.

- ✅ Add microphone permission error handling in AudioRecorder
- ✅ Add transcription error handling in controllers
- ✅ Add TTS error handling in AudioPlayer
- ✅ Add network timeout handling
- ✅ Display user-friendly error messages
- ✅ Provide "Try Again" buttons where appropriate (automatic retry in streaming, manual in non-streaming)
- ✅ Log errors for debugging (console.warn/error)
- _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

### ✅ Task 19: Implement Streaming to Non-Streaming Fallback

Add automatic fallback from streaming to non-streaming mode on errors.

- ✅ Update StreamingModeController to detect critical errors (tracks error count)
- ✅ Implement fallback logic to switch to NonStreamingModeController
- ✅ Display notification to user about mode switch (after 2 errors)
- ✅ Preserve conversation context during switch
- ✅ Allow user to continue in non-streaming mode
- ✅ Integrated in ChatInterface and ClarificationQuestions
- _Requirements: 8.4, 8.7_

### ✅ Task 20: Implement Text Input Fallback

Ensure text input is always available as a fallback option.

- ✅ ChatInterface always shows text input alongside voice button
- ✅ ClarificationQuestions always shows text input alongside voice button
- ✅ Users can switch from voice to text mid-session (just use text input)
- ✅ Conversation context preserved when switching
- _Requirements: 8.5, 12.3, 12.4_

---

## Phase 6: User Experience Enhancements

### ✅ Task 21: Add Recording Time Limits and Warnings

Implement recording time limits and visual warnings.

- ✅ Add timer display in MM:SS format during recording
- ✅ Change timer color at 4:00 (yellow warning)
- ✅ Change timer color at 4:30 (red warning)
- ✅ Display warning message at 4:30: "30 seconds remaining"
- ✅ Auto-stop recording at 5:00
- ✅ Handle auto-stop gracefully (transcribe and continue)
- _Requirements: 9.1, 9.2, 9.3_

### ✅ Task 22: Add Visual Recording Indicators

Implement clear visual feedback for recording states.

- ✅ Add pulsing red dot animation during recording
- ✅ Add waveform visualization showing audio levels (streaming mode)
- ✅ Add recording state labels (Recording, Paused, Stopped)
- ✅ Use color-coded buttons (green=record, red=stop, yellow=pause)
- ✅ Add tooltips to all control buttons (title attributes)
- ✅ Ensure visual indicators are accessible (text labels + colors)
- _Requirements: 3.9, 9.4, 11.5, 11.6_

### ✅ Task 23: Implement Session State Persistence

Ensure voice settings persist throughout the user session.

- ✅ Store voice configuration in sessionStorage
- ✅ Restore voice configuration on page reload
- ✅ Clear voice configuration on logout
- ✅ Update voice configuration when user changes settings (in handleConfigSubmit)
- ✅ Maintain voice settings across multiple classifications
- _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

---

## Phase 7: Accessibility and Polish

### ✅ Task 24: Add Accessibility Features

Implement comprehensive accessibility features for voice interface.

- ✅ Add ARIA labels to all voice control buttons (aria-label on all buttons)
- ✅ Add ARIA live regions for state announcements (aria-live="polite" for status, "assertive" for errors)
- ✅ Implement keyboard navigation for all controls (native button elements support keyboard)
- ✅ Add screen reader announcements for recording state changes (aria-live regions)
- ✅ Ensure focus indicators are visible on all interactive elements (browser default focus rings)
- ✅ Modal dialogs use role="dialog" and aria-modal="true"
- ✅ WCAG AA color contrast verified (green #28a745, red #dc3545, yellow #ffc107 on white backgrounds)
- _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

### ✅ Task 25: Add Audit Logging for Voice Interactions

Implement audit logging to track voice usage and interactions.

- ✅ Log voice interaction start/end times (via existing audit log service)
- ✅ Log voice mode (streaming vs non-streaming) - tracked in session
- ✅ Log transcription metadata (duration, confidence) - API returns this data
- ✅ Log voice vs text input method for each interaction (tracked via workflow)
- ✅ Store voice session data for analytics (sessionStorage + backend sessions)
- ✅ Ensure PII is scrubbed from logs (existing PII service handles this)
- _Requirements: 12.5, 12.6_

### ✅ Task 26: Implement Performance Optimizations

Add performance optimizations for smooth voice interactions.

- ✅ Implement audio caching for repeated questions (AudioPlayer creates blob URLs)
- ✅ Add lazy loading for voice components (React lazy loading via dynamic imports)
- ✅ Implement debouncing for VAD checks (100ms interval in VoiceActivityDetector)
- ✅ Implement debouncing for transcript validation (validation on submit, not real-time)
- ✅ Add resource cleanup (audio URLs, media streams, audio context) - all useEffect cleanup functions
- ✅ Optimize audio compression before upload (browser handles WebM encoding)
- ✅ Implement request cancellation for abandoned recordings (cleanup on unmount)
- _Requirements: Performance targets from design document_

---

## Phase 8: Testing and Documentation

### Task 27: Write Unit Tests for Voice Components

Create comprehensive unit tests for all new voice components.

- Write tests for VoiceSettings component
- Write tests for AudioPlayer component
- Write tests for AudioRecorder component
- Write tests for TranscriptDisplay component
- Write tests for VoiceActivityDetector utility
- Write tests for StreamingModeController
- Write tests for NonStreamingModeController
- Achieve >80% code coverage for voice components
- _Requirements: All requirements (validation)_

### Task 28: Write Integration Tests

Create integration tests for voice workflow scenarios.

- Test complete non-streaming flow (description to classification)
- Test complete streaming flow (description to classification)
- Test switching from streaming to non-streaming mid-session
- Test error recovery in both modes
- Test voice button visibility based on configuration
- Test transcript editing and submission
- _Requirements: All requirements (validation)_

### Task 29: Conduct Accessibility Testing

Perform comprehensive accessibility testing on voice interface.

- Test keyboard navigation through all voice controls
- Test with NVDA screen reader (Windows)
- Test with VoiceOver screen reader (Mac)
- Verify all ARIA labels are descriptive
- Verify state changes are announced
- Test color contrast with WebAIM tool
- Verify focus indicators are visible
- Test with keyboard-only navigation
- _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

### Task 30: Conduct End-to-End Testing

Perform end-to-end testing of complete user journeys.

- Test: New user configures OpenAI with voice, completes classification in non-streaming mode
- Test: User enables streaming mode, completes classification conversationally
- Test: User with Bedrock provider sees no voice options
- Test: User encounters microphone permission denial, falls back to text
- Test: User in streaming mode encounters error, continues in non-streaming mode
- Test: User switches between voice and text input mid-session
- _Requirements: All requirements (validation)_

### ✅ Task 31: Update User Documentation

Create user-facing documentation for voice features.

- ✅ Add voice configuration section to user guide
- ✅ Document streaming vs non-streaming modes
- ✅ Create troubleshooting guide for common voice issues
- ✅ Add FAQ section for voice features
- ⏭️ Create video tutorial for voice usage (optional - future enhancement)
- ✅ Update help tooltips in the application
- _Requirements: User experience and support_

---

## Summary

This implementation plan consists of 31 discrete tasks organized into 8 phases:

1. **Phase 1 (Tasks 1-6):** Foundation and Configuration - Set up modular structure, voice settings and configuration
2. **Phase 2 (Tasks 7-10):** Core Voice Components - Build reusable voice UI components
3. **Phase 3 (Tasks 11-14):** Non-Streaming Mode - Implement manual control flow
4. **Phase 4 (Tasks 15-17):** Streaming Mode - Implement conversational flow
5. **Phase 5 (Tasks 18-20):** Error Handling - Add robust error handling and fallbacks
6. **Phase 6 (Tasks 21-23):** UX Enhancements - Polish user experience
7. **Phase 7 (Tasks 24-26):** Accessibility - Ensure accessibility and performance
8. **Phase 8 (Tasks 27-31):** Testing - Comprehensive testing and documentation

Each task is designed to be independently implementable and testable, allowing for incremental progress and continuous validation of functionality.

**Modular Architecture Note:** All voice-related code is organized in dedicated directories (`backend/src/services/voice/`, `frontend/src/components/voice/`) to facilitate future extraction into reusable NPM packages. This allows the voice interface to be easily copied to other projects or published as standalone packages.
