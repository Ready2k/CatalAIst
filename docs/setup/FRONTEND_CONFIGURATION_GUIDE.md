# Frontend Configuration Guide - AWS Bedrock Support

## Overview

The CatalAIst frontend now includes a comprehensive configuration interface that supports both OpenAI and AWS Bedrock providers. Users can easily switch between providers and configure their credentials through an intuitive tab-based interface.

## New Configuration Page

### Location
Navigate to the **Configuration** tab in the main navigation bar.

### Features

#### 1. Provider Selection Tabs
- **OpenAI Tab**: Configure OpenAI API key and select GPT models
- **AWS Bedrock Tab**: Configure AWS credentials and select Claude models

#### 2. OpenAI Configuration

**Required Fields:**
- **OpenAI API Key**: Your API key from OpenAI Platform (starts with `sk-`)
- **Model**: Select from available GPT models

**Features:**
- Automatic model loading when valid API key is entered
- Real-time validation of API key format
- Link to OpenAI Platform for getting API keys

**Supported Models:**
- GPT-4 (recommended)
- GPT-4 Turbo
- GPT-4o
- GPT-3.5 Turbo
- O1 Preview
- O1 Mini

#### 3. AWS Bedrock Configuration

**Required Fields:**
- **AWS Access Key ID**: Your AWS access key (starts with `AKIA` or `ASIA`)
- **AWS Secret Access Key**: Your AWS secret key

**Optional Fields:**
- **AWS Session Token**: For temporary credentials (STS)

**Advanced Options:**
- **AWS Region**: Select from available Bedrock regions (defaults to us-east-1)

**Features:**
- Region selector with all Bedrock-enabled regions
- Advanced options toggle for temporary credentials
- Helpful setup instructions and documentation links
- Real-time validation of AWS credential format

**Supported Models:**
- Claude 3.5 Sonnet (recommended for production)
- Claude 3.5 Haiku (fast and cost-effective)
- Claude 3 Opus (most capable)
- Claude 3 Sonnet
- Claude 3 Haiku

**Supported Regions:**
- us-east-1 (N. Virginia)
- us-west-2 (Oregon)
- ap-southeast-1 (Singapore)
- ap-northeast-1 (Tokyo)
- eu-central-1 (Frankfurt)
- eu-west-2 (London)

#### 4. Success Confirmation

After saving configuration, users see a confirmation message showing:
- Provider name (OpenAI or AWS Bedrock)
- Selected model
- AWS region (for Bedrock)
- Confirmation that they can now use the Classifier

## User Experience Flow

### First-Time User

1. **Welcome Screen**: User sees welcome message prompting them to configure LLM provider
2. **Navigate to Configuration**: Click "Go to Configuration" button
3. **Choose Provider**: Select OpenAI or AWS Bedrock tab
4. **Enter Credentials**: Fill in required fields
5. **Select Model**: Choose appropriate model for their use case
6. **Save Configuration**: Click "Save Configuration" button
7. **Confirmation**: See success message
8. **Start Classifying**: Navigate back to Classifier tab

### Switching Providers

Users can easily switch between providers:
1. Go to Configuration tab
2. Click on different provider tab
3. Enter new credentials
4. Save configuration
5. New provider is immediately active

### Updating Configuration

To change model or credentials:
1. Go to Configuration tab
2. Update desired fields
3. Click "Save Configuration"
4. Changes take effect immediately

## Technical Implementation

### Component Structure

```
LLMConfiguration.tsx
├── Provider Tabs (OpenAI / Bedrock)
├── OpenAI Form
│   ├── API Key Input
│   └── Model Selector
├── Bedrock Form
│   ├── AWS Access Key ID Input
│   ├── AWS Secret Access Key Input
│   ├── Session Token Input (Optional)
│   └── Advanced Options
│       └── Region Selector
└── Submit Button
```

### State Management

The configuration is stored in:
- **App.tsx**: Main application state
  - `hasConfig`: Boolean indicating if configuration is set
  - `llmConfig`: Complete LLM configuration object
- **ApiService**: API service singleton
  - Stores configuration for use in API requests
  - Automatically includes correct credentials

### Configuration Object

```typescript
interface LLMConfig {
  provider: 'openai' | 'bedrock';
  model: string;
  // OpenAI
  apiKey?: string;
  // AWS Bedrock
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsRegion?: string;
}
```

### API Integration

When making API requests, the frontend automatically includes:
- Provider type
- Model name
- Appropriate credentials (API key for OpenAI, AWS credentials for Bedrock)

Example request body:
```json
{
  "description": "Process description",
  "sessionId": "session-id",
  "provider": "bedrock",
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "awsAccessKeyId": "AKIA...",
  "awsSecretAccessKey": "...",
  "awsRegion": "us-east-1"
}
```

## Validation

### OpenAI Validation
- API key must start with `sk-`
- API key must be at least 20 characters
- Model must be selected

### Bedrock Validation
- AWS Access Key ID must start with `AKIA` or `ASIA`
- AWS Secret Access Key is required
- Region must be selected
- Session token is optional

### Error Messages

Clear, actionable error messages are displayed:
- "API key is required"
- "Invalid API key format. OpenAI API keys start with 'sk-'"
- "AWS Access Key ID is required"
- "Invalid AWS Access Key ID format"

## Security

### Credential Storage
- Credentials are stored in memory only (session-based)
- Never persisted to localStorage or cookies
- Cleared when session ends
- Not sent to any third parties

### Password Fields
- API keys and secret keys use password input type
- Credentials are masked in the UI
- Not visible in browser developer tools

### HTTPS
- All API requests use HTTPS in production
- Credentials encrypted in transit

## Voice Features

### Provider Limitations

**OpenAI:**
- ✅ Voice transcription (Whisper)
- ✅ Text-to-speech (TTS)

**AWS Bedrock:**
- ❌ Voice transcription (not available)
- ❌ Text-to-speech (not available)

### User Experience

When using Bedrock:
- Voice recorder button is still visible
- Attempting to use voice features shows helpful error message
- Error explains that voice features require OpenAI provider
- User can switch to OpenAI in Configuration tab

## Troubleshooting

### Common Issues

**"Invalid API key format"**
- Ensure OpenAI API key starts with `sk-`
- Check for extra spaces or characters

**"Invalid AWS Access Key ID format"**
- Ensure key starts with `AKIA` (permanent) or `ASIA` (temporary)
- Check for typos

**"Failed to create session"**
- Verify credentials are correct
- Check network connection
- Ensure backend is running

**Voice features not working with Bedrock**
- This is expected - voice features only work with OpenAI
- Switch to OpenAI provider in Configuration tab

### Getting Help

1. Check the setup guides:
   - `backend/AWS_BEDROCK_SETUP.md`
   - `backend/BEDROCK_EXAMPLES.md`
   - `BEDROCK_QUICK_START.md`

2. Verify backend is running:
   - Check `http://localhost:8080/health`

3. Check browser console for errors:
   - Open Developer Tools (F12)
   - Look for error messages in Console tab

## Future Enhancements

Potential improvements:
- [ ] Remember last used provider (localStorage)
- [ ] Multiple credential profiles
- [ ] Credential validation before saving
- [ ] Model performance comparison
- [ ] Cost estimation per model
- [ ] Provider health status indicator
- [ ] Quick switch between saved configurations

## Migration from Old Configuration

### For Existing Users

The old `ApiKeyInput` component is still supported for backward compatibility, but users will see the new `LLMConfiguration` component when they visit the Configuration tab.

**No action required** - existing OpenAI configurations continue to work.

### For Developers

The old `handleApiKeySubmit` function is still present and wraps the new `handleConfigSubmit` function:

```typescript
const handleApiKeySubmit = async (apiKey: string, model: string) => {
  await handleConfigSubmit({
    provider: 'openai',
    model,
    apiKey,
  });
};
```

This ensures backward compatibility with any code that might still reference the old function.

## Accessibility

The configuration interface follows accessibility best practices:
- Proper label associations
- Keyboard navigation support
- Clear focus indicators
- Descriptive error messages
- Semantic HTML structure

## Responsive Design

The configuration page is responsive and works on:
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

Layout adjusts automatically for smaller screens.
