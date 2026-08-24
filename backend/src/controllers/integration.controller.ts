import { Request, Response, NextFunction } from 'express';
import { Integration, IntegrationProvider } from '../models/Integration';
import { logAuditEvent } from '../middleware/auditLogger';

/**
 * GET /api/integrations
 * Lists all integrations connected by the authenticated user.
 */
export async function getIntegrations(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const integrations = await Integration.find({ owner: req.user.id });
    res.json({
      success: true,
      data: integrations,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/integrations/connect/:provider
 * Initiates or mock-connects a third-party OAuth provider.
 */
export async function connectIntegration(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const provider = req.params.provider as string;
    const validProviders: IntegrationProvider[] = ['jira', 'slack', 'notion', 'github', 'confluence', 'linear'];

    if (!validProviders.includes(provider as any)) {
      res.status(400).json({ success: false, error: `Invalid integration provider: ${provider}` });
      return;
    }

    // Upsert integration connection
    const integration = await Integration.findOneAndUpdate(
      { owner: req.user.id, provider },
      {
        status: 'connected',
        credentials: {
          accessToken: `mock_access_token_${provider}_${Date.now()}`,
          refreshToken: `mock_refresh_token_${provider}_${Date.now()}`,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      },
      { new: true, upsert: true }
    );

    // Audit Log connection
    logAuditEvent({
      userId: req.user.id,
      action: 'CONNECT_INTEGRATION',
      targetType: 'Integration',
      targetId: integration._id.toString(),
      ipAddress: req.ip || '',
      userAgent: (req.headers['user-agent'] as string) || '',
      details: { provider },
    });

    res.json({
      success: true,
      message: `${provider.toUpperCase()} integration connected successfully`,
      data: integration,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/integrations/sync/:provider
 * Triggers a mock data-synchronization job.
 */
export async function syncIntegration(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const provider = req.params.provider as string;
    const integration = await Integration.findOne({ owner: req.user.id, provider });

    if (!integration || integration.status !== 'connected') {
      res.status(404).json({ success: false, error: `${provider.toUpperCase()} integration is not connected` });
      return;
    }

    // Update last sync timestamp
    integration.lastSyncedAt = new Date();
    await integration.save();

    // Audit Log sync
    logAuditEvent({
      userId: req.user.id,
      action: 'SYNC_INTEGRATION',
      targetType: 'Integration',
      targetId: integration._id.toString(),
      ipAddress: req.ip || '',
      userAgent: (req.headers['user-agent'] as string) || '',
      details: { provider },
    });

    res.json({
      success: true,
      message: `${provider.toUpperCase()} integration synced successfully`,
      data: {
        provider,
        status: 'synced',
        lastSyncedAt: integration.lastSyncedAt,
      },
    });
  } catch (error) {
    next(error);
  }
}
export async function disconnectIntegration(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const provider = req.params.provider as string;
    const integration = await Integration.findOne({ owner: req.user.id, provider });

    if (!integration) {
      res.status(404).json({ success: false, error: `Integration not found for ${provider}` });
      return;
    }

    integration.status = 'disconnected';
    await integration.save();

    logAuditEvent({
      userId: req.user.id,
      action: 'DISCONNECT_INTEGRATION',
      targetType: 'Integration',
      targetId: integration._id.toString(),
      ipAddress: req.ip || '',
      userAgent: (req.headers['user-agent'] as string) || '',
      details: { provider },
    });

    res.json({
      success: true,
      message: `${provider.toUpperCase()} integration disconnected successfully`,
      data: integration,
    });
  } catch (error) {
    next(error);
  }
}
