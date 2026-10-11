import mongoose from 'mongoose';
import {
  ActivityRoom,
  Membership,
  JoinRequest,
  Category,
  User,
} from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { slugify } from '../utils/slug.js';
import { notify } from './notificationService.js';
import { isBlockedEitherWay, blockedIdsFor } from './safetyService.js';
import { paged, parsePagination } from '../utils/response.js';

const DISCOVERABLE_STATUSES = ['open', 'full', 'scheduling', 'scheduled', 'in_progress'];
const JOINABLE_STATUSES = ['open', 'scheduling', 'scheduled', 'full'];
const MAX_DISTANCE_KM = 200;

const FAR_FUTURE = new Date('9999-12-31T00:00:00.000Z');

// ---------------------------------------------------------------- discovery

export async function listActivities(query, viewerId) {
  const {
    q,
    category,
    city,
    dateFrom,
    dateTo,
    timeOfDay,
    skillLevel,
    hasSpots,
    cost,
    sort = 'newest',
    lat,
    lng,
    maxKm,
    status,
  } = query;
  const { page, limit, skip } = parsePagination(query);

  const match = { visibility: 'public', roomStatus: { $in: DISCOVERABLE_STATUSES } };

  const blocked = await blockedIdsFor(viewerId);
  if (blocked.length) match.host = { $nin: blocked.map((id) => new mongoose.Types.ObjectId(id)) };

  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ title: rx }, { description: rx }];
  }
  if (category) {
    const catQuery = mongoose.isValidObjectId(category) ? { $or: [{ _id: category }, { slug: category }] } : { slug: category };
    const cat = await Category.findOne(catQuery).select('_id');
    if (cat) match.category = cat._id;
  }
  if (city) match['location.city'] = new RegExp(`^${String(city).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
  if (status && DISCOVERABLE_STATUSES.includes(status)) match.roomStatus = status;
  if (skillLevel) match.skillLevel = skillLevel;
  if (cost === 'free') match['cost.isFree'] = true;
  if (cost === 'paid') match['cost.isFree'] = false;

  const hasGeo = Number.isFinite(lat) && Number.isFinite(lng);
  const distanceKm = hasGeo ? `$${'distance'}` : null;

  const pipeline = [];
  if (hasGeo) {
    pipeline.push({
      $geoNear: {
        near: { type: 'Point', coordinates: [Number(lng), Number(lat)] },
        distanceField: 'distance',
        distanceMultiplier: 0.001, // meters -> km
        spherical: true,
        key: 'location.geo',
        ...(maxKm ? { maxDistance: Math.min(Number(maxKm), MAX_DISTANCE_KM) * 1000 } : {}),
        query: match,
      },
    });
  } else {
    pipeline.push({ $match: match });
  }

  const addFields = {
    spotsLeft: { $subtract: ['$maximumParticipants', '$memberCount'] },
  };
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    addFields.relevance = {
      $add: [
        { $cond: [{ $regexMatch: { input: '$title', regex: rx } }, 2, 0] },
        { $cond: [{ $regexMatch: { input: '$description', regex: rx } }, 1, 0] },
      ],
    };
  }
  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) range.$lte = new Date(`${dateTo}T23:59:59.999Z`);
    match.nextAt = range;
  }
  if (timeOfDay) {
    const hours = { morning: [5, 12], afternoon: [12, 17], evening: [17, 21], night: [21, 29] }[timeOfDay];
    if (hours) {
      match.$expr = {
        $or: [
          { $eq: ['$nextAt', null] },
          { $and: [{ $gte: [{ $hour: '$nextAt' }, hours[0]] }, { $lt: [{ $hour: '$nextAt' }, hours[1]] }] },
        ],
      };
    }
  }
  pipeline.push({ $addFields: addFields });
  if (hasSpots === 'true') pipeline.push({ $match: { spotsLeft: { $gt: 0 } } });

  const sortStage =
    sort === 'distance' && hasGeo
      ? { distance: 1 }
      : sort === 'upcoming'
        ? { sortUpcoming: 1, createdAt: -1 }
        : sort === 'relevance' && q
          ? { relevance: -1, createdAt: -1 }
          : { createdAt: -1 };
  if (sort === 'upcoming') {
    pipeline.push({ $addFields: { sortUpcoming: { $ifNull: ['$nextAt', FAR_FUTURE] } } });
  }
  pipeline.push({ $sort: sortStage }, { $skip: skip }, { $limit: limit });

  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'host',
        foreignField: '_id',
        pipeline: [{ $project: { displayName: 1, username: 1, avatar: 1, 'verificationStatus.verifiedBadge': 1 } }],
        as: 'host',
      },
    },
    { $unwind: '$host' },
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
        from: 'memberships',
        let: { roomId: '$_id' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$room', '$$roomId'] }, { $eq: ['$membershipStatus', 'active'] }] } } },
          { $limit: 4 },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              pipeline: [{ $project: { displayName: 1, username: 1, avatar: 1 } }],
              as: 'user',
            },
          },
          { $unwind: '$user' },
          { $project: { _id: '$user._id', displayName: '$user.displayName', username: '$user.username', avatar: '$user.avatar' } },
        ],
        as: 'membersPreview',
      },
    }
  );

  const [items, total] = await Promise.all([
    ActivityRoom.aggregate(pipeline),
    ActivityRoom.countDocuments(
      hasGeo ? { ...match, 'location.geo': { $exists: true, $ne: null } } : match
    ),
  ]);
  // distance is in km after distanceMultiplier; round for a clean API.
  for (const item of items) {
    if (typeof item.distance === 'number') item.distance = Math.round(item.distance * 10) / 10;
  }
  return paged(items, { page, limit, total });
}

// ------------------------------------------------------------------- detail

async function getRoomOr404(roomId) {
  const room = await ActivityRoom.findById(roomId).populate('host', 'displayName username avatar verificationStatus bio');
  if (!room) throw ApiError.notFound('Activity not found');
  return room;
}

export async function getMembership(roomId, userId) {
  if (!userId) return null;
  return Membership.findOne({
    room: roomId,
    user: userId,
    membershipStatus: { $in: ['active', 'waitlisted'] },
  });
}

export async function canManageRoom(room, userId) {
  return (
    String(room.host._id || room.host) === String(userId) ||
    room.coHosts.some((c) => String(c) === String(userId))
  );
}

export async function getActivityDetail(roomId, user) {
  const room = await getRoomOr404(roomId);
  const isMember = user ? Boolean(await getMembership(roomId, user._id)) : false;
  const isManager = user ? await canManageRoom(room, user._id) : false;

  if (room.visibility === 'private' && !isMember && !isManager) {
    // Do not leak existence of private rooms.
    throw ApiError.notFound('Activity not found');
  }

  const [membersPreview, openPoll, myJoinRequest] = await Promise.all([
    Membership.find({ room: roomId, membershipStatus: 'active' })
      .sort({ role: 1, joinedAt: 1 })
      .limit(12)
      .populate('user', 'displayName username avatar verificationStatus'),
    room.visibility === 'private' && !isMember
      ? null
      : import('./pollService.js').then((m) => m.getOpenPollForRoom(roomId, user?._id)),
    user
      ? JoinRequest.findOne({ room: roomId, user: user._id, status: 'pending' })
      : null,
  ]);

  const blocked = user ? await isBlockedEitherWay(user._id, room.host._id) : false;

  const detail = {
    room: room.toObject(),
    host: room.host,
    members: membersPreview,
    myMembership: user ? await getMembership(roomId, user._id) : null,
    myJoinRequest,
    openPoll,
    hostBlockedViewer: blocked,
  };
  return detail;
}

// -------------------------------------------------------------- create/edit

export async function createActivity(data, user) {
  const category = await Category.findById(data.category);
  if (!category || !category.isActive) throw ApiError.badRequest('Choose a valid category');

  const slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 8)}`;
  const room = await ActivityRoom.create({
    ...data,
    slug,
    host: user._id,
    nextAt: data.confirmedStartAt || null,
  });

  await Membership.create({
    room: room._id,
    user: user._id,
    role: 'host',
    membershipStatus: 'active',
    attendanceStatus: 'going',
  });
  await ActivityRoom.updateOne({ _id: room._id }, { $set: { memberCount: 1 } });
  return ActivityRoom.findById(room._id);
}

export async function updateActivity(roomId, data, user) {
  const room = await getRoomOr404(roomId);
  if (!(await canManageRoom(room, user._id))) throw ApiError.forbidden('Only the host can edit this activity');

  const locked = ['completed', 'cancelled', 'archived'];
  if (locked.includes(room.roomStatus)) {
    throw ApiError.conflict(`A ${room.roomStatus} activity cannot be edited`);
  }

  if (data.maximumParticipants !== undefined) {
    if (data.maximumParticipants < room.memberCount) {
      throw ApiError.badRequest(`Capacity cannot be below the current member count (${room.memberCount})`);
    }
  }
  if (data.confirmedStartAt !== undefined && data.confirmedStartAt !== null) {
    data.nextAt = data.confirmedStartAt;
  }

  const allowed = [
    'title', 'description', 'category', 'coverImage', 'visibility', 'location',
    'confirmedStartAt', 'confirmedEndAt', 'timeZone', 'minimumParticipants',
    'maximumParticipants', 'skillLevel', 'cost', 'equipment', 'durationMinutes',
    'ageRestriction', 'roomRules', 'cancellationPolicy', 'waitlistEnabled',
    'joinPolicy', 'recurrenceSettings', 'attendanceConfirmationRequired', 'nextAt',
  ];
  for (const key of allowed) {
    if (data[key] !== undefined) room[key] = data[key];
  }
  if (room.maximumParticipants && room.memberCount >= room.maximumParticipants && room.roomStatus === 'open') {
    room.roomStatus = 'full';
  } else if (room.roomStatus === 'full' && room.memberCount < room.maximumParticipants) {
    room.roomStatus = room.confirmedStartAt ? 'scheduled' : 'open';
  }
  await room.save();
  return room;
}

export async function cancelActivity(roomId, user) {
  const room = await getRoomOr404(roomId);
  if (!(await canManageRoom(room, user._id))) throw ApiError.forbidden('Only the host can cancel this activity');
  if (['completed', 'cancelled', 'archived'].includes(room.roomStatus)) {
    throw ApiError.conflict('This activity is already closed');
  }
  room.roomStatus = 'cancelled';
  await room.save();

  const members = await Membership.find({ room: roomId, membershipStatus: 'active' }).select('user');
  await Promise.all(
    members
      .filter((m) => String(m.user) !== String(user._id))
      .map((m) =>
        notify(m.user, {
          type: 'activity_cancelled',
          title: `"${room.title}" was cancelled`,
          body: 'The host cancelled this activity.',
          relatedEntity: { kind: 'room', id: room._id },
          url: `/activities/${room._id}`,
        })
      )
  );
  return room;
}

// ------------------------------------------------------- membership lifecycle

async function assertNotBlocked(viewerId, hostId) {
  if (await isBlockedEitherWay(viewerId, hostId)) {
    throw ApiError.forbidden('You cannot interact with this activity');
  }
}

export async function joinRoom(roomId, user) {
  const room = await getRoomOr404(roomId);
  if (room.visibility !== 'public') throw ApiError.forbidden('This is a private activity');
  if (room.joinPolicy !== 'open') throw ApiError.conflict('This activity requires host approval to join');
  if (!JOINABLE_STATUSES.includes(room.roomStatus)) {
    throw ApiError.conflict('This activity is not open for joining');
  }
  await assertNotBlocked(user._id, room.host._id);

  const existing = await getMembership(roomId, user._id);
  if (existing?.membershipStatus === 'active') throw ApiError.conflict('You are already a member');
  if (existing?.membershipStatus === 'waitlisted') throw ApiError.conflict('You are already on the waitlist');

  // Atomic capacity claim: only one concurrent request can win the last spot.
  const claimed = await ActivityRoom.updateOne(
    {
      _id: room._id,
      memberCount: { $lt: room.maximumParticipants },
      roomStatus: { $in: ['open', 'scheduling', 'scheduled'] },
    },
    { $inc: { memberCount: 1 } }
  );

  if (claimed.modifiedCount === 1) {
    try {
      const membership = await Membership.create({
        room: room._id,
        user: user._id,
        role: 'member',
        membershipStatus: 'active',
      });
      if (room.memberCount + 1 >= room.maximumParticipants && room.roomStatus !== 'full') {
        await ActivityRoom.updateOne(
          { _id: room._id, memberCount: { $gte: room.maximumParticipants } },
          { $set: { roomStatus: 'full' } }
        );
      }
      notify(room.host._id, {
        type: 'member_joined',
        title: `${user.displayName} joined "${room.title}"`,
        relatedEntity: { kind: 'room', id: room._id },
        url: `/rooms/${room._id}`,
      }).catch(() => {});
      return { membership, waitlisted: false, room: await getRoomOr404(roomId) };
    } catch (err) {
      // Lost a membership race (unique index) — roll the counter back.
      await ActivityRoom.updateOne({ _id: room._id }, { $inc: { memberCount: -1 } });
      if (err.code === 11000) throw ApiError.conflict('You are already a member of this activity');
      throw err;
    }
  }

  // Full — offer the waitlist when enabled.
  if (room.waitlistEnabled) {
    try {
      const membership = await Membership.create({
        room: room._id,
        user: user._id,
        role: 'member',
        membershipStatus: 'waitlisted',
      });
      return { membership, waitlisted: true, room: await getRoomOr404(roomId) };
    } catch (err) {
      if (err.code === 11000) throw ApiError.conflict('You are already on the waitlist');
      throw err;
    }
  }
  throw ApiError.conflict('This activity is full');
}

export async function requestToJoin(roomId, user, message) {
  const room = await getRoomOr404(roomId);
  if (room.visibility !== 'public') throw ApiError.forbidden('This is a private activity');
  if (room.joinPolicy !== 'approval') throw ApiError.conflict('This activity can be joined directly');
  if (!JOINABLE_STATUSES.filter((s) => s !== 'full').includes(room.roomStatus)) {
    throw ApiError.conflict('This activity is not open for joining');
  }
  await assertNotBlocked(user._id, room.host._id);
  if (await getMembership(roomId, user._id)) throw ApiError.conflict('You already belong to this activity');

  try {
    const request = await JoinRequest.create({ room: room._id, user: user._id, message });
    notify(room.host._id, {
      type: 'join_request_received',
      title: `${user.displayName} requested to join "${room.title}"`,
      body: message,
      relatedEntity: { kind: 'room', id: room._id },
      url: `/rooms/${roomId}?tab=requests`,
    }).catch(() => {});
    return request;
  } catch (err) {
    if (err.code === 11000) throw ApiError.conflict('You already have a pending request');
    throw err;
  }
}

export async function reviewJoinRequest(roomId, requestId, user, approve) {
  const room = await getRoomOr404(roomId);
  if (!(await canManageRoom(room, user._id))) throw ApiError.forbidden('Only the host can review requests');

  const request = await JoinRequest.findOne({ _id: requestId, room: roomId, status: 'pending' });
  if (!request) throw ApiError.notFound('Request not found or already reviewed');

  // Capacity must be claimed before approval; otherwise the request stays pending.
  if (approve) {
    const claimed = await ActivityRoom.updateOne(
      {
        _id: room._id,
        memberCount: { $lt: room.maximumParticipants },
        roomStatus: { $in: ['open', 'scheduling', 'scheduled'] },
      },
      { $inc: { memberCount: 1 } }
    );
    if (claimed.modifiedCount === 0) {
      throw ApiError.conflict('Activity is full — reject or waitlist this request instead');
    }
    try {
      await Membership.create({
        room: room._id,
        user: request.user,
        role: 'member',
        membershipStatus: 'active',
      });
    } catch (err) {
      await ActivityRoom.updateOne({ _id: room._id }, { $inc: { memberCount: -1 } });
      if (err.code === 11000) {
        request.status = 'approved';
        request.reviewedBy = user._id;
        request.reviewedAt = new Date();
        await request.save();
        throw ApiError.conflict('User is already a member');
      }
      throw err;
    }
  }

  request.status = approve ? 'approved' : 'rejected';
  request.reviewedBy = user._id;
  request.reviewedAt = new Date();
  await request.save();

  notify(request.user, {
    type: approve ? 'join_request_approved' : 'join_request_rejected',
    title: approve
      ? `You joined "${room.title}"`
      : `Your request to join "${room.title}" was declined`,
    relatedEntity: { kind: 'room', id: room._id },
    url: `/rooms/${room._id}`,
  }).catch(() => {});

  return { request, room: await getRoomOr404(roomId) };
}

async function promoteWaitlist(room) {
  if (!room.waitlistEnabled) return;
  const next = await Membership.findOne({ room: room._id, membershipStatus: 'waitlisted' }).sort({
    joinedAt: 1,
  });
  if (!next) return;

  const claimed = await ActivityRoom.updateOne(
    { _id: room._id, memberCount: { $lt: room.maximumParticipants } },
    { $inc: { memberCount: 1 } }
  );
  if (claimed.modifiedCount === 0) return; // still full

  next.membershipStatus = 'active';
  next.joinedAt = new Date();
  next.attendanceStatus = 'none';
  await next.save();

  notify(next.user, {
    type: 'waitlist_promoted',
    title: `A spot opened up in "${room.title}" — you're in!`,
    relatedEntity: { kind: 'room', id: room._id },
    url: `/rooms/${room._id}`,
  }).catch(() => {});
}

export async function leaveRoom(roomId, user) {
  const room = await getRoomOr404(roomId);
  const membership = await Membership.findOne({
    room: roomId,
    user: user._id,
    membershipStatus: { $in: ['active', 'waitlisted'] },
  });
  if (!membership) throw ApiError.notFound('Membership not found');
  if (membership.role === 'host') throw ApiError.badRequest('The host cannot leave — cancel the activity instead');

  const wasWaitlisted = membership.membershipStatus === 'waitlisted';
  membership.membershipStatus = 'left';
  membership.leftAt = new Date();
  await membership.save();

  if (!wasWaitlisted) {
    await ActivityRoom.updateOne({ _id: room._id }, { $inc: { memberCount: -1 } });
    const fresh = await getRoomOr404(roomId);
    if (fresh.roomStatus === 'full' && fresh.memberCount < fresh.maximumParticipants) {
      await ActivityRoom.updateOne(
        { _id: room._id },
        { $set: { roomStatus: fresh.confirmedStartAt ? 'scheduled' : 'open' } }
      );
    }
    await promoteWaitlist(fresh);
  }

  if (String(room.host._id) !== String(user._id)) {
    notify(room.host._id, {
      type: 'member_left',
      title: `${user.displayName} left "${room.title}"`,
      relatedEntity: { kind: 'room', id: room._id },
      url: `/rooms/${roomId}`,
    }).catch(() => {});
  }
  return getRoomOr404(roomId);
}

export async function removeMember(roomId, memberUserId, user) {
  const room = await getRoomOr404(roomId);
  if (!(await canManageRoom(room, user._id))) throw ApiError.forbidden('Only the host can remove members');
  if (String(memberUserId) === String(user._id)) throw ApiError.badRequest('Use leave to remove yourself');

  const membership = await Membership.findOne({
    room: roomId,
    user: memberUserId,
    membershipStatus: 'active',
  });
  if (!membership) throw ApiError.notFound('Active membership not found');
  if (membership.role === 'host') throw ApiError.forbidden('The host cannot be removed');

  membership.membershipStatus = 'removed';
  membership.leftAt = new Date();
  await membership.save();
  await ActivityRoom.updateOne({ _id: room._id }, { $inc: { memberCount: -1 } });

  const fresh = await getRoomOr404(roomId);
  if (fresh.roomStatus === 'full' && fresh.memberCount < fresh.maximumParticipants) {
    await ActivityRoom.updateOne(
      { _id: room._id },
      { $set: { roomStatus: fresh.confirmedStartAt ? 'scheduled' : 'open' } }
    );
  }
  await promoteWaitlist(fresh);

  notify(memberUserId, {
    type: 'moderation_action',
    title: `You were removed from "${room.title}"`,
    relatedEntity: { kind: 'room', id: room._id },
    url: `/activities/${room._id}`,
  }).catch(() => {});
  return fresh;
}

// --------------------------------------------------------------- attendance

export async function setMyAttendance(roomId, user, status) {
  const room = await getRoomOr404(roomId);
  const membership = await Membership.findOne({
    room: roomId,
    user: user._id,
    membershipStatus: 'active',
  });
  if (!membership) throw ApiError.forbidden('Only members can confirm attendance');

  if (!['going', 'notGoing', 'none'].includes(status)) {
    throw ApiError.badRequest('Use going, notGoing or none');
  }
  if (room.attendanceConfirmationRequired && room.confirmedStartAt) {
    const deadline = new Date(room.confirmedStartAt.getTime() - 60 * 60 * 1000);
    if (new Date() > deadline && status === 'going') {
      throw ApiError.conflict('The confirmation deadline for this activity has passed');
    }
  }
  membership.attendanceStatus = status;
  membership.attendanceUpdatedAt = new Date();
  await membership.save();
  return membership;
}

export async function hostSetAttendance(roomId, memberUserId, user, status) {
  const room = await getRoomOr404(roomId);
  if (!(await canManageRoom(room, user._id))) throw ApiError.forbidden('Only the host can check members in');
  if (!['attended', 'noShow', 'going', 'none'].includes(status)) {
    throw ApiError.badRequest('Use attended, noShow, going or none');
  }
  const membership = await Membership.findOne({
    room: roomId,
    user: memberUserId,
    membershipStatus: 'active',
  });
  if (!membership) throw ApiError.notFound('Active membership not found');

  membership.attendanceStatus = status;
  membership.attendanceUpdatedAt = new Date();
  await membership.save();
  return membership;
}

// ------------------------------------------------------------------- members

export async function listMembers(roomId, user, query) {
  const room = await getRoomOr404(roomId);
  const isMember = user ? Boolean(await getMembership(roomId, user._id)) : false;
  if (room.visibility === 'private' && !isMember) throw ApiError.notFound('Activity not found');

  const { page, limit, skip } = parsePagination(query, { defaultLimit: 24, maxLimit: 100 });
  const filter = { room: roomId, membershipStatus: 'active' };
  const [items, total] = await Promise.all([
    Membership.find(filter)
      .sort({ role: 1, joinedAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'displayName username avatar bio city verificationStatus privacySettings'),
    Membership.countDocuments(filter),
  ]);
  return paged(items, { page, limit, total });
}

// ---------------------------------------------------------------------- save

export async function saveActivity(roomId, user) {
  await getRoomOr404(roomId);
  await User.updateOne({ _id: user._id }, { $addToSet: { savedActivities: roomId } });
}

export async function unsaveActivity(roomId, user) {
  await User.updateOne({ _id: user._id }, { $pull: { savedActivities: roomId } });
}

export async function listSaved(user, query) {
  const { page, limit, skip } = parsePagination(query);
  const me = await User.findById(user._id).select('savedActivities');
  const ids = me.savedActivities || [];
  const [items, total] = await Promise.all([
    ActivityRoom.find({ _id: { $in: ids }, roomStatus: { $nin: ['draft', 'archived'] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('host', 'displayName username avatar')
      .populate('category', 'name slug icon color'),
    ids.length,
  ]);
  return paged(items, { page, limit, total });
}

export async function listJoinRequests(roomId, user, query) {
  const room = await getRoomOr404(roomId);
  if (!(await canManageRoom(room, user._id))) throw ApiError.forbidden('Only the host can view requests');
  const { page, limit, skip } = parsePagination(query, { defaultLimit: 20, maxLimit: 100 });
  const [items, total] = await Promise.all([
    JoinRequest.find({ room: roomId, status: 'pending' })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'displayName username avatar bio city verificationStatus'),
    JoinRequest.countDocuments({ room: roomId, status: 'pending' }),
  ]);
  return paged(items, { page, limit, total });
}
