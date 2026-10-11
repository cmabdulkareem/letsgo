import http from 'node:http';
import env from './config/env.js';
import logger from './config/logger.js';
import { connectDb, disconnectDb } from './config/db.js';
import { createApp } from './app.js';
import { initSockets } from './sockets/index.js';
import { startJobs } from './jobs/index.js';

async function main() {
  await connectDb();

  const app = createApp();
  const server = http.createServer(app);
  initSockets(server);
  const jobs = startJobs();

  server.listen(env.port, () => {
    logger.info('server.listening', { port: env.port, env: env.nodeEnv });
  });

  async function shutdown(signal) {
    logger.info('server.shutdown', { signal });
    jobs.forEach((t) => t.stop());
    server.close(async () => {
      await disconnectDb();
      process.exit(0);
    });
    // Force-exit if connections linger.
    setTimeout(() => process.exit(1), 8000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => {
    logger.error('process.unhandledRejection', { error: reason });
  });
}

main().catch((err) => {
  logger.error('server.boot_failed', { error: err.message });
  process.exit(1);
});
