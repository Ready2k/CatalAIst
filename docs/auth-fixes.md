# Authentication Fixes - November 12, 2025

## Issues Fixed

### 1. Rate Limiting on Logout/Login Cycles
**Problem**: Users were hitting 429 (Too Many Requests) errors when logging out and creating new users due to aggressive rate limiting.

**Root Cause**: Auth rate limiter was set to only 5 requests per 15 minutes, which was too restrictive for normal logout/login/register workflows.

**Solution**: Increased auth rate limit from 5 to 10 requests per 15 minutes in `backend/src/index.ts`. This allows for:
- Multiple logout/login cycles
- User registration followed by login
- Testing workflows
- Still provides brute force protection

### 2. New Users Created as Admin
**Problem**: New users could be created with admin role if the `role` parameter was passed in the registration request.

**Root Cause**: Registration endpoint was accepting and using the `role` parameter from the request body without proper authorization checks.

**Solution**: Modified `backend/src/routes/auth.routes.ts` to always create new users with 'user' role. Admin role can only be assigned by existing admins through the user management API (`PUT /api/auth/users/:userId/role`).

## Changes Made

### backend/src/index.ts
```typescript
// Before:
max: 5, // 5 login attempts per 15 minutes

// After:
max: 10, // 10 attempts per 15 minutes (allows for logout/login cycles)
```

### backend/src/routes/auth.routes.ts
```typescript
// Before:
const userRole = role === 'admin' ? 'admin' : 'user';
const user = await userService.createUser(username, password, userRole);

// After:
// Always create new users as 'user' role
// Admin role can only be assigned by existing admins via the user management API
const user = await userService.createUser(username, password, 'user');
```

## Security Impact

✅ **Improved**: New users can no longer self-assign admin role
✅ **Maintained**: Brute force protection still active (10 attempts per 15 minutes)
✅ **Enhanced**: Admin role assignment now requires existing admin authentication

## Testing Recommendations

1. Test logout → register → login workflow (should not hit rate limit)
2. Verify new users are created with 'user' role
3. Verify admin can still promote users via user management API
4. Test that 11+ auth attempts in 15 minutes still trigger rate limit

## Deployment Notes

No database migrations or environment variable changes required. Simply restart the backend service to apply changes.
