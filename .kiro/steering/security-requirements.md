# Security Requirements - CatalAIst v2.0+

## Critical Rule: All Code Must Follow Security Best Practices

**MANDATORY**: Every feature and API endpoint must implement proper security measures.

---

## Authentication & Authorization

### Requirements

1. **All API endpoints MUST require authentication** (except `/health` and `/api/auth/*`)
2. **Use JWT tokens** for authentication
3. **Include Authorization header** in all API requests
4. **Implement role-based access control** where appropriate

### Implementation

```typescript
// Protect routes with authentication middleware
import { authenticateToken, requireRole } from '../middleware/auth.middleware';

// All routes require auth
router.get('/api/resource', authenticateToken, handler);

// Admin-only routes
router.post('/api/admin/action', authenticateToken, requireRole('admin'), handler);
```

### Frontend

```typescript
// Include token in all requests
const token = sessionStorage.getItem('authToken');
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

---

## Rate Limiting

### Requirements

1. **All API endpoints MUST have rate limiting**
2. **Use appropriate limits** based on endpoint type
3. **Return 429 status** when limit exceeded

### Limits

- **General API:** 100 requests / 15 minutes
- **LLM endpoints:** 10 requests / minute
- **Auth endpoints:** 5 attempts / 15 minutes

### Implementation

```typescript
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests' }
});

app.use('/api', apiLimiter);
```

---

## Input Validation

### Requirements

1. **Validate all user input**
2. **Sanitize data before processing**
3. **Use Zod schemas** for structured data
4. **Enforce size limits**

### Implementation

```typescript
// Validate input
if (!description || description.length < 10 || description.length > 10000) {
  return res.status(400).json({
    error: 'Invalid input',
    message: 'Description must be between 10 and 10,000 characters'
  });
}

// Use Zod for complex validation
import { z } from 'zod';

const UserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  role: z.enum(['admin', 'user'])
});
```

---

## Data Encryption

### Requirements

1. **Encrypt all PII** (personally identifiable information)
2. **Encrypt user credentials** (API keys, passwords)
3. **Use AES-256-GCM** for encryption
4. **Never log sensitive data**

### Implementation

```typescript
// PII detection and encryption
const piiResult = await piiService.scrubAndStore(text, sessionId, userId);

// Credential encryption
await userService.storeCredentials(userId, {
  apiKey: credentials.apiKey,  // Will be encrypted
  awsAccessKeyId: credentials.awsAccessKeyId  // Will be encrypted
});
```

---

## Audit Logging

### Requirements

1. **Log all security-relevant events**
2. **Use JSONL format** for immutability
3. **Include timestamp, user, action**
4. **Never log sensitive data** (passwords, tokens, PII)

### Events to Log

- User login/logout
- Failed authentication attempts
- Credential access
- PII access
- Administrative actions
- Classification requests
- Feedback submissions

### Implementation

```typescript
await auditLogService.log({
  sessionId,
  timestamp: new Date().toISOString(),
  eventType: 'authentication',
  userId,
  data: { action: 'login', success: true },
  piiScrubbed: false,
  metadata: { ipAddress: req.ip }
});
```

---

## CORS Configuration

### Requirements

1. **Restrict CORS** to configured origins
2. **Use environment variables** for configuration
3. **Support credentials**
4. **Validate origin** on every request
5. **Allow necessary headers** for authentication and AWS credentials

### Implementation

```typescript
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-API-Key',
    'x-aws-access-key-id',
    'x-aws-secret-access-key',
    'x-aws-session-token',
    'x-aws-region'
  ]
}));
```

---

## Security Headers

### Requirements

1. **Use Helmet.js** for security headers
2. **Configure CSP** (Content Security Policy)
3. **Enable HSTS** for HTTPS
4. **Prevent clickjacking**

### Implementation

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true
  }
}));
```

---

## Password Security

### Requirements

1. **Minimum 8 characters**
2. **Hash with bcrypt** (10 rounds minimum)
3. **Never store plain text**
4. **Never log passwords**

### Implementation

```typescript
import bcrypt from 'bcryptjs';

// Hash password
const passwordHash = await bcrypt.hash(password, 10);

// Verify password
const isValid = await bcrypt.compare(password, user.passwordHash);
```

---

## Environment Variables

### Requirements

1. **Never commit secrets** to git
2. **Use .env files** for configuration
3. **Validate required variables** on startup
4. **Provide clear error messages**

### Required Variables

```bash
JWT_SECRET=<required>
PII_ENCRYPTION_KEY=<recommended>
CREDENTIALS_ENCRYPTION_KEY=<recommended>
ALLOWED_ORIGINS=<recommended>
```

### Validation

```typescript
function validateEnvironment(): void {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

---

## Docker Security

### Requirements

1. **Run as non-root user**
2. **Use minimal base images**
3. **Implement health checks**
4. **Set resource limits**

### Implementation

```dockerfile
# Use non-root user
USER 1001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1
```

---

## API Design

### Requirements

1. **Use HTTPS** in production
2. **Version your APIs** (e.g., `/api/v1/`)
3. **Return appropriate status codes**
4. **Include request IDs** for tracking

### Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `429` - Too many requests
- `500` - Server error

### Implementation

```typescript
// Add request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

---

## Error Handling

### Requirements

1. **Never expose stack traces** to users
2. **Log errors** for debugging
3. **Return generic messages** to users
4. **Include request ID** in errors

### Implementation

```typescript
try {
  // Operation
} catch (error) {
  console.error('Error:', error);  // Log full error
  
  res.status(500).json({
    error: 'Internal server error',
    message: 'An error occurred. Please try again.',
    requestId: req.id
  });
}
```

---

## Testing

### Requirements

1. **Test authentication** on all endpoints
2. **Test rate limiting**
3. **Test input validation**
4. **Test error handling**

### Security Test Script

```bash
# Run comprehensive security tests
docker-compose exec backend ./test-security.sh
```

---

## Code Review Checklist

When reviewing code, verify:

- [ ] Authentication required on new endpoints
- [ ] Rate limiting applied
- [ ] Input validation implemented
- [ ] Sensitive data encrypted
- [ ] Audit logging added
- [ ] Error handling proper
- [ ] No secrets in code
- [ ] CORS configured
- [ ] Security headers present
- [ ] Tests added

---

## Compliance

### OWASP Top 10

- ✅ A01:2021 - Broken Access Control
- ✅ A02:2021 - Cryptographic Failures
- ✅ A03:2021 - Injection
- ✅ A05:2021 - Security Misconfiguration
- ✅ A07:2021 - Identification and Authentication Failures

### Best Practices

- ✅ Principle of least privilege
- ✅ Defense in depth
- ✅ Fail securely
- ✅ Don't trust user input
- ✅ Keep security simple

---

## Resources

- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Node.js Security:** https://nodejs.org/en/docs/guides/security/
- **Express Security:** https://expressjs.com/en/advanced/best-practice-security.html

---

## Updates

This document should be updated when:
- New security features are added
- Security vulnerabilities are discovered
- Best practices change
- Compliance requirements change

**Last Updated:** November 9, 2025 (v2.0.0)
