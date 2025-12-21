# Bedrock Dynamic Model Fetching - Flow Diagram

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    User Opens Configuration                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              User Selects "AWS Bedrock" Tab                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         User Enters AWS Access Key ID & Secret Key           │
│              (and optionally Session Token)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼ (on blur)
┌─────────────────────────────────────────────────────────────┐
│              Frontend: loadBedrockModels()                   │
│                  Shows "Loading models..."                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         API Call: GET /api/sessions/models?provider=bedrock  │
│         Headers:                                             │
│           - x-aws-access-key-id                              │
│           - x-aws-secret-access-key                          │
│           - x-aws-session-token (optional)                   │
│           - x-aws-region                                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend: session.routes.ts                           │
│           - Validates credentials                            │
│           - Calls bedrockService.listModels()                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         BedrockService: listModels()                         │
│           - Creates BedrockClient with credentials           │
│           - Calls ListFoundationModelsCommand                │
│           - Filters to Anthropic Claude models               │
│           - Filters to ACTIVE status only                    │
│           - Sorts by version (newest first)                  │
└────────────────────────┬────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │         │
              Success       Failure
                    │         │
                    ▼         ▼
        ┌──────────────┐  ┌──────────────┐
        │ Return Models│  │ Return Static│
        │ from AWS API │  │ Fallback List│
        └──────┬───────┘  └──────┬───────┘
               │                 │
               └────────┬────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│         Frontend: Update Model Dropdown                      │
│           - Populate with fetched models                     │
│           - Select first model as default                    │
│           - Hide loading indicator                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│         User Selects Model & Saves Configuration             │
└─────────────────────────────────────────────────────────────┘
```

## Technical Flow

```
Frontend (LLMConfiguration.tsx)
    │
    │ handleBedrockCredentialsBlur()
    │
    ▼
apiService.listModels('bedrock', credentials)
    │
    │ HTTP GET /api/sessions/models?provider=bedrock
    │ Headers: x-aws-access-key-id, x-aws-secret-access-key, etc.
    │
    ▼
Backend (session.routes.ts)
    │
    │ Extract credentials from headers
    │ Validate credentials
    │
    ▼
bedrockService.listModels(config)
    │
    │ createBedrockClient(config)
    │
    ▼
AWS SDK (@aws-sdk/client-bedrock)
    │
    │ new BedrockClient({ region, credentials })
    │ new ListFoundationModelsCommand({ byProvider: 'Anthropic' })
    │ client.send(command)
    │
    ▼
AWS Bedrock API
    │
    │ Returns list of foundation models
    │
    ▼
BedrockService
    │
    │ Filter: model.modelId.startsWith('anthropic.claude')
    │ Filter: model.modelLifecycle.status === 'ACTIVE'
    │ Sort: by version (newest first)
    │ Map: to ModelInfo format
    │
    ▼
Backend Response
    │
    │ { models: [ { id, created, ownedBy }, ... ] }
    │
    ▼
Frontend
    │
    │ setModels(response.models)
    │ Update dropdown
    │
    ▼
User sees available models
```

## Data Structures

### Request (Frontend → Backend)

```typescript
GET /api/sessions/models?provider=bedrock

Headers:
{
  "x-aws-access-key-id": "AKIAIOSFODNN7EXAMPLE",
  "x-aws-secret-access-key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
  "x-aws-session-token": "optional-session-token",
  "x-aws-region": "us-east-1"
}
```

### AWS SDK Request (Backend → AWS)

```typescript
ListFoundationModelsCommand({
  byProvider: 'Anthropic'
})
```

### AWS SDK Response (AWS → Backend)

```typescript
{
  modelSummaries: [
    {
      modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      providerName: "Anthropic",
      modelLifecycle: {
        status: "ACTIVE"
      },
      // ... other fields
    },
    // ... more models
  ]
}
```

### Backend Response (Backend → Frontend)

```typescript
{
  models: [
    {
      id: "anthropic.claude-3-5-sonnet-20241022-v2:0",
      created: 0,
      ownedBy: "anthropic"
    },
    {
      id: "anthropic.claude-3-5-haiku-20241022-v1:0",
      created: 0,
      ownedBy: "anthropic"
    }
  ]
}
```

## Error Handling

```
API Call Fails
    │
    ├─ Network Error
    │   └─ Frontend: Show error, use fallback list
    │
    ├─ Invalid Credentials
    │   └─ Backend: Return 400 error
    │       └─ Frontend: Show error message
    │
    ├─ Missing Permissions
    │   └─ Backend: Catch error, return fallback list
    │       └─ Frontend: Show models from fallback
    │
    └─ Timeout
        └─ Backend: Catch timeout, return fallback list
            └─ Frontend: Show models from fallback
```

## Key Components Modified

1. **Backend**
   - `backend/src/services/bedrock.service.ts` - Added `listModels()` and `createBedrockClient()`
   - `backend/src/routes/session.routes.ts` - Updated `/models` endpoint to support Bedrock
   - `backend/package.json` - Added `@aws-sdk/client-bedrock` dependency

2. **Frontend**
   - `frontend/src/services/api.ts` - Updated `listModels()` to support both providers
   - `frontend/src/components/LLMConfiguration.tsx` - Added `loadBedrockModels()` and auto-fetch

3. **Documentation**
   - `backend/AWS_BEDROCK_SETUP.md` - Updated with dynamic model fetching info
   - `CHANGELOG.md` - Added feature documentation
   - `docs/BEDROCK_DYNAMIC_MODELS.md` - Comprehensive feature guide
   - `docs/BEDROCK_MODELS_FLOW.md` - This flow diagram

4. **Testing**
   - `backend/test-bedrock-models.sh` - Test script for model listing
