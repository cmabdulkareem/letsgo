import mongoose from 'mongoose';
import { Community, CommunityMembership, ActivitySession, Category, User } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { slugify } from '../utils/slug.js';
import { notify, notifyMany } from './notificationService.js';
import { blockedIdsFor, isBlockedEitherWay } from './safetyService.js';
import { parsePagination, paged } from '../utils/response.js';

async function getCommunityOr404(communityId) {
  const community = await Community.findById(communityId)
    .populate('owner', 'displayName username avatar verificationStatus')
    .populate('moderators', 'displayName username avatar');
  if (!community) throw ApiError.notFound('Community not found');
  return community;
}

export async function getCommunityMembership(communityId, userId) {
  if (!userId) return null;
  return CommunityMembership.findOne({
    community: communityId,
    user: userId,
    status: { $in: ['active', 'pending'] },
  });
}

async function canModerate(community, userId) {
  return (
    String(community.owner._id || community.owner) === String(userId) ||
    community.moderators.some((m) => String(m._id || m) === String(userId))
  );
}

// ------------------------------------------------------------------ discovery

export async function listCommunities(query, viewerId) {
  const { q, category, city, sort = 'newest', membership } = query;
  const { page, limit, skip } = parsePagination(query);

  const match = { visibility: 'public', isArchived: false };
  const blocked = await blockedIdsFor(viewerId);
  if (blocked.length) match.owner = { $nin: blocked.map((id) => new mongoose.Types.ObjectId(id)) };
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ name: rx }, { description: rx }];
  }
  if (category) {
    const catQuery = mongoose.isValidObjectId(category) ? { $or: [{ _id: category }, { slug: category }] } : { slug: category };
    const cat = await Category.findOne(catQuery).select('_id');
    if (cat) match.category = cat._id;
  }
  if (city) match['defaultLocation.city'] = new RegExp(`^${city.trim()}$`, 'i');

  const sortStage = sort === 'members' ? { memberCount: -1 } : { createdAt: -1 };

  const pipeline = [
    { $match: match },
    { $sort: sortStage },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'categories',
        localField: 'category',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, slug: 1, icon: 1, color: 1 } }],
        as: 'category',
      },
    },
    { $unwind: '$category' },
    {
      $lookup: {
        from: 'activitysessions',
        let: { cid: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$community', '$$cid'] },
                  { $eq: ['$sessionStatus', 'scheduled'] },
                  { $gte: ['$startAt', new Date()] },
                ],
              },
            },
          },
          { $sort: { startAt: 1 } },
          { $limit: 1 },
          { $project: { title: 1, startAt: 1, endAt: 1, location: 1, capacity: 1, _id: 1 } },
        ],
        as: 'nextSession',
      },
    },
  ];

  const [items, total] = await Promise.all([
    Community.aggregate(pipeline),
    Community.countDocuments(match),
  ]);
  return paged(items, { page, limit, total });
}

export async function getCommunityDetail(communityId, user) {
  const community = await getCommunityOr404(communityId);
  const myMembership = user ? await getCommunityMembership(communityId, user._id) : null;
  const canManage = user ? await canModerate(community, user._id) : false;

  if (community.visibility === 'private' && (!myMembership || myMembership.status !== 'active') && !canManage) {
    throw ApiError.notFound('Community not found');
  }

  const [upcomingSessions, memberPreview] = await Promise.all([
    ActivitySession.find({
      community: communityId,
      sessionStatus: 'scheduled',
      startAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    })
      .sort({ startAt: 1 })
      .limit(10),
    CommunityMembership.find({ community: communityId, status: 'active' })
      .sort({ role: 1, joinedAt: 1 })
      .limit(12)
      .populate('user', 'displayName username avatar verificationStatus'),
  ]);

  return { community, myMembership, upcomingSessions, members: memberPreview, canManage };
}

// ------------------------------------------------------------- create/update

export async function createCommunity(data, user) {
  const category = await Category.findById(data.category);
  if (!category || !category.isActive) throw ApiError.badRequest('Choose a valid category');

  const slug = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 8)}`;
  const community = await Community.create({ ...data, slug, owner: user._id });
  await CommunityMembership.create({
    community: community._id,
    user: user._id,
    role: 'owner',
    status: 'active',
  });
  await Community.updateOne({ _id: community._id }, { $set: { memberCount: 1 } });

  // Generate the first recurring session if recurrence was configured.
  if (data.recurrenceSettings?.nextSessionAt) {
    await generateSessionFor(community, data.recurrenceSettings.nextSessionAt);
  }
  return getCommunityOr404(community._id);
}

export async function updateCommunity(communityId, data, user) {
  const community = await getCommunityOr404(communityId);
  if (!(await canModerate(community, user._id))) {
    throw ApiError.forbidden('Only the owner or a moderator can edit this community');
  }
  const allowed = [
    'name', 'description', 'category', 'coverImage', 'visibility', 'membershipPolicy',
    'communityRules', 'guidelines', 'defaultLocation', 'recurrenceSettings',
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) community[key] = data[key];
  }
  await community.save();
  return community;
}

// --------------------------------------------------------- membership lifecycle

export async function joinCommunity(communityId, user) {
  const community = await getCommunityOr404(communityId);
  if (community.visibility !== 'public') throw ApiError.forbidden('This is a private community');
  if (await isBlockedEitherWay(user._id, community.owner._id)) {
    throw ApiError.forbidden('You cannot interact with this community');
  }
  const existing = await getCommunityMembership(communityId, user._id);
  if (existing?.status === 'active') throw ApiError.conflict('You are already a member');
  if (existing?.status === 'pending') throw ApiError.conflict('Your request is pending review');

  const status = community.membershipPolicy === 'approval' ? 'pending' : 'active';
  try {
    await CommunityMembership.create({ community: communityId, user: user._id, status });
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('You already belong to this community');
    throw err;
  }
  if (status === 'active') {
    await Community.updateOne({ _id: communityId }, { $inc: { memberCount: 1 } });
  } else {
    notify(community.owner._id, {
      type: 'join_request_received',
      title: `${user.displayName} asked to join ${community.name}`,
      relatedEntity: { kind: 'community', id: community._id },
      url: `/communities/${community._id}?tab=members`,
    }).catch(() => {});
  }
  return { status };
}

export async function reviewMembership(communityId, userId, moderator, approve) {
  const community = await getCommunityOr404(communityId);
  if (!(await canModerate(community, moderator._id))) {
    throw ApiError.forbidden('Only the owner or a moderator can review requests');
  }
  const membership = await CommunityMembership.findOne({ community: communityId, user: userId, status: 'pending' });
  if (!membership) throw ApiError.notFound('Pending request not found');

  if (!approve) {
    membership.status = 'removed';
    await membership.save();
  } else {
    membership.status = 'active';
    membership.joinedAt = new Date();
    await membership.save();
    await Community.updateOne({ _id: communityId }, { $inc: { memberCount: 1 } });
  }
  notify(userId, {
    type: approve ? 'join_request_approved' : 'join_request_rejected',
    title: approve ? `You joined ${community.name}` : `Your request to join ${community.name} was declined`,
    relatedEntity: { kind: 'community', id: community._id },
    url: `/communities/${community._id}`,
  }).catch(() => {});
  return membership;
}

export async function leaveCommunity(communityId, user) {
  const community = await getCommunityOr404(communityId);
  const membership = await CommunityMembership.findOne({
    community: communityId,
    user: user._id,
    status: { $in: ['active', 'pending'] },
  });
  if (!membership) throw ApiError.notFound('Membership not found');
  if (membership.role === 'owner') {
    throw ApiError.badRequest('Transfer ownership before leaving your community');
  }
  const wasActive = membership.status === 'active';
  membership.status = 'left';
  await membership.save();
  if (wasActive) {
    await Community.updateOne({ _id: communityId }, { $inc: { memberCount: -1 } });
  }
  return community;
}

export async function listCommunityMembers(communityId, user, query) {
  const community = await getCommunityOr404(communityId);
  const myMembership = user ? await getCommunityMembership(communityId, user?._id) : null;
  if (community.visibility === 'private' && (!myMembership || myMembership.status !== 'active')) {
    throw ApiError.notFound('Community not found');
  }
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 30, maxLimit: 100 });
  const filter = { community: communityId, status: 'active' };
  const [items, total, pending] = await Promise.all([
    CommunityMembership.find(filter).sort({ role: 1, joinedAt: 1 }).skip(skip).limit(limit)
      .populate('user', 'displayName username avatar bio verificationStatus'),
    CommunityMembership.countDocuments(filter),
    canModerate(community, user?._id)
      ? CommunityMembership.find({ community: communityId, status: 'pending' })
          .sort({ createdAt: 1 })
          .populate('user', 'displayName username avatar bio city')
      : [],
  ]);
  return { ...paged(items, { page, limit, total }), pending };
}

// ------------------------------------------------------------------- sessions

export function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/** Next occurrence after `from`, honoring byWeekday + startTime + frequency. */
export function nextOccurrence(from, settings) {
  const [hh, mm] = String(settings.startTime || '07:00').split(':').map(Number);
  const stepDays = settings.frequency === 'biweekly' ? 14 : settings.frequency === 'monthly' ? 28 : 7;
  const weekdays = settings.byWeekday?.length ? [...settings.byWeekday].sort((a, b) => a - b) : [from.getDay()];

  for (let d = 1; d <= stepDays + 7; d += 1) {
    const candidate = new Date(from.getTime() + d * 24 * 60 * 60 * 1000);
    if (!weekdays.includes(candidate.getDay())) continue;
    candidate.setUTCHours(hh, mm, 0, 0);
    // Treat stored startTime as UTC for generation simplicity; the room's timeZone
    // governs display. This keeps recurrence math deterministic across DST changes.
    if (candidate > from) return candidate;
  }
  return new Date(from.getTime() + stepDays * 24 * 60 * 60 * 1000);
}

async function generateSessionFor(community, startAt) {
  const settings = community.recurrenceSettings;
  if (!settings) return null;
  const start = new Date(startAt);
  const dayKey = start.toISOString().slice(0, 10);
  try {
    const session = await ActivitySession.create({
      community: community._id,
      title: `${community.name} — session`,
      description: community.description?.slice(0, 500) || '',
      host: community.owner,
      startAt: start,
      endAt: addMinutes(start, settings.durationMinutes || 120),
      timeZone: settings.timeZone || 'Asia/Kolkata',
      location: {
        name: community.defaultLocation?.name || 'TBD',
        city: community.defaultLocation?.city || '',
        geo: community.defaultLocation?.geo,
      },
      capacity: 20,
      recurrenceKey: `${community._id}:${dayKey}`,
      sessionStatus: 'scheduled',
    });
    const members = await CommunityMembership.find({ community: community._id, status: 'active' }).select('user');
    await notifyMany(
      members.filter((m) => String(m.user) !== String(community.owner)).map((m) => m.user),
      {
        type: 'activity_reminder',
        title: `New ${community.name} session scheduled`,
        body: `Starts ${start.toISOString()}`,
        relatedEntity: { kind: 'session', id: session._id },
        url: `/communities/${community._id}?tab=sessions`,
      }
    );
    return session;
  } catch (err) {
    if (err.code === 11000) return null; // already generated — safe to retry
    throw err;
  }
}

/** Generate due recurring sessions for all communities; idempotent. */
export async function generateDueSessions(lookaheadMs = 48 * 60 * 60 * 1000) {
  const horizon = new Date(Date.now() + lookaheadMs);
  const communities = await Community.find({
    isArchived: false,
    'recurrenceSettings.nextSessionAt': { $lte: horizon },
  });
  for (const community of communities) {
    let cursor = community.recurrenceSettings.nextSessionAt;
    let guard = 0;
    while (cursor && cursor <= horizon && guard < 8) {
      await generateSessionFor(community, cursor);
      cursor = nextOccurrence(cursor, community.recurrenceSettings);
      guard += 1;
    }
    community.recurrenceSettings.nextSessionAt = cursor;
    await community.save();
  }
  return communities.length;
}

export async function listSessions(communityId, user, query) {
  const community = await getCommunityOr404(communityId);
  const myMembership = user ? await getCommunityMembership(communityId, user._id) : null;
  const isMember = myMembership?.status === 'active';
  if (community.visibility === 'private' && !isMember) throw ApiError.notFound('Community not found');

  const { page, limit, skip } = parsePagination(query, { defaultLimit: 12, maxLimit: 50 });
  const filter = { community: communityId };
  if (query.when === 'past') {
    filter.sessionStatus = { $in: ['completed', 'cancelled'] };
  } else {
    filter.sessionStatus = 'scheduled';
    filter.endAt = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
  }
  const [items, total] = await Promise.all([
    ActivitySession.find(filter).sort({ startAt: query.when === 'past' ? -1 : 1 }).skip(skip).limit(limit),
    ActivitySession.countDocuments(filter),
  ]);
  return paged(items, { page, limit, total });
}

export async function createSession(communityId, user, data) {
  const community = await getCommunityOr404(communityId);
  if (!(await canModerate(community, user._id))) {
    throw ApiError.forbidden('Only the owner or a moderator can create sessions');
  }
  if (data.startAt <= new Date()) throw ApiError.badRequest('Sessions must start in the future');
  const session = await ActivitySession.create({
    community: communityId,
    host: user._id,
    title: data.title,
    description: data.description || '',
    startAt: data.startAt,
    endAt: data.endAt,
    timeZone: data.timeZone || 'Asia/Kolkata',
    location: data.location,
    capacity: data.capacity,
  });
  const members = await CommunityMembership.find({ community: communityId, status: 'active' }).select('user');
  await notifyMany(members.filter((m) => String(m.user) !== String(user._id)).map((m) => m.user), {
    type: 'activity_reminder',
    title: `New session: ${session.title}`,
    relatedEntity: { kind: 'session', id: session._id },
    url: `/communities/${communityId}?tab=sessions`,
  });
  return session;
}

export async function rsvpSession(sessionId, user, going) {
  const session = await ActivitySession.findById(sessionId);
  if (!session) throw ApiError.notFound('Session not found');
  if (session.sessionStatus !== 'scheduled') throw ApiError.conflict('This session is closed');

  if (going) {
    const updated = await ActivitySession.updateOne(
      {
        _id: sessionId,
        'attendees.user': { $ne: user._id },
        $expr: { $lt: [{ $size: '$attendees' }, '$capacity'] },
      },
      { $push: { attendees: { user: user._id, status: 'going', updatedAt: new Date() } } }
    );
    if (updated.modifiedCount === 0) {
      const already = session.attendees.some((a) => String(a.user) === String(user._id));
      if (already) return ActivitySession.findById(sessionId);
      throw ApiError.conflict('This session is full');
    }
  } else {
    await ActivitySession.updateOne(
      { _id: sessionId },
      { $pull: { attendees: { user: user._id } } }
    );
  }
  return ActivitySession.findById(sessionId);
}

export async function cancelSession(sessionId, user) {
  const session = await ActivitySession.findById(sessionId);
  if (!session) throw ApiError.notFound('Session not found');
  if (session.community) {
    const community = await getCommunityOr404(session.community);
    if (!(await canModerate(community, user._id))) {
      throw ApiError.forbidden('Only the owner or a moderator can cancel sessions');
    }
  } else if (String(session.host) !== String(user._id)) {
    throw ApiError.forbidden('Only the host can cancel this session');
  }
  if (session.sessionStatus !== 'scheduled') throw ApiError.conflict('Session is already closed');
  session.sessionStatus = 'cancelled';
  session.cancelledAt = new Date();
  await session.save();

  await notifyMany(session.attendees.map((a) => a.user), {
    type: 'activity_cancelled',
    title: `"${session.title}" was cancelled`,
    relatedEntity: { kind: 'session', id: session._id },
    url: session.community ? `/communities/${session.community}?tab=sessions` : '/my-activity',
  });
  return session;
}
