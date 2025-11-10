# AWS Bedrock Quick Start Guide

## 5-Minute Setup

### Step 1: Get AWS Credentials

You need AWS credentials with Bedrock access:

```bash
# Option A: Use existing AWS CLI credentials
aws configure

# Option B: Set environment variables
export AWS_ACCESS_KEY_ID="your_key_id"
export AWS_SECRET_ACCESS_KEY="your_secret_key"
export AWS_REGION="us-east-1"
```

### Step 2: Request Bedrock Model Access

1. Go to AWS Console → Bedrock → Model access
2. Request access to Claude models
3. Wait for approval (usually instant)

### Step 3: Test the Integration

```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "We manually process expense reports every week",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "YOUR_KEY",
    "awsSecretAccessKey": "YOUR_SECRET",
    "awsRegion": "us-east-1"
  }'
```

## Model Selection Guide

| Model | Use Case | Speed | Cost | Quality |
|-------|----------|-------|------|---------|
| `anthropic.claude-3-5-haiku-20241022-v1:0` | Development, Testing | ⚡⚡⚡ | 💰 | ⭐⭐⭐ |
| `anthropic.claude-3-5-sonnet-20241022-v2:0` | Production (Recommended) | ⚡⚡ | 💰💰 | ⭐⭐⭐⭐ |
| `anthropic.claude-3-opus-20240229-v1:0` | Complex Analysis | ⚡ | 💰💰💰 | ⭐⭐⭐⭐⭐ |

## Common Commands

### Using Environment Variables

```bash
# Set once
export AWS_ACCESS_KEY_ID="your_key"
export AWS_SECRET_ACCESS_KEY="your_secret"
export AWS_REGION="us-east-1"

# Then use without credentials in request
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Manual data entry process",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0"
  }'
```

### Docker Compose

Add to your `.env` file:

```env
AWS_ACCESS_KEY_ID=your_key_id
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
```

Then restart:

```bash
docker-compose down
docker-compose up -d
```

## IAM Policy (Minimum Required)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "bedrock:InvokeModel",
      "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude*"
    }
  ]
}
```

## Troubleshooting

### Error: "Missing AWS credentials"
→ Add `awsAccessKeyId` and `awsSecretAccessKey` to your request

### Error: "Access Denied"
→ Check IAM permissions and Bedrock model access

### Error: "Model not found"
→ Verify model is available in your region

### Error: "Throttling"
→ System will auto-retry; consider requesting quota increase

## Cost Comparison

**Example**: 1000 classifications per month, ~2000 tokens each

| Provider | Model | Monthly Cost |
|----------|-------|--------------|
| AWS Bedrock | Claude 3.5 Haiku | ~$2-5 |
| AWS Bedrock | Claude 3.5 Sonnet | ~$10-30 |
| OpenAI | GPT-4 | ~$60-120 |
| OpenAI | GPT-3.5 Turbo | ~$2-4 |

## Next Steps

- 📖 Read [AWS_BEDROCK_SETUP.md](backend/AWS_BEDROCK_SETUP.md) for detailed setup
- 💻 Check [BEDROCK_EXAMPLES.md](backend/BEDROCK_EXAMPLES.md) for code examples
- 🔍 Review [AWS_BEDROCK_INTEGRATION_SUMMARY.md](AWS_BEDROCK_INTEGRATION_SUMMARY.md) for architecture details

## Support

- AWS Bedrock Docs: https://docs.aws.amazon.com/bedrock/
- Claude Model Cards: https://www.anthropic.com/claude
- CatalAIst Issues: [GitHub Issues](https://github.com/your-repo/issues)
