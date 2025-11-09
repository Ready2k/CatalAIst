# Release Notes - Version 1.2.0

**Release Date:** November 9, 2025  
**Tag:** v1.2.0  
**Commit:** 502fc1c

## 🎉 Major Release: AWS Bedrock Support

CatalAIst now supports AWS Bedrock as an alternative LLM provider, enabling the use of Claude models alongside OpenAI GPT models. This release introduces a flexible multi-provider architecture that makes it easy to add additional LLM providers in the future.

## 🚀 What's New

### Multi-Provider LLM Architecture

- **Provider Abstraction Layer**: Clean interface-based design (`ILLMProvider`) that both OpenAI and Bedrock implement
- **Automatic Provider Detection**: System automatically detects the provider based on model name
- **Flexible Credentials**: Support for OpenAI API keys and AWS credentials (Access Key, Secret Key, Session Token, Region)
- **Seamless Switching**: Users can easily switch between providers through the configuration UI

### AWS Bedrock Integration

**Supported Claude Models:**
- Claude 3.5 Sonnet (Latest, recommended for production)
- Claude 3.5 Haiku (Fast and cost-effective)
- Claude 3 Opus (Most capable)
- Claude 3 Sonnet
- Claude 3 Haiku
- Claude v2.1, v2, Instant v1

**Features:**
- Full classification, clarification, and attribute extraction support
- Automatic retry logic with exponential backoff
- Comprehensive error handling
- Support for temporary AWS credentials (STS)
- Multi-region support (us-east-1, us-west-2, ap-southeast-1, etc.)

### New Frontend Configuration UI

**Tab-Based Provider Selection:**
- Clean, modern interface for choosing between OpenAI and AWS Bedrock
- Provider-specific credential forms
- Real-time validation of credentials
- Advanced options for AWS region selection

**OpenAI Tab:**
- API key input with format validation
- Automatic model loading
- Link to OpenAI Platform

**AWS Bedrock Tab:**
- AWS Access Key ID input
- AWS Secret Access Key input
- Session Token support (for temporary credentials)
- Region selector (in advanced options)
- Helpful setup instructions and documentation links

### Enhanced API Service

- Stores complete LLM configuration (provider, model, credentials)
- Automatically includes correct credentials in all API requests
- Supports both OpenAI and Bedrock seamlessly
- Backward compatible with existing OpenAI-only code

## 📋 Technical Details

### Backend Changes

**New Files:**
- `backend/src/services/llm-provider.interface.ts` - Common interface for all LLM providers
- `backend/src/services/llm.service.ts` - Factory service for provider selection
- `backend/src/services/bedrock.service.ts` - AWS Bedrock implementation
- `backend/AWS_BEDROCK_SETUP.md` - Complete setup guide
- `backend/BEDROCK_EXAMPLES.md` - Usage examples
- `backend/test-bedrock.sh` - Automated test script

**Modified Files:**
- `backend/package.json` - Added AWS SDK dependency
- `backend/src/services/openai.service.ts` - Refactored to implement ILLMProvider
- `backend/src/services/classification.service.ts` - Updated to use LLM abstraction
- `backend/src/services/clarification.service.ts` - Updated to use LLM abstraction
- `backend/src/routes/process.routes.ts` - Added AWS credential parameters
- `docker-compose.yml` - Added AWS environment variables

### Frontend Changes

**New Files:**
- `frontend/src/components/LLMConfiguration.tsx` - New configuration component

**Modified Files:**
- `frontend/src/App.tsx` - Updated to use new configuration component
- `frontend/src/services/api.ts` - Enhanced to support multiple providers

### Documentation

**New Documentation:**
- `AWS_BEDROCK_SETUP.md` - Complete setup guide with IAM permissions
- `BEDROCK_EXAMPLES.md` - Usage examples in Bash, JavaScript, TypeScript, Python
- `BEDROCK_QUICK_START.md` - 5-minute quick start guide
- `AWS_BEDROCK_INTEGRATION_SUMMARY.md` - Technical architecture details
- `FRONTEND_CONFIGURATION_GUIDE.md` - Frontend UI guide

**Updated Documentation:**
- `README.md` - Added LLM provider information
- `CHANGELOG.md` - Comprehensive changelog entry

## 🔄 Migration Guide

### For Existing Users

**No action required!** This release is fully backward compatible. All existing OpenAI functionality continues to work unchanged.

To start using AWS Bedrock:
1. Navigate to the Configuration tab
2. Click the "AWS Bedrock" tab
3. Enter your AWS credentials
4. Select a Claude model
5. Click "Save Configuration"

### For Developers

The old `ApiKeyInput` component is still supported for backward compatibility. The new `LLMConfiguration` component provides a superset of functionality.

API requests now accept additional parameters:
- `provider` (optional): 'openai' or 'bedrock'
- `awsAccessKeyId` (for Bedrock)
- `awsSecretAccessKey` (for Bedrock)
- `awsSessionToken` (optional, for temporary credentials)
- `awsRegion` (optional, defaults to us-east-1)

## 📊 Statistics

- **24 files changed**
- **4,723 insertions**
- **357 deletions**
- **9 new files created**
- **15 files modified**

## ✅ Testing

- ✅ Backend compiles successfully (TypeScript)
- ✅ Frontend builds successfully (React)
- ✅ No TypeScript errors or diagnostics
- ✅ All existing OpenAI functionality preserved
- ✅ Comprehensive documentation provided
- ✅ Test script included for verification

## 🔒 Security

- Credentials stored in memory only (session-based)
- No persistence to localStorage or cookies
- Password fields for sensitive data
- HTTPS encryption in transit
- Never sent to third parties

## 💰 Cost Considerations

### AWS Bedrock Pricing (approximate)
- Claude 3.5 Haiku: ~$0.25-1.25 per 1M tokens (most cost-effective)
- Claude 3.5 Sonnet: ~$3-15 per 1M tokens (recommended)
- Claude 3 Opus: ~$15-75 per 1M tokens (most capable)

### OpenAI Pricing (approximate)
- GPT-3.5 Turbo: ~$0.50-1.50 per 1M tokens
- GPT-4 Turbo: ~$10-30 per 1M tokens
- GPT-4: ~$30-60 per 1M tokens

## 🐛 Known Limitations

- Voice transcription and text-to-speech only available with OpenAI provider
- AWS Bedrock requires model access approval in AWS Console
- Some Claude models may not be available in all AWS regions

## 📚 Getting Started

### Quick Start with OpenAI (Existing)
1. Go to Configuration tab
2. Enter OpenAI API key
3. Select GPT model
4. Start classifying

### Quick Start with AWS Bedrock (New)
1. Set up AWS credentials with Bedrock access
2. Go to Configuration tab
3. Click "AWS Bedrock" tab
4. Enter AWS credentials
5. Select Claude model
6. Start classifying

### Documentation
- [AWS Bedrock Setup Guide](backend/AWS_BEDROCK_SETUP.md)
- [Usage Examples](backend/BEDROCK_EXAMPLES.md)
- [Quick Start](BEDROCK_QUICK_START.md)
- [Frontend Guide](FRONTEND_CONFIGURATION_GUIDE.md)
- [Technical Architecture](AWS_BEDROCK_INTEGRATION_SUMMARY.md)

## 🙏 Acknowledgments

This release represents a significant architectural improvement to CatalAIst, making it a truly multi-provider AI classification system. The clean abstraction layer ensures that adding future LLM providers (Azure OpenAI, Google Vertex AI, etc.) will be straightforward.

## 🔗 Links

- **Repository**: https://github.com/Ready2k/CatalAIst
- **Tag**: v1.2.0
- **Commit**: 502fc1c
- **Previous Release**: v1.1.0

## 📞 Support

For issues, questions, or feedback:
- Open an issue on GitHub
- Check the documentation in the repository
- Review the troubleshooting sections in setup guides

---

**Full Changelog**: https://github.com/Ready2k/CatalAIst/compare/v1.1.0...v1.2.0
