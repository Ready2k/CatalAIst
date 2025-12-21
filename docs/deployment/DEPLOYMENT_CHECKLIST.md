# Deployment Checklist - Security Updates

Use this checklist to ensure proper deployment of the security updates.

---

## Pre-Deployment

### 1. Environment Setup
- [ ] Copy `.env.example` to `.env`
- [ ] Generate strong `JWT_SECRET` (32+ bytes)
  ```bash
  openssl rand -base64 32
  ```
- [ ] Generate `PII_ENCRYPTION_KEY` (separate from JWT_SECRET)
  ```bash
  openssl rand -base64 32
  ```
- [ ] Generate `CREDENTIALS_ENCRYPTION_KEY` (separate from both)
  ```bash
  openssl rand -base64 32
  ```
- [ ] Set `ALLOWED_ORIGINS` to your frontend URL(s)
- [ ] Verify all required environment variables are set

### 2. Dependencies
- [ ] Run `npm install` in backend directory
- [ ] Verify no vulnerabilities: `npm audit`
- [ ] Check build succeeds: `npm run build`

### 3. Database/Storage
- [ ] Backup existing data directory
  ```bash
  cp -r data data.backup.$(date +%Y%m%d)
  ```
- [ ] Verify data directory permissions
- [ ] Ensure sufficient disk space

---

## Deployment

### Development Environment

- [ ] Set environment variables in `.env`
- [ ] Start backend: `npm run dev`
- [ ] Create admin user: `npm run create-admin`
- [ ] Run security tests: `./test-security.sh`
- [ ] Verify health endpoint: `curl http://localhost:8080/health`
- [ ] Test authentication flow
- [ ] Test rate limiting
- [ ] Verify CORS configuration

### Production Environment (Docker)

- [ ] Set environment variables in `.env` or docker-compose
- [ ] Build images: `docker-compose build`
- [ ] Start services: `docker-compose up -d`
- [ ] Check logs: `docker-compose logs -f backend`
- [ ] Create admin user: `docker-compose exec backend npm run create-admin`
- [ ] Verify health: `curl http://your-domain/health`
- [ ] Test authentication
- [ ] Verify HTTPS is working
- [ ] Check security headers: `curl -I https://your-domain/health`

---

## Post-Deployment

### 1. Verification Tests

- [ ] Health check returns 200
  ```bash
  curl http://localhost:8080/health
  ```

- [ ] Protected endpoints require auth (401 without token)
  ```bash
  curl http://localhost:8080/api/sessions
  # Should return 401
  ```

- [ ] Registration works
  ```bash
  curl -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"testpass123"}'
  ```

- [ ] Login returns token
  ```bash
  curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"testpass123"}'
  ```

- [ ] Protected endpoints work with token
  ```bash
  curl http://localhost:8080/api/sessions \
    -H "Authorization: Bearer <token>"
  ```

- [ ] Rate limiting triggers (send 11+ requests quickly)

- [ ] CORS blocks unauthorized origins

- [ ] Security headers present
  ```bash
  curl -I http://localhost:8080/health | grep -E "X-Frame-Options|X-Content-Type-Options"
  ```

### 2. Security Verification

- [ ] JWT_SECRET is not default value
- [ ] PII_ENCRYPTION_KEY is set (production)
- [ ] ALLOWED_ORIGINS is configured correctly
- [ ] HTTPS is enabled (production)
- [ ] Admin user has strong password
- [ ] No default credentials remain
- [ ] Audit logs are being written
- [ ] Request IDs are in logs

### 3. Monitoring Setup

- [ ] Set up log monitoring
- [ ] Configure alerts for:
  - [ ] Failed login attempts (>5 in 15 min)
  - [ ] Rate limit hits (>100 per hour)
  - [ ] 500 errors
  - [ ] High memory/CPU usage
- [ ] Set up uptime monitoring
- [ ] Configure backup schedule

---

## Frontend Updates Required

### 1. Authentication UI
- [ ] Create login page
- [ ] Create registration page
- [ ] Add logout functionality
- [ ] Handle token storage (sessionStorage recommended)
- [ ] Add token refresh logic (optional)

### 2. API Integration
- [ ] Update API service to include Authorization header
  ```javascript
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
  ```
- [ ] Handle 401 responses (redirect to login)
- [ ] Handle 403 responses (show permission error)
- [ ] Handle 429 responses (rate limit message)

### 3. User Experience
- [ ] Show loading states during auth
- [ ] Display error messages clearly
- [ ] Add "Remember me" option (optional)
- [ ] Show user info in header
- [ ] Add password change form

---

## Rollback Plan

If issues occur, follow this rollback procedure:

### 1. Immediate Rollback
```bash
# Stop current deployment
docker-compose down

# Restore previous version
git checkout <previous-commit>

# Restore data backup
rm -rf data
mv data.backup.YYYYMMDD data

# Deploy previous version
docker-compose up -d
```

### 2. Partial Rollback (Keep Security, Fix Issues)
```bash
# Keep running but disable rate limiting temporarily
# Edit backend/src/index.ts and comment out rate limiters
# Restart: docker-compose restart backend
```

### 3. Data Recovery
```bash
# If user data is corrupted
rm -rf data/users
# Users will need to re-register
```

---

## Troubleshooting

### Server Won't Start

**Error:** "JWT_SECRET not configured"
```bash
# Solution: Set JWT_SECRET in .env
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env
```

**Error:** "Missing required environment variables"
```bash
# Solution: Check .env file exists and has required vars
cat .env
# Compare with .env.example
```

### Authentication Issues

**Problem:** Can't login
```bash
# Check if user exists
docker-compose exec backend npm run create-admin
# Or check logs
docker-compose logs backend | grep -i auth
```

**Problem:** Token expired
```bash
# Tokens expire after 24h - user needs to login again
# Or implement token refresh
```

### Rate Limiting Issues

**Problem:** Getting 429 too quickly
```bash
# For development, increase limits in backend/src/index.ts
# Or wait for rate limit window to reset (15 minutes)
```

### CORS Issues

**Problem:** "Not allowed by CORS"
```bash
# Add your frontend URL to ALLOWED_ORIGINS
echo "ALLOWED_ORIGINS=http://localhost:3000,https://your-domain.com" >> .env
docker-compose restart backend
```

---

## Security Audit

After deployment, verify security:

### 1. External Tools
- [ ] Run SSL test: https://www.ssllabs.com/ssltest/
- [ ] Check security headers: https://securityheaders.com/
- [ ] Scan for vulnerabilities: `npm audit`

### 2. Manual Testing
- [ ] Try accessing protected endpoints without auth
- [ ] Try using invalid/expired tokens
- [ ] Try brute force login (should be rate limited)
- [ ] Try CORS from unauthorized origin
- [ ] Check for sensitive data in logs
- [ ] Verify PII is encrypted

### 3. Penetration Testing (Optional)
- [ ] SQL injection attempts
- [ ] XSS attempts
- [ ] CSRF attempts
- [ ] Session hijacking attempts
- [ ] DoS attempts

---

## Documentation Updates

- [ ] Update main README with authentication info
- [ ] Update API documentation with auth requirements
- [ ] Document environment variables
- [ ] Create user guide for login/registration
- [ ] Update deployment guide

---

## Team Communication

- [ ] Notify team of deployment
- [ ] Share admin credentials securely
- [ ] Provide migration guide to developers
- [ ] Schedule training session (if needed)
- [ ] Update runbooks

---

## Compliance & Legal

- [ ] Update privacy policy (if collecting user data)
- [ ] Update terms of service
- [ ] Document data retention policies
- [ ] Ensure GDPR compliance (if applicable)
- [ ] Document security measures for audits

---

## Success Criteria

Deployment is successful when:

- ✅ All services are running
- ✅ Health check returns 200
- ✅ Authentication works end-to-end
- ✅ Rate limiting is active
- ✅ CORS is properly configured
- ✅ Security headers are present
- ✅ No errors in logs
- ✅ Frontend can authenticate
- ✅ Admin user can access all features
- ✅ Regular users have appropriate permissions

---

## Sign-Off

- [ ] Developer: Tested locally _______________
- [ ] DevOps: Deployed successfully _______________
- [ ] Security: Verified security measures _______________
- [ ] QA: Tested all flows _______________
- [ ] Product: Approved for production _______________

**Deployment Date:** _______________  
**Deployed By:** _______________  
**Version:** 2.0.0 (Security Update)

---

## Post-Deployment Monitoring (First 24 Hours)

- [ ] Hour 1: Check logs every 15 minutes
- [ ] Hour 2-4: Check logs every 30 minutes
- [ ] Hour 4-24: Check logs every 2 hours
- [ ] Monitor error rates
- [ ] Monitor authentication success/failure rates
- [ ] Monitor rate limit hits
- [ ] Check system resources (CPU, memory, disk)
- [ ] Verify backups are running

---

## Long-Term Maintenance

### Weekly
- [ ] Review audit logs
- [ ] Check for failed login attempts
- [ ] Monitor rate limit patterns
- [ ] Review error logs

### Monthly
- [ ] Update dependencies: `npm update`
- [ ] Run security audit: `npm audit`
- [ ] Review and rotate logs
- [ ] Test backup restoration
- [ ] Review user accounts (remove inactive)

### Quarterly
- [ ] Security review
- [ ] Performance review
- [ ] Update documentation
- [ ] Review and update rate limits
- [ ] Consider key rotation

---

**Remember:** Security is an ongoing process, not a one-time fix!
