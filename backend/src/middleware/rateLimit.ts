import { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

/* ────────────────────────────────────────────────────────────────────────────
 * Rate limiting for the analysis endpoint.
 *
 * WHY: /api/analyze currently returns a static mock, so a flood costs nothing.
 * The moment it proxies to a real LLM service, every request carries a real
 * per-call cost — authentication alone bounds *who* can call it, not how often.
 * The cap is set now so it is not forgotten at the point it starts to matter.
 *
 * Counting is per authenticated user, not per IP: a whole office behind one
 * NAT would otherwise share a single budget, and a user on a phone could reset
 * theirs by switching networks. `authenticate` must run BEFORE this middleware
 * so `req.user` is populated.
 * ──────────────────────────────────────────────────────────────────────── */

/** Requests permitted per user per window. */
export const ANALYZE_RATE_LIMIT = 20;

/** Rolling window length, in milliseconds. */
export const ANALYZE_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export const analyzeRateLimiter = rateLimit({
  windowMs: ANALYZE_RATE_WINDOW_MS,
  limit: ANALYZE_RATE_LIMIT,

  // `RateLimit-*` headers so clients can see their budget; the deprecated
  // `X-RateLimit-*` set is left off.
  standardHeaders: 'draft-7',
  legacyHeaders: false,

  /**
   * Bucket by user id. The IP fallback should be unreachable behind
   * `authenticate`, but is kept so a future reordering degrades to per-IP
   * limiting rather than collapsing every caller into one shared bucket.
   * `ipKeyGenerator` normalizes IPv6 addresses to a /64 prefix — required by
   * express-rate-limit v8, which rejects a raw `req.ip` key.
   */
  keyGenerator: (req: Request, res: Response): string =>
    req.user?.id ?? ipKeyGenerator(req.ip ?? '', 56),

  /** Match the API's error envelope instead of the library's plain-text default. */
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: `Rate limit exceeded: at most ${ANALYZE_RATE_LIMIT} analysis requests per hour. Try again later.`,
    });
  },
});

/** Requests permitted per user per window for all authenticated routes. */
export const API_RATE_LIMIT = 100;

/** Rolling window length, in milliseconds. */
export const API_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export const apiRateLimiter = rateLimit({
  windowMs: API_RATE_WINDOW_MS,
  limit: API_RATE_LIMIT,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req: Request, res: Response): string =>
    req.user?.id ?? ipKeyGenerator(req.ip ?? '', 56),
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: `Rate limit exceeded: at most ${API_RATE_LIMIT} requests per 15 minutes. Try again later.`,
    });
  },
});
