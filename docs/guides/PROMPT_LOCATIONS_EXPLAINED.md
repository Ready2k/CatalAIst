# Prompt Locations Explained

## TL;DR

**Active Prompts Location:** `backend/data/prompts/*.txt`  
**Prompt Management UI:** Shows prompts from `backend/data/prompts/`  
**Root `prompts/` folder:** NOT USED (legacy/documentation only)

---

## Directory Structure

### ✅ ACTIVE: backend/data/prompts/

This is where the system stores and loads prompts:

```
backend/data/prompts/
├── classification-v1.0.txt
├── classification-v1.1.txt
├── clarification-v1.0.txt
├── clarification-v1.1.txt
├── clarification-v1.2.txt
├── attribute-extraction-v1.0.txt
├── attribute-extraction-v1.1.txt
├── decision-matrix-generation-v1.0.txt
└── decision-matrix-generation-v1.1.txt  ← NEW! Just created
```

**Used by:**
- Backend services (ClassificationService, DecisionMatrixService, etc.)
- Prompt Management API (`/api/prompts`)
- Prompt Admin UI (Prompts tab)

**File Format:** Plain text `.txt` files

### ❌ NOT USED: prompts/

This folder in the root is NOT used by the backend:

```
prompts/
└── classification_v1.1.json  ← NOT USED!
```

**Purpose:** Likely legacy or documentation

**Why it exists:** Probably from earlier development or as examples

**Should you use it?** No - the backend doesn't read from here

### ⚠️ data/prompts/

This is a symlink or duplicate:

```
data/prompts/
└── .gitkeep
```

**Purpose:** Placeholder for Docker volume mounting

**Actual data:** Stored in `backend/data/prompts/`

---

## How Prompts Work

### 1. Initialization (First Run)

When backend starts (`backend/src/startup.ts`):

```typescript
async function initializePrompts() {
  const promptsDir = path.join(dataDir, 'prompts');
  // Creates files in backend/data/prompts/
  
  const defaultPrompts = [
    { filename: 'classification-v1.1.txt', content: '...' },
    { filename: 'clarification-v1.2.txt', content: '...' },
    { filename: 'attribute-extraction-v1.0.txt', content: '...' },
    { filename: 'decision-matrix-generation-v1.1.txt', content: '...' }
  ];
  
  // Writes each file if it doesn't exist
}
```

### 2. Loading Prompts

Services load prompts via `VersionedStorageService`:

```typescript
const prompt = await versionedStorage.getPrompt('decision-matrix-generation');
// Loads from: backend/data/prompts/decision-matrix-generation-v1.1.txt
// (or latest version)
```

### 3. Versioning

Multiple versions can exist:

```
decision-matrix-generation-v1.0.txt  ← Old version
decision-matrix-generation-v1.1.txt  ← New version (active)
decision-matrix-generation-v1.2.txt  ← Future version
```

**Latest version is used by default**

### 4. Prompt Management UI

The Prompts tab shows all prompts from `backend/data/prompts/`:

**What you see:**
- classification (latest: v1.1)
- clarification (latest: v1.2)
- attribute-extraction (latest: v1.0)
- decision-matrix-generation (latest: v1.1) ← NOW AVAILABLE!

**What you can do:**
- View current version
- Edit and save (creates new version)
- View version history
- Restore previous versions

---

## Current Status

### ✅ Decision Matrix Generation Prompt

**Location:** `backend/data/prompts/decision-matrix-generation-v1.1.txt`

**Status:** Active and ready to use

**Changes from v1.0:**
- Added CRITICAL VALIDATION RULES section
- Explicit attribute names and values
- Validation examples (✅ correct vs ❌ wrong)
- Updated possibleValues (rare, monthly, weekly, daily, hourly)
- Changed user_count from numeric to categorical

**How to verify:**
1. Go to Prompts tab in UI
2. Select "decision-matrix-generation"
3. Should show v1.1 content with validation rules

---

## How to Update Prompts

### Method 1: Via UI (Recommended)

```
1. Login as admin
2. Navigate to "Prompts" tab
3. Select prompt (e.g., "decision-matrix-generation")
4. Click "Edit"
5. Modify content
6. Click "Save"
7. System creates new version automatically
```

### Method 2: Via API

```bash
curl -X PUT http://localhost:8080/api/prompts/decision-matrix-generation \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "<new prompt content>",
    "userId": "admin"
  }'
```

### Method 3: Direct File Edit

```bash
# Edit the file
nano backend/data/prompts/decision-matrix-generation-v1.1.txt

# No restart needed - changes take effect immediately
# (Service loads from file each time)
```

---

## FAQ

### Q: Why are there two prompts folders?

**A:** `backend/data/prompts/` is the active one. Root `prompts/` is legacy/unused.

### Q: Why .txt files instead of .json?

**A:** Prompts are plain text, not structured data. Easier to edit and version.

### Q: Can I delete the root prompts/ folder?

**A:** Yes, it's not used by the backend. But check if any documentation references it first.

### Q: How do I know which version is active?

**A:** The system uses the latest version (highest version number). Check via:
```bash
ls -la backend/data/prompts/decision-matrix-generation-*.txt
```

### Q: What if I want to rollback?

**A:** Via UI:
1. Go to Prompts tab
2. Select prompt
3. View version history
4. Select older version
5. Save as new version (doesn't delete newer versions)

### Q: Do I need to restart after updating a prompt?

**A:** No! Prompts are loaded from files each time they're used. Changes take effect immediately.

---

## Verification

### Check Active Prompts:

```bash
ls -la backend/data/prompts/
```

**Expected output:**
```
decision-matrix-generation-v1.0.txt
decision-matrix-generation-v1.1.txt  ← Should exist now
classification-v1.0.txt
classification-v1.1.txt
clarification-v1.0.txt
clarification-v1.1.txt
clarification-v1.2.txt
attribute-extraction-v1.0.txt
attribute-extraction-v1.1.txt
```

### Check via API:

```bash
curl http://localhost:8080/api/prompts/decision-matrix-generation \
  -H "Authorization: Bearer <token>"
```

**Expected:** Should return v1.1 content with validation rules

### Check via UI:

1. Login as admin
2. Go to "Prompts" tab
3. Should see 4 prompts listed
4. Click "decision-matrix-generation"
5. Should show v1.1 with CRITICAL VALIDATION RULES section

---

## Summary

✅ **Active Location:** `backend/data/prompts/*.txt`  
✅ **New Prompt Created:** `decision-matrix-generation-v1.1.txt`  
✅ **Accessible via UI:** Prompts tab  
✅ **Accessible via API:** `/api/prompts/decision-matrix-generation`  
✅ **No Restart Needed:** Changes take effect immediately  
❌ **Root prompts/ folder:** Not used by backend  

---

**Last Updated:** November 16, 2025  
**Version:** 3.1.3
