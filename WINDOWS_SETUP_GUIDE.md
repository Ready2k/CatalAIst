# Windows 11 Setup Guide

Quick guide for running CatalAIst on Windows 11.

## Prerequisites

- **Node.js 20+** - Download from https://nodejs.org/
- **Git** - Download from https://git-scm.com/
- **PowerShell** or **Command Prompt**

## Quick Start

### 1. Clone Repository

```powershell
git clone <repository-url>
cd CatalAIst
```

### 2. Create .env File

```powershell
# Copy example file
Copy-Item .env.example .env

# Or create manually
@"
PORT=8080
JWT_SECRET=your-secret-here
PII_ENCRYPTION_KEY=your-key-here
CREDENTIALS_ENCRYPTION_KEY=your-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80
NODE_ENV=development
DATA_DIR=./data
LOG_LEVEL=debug
"@ | Out-File -FilePath .env -Encoding UTF8
```

### 3. Install Dependencies

```powershell
# Backend
cd backend
npm install

# Frontend
cd ..\frontend
npm install

# Return to root
cd ..
```

### 4. Build Backend

```powershell
cd backend
npm run build
```

### 5. Create Data Directories

```powershell
# From project root
New-Item -ItemType Directory -Force -Path data\sessions
New-Item -ItemType Directory -Force -Path data\audit-logs
New-Item -ItemType Directory -Force -Path data\prompts
New-Item -ItemType Directory -Force -Path data\audio
New-Item -ItemType Directory -Force -Path data\audio\cache
New-Item -ItemType Directory -Force -Path data\analytics
New-Item -ItemType Directory -Force -Path data\pii-mappings
New-Item -ItemType Directory -Force -Path data\decision-matrix
New-Item -ItemType Directory -Force -Path data\learning
New-Item -ItemType Directory -Force -Path data\users
```

### 6. Create Admin User

```powershell
cd backend
npm run create-admin:dev
```

### 7. Run Development Servers

**Terminal 1 - Backend:**
```powershell
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm start
```

## Port Configuration

### Default Ports
- **Backend:** 8080
- **Frontend:** 3000

### If Backend Runs on Port 4000

This usually means the `.env` file isn't being loaded correctly.

**Fix:**

1. **Check if .env exists:**
   ```powershell
   Get-Item .env
   ```

2. **Verify PORT setting:**
   ```powershell
   Get-Content .env | Select-String "PORT"
   ```

3. **Check environment variable:**
   ```powershell
   $env:PORT
   ```

4. **If PORT is set to 4000, clear it:**
   ```powershell
   Remove-Item Env:\PORT
   ```

5. **Ensure .env has correct value:**
   ```powershell
   # Add or update PORT in .env
   (Get-Content .env) -replace 'PORT=.*', 'PORT=8080' | Set-Content .env
   ```

6. **Restart backend:**
   ```powershell
   cd backend
   npm run dev
   ```

**You should see:**
```
Loaded environment from: C:\path\to\CatalAIst\.env
Server Configuration:
- Port: 8080
- Node Environment: development
...
✅ Backend server running on port 8080
```

## Common Windows Issues

### Issue 1: PowerShell Execution Policy

**Error:** "cannot be loaded because running scripts is disabled"

**Fix:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue 2: Port Already in Use

**Error:** "EADDRINUSE: address already in use :::8080"

**Fix:**
```powershell
# Find process using port 8080
netstat -ano | findstr :8080

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Issue 3: .env File Not Found

**Error:** "Warning: No .env file found"

**Fix:**
```powershell
# Check if file exists
Test-Path .env

# If false, create it
Copy-Item .env.example .env
```

### Issue 4: Node Version Too Old

**Check version:**
```powershell
node --version
```

**Should be:** v20.x.x or higher

**Fix:** Download latest LTS from https://nodejs.org/

### Issue 5: npm Not Found

**Error:** "npm : The term 'npm' is not recognized"

**Fix:**
1. Restart PowerShell/Terminal
2. If still not working, reinstall Node.js
3. Add to PATH: `C:\Program Files\nodejs\`

## Docker on Windows

### Using Docker Desktop

1. **Install Docker Desktop** - https://www.docker.com/products/docker-desktop/

2. **Enable WSL 2** (recommended):
   ```powershell
   wsl --install
   ```

3. **Build and run:**
   ```powershell
   docker-compose build
   docker-compose up -d
   ```

4. **Access application:**
   - Frontend: http://localhost
   - Backend: http://localhost:8080

### Docker Port Mapping

Docker uses port mapping defined in `docker-compose.yml`:
```yaml
backend:
  ports:
    - "8080:8080"  # Host:Container

frontend:
  ports:
    - "80:8080"    # Host:Container
```

## File Paths on Windows

### Correct Paths
```
C:\Users\YourName\CatalAIst\.env          ✅
C:\Users\YourName\CatalAIst\backend       ✅
C:\Users\YourName\CatalAIst\frontend      ✅
```

### Incorrect Paths
```
C:\Users\YourName\CatalAIst\backend\.env  ❌
C:\Users\YourName\.env                    ❌
```

## Environment Variables

### View All Environment Variables
```powershell
Get-ChildItem Env:
```

### Set Environment Variable (Session)
```powershell
$env:PORT = "8080"
```

### Set Environment Variable (Permanent)
```powershell
[System.Environment]::SetEnvironmentVariable('PORT', '8080', 'User')
```

### Remove Environment Variable
```powershell
Remove-Item Env:\PORT
```

## Troubleshooting Commands

### Check Running Processes
```powershell
# All Node processes
Get-Process node

# Processes using specific port
netstat -ano | findstr :8080
```

### Kill Node Processes
```powershell
# Kill all Node processes
Get-Process node | Stop-Process -Force

# Kill specific process
Stop-Process -Id <PID> -Force
```

### Check File Contents
```powershell
# View .env
Get-Content .env

# Search for specific line
Get-Content .env | Select-String "PORT"
```

### Network Diagnostics
```powershell
# Test if port is accessible
Test-NetConnection -ComputerName localhost -Port 8080

# List all listening ports
netstat -ano | findstr LISTENING
```

## VS Code on Windows

### Recommended Extensions
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Docker (if using Docker)

### Integrated Terminal
- Use PowerShell or Command Prompt
- Set default: `Ctrl+Shift+P` -> "Terminal: Select Default Profile"

### Path Separators
VS Code handles both:
- Windows: `C:\path\to\file`
- Unix: `/path/to/file`

Node.js automatically converts paths.

## Performance Tips

### 1. Exclude from Windows Defender
Add project folder to exclusions for faster npm install:
1. Windows Security -> Virus & threat protection
2. Manage settings -> Exclusions
3. Add folder: `C:\Users\YourName\CatalAIst`

### 2. Use SSD
Store project on SSD for better performance.

### 3. Close Unnecessary Programs
Node.js development can be memory-intensive.

## Quick Reference

### Start Development
```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm start
```

### Stop Development
```
Ctrl+C in each terminal
```

### Rebuild
```powershell
cd backend
npm run build
```

### Reset Everything
```powershell
# Stop all Node processes
Get-Process node | Stop-Process -Force

# Clean dependencies
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

cd ..\frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

## Getting Help

### Check Logs
Backend logs show configuration on startup:
```
Server Configuration:
- Port: 8080
- Node Environment: development
- Data Directory: ./data
- Allowed Origins: http://localhost:3000,http://localhost:80
```

### Common Log Messages

**✅ Good:**
```
Loaded environment from: C:\...\CatalAIst\.env
✅ Backend server running on port 8080
```

**⚠️ Warning:**
```
Warning: No .env file found, using environment variables or defaults
⚠️ WARNING: Running on port 4000 instead of default 8080
```

**❌ Error:**
```
Error: EADDRINUSE: address already in use :::8080
Error: JWT_SECRET not configured
```

### Documentation
- `PORT_TROUBLESHOOTING.md` - Port configuration issues
- `LOCAL_DEVELOPMENT.md` - General development guide
- `BUILD_FIX_SUMMARY.md` - Build issues

---

**Last Updated:** November 10, 2025
