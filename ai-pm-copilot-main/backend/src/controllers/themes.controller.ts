import { Request, Response, NextFunction } from 'express';
import { Feedback } from '../models/Feedback';

/* ────────────────────────────────────────────────────────────────────────────
 * Theme maintenance — bulk recategorization of existing feedback rows.
 *
 * IMPORTANT SCOPE NOTE: this is not theme *extraction*. Extraction (reading
 * feedback text and discovering what it is about) needs Yash's NLP service and
 * is not implemented anywhere in this file.
 *
 * What these two endpoints do is ordinary data editing on categories that
 * already exist in the collection: "everything currently filed under Delivery
 * is really Logistics" (merge), or "Delivery is too coarse — split it by the
 * source each row came from" (split). Both are deterministic $set updates over
 * a filter. A PM correcting the categories Eklessia's pipeline assigned needs
 * exactly this, and it requires no model.
 *
 * Both write to `category`, which is the field the Themes page groups by.
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * POST /api/themes/merge
 *
 * Refiles every row whose category is `from` (or any of several `from` values)
 * under `into`. Returns the number of rows actually changed so the caller can
 * report a real count rather than an assumed success.
 */
export async function mergeThemes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { from, into } = req.body as { from: string[]; into: string };

    // Refiling a theme into itself would report a cheerful 0 modified and read
    // as a no-op bug; name the mistake instead.
    const sources = from.filter((name) => name !== into);
    if (sources.length === 0) {
      res.status(400).json({
        success: false,
        error: `Cannot merge "${into}" into itself — choose a different target theme`,
      });
      return;
    }

    const result = await Feedback.updateMany(
      { category: { $in: sources } },
      { $set: { category: into } }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({
        success: false,
        error: `No feedback found under ${sources.map((s) => `"${s}"`).join(', ')}`,
      });
      return;
    }

    res.json({
      success: true,
      message: `${result.modifiedCount} feedback ${
        result.modifiedCount === 1 ? 'item' : 'items'
      } moved from ${sources.map((s) => `"${s}"`).join(', ')} into "${into}"`,
      matched: result.matchedCount,
      modified: result.modifiedCount,
      into,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/themes/split
 *
 * Splits one broad theme into narrower ones by an existing discriminator field
 * — `source`, `sentiment`, `city`, or `visitType`. Each distinct value of that
 * field becomes its own theme named "<theme> — <value>".
 *
 * The discriminator is restricted to a fixed list because the value is
 * interpolated into a `$group` key and used as a field path; accepting an
 * arbitrary string from the request would let a caller group by any field in
 * the document.
 */
const SPLIT_FIELDS = ['source', 'sentiment', 'city', 'visitType'] as const;
type SplitField = (typeof SPLIT_FIELDS)[number];

export async function splitTheme(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { theme, by } = req.body as { theme: string; by: SplitField };

    // Discover the distinct values present under this theme, ignoring rows
    // where the discriminator is empty — those would collapse into a
    // meaningless "Theme — null" bucket.
    const values = (await Feedback.distinct(by, {
      category: theme,
      [by]: { $nin: [null, ''] },
    })) as string[];

    if (values.length === 0) {
      res.status(400).json({
        success: false,
        error: `No feedback under "${theme}" has a ${by} value to split by`,
      });
      return;
    }

    if (values.length === 1) {
      res.status(400).json({
        success: false,
        error: `Every item under "${theme}" has the same ${by} ("${values[0]}") — splitting by ${by} would produce one group`,
      });
      return;
    }

    const results = await Promise.all(
      values.map(async (value) => {
        const newTheme = `${theme} — ${value}`;
        const result = await Feedback.updateMany(
          { category: theme, [by]: value },
          { $set: { category: newTheme } }
        );
        return { theme: newTheme, count: result.modifiedCount };
      })
    );

    res.json({
      success: true,
      message: `"${theme}" split by ${by} into ${results.length} themes`,
      splitBy: by,
      data: results.sort((a, b) => b.count - a.count),
    });
  } catch (error) {
    next(error);
  }
}
