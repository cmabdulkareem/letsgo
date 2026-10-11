import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/letsgo';

await mongoose.connect(MONGO_URI);
console.log('Connected to MongoDB:', MONGO_URI);

const result = await mongoose.connection.collection('users').updateMany(
  {},
  { $set: { 'verificationStatus.emailVerified': true } }
);

console.log('Matched:', result.matchedCount, '| Updated:', result.modifiedCount);
await mongoose.disconnect();
console.log('Done.');
