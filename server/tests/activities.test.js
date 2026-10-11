import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createUser, makeCategory, makeRoom, registerViaApi, loginViaApi, auth } from './helpers.js';
import { ActivityRoom, Membership, JoinRequest, Notification, User } from '../src/models/index.js';

async function setupRoom(overrides = {}) {
  const host = await createUser({ verified: true });
  const category = await makeCategory();
  const room = await makeRoom(host, category, overrides);
  return { host, category, room };
}

describe('activities', () => {
  it('discovers public activities and hides drafts/cancelled', async () => {
    const { room } = await setupRoom();
    await setupRoom({ roomStatus: 'cancelled' });
    await setupRoom({ visibility: 'private' });

    const res = await request(app).get('/api/v1/activities');
    expect(res.status).toBe(200);
    const ids = res.body.data.items.map((i) => i._id);
    expect(ids).toContain(String(room._id));
    expect(res.body.data.items).toHaveLength(1);
  });

  it('filters by category, city and cost', async () => {
    const { room, category } = await setupRoom({
      cost: { isFree: false, amount: 100, currency: 'INR', notes: '' },
    });
    await setupRoom();

    const byCat = await request(app).get(`/api/v1/activities?category=${category.slug}`);
    expect(byCat.body.data.items.map((i) => i._id)).toContain(String(room._id));
    expect(byCat.body.data.items).toHaveLength(1);

    const byCity = await request(app).get('/api/v1/activities?city=kasaragod');
    expect(byCity.body.data.items.length).toBeGreaterThanOrEqual(1);

    const paid = await request(app).get('/api/v1/activities?cost=paid');
    expect(paid.body.data.items.map((i) => i._id)).toContain(String(room._id));
    expect(paid.body.data.items).toHaveLength(1);
  });

  it('requires a verified account to create activities', async () => {
    const { res } = await registerViaApi();
    const unverified = res.body.data.user;
    const category = await makeCategory();

    const denied = await request(app)
      .post('/api/v1/activities')
      .set(auth(res))
      .send({
        title: 'Unverified room',
        description: 'This should not be allowed for unverified users.',
        category: String(category._id),
        location: { name: 'Somewhere' },
        maximumParticipants: 10,
      });
    expect(denied.status).toBe(403);
    expect(unverified.verificationStatus.emailVerified).toBe(false);
  });

  it('creates an activity with the creator as host member', async () => {
    const { res } = await registerViaApi();
    const category = await makeCategory();

    // Verify the account directly (the email flow is covered in auth tests).
    await User.updateOne(
      { _id: res.body.data.user._id },
      { $set: { 'verificationStatus.emailVerified': true } }
    );

    const created = await request(app)
      .post('/api/v1/activities')
      .set(auth(res))
      .send({
        title: 'Verified creator room',
        description: 'Created through the API by a verified user.',
        category: String(category._id),
        location: { name: 'Test venue', city: 'Kasaragod' },
        maximumParticipants: 5,
      });
    expect(created.status).toBe(201);
    const roomId = created.body.data.room._id;
    const membership = await Membership.findOne({ room: roomId, role: 'host' });
    expect(membership).toBeTruthy();
    const room = await ActivityRoom.findById(roomId);
    expect(room.memberCount).toBe(1);
  });

  it('joins an open public room exactly up to capacity under concurrency', async () => {
    const { room } = await setupRoom({ maximumParticipants: 3 });

    const users = [];
    for (let i = 0; i < 6; i += 1) users.push(await createUser({ verified: true }));

    const results = await Promise.all(
      users.map((u) => {
        const { signAccessToken } = { signAccessToken: null };
        return (async () => {
          const { signAccessToken: sign } = await import('../src/utils/tokens.js');
          return request(app)
            .post(`/api/v1/activities/${room._id}/join`)
            .set('Authorization', `Bearer ${sign(u)}`);
        })();
      })
    );

    const joined = results.filter((r) => r.status === 200 && !r.body.data.waitlisted);
    const waitlisted = results.filter((r) => r.status === 200 && r.body.data.waitlisted);
    const conflicts = results.filter((r) => r.status === 409);

    // Capacity 3: host + 2 spots. 2 join, rest waitlist or conflict — never exceed.
    expect(joined).toHaveLength(2);
    expect(waitlisted.length + conflicts.length).toBe(4);

    const fresh = await ActivityRoom.findById(room._id);
    expect(fresh.memberCount).toBe(3); // never exceeds capacity
    const active = await Membership.countDocuments({ room: room._id, membershipStatus: 'active' });
    expect(active).toBe(3);
  });

  it('prevents duplicate memberships', async () => {
    const { room } = await setupRoom();
    const user = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');
    const token = signAccessToken(user);

    const first = await request(app)
      .post(`/api/v1/activities/${room._id}/join`)
      .set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);
    const second = await request(app)
      .post(`/api/v1/activities/${room._id}/join`)
      .set('Authorization', `Bearer ${token}`);
    expect(second.status).toBe(409);
  });

  it('runs the approval workflow end to end', async () => {
    const { room, host } = await setupRoom({ joinPolicy: 'approval', maximumParticipants: 4 });
    const user = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');

    const req1 = await request(app)
      .post(`/api/v1/activities/${room._id}/join-requests`)
      .set('Authorization', `Bearer ${signAccessToken(user)}`)
      .send({ message: 'Pick me!' });
    expect(req1.status).toBe(201);

    const dup = await request(app)
      .post(`/api/v1/activities/${room._id}/join-requests`)
      .set('Authorization', `Bearer ${signAccessToken(user)}`);
    expect(dup.status).toBe(409);

    const requestId = req1.body.data.request._id;
    const nonHost = await createUser({ verified: true });
    const forbidden = await request(app)
      .patch(`/api/v1/activities/${room._id}/join-requests/${requestId}`)
      .set('Authorization', `Bearer ${signAccessToken(nonHost)}`)
      .send({ approve: true });
    expect(forbidden.status).toBe(403);

    const approved = await request(app)
      .patch(`/api/v1/activities/${room._id}/join-requests/${requestId}`)
      .set('Authorization', `Bearer ${signAccessToken(host)}`)
      .send({ approve: true });
    expect(approved.status).toBe(200);

    const membership = await Membership.findOne({ room: room._id, user: user._id, membershipStatus: 'active' });
    expect(membership).toBeTruthy();
    const fresh = await ActivityRoom.findById(room._id);
    expect(fresh.memberCount).toBe(2);
  });

  it('hides private rooms from non-members and blocks joining', async () => {
    const { room } = await setupRoom({ visibility: 'private' });
    const outsider = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');

    const detail = await request(app)
      .get(`/api/v1/activities/${room._id}`)
      .set('Authorization', `Bearer ${signAccessToken(outsider)}`);
    expect(detail.status).toBe(404);

    const join = await request(app)
      .post(`/api/v1/activities/${room._id}/join`)
      .set('Authorization', `Bearer ${signAccessToken(outsider)}`);
    expect(join.status).toBe(403);
  });

  it('enforces host-only edits and safe capacity changes', async () => {
    const { room, host } = await setupRoom({ maximumParticipants: 5 });
    const member = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');
    await request(app)
      .post(`/api/v1/activities/${room._id}/join`)
      .set('Authorization', `Bearer ${signAccessToken(member)}`);

    const byMember = await request(app)
      .patch(`/api/v1/activities/${room._id}`)
      .set('Authorization', `Bearer ${signAccessToken(member)}`)
      .send({ title: 'Hijacked title' });
    expect(byMember.status).toBe(403);

    const shrink = await request(app)
      .patch(`/api/v1/activities/${room._id}`)
      .set('Authorization', `Bearer ${signAccessToken(host)}`)
      .send({ maximumParticipants: 1 });
    expect(shrink.status).toBe(400);

    const valid = await request(app)
      .patch(`/api/v1/activities/${room._id}`)
      .set('Authorization', `Bearer ${signAccessToken(host)}`)
      .send({ title: 'A better title', roomRules: 'Be kind.' });
    expect(valid.status).toBe(200);
    expect(valid.body.data.room.title).toBe('A better title');
  });

  it('leaving promotes the waitlist and notifies', async () => {
    const { room } = await setupRoom({ maximumParticipants: 2 });
    const a = await createUser({ verified: true });
    const b = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');

    await request(app).post(`/api/v1/activities/${room._id}/join`).set('Authorization', `Bearer ${signAccessToken(a)}`);
    const waitlisted = await request(app)
      .post(`/api/v1/activities/${room._id}/join`)
      .set('Authorization', `Bearer ${signAccessToken(b)}`);
    expect(waitlisted.body.data.waitlisted).toBe(true);

    await request(app)
      .post(`/api/v1/activities/${room._id}/leave`)
      .set('Authorization', `Bearer ${signAccessToken(a)}`);

    const promoted = await Membership.findOne({ room: room._id, user: b._id });
    expect(promoted.membershipStatus).toBe('active');
    const notice = await Notification.findOne({ recipient: b._id, type: 'waitlist_promoted' });
    expect(notice).toBeTruthy();
  });

  it('cancelling notifies members and stops joins', async () => {
    const { room, host } = await setupRoom();
    const member = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');
    await request(app)
      .post(`/api/v1/activities/${room._id}/join`)
      .set('Authorization', `Bearer ${signAccessToken(member)}`);

    const cancel = await request(app)
      .post(`/api/v1/activities/${room._id}/cancel`)
      .set('Authorization', `Bearer ${signAccessToken(host)}`);
    expect(cancel.status).toBe(200);

    const notice = await Notification.findOne({ recipient: member._id, type: 'activity_cancelled' });
    expect(notice).toBeTruthy();

    const late = await createUser({ verified: true });
    const join = await request(app)
      .post(`/api/v1/activities/${room._id}/join`)
      .set('Authorization', `Bearer ${signAccessToken(late)}`);
    expect(join.status).toBe(409);
  });

  it('supports save and unsave', async () => {
    const { room } = await setupRoom();
    const user = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');
    const token = `Bearer ${signAccessToken(user)}`;

    await request(app).post(`/api/v1/activities/${room._id}/save`).set('Authorization', token);
    let me = await User.findById(user._id);
    expect(me.savedActivities.map(String)).toContain(String(room._id));

    const list = await request(app).get('/api/v1/activities/saved').set('Authorization', token);
    expect(list.body.data.items.map((i) => i._id)).toContain(String(room._id));

    await request(app).delete(`/api/v1/activities/${room._id}/save`).set('Authorization', token);
    me = await User.findById(user._id);
    expect(me.savedActivities.map(String)).not.toContain(String(room._id));
  });
});
