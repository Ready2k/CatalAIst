# Docker Deployment - CatalAIst with Security

Complete guide for deploying CatalAIst with Docker including all security features.

---

## 🎯 What You Get

- ✅ **Authentication** - JWT-based user authentication
- ✅ **Rate Limiting** - Protection against abuse
- ✅ **CORS Protection** - Restricted origins
- ✅ **Security Headers** - Comprehensive HTTP security
- ✅ **Encrypted Storage** - PII and credentials encrypted
- ✅ **Health Checks** - Automatic container health monitoring
- ✅ **Non-root User** - Containers run as unprivileged user
- ✅ **Data Persistence** - Docker volumes for data

---

## 🚀 Quick Start (3 Steps)

### 1. Run Setup Script

```bash
./setup-docker.sh
```

This will:
- Generate secure random secrets
- Create `.env` file
- Build Docker images
- Start all services
- Help you create an admin user
- Run security tests

### 2. Access the Application

- **Backend API:** http://localhost:8080
- **Frontend:** http://localhost:80
- **Health Check:** http://localhost:8080/health

### 3. Login

Use the admin credentials you created to login through the frontend.

---

## 📖 Manual Setup

If you prefer manual setup:

### Step 1: Create Environment File

```bash
# Generate secrets
JWT_SECRET=$(openssl rand -base64 32)
PII_KEY=$(openssl rand -base64 32)
CRED_KEY=$(openssl rand -base64 32)

# Create .env file
cat > .env << EOF
JWT_SECRET=$JWT_SECRET
PII_ENCRYPTION_KEY=$PII_KEY
CREDENTIALS_ENCRYPTION_KEY=$CRED_KEY
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80
EOF
```

### Step 2: Build and Start

```bash
docker-compose build
docker-compose up -d
```

### Step 3: Create Admin User

```bash
docker-compose exec backend npm run create-admin
```

### Step 4: Verify

```bash
# Check health
curl http://localhost:8080/health

# Test login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}'
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│              Docker Host                     │
│                                              │
│  ┌────────────────┐    ┌─────────────────┐ │
│  │   Frontend     │    │    Backend      │ │
│  │   (Port 80)    │◄───┤   (Port 8080)   │ │
│  │   Nginx/React  │    │   Node.js/Express│ │
│  └────────────────┘    └─────────────────┘ │
│                              │               │
│                              ▼               │
│                    ┌──────────────────┐     │
│                    │  Data Volume     │     │
│                    │  /data           │     │
│                    │  - users/        │     │
│                    │  - sessions/     │     │
│                    │  - audit-logs/   │     │
│                    │  - pii-mappings/ │     │
│                    └──────────────────┘     │
└─────────────────────────────────────────────┘
```

---

## 🔐 Security Features

### 1. Authentication
- JWT tokens with 24-hour expiration
- Bcrypt password hashing (10 rounds)
- Role-based access control (admin/user)

### 2. Rate Limiting
- General API: 100 requests / 15 minutes
- LLM endpoints: 10 requests / minute
- Auth endpoints: 5 attempts / 15 minutes

### 3. CORS Protection
- Configurable allowed origins
- Credentials support
- Proper preflight handling

### 4. Security Headers
- Content Security Policy
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options (clickjacking protection)
- X-Content-Type-Options (MIME sniffing protection)
- XSS Protection

### 5. Data Encryption
- PII encrypted with AES-256-GCM
- User credentials encrypted
- Secure key management

### 6. Container Security
- Non-root user (UID 1001)
- Minimal base images (Red Hat UBI9)
- Health checks
- Resource limits (configurable)

---

## 📁 Data Persistence

### Docker Volumes

```yaml
volumes:
  catalai-data:
    driver: local
```

Data is stored in a Docker volume and persists across container restarts.

### Directory Structure

```
/data/
├── users/              # User accounts (encrypted)
├── sessions/           # User sessions
├── audit-logs/         # Audit trail (JSONL)
├── pii-mappings/       # PII mappings (encrypted)
├── prompts/            # LLM prompts
├── decision-matrix/    # Decision matrices
├── learning/           # Learning data
├── analytics/          # Analytics data
└── audio/              # Voice recordings (temporary)
    └── cache/          # TTS cache
```

### Backup

```bash
# Backup data volume
docker run --rm \
  -v catalai_catalai-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/catalai-backup-$(date +%Y%m%d).tar.gz /data

# Backup .env file (encrypted)
gpg -c .env -o env-backup.gpg
```

### Restore

```bash
# Restore data volume
docker run --rm \
  -v catalai_catalai-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/catalai-backup-YYYYMMDD.tar.gz -C /

# Restore .env
gpg -d env-backup.gpg > .env

# Restart services
docker-compose restart
```

---

## 🔧 Configuration

### Environment Variables

#### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `JWT_SECRET` | JWT signing key | `openssl rand -base64 32` |

#### Recommended

| Variable | Description | Default |
|----------|-------------|---------|
| `PII_ENCRYPTION_KEY` | PII encryption key | Uses `JWT_SECRET` |
| `CREDENTIALS_ENCRYPTION_KEY` | Credentials encryption key | Uses `JWT_SECRET` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000,http://localhost:80` |

#### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Backend port | `8080` |
| `DATA_DIR` | Data directory | `/data` |
| `LOG_LEVEL` | Logging level | `info` |
| `DEFAULT_MODEL` | Default LLM model | `gpt-4` |
| `DEFAULT_VOICE` | Default TTS voice | `alloy` |

### Docker Compose Configuration

Edit `docker-compose.yml` to customize:

```yaml
services:
  backend:
    # Change ports
    ports:
      - "8081:8080"  # Use port 8081 instead
    
    # Add resource limits
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
    
    # Add restart policy
    restart: unless-stopped
    
    # Add health check interval
    healthcheck:
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## 🌐 Production Deployment

### With HTTPS (Recommended)

#### Option 1: Nginx Reverse Proxy

1. Create `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    location /api {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://frontend:8080;
    }
}
```

2. Update `docker-compose.yml`:

```yaml
services:
  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
```

#### Option 2: Caddy (Automatic HTTPS)

1. Create `Caddyfile`:

```
your-domain.com {
    reverse_proxy /api/* backend:8080
    reverse_proxy /* frontend:8080
}
```

2. Update `docker-compose.yml`:

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
```

### Production Environment Variables

```bash
# Production .env
NODE_ENV=production
JWT_SECRET=<strong-random-secret>
PII_ENCRYPTION_KEY=<strong-random-key>
CREDENTIALS_ENCRYPTION_KEY=<strong-random-key>
ALLOWED_ORIGINS=https://your-domain.com
LOG_LEVEL=warn
```

### Production Checklist

- [ ] Set strong `JWT_SECRET` (not default)
- [ ] Set separate encryption keys
- [ ] Configure `ALLOWED_ORIGINS` for your domain
- [ ] Enable HTTPS
- [ ] Set up monitoring
- [ ] Configure backups
- [ ] Set resource limits
- [ ] Enable log rotation
- [ ] Set up alerts
- [ ] Test disaster recovery

---

## 📊 Monitoring

### Health Checks

```bash
# Simple check
curl http://localhost:8080/health

# Detailed check
curl -s http://localhost:8080/health | jq .

# Expected response:
{
  "status": "ok",
  "timestamp": "2025-11-09T...",
  "checks": {
    "fileSystem": "ok",
    "dataDirectories": "ok"
  }
}
```

### Logs

```bash
# View logs
docker-compose logs -f backend

# Search logs
docker-compose logs backend | grep -i error

# Export logs
docker-compose logs backend > logs-$(date +%Y%m%d).log
```

### Metrics

```bash
# Container stats
docker stats

# Disk usage
docker system df

# Network connections
docker-compose exec backend netstat -an
```

### Alerts

Set up monitoring for:
- Failed login attempts (>5 in 15 min)
- Rate limit hits (>100 per hour)
- 500 errors
- High memory/CPU usage
- Disk space < 10%

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Container Won't Start

```bash
# Check logs
docker-compose logs backend

# Common causes:
# - Missing JWT_SECRET
# - Port already in use
# - Permission issues
```

**Solution:**
```bash
# Verify .env file
cat .env | grep JWT_SECRET

# Check ports
lsof -i :8080

# Fix permissions
docker-compose exec backend chown -R 1001:0 /data
```

#### 2. Authentication Not Working

```bash
# Check JWT_SECRET is set
docker-compose exec backend env | grep JWT_SECRET

# Verify admin user exists
docker-compose exec backend ls -la /data/users
```

**Solution:**
```bash
# Create admin user
docker-compose exec backend npm run create-admin
```

#### 3. CORS Errors

```bash
# Check ALLOWED_ORIGINS
docker-compose exec backend env | grep ALLOWED_ORIGINS
```

**Solution:**
```bash
# Update .env
echo "ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com" >> .env
docker-compose restart backend
```

#### 4. Rate Limiting Too Aggressive

**Solution:**
```bash
# For development, edit backend/src/index.ts
# Increase rate limits or comment out temporarily
docker-compose build backend
docker-compose restart backend
```

### Debug Mode

```bash
# Enable debug logging
docker-compose exec backend sh -c 'export LOG_LEVEL=debug && npm start'

# Or update .env
echo "LOG_LEVEL=debug" >> .env
docker-compose restart backend
```

---

## 🔄 Updates and Maintenance

### Update Application

```bash
# Pull latest code
git pull

# Rebuild images
docker-compose build --no-cache

# Restart services
docker-compose down
docker-compose up -d

# Verify
curl http://localhost:8080/health
```

### Update Dependencies

```bash
# Update npm packages
docker-compose exec backend npm update

# Rebuild image
docker-compose build backend
docker-compose restart backend
```

### Clean Up

```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything (DANGER!)
docker system prune -a --volumes
```

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `DOCKER_QUICK_REFERENCE.md` | One-page command reference |
| `DOCKER_SECURITY_SETUP.md` | Detailed Docker setup guide |
| `SECURITY_SETUP.md` | General security configuration |
| `CRITICAL_FIXES_SUMMARY.md` | Quick overview of security fixes |
| `DEPLOYMENT_CHECKLIST.md` | Complete deployment checklist |

---

## 🆘 Getting Help

### Check Documentation

1. Read `DOCKER_QUICK_REFERENCE.md` for common commands
2. Check `DOCKER_SECURITY_SETUP.md` for detailed setup
3. Review logs: `docker-compose logs -f backend`

### Run Tests

```bash
# Run security tests
docker-compose exec backend ./test-security.sh

# Test authentication
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-pass"}'
```

### Debug

```bash
# Access container shell
docker-compose exec backend /bin/bash

# Check environment
docker-compose exec backend env

# View data directory
docker-compose exec backend ls -la /data
```

---

## ✅ Success Criteria

Your deployment is successful when:

- ✅ `docker-compose ps` shows all services as "Up (healthy)"
- ✅ `curl http://localhost:8080/health` returns 200
- ✅ You can login and get a JWT token
- ✅ Protected endpoints require authentication
- ✅ Rate limiting blocks excessive requests
- ✅ Security headers are present
- ✅ No errors in logs

---

## 🎓 Next Steps

1. ✅ Deploy with Docker
2. ⏭️ Update frontend for authentication
3. ⏭️ Configure HTTPS for production
4. ⏭️ Set up monitoring and alerts
5. ⏭️ Configure automated backups
6. ⏭️ Perform security audit
7. ⏭️ Load test the application

---

**Ready to deploy?** Run `./setup-docker.sh` to get started! 🚀
