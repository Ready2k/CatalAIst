# Running on Custom Ports

Guide for running CatalAIst on non-standard ports (e.g., backend on 4000, frontend on 4001).

## Quick Fix

If you're running:
- Backend on port 4000
- Frontend on port 4001

And getting "404" or "unexpected token '<'" errors, you need to tell the frontend where the backend is.

### Solution 1: Use Frontend .env File (Recommended)

Create `frontend/.env.local`:

```bash
REACT_APP_API_URL=http://localhost:4000
```

Then restart the frontend:
```bash
cd frontend
npm start
```

### Solution 2: Update package.json Proxy

Edit `frontend/package.json` and change the proxy:

```json
{
  "proxy": "http://localhost:4000"
}
```

Then restart the frontend.

## Complete Setup for Custom Ports

### Step 1: Configure Backend Port

Edit `.env` in project root:
```bash
PORT=4000
```

### Step 2: Configure Frontend Port

Create `frontend/.env.local`:
```bash
PORT=4001
REACT_APP_API_URL=http://localhost:4000
```

### Step 3: Update CORS

Edit `.env` in project root to allow frontend origin:
```bash
ALLOWED_ORIGINS=http://localhost:4001,http://localhost:3000
```

### Step 4: Start Services

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

Should show:
```
✅ Backend server running on port 4000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
```

Should show:
```
Compiled successfully!

You can now view catalai-frontend in the browser.

  Local:            http://localhost:4001
```

### Step 5: Verify

1. **Check backend health:**
   ```bash
   curl http://localhost:4000/health
   ```

2. **Open frontend:**
   ```
   http://localhost:4001
   ```

3. **Try to login** - should work now!

## Understanding the Error

### "unexpected token '<', "<!DOCTYPE "... is not valid JSON"

This error means:
- Frontend is trying to call API at `http://localhost:4001/api/auth/login`
- But port 4001 is the **frontend** (React app)
- React returns HTML (starting with `<!DOCTYPE html>`)
- Frontend expects JSON, gets HTML → error

### The Fix

Tell the frontend where the backend is:
```bash
# frontend/.env.local
REACT_APP_API_URL=http://localhost:4000
```

Now API calls go to:
- `http://localhost:4000/api/auth/login` ✅ Backend
- Not `http://localhost:4001/api/auth/login` ❌ Frontend

## Port Configuration Reference

### Standard Ports (Recommended)

```bash
# .env (project root)
PORT=8080

# frontend/.env.local (optional - uses proxy)
# No REACT_APP_API_URL needed
```

Frontend runs on 3000, proxies API calls to backend on 8080.

### Custom Ports

```bash
# .env (project root)
PORT=4000
ALLOWED_ORIGINS=http://localhost:4001

# frontend/.env.local
PORT=4001
REACT_APP_API_URL=http://localhost:4000
```

Frontend runs on 4001, makes direct API calls to backend on 4000.

## How It Works

### With Proxy (Standard Setup)

```
Browser → http://localhost:3000/api/auth/login
         ↓
React Dev Server (port 3000)
         ↓ (proxy)
Backend (port 8080) → /api/auth/login
```

### Without Proxy (Custom Ports)

```
Browser → http://localhost:4001
         ↓
React Dev Server (port 4001)
         ↓
JavaScript makes fetch to REACT_APP_API_URL
         ↓
http://localhost:4000/api/auth/login
         ↓
Backend (port 4000)
```

## Troubleshooting

### Issue: Still Getting 404

**Check:**
1. Is backend running?
   ```bash
   curl http://localhost:4000/health
   ```

2. Is `REACT_APP_API_URL` set correctly?
   ```bash
   cat frontend/.env.local
   ```

3. Did you restart frontend after creating .env.local?
   ```bash
   # Stop frontend (Ctrl+C)
   # Start again
   npm start
   ```

### Issue: CORS Error

**Error:** "Access to fetch at 'http://localhost:4000/api/auth/login' from origin 'http://localhost:4001' has been blocked by CORS"

**Fix:** Add frontend origin to ALLOWED_ORIGINS in `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:4001,http://localhost:3000
```

Restart backend.

### Issue: Environment Variable Not Working

React only reads environment variables that start with `REACT_APP_`.

**Wrong:**
```bash
API_URL=http://localhost:4000  # ❌ Won't work
```

**Correct:**
```bash
REACT_APP_API_URL=http://localhost:4000  # ✅ Works
```

Also, you must restart the dev server after changing .env files.

### Issue: Proxy Not Working

The proxy in `package.json` only works in development with `npm start`.

For production builds, you must set `REACT_APP_API_URL` or use nginx.

## Production Deployment

In production with Docker, nginx handles routing:
- Frontend: Port 80 (or 443 with HTTPS)
- Backend: Port 8080 (internal)
- nginx proxies `/api/*` to backend

No need for `REACT_APP_API_URL` in production.

## Quick Reference

### Standard Development Setup
```bash
# .env
PORT=8080

# frontend/package.json
"proxy": "http://localhost:8080"

# Start
cd backend && npm run dev  # Port 8080
cd frontend && npm start   # Port 3000
```

### Custom Ports Setup
```bash
# .env
PORT=4000
ALLOWED_ORIGINS=http://localhost:4001

# frontend/.env.local
PORT=4001
REACT_APP_API_URL=http://localhost:4000

# Start
cd backend && npm run dev  # Port 4000
cd frontend && npm start   # Port 4001
```

### Docker Setup
```bash
# docker-compose.yml handles everything
docker-compose up -d

# Access
http://localhost      # Frontend
http://localhost:8080 # Backend
```

## Files to Check

1. **Backend port:** `.env` → `PORT=4000`
2. **Frontend port:** `frontend/.env.local` → `PORT=4001`
3. **API URL:** `frontend/.env.local` → `REACT_APP_API_URL=http://localhost:4000`
4. **CORS:** `.env` → `ALLOWED_ORIGINS=http://localhost:4001`
5. **Proxy:** `frontend/package.json` → `"proxy": "http://localhost:4000"`

## Summary

**Problem:** Frontend on 4001 trying to call API on 4001 (itself) instead of 4000 (backend)

**Solution:** Tell frontend where backend is:
```bash
# frontend/.env.local
REACT_APP_API_URL=http://localhost:4000
```

**Then restart frontend:**
```bash
cd frontend
npm start
```

---

**Last Updated:** November 10, 2025
