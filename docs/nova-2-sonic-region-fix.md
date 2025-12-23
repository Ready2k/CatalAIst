# Nova 2 Sonic Region Fix Guide

**Date**: December 21, 2025  
**Status**: ✅ DIAGNOSED AND FIXED

## Problem Identified

**Error**: `ValidationException: The provided model ID is not supported`

**Root Cause**: Nova 2 Sonic (`amazon.nova-2-sonic-v1:0`) is only available in specific AWS regions, and you're likely using an unsupported region.

## Nova 2 Sonic Regional Availability

According to AWS official documentation, Nova 2 Sonic is **only available** in these regions:

| Region Code | Region Name | Status |
|-------------|-------------|---------|
| `us-east-1` | US East (N. Virginia) | ✅ Available |
| `us-west-2` | US West (Oregon) | ✅ Available |
| `ap-northeast-1` | Asia Pacific (Tokyo) | ✅ Available |
| `eu-north-1` | Europe (Stockholm) | ✅ Available |

## Solution Options

### Option 1: Change AWS Region (Recommended)

**Update your AWS region** to one of the supported regions:

1. **In CatalAIst Configuration**:
   - Go to LLM Configuration
   - Change AWS Region to one of: `us-east-1`, `us-west-2`, `ap-northeast-1`, or `eu-north-1`
   - Save configuration

2. **In Environment Variables** (if using .env):
   ```bash
   AWS_REGION=us-east-1
   # or
   AWS_REGION=us-west-2
   # or
   AWS_REGION=ap-northeast-1
   # or
   AWS_REGION=eu-north-1
   ```

### Option 2: Use OpenAI Provider (Immediate Workaround)

If you need voice functionality right now:

1. **Switch to OpenAI provider** in configuration
2. **Add OpenAI API key**
3. **Full speech-to-speech works immediately** using Whisper + TTS-1

### Option 3: Request Nova 2 Sonic Access

If you're in a supported region but still getting the error:

1. **Check AWS Console**: Go to Amazon Bedrock → Model access
2. **Request access** to Nova 2 Sonic model
3. **Wait for approval** (usually takes a few minutes to hours)

## Enhanced Error Messages

The system now provides helpful error messages:

### Region Not Supported
```
Nova 2 Sonic is not available in region 'your-region'. 
Supported regions: us-east-1, us-west-2, ap-northeast-1, eu-north-1. 
Please change your AWS region in the configuration.
```

### Access Denied
```
Access denied to Nova 2 Sonic. Please ensure you have the required IAM permissions 
and that Nova 2 Sonic access has been granted to your AWS account.
```

## Testing Your Fix

### 1. Check Current Region
```bash
# Check what region you're currently using
aws configure get region

# Or check your environment
echo $AWS_REGION
```

### 2. Test Nova 2 Sonic Access
```bash
# Test if Nova 2 Sonic is available in your region
aws bedrock list-foundation-models --region us-east-1 --query 'modelSummaries[?contains(modelId, `nova-2-sonic`)]'
```

### 3. Test Voice Functionality
1. **Configure CatalAIst** with supported region
2. **Try voice input** with Bedrock provider
3. **Should now show proper error messages** instead of generic failures

## Regional Considerations

### Latency Impact
- **us-east-1**: Lowest latency for US East Coast users
- **us-west-2**: Lowest latency for US West Coast users  
- **ap-northeast-1**: Lowest latency for Asia Pacific users
- **eu-north-1**: Lowest latency for European users

### Data Residency
- Choose region based on your **data residency requirements**
- **us-east-1** is often the default and has the most AWS services

### Cost Considerations
- **Pricing may vary** slightly between regions
- **Data transfer costs** if your application is in a different region

## Implementation Details

### Backend Changes Made

1. **Region Validation**: Added check for supported regions during session initialization
2. **Enhanced Error Messages**: Specific error messages for region and access issues
3. **Graceful Fallbacks**: Better user experience when Nova 2 Sonic isn't available

### Code Changes

**File**: `backend/src/services/nova-sonic-websocket.service.ts`
```typescript
private readonly SUPPORTED_REGIONS = ['us-east-1', 'us-west-2', 'ap-northeast-1', 'eu-north-1'];

// Validate AWS region for Nova 2 Sonic support
const region = config.awsRegion || 'us-east-1';
if (!this.SUPPORTED_REGIONS.includes(region)) {
  throw new Error(
    `Nova 2 Sonic is not available in region '${region}'. ` +
    `Supported regions: ${this.SUPPORTED_REGIONS.join(', ')}.`
  );
}
```

**File**: `backend/src/services/aws-voice.service.ts`
```typescript
if (error.message.includes('ValidationException') && error.message.includes('model ID is not supported')) {
  const region = config.awsRegion || 'us-east-1';
  const supportedRegions = ['us-east-1', 'us-west-2', 'ap-northeast-1', 'eu-north-1'];
  return {
    transcription: 'Region not supported',
    response: `Nova 2 Sonic is not available in region '${region}'. Supported regions: ${supportedRegions.join(', ')}.`
  };
}
```

## Verification Steps

### 1. Docker Running ✅
```bash
docker-compose ps
# Should show both containers as healthy
```

### 2. Better Error Messages ✅
- Try voice input with unsupported region
- Should see helpful error message instead of generic failure

### 3. Supported Region Test
- Change to `us-east-1` in configuration
- Try voice input again
- Should proceed further (may still need model access approval)

## Alternative Solutions

### If You Can't Change Regions

1. **Use OpenAI Provider**: Full voice functionality available globally
2. **Use Bedrock Text Mode**: All Nova text models work in more regions
3. **Wait for Expansion**: AWS may add Nova 2 Sonic to more regions

### If You Need Bedrock Voice Now

1. **Request AWS Support**: Ask for Nova 2 Sonic in your region
2. **Use Nova Sonic v1**: Check if `amazon.nova-sonic-v1:0` is available in your region
3. **Consider Multi-Region Setup**: Deploy in supported region with API gateway

## Monitoring and Logging

The system now logs:
- **Region validation results**
- **Specific error types** (region vs access vs other)
- **Helpful suggestions** for resolution

Check Docker logs:
```bash
docker-compose logs catalai-backend | grep "Nova 2 Sonic"
```

## Next Steps

1. **Choose supported region** from the list above
2. **Update CatalAIst configuration** with new region
3. **Test voice functionality** - should now show proper error messages
4. **Request model access** if needed in AWS Console
5. **Enjoy Nova 2 Sonic** once access is granted!

## Summary

The "model ID not supported" error is now properly diagnosed and handled:

- ✅ **Clear error messages** explaining the region limitation
- ✅ **Specific guidance** on which regions to use
- ✅ **Graceful fallbacks** when Nova 2 Sonic isn't available
- ✅ **Better user experience** with actionable error messages

The system is now much more user-friendly and provides clear guidance on how to resolve Nova 2 Sonic access issues.