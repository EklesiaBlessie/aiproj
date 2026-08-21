import { z } from 'zod';

/** POST /api/themes/merge — refile one or more themes into a target theme. */
export const mergeThemesSchema = z.object({
  body: z
    .object({
      from: z
        .array(z.string().min(1, 'Theme name cannot be empty'))
        .min(1, 'Select at least one theme to merge'),
      into: z.string().min(1, 'Target theme is required').max(120),
    })
    .strict(),
});

/**
 * POST /api/themes/split — split a theme by an existing discriminator field.
 *
 * The enum is load-bearing, not cosmetic: `by` becomes a field path in the
 * controller's query, so an open string would let a caller group by any field
 * in the document.
 */
export const splitThemeSchema = z.object({
  body: z
    .object({
      theme: z.string().min(1, 'Theme is required').max(120),
      by: z.enum(['source', 'sentiment', 'city', 'visitType'], {
        errorMap: () => ({ message: 'Split field must be source, sentiment, city, or visitType' }),
      }),
    })
    .strict(),
});
