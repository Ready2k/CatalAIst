# Docker Admin Creation Fix

## Issue
The `create-admin` script was trying to use `ts-node` which isn't available in the production Docker container.

## Solution
Created a JavaScript version of the admin creation script that works with the compiled code.

## What Changed

1. **New file:** `backend/src/scripts/create-admin.js` - JavaScript version that works in Docker
2. **Updated:** `backend/package.json` - Changed script to use compiled JS
3. **Updated:** `backend/Dockerfile` - Added test-security.sh to container

## How to Use

### Rebuild Docker Images

Since we changed the Dockerfile and scripts, you need to rebuild:

```bash
# Stop current containers
docker-compose down

# Rebuild images
docker-compose build --no-cache

# Start services
docker-compose up -d
```

### Create Admin User

Now this will work:

```bash
docker-compose exec backend npm run create-admin
```

### Alternative: Use the Setup Script

The easiest way is to run the setup script again:

```bash
./setup-docker.sh
```

It will detect existing .env and ask if you want to overwrite.

## Quick Fix Commands

```bash
# 1. Stop containers
docker-compose down

# 2. Rebuild backend
docker-compose build --no-cache backend

# 3. Start services
docker-compose up -d

# 4. Create admin
docker-compose exec backend npm run create-admin
```

## Verification

After rebuilding, verify the script is available:

```bash
# Check if script exists in container
docker-compose exec backend ls -la dist/backend/src/scripts/

# Should show:
# create-admin.js
# create-admin.d.ts
```

## For Development

If you're running locally (not in Docker), you can still use the TypeScript version:

```bash
cd backend
npm run create-admin:dev
```

## Troubleshooting

### "Cannot find module" error

Make sure you rebuilt the images:
```bash
docker-compose build --no-cache backend
```

### "ts-node: command not found"

This means you're using the old image. Rebuild:
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Script runs but can't create user

Check environment variables:
```bash
docker-compose exec backend env | grep JWT_SECRET
```

If JWT_SECRET is missing, add it to .env and restart:
```bash
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
docker-compose restart backend
```

## Summary

The admin creation script now works in Docker! Just rebuild your images and run:

```bash
docker-compose build --no-cache
docker-compose up -d
docker-compose exec backend npm run create-admin
```
