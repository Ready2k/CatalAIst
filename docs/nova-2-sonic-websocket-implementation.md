# Nova 2 Sonic WebSocket Implementation Guide

**Date**: December 21, 2025  
**Status**: 🚧 IMPLEMENTATION READY - Requires Testing

## Overview

This document describes the WebSocket-based bidirectional streaming implementation for Amazon Nova 2 Sonic, enabling real-time speech-to-speech conversations.

## Architecture

### Components

1. **NovaSonicWebSocketService** (`nova-sonic-websocket.service.ts`)
   - Manages bidirectional streaming with Nova 2 Sonic
   - Handles session lifecycle
   - Processes audio and text events
   - Manages streaming responses

2. **WebSocket Routes** (`nova-sonic-websocket.routes.ts`)
   - WebSocket endpoint: `/api/nova-sonic/stream`
   - HTTP status endpoint: `/api/nova-sonic/status`
   - HTTP cleanup endpoint: `/api/nova-sonic/cleanup`

3. **Frontend Integration** (To be implemented)
   - WebSocket client connection
   - Audio capture and streaming
   - Real-time audio playback
   - UI for conversation management

## WebSocket Protocol

### Connection Flow

```
1. Client connects to ws://localhost:8080/api/nova-sonic/stream
2. Client sends 'initialize' message with AWS credentials
3. Server creates Nova 2 Sonic session
4. Server starts processing streaming responses
5. Client sends audio chunks or text messages
6. Server forwards to Nova 2 Sonic
7. Server streams back transcriptions, text responses, and audio
8. Client sends 'end_conversation' or closes connection
9. Server cleans up session
```

### Message Types

#### Client → Server

**1. Initialize Session**
```json
{
  "type": "initialize",
  "awsAccessKeyId": "AKIA...",
  "awsSecretAccessKey": "...",
  "awsSessionToken": "...",  // Optional
  "awsRegion": "us-east-1",
  "systemPrompt": "You are a helpful assistant...",  // Optional
  "userId": "user123"  // Optional
}
```

**2. Send Audio Chunk**
```json
{
  "type": "audio_chunk",
  "audio": "base64_encoded_audio_data",
  "isComplete": false
}
```

**3. Send Text Message**
```json
{
  "type": "text_message",
  "text": "Hello, how are you?"
}
```

**4. End Conversation**
```json
{
  "type": "end_conversation"
}
```

#### Server → Client

**1. Initialized**
```json
{
  "type": "initialized",
  "sessionId": "uuid",
  "timestamp": "2025-12-21T..."
}
```

**2. Transcription**
```json
{
  "type": "transcription",
  "text": "User said something",
  "timestamp": "2025-12-21T..."
}
```

**3. Text Response**
```json
{
  "type": "text_response",
  "text": "AI response text",
  "timestamp": "2025-12-21T..."
}
```

**4. Audio Response**
```json
{
  "type": "audio_response",
  "audio": "base64_encoded_audio_data",
  "timestamp": "2025-12-21T..."
}
```

**5. Error**
```json
{
  "type": "error",
  "error": "Error message",
  "timestamp": "2025-12-21T..."
}
```

**6. Conversation Ended**
```json
{
  "type": "conversation_ended",
  "timestamp": "2025-12-21T..."
}
```

## Installation Steps

### 1. Install Dependencies

```bash
cd backend
npm install ws @types/ws
npm run build
```

### 2. Update Main Server

Add WebSocket initialization to `src/index.ts`:

```typescript
import { createServer } from 'http';
import { initializeNovaSonicWebSocket } from './routes/nova-sonic-websocket.routes';

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket for Nova 2 Sonic
initializeNovaSonicWebSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 3. Rebuild and Restart Docker

```bash
npm run build
docker-compose down
docker-compose up --build
```

## Frontend Integration

### WebSocket Client Example

```javascript
// Connect to Nova 2 Sonic WebSocket
const ws = new WebSocket('ws://localhost:8080/api/nova-sonic/stream');

// Initialize session
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'initialize',
    awsAccessKeyId: config.awsAccessKeyId,
    awsSecretAccessKey: config.awsSecretAccessKey,
    awsRegion: config.awsRegion,
    systemPrompt: 'You are a helpful assistant.',
    userId: 'user123'
  }));
};

// Handle messages
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  switch (message.type) {
    case 'initialized':
      console.log('Session initialized:', message.sessionId);
      startAudioCapture();
      break;
      
    case 'transcription':
      displayTranscription(message.text);
      break;
      
    case 'text_response':
      displayResponse(message.text);
      break;
      
    case 'audio_response':
      playAudio(message.audio);
      break;
      
    case 'error':
      console.error('Error:', message.error);
      break;
  }
};

// Send audio chunk
function sendAudioChunk(audioData, isComplete = false) {
  ws.send(JSON.stringify({
    type: 'audio_chunk',
    audio: arrayBufferToBase64(audioData),
    isComplete
  }));
}

// Send text message
function sendTextMessage(text) {
  ws.send(JSON.stringify({
    type: 'text_message',
    text
  }));
}

// End conversation
function endConversation() {
  ws.send(JSON.stringify({
    type: 'end_conversation'
  }));
}
```

### Audio Capture Example

```javascript
// Capture audio from microphone
async function startAudioCapture() {
  const stream = await navigator.mediaDevices.getUserMedia({ 
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true
    } 
  });
  
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);
  
  processor.onaudioprocess = (e) => {
    const audioData = e.inputBuffer.getChannelData(0);
    const int16Array = float32ToInt16(audioData);
    sendAudioChunk(int16Array.buffer, false);
  };
  
  source.connect(processor);
  processor.connect(audioContext.destination);
}

// Convert Float32Array to Int16Array
function float32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}
```

### Audio Playback Example

```javascript
// Play audio response
async function playAudio(base64Audio) {
  const audioData = base64ToArrayBuffer(base64Audio);
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(audioData);
  
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
```

## Testing

### 1. Test WebSocket Connection

```bash
# Install wscat for testing
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:8080/api/nova-sonic/stream

# Send initialize message
{"type":"initialize","awsAccessKeyId":"AKIA...","awsSecretAccessKey":"...","awsRegion":"us-east-1"}

# Send text message
{"type":"text_message","text":"Hello"}

# End conversation
{"type":"end_conversation"}
```

### 2. Check Service Status

```bash
curl http://localhost:8080/api/nova-sonic/status
```

### 3. Force Cleanup

```bash
curl -X POST http://localhost:8080/api/nova-sonic/cleanup
```

## Benefits of WebSocket Implementation

### ✅ Real-Time Bidirectional Streaming
- Continuous audio streaming in both directions
- Low latency for natural conversations
- No file uploads required

### ✅ Natural Conversation Flow
- Support for interruptions (barge-in)
- Turn-taking detection
- Streaming responses as they're generated

### ✅ Efficient Resource Usage
- Single persistent connection
- Reduced overhead compared to HTTP polling
- Better scalability

### ✅ Enhanced User Experience
- Immediate feedback
- Natural conversation pace
- Smooth audio playback

## Migration Path

### Phase 1: WebSocket Backend (Current)
- ✅ WebSocket service implementation
- ✅ Bidirectional streaming support
- ✅ Session management
- ✅ Event handling

### Phase 2: Frontend Integration (Next)
- [ ] WebSocket client implementation
- [ ] Audio capture and streaming
- [ ] Real-time audio playback
- [ ] UI updates for streaming

### Phase 3: Advanced Features (Future)
- [ ] Barge-in support (interruptions)
- [ ] Multi-language support
- [ ] Conversation history
- [ ] Tool use integration

## Comparison: HTTP vs WebSocket

| Feature | HTTP (Current) | WebSocket (New) |
|---------|---------------|-----------------|
| Connection | Request-response | Persistent bidirectional |
| Latency | High (new request each time) | Low (single connection) |
| Audio Streaming | File upload | Real-time chunks |
| Interruptions | Not supported | Supported |
| Resource Usage | High (multiple connections) | Low (single connection) |
| User Experience | Delayed | Real-time |
| Nova 2 Sonic Support | ❌ Limited | ✅ Full support |

## Troubleshooting

### WebSocket Connection Fails
- Check firewall settings
- Verify WebSocket is enabled in nginx/proxy
- Check CORS settings

### Audio Not Streaming
- Verify audio format (16kHz, mono, PCM)
- Check base64 encoding
- Verify chunk size (recommended: 4096 samples)

### Session Initialization Fails
- Verify AWS credentials
- Check IAM permissions for Bedrock
- Verify Nova 2 Sonic model access

### High Latency
- Check network connection
- Verify audio chunk size
- Monitor server resources

## Security Considerations

### Authentication
- Implement JWT token validation
- Verify user permissions
- Rate limit connections

### Data Protection
- Use WSS (WebSocket Secure) in production
- Encrypt sensitive data
- Implement proper session cleanup

### Resource Limits
- Limit concurrent connections per user
- Implement connection timeouts
- Monitor memory usage

## Next Steps

1. **Update Main Server**: Add WebSocket initialization to `src/index.ts`
2. **Install Dependencies**: Run `npm install` to get WebSocket packages
3. **Rebuild**: Run `npm run build` to compile TypeScript
4. **Test Backend**: Use wscat to test WebSocket connection
5. **Implement Frontend**: Create WebSocket client in React
6. **Test End-to-End**: Verify full speech-to-speech flow
7. **Deploy**: Update Docker configuration for WebSocket support

## Conclusion

The WebSocket implementation provides the foundation for full Nova 2 Sonic functionality. Once the frontend integration is complete, users will have access to real-time, bidirectional speech-to-speech conversations with low latency and natural conversation flow.

This implementation follows AWS best practices and is based on official AWS samples for Nova 2 Sonic integration.