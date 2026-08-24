import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { Settings } from '../models/Settings';
import { sanitizeUser } from './auth.controller';

/**
 * PATCH /api/user
 *
 * Partial update of the authenticated user's own profile and preferences —
 * the write side of the Settings page. There is no id parameter on purpose:
 * the target is always `req.user.id`, so a token cannot be used to edit
 * somebody else's record.
 *
 * `role` and `email` are deliberately NOT editable here. Role is an
 * authorization decision (DELETE /api/feedback checks it), and letting a
 * viewer promote itself to admin through the Settings form would be a
 * privilege-escalation hole. Email is the login identity and would need a
 * re-verification flow to change safely.
 */
export async function updateCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { name, company, settings } = req.body as {
      name?: string;
      company?: string;
      settings?: Record<string, unknown>;
    };

    // Update settings in the dedicated Settings collection
    let updatedSettings = null;
    if (settings) {
      updatedSettings = await Settings.findOneAndUpdate(
        { userId: req.user.id },
        { $set: settings },
        { upsert: true, new: true, runValidators: true }
      );
    } else {
      updatedSettings = await Settings.findOne({ userId: req.user.id });
    }

    // Build user document update
    const userUpdate: Record<string, unknown> = {};
    if (name !== undefined) userUpdate.name = name;
    if (company !== undefined) userUpdate.company = company;
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
        userUpdate[`settings.${key}`] = value;
      }
    }

    if (Object.keys(userUpdate).length === 0) {
      res.status(400).json({
        success: false,
        error: 'No updatable fields provided. Send name, company, and/or settings.',
      });
      return;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: userUpdate },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ success: false, error: 'User account not found' });
      return;
    }

    res.json({
      success: true,
      message: 'Settings saved',
      data: sanitizeUser(user, updatedSettings),
    });
  } catch (error) {
    next(error);
  }
}
