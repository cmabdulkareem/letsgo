import { User } from '../models/index.js';
import { verifyAccessToken } from '../utils/tokens.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from '../utils/asyncHandler.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw ApiError.unauthorized('Missing access token');

  const payload = verifyAccessToken(token);
  if (!payload) throw ApiError.unauthorized('Invalid or expired access token');

  const user = await User.findById(payload.sub);
  if (!user || user.accountStatus !== 'active') {
    throw ApiError.unauthorized('Account is not active');
  }
  if (user.tokenVersion !== payload.tv) {
    throw ApiError.unauthorized('Session has been revoked, please sign in again');
  }

  req.user = user;
  next();
});

export const optionalAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    const payload = verifyAccessToken(token);
    if (payload) {
      const user = await User.findById(payload.sub);
      if (user && user.accountStatus === 'active' && user.tokenVersion === payload.tv) {
        req.user = user;
      }
    }
  }
  next();
});

export const requireVerifiedEmail = (req, _res, next) => {
  if (!req.user?.verificationStatus?.emailVerified) {
    return next(ApiError.forbidden('Please verify your email address to continue'));
  }
  next();
};

export const requireAdmin = (req, _res, next) => {
  if (req.user?.role !== 'admin') return next(ApiError.forbidden('Administrator access required'));
  next();
};

// CSRF mitigation for cookie-based endpoints: the browser cannot attach a custom
// header cross-origin without a CORS preflight, which we do not approve.
export const requireCustomHeader = (req, _res, next) => {
  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return next(ApiError.forbidden('Missing required header'));
  }
  next();
};
