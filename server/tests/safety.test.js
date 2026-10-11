import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createUser, makeCategory, makeRoom } from './helpers.js';
import { Block, Report } from '../src/models/index.js';

describe('safety: blocking and reporting', () => {
  it('blocks and unblocks a user with duplicate protection', async () => {
    const a = await createUser({ verified: true });
    const b = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');
    const tokenA = `Bearer ${signAccessToken(a)}`;

    const res = await request(app).post(`/api/v1/users/${b._id}/block`).set('Authorization', tokenA);
    expect(res.status).toBe(200);
    expect(await Block.countDocuments({ blocker: a._id })).toBe(1);

    const dup = await request(app).post(`/api/v1/users/${b._id}/block`).set('Authorization', tokenA);
    expect(dup.status).toBe(409);

    const list = await request(app).get('/api/v1/users/me/blocked').set('Authorization', tokenA);
    expect(list.body.data.items).toHaveLength(1);

    const un = await request(app).delete(`/api/v1/users/${b._id}/block`).set('Authorization', tokenA);
    expect(un.status).toBe(200);
    expect(await Block.countDocuments({ blocker: a._id })).toBe(0);
  });

  it('blocked hosts disappear from discovery and cannot be joined', async () => {
    const host = await createUser({ verified: true });
    const viewer = await createUser({ verified: true });
    const category = await makeCategory();
    const room = await makeRoom(host, category);
    const { signAccessToken } = await import('../src/utils/tokens.js');
    const token = `Bearer ${signAccessToken(viewer)}`;

    const before = await request(app).get('/api/v1/activities').set('Authorization', token);
    expect(before.body.data.items.map((i) => i._id)).toContain(String(room._id));

    await request(app).post(`/api/v1/users/${host._id}/block`).set('Authorization', token);

    const after = await request(app).get('/api/v1/activities').set('Authorization', token);
    expect(after.body.data.items.map((i) => i._id)).not.toContain(String(room._id));

    const join = await request(app)
      .post(`/api/v1/activities/${room._id}/join`)
      .set('Authorization', token);
    expect(join.status).toBe(403);
  });

  it('creates reviewable reports', async () => {
    const reporter = await createUser({ verified: true });
    const bad = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');

    const res = await request(app)
      .post('/api/v1/users/report')
      .set('Authorization', `Bearer ${signAccessToken(reporter)}`)
      .send({ userId: String(bad._id), reason: 'spam', description: 'Sent repeated unwanted invites.' });
    expect(res.status).toBe(200);

    const report = await Report.findOne({ reporter: reporter._id });
    expect(report.status).toBe('pending');

    // Admin can review
    const admin = await createUser({ verified: true, role: 'admin' });
    const review = await request(app)
      .patch(`/api/v1/admin/reports/${report._id}`)
      .set('Authorization', `Bearer ${signAccessToken(admin)}`)
      .send({ status: 'resolved', resolution: 'Warning issued', actionTaken: 'warning' });
    expect(review.status).toBe(200);
    expect(review.body.data.report.status).toBe('resolved');

    const list = await request(app)
      .get('/api/v1/admin/reports?status=pending')
      .set('Authorization', `Bearer ${signAccessToken(admin)}`);
    expect(list.body.data.items).toHaveLength(0);
  });

  it('admin-only endpoints reject regular users', async () => {
    const user = await createUser({ verified: true });
    const { signAccessToken } = await import('../src/utils/tokens.js');
    const res = await request(app)
      .get('/api/v1/admin/reports')
      .set('Authorization', `Bearer ${signAccessToken(user)}`);
    expect(res.status).toBe(403);
  });
});
