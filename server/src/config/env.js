import 'node:process';

const bool = (v, fallback = false) => (v === undefined ? fallback : v === 'true' || v === '1');
const int = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? fallback : n;
};

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  port: int(process.env.PORT, 5000),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/letsgo',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:5000',
  frontendPublicUrl: process.env.FRONTEND_PUBLIC_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'dev-only-insecure-secret-change-me',
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || '15m',
  refreshTokenExpiryDays: int(process.env.REFRESH_TOKEN_EXPIRY_DAYS, 30),

  emailProvider: process.env.EMAIL_PROVIDER || 'console',
  emailFrom: process.env.EMAIL_FROM || "Let's Go <no-reply@letsgo.local>",
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: int(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },

  webPush: {
    publicKey: process.env.WEB_PUSH_PUBLIC_KEY || '',
    privateKey: process.env.WEB_PUSH_PRIVATE_KEY || '',
    subject: process.env.WEB_PUSH_SUBJECT || 'mailto:admin@letsgo.local',
  },

  storageProvider: process.env.STORAGE_PROVIDER || 'local',
  uploadMaxMb: int(process.env.UPLOAD_MAX_MB, 5),
  mapsApiKey: process.env.MAPS_API_KEY || '',

  allowedOrigins: (process.env.ALLOWED_ORIGINS || process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  cookieSameSite: process.env.COOKIE_SAMESITE || 'lax',

  messageRetentionDays: int(process.env.MESSAGE_RETENTION_DAYS, 90),
};

if (env.isProduction && env.accessTokenSecret === 'dev-only-insecure-secret-change-me') {
  // eslint-disable-next-line no-console
  console.error('[FATAL] ACCESS_TOKEN_SECRET must be set in production.');
  process.exit(1);
}

export default env;
