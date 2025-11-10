# Security Setup Guide

This guide walks you through setting up the security features for CatalAIst.

## Critical Security Issues Fixed ✅

1. **Authentication & Authorization** - JWT-based authentication system
2. **Rate Limiting** - Protection against DoS and API abuse
3. **CORS Configuration** - Restricted to specific origins
4. **Security Headers** - Helmet.js with comprehensive security headers
5. **Encrypted Credential Storage** - User API keys stored encrypted

---

## Quick Start

### 1. Set Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and set **REQUIRED** security variables:

```bash
# Generate secure random keys (use these commands):
# On Linux/Mac:
openssl rand -base64 32

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Required variables:**
```bash
JWT_SECRET=<your-generated-secret-key>
PII_ENCRYPTION_KEY=<your-generated-encryption-key>
CREDENTIALS_ENCRYPTION_KEY=<your-generated-credentials-key>
```

**CORS Configuration:**
```bash
# For production, set your actual frontend URL
ALLOWED_ORIGINS=https://your-frontend-domain.com,https://app.your-domain.com
```

### 2. Create Admin User

After starting the backend, create the first admin user:

```bash
cd backend
npm run create-admin
```

Follow the prompts to create your admin account.

### 3. Start the Application

```bash
# Development
cd backend && npm run dev

# Production with Docker
docker-compose up -d
```

---

## Authentication Flow

### User Registration

```bash
POST /api/auth/register
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePassword123!"
}
```

Response:
```json
{
  "message": "User created successfully",
  "user": {
    "userId": "uuid",
    "username": "john_doe",
    "role": "user",
    "createdAt": "2025-11-09T..."
  }
}
```

### User Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "john_doe",
  "password": "SecurePassword123!"
}
```

Response:
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "userId": "uuid",
    "username": "john_doe",
    "role": "user"
  }
}
```

### Using the Token

Include the JWT token in the Authorization header for all API requests:

```bash
GET /api/sessions
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Storing User Credentials

Users can now store their LLM credentials (OpenAI API keys, AWS credentials) encrypted in their profile:

### Store Credentials

```bash
POST /api/auth/credentials
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-4"
}
```

Or for AWS Bedrock:

```json
{
  "provider": "bedrock",
  "awsAccessKeyId": "AKIA...",
  "awsSecretAccessKey": "...",
  "awsRegion": "us-east-1",
  "model": "anthropic.claude-3-5-sonnet-20241022-v2:0"
}
```

### Retrieve Credentials

```bash
GET /api/auth/credentials
Authorization: Bearer <your-jwt-token>
```

Response:
```json
{
  "credentials": {
    "provider": "openai",
    "apiKey": "sk-...",
    "model": "gpt-4"
  }
}
```

---

## Rate Limiting

The following rate limits are enforced:

### General API Endpoints
- **100 requests per 15 minutes** per IP address
- Applies to all `/api/*` endpoints

### LLM Endpoints (Expensive Operations)
- **10 requests per minute** per IP address
- Applies to:
  - `/api/process/*` (classification, clarification)
  - `/api/voice/*` (transcription, synthesis)

### Authentication Endpoints
- **5 attempts per 15 minutes** per IP address
- Applies to:
  - `/api/auth/login`
  - `/api/auth/register`
- Successful requests don't count toward the limit

### Rate Limit Response

When rate limit is exceeded:
```json
{
  "error": "Too many requests",
  "message": "Please try again later"
}
```

Headers included:
- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining
- `RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## CORS Configuration

### Development

Default allowed origins:
- `http://localhost:3000`
- `http://localhost:80`

### Production

Set the `ALLOWED_ORIGINS` environment variable:

```bash
ALLOWED_ORIGINS=https://app.example.com,https://admin.example.com
```

Multiple origins can be comma-separated.

### CORS Error

If you see a CORS error:
```
Access to fetch at 'http://backend:8080/api/...' from origin 'http://frontend:3000' 
has been blocked by CORS policy
```

**Solution:** Add your frontend origin to `ALLOWED_ORIGINS` in `.env`

---

## Security Headers

The following security headers are automatically added by Helmet.js:

### Content Security Policy (CSP)
Prevents XSS attacks by restricting resource loading:
- Scripts: Only from same origin
- Styles: Same origin + inline styles (for React)
- Images: Same origin + data URIs + HTTPS
- Frames: Blocked (prevents clickjacking)

### HTTP Strict Transport Security (HSTS)
Forces HTTPS connections:
- Max age: 1 year
- Includes subdomains
- Preload enabled

### Other Headers
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS filter

---

## Password Requirements

- Minimum length: 8 characters
- No maximum length (but reasonable limits apply)
- Passwords are hashed using bcrypt (10 rounds)
- Never stored in plain text

### Change Password

```bash
PUT /api/auth/password
Authorization: Bearer <your-jwt-token>
Content-Type: application/json

{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewSecurePassword456!"
}
```

---

## Token Management

### Token Expiration
- JWT tokens expire after **24 hours**
- Users must login again after expiration

### Token Validation
- Tokens are validated on every protected endpoint
- Invalid or expired tokens return 401/403 errors

### Token Storage (Frontend)
**Recommended:** Store tokens in memory or sessionStorage (not localStorage for better security)

```javascript
// After login
const { token } = await loginResponse.json();
sessionStorage.setItem('authToken', token);

// For API requests
const token = sessionStorage.getItem('authToken');
fetch('/api/sessions', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// On logout
sessionStorage.removeItem('authToken');
```

---

## User Roles

### Available Roles

1. **user** (default)
   - Can use classification features
   - Can manage own sessions
   - Can view own analytics

2. **admin**
   - All user permissions
   - Can manage decision matrices
   - Can view all analytics
   - Can manage prompts
   - Can view audit logs

### Role-Based Access Control

To restrict endpoints to specific roles, use the `requireRole` middleware:

```typescript
import { requireRole } from '../middleware/auth.middleware';

// Admin only endpoint
router.get('/admin/users', authenticateToken, requireRole('admin'), async (req, res) => {
  // Only admins can access this
});
```

---

## Encryption

### PII Encryption
- Algorithm: AES-256-GCM
- Key: `PII_ENCRYPTION_KEY` environment variable
- Used for: Detected PII in user inputs

### Credentials Encryption
- Algorithm: AES-256-GCM
- Key: `CREDENTIALS_ENCRYPTION_KEY` environment variable
- Used for: User's API keys and AWS credentials

### Password Hashing
- Algorithm: bcrypt
- Rounds: 10
- Salt: Automatically generated per password

---

## Security Checklist for Production

Before deploying to production, ensure:

- [ ] `JWT_SECRET` is set to a strong random value (not default)
- [ ] `PII_ENCRYPTION_KEY` is set to a strong random value
- [ ] `CREDENTIALS_ENCRYPTION_KEY` is set to a strong random value
- [ ] `ALLOWED_ORIGINS` is set to your actual frontend URL(s)
- [ ] HTTPS is enabled (use reverse proxy like nginx)
- [ ] Admin user is created with strong password
- [ ] Default credentials are removed
- [ ] Environment variables are not committed to git
- [ ] Database backups are configured
- [ ] Monitoring and alerting are set up
- [ ] Rate limits are appropriate for your use case
- [ ] Security headers are verified (use securityheaders.com)

---

## Monitoring & Logging

### Request IDs
Every request gets a unique ID for tracing:
- Header: `X-Request-ID`
- Automatically generated if not provided
- Included in all log entries

### Audit Logging
All security-relevant events are logged:
- User login/logout
- Failed authentication attempts
- Credential access
- PII access
- Administrative actions

Logs are stored in: `data/audit-logs/YYYY-MM-DD.jsonl`

---

## Troubleshooting

### "JWT_SECRET not configured"
**Problem:** JWT_SECRET environment variable is not set

**Solution:**
```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env
JWT_SECRET=<generated-secret>
```

### "Not allowed by CORS"
**Problem:** Frontend origin is not in ALLOWED_ORIGINS

**Solution:**
```bash
# Add your frontend URL to .env
ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.com
```

### "Too many requests"
**Problem:** Rate limit exceeded

**Solution:**
- Wait for the rate limit window to reset
- For development, you can adjust limits in `backend/src/index.ts`
- For production, consider implementing per-user rate limits

### "Token expired"
**Problem:** JWT token has expired (24 hours)

**Solution:**
- User needs to login again
- Implement token refresh mechanism if needed

---

## Security Best Practices

1. **Never commit secrets to git**
   - Use `.env` files (already in `.gitignore`)
   - Use environment variables in production

2. **Use HTTPS in production**
   - Set up SSL/TLS certificates
   - Use Let's Encrypt for free certificates
   - Configure reverse proxy (nginx, Caddy)

3. **Regular security updates**
   - Run `npm audit` regularly
   - Update dependencies monthly
   - Monitor security advisories

4. **Strong passwords**
   - Enforce minimum 8 characters
   - Consider adding complexity requirements
   - Implement password reset flow

5. **Monitor and alert**
   - Set up monitoring for failed login attempts
   - Alert on unusual API usage patterns
   - Review audit logs regularly

6. **Backup encryption keys**
   - Store encryption keys securely
   - Have a key rotation plan
   - Document key recovery procedures

---

## Migration from Unsecured Version

If you're upgrading from a version without authentication:

1. **Backup your data**
   ```bash
   cp -r data data.backup
   ```

2. **Set environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Create admin user**
   ```bash
   npm run create-admin
   ```

4. **Update frontend**
   - Add login page
   - Store JWT token
   - Include token in API requests

5. **Test thoroughly**
   - Verify authentication works
   - Check all API endpoints
   - Test rate limiting

---

## Support

For security issues or questions:
- Review the Security Audit Report: `SECURITY_AUDIT_REPORT.md`
- Check application logs: `data/audit-logs/`
- Open an issue on GitHub (for non-sensitive issues)

**For security vulnerabilities:** Please report privately, not in public issues.
