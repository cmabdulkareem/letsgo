import { z } from 'zod';
import { objectId, locationSchema, paginationQuery } from './common.js';

const timeOfDay = ['morning', 'afternoon', 'evening', 'night'];
const discoverSort = ['relevance', 'distance', 'upcoming', 'newest'];

export const createActivitySchema = z.object({
  title: z.string().trim().min(4, 'Give the activity a title (4+ characters)').max(100),
  description: z.string().trim().min(10, 'Describe the activity (10+ characters)').max(3000),
  category: objectId,
  coverImage: z.string().max(300).optional().default(''),
  visibility: z.enum(['public', 'private']).default('public'),
  joinPolicy: z.enum(['open', 'approval']).default('open'),
  location: locationSchema,
  confirmedStartAt: z.coerce.date().optional().nullable(),
  confirmedEndAt: z.coerce.date().optional().nullable(),
  timeZone: z.string().max(64).default('Asia/Kolkata'),
  minimumParticipants: z.coerce.number().int().min(2).max(500).default(2),
  maximumParticipants: z.coerce.number().int().min(2).max(500),
  skillLevel: z.enum(['any', 'beginner', 'intermediate', 'advanced']).default('any'),
  cost: z
    .object({
      isFree: z.boolean().default(true),
      amount: z.coerce.number().min(0).default(0),
      currency: z.string().length(3).default('INR'),
      notes: z.string().max(200).optional().default(''),
    })
    .optional()
    .default({ isFree: true, amount: 0, currency: 'INR', notes: '' }),
  equipment: z.array(z.string().trim().min(1).max(80)).max(20).optional().default([]),
  durationMinutes: z.coerce.number().int().min(15).max(1440).default(120),
  ageRestriction: z
    .object({ min: z.coerce.number().int().min(0).max(120), max: z.coerce.number().int().min(0).max(120) })
    .refine((v) => v.min <= v.max, 'Age range minimum cannot exceed maximum')
    .optional(),
  roomRules: z.string().max(1500).optional().default(''),
  cancellationPolicy: z.string().max(1000).optional().default(''),
  waitlistEnabled: z.boolean().default(true),
  attendanceConfirmationRequired: z.boolean().default(true),
  recurrenceSettings: z
    .object({
      frequency: z.enum(['none', 'weekly', 'biweekly', 'monthly']),
      byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional().default([]),
      nextSessionAt: z.coerce.date().optional(),
    })
    .optional(),
});

export const updateActivitySchema = createActivitySchema.partial().omit({ recurrenceSettings: true });

export const listActivitiesQuerySchema = paginationQuery.extend({
  q: z.string().trim().max(100).optional(),
  category: z.string().max(60).optional(),
  city: z.string().trim().max(80).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeOfDay: z.enum(timeOfDay).optional(),
  skillLevel: z.enum(['any', 'beginner', 'intermediate', 'advanced']).optional(),
  hasSpots: z.enum(['true', 'false']).optional(),
  cost: z.enum(['free', 'paid']).optional(),
  sort: z.enum(discoverSort).default('newest'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  maxKm: z.coerce.number().positive().max(200).optional(),
  status: z.enum(['open', 'full', 'scheduling', 'scheduled', 'in_progress']).optional(),
});

export const attendanceSchema = z.object({
  status: z.enum(['going', 'notGoing', 'none']),
});

export const hostAttendanceSchema = z.object({
  status: z.enum(['attended', 'noShow', 'going', 'none']),
});

export const reviewRequestSchema = z.object({
  approve: z.boolean(),
});

export const joinRequestSchema = z.object({
  message: z.string().trim().max(300).optional().default(''),
});

export const inviteSchema = z.object({
  identifier: z.string().trim().min(2, 'Enter a username, phone number, or name').max(100),
});
