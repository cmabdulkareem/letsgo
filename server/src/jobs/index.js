import cron from 'node-cron';
import logger from '../config/logger.js';
import env from '../config/env.js';
import { ActivityRoom, Membership, ActivitySession, Message, SchedulingPoll } from '../models/index.js';
import { notifyMany } from '../services/notificationService.js';
import { generateDueSessions, nextOccurrence, addMinutes } from '../services/communityService.js';

/**
 * In-process job scheduler (node-cron). Every job is idempotent — re-running it
 * for the same records produces no duplicate notifications or sessions.
 */
export function startJobs() {
  const tasks = [
    cron.schedule('*/15 * * * *', runReminderSweep, { name: 'reminders' }),
    cron.schedule('*/10 * * * *', runLifecycleSweep, { name: 'lifecycle' }),
    cron.schedule('*/30 * * * *', runSessionRecurrence, { name: 'sessionRecurrence' }),
    cron.schedule('17 3 * * *', runRetention, { name: 'retention' }),
  ];
  logger.info('jobs.started', { count: tasks.length });
  return tasks;
}

// ------------------------------------------------------------ reminders

async function runReminderSweep() {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  // Room-based activities
  const soonRooms = await ActivityRoom.find({
    roomStatus: 'scheduled',
    confirmedStartAt: { $gt: new Date(now), $lt: new Date(now + day + hour) },
  });
  for (const room of soonRooms) {
    const msToStart = room.confirmedStartAt.getTime() - now;
    const targetFlag = msToStart <= hour ? 'hourReminderSent' : 'dayReminderSent';
    const members = await Membership.find({
      room: room._id,
      membershipStatus: 'active',
      attendanceStatus: { $in: ['going', 'none'] },
      [targetFlag]: false,
    }).select('user');
    if (!members.length) continue;
    await Membership.updateMany(
      { _id: { $in: members.map((m) => m._id) } },
      { $set: { [targetFlag]: true } }
    );
    await notifyMany(members.map((m) => m.user), {
      type: 'activity_reminder',
      title: msToStart <= hour ? `"${room.title}" starts within the hour` : `"${room.title}" is tomorrow`,
      body: 'Tap to view details and confirm your attendance.',
      relatedEntity: { kind: 'room', id: room._id },
      url: `/rooms/${room._id}`,
    });
  }

  // Community sessions
  const soonSessions = await ActivitySession.find({
    sessionStatus: 'scheduled',
    startAt: { $gt: new Date(now), $lt: new Date(now + day + hour) },
  });
  for (const session of soonSessions) {
    const msToStart = session.startAt.getTime() - now;
    const flag = msToStart <= hour ? 'hourBefore' : 'dayBefore';
    if (session.remindersSent?.[flag]) continue;
    await ActivitySession.updateOne(
      { _id: session._id },
      { $set: { [`remindersSent.${flag}`]: true } }
    );
    const going = session.attendees.filter((a) => a.status === 'going');
    await notifyMany(going.map((a) => a.user), {
      type: 'activity_reminder',
      title: msToStart <= hour ? `"${session.title}" starts within the hour` : `"${session.title}" is tomorrow`,
      relatedEntity: { kind: 'session', id: session._id },
      url: session.community ? `/communities/${session.community}?tab=sessions` : '/my-activity',
    });
  }

  // Polls closing soon (within 6h, one notice per poll)
  const closing = await SchedulingPoll.find({
    status: 'open',
    deadline: { $gt: new Date(now), $lt: new Date(now + 6 * hour) },
    notifiedClosingSoon: false,
  });
  for (const poll of closing) {
    const members = await Membership.find({ room: poll.room, membershipStatus: 'active' }).select('user');
    await notifyMany(members.map((m) => m.user), {
      type: 'poll_closing_soon',
      title: 'A scheduling poll is closing soon',
      relatedEntity: { kind: 'room', id: poll.room },
      url: `/rooms/${poll.room}?tab=schedule`,
    });
    await SchedulingPoll.updateOne({ _id: poll._id }, { $set: { notifiedClosingSoon: true } });
  }
}

// ---------------------------------------------------- lifecycle transitions

async function runLifecycleSweep() {
  const now = new Date();

  await ActivityRoom.updateMany(
    { roomStatus: 'scheduled', confirmedStartAt: { $lte: now }, confirmedEndAt: { $gt: now } },
    { $set: { roomStatus: 'in_progress' } }
  );
  const finished = await ActivityRoom.find({
    roomStatus: { $in: ['scheduled', 'in_progress'] },
    confirmedEndAt: { $lte: now },
  });
  for (const room of finished) {
    room.roomStatus = 'completed';
    await room.save();
    await generateRoomRecurrence(room);
  }

  await ActivitySession.updateMany(
    { sessionStatus: 'scheduled', endAt: { $lte: now } },
    { $set: { sessionStatus: 'completed' } }
  );
}

/**
 * Standalone rooms with recurrence settings spawn the next occurrence once the
 * current one completes. Existence check by host + title + start keeps retries safe.
 */
async function generateRoomRecurrence(room) {
  const settings = room.recurrenceSettings;
  if (!settings || settings.frequency === 'none' || !settings.nextSessionAt) return;
  const nextStart = nextOccurrence(room.confirmedStartAt || settings.nextSessionAt, {
    ...settings,
    startTime: room.confirmedStartAt
      ? `${String(room.confirmedStartAt.getUTCHours()).padStart(2, '0')}:${String(
          room.confirmedStartAt.getUTCMinutes()
        ).padStart(2, '0')}`
      : '07:00',
  });
  const exists = await ActivityRoom.findOne({
    host: room.host,
    title: room.title,
    confirmedStartAt: nextStart,
  });
  if (!exists) {
    const created = await ActivityRoom.create({
      title: room.title,
      slug: `${room.slug.split('-').slice(0, -1).join('-')}-${Math.random().toString(36).slice(2, 8)}`,
      description: room.description,
      category: room.category,
      coverImage: room.coverImage,
      host: room.host,
      coHosts: room.coHosts,
      visibility: room.visibility,
      joinPolicy: room.joinPolicy,
      roomStatus: 'scheduled',
      location: room.location,
      confirmedStartAt: nextStart,
      confirmedEndAt: addMinutes(nextStart, room.durationMinutes),
      nextAt: nextStart,
      timeZone: room.timeZone,
      minimumParticipants: room.minimumParticipants,
      maximumParticipants: room.maximumParticipants,
      skillLevel: room.skillLevel,
      cost: room.cost,
      equipment: room.equipment,
      durationMinutes: room.durationMinutes,
      roomRules: room.roomRules,
      cancellationPolicy: room.cancellationPolicy,
      waitlistEnabled: room.waitlistEnabled,
      recurrenceSettings: { ...settings, nextSessionAt: nextOccurrence(nextStart, settings) },
      memberCount: 1,
    });
    await Membership.create({
      room: created._id,
      user: room.host,
      role: 'host',
      membershipStatus: 'active',
      attendanceStatus: 'going',
    });
  }
  settings.nextSessionAt = nextStart;
  await room.save();
}

// -------------------------------------------------------- session recurrence

async function runSessionRecurrence() {
  try {
    const count = await generateDueSessions();
    if (count > 0) logger.debug('jobs.sessions_generated', { communities: count });
  } catch (err) {
    logger.error('jobs.session_recurrence_failed', { error: err.message });
  }
}

// -------------------------------------------------------------- retention

async function runRetention() {
  const cutoff = new Date(Date.now() - env.messageRetentionDays * 24 * 60 * 60 * 1000);
  const res = await Message.deleteMany({ createdAt: { $lt: cutoff } });
  if (res.deletedCount > 0) {
    logger.info('jobs.messages_pruned', { deleted: res.deletedCount });
  }
}
