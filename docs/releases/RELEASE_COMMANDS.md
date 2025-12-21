# Release Commands - Version 2.0.0

Quick reference for releasing version 2.0.0 to git.

---

## 🚀 Quick Release (Automated)

```bash
./release-v2.0.sh
```

This script will:
1. Stage all files
2. Create commit with detailed message
3. Create git tag v2.0.0
4. Show next steps

---

## 📝 Manual Release

If you prefer to do it manually:

### 1. Stage Files

```bash
# Backend
git add backend/src/middleware/
git add backend/src/services/user.service.ts
git add backend/src/routes/auth.routes.ts
git add backend/src/scripts/
git add backend/src/index.ts
git add backend/src/startup.ts
git add backend/package.json
git add backend/Dockerfile
git add backend/test-security.sh

# Frontend
git add frontend/src/components/Login.tsx
git add frontend/src/App.tsx
git add frontend/src/services/api.ts

# Configuration
git add .env.example
git add docker-compose.yml

# Documentation
git add README.md
git add CHANGELOG_v2.0.0.md
git add RELEASE_v2.0.0.md
git add SECURITY_*.md
git add DOCKER_*.md
git add FRONTEND_AUTH_UPDATE.md
git add CORS_FIX.md
git add DEPLOYMENT_CHECKLIST.md
git add CRITICAL_FIXES_SUMMARY.md
git add QUICK_FIX_GUIDE.md
git add README_*.md
git add VERSION_2.0_SUMMARY.md
git add RELEASE_COMMANDS.md

# Steering
git add .kiro/steering/security-requirements.md

# Scripts
git add setup-docker.sh
git add fix-docker-admin.sh
git add fix-cors.sh
git add update-frontend.sh
git add release-v2.0.sh
```

### 2. Create Commit

```bash
git commit -m "Release v2.0.0: Enterprise Security & Authentication

Major release adding comprehensive security features and authentication system.

## Security Features
- JWT-based authentication with bcrypt password hashing
- 3-tier rate limiting system (general, LLM, auth endpoints)
- CORS protection with configurable origins
- Security headers via Helmet.js (CSP, HSTS, etc.)
- PII and credential encryption (AES-256-GCM)
- Complete audit logging system

## Frontend Updates
- Login/registration page with beautiful UI
- JWT token management and session handling
- Auto-redirect on authentication failure
- User info display with admin badge
- Logout functionality

## Backend Updates
- UserService for user management
- Auth middleware for JWT verification
- Auth routes for login/register/profile
- Environment variable validation
- Request ID tracking

## Docker Improvements
- One-command setup script
- Non-root containers (UID 1001)
- Health checks and monitoring
- Production-ready configuration

## Documentation
- Complete security audit report
- Comprehensive setup guides
- Docker deployment documentation
- Migration guides and checklists
- Security requirements in steering

## Breaking Changes
- All API endpoints now require authentication
- JWT_SECRET environment variable required
- CORS restricted to configured origins
- Admin user must be created after deployment

## Dependencies Added
- express-rate-limit ^7.1.5
- jsonwebtoken ^9.0.2
- bcryptjs ^2.4.3
- helmet ^7.1.0

## Security Score
- Before: 0/10 (Critical vulnerabilities)
- After: 9/10 (Production-ready)

See CHANGELOG_v2.0.0.md and RELEASE_v2.0.0.md for complete details."
```

### 3. Create Tag

```bash
git tag -a "v2.0.0" -m "Version 2.0.0 - Enterprise Security & Authentication

Production-ready release with comprehensive security features.

Key Features:
- JWT authentication system
- Rate limiting protection
- CORS security
- Data encryption
- Audit logging
- Login/registration UI
- Docker deployment

See RELEASE_v2.0.0.md for details."
```

### 4. Verify

```bash
# Check commit
git show HEAD

# Check tag
git show v2.0.0

# Check status
git status
```

---

## 🌐 Push to Remote

### Push Commit and Tag

```bash
# Push main branch
git push origin main

# Push tag
git push origin v2.0.0
```

### Or Push Everything

```bash
git push origin main --tags
```

---

## 📦 Create GitHub Release

### Via Web Interface

1. Go to your GitHub repository
2. Click "Releases" → "Create a new release"
3. Select tag: `v2.0.0`
4. Release title: `Version 2.0.0 - Enterprise Security & Authentication`
5. Description: Copy from `RELEASE_v2.0.0.md`
6. Attach files:
   - `CHANGELOG_v2.0.0.md`
   - `SECURITY_AUDIT_REPORT.md`
7. Mark as "Latest release"
8. Publish release

### Via GitHub CLI

```bash
# Install gh CLI if needed
# brew install gh (Mac)
# apt install gh (Linux)

# Create release
gh release create v2.0.0 \
  --title "Version 2.0.0 - Enterprise Security & Authentication" \
  --notes-file RELEASE_v2.0.0.md \
  CHANGELOG_v2.0.0.md \
  SECURITY_AUDIT_REPORT.md
```

---

## 🔍 Verification

### Check Local

```bash
# View commit
git log -1

# View tag
git tag -l -n9 v2.0.0

# View files
git ls-tree -r v2.0.0 --name-only
```

### Check Remote

```bash
# Check if pushed
git ls-remote --tags origin

# Should show:
# <hash>  refs/tags/v2.0.0
```

---

## 🎯 Post-Release

### Update Documentation

```bash
# Update version in package.json (if not already done)
# Update version in README.md (if not already done)
```

### Announce Release

1. Update project README with v2.0.0 badge
2. Post release notes to team/users
3. Update documentation site (if any)
4. Send notification emails (if applicable)

### Deploy to Production

```bash
# On production server
git pull
git checkout v2.0.0
./setup-docker.sh
```

---

## 🐛 Rollback (If Needed)

### Revert Commit

```bash
# Revert to previous version
git revert HEAD

# Or reset (if not pushed)
git reset --hard HEAD~1
```

### Delete Tag

```bash
# Delete local tag
git tag -d v2.0.0

# Delete remote tag
git push origin :refs/tags/v2.0.0
```

---

## 📊 Release Checklist

- [ ] All files staged
- [ ] Commit created with detailed message
- [ ] Tag created (v2.0.0)
- [ ] Commit verified (`git show HEAD`)
- [ ] Tag verified (`git show v2.0.0`)
- [ ] Pushed to remote (`git push origin main`)
- [ ] Tag pushed (`git push origin v2.0.0`)
- [ ] GitHub release created
- [ ] Release notes published
- [ ] Documentation updated
- [ ] Team notified
- [ ] Production deployed

---

## 🔗 Quick Links

- **Release Notes:** `RELEASE_v2.0.0.md`
- **Changelog:** `CHANGELOG_v2.0.0.md`
- **Summary:** `VERSION_2.0_SUMMARY.md`
- **Security:** `SECURITY_AUDIT_REPORT.md`
- **Deployment:** `DEPLOYMENT_CHECKLIST.md`

---

## 💡 Tips

1. **Always backup before release:**
   ```bash
   git branch backup-pre-v2.0
   ```

2. **Test locally first:**
   ```bash
   ./setup-docker.sh
   docker-compose exec backend ./test-security.sh
   ```

3. **Review changes:**
   ```bash
   git diff v1.2.0..HEAD
   ```

4. **Check for uncommitted changes:**
   ```bash
   git status
   ```

---

**Ready to release?** Run `./release-v2.0.sh` 🚀
