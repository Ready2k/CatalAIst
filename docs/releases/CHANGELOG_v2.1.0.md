# Changelog - Version 2.1.0

**Release Date:** November 9, 2025  
**Type:** Minor Release - User Management

---

## 🎯 Overview

Version 2.1.0 adds a comprehensive user management interface for administrators, making it easy to manage users, roles, and passwords through the GUI.

---

## ✨ New Features

### User Management Screen (Admin Only)

**Frontend Component:** `UserManagement.tsx`

A complete admin interface for managing users with the following capabilities:

#### Features

1. **User List View**
   - Display all users in a table
   - Show username, role, creation date, last login
   - Show LLM configuration status
   - Highlight current user
   - Real-time refresh

2. **Role Management**
   - Toggle user role between 'admin' and 'user'
   - Visual role badges (admin = yellow, user = gray)
   - Prevent changing own role
   - One-click role toggle

3. **Password Reset**
   - Admin can reset any user's password
   - Modal dialog with password confirmation
   - Minimum 8 character validation
   - Password match validation

4. **User Deletion**
   - Delete users with confirmation dialog
   - Prevent self-deletion
   - Cascade cleanup (removes from index)

5. **User Statistics**
   - Total user count
   - Admin vs user breakdown
   - Visual summary

#### UI/UX

- **Responsive Design** - Works on desktop, tablet, mobile
- **Modal Dialogs** - For password reset and delete confirmation
- **Visual Feedback** - Success/error messages
- **Safety Features** - Prevent dangerous operations (self-delete, self-role-change)
- **Loading States** - Clear loading indicators
- **Error Handling** - User-friendly error messages

---

## 🔧 Backend Changes

### New API Endpoints

All endpoints require admin role:

#### GET /api/auth/users
List all users (without sensitive data)

**Response:**
```json
{
  "users": [
    {
      "userId": "uuid",
      "username": "john_doe",
      "role": "user",
      "createdAt": "2025-11-09T...",
      "lastLogin": "2025-11-09T...",
      "preferredProvider": "openai",
      "preferredModel": "gpt-4"
    }
  ]
}
```

#### PUT /api/auth/users/:userId/role
Change user role

**Request:**
```json
{
  "role": "admin"
}
```

**Validation:**
- Must be admin
- Cannot change own role
- Role must be 'admin' or 'user'

#### PUT /api/auth/users/:userId/password
Reset user password (admin only)

**Request:**
```json
{
  "newPassword": "NewSecurePassword123!"
}
```

**Validation:**
- Must be admin
- Password minimum 8 characters

#### DELETE /api/auth/users/:userId
Delete user

**Validation:**
- Must be admin
- Cannot delete own account
- Removes user from index

### UserService Updates

**New Methods:**

```typescript
// Change user role
async changeUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void>

// Reset user password (admin only)
async resetUserPassword(userId: string, newPassword: string): Promise<void>
```

**Updated Methods:**

```typescript
// List users now excludes sensitive data
async listUsers(): Promise<Omit<User, 'passwordHash' | 'apiKey' | ...>[]>
```

---

## 📦 Frontend Changes

### New Component

**File:** `frontend/src/components/UserManagement.tsx`

**Props:**
```typescript
interface UserManagementProps {
  onLoadUsers: () => Promise<User[]>;
  onDeleteUser: (userId: string) => Promise<void>;
  onChangeRole: (userId: string, newRole: 'admin' | 'user') => Promise<void>;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
  currentUserId: string;
}
```

### API Service Updates

**New Methods:**

```typescript
async getUsers(): Promise<any[]>
async changeUserRole(userId: string, newRole: 'admin' | 'user'): Promise<void>
async resetUserPassword(userId: string, newPassword: string): Promise<void>
async deleteUser(userId: string): Promise<void>
```

### App Integration

- Added 'users' to AppView type
- Added "Users" navigation button (admin only)
- Integrated UserManagement component
- Passes currentUserId for safety checks

---

## 🔒 Security

### Authorization

- All user management endpoints require admin role
- Frontend hides "Users" button for non-admins
- Backend validates admin role on every request

### Safety Features

1. **Cannot Change Own Role**
   - Prevents accidental privilege loss
   - Enforced in both frontend and backend

2. **Cannot Delete Own Account**
   - Prevents accidental lockout
   - Enforced in both frontend and backend

3. **Password Validation**
   - Minimum 8 characters
   - Password confirmation required
   - Validated on both frontend and backend

4. **Audit Logging**
   - All user management actions logged
   - Includes admin user ID and timestamp

---

## 🎨 UI Screenshots

### User List
- Clean table layout
- Role badges
- Action buttons
- User statistics

### Password Reset Modal
- Clear form
- Password confirmation
- Validation feedback

### Delete Confirmation
- Warning message
- Confirm/cancel buttons
- User-friendly text

---

## 📝 Usage

### For Administrators

1. **Access User Management**
   - Login as admin
   - Click "Users" in navigation
   - View all users

2. **Change User Role**
   - Click "Make Admin" or "Make User" button
   - Role changes immediately
   - Success message displayed

3. **Reset Password**
   - Click "Reset Password" button
   - Enter new password (min 8 chars)
   - Confirm password
   - Click "Reset Password"

4. **Delete User**
   - Click "Delete" button
   - Confirm deletion
   - User removed immediately

### For Users

- No access to user management
- "Users" button not visible
- API returns 403 if attempted

---

## 🐛 Bug Fixes

None - this is a new feature release.

---

## ⚠️ Breaking Changes

None - this is a backward-compatible release.

---

## 📊 Impact

### Before v2.1
- No GUI for user management
- Admin must use CLI to manage users
- No way to reset passwords
- No way to change roles

### After v2.1
- Complete GUI for user management
- Admin can manage users easily
- Password reset through UI
- Role management through UI

---

## 🔄 Migration

No migration needed - this is a new feature.

### Upgrade Steps

```bash
# Pull latest code
git pull
git checkout v2.1.0

# Rebuild
docker-compose build
docker-compose restart

# No data migration needed
```

---

## 🧪 Testing

### Manual Testing

1. **Login as admin**
2. **Navigate to Users**
3. **Test role change**
4. **Test password reset**
5. **Test user deletion**
6. **Test safety features** (try to delete self, change own role)
7. **Login as regular user** - verify no access

### API Testing

```bash
# Get users (admin only)
curl http://localhost:8080/api/auth/users \
  -H "Authorization: Bearer <admin-token>"

# Change role
curl -X PUT http://localhost:8080/api/auth/users/<userId>/role \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"role":"admin"}'

# Reset password
curl -X PUT http://localhost:8080/api/auth/users/<userId>/password \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"newPassword":"NewPassword123!"}'

# Delete user
curl -X DELETE http://localhost:8080/api/auth/users/<userId> \
  -H "Authorization: Bearer <admin-token>"
```

---

## 📚 Documentation

### Updated Files

- `README.md` - Added user management section
- `SECURITY_SETUP.md` - Added user management security
- `.kiro/steering/security-requirements.md` - Added admin endpoints

### New Files

- `CHANGELOG_v2.1.0.md` - This file

---

## 🎯 Next Steps

### v2.2 (Planned)

- Password reset flow (self-service)
- Token refresh mechanism
- HTTP-only cookies
- 2FA support

---

## 📞 Support

### Issues

- Check user management works for admin
- Verify non-admins cannot access
- Test all safety features

### Documentation

- See `README.md` for usage
- See `SECURITY_SETUP.md` for security details

---

## ✅ Release Checklist

- [x] User management component created
- [x] Backend API endpoints added
- [x] Frontend integration complete
- [x] Admin-only access enforced
- [x] Safety features implemented
- [x] Error handling added
- [x] UI/UX polished
- [x] Documentation updated
- [x] Testing completed

---

**Version 2.1.0 makes user management easy and secure!** 🎉

Administrators can now manage users through a beautiful, intuitive interface without touching the command line.
