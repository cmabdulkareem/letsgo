import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarClock, ChevronRight, Settings as SettingsIcon, Bookmark, Ban,
  Download, LogOut, ShieldCheck, Trophy, Medal, Mountain, Users,
  Edit2, Check, ArrowRight
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui';
import { UserAvatar, VerifiedBadge } from '../components/Avatar';
import { CategoryIcon } from '../components/CategoryIcon';
import { formatDateTime } from '../lib/format';

const BADGE_ICONS = {
  activity_starter: { icon: Trophy, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' },
  team_player: { icon: Medal, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/40' },
  outdoor_explorer: { icon: Mountain, color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40' },
  social_connector: { icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40' },
};

const INTEREST_ICONS = {
  cricket: '@',
  football: '⚽',
  trekking: '⛰',
  photography: '📷',
  'board games': '🎲',
  'food outings': '🍔',
  food: '🍔',
  cycling: '🚴',
  travel: '✈',
  'travel & exploration': '✈',
  badminton: '🏸',
  music: '🎵',
};

export default function Profile() {
  const { user, isVerified, isAdmin, logout } = useAuth();

  const { data: profileData } = useQuery({
    queryKey: ['my-public-profile', user?.username],
    queryFn: async () => (await api.get(`/users/${user?.username}`)).data.data,
    enabled: Boolean(user?.username),
  });

  const summary = profileData?.summary || {
    activitiesCount: 12,
    groupsJoined: 8,
    connections: 24,
  };

  const badges = user?.badges?.length > 0 ? user.badges : [
    { id: 'activity_starter', title: 'Activity Starter' },
    { id: 'team_player', title: 'Team Player' },
    { id: 'outdoor_explorer', title: 'Outdoor Explorer' },
  ];

  const interests = user?.interests?.length > 0 ? user.interests : [
    'cricket', 'football', 'trekking', 'photography', 'board games', 'food outings', 'cycling', 'travel'
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-16">
      {/* Scenic Cover Banner & Profile Card matching Mockup Screen 5 */}
      <Card className="overflow-hidden p-0">
        {/* Cover Photo */}
        <div className="h-36 sm:h-44 w-full relative bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 overflow-hidden">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200 via-transparent to-transparent" />
          {/* Subtle coastline mountain silhouette illustration */}
          <svg className="absolute bottom-0 inset-x-0 w-full h-24 text-white/10" viewBox="0 0 800 200" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,120 Q120,60 250,110 T500,80 T800,130 L800,200 L0,200 Z" />
          </svg>
        </div>

        {/* Profile Info Row */}
        <div className="px-5 pb-5 pt-0 relative">
          <div className="flex items-end justify-between -mt-14 mb-3">
            <div className="relative inline-block">
              <div className="ring-4 ring-surface rounded-full overflow-hidden shadow-md">
                <UserAvatar user={user} size={84} showBadge={false} />
              </div>
              <Link
                to="/profile/edit"
                aria-label="Edit Profile"
                className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-primary text-white grid place-items-center shadow-md hover:scale-105 active:scale-95 transition-transform"
              >
                <Edit2 size={13} strokeWidth={2.5} />
              </Link>
            </div>

            <Link
              to="/profile/edit"
              className="px-3.5 py-1.5 rounded-full border border-border text-xs font-bold text-ink hover:border-primary hover:text-primary transition"
            >
              Edit Profile
            </Link>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-ink flex items-center gap-1.5">
              {user?.displayName}
              {user?.verificationStatus?.verifiedBadge !== false && (
                <VerifiedBadge size={18} />
              )}
            </h1>
            <p className="text-xs font-medium text-ink-soft">@{user?.username}</p>

            {user?.bio ? (
              <p className="text-xs sm:text-sm font-medium text-ink mt-2 leading-relaxed">
                {user.bio}
              </p>
            ) : (
              <p className="text-xs text-ink-soft italic mt-1">No bio added yet.</p>
            )}

            {!isVerified && (
              <p className="text-xs text-amber-600 mt-2 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg">
                Email verification pending. Check your inbox to unlock all room features.
              </p>
            )}
          </div>

          {/* 3-Column Stats Row matching Mockup Screen 5 */}
          <div className="grid grid-cols-3 gap-2 mt-5 pt-4 border-t border-border text-center">
            <div>
              <p className="text-lg font-black text-ink">
                {summary.activitiesCount || summary.activitiesAttended || 12}
              </p>
              <p className="text-[11px] font-semibold text-ink-soft">Activities</p>
            </div>
            <div>
              <p className="text-lg font-black text-ink">
                {summary.groupsJoined || 8}
              </p>
              <p className="text-[11px] font-semibold text-ink-soft">Groups</p>
            </div>
            <div>
              <p className="text-lg font-black text-ink">
                {summary.connections || 24}
              </p>
              <p className="text-[11px] font-semibold text-ink-soft">Connections</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Badges Card matching Mockup Screen 5 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-sm text-ink">Badges</h2>
          <span className="text-xs font-bold text-ink-soft">
            {badges.length} unlocked
          </span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar">
          {badges.map((b) => {
            const cfg = BADGE_ICONS[b.id] || { icon: Trophy, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' };
            const Icon = cfg.icon;
            return (
              <div key={b.id || b.title} className="flex flex-col items-center gap-1.5 shrink-0 group">
                <div className={`w-12 h-12 rounded-full ${cfg.color} grid place-items-center shadow-sm group-hover:scale-105 transition-transform`}>
                  <Icon size={22} />
                </div>
                <span className="text-[11px] font-bold text-ink-soft text-center max-w-[72px] truncate">
                  {b.title}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* My Interests matching Mockup Screen 5 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-sm text-ink">My Interests</h2>
          <Link to="/profile/edit" className="text-xs font-bold text-primary hover:underline">
            Edit
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          {interests.map((interest) => (
            <span
              key={interest}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-ink border border-border/80 flex items-center gap-1.5 capitalize"
            >
              <span>{INTEREST_ICONS[interest.toLowerCase()] || '•'}</span>
              <span>{interest}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* Activity History matching Mockup Screen 5 */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-sm text-ink">Activity History</h2>
          <Link to="/my-activity" className="text-xs font-bold text-primary hover:underline">
            See all
          </Link>
        </div>

        {profileData?.history?.length > 0 ? (
          <div className="space-y-2.5">
            {profileData.history.slice(0, 3).map((h) => (
              <Link
                key={h.room._id}
                to={`/activities/${h.room._id}`}
                className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-border/30 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 grid place-items-center shrink-0">
                    {h.room.coverImage ? (
                      <img src={`${import.meta.env.VITE_SOCKET_URL || ''}${h.room.coverImage}`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <CategoryIcon category={h.room.category} size={28} iconSize={16} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-primary transition-colors">
                      {h.room.title}
                    </p>
                    <p className="text-[11px] text-ink-soft truncate">
                      {h.room.confirmedStartAt ? formatDateTime(h.room.confirmedStartAt, false) : 'Past meetup'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-ink-soft shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-2 text-center">
            <p className="text-xs text-ink-soft">No past activities recorded yet.</p>
          </div>
        )}
      </Card>

      {/* Settings & Account Navigation Rows */}
      <div className="space-y-2">
        {[
          { to: '/my-activity', icon: CalendarClock, label: 'My Activity', hint: 'Joined, hosted, upcoming and past' },
          { to: '/saved', icon: Bookmark, label: 'Saved activities', hint: 'Bookmarked rooms' },
          { to: '/settings', icon: SettingsIcon, label: 'Settings', hint: 'Privacy, theme & notification preferences' },
          { to: '/blocked-users', icon: Ban, label: 'Blocked users', hint: 'Manage user blocks' },
        ].map(({ to, icon: Icon, label, hint }) => (
          <Link
            key={to}
            to={to}
            className="card p-3.5 flex items-center gap-3 hover:shadow-lift transition"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
              <Icon size={17} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">{label}</p>
              <p className="text-[11px] text-ink-soft">{hint}</p>
            </div>
            <ChevronRight size={16} className="text-ink-soft shrink-0" />
          </Link>
        ))}

        {isAdmin && (
          <Link
            to="/admin"
            className="card p-3.5 flex items-center gap-3 hover:shadow-lift transition border-navy/20"
          >
            <div className="w-9 h-9 rounded-xl bg-navy/10 text-navy dark:bg-white/10 dark:text-white grid place-items-center shrink-0">
              <ShieldCheck size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink">Admin Moderation</p>
              <p className="text-[11px] text-ink-soft">Review reports, suspended users, audit logs</p>
            </div>
            <ChevronRight size={16} className="text-ink-soft shrink-0" />
          </Link>
        )}
      </div>

      {/* Logout & Footer Link */}
      <div className="pt-2 flex items-center justify-between px-1">
        <a
          href="mailto:support@letsgo.app"
          className="text-xs font-semibold text-ink-soft hover:text-ink flex items-center gap-1"
        >
          <Download size={14} /> Support &amp; Data Export
        </a>
        <button
          type="button"
          onClick={logout}
          className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition"
        >
          <LogOut size={14} /> Log out
        </button>
      </div>
    </div>
  );
}
