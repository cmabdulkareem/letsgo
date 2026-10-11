import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Button, Card, EmptyState, ErrorState, Spinner } from '../components/ui';
import { UserAvatar } from '../components/Avatar';

export default function BlockedUsers() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['blocked-users'],
    queryFn: async () => (await api.get('/users/me/blocked')).data.data,
  });

  const unblock = useMutation({
    mutationFn: async (userId) => api.delete(`/users/${userId}/block`),
    onSuccess: () => {
      showToast('User unblocked', 'success');
      queryClient.invalidateQueries({ queryKey: ['blocked-users'] });
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const blocked = data?.items || data || [];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold text-ink">Blocked users</h1>
      <p className="text-sm text-ink-soft mt-0.5">
        Blocked people can&rsquo;t message you or see your activity in shared rooms.
      </p>

      <div className="mt-5 space-y-2">
        {isLoading && <Spinner label="Loading…" />}
        {isError && <ErrorState message="Could not load blocked users" onRetry={refetch} />}
        {!isLoading && blocked.length === 0 && (
          <Card>
            <EmptyState icon={<Ban size={26} />} title="No one blocked" hint="When you block someone, they appear here." />
          </Card>
        )}
        {blocked.map((entry) => {
          const u = entry.blockedUser || entry.user || entry;
          const id = u._id || entry.blockedUser?._id;
          return (
            <Card key={id} className="p-3 flex items-center gap-3">
              <UserAvatar user={u} size={40} />
              <div className="min-w-0 flex-1">
                <Link to={`/u/${u.username}`} className="text-sm font-bold text-ink hover:text-primary">
                  {u.displayName}
                </Link>
                <p className="text-xs text-ink-soft">@{u.username}</p>
              </div>
              <Button variant="secondary" size="sm" loading={unblock.isPending} onClick={() => unblock.mutate(id)}>
                Unblock
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
