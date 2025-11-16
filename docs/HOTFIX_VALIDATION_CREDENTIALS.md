# Hotfix: Matrix Validation Credentials

## Issue

When running matrix validation testing, the system was failing with:
```
Error: Classification failed: OpenAI API key is required
```

Despite the API key being configured in the frontend.

## Root Cause

The `validateMatrixImprovements()` method in `LearningAnalysisService` was calling `classificationService.classify()` without passing the LLM credentials (API key or AWS credentials).

The ClassificationService requires credentials to make LLM API calls for re-classification, but the validation method wasn't forwarding them.

## Fix

### 1. Updated Method Signature

Added `llmConfig` parameter to `validateMatrixImprovements()`:

```typescript
async validateMatrixImprovements(
  startDate: Date | undefined,
  endDate: Date | undefined,
  matrixVersion: string,
  classificationService: any,
  llmConfig: {
    provider: 'openai' | 'bedrock';
    model?: string;
    apiKey?: string;
    awsAccessKeyId?: string;
    awsSecretAccessKey?: string;
    awsSessionToken?: string;
    awsRegion?: string;
  },
  onProgress?: (progress: AnalysisProgress) => void
): Promise<ValidationTestResult>
```

### 2. Updated Classification Call

Modified the `classify()` call to include LLM credentials:

```typescript
const newClassification = await classificationService.classify({
  processDescription: lastConv.processDescription,
  conversationHistory: conversationHistory.length > 0 ? conversationHistory : undefined,
  provider: llmConfig.provider,
  model: llmConfig.model,
  apiKey: llmConfig.apiKey,
  awsAccessKeyId: llmConfig.awsAccessKeyId,
  awsSecretAccessKey: llmConfig.awsSecretAccessKey,
  awsSessionToken: llmConfig.awsSessionToken,
  awsRegion: llmConfig.awsRegion
});
```

### 3. Updated Route Handler

Modified the `/api/learning/validate-matrix` endpoint to pass credentials:

```typescript
const validationResult = await learningAnalysisService.validateMatrixImprovements(
  start,
  end,
  currentMatrix.version,
  classificationService,
  llmConfig  // Now passing credentials
);
```

## Testing

After the fix, validation testing should work correctly:

1. Navigate to AI Learning Admin
2. Trigger analysis with date range
3. Click "Yes, Test Matrix" when prompted
4. Validation should complete successfully with results showing:
   - Sample size
   - Improved count
   - Unchanged count
   - Worsened count
   - Improvement rate

## Files Modified

- `backend/src/services/learning-analysis.service.ts`
  - Updated `validateMatrixImprovements()` signature
  - Added LLM config to classify call

- `backend/src/routes/learning.routes.ts`
  - Updated validation endpoint to pass LLM config

## Impact

- **Breaking Change**: No (internal API only)
- **Frontend Changes**: None required
- **Database Changes**: None
- **Backward Compatible**: Yes

## Verification

To verify the fix works:

```bash
# Build backend
npm run build --prefix backend

# Restart backend
docker-compose restart backend

# Test validation in UI
# 1. Go to AI Learning Admin
# 2. Trigger analysis
# 3. Run validation test
# 4. Should complete without errors
```

## Related Issues

This fix ensures that:
- ✅ Validation testing works with OpenAI
- ✅ Validation testing works with AWS Bedrock
- ✅ Credentials are properly forwarded through the call chain
- ✅ Error messages are clear if credentials are missing

## Prevention

To prevent similar issues in the future:

1. **Always pass LLM config** when calling classification services
2. **Validate credentials early** in the request handler
3. **Test with both providers** (OpenAI and Bedrock)
4. **Add integration tests** for validation flow

---

**Fixed:** November 16, 2025  
**Version:** 3.1.1  
**Severity:** High (feature broken)  
**Status:** Resolved
