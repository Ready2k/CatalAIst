# Voice Components Module

This directory contains all voice-related React components for the CatalAIst application. The components are designed for future extraction into a reusable NPM package.

## Purpose

Provide reusable voice interface components for audio recording, playback, transcription display, and conversational flows.

## Structure

```
voice/
├── README.md                          # This file
├── StreamingModeController.tsx        # Conversational flow controller
├── NonStreamingModeController.tsx     # Manual control flow controller
├── AudioPlayer.tsx                    # TTS playback with controls
├── AudioRecorder.tsx                  # Audio recording component
├── TranscriptDisplay.tsx              # Transcript display/editing
├── VoiceSettings.tsx                  # Voice configuration UI
├── hooks/
│   ├── useVoiceRecording.ts          # Recording hook
│   ├── useVoicePlayback.ts           # Playback hook
│   └── useVoiceConfig.ts             # Configuration hook
└── utils/
    └── VoiceActivityDetector.ts      # Silence detection utility
```

## Component Design Principles

1. **Self-contained**: Minimal external dependencies
2. **Prop-driven**: All configuration via props
3. **Generic**: Not tied to CatalAIst-specific logic
4. **Accessible**: WCAG AA compliant
5. **Responsive**: Works on mobile and desktop

## Future Extraction

This module is designed to be extracted into `@catalai/voice-components` NPM package:

1. Copy this directory to a new repository
2. Add package.json with React as peer dependency
3. Export all components and hooks
4. Add Storybook for component documentation
5. Publish to NPM
6. Replace in CatalAIst with: `npm install @catalai/voice-components`

## Usage Example

```typescript
import { StreamingModeController } from './components/voice/StreamingModeController';

<StreamingModeController
  voiceConfig={{
    voiceType: 'alloy',
    apiKey: 'sk-...'
  }}
  currentQuestion="What is your process description?"
  onTranscriptionComplete={(text) => handleSubmit(text)}
  onCancel={() => setShowVoice(false)}
/>
```

## Environment Compatibility

These components work in both:
- Development mode: `npm run dev`
- Docker containers: `docker-compose up`

All components use standard Web APIs (MediaDevices, Web Audio API) that work in modern browsers.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Dependencies

- React 17+
- TypeScript 4+
- Standard Web APIs (no external audio libraries)
