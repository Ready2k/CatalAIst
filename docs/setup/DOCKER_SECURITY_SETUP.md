# Docker Setup with Security Features

This guide shows you how to deploy CatalAIst with Docker including all security features.

---

## Quick Start (5 Minutes)

### 1. Create Environment File

Create a `.env` file in the project root with your secrets:

```bash
# Generate secure secrets
openssl rand -base64 32  # Run this 3 times for different keys

# Create .env file
cat > .env << 'EOF'
# Security Configuration (REQUIRED)
JWT_SECRET=<paste-first-generated-secret>
PII_ENCRYPTION_KEY=<paste-second-generated-secret>
CREDENTIALS_ENCRYPTION_KEY=<paste-third-generated-secret>

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80

# Optional: Default LLM settings
DEFAULT_MODEL=gpt-4
DEFAULT_VOICE=alloy

# Optional: AWS Bedrock (if using)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SESSION_TOKEN=
AWS_REGION=us-east-1
EOF
```

### 2. Build and Start

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

### 3. Create Admin User

```bash
# Run the admin creation script inside the container
docker-compose exec backend npm run create-admin
```

Follow the prompts to create your admin account.

### 4. Verify It's Working

```bash
# Check health
curl http://localhost:8080/health

# Test login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

You should get a JWT token back!

---

## Detailed Setup

### Environment Variables Explained

#### Required Variables

**JWT_SECRET** (Required)
- Used to sign JWT tokens
- Must be a strong random value (32+ bytes)
- Generate: `openssl rand -base64 32`
- **Never use default values in production!**

**PII_ENCRYPTION_KEY** (Recommended)
- Used to encrypt detected PII
- Should be different from JWT_SECRET
- Falls back to JWT_SECRET if not set
- Generate: `openssl rand -base64 32`

**CREDENTIALS_ENCRYPTION_KEY** (Recommended)
- Used to encrypt user's API keys
- Should be different from other keys
- Falls back to JWT_SECRET if not set
- Generate: `openssl rand -base64 32`

#### Optional Variables

**ALLOWED_ORIGINS**
- Comma-separated list of allowed frontend URLs
- Default: `http://localhost:3000,http://localhost:80`
- Production example: `https://app.example.com,https://admin.example.com`

**NODE_ENV**
- Set to `production` for production deployments
- Affects logging and error messages

### Docker Compose Configuration

The `docker-compose.yml` is already configured with security features. Here's what it includes:

```yaml
services:
  backend:
    environment:
      # Security variables from .env file
      - JWT_SECRET=${JWT_SECRET}
      - PII_ENCRYPTION_KEY=${PII_ENCRYPTION_KEY}
      - CREDENTIALS_ENCRYPTION_KEY=${CREDENTIALS_ENCRYPTION_KEY}
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS}
```

---

## Step-by-Step Production Deployment

### Step 1: Prepare Environment

```bash
# Create production .env file
cat > .env << 'EOF'
NODE_ENV=production
PORT=8080

# Generate these with: openssl rand -base64 32
JWT_SECRET=YOUR_SECURE_SECRET_HERE
PII_ENCRYPTION_KEY=YOUR_SECURE_KEY_HERE
CREDENTIALS_ENCRYPTION_KEY=YOUR_SECURE_KEY_HERE

# Your production frontend URL
ALLOWED_ORIGINS=https://your-frontend-domain.com

# Data directory
DATA_DIR=/data

# Logging
LOG_LEVEL=info
EOF
```

### Step 2: Build Images

```bash
# Build with no cache to ensure fresh build
docker-compose build --no-cache

# Verify images were created
docker images | grep catalai
```

### Step 3: Start Services

```bash
# Start in detached mode
docker-compose up -d

# Check status
docker-compose ps

# Should show:
# NAME                  STATUS
# catalai-backend       Up (healthy)
# catalai-frontend      Up (healthy)
```

### Step 4: Check Logs

```bash
# View backend logs
docker-compose logs backend

# You should see:
# ✓ Environment variables validated
# ✓ Directory exists: users
# ✓ Prompt exists: classification-v1.0.txt
# === Initialization Complete ===
# Backend server running on port 8080
```

### Step 5: Create Admin User

```bash
# Interactive admin creation
docker-compose exec backend npm run create-admin

# Or non-interactive (for automation)
docker-compose exec -T backend node -e "
const { UserService } = require('./dist/backend/src/services/user.service');
const service = new UserService('/data');
service.createUser('admin', 'YourSecurePassword123!', 'admin')
  .then(() => console.log('Admin created'))
  .catch(err => console.error('Error:', err));
"
```

### Step 6: Test Authentication

```bash
# Test login
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YourSecurePassword123!"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# Test protected endpoint
curl http://localhost:8080/api/sessions \
  -H "Authorization: Bearer $TOKEN"
```

### Step 7: Verify Security Features

```bash
# Run security test script
docker-compose exec backend ./test-security.sh

# Or manually test:

# 1. Test rate limiting
for i in {1..12}; do
  curl -s http://localhost:8080/api/process/submit \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"description":"test"}' &
done

# 2. Test CORS (should fail from unauthorized origin)
curl -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  -X OPTIONS http://localhost:8080/api/sessions

# 3. Check security headers
curl -I http://localhost:8080/health | grep -E "X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security"
```

---

## Docker Commands Reference

### Starting and Stopping

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Restart a service
docker-compose restart backend

# View logs
docker-compose logs -f backend

# View logs for all services
docker-compose logs -f
```

### Managing Users

```bash
# Create admin user
docker-compose exec backend npm run create-admin

# Access backend shell
docker-compose exec backend /bin/bash

# Run Node.js commands
docker-compose exec backend node -e "console.log('Hello')"
```

### Data Management

```bash
# Backup data volume
docker run --rm -v catalai_catalai-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/catalai-data-backup-$(date +%Y%m%d).tar.gz /data

# Restore data volume
docker run --rm -v catalai_catalai-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/catalai-data-backup-YYYYMMDD.tar.gz -C /

# View data directory contents
docker-compose exec backend ls -la /data
```

### Debugging

```bash
# Check container health
docker-compose ps

# Inspect backend container
docker inspect catalai-backend

# View environment variables (be careful - contains secrets!)
docker-compose exec backend env | grep -E "JWT|ALLOWED"

# Check disk usage
docker-compose exec backend df -h

# Check running processes
docker-compose exec backend ps aux
```

---

## Production Deployment with HTTPS

### Option 1: Using Nginx Reverse Proxy

Create `nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Backend API
    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend
    location / {
        proxy_pass http://frontend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Update `docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
```

### Option 2: Using Caddy (Automatic HTTPS)

Create `Caddyfile`:

```
your-domain.com {
    reverse_proxy /api/* backend:8080
    reverse_proxy /* frontend:8080
}
```

Update `docker-compose.yml`:

```yaml
services:
  caddy:
    image: caddy:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - backend
      - frontend

volumes:
  caddy_data:
  caddy_config:
```

---

## Troubleshooting Docker Deployment

### Container Won't Start

**Check logs:**
```bash
docker-compose logs backend
```

**Common issues:**

1. **"JWT_SECRET not configured"**
   ```bash
   # Make sure .env file exists and has JWT_SECRET
   cat .env | grep JWT_SECRET
   
   # If missing, add it:
   echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
   
   # Restart
   docker-compose restart backend
   ```

2. **"Port already in use"**
   ```bash
   # Check what's using the port
   lsof -i :8080
   
   # Change port in docker-compose.yml or stop conflicting service
   ```

3. **"Permission denied" on /data**
   ```bash
   # Fix permissions
   docker-compose exec backend chown -R 1001:0 /data
   ```

### Can't Create Admin User

```bash
# Check if users directory exists
docker-compose exec backend ls -la /data/users

# If not, create it
docker-compose exec backend mkdir -p /data/users

# Try again
docker-compose exec backend npm run create-admin
```

### Authentication Not Working

```bash
# Check JWT_SECRET is set
docker-compose exec backend env | grep JWT_SECRET

# Check logs for auth errors
docker-compose logs backend | grep -i auth

# Verify token is being sent
curl -v http://localhost:8080/api/sessions \
  -H "Authorization: Bearer your-token"
```

### CORS Errors

```bash
# Check ALLOWED_ORIGINS
docker-compose exec backend env | grep ALLOWED_ORIGINS

# Update .env and restart
echo "ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com" >> .env
docker-compose restart backend
```

### Rate Limiting Too Aggressive

```bash
# For development, you can temporarily disable
# Edit backend/src/index.ts and comment out rate limiters
# Then rebuild:
docker-compose build backend
docker-compose restart backend
```

---

## Monitoring and Maintenance

### Health Checks

```bash
# Check health endpoint
curl http://localhost:8080/health

# Should return:
# {
#   "status": "ok",
#   "timestamp": "2025-11-09T...",
#   "checks": {
#     "fileSystem": "ok",
#     "dataDirectories": "ok"
#   }
# }
```

### Log Management

```bash
# View recent logs
docker-compose logs --tail=100 backend

# Follow logs in real-time
docker-compose logs -f backend

# Export logs to file
docker-compose logs backend > backend-logs-$(date +%Y%m%d).log

# Rotate logs (in docker-compose.yml)
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### Backup Strategy

```bash
# Create backup script: backup.sh
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="./backups"

mkdir -p $BACKUP_DIR

# Backup data volume
docker run --rm \
  -v catalai_catalai-data:/data \
  -v $(pwd)/$BACKUP_DIR:/backup \
  alpine tar czf /backup/data-$DATE.tar.gz /data

# Backup .env file (encrypted)
gpg -c .env -o $BACKUP_DIR/env-$DATE.gpg

echo "Backup completed: $BACKUP_DIR/data-$DATE.tar.gz"

# Run daily with cron:
# 0 2 * * * /path/to/backup.sh
```

### Updates and Upgrades

```bash
# Pull latest code
git pull

# Rebuild images
docker-compose build --no-cache

# Stop services
docker-compose down

# Start with new images
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

---

## Security Best Practices for Docker

### 1. Use Secrets Management

For production, use Docker secrets instead of environment variables:

```yaml
services:
  backend:
    secrets:
      - jwt_secret
      - pii_encryption_key
    environment:
      - JWT_SECRET_FILE=/run/secrets/jwt_secret

secrets:
  jwt_secret:
    file: ./secrets/jwt_secret.txt
  pii_encryption_key:
    file: ./secrets/pii_encryption_key.txt
```

### 2. Run as Non-Root

Already configured in Dockerfile:
```dockerfile
USER 1001
```

### 3. Limit Resources

Add to `docker-compose.yml`:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          memory: 512M
```

### 4. Network Isolation

```yaml
services:
  backend:
    networks:
      - internal
  
  frontend:
    networks:
      - internal
      - external

networks:
  internal:
    internal: true
  external:
```

### 5. Regular Security Scans

```bash
# Scan images for vulnerabilities
docker scan catalai-backend:latest

# Update base images regularly
docker-compose pull
docker-compose up -d --build
```

---

## Quick Reference

### Essential Commands

```bash
# Start everything
docker-compose up -d

# Create admin
docker-compose exec backend npm run create-admin

# View logs
docker-compose logs -f backend

# Restart backend
docker-compose restart backend

# Stop everything
docker-compose down

# Backup data
docker run --rm -v catalai_catalai-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/backup.tar.gz /data

# Check health
curl http://localhost:8080/health
```

### Environment Variables Quick Reference

```bash
# Required
JWT_SECRET=<32+ random bytes>

# Recommended
PII_ENCRYPTION_KEY=<32+ random bytes>
CREDENTIALS_ENCRYPTION_KEY=<32+ random bytes>
ALLOWED_ORIGINS=https://your-domain.com

# Optional
NODE_ENV=production
LOG_LEVEL=info
DEFAULT_MODEL=gpt-4
```

---

## Next Steps

1. ✅ Set up environment variables
2. ✅ Start Docker containers
3. ✅ Create admin user
4. ✅ Test authentication
5. ⏭️ Configure HTTPS (production)
6. ⏭️ Set up monitoring
7. ⏭️ Configure backups
8. ⏭️ Update frontend for authentication

---

**Need Help?** Check the other documentation:
- `SECURITY_SETUP.md` - General security setup
- `DEPLOYMENT_CHECKLIST.md` - Complete deployment checklist
- `CRITICAL_FIXES_SUMMARY.md` - Quick overview
