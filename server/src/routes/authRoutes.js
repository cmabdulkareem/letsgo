import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticate, requireVerifiedEmail, requireCustomHeader } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, strictLimiter } from '../middleware/rateLimit.js';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/authValidators.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', requireCustomHeader, authLimiter, authController.refresh);
router.post('/logout', requireCustomHeader, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/verify-email', authLimiter, validate(verifyEmailSchema), authController.verifyEmail);
router.post(
  '/resend-verification',
  strictLimiter,
  authenticate,
  authController.resendVerification
);
router.post('/forgot-password', strictLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.get('/push-config', authController.pushConfig);

export default router;
