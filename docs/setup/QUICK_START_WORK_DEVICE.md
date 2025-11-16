# Quick Start - Work Device Setup

## TL;DR - Get Running in 5 Minutes

### Method 1: GitHub Releases (Recommended)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/CatalAIst.git
cd CatalAIst

# 2. Run setup script
./scripts/setup-work-device.sh

# 3. Choose option 1 (GitHub Releases)
# 4. Enter your GitHub username
# 5. Wait for download and setup

# Done! Access at http://localhost
```

### Method 2: USB Drive

```bash
# 1. On your personal device, copy to USB:
cp catalai-v3.0.0-images.tar.gz /Volumes/USB_DRIVE/

# 2. On work device, clone repo:
git clone https://github.com/YOUR_USERNAME/CatalAIst.git
cd CatalAIst

# 3. Copy from USB:
cp /media/USB_DRIVE/catalai-v3.0.0-images.tar.gz .

# 4. Run setup script:
./scripts/setup-work-device.sh

# 5. Choose option 3 (Local tar.gz)

# Done! Access at http://localhost
```

### Method 3: Docker Hub

```bash
# 1. On personal device, push to Docker Hub:
docker login
docker tag catalai-backend:3.0.0 YOUR_USERNAME/catalai-backend:3.0.0
docker tag catalai-frontend:3.0.0 YOUR_USERNAME/catalai-frontend:3.0.0
docker push YOUR_USERNAME/catalai-backend:3.0.0
docker push YOUR_USERNAME/catalai-frontend:3.0.0

# 2. On work device:
git clone https://github.com/YOUR_USERNAME/CatalAIst.git
cd CatalAIst
./scripts/setup-work-device.sh

# 3. Choose option 2 (Docker Hub)
# 4. Enter your Docker Hub username

# Done! Access at http://localhost
```

## What Gets Committed to Git?

✅ **Committed:**
- Source code
- Dockerfiles
- docker-compose.yml
- Documentation
- Setup scripts

❌ **NOT Committed (in .gitignore):**
- `*.tar.gz` - Docker image archives
- `node_modules/` - Dependencies
- `dist/` and `build/` - Build outputs
- `.env` - Environment variables
- `data/` - User data

## Why Not Commit Docker Images?

1. **Too large** - 238 MB exceeds Git's sweet spot
2. **Binary files** - Git is optimized for text
3. **Repo bloat** - Makes cloning slow
4. **Better alternatives** - Releases, registries, LFS

## File Sizes

```
Source code:        ~5 MB
Docker images:      238 MB (compressed)
                    1.5 GB (uncompressed)
```

Git is great for the 5 MB, not the 238 MB!

## Recommended Workflow

### Personal Device:
```bash
# 1. Develop and test
# 2. Build Docker images
# 3. Push code to GitHub
# 4. Upload images to GitHub Releases OR Docker Hub
```

### Work Device:
```bash
# 1. Clone repo from GitHub
# 2. Download images (Releases/Hub/USB)
# 3. Run setup script
# 4. Start using!
```

## Need More Details?

- Full guide: `WORK_DEVICE_DEPLOYMENT.md`
- Docker info: `DOCKER_IMAGES_STORED.md`
- Build info: `DOCKER_BUILD_v3.0.0.md`

## Troubleshooting

**"Permission denied" on setup script:**
```bash
chmod +x scripts/setup-work-device.sh
```

**"Docker not found":**
- Install Docker Desktop: https://docs.docker.com/get-docker/

**"Port already in use":**
```bash
# Stop conflicting services
docker-compose down
# Or change ports in docker-compose.yml
```

**Corporate firewall blocking downloads:**
- Use USB drive method (Method 2)
- Or ask IT to whitelist GitHub/Docker Hub

---

**Questions?** Check the full documentation or open an issue on GitHub.
