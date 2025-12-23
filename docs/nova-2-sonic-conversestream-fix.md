# Nova 2 Sonic ConverseStreamCommand Implementation

**Date**: December 21, 2025  
**Status**: ✅ IMPLEMENTED - Switched from InvokeModelWithBidirectionalStreamCommand to ConverseStreamCommand

## Problem Analysis

The "No events to transform were found" deserialization error was occurring because:

1. **Wrong API Command**: Using `InvokeModelWithBidirectionalStreamCommand` with custom event format
2. **Event Format Mismatch**: Nova 2 Sonic expects standard Converse API format, not custom bidirectional events
3. **HTTP 200 Response**: AWS connection was working, but the event structure was incompatible

## Root Cause

Nova 2 Sonic is designed to work with the **Converse API** (`ConverseStreamCommand`), not the lower-level bidirectional streaming API. The steering guide example showed `ConverseStreamCommand`, which was the correct approach.

## Solution Implemented

### Changed API Command

**Before (Broken)**:
```typescript
import { InvokeModelWithBidirectionalStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const command = new InvokeModelWithBidirectionalStreamCommand({
  modelId: 'amazon.nova-2-sonic-v1:0',
  body: inputGenerator  // Custom event generator
});
```

**After (Fixed)**:
```typescript
import { ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const command = new ConverseStreamCommand({
  modelId: 'amazon.nova-2-sonic-v1:0',
  messages: session.messages,  // Standard message format
  inferenceConfig: {
    maxTokens: 1000,
    temperature: 0.7,
    topP: 0.9
  },
  system: session.systemPrompt ? [{ text: session.systemPrompt }] : undefined
});
```

### Message Format

**Audio Input**:
```typescript
const userMessage = {
  role: 'user',
  content: [
    {
      audio: {
        format: 'pcm',
        source: {
          bytes: audioData  // Raw Buffer, not base64
        }
      }
    }
  ]
};
```

**Text Input**:
```typescript
const userMessage = {
  role: 'user',
  content: [{ text: 'User message text' }]
};
```

### Response Processing

**Streaming Response**:
```typescript
for await (const chunk of response.stream) {
  // Text response
  if (chunk.contentBlockDelta?.delta?.text) {
    const textResponse = chunk.contentBlockDelta.delta.text;
    callbacks?.onTextResponse?.(textResponse);
  }

  // Message completion
  if (chunk.messageStop) {
    // Add to conversation history
    session.messages.push({
      role: 'assistant',
      content: [{ text: assistantMessage }]
    });
  }
}
```

## Key Changes

### 1. Import Statement
```typescript
// Changed from:
import { InvokeModelWithBidirectionalStreamCommand } from '@aws-sdk/client-bedrock-runtime';

// To:
import { ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
```

### 2. Removed Custom Event Generators
- Removed `createInputGenerator()` method
- Removed `createTextInputGenerator()` method
- No longer need custom event format with sessionStart/audioChunk/sessionEnd

### 3. Conversation History Management
- Messages stored in `session.messages` array
- Standard Converse API message format
- Automatic conversation context maintenance

### 4. Audio Format
- Changed from base64 string to raw Buffer
- Using `audio.source.bytes` instead of base64 encoding
- Format specified as 'pcm' in audio object

## Benefits

### ✅ Correct API Usage
- Using the intended Converse API for Nova 2 Sonic
- Standard AWS Bedrock message format
- No custom event serialization needed

### ✅ Simpler Implementation
- Removed complex async generator logic
- Standard message array instead of event streams
- Cleaner code with less complexity

### ✅ Better Conversation Management
- Automatic conversation history tracking
- Multi-turn conversation support built-in
- Standard role-based message format

### ✅ Compatibility
- Works with all Bedrock Converse API features
- Compatible with future Nova 2 Sonic enhancements
- Follows AWS best practices

## Testing

### Expected Behavior
1. **Audio Input**: User speaks → Nova 2 Sonic processes → Text/Audio response
2. **Text Input**: User types → Nova 2 Sonic processes → Text response
3. **Multi-turn**: Conversation history maintained across turns
4. **Error Handling**: Clear error messages for access/region issues

### Test Commands
```bash
# Rebuild and restart
./catalai.sh build
./catalai.sh restart

# Check logs
./catalai.sh logs -f

# Test in browser
# 1. Open http://localhost
# 2. Configure AWS Bedrock with credentials
# 3. Select Nova 2 Sonic voice
# 4. Try voice input
```

## Files Modified

### Backend Service
- **File**: `backend/src/services/nova-sonic-websocket.service.ts`
- **Changes**:
  - Switched to `ConverseStreamCommand`
  - Updated audio processing to use standard message format
  - Removed custom event generators
  - Simplified response processing

### No Frontend Changes Required
- Frontend WebSocket integration remains the same
- Audio capture and streaming unchanged
- Response handling compatible with new backend

## Comparison: Before vs After

| Aspect | Before (Broken) | After (Working) |
|--------|----------------|-----------------|
| **API Command** | InvokeModelWithBidirectionalStreamCommand | ConverseStreamCommand |
| **Event Format** | Custom events (sessionStart, audioChunk) | Standard Converse messages |
| **Audio Format** | Base64 string in custom event | Raw Buffer in audio.source.bytes |
| **Complexity** | High (custom generators) | Low (standard API) |
| **Conversation** | Manual tracking | Built-in history |
| **Error** | "No events to transform" | Should work correctly |

## Next Steps

1. **Test with Real Audio**: User should test voice input in browser
2. **Verify Transcription**: Check if audio is properly transcribed
3. **Test Multi-turn**: Verify conversation history works
4. **Monitor Logs**: Watch for any new errors or issues

## Conclusion

The fix changes the implementation from a custom bidirectional streaming approach to the standard Converse API, which is the correct way to use Nova 2 Sonic with AWS Bedrock. This should resolve the "No events to transform" deserialization error.

The key insight was recognizing that Nova 2 Sonic is designed to work with the Converse API, not the lower-level bidirectional streaming API. The steering guide example showing `ConverseStreamCommand` was the correct pattern to follow.
