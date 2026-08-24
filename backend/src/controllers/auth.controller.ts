import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Settings } from '../models/Settings';
import { logAuditEvent } from '../middleware/auditLogger';
import { getJwtSecret } from '../middleware/auth';

function generateToken(user: IUser): string {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
    },
    secret,
    { expiresIn: expiresIn as any }
  );
}

/**
 * The public shape of a user — never includes the password hash.
 *
 * Exported because PATCH /api/user must answer with exactly the same shape as
 * GET /api/auth/me; the Settings page reads both and would otherwise see a
 * field appear or vanish depending on which call populated it.
 */
export function sanitizeUser(user: IUser, settings?: any) {
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role,
    company: user.company ?? '',
    openId: user.openId,
    loginMethod: user.loginMethod,
    settings: settings || user.settings || {
      emailNotifications: true,
      weeklyDigest: false,
      highPriorityAlerts: true,
      defaultPageSize: 20,
    },
    createdAt: user.createdAt,
  };
}

/**
 * POST /api/auth/register
 * Register a new user and return JWT + user profile.
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password, name, role } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
      return;
    }

    const user = await User.create({
      email,
      password,
      name,
      role: role || 'viewer',
    });

    // Create default settings in separate Settings collection
    const userSettings = await Settings.create({ userId: user._id });

    const token = generateToken(user);

    // Audit log
    await logAuditEvent({
      userId: user._id.toString(),
      userEmail: user.email,
      action: 'REGISTER',
      targetType: 'User',
      targetId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: { name: user.name, role: user.role },
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token,
        user: sanitizeUser(user, userSettings),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Authenticate existing user and return JWT + user profile.
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email, password } = req.body;

    // Explicitly select password since select: false on schema
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      // Audit log failed login
      await logAuditEvent({
        userEmail: email,
        action: 'FAILED_LOGIN',
        targetType: 'User',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { reason: 'User not found' },
      });

      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      // Audit log failed login
      await logAuditEvent({
        userId: user._id.toString(),
        userEmail: user.email,
        action: 'FAILED_LOGIN',
        targetType: 'User',
        targetId: user._id.toString(),
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        details: { reason: 'Invalid password' },
      });

      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    // Load or create Settings from Settings collection
    let userSettings = await Settings.findOne({ userId: user._id });
    if (!userSettings) {
      userSettings = await Settings.create({ userId: user._id });
    }

    const token = generateToken(user);

    // Audit log successful login
    await logAuditEvent({
      userId: user._id.toString(),
      userEmail: user.email,
      action: 'LOGIN',
      targetType: 'User',
      targetId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: sanitizeUser(user, userSettings),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Return profile of currently authenticated user.
 */
export async function me(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User account not found',
      });
      return;
    }

    // Load or create Settings from Settings collection
    let userSettings = await Settings.findOne({ userId: user._id });
    if (!userSettings) {
      userSettings = await Settings.create({ userId: user._id });
    }

    res.json({
      success: true,
      data: sanitizeUser(user, userSettings),
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/sso/callback
 * Handles incoming Enterprise SSO authentication assertion callback.
 */
export async function ssoLoginCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { openId, email, name, provider } = req.body;

    if (!openId || !email) {
      res.status(400).json({
        success: false,
        error: 'SSO openId and email are required parameters',
      });
      return;
    }

    // 1. Try to find user by openId
    let user = await User.findOne({ openId });

    if (!user) {
      // 2. Try to find by email
      user = await User.findOne({ email });

      if (user) {
        // Link existing email user to SSO
        user.openId = openId;
        user.loginMethod = 'sso';
        await user.save();
      } else {
        // Create new user for SSO
        user = await User.create({
          email,
          name: name || email.split('@')[0],
          loginMethod: 'sso',
          openId,
          role: 'viewer', // Default role
        });
      }
    }

    // Load or create settings
    let userSettings = await Settings.findOne({ userId: user._id });
    if (!userSettings) {
      userSettings = await Settings.create({ userId: user._id });
    }

    // Generate valid JWT
    const token = generateToken(user);

    // Audit Log event
    logAuditEvent({
      userId: user._id.toString(),
      action: 'SSO_LOGIN',
      targetType: 'User',
      ipAddress: req.ip || '',
      userAgent: (req.headers['user-agent'] as string) || '',
      details: { provider, email: user.email },
    });

    res.json({
      success: true,
      data: {
        token,
        user: sanitizeUser(user, userSettings),
      },
    });
  } catch (error) {
    next(error);
  }
}
