import ApiError from '../utils/ApiError.js';

/**
 * Runs a Zod schema against req[part] and replaces it with the parsed result.
 * `.strict()`-style unknown-key rejection should be enabled per-schema where it matters.
 */
export const validate = (schema, part = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[part]);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message,
    }));
    return next(ApiError.badRequest(details[0]?.message || 'Validation failed', details));
  }
  req[part] = result.data;
  next();
};
