import mongoose from 'mongoose';
import { beforeAll, beforeEach, afterAll } from 'vitest';

const TEST_URI = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27017/letsgo-test';

beforeAll(async () => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(TEST_URI, { autoIndex: true });
});

beforeEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase().catch(() => {});
  await mongoose.disconnect();
});
