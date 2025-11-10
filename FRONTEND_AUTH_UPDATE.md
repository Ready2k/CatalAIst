# Frontend Authentication Update

## What Was Added

The frontend now has a complete authentication system that works with the secured backend!

### New Features

1. **Login Page** - Beautiful login/registration interface
2. **Session Management** - JWT tokens stored in sessionStorage
3. **Auto-redirect** - Automatically redirects to login if token expires
4. **User Info Display** - Shows username and role in navigation
5. **Logout Button** - Clean logout with session clearing
6. **Admin Badge** - Visual indicator for admin users

### Files Changed

**New Files:**
- `frontend/src/components/Login.tsx` - Login/registration component

**Updated Files:**
- `frontend/src/App.tsx` - Added authentication state and login handling
- `frontend/src/services/api.ts` - Added JWT token to all API requests

---

## How to Deploy

### Option 1: Docker (Recommended)

```bash
# Rebuild frontend image
docker-compose build frontend

# Restart frontend
docker-compose restart frontend

# Or rebuild everything
docker-compose down
docker-compose build
docker-compose up -d
```

### Option 2: Local Development

```bash
cd frontend
npm start
```

---

## How It Works

### 1. Login Flow

```
User enters credentials
    ↓
POST /api/auth/login
    ↓
Receive JWT token
    ↓
Store in sessionStorage
    ↓
Redirect to main app
```

### 2. API Requests

All API requests now include the JWT token:

```javascript
headers: {
  'Authorization': 'Bearer <jwt-token>',
  'Content-Type': 'application/json'
}
```

### 3. Token Expiration

When token expires (24 hours):
- API returns 401
- Frontend clears session
- Redirects to login page

### 4. Logout

When user clicks logout:
- Clear sessionStorage
- Reset app state
- Show login page

---

## User Experience

### First Visit

1. User sees login page
2. Can register new account or login with admin credentials
3. After login, sees main application

### Returning Visit

1. If token is still valid, goes directly to app
2. If token expired, sees login page

### Navigation

- Username displayed in top navigation
- Admin users see "ADMIN" badge
- Logout button in top right

---

## Testing

### Test Login

1. Open http://localhost:80
2. Should see login page
3. Enter admin credentials (from setup)
4. Should see main application

### Test Registration

1. Click "Don't have an account? Register"
2. Enter new username and password (min 8 chars)
3. Should automatically login after registration

### Test Logout

1. Click "Logout" button in navigation
2. Should return to login page
3. Session should be cleared

### Test Token Expiration

1. Login successfully
2. In browser console: `sessionStorage.setItem('authToken', 'invalid')`
3. Try to use any feature
4. Should redirect to login

---

## Configuration

### API URL

The frontend uses the `REACT_APP_API_URL` environment variable:

```bash
# Default (uses relative URLs, proxied by nginx)
REACT_APP_API_URL=

# For local development
REACT_APP_API_URL=http://localhost:8080
```

### Session Storage

Tokens are stored in `sessionStorage` (not `localStorage`):
- More secure (cleared when tab closes)
- Survives page refreshes
- Doesn't persist across browser sessions

To use `localStorage` instead, change in `Login.tsx` and `api.ts`:
```javascript
// Change from:
sessionStorage.setItem('authToken', token)

// To:
localStorage.setItem('authToken', token)
```

---

## Security Features

### 1. Password Requirements

- Minimum 8 characters
- Validated on both frontend and backend

### 2. Token Storage

- Stored in sessionStorage (cleared on tab close)
- Never exposed in URLs or logs
- Automatically included in API requests

### 3. Auto-logout

- Clears session on 401/403 responses
- Prevents unauthorized access
- Forces re-authentication

### 4. HTTPS Ready

- Works with HTTPS (recommended for production)
- Secure cookie flags can be added
- CORS properly configured

---

## Customization

### Change Login Page Styling

Edit `frontend/src/components/Login.tsx`:

```typescript
// Change colors
backgroundColor: '#your-color'

// Change logo
<h1>Your App Name</h1>

// Add company logo
<img src="/logo.png" alt="Logo" />
```

### Add "Remember Me"

In `Login.tsx`, add checkbox:

```typescript
const [rememberMe, setRememberMe] = useState(false);

// In form:
<input 
  type="checkbox" 
  checked={rememberMe}
  onChange={(e) => setRememberMe(e.target.checked)}
/>

// On login success:
const storage = rememberMe ? localStorage : sessionStorage;
storage.setItem('authToken', token);
```

### Add Password Reset

1. Create password reset endpoint in backend
2. Add "Forgot Password?" link in Login.tsx
3. Implement email/token flow

---

## Troubleshooting

### "No token provided" error

**Cause:** Frontend not sending token

**Solution:**
```bash
# Check if token exists
# In browser console:
sessionStorage.getItem('authToken')

# If null, login again
```

### Login page doesn't appear

**Cause:** Frontend not rebuilt

**Solution:**
```bash
docker-compose build frontend
docker-compose restart frontend
```

### Can't login with admin credentials

**Cause:** Admin user not created

**Solution:**
```bash
docker-compose exec backend npm run create-admin
```

### CORS errors

**Cause:** Frontend URL not in ALLOWED_ORIGINS

**Solution:**
```bash
# Add to .env
ALLOWED_ORIGINS=http://localhost:80,http://localhost:3000

# Restart backend
docker-compose restart backend
```

### Token expires too quickly

**Cause:** JWT expiration set to 24 hours

**Solution:** Edit `backend/src/services/user.service.ts`:
```typescript
// Change from:
expiresIn: '24h'

// To:
expiresIn: '7d'  // 7 days
```

---

## Production Deployment

### 1. Build Frontend

```bash
cd frontend
npm run build
```

### 2. Update docker-compose.yml

Already configured! Just deploy:

```bash
docker-compose up -d --build
```

### 3. Configure HTTPS

Use nginx or Caddy (see DOCKER_SECURITY_SETUP.md)

### 4. Set Secure Cookies (Optional)

For extra security, use HTTP-only cookies instead of sessionStorage.

---

## Next Steps

1. ✅ Frontend authentication working
2. ⏭️ Add password reset flow
3. ⏭️ Add user profile page
4. ⏭️ Add 2FA (optional)
5. ⏭️ Add session timeout warning
6. ⏭️ Add "Remember Me" option

---

## Summary

The frontend now has:
- ✅ Beautiful login/registration page
- ✅ JWT token management
- ✅ Auto-redirect on auth failure
- ✅ User info display
- ✅ Logout functionality
- ✅ Admin role indicator

Just rebuild the frontend Docker image and you're ready to go!

```bash
docker-compose build frontend
docker-compose restart frontend
```

Then visit http://localhost:80 and login! 🎉
