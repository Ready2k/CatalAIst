# Docker Images Stored Locally - v3.0.0

**Date:** November 15, 2025  
**Version:** 3.0.0

## Stored Images

### Archive File
- **Filename:** `catalai-v3.0.0-images.tar.gz`
- **Size:** 238 MB (compressed)
- **Contains:** Both backend and frontend images
- **Location:** Project root directory

### Images Included
1. `catalai-backend:3.0.0` (1.02 GB uncompressed)
2. `catalai-frontend:3.0.0` (503 MB uncompressed)

## What's Stored

The tar.gz file contains:
- Complete Docker images with all layers
- All dependencies and runtime files
- Configuration and scripts
- Ready to load and run on any Docker host

## Loading Images on Another Machine

### Step 1: Transfer the file
```bash
# Copy to another machine via scp
scp catalai-v3.0.0-images.tar.gz user@remote-host:/path/to/destination/

# Or use USB drive, cloud storage, etc.
```

### Step 2: Load the images
```bash
# On the target machine
docker load < catalai-v3.0.0-images.tar.gz

# Verify images loaded
docker images | grep catalai
```

### Step 3: Run the application
```bash
# Copy docker-compose.yml and .env to target machine
# Then start services
docker-compose up -d
```

## Quick Start on New Machine

```bash
# 1. Load images
docker load < catalai-v3.0.0-images.tar.gz

# 2. Create .env file
cat > .env << 'EOF'
JWT_SECRET=your-secret-key-here
PII_ENCRYPTION_KEY=your-encryption-key-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:80
EOF

# 3. Start services
docker-compose up -d

# 4. Access application
# Frontend: http://localhost
# Backend API: http://localhost:8080
```

## Image Verification

After loading, verify the images:

```bash
# Check images exist
docker images | grep catalai

# Expected output:
# catalai-backend    3.0.0    <image-id>   <time>   1.02GB
# catalai-frontend   3.0.0    <image-id>   <time>   503MB

# Inspect backend
docker inspect catalai-backend:3.0.0 | grep -A 5 "Labels"

# Inspect frontend
docker inspect catalai-frontend:3.0.0 | grep -A 5 "Labels"
```

## What's New in v3.0.0

### Features
- ✅ Voice input with streaming support
- ✅ Start Fresh feature for new sessions
- ✅ Enhanced authentication and security
- ✅ Improved error handling
- ✅ Updated dependencies (zero vulnerabilities)

### Security
- ✅ All npm packages updated
- ✅ Zero security vulnerabilities
- ✅ npm overrides for transitive dependencies
- ✅ Latest AWS SDK and OpenAI SDK

### Technical
- ✅ React 18.3.1
- ✅ Express 4.21.2
- ✅ OpenAI SDK 4.104.0
- ✅ AWS SDK 3.932.0
- ✅ Node.js 20 runtime

## Storage Recommendations

### For Backup
- Store `catalai-v3.0.0-images.tar.gz` in:
  - Cloud storage (S3, Google Drive, Dropbox)
  - Network attached storage (NAS)
  - External hard drive
  - Version control (if size permits)

### For Distribution
- Upload to container registry:
  - Docker Hub
  - AWS ECR
  - Google Container Registry
  - Azure Container Registry
  - Private registry

## Rebuilding Images

If you need to rebuild from source:

```bash
# Update version in package.json files
# Then rebuild:
docker build -f backend/Dockerfile -t catalai-backend:3.0.0 .
docker build -f frontend/Dockerfile -t catalai-frontend:3.0.0 .

# Save again
docker save catalai-backend:3.0.0 catalai-frontend:3.0.0 | gzip > catalai-v3.0.0-images.tar.gz
```

## File Integrity

### Generate checksum
```bash
# SHA256
shasum -a 256 catalai-v3.0.0-images.tar.gz > catalai-v3.0.0-images.tar.gz.sha256

# MD5
md5 catalai-v3.0.0-images.tar.gz > catalai-v3.0.0-images.tar.gz.md5
```

### Verify checksum
```bash
# SHA256
shasum -a 256 -c catalai-v3.0.0-images.tar.gz.sha256

# MD5
md5 -c catalai-v3.0.0-images.tar.gz.md5
```

## Deployment Scenarios

### Scenario 1: Air-gapped Environment
1. Save images to tar.gz (✅ Done)
2. Transfer via USB or secure file transfer
3. Load images on target system
4. Deploy with docker-compose

### Scenario 2: Cloud Deployment
1. Push images to cloud registry
2. Deploy using cloud services (ECS, GKE, AKS)
3. Configure load balancer and DNS

### Scenario 3: On-Premises Server
1. Transfer tar.gz to server
2. Load images
3. Configure reverse proxy (nginx/Apache)
4. Set up SSL certificates

## Cleanup Old Images

```bash
# Remove old versions
docker rmi catalaist-backend:latest
docker rmi catalaist-frontend:latest
docker rmi catalai-frontend-test:latest

# Remove dangling images
docker image prune -f

# Remove unused images
docker image prune -a
```

## Support Files

Related documentation:
- `DOCKER_BUILD_v3.0.0.md` - Build details
- `SECURITY_AUDIT_SUMMARY.md` - Security status
- `RELEASE_SUMMARY_v3.0.0.md` - Release notes
- `docker-compose.yml` - Deployment configuration
- `.env.example` - Environment variables template

## Troubleshooting

### Image won't load
```bash
# Check file integrity
gunzip -t catalai-v3.0.0-images.tar.gz

# Try loading without compression
gunzip catalai-v3.0.0-images.tar.gz
docker load < catalai-v3.0.0-images.tar
```

### Out of disk space
```bash
# Check available space
df -h

# Clean up Docker
docker system prune -a

# Remove old images
docker image prune -a
```

### Permission denied
```bash
# Ensure file is readable
chmod 644 catalai-v3.0.0-images.tar.gz

# Run docker with sudo if needed
sudo docker load < catalai-v3.0.0-images.tar.gz
```

---

**Status:** Images saved successfully ✅  
**Archive Size:** 238 MB  
**Ready for:** Backup, distribution, or deployment
