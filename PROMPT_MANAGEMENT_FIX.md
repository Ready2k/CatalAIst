# Prompt Management Fix - Decision Matrix Generation

## Problem
The decision matrix generation prompt was hardcoded in `DecisionMatrixService.buildGenerationPrompt()` and not managed through the prompt management system. This meant:
- No version history or audit trail
- Couldn't be edited through the admin UI
- Required code deployment to change
- Inconsistent with other prompts

## Solution Implemented

### 1. Added Decision Matrix Generation Prompt to Startup
**File**: `backend/src/startup.ts`
- Added `decision-matrix-generation-v1.0.txt` to default prompts initialization
- Ensures prompt is created on first startup

### 2. Updated Decision Matrix Service
**File**: `backend/src/services/decision-matrix.service.ts`
- Added `DECISION_MATRIX_GENERATION_PROMPT_ID` constant
- Replaced `buildGenerationPrompt()` with `getDecisionMatrixGenerationPrompt()`
- Now loads prompt from versioned storage with fallback to default
- Updated `generateInitialMatrix()` to use the new async method

### 3. Registered in Prompts API
**File**: `backend/src/routes/prompts.routes.ts`
- Added `'decision-matrix-generation'` to `promptTypes` array
- Added validation case for decision matrix generation prompts
- Now visible and editable through the admin UI

### 4. Created Steering Rule
**File**: `.kiro/steering/prompt-management-policy.md`
- Comprehensive policy document for all future prompt additions
- Step-by-step guide for adding new prompts
- Code review checklist to prevent this issue from recurring
- Always included in Kiro context

## Result

All 4 prompts are now fully managed:
1. ✅ `classification` - Main classification prompt
2. ✅ `clarification` - Clarifying question generation
3. ✅ `attribute-extraction` - Business attribute extraction
4. ✅ `decision-matrix-generation` - Decision matrix generation (NEW)

## Testing

Build successful with no TypeScript errors. The prompt will be:
- Visible in the Prompt Management admin UI
- Editable with version control
- Auditable through version history
- Tunable without code deployment

## Prevention

The steering rule ensures that:
- All future LLM prompts must follow the same pattern
- Code reviews will catch any hardcoded prompts
- Developers have clear guidance on adding new prompts
- The system maintains consistency and auditability
