import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Feedback } from '../models/Feedback';
import { feedbackBodySchema } from '../validators/feedback.validator';

/** One validation or write failure, tied back to its position in the request array. */
interface RowError {
  /** Zero-based index in the submitted array. */
  index: number;
  /** Dotted field path, or '(row)' when the failure is not field-specific. */
  field: string;
  message: string;
}

/** Flatten a ZodError into per-field entries stamped with the row's index. */
function toRowErrors(error: ZodError, index: number): RowError[] {
  return error.errors.map((issue) => ({
    index,
    field: issue.path.join('.') || '(row)',
    message: issue.message,
  }));
}

/**
 * Generate a unique feedback ID when one is missing or blank.
 */
function generateFeedbackId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `FB_GEN_${ts}_${rand}`;
}

/** Assign a generated feedbackId when the record has none or a blank one. */
function withGeneratedId<T extends { feedbackId?: string }>(item: T): T {
  if (!item.feedbackId || item.feedbackId.trim() === '') {
    item.feedbackId = generateFeedbackId();
  }
  return item;
}

/**
 * POST /api/feedback
 * Create a single feedback record, or bulk-insert an array.
 *
 * Bulk requests use PARTIAL SUCCESS: valid rows are inserted, invalid rows are
 * reported with their index and field, and one bad row never discards the rest.
 * That matches the `ordered: false` insert below — MongoDB already declines to
 * abort a batch on a single failure — and matches how the seed import treats
 * sparse real-world rows.
 *
 * Status codes:
 *   201  every row valid and written (unchanged legacy shape)
 *   207  some rows written, some rejected — body carries `errors[]`
 *   400  nothing written; the request produced no usable rows
 */
export async function createFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // ── Single record ──────────────────────────────────────────────────────
    if (!Array.isArray(req.body)) {
      const parsed = feedbackBodySchema.safeParse(req.body);
      if (!parsed.success) {
        // Hand the ZodError to the global error handler so the single-record
        // response keeps its existing { error, details:[{path,message}] } shape
        // — now with real field paths instead of a flat "Invalid input".
        next(parsed.error);
        return;
      }

      const doc = await Feedback.create(withGeneratedId(parsed.data));
      res.status(201).json({ success: true, data: doc });
      return;
    }

    // ── Bulk array ─────────────────────────────────────────────────────────
    const submitted = req.body as unknown[];
    const errors: RowError[] = [];
    const valid: Array<Record<string, any>> = [];
    /** Maps a position in `valid` back to its index in the submitted array. */
    const originalIndex: number[] = [];

    submitted.forEach((row, index) => {
      const parsed = feedbackBodySchema.safeParse(row);
      if (parsed.success) {
        originalIndex.push(index);
        valid.push(withGeneratedId(parsed.data));
      } else {
        errors.push(...toRowErrors(parsed.error, index));
      }
    });

    // Nothing usable — this is a client error, not a 0-row "success".
    if (valid.length === 0) {
      res.status(400).json({
        success: false,
        error: `All ${submitted.length} rows failed validation; nothing was inserted`,
        inserted: 0,
        failed: submitted.length,
        errors,
      });
      return;
    }

    let insertedDocs: any[] = [];
    try {
      insertedDocs = await Feedback.insertMany(valid, { ordered: false });
    } catch (bulkError: any) {
      // With ordered:false the driver still writes the good rows, then throws.
      // Report what actually landed rather than failing the whole request.
      insertedDocs = bulkError.insertedDocs ?? [];
      for (const writeError of bulkError.writeErrors ?? []) {
        const pos = writeError.index ?? writeError.err?.index;
        errors.push({
          index: originalIndex[pos] ?? pos ?? -1,
          field: writeError.err?.code === 11000 ? 'feedbackId' : '(row)',
          message: writeError.errmsg ?? writeError.err?.errmsg ?? 'Database write failed',
        });
      }
    }

    const inserted = insertedDocs.length;

    // Every row valid and written — keep the original 201 body untouched so
    // existing clients see no change.
    if (errors.length === 0) {
      res.status(201).json({
        success: true,
        message: `${inserted} feedback records created`,
        count: inserted,
        data: insertedDocs,
      });
      return;
    }

    if (inserted === 0) {
      res.status(400).json({
        success: false,
        error: `All ${submitted.length} rows failed; nothing was inserted`,
        inserted: 0,
        failed: submitted.length,
        errors,
      });
      return;
    }

    res.status(207).json({
      success: true,
      message: `${inserted} of ${submitted.length} feedback records created`,
      inserted,
      failed: submitted.length - inserted,
      // `count` is retained alongside `inserted` so clients reading the 201
      // shape keep working against a 207.
      count: inserted,
      errors,
      data: insertedDocs,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feedback
 * List feedback with pagination and optional filters.
 *
 * Query params:
 *   page, limit, category, sentiment, priority, source,
 *   startDate, endDate, restaurantId, city
 */
export async function getFeedbackList(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    // Build filter object from query params
    const filter: Record<string, any> = {};

    if (req.query.category)     filter.category = req.query.category;
    if (req.query.sentiment)    filter.sentiment = req.query.sentiment;
    if (req.query.priority)     filter.priority = req.query.priority;
    if (req.query.source)       filter.source = req.query.source;
    if (req.query.restaurantId) filter.restaurantId = req.query.restaurantId;
    if (req.query.city)         filter.city = req.query.city;
    if (req.query.featureCategory) filter.featureCategory = req.query.featureCategory;

    // Date range filter
    if (req.query.startDate || req.query.endDate) {
      filter.createdAt = {};
      if (req.query.startDate) {
        filter.createdAt.$gte = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filter.createdAt.$lte = new Date(req.query.endDate as string);
      }
    }

    const [data, total] = await Promise.all([
      Feedback.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Feedback.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feedback/:id
 * Get a single feedback record by feedbackId.
 */
export async function getFeedbackById(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await Feedback.findOne({ feedbackId: req.params.id }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `Feedback with id "${req.params.id}" not found`,
      });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/feedback/:id
 * Update a feedback record by feedbackId (for manual corrections).
 */
export async function updateFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await Feedback.findOneAndUpdate(
      { feedbackId: req.params.id },
      { $set: req.body },
      { new: true, runValidators: true }
    ).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `Feedback with id "${req.params.id}" not found`,
      });
      return;
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/feedback/:id
 * Delete a feedback record by feedbackId.
 */
export async function deleteFeedback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const doc = await Feedback.findOneAndDelete({ feedbackId: req.params.id }).lean();

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `Feedback with id "${req.params.id}" not found`,
      });
      return;
    }

    res.json({
      success: true,
      message: `Feedback "${req.params.id}" deleted`,
    });
  } catch (error) {
    next(error);
  }
}
