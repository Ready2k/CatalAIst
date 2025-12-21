#!/bin/bash

echo "🔍 Checking Nova 2 Sonic Model Access..."
echo "Region: us-east-1"
echo ""

# Check if AWS CLI is configured
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install AWS CLI to check model access."
    exit 1
fi

# Check current AWS configuration
echo "📋 Current AWS Configuration:"
echo "Region: $(aws configure get region)"
echo "Access Key: $(aws configure get aws_access_key_id | head -c 10)..."
echo ""

# List available Nova models
echo "🔍 Checking available Nova models in us-east-1..."
aws bedrock list-foundation-models \
    --region us-east-1 \
    --query 'modelSummaries[?contains(modelId, `nova`)].[modelId, modelName]' \
    --output table

echo ""
echo "🎯 Specifically checking for Nova 2 Sonic..."
NOVA_2_SONIC=$(aws bedrock list-foundation-models \
    --region us-east-1 \
    --query 'modelSummaries[?modelId==`amazon.nova-2-sonic-v1:0`].modelId' \
    --output text)

if [ "$NOVA_2_SONIC" = "amazon.nova-2-sonic-v1:0" ]; then
    echo "✅ Nova 2 Sonic (amazon.nova-2-sonic-v1:0) is available!"
else
    echo "❌ Nova 2 Sonic (amazon.nova-2-sonic-v1:0) is NOT available in your account."
    echo ""
    echo "🔧 To fix this:"
    echo "1. Go to AWS Console → Amazon Bedrock → Model access"
    echo "2. Request access to 'Amazon Nova 2 Sonic'"
    echo "3. Wait for approval (usually takes a few minutes)"
    echo ""
    echo "🔄 Alternative: Use OpenAI provider for immediate voice functionality"
fi

echo ""
echo "🔍 Checking Nova Sonic v1 (fallback option)..."
NOVA_SONIC_V1=$(aws bedrock list-foundation-models \
    --region us-east-1 \
    --query 'modelSummaries[?modelId==`amazon.nova-sonic-v1:0`].modelId' \
    --output text)

if [ "$NOVA_SONIC_V1" = "amazon.nova-sonic-v1:0" ]; then
    echo "✅ Nova Sonic v1 (amazon.nova-sonic-v1:0) is available as fallback!"
else
    echo "❌ Nova Sonic v1 (amazon.nova-sonic-v1:0) is also not available."
fi