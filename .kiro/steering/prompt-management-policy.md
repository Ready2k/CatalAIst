---
inclusion: always
---

# Prompt Management Policy

## Critical Rule: All AI Prompts Must Be Managed

**MANDATORY**: Every prompt used to interact with LLMs (OpenAI, Anthropic, etc.) MUST be managed through the versioned prompt management system.

### Requirements

1. **No Hardcoded Prompts**: Never hardcode prompts directly in service methods
2. **Use Versioned Storage**: All prompts must be loaded via `VersionedStorageService.getPrompt()`
3. **Initialize on Startup**: All prompts must be initialized in `backend/src/startup.ts`
4. **Register in API**: All prompt types must be listed in `backend/src/routes/prompts.routes.ts`
5. **Add Validation**: Each prompt type must have validation rules in the prompts routes

### How to Add a New Prompt

When adding any new LLM interaction:

1. **Define the prompt ID constant** in the service class:
   ```typescript
   private readonly MY_PROMPT_ID = 'my-prompt-name';
   ```

2. **Add to startup initialization** in `backend/src/startup.ts`:
   ```typescript
   {
     filename: 'my-prompt-name-v1.0.txt',
     content: `Your default prompt content here...`
   }
   ```

3. **Register in prompts API** in `backend/src/routes/prompts.routes.ts`:
   ```typescript
   const promptTypes = ['classification', 'clarification', 'attribute-extraction', 'my-prompt-name'];
   ```

4. **Add validation** in the `validatePromptContent()` function:
   ```typescript
   case 'my-prompt-name':
     if (!content.toLowerCase().includes('expected-keyword')) {
       return { valid: false, message: 'Prompt must include expected content' };
     }
     break;
   ```

5. **Load from storage** in your service method:
   ```typescript
   private async getMyPrompt(): Promise<string> {
     try {
       const prompt = await this.versionedStorage.getPrompt(this.MY_PROMPT_ID);
       if (prompt) {
         return prompt;
       }
     } catch (error) {
       console.warn('Failed to load prompt, using default:', error);
     }
     // Fallback to default (should rarely happen)
     return `Default prompt content...`;
   }
   ```

### Why This Matters

- **Auditability**: All prompt changes are versioned and tracked
- **Tunability**: Admins can improve prompts without code deployment
- **Consistency**: All prompts follow the same management pattern
- **Transparency**: Users can see exactly what prompts are being used

### Current Managed Prompts

- `classification` - Main classification prompt
- `clarification` - Clarifying question generation
- `attribute-extraction` - Business attribute extraction
- `decision-matrix-generation` - Decision matrix generation

### Code Review Checklist

When reviewing code that adds LLM interactions:

- [ ] Is there a new prompt being used?
- [ ] Is it loaded from versioned storage?
- [ ] Is it initialized in startup.ts?
- [ ] Is it registered in the prompts API?
- [ ] Does it have validation rules?
- [ ] Is there a fallback default prompt?

**If any answer is NO, the code should not be merged.**
