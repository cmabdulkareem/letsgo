import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPin, Users, CalendarClock, ChevronLeft, Plus, Check } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, ErrorState, Spinner } from '../components/ui';
import { CategoryIcon } from '../components/CategoryIcon';
import { MemberStack, UserAvatar, VerifiedBadge } from '../components/Avatar';
import { formatDateTime, formatTime } from '../lib/format';

function SessionCard({ session, isMember, canManage, myUserId, onRsvp, onCancel, rsvpPending }) {
  const spotsLeft = session.capacity - (session.attendees?.filter((a) => a.status === 'going').length || 0);
  const myRsvp = session.attendees?.find((a) => String(a.user) === String(myUserId));
  const cancelledSess = session.sessionStatus === 'cancelled';

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-ink truncate">{session.title}</p>
          <p className="text-xs text-ink-soft mt-1 flex items-center gap-1.5">
            <CalendarClock size={13} className="text-primary" />
            {formatDateTime(session.startAt)} – {formatTime(session.endAt)}
          </p>
          <p className="text-xs text-ink-soft mt-0.5 flex items-center gap-1.5">
            <MapPin size={13} className="text-primary" />
            {[session.location?.name, session.location?.area, session.location?.city].filter(Boolean).join(', ') || 'Location TBD'}
          </p>
        </div>
        {cancelledSess ? (
          <Badge tone="red">Cancelled</Badge>
        ) : (
          <Badge tone={spotsLeft > 0 ? 'primary' : 'amber'}>{spotsLeft > 0 ? `${spotsLeft} spots` : 'Full'}</Badge>
        )}
      </div>

      {!cancelledSess && (
        <div className="flex items-center gap-2 mt-3">
          {isMember ? (
            <>
              <Button
                size="sm"
                variant={myRsvp?.status === 'going' ? 'secondary' : 'primary'}
                loading={rsvpPending}
                disabled={spotsLeft <= 0 && myRsvp?.status !== 'going'}
                onClick={() => onRsvp(session._id, myRsvp?.status !== 'going')}
              >
                {myRsvp?.status === 'going' ? (
                  <>
                    <Check size={14} /> Going
                  </>
                ) : (
                  'RSVP'
                )}
              </Button>
              {canManage && (
                <Button size="sm" variant="ghost" onClick={() => onCancel(session._id)}>
                  Cancel session
                </Button>
              )}
            </>
          ) : (
            <p className="text-xs text-ink-soft">Join the community to RSVP.</p>
          )}
        </div>
      )}
    </Card>
  );
}

export default function CommunityDetail() {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateSession, setShowCreateSession] = useState(false);
  const [sessionDraft, setSessionDraft] = useState({ title: '', startAt: '', endAt: '', locationName: '', capacity: 20 });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['community', communityId],
    queryFn: async () => (await api.get(`/communities/${communityId}`)).data.data,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['community', communityId] });

  const joinMutation = useMutation({
    mutationFn: async () => api.post(`/communities/${communityId}/join`),
    onSuccess: () => {
      showToast('Welcome to the community', 'success');
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => api.post(`/communities/${communityId}/leave`),
    onSuccess: () => {
      showToast('You left the community', 'info');
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const rsvpMutation = useMutation({
    mutationFn: async ({ sessionId, going }) => api.post(`/communities/sessions/${sessionId}/rsvp`, { going }),
    onSuccess: (_d, { going }) => {
      showToast(going ? 'See you there' : 'RSVP removed', 'success');
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const cancelSessionMutation = useMutation({
    mutationFn: async (sessionId) => api.post(`/communities/sessions/${sessionId}/cancel`),
    onSuccess: () => {
      showToast('Session cancelled', 'info');
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      await api.post(`/communities/${communityId}/sessions`, {
        title: sessionDraft.title,
        startAt: sessionDraft.startAt,
        endAt: sessionDraft.endAt || undefined,
        location: { name: sessionDraft.locationName || data.community.defaultLocation?.name || '' },
        capacity: Number(sessionDraft.capacity) || 20,
      });
    },
    onSuccess: () => {
      showToast('Session created', 'success');
      setShowCreateSession(false);
      setSessionDraft({ title: '', startAt: '', endAt: '', locationName: '', capacity: 20 });
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  if (isLoading) return <Spinner label="Loading community…" />;
  if (isError || !data) return <ErrorState message="Community not found or private" onRetry={refetch} />;

  const { community, myMembership, upcomingSessions, members, canManage } = data;
  const isMember = myMembership?.status === 'active';
  const isPending = myMembership?.status === 'pending';
  const isOwner = user && String(community.owner?._id || community.owner) === String(user._id);
  const color = community.category?.color || '#08B981';

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1 text-sm font-semibold text-ink-soft hover:text-ink mb-3"
      >
        <ChevronLeft size={16} /> Back
      </button>

      <div className="rounded-card overflow-hidden relative h-40" style={{ background: `linear-gradient(135deg, ${color}40, #10172A 130%)` }}>
        <div className="absolute inset-0 grid place-items-center opacity-20">
          <CategoryIcon category={community.category} size={140} iconSize={80} />
        </div>
        {community.coverImage && (
          <img src={`${import.meta.env.VITE_SOCKET_URL || ''}${community.coverImage}`} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <Badge tone="primary">{community.category?.name}</Badge>
          {community.visibility === 'private' && <Badge tone="blue">Private</Badge>}
          {community.membershipPolicy === 'approval' && <Badge tone="amber">Approval to join</Badge>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold text-ink">{community.name}</h1>
          <p className="text-sm text-ink-soft mt-1 flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1">
              <Users size={14} /> {community.memberCount} members
            </span>
            {community.defaultLocation?.name && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {community.defaultLocation.name}
              </span>
            )}
            {community.recurrenceSettings?.frequency && (
              <span className="flex items-center gap-1">
                <CalendarClock size={14} /> {community.recurrenceSettings.frequency}
              </span>
            )}
          </p>
        </div>
        {isAuthenticated &&
          (isMember ? (
            <div className="flex gap-2">
              {canManage && (
                <Button size="sm" onClick={() => setShowCreateSession(true)}>
                  <Plus size={14} /> New session
                </Button>
              )}
              {!isOwner && (
                <Button size="sm" variant="secondary" onClick={() => leaveMutation.mutate()}>
                  Leave
                </Button>
              )}
            </div>
          ) : (
            <Button size="sm" loading={joinMutation.isPending} disabled={isPending} onClick={() => joinMutation.mutate()}>
              {isPending ? 'Request pending' : community.membershipPolicy === 'approval' ? 'Request to join' : 'Join community'}
            </Button>
          ))}
      </div>

      {community.description && <p className="text-sm text-ink-soft mt-3 whitespace-pre-line">{community.description}</p>}
      {community.guidelines && (
        <Card className="p-4 mt-4">
          <h2 className="font-extrabold text-ink text-sm">Community guidelines</h2>
          <p className="text-sm text-ink-soft mt-1 whitespace-pre-line">{community.guidelines}</p>
        </Card>
      )}

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-extrabold text-ink">Upcoming sessions</h2>
          {upcomingSessions.length === 0 && (
            <Card className="p-6 text-center">
              <p className="text-sm text-ink-soft">No sessions scheduled yet.</p>
              {canManage && (
                <Button size="sm" className="mt-3" onClick={() => setShowCreateSession(true)}>
                  Schedule the first one
                </Button>
              )}
            </Card>
          )}
          {upcomingSessions.map((s) => (
            <SessionCard
              key={s._id}
              session={s}
              isMember={isMember}
              canManage={canManage}
              myUserId={user?._id}
              rsvpPending={rsvpMutation.isPending}
              onRsvp={(sessionId, going) => rsvpMutation.mutate({ sessionId, going })}
              onCancel={(sessionId) => cancelSessionMutation.mutate(sessionId)}
            />
          ))}
        </div>

        <div>
          <h2 className="font-extrabold text-ink mb-3">Members</h2>
          <Card className="p-4">
            <div className="flex"><MemberStack members={members} size={34} max={10} /></div>
            <div className="mt-3 space-y-2">
              {members.slice(0, 6).map((m) => (
                <Link key={m._id} to={`/u/${m.user?.username}`} className="flex items-center gap-2.5 group">
                  <UserAvatar user={m.user} size={28} showBadge={false} />
                  <span className="text-sm text-ink truncate group-hover:text-primary">
                    {m.user?.displayName}
                    {m.user?.verificationStatus?.verifiedBadge && <VerifiedBadge size={12} />}
                  </span>
                  {m.role !== 'member' && <Badge tone="blue">{m.role}</Badge>}
                </Link>
              ))}
              {members.length > 6 && <p className="text-xs text-ink-soft">+{members.length - 6} more</p>}
            </div>
          </Card>
        </div>
      </div>

      {showCreateSession && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="Create session">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={() => setShowCreateSession(false)} />
          <div className="card p-5 w-full max-w-md relative space-y-3">
            <h2 className="font-extrabold text-ink">New session</h2>
            <input
              className="input"
              placeholder="Session title"
              value={sessionDraft.title}
              onChange={(e) => setSessionDraft((d) => ({ ...d, title: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="label" htmlFor="s-start">Starts</label>
                <input
                  id="s-start"
                  type="datetime-local"
                  className="input"
                  value={sessionDraft.startAt}
                  onChange={(e) => setSessionDraft((d) => ({ ...d, startAt: e.target.value }))}
                />
              </div>
              <div>
                <label className="label" htmlFor="s-end">Ends (optional)</label>
                <input
                  id="s-end"
                  type="datetime-local"
                  className="input"
                  value={sessionDraft.endAt}
                  onChange={(e) => setSessionDraft((d) => ({ ...d, endAt: e.target.value }))}
                />
              </div>
            </div>
            <input
              className="input"
              placeholder="Location"
              value={sessionDraft.locationName}
              onChange={(e) => setSessionDraft((d) => ({ ...d, locationName: e.target.value }))}
            />
            <div>
              <label className="label" htmlFor="s-cap">Capacity</label>
              <input
                id="s-cap"
                type="number"
                min={2}
                max={500}
                className="input"
                value={sessionDraft.capacity}
                onChange={(e) => setSessionDraft((d) => ({ ...d, capacity: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreateSession(false)}>
                Cancel
              </Button>
              <Button size="sm" loading={createSessionMutation.isPending} onClick={() => createSessionMutation.mutate()}>
                Create session
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
