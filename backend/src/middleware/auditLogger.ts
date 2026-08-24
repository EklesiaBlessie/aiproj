import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/AuditLog';

// Helper function to log audit events manually (e.g. auth login, failed login)
export async function logAuditEvent(params: {
  userId?: string;
  userEmail?: string;
  action: string;
  targetType: string;
  targetId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}) {
  try {
    await AuditLog.create(params);
  } catch (err) {
    console.error('❌ Failed to create audit log entry:', err);
  }
}

export function auditLogMiddleware(req: Request, res: Response, next: NextFunction) {
  // Listen for the finish event on response
  res.on('finish', async () => {
    const { method, originalUrl: path } = req;
    const statusCode = res.statusCode;

    // Only log successful modifications or admin deletes
    if (statusCode >= 200 && statusCode < 300) {
      let action = '';
      let targetType = '';
      let targetId = (req.params.id as string) || '';
      let details: Record<string, any> = {};

      if (path.startsWith('/api/prd')) {
        targetType = 'PRD';
        if (method === 'POST') {
          action = path.endsWith('/generate') ? 'GENERATE_PRD' : 'CREATE_PRD';
          details = { question: req.body.question, title: req.body.title };
        } else if (method === 'PATCH') {
          action = 'UPDATE_PRD';
          details = { updates: req.body };
        } else if (method === 'DELETE') {
          action = 'DELETE_PRD';
        }
      } else if (path.startsWith('/api/roadmap')) {
        targetType = 'RoadmapItem';
        if (method === 'POST') {
          action = 'CREATE_ROADMAP_ITEM';
          details = { title: req.body.title };
        } else if (method === 'PATCH') {
          action = path.endsWith('/reorder') ? 'REORDER_ROADMAP' : 'UPDATE_ROADMAP_ITEM';
          details = { updates: req.body };
        } else if (method === 'DELETE') {
          action = 'DELETE_ROADMAP_ITEM';
        }
      } else if (path.startsWith('/api/feedback')) {
        targetType = 'Feedback';
        if (method === 'POST') {
          action = 'CREATE_FEEDBACK';
          details = { count: Array.isArray(req.body) ? req.body.length : 1 };
        } else if (method === 'PUT') {
          action = 'UPDATE_FEEDBACK';
        } else if (method === 'DELETE') {
          action = 'DELETE_FEEDBACK';
        }
      } else if (path.startsWith('/api/themes')) {
        targetType = 'Theme';
        if (method === 'POST') {
          action = path.endsWith('/merge') ? 'MERGE_THEMES' : 'SPLIT_THEME';
          details = req.body;
        }
      } else if (path.startsWith('/api/user')) {
        targetType = 'UserSettings';
        if (method === 'PATCH') {
          action = 'UPDATE_SETTINGS';
          details = req.body;
        }
      }

      if (action && targetType) {
        await logAuditEvent({
          userId: req.user?.id,
          userEmail: req.user?.email,
          action,
          targetType,
          targetId,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          details,
        });
      }
    }
  });

  next();
}
