# Voice API Configuration Fix

**Date:** November 14, 2025  
**Issue:** "OpenAI API key is required" error in backend despite API key being sent  
**Status:** ✅ Fixed

---

## Problem

Users were getting "OpenAI API key is required" error from the backend when trying to transcribe audio, even though:
- The API key was configured in the frontend
- The API key was being sent in the request
- The frontend showed `hasApiKey: true`

### Error Stack Trace
```
Error transcribing audio: Error: OpenAI API key is required
    at OpenAIService.transcribe (/app/dist/backend/src/services/openai.service.js:64:19)
    at /app/dist/backend/src/routes/voice.routes.js:92:57
```

### Root Cause

The voice routes were calling OpenAI service methods with incorrect parameter format.

**OpenAI Service Method Signature:**
```typescript
async transcribe(
  audioFile: any,
  config: LLMProviderConfig  // Expects config object
): Promise<TranscriptionResponse>

async synthesize(
  text: string,
  voice: string,
  config: LLMProviderConfig  // Expects config object
): Promise<Buffer>
```

**LLMProviderConfig Interface:**
```typescript
export interface LLMProviderConfig {
  provider: 'openai' | 'bedrock';  // Required!
  apiKey?: string;
  // ... other fields
}
```

**Voice Routes (WRONG):**
```typescript
// ❌ Passing apiKey as string instead of config object
await openaiService.transcribe(fileStream, apiKey);
await openaiService.synthesize(text, voice, apiKey);
```

The methods expected a config object with `provider` and `apiKey` properties, but were receiving just the API key string.

---

## Solution

### Files Changed

**`backend/src/routes/voice.routes.ts`**

#### transcribe endpoint (line 103)

**Before:**
```typescript
const transcriptionResult = await openaiService.transcribe(fileStream, apiKey);
```

**After:**
```typescript
const transcriptionResult = await openaiService.transcribe(fileStream, { 
  provider: 'openai',
  apiKey 
});
```

#### synthesize endpoint (line 221)

**Before:**
```typescript
audioBuffer = await openaiService.synthesize(text, voice as any, apiKey);
```

**After:**
```typescript
audioBuffer = await openaiService.synthesize(text, voice as any, { 
  provider: 'openai',
  apiKey 
});
```

---

## Testing

### Before Fix
1. Login ✅
2. Configure OpenAI API key ✅
3. Start recording ✅
4. Stop recording ✅
5. **Result:** ❌ Backend error: "OpenAI API key is required"

### After Fix
1. Login ✅
2. Configure OpenAI API key ✅
3. Start recording ✅
4. Stop recording ✅
5. **Result:** ✅ Transcription succeeds!

---

## Deployment

### Build Backend
```bash
cd backend
npm run build
```

### Restart Backend Container
```bash
docker-compose restart backend
```

### Verification
```bash
# Check backend logs
docker-compose logs -f backend

# Should see successful transcription logs
```

---

## Technical Details

### Why This Happened

1. **Interface Change:** The OpenAI service was refactored to use a unified `LLMProviderConfig` interface
2. **Voice Routes Not Updated:** The voice routes were written before this refactoring
3. **TypeScript Not Catching:** The voice routes were using `any` types in some places, bypassing type checking
4. **Runtime Error:** The error only appeared at runtime when the OpenAI service tried to extract `apiKey` from the config

### The Fix Chain

1. **Frontend sends:** FormData with `apiKey` field ✅
2. **Backend receives:** `req.body.apiKey` extracted by multer ✅
3. **Voice route creates:** Config object `{ provider: 'openai', apiKey }` ✅
4. **OpenAI service receives:** Proper config object ✅
5. **OpenAI service extracts:** `config.apiKey` ✅
6. **OpenAI client created:** With valid API key ✅
7. **Transcription succeeds:** ✅

---

## Related Issues

This fix also ensures:
- Proper error handling (correct error messages)
- Type safety (proper TypeScript types)
- Future compatibility (works with interface changes)
- Consistent patterns (same config format everywhere)

---

## Prevention

### Code Review Checklist

When calling OpenAI service methods:
- [ ] Pass config object, not raw API key
- [ ] Include `provider: 'openai'` in config
- [ ] Include `apiKey` in config
- [ ] Use proper TypeScript types (avoid `any`)
- [ ] Test with actual API calls

### TypeScript Best Practices

- ✅ Use strict types (avoid `any`)
- ✅ Define interfaces for all parameters
- ✅ Enable strict null checks
- ✅ Use type guards for runtime validation

---

## Additional Fixes in This Session

### 1. Authentication Headers (First Fix)
- Added JWT token to voice API requests
- Fixed "No token provided" error

### 2. API Key Fallback (Second Fix)
- Added fallback to `llmConfig.apiKey`
- Added debug logging

### 3. Config Object Format (This Fix)
- Fixed parameter format for OpenAI service calls
- Added `provider` field to config

---

## Complete Fix Summary

### Frontend Changes
- ✅ Added Authorization header with JWT token
- ✅ Added API key fallback logic
- ✅ Added debug logging

### Backend Changes
- ✅ Fixed transcribe call to use config object
- ✅ Fixed synthesize call to use config object
- ✅ Added provider field to config

### Result
Voice features now work end-to-end! 🎉

---

## Verification Steps

1. **Login to application**
   ```
   Username: admin
   Password: [your password]
   ```

2. **Configure OpenAI**
   - Go to Configuration tab
   - Select OpenAI provider
   - Enter API key
   - Select model
   - Click Save

3. **Test Voice Recording**
   - Click microphone button
   - Click "Start Recording"
   - Speak clearly
   - Click "Stop Recording"
   - Should see transcription appear ✅

4. **Test Voice Playback** (if applicable)
   - Answer clarification questions
   - Should hear questions read aloud ✅

5. **Check Logs**
   ```bash
   # Frontend logs (browser console)
   # Should see: "Transcribing audio with: {hasApiKey: true, ...}"
   
   # Backend logs
   docker-compose logs -f backend
   # Should see successful transcription logs
   ```

---

## Performance Impact

- ✅ No performance impact
- ✅ Same number of API calls
- ✅ Same latency
- ✅ Just fixes broken functionality

---

## Security Impact

- ✅ No security impact
- ✅ API key still encrypted in transit
- ✅ JWT authentication still required
- ✅ Same security posture

---

## Lessons Learned

1. **Type Safety Matters:** Using `any` types hides bugs
2. **Test End-to-End:** Unit tests might pass but integration fails
3. **Interface Changes:** Update all callers when interfaces change
4. **Error Messages:** Make them specific and actionable
5. **Debug Logging:** Add logging for troubleshooting

---

**Status:** ✅ Fixed and deployed  
**Version:** 2.4.1  
**Priority:** Critical (blocking feature)  
**Severity:** High (complete feature failure)

