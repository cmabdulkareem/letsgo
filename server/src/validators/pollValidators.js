import { z } from 'zod';

export const createPollSchema = z
  .object({
    title: z.string().trim().max(150).optional().default('When should we host this?'),
    options: z
      .array(
        z.object({
          startAt: z.coerce.date(),
          endAt: z.coerce.date(),
          label: z.string().trim().max(120).optional().default(''),
          venue: z.string().trim().max(120).optional().default(''),
        })
      )
      .min(1, 'Add at least one time slot')
      .max(10, 'At most 10 time slots'),
    votingMode: z.enum(['single', 'multiple']).default('single'),
    deadline: z.coerce.date().optional(),
    allowVoteChange: z.boolean().default(true),
  })
  .refine(
    (v) => !v.deadline || v.deadline > new Date(),
    'Voting deadline must be in the future'
  );

export const voteSchema = z.object({
  optionIds: z.array(z.string()).min(1, 'Select at least one option').max(10),
});

export const confirmPollSchema = z.object({
  optionId: z.string().min(1),
});
