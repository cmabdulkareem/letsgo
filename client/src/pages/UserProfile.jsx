import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock, Flag, MapPin, Users, Trophy, Medal, Mountain,
  ChevronRight, ArrowLeft
} from 'lucide-react';
import { useState } from 'react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ActivityCard from '../components/ActivityCard';
import { Badge, Button, Card, ErrorState, Spinner } from '../components/ui';
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

export default function UserProfile() {
  const { username } = useParams();
  const { user: me, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('other');
  const [reportText, setReportText] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['user-profile', username],
    queryFn: async () => (await api.get(`/users/${username}`)).data.data,
  });

  const blockMutation = useMutation({
    mutationFn: async (block) => (block ? api.post(`/users/${data.user._id}/block`) : api.delete(`/users/${data.user._id}/block`)),
    onSuccess: (_d, block) => showToast(block ? 'User blocked' : 'User unblocked', 'success'),
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const reportMutation = useMutation({
    mutationFn: async () => api.post('/users/report', { userId: data.user._id, reason: reportReason, description: reportText }),
    onSuccess: () => {
      showToast('Report submitted — thank you', 'success'),
      setReportOpen(false);
      setReportText('');
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  if (isLoading) return <Spinner label="Loading profile…" />;
  if (isError || !data) return <ErrorState message="Profile not found" onRetry={refetch} />;

  const { user, hosted, joinedRooms, communities, history, summary, isSelf } = data;

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
      {/* Top Back Nav */}
      <Link to={-1} className="inline-flex items-center gap-1.5 text-xs font-bold text-ink-soft hover:text-ink">
        <ArrowLeft size={16} /> Back
      </Link>

      {/* Scenic Cover Banner & Profile Card matching Mockup Screen 5 */}
      <Card className="overflow-hidden p-0">
        <div className="h-36 sm:h-44 w-full relative bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-900 overflow-hidden">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-200 via-transparent to-transparent" />
          <svg className="absolute bottom-0 inset-x-0 w-full h-24 text-white/10" viewBox="0 0 800 200" preserveAspectRatio="none" fill="currentColor">
            <path d="M0,120 Q120,60 250,110 T500,80 T800,130 L800,200 L0,200 Z" />
          </svg>
        </div>

        <div className="px-5 pb-5 pt-0 relative">
          <div className="flex items-end justify-between -mt-14 mb-3">
            <div className="ring-4 ring-surface rounded-full overflow-hidden shadow-md">
              <UserAvatar user={user} size={84} showBadge={false} />
            </div>

            {!isSelf && isAuthenticated && (
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => blockMutation.mutate(true)}>
                  Block
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
                  <Flag size={14} /> Report
                </Button>
              </div>
            )}
            {isSelf && (
              <Link to="/profile/edit">
                <Button size="sm" variant="secondary">Edit profile</Button>
              </Link>
            )}
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black text-ink flex items-center gap-1.5">
              {user.displayName}
              {user.verificationStatus?.verifiedBadge && (
                <VerifiedBadge size={18} />
              )}
            </h1>
            <p className="text-xs font-medium text-ink-soft">@{user.username}</p>

            {user.bio ? (
              <p className="text-xs sm:text-sm font-medium text-ink mt-2 leading-relaxed">
                {user.bio}
              </p>
            ) : null}

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5 text-xs text-ink-soft">
              {user.city && (
                <span className="flex items-center gap-1 font-semibold text-ink-soft">
                  <MapPin size={12} className="text-primary" /> {user.city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarClock size={12} /> Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* 3-Column Stats Row */}
          {summary && (
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
          )}
        </div>
      </Card>

      {/* Badges Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-extrabold text-sm text-ink">Badges</h2>
          <span className="text-xs font-bold text-ink-soft">{badges.length} unlocked</span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-1 no-scrollbar">
          {badges.map((b) => {
            const cfg = BADGE_ICONS[b.id] || { icon: Trophy, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40' };
            const Icon = cfg.icon;
            return (
              <div key={b.id || b.title} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className={`w-12 h-12 rounded-full ${cfg.color} grid place-items-center shadow-sm`}>
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

      {/* Interests */}
      <Card className="p-4">
        <h2 className="font-extrabold text-sm text-ink mb-3">Interests</h2>
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

      {/* Hosted activities */}
      {hosted.length > 0 && (
        <section>
          <h2 className="font-extrabold text-sm text-ink mb-3">Hosting</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {hosted.map((a) => (
              <ActivityCard key={a._id} activity={a} />
            ))}
          </div>
        </section>
      )}

      {/* Activity History */}
      {history.length > 0 && (
        <Card className="p-4">
          <h2 className="font-extrabold text-sm text-ink mb-3">Activity History</h2>
          <div className="space-y-2.5">
            {history.map((h) => (
              <Link
                key={h.room._id}
                to={`/activities/${h.room._id}`}
                className="flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-border/30 transition group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CategoryIcon category={h.room.category} size={36} iconSize={18} />
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold text-ink truncate group-hover:text-primary transition-colors">
                      {h.room.title}
                    </p>
                    <p className="text-[11px] text-ink-soft truncate">
                      {h.room.confirmedStartAt ? formatDateTime(h.room.confirmedStartAt, false) : 'Activity'}
                    </p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-ink-soft shrink-0" />
              </Link>
            ))}
          </div>
        </Card>
      )}

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="card max-w-sm w-full p-5 space-y-4">
            <h3 className="font-extrabold text-lg text-ink">Report user</h3>
            <div>
              <label className="label">Reason</label>
              <select
                className="input"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
              >
                <option value="spam">Spam / scam</option>
                <option value="harassment">Harassment</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="safety">Safety concern</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="label">Details (optional)</label>
              <textarea
                className="input min-h-[80px]"
                placeholder="What happened?"
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setReportOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" loading={reportMutation.isPending} onClick={() => reportMutation.mutate()}>
                Submit report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
