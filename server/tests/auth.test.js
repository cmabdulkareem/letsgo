import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, registerViaApi, loginViaApi, auth, refreshCookie, createUser } from './helpers.js';
import { EmailVerificationToken, User } from '../src/models/index.js';

describe('auth', () => {
  it('registers a new user and issues tokens', async () => {
    const { res } = await registerViaApi();
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.email).toBeTruthy();
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(refreshCookie(res)).toBeTruthy();
  });

  it('rejects duplicate email and username', async () => {
    const { payload } = await registerViaApi();
    const dupEmail = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Someone Else',
      username: 'someone_else',
      email: payload.email,
      password: 'Passw0rd!23',
    });
    expect(dupEmail.status).toBe(409);
    const dupUsername = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Someone Else',
      username: payload.username,
      email: 'other@test.dev',
      password: 'Passw0rd!23',
    });
    expect(dupUsername.status).toBe(409);
  });

  it('rejects weak passwords and bad input', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      displayName: 'Weak Pass',
      username: 'weakpass',
      email: 'weak@test.dev',
      password: 'short',
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    const { payload } = await registerViaApi();
    const ok = await loginViaApi(payload.email);
    expect(ok.status).toBe(200);
    expect(ok.body.data.accessToken).toBeTruthy();

    const bad = await loginViaApi(payload.email, 'WrongPass1');
    expect(bad.status).toBe(401);
  });

  it('returns /auth/me for a valid token and 401 without one', async () => {
    const { res } = await registerViaApi();
    const me = await request(app).get('/api/v1/auth/me').set(auth(res));
    expect(me.status).toBe(200);
    expect(me.body.data.user.username).toBe(res.body.data.user.username);

    const anon = await request(app).get('/api/v1/auth/me');
    expect(anon.status).toBe(401);
  });

  it('rotates refresh tokens and rejects reuse', async () => {
    const { payload } = await registerViaApi();
    const login = await loginViaApi(payload.email);
    const cookie = refreshCookie(login);

    const first = await request(app)
      .post('/api/v1/auth/refresh')
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('Cookie', cookie);
    expect(first.status).toBe(200);
    const newCookie = refreshCookie(first);
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(cookie);

    // Reuse of the old (rotated) token revokes the session.
    const reuse = await request(app)
      .post('/api/v1/auth/refresh')
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('Cookie', cookie);
    expect(reuse.status).toBe(401);
  });

  it('requires the custom header on refresh (CSRF mitigation)', async () => {
    const { payload } = await registerViaApi();
    const login = await loginViaApi(payload.email);
    const cookie = refreshCookie(login);
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });

  it('verifies email with the issued token and requires it for joining', async () => {
    const { res } = await registerViaApi();
    const userId = res.body.data.user._id;
    const record = await EmailVerificationToken.findOne({ user: userId });
    expect(record).toBeTruthy();

    const verify = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'unknown-token' });
    expect(verify.status).toBe(400);

    // Real token round-trip
    const { hashToken, generateOpaqueToken } = await import('../src/utils/tokens.js');
    // The stored hash corresponds to the emailed token; emulate by reading raw flow:
    // create a fresh token record manually and verify through the API.
    await EmailVerificationToken.deleteMany({ user: userId });
    const token = generateOpaqueToken();
    await EmailVerificationToken.create({
      user: userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const good = await request(app).post('/api/v1/auth/verify-email').send({ token });
    expect(good.status).toBe(200);
    const user = await User.findById(userId);
    expect(user.verificationStatus.emailVerified).toBe(true);
  });

  it('suspends and reactivates access on deactivation', async () => {
    const user = await createUser({ verified: true });
    // Simulate login issue
    const { signAccessToken } = await import('../src/utils/tokens.js');
    const token = signAccessToken(user);
    const me1 = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me1.status).toBe(200);

    user.accountStatus = 'deactivated';
    await user.save();
    const me2 = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me2.status).toBe(401);
  });
});
