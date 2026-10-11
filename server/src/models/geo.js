import mongoose from 'mongoose';

/**
 * GeoJSON Point sub-schema. Children are required so a stored geo is always a
 * valid Point — documents without location data simply omit the field, which
 * the 2dsphere indexes skip.
 */
export const geoPointSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['Point'], required: true },
    coordinates: { type: [Number], required: true }, // [lng, lat]
  },
  { _id: false }
);
