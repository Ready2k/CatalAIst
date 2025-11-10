# Quick Fix Guide - Docker Admin Creation

## The Problem

When running `docker-compose exec backend npm run create-admin`, you got:
```
sh: line 1: ts-node: command not found
```

This happened because the production Docker container doesn't include TypeScript development tools.

---

## The Solution (Choose One)

### Option 1: Automated Fix (Recommended)

Run the fix script:

```bash
./fix-docker-admin.sh
```

This will:
1. Stop containers
2. Rebuild backend image
3. Start services
4. Create admin user

**Time:** ~2-3 minutes

---

### Option 2: Manual Fix

```bash
# 1. Stop containers
docker-compose down

# 2. Rebuild backend (no cache to ensure fresh build)
docker-compose build --no-cache backend

# 3. Start services
docker-compose up -d

# 4. Wait for backend to be ready (check health)
curl http://localhost:8080/health

# 5. Create admin user
docker-compose exec backend npm run create-admin
```

**Time:** ~2-3 minutes

---

### Option 3: Complete Fresh Start

If you want to start completely fresh:

```bash
# Stop and remove everything
docker-compose down -v

# Run setup script again
./setup-docker.sh
```

**Time:** ~3-5 minutes  
**Note:** This will delete all data (users, sessions, etc.)

---

## What Was Fixed

### Files Changed

1. **backend/src/scripts/create-admin.js** (NEW)
   - JavaScript version that works in production Docker
   - No TypeScript dependencies needed

2. **backend/package.json** (UPDATED)
   - Changed `create-admin` script to use compiled JS
   - Added `create-admin:dev` for local development

3. **backend/Dockerfile** (UPDATED)
   - Added test-security.sh to container
   - Ensures scripts are executable

### Why This Happened

The Docker production image:
- Only installs production dependencies (`npm ci --only=production`)
- Doesn't include `ts-node` or TypeScript compiler
- Uses pre-compiled JavaScript from `dist/` folder

The original script tried to run TypeScript directly, which failed.

---

## Verification

After applying the fix, verify it works:

```bash
# 1. Check script exists in container
docker-compose exec backend ls -la dist/backend/src/scripts/create-admin.js

# 2. Try creating admin user
docker-compose exec backend npm run create-admin

# 3. Verify you can login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

You should get a JWT token back!

---

## For Local Development

If you're running the backend locally (not in Docker), you can use either:

```bash
# TypeScript version (development)
cd backend
npm run create-admin:dev

# JavaScript version (production-like)
cd backend
npm run build
npm run create-admin
```

---

## Troubleshooting

### Still getting "ts-node: command not found"

You're using the old Docker image. Rebuild:

```bash
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
```

### "Cannot find module" error

The build didn't complete. Check:

```bash
# Verify dist folder exists
docker-compose exec backend ls -la dist/backend/src/scripts/

# If missing, rebuild
docker-compose build --no-cache backend
```

### "JWT_SECRET not configured"

Your .env file is missing or not loaded. Check:

```bash
# Verify .env exists
cat .env | grep JWT_SECRET

# If missing, create it
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env

# Restart backend
docker-compose restart backend
```

### Container won't start after rebuild

Check logs:

```bash
docker-compose logs backend

# Common issues:
# - Missing JWT_SECRET in .env
# - Port 8080 already in use
# - Permission issues with /data
```

### Admin user creation succeeds but can't login

Check if user was actually created:

```bash
# List users directory
docker-compose exec backend ls -la /data/users/

# Check logs for errors
docker-compose logs backend | grep -i error
```

---

## Prevention

To avoid this in the future:

1. **Always rebuild after code changes:**
   ```bash
   docker-compose build --no-cache
   ```

2. **Use the setup script for fresh installs:**
   ```bash
   ./setup-docker.sh
   ```

3. **Check documentation first:**
   - `DOCKER_README.md` - Complete Docker guide
   - `DOCKER_QUICK_REFERENCE.md` - Command reference

---

## Summary

**Quick Fix:**
```bash
./fix-docker-admin.sh
```

**Manual Fix:**
```bash
docker-compose down
docker-compose build --no-cache backend
docker-compose up -d
docker-compose exec backend npm run create-admin
```

**Verify:**
```bash
curl http://localhost:8080/health
```

---

## Need More Help?

Check these documents:
- `DOCKER_FIX.md` - Detailed explanation of the fix
- `DOCKER_README.md` - Complete Docker deployment guide
- `DOCKER_SECURITY_SETUP.md` - Security configuration
- `DEPLOYMENT_CHECKLIST.md` - Full deployment checklist

Or check the logs:
```bash
docker-compose logs -f backend
```

---

**The fix is simple:** Just rebuild the Docker image and the admin creation will work! 🚀
