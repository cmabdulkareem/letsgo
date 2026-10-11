import mongoose from 'mongoose';
import { SchedulingPoll, SchedulingVote, ActivityRoom, Membership } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { notifyMany } from './notificationService.js';
import { getMembership, canManageRoom } from './roomService.js';

async function getPollOr404(pollId) {
  const poll = await SchedulingPoll.findById(pollId);
  if (!poll) throw ApiError.notFound('Poll not found');
  return poll;
}

async function getManagedRoom(roomId, user) {
  const room = await ActivityRoom.findById(roomId);
  if (!room) throw ApiError.notFound('Activity not found');
  if (!(await canManageRoom(room, user._id))) {
    throw ApiError.forbidden('Only the host can manage scheduling for this activity');
  }
  return room;
}

async function assertActiveMember(roomId, userId) {
  const membership = await getMembership(roomId, userId);
  if (!membership || membership.membershipStatus !== 'active') {
    throw ApiError.forbidden('Only active members can participate in scheduling');
  }
  return membership;
}

export async function createPoll(roomId, user, { options, votingMode, deadline, allowVoteChange }) {
  const room = await getManagedRoom(roomId, user);
  if (['cancelled', 'archived', 'completed'].includes(room.roomStatus)) {
    throw ApiError.conflict('Scheduling is closed for this activity');
  }

  const now = new Date();
  const sanitized = options
    .map((o) => ({
      startAt: new Date(o.startAt),
      endAt: new Date(o.endAt),
      label: (o.label || '').slice(0, 80),
      voteCount: 0,
    }))
    .filter((o) => o.endAt > now && o.startAt < o.endAt);
  if (sanitized.length === 0) throw ApiError.badRequest('Provide at least one future time slot');

  // One open poll at a time; opening a new poll closes previous open ones.
  await SchedulingPoll.updateMany(
    { room: roomId, status: 'open' },
    { $set: { status: 'closed', closedAt: now } }
  );

  const poll = await SchedulingPoll.create({
    room: roomId,
    createdBy: user._id,
    options: sanitized,
    votingMode,
    allowVoteChange: allowVoteChange !== false,
    deadline: deadline ? new Date(deadline) : undefined,
  });

  const members = await Membership.find({ room: roomId, membershipStatus: 'active' }).select('user');
  await notifyMany(
    members.filter((m) => String(m.user) !== String(user._id)).map((m) => m.user),
    {
      type: 'poll_created',
      title: `New schedule options for "${room.title}"`,
      body: 'Vote on the dates that work for you.',
      relatedEntity: { kind: 'room', id: room._id },
      url: `/rooms/${roomId}?tab=schedule`,
    }
  );
  return poll;
}

function presentPoll(poll, myVote) {
  const obj = poll.toObject();
  return { ...obj, myVote: myVote?.selectedOptions || null };
}

export async function getOpenPollForRoom(roomId, userId) {
  const poll = await SchedulingPoll.findOne({ room: roomId, status: 'open' }).sort({ createdAt: -1 });
  if (!poll) return null;
  const vote = userId ? await SchedulingVote.findOne({ poll: poll._id, user: userId }) : null;
  return presentPoll(poll, vote);
}

export async function listPolls(roomId, user) {
  await assertActiveMember(roomId, user._id);
  const polls = await SchedulingPoll.find({ room: roomId }).sort({ createdAt: -1 }).limit(20);
  const votes = await SchedulingVote.find({
    poll: { $in: polls.map((p) => p._id) },
    user: user._id,
  });
  const byPoll = new Map(votes.map((v) => [String(v.poll), v]));
  return polls.map((p) => presentPoll(p, byPoll.get(String(p._id))));
}

export async function vote(pollId, user, optionIds) {
  const poll = await getPollOr404(pollId);
  if (poll.status !== 'open') throw ApiError.conflict('This poll is closed');
  if (poll.deadline && new Date() > poll.deadline) throw ApiError.conflict('The voting deadline has passed');
  await assertActiveMember(poll.room, user._id);

  const uniqueIds = [...new Set(optionIds.map(String))];
  if (uniqueIds.length === 0) throw ApiError.badRequest('Select at least one option');
  if (poll.votingMode === 'single' && uniqueIds.length > 1) {
    throw ApiError.badRequest('This poll only allows one choice');
  }
  const validOptionIds = new Set(poll.options.map((o) => String(o._id)));
  for (const id of uniqueIds) {
    if (!validOptionIds.has(id)) throw ApiError.badRequest('One or more options are invalid');
  }

  const existing = await SchedulingVote.findOne({ poll: poll._id, user: user._id });
  if (existing && !poll.allowVoteChange) {
    throw ApiError.conflict('Votes cannot be changed for this poll');
  }

  const previous = new Set(existing ? existing.selectedOptions.map(String) : []);
  const next = new Set(uniqueIds);
  const increments = new Map();
  for (const id of previous) if (!next.has(id)) increments.set(id, (increments.get(id) || 0) - 1);
  for (const id of next) if (!previous.has(id)) increments.set(id, (increments.get(id) || 0) + 1);

  // Apply vote-count deltas per option with filters so concurrent updates are safe.
  for (const [optionId, delta] of increments) {
    await SchedulingPoll.updateOne(
      { _id: poll._id, 'options._id': new mongoose.Types.ObjectId(optionId) },
      { $inc: { 'options.$.voteCount': delta } }
    );
  }

  const voteDoc = existing || new SchedulingVote({ poll: poll._id, user: user._id });
  voteDoc.selectedOptions = [...next].map((id) => new mongoose.Types.ObjectId(id));
  await voteDoc.save();

  const fresh = await getPollOr404(poll._id);
  return presentPoll(fresh, voteDoc);
}

export async function closePoll(pollId, user) {
  const poll = await getPollOr404(pollId);
  await getManagedRoom(poll.room, user);
  if (poll.status !== 'open') throw ApiError.conflict('Poll is already closed');
  poll.status = 'closed';
  poll.closedAt = new Date();
  await poll.save();
  return poll;
}

export async function confirmPoll(pollId, user, optionId) {
  const poll = await getPollOr404(pollId);
  const room = await getManagedRoom(poll.room, user);
  if (poll.status === 'confirmed') throw ApiError.conflict('This poll has already been confirmed');
  if (poll.status !== 'open') throw ApiError.conflict('Reopen the poll before confirming a slot');

  const option = poll.options.id(optionId);
  if (!option) throw ApiError.badRequest('Option not found');
  if (option.endAt < new Date()) throw ApiError.badRequest('Cannot confirm a past time slot');

  poll.status = 'confirmed';
  poll.selectedOptionId = option._id;
  poll.confirmedAt = new Date();
  await poll.save();
  await SchedulingPoll.updateMany(
    { room: poll.room, _id: { $ne: poll._id }, status: 'open' },
    { $set: { status: 'closed', closedAt: new Date() } }
  );

  const wasReschedule = Boolean(room.confirmedStartAt);
  room.confirmedStartAt = option.startAt;
  room.confirmedEndAt = option.endAt;
  room.nextAt = option.startAt;
  if (['open', 'full', 'scheduling'].includes(room.roomStatus)) room.roomStatus = 'scheduled';
  await room.save();

  const members = await Membership.find({ room: room._id, membershipStatus: 'active' }).select('user');
  await notifyMany(
    members.filter((m) => String(m.user) !== String(user._id)).map((m) => m.user),
    {
      type: wasReschedule ? 'schedule_changed' : 'schedule_confirmed',
      title: wasReschedule
        ? `"${room.title}" was rescheduled`
        : `"${room.title}" is confirmed!`,
      body: `Starts ${option.startAt.toISOString()}`,
      relatedEntity: { kind: 'room', id: room._id },
      url: `/rooms/${room._id}`,
    }
  );
  return { poll: await getPollOr404(poll._id), room };
}

export async function unconfirmSchedule(roomId, user) {
  // Host clears a confirmed schedule to re-open scheduling.
  const room = await getManagedRoom(roomId, user);
  if (!room.confirmedStartAt) throw ApiError.badRequest('No confirmed schedule to clear');
  room.confirmedStartAt = null;
  room.confirmedEndAt = null;
  room.nextAt = null;
  if (room.roomStatus === 'scheduled') room.roomStatus = 'open';
  await room.save();
  return room;
}
