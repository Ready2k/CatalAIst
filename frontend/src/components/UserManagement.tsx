import React, { useState, useEffect } from 'react';

interface User {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin?: string;
  preferredProvider?: string;
  preferredModel?: string;
}

interface UserManagementProps {
  onLoadUsers: () => Promise<User[]>;
  onCreateUser: (username: string, password: string, role: 'admin' | 'user') => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onChangeRole: (userId: string, newRole: 'admin' | 'user') => Promise<void>;
  onResetPassword: (userId: string, newPassword: string) => Promise<void>;
  currentUserId: string;
}

const UserManagement: React.FC<UserManagementProps> = ({
  onLoadUsers,
  onCreateUser,
  onDeleteUser,
  onChangeRole,
  onResetPassword,
  currentUserId
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Create user form state
  const [newUsername, setNewUsername] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');

  const loadUsers = React.useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const userList = await onLoadUsers();
      setUsers(userList);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [onLoadUsers]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = async (user: User) => {
    if (user.userId === currentUserId) {
      setError("You cannot change your own role");
      return;
    }

    const newRole = user.role === 'admin' ? 'user' : 'admin';
    
    try {
      await onChangeRole(user.userId, newRole);
      setSuccessMessage(`Changed ${user.username}'s role to ${newRole}`);
      await loadUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to change role');
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await onResetPassword(selectedUser.userId, newPassword);
      setSuccessMessage(`Password reset for ${selectedUser.username}`);
      setShowResetPassword(false);
      setSelectedUser(null);
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    if (userToDelete.userId === currentUserId) {
      setError("You cannot delete your own account");
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      return;
    }

    try {
      await onDeleteUser(userToDelete.userId);
      setSuccessMessage(`Deleted user ${userToDelete.username}`);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
      await loadUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newUserPassword) {
      setError('Username and password are required');
      return;
    }

    if (newUsername.length < 3 || newUsername.length > 50) {
      setError('Username must be between 3 and 50 characters');
      return;
    }

    if (newUserPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (newUserPassword !== newUserConfirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      await onCreateUser(newUsername, newUserPassword, newUserRole);
      setSuccessMessage(`Created user ${newUsername} with role ${newUserRole}`);
      setShowCreateUser(false);
      setNewUsername('');
      setNewUserPassword('');
      setNewUserConfirmPassword('');
      setNewUserRole('user');
      await loadUsers();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6c757d' }}>Loading users...</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px'
      }}>
        <h2 style={{ margin: 0, color: '#343a40' }}>User Management</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => {
              setShowCreateUser(true);
              setError('');
            }}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ➕ Create User
          </button>
          <button
            onClick={loadUsers}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '15px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
          <button
            onClick={() => setError('')}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: '#721c24',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div style={{
          padding: '15px',
          backgroundColor: '#d4edda',
          color: '#155724',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {successMessage}
        </div>
      )}

      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                Username
              </th>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                Role
              </th>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                Created
              </th>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                Last Login
              </th>
              <th style={{ padding: '15px', textAlign: 'left', fontWeight: '600', color: '#495057' }}>
                LLM Config
              </th>
              <th style={{ padding: '15px', textAlign: 'center', fontWeight: '600', color: '#495057' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.userId}
                style={{
                  borderBottom: '1px solid #dee2e6',
                  backgroundColor: user.userId === currentUserId ? '#e7f3ff' : '#fff'
                }}
              >
                <td style={{ padding: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong>{user.username}</strong>
                    {user.userId === currentUserId && (
                      <span style={{
                        padding: '2px 8px',
                        backgroundColor: '#17a2b8',
                        color: '#fff',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: 'bold'
                      }}>
                        YOU
                      </span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '15px' }}>
                  <span style={{
                    padding: '4px 12px',
                    backgroundColor: user.role === 'admin' ? '#ffc107' : '#6c757d',
                    color: user.role === 'admin' ? '#000' : '#fff',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>
                    {user.role}
                  </span>
                </td>
                <td style={{ padding: '15px', fontSize: '14px', color: '#6c757d' }}>
                  {formatDate(user.createdAt)}
                </td>
                <td style={{ padding: '15px', fontSize: '14px', color: '#6c757d' }}>
                  {formatDate(user.lastLogin)}
                </td>
                <td style={{ padding: '15px', fontSize: '14px', color: '#6c757d' }}>
                  {user.preferredProvider ? (
                    <div>
                      <div>{user.preferredProvider}</div>
                      <div style={{ fontSize: '12px', color: '#adb5bd' }}>{user.preferredModel}</div>
                    </div>
                  ) : (
                    <span style={{ color: '#adb5bd' }}>Not configured</span>
                  )}
                </td>
                <td style={{ padding: '15px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleRoleChange(user)}
                      disabled={user.userId === currentUserId}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: user.userId === currentUserId ? '#e9ecef' : '#007bff',
                        color: user.userId === currentUserId ? '#6c757d' : '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: user.userId === currentUserId ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                      title={user.userId === currentUserId ? "Cannot change your own role" : "Toggle role"}
                    >
                      {user.role === 'admin' ? 'Make User' : 'Make Admin'}
                    </button>
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowResetPassword(true);
                        setError('');
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ffc107',
                        color: '#000',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => {
                        setUserToDelete(user);
                        setShowDeleteConfirm(true);
                        setError('');
                      }}
                      disabled={user.userId === currentUserId}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: user.userId === currentUserId ? '#e9ecef' : '#dc3545',
                        color: user.userId === currentUserId ? '#6c757d' : '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: user.userId === currentUserId ? 'not-allowed' : 'pointer',
                        fontSize: '12px'
                      }}
                      title={user.userId === currentUserId ? "Cannot delete your own account" : "Delete user"}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {users.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6c757d' }}>
            No users found
          </div>
        )}
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#e7f3ff',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#004085'
      }}>
        <strong>Total Users:</strong> {users.length} ({users.filter(u => u.role === 'admin').length} admin, {users.filter(u => u.role === 'user').length} user)
      </div>

      {/* Reset Password Modal */}
      {showResetPassword && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#343a40' }}>
              Reset Password for {selectedUser.username}
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#495057',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ display: 'block', marginTop: '4px', color: '#6c757d' }}>
                Minimum 8 characters
              </small>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#495057',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowResetPassword(false);
                  setSelectedUser(null);
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ffc107',
                  color: '#000',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#343a40' }}>
              Create New User
            </h3>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#495057',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Username
              </label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter username"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ display: 'block', marginTop: '4px', color: '#6c757d' }}>
                3-50 characters
              </small>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#495057',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Password
              </label>
              <input
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
              <small style={{ display: 'block', marginTop: '4px', color: '#6c757d' }}>
                Minimum 8 characters
              </small>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#495057',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                Confirm Password
              </label>
              <input
                type="password"
                value={newUserConfirmPassword}
                onChange={(e) => setNewUserConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#495057',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                User Role
              </label>
              <select
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                  backgroundColor: '#fff',
                  cursor: 'pointer'
                }}
              >
                <option value="user">Standard User</option>
                <option value="admin">Admin User</option>
              </select>
              <small style={{ display: 'block', marginTop: '4px', color: '#6c757d' }}>
                {newUserRole === 'user' 
                  ? 'Standard users can only access Classifier and Configuration'
                  : 'Admin users have full access to all features'}
              </small>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowCreateUser(false);
                  setNewUsername('');
                  setNewUserPassword('');
                  setNewUserConfirmPassword('');
                  setNewUserRole('user');
                  setError('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#28a745',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Create User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && userToDelete && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '8px',
            padding: '30px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ marginTop: 0, color: '#dc3545' }}>
              Delete User?
            </h3>
            <p style={{ color: '#495057', marginBottom: '20px' }}>
              Are you sure you want to delete user <strong>{userToDelete.username}</strong>?
              This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
