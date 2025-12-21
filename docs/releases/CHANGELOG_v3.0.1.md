# CatalAIst v3.0.1 Release Notes

**Release Date:** December 21, 2025  
**Version:** 3.0.1  
**Previous Version:** 3.0.0

## 🎉 Major Features

### 🤖 Amazon Nova Model Support

**Full support for Amazon's latest Nova models with optimized Converse API:**

- **Nova Micro** (`amazon.nova-micro-v1:0`) - Fastest, most cost-effective for simple classifications
- **Nova Lite** (`amazon.nova-lite-v1:0`) - Balanced performance and cost for general use (new default)
- **Nova Pro** (`amazon.nova-pro-v1:0`) - Highest capability for complex classifications

**Technical Implementation:**
- Upgraded to AWS Bedrock's newer **Converse API** for better performance
- Smart API routing: Converse API for Nova/newer models, InvokeModel for legacy
- Enhanced error handling with clearer provisioned throughput messages
- Future-proof architecture ready for upcoming AWS models

### 🎤 Bedrock Voice Interface (NEW)

**Complete voice capabilities for AWS Bedrock users, achieving parity with OpenAI:**

- **Nova 2 Sonic Integration** - Amazon's latest generative voice technology
- **Speech-to-Text** - Audio transcription using Amazon Transcribe
- **Text-to-Speech** - Natural voice synthesis using Amazon Polly
- **Unified Experience** - Same voice interface as OpenAI (recording, playback, streaming modes)

**Voice Options for Bedrock:**
- **Nova 2 Sonic** (recommended) - Amazon's most advanced generative voice
- **Ruth** - Natural, expressive generative voice
- **Joanna** - Warm, friendly female voice
- **Matthew** - Clear, professional male voice
- **Amy, Brian, Emma** - British English voices

**Provider Parity:**
- Both OpenAI and Bedrock users now have identical voice capabilities
- Same streaming/non-streaming modes
- Same recording controls and visual feedback
- Provider-specific voice optimization

## 🔧 Technical Improvements

### Dual API Architecture

**Smart API Selection:**
```typescript
// Converse API (newer, recommended):
- amazon.nova-* models (required)
- anthropic.claude-3-5-* models
- us.*, eu.*, ap.* inference profiles

// InvokeModel API (legacy, maintained):
- anthropic.claude-v2* models
- anthropic.claude-3-* older models
```

### Enhanced Model Detection

- Better support for inference profiles and regional models
- Improved model availability detection
- Enhanced error messages for model access issues
- Automatic fallback to appropriate API based on model type

### Voice Service Architecture

**AWS Voice Service (`aws-voice.service.ts`):**
- Amazon Transcribe integration for STT
- Amazon Polly integration with Nova 2 Sonic for TTS
- S3 temporary storage for audio processing
- Retry logic and error handling
- Voice mapping between OpenAI and AWS voices

**Updated Voice Routes:**
- Provider-agnostic voice endpoints
- Support for both OpenAI and AWS credentials
- Provider-specific caching
- Enhanced audit logging

## 🎨 UI/UX Enhancements

### Model Selection

- **Nova models prominently featured** in Bedrock model list
- **Nova Lite set as default** for new Bedrock configurations
- Clear model descriptions and recommendations
- Enhanced model filtering and organization

### Voice Configuration

- **Provider-specific voice options** in configuration UI
- **Nova 2 Sonic highlighted** as recommended for Bedrock
- **Unified voice settings** across both providers
- **Enhanced help text** explaining voice capabilities

### User Experience

- **Seamless provider switching** with appropriate voice defaults
- **Clear provider indicators** in voice interface
- **Consistent experience** regardless of chosen provider
- **Enhanced error messages** for better troubleshooting

## 📊 Performance & Reliability

### API Performance

- **Converse API optimization** for Nova models
- **Reduced latency** for newer model interactions
- **Better error handling** with specific guidance
- **Improved retry logic** for transient failures

### Voice Performance

- **Provider-specific caching** for better performance
- **Optimized audio processing** for both providers
- **Enhanced error recovery** for voice operations
- **Reduced memory usage** with streaming audio

## 🔒 Security & Compliance

### Credential Management

- **Secure AWS credential handling** for voice services
- **Provider-specific credential validation**
- **Enhanced error messages** without exposing sensitive data
- **Audit logging** for all voice operations

### Data Protection

- **Temporary S3 storage** with automatic cleanup
- **Audio file encryption** in transit and at rest
- **PII detection** in voice transcriptions
- **Compliance-ready** audit trails

## 🐛 Bug Fixes

### Nova Model Compatibility

- ✅ **Fixed Nova model routing** - Nova models now use required Converse API
- ✅ **Fixed On-Demand access** - Better routing for Nova models
- ✅ **Fixed error messages** - Clearer guidance for provisioned throughput issues

### Voice Interface

- ✅ **Fixed Bedrock voice support** - Voice now works with AWS credentials
- ✅ **Fixed provider detection** - Correct voice options based on provider
- ✅ **Fixed audio caching** - Provider-specific cache keys prevent conflicts

### Model Selection

- ✅ **Fixed model defaults** - Nova Lite now default for Bedrock
- ✅ **Fixed model filtering** - Better organization of model options
- ✅ **Fixed model validation** - Enhanced support for inference profiles

## 📚 Documentation Updates

### New Documentation

- **[BEDROCK_CONVERSE_API_UPDATE.md](BEDROCK_CONVERSE_API_UPDATE.md)** - Complete Converse API guide
- **Voice troubleshooting** - Enhanced voice setup and debugging guides
- **Nova model guide** - Best practices for Nova model usage

### Updated Documentation

- **README.md** - Updated with Nova support and voice parity
- **QUICK_START.md** - Enhanced setup instructions for both providers
- **API documentation** - Updated voice endpoints and parameters

## 🧪 Testing & Quality

### New Test Coverage

- **Nova model API selection** - Automated tests for Converse API routing
- **Voice provider switching** - Tests for OpenAI/AWS voice compatibility
- **Error handling** - Enhanced error scenario coverage

### Quality Improvements

- **TypeScript compilation** - Zero compilation errors
- **Dependency updates** - Latest AWS SDK versions
- **Code organization** - Better separation of concerns

## 🚀 Migration Guide

### For Existing Users

**No action required** - All existing configurations continue to work:
- ✅ Existing Claude models use InvokeModel API (unchanged)
- ✅ OpenAI voice features work exactly as before
- ✅ All existing sessions and data preserved

### For New Bedrock Users

**Enhanced experience available:**
1. **Try Nova models** - Select `amazon.nova-lite-v1:0` for best balance
2. **Enable voice** - Voice settings now available for Bedrock
3. **Use Nova 2 Sonic** - Select for most natural voice experience

### For Developers

**New capabilities available:**
- **Converse API** - Use for new model integrations
- **AWS Voice Service** - Extend for additional voice features
- **Provider abstraction** - Easy to add new voice providers

## 🔮 What's Next

### Planned Features

- **Streaming voice responses** - Real-time audio generation
- **Multi-language support** - Additional language options
- **Voice customization** - Speed, pitch, and tone controls
- **Advanced Nova features** - Leverage Nova's unique capabilities

### Technical Roadmap

- **Complete Converse API migration** - Eventually migrate all models
- **Voice provider expansion** - Additional voice service integrations
- **Performance optimization** - Further latency improvements
- **Enhanced analytics** - Voice usage and performance metrics

## 📞 Support & Troubleshooting

### Common Issues

**Nova models not working:**
1. Check region availability
2. Verify model access in Bedrock console
3. Ensure IAM permissions include `bedrock:InvokeModel`

**Voice not working with Bedrock:**
1. Verify AWS credentials are correct
2. Check IAM permissions for Transcribe and Polly
3. Ensure region supports voice services

**API selection issues:**
Check logs for API selection messages:
```
[Bedrock] Using Converse API for model: amazon.nova-lite-v1:0
[Bedrock] Using InvokeModel API for model: anthropic.claude-v2:1
```

### Getting Help

- **Documentation:** Check `/docs` directory
- **Logs:** `docker-compose logs -f backend`
- **Health Check:** `curl http://localhost:8080/health`
- **Test Script:** `node scripts/tests/test-nova-models.js`

---

## 🎯 Summary

CatalAIst v3.0.1 represents a major advancement in AI model support and voice capabilities:

- **🤖 Nova Support** - Full compatibility with Amazon's latest AI models
- **🎤 Voice Parity** - Bedrock users now have complete voice capabilities
- **🔧 Technical Excellence** - Future-proof architecture with dual API support
- **🎨 Enhanced UX** - Seamless experience across all providers
- **🔒 Enterprise Ready** - Enhanced security and compliance features

This release ensures CatalAIst users have access to the latest AI capabilities regardless of their chosen provider, with a unified, high-quality experience across OpenAI and AWS Bedrock.

**Upgrade today to experience the future of AI-powered process classification!** 🚀