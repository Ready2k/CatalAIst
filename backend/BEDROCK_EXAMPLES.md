# AWS Bedrock Usage Examples

## Quick Start Examples

### Example 1: Basic Classification with Claude 3.5 Sonnet

```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "We manually review and approve expense reports every Friday. The process involves checking receipts, verifying amounts, and entering data into our accounting system. It takes about 3 hours per week.",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "AKIAIOSFODNN7EXAMPLE",
    "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "awsRegion": "us-east-1",
    "userId": "demo-user"
  }'
```

### Example 2: Using Environment Variables

Set your AWS credentials as environment variables:

```bash
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_REGION="us-east-1"
```

Then make the request without credentials in the body:

```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Manual invoice processing that happens daily",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "userId": "demo-user"
  }'
```

### Example 3: Using Claude 3 Haiku (Faster, Lower Cost)

```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Weekly report generation from spreadsheet data",
    "model": "anthropic.claude-3-5-haiku-20241022-v1:0",
    "awsAccessKeyId": "YOUR_KEY",
    "awsSecretAccessKey": "YOUR_SECRET",
    "awsRegion": "us-east-1"
  }'
```

### Example 4: Continuing a Session with Clarification

```bash
# Step 1: Initial submission
RESPONSE=$(curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Data entry process",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "YOUR_KEY",
    "awsSecretAccessKey": "YOUR_SECRET",
    "awsRegion": "us-east-1"
  }')

# Extract session ID
SESSION_ID=$(echo $RESPONSE | jq -r '.sessionId')

# Step 2: Answer clarification questions
curl -X POST http://localhost:8080/api/process/clarify \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"$SESSION_ID\",
    \"answers\": [
      \"It happens daily, about 100 entries per day\",
      \"Currently done manually in Excel spreadsheets\"
    ],
    \"model\": \"anthropic.claude-3-5-sonnet-20241022-v2:0\",
    \"awsAccessKeyId\": \"YOUR_KEY\",
    \"awsSecretAccessKey\": \"YOUR_SECRET\",
    \"awsRegion\": \"us-east-1\"
  }"
```

### Example 5: Using Temporary AWS Credentials (STS)

If you're using AWS STS temporary credentials:

```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Customer onboarding workflow",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "ASIAIOSFODNN7EXAMPLE",
    "awsSecretAccessKey": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
    "awsSessionToken": "FwoGZXIvYXdzEBYaDH...",
    "awsRegion": "us-east-1"
  }'
```

### Example 6: Comparing OpenAI vs Bedrock

Same process, different providers:

**With OpenAI:**
```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Manual inventory counting process",
    "model": "gpt-4",
    "apiKey": "sk-...",
    "userId": "comparison-test"
  }'
```

**With Bedrock:**
```bash
curl -X POST http://localhost:8080/api/process/submit \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Manual inventory counting process",
    "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "awsAccessKeyId": "YOUR_KEY",
    "awsSecretAccessKey": "YOUR_SECRET",
    "awsRegion": "us-east-1",
    "userId": "comparison-test"
  }'
```

## JavaScript/TypeScript Examples

### Node.js Example

```javascript
const axios = require('axios');

async function classifyProcess() {
  try {
    const response = await axios.post('http://localhost:8080/api/process/submit', {
      description: 'We manually process customer refunds every day',
      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      awsRegion: 'us-east-1',
      userId: 'node-app'
    });

    console.log('Classification:', response.data.classification);
    console.log('Session ID:', response.data.sessionId);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

classifyProcess();
```

### React Example

```typescript
import { useState } from 'react';

interface ClassificationRequest {
  description: string;
  model: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
}

function ProcessClassifier() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const classifyProcess = async (request: ClassificationRequest) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8080/api/process/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Classification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={() => classifyProcess({
        description: 'Manual data entry process',
        model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        awsAccessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID!,
        awsSecretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY!,
        awsRegion: 'us-east-1'
      })}>
        Classify Process
      </button>
      
      {loading && <p>Classifying...</p>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
```

## Python Examples

### Basic Python Example

```python
import requests
import os

def classify_process(description):
    url = "http://localhost:8080/api/process/submit"
    
    payload = {
        "description": description,
        "model": "anthropic.claude-3-5-sonnet-20241022-v2:0",
        "awsAccessKeyId": os.environ["AWS_ACCESS_KEY_ID"],
        "awsSecretAccessKey": os.environ["AWS_SECRET_ACCESS_KEY"],
        "awsRegion": "us-east-1",
        "userId": "python-app"
    }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    return response.json()

# Usage
result = classify_process("Manual invoice approval process that takes 2 hours daily")
print(f"Category: {result['classification']['category']}")
print(f"Confidence: {result['classification']['confidence']}")
```

### Python with Session Management

```python
import requests
import os

class CatalAIstClient:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.aws_credentials = {
            "awsAccessKeyId": os.environ["AWS_ACCESS_KEY_ID"],
            "awsSecretAccessKey": os.environ["AWS_SECRET_ACCESS_KEY"],
            "awsRegion": os.environ.get("AWS_REGION", "us-east-1")
        }
        self.model = "anthropic.claude-3-5-sonnet-20241022-v2:0"
    
    def submit_process(self, description, user_id="python-client"):
        """Submit a process for classification"""
        response = requests.post(
            f"{self.base_url}/api/process/submit",
            json={
                "description": description,
                "model": self.model,
                "userId": user_id,
                **self.aws_credentials
            }
        )
        response.raise_for_status()
        return response.json()
    
    def answer_clarification(self, session_id, answers):
        """Answer clarification questions"""
        response = requests.post(
            f"{self.base_url}/api/process/clarify",
            json={
                "sessionId": session_id,
                "answers": answers,
                "model": self.model,
                **self.aws_credentials
            }
        )
        response.raise_for_status()
        return response.json()

# Usage
client = CatalAIstClient()

# Submit process
result = client.submit_process("Data entry from paper forms")

if "clarificationQuestions" in result:
    # Answer questions
    answers = [
        "About 50 forms per day",
        "Currently using paper and manual entry into database"
    ]
    final_result = client.answer_clarification(result["sessionId"], answers)
    print(f"Final classification: {final_result['classification']['category']}")
else:
    print(f"Classification: {result['classification']['category']}")
```

## Testing Different Models

### Performance Comparison Script

```bash
#!/bin/bash

# Test different Claude models
MODELS=(
  "anthropic.claude-3-5-sonnet-20241022-v2:0"
  "anthropic.claude-3-5-haiku-20241022-v1:0"
  "anthropic.claude-3-opus-20240229-v1:0"
)

DESCRIPTION="We manually process customer orders every day. It involves checking inventory, calculating shipping costs, and sending confirmation emails."

for MODEL in "${MODELS[@]}"; do
  echo "Testing model: $MODEL"
  
  START_TIME=$(date +%s%N)
  
  RESPONSE=$(curl -s -X POST http://localhost:8080/api/process/submit \
    -H "Content-Type: application/json" \
    -d "{
      \"description\": \"$DESCRIPTION\",
      \"model\": \"$MODEL\",
      \"awsAccessKeyId\": \"$AWS_ACCESS_KEY_ID\",
      \"awsSecretAccessKey\": \"$AWS_SECRET_ACCESS_KEY\",
      \"awsRegion\": \"us-east-1\"
    }")
  
  END_TIME=$(date +%s%N)
  DURATION=$(( ($END_TIME - $START_TIME) / 1000000 ))
  
  CATEGORY=$(echo $RESPONSE | jq -r '.classification.category')
  CONFIDENCE=$(echo $RESPONSE | jq -r '.classification.confidence')
  
  echo "  Category: $CATEGORY"
  echo "  Confidence: $CONFIDENCE"
  echo "  Duration: ${DURATION}ms"
  echo ""
done
```

## Error Handling Examples

### Handling Missing Credentials

```javascript
async function classifyWithErrorHandling(description) {
  try {
    const response = await fetch('http://localhost:8080/api/process/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description,
        model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
        awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
        awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        awsRegion: 'us-east-1'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      
      if (error.error === 'Missing AWS credentials') {
        console.error('AWS credentials not configured');
        // Prompt user to configure credentials
      } else if (error.message?.includes('Access Denied')) {
        console.error('AWS IAM permissions insufficient');
        // Show permission requirements
      } else {
        console.error('Classification failed:', error.message);
      }
      
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

## Best Practices

1. **Store credentials securely**: Use environment variables or AWS Secrets Manager
2. **Use appropriate models**: Haiku for speed, Sonnet for balance, Opus for complex tasks
3. **Handle errors gracefully**: Check for credential, permission, and rate limit errors
4. **Monitor costs**: Track token usage through AWS CloudWatch
5. **Test in development**: Use smaller models (Haiku) for development/testing
6. **Implement retries**: The system has built-in retries, but add application-level retries for network issues

## Region Availability

Claude models are available in these AWS regions:
- `us-east-1` (N. Virginia)
- `us-west-2` (Oregon)
- `ap-southeast-1` (Singapore)
- `ap-northeast-1` (Tokyo)
- `eu-central-1` (Frankfurt)
- `eu-west-2` (London)

Check [AWS Bedrock documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/models-regions.html) for the latest region availability.
