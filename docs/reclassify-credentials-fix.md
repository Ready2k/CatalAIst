# Reclassify Credentials Fix

## Issue
The reclassify feature was failing with error: "OpenAI API key is required" even when users had configured their LLM credentials.

**Error Message:**
```
POST http://localhost/api/process/reclassify 400 (Bad Request)
Reclassify error: Error: OpenAI API key is required
```

## Root Cause
The `SessionDetailModal` component was trying to read LLM credentials from `sessionStorage.getItem('llmCredentials')`, but this key was never being set. The credentials were only stored in the `ApiService` instance (`this.llmConfig`), which is not accessible from the modal component.

## Solution

### 1. Store Credentials in sessionStorage
Modified `frontend/src/services/api.ts` to persist credentials when they're configured:

```typescript
setLLMConfig(config: LLMConfig) {
  this.llmConfig = config;
  if (config.apiKey) {
    this.apiKey = config.apiKey;
  }
  // Store credentials in sessionStorage for reclassify and other admin operations
  sessionStorage.setItem('llmCredentials', JSON.stringify(config));
}
```

### 2. Clear Credentials on Logout
Updated the `clearSession()` method to remove credentials:

```typescript
clearSession() {
  this.apiKey = null;
  this.sessionId = null;
  this.llmConfig = null;
  // Clear credentials from sessionStorage
  sessionStorage.removeItem('llmCredentials');
}
```

### 3. Improved Error Handling
Enhanced `SessionDetailModal.tsx` to provide better error messages when credentials are missing:

```typescript
const credentialsStr = sessionStorage.getItem('llmCredentials');

if (!credentialsStr) {
  throw new Error('No LLM credentials found. Please reconfigure your LLM provider in the Configuration tab.');
}

const credentials = JSON.parse(credentialsStr);

// Validate credentials based on provider
if (session.classification?.llmProvider === 'bedrock') {
  if (!credentials.awsAccessKeyId || !credentials.awsSecretAccessKey) {
    throw new Error('AWS credentials are incomplete. Please reconfigure your AWS Bedrock provider in the Configuration tab.');
  }
} else {
  if (!credentials.apiKey) {
    throw new Error('OpenAI API key is missing. Please reconfigure your OpenAI provider in the Configuration tab.');
  }
}
```

## Testing

### To Test the Fix:
1. Login to the application
2. Configure your LLM provider (OpenAI or AWS Bedrock) in the Configuration tab
3. Submit a process description and get it classified
4. Navigate to Analytics or Admin Review
5. Click on a session to view details
6. Click the "🔄 Reclassify" button
7. Verify that reclassification succeeds without credential errors

### Expected Behavior:
- ✅ Credentials are stored when LLM is configured
- ✅ Reclassify button works without errors
- ✅ Clear error messages if credentials are missing
- ✅ Credentials are cleared on logout

## Security Considerations

**Note:** Storing credentials in sessionStorage is acceptable because:
- sessionStorage is cleared when the browser tab is closed
- sessionStorage is not accessible across different origins
- The logout handler explicitly clears all sessionStorage data
- Credentials are already being sent to the backend for API calls

However, for production deployments, consider:
- Using secure, httpOnly cookies for credential storage
- Implementing credential encryption at rest
- Adding credential expiration/refresh mechanisms
- Implementing proper CORS and CSP headers

## Files Modified
- `frontend/src/services/api.ts` - Added credential persistence
- `frontend/src/components/SessionDetailModal.tsx` - Improved error handling

## Related Issues
- Reclassify feature not working for admin users
- Missing credential validation in admin operations
- Inconsistent credential storage patterns

---

**Fixed:** November 16, 2025  
**Version:** 3.0.0
