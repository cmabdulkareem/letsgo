import request from 'supertest';
import { createApp } from '../src/app.js';
import { User } from '../src/models/index.js';

export const app = createApp();

let userCounter = 0;

export async function createUser({ verified = true, ...overrides } = {}) {
  userCounter += 1;
  const n = userCounter;
  const user = await User.create({
    displayName: overrides.displayName || `Test User ${n}`,
    username: overrides.username || `testuser${n}`,
    email: overrides.email || `user${n}@test.dev`,
    passwordHash: overrides.passwordHash || '$2a$12$hashedvalue0000000000000000000000000000000000000000000',
    city: overrides.city || 'Kasaragod',
    'verificationStatus.emailVerified': verified,
    role: overrides.role || 'user',
  });
  return user;
}

/** Registers a real user through the API (hashes a real password). */
export async function registerViaApi(overrides = {}) {
  userCounter += 1;
  const n = userCounter;
  const payload = {
    displayName: overrides.displayName || `Api User ${n}`,
    username: overrides.username || `apiuser${n}`,
    email: overrides.email || `api${n}@test.dev`,
    password: overrides.password || 'Passw0rd!23',
    city: 'Kasaragod',
  };
  const res = await request(app).post('/api/v1/auth/register').send(payload);
  return { res, payload };
}

export async function loginViaApi(email, password = 'Passw0rd!23') {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .set('X-Requested-With', 'XMLHttpRequest')
    .send({ email, password });
  return res;
}

export function auth(res) {
  return { Authorization: `Bearer ${res.body.data.accessToken}` };
}

export function refreshCookie(res) {
  const setCookie = res.headers['set-cookie'] || [];
  const cookie = setCookie.map(String).find((c) => c.startsWith('lg_refresh='));
  return cookie ? cookie.split(';')[0] : null;
}

export async function makeCategory(overrides = {}) {
  const { Category } = await import('../src/models/index.js');
  const n = Math.random().toString(36).slice(2, 7);
  return Category.create({
    name: overrides.name || `Category ${n}`,
    slug: overrides.slug || `category-${n}`,
    icon: 'sparkles',
    color: '#08B981',
    isActive: true,
    ...overrides,
  });
}

export async function makeRoom(host, category, overrides = {}) {
  const { ActivityRoom, Membership } = await import('../src/models/index.js');
  const n = Math.random().toString(36).slice(2, 7);
  const room = await ActivityRoom.create({
    title: overrides.title || `Test Activity ${n}`,
    slug: `test-${n}`,
    description: overrides.description || 'A seeded test activity with a long enough description.',
    category: category._id,
    host: host._id,
    visibility: overrides.visibility || 'public',
    joinPolicy: overrides.joinPolicy || 'open',
    roomStatus: overrides.roomStatus || 'open',
    location: overrides.location || { name: 'Test Ground', city: 'Kasaragod', geo: { type: 'Point', coordinates: [74.99, 12.5] } },
    maximumParticipants: overrides.maximumParticipants ?? 10,
    minimumParticipants: overrides.minimumParticipants ?? 2,
    waitlistEnabled: overrides.waitlistEnabled ?? true,
    confirmedStartAt: overrides.confirmedStartAt,
    confirmedEndAt: overrides.confirmedEndAt,
    nextAt: overrides.confirmedStartAt || null,
    timeZone: 'Asia/Kolkata',
    ...overrides,
  });
  await Membership.create({ room: room._id, user: host._id, role: 'host', membershipStatus: 'active' });
  await ActivityRoom.updateOne({ _id: room._id }, { $set: { memberCount: 1 } });
  return ActivityRoom.findById(room._id);
}
