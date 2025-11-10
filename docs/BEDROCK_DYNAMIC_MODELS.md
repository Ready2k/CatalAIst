# Dynamic Bedrock Model Fetching

## Overview

CatalAIst now dynamically fetches available AWS Bedrock models based on your credentials and region, similar to how OpenAI models are fetched. This eliminates the need for hardcoded model lists and ensures users always see the models they have access to.

## Features

### Backend Implementation

1. **AWS SDK Integration**
   - Uses `@aws-sdk/client-bedrock` package
   - Calls `ListFoundationModels` API with `byProvider: 'Anthropic'` filter
   - Filters to ACTIVE Claude models only
   - Sorts by version (newest first)

2. **Fallback Mechanism**
   - If API call fails, returns static list of known models
   - Ensures system continues to work even with permission issues
   - Logs warnings for debugging

3. **Error Handling**
   - Graceful degradation on API failures
   - Timeout protection (30 seconds)
   - Retry logic with exponential backoff

### Frontend Implementation

1. **Automatic Model Loading**
   - Fetches models when AWS credentials are entered
   - Triggers on blur event after entering Access Key and Secret Key
   - Shows loading indicator during fetch

2. **User Experience**
   - Real-time feedback during model loading
   - Error messages if fetch fails
   - Falls back to default model list
   - Automatically selects first available model

3. **Credential Handling**
   - Credentials passed via HTTP headers
   - Supports session tokens for temporary credentials
   - Region-specific model listing

## API Usage

### List Bedrock Models

```bash
curl -X GET "http://localhost:8080/api/public/models?provider=bedrock" \
  -H "x-aws-access-key-id: YOUR_ACCESS_KEY_ID" \
  -H "x-aws-secret-access-key: YOUR_SECRET_ACCESS_KEY" \
  -H "x-aws-region: us-east-1"
```

**Note**: This is a public endpoint that doesn't require authentication, allowing users to fetch models during initial configuration.

### Response Format

```json
{
  "models": [
    {
      "id": "anthropic.claude-3-5-sonnet-20241022-v2:0",
      "created": 0,
      "ownedBy": "anthropic"
    },
    {
      "id": "anthropic.claude-3-5-haiku-20241022-v1:0",
      "created": 0,
      "ownedBy": "anthropic"
    }
  ]
}
```

## IAM Permissions

Your AWS credentials need the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:ListFoundationModels"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude*",
        "*"
      ]
    }
  ]
}
```

**Note**: The `bedrock:ListFoundationModels` permission is required for dynamic model fetching.

## Testing

Use the provided test script:

```bash
./backend/test-bedrock-models.sh YOUR_ACCESS_KEY YOUR_SECRET_KEY us-east-1
```

## Benefits

1. **Always Up-to-Date**: Users see the latest models available in their region
2. **Region-Specific**: Only shows models available in the selected AWS region
3. **Permission-Aware**: Only shows models the user has access to
4. **Consistent UX**: Same experience as OpenAI model selection
5. **No Code Updates**: New Bedrock models appear automatically

## Comparison: Before vs After

### Before
- Hardcoded list of Bedrock models in frontend
- Models might not be available in user's region
- Required code updates for new models
- No way to know which models user has access to

### After
- Dynamic fetching from AWS Bedrock API
- Region-specific model list
- Automatic updates when new models are released
- Shows only models user has permission to use

## Technical Details

### Backend Service (`bedrock.service.ts`)

```typescript
async listModels(config: LLMProviderConfig): Promise<ModelInfo[]> {
  const client = this.createBedrockClient(config);
  const command = new ListFoundationModelsCommand({
    byProvider: 'Anthropic',
  });
  const response = await client.send(command);
  
  return response.modelSummaries
    .filter(model => 
      model.modelId?.startsWith('anthropic.claude') &&
      model.modelLifecycle?.status === 'ACTIVE'
    )
    .map(model => ({
      id: model.modelId!,
      created: 0,
      ownedBy: model.providerName?.toLowerCase() || 'anthropic',
    }))
    .sort((a, b) => this.extractVersion(b.id).localeCompare(this.extractVersion(a.id)));
}
```

### Frontend Component (`LLMConfiguration.tsx`)

```typescript
const loadBedrockModels = async () => {
  setLoadingModels(true);
  try {
    const response = await apiService.listModels('bedrock', {
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion
    });
    if (response.models?.length > 0) {
      setModels(response.models);
    }
  } catch (err) {
    console.warn('Failed to load Bedrock models, using defaults:', err);
  } finally {
    setLoadingModels(false);
  }
};
```

## Troubleshooting

### No Models Returned

**Cause**: Missing `bedrock:ListFoundationModels` permission

**Solution**: Update IAM policy to include the permission

### Wrong Models Shown

**Cause**: Models filtered by region

**Solution**: Check that you've selected the correct AWS region

### API Call Fails

**Cause**: Network issues or invalid credentials

**Solution**: System falls back to default model list automatically

## Future Enhancements

Potential improvements:
- Cache model list to reduce API calls
- Support for other Bedrock providers (Titan, Jurassic, etc.)
- Model capability information (context window, pricing)
- Model availability status per region
- Favorite/pinned models

## Related Documentation

- [AWS Bedrock Setup Guide](../backend/AWS_BEDROCK_SETUP.md)
- [API Endpoints Documentation](../backend/API-ENDPOINTS.md)
- [Security Requirements](../.kiro/steering/security-requirements.md)
