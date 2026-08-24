import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import authRoutes from './routes/auth.routes';
import feedbackRoutes from './routes/feedback.routes';
import workspaceRoutes from './routes/workspace.routes';
import pipelineRoutes from './routes/pipeline.routes';
import exportRoutes from './routes/export.routes';
import integrationRoutes from './routes/integration.routes';
import notificationRoutes from './routes/notification.routes';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { auditLogMiddleware } from './middleware/auditLogger';

const app = express();

// ── CORS ──
const corsOrigins = new Set(
  (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);
corsOrigins.add('http://localhost:3000');
corsOrigins.add('http://localhost:5000');
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || corsOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
  })
);

// ── Body parsing ──
app.use(express.json({ limit: '10mb' })); // Large body for bulk imports
app.use(express.urlencoded({ extended: true }));

// ── Audit Logging ──
app.use(auditLogMiddleware);

// ── Root info ──
/**
 * @openapi
 * /:
 *   get:
 *     tags: [System]
 *     summary: API metadata and endpoint index
 *     description: Lists the available endpoints. Requires no authentication.
 *     security: []
 *     responses:
 *       200:
 *         description: Service metadata.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiInfoResponse'
 *             example:
 *               success: true
 *               message: AI Product Manager Copilot API
 *               endpoints:
 *                 health: GET /api/health
 *                 register: POST /api/auth/register
 *                 login: POST /api/auth/login
 *                 me: GET /api/auth/me
 *                 feedbackList: GET /api/feedback
 *                 feedbackSingle: GET /api/feedback/:id
 *                 stats: GET /api/stats
 *                 createFeedback: POST /api/feedback
 *                 updateFeedback: PUT /api/feedback/:id
 *                 deleteFeedback: DELETE /api/feedback/:id
 *                 analyze: POST /api/analyze
 *                 docs: GET /api-docs
 *               documentation: Interactive Swagger UI at /api-docs
 */
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'AI Product Manager Copilot API',
    endpoints: {
      health: 'GET /api/health',
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      me: 'GET /api/auth/me',
      feedbackList: 'GET /api/feedback',
      feedbackSingle: 'GET /api/feedback/:id',
      stats: 'GET /api/stats',
      createFeedback: 'POST /api/feedback',
      updateFeedback: 'PUT /api/feedback/:id',
      deleteFeedback: 'DELETE /api/feedback/:id',
      analyze: 'POST /api/analyze',
      updateUser: 'PATCH /api/user',
      roadmapList: 'GET /api/roadmap',
      createRoadmapItem: 'POST /api/roadmap',
      reorderRoadmap: 'PATCH /api/roadmap/reorder',
      updateRoadmapItem: 'PATCH /api/roadmap/:id',
      deleteRoadmapItem: 'DELETE /api/roadmap/:id',
      prdList: 'GET /api/prd',
      createPrd: 'POST /api/prd',
      updatePrd: 'PATCH /api/prd/:id',
      deletePrd: 'DELETE /api/prd/:id',
      mergeThemes: 'POST /api/themes/merge',
      splitTheme: 'POST /api/themes/split',
      docs: 'GET /api-docs',
    },
    documentation: 'Interactive Swagger UI at /api-docs',
  });
});

// ── Health check ──
/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Liveness check
 *     description: >
 *       Returns 200 whenever the process is accepting requests. Note that this
 *       does not probe MongoDB — the server only starts once the initial
 *       connection succeeds, but a later database outage will not show up here.
 *     security: []
 *     responses:
 *       200:
 *         description: The API process is running.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 *             example:
 *               success: true
 *               message: AI PM Copilot API is running
 */
app.get('/api/health', async (_req, res) => {
  let aiServiceReachable = false;
  let aiServiceLastError: string | null = null;

  try {
    const fastApiUrl = process.env.FASTAPI_URL?.trim();
    if (!fastApiUrl) {
      aiServiceLastError = 'FASTAPI_URL is not configured';
    } else {
      const response = await fetch(fastApiUrl, {
        method: 'GET',
        signal: (AbortSignal as any).timeout ? (AbortSignal as any).timeout(2000) : undefined,
      });
      if (response.ok) {
        aiServiceReachable = true;
      } else {
        aiServiceLastError = `FastAPI service returned status ${response.status}`;
      }
    }
  } catch (err) {
    aiServiceLastError = (err as Error).message;
  }

  res.json({
    success: true,
    message: 'AI PM Copilot API is running',
    aiService: {
      reachable: aiServiceReachable,
      lastError: aiServiceLastError,
    },
  });
});

/* ── Interactive API docs ──────────────────────────────────────────────────
 * Swagger UI at GET /api-docs — the equivalent of FastAPI's /docs. Every
 * endpoint is executable from the page via "Try it out".
 *
 * The spec declares a relative server URL, so requests fire at whatever origin
 * serves this page: same-origin, and therefore unaffected by the CORS allowlist
 * above, on any PORT.
 *
 * Mounted before the error handler so its assets are not swallowed by it.
 * ─────────────────────────────────────────────────────────────────────── */
app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'AI PM Copilot API — Docs',
    swaggerOptions: {
      // Keep the pasted JWT across reloads, so "Authorize" survives a refresh.
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'list',
      filter: true,
    },
  })
);

// ── Auth routes ──
app.use('/api/auth', authRoutes);

// ── API routes (Feedback, Stats, Analyze) ──
app.use('/api', feedbackRoutes);

// ── API routes (User settings, Roadmap, PRD, Theme maintenance) ──
app.use('/api', workspaceRoutes);

// ── Pipeline microservice routes (CSV ingestion & Groq analysis) ──
app.use('/api', pipelineRoutes);

// ── Export routes ──
app.use('/api/export', exportRoutes);

// ── Integrations routes ──
app.use('/api/integrations', integrationRoutes);

// ── Notifications routes ──
app.use('/api/notifications', notificationRoutes);

// ── Global error handler (must be LAST) ──
app.use(errorHandler);

export default app;
