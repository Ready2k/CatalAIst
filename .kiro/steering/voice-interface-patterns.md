# Voice Interface Patterns

## Critical Rule: Voice Features Must Follow These Patterns

**MANDATORY**: All voice-related code must follow these established patterns to ensure proper functionality.

---

## Authentication Pattern

### Requirements

1. **All voice API calls MUST include JWT authentication**
2. **Use the standard auth header pattern**
3. **Never bypass authentication for voice endpoints**

### Implementation

**Frontend API Service:**
```typescript
// ✅ CORRECT: Include Authorization header
const token = this.getAuthToken();
const headers: HeadersInit = {};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}

const response = await fetch('/api/voice/transcribe', {
  method: 'POST',
  headers,
  body: formData,
});
```

**Backend Routes:**
```typescript
// ✅ CORRECT: Protect voice routes with authentication
app.use('/api/voice', authenticateToken, voiceRoutes);
```

### Why This Matters

- Voice endpoints are protected resources
- Audit logging requires authenticated user
- Rate limiting works per authenticated user
- Security compliance requires authentication

---

## API Key Management Pattern

### Requirements

1. **Always use fallback pattern for API keys**
2. **Check both `this.apiKey` and `this.llmConfig.apiKey`**
3. **Add debug logging for troubleshooting**

### Implementation

**Frontend API Service:**
```typescript
// ✅ CORRECT: Use fallback pattern
async transcribeAudio(audioFile: File): Promise<{ transcription: string }> {
  // Get API key from llmConfig if not set directly
  const apiKey = this.apiKey || this.llmConfig?.apiKey;
  
  if (!apiKey) {
    console.error('Transcription failed: No API key available', {
      hasApiKey: !!this.apiKey,
      hasLLMConfig: !!this.llmConfig,
      llmConfigApiKey: !!this.llmConfig?.apiKey
    });
    throw new Error('No API key configured');
  }
  
  // Use apiKey...
}
```

**Why This Matters:**
- API key can be set via `setApiKey()` or `setLLMConfig()`
- Fallback ensures key is found regardless of how it was set
- Debug logging helps troubleshoot configuration issues

---

## OpenAI Service Call Pattern

### Requirements

1. **Always pass config object, never raw API key**
2. **Include `provider` field in config**
3. **Use proper TypeScript types (avoid `any`)**

### Implementation

**Backend Voice Routes:**
```typescript
// ❌ WRONG: Passing API key as string
await openaiService.transcribe(fileStream, apiKey);

// ✅ CORRECT: Pass config object with provider
await openaiService.transcribe(fileStream, { 
  provider: 'openai',
  apiKey 
});
```

```typescript
// ❌ WRONG: Passing API key as string
await openaiService.synthesize(text, voice, apiKey);

// ✅ CORRECT: Pass config object with provider
await openaiService.synthesize(text, voice, { 
  provider: 'openai',
  apiKey 
});
```

### LLMProviderConfig Interface

```typescript
export interface LLMProviderConfig {
  provider: 'openai' | 'bedrock';  // Required!
  apiKey?: string;                 // For OpenAI
  awsAccessKeyId?: string;         // For AWS Bedrock
  awsSecretAccessKey?: string;     // For AWS Bedrock
  awsSessionToken?: string;        // For AWS Bedrock (optional)
  awsRegion?: string;              // For AWS Bedrock
}
```

### Why This Matters

- OpenAI service expects unified config format
- Supports both OpenAI and Bedrock providers
- Type safety catches errors at compile time
- Consistent pattern across all LLM calls

---

## Error Handling Pattern

### Requirements

1. **Provide specific, actionable error messages**
2. **Log errors with context for debugging**
3. **Include fallback options in UI**
4. **Never expose sensitive data in errors**

### Implementation

**Frontend:**
```typescript
try {
  const response = await apiService.transcribeAudio(audioFile);
  // Handle success
} catch (err: any) {
  console.error('Transcription error:', {
    message: err.message,
    status: err.status,
    // Don't log API keys or tokens!
  });
  
  // Show user-friendly error
  setError(err.message || 'Transcription failed. Please try again.');
}
```

**Backend:**
```typescript
try {
  const result = await openaiService.transcribe(fileStream, config);
  // Handle success
} catch (error) {
  console.error('Error transcribing audio:', error);
  
  // Return user-friendly error (don't expose internal details)
  res.status(500).json({
    error: 'Failed to transcribe audio',
    message: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

### Error Messages

**Good Error Messages:**
- ✅ "No API key configured. Please reconfigure your LLM provider in the Configuration tab."
- ✅ "Microphone permission denied. Please allow microphone access in your browser settings."
- ✅ "Transcription failed. Please check your internet connection and try again."

**Bad Error Messages:**
- ❌ "Error"
- ❌ "Failed"
- ❌ "No token provided" (too technical, not actionable)

---

## Voice Configuration Pattern

### Requirements

1. **Auto-enable voice for OpenAI provider**
2. **Auto-disable voice for Bedrock provider** (until Bedrock voice support added)
3. **Store voice config in sessionStorage**
4. **Clear voice config on logout**

### Implementation

**App.tsx:**
```typescript
const handleConfigSubmit = async (config: LLMConfig) => {
  // Set LLM config first
  apiService.setLLMConfig(config);
  
  // Create session
  await apiService.createSession(config.apiKey, config.model);
  
  // Set voice configuration based on provider
  if (config.provider === 'openai') {
    // Auto-enable voice for OpenAI
    setVoiceConfig({
      enabled: true,
      voiceType: config.voiceType || 'alloy',
      streamingMode: config.streamingMode || false,
      apiKey: config.apiKey
    });
    
    // Store in session storage
    sessionStorage.setItem('voiceConfig', JSON.stringify({
      enabled: true,
      voiceType: config.voiceType || 'alloy',
      streamingMode: config.streamingMode || false
    }));
  } else {
    // Auto-disable voice for Bedrock
    setVoiceConfig({
      enabled: false,
      voiceType: 'alloy',
      streamingMode: false
    });
    sessionStorage.removeItem('voiceConfig');
  }
};
```

### Why This Matters

- Voice features only work with OpenAI currently
- Prevents confusion when using Bedrock
- Persists settings across page reloads
- Clears sensitive data on logout

---

## FormData Pattern for File Uploads

### Requirements

1. **Use FormData for audio file uploads**
2. **Include all required fields (audio, apiKey, sessionId)**
3. **Don't set Content-Type header** (browser sets it automatically with boundary)
4. **Include Authorization header separately**

### Implementation

**Frontend:**
```typescript
const formData = new FormData();
formData.append('audio', audioFile);
formData.append('apiKey', apiKey);
formData.append('sessionId', this.sessionId);

// Get auth token
const token = this.getAuthToken();
const headers: HeadersInit = {};
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
// Don't set Content-Type! Browser handles it for FormData

const response = await fetch('/api/voice/transcribe', {
  method: 'POST',
  headers,  // Only Authorization header
  body: formData,
});
```

**Backend (Multer):**
```typescript
// Multer extracts file to req.file
// Multer extracts other fields to req.body
const { sessionId, apiKey, userId = 'anonymous' } = req.body;
const audioFile = req.file;
```

### Why This Matters

- FormData handles multipart/form-data encoding
- Browser sets correct Content-Type with boundary
- Multer middleware extracts fields correctly
- File uploads work reliably

---

## Voice Button Visibility Pattern

### Requirements

1. **Show voice button only when appropriate**
2. **Check all conditions before showing**
3. **Hide during processing states**

### Implementation

```typescript
const shouldShowVoiceButton = (): boolean => {
  return hasConfig && 
         voiceConfig !== null && 
         voiceConfig.enabled && 
         (workflowState === 'input' || workflowState === 'clarification');
};

// In render
{shouldShowVoiceButton() && (
  <button onClick={handleVoiceClick}>
    🎤 Voice Input
  </button>
)}
```

### Conditions to Check

- ✅ User has configured LLM
- ✅ Voice is enabled (OpenAI provider)
- ✅ Workflow state allows voice input
- ✅ Not currently processing
- ✅ User is authenticated

---

## Streaming vs Non-Streaming Pattern

### Requirements

1. **Provide both modes**
2. **Default to non-streaming** (more control)
3. **Auto-fallback from streaming to non-streaming on errors**
4. **Preserve conversation context during fallback**

### Implementation

**Mode Selection:**
```typescript
// In ChatInterface
{voiceConfig.streamingMode ? (
  <StreamingModeController
    onTranscriptionComplete={handleTranscription}
    onCancel={handleCancel}
    onSwitchToNonStreaming={handleSwitchToNonStreaming}
  />
) : (
  <NonStreamingModeController
    onTranscriptionComplete={handleTranscription}
    onCancel={handleCancel}
  />
)}
```

**Auto-Fallback:**
```typescript
// In StreamingModeController
const [errorCount, setErrorCount] = useState(0);

const handleError = (error: Error) => {
  const newErrorCount = errorCount + 1;
  setErrorCount(newErrorCount);
  
  // After 2 errors, offer to switch
  if (newErrorCount >= 2 && onSwitchToNonStreaming) {
    setShowFallbackOption(true);
  }
};
```

### Why This Matters

- Non-streaming gives users more control
- Streaming provides better UX when it works
- Auto-fallback prevents frustration
- Users can always choose their preference

---

## Code Review Checklist

When reviewing voice-related code:

### Frontend
- [ ] Authorization header included in API calls
- [ ] API key fallback pattern used
- [ ] Error messages are user-friendly and actionable
- [ ] Debug logging added for troubleshooting
- [ ] Voice button visibility logic correct
- [ ] FormData used correctly for file uploads
- [ ] Voice config stored in sessionStorage
- [ ] Voice config cleared on logout

### Backend
- [ ] Voice routes protected with `authenticateToken`
- [ ] OpenAI service called with config object (not raw API key)
- [ ] Config includes `provider` field
- [ ] Error handling returns user-friendly messages
- [ ] Audit logging includes voice interactions
- [ ] File cleanup after transcription
- [ ] Rate limiting applied to voice endpoints

### TypeScript
- [ ] Proper types used (avoid `any`)
- [ ] Interfaces defined for all parameters
- [ ] Type guards for runtime validation
- [ ] No TypeScript errors in build

---

## Testing Checklist

When testing voice features:

### Manual Testing
- [ ] Login works
- [ ] Configuration saves correctly
- [ ] Voice button appears when expected
- [ ] Recording starts and stops
- [ ] Transcription succeeds
- [ ] Audio playback works
- [ ] Error messages are clear
- [ ] Fallback to text input works

### Browser Console
- [ ] No JavaScript errors
- [ ] Debug logs show correct values
- [ ] API calls succeed (200 status)
- [ ] Authorization header present

### Backend Logs
- [ ] No server errors
- [ ] Transcription requests logged
- [ ] Audit logs created
- [ ] File cleanup successful

### Error Scenarios
- [ ] Invalid API key handled gracefully
- [ ] Network errors handled
- [ ] Microphone permission denied handled
- [ ] Session expired handled
- [ ] Rate limit exceeded handled

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```typescript
// Don't pass raw API key to OpenAI service
await openaiService.transcribe(file, apiKey);

// Don't forget Authorization header
fetch('/api/voice/transcribe', { body: formData });

// Don't use generic error messages
throw new Error('Failed');

// Don't check only this.apiKey
if (!this.apiKey) throw new Error('No API key');

// Don't set Content-Type for FormData
headers['Content-Type'] = 'multipart/form-data';
```

### ✅ Do This Instead

```typescript
// Pass config object with provider
await openaiService.transcribe(file, { provider: 'openai', apiKey });

// Include Authorization header
const headers = {};
if (token) headers['Authorization'] = `Bearer ${token}`;
fetch('/api/voice/transcribe', { headers, body: formData });

// Use specific, actionable error messages
throw new Error('No API key configured. Please reconfigure your LLM provider.');

// Use fallback pattern
const apiKey = this.apiKey || this.llmConfig?.apiKey;
if (!apiKey) throw new Error('No API key');

// Let browser set Content-Type for FormData
// (don't set it manually)
```

---

## Documentation Requirements

When adding new voice features:

1. **Update user documentation** - `docs/VOICE_FEATURES_GUIDE.md`
2. **Update troubleshooting guide** - `docs/VOICE_TROUBLESHOOTING.md`
3. **Add to FAQ** - `README.md` voice FAQ section
4. **Document in code** - JSDoc comments on all public methods
5. **Update this steering doc** - If new patterns emerge

---

## Future Enhancements

When adding new voice features, consider:

- **AWS Bedrock voice support** - Will need similar patterns
- **Multi-language support** - May need language parameter
- **Custom voices** - May need voice training API
- **Offline support** - May need local transcription
- **Voice commands** - May need command parsing

Ensure new features follow these established patterns!

---

**Last Updated:** November 14, 2025  
**Version:** 2.4.1

