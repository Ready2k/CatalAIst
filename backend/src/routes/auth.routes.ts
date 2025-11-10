import { Router, Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { authenticateToken, AuthRequest } from '../middleware/auth.middleware';

const router = Router();

const dataDir = process.env.DATA_DIR || './data';
const userService = new UserService(dataDir);

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Username and password are required'
      });
    }

    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({
        error: 'Invalid username',
        message: 'Username must be between 3 and 50 characters'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 8 characters'
      });
    }

    // Only allow admin role if explicitly set and user is admin
    const userRole = role === 'admin' ? 'admin' : 'user';

    const user = await userService.createUser(username, password, userRole);

    // Don't return password hash
    const { passwordHash, ...safeUser } = user;

    res.status(201).json({
      message: 'User created successfully',
      user: safeUser
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof Error && error.message === 'Username already exists') {
      return res.status(409).json({
        error: 'Username already exists',
        message: 'Please choose a different username'
      });
    }

    res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and get JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Username and password are required'
      });
    }

    const result = await userService.login(username, password);

    res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error && error.message === 'Invalid username or password') {
      return res.status(401).json({
        error: 'Authentication failed',
        message: 'Invalid username or password'
      });
    }

    res.status(500).json({
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        message: 'User information not available'
      });
    }

    const user = await userService.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User account no longer exists'
      });
    }

    const { passwordHash, apiKey, awsAccessKeyId, awsSecretAccessKey, awsSessionToken, ...safeUser } = user;

    res.json({
      user: safeUser
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user information',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/auth/credentials
 * Store user's LLM credentials (encrypted)
 */
router.post('/credentials', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    const { apiKey, awsAccessKeyId, awsSecretAccessKey, awsSessionToken, awsRegion, provider, model } = req.body;

    // Validate that at least one credential is provided
    if (!apiKey && !awsAccessKeyId) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'At least one credential (apiKey or AWS credentials) is required'
      });
    }

    await userService.storeCredentials(req.user.userId, {
      apiKey,
      awsAccessKeyId,
      awsSecretAccessKey,
      awsSessionToken,
      awsRegion,
      provider,
      model
    });

    res.json({
      message: 'Credentials stored successfully'
    });
  } catch (error) {
    console.error('Store credentials error:', error);
    res.status(500).json({
      error: 'Failed to store credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/auth/credentials
 * Get user's stored credentials (decrypted)
 */
router.get('/credentials', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    const credentials = await userService.getCredentials(req.user.userId);

    res.json({
      credentials
    });
  } catch (error) {
    console.error('Get credentials error:', error);
    res.status(500).json({
      error: 'Failed to get credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/auth/password
 * Change user password
 */
router.put('/password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: 'Missing passwords',
        message: 'Both old and new passwords are required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'New password must be at least 8 characters'
      });
    }

    await userService.changePassword(req.user.userId, oldPassword, newPassword);

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error instanceof Error && error.message === 'Invalid current password') {
      return res.status(401).json({
        error: 'Invalid password',
        message: 'Current password is incorrect'
      });
    }

    res.status(500).json({
      error: 'Failed to change password',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/auth/users
 * List all users (admin only)
 */
router.get('/users', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const users = await userService.listUsers();

    res.json({
      users
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: 'Failed to list users',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/auth/users/:userId/role
 * Change user role (admin only)
 */
router.put('/users/:userId/role', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const { userId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        message: 'Role must be either "admin" or "user"'
      });
    }

    // Prevent changing own role
    if (userId === req.user.userId) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot change your own role'
      });
    }

    await userService.changeUserRole(userId, role);

    res.json({
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('Change role error:', error);
    res.status(500).json({
      error: 'Failed to change user role',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/auth/users/:userId/password
 * Reset user password (admin only)
 */
router.put('/users/:userId/password', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'Missing password',
        message: 'New password is required'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Invalid password',
        message: 'Password must be at least 8 characters'
      });
    }

    await userService.resetUserPassword(userId, newPassword);

    res.json({
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/auth/users/:userId
 * Delete user (admin only)
 */
router.delete('/users/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required'
      });
    }

    const { userId } = req.params;

    // Prevent deleting own account
    if (userId === req.user.userId) {
      return res.status(400).json({
        error: 'Invalid operation',
        message: 'Cannot delete your own account'
      });
    }

    await userService.deleteUser(userId);

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
