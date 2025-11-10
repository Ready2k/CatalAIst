# Port Configuration Troubleshooting

## Issue: Backend Running on Wrong Port (e.g., 4000 instead of 8080)

### Expected Behavior
- **Backend:** Port 8080
- **Frontend (dev):** Port 3000
- **Frontend (prod):** Port 80

### Common Causes

#### 1. Missing or Incorrect .env File

**Check if .env exists:**
```bash
# Windows
dir .env

# Mac/Linux
ls -la .env
```

**Verify PORT setting:**
```bash
# Windows
type .env | findstr PORT

# Mac/Linux
cat .env | grep PORT
```

**Expected output:**
```
PORT=8080
```

**Fix:**
```bash
# Create .env from example
cp .env.example .env

# Or manually add
echo PORT=8080 >> .env
```

#### 2. Environment Variable Override

The backend checks for PORT in this order:
1. Environment variable `PORT`
2. `.env` file `PORT`
3. Default: `8080`

**Check environment variables:**
```bash
# Windows (PowerShell)
$env:PORT

# Windows (CMD)
echo %PORT%

# Mac/Linux
echo $PORT
```

**If PORT is set to 4000, unset it:**
```bash
# Windows (PowerShell)
Remove-Item Env:\PORT

# Windows (CMD)
set PORT=

# Mac/Linux
unset PORT
```

#### 3. .env File Not Being Loaded

The backend tries to load `.env` from multiple locations:
1. `dist/backend/src/../../../.env` (compiled code)
2. `backend/src/../../.env` (source code)
3. `<current-directory>/.env` (working directory)

**Debug .env loading:**

The backend now logs which .env file it loads:
```
Loaded environment from: /path/to/project/.env
```

If you see:
```
Warning: No .env file found, using environment variables or defaults
```

Then the .env file isn't being found.

**Fix:**
```bash
# Ensure .env is in project root
cd /path/to/CatalAIst
ls -la .env

# If missing, create it
cp .env.example .env
```

#### 4. Windows Path Issues

Windows uses backslashes (`\`) while the code uses forward slashes (`/`). Node.js usually handles this, but there can be issues.

**Verify working directory:**
```bash
# Windows (PowerShell)
Get-Location

# Windows (CMD)
cd

# Should show: C:\path\to\CatalAIst
```

**Run from project root:**
```bash
# Navigate to project root
cd C:\path\to\CatalAIst

# Then run backend
cd backend
npm run dev
```

#### 5. Multiple .env Files

Check if there are multiple .env files:
```bash
# Windows (PowerShell)
Get-ChildItem -Recurse -Filter ".env*"

# Mac/Linux
find . -name ".env*"
```

**Common locations:**
- `.env` (project root) ✅ Correct
- `backend/.env` ❌ Wrong location
- `.env.local` ⚠️ Not used by backend
- `.env.development` ⚠️ Not used by backend

**Fix:**
- Keep only `.env` in project root
- Delete any `.env` files in subdirectories

#### 6. npm Scripts Issue

Check if package.json has a PORT override:

**Check backend/package.json:**
```json
{
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
  }
}
```

**Should NOT have:**
```json
{
  "scripts": {
    "dev": "PORT=4000 ts-node-dev ..."  // ❌ Wrong
  }
}
```

### Debugging Steps

#### Step 1: Check Current Configuration

Run the backend and look for the startup logs:
```bash
cd backend
npm run dev
```

**Look for:**
```
Server Configuration:
- Port: 8080
- Node Environment: development
- Data Directory: ./data
- Allowed Origins: http://localhost:3000,http://localhost:80
```

If it shows `Port: 4000`, continue to next steps.

#### Step 2: Verify .env File

```bash
# From project root
cat .env

# Should contain:
PORT=8080
```

#### Step 3: Check Environment Variables

```bash
# Windows (PowerShell)
Get-ChildItem Env: | Where-Object {$_.Name -like "*PORT*"}

# Mac/Linux
env | grep PORT
```

**Should show:**
```
PORT=8080
```

Or nothing (will use default 8080).

**Should NOT show:**
```
PORT=4000  # ❌ This is the problem
```

#### Step 4: Clean Start

```bash
# 1. Stop all Node processes
# Windows: Task Manager -> End Node.js processes
# Mac/Linux: killall node

# 2. Clear environment
# Windows (PowerShell)
Remove-Item Env:\PORT

# Mac/Linux
unset PORT

# 3. Verify .env
cat .env | grep PORT
# Should show: PORT=8080

# 4. Restart backend
cd backend
npm run dev
```

#### Step 5: Force Port

If all else fails, temporarily hardcode the port:

**Edit backend/src/index.ts:**
```typescript
const PORT = 8080; // Force port 8080
```

**Then rebuild:**
```bash
cd backend
npm run build
npm run dev
```

### Windows-Specific Issues

#### Issue: .env File Not Found on Windows

**Cause:** Windows file explorer might hide the `.env` file.

**Fix:**
1. Open File Explorer
2. View -> Show -> Hidden items
3. Look for `.env` in project root

**Or create via command line:**
```powershell
# PowerShell
Copy-Item .env.example .env

# Or create manually
New-Item -Path .env -ItemType File
```

#### Issue: Line Endings (CRLF vs LF)

**Cause:** Windows uses CRLF (`\r\n`) while Unix uses LF (`\n`).

**Fix:**
```bash
# Convert .env to LF line endings
# Using Git
git config core.autocrlf false
git rm --cached .env
git add .env

# Or use dos2unix (if installed)
dos2unix .env
```

#### Issue: PowerShell Execution Policy

**Cause:** PowerShell might block npm scripts.

**Fix:**
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Verification

After fixing, verify the port:

```bash
# 1. Start backend
cd backend
npm run dev

# 2. Check startup logs
# Should show: ✅ Backend server running on port 8080

# 3. Test health endpoint
curl http://localhost:8080/health

# 4. Check listening ports
# Windows
netstat -ano | findstr :8080

# Mac/Linux
lsof -i :8080
```

### Quick Fix Script

**Windows (PowerShell):**
```powershell
# Save as fix-port.ps1
Remove-Item Env:\PORT -ErrorAction SilentlyContinue
Set-Content -Path .env -Value "PORT=8080"
Write-Host "Port reset to 8080"
```

**Mac/Linux:**
```bash
# Save as fix-port.sh
#!/bin/bash
unset PORT
echo "PORT=8080" > .env
echo "Port reset to 8080"
```

### Still Having Issues?

1. **Check the logs:** The backend now shows which .env file it loaded
2. **Verify file location:** .env must be in project root
3. **Check for typos:** `PORT=8080` (no spaces)
4. **Restart terminal:** Close and reopen terminal/PowerShell
5. **Check other processes:** Something else might be using port 8080

### Contact Support

If none of these solutions work, provide:
1. Output of `npm run dev`
2. Contents of `.env` file (remove secrets)
3. Output of `echo $PORT` (or `$env:PORT` on Windows)
4. Operating system and Node.js version

---

**Last Updated:** November 10, 2025
