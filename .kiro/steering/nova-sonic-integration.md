# Amazon Nova 2 Sonic Integration Guide

## Official Documentation
- **AWS Docs**: https://docs.aws.amazon.com/nova/latest/nova2-userguide/using-conversational-speech.html
- **Sample Code**: https://github.com/aws-samples/amazon-nova-samples/tree/main/speech-to-speech/amazon-nova-2-sonic
- **Working Implementation**: https://github.com/Ready2k/NovaDemos

## Nova 2 Sonic Capabilities

### Core Features
- **State-of-the-art streaming speech understanding** with bidirectional streaming API
- **Real-time, low-latency multi-turn conversations**
- **Multilingual support** with automatic language detection and switching
- **Polyglot voices** that can speak any supported language
- **Robustness to background noise** for real-world deployment
- **Natural, human-like conversational AI experiences**

### Supported Languages
- English (US, UK, India, Australia)
- French, Italian, German, Spanish, Portuguese, Hindi

### Advanced Capabilities
- **Adaptive speech response** - dynamically adjusts delivery based on input prosody
- **Intelligent turn-taking** - detects when users finish speaking
- **Graceful handling of user interruptions** without dropping context
- **Knowledge grounding** with enterprise data using RAG
- **Function calling and agentic workflow support**
- **Asynchronous tool handling** - executes tool calls while maintaining conversation flow
- **Cross-modal input support** - both audio and text inputs in same conversation

## Integration Architecture

### Current CatalAIst Implementation
```
Frontend (React) → WebSocket → Backend (Node.js) → AWS Bedrock Nova 2 Sonic
```

### Audio Format Requirements
- **Format**: PCM16, mono, 16kHz sample rate
- **Streaming**: Bidirectional WebSocket audio streaming
- **Real-time**: Low-latency processing for natural conversation

## Implementation Patterns

### WebSocket Audio Streaming
```typescript
// Frontend: Capture and stream audio
const audioContext = new AudioContext({ sampleRate: 16000 });
const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
const source = audioContext.createMediaStreamSource(mediaStream);

// Convert to PCM16 and stream via WebSocket
const websocket = new WebSocket('ws://localhost:8080/nova-sonic');
websocket.send(pcm16AudioData);
```

### Backend Nova 2 Sonic Integration
```typescript
// Backend: Route audio to Nova 2 Sonic via AWS Bedrock
import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });
const command = new ConverseStreamCommand({
  modelId: 'amazon.nova-2-sonic-v1:0',
  messages: [/* conversation history */],
  inferenceConfig: {
    maxTokens: 1000,
    temperature: 0.7
  }
});
```

### Voice Configuration Options
Available Nova voices:
- Matthew, Tiffany, Amy, Brian, Emma, Joanna, Ruth
- Nova 2 Sonic (recommended for natural conversation)

## CatalAIst-Specific Integration

### Service Layer Integration
- **File**: `backend/src/services/nova-sonic-websocket.service.ts`
- **Purpose**: Handle real-time audio streaming for process classification
- **Features**: 
  - Voice input for process descriptions
  - Audio clarification questions
  - Spoken classification results

### Frontend Components
- **File**: `frontend/src/services/nova-sonic-websocket.service.ts`
- **Components**: 
  - `StreamingModeController.tsx` - Handle Nova 2 Sonic streaming
  - `AudioRecorder.tsx` - Capture user audio
  - `AudioPlayer.tsx` - Play Nova responses

### Voice Workflow Integration
1. **Process Input**: User describes process via voice
2. **Clarification**: Nova 2 Sonic asks follow-up questions naturally
3. **Classification**: Spoken results with rationale
4. **Feedback**: Voice confirmation of classification accuracy

## Configuration Requirements

### AWS Credentials
```bash
# Required environment variables
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_SESSION_TOKEN=your_session_token  # For temporary credentials
AWS_REGION=us-east-1  # Nova 2 Sonic availability region
```

### Model Configuration
```typescript
// Nova 2 Sonic model configuration
const novaConfig = {
  modelId: 'amazon.nova-2-sonic-v1:0',
  streaming: true,
  audioFormat: 'pcm16',
  sampleRate: 16000,
  language: 'en-US',  // Auto-detection available
  voice: 'nova-2-sonic'  // Recommended voice
};
```

## Best Practices

### Audio Quality
- Use 16kHz sample rate for optimal Nova 2 Sonic performance
- Implement noise reduction for better recognition
- Handle audio buffering for smooth streaming

### Conversation Flow
- Implement intelligent turn-taking detection
- Handle user interruptions gracefully
- Maintain conversation context across turns

### Error Handling
- Fallback to text input if audio fails
- Handle network interruptions in streaming
- Provide visual feedback during audio processing

### Performance Optimization
- Use audio compression for bandwidth efficiency
- Implement audio caching for repeated interactions
- Monitor latency and adjust buffer sizes

## Tool Integration

### Function Calling Support
Nova 2 Sonic supports native function calling for:
- Process classification tools
- Decision matrix evaluation
- Analytics queries
- User management functions

### Asynchronous Tool Handling
- Execute classification while maintaining conversation
- Provide status updates during long-running operations
- Continue speaking while tools process in background

## Security Considerations

### Audio Data Protection
- Encrypt audio streams in transit
- Apply PII detection to transcribed audio
- Secure storage of audio cache files
- Audit logging for voice interactions

### Authentication
- Extend JWT authentication to WebSocket connections
- Rate limiting for voice endpoints
- User permission checks for voice features

## Testing and Validation

### Audio Testing
- Test with various microphone qualities
- Validate across different browsers
- Test interruption and resume scenarios

### Integration Testing
- End-to-end voice classification workflows
- Multi-turn conversation scenarios
- Error recovery and fallback testing

## Migration from OpenAI Voice

### Compatibility Layer
- Maintain existing voice interface components
- Abstract voice provider selection
- Unified voice settings configuration

### Feature Parity
- Speech-to-text transcription
- Text-to-speech synthesis
- Voice activity detection
- Audio visualization

This integration enables CatalAIst to provide natural, conversational voice interactions for process classification using Amazon's most advanced speech-to-speech AI model.