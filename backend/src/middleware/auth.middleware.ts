import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    username: string;
    role: string;
  };
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user info to request
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  // Skip auth for health check
  if (req.path === '/health') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'No token provided'
    });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({
      error: 'Server configuration error',
      message: 'Authentication not properly configured'
    });
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      username: string;
      role: string;
    };
    
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Please login again'
      });
    }
    
    return res.status(403).json({
      error: 'Invalid token',
      message: 'Authentication failed'
    });
  }
};

/**
 * Authorization middleware - check user role
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'No user information found'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires one of: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Optional authentication - doesn't fail if no token
 * Used for endpoints that work better with auth but don't require it
 */
export const optionalAuth = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as {
      userId: string;
      username: string;
      role: string;
    };
    req.user = decoded;
  } catch (error) {
    // Ignore invalid tokens for optional auth
  }

  next();
};
