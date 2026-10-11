import mongoose from 'mongoose';
import env from '../config/env.js';
import logger from '../config/logger.js';
import ApiError from '../utils/ApiError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}`, code: 'NOT_FOUND' });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    });
  }

  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ success: false, message: 'Invalid identifier', code: 'VALIDATION_ERROR' });
  }
  if (err?.code === 11000) {
    const field = Object.keys(err.keyValue || {}).join(', ');
    return res.status(409).json({
      success: false,
      message: `A record with that ${field || 'value'} already exists`,
      code: 'CONFLICT',
    });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, message: 'Request too large', code: 'PAYLOAD_TOO_LARGE' });
  }

  logger.error('http.unhandled', { error: err, path: req.originalUrl, method: req.method });
  return res.status(500).json({
    success: false,
    message: env.isProduction ? 'Something went wrong' : err.message,
    code: 'INTERNAL_ERROR',
  });
}
