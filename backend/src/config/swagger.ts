import path from 'path';
import swaggerJsdoc from 'swagger-jsdoc';

/* ────────────────────────────────────────────────────────────────────────────
 * OpenAPI 3.0 specification — single source of truth.
 *
 * Layout:
 *   • This file owns everything SHARED: info, servers, the bearerAuth security
 *     scheme, and every reusable schema under `components.schemas`.
 *   • The route files own their own paths via `@openapi` JSDoc blocks, which
 *     only ever `$ref` the schemas defined here. No schema is written twice.
 *
 * Schemas mirror the real code, not an idealised version of it:
 *   • Request bodies  → the Zod validators in src/validators/
 *   • Response bodies → what the controllers in src/controllers/ actually send
 *   • Entity fields   → the Mongoose models in src/models/
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Resolve annotated source files for both run modes.
 *
 * ts-node-dev runs `src/**\/*.ts`; `npm start` runs the build in `dist/**\/*.js`.
 * Keying off this file's own extension picks the right one and — importantly —
 * never matches the `.d.ts` files tsc emits alongside the JS, which would
 * otherwise register duplicate (empty) path entries.
 *
 * The backslash → forward slash rewrite is required on Windows: swagger-jsdoc
 * globs with glob v11, which treats `\` as an escape character, not a
 * separator, so a raw `path.join` result silently matches nothing.
 */
const ext = path.extname(__filename); // '.ts' under ts-node-dev, '.js' from dist/
const fromHere = (relative: string): string =>
  path.join(__dirname, relative).replace(/\\/g, '/');

/* ────────────────────────────────────────────────────────────────────────────
 * Feedback field map — declared ONCE here and reused to build the three
 * feedback schemas below (create input, update input, stored document).
 *
 * They differ only in which fields are required, so `allOf` is the wrong tool:
 * it intersects constraints, meaning a nested `required: []` cannot clear the
 * parent's requirements. Composing from a shared object gives exact control.
 * ──────────────────────────────────────────────────────────────────────── */
const feedbackProperties = {
  // Core identifiers
  feedbackId: { type: 'string', example: 'FB-1001' },
  customerId: { type: 'string', example: 'CUST-238' },
  restaurantId: { type: 'string', example: 'REST-12' },
  restaurantName: { type: 'string', example: 'Spice Garden' },

  // Content
  text: {
    type: 'string',
    minLength: 1,
    example: 'The paneer tikka was excellent but the delivery took over an hour.',
  },
  review: {
    type: 'string',
    description: 'Cleaned / normalized text produced by the preprocessing pipeline.',
    example: 'paneer tikka excellent delivery took over hour',
  },
  reviewTitle: { type: 'string', example: 'Great food, slow delivery' },

  // Metadata
  rating: { type: 'number', minimum: 0, maximum: 5, example: 4 },
  source: {
    type: 'string',
    minLength: 1,
    description: 'Free-form string, not an enum. e.g. Google Reviews, Zomato, Survey, Email.',
    example: 'Google Reviews',
  },
  createdAt: {
    type: 'string',
    format: 'date-time',
    description: 'Set explicitly from the source record — Mongoose does NOT auto-populate this.',
    example: '2024-07-06T00:00:00.000Z',
  },
  city: { type: 'string', example: 'Bengaluru' },
  language: { type: 'string', example: 'en' },
  reviewerName: { type: 'string', example: 'R. Sharma' },
  state: { type: 'string', example: 'Karnataka' },
  visitType: { type: 'string', example: 'Delivery' },

  // Food & delivery
  foodRating: { type: 'number', example: 5 },
  deliveryRating: { type: 'number', example: 2 },
  orderValue: { type: 'number', example: 780 },
  orderId: { type: 'string', example: 'ORD-55231' },
  deliveryPartner: { type: 'string', example: 'Swiggy' },
  deliveryTime: { type: 'string', example: '64 min' },

  // Survey
  surveyId: { type: 'string', example: 'SURV-88' },
  satisfactionScore: { type: 'number', example: 7 },
  recommendScore: { type: 'number', example: 8 },
  foodQuality: { type: 'string', example: 'Good' },
  serviceQuality: { type: 'string', example: 'Average' },
  cleanliness: { type: 'string', example: 'Excellent' },

  // Support ticket
  ticketId: { type: 'string', example: 'TKT-402' },
  issueCategory: { type: 'string', example: 'Late Delivery' },
  originalPriority: {
    type: 'string',
    description:
      'Ticket-only field (CSV col 29). Always empty in the current dataset — ' +
      'ticket-source rows were filtered out upstream. Kept for schema completeness.',
    example: '',
  },
  status: { type: 'string', example: 'Resolved' },
  emailId: { type: 'string', example: 'customer@example.com' },
  subject: { type: 'string', example: 'Order arrived cold' },

  // Feature request
  requestId: { type: 'string', example: 'REQ-19' },
  featureCategory: { type: 'string', example: 'Ordering' },
  featureTitle: { type: 'string', example: 'Live order tracking' },

  // Dine-in
  staffRating: { type: 'number', example: 4 },
  ambienceRating: { type: 'number', example: 5 },

  // Social media
  postId: { type: 'string', example: 'POST-7781' },
  platform: { type: 'string', example: 'Instagram' },
  username: { type: 'string', example: '@foodie_blr' },
  engagement: { type: 'string', example: '124 likes' },

  // AI-analyzed
  category: {
    type: 'string',
    description: 'Free-form string, not an enum. e.g. Food, Delivery, Service, Ambience.',
    example: 'Delivery',
  },
  sentiment: {
    type: 'string',
    description: 'Free-form string, not an enum. e.g. Positive, Negative, Neutral.',
    example: 'Negative',
  },
  priority: {
    type: 'string',
    description: 'AI-analyzed priority (CSV col 45). e.g. High, Medium, Low.',
    example: 'High',
  },

  // Derived / enrichment
  theme: {
    type: 'string',
    description: '~93% null in the current dataset — real extraction comes from /api/analyze.',
    example: 'Delivery Speed',
  },
  painPoint: {
    type: 'string',
    description: '~93% null in the current dataset — real extraction comes from /api/analyze.',
    example: 'Long delivery wait',
  },
  aiRecommendation: {
    type: 'string',
    description: 'Populated by POST /api/analyze. Null for seeded data.',
    example: 'Investigate delivery partner SLAs in this zone.',
  },
} as const;

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'AI Product Manager Copilot API',
      version: '1.0.0',
      description:
        'Backend API for restaurant feedback analysis.\n\n' +
        '### Authenticating\n' +
        '1. Call `POST /api/auth/register` (or `/api/auth/login`) and copy the ' +
        '`data.token` value from the response.\n' +
        '2. Click **Authorize** (padlock, top right) and paste the raw token — ' +
        'Swagger UI adds the `Bearer ` prefix for you.\n' +
        '3. Padlocked endpoints will then send `Authorization: Bearer <token>` ' +
        'automatically.\n\n' +
        'Deleting feedback additionally requires the `admin` role; a valid token ' +
        'for a `viewer` or `product_manager` gets a 403.\n\n' +
        '### Rate limits\n' +
        '`POST /api/analyze` is capped at 20 requests per user per hour and returns ' +
        '429 past that. No other route is limited.',
    },
    servers: [
      {
        // Relative URL: Swagger UI resolves it against whatever origin is
        // serving this page, so "Try it out" works on any PORT with no edits.
        url: '/',
        description: 'This server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Registration, login, and current-user profile' },
      { name: 'Feedback', description: 'Feedback CRUD, filtering, and bulk import' },
      { name: 'Stats', description: 'Aggregated counts for dashboard charts' },
      { name: 'Analysis', description: 'NLP analysis proxy to the FastAPI service' },
      { name: 'System', description: 'Service metadata and health' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description:
            'JWT issued by `/api/auth/register` or `/api/auth/login`. ' +
            'Paste only the token itself — the `Bearer ` prefix is added for you.',
        },
      },

      schemas: {
        /* ── Auth ─────────────────────────────────────────────────────── */

        RegisterRequest: {
          type: 'object',
          required: ['email', 'password', 'name'],
          properties: {
            email: { type: 'string', format: 'email', example: 'pm@example.com' },
            password: {
              type: 'string',
              format: 'password',
              minLength: 8,
              description: 'Minimum 8 characters. Hashed with bcrypt before storage.',
              example: 'Password123!',
            },
            name: { type: 'string', minLength: 1, example: 'Arpita Dev' },
            role: {
              type: 'string',
              enum: ['admin', 'product_manager', 'viewer'],
              default: 'viewer',
              description: 'Omit to default to `viewer`. Only `admin` may delete feedback.',
              example: 'product_manager',
            },
          },
        },

        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email', example: 'pm@example.com' },
            password: { type: 'string', format: 'password', minLength: 1, example: 'Password123!' },
          },
        },

        User: {
          type: 'object',
          description: 'Public user profile. The password hash is never returned.',
          properties: {
            id: { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d1' },
            email: { type: 'string', format: 'email', example: 'pm@example.com' },
            name: { type: 'string', example: 'Arpita Dev' },
            role: {
              type: 'string',
              enum: ['admin', 'product_manager', 'viewer'],
              example: 'product_manager',
            },
            createdAt: { type: 'string', format: 'date-time', example: '2026-08-03T23:30:00.000Z' },
          },
        },

        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                token: {
                  type: 'string',
                  description: 'JWT to paste into the Authorize dialog.',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0ZjFhMmIzIn0.sIgNaTuRe',
                },
                user: { $ref: '#/components/schemas/User' },
              },
            },
          },
        },

        UserResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/User' },
          },
        },

        /* ── Feedback ─────────────────────────────────────────────────── */

        /**
         * Mirrors the Zod `feedbackBody` validator: only `text` and `source`
         * are required — the source CSV has 45 columns but any given row
         * populates only the handful relevant to its source type.
         */
        FeedbackInput: {
          type: 'object',
          required: ['text', 'source'],
          description:
            'Only `text` and `source` are required. `feedbackId` is auto-generated as ' +
            '`FB_GEN_<timestamp>_<random>` when omitted or blank. Remaining fields are ' +
            'source-specific (survey / ticket / delivery / social) and may be left out.',
          properties: feedbackProperties,
        },

        /** PUT body — `feedbackBody.partial()`: same fields, none required. */
        FeedbackUpdateInput: {
          type: 'object',
          description:
            'Every field is optional on update — send only the keys you want to change. ' +
            'Applied with `$set`, so omitted fields are left untouched.',
          properties: feedbackProperties,
        },

        /** A stored document as returned by the API (adds Mongo-managed fields). */
        Feedback: {
          type: 'object',
          description:
            'A stored feedback document. Only `text` is required by the Mongoose schema — ' +
            '`source` is enforced on create by Zod but not by the database, so older or ' +
            'seeded records may omit it.',
          required: ['text'],
          properties: {
            ...feedbackProperties,
            _id: { type: 'string', example: '64f1a2b3c4d5e6f7a8b9c0d2' },
            updatedAt: { type: 'string', format: 'date-time', example: '2026-08-08T10:15:00.000Z' },
            __v: { type: 'integer', example: 0 },
          },
        },

        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', description: 'Total documents matching the filter.', example: 676 },
            totalPages: { type: 'integer', example: 34 },
          },
        },

        FeedbackListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: { $ref: '#/components/schemas/Feedback' } },
            pagination: { $ref: '#/components/schemas/Pagination' },
          },
        },

        FeedbackSingleResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { $ref: '#/components/schemas/Feedback' },
          },
        },

        FeedbackBulkResponse: {
          type: 'object',
          description: 'Returned when the request body was an array and every row was accepted.',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: '2 feedback records created' },
            count: { type: 'integer', example: 2 },
            data: { type: 'array', items: { $ref: '#/components/schemas/Feedback' } },
          },
        },

        BulkRowError: {
          type: 'object',
          description: 'One rejected row, tied back to its position in the submitted array.',
          properties: {
            index: {
              type: 'integer',
              description: 'Zero-based index of the offending row in the request array.',
              example: 7,
            },
            field: {
              type: 'string',
              description:
                'Dotted path of the offending field, or `(row)` when the failure is not ' +
                'attributable to one field.',
              example: 'text',
            },
            message: { type: 'string', example: 'Feedback text is required' },
          },
        },

        FeedbackBulkPartialResponse: {
          type: 'object',
          description:
            'Returned (207) when a bulk array contained a mix of valid and invalid rows. ' +
            'Valid rows are written; invalid rows are listed in `errors` and never block ' +
            'the rest. `count` mirrors `inserted` so clients written against the 201 shape ' +
            'keep working.',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: '2 of 3 feedback records created' },
            inserted: { type: 'integer', description: 'Rows written.', example: 2 },
            failed: { type: 'integer', description: 'Rows rejected.', example: 1 },
            count: { type: 'integer', description: 'Alias of `inserted`.', example: 2 },
            errors: {
              type: 'array',
              items: { $ref: '#/components/schemas/BulkRowError' },
            },
            data: {
              type: 'array',
              description: 'The rows that were actually written.',
              items: { $ref: '#/components/schemas/Feedback' },
            },
          },
        },

        BulkAllFailedResponse: {
          type: 'object',
          description:
            'Returned (400) when a bulk array produced no usable rows. Nothing was written — ' +
            'this is never reported as a zero-row success.',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'string',
              example: 'All 3 rows failed validation; nothing was inserted',
            },
            inserted: { type: 'integer', example: 0 },
            failed: { type: 'integer', example: 3 },
            errors: {
              type: 'array',
              items: { $ref: '#/components/schemas/BulkRowError' },
            },
          },
        },

        DeleteResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Feedback "FB-1001" deleted' },
          },
        },

        /* ── Stats ────────────────────────────────────────────────────── */

        ChartDatum: {
          type: 'object',
          description: 'Pre-shaped for Recharts: the Mongo `_id`/`count` pair is renamed to `name`/`value`.',
          properties: {
            name: { type: 'string', example: 'Food' },
            value: { type: 'integer', example: 120 },
          },
        },

        StatsResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                total: {
                  type: 'integer',
                  description: 'Total feedback documents in the collection (unfiltered).',
                  example: 676,
                },
                byCategory: { type: 'array', items: { $ref: '#/components/schemas/ChartDatum' } },
                bySentiment: { type: 'array', items: { $ref: '#/components/schemas/ChartDatum' } },
                byPriority: { type: 'array', items: { $ref: '#/components/schemas/ChartDatum' } },
                bySource: { type: 'array', items: { $ref: '#/components/schemas/ChartDatum' } },
              },
            },
          },
        },

        /* ── Analysis ─────────────────────────────────────────────────── */

        AnalyzeRequest: {
          type: 'object',
          required: ['text'],
          properties: {
            text: {
              type: 'string',
              minLength: 1,
              example: 'Food was great but the delivery took over an hour and arrived cold.',
            },
          },
        },

        AnalyzeResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            mock: {
              type: 'boolean',
              description:
                '`true` when the FastAPI service was unreachable or `FASTAPI_URL` is unset and ' +
                'the static fallback was returned. `false` when `data` is a genuine passthrough ' +
                'of the FastAPI response. Always check this before trusting the result.',
              example: true,
            },
            data: {
              type: 'object',
              description:
                'Shape shown is the fallback. When `mock` is false this is whatever the FastAPI ' +
                'service returned, passed through unchanged.',
              properties: {
                category: { type: 'string', example: 'Food' },
                sentiment: { type: 'string', example: 'Positive' },
                theme: { type: 'string', example: 'Quality' },
                pain_point: { type: 'string', example: 'None identified' },
                priority: { type: 'string', example: 'Medium' },
                recommendation: {
                  type: 'string',
                  example: 'No immediate action required. Continue monitoring for trends.',
                },
              },
            },
          },
        },

        /* ── System ───────────────────────────────────────────────────── */

        HealthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'AI PM Copilot API is running' },
          },
        },

        ApiInfoResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'AI Product Manager Copilot API' },
            endpoints: {
              type: 'object',
              additionalProperties: { type: 'string' },
              example: { health: 'GET /api/health', login: 'POST /api/auth/login' },
            },
            documentation: { type: 'string', example: 'See backend/README.md for full details' },
          },
        },

        /* ── Errors ───────────────────────────────────────────────────── */

        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Something went wrong' },
          },
        },

        ValidationErrorResponse: {
          type: 'object',
          description: 'Emitted by the global error handler when a Zod or Mongoose validation check fails.',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Validation failed' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path: { type: 'string', example: 'body.text' },
                  message: { type: 'string', example: 'Feedback text is required' },
                },
              },
            },
          },
        },

        DuplicateKeyResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Duplicate key error' },
            details: {
              type: 'object',
              additionalProperties: true,
              example: { feedbackId: 'FB-1001' },
            },
          },
        },
      },

      /* ── Reusable responses, so error codes are declared once ────────── */
      responses: {
        BadRequest: {
          description: 'Validation failed — the request body, query, or params did not match the schema.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              example: {
                success: false,
                error: 'Validation failed',
                details: [{ path: 'body.text', message: 'Feedback text is required' }],
              },
            },
          },
        },
        Unauthorized: {
          description: 'Missing, malformed, or expired JWT. Use the **Authorize** button to supply one.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, error: 'Authentication token missing or malformed' },
            },
          },
        },
        Forbidden: {
          description: 'Authenticated, but the token’s role is not permitted to perform this action.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: "Access forbidden: role 'viewer' is not authorized for this resource",
              },
            },
          },
        },
        NotFound: {
          description: 'No record matches the supplied identifier.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, error: 'Feedback with id "FB-1001" not found' },
            },
          },
        },
        Conflict: {
          description: 'Uniqueness violation.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/DuplicateKeyResponse' },
              example: { success: false, error: 'Duplicate key error', details: { feedbackId: 'FB-1001' } },
            },
          },
        },
        TooManyRequests: {
          description:
            'Per-user rate limit exceeded. The quota is counted per authenticated user, not ' +
            'per IP. The `RateLimit` header (RFC draft-7 format) reports the remaining ' +
            'allowance and is present on every response from a limited route, not just 429s.',
          headers: {
            RateLimit: {
              description:
                'Current quota state as a single structured header: limit, remaining, and ' +
                'seconds until the window resets.',
              schema: { type: 'string', example: 'limit=20, remaining=0, reset=3418' },
            },
            'RateLimit-Policy': {
              description: 'The policy in force — request count and window length in seconds.',
              schema: { type: 'string', example: '20;w=3600' },
            },
            'Retry-After': {
              description: 'Seconds to wait before retrying. Sent only on a 429.',
              schema: { type: 'integer', example: 3600 },
            },
          },
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: {
                success: false,
                error: 'Rate limit exceeded: at most 20 analysis requests per hour. Try again later.',
              },
            },
          },
        },
        ServerError: {
          description:
            'Unexpected server error. The `error` string is the real message in development ' +
            'and a generic "Internal server error" when NODE_ENV=production.',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ErrorResponse' },
              example: { success: false, error: 'Internal server error' },
            },
          },
        },
      },
    },
  },

  // Paths are annotated next to the code that implements them.
  apis: [fromHere(`../routes/*${ext}`), fromHere(`../app${ext}`)],
};

export const swaggerSpec = swaggerJsdoc(options) as Record<string, any>;

export default swaggerSpec;
