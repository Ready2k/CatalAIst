# Voice Services Module

This directory contains all voice-related services for the CatalAIst application. The code is organized for future extraction into a reusable NPM package.

## Purpose

Provide Speech-to-Text (STT) and Text-to-Speech (TTS) capabilities with support for multiple providers.

## Structure

```
voice/
├── README.md                    # This file
├── voice.service.ts             # Main orchestrator service
├── voice.interface.ts           # Provider contract/interface
└── providers/
    ├── openai-voice.provider.ts # OpenAI Whisper/TTS implementation
    └── aws-voice.provider.ts    # AWS Polly/Transcribe (future)
```

## Provider Abstraction

All voice providers implement the `VoiceProvider` interface defined in `voice.interface.ts`. This allows easy swapping between providers (OpenAI, AWS, Azure, etc.) without changing application code.

## Future Extraction

This module is designed to be extracted into `@catalai/voice-service-api` NPM package:

1. Copy this directory to a new repository
2. Add package.json with appropriate dependencies
3. Export main service and interfaces
4. Publish to NPM
5. Replace in CatalAIst with: `npm install @catalai/voice-service-api`

## Usage

```typescript
import { VoiceService } from './services/voice/voice.service';

const voiceService = new VoiceService();

// Transcribe audio
const transcript = await voiceService.transcribe(audioFile, config);

// Synthesize speech
const audioBuffer = await voiceService.synthesize(text, voiceType, config);
```

## Environment Compatibility

This module works in both:
- Development mode: `npm run dev`
- Docker containers: `docker-compose up`

No additional configuration needed beyond LLM provider credentials.
