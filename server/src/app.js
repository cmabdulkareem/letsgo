import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import env from './config/env.js';
import { UPLOAD_ROOT } from './services/uploadService.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { notFoundHandler, errorHandler } from './middleware/error.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import schedulingRoutes from './routes/schedulingRoutes.js';
import communityRoutes from './routes/communityRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  app.use(helmet());

  const corsOptions = {
    origin(origin, callback) {
      // Allow server-to-server / curl requests (no Origin header).
      if (!origin) return callback(null, true);
      if (env.allowedOrigins.includes(origin)) return callback(null, true);
      // In development, log the blocked origin to help with misconfiguration.
      if (!env.isProduction) {
        console.warn(`[CORS] Blocked origin: ${origin}. Allowed: ${env.allowedOrigins.join(', ')}`);
      }
      return callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
    // Explicitly list the headers the client is allowed to send.
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining'],
    // Cache preflight for 2 hours.
    maxAge: 7200,
  };

  // Handle OPTIONS preflight for every route before any other middleware.
  app.options('*', cors(corsOptions));
  app.use(cors(corsOptions));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '500kb' }));
  app.use(cookieParser());

  // User uploads: immutable files, long cache, strict content sniffing off.
  app.use(
    '/uploads',
    express.static(UPLOAD_ROOT, {
      maxAge: '30d',
      immutable: true,
      index: false,
      setHeaders(res) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Disposition', 'inline');
      },
    })
  );

  app.get('/api/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok', uptime: process.uptime() } });
  });

  app.use('/api/v1', apiLimiter);
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userRoutes);
  app.use('/api/v1/activities', activityRoutes);
  app.use('/api/v1', schedulingRoutes);
  app.use('/api/v1/communities', communityRoutes);
  app.use('/api/v1/rooms', messageRoutes);
  app.use('/api/v1/notifications', notificationRoutes);
  app.use('/api/v1/admin', adminRoutes);
  app.use('/api/v1/categories', categoryRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
