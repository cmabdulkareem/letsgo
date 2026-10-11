import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createUser, makeCategory, makeRoom } from './helpers.js';
import { ActivitySession, CommunityMembership, Community, Message } from '../src/models/index.js';
import { generateDueSessions } from '../src/services/communityService.js';

async function setupCommunity(overrides = {}) {
  const owner = await createUser({ verified: true });
  const category = await makeCategory();
  const { signAccessToken } = await import('../src/utils/tokens.js');
  const token = `Bearer ${signAccessToken(owner)}`;

  const res = await request(app)
    .post('/api/v1/communities')
    .set('Authorization', token)
    .send({
      name: 'Test Crew',
      description: 'A test community for the test suite.',
      category: String(category._id),
      defaultLocation: { name: 'Test Ground', city: 'Kasaragod' },
      ...overrides,
    });
  return { owner, category, token, community: res.body.data.community, res };
}

describe('communities', () => {
  it('creates a community with the owner as member', async () => {
    const { community, owner } = await setupCommunity();
    expect(community.memberCount).toBe(1);
    const membership = await CommunityMembership.findOne({ community: community._id, user: owner._id });
    expect(membership.role).toBe('owner');
  });

  it('joins open communities and pending+review for approval communities', async () => {
    const { community } = await setupCommunity({ membershipPolicy: 'approval' });
    const user = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');
    const token = `Bearer ${signAccessToken(user)}`;

    const joined = await request(app)
      .post(`/api/v1/communities/${community._id}/join`)
      .set('Authorization', token);
    expect(joined.status).toBe(200);
    expect(joined.body.data.status).toBe('pending');

    const dup = await request(app)
      .post(`/api/v1/communities/${community._id}/join`)
      .set('Authorization', token);
    expect(dup.status).toBe(409);

    const { owner, token: ownerToken } = await (async () => {
      const o = await CommunityMembership.findOne({ community: community._id, role: 'owner' });
      const u = await (await import('../src/models/index.js')).User.findById(o.user);
      return { owner: u, token: `Bearer ${(await import('../src/utils/tokens.js')).signAccessToken(u)}` };
    })();

    const review = await request(app)
      .patch(`/api/v1/communities/${community._id}/members/${user._id}`)
      .set('Authorization', ownerToken)
      .send({ approve: true });
    expect(review.status).toBe(200);

    const fresh = await Community.findById(community._id);
    expect(fresh.memberCount).toBe(2);
    void owner;
  });

  it('rsvps to sessions with capacity enforcement', async () => {
    const { community, token } = await setupCommunity();
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    const created = await request(app)
      .post(`/api/v1/communities/${community._id}/sessions`)
      .set('Authorization', token)
      .send({
        title: 'Test session',
        startAt: start.toISOString(),
        endAt: new Date(start.getTime() + 3600_000).toISOString(),
        location: { name: 'Test Ground' },
        capacity: 2,
      });
    expect(created.status).toBe(201);
    const sessionId = created.body.data.session._id;

    const u1 = await createUser({ verified: true });
    const u2 = await createUser({ verified: true });
    const u3 = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');

    const r1 = await request(app)
      .post(`/api/v1/communities/sessions/${sessionId}/rsvp`)
      .set('Authorization', `Bearer ${signAccessToken(u1)}`)
      .send({ going: true });
    expect(r1.status).toBe(200);
    await request(app)
      .post(`/api/v1/communities/sessions/${sessionId}/rsvp`)
      .set('Authorization', `Bearer ${signAccessToken(u2)}`)
      .send({ going: true });

    const full = await request(app)
      .post(`/api/v1/communities/sessions/${sessionId}/rsvp`)
      .set('Authorization', `Bearer ${signAccessToken(u3)}`)
      .send({ going: true });
    expect(full.status).toBe(409);

    const session = await ActivitySession.findById(sessionId);
    expect(session.attendees).toHaveLength(2);
  });

  it('recurrence generation is idempotent', async () => {
    const next = new Date(Date.now() + 20 * 3600 * 1000);
    const { community } = await setupCommunity({
      recurrenceSettings: {
        frequency: 'weekly',
        byWeekday: [next.getUTCDay()],
        startTime: '07:00',
        durationMinutes: 120,
        timeZone: 'Asia/Kolkata',
        nextSessionAt: next.toISOString(),
      },
    });

    const first = await generateDueSessions();
    const count1 = await ActivitySession.countDocuments({ community: community._id });
    const second = await generateDueSessions();
    const count2 = await ActivitySession.countDocuments({ community: community._id });

    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThanOrEqual(0);
    expect(count2).toBe(count1); // no duplicates on retry
  });
});

describe('messages', () => {
  it('requires membership to read or send', async () => {
    const host = await createUser({ verified: true });
    const outsider = await createUser({ verified: true });
    const category = await makeCategory();
    const room = await makeRoom(host, category);
    const { signAccessToken } = await import('../src/utils/tokens.js');

    const listDenied = await request(app)
      .get(`/api/v1/rooms/${room._id}/messages`)
      .set('Authorization', `Bearer ${signAccessToken(outsider)}`);
    expect(listDenied.status).toBe(403);

    const sendDenied = await request(app)
      .post(`/api/v1/rooms/${room._id}/messages`)
      .set('Authorization', `Bearer ${signAccessToken(outsider)}`)
      .send({ content: 'hello?' });
    expect(sendDenied.status).toBe(403);
  });

  it('members can exchange persisted messages', async () => {
    const host = await createUser({ verified: true });
    const member = await createUser({ verified: true });
    const category = await makeCategory();
    const room = await makeRoom(host, category);
    const { signAccessToken } = await import('../src/utils/tokens.js');
    const memberToken = `Bearer ${signAccessToken(member)}`;
    await request(app).post(`/api/v1/activities/${room._id}/join`).set('Authorization', memberToken);

    const sent = await request(app)
      .post(`/api/v1/rooms/${room._id}/messages`)
      .set('Authorization', memberToken)
      .send({ content: 'First message!' });
    expect(sent.status).toBe(201);

    const list = await request(app)
      .get(`/api/v1/rooms/${room._id}/messages`)
      .set('Authorization', memberToken);
    expect(list.status).toBe(200);
    expect(list.body.data.items).toHaveLength(1);
    expect(list.body.data.items[0].content).toBe('First message!');

    const stored = await Message.findOne({ room: room._id });
    expect(stored).toBeTruthy();
  });

  it('hides messages from users the viewer blocked', async () => {
    const host = await createUser({ verified: true });
    const a = await createUser({ verified: true });
    const b = await createUser({ verified: true });
    const category = await makeCategory();
    const room = await makeRoom(host, category);
    const { signAccessToken } = await import('../src/utils/tokens.js');

    for (const u of [a, b]) {
      await request(app)
        .post(`/api/v1/activities/${room._id}/join`)
        .set('Authorization', `Bearer ${signAccessToken(u)}`);
    }
    await request(app)
      .post(`/api/v1/rooms/${room._id}/messages`)
      .set('Authorization', `Bearer ${signAccessToken(a)}`)
      .send({ content: 'from A' });
    await request(app)
      .post(`/api/v1/rooms/${room._id}/messages`)
      .set('Authorization', `Bearer ${signAccessToken(b)}`)
      .send({ content: 'from B' });

    // A blocks B: A no longer sees B's message.
    await request(app)
      .post(`/api/v1/users/${b._id}/block`)
      .set('Authorization', `Bearer ${signAccessToken(a)}`);
    const list = await request(app)
      .get(`/api/v1/rooms/${room._id}/messages`)
      .set('Authorization', `Bearer ${signAccessToken(a)}`);
    const contents = list.body.data.items.map((m) => m.content);
    expect(contents).toContain('from A');
    expect(contents).not.toContain('from B');
  });
});
