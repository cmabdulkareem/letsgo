import mongoose from 'mongoose';
import { z } from 'zod';

export const objectId = z.string().refine((v) => mongoose.isValidObjectId(v), 'Invalid id');

export const geoPointSchema = z
  .object({
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  })
  .transform((g) => ({ type: 'Point', coordinates: g.coordinates }));

export const locationSchema = z.object({
  name: z.string().trim().min(2, 'Add a venue or meeting point').max(120),
  city: z.string().trim().max(80).optional().default(''),
  area: z.string().trim().max(80).optional().default(''),
  geo: geoPointSchema.optional(),
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
