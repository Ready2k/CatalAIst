# AWS Bedrock Integration

CatalAIst now supports AWS Bedrock as an alternative LLM provider alongside OpenAI. This allows you to use Claude models via AWS Bedrock.

## Supported Models

### AWS Bedrock (Claude Models)
- `anthropic.claude-3-5-sonnet-20241022-v2:0` (Latest Claude 3.5 Sonnet)
- `anthropic.claude-3-5-sonnet-20240620-v1:0`
- `anthropic.claude-3-5-haiku-20241022-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`
- `anthropic.claude-3-sonnet-20240229-v1:0`
- `anthropic.claude-3-haiku-20240307-v1:0`
- `anthropic.claude-v2:1`
- `anthropic.claude-v2`
- `anthropic.claude-instant-v1`

### OpenAI (Existing Support)
- `gpt-4`
- `gpt-4-turbo`
- `gpt-4o`
- `gpt-3.5-turbo`
- `o1-preview`
- `o1-mini`

## AWS Credentials Setup

### Option 1: AWS CLI Credentials

If you have AWS CLI configured, you can use your existing credentials:

```bash
# Set environment variables
export AWS_ACCESS_KEY_ID=your_access_key_id
export AWS_SECRET_ACCESS_KEY=your_secret_access_key
export AWS_SESSION_TOKEN=your_session_token  # Optional, for temporary credentials
export AWS_REGION=us-east-1  # Or your preferred region
```

### Option 2: Pass Credentials in API Requests

You can pass AWS credentials directly in your API requests (see API Usage below).

### Option 3: Docker Compose

Update your `docker-compose.yml` or create a `.env` file:

```env
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
AWS_SESSION_TOKEN=your_session_token  # Optional
AWS_REGION=us-east-1
```

## AWS Bedrock Prerequisites

1. **AWS Account**: You need an active AWS account
2. **Bedrock Access**: Request access to Claude models in AWS Bedrock console
3. **IAM Permissions**: Your AWS credentials need the following permissions:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "bedrock:InvokeModel"
         ],
         "Resource": "arn:aws:bedrock:*::foundation-model/anthropic.claude*"
       }
     ]
   }
   ```

## API Usage

### Automatic Provider Detection

The system automatically detects the provider based on the model name:
- Models starting with `anthropic.claude` → Bedrock
- Models starting with `gpt-` or `o1-` → OpenAI

### Submit Process with Bedrock

```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "We manually process expense reports every week",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
    "awsSecretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY",
    "awsRegion": "us-east-1",
    "userId": "user123"
  }'
```

### Explicit Provider Selection

You can also explicitly specify the provider:

```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "We manually process expense reports every week",
    "provider": "bedrock",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "YOUR_AWS_ACCESS_KEY_ID",
    "awsSecretAccessKey": "YOUR_AWS_SECRET_ACCESS_KEY",
    "awsSessionToken": "YOUR_SESSION_TOKEN",
    "awsRegion": "us-east-1",
    "userId": "user123"
  }'
```

### Using OpenAI (Existing Behavior)

```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "We manually process expense reports every week",
    "model": "gpt-4",
    "apiKey": "YOUR_OPENAI_API_KEY",
    "userId": "user123"
  }'
```

## Request Parameters

### Common Parameters
- `description` (required): Process description
- `model` (optional): Model to use (defaults to `gpt-4`)
- `userId` (optional): User identifier (defaults to `anonymous`)
- `sessionId` (optional): Existing session ID to continue

### OpenAI Parameters
- `apiKey` (required for OpenAI): Your OpenAI API key
- `provider` (optional): Set to `openai` to explicitly use OpenAI

### AWS Bedrock Parameters
- `awsAccessKeyId` (required for Bedrock): AWS Access Key ID
- `awsSecretAccessKey` (required for Bedrock): AWS Secret Access Key
- `awsSessionToken` (optional): AWS Session Token for temporary credentials
- `awsRegion` (optional): AWS region (defaults to `us-east-1`)
- `provider` (optional): Set to `bedrock` to explicitly use Bedrock

## Architecture

The system uses a provider abstraction layer:

```
┌─────────────────┐
│   API Routes    │
└────────┬────────┘
         │
┌────────▼────────┐
│  LLM Service    │  (Factory/Facade)
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼──┐  ┌──▼────┐
│OpenAI│  │Bedrock│
└──────┘  └───────┘
```

### Key Components

1. **ILLMProvider Interface** (`llm-provider.interface.ts`)
   - Common interface for all LLM providers
   - Defines chat, transcribe, synthesize, and listModels methods

2. **LLMService** (`llm.service.ts`)
   - Factory pattern to select appropriate provider
   - Handles provider detection and configuration

3. **OpenAIService** (`openai.service.ts`)
   - Implements ILLMProvider for OpenAI
   - Supports GPT models, Whisper, and TTS

4. **BedrockService** (`bedrock.service.ts`)
   - Implements ILLMProvider for AWS Bedrock
   - Supports Claude models via AWS SDK

## Features

### Supported Operations

| Feature | OpenAI | Bedrock |
|---------|--------|---------|
| Chat Completion | ✅ | ✅ |
| Audio Transcription | ✅ | ❌ |
| Text-to-Speech | ✅ | ❌ |
| Model Listing | ✅ | ✅ |

### Automatic Features

- **Retry Logic**: Exponential backoff for transient errors
- **Timeout Handling**: 30-second timeout for chat completions
- **Error Handling**: Provider-specific error messages
- **Model Validation**: Checks if model is supported by provider

## Testing

### Test Bedrock Connection

```bash
# Test with a simple classification
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Manual data entry process that takes 2 hours daily",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "YOUR_KEY",
    "awsSecretAccessKey": "YOUR_SECRET",
    "awsRegion": "us-east-1"
  }'
```

### Expected Response

```json
{
  "sessionId": "uuid-here",
  "classification": {
    "category": "RPA",
    "confidence": 0.85,
    "rationale": "...",
    "categoryProgression": "...",
    "futureOpportunities": "...",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "modelUsed": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "llmProvider": "bedrock"
  }
}
```

## Troubleshooting

### Common Issues

1. **"Missing AWS credentials"**
   - Ensure `awsAccessKeyId` and `awsSecretAccessKey` are provided
   - Check environment variables are set correctly

2. **"Access Denied" or "UnauthorizedException"**
   - Verify IAM permissions include `bedrock:InvokeModel`
   - Check model access is enabled in Bedrock console

3. **"Model not found"**
   - Verify the model ID is correct
   - Ensure model is available in your AWS region
   - Request access to the model in Bedrock console

4. **"Throttling" errors**
   - Bedrock has rate limits per model
   - The system automatically retries with exponential backoff
   - Consider requesting quota increases in AWS console

### Debug Mode

Enable debug logging:

```bash
export LOG_LEVEL=debug
```

## Cost Considerations

### AWS Bedrock Pricing

- Charged per 1,000 input/output tokens
- Pricing varies by model and region
- See [AWS Bedrock Pricing](https://aws.amazon.com/bedrock/pricing/)

### OpenAI Pricing

- Charged per 1,000 tokens
- Pricing varies by model
- See [OpenAI Pricing](https://openai.com/pricing)

## Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for credentials
3. **Rotate credentials** regularly
4. **Use IAM roles** when running on AWS infrastructure
5. **Implement least privilege** IAM policies
6. **Monitor usage** through AWS CloudWatch and OpenAI dashboard

## Migration Guide

### From OpenAI to Bedrock

To migrate existing code from OpenAI to Bedrock:

1. Replace `apiKey` with AWS credentials:
   ```diff
   - "apiKey": "sk-..."
   + "awsAccessKeyId": "AKIA...",
   + "awsSecretAccessKey": "...",
   + "awsRegion": "us-east-1"
   ```

2. Update model name:
   ```diff
   - "model": "gpt-4"
   + "model": "anthropic.claude-3-5-sonnet-20241022-v2:0"
   ```

3. That's it! The API interface remains the same.

## Future Enhancements

Planned features:
- Support for more Bedrock models (Titan, Jurassic, etc.)
- Streaming responses
- Cost tracking and analytics
- Multi-region failover
- Bedrock Agents integration
