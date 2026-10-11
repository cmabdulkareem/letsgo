import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Clock, Users, Wallet, Share2, Bookmark, BookmarkCheck, ShieldCheck, Lock,
  ChevronLeft, CalendarClock, ListChecks, Check, MoreHorizontal, ArrowRight,
  UserPlus
} from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ErrorState, Spinner } from '../components/ui';
import { CategoryCover } from '../components/CategoryIcon';
import { MemberStack, UserAvatar, VerifiedBadge } from '../components/Avatar';
import MapView from '../components/MapView';
import { formatDateTime, formatTime, STATUS_LABELS } from '../lib/format';

function PollCard({ roomId, poll, isMember, canVote }) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(() => new Set(poll.myVote?.map(String) || []));

  const voteMutation = useMutation({
    mutationFn: async (optionIds) => {
      const method = poll.myVote ? 'patch' : 'post';
      await api[method](`/polls/${poll._id}/votes`, { optionIds });
    },
    onSuccess: () => {
      showToast('Vote saved', 'success');
      queryClient.invalidateQueries({ queryKey: ['activity', roomId] });
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const toggle = (id) => {
    if (!canVote) return;
    const next = new Set(poll.votingMode === 'single' ? [] : selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const totalVotes = poll.options.reduce((sum, o) => sum + o.voteCount, 0);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-extrabold text-base text-ink">Proposed Date &amp; Time</h2>
        <span className="text-xs font-bold text-primary">See all</span>
      </div>

      <div className="space-y-2.5">
        {poll.options.map((o) => {
          const isSelected = selected.has(String(o._id));
          const pct = totalVotes ? Math.round((o.voteCount / totalVotes) * 100) : 0;
          return (
            <div
              key={o._id}
              onClick={() => toggle(String(o._id))}
              role={canVote ? 'button' : 'group'}
              className={`relative overflow-hidden rounded-2xl border p-3 transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary'
                  : 'border-border bg-surface hover:border-border/80'
              } ${canVote ? 'cursor-pointer' : ''}`}
            >
              <div className="flex items-center justify-between gap-3 relative z-10">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-5 h-5 rounded-full grid place-items-center border shrink-0 transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-border text-transparent'
                    }`}
                  >
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-ink truncate">
                    {formatDateTime(o.startAt)}
                    {o.label && <span className="font-normal text-ink-soft ml-1">({o.label})</span>}
                  </span>
                </div>
                <span className="text-xs font-semibold text-ink-soft shrink-0">
                  {o.voteCount} votes
                </span>
              </div>

              {/* Progress bar matching Mockup Screen 3 */}
              <div className="mt-2.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSelected ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  style={{ width: `${Math.max(pct, o.voteCount > 0 ? 10 : 0)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {canVote && (
        <Button
          className="w-full mt-3.5"
          size="sm"
          loading={voteMutation.isPending}
          disabled={selected.size === 0}
          onClick={() => voteMutation.mutate([...selected])}
        >
          {poll.myVote ? 'Update vote' : 'Cast vote'}
        </Button>
      )}
      {!isMember && (
        <p className="text-xs text-ink-soft mt-2 text-center">
          Join this room to vote on the date and time.
        </p>
      )}
    </Card>
  );
}

export default function ActivityDetail() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [showMap, setShowMap] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['activity', activityId],
    queryFn: async () => (await api.get(`/activities/${activityId}`)).data.data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['activity', activityId] });

  const joinMutation = useMutation({
    mutationFn: async (payload) => api.post(`/activities/${activityId}/join`, payload || {}),
    onSuccess: () => {
      showToast('You joined — welcome aboard', 'success');
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const requestMutation = useMutation({
    mutationFn: async () => api.post(`/activities/${activityId}/join-requests`, { message }),
    onSuccess: () => {
      showToast('Request sent — the host will review it', 'success');
      setMessage('');
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const [saved, setSaved] = useState(false);
  const saveMutation = useMutation({
    mutationFn: async (s) => (s ? api.post(`/activities/${activityId}/save`) : api.delete(`/activities/${activityId}/save`)),
    onSuccess: (_d, s) => {
      setSaved(s);
      showToast(s ? 'Saved to bookmarks' : 'Removed from bookmarks', 'success');
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: data?.room?.title, url });
        return;
      } catch {
        // cancelled
      }
    }
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard', 'success');
  };

  if (isLoading) return <Spinner label="Loading activity…" />;
  if (isError || !data) return <ErrorState message="Activity not found or not available" onRetry={refetch} />;

  const { room, host, members, myMembership, myJoinRequest, openPoll } = data;
  const isMember = Boolean(myMembership);
  const spotsLeft = Math.max(0, room.maximumParticipants - room.memberCount);
  const isFull = room.roomStatus === 'full' || spotsLeft === 0;
  const cancelled = room.roomStatus === 'cancelled';
  const geo = room.location?.geo?.coordinates; // [lng, lat]
  const joinable = ['open', 'scheduling'].includes(room.roomStatus) && !cancelled;

  const requireAuth = (fn) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/activities/${activityId}` } });
      return;
    }
    fn();
  };

  const primaryAction = () => {
    if (isMember) {
      navigate(`/rooms/${room._id}`);
      return;
    }
    if (myJoinRequest) {
      showToast('Your request is pending host review', 'info');
      return;
    }
    if (cancelled) return;
    requireAuth(() => {
      if (room.joinPolicy === 'approval') {
        requestMutation.mutate();
      } else if (isFull && room.waitlistEnabled) {
        joinMutation.mutate({});
      } else if (joinable) {
        joinMutation.mutate({});
      }
    });
  };

  const actionLabel = (() => {
    if (isMember) return 'Open Room';
    if (myJoinRequest) return 'Request Pending';
    if (cancelled) return 'Cancelled';
    if (isFull) return room.waitlistEnabled ? 'Join Waitlist' : 'Room Full';
    return room.joinPolicy === 'approval' ? 'Request to Join' : 'Join Room';
  })();

  return (
    <div className="pb-24 max-w-2xl mx-auto">
      {/* Cover Image & Header Overlays matching Mockup Screen 3 */}
      <div className="relative -mx-4 -mt-4 mb-4 sm:rounded-card overflow-hidden">
        <CategoryCover category={room.category} className="h-56 sm:h-72 w-full">
          {room.coverImage && (
            <img
              src={`${import.meta.env.VITE_SOCKET_URL || ''}${room.coverImage}`}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </CategoryCover>

        {/* Floating Top Controls */}
        <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white grid place-items-center pointer-events-auto hover:bg-black/60 transition shadow-sm"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={share}
              aria-label="Share"
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white grid place-items-center hover:bg-black/60 transition shadow-sm"
            >
              <Share2 size={18} />
            </button>
            <button
              type="button"
              onClick={() => showToast('Activity link ready to share', 'info')}
              aria-label="More options"
              className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md text-white grid place-items-center hover:bg-black/60 transition shadow-sm"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Title & Badges matching Mockup Screen 3 */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
          {room.title}
        </h1>

        <div className="flex items-center gap-2 flex-wrap mt-2.5">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary flex items-center gap-1">
            <span>@{room.category?.name}</span>
          </span>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {room.visibility === 'private' ? 'Private Room' : 'Public Room'}
          </span>

          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <Users size={12} className="text-ink-soft" />
            <span>{room.memberCount}/{room.maximumParticipants} members</span>
          </span>
        </div>

        {/* Room Description */}
        <p className="text-sm font-medium text-ink-soft mt-3.5 leading-relaxed">
          {room.description}
        </p>
      </div>

      <div className="space-y-4 mt-5">
        {/* Location Card with View on map button */}
        <Card className="p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary grid place-items-center shrink-0">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink truncate">
                {room.location?.name || room.location?.city || 'Meeting Point'}
              </p>
              <p className="text-xs text-ink-soft truncate">
                {room.location?.area ? `${room.location.area}, ` : ''}{room.location?.city || 'Kasaragod'}
                {typeof room.distance === 'number' ? ` • ${room.distance} km away` : ' • 2 km away'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowMap(!showMap)}
            className="shrink-0 px-3.5 py-1.5 rounded-full border border-primary text-primary text-xs font-bold hover:bg-primary/5 transition"
          >
            {showMap ? 'Hide map' : 'View on map'}
          </button>
        </Card>

        {/* Expandable Leaflet Map */}
        {showMap && geo && (
          <Card className="overflow-hidden p-0 animate-in fade-in">
            <MapView
              center={[geo[1], geo[0]]}
              markers={[{ position: [geo[1], geo[0]], label: room.location?.name }]}
              className="h-60 w-full z-0"
            />
            <p className="text-[11px] text-ink-soft p-2.5 text-center">
              Approximate meeting location. Exact meetup spot coordinated in room chat.
            </p>
          </Card>
        )}

        {/* Proposed Date & Time Poll Card */}
        {openPoll && (
          <PollCard
            roomId={room._id}
            poll={openPoll}
            isMember={isMember}
            canVote={isMember && !cancelled}
          />
        )}

        {/* Members section matching Mockup Screen 3 */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-extrabold text-sm text-ink">
              Members ({room.memberCount}/{room.maximumParticipants})
            </h2>
            {isMember && (
              <Link to={`/rooms/${room._id}?tab=members`} className="text-ink-soft hover:text-ink">
                <ArrowRight size={16} />
              </Link>
            )}
          </div>

          <div className="flex items-center justify-between gap-3">
            <MemberStack
              members={members}
              size={34}
              max={5}
              totalCount={room.memberCount}
            />

            <Link
              to={isAuthenticated ? `/u/${host.username}` : '/login'}
              className="text-xs font-semibold text-ink-soft hover:text-primary flex items-center gap-1"
            >
              Host: <span className="font-bold text-ink">@{host.username}</span>
            </Link>
          </div>
        </Card>

        {/* House rules & Bring along */}
        {room.roomRules && (
          <Card className="p-4">
            <h3 className="font-extrabold text-xs text-ink uppercase tracking-wider mb-1">
              Room Rules
            </h3>
            <p className="text-xs text-ink-soft leading-relaxed">{room.roomRules}</p>
          </Card>
        )}
      </div>

      {/* Fixed Bottom Action Bar matching Mockup Screen 3 */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-surface/95 backdrop-blur-md border-t border-border p-3.5 safe-bottom max-w-2xl mx-auto shadow-lift flex items-center gap-3">
        <Button
          className="flex-1 !rounded-full !py-3.5 !text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-primary/25"
          variant={isMember ? 'primary' : 'primary'}
          loading={joinMutation.isPending || requestMutation.isPending}
          disabled={Boolean(myJoinRequest) || cancelled || (isFull && !room.waitlistEnabled && !isMember)}
          onClick={primaryAction}
        >
          <Users size={18} />
          {actionLabel}
        </Button>

        <button
          type="button"
          onClick={() => saveMutation.mutate(!saved)}
          aria-label="Bookmark"
          className="w-12 h-12 rounded-full border border-border bg-surface text-ink-soft hover:text-primary hover:border-primary grid place-items-center shrink-0 transition"
        >
          {saved ? <BookmarkCheck size={20} className="text-primary" /> : <Bookmark size={20} />}
        </button>
      </div>
    </div>
  );
}
