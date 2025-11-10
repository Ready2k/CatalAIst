# Port Standardization - v2.1.1

**Date:** November 10, 2025  
**Change:** Standardized local development ports

## Summary

Local development now uses standardized ports to avoid conflicts and simplify configuration:
- **Backend:** Port 4000
- **Frontend:** Port 4001

## What Changed

### Configuration Files Updated

1. **`.env.example`**
   - Changed `PORT=8080` → `PORT=4000`
   - Updated `ALLOWED_ORIGINS` to include `http://localhost:4001`

2. **`frontend/.env.example`** (NEW)
   - Added `PORT=4001`
   - Added `REACT_APP_API_URL=http://localhost:4000`

3. **`frontend/package.json`**
   - Updated proxy from `http://localhost:8080` → `http://localhost:4000`

4. **Documentation**
   - Updated `LOCAL_DEVELOPMENT.md`
   - Updated `WINDOWS_SETUP_GUIDE.md`
   - Created `CUSTOM_PORTS_GUIDE.md`

### New Files

1. **`frontend/.env.local`** - Frontend configuration
2. **`setup-local-dev.sh`** - Automated setup script (Mac/Linux)
3. **`setup-local-dev.ps1`** - Automated setup script (Windows)

## Why This Change?

### Before (Inconsistent)
- Some machines: Backend on 8080, Frontend on 3000
- Other machines: Backend on 4000, Frontend on 4001
- Caused confusion and CORS/API errors

### After (Standardized)
- All machines: Backend on 4000, Frontend on 4001
- Clear, consistent configuration
- No more "unexpected token '<'" errors

## Migration Guide

### For Existing Developers

If you already have the project set up:

#### Option 1: Use Setup Script (Recommended)

**Mac/Linux:**
```bash
./setup-local-dev.sh
```

**Windows:**
```powershell
.\setup-local-dev.ps1
```

#### Option 2: Manual Update

1. **Update `.env`:**
   ```bash
   # Change PORT from 8080 to 4000
   PORT=4000
   
   # Add frontend origin to ALLOWED_ORIGINS
   ALLOWED_ORIGINS=http://localhost:4001,http://localhost:3000,http://localhost:80
   ```

2. **Create `frontend/.env.local`:**
   ```bash
   PORT=4001
   REACT_APP_API_URL=http://localhost:4000
   ```

3. **Restart both services:**
   ```bash
   # Terminal 1
   cd backend
   npm run dev
   
   # Terminal 2
   cd frontend
   npm start
   ```

### For New Developers

Just run the setup script:

**Mac/Linux:**
```bash
./setup-local-dev.sh
```

**Windows:**
```powershell
.\setup-local-dev.ps1
```

## Port Reference

### Local Development
- **Backend:** 4000
- **Frontend:** 4001
- **Configuration:** `.env` and `frontend/.env.local`

### Docker (Development)
- **Backend:** 8080 (exposed)
- **Frontend:** 80 (exposed)
- **Configuration:** `docker-compose.yml`

### Docker (Production)
- **nginx:** 80 and 443 (exposed)
- **Backend:** 8080 (internal)
- **Frontend:** 8080 (internal)
- **Configuration:** `docker-compose.prod.yml`

## Troubleshooting

### "Port 4000 already in use"

```bash
# Mac/Linux
lsof -ti:4000 | xargs kill

# Windows
netstat -ano | findstr :4000
taskkill /PID <PID> /F
```

### "CORS Error"

Make sure `.env` has:
```bash
ALLOWED_ORIGINS=http://localhost:4001
```

### "404 on /api/auth/login"

Make sure `frontend/.env.local` has:
```bash
REACT_APP_API_URL=http://localhost:4000
```

### "unexpected token '<'"

This means frontend is calling itself instead of backend. Create `frontend/.env.local`:
```bash
PORT=4001
REACT_APP_API_URL=http://localhost:4000
```

## Benefits

1. **Consistency** - Same ports on all machines
2. **No Conflicts** - Ports 4000/4001 less likely to be in use
3. **Clear Configuration** - Explicit API URL in frontend
4. **Better Debugging** - Easy to see which service is which
5. **Documentation** - All docs now consistent

## Backward Compatibility

If you prefer the old ports (8080/3000), you can still use them:

1. Change `PORT=4000` to `PORT=8080` in `.env`
2. Change `PORT=4001` to `PORT=3000` in `frontend/.env.local`
3. Change `REACT_APP_API_URL=http://localhost:4000` to `http://localhost:8080`
4. Update `ALLOWED_ORIGINS` to include `http://localhost:3000`

## Related Documentation

- `LOCAL_DEVELOPMENT.md` - Local development guide
- `CUSTOM_PORTS_GUIDE.md` - Running on custom ports
- `WINDOWS_SETUP_GUIDE.md` - Windows-specific setup
- `PORT_TROUBLESHOOTING.md` - Port configuration issues

---

**Version:** 2.1.1  
**Status:** ✅ Complete  
**Impact:** Low (configuration only)
