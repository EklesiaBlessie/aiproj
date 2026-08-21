import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const sectionSchema = z.object({
  heading: z.string().min(1, 'Section heading is required').max(120),
  items: z.array(z.string()).default([]),
});

/**
 * POST /api/prd
 *
 * `aiGenerated` is absent by design and `.strict()` rejects it: the flag is set
 * by the server only, so a client cannot label hand-written or invented content
 * as AI output. See the note in models/PRD.ts.
 */
export const createPRDSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, 'Title is required').max(200),
      feature: z.string().max(200).optional(),
      status: z.enum(['draft', 'review', 'ready']).optional(),
      overview: z.string().max(5000).optional(),
      sections: z.array(sectionSchema).optional(),
    })
    .strict(),
});

export const updatePRDSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, 'Title cannot be empty').max(200).optional(),
      feature: z.string().max(200).optional(),
      status: z.enum(['draft', 'review', 'ready']).optional(),
      overview: z.string().max(5000).optional(),
      sections: z.array(sectionSchema).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
  params: z.object({ id: objectId }),
});

export const prdIdSchema = z.object({
  params: z.object({ id: objectId }),
});
