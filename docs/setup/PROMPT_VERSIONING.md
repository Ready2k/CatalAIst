# Prompt Versioning and Git Management

## Overview

CatalAIst uses a versioned prompt management system where prompts are stored as text files and automatically loaded by version. This document explains how prompts are managed in git and how versioning works.

## Prompt Files in Git

### What's Tracked

All default prompt files are tracked in git:
- `data/prompts/*-v1.*.txt` - All versioned prompt files (v1.0, v1.1, v1.2, etc.)
- `data/prompts/.gitkeep` - Ensures the directory exists

### What's Ignored

User data and runtime files are ignored:
- `data/sessions/` - User session data
- `data/audit-logs/` - Audit trail logs
- `data/analytics/` - Analytics data
- `data/pii-mappings/` - PII encryption mappings
- `data/decision-matrix/` - Decision matrix versions (except defaults)
- `data/learning/` - Learning suggestions
- `data/users/` - User accounts
- `data/audio/` - Audio files

## Current Prompt Versions

### v1.1 Prompts (Latest)

1. **classification-v1.1.txt** (5.5 KB)
   - Enhanced classification logic
   - Better understanding of AI Agent vs RPA
   - Focus on data source and judgment requirements
   - Structured decision factors

2. **clarification-v1.1.txt** (4.2 KB)
   - Improved discovery interview approach
   - Focus on current state vs desired state
   - Better questions about data source and output usage
   - Priority framework for questions

3. **attribute-extraction-v1.1.txt** (6.1 KB)
   - 10 attributes instead of 6
   - New attributes: data_source, output_type, judgment_required, current_state
   - Better extraction guidelines
   - Focus on keywords indicating judgment requirements

### v1.0 Prompts (Legacy)

1. **classification-v1.0.txt** (2.4 KB)
   - Original classification prompt
   - Basic category evaluation

2. **clarification-v1.0.txt** (2.0 KB)
   - Original clarification questions
   - Basic attribute focus

3. **attribute-extraction-v1.0.txt** (2.6 KB)
   - Original 6 attributes
   - Basic extraction logic

4. **decision-matrix-generation-v1.0.txt** (2.8 KB)
   - Decision matrix generation prompt
   - Used for auto-generating decision matrices

## How Versioning Works

### Automatic Version Selection

The `VersionedStorageService.getPrompt()` method automatically:

1. Lists all files matching the pattern: `{promptId}-v*.txt`
2. Extracts version numbers (e.g., "1.0", "1.1", "2.0")
3. Sorts versions in descending order
4. Returns the **latest version**

Example:
```typescript
// Service code
const prompt = await versionedStorage.getPrompt('classification');
// Returns content from: classification-v1.1.txt (latest)
```

### Version Format

Versions follow semantic versioning:
- Format: `v{major}.{minor}` (e.g., v1.0, v1.1, v2.0)
- File naming: `{promptId}-v{version}.txt`
- Examples:
  - `classification-v1.0.txt`
  - `classification-v1.1.txt`
  - `clarification-v2.0.txt`

### Creating New Versions

To create a new prompt version:

1. **Create the file:**
   ```bash
   # Copy existing version as starting point
   cp data/prompts/classification-v1.1.txt data/prompts/classification-v1.2.txt
   
   # Edit the new version
   nano data/prompts/classification-v1.2.txt
   ```

2. **Add to git:**
   ```bash
   git add data/prompts/classification-v1.2.txt
   git commit -m "feat: Add classification prompt v1.2 with improved logic"
   ```

3. **Deploy:**
   - The new version will automatically be used on next restart
   - No code changes needed!

## Prompt Management UI

Admins can view and edit prompts through the web UI:

1. Navigate to **Prompts** tab
2. Select a prompt type (classification, clarification, etc.)
3. View current version and content
4. Edit and save (creates new version automatically)

### Version History

- All versions are retained for audit purposes
- Previous versions can be viewed in the UI
- Rollback is possible by creating a new version with old content

## Git Workflow

### Initial Setup

When setting up a new environment:

```bash
# Clone repository
git clone <repo-url>
cd catalai

# Prompts are already in git
ls data/prompts/*.txt
# Shows all versioned prompts

# Start application
./setup-docker.sh
# Prompts are automatically loaded
```

### Updating Prompts

When pulling updates:

```bash
# Pull latest changes
git pull

# New prompt versions are automatically available
# Restart to use new versions
docker-compose restart backend
```

### Creating Custom Prompts

For organization-specific customizations:

```bash
# Create new version
cp data/prompts/classification-v1.1.txt data/prompts/classification-v1.2-custom.txt

# Edit for your needs
nano data/prompts/classification-v1.2-custom.txt

# Add to git (optional - can keep local only)
git add data/prompts/classification-v1.2-custom.txt
git commit -m "feat: Add custom classification prompt for our industry"
```

## Best Practices

### 1. Always Version Prompts

- Never edit existing prompt files directly
- Always create a new version
- This maintains audit trail and allows rollback

### 2. Test Before Deploying

```bash
# Test new prompt locally first
docker-compose restart backend
# Try classifications with new prompt
# Verify results are improved
```

### 3. Document Changes

In commit messages, explain:
- What changed in the prompt
- Why the change was made
- Expected impact on classifications

Example:
```bash
git commit -m "feat: Add classification v1.2 - Better RPA vs AI Agent distinction

- Added focus on data source (observational vs transactional)
- Improved decision logic for judgment requirements
- Expected to reduce misclassification of reporting processes as RPA"
```

### 4. Keep Old Versions

- Don't delete old prompt versions
- They serve as audit trail
- Useful for understanding prompt evolution
- Can be referenced if new version has issues

### 5. Coordinate with Team

- Communicate prompt changes to team
- Test with sample processes before deploying
- Monitor classification quality after deployment

## Troubleshooting

### Prompt Not Updating

If a new prompt version isn't being used:

1. **Check file exists:**
   ```bash
   ls -la data/prompts/classification-v*.txt
   ```

2. **Verify version format:**
   - Must be: `{promptId}-v{major}.{minor}.txt`
   - Example: `classification-v1.2.txt` ✓
   - Not: `classification-1.2.txt` ✗

3. **Restart backend:**
   ```bash
   docker-compose restart backend
   ```

4. **Check logs:**
   ```bash
   docker-compose logs backend | grep -i prompt
   ```

### Prompt Not in Git

If prompts aren't being tracked:

1. **Check .gitignore:**
   ```bash
   git check-ignore -v data/prompts/*.txt
   # Should show nothing (not ignored)
   ```

2. **Add explicitly:**
   ```bash
   git add -f data/prompts/*.txt
   ```

3. **Verify pattern:**
   ```bash
   # .gitignore should have:
   !data/prompts/*-v1.*.txt
   ```

## Related Documentation

- [Prompt Management Policy](.kiro/steering/prompt-management-policy.md) - Development guidelines
- [Prompt Management Fix](../fixes/PROMPT_MANAGEMENT_FIX.md) - Implementation details
- [Clarification Prompt Enhancement](../deployment/DEPLOYMENT_NOTE_v1.1_PROMPT.md) - v1.1 improvements

## Support

For questions about prompt management:
1. Check this documentation
2. Review prompt management policy
3. Check git history: `git log data/prompts/`
4. Review service code: `backend/src/services/versioned-storage.service.ts`
