# Docker Quick Reference - CatalAIst

One-page reference for common Docker operations with CatalAIst.

---

## 🚀 Quick Setup (First Time)

```bash
# Automated setup (recommended)
./setup-docker.sh

# Or manual setup
cp .env.example .env
# Edit .env with your secrets
docker-compose build
docker-compose up -d
docker-compose exec backend npm run create-admin
```

---

## 📋 Essential Commands

### Start/Stop

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart a service
docker-compose restart backend

# Stop without removing containers
docker-compose stop
```

### Logs

```bash
# View backend logs
docker-compose logs backend

# Follow logs in real-time
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# All services
docker-compose logs -f
```

### Status

```bash
# Check running containers
docker-compose ps

# Check health
curl http://localhost:8080/health

# View resource usage
docker stats
```

---

## 👤 User Management

```bash
# Create admin user (interactive)
docker-compose exec backend npm run create-admin

# Access backend shell
docker-compose exec backend /bin/bash

# Run Node.js command
docker-compose exec backend node -e "console.log('test')"
```

---

## 🔐 Security Testing

```bash
# Run full security test suite
docker-compose exec backend ./test-security.sh

# Test authentication manually
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-pass"}' \
  | jq -r '.token')

curl http://localhost:8080/api/sessions \
  -H "Authorization: Bearer $TOKEN"

# Check security headers
curl -I http://localhost:8080/health
```

---

## 💾 Data Management

### Backup

```bash
# Backup data volume
docker run --rm \
  -v catalai_catalai-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/backup-$(date +%Y%m%d).tar.gz /data

# Backup .env (encrypted)
gpg -c .env -o env-backup.gpg
```

### Restore

```bash
# Restore data volume
docker run --rm \
  -v catalai_catalai-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/backup-YYYYMMDD.tar.gz -C /

# Restore .env
gpg -d env-backup.gpg > .env
```

### View Data

```bash
# List data directory
docker-compose exec backend ls -la /data

# View users
docker-compose exec backend ls -la /data/users

# View audit logs
docker-compose exec backend ls -la /data/audit-logs
```

---

## 🔧 Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
docker-compose logs backend

# Check environment variables
docker-compose exec backend env | grep JWT

# Verify .env file
cat .env | grep JWT_SECRET
```

### Fix Permissions

```bash
# Fix data directory permissions
docker-compose exec backend chown -R 1001:0 /data
docker-compose exec backend chmod -R g+w /data
```

### Reset Everything

```bash
# Stop and remove containers
docker-compose down

# Remove volumes (WARNING: deletes all data!)
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up -d --build
```

### Port Conflicts

```bash
# Check what's using port 8080
lsof -i :8080

# Change port in docker-compose.yml
# ports:
#   - "8081:8080"  # Use 8081 instead
```

---

## 🔄 Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

---

## 🌐 Environment Variables

### Required

```bash
JWT_SECRET=<32+ random bytes>
```

### Recommended

```bash
PII_ENCRYPTION_KEY=<32+ random bytes>
CREDENTIALS_ENCRYPTION_KEY=<32+ random bytes>
ALLOWED_ORIGINS=https://your-domain.com
```

### Generate Secrets

```bash
# Generate secure random secret
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 📊 Monitoring

### Health Check

```bash
# Simple check
curl http://localhost:8080/health

# Detailed check with jq
curl -s http://localhost:8080/health | jq .
```

### Resource Usage

```bash
# Real-time stats
docker stats

# Disk usage
docker system df

# Container details
docker inspect catalai-backend
```

### Logs Analysis

```bash
# Count errors
docker-compose logs backend | grep -i error | wc -l

# Find authentication failures
docker-compose logs backend | grep -i "authentication failed"

# Export logs
docker-compose logs backend > backend-$(date +%Y%m%d).log
```

---

## 🔒 Production Checklist

```bash
# 1. Check environment
cat .env | grep -E "JWT_SECRET|ALLOWED_ORIGINS"

# 2. Verify services are running
docker-compose ps

# 3. Test health endpoint
curl http://localhost:8080/health

# 4. Test authentication
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"test"}'

# 5. Check security headers
curl -I http://localhost:8080/health | grep -E "X-Frame|X-Content"

# 6. Verify rate limiting
for i in {1..12}; do curl http://localhost:8080/api/sessions & done

# 7. Check logs for errors
docker-compose logs backend | grep -i error
```

---

## 🆘 Emergency Commands

### Service Not Responding

```bash
# Force restart
docker-compose restart backend

# Or recreate container
docker-compose up -d --force-recreate backend
```

### Out of Memory

```bash
# Check memory usage
docker stats --no-stream

# Restart with memory limit
docker-compose down
# Edit docker-compose.yml to add memory limits
docker-compose up -d
```

### Disk Full

```bash
# Clean up Docker
docker system prune -a

# Remove old images
docker image prune -a

# Remove unused volumes
docker volume prune
```

### Complete Reset

```bash
# DANGER: This deletes everything!
docker-compose down -v --rmi all
rm -rf data/
./setup-docker.sh
```

---

## 📱 Useful Aliases

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
# CatalAIst Docker aliases
alias cat-up='docker-compose up -d'
alias cat-down='docker-compose down'
alias cat-logs='docker-compose logs -f backend'
alias cat-restart='docker-compose restart backend'
alias cat-shell='docker-compose exec backend /bin/bash'
alias cat-admin='docker-compose exec backend npm run create-admin'
alias cat-test='docker-compose exec backend ./test-security.sh'
alias cat-health='curl -s http://localhost:8080/health | jq .'
```

---

## 🔗 Quick Links

- **Full Docker Guide:** `DOCKER_SECURITY_SETUP.md`
- **Security Setup:** `SECURITY_SETUP.md`
- **Quick Start:** `CRITICAL_FIXES_SUMMARY.md`
- **Deployment:** `DEPLOYMENT_CHECKLIST.md`

---

## 💡 Tips

1. **Always backup before updates**
   ```bash
   docker run --rm -v catalai_catalai-data:/data -v $(pwd):/backup \
     alpine tar czf /backup/backup.tar.gz /data
   ```

2. **Use docker-compose logs to debug**
   ```bash
   docker-compose logs -f backend
   ```

3. **Check health endpoint regularly**
   ```bash
   curl http://localhost:8080/health
   ```

4. **Monitor disk space**
   ```bash
   docker system df
   ```

5. **Keep .env file secure**
   ```bash
   chmod 600 .env
   # Never commit to git!
   ```

---

**Need more help?** Check the full documentation in `DOCKER_SECURITY_SETUP.md`
