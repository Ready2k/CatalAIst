# CORS Fix Guide

## The Problem

You're seeing this error:
```
Access to fetch at 'http://localhost:8080/api/auth/login' from origin 'http://localhost' 
has been blocked by CORS policy
```

This happens because the frontend is trying to access the backend directly, which triggers CORS checks.

---

## The Solution

We have an nginx proxy configured that handles this! The frontend just needs to use relative URLs instead of absolute URLs.

### Quick Fix

Run this script:

```bash
./fix-cors.sh
```

This will:
1. Update backend CORS configuration
2. Rebuild frontend with correct API URLs
3. Restart services

**Time:** ~2 minutes

---

## Manual Fix

If you prefer to do it manually:

### Step 1: Update .env

Make sure `.env` includes all localhost variations:

```bash
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80,http://localhost
```

### Step 2: Restart Backend

```bash
docker-compose restart backend
```

### Step 3: Rebuild Frontend

```bash
docker-compose build frontend
docker-compose restart frontend
```

### Step 4: Clear Browser Cache

```bash
# In browser, press:
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

---

## How It Works

### The Nginx Proxy

The frontend nginx is configured to proxy API requests:

```nginx
location /api {
    proxy_pass http://backend:8080;
    # ... proxy headers
}
```

This means:
- Frontend makes request to `/api/auth/login` (relative URL)
- Nginx forwards it to `http://backend:8080/api/auth/login`
- No CORS issues because it's same-origin!

### Before Fix

```javascript
// ❌ Wrong - Direct backend access
fetch('http://localhost:8080/api/auth/login')
```

This triggers CORS because:
- Origin: `http://localhost` (port 80)
- Target: `http://localhost:8080` (different port)

### After Fix

```javascript
// ✅ Correct - Use proxy
fetch('/api/auth/login')
```

This works because:
- Origin: `http://localhost`
- Target: `http://localhost/api/...` (same origin)
- Nginx proxies to backend internally

---

## Verification

After applying the fix, test it:

### 1. Check Backend CORS

```bash
# Check ALLOWED_ORIGINS
docker-compose exec backend env | grep ALLOWED_ORIGINS

# Should include: http://localhost
```

### 2. Test API Proxy

```bash
# This should work (proxied through nginx)
curl http://localhost/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Should return 401 (expected - wrong credentials)
# NOT a CORS error
```

### 3. Test in Browser

1. Open http://localhost
2. Open browser console (F12)
3. Try to login
4. Should NOT see CORS errors
5. Should see either success or "Invalid credentials"

---

## Common Issues

### Still Getting CORS Errors

**Cause:** Browser cached old frontend

**Solution:**
```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Or clear browser cache completely
```

### "Connection Refused"

**Cause:** Backend not running

**Solution:**
```bash
docker-compose ps
docker-compose up -d backend
```

### "502 Bad Gateway"

**Cause:** Nginx can't reach backend

**Solution:**
```bash
# Check if backend is healthy
curl http://localhost:8080/health

# Check docker network
docker network inspect catalai_default

# Restart both services
docker-compose restart
```

### Login Works But Other APIs Fail

**Cause:** API service not using relative URLs

**Solution:** Already fixed in `api.ts` - just rebuild:
```bash
docker-compose build frontend
docker-compose restart frontend
```

---

## For Development

If you're running frontend locally (not in Docker):

### Option 1: Use Backend URL

```bash
# In frontend/.env.local
REACT_APP_API_URL=http://localhost:8080

# Start frontend
cd frontend
npm start
```

### Option 2: Add Proxy to package.json

```json
{
  "proxy": "http://localhost:8080"
}
```

Then use relative URLs in code.

---

## Production Deployment

For production with custom domain:

### 1. Update ALLOWED_ORIGINS

```bash
# In .env
ALLOWED_ORIGINS=https://your-domain.com,https://app.your-domain.com
```

### 2. Configure HTTPS

Use nginx or Caddy for SSL termination (see DOCKER_SECURITY_SETUP.md)

### 3. Update Frontend Environment

```bash
# If using separate API domain
REACT_APP_API_URL=https://api.your-domain.com
```

---

## Architecture

```
┌─────────────────────────────────────────┐
│  Browser (http://localhost)             │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │  React App                         │ │
│  │  fetch('/api/auth/login')          │ │
│  └────────────────────────────────────┘ │
│                 │                        │
│                 ▼                        │
│  ┌────────────────────────────────────┐ │
│  │  Nginx (port 80)                   │ │
│  │  - Serves React app                │ │
│  │  - Proxies /api/* to backend       │ │
│  └────────────────────────────────────┘ │
│                 │                        │
└─────────────────┼────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  Backend (port 8080)                    │
│  - Handles /api/* requests              │
│  - Returns JSON responses               │
└─────────────────────────────────────────┘
```

---

## Environment Variables

### Backend (.env)

```bash
# Must include frontend origin
ALLOWED_ORIGINS=http://localhost:80,http://localhost
```

### Frontend (optional)

```bash
# Only needed if NOT using nginx proxy
REACT_APP_API_URL=http://localhost:8080
```

---

## Testing Checklist

After applying fix:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can access http://localhost
- [ ] Login page appears
- [ ] No CORS errors in browser console
- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Can access protected pages
- [ ] Logout works

---

## Quick Commands

```bash
# Apply fix
./fix-cors.sh

# Check backend CORS
docker-compose exec backend env | grep ALLOWED_ORIGINS

# Test API proxy
curl http://localhost/api/auth/login -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# View logs
docker-compose logs -f frontend
docker-compose logs -f backend

# Restart everything
docker-compose restart
```

---

## Summary

**The Fix:**
1. Frontend uses relative URLs (`/api/...`)
2. Nginx proxies to backend
3. No CORS issues!

**To Apply:**
```bash
./fix-cors.sh
```

**To Verify:**
- Visit http://localhost
- Try to login
- No CORS errors!

---

**Need more help?** Check:
- `DOCKER_SECURITY_SETUP.md` - Full Docker setup
- `FRONTEND_AUTH_UPDATE.md` - Frontend authentication
- `DEPLOYMENT_CHECKLIST.md` - Complete deployment guide
