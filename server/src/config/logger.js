import env from './env.js';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = env.isProduction ? LEVELS.info : LEVELS.debug;

function write(level, event, meta = {}) {
  if (LEVELS[level] < minLevel) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    event,
    ...sanitize(meta),
  });
  // eslint-disable-next-line no-console
  console[level === 'error' ? 'error' : 'log'](line);
}

const SENSITIVE_KEYS = /password|token|secret|authorization|cookie/i;

function sanitize(meta) {
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (SENSITIVE_KEYS.test(k)) {
      out[k] = '[redacted]';
    } else if (v instanceof Error) {
      out[k] = env.isProduction ? v.message : v.stack;
    } else if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
      out[k] = sanitize(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

export default {
  debug: (event, meta) => write('debug', event, meta),
  info: (event, meta) => write('info', event, meta),
  warn: (event, meta) => write('warn', event, meta),
  error: (event, meta) => write('error', event, meta),
};
