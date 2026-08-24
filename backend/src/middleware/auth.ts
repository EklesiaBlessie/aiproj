import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../models/User';
import { apiRateLimiter } from './rateLimit';

export interface JwtPayload {
  id: string;
  role: UserRole;
  email?: string;
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production!');
    }
    return 'default_jwt_secret_change_in_production';
  }
  return secret;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware: Verify JWT Bearer token from Authorization header.
 * Attaches decoded payload to req.user.
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication token missing or malformed',
    });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = getJwtSecret();

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };
    apiRateLimiter(req, res, next);
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired authentication token',
    });
  }
}

/**
 * Middleware factory: Authorize user by role(s).
 * Must be placed AFTER `authenticate` middleware.
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access forbidden: role '${req.user.role}' is not authorized for this resource`,
      });
      return;
    }

    next();
  };
}
