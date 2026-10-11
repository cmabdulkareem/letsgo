/**
 * Development seed — creates fictional users, categories, rooms, communities,
 * sessions, polls, votes, messages and notifications for the full demo journey.
 *
 * Refuses to run when NODE_ENV=production. Never wire this into the server boot.
 *
 *   cd server && npm run seed
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import env from '../src/config/env.js';
import logger from '../src/config/logger.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import {
  User, Category, ActivityRoom, Membership, JoinRequest, SchedulingPoll,
  SchedulingVote, Community, CommunityMembership, ActivitySession, Message,
  Notification, Block, Report, RefreshSession, EmailVerificationToken,
  PasswordResetToken, PushSubscription, AuditLog,
} from '../src/models/index.js';
import { slugify } from '../src/utils/slug.js';

if (env.isProduction) {
  console.error('Refusing to seed: NODE_ENV is production.');
  process.exit(1);
}

const CLEAR = process.argv.includes('--clear');
const PASSWORD = 'Passw0rd!23';
const ADMIN_PASSWORD = 'Admin!2345';

// IST is UTC+5:30. Seed dates are "local Kasaragod time", stored as UTC.
function ist(daysFromNow, hh = 7, mm = 0) {
  const base = new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hh - 5, mm - 30)
  );
}
function nextWeekday(weekday, hh = 7, mm = 0) {
  const d = new Date();
  let add = (weekday - d.getUTCDay() + 7) % 7;
  if (add === 0) add = 7;
  return ist(add, hh, mm);
}

const CATEGORIES = [
  ['Cricket', 'cricket', '#10B981', 'Bat-and-ball matches from gully to turf'],
  ['Football', 'circle-dot', '#2563EB', 'Casual kickabouts and competitive matches'],
  ['Badminton', 'zap', '#F59E0B', 'Court time for singles and doubles'],
  ['Basketball', 'circle', '#EA580C', 'Hoops, pickup games and shooting practice'],
  ['Volleyball', 'triangle', '#0D9488', 'Beach and court volleyball'],
  ['Running & Walking', 'footprints', '#84CC16', 'Group runs, jogs and walking clubs'],
  ['Cycling', 'bike', '#0891B2', 'Road rides, trails and casual cycles'],
  ['Trekking & Hiking', 'mountain', '#16A34A', 'Day hikes and multi-day treks'],
  ['Gym & Fitness', 'dumbbell', '#DC2626', 'Workout partners and fitness groups'],
  ['Board Games', 'dices-5', '#7C3AED', 'Strategy nights and casual tabletop'],
  ['Video Games', 'gamepad-2', '#4F46E5', 'LAN sessions and online squads'],
  ['Movies', 'clapperboard', '#DB2777', 'Group movie outings and discussions'],
  ['Café Visits', 'coffee', '#92400E', 'Coffee, conversation and remote-work meetups'],
  ['Food Outings', 'utensils-crossed', '#CA8A04', 'Food walks, new restaurants and street food'],
  ['Photography', 'camera', '#475569', 'Photo walks and portfolio feedback'],
  ['Music', 'music', '#9333EA', 'Jam sessions and open mics'],
  ['Workshops & Learning', 'graduation-cap', '#0369A1', 'Skill swaps and study groups'],
  ['Travel & Exploration', 'plane', '#0E7490', 'Day trips and weekend getaways'],
  ['Other', 'sparkles', '#64748B', 'Everything else people do together'],
];

const USERS = [
  {
    username: 'aman.ka',
    displayName: 'Aman',
    bio: 'Love sports, outdoor activities and meeting new people.',
    city: 'Kasaragod',
    interests: ['cricket', 'football', 'trekking', 'photography', 'board games', 'food outings', 'cycling', 'travel & exploration'],
    languages: ['Malayalam', 'English', 'Hindi'],
    verifiedBadge: true,
    badges: [
      { id: 'activity_starter', title: 'Activity Starter', icon: 'trophy', description: 'Hosted popular activity rooms' },
      { id: 'team_player', title: 'Team Player', icon: 'medal', description: 'Reliable active participant' },
      { id: 'outdoor_explorer', title: 'Outdoor Explorer', icon: 'mountain', description: 'Explored outdoor & sports activities' },
    ],
  },
  { username: 'priya_n', displayName: 'Priya', bio: 'Weekend trekker and badminton enthusiast.', city: 'Kasaragod', interests: ['trekking', 'badminton', 'photography'], languages: ['Malayalam', 'English'] },
  { username: 'rohit_r', displayName: 'Rohit', bio: 'Will play any sport that involves a ball.', city: 'Kasaragod', interests: ['cricket', 'football', 'basketball'], languages: ['Kannada', 'English', 'Hindi'] },
  { username: 'sneha_s', displayName: 'Sneha', bio: 'Organiser at heart. I keep the group chats moving.', city: 'Kasaragod', interests: ['board games', 'café visits', 'movies'], languages: ['Malayalam', 'English'] },
  { username: 'kiran_kb', displayName: 'Kiran', bio: 'Cyclist chasing sunrises on the coastal road.', city: 'Kasaragod', interests: ['cycling', 'running & walking', 'travel & exploration'], languages: ['Malayalam', 'Tulu', 'English'] },
  { username: 'arjun_dev', displayName: 'Arjun', bio: 'Software dev, footballer, part-time goalkeeper.', city: 'Kasaragod', interests: ['football', 'video games', 'gym & fitness'], languages: ['Malayalam', 'English'] },
  { username: 'divya_m', displayName: 'Divya', bio: 'Photography walks and filter coffee.', city: 'Kanhangad', interests: ['photography', 'café visits', 'travel & exploration'], languages: ['Malayalam', 'English'] },
  { username: 'farhan_a', displayName: 'Farhan', bio: 'Cricket all-rounder, badminton on weekdays.', city: 'Kasaragod', interests: ['cricket', 'badminton', 'food outings'], languages: ['Malayalam', 'Urdu', 'English'] },
  { username: 'meera_p', displayName: 'Meera', bio: 'Learning guitar, looking for a jam circle.', city: 'Kasaragod', interests: ['music', 'workshops & learning'], languages: ['Malayalam', 'English'] },
  { username: 'vivek_t', displayName: 'Vivek', bio: 'Trail runner. Slowly becoming a trekker.', city: 'Kasaragod', interests: ['running & walking', 'trekking', 'gym & fitness'], languages: ['Malayalam', 'English', 'Tamil'] },
];

async function clearAll() {
  const models = [User, Category, ActivityRoom, Membership, JoinRequest, SchedulingPoll,
    SchedulingVote, Community, CommunityMembership, ActivitySession, Message, Notification,
    Block, Report, RefreshSession, EmailVerificationToken, PasswordResetToken,
    PushSubscription, AuditLog];
  await Promise.all(models.map((m) => m.deleteMany({})));
}

async function seed() {
  await connectDb();
  if (CLEAR) {
    await clearAll();
    logger.info('seed.cleared');
  }

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12);

  // ---- categories
  const categories = {};
  for (const [name, icon, color, description] of CATEGORIES) {
    const cat = await Category.findOneAndUpdate(
      { slug: slugify(name) },
      { name, icon, color, description, isActive: true },
      { upsert: true, new: true }
    );
    categories[slugify(name)] = cat;
  }
  logger.info('seed.categories', { count: Object.keys(categories).length });

  // ---- users
  const users = {};
  for (const u of USERS) {
    users[u.username] = await User.findOneAndUpdate(
      { username: u.username },
      {
        displayName: u.displayName,
        email: `${u.username.replace(/[^a-z0-9]/g, '_')}@example.dev`,
        passwordHash,
        bio: u.bio,
        city: u.city,
        interests: u.interests,
        languages: u.languages,
        'verificationStatus.emailVerified': true,
        'verificationStatus.verifiedBadge': Boolean(u.verifiedBadge),
      },
      { upsert: true, new: true }
    );
  }
  const admin = await User.findOneAndUpdate(
    { username: 'admin' },
    {
      displayName: 'Admin',
      email: 'admin@letsgo.dev',
      passwordHash: adminHash,
      role: 'admin',
      'verificationStatus.emailVerified': true,
    },
    { upsert: true, new: true }
  );
  logger.info('seed.users', { count: USERS.length + 1 });

  const kasaragodGround = { name: 'Kasaragod Ground', city: 'Kasaragod', area: 'Civil Station', geo: { type: 'Point', coordinates: [74.99, 12.5] } };
  const municipalStadium = { name: 'Municipal Stadium', city: 'Kasaragod', area: 'Muliya', geo: { type: 'Point', coordinates: [74.98, 12.49] } };
  const badmintonCourt = { name: 'Indoor Stadium', city: 'Kasaragod', area: 'Nellikkunnu', geo: { type: 'Point', coordinates: [74.99, 12.51] } };

  // ---- rooms
  async function makeRoom(host, data) {
    const slug = `${slugify(data.title)}-${Math.random().toString(36).slice(2, 8)}`;
    const room = await ActivityRoom.create({ ...data, slug, host: host._id });
    await Membership.create({ room: room._id, user: host._id, role: 'host', membershipStatus: 'active', attendanceStatus: 'going' });
    await ActivityRoom.updateOne({ _id: room._id }, { $set: { memberCount: 1 } });
    return room;
  }
  async function addMember(room, user, status = 'active') {
    await Membership.create({ room: room._id, user: user._id, membershipStatus: status });
    if (status === 'active') {
      await ActivityRoom.updateOne({ _id: room._id }, { $inc: { memberCount: 1 } });
    }
  }

  const sundayCricket = await makeRoom(users['aman.ka'], {
    title: 'Sunday Cricket Crew',
    description: 'Friendly weekend matches for all skill levels. New players are always welcome! We split into teams on the day, bring your own gear if you have it.',
    category: categories.cricket._id,
    visibility: 'public', joinPolicy: 'open', roomStatus: 'scheduling',
    location: kasaragodGround, maximumParticipants: 14, minimumParticipants: 6,
    skillLevel: 'any', durationMinutes: 180, timeZone: 'Asia/Kolkata',
    roomRules: 'Respect everyone. No sledging. RSVP honestly so we can plan teams.',
  });
  const cricketMembers = [
    users['rohit_r'],
    users['farhan_a'],
    users['priya_n'],
    users['arjun_dev'],
    users['sneha_s'],
    users['kiran_kb'],
    users['divya_m'],
  ];
  for (const m of cricketMembers) {
    await addMember(sundayCricket, m);
  }

  const saturday = nextWeekday(6, 7, 0); // Sat 7:00 AM
  const sunday = nextWeekday(0, 7, 0);   // Sun 7:00 AM
  const sundayEve = nextWeekday(0, 16, 0); // Sun 4:00 PM

  const poll = await SchedulingPoll.create({
    room: sundayCricket._id,
    createdBy: users['aman.ka']._id,
    votingMode: 'multiple',
    options: [
      { startAt: saturday, endAt: new Date(saturday.getTime() + 3 * 3600 * 1000), label: 'Morning slot', voteCount: 5 },
      { startAt: sunday, endAt: new Date(sunday.getTime() + 3 * 3600 * 1000), label: 'Morning slot', voteCount: 7 },
      { startAt: sundayEve, endAt: new Date(sundayEve.getTime() + 2 * 3600 * 1000), label: 'Evening slot', voteCount: 3 },
    ],
  });

  // Aman votes for Sunday morning
  await SchedulingVote.create({
    poll: poll._id,
    user: users['aman.ka']._id,
    selectedOptions: [poll.options[1]._id],
  });

  const chatLines = [
    [users['arjun_dev'], 'Looking good! Are we confirmed for Sunday morning?'],
    [users['aman.ka'], "Yes, I'm in! See you all there. 🏏"],
    [users['rohit_r'], "I'll bring extra balls. Anyone needs a bat?"],
    [users['sneha_s'], 'I can arrange the ground booking. Will confirm by tonight.'],
    [users['aman.ka'], "Great! I'll bring water and cones."],
    [users['kiran_kb'], "Let's reach by 6:45 AM for warm-up."],
  ];

  let msgTime = Date.now() - 3600 * 1000 * 2;
  for (const [sender, content] of chatLines) {
    msgTime += 5 * 60 * 1000;
    await Message.create({
      room: sundayCricket._id,
      sender: sender._id,
      content,
      createdAt: new Date(msgTime),
    });
  }

  const eveningFootball = await makeRoom(users['arjun_dev'], {
    title: 'Evening Football',
    description: 'All skill levels welcome. 7-a-side at the municipal stadium, teams picked on the spot.',
    category: categories.football._id,
    visibility: 'public', joinPolicy: 'open', roomStatus: 'scheduled',
    location: municipalStadium, maximumParticipants: 12, minimumParticipants: 8,
    skillLevel: 'any', durationMinutes: 90, timeZone: 'Asia/Kolkata',
    confirmedStartAt: ist(0, 17, 0) < new Date() ? ist(1, 17, 0) : ist(0, 17, 0),
    confirmedEndAt: null, cost: { isFree: true, amount: 0, currency: 'INR', notes: '' },
  });
  eveningFootball.confirmedEndAt = new Date(eveningFootball.confirmedStartAt.getTime() + 90 * 60000);
  eveningFootball.nextAt = eveningFootball.confirmedStartAt;
  await eveningFootball.save();
  await addMember(eveningFootball, users['rohit_r']);
  await addMember(eveningFootball, users['vivek_t']);
  await addMember(eveningFootball, users['kiran_kb']);
  await addMember(eveningFootball, users['farhan_a']);
  await addMember(eveningFootball, users['priya_n']);

  const badminton = await makeRoom(users['priya_n'], {
    title: 'Weekend Badminton Doubles',
    description: 'Doubles games at the indoor stadium. Intermediate level keeps the rallies long.',
    category: categories['badminton']._id,
    visibility: 'public', joinPolicy: 'approval', roomStatus: 'open',
    location: badmintonCourt, maximumParticipants: 8, minimumParticipants: 4,
    skillLevel: 'intermediate', durationMinutes: 120, timeZone: 'Asia/Kolkata',
    cost: { isFree: false, amount: 150, currency: 'INR', notes: 'Court fee split per person' },
  });
  await JoinRequest.create({ room: badminton._id, user: users['farhan_a']._id, message: 'I play singles regularly, doubles should be fun.' });

  const boardGames = await makeRoom(users['sneha_s'], {
    title: 'Board Game Night — Regulars',
    description: 'Private table for the usual group. Catan, Ticket to Ride, and whatever Sneha brings.',
    category: categories['board-games']._id,
    visibility: 'private', joinPolicy: 'approval', roomStatus: 'open',
    location: { name: "Sneha's place — Kasaragod town", city: 'Kasaragod', area: 'Town' },
    maximumParticipants: 6, minimumParticipants: 3, skillLevel: 'any', durationMinutes: 180,
  });
  await addMember(boardGames, users['meera_p']);

  await makeRoom(users['kiran_kb'], {
    title: 'Sunrise Coastal Ride',
    description: 'Easy 30 km loop along the coastal road, breakfast stop at Bekal. Road bikes or hybrids.',
    category: categories.cycling._id,
    visibility: 'public', joinPolicy: 'open', roomStatus: 'open',
    location: { name: 'Bekal Fort parking', city: 'Kasaragod', area: 'Bekal', geo: { type: 'Point', coordinates: [75.09, 12.39] } },
    maximumParticipants: 10, minimumParticipants: 4, skillLevel: 'beginner', durationMinutes: 150,
  });

  await makeRoom(users['divya_m'], {
    title: 'Photography Walk — Fort & Fish Market',
    description: 'Golden hour shoot around Bekal fort, then filter coffee and a critique session.',
    category: categories.photography._id,
    visibility: 'public', joinPolicy: 'open', roomStatus: 'open',
    location: { name: 'Bekal Fort entrance', city: 'Kasaragod', area: 'Bekal', geo: { type: 'Point', coordinates: [75.09, 12.39] } },
    maximumParticipants: 8, minimumParticipants: 3, skillLevel: 'any', durationMinutes: 120,
  });

  await makeRoom(users['vivek_t'], {
    title: 'Ranipuram Day Trek',
    description: 'Day trek to Ranipuram hills. Moderate trail, carry water and snacks. Shared jeep from town.',
    category: categories['trekking-hiking']._id,
    visibility: 'public', joinPolicy: 'approval', roomStatus: 'open',
    location: { name: 'Ranipuram trailhead', city: 'Kasaragod', area: 'Ranapura' },
    maximumParticipants: 12, minimumParticipants: 4, skillLevel: 'intermediate', durationMinutes: 420,
    cost: { isFree: false, amount: 400, currency: 'INR', notes: 'Shared jeep + guide contribution' },
  });

  // ---- communities
  async function makeCommunity(owner, data, members) {
    const slug = `${slugify(data.name)}-${Math.random().toString(36).slice(2, 8)}`;
    const community = await Community.create({ ...data, slug, owner: owner._id, memberCount: 1 });
    await CommunityMembership.create({ community: community._id, user: owner._id, role: 'owner', status: 'active' });
    for (const m of members) {
      await CommunityMembership.create({ community: community._id, user: m._id, status: 'active' });
      await Community.updateOne({ _id: community._id }, { $inc: { memberCount: 1 } });
    }
    return community;
  }

  const cricketCrew = await makeCommunity(users['aman.ka'], {
    name: 'Sunday Cricket Crew',
    description: 'The crew that plays every Sunday at Kasaragod Ground. Open membership — show up twice and you are one of us.',
    category: categories.cricket._id,
    visibility: 'public', membershipPolicy: 'open',
    defaultLocation: kasaragodGround,
    communityRules: 'Everyone bats. Everyone fields. No exceptions.',
    recurrenceSettings: { frequency: 'weekly', byWeekday: [0], startTime: '07:00', durationMinutes: 180, timeZone: 'Asia/Kolkata', nextSessionAt: sunday },
  }, [users['rohit_r'], users['farhan_a'], users['arjun_dev'], users['priya_n']]);

  const cyclists = await makeCommunity(users['kiran_kb'], {
    name: 'Weekend Cyclists Kasaragod',
    description: 'Biweekly rides — coastal loops, ghat climbs and the occasional century attempt.',
    category: categories.cycling._id,
    visibility: 'public', membershipPolicy: 'approval',
    defaultLocation: { name: 'Nileshwar junction', city: 'Kasaragod', area: 'Nileshwar' },
    recurrenceSettings: { frequency: 'biweekly', byWeekday: [6], startTime: '06:30', durationMinutes: 150, timeZone: 'Asia/Kolkata', nextSessionAt: nextWeekday(6, 6, 30) },
  }, [users['vivek_t'], users['divya_m']]);

  // Sessions: one past (completed), upcoming generated instances
  const sessionDay = nextWeekday(0, 7, 0);
  await ActivitySession.create({
    community: cricketCrew._id, title: 'Sunday Cricket Crew — session',
    host: users['aman.ka']._id, description: 'Regular Sunday match.',
    startAt: new Date(sessionDay.getTime() - 7 * 24 * 3600 * 1000),
    endAt: new Date(sessionDay.getTime() - 7 * 24 * 3600 * 1000 + 3 * 3600 * 1000),
    timeZone: 'Asia/Kolkata', location: kasaragodGround, capacity: 14,
    sessionStatus: 'completed', recurrenceKey: `${cricketCrew._id}:${new Date(sessionDay.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10)}`,
    attendees: [
      { user: users['aman.ka']._id, status: 'attended' },
      { user: users['rohit_r']._id, status: 'attended' },
      { user: users['farhan_a']._id, status: 'attended' },
    ],
  });
  await ActivitySession.create({
    community: cricketCrew._id, title: 'Sunday Cricket Crew — session',
    host: users['aman.ka']._id, description: 'Regular Sunday match.',
    startAt: sessionDay, endAt: new Date(sessionDay.getTime() + 3 * 3600 * 1000),
    timeZone: 'Asia/Kolkata', location: kasaragodGround, capacity: 14,
    sessionStatus: 'scheduled', recurrenceKey: `${cricketCrew._id}:${sessionDay.toISOString().slice(0, 10)}`,
    attendees: [{ user: users['aman.ka']._id, status: 'going' }, { user: users['rohit_r']._id, status: 'going' }],
  });

  // ---- notifications (a few illustrative ones)
  await Notification.create([
    {
      recipient: users['aman.ka']._id, type: 'member_joined',
      title: 'Arjun joined "Sunday Cricket Crew"',
      relatedEntity: { kind: 'room', id: sundayCricket._id },
    },
    {
      recipient: users['priya_n']._id, type: 'join_request_received',
      title: 'Farhan requested to join "Weekend Badminton Doubles"',
      relatedEntity: { kind: 'room', id: badminton._id },
    },
    {
      recipient: users['arjun_dev']._id, type: 'schedule_confirmed',
      title: '"Evening Football" is confirmed!',
      body: 'Check the details before it starts.',
      relatedEntity: { kind: 'room', id: eveningFootball._id },
    },
  ]);

  logger.info('seed.done');
  console.log('\n================ LET\'S GO — SEED COMPLETE ================');
  console.log('Demo password for all seeded users :', PASSWORD);
  console.log('Admin console                      : admin@letsgo.dev /', ADMIN_PASSWORD);
  console.log('Demo journey:');
  console.log('  1. Sign in as aman.ka (aman_ka@example.dev)');
  console.log('  2. Discover "Sunday Cricket Crew", vote on the poll, chat');
  console.log('  3. As host, confirm the schedule (Polls tab)');
  console.log('  4. Sign in as priya_n to approve Farhan\'s badminton request');
  console.log('  5. Communities: Sunday Cricket Crew & Weekend Cyclists');
  console.log('===========================================================\n');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDb());
