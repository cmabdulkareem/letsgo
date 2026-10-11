import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app, createUser, makeCategory, makeRoom } from './helpers.js';
import { SchedulingVote, ActivityRoom, Notification } from '../src/models/index.js';

async function setup() {
  const host = await createUser({ verified: true });
  const member = await createUser({ verified: true });
  const outsider = await createUser({ verified: true });
  const category = await makeCategory();
  const room = await makeRoom(host, category, { roomStatus: 'open' });
  const { signAccessToken } = await import('../src/utils/tokens.js');
  const tokens = {
    host: `Bearer ${signAccessToken(host)}`,
    member: `Bearer ${signAccessToken(member)}`,
    outsider: `Bearer ${signAccessToken(outsider)}`,
  };
  await request(app).post(`/api/v1/activities/${room._id}/join`).set('Authorization', tokens.member);
  return { host, member, outsider, room, tokens };
}

function futureSlots() {
  const start1 = new Date(Date.now() + 48 * 3600 * 1000);
  const start2 = new Date(Date.now() + 72 * 3600 * 1000);
  return [
    { startAt: start1.toISOString(), endAt: new Date(start1.getTime() + 2 * 3600 * 1000).toISOString() },
    { startAt: start2.toISOString(), endAt: new Date(start2.getTime() + 2 * 3600 * 1000).toISOString() },
  ];
}

describe('scheduling polls', () => {
  it('is host-only to create polls', async () => {
    const { room, tokens } = await setup();
    const byMember = await request(app)
      .post(`/api/v1/activities/${room._id}/polls`)
      .set('Authorization', tokens.member)
      .send({ options: futureSlots() });
    expect(byMember.status).toBe(403);

    const byHost = await request(app)
      .post(`/api/v1/activities/${room._id}/polls`)
      .set('Authorization', tokens.host)
      .send({ options: futureSlots(), votingMode: 'single' });
    expect(byHost.status).toBe(201);
    expect(byHost.body.data.poll.options).toHaveLength(2);
  });

  it('records votes, enforces single-choice and allows changes', async () => {
    const { room, tokens } = await setup();
    const created = await request(app)
      .post(`/api/v1/activities/${room._id}/polls`)
      .set('Authorization', tokens.host)
      .send({ options: futureSlots(), votingMode: 'single' });
    const poll = created.body.data.poll;
    const [opt1, opt2] = poll.options;

    const both = await request(app)
      .post(`/api/v1/polls/${poll._id}/votes`)
      .set('Authorization', tokens.member)
      .send({ optionIds: [opt1._id, opt2._id] });
    expect(both.status).toBe(400);

    const voted = await request(app)
      .post(`/api/v1/polls/${poll._id}/votes`)
      .set('Authorization', tokens.member)
      .send({ optionIds: [opt1._id] });
    expect(voted.status).toBe(200);
    expect(voted.body.data.poll.options.find((o) => o._id === opt1._id).voteCount).toBe(1);

    const changed = await request(app)
      .patch(`/api/v1/polls/${poll._id}/votes`)
      .set('Authorization', tokens.member)
      .send({ optionIds: [opt2._id] });
    expect(changed.status).toBe(200);
    expect(changed.body.data.poll.options.find((o) => o._id === opt1._id).voteCount).toBe(0);
    expect(changed.body.data.poll.options.find((o) => o._id === opt2._id).voteCount).toBe(1);

    const vote = await SchedulingVote.findOne({ poll: poll._id });
    expect(vote.selectedOptions.map(String)).toEqual([opt2._id]);
  });

  it('rejects votes from non-members and after close', async () => {
    const { room, tokens } = await setup();
    const created = await request(app)
      .post(`/api/v1/activities/${room._id}/polls`)
      .set('Authorization', tokens.host)
      .send({ options: futureSlots() });
    const poll = created.body.data.poll;
    const opt = poll.options[0];

    const outsiderVote = await request(app)
      .post(`/api/v1/polls/${poll._id}/votes`)
      .set('Authorization', tokens.outsider)
      .send({ optionIds: [opt._id] });
    expect(outsiderVote.status).toBe(403);

    await request(app).post(`/api/v1/polls/${poll._id}/close`).set('Authorization', tokens.host);
    const lateVote = await request(app)
      .post(`/api/v1/polls/${poll._id}/votes`)
      .set('Authorization', tokens.member)
      .send({ optionIds: [opt._id] });
    expect(lateVote.status).toBe(409);
  });

  it('confirming a slot schedules the room and notifies members', async () => {
    const { room, member, tokens } = await setup();
    const created = await request(app)
      .post(`/api/v1/activities/${room._id}/polls`)
      .set('Authorization', tokens.host)
      .send({ options: futureSlots() });
    const poll = created.body.data.poll;
    const opt = poll.options[1];

    const notHost = await request(app)
      .post(`/api/v1/polls/${poll._id}/confirm`)
      .set('Authorization', tokens.member)
      .send({ optionId: opt._id });
    expect(notHost.status).toBe(403);

    const confirmed = await request(app)
      .post(`/api/v1/polls/${poll._id}/confirm`)
      .set('Authorization', tokens.host)
      .send({ optionId: opt._id });
    expect(confirmed.status).toBe(200);

    const fresh = await ActivityRoom.findById(room._id);
    expect(fresh.roomStatus).toBe('scheduled');
    expect(fresh.confirmedStartAt.toISOString()).toBe(opt.startAt);

    const notice = await Notification.findOne({ recipient: member._id, type: 'schedule_confirmed' });
    expect(notice).toBeTruthy();
  });

  it('enforces voting deadlines', async () => {
    const { room, tokens } = await setup();
    const created = await request(app)
      .post(`/api/v1/activities/${room._id}/polls`)
      .set('Authorization', tokens.host)
      .send({
        options: futureSlots(),
        deadline: new Date(Date.now() + 1000).toISOString(),
      });
    const poll = created.body.data.poll;
    await new Promise((r) => setTimeout(r, 1100));

    const late = await request(app)
      .post(`/api/v1/polls/${poll._id}/votes`)
      .set('Authorization', tokens.member)
      .send({ optionIds: [poll.options[0]._id] });
    expect(late.status).toBe(409);
  });
});
