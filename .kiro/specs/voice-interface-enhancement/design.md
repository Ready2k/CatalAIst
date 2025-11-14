# Design Document - Voice Interface Enhancement

## Overview

This design document outlines the technical architecture and implementation approach for enhancing the CatalAIst voice interface. The solution provides two distinct modes of operation: a streaming conversational mode for natural phone-like interactions, and a non-streaming mode with full manual control and transcript editing capabilities.

The design leverages existing OpenAI Whisper (STT) and TTS APIs, extends the current LLMConfiguration component, and introduces new voice control components that integrate seamlessly with the existing classification workflow.

### Modular Architecture Philosophy

This implementation is designed with **future reusability** in mind. The voice interface components are structured to be easily extracted into standalone packages for use in other projects. The architecture follows these principles:

1. **Clean Separation**: Voice logic is isolated in dedicated directories (`backend/src/services/voice/`, `frontend/src/components/voice/`)
2. **Provider Abstraction**: Voice providers (OpenAI, AWS Polly/Transcribe) use a common interface for easy swapping
3. **Reusable Components**: React components are self-contained with minimal CatalAIst-specific dependencies
4. **Environment Agnostic**: Works in both development mode (`npm run dev`) and Docker containers

**Future Extraction Path:**
- Backend voice services → `@catalai/voice-service-api` NPM package
- Frontend voice components → `@catalai/voice-components` NPM package
- Other projects can then `npm install` these packages and integrate voice capabilities with minimal effort

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ LLMConfiguration │  │  VoiceSettings   │                │
│  │   Component      │──│    Component     │                │
│  └──────────────────┘  └──────────────────┘                │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Voice Interface Manager                     │  │
│  │  ┌────────────────┐  ┌──────────────────────────┐   │  │
│  │  │ Streaming Mode │  │  Non-Streaming Mode      │   │  │
│  │  │   Controller   │  │     Controller           │   │  │
│  │  └────────────────┘  └──────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Voice UI Components                         │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │  │
│  │  │ AudioPlayer  │  │ AudioRecorder│  │Transcript │  │  │
│  │  │  Component   │  │  Component   │  │ Display   │  │  │
│  │  └──────────────┘  └──────────────┘  └───────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Existing Components (Enhanced)                │  │
│  │  ┌──────────────┐  ┌──────────────────────────────┐  │  │
│  │  │ChatInterface │  │ ClarificationQuestions       │  │  │
│  │  └──────────────┘  └──────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ API Calls
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Node.js/Express)                 │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Voice Routes (Existing)                  │  │
│  │  • POST /api/voice/transcribe                        │  │
│  │  • POST /api/voice/synthesize                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              LLM Service (Enhanced)                   │  │
│  │  • transcribe(audioFile, config)                     │  │
│  │  • synthesize(text, voice, config)                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              OpenAI Service (Existing)                │  │
│  │  • Whisper API Integration                           │  │
│  │  • TTS API Integration                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Modular Directory Structure

To support future extraction, voice-related code is organized in dedicated directories:

```
backend/src/
├── services/
│   ├── voice/                          # Modular voice services (future package)
│   │   ├── voice.service.ts            # Main orchestrator
│   │   ├── voice.interface.ts          # Provider contract
│   │   └── providers/
│   │       ├── openai-voice.provider.ts
│   │       └── aws-voice.provider.ts   # Future: Polly/Transcribe
│   ├── llm.service.ts                  # Existing (uses voice service)
│   └── openai.service.ts               # Existing (implements voice provider)

frontend/src/
├── components/
│   ├── voice/                          # Reusable voice components (future package)
│   │   ├── StreamingModeController.tsx
│   │   ├── NonStreamingModeController.tsx
│   │   ├── AudioPlayer.tsx
│   │   ├── AudioRecorder.tsx
│   │   ├── TranscriptDisplay.tsx
│   │   ├── VoiceSettings.tsx
│   │   └── hooks/
│   │       ├── useVoiceRecording.ts
│   │       ├── useVoicePlayback.ts
│   │       └── useVoiceConfig.ts
│   ├── ChatInterface.tsx               # Existing (integrates voice)
│   ├── ClarificationQuestions.tsx      # Existing (integrates voice)
│   └── LLMConfiguration.tsx            # Existing (includes voice settings)

shared/
├── types/
│   └── voice.types.ts                  # Voice-specific types (future package)
```

**Benefits:**
- ✅ Easy to copy to other projects
- ✅ Clear boundaries for extraction
- ✅ Minimal coupling with CatalAIst-specific code
- ✅ Works in both npm dev mode and Docker

## Components and Interfaces

### 1. Enhanced LLMConfig Interface

**Location:** `frontend/src/components/LLMConfiguration.tsx`

**Changes:**
```typescript
export interface LLMConfig {
  provider: 'openai' | 'bedrock';
  model: string;
  // OpenAI
  apiKey?: string;
  // AWS Bedrock
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
  // Voice Settings (NEW)
  voiceEnabled?: boolean;        // Auto-set based on provider
  voiceType?: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  streamingMode?: boolean;       // Auto-play questions
}
```

**Behavior:**
- When provider is 'openai', automatically set `voiceEnabled = true`
- When provider is 'bedrock', automatically set `voiceEnabled = false`
- Display Voice Settings section only when `voiceEnabled = true`
- Default values: `voiceType = 'alloy'`, `streamingMode = false`

### 2. VoiceSettings Component (NEW)

**Location:** `frontend/src/components/VoiceSettings.tsx`

**Purpose:** Render voice configuration options within LLMConfiguration

**Props:**
```typescript
interface VoiceSettingsProps {
  voiceType: string;
  streamingMode: boolean;
  onVoiceTypeChange: (voice: string) => void;
  onStreamingModeChange: (enabled: boolean) => void;
}
```

**UI Elements:**
- Voice selection dropdown with 6 options
- Streaming mode toggle with description
- Info text explaining streaming vs non-streaming modes

### 3. VoiceInterfaceManager Component (NEW)

**Location:** `frontend/src/components/VoiceInterfaceManager.tsx`

**Purpose:** Orchestrate voice interactions based on mode and workflow state

**Props:**
```typescript
interface VoiceInterfaceManagerProps {
  mode: 'streaming' | 'non-streaming';
  workflowState: 'input' | 'clarification';
  voiceConfig: {
    voiceType: string;
    apiKey: string;
  };
  currentQuestion?: string;
  onTranscriptionComplete: (text: string) => void;
  onCancel: () => void;
}
```

**State Management:**
```typescript
interface VoiceInterfaceState {
  isRecording: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  transcription: string;
  recordingTime: number;
  playbackProgress: number;
  error: string | null;
}
```

**Key Methods:**
- `startRecording()` - Begin audio capture
- `stopRecording()` - End audio capture and trigger transcription
- `playQuestion(text: string)` - Convert text to speech and play
- `pausePlayback()` - Pause audio playback
- `resumePlayback()` - Resume audio playback
- `stopPlayback()` - Stop and reset audio playback
- `repeatQuestion()` - Replay current question from start

### 4. StreamingModeController (NEW)

**Location:** `frontend/src/components/voice/StreamingModeController.tsx`

**Purpose:** Handle conversational flow with automatic transitions

**Flow:**
```
1. User clicks voice button
2. Start recording immediately
3. Detect silence (2 seconds of no speech)
4. Auto-stop recording
5. Transcribe audio
6. Display transcript (read-only)
7. Auto-submit transcript
8. If question available:
   a. Auto-play question
   b. Wait for playback to complete
   c. Auto-start recording
   d. Repeat from step 3
9. Continue until classification complete
```

**Voice Activity Detection (VAD):**
- Use Web Audio API to analyze audio levels
- Threshold: -50dB for silence detection
- Timeout: 2 seconds of silence triggers auto-stop
- Minimum recording: 1 second before VAD activates

**Implementation:**
```typescript
class VoiceActivityDetector {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;
  private silenceThreshold: number = -50; // dB
  private silenceDuration: number = 2000; // ms
  private lastSoundTime: number = Date.now();
  
  detectSilence(): boolean {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    const db = 20 * Math.log10(average / 255);
    
    if (db > this.silenceThreshold) {
      this.lastSoundTime = Date.now();
      return false;
    }
    
    return (Date.now() - this.lastSoundTime) > this.silenceDuration;
  }
}
```

### 5. NonStreamingModeController (NEW)

**Location:** `frontend/src/components/voice/NonStreamingModeController.tsx`

**Purpose:** Handle manual control flow with user confirmation

**Flow:**
```
1. User clicks voice button
2. Show voice recorder modal
3. User clicks record button
4. Start recording
5. User clicks stop button
6. Stop recording and transcribe
7. Display editable transcript
8. User can:
   a. Edit transcript text
   b. Click "Use This Text" to submit
   c. Click "Record Again" to re-record
9. On submit, close modal and send transcript
```

**UI Components:**
- Record button (green, microphone icon)
- Stop button (red, square icon)
- Timer display (MM:SS format)
- Editable text area for transcript
- "Use This Text" button (green)
- "Record Again" button (yellow)
- "Cancel" button (gray)

### 6. AudioPlayer Component (NEW)

**Location:** `frontend/src/components/voice/AudioPlayer.tsx`

**Purpose:** Play TTS audio with full playback controls

**Props:**
```typescript
interface AudioPlayerProps {
  text: string;
  voiceType: string;
  autoPlay: boolean;
  onPlaybackComplete: () => void;
  onError: (error: Error) => void;
}
```

**Controls:**
- Play button (▶️)
- Pause button (⏸️)
- Stop button (⏹️)
- Repeat button (🔁) - non-streaming mode only
- Progress bar showing playback position
- Time display (current / total)

**State:**
```typescript
interface AudioPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  audioUrl: string | null;
}
```

### 7. AudioRecorder Component (Enhanced)

**Location:** `frontend/src/components/voice/AudioRecorder.tsx`

**Purpose:** Capture audio with visual feedback and controls

**Enhancements to existing VoiceRecorder:**
- Add streaming mode support
- Add VAD for auto-stop
- Add real-time audio level visualization
- Add recording time warnings
- Improve error handling

**Props:**
```typescript
interface AudioRecorderProps {
  mode: 'streaming' | 'non-streaming';
  autoStart?: boolean;
  onRecordingComplete: (audioBlob: Blob) => void;
  onError: (error: Error) => void;
}
```

**Visual Feedback:**
- Pulsing red dot during recording
- Audio level meter (waveform visualization)
- Timer with color coding:
  - Green: 0-4:00
  - Yellow: 4:00-4:30
  - Red: 4:30-5:00
- Warning message at 4:30

### 8. TranscriptDisplay Component (NEW)

**Location:** `frontend/src/components/voice/TranscriptDisplay.tsx`

**Purpose:** Display transcription with mode-appropriate editing

**Props:**
```typescript
interface TranscriptDisplayProps {
  text: string;
  editable: boolean;
  onTextChange?: (text: string) => void;
  showCharacterCount?: boolean;
  minLength?: number;
}
```

**Modes:**
- **Read-only (streaming):** Display text in a styled div with copy button
- **Editable (non-streaming):** Display text in textarea with character count

**Validation:**
- Minimum length: 10 characters
- Maximum length: 10,000 characters
- Show validation errors below field

## Data Models

### VoiceConfiguration

```typescript
interface VoiceConfiguration {
  enabled: boolean;
  provider: 'openai' | 'bedrock';
  voiceType: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  streamingMode: boolean;
  apiKey?: string;
}
```

### VoiceInteraction

```typescript
interface VoiceInteraction {
  sessionId: string;
  timestamp: string;
  type: 'question' | 'answer';
  text: string;
  audioUrl?: string;
  transcription?: string;
  mode: 'streaming' | 'non-streaming';
  duration: number; // seconds
}
```

### VoiceSession

```typescript
interface VoiceSession {
  sessionId: string;
  userId: string;
  startTime: string;
  endTime?: string;
  mode: 'streaming' | 'non-streaming';
  voiceType: string;
  interactions: VoiceInteraction[];
  totalDuration: number;
  errorCount: number;
}
```

## API Integration

### Existing Endpoints (No Changes Required)

**POST /api/voice/transcribe**
- Input: Audio file (multipart/form-data)
- Output: `{ transcription: string, confidence: number, duration: number }`
- Used by both streaming and non-streaming modes

**POST /api/voice/synthesize**
- Input: `{ text: string, voice: string, apiKey: string }`
- Output: Audio blob (MP3)
- Used for question playback in both modes

### Frontend API Service Updates

**Location:** `frontend/src/services/api.ts`

**New Methods:**
```typescript
class ApiService {
  // Existing methods remain unchanged
  
  // Enhanced to include voice config
  async createSession(
    apiKey: string, 
    model: string, 
    voiceConfig?: VoiceConfiguration
  ): Promise<SessionResponse> {
    // Store voice config in session
  }
  
  // New method to update voice settings mid-session
  async updateVoiceSettings(
    voiceType: string,
    streamingMode: boolean
  ): Promise<void> {
    // Update session voice configuration
  }
}
```

## State Management

### App-Level State (App.tsx)

**New State Variables:**
```typescript
const [voiceConfig, setVoiceConfig] = useState<VoiceConfiguration | null>(null);
const [showVoiceInterface, setShowVoiceInterface] = useState(false);
const [voiceMode, setVoiceMode] = useState<'streaming' | 'non-streaming'>('non-streaming');
```

**Voice Config Initialization:**
```typescript
const handleConfigSubmit = async (config: LLMConfig) => {
  // Existing logic...
  
  // Set voice configuration
  if (config.provider === 'openai') {
    setVoiceConfig({
      enabled: true,
      provider: 'openai',
      voiceType: config.voiceType || 'alloy',
      streamingMode: config.streamingMode || false,
      apiKey: config.apiKey
    });
  } else {
    setVoiceConfig({
      enabled: false,
      provider: 'bedrock',
      voiceType: 'alloy',
      streamingMode: false
    });
  }
};
```

### Voice Button Visibility Logic

```typescript
const shouldShowVoiceButton = (): boolean => {
  return hasConfig && 
         voiceConfig !== null && 
         voiceConfig.enabled && 
         (workflowState === 'input' || workflowState === 'clarification');
};
```

## User Flows

### Flow 1: Initial Configuration

```
1. User logs in
2. User navigates to Configuration tab
3. User selects OpenAI provider
4. User enters API key
5. System automatically enables voice
6. System displays Voice Settings section
7. User selects voice type (default: alloy)
8. User toggles streaming mode (default: off)
9. User clicks "Save Configuration"
10. System stores config and enables voice button
```

### Flow 2: Non-Streaming Mode - Initial Description

```
1. User on Classifier page
2. User clicks voice button (🎤 Voice)
3. System opens voice recorder modal
4. User clicks record button
5. System starts recording, shows timer and waveform
6. User speaks process description
7. User clicks stop button
8. System transcribes audio
9. System displays editable transcript
10. User reviews/edits transcript
11. User clicks "Use This Text"
12. System submits description
13. System closes modal
14. System processes description
```

### Flow 3: Non-Streaming Mode - Clarification

```
1. System has clarification question
2. System displays question text with play button
3. User clicks play button
4. System synthesizes and plays question
5. User can pause/resume/stop during playback
6. User clicks voice button to respond
7. System opens voice recorder modal
8. User records answer (steps 4-11 from Flow 2)
9. System submits answer
10. Repeat for additional questions
```

### Flow 4: Streaming Mode - Initial Description

```
1. User on Classifier page
2. User clicks voice button (🎤 Voice)
3. System immediately starts recording
4. System shows pulsing red dot and timer
5. User speaks process description
6. System detects 2 seconds of silence
7. System auto-stops recording
8. System transcribes audio
9. System displays transcript (read-only)
10. System auto-submits description
11. System processes description
```

### Flow 5: Streaming Mode - Clarification (Conversational)

```
1. System has clarification question
2. System auto-plays question aloud
3. User listens to question
4. Question finishes playing
5. System auto-starts recording
6. User speaks answer
7. System detects 2 seconds of silence
8. System auto-stops recording
9. System transcribes audio
10. System displays transcript (read-only)
11. System auto-submits answer
12. If more questions:
    a. System auto-plays next question
    b. Repeat from step 3
13. If no more questions:
    a. System displays classification result
```

### Flow 6: Error Recovery

```
Scenario: Transcription fails

Non-Streaming Mode:
1. System displays error message
2. System shows "Try Again" button
3. User clicks "Try Again"
4. System allows re-recording
5. User records again

Streaming Mode:
1. System displays error message
2. System automatically falls back to non-streaming mode
3. System shows record button
4. User continues with manual control
```

## Error Handling

### Error Types and Responses

| Error Type | User Message | Recovery Action |
|------------|-------------|-----------------|
| Microphone access denied | "Microphone access denied. Please allow microphone access to use voice input." | Show text input option |
| Transcription API failure | "Failed to transcribe audio. Please try again." | Provide "Try Again" button |
| TTS API failure | "Unable to play audio. Question displayed as text." | Show text, allow text response |
| Network timeout | "Connection timeout. Please check your internet connection." | Retry button |
| Recording too short | "Recording too short. Please speak for at least 1 second." | Auto-restart recording |
| Transcription too short | "Transcription too short (minimum 10 characters). Please record again." | Show record button |
| Streaming mode failure | "Streaming mode encountered an error. Switching to manual mode." | Fall back to non-streaming |
| Audio playback error | "Unable to play audio. Please try again or use text mode." | Show text, provide retry |

### Fallback Strategy

```
Primary: Streaming Mode (if enabled)
    ↓ (on error)
Fallback 1: Non-Streaming Mode
    ↓ (on error)
Fallback 2: Text Input Only
```

## Testing Strategy

### Unit Tests

**Components to Test:**
- VoiceSettings component rendering
- AudioPlayer playback controls
- AudioRecorder recording logic
- TranscriptDisplay editing
- VoiceActivityDetector silence detection

**Test Cases:**
```typescript
describe('VoiceSettings', () => {
  it('should render voice type dropdown with 6 options');
  it('should render streaming mode toggle');
  it('should call onVoiceTypeChange when selection changes');
  it('should call onStreamingModeChange when toggle changes');
});

describe('AudioPlayer', () => {
  it('should auto-play when autoPlay is true');
  it('should pause playback when pause button clicked');
  it('should resume playback when resume button clicked');
  it('should stop and reset when stop button clicked');
  it('should replay from start when repeat button clicked');
  it('should call onPlaybackComplete when audio ends');
});

describe('StreamingModeController', () => {
  it('should start recording immediately on mount');
  it('should detect silence after 2 seconds');
  it('should auto-stop recording on silence detection');
  it('should auto-submit transcription');
  it('should auto-play next question');
  it('should fall back to non-streaming on error');
});

describe('VoiceActivityDetector', () => {
  it('should detect silence below threshold');
  it('should reset timer on sound detection');
  it('should return true after silence duration exceeded');
});
```

### Integration Tests

**Scenarios:**
1. Complete non-streaming flow from description to classification
2. Complete streaming flow from description to classification
3. Switch from streaming to non-streaming mid-session
4. Error recovery in both modes
5. Voice button visibility based on configuration
6. Transcript editing and submission

### End-to-End Tests

**User Journeys:**
1. New user configures OpenAI with voice, completes classification in non-streaming mode
2. Existing user enables streaming mode, completes classification conversationally
3. User with Bedrock provider sees no voice options
4. User encounters microphone permission denial, falls back to text
5. User in streaming mode encounters error, continues in non-streaming mode

### Accessibility Tests

**Requirements:**
- Keyboard navigation through all voice controls
- Screen reader announcements for state changes
- ARIA labels on all buttons
- Focus indicators visible
- Color contrast meets WCAG AA
- No reliance on color alone for information

## Performance Considerations

### Optimization Strategies

1. **Audio Caching:**
   - Cache synthesized questions to avoid repeated API calls
   - Store in memory for session duration
   - Clear cache on logout

2. **Lazy Loading:**
   - Load voice components only when voice is enabled
   - Defer Web Audio API initialization until first use

3. **Debouncing:**
   - Debounce VAD checks to 100ms intervals
   - Debounce transcript validation to 300ms

4. **Resource Cleanup:**
   - Revoke audio blob URLs after playback
   - Stop media streams when not recording
   - Clear audio context on component unmount

5. **API Request Optimization:**
   - Compress audio before upload (if possible)
   - Use streaming responses for TTS
   - Implement request cancellation for abandoned recordings

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time to start recording | < 500ms | From button click to recording active |
| Transcription latency | < 3s | For 30-second audio clip |
| TTS generation | < 2s | For typical question (20-30 words) |
| Audio playback start | < 500ms | From play button to audio start |
| VAD detection latency | < 100ms | From silence to detection |
| UI responsiveness | < 100ms | Button click to visual feedback |

## Security Considerations

### Data Protection

1. **Audio Data:**
   - Audio files never persisted to disk on frontend
   - Temporary storage on backend deleted after transcription
   - Audio blobs cleared from memory after use

2. **API Keys:**
   - Voice API calls use same session-based key management
   - Keys never logged or exposed in errors
   - Keys cleared on logout

3. **Transcriptions:**
   - PII detection applied to transcriptions
   - Sensitive data scrubbed before storage
   - Audit logs track voice interactions

### Privacy

1. **Microphone Access:**
   - Request permission only when voice button clicked
   - Clear explanation of why permission needed
   - Respect user denial, provide text alternative

2. **Audio Transmission:**
   - All audio transmitted over HTTPS
   - No audio stored client-side beyond session
   - Backend audio files deleted after processing

3. **User Control:**
   - User can disable voice at any time
   - User can switch to text input mid-session
   - User can cancel recording at any time

## Browser Compatibility

### Supported Browsers

| Browser | Version | Notes |
|---------|---------|-------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |

### Required APIs

- MediaDevices.getUserMedia() - Audio capture
- MediaRecorder API - Audio recording
- Web Audio API - Audio analysis (VAD)
- Audio element - Playback
- Blob API - Audio data handling

### Fallbacks

- If MediaRecorder not supported: Show error, text-only mode
- If Web Audio API not supported: Disable VAD, use manual stop only
- If getUserMedia not supported: Hide voice button entirely

## Migration Strategy

### Phase 1: Foundation (Week 1)
- Add voice settings to LLMConfig interface
- Create VoiceSettings component
- Update LLMConfiguration to show/hide voice settings
- Update App.tsx to manage voice config state

### Phase 2: Non-Streaming Mode (Week 2)
- Enhance existing VoiceRecorder component
- Add transcript editing capability
- Integrate with ChatInterface
- Integrate with ClarificationQuestions
- Add playback controls for questions

### Phase 3: Streaming Mode (Week 3)
- Implement VoiceActivityDetector
- Create StreamingModeController
- Add auto-play logic
- Add auto-submit logic
- Implement conversational flow

### Phase 4: Polish & Testing (Week 4)
- Add error handling and fallbacks
- Implement accessibility features
- Add performance optimizations
- Write unit and integration tests
- Conduct user acceptance testing

## Future Enhancements

### Phase 2 (Future Release)

1. **AWS Polly/Transcribe Support:**
   - Add Bedrock voice provider
   - Implement provider abstraction layer
   - Support multiple voice providers simultaneously

2. **Package Extraction:**
   - Extract `backend/src/services/voice/` → `@catalai/voice-service-api`
   - Extract `frontend/src/components/voice/` → `@catalai/voice-components`
   - Publish to NPM for reuse in other projects
   - Create integration examples and documentation

3. **Advanced Features:**
   - Voice biometrics for user identification
   - Multi-language support
   - Custom wake words for hands-free operation
   - Voice commands for navigation

4. **Analytics:**
   - Voice usage metrics
   - Transcription accuracy tracking
   - User preference analysis
   - A/B testing streaming vs non-streaming adoption

5. **Accessibility:**
   - Adjustable speech rate
   - Adjustable voice pitch
   - High-contrast mode for visual indicators
   - Haptic feedback for mobile devices

### Standalone Voice Service (Future Consideration)

For projects requiring independent scaling or multi-project voice services:

```
voice-service/ (Separate Docker container)
├── API endpoints for STT/TTS
├── Provider abstraction (OpenAI, AWS, Azure)
├── Audio processing/streaming
├── Session management
└── WebSocket for real-time streaming

Projects connect via:
- REST API for transcription/synthesis
- WebSocket for streaming conversations
- Shared authentication tokens
```

**Decision Point:** Extract to standalone service when:
- Multiple projects need voice capabilities
- Voice service requires independent scaling
- Centralized voice analytics are needed
- Cost optimization through shared infrastructure

## Appendix

### Voice Type Characteristics

| Voice | Gender | Characteristics | Best For |
|-------|--------|-----------------|----------|
| alloy | Neutral | Balanced, clear | General use (default) |
| echo | Male | Warm, friendly | Conversational |
| fable | Female | Expressive, engaging | Questions |
| onyx | Male | Deep, authoritative | Professional |
| nova | Female | Bright, energetic | Upbeat interactions |
| shimmer | Female | Soft, calm | Soothing interactions |

### Audio Format Specifications

**Recording:**
- Format: WebM (Opus codec)
- Sample Rate: 48kHz
- Channels: Mono
- Bitrate: 128kbps

**Playback:**
- Format: MP3
- Sample Rate: 24kHz (OpenAI TTS default)
- Channels: Mono
- Bitrate: 64kbps

### Silence Detection Parameters

```typescript
const VAD_CONFIG = {
  silenceThreshold: -50,      // dB
  silenceDuration: 2000,      // ms
  minRecordingDuration: 1000, // ms
  fftSize: 2048,              // FFT size for frequency analysis
  smoothingTimeConstant: 0.8, // Smoothing for analyser
  checkInterval: 100          // ms between VAD checks
};
```

### Error Codes

| Code | Description | User Action |
|------|-------------|-------------|
| VOICE_001 | Microphone access denied | Grant permission |
| VOICE_002 | Transcription failed | Try again |
| VOICE_003 | TTS generation failed | Use text mode |
| VOICE_004 | Recording too short | Record longer |
| VOICE_005 | Transcription too short | Record again |
| VOICE_006 | Network timeout | Check connection |
| VOICE_007 | Unsupported browser | Use supported browser |
| VOICE_008 | Audio playback failed | Retry or use text |
| VOICE_009 | VAD initialization failed | Use manual stop |
| VOICE_010 | Streaming mode error | Switched to manual |
