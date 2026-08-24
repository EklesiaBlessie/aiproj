import { z } from 'zod';

/* ────────────────────────────────────────────────────────────────────────────
 * Validation schemas for Feedback endpoints.
 *
 * DESIGN DECISION: Only `text` and `source` are required. The CSV has 45
 * columns but any given row only populates ~5-8 depending on the source type
 * (Google review vs support ticket vs survey vs feature request). Requiring
 * more fields would break bulk seeding on legitimate sparse rows.
 *
 * `feedbackId` is optional on create — if missing or empty, the controller
 * auto-generates one as `FB_GEN_<timestamp>_<random>`.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Per-record schema — the single source of truth for what one feedback item
 * must look like.
 *
 * Used directly for a single-object POST and applied element-by-element for a
 * bulk array, so both paths validate against exactly this definition.
 */
export const feedbackBodySchema = z.object({
  feedbackId:        z.string().optional(),
  customerId:        z.string().optional(),
  restaurantId:      z.string().optional(),
  restaurantName:    z.string().optional(),

  // required_error is set explicitly so a MISSING field reports the same
  // sentence as a BLANK one — Zod's default for an absent key is a bare
  // "Required", which tells a bulk uploader nothing about what to fix.
  text:              z.string({ required_error: 'Feedback text is required' })
                       .min(1, 'Feedback text is required'),
  review:            z.string().optional(),
  reviewTitle:       z.string().optional(),

  rating:            z.number().min(0).max(5).optional(),
  source:            z.string({ required_error: 'Source is required' })
                       .min(1, 'Source is required'),
  createdAt:         z.string().or(z.date()).optional(),
  city:              z.string().optional(),
  language:          z.string().optional(),
  reviewerName:      z.string().optional(),
  state:             z.string().optional(),
  visitType:         z.string().optional(),

  foodRating:        z.number().optional(),
  deliveryRating:    z.number().optional(),
  orderValue:        z.number().optional(),
  orderId:           z.string().optional(),
  deliveryPartner:   z.string().optional(),
  deliveryTime:      z.string().optional(),

  surveyId:          z.string().optional(),
  satisfactionScore: z.number().optional(),
  recommendScore:    z.number().optional(),
  foodQuality:       z.string().optional(),
  serviceQuality:    z.string().optional(),
  cleanliness:       z.string().optional(),

  ticketId:          z.string().optional(),
  issueCategory:     z.string().optional(),
  originalPriority:  z.string().optional(),
  status:            z.string().optional(),
  emailId:           z.string().optional(),
  subject:           z.string().optional(),

  requestId:         z.string().optional(),
  featureCategory:   z.string().optional(),
  featureTitle:      z.string().optional(),

  staffRating:       z.number().optional(),
  ambienceRating:    z.number().optional(),

  postId:            z.string().optional(),
  platform:          z.string().optional(),
  username:          z.string().optional(),
  engagement:        z.string().optional(),

  category:          z.string().optional(),
  sentiment:         z.string().optional(),
  priority:          z.string().optional(),

  theme:             z.string().optional(),
  painPoint:         z.string().optional(),
  aiRecommendation:  z.string().optional(),
});

/**
 * POST /api/feedback — checks the OUTER shape only.
 *
 * Element contents are deliberately NOT validated here. The previous
 * `z.union([feedbackBody, z.array(feedbackBody).min(1)])` collapsed any failure
 * — in a single object or in one array element — into a flat "Invalid input"
 * on `body`, because Zod aggregates union branch failures and cannot report
 * which branch was "meant" or which element broke.
 *
 * Records are therefore validated in the controller, one at a time against
 * `feedbackBodySchema`, which is what lets each issue carry its array index.
 */
export const createFeedbackSchema = z.object({
  body: z.unknown().superRefine((body, ctx) => {
    if (Array.isArray(body)) {
      if (body.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Bulk array must contain at least one feedback item',
        });
      }
      return;
    }
    if (typeof body !== 'object' || body === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Request body must be a feedback object, or a non-empty array of them',
      });
    }
  }),
});

/** PUT /api/feedback/:id — all fields optional */
export const updateFeedbackSchema = z.object({
  body: feedbackBodySchema.partial(),
  params: z.object({ id: z.string().min(1) }),
});

/** GET /api/feedback — query-string filters + pagination */
export const queryFeedbackSchema = z.object({
  query: z.object({
    page:      z.string().regex(/^\d+$/).optional().default('1'),
    limit:     z.string().regex(/^\d+$/).optional().default('20'),
    category:  z.string().optional(),
    sentiment: z.string().optional(),
    priority:  z.string().optional(),
    source:    z.string().optional(),
    startDate: z.string().optional(),
    endDate:   z.string().optional(),
    restaurantId: z.string().optional(),
    city:      z.string().optional(),
    featureCategory: z.string().optional(),
  }),
});

/** POST /api/analyze — just needs feedback text */
export const analyzeSchema = z.object({
  body: z.object({
    text: z.string().min(1, 'Feedback text is required for analysis'),
  }),
});
