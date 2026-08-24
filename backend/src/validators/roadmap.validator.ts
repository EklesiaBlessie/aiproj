import { z } from 'zod';

/** Mongo ObjectId hex string — rejects garbage ids before they reach a cast. */
const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Invalid id');

const statusEnum = z.enum(['planned', 'in_progress', 'done']);

/** POST /api/roadmap — `order` is assigned by the controller, not the client. */
export const createRoadmapSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, 'Title is required').max(200),
      quarter: z.string().min(1, 'Quarter is required').max(40),
      lane: z.string().max(60).nullable().optional(),
      status: statusEnum.optional(),
      effort: z.string().max(10).optional(),
      team: z.string().max(60).optional(),
    })
    .strict(),
});

/** PATCH /api/roadmap/:id — partial edit, also the single-card drag write. */
export const updateRoadmapSchema = z.object({
  body: z
    .object({
      title: z.string().min(1, 'Title cannot be empty').max(200).optional(),
      quarter: z.string().min(1).max(40).optional(),
      lane: z.string().max(60).nullable().optional(),
      status: statusEnum.optional(),
      effort: z.string().max(10).optional(),
      team: z.string().max(60).optional(),
      order: z.number().int().min(0).optional(),
    })
    .strict()
    .refine((body) => Object.keys(body).length > 0, {
      message: 'Provide at least one field to update',
    }),
  params: z.object({ id: objectId }),
});

/** PATCH /api/roadmap/reorder — the full new order of one board column. */
export const reorderRoadmapSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          id: objectId,
          quarter: z.string().min(1).max(40),
          lane: z.string().max(60).nullable().optional(),
          order: z.number().int().min(0),
        })
      )
      .min(1, 'Send at least one item to reposition'),
  }),
});

export const roadmapIdSchema = z.object({
  params: z.object({ id: objectId }),
});
