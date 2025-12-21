# Prompt Storage Location - Definitive Guide

## TL;DR

**Prompts are stored in: `backend/data/prompts/`**

That's it. One location. Simple.

## Why This Location?

1. **Working Directory**: Backend runs from `backend/` folder
2. **Relative Paths**: Code uses `./data` which resolves to `backend/data/`
3. **Docker**: In production, `/data` is mounted and `DATA_DIR=/data` env var is set
4. **Local Dev**: No `DATA_DIR` set, so defaults to `./data` = `backend/data/`

## Directory Structure

```
backend/data/
├── analytics/
├── audio/
├── audit-logs/
├── decision-matrix/
├── learning/
├── pii-mappings/
├── prompts/                    ← PROMPTS ARE HERE
│   ├── .gitkeep
│   ├── attribute-extraction-v1.0.txt
│   ├── attribute-extraction-v1.1.txt
│   ├── clarification-v1.0.txt
│   ├── clarification-v1.1.txt
│   ├── clarification-v1.2.txt
│   ├── classification-v1.0.txt
│   ├── classification-v1.1.txt
│   ├── decision-matrix-generation-v1.0.txt
│   └── decision-matrix-generation-v1.1.txt
├── sessions/
└── users/
```

## How It Works

### Code Configuration

Every route file has:
```typescript
const dataDir = process.env.DATA_DIR || './data';
const jsonStorage = new JsonStorageService(dataDir);
const versionedStorage = new VersionedStorageService(jsonStorage);
```

### Environment Variables

**Local Development** (no .env or DATA_DIR not set):
- `dataDir = './data'`
- Working directory = `backend/`
- Resolves to: `backend/data/`

**Docker Production** (.env has `DATA_DIR=/data`):
- `dataDir = '/data'`
- Docker mounts `./backend/data` to `/data` in container
- Resolves to: `/data/` (which is `backend/data/` on host)

## Prompt File Naming

Format: `{prompt-id}-v{version}.txt`

Examples:
- `classification-v1.0.txt` - Initial version
- `classification-v1.1.txt` - Minor update
- `classification-v1.1.1.txt` - Patch update
- `classification-v2.0.txt` - Major rewrite

## Git Tracking

`.gitignore` is configured to:
- ✅ Track all prompt versions: `!backend/data/prompts/*-v*.txt`
- ❌ Ignore all other data: `backend/data/*`
- ✅ Keep directory structure: `!backend/data/prompts/`

## Viewing Prompts

### Via File System
```bash
ls -la backend/data/prompts/
cat backend/data/prompts/classification-v1.1.txt
```

### Via Git
```bash
git ls-files backend/data/prompts/
git log backend/data/prompts/classification-v1.1.txt
```

### Via API (Admin Only)
```bash
# List all prompts
curl http://localhost:8080/api/prompts

# Get specific prompt
curl http://localhost:8080/api/prompts/classification

# Get specific version
curl http://localhost:8080/api/prompts/classification/versions/1.0
```

### Via UI (Admin Only)
1. Login as admin
2. Navigate to "Prompts" tab
3. Select prompt from list
4. View current version and content

## Editing Prompts

### Via UI (Recommended)
1. Login as admin
2. Go to "Prompts" tab
3. Select prompt
4. Click "✏️ Edit"
5. Make changes
6. Click "💾 Save Changes"
7. Version automatically bumps (e.g., 1.1 → 1.1.1)

### Via File System (Not Recommended)
```bash
# Edit file directly
nano backend/data/prompts/classification-v1.1.txt

# Create new version manually
cp backend/data/prompts/classification-v1.1.txt \
   backend/data/prompts/classification-v1.2.txt
nano backend/data/prompts/classification-v1.2.txt
```

**Warning**: Editing files directly bypasses version bumping and audit logging!

## Committing Prompt Changes

After editing prompts via UI:

```bash
# Check what changed
git status backend/data/prompts/

# Add new versions
git add backend/data/prompts/*-v*.txt

# Commit with descriptive message
git commit -m "Updated classification prompt to v1.1.1 - improved category progression explanation"

# Push to remote
git push
```

## Troubleshooting

### Prompt Not Found

**Symptom**: "Failed to load prompt from storage"

**Causes**:
1. File doesn't exist in `backend/data/prompts/`
2. Wrong working directory
3. Permissions issue

**Solution**:
```bash
# Check if file exists
ls -la backend/data/prompts/classification-v*.txt

# Check working directory
pwd  # Should be in backend/ when running npm run dev

# Check permissions
chmod 644 backend/data/prompts/*.txt
```

### Wrong Version Loaded

**Symptom**: Old prompt version being used

**Causes**:
1. Multiple versions exist, system loads latest
2. Cache issue

**Solution**:
```bash
# Check which versions exist
ls -la backend/data/prompts/classification-v*.txt

# Latest version is used (highest version number)
# Delete old versions if needed
rm backend/data/prompts/classification-v1.0.txt
```

### Git Not Tracking New Versions

**Symptom**: `git status` doesn't show new prompt files

**Causes**:
1. `.gitignore` pattern wrong
2. File naming doesn't match pattern

**Solution**:
```bash
# Check if file matches pattern
git check-ignore -v backend/data/prompts/classification-v1.1.1.txt

# Should show: .gitignore:XX:!backend/data/prompts/*-v*.txt

# If ignored, check filename matches pattern: *-v*.txt
```

## Migration from Root `./data/`

If you have prompts in root `./data/prompts/`, migrate them:

```bash
# Copy to backend
cp data/prompts/*.txt backend/data/prompts/

# Verify
ls -la backend/data/prompts/

# Test backend
cd backend && npm run dev

# If working, remove root data
rm -rf data/

# Update git
git add backend/data/prompts/*.txt
git rm -r data/
git commit -m "Migrate prompts to backend/data/prompts/"
```

## Docker Configuration

### docker-compose.yml
```yaml
services:
  backend:
    environment:
      - DATA_DIR=/data
    volumes:
      - ./backend/data:/data  # Mount backend/data to /data in container
```

### Dockerfile
```dockerfile
# Create data directory
RUN mkdir -p /data/prompts

# Copy default prompts
COPY backend/data/prompts/*.txt /data/prompts/
```

## Best Practices

1. ✅ **Always edit via UI** - Ensures version bumping and audit logging
2. ✅ **Commit prompt changes** - Track prompt evolution in git
3. ✅ **Use semantic versioning** - Patch for small changes, minor for features, major for rewrites
4. ✅ **Test after editing** - Verify prompt works before committing
5. ✅ **Document changes** - Use descriptive commit messages
6. ❌ **Don't delete old versions** - Keep for audit trail and rollback
7. ❌ **Don't edit files directly** - Use UI to ensure proper versioning

## Summary

- **Location**: `backend/data/prompts/`
- **Naming**: `{prompt-id}-v{version}.txt`
- **Versioning**: Automatic patch bumps via UI
- **Git**: Tracked via `.gitignore` pattern
- **Access**: Via UI (admin), API (admin), or file system

That's it! One location, simple rules, automatic versioning.

---

**Last Updated**: November 16, 2025
**Status**: ✅ Definitive Guide
