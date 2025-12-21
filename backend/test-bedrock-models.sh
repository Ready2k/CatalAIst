#!/bin/bash

# Test script for Bedrock model listing
# Usage: ./test-bedrock-models.sh <AWS_ACCESS_KEY_ID> <AWS_SECRET_ACCESS_KEY> [AWS_REGION]

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <AWS_ACCESS_KEY_ID> <AWS_SECRET_ACCESS_KEY> [AWS_REGION]"
  echo ""
  echo "Example:"
  echo "  $0 AKIAIOSFODNN7EXAMPLE wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY us-east-1"
  exit 1
fi

AWS_ACCESS_KEY_ID="$1"
AWS_SECRET_ACCESS_KEY="$2"
AWS_REGION="${3:-us-east-1}"

echo "Testing Bedrock model listing..."
echo "Region: $AWS_REGION"
echo ""

# Test model listing endpoint
echo "Fetching available Bedrock models..."
curl -X GET "http://localhost:8080/api/sessions/models?provider=bedrock" \
  -H "x-aws-access-key-id: $AWS_ACCESS_KEY_ID" \
  -H "x-aws-secret-access-key: $AWS_SECRET_ACCESS_KEY" \
  -H "x-aws-region: $AWS_REGION" \
  -s | jq '.'

echo ""
echo "Test complete!"
