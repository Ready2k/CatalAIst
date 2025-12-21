# Prompt Versioning Guide

## Overview

CatalAIst automatically versions all prompt changes to provide an audit trail, enable A/B testing, and allow rollback to previous versions.

## How It Works

### Automatic Version Bumping

When you save a prompt through the Prompt Manager UI:

```
First Save:     → v1.0
Second Save:    → v1.0.1
Third Save:     → v1.0.2
Fourth Save:    → v1.0.3
...and so on
```

### Version Format

We use **Semantic Versioning**: `major.minor.patch`

- **Major** (1.0.0 → 2.0.0): Breaking changes, complete rewrites
- **Minor** (1.0.0 → 1.1.0): New features, significant improvements
- **Patch** (1.0.0 → 1.0.1): Bug fixes, typos, minor improvements

### When to Use Manual Versioning

By default, the system automatically bumps the **patch** version. However, you can manually specify a version for significant changes:

**Automatic (Patch Bump)**:
- Fixed a typo
- Improved wording
- Minor clarifications
- Small adjustments

**Manual Minor Bump** (e.g., 1.0.5 → 1.1.0):
- Added new guidance section
- Improved classification logic
- Enhanced response format
- Added new examples

**Manual Major Bump** (e.g., 1.5.2 → 2.0.0):
- Complete prompt rewrite
- Changed response format
- Fundamentally different approach
- Breaking changes

## File Storage

Prompts are stored in `backend/data/prompts/` with this naming convention:

```
backend/data/prompts/
├── classification-v1.0.txt
├── classification-v1.0.1.txt
├── classification-v1.0.2.txt
├── classification-v1.1.0.txt
├── classification-v2.0.0.txt
├── clarification-v1.0.txt
├── clarification-v1.0.1.txt
└── ...
```

**Note**: This is the ONLY location where prompts are stored. The backend runs from the `backend/` directory, so `./data` resolves to `backend/data/`.

## Version History Example

Here's a realistic version history for the classification prompt:

```
v1.0     - Initial version (from startup.ts)
v1.0.1   - Fixed typo in "Digitise" description
v1.0.2   - Improved rationale explanation
v1.0.3   - Added more examples for AI Agent category
v1.1.0   - Added "futureOpportunities" field to response format
v1.1.1   - Clarified confidence scoring guidelines
v1.1.2   - Enhanced RPA vs AI Agent distinction
v2.0.0   - Complete rewrite with new category progression logic
v2.0.1   - Fixed JSON format in example
```

## Using the Prompt Manager

### Viewing Current Version

1. Navigate to **Prompts** tab (admin only)
2. Select a prompt from the list
3. Current version shown at top: "Version: 1.0.2"

### Editing a Prompt

1. Click **✏️ Edit** button
2. Make your changes in the text area
3. Click **💾 Save Changes**
4. Version automatically bumps (e.g., 1.0.2 → 1.0.3)
5. Success message shows new version

### Viewing Version History

Currently, you can see:
- Current version number
- Number of available versions
- Last updated timestamp

**Future Enhancement**: Version comparison UI to see differences between versions.

## API Endpoints

### Get Current Prompt
```http
GET /api/prompts/:id
```

Returns the latest version of the prompt.

### Get Specific Version
```http
GET /api/prompts/:id/versions/:version
```

Returns a specific version (e.g., `/api/prompts/classification/versions/1.0.1`).

### List All Versions
```http
GET /api/prompts/:id/versions
```

Returns all available versions in descending order.

### Update Prompt
```http
PUT /api/prompts/:id
Content-Type: application/json

{
  "content": "Updated prompt content...",
  "userId": "admin"
}
```

Automatically creates a new version with bumped patch number.

## Best Practices

### 1. Make Small, Incremental Changes

✅ **Good**:
- Edit prompt
- Test with a few classifications
- Save (auto-bump to 1.0.1)
- Test more
- Make another small change
- Save (auto-bump to 1.0.2)

❌ **Avoid**:
- Making massive changes all at once
- Not testing between versions
- Losing track of what changed

### 2. Document Significant Changes

When making a manual version bump, document why:

```
v1.1.0 - Added "futureOpportunities" field to help users understand 
         progression path from current category to more advanced ones.
         This improves the educational value of classifications.
```

### 3. Test Before Deploying

- Test new prompts with sample processes
- Compare results with previous version
- Check for unintended changes in classification behavior
- Verify JSON format is still valid

### 4. Keep Previous Versions

Don't delete old prompt files! They provide:
- Audit trail for compliance
- Ability to rollback if needed
- A/B testing opportunities
- Historical context

## Rollback Process

If a new prompt version causes issues:

1. **Identify the good version**: Check version history
2. **Get the old content**: `GET /api/prompts/:id/versions/:version`
3. **Save as new version**: Edit prompt and paste old content
4. **Or manually specify version**: Call API with explicit version number

**Note**: There's no "rollback" button yet, but you can manually revert by copying old content.

## A/B Testing (Future)

Version history enables A/B testing:

1. Create two versions (e.g., v1.5.0 and v1.6.0)
2. Randomly assign users to each version
3. Compare classification accuracy
4. Choose the better performing version
5. Make it the default

**Status**: Not yet implemented, but infrastructure is ready.

## Monitoring Version Usage

Each classification is logged with:
- Prompt version used
- Classification result
- Confidence score
- User feedback

This allows you to:
- Track which version performed best
- Identify when classification quality changed
- Correlate version changes with accuracy metrics

## Troubleshooting

### Version Not Bumping

**Symptom**: Saving prompt doesn't create new version

**Causes**:
1. Backend not running
2. Permission issues with `data/prompts/` directory
3. Validation error (check console)

**Solution**:
- Check backend logs
- Verify directory permissions
- Check browser console for errors

### Can't Find Old Version

**Symptom**: Old version not showing in version list

**Causes**:
1. File was deleted
2. File naming doesn't match pattern
3. Version number parsing issue

**Solution**:
- Check `backend/data/prompts/` directory
- Verify filename format: `{promptId}-v{version}.txt`
- Check backend logs for errors

### Version Jumped Unexpectedly

**Symptom**: Version went from 1.0.2 to 1.0.5

**Causes**:
1. Multiple saves happened quickly
2. Manual version was specified
3. Files were added manually

**Solution**:
- This is normal if multiple edits were made
- Check file timestamps to see when versions were created
- Review audit logs for who made changes

## Security Considerations

### Access Control

- Only **admin** users can edit prompts
- All changes are logged in audit trail
- User ID recorded with each version

### Audit Trail

Every prompt change is logged:
```json
{
  "timestamp": "2025-11-16T10:30:45.123Z",
  "eventType": "prompt_update",
  "userId": "admin",
  "data": {
    "promptId": "classification",
    "oldVersion": "1.0.2",
    "newVersion": "1.0.3",
    "action": "update"
  }
}
```

### Backup Recommendations

1. **Regular backups**: Backup `backend/data/prompts/` directory daily
2. **Version control**: Prompts are tracked in git via `.gitignore` pattern `!backend/data/prompts/*-v*.txt`
3. **Export**: Periodically export all prompt versions
4. **Disaster recovery**: Restore from git or backup directory

## Future Enhancements

Planned improvements:

1. **Version Comparison UI**: Visual diff between versions
2. **Rollback Button**: One-click revert to previous version
3. **Version Notes**: Add changelog/notes to each version
4. **A/B Testing Framework**: Built-in testing infrastructure
5. **Performance Metrics**: Track accuracy by version
6. **Approval Workflow**: Require approval before activating new version
7. **Scheduled Activation**: Deploy new version at specific time
8. **Canary Deployment**: Gradually roll out new version

---

**Last Updated**: November 16, 2025
**Version**: 3.0.0
