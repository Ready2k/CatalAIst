# Voice Module Extraction Guide

This document describes how to extract the voice interface components into standalone NPM packages for reuse in other projects.

## Current Structure

The voice interface is organized in modular directories:

```
backend/src/services/voice/          # Voice services
frontend/src/components/voice/       # Voice UI components
shared/types/voice.types.ts          # Shared type definitions
```

## Extraction Steps

### Step 1: Extract Backend Voice Service

```bash
# Create new repository
mkdir voice-service-api
cd voice-service-api
npm init -y

# Copy voice service code
cp -r ../catalai/backend/src/services/voice/* ./src/

# Add package.json dependencies
npm install --save openai @aws-sdk/client-bedrock-runtime

# Create index.ts to export main service
echo "export * from './voice.service';" > src/index.ts
echo "export * from './voice.interface';" >> src/index.ts

# Build and publish
npm run build
npm publish --access public
```

**Package name:** `@catalai/voice-service-api`

### Step 2: Extract Frontend Voice Components

```bash
# Create new repository
mkdir voice-components
cd voice-components
npm init -y

# Copy voice components
cp -r ../catalai/frontend/src/components/voice/* ./src/

# Copy voice types
cp ../catalai/shared/types/voice.types.ts ./src/types/

# Add package.json dependencies
npm install --save-peer react react-dom
npm install --save-dev @types/react @types/react-dom typescript

# Create index.ts to export all components
cat > src/index.ts << EOF
export { default as StreamingModeController } from './StreamingModeController';
export { default as NonStreamingModeController } from './NonStreamingModeController';
export { default as AudioPlayer } from './AudioPlayer';
export { default as AudioRecorder } from './AudioRecorder';
export { default as TranscriptDisplay } from './TranscriptDisplay';
export { default as VoiceSettings } from './VoiceSettings';
export * from './hooks';
export * from './types/voice.types';
EOF

# Build and publish
npm run build
npm publish --access public
```

**Package name:** `@catalai/voice-components`

### Step 3: Update CatalAIst to Use Packages

```bash
cd catalai

# Install packages
npm install @catalai/voice-service-api @catalai/voice-components

# Update imports in backend
# Before: import { VoiceService } from './services/voice/voice.service';
# After:  import { VoiceService } from '@catalai/voice-service-api';

# Update imports in frontend
# Before: import AudioPlayer from './components/voice/AudioPlayer';
# After:  import { AudioPlayer } from '@catalai/voice-components';

# Remove old directories
rm -rf backend/src/services/voice
rm -rf frontend/src/components/voice
```

## Package Configuration

### voice-service-api/package.json

```json
{
  "name": "@catalai/voice-service-api",
  "version": "1.0.0",
  "description": "Voice service API for STT/TTS with multiple provider support",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "jest"
  },
  "keywords": ["voice", "stt", "tts", "openai", "aws", "transcription"],
  "peerDependencies": {
    "openai": "^4.0.0"
  },
  "optionalDependencies": {
    "@aws-sdk/client-bedrock-runtime": "^3.0.0"
  }
}
```

### voice-components/package.json

```json
{
  "name": "@catalai/voice-components",
  "version": "1.0.0",
  "description": "React components for voice interfaces with STT/TTS",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc && rollup -c",
    "storybook": "storybook dev -p 6006",
    "test": "jest"
  },
  "keywords": ["react", "voice", "audio", "recording", "tts", "stt"],
  "peerDependencies": {
    "react": "^17.0.0 || ^18.0.0",
    "react-dom": "^17.0.0 || ^18.0.0"
  }
}
```

## Usage in Other Projects

### Example: Business Case Voice Interface

```typescript
// Install packages
npm install @catalai/voice-components @catalai/voice-service-api

// Use in your React app
import { StreamingModeController } from '@catalai/voice-components';

function BusinessCaseForm() {
  const [voiceConfig] = useState({
    voiceType: 'alloy',
    apiKey: process.env.OPENAI_API_KEY
  });

  return (
    <StreamingModeController
      voiceConfig={voiceConfig}
      currentQuestion="Describe your business case idea"
      onTranscriptionComplete={(text) => handleSubmit(text)}
      onCancel={() => setShowVoice(false)}
    />
  );
}
```

## Benefits of Extraction

1. **Reusability**: Use in multiple projects without code duplication
2. **Versioning**: Independent version control for voice features
3. **Testing**: Dedicated test suite for voice components
4. **Documentation**: Storybook for component documentation
5. **Maintenance**: Single source of truth for voice interface
6. **Community**: Open source potential for wider adoption

## When to Extract

Extract when:
- ✅ You have 2+ projects needing voice interfaces
- ✅ Voice features are stable and well-tested
- ✅ You want to share voice capabilities across teams
- ✅ You need independent versioning for voice features

Don't extract yet if:
- ❌ Voice features are still experimental
- ❌ Only one project uses voice
- ❌ Frequent breaking changes expected
- ❌ Tight coupling with CatalAIst-specific logic

## Current Status

**Status:** Not yet extracted (in development)

**Next Steps:**
1. Complete voice interface implementation in CatalAIst
2. Stabilize APIs and component interfaces
3. Add comprehensive tests
4. Create Storybook documentation
5. Extract to packages when ready

**Target Date:** After Phase 2 (AWS Polly/Transcribe support)
