import { z } from 'zod';
import { objectId, locationSchema, paginationQuery } from './common.js';

export const createCommunitySchema = z.object({
  name: z.string().trim().min(3, 'Community name is too short').max(80),
  description: z.string().trim().min(10, 'Describe the community (10+ characters)').max(2000),
  category: objectId,
  coverImage: z.string().max(300).optional().default(''),
  visibility: z.enum(['public', 'private']).default('public'),
  membershipPolicy: z.enum(['open', 'approval']).default('open'),
  communityRules: z.string().max(1500).optional().default(''),
  guidelines: z.string().max(1500).optional().default(''),
  defaultLocation: locationSchema.optional(),
  recurrenceSettings: z
    .object({
      frequency: z.enum(['weekly', 'biweekly', 'monthly']),
      byWeekday: z.array(z.number().int().min(0).max(6)).min(1, 'Pick at least one weekday').max(7),
      startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM format'),
      durationMinutes: z.coerce.number().int().min(15).max(1440).default(120),
      timeZone: z.string().max(64).default('Asia/Kolkata'),
      nextSessionAt: z.coerce.date().optional(),
    })
    .optional(),
});

export const updateCommunitySchema = createCommunitySchema.partial();

export const listCommunitiesQuerySchema = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(60).optional(),
  city: z.string().trim().max(80).optional(),
  sort: z.enum(['newest', 'members']).default('newest'),
});

export const createSessionSchema = z
  .object({
    title: z.string().trim().min(3).max(100),
    description: z.string().max(2000).optional().default(''),
    startAt: z.coerce.date(),
    endAt: z.coerce.date(),
    timeZone: z.string().max(64).default('Asia/Kolkata'),
    location: locationSchema.omit({ area: true }),
    capacity: z.coerce.number().int().min(2).max(500).default(20),
  })
  .refine((v) => v.endAt > v.startAt, 'End time must be after start time');

export const listSessionsQuerySchema = paginationQuery.extend({
  when: z.enum(['upcoming', 'past']).default('upcoming'),
});
