import mongoose from 'mongoose';
import env from './env.js';
import logger from './logger.js';

mongoose.set('strictQuery', true);

export async function connectDb(uri = env.mongodbUri) {
  mongoose.connection.on('connected', () => logger.info('db.connected', { uri: redact(uri) }));
  mongoose.connection.on('error', (err) => logger.error('db.error', { error: err.message }));
  mongoose.connection.on('disconnected', () => logger.warn('db.disconnected'));

  await mongoose.connect(uri, {
    autoIndex: !env.isProduction,
    serverSelectionTimeoutMS: 10000,
    maxPoolSize: 20,
  });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

function redact(uri) {
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
}
