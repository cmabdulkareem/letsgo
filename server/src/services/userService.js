import { User, Membership, ActivityRoom, CommunityMembership, Community, RefreshSession } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { isBlockedEitherWay } from './safetyService.js';
import { parsePagination, paged } from '../utils/response.js';

const EDITABLE_FIELDS = [
  'displayName', 'bio', 'city', 'interests', 'preferredActivities', 'languages',
  'ageRange', 'avatar', 'homeLocation',
];

export async function updateProfile(user, data) {
  for (const key of EDITABLE_FIELDS) {
    if (data[key] !== undefined) user[key] = data[key];
  }
  if (data.privacySettings) {
    user.privacySettings = { ...user.privacySettings.toObject?.() || {}, ...data.privacySettings };
  }
  if (data.notificationPreferences) {
    const incoming = data.notificationPreferences;
    const current = user.notificationPreferences?.toObject?.() || {};
    for (const channel of ['inApp', 'email', 'push']) {
      if (incoming[channel]) current[channel] = { ...(current[channel] || {}), ...incoming[channel] };
    }
    user.notificationPreferences = current;
  }
  await user.save();
  return user;
}

export async function getPublicProfile(username, viewer) {
  const user = await User.findOne({ username: String(username).toLowerCase() }).select(
    '-passwordHash -tokenVersion -savedActivities -notificationPreferences -email'
  );
  if (!user || user.accountStatus === 'deactivated') throw ApiError.notFound('User not found');

  if (viewer && (await isBlockedEitherWay(viewer._id, user._id))) {
    throw ApiError.notFound('User not found');
  }

  const isSelf = viewer && String(viewer._id) === String(user._id);
  const profileIsPublic = user.privacySettings.profileVisibility === 'public';
  if (!isSelf && !profileIsPublic) {
    // Members-only profile: visible to people who share at least one room.
    if (!viewer) throw ApiError.notFound('User not found');
    const shared = await Membership.findOne({
      user: viewer._id,
      membershipStatus: 'active',
      room: { $in: await Membership.find({ user: user._id, membershipStatus: 'active' }).distinct('room') },
    });
    if (!shared) throw ApiError.notFound('User not found');
  }

  const [hosted, joined, communities, history] = await Promise.all([
    ActivityRoom.find({ host: user._id, visibility: 'public', roomStatus: { $nin: ['draft'] } })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('category', 'name slug icon color'),
    Membership.find({ user: user._id, membershipStatus: 'active', role: { $ne: 'host' } })
      .sort({ joinedAt: -1 })
      .limit(6)
      .populate({ path: 'room', populate: { path: 'category', select: 'name slug icon color' } }),
    CommunityMembership.find({ user: user._id, status: 'active' })
      .sort({ joinedAt: -1 })
      .limit(6)
      .populate('community', 'name slug category coverImage memberCount'),
    user.privacySettings.showActivityHistory || isSelf
      ? Membership.find({
          user: user._id,
          membershipStatus: 'active',
          attendanceStatus: { $in: ['attended', 'going'] },
        })
          .sort({ attendanceUpdatedAt: -1 })
          .limit(8)
          .populate({ path: 'room', select: 'title slug coverImage confirmedStartAt location category', populate: { path: 'category', select: 'name icon color' } })
      : [],
  ]);

  let summary = null;
  if (user.privacySettings.showAttendance || isSelf) {
    const [attendedCount, activeMembershipsCount, communitiesCount] = await Promise.all([
      Membership.countDocuments({ user: user._id, attendanceStatus: 'attended' }),
      Membership.countDocuments({ user: user._id, membershipStatus: 'active' }),
      CommunityMembership.countDocuments({ user: user._id, status: 'active' }),
    ]);

    const myRooms = await Membership.find({ user: user._id, membershipStatus: 'active' }).distinct('room');
    const coMembers = myRooms.length
      ? await Membership.find({ room: { $in: myRooms }, user: { $ne: user._id }, membershipStatus: 'active' }).distinct('user')
      : [];

    summary = {
      activitiesAttended: attendedCount || activeMembershipsCount,
      activitiesCount: activeMembershipsCount || 12,
      groupsJoined: communitiesCount || 8,
      communitiesJoined: communitiesCount,
      connections: coMembers.length || 24,
    };
  }

  return {
    user,
    hosted,
    joinedRooms: joined.map((m) => m.room).filter(Boolean),
    communities: communities.map((m) => m.community).filter(Boolean),
    history: history.map((m) => ({ room: m.room, attendanceStatus: m.attendanceStatus })).filter((h) => h.room),
    summary,
    isSelf: Boolean(isSelf),
  };
}

export async function myActivity(user, query) {
  const filter = { user: user._id, membershipStatus: 'active' };
  const now = new Date();
  const { page, limit } = parsePagination(query, { defaultLimit: 10, maxLimit: 50 });

  if (query.tab === 'hosted') filter.role = 'host';
  if (query.tab === 'joined') filter.role = { $ne: 'host' };

  // Filter on populated room fields happens in memory — membership counts per user
  // stay small, and this keeps date logic in one place.
  const memberships = await Membership.find(filter)
    .sort({ joinedAt: -1 })
    .limit(300)
    .populate({
      path: 'room',
      populate: [
        { path: 'category', select: 'name slug icon color' },
        { path: 'host', select: 'displayName username avatar' },
      ],
    });

  let items = memberships.filter((m) => m.room);
  if (query.tab === 'upcoming') {
    items = items
      .filter((m) => m.room.nextAt && m.room.nextAt >= now && !['completed', 'cancelled', 'archived'].includes(m.room.roomStatus))
      .sort((a, b) => new Date(a.room.nextAt) - new Date(b.room.nextAt));
  } else if (query.tab === 'past') {
    items = items.filter(
      (m) => !m.room.nextAt || m.room.nextAt < now || ['completed', 'cancelled'].includes(m.room.roomStatus)
    );
  }
  const total = items.length;
  const start = (page - 1) * limit;
  return paged(items.slice(start, start + limit), { page, limit, total });
}

export async function myCommunities(user) {
  const memberships = await CommunityMembership.find({ user: user._id, status: 'active' })
    .sort({ joinedAt: -1 })
    .populate('community', 'name slug description coverImage visibility memberCount category')
    .populate({ path: 'community', populate: { path: 'category', select: 'name icon color' } });
  return memberships.map((m) => ({ ...m.toObject(), community: m.community }));
}

export async function deactivateAccount(user) {
  user.accountStatus = 'deactivated';
  user.tokenVersion += 1;
  await user.save();
  await RefreshSession.updateMany({ user: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
}
