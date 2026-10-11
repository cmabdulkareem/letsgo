import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarClock, Check, ChevronLeft, CheckCircle2, CircleSlash, ListChecks, Send,
  Settings2, UserCheck, UserMinus, Users, X, XCircle, Phone, MoreVertical,
  Smile, Plus, Mic, MapPin, Info, ArrowRight, ShieldCheck, UserPlus, Search,
} from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getSocket, joinRoomChannel, leaveRoomChannel, sendSocketMessage,
} from '../lib/socket';
import { Badge, Button, Card, ErrorState, Spinner } from '../components/ui';
import { UserAvatar, VerifiedBadge } from '../components/Avatar';
import { CategoryIcon } from '../components/CategoryIcon';
import MapView from '../components/MapView';
import { formatDateTime, formatTime, fromNow, STATUS_LABELS } from '../lib/format';

/* ------------------------------------------------------------------ chat */

function ChatPanel({ roomId, myUserId }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const bottomRef = useRef(null);
  const listRef = useRef(null);

  // Initial page + earlier pages use the REST API.
  const loadOlder = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const oldest = messages[0];
      const { data } = await api.get(`/rooms/${roomId}/messages`, {
        params: { limit: 30, before: oldest?.createdAt },
      });
      const page = data.data.items || [];
      setHasMore(page.length === 30);
      setMessages((prev) => [...page.reverse(), ...prev]);
    } catch {
      showToast('Could not load older messages', 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setHasMore(true);
    (async () => {
      try {
        const { data } = await api.get(`/rooms/${roomId}/messages`, { params: { limit: 30 } });
        if (cancelled) return;
        const page = data.data.items || [];
        setMessages(page.reverse());
        setHasMore(page.length === 30);
      } catch {
        if (!cancelled) showToast('Could not load chat', 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    joinRoomChannel(roomId);
    const onNew = (msg) => {
      if (String(msg.room) !== String(roomId)) return;
      setMessages((prev) => (prev.some((m) => String(m._id) === String(msg._id)) ? prev : [...prev, msg]));
    };
    socket.on('message:new', onNew);
    return () => {
      socket.off('message:new', onNew);
      leaveRoomChannel(roomId);
    };
  }, [roomId]);

  const send = async (e) => {
    e?.preventDefault();
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    const ack = await sendSocketMessage(roomId, content);
    if (!ack?.ok) {
      showToast(ack?.message || 'Message failed to send', 'error');
      setDraft(content);
      return;
    }
  };

  return (
    <div className="flex flex-col h-[65vh]">
      <div ref={listRef} className="flex-1 overflow-y-auto thin-scroll space-y-4 pr-1 pb-2" aria-live="polite">
        {hasMore && (
          <div className="text-center py-1">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingMore}
              className="text-xs font-semibold text-primary hover:underline"
            >
              {loadingMore ? 'Loading earlier messages…' : 'Load earlier messages'}
            </button>
          </div>
        )}
        {messages.map((m) => {
          const mine = String(m.sender?._id || m.sender) === String(myUserId);
          return (
            <div key={m._id} className={`flex gap-2.5 ${mine ? 'justify-end' : 'justify-start'}`}>
              {!mine && (
                <UserAvatar user={m.sender} size={34} showBadge={false} />
              )}
              <div className={`max-w-[78%] ${mine ? 'text-right' : 'text-left'}`}>
                {!mine && (
                  <p className="text-[11px] font-bold text-ink-soft mb-1 flex items-center gap-1.5">
                    <span>{m.sender?.displayName || 'Member'}</span>
                    <span className="font-normal text-[10px] text-ink-soft/80">{formatTime(m.createdAt)}</span>
                  </p>
                )}
                <div
                  className={`inline-block text-left text-sm px-4 py-2.5 rounded-2xl leading-relaxed whitespace-pre-line break-words shadow-sm ${
                    mine
                      ? 'bg-primary text-white rounded-tr-xs font-medium'
                      : 'bg-slate-100 dark:bg-slate-800 text-ink rounded-tl-xs'
                  }`}
                >
                  {m.content}
                </div>
                {mine && (
                  <p className="text-[10px] text-ink-soft mt-1">
                    {formatTime(m.createdAt)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Composer matching Mockup Screen 4 */}
      <form onSubmit={send} className="pt-2 flex items-center gap-2 border-t border-border">
        <button
          type="button"
          onClick={() => showToast('Attachment options: photo, location pin', 'info')}
          aria-label="Add attachment"
          className="w-10 h-10 rounded-full border border-border text-ink-soft hover:text-ink hover:bg-border/30 grid place-items-center shrink-0 transition"
        >
          <Plus size={18} />
        </button>

        <div className="flex-1 relative flex items-center">
          <input
            className="w-full bg-slate-100 dark:bg-slate-800 rounded-full border border-border/80 px-4 py-2.5 pr-10 text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
            placeholder="Type a message..."
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={2000}
            aria-label="Message"
          />
          <button
            type="button"
            onClick={() => setDraft((prev) => `${prev} 👍`)}
            aria-label="Emoji"
            className="absolute right-3 text-ink-soft hover:text-ink"
          >
            <Smile size={18} />
          </button>
        </div>

        {draft.trim() ? (
          <button
            type="submit"
            aria-label="Send message"
            className="w-10 h-10 rounded-full bg-primary text-white grid place-items-center shrink-0 shadow-sm hover:scale-105 active:scale-95 transition-transform"
          >
            <Send size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => showToast('Voice messages coming soon', 'info')}
            aria-label="Voice message"
            className="w-10 h-10 rounded-full border border-border text-ink-soft hover:text-ink hover:bg-border/30 grid place-items-center shrink-0 transition"
          >
            <Mic size={18} />
          </button>
        )}
      </form>
    </div>
  );
}

/* -------------------------------------------------------------- schedule */

function SchedulePanel({ room, myMembership, canManage, onChanged }) {
  const { showToast } = useToast();
  const [selected, setSelected] = useState({});
  const [creating, setCreating] = useState(false);
  const [pollTitle, setPollTitle] = useState('When should we host this?');
  const [draftSlots, setDraftSlots] = useState([]);
  const [votingMode, setVotingMode] = useState('single');

  const polls = useQuery({
    queryKey: ['room-polls', room._id],
    queryFn: async () => (await api.get(`/activities/${room._id}/polls`)).data.data,
    enabled: Boolean(myMembership),
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIds, hasVoted }) =>
      hasVoted
        ? api.patch(`/polls/${pollId}/votes`, { optionIds })
        : api.post(`/polls/${pollId}/votes`, { optionIds }),
    onSuccess: () => {
      showToast('Vote saved', 'success');
      polls.refetch();
      onChanged();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post(`/activities/${room._id}/polls`, {
        title: pollTitle.trim() || 'When should we host this?',
        options: draftSlots.filter((s) => s.startAt).map((s) => ({
          startAt: s.startAt,
          endAt: s.endAt || s.startAt,
          label: s.label,
          venue: s.venue,
        })),
        votingMode,
      }),
    onSuccess: () => {
      showToast('Poll created — members can vote now', 'success');
      setCreating(false);
      setDraftSlots([]);
      setPollTitle('When should we host this?');
      polls.refetch();
      onChanged();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const closeMutation = useMutation({
    mutationFn: async (pollId) => api.post(`/polls/${pollId}/close`),
    onSuccess: () => {
      showToast('Poll closed', 'info');
      polls.refetch();
      onChanged();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ pollId, optionId }) => api.post(`/polls/${pollId}/confirm`, { optionId }),
    onSuccess: () => {
      showToast('Schedule confirmed — everyone has been notified', 'success');
      polls.refetch();
      onChanged();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const isActive = myMembership?.membershipStatus === 'active';
  const openPoll = polls.data?.find((p) => p.status === 'open');
  const closedPolls = polls.data?.filter((p) => p.status !== 'open') || [];

  const toggleOption = (pollId, optionId, mode) => {
    setSelected((prev) => {
      const current = new Set(prev[pollId] || pollMyVotes(polls.data.find((p) => p._id === pollId)));
      if (mode === 'single') return { ...prev, [pollId]: current.has(optionId) ? [] : [optionId] };
      if (current.has(optionId)) current.delete(optionId);
      else current.add(optionId);
      return { ...prev, [pollId]: [...current] };
    });
  };

  const pollMyVotes = (poll) => (poll?.myVote || []).map(String);

  return (
    <div className="space-y-4">
      {room.confirmedStartAt && (
        <Card className="p-4 border-primary/40 bg-primary/5">
          <p className="text-sm font-extrabold text-ink flex items-center gap-2">
            <CheckCircle2 size={17} className="text-primary" /> Confirmed
          </p>
          <p className="text-sm text-ink mt-1">
            {formatDateTime(room.confirmedStartAt)}
            {room.confirmedEndAt && ` – ${formatTime(room.confirmedEndAt)}`}
          </p>
        </Card>
      )}

      {canManage && !creating && (
        <Button variant="secondary" onClick={() => setCreating(true)}>
          <ListChecks size={15} /> {openPoll ? 'Replace poll' : 'Propose time options'}
        </Button>
      )}

      {canManage && creating && (
        <Card className="p-4 space-y-3">
          <h3 className="font-extrabold text-ink text-sm">Propose event options for the room</h3>
          <div>
            <label className="label">Poll title / Question</label>
            <input
              className="input"
              placeholder="e.g. Which match date & turf suits everyone best?"
              value={pollTitle}
              onChange={(e) => setPollTitle(e.target.value)}
            />
          </div>
          {draftSlots.map((slot, i) => (
            <div key={i} className="p-3 rounded-xl border border-border space-y-2 bg-surface">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink-soft">Option #{i + 1}</span>
                <button
                  type="button"
                  aria-label="Remove slot"
                  className="w-7 h-7 grid place-items-center rounded-full text-ink-soft hover:text-red-500"
                  onClick={() => setDraftSlots((s) => s.filter((_, j) => j !== i))}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="grid sm:grid-cols-3 gap-2">
                <div>
                  <label className="label text-[11px]">Date & Time</label>
                  <input
                    type="datetime-local"
                    className="input !py-2 text-xs"
                    value={slot.startAt}
                    onChange={(e) =>
                      setDraftSlots((s) => s.map((x, j) => (j === i ? { ...x, startAt: e.target.value } : x)))
                    }
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Label / Format (optional)</label>
                  <input
                    className="input !py-2 text-xs"
                    placeholder="e.g. Sunday 7 AM Friendly"
                    value={slot.label}
                    onChange={(e) =>
                      setDraftSlots((s) => s.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                    }
                  />
                </div>
                <div>
                  <label className="label text-[11px]">Venue (optional)</label>
                  <input
                    className="input !py-2 text-xs"
                    placeholder="e.g. Kasaragod Turf"
                    value={slot.venue || ''}
                    onChange={(e) =>
                      setDraftSlots((s) => s.map((x, j) => (j === i ? { ...x, venue: e.target.value } : x)))
                    }
                  />
                </div>
              </div>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraftSlots((s) => [...s, { startAt: '', endAt: '', label: '', venue: '' }])}
            disabled={draftSlots.length >= 10}
          >
            + Add date/venue option
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-ink-soft">
              Voting mode
              <select className="input mt-1" value={votingMode} onChange={(e) => setVotingMode(e.target.value)}>
                <option value="single">Single choice</option>
                <option value="multiple">Multiple choice</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Publish event poll
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {openPoll && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-ink text-sm flex items-center gap-2">
              <ListChecks size={16} className="text-primary" /> {openPoll.title || 'Vote on the schedule'}
            </h3>
            {openPoll.deadline && <span className="text-xs text-ink-soft">closes {fromNow(openPoll.deadline)}</span>}
          </div>
          <div className="mt-3 space-y-2">
            {openPoll.options.map((o) => {
              const chosen = new Set(selected[openPoll._id] || pollMyVotes(openPoll)).has(String(o._id));
              return (
                <button
                  key={o._id}
                  type="button"
                  disabled={!isActive}
                  onClick={() => toggleOption(openPoll._id, String(o._id), openPoll.votingMode)}
                  className={`w-full flex items-center justify-between gap-2 rounded-xl border p-3 text-left transition ${
                    chosen ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  } ${isActive ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-ink min-w-0">
                    {isActive && (
                      <span
                        className={`w-5 h-5 rounded-full grid place-items-center border shrink-0 ${
                          chosen ? 'bg-primary border-primary text-white' : 'border-border text-transparent'
                        }`}
                      >
                        <Check size={12} />
                      </span>
                    )}
                    <span className="truncate">
                      {formatDateTime(o.startAt)}
                      {o.label && <span className="text-ink-soft font-normal"> · {o.label}</span>}
                      {o.venue && <span className="text-primary font-normal"> 📍 {o.venue}</span>}
                    </span>
                  </span>
                  <span className="text-xs text-ink-soft shrink-0">{o.voteCount} votes</span>
                </button>
              );
            })}
          </div>
          {isActive && (
            <Button
              className="w-full mt-3"
              loading={voteMutation.isPending}
              onClick={() =>
                voteMutation.mutate({
                  pollId: openPoll._id,
                  optionIds: selected[openPoll._id] || pollMyVotes(openPoll),
                  hasVoted: Boolean(openPoll.myVote?.length),
                })
              }
            >
              {openPoll.myVote?.length ? 'Update vote' : 'Vote'}
            </Button>
          )}
          {canManage && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-bold text-ink mb-2">Host actions</p>
              <div className="flex flex-wrap gap-2">
                {openPoll.options.map((o) => (
                  <Button
                    key={o._id}
                    size="sm"
                    variant="secondary"
                    loading={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate({ pollId: openPoll._id, optionId: o._id })}
                  >
                    Confirm {formatDateTime(o.startAt, false)}
                  </Button>
                ))}
                <Button size="sm" variant="ghost" loading={closeMutation.isPending} onClick={() => closeMutation.mutate(openPoll._id)}>
                  Close poll
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {closedPolls.length > 0 && (
        <details className="card p-4">
          <summary className="text-sm font-bold text-ink-soft cursor-pointer">Past polls ({closedPolls.length})</summary>
          <div className="mt-3 space-y-2">
            {closedPolls.map((p) => (
              <div key={p._id} className="text-xs text-ink-soft">
                {p.options.map((o) => (
                  <p key={o._id}>
                    {formatDateTime(o.startAt)} — {o.voteCount} votes
                  </p>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}

      {!openPoll && !room.confirmedStartAt && !canManage && (
        <Card className="p-4 text-center">
          <p className="text-sm text-ink-soft">The host hasn&rsquo;t proposed dates yet. Check back soon.</p>
        </Card>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- members */

function MembersPanel({ room, canManage, myUserId, onChanged }) {
  const { showToast } = useToast();
  const [inviteQuery, setInviteQuery] = useState('');
  const [showInviteBox, setShowInviteBox] = useState(false);

  const members = useQuery({
    queryKey: ['room-members', room._id],
    queryFn: async () => (await api.get(`/activities/${room._id}/members`, { params: { limit: 100 } })).data.data,
  });

  const searchResults = useQuery({
    queryKey: ['user-search', inviteQuery],
    queryFn: async () => (await api.get('/users/search', { params: { q: inviteQuery } })).data.data.users,
    enabled: inviteQuery.trim().length >= 2,
    staleTime: 5000,
  });

  const inviteMutation = useMutation({
    mutationFn: async (identifier) => api.post(`/activities/${room._id}/invite`, { identifier }),
    onSuccess: (res) => {
      showToast(res.data?.message || 'Invitation sent', 'success');
      setInviteQuery('');
      setShowInviteBox(false);
      members.refetch();
      onChanged();
    },
    onError: (err) => showToast(errorMessage(err, 'Failed to send invite'), 'error'),
  });

  const requests = useQuery({
    queryKey: ['room-requests', room._id],
    queryFn: async () => (await api.get(`/activities/${room._id}/join-requests`)).data.data,
    enabled: canManage,
  });

  const review = useMutation({
    mutationFn: async ({ requestId, action }) =>
      api.patch(`/activities/${room._id}/join-requests/${requestId}`, { action }),
    onSuccess: (_d, { action }) => {
      showToast(action === 'approve' ? 'Request approved' : 'Request declined', 'success');
      requests.refetch();
      members.refetch();
      onChanged();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const removeMember = useMutation({
    mutationFn: async (userId) => api.delete(`/activities/${room._id}/members/${userId}`),
    onSuccess: () => {
      showToast('Member removed', 'info');
      members.refetch();
      onChanged();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const list = members.data?.items || [];

  return (
    <div className="space-y-4">
      {canManage && (requests.data?.items?.length || 0) > 0 && (
        <Card className="p-4">
          <h3 className="font-extrabold text-ink text-sm flex items-center gap-2">
            <UserCheck size={16} className="text-primary" /> Join requests ({requests.data.items.length})
          </h3>
          <div className="mt-3 space-y-3">
            {requests.data.items.map((r) => (
              <div key={r._id} className="flex items-start gap-3">
                <UserAvatar user={r.user} size={36} />
                <div className="min-w-0 flex-1">
                  <Link to={`/u/${r.user?.username}`} className="text-sm font-bold text-ink hover:text-primary">
                    {r.user?.displayName}
                  </Link>
                  {r.message && <p className="text-xs text-ink-soft mt-0.5 whitespace-pre-line">{r.message}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" onClick={() => review.mutate({ requestId: r._id, action: 'approve' })}>
                    <Check size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => review.mutate({ requestId: r._id, action: 'reject' })}>
                    <X size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Invite Friends / Search by Username, Name or Phone */}
      <Card className="p-4 bg-primary/5 border-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-ink text-sm flex items-center gap-2">
              <UserPlus size={16} className="text-primary" /> Invite People to Room
            </h3>
            <p className="text-xs text-ink-soft mt-0.5">
              Invite by username, mobile number, or name.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowInviteBox(!showInviteBox)}
          >
            {showInviteBox ? 'Close' : 'Invite'}
          </Button>
        </div>

        {showInviteBox && (
          <div className="mt-3 space-y-2 pt-3 border-t border-border">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <input
                className="input !pl-9 !py-2 text-sm"
                placeholder="Type username, phone, or name..."
                value={inviteQuery}
                onChange={(e) => setInviteQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Direct identifier invite button */}
            {inviteQuery.trim().length >= 3 && (
              <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border">
                <span className="text-xs text-ink">
                  Send invite directly to <strong className="text-primary">{inviteQuery.trim()}</strong>
                </span>
                <Button
                  size="sm"
                  loading={inviteMutation.isPending}
                  onClick={() => inviteMutation.mutate(inviteQuery.trim())}
                >
                  Send Invite
                </Button>
              </div>
            )}

            {/* Live Search Suggestions */}
            {searchResults.data && searchResults.data.length > 0 && (
              <div className="space-y-1.5 mt-2">
                <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">Matching Users</p>
                {searchResults.data.map((u) => (
                  <div
                    key={u._id}
                    className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border hover:border-primary/50 transition"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar user={u} size={32} />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink truncate">{u.displayName}</p>
                        <p className="text-[11px] text-ink-soft truncate">@{u.username} {u.phone ? `• ${u.phone}` : ''}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={inviteMutation.isPending}
                      onClick={() => inviteMutation.mutate(u.username)}
                    >
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h3 className="font-extrabold text-ink text-sm flex items-center gap-2">
          <Users size={16} className="text-primary" /> Members ({room.memberCount}/{room.maximumParticipants})
        </h3>
        <div className="mt-3 space-y-2.5">
          {list.map((m) => (
            <div key={m._id} className="flex items-center gap-3">
              <UserAvatar user={m.user} size={36} />
              <div className="min-w-0 flex-1">
                <Link to={`/u/${m.user?.username}`} className="text-sm font-bold text-ink hover:text-primary flex items-center gap-1">
                  {m.user?.displayName}
                  {m.user?.verificationStatus?.verifiedBadge && <VerifiedBadge size={13} />}
                </Link>
                <p className="text-xs text-ink-soft">
                  {m.role} · {m.attendanceStatus === 'going' ? 'Going' : m.membershipStatus}
                </p>
              </div>
              {canManage && String(m.user?._id) !== String(myUserId) && (
                <button
                  type="button"
                  aria-label={`Remove ${m.user?.displayName}`}
                  onClick={() => removeMember.mutate(m.user._id)}
                  className="w-9 h-9 grid place-items-center rounded-full text-ink-soft hover:text-red-500 hover:bg-red-50"
                >
                  <UserMinus size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function Room() {
  const { roomId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const tab = searchParams.get('tab') || 'chat';
  const setTab = (t) => setSearchParams((prev) => { prev.set('tab', t); return prev; }, { replace: true });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['room', roomId],
    queryFn: async () => (await api.get(`/activities/${roomId}`)).data.data,
    enabled: isAuthenticated,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['room', roomId] });

  const attendanceMutation = useMutation({
    mutationFn: async (status) => api.post(`/activities/${roomId}/attendance`, { status }),
    onSuccess: (_d, status) => {
      showToast(status === 'going' ? 'Marked as going' : 'Attendance withdrawn', 'success');
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const leaveMutation = useMutation({
    mutationFn: async () => api.post(`/activities/${roomId}/leave`),
    onSuccess: () => {
      showToast('You left the room', 'info');
      navigate('/my-activity');
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => api.post(`/activities/${roomId}/cancel`),
    onSuccess: () => {
      showToast('Activity cancelled — members were notified', 'info');
      invalidate();
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  if (!isAuthenticated) return <ErrorState message="Sign in to view this room" />;
  if (isLoading) return <Spinner label="Opening room…" />;
  if (isError || !data) return <ErrorState message="Room not found" onRetry={refetch} />;

  const { room, myMembership, members } = data;
  const canManage = user && (String(room.host?._id) === String(user._id) || room.coHosts?.some((c) => String(c) === String(user._id)));
  const isMember = myMembership?.membershipStatus === 'active';
  const isWaitlisted = myMembership?.membershipStatus === 'waitlisted';
  const cancelled = room.roomStatus === 'cancelled';
  const going = myMembership?.attendanceStatus === 'going';
  const canConfirmAttendance = room.confirmedStartAt && !cancelled && ['scheduled', 'in_progress', 'full', 'open'].includes(room.roomStatus);

  const [showCallModal, setShowCallModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="max-w-3xl mx-auto">
      {/* Top Header matching Mockup Screen 4 */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="w-9 h-9 grid place-items-center rounded-full text-ink-soft hover:text-ink hover:bg-border/30 transition shrink-0 -ml-1"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 grid place-items-center shrink-0">
            {room.coverImage ? (
              <img
                src={`${import.meta.env.VITE_SOCKET_URL || ''}${room.coverImage}`}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <CategoryIcon category={room.category} size={28} iconSize={16} />
            )}
          </div>

          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-extrabold text-ink truncate leading-tight">
              {room.title}
            </h1>
            <p className="text-xs text-ink-soft truncate mt-0.5">
              {room.memberCount} members • {room.visibility === 'private' ? 'Private Room' : 'Public Room'}
              {cancelled && ' • Cancelled'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          <button
            type="button"
            onClick={() => setShowCallModal(true)}
            aria-label="Voice Room Call"
            className="w-9 h-9 grid place-items-center rounded-full text-ink-soft hover:text-primary hover:bg-border/30 transition"
          >
            <Phone size={18} />
          </button>

          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Room actions"
            className="w-9 h-9 grid place-items-center rounded-full text-ink-soft hover:text-ink hover:bg-border/30 transition"
          >
            <MoreVertical size={18} />
          </button>

          {showMenu && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setShowMenu(false)}
              />
              <div role="menu" className="absolute top-10 right-0 card p-1.5 w-48 shadow-lift z-50">
                <Link
                  to={`/activities/${roomId}`}
                  onClick={() => setShowMenu(false)}
                  className="menu-item !py-2 text-xs"
                >
                  <Settings2 size={15} /> Public View
                </Link>
                {!canManage && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      leaveMutation.mutate();
                    }}
                    className="menu-item !py-2 text-xs text-red-500 w-full"
                  >
                    <XCircle size={15} /> Leave Room
                  </button>
                )}
                {canManage && !cancelled && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      cancelMutation.mutate();
                    }}
                    className="menu-item !py-2 text-xs text-red-500 w-full"
                  >
                    <CircleSlash size={15} /> Cancel Activity
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {cancelled && (
        <Card className="p-3.5 mt-3 border-red-200 bg-red-50 dark:bg-red-950/30">
          <p className="text-xs font-bold text-red-600 flex items-center gap-1.5">
            <CircleSlash size={15} /> This activity was cancelled.
          </p>
          {room.cancellationReason && <p className="text-xs text-ink-soft mt-1">{room.cancellationReason}</p>}
        </Card>
      )}

      {isMember && canConfirmAttendance && (
        <Card className="p-3.5 mt-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-ink">Confirm attendance</p>
            <p className="text-[11px] text-ink-soft">
              {room.confirmedStartAt && <>Scheduled for {formatDateTime(room.confirmedStartAt)}. </>}
              {going ? 'You’re confirmed as going.' : 'Let the host know if you’ll be there.'}
            </p>
          </div>
          <Button
            size="sm"
            variant={going ? 'secondary' : 'primary'}
            loading={attendanceMutation.isPending}
            onClick={() => attendanceMutation.mutate(going ? 'none' : 'going')}
          >
            {going ? (
              <>
                <XCircle size={13} /> Withdraw
              </>
            ) : (
              <>
                <CheckCircle2 size={13} /> I’m going
              </>
            )}
          </Button>
        </Card>
      )}

      {/* Pill Tabs matching Mockup Screen 4 */}
      <div className="flex gap-2 mt-3.5 pb-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Room sections">
        {[
          { id: 'chat', label: 'Chat', show: isMember },
          { id: 'schedule', label: 'Schedule', show: true },
          { id: 'members', label: 'Members', show: true },
          { id: 'details', label: 'Details', show: true },
        ]
          .filter((t) => t.show)
          .map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-ink-soft hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            );
          })}
      </div>

      <div className="mt-3.5">
        {tab === 'chat' && (isMember ? <ChatPanel roomId={roomId} myUserId={user?._id} /> : (
          <Card className="p-6 text-center">
            <p className="text-sm text-ink-soft">Join the room to read and send messages.</p>
            <Link to={`/activities/${roomId}`}>
              <Button size="sm" className="mt-3">View details & join</Button>
            </Link>
          </Card>
        ))}
        {tab === 'schedule' && <SchedulePanel room={room} myMembership={myMembership} canManage={canManage} onChanged={invalidate} />}
        {tab === 'members' && <MembersPanel room={room} canManage={canManage} myUserId={user?._id} onChanged={invalidate} />}
        {tab === 'details' && <RoomDetailsPanel room={room} />}
      </div>

      {/* Voice Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="card max-w-sm w-full p-5 space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary grid place-items-center mx-auto">
              <Phone size={24} />
            </div>
            <h3 className="font-extrabold text-base text-ink">Voice Coordination</h3>
            <p className="text-xs text-ink-soft leading-relaxed">
              Live group audio channels activate 30 minutes before confirmed meetup times for easy real-world coordination.
            </p>
            <Button className="w-full" size="sm" onClick={() => setShowCallModal(false)}>
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RoomDetailsPanel({ room }) {
  const geo = room.location?.geo?.coordinates;
  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-3">
        <h3 className="font-extrabold text-sm text-ink">About this activity</h3>
        <p className="text-xs text-ink-soft leading-relaxed whitespace-pre-line">{room.description}</p>
        <div className="pt-2 border-t border-border flex items-center gap-2 text-xs text-ink-soft">
          <MapPin size={14} className="text-primary shrink-0" />
          <span>{[room.location?.name, room.location?.area, room.location?.city].filter(Boolean).join(', ') || 'Location TBD'}</span>
        </div>
      </Card>

      {geo && (
        <Card className="overflow-hidden p-0">
          <MapView center={[geo[1], geo[0]]} markers={[{ position: [geo[1], geo[0]], label: room.location?.name }]} className="h-52 w-full z-0" />
        </Card>
      )}

      {room.roomRules && (
        <Card className="p-4">
          <h3 className="font-extrabold text-xs text-ink uppercase tracking-wider mb-1.5">House Rules</h3>
          <p className="text-xs text-ink-soft leading-relaxed">{room.roomRules}</p>
        </Card>
      )}
    </div>
  );
}
