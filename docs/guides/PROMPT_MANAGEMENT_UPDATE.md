# Prompt Management Update - Decision Matrix Generation

## Question: Is the prompt accessible via Prompt Management?

**Answer: YES!** ✅

The decision matrix generation prompt is fully managed through the Prompt Management system.

## How It Works

### 1. Initialization (startup.ts)

When the backend starts, it initializes the prompt:

```typescript
{
  filename: 'decision-matrix-generation-v1.1.txt',
  content: `<improved prompt with validation rules>`
}
```

**Location:** `backend/src/startup.ts`

### 2. Storage

The prompt is stored in: `data/prompts/decision-matrix-generation-v1.1.txt`

### 3. API Access

The prompt is accessible via the Prompts API:

**List all prompts:**
```
GET /api/prompts
```

**Get specific prompt:**
```
GET /api/prompts/decision-matrix-generation
```

**Update prompt:**
```
PUT /api/prompts/decision-matrix-generation
```

**Get versions:**
```
GET /api/prompts/decision-matrix-generation/versions
```

### 4. UI Access

Admins can view and edit the prompt in the **Prompt Admin** tab:

1. Navigate to "Prompts" tab
2. Select "decision-matrix-generation"
3. View current version
4. Edit and save new version
5. System automatically versions the changes

### 5. Service Usage

The DecisionMatrixService loads the prompt:

```typescript
private async getDecisionMatrixGenerationPrompt(): Promise<string> {
  try {
    const prompt = await this.versionedStorage.getPrompt(
      this.DECISION_MATRIX_GENERATION_PROMPT_ID
    );
    if (prompt) {
      return prompt;
    }
  } catch (error) {
    console.warn('Failed to load prompt, using default:', error);
  }
  
  // Fallback to default (should not happen after initialization)
  return `<default prompt>`;
}
```

## What Changed

### Version 1.0 → 1.1

**Added:**
- CRITICAL VALIDATION RULES section
- Explicit attribute names and values
- Validation examples (✅ correct vs ❌ wrong)
- Stricter constraints on what AI can generate
- Updated possibleValues for attributes

**Why:**
- AI was generating invalid matrices
- Rules referenced non-existent attributes
- Values didn't match possibleValues
- Needed explicit constraints

## How to Update the Prompt

### Option 1: Via UI (Recommended)

1. Login as admin
2. Go to "Prompts" tab
3. Click on "decision-matrix-generation"
4. Edit the prompt content
5. Click "Save"
6. System creates new version automatically

### Option 2: Via API

```bash
curl -X PUT http://localhost:8080/api/prompts/decision-matrix-generation \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<new prompt content>",
    "userId": "admin"
  }'
```

### Option 3: Direct File Edit

1. Edit `data/prompts/decision-matrix-generation-v1.1.txt`
2. Restart backend
3. System loads new content

**Note:** This doesn't create a new version, just updates current.

## Versioning

The prompt system supports versioning:

- **v1.0**: Original prompt (no validation rules)
- **v1.1**: Enhanced with validation rules (current)
- **v1.2**: Future improvements

Each version is stored separately and can be rolled back if needed.

## Testing the Prompt

### Test Matrix Generation:

```bash
# Generate a new matrix
POST /api/decision-matrix/generate
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4"
}

# Check the generated matrix
GET /api/decision-matrix

# Verify no validation errors
# All rules should reference existing attributes
# All values should be from possibleValues
```

### Check Logs:

```
✅ Good: "Parsed matrix: 6 attributes, 12 valid rules (0 rules filtered out)"
⚠️  Warning: "Parsed matrix: 6 attributes, 10 valid rules (2 rules filtered out)"
```

## Rollback if Needed

If the new prompt causes issues:

### Via UI:
1. Go to Prompts tab
2. Select "decision-matrix-generation"
3. View version history
4. Select previous version
5. Restore it

### Via API:
```bash
# Get available versions
GET /api/prompts/decision-matrix-generation/versions

# Get specific version
GET /api/prompts/decision-matrix-generation/versions/1.0

# Restore it (save as new version)
PUT /api/prompts/decision-matrix-generation
```

## Benefits of Prompt Management

1. **No Code Changes**: Update prompts without redeploying
2. **Versioning**: Track changes and rollback if needed
3. **A/B Testing**: Test different prompts
4. **Audit Trail**: See who changed what and when
5. **Easy Updates**: Admins can tune prompts based on results

## Related Prompts

All these prompts are managed the same way:

- **classification** - Main classification prompt
- **clarification** - Clarifying questions prompt
- **attribute-extraction** - Attribute extraction prompt
- **decision-matrix-generation** - Matrix generation prompt (this one)

## Future Enhancements

Potential improvements:

1. **Prompt Templates**: Reusable sections
2. **Variables**: Dynamic content injection
3. **A/B Testing**: Compare prompt versions
4. **Analytics**: Track prompt performance
5. **Suggestions**: AI-suggested improvements

## Documentation

- **Prompt Management Policy**: `.kiro/steering/prompt-management-policy.md`
- **LLM Prompt Improvements**: `docs/LLM_PROMPT_IMPROVEMENTS.md`
- **Decision Matrix Best Practices**: `docs/DECISION_MATRIX_BEST_PRACTICES.md`

---

**Updated:** November 16, 2025  
**Version:** 1.1  
**Status:** Active
