# Prompt Storage Consolidation Plan

## Current Problem

We have **TWO data directories** causing confusion:

1. **`./data/`** (root level) - Empty, only `.gitkeep` files
2. **`./backend/data/`** (backend folder) - **Contains actual prompts and data**

### Why This Happened

- `.env` sets `DATA_DIR=/data` (for Docker container)
- Code defaults to `./data` (for local development)
- When backend runs, working directory matters:
  - If run from root: uses `./data` (root level)
  - If run from backend: uses `./data` (backend/data)
- Docker mounts `/data` volume to `./data` on host

## Current State

### Root `./data/` Directory
```
data/
├── .gitkeep
├── analytics/
├── audio/
├── audit-logs/
├── decision-matrix/
├── learning/
├── pii-mappings/
├── prompts/          ← EMPTY (only .gitkeep)
├── sessions/
└── users/
```

### Backend `./backend/data/` Directory
```
backend/data/
├── analytics/
├── audio/
├── audit-logs/
├── decision-matrix/
├── learning/
├── pii-mappings/
├── prompts/          ← HAS ACTUAL PROMPTS (9 files)
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

## Recommended Solution: Use Root `./data/` Only

### Why Root Level?

1. **Docker compatibility**: Docker mounts to root `./data`
2. **Cleaner structure**: Backend code shouldn't own data
3. **Easier backups**: One data directory to backup
4. **Simpler .gitignore**: One set of rules

### Migration Steps

#### Step 1: Move Prompts to Root

```bash
# Copy prompts from backend/data to root data
cp backend/data/prompts/*.txt data/prompts/

# Verify
ls -la data/prompts/
```

#### Step 2: Update .env for Local Development

```bash
# In .env (root level)
DATA_DIR=./data
```

This makes local dev use root `./data` directory.

#### Step 3: Update Docker Compose (if needed)

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - ./data:/data  # Maps root ./data to container /data
```

#### Step 4: Update .gitignore

```gitignore
# Root data directory
data/*
!data/prompts/
data/prompts/*
!data/prompts/.gitkeep
!data/prompts/*-v*.txt

# Backend data directory - REMOVE THIS
# backend/data/*
# !backend/data/prompts/
# backend/data/prompts/*
# !backend/data/prompts/.gitkeep
# !backend/data/prompts/*-v*.txt
```

#### Step 5: Remove Backend Data Directory

```bash
# After verifying everything works
rm -rf backend/data/
```

#### Step 6: Update Documentation

Update all docs to reference `./data/prompts/` not `backend/data/prompts/`.

## Alternative Solution: Use Backend `./backend/data/` Only

If you prefer to keep data in backend folder:

### Why Backend Level?

1. **Colocation**: Data lives with the code that uses it
2. **Isolation**: Frontend and backend data separated
3. **Simpler deployment**: Backend is self-contained

### Migration Steps

#### Step 1: Update .env

```bash
# In .env (root level)
DATA_DIR=./backend/data
```

#### Step 2: Update Docker Compose

```yaml
# docker-compose.yml
services:
  backend:
    volumes:
      - ./backend/data:/data  # Maps backend/data to container /data
```

#### Step 3: Remove Root Data Directory

```bash
# After verifying everything works
rm -rf data/
```

#### Step 4: Update .gitignore

```gitignore
# Backend data directory
backend/data/*
!backend/data/prompts/
backend/data/prompts/*
!backend/data/prompts/.gitkeep
!backend/data/prompts/*-v*.txt

# Root data directory - REMOVE THIS
# data/*
# !data/prompts/
```

## Recommendation: Use Root `./data/`

I recommend **Option 1 (Root level)** because:

1. ✅ Docker already expects `/data` at root
2. ✅ Cleaner separation of code and data
3. ✅ Easier to backup/restore
4. ✅ Standard practice for Node.js apps
5. ✅ Simpler .gitignore rules

## Quick Fix Commands

### Option 1: Consolidate to Root

```bash
# 1. Copy prompts to root
cp backend/data/prompts/*.txt data/prompts/

# 2. Update .env
echo "DATA_DIR=./data" > .env.local

# 3. Test that prompts are found
npm run dev  # Check logs for prompt loading

# 4. If working, remove backend data
rm -rf backend/data/

# 5. Update .gitignore (remove backend/data section)

# 6. Commit changes
git add data/prompts/*.txt
git add .gitignore
git commit -m "Consolidate data storage to root ./data directory"
```

### Option 2: Consolidate to Backend

```bash
# 1. Update .env
echo "DATA_DIR=./backend/data" > .env.local

# 2. Test that prompts are found
npm run dev  # Check logs for prompt loading

# 3. If working, remove root data
rm -rf data/

# 4. Update .gitignore (remove data/* section)

# 5. Commit changes
git add backend/data/prompts/*.txt
git add .gitignore
git commit -m "Consolidate data storage to backend/data directory"
```

## Testing After Migration

1. **Start backend**: `npm run dev`
2. **Check logs**: Should see "✓ Prompt exists: classification-v1.1.txt"
3. **Test prompt loading**: Make a classification request
4. **Test prompt editing**: Edit a prompt via Prompt Manager UI
5. **Verify new version**: Check that new version file is created
6. **Test git tracking**: `git status` should show new prompt versions

## Current Code Behavior

All route files use:
```typescript
const dataDir = process.env.DATA_DIR || './data';
```

This means:
- If `DATA_DIR` env var is set, use that
- Otherwise, use `./data` relative to current working directory

**Current working directory when running:**
- `npm run dev` from root: CWD is root, so `./data` = root data
- `npm run dev` from backend: CWD is backend, so `./data` = backend/data
- Docker: CWD is `/app`, `DATA_DIR=/data` is set, so uses `/data`

## Conclusion

**Choose one location and stick with it!**

My recommendation: **Root `./data/`** for the reasons listed above.

---

**Created**: November 16, 2025
**Status**: Awaiting decision and implementation
