import { z } from 'zod';

/**
 * PATCH /api/user — every field optional, but at least one must be present.
 *
 * `role` and `email` are intentionally absent: role is an authorization
 * decision and email is the login identity, so neither is editable from the
 * Settings form. `.strict()` makes that refusal visible — sending `role` fails
 * with "Unrecognized key" rather than being silently dropped, which is the
 * difference between a user learning the field is off-limits and quietly
 * believing the save worked.
 */
export const updateUserSchema = z.object({
  body: z
    .object({
      name: z.string().min(1, 'Name cannot be empty').max(120).optional(),
      company: z.string().max(120).optional(),
      settings: z
        .object({
          emailNotifications: z.boolean().optional(),
          weeklyDigest: z.boolean().optional(),
          highPriorityAlerts: z.boolean().optional(),
          defaultPageSize: z
            .number()
            .int('Page size must be a whole number')
            .min(1, 'Page size must be at least 1')
            .max(100, 'Page size cannot exceed 100')
            .optional(),
        })
        .strict()
        .optional(),
    })
    .strict()
    .refine(
      (body) => body.name !== undefined || body.company !== undefined || body.settings !== undefined,
      { message: 'Provide at least one of: name, company, settings' }
    ),
});
