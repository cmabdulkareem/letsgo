import mongoose from 'mongoose';

/** Idempotent model registration — safe when test files re-import the graph. */
export function defineModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}
