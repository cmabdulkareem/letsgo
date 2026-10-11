import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Card, EmptyState, ErrorState, Spinner } from '../components/ui';
import { fromNow } from '../lib/format';

function entityUrl(n) {
  const e = n.relatedEntity;
  if (!e?.kind || !e?.id) return null;
  if (e.kind === 'room' || e.kind === 'message') return `/rooms/${e.id}`;
  if (e.kind === 'community' || e.kind === 'session') return `/communities/${e.id}`;
  if (e.kind === 'user') return `/u/${e.id}`;
  if (e.kind === 'report') return '/admin';
  return null;
}

export default function Notifications() {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications', { params: { limit: 50 } })).data.data,
  });

  const markAll = useMutation({
    mutationFn: async () => api.post('/notifications/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markRead = useMutation({
    mutationFn: async (id) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Live updates while the page is open.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;
    const onNew = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', onNew);
    return () => socket.off('notification:new', onNew);
  }, [queryClient]);

  const items = data?.items || [];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-ink">Notifications</h1>
        {items.some((n) => !n.readAt) && (
          <button
            type="button"
            onClick={() => markAll.mutate()}
            className="text-sm font-semibold text-primary hover:underline flex items-center gap-1 min-h-[44px]"
          >
            <CheckCheck size={15} /> Mark all read
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {isLoading && <Spinner label="Loading…" />}
        {isError && <ErrorState message="Could not load notifications" onRetry={refetch} />}
        {isSuccessEmpty(isLoading, isError, items) && (
          <Card>
            <EmptyState icon={<Bell size={26} />} title="All caught up" hint="Join requests, polls and schedule changes will show here." />
          </Card>
        )}
        {items.map((n) => {
          const url = entityUrl(n);
          const inner = (
            <div
              className={`card p-4 flex gap-3 transition ${n.readAt ? 'opacity-70' : 'border-primary/40'}`}
            >
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${n.readAt ? 'bg-border' : 'bg-primary'}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink">{n.title}</p>
                {n.body && <p className="text-sm text-ink-soft mt-0.5">{n.body}</p>}
                <p className="text-xs text-ink-soft mt-1">{fromNow(n.createdAt)}</p>
              </div>
            </div>
          );
          return url ? (
            <Link
              key={n._id}
              to={url}
              onClick={() => !n.readAt && markRead.mutate(n._id)}
              className="block hover:shadow-lift rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {inner}
            </Link>
          ) : (
            <div key={n._id} onClick={() => !n.readAt && markRead.mutate(n._id)} role="button" tabIndex={0} className="cursor-pointer">
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isSuccessEmpty(isLoading, isError, items) {
  return !isLoading && !isError && items.length === 0;
}
