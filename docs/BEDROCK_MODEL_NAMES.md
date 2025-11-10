# AWS Bedrock Model Name Reference

## Console Names vs. API Model IDs

AWS Bedrock console shows user-friendly names, but the API uses technical model IDs. Here's the mapping:

### Current Models (as of November 2025)

| AWS Console Name | API Model ID | Status |
|-----------------|--------------|--------|
| Claude 3.7 Sonnet | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Latest |
| Claude 3.5 Sonnet | `anthropic.claude-3-5-sonnet-20240620-v1:0` | Previous version |
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5-20251001-v1:0` | Latest Haiku |
| Claude 3.5 Haiku | `anthropic.claude-3-5-haiku-20241022-v1:0` | Previous Haiku |
| Claude 3 Opus | `anthropic.claude-3-opus-20240229-v1:0` | Legacy |
| Claude 3 Sonnet | `anthropic.claude-3-sonnet-20240229-v1:0` | Legacy |
| Claude 3 Haiku | `anthropic.claude-3-haiku-20240307-v1:0` | Legacy |
| Claude 2.1 | `anthropic.claude-v2:1` | Legacy |
| Claude 2 | `anthropic.claude-v2` | Legacy |
| Claude Instant | `anthropic.claude-instant-v1` | Legacy |

## Understanding Model IDs

Model IDs follow this pattern:
```
anthropic.claude-{version}-{variant}-{date}-{revision}:{api-version}
```

Examples:
- `anthropic.claude-3-5-sonnet-20241022-v2:0`
  - Version: 3.5
  - Variant: sonnet
  - Date: 2024-10-22
  - Revision: v2
  - API Version: 0

- `anthropic.claude-haiku-4-5-20251001-v1:0`
  - Version: 4.5
  - Variant: haiku
  - Date: 2025-10-01
  - Revision: v1
  - API Version: 0

## Model Lifecycle Status

AWS assigns lifecycle statuses to models:

- **ACTIVE**: Latest recommended models
- **LEGACY**: Older models that still work (AWS may show as "access granted")
- **DEPRECATED**: Models being phased out (may still work)

**Important**: CatalAIst shows ALL models regardless of status, because LEGACY models still work perfectly fine.

## Throughput Types

AWS Bedrock offers two throughput types:

- **On-Demand**: Pay per use, no commitment (most common)
- **Provisioned Throughput**: Purchase dedicated capacity, requires setup

**Important**: CatalAIst only shows models available with On-Demand access. Models that require Provisioned Throughput (like Claude Haiku 4.5) are automatically filtered out.

## Why "Claude 3.7"?

AWS marketing sometimes uses version numbers that don't match the technical model IDs:
- "Claude 3.7 Sonnet" is actually Claude 3.5 Sonnet v2
- The "3.7" likely refers to internal improvements or capabilities
- The API still calls it `claude-3-5-sonnet` with revision `v2`

## Checking Your Available Models

1. **AWS Console**: Go to AWS Bedrock → Model access
2. **CatalAIst Logs**: Check backend console for `[Bedrock]` logs
3. **Audit Trail**: View model_list_success events in Audit Logs tab

## Troubleshooting

### "I see the model in AWS console but not in CatalAIst"

1. Check backend console logs for the exact model IDs returned
2. Verify the model ID starts with `anthropic.claude`
3. Check if there are any error messages in the logs
4. Verify IAM permissions include `bedrock:ListFoundationModels`

### "Only one model shows up"

This was a previous issue where we filtered by lifecycle status. Now fixed - all models with On-Demand access are shown regardless of status.

### "Claude Haiku 4.5 doesn't appear in the list"

Claude Haiku 4.5 requires Provisioned Throughput and is not available with On-Demand access. CatalAIst automatically filters it out. If you need this model, you must:
1. Purchase Provisioned Throughput in AWS Bedrock console
2. Create a provisioned model endpoint
3. Use that endpoint (not supported in CatalAIst currently)

### "Error: requires Provisioned Throughput"

This means you selected a model that's not available with On-Demand access. Select a different model from the dropdown. The system should have filtered these out, but if you see this error, it means the model was added to your account after the list was fetched.

### "Model names don't match AWS console"

This is expected. AWS console uses marketing names, while the API uses technical IDs. Use the table above to map between them.

## Recommendations

### For Production
- **Claude 3.7 Sonnet** (`anthropic.claude-3-5-sonnet-20241022-v2:0`) - Best overall performance
- **Claude Haiku 4.5** (`anthropic.claude-haiku-4-5-20251001-v1:0`) - Fast and cost-effective

### For Development/Testing
- **Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`) - Cheapest option
- **Claude 3.5 Haiku** (`anthropic.claude-3-5-haiku-20241022-v1:0`) - Good balance

### For Complex Tasks
- **Claude 3 Opus** (`anthropic.claude-3-opus-20240229-v1:0`) - Most capable (if available)
- **Claude 3.7 Sonnet** - Excellent alternative to Opus

## Related Documentation

- [AWS Bedrock Setup Guide](../backend/AWS_BEDROCK_SETUP.md)
- [Dynamic Model Fetching](./BEDROCK_DYNAMIC_MODELS.md)
- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
