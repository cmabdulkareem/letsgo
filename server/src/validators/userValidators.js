import { z } from 'zod';
import { objectId } from './common.js';

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(60).optional(),
    bio: z.string().trim().max(300).optional(),
    city: z.string().trim().max(80).optional(),
    interests: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
    preferredActivities: z.array(objectId).max(30).optional(),
    languages: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
    ageRange: z.enum(['', '18-24', '25-34', '35-44', '45-54', '55+']).optional(),
    avatar: z.string().max(300).optional(),
    homeLocation: z
      .object({
        name: z.string().max(80).optional(),
        geo: z
          .object({ coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]) })
          .optional(),
      })
      .optional(),
    privacySettings: z
      .object({
        profileVisibility: z.enum(['public', 'members']).optional(),
        showActivityHistory: z.boolean().optional(),
        showAttendance: z.boolean().optional(),
      })
      .optional(),
    notificationPreferences: z
      .object({
        inApp: z.record(z.boolean()).optional(),
        email: z.record(z.boolean()).optional(),
        push: z.record(z.boolean()).optional(),
      })
      .optional(),
  })
  .strict();

export const reportUserSchema = z.object({
  userId: objectId,
  roomId: objectId.optional(),
  messageId: objectId.optional(),
  reason: z.enum(['spam', 'harassment', 'inappropriate_behavior', 'scam', 'unsafe', 'other']),
  description: z.string().max(1000).optional().default(''),
});

export const myActivityQuerySchema = z.object({
  tab: z.enum(['all', 'hosted', 'joined', 'upcoming', 'past']).default('all'),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
