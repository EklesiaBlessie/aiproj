import { Router } from 'express';
import { validate } from '../middleware/validate';
import { authenticate, authorize } from '../middleware/auth';
import { analyzeRateLimiter } from '../middleware/rateLimit';
import {
  createFeedbackSchema,
  updateFeedbackSchema,
  queryFeedbackSchema,
  analyzeSchema,
} from '../validators/feedback.validator';
import {
  createFeedback,
  getFeedbackList,
  getFeedbackById,
  updateFeedback,
  deleteFeedback,
} from '../controllers/feedback.controller';
import { getStats } from '../controllers/stats.controller';
import { analyzeFeedback } from '../controllers/analyze.controller';

const router = Router();

// ── Feedback CRUD (Protected: requires logged in user) ──

/**
 * @openapi
 * /api/feedback:
 *   post:
 *     tags: [Feedback]
 *     summary: Create one feedback record, or bulk-insert many
 *     description: >
 *       Accepts **either** a single feedback object **or** a non-empty array of
 *       them — pick the matching example below to see each body. Only `text`
 *       and `source` are required on each item; any item without a `feedbackId`
 *       (or with a blank one) gets `FB_GEN_<timestamp>_<random>` assigned
 *       automatically.
 *
 *
 *       The two forms return different bodies: a single object responds with
 *       `data` as one document, while an array responds with `count`, a
 *       `message`, and `data` as a list.
 *
 *
 *       **Bulk arrays use partial success.** Each element is validated on its
 *       own, so one bad row no longer discards the batch: valid rows are
 *       written and rejected rows come back in `errors[]`, each carrying the
 *       `index` it occupied in your array plus the offending `field` and
 *       message. A mixed batch answers **207**, a fully valid batch **201**,
 *       and a batch with no usable rows **400** — a zero-row insert is never
 *       reported as success.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/FeedbackInput'
 *               - type: array
 *                 minItems: 1
 *                 items:
 *                   $ref: '#/components/schemas/FeedbackInput'
 *           examples:
 *             single:
 *               summary: Single record
 *               description: Minimum viable body — feedbackId is generated for you.
 *               value:
 *                 text: The paneer tikka was excellent but delivery took over an hour.
 *                 source: Google Reviews
 *                 rating: 3
 *                 city: Bengaluru
 *                 category: Delivery
 *                 sentiment: Negative
 *                 priority: High
 *             bulk:
 *               summary: Bulk import (array)
 *               description: Any array body switches the response to the bulk shape.
 *               value:
 *                 - feedbackId: FB-1001
 *                   text: Great ambience and friendly staff.
 *                   source: Survey
 *                   rating: 5
 *                   sentiment: Positive
 *                 - text: Order arrived cold.
 *                   source: Zomato
 *                   rating: 2
 *                   sentiment: Negative
 *             bulkMixed:
 *               summary: Bulk import with two bad rows (returns 207)
 *               description: >
 *                 Row 1 omits the required `text`; row 2 omits the required `source`.
 *                 Rows 0 and 3 are written and the other two are reported by index.
 *               value:
 *                 - text: Great ambience and friendly staff.
 *                   source: Survey
 *                   rating: 5
 *                 - source: Survey
 *                   rating: 4
 *                 - text: Delivery was late again.
 *                   rating: 2
 *                 - text: Loved the new menu.
 *                   source: Zomato
 *                   rating: 5
 *     responses:
 *       201:
 *         description: Created. A single object, or a bulk array in which every row was accepted.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/FeedbackSingleResponse'
 *                 - $ref: '#/components/schemas/FeedbackBulkResponse'
 *             examples:
 *               single:
 *                 summary: Response to a single object
 *                 value:
 *                   success: true
 *                   data:
 *                     _id: 64f1a2b3c4d5e6f7a8b9c0d2
 *                     feedbackId: FB_GEN_1754650000000_a1b2c3
 *                     text: The paneer tikka was excellent but delivery took over an hour.
 *                     source: Google Reviews
 *                     rating: 3
 *                     city: Bengaluru
 *                     category: Delivery
 *                     sentiment: Negative
 *                     priority: High
 *                     updatedAt: '2026-08-08T10:15:00.000Z'
 *                     __v: 0
 *               bulk:
 *                 summary: Response to an array where every row was valid
 *                 value:
 *                   success: true
 *                   message: 2 feedback records created
 *                   count: 2
 *                   data:
 *                     - _id: 64f1a2b3c4d5e6f7a8b9c0d3
 *                       feedbackId: FB-1001
 *                       text: Great ambience and friendly staff.
 *                       source: Survey
 *                       rating: 5
 *                       sentiment: Positive
 *                       __v: 0
 *                     - _id: 64f1a2b3c4d5e6f7a8b9c0d4
 *                       feedbackId: FB_GEN_1754650000001_d4e5f6
 *                       text: Order arrived cold.
 *                       source: Zomato
 *                       rating: 2
 *                       sentiment: Negative
 *                       __v: 0
 *       207:
 *         description: >
 *           Partial success — some rows were written, some were rejected. Bulk arrays only.
 *           Check `errors[]` for the index and field of every rejected row.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeedbackBulkPartialResponse'
 *             example:
 *               success: true
 *               message: 2 of 4 feedback records created
 *               inserted: 2
 *               failed: 2
 *               count: 2
 *               errors:
 *                 - index: 1
 *                   field: text
 *                   message: Feedback text is required
 *                 - index: 2
 *                   field: source
 *                   message: Source is required
 *               data:
 *                 - _id: 64f1a2b3c4d5e6f7a8b9c0d3
 *                   feedbackId: FB_GEN_1754650000000_a1b2c3
 *                   text: Great ambience and friendly staff.
 *                   source: Survey
 *                   rating: 5
 *                   __v: 0
 *                 - _id: 64f1a2b3c4d5e6f7a8b9c0d4
 *                   feedbackId: FB_GEN_1754650000001_d4e5f6
 *                   text: Loved the new menu.
 *                   source: Zomato
 *                   rating: 5
 *                   __v: 0
 *       400:
 *         description: >
 *           Nothing was written. For a bulk array this means no row survived validation;
 *           for a single object it is the usual validation failure.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/BulkAllFailedResponse'
 *                 - $ref: '#/components/schemas/ValidationErrorResponse'
 *             examples:
 *               bulkAllFailed:
 *                 summary: Bulk array, every row invalid
 *                 value:
 *                   success: false
 *                   error: All 2 rows failed validation; nothing was inserted
 *                   inserted: 0
 *                   failed: 2
 *                   errors:
 *                     - index: 0
 *                       field: text
 *                       message: Feedback text is required
 *                     - index: 1
 *                       field: source
 *                       message: Source is required
 *               singleInvalid:
 *                 summary: Single object, missing required field
 *                 value:
 *                   success: false
 *                   error: Validation failed
 *                   details:
 *                     - path: text
 *                       message: Feedback text is required
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/feedback', authenticate, validate(createFeedbackSchema), createFeedback);

/**
 * @openapi
 * /api/feedback:
 *   get:
 *     tags: [Feedback]
 *     summary: List feedback with pagination and filters
 *     description: >
 *       Returns newest-first (`createdAt` descending). All filters combine with
 *       AND semantics and match exactly — they are not fuzzy or case-insensitive,
 *       so `category=food` will not match a stored value of `Food`.
 *
 *
 *       `page` and `limit` must be digit-strings; anything else fails validation
 *       with a 400. `limit` is then clamped to 1–100 and `page` to a minimum of
 *       1, so `limit=5000` silently yields 100 rather than erroring.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: string, pattern: '^\d+$', default: '1' }
 *         description: 1-based page number. Values below 1 are clamped to 1.
 *         example: '1'
 *       - in: query
 *         name: limit
 *         schema: { type: string, pattern: '^\d+$', default: '20' }
 *         description: Records per page. Clamped to a maximum of 100.
 *         example: '20'
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Exact match on the AI-assigned category, e.g. Food, Delivery, Service.
 *         example: Food
 *       - in: query
 *         name: sentiment
 *         schema: { type: string }
 *         description: Exact match, e.g. Positive, Negative, Neutral.
 *         example: Positive
 *       - in: query
 *         name: priority
 *         schema: { type: string }
 *         description: Exact match on the AI-assigned priority, e.g. High, Medium, Low.
 *         example: High
 *       - in: query
 *         name: source
 *         schema: { type: string }
 *         description: Exact match, e.g. Google Reviews, Zomato, Survey.
 *         example: Google Reviews
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Inclusive lower bound on `createdAt`. Parsed with `new Date()`.
 *         example: '2024-01-01'
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Inclusive upper bound on `createdAt`. Parsed with `new Date()`.
 *         example: '2024-12-31'
 *       - in: query
 *         name: restaurantId
 *         schema: { type: string }
 *         description: Exact match on restaurant identifier.
 *         example: REST-12
 *       - in: query
 *         name: city
 *         schema: { type: string }
 *         description: Exact match on city.
 *         example: Bengaluru
 *       - in: query
 *         name: featureCategory
 *         schema: { type: string }
 *         description: Exact match on feature-request category.
 *         example: Ordering
 *     responses:
 *       200:
 *         description: A page of feedback plus pagination metadata.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeedbackListResponse'
 *             example:
 *               success: true
 *               data:
 *                 - _id: 64f1a2b3c4d5e6f7a8b9c0d2
 *                   feedbackId: FB-1001
 *                   text: The paneer tikka was excellent but delivery took over an hour.
 *                   source: Google Reviews
 *                   rating: 3
 *                   city: Bengaluru
 *                   createdAt: '2024-07-06T00:00:00.000Z'
 *                   category: Delivery
 *                   sentiment: Negative
 *                   priority: High
 *                   __v: 0
 *               pagination:
 *                 page: 1
 *                 limit: 20
 *                 total: 676
 *                 totalPages: 34
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/feedback', authenticate, validate(queryFeedbackSchema), getFeedbackList);

/**
 * @openapi
 * /api/feedback/{id}:
 *   get:
 *     tags: [Feedback]
 *     summary: Get a single feedback record
 *     description: >
 *       Looks up by the business key `feedbackId` (e.g. `FB-1001`), **not** the
 *       Mongo `_id`. Because the lookup is a plain string match, an unknown id
 *       yields a clean 404 rather than a cast error.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The record's `feedbackId`.
 *         example: FB-1001
 *     responses:
 *       200:
 *         description: The matching feedback record.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeedbackSingleResponse'
 *             example:
 *               success: true
 *               data:
 *                 _id: 64f1a2b3c4d5e6f7a8b9c0d2
 *                 feedbackId: FB-1001
 *                 text: The paneer tikka was excellent but delivery took over an hour.
 *                 source: Google Reviews
 *                 rating: 3
 *                 city: Bengaluru
 *                 createdAt: '2024-07-06T00:00:00.000Z'
 *                 category: Delivery
 *                 sentiment: Negative
 *                 priority: High
 *                 __v: 0
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/feedback/:id', authenticate, getFeedbackById);

/**
 * @openapi
 * /api/feedback/{id}:
 *   put:
 *     tags: [Feedback]
 *     summary: Update a feedback record
 *     description: >
 *       Partial update by `feedbackId`, intended for manual corrections to
 *       AI-assigned fields. The body is applied with `$set`, so any key you omit
 *       keeps its current value — this will not blank out unsent fields.
 *       Mongoose validators run against the update.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, minLength: 1 }
 *         description: The record's `feedbackId`.
 *         example: FB-1001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/FeedbackUpdateInput'
 *           example:
 *             sentiment: Neutral
 *             priority: Medium
 *             aiRecommendation: Reviewed manually — delivery delay was a one-off.
 *     responses:
 *       200:
 *         description: The updated record, after the change was applied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FeedbackSingleResponse'
 *             example:
 *               success: true
 *               data:
 *                 _id: 64f1a2b3c4d5e6f7a8b9c0d2
 *                 feedbackId: FB-1001
 *                 text: The paneer tikka was excellent but delivery took over an hour.
 *                 source: Google Reviews
 *                 sentiment: Neutral
 *                 priority: Medium
 *                 aiRecommendation: Reviewed manually — delivery delay was a one-off.
 *                 updatedAt: '2026-08-08T10:15:00.000Z'
 *                 __v: 0
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put('/feedback/:id', authenticate, validate(updateFeedbackSchema), updateFeedback);

// ── Delete Feedback (Protected: requires admin role) ──

/**
 * @openapi
 * /api/feedback/{id}:
 *   delete:
 *     tags: [Feedback]
 *     summary: Delete a feedback record (admin only)
 *     description: >
 *       Permanently removes the record matching `feedbackId`. This is the only
 *       endpoint with a role check on top of authentication: a valid token for a
 *       `viewer` or `product_manager` is rejected with 403. Register or log in as
 *       an `admin` and re-authorize to use it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: The record's `feedbackId`.
 *         example: FB-1001
 *     responses:
 *       200:
 *         description: Record deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeleteResponse'
 *             example:
 *               success: true
 *               message: Feedback "FB-1001" deleted
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.delete('/feedback/:id', authenticate, authorize('admin'), deleteFeedback);

// ── Dashboard stats (Protected: requires logged in user) ──

/**
 * @openapi
 * /api/stats:
 *   get:
 *     tags: [Stats]
 *     summary: Aggregated counts for dashboard charts
 *     description: >
 *       Groups the whole collection by category, sentiment, priority, and source,
 *       each sorted by descending count. Null values are excluded from the
 *       groupings, so a bucket's totals can sum to less than `total`. Takes no
 *       parameters — the aggregation always spans every record and ignores the
 *       filters accepted by `GET /api/feedback`.
 *
 *
 *       Each bucket is pre-renamed from Mongo's `_id`/`count` to `name`/`value`
 *       so it can be handed straight to Recharts.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregated counts.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsResponse'
 *             example:
 *               success: true
 *               data:
 *                 total: 676
 *                 byCategory:
 *                   - { name: Food, value: 220 }
 *                   - { name: Delivery, value: 180 }
 *                   - { name: Service, value: 150 }
 *                 bySentiment:
 *                   - { name: Positive, value: 300 }
 *                   - { name: Negative, value: 240 }
 *                   - { name: Neutral, value: 136 }
 *                 byPriority:
 *                   - { name: Medium, value: 340 }
 *                   - { name: High, value: 200 }
 *                   - { name: Low, value: 136 }
 *                 bySource:
 *                   - { name: Google Reviews, value: 400 }
 *                   - { name: Zomato, value: 180 }
 *                   - { name: Survey, value: 96 }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get('/stats', authenticate, getStats);

// ── Analysis proxy (Protected + rate limited → Yash's FastAPI) ──

/**
 * @openapi
 * /api/analyze:
 *   post:
 *     tags: [Analysis]
 *     summary: Analyze feedback text (FastAPI proxy with fallback)
 *     description: >
 *       Forwards `text` to the FastAPI NLP service at `$FASTAPI_URL/analyze` and
 *       returns its classification. Requires a bearer token, and is capped at
 *       **20 requests per user per hour** — the analysis path is the one route
 *       with a real per-call cost once it reaches a live LLM service.
 *
 *
 *       The quota is counted per authenticated user rather than per IP, so
 *       colleagues behind the same network do not share a budget. Every response
 *       carries a `RateLimit` header (`limit=20, remaining=19, reset=3600`)
 *       reporting the caller's remaining allowance.
 *
 *
 *       When `FASTAPI_URL` is unset or the service is unreachable, the route does
 *       **not** fail — it returns 200 with a static fallback and `mock: true`.
 *       Always branch on `mock` before treating the result as real analysis; a
 *       200 here is not by itself evidence that anything was analyzed.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AnalyzeRequest'
 *           example:
 *             text: Food was great but the delivery took over an hour and arrived cold.
 *     responses:
 *       200:
 *         description: Analysis result — check `mock` to see whether it is real or the fallback.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyzeResponse'
 *             examples:
 *               mock:
 *                 summary: Fallback (FastAPI unavailable)
 *                 description: What you get today — the FastAPI service exposes no /analyze route yet.
 *                 value:
 *                   success: true
 *                   mock: true
 *                   data:
 *                     category: Food
 *                     sentiment: Positive
 *                     theme: Quality
 *                     pain_point: None identified
 *                     priority: Medium
 *                     recommendation: No immediate action required. Continue monitoring for trends.
 *               live:
 *                 summary: Live passthrough from FastAPI
 *                 description: Returned when FastAPI answers 2xx; `data` is its response verbatim.
 *                 value:
 *                   success: true
 *                   mock: false
 *                   data:
 *                     category: Delivery
 *                     sentiment: Negative
 *                     theme: Delivery Speed
 *                     pain_point: Order arrived late and cold
 *                     priority: High
 *                     recommendation: Escalate to the delivery partner and review SLAs for this zone.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post('/analyze', authenticate, analyzeRateLimiter, validate(analyzeSchema), analyzeFeedback);

export default router;
