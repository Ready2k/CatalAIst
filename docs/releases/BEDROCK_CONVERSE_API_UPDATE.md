# Bedrock Converse API Support

## Overview

Updated CatalAIst to support AWS Bedrock's newer **Converse API** alongside the existing InvokeModel API. This enables support for Amazon Nova models and provides better performance for newer models.

## What Changed

### 1. Dual API Support

The Bedrock service now intelligently chooses between two APIs:

- **Converse API** (newer, recommended)
  - Required for: Amazon Nova models
  - Better for: Newer Claude models, inference profiles
  - Advantages: Better error handling, standardized format, optimized routing

- **InvokeModel API** (legacy, still supported)
  - Used for: Older Claude models
  - Maintains: Backward compatibility

### 2. Automatic API Selection

The system automatically chooses the appropriate API based on the model:

```typescript
// Models that use Converse API:
- amazon.nova-* (Nova models - REQUIRED)
- anthropic.claude-3-5-* (newer Claude models)
- anthropic.claude-haiku-4-* (newer Haiku models)
- us.*, eu.*, ap.* (inference profiles)

// Models that use InvokeModel API:
- anthropic.claude-v2* (older Claude models)
- anthropic.claude-3-* (older Claude 3 models)
```

### 3. Nova Model Support

Added support for Amazon Nova models:

- `amazon.nova-micro-v1:0` - Fastest, most cost-effective
- `amazon.nova-lite-v1:0` - Balanced performance and cost
- `amazon.nova-pro-v1:0` - Highest capability

## Benefits

### For Nova Models
- **Required**: Nova models only work with Converse API
- **Better routing**: Optimized for On-Demand access
- **Improved error handling**: Clearer error messages

### For All Models
- **Future-proof**: Converse API is AWS's recommended approach
- **Consistent format**: Standardized request/response format
- **Better performance**: Optimized for newer models

## Usage

No changes required for existing users. The system automatically:

1. Detects the model type
2. Chooses the appropriate API
3. Handles the request/response conversion

### Example Nova Usage

```bash
# In CatalAIst configuration, select:
Model: amazon.nova-lite-v1:0
Provider: AWS Bedrock
Region: us-east-1
```

The system will automatically use the Converse API for Nova models.

## Technical Details

### Request Format Differences

**InvokeModel API** (legacy):
```json
{
  "anthropic_version": "bedrock-2023-05-31",
  "max_tokens": 4096,
  "messages": [{"role": "user", "content": "Hello"}],
  "system": "You are a helpful assistant"
}
```

**Converse API** (new):
```json
{
  "modelId": "amazon.nova-lite-v1:0",
  "messages": [{"role": "user", "content": [{"text": "Hello"}]}],
  "system": [{"text": "You are a helpful assistant"}],
  "inferenceConfig": {"maxTokens": 4096}
}
```

### Response Handling

Both APIs are normalized to the same internal format, ensuring consistent behavior across all models.

## Error Handling

Enhanced error handling for both APIs:

- **Provisioned Throughput**: Clear messages when models require provisioned capacity
- **Access Denied**: Better guidance for IAM permission issues
- **Model Not Found**: Helpful suggestions for model availability

## Backward Compatibility

- ✅ Existing Claude models continue to work
- ✅ No configuration changes required
- ✅ Same API interface for frontend
- ✅ Existing error handling preserved

## Troubleshooting

### Nova Models Not Working

1. **Check Region**: Nova models may not be available in all regions
2. **Verify Access**: Ensure model access is enabled in Bedrock console
3. **IAM Permissions**: Verify `bedrock:InvokeModel` permission
4. **Model ID**: Use correct format (e.g., `amazon.nova-lite-v1:0`)

### API Selection Issues

The system logs which API is being used:

```
[Bedrock] Using Converse API for model: amazon.nova-lite-v1:0
[Bedrock] Using InvokeModel API for model: anthropic.claude-v2:1
```

Check logs if you suspect incorrect API selection.

## Implementation Notes

### Code Changes

1. **Added imports**: `ConverseCommand`, `Message`, `ContentBlock`
2. **New methods**: `chatWithConverse()`, `parseConverseResponse()`, `convertToConverseFormat()`
3. **Smart routing**: `shouldUseConverseAPI()` determines API choice
4. **Enhanced model support**: Updated `isModelSupported()` for Nova models

### Testing

- ✅ Tested with existing Claude models (InvokeModel API)
- ✅ Tested with inference profiles (Converse API)
- ✅ Added Nova models to fallback list
- ✅ Verified error handling for both APIs

## Future Considerations

1. **Migration Path**: Eventually migrate all models to Converse API
2. **New Models**: Future AWS models will likely require Converse API
3. **Performance**: Monitor performance differences between APIs
4. **Features**: Converse API may support additional features (streaming, etc.)

## References

- [AWS Bedrock Converse API Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html)
- [Amazon Nova Models](https://docs.aws.amazon.com/bedrock/latest/userguide/nova-models.html)
- [Bedrock API Migration Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference-migrate.html)

---

**Date**: December 21, 2025  
**Version**: CatalAIst v3.0.1  
**Impact**: Enhanced model support, Nova compatibility  
**Breaking Changes**: None