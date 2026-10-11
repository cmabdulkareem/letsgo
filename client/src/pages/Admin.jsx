import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag, ScrollText, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, errorMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { Badge, Button, Card, EmptyState, ErrorState, Input, Spinner } from '../components/ui';
import { UserAvatar } from '../components/Avatar';
import { fromNow } from '../lib/format';

const TABS = [
  { id: 'reports', label: 'Reports' },
  { id: 'users', label: 'Users' },
  { id: 'audit', label: 'Audit log' },
];

function ReportsTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: async () => (await api.get('/admin/reports', { params: { limit: 50 } })).data.data,
  });

  const review = useMutation({
    mutationFn: async ({ reportId, ...payload }) => api.patch(`/admin/reports/${reportId}`, payload),
    onSuccess: () => {
      showToast('Report reviewed', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  const items = data?.items || [];
  const pending = items.filter((r) => r.status === 'pending');
  const reviewed = items.filter((r) => r.status !== 'pending');

  if (isLoading) return <Spinner label="Loading reports…" />;
  if (isError) return <ErrorState message="Could not load reports" onRetry={refetch} />;

  return (
    <div className="space-y-4">
      {pending.length === 0 && (
        <Card>
          <EmptyState icon={<ShieldCheck size={26} />} title="No open reports" hint="New reports from members will appear here." />
        </Card>
      )}
      {[...pending, ...reviewed].map((r) => (
        <Card key={r._id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <Badge tone={r.status === 'pending' ? 'amber' : r.status === 'resolved' ? 'green' : 'neutral'}>{r.status}</Badge>
            <span className="text-xs text-ink-soft">{fromNow(r.createdAt)}</span>
          </div>
          <p className="text-sm font-bold text-ink mt-2 capitalize">{r.reason?.replace(/_/g, ' ')}</p>
          {r.description && <p className="text-sm text-ink-soft mt-1 whitespace-pre-line">{r.description}</p>}
          <p className="text-xs text-ink-soft mt-2">
            Reported: <Link className="font-semibold text-primary" to={`/u/${r.reportedUser?.username}`}>{r.reportedUser?.displayName || 'user'}</Link>
            {' · '}By: {r.reporter?.displayName || 'member'}
          </p>
          {r.status === 'pending' && (
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" onClick={() => review.mutate({ reportId: r._id, status: 'resolved', actionTaken: 'none' })}>
                Dismiss / no action
              </Button>
              <Button size="sm" variant="danger" onClick={() => review.mutate({ reportId: r._id, status: 'resolved', actionTaken: 'suspension' })}>
                Resolve & suspend user
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function UsersTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users', submitted],
    queryFn: async () => (await api.get('/admin/users', { params: { q: submitted, limit: 50 } })).data.data,
  });

  const toggle = useMutation({
    mutationFn: async ({ userId, suspend }) =>
      suspend ? api.post(`/admin/users/${userId}/suspend`, { reason: 'Violation of community guidelines' }) : api.post(`/admin/users/${userId}/unsuspend`),
    onSuccess: (_d, { suspend }) => {
      showToast(suspend ? 'User suspended' : 'User reinstated', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => showToast(errorMessage(err), 'error'),
  });

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q);
        }}
      >
        <Input placeholder="Search by name, username or email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search users" />
      </form>
      {isLoading && <Spinner label="Loading users…" />}
      {isError && <ErrorState message="Could not load users" onRetry={refetch} />}
      {(data?.items || []).map((u) => (
        <Card key={u._id} className="p-3 flex items-center gap-3">
          <UserAvatar user={u} size={40} />
          <div className="min-w-0 flex-1">
            <Link to={`/u/${u.username}`} className="text-sm font-bold text-ink hover:text-primary">
              {u.displayName}
            </Link>
            <p className="text-xs text-ink-soft truncate">
              @{u.username} · {u.email} · {u.role}
              {u.accountStatus !== 'active' && <span className="text-red-500 font-semibold"> · {u.accountStatus}</span>}
            </p>
          </div>
          {u.role !== 'admin' && (
            <Button
              size="sm"
              variant={u.accountStatus === 'active' ? 'ghost' : 'primary'}
              loading={toggle.isPending}
              onClick={() => toggle.mutate({ userId: u._id, suspend: u.accountStatus === 'active' })}
            >
              {u.accountStatus === 'active' ? (
                <>
                  <UserX size={14} /> Suspend
                </>
              ) : (
                <>
                  <UserCheck size={14} /> Reinstate
                </>
              )}
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}

function AuditTab() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-audit'],
    queryFn: async () => (await api.get('/admin/audit', { params: { limit: 50 } })).data.data,
  });

  if (isLoading) return <Spinner label="Loading audit log…" />;
  if (isError) return <ErrorState message="Could not load audit log" onRetry={refetch} />;

  return (
    <Card className="p-4">
      <div className="space-y-2.5">
        {(data?.items || []).map((a) => (
          <div key={a._id} className="flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="text-ink">
                <span className="font-semibold">{a.action}</span>
                {a.targetType && <span className="text-ink-soft"> · {a.targetType}</span>}
              </p>
              {a.details && <p className="text-xs text-ink-soft truncate">{JSON.stringify(a.details)}</p>}
            </div>
            <span className="text-xs text-ink-soft shrink-0">{fromNow(a.createdAt)}</span>
          </div>
        ))}
        {(data?.items || []).length === 0 && <p className="text-sm text-ink-soft text-center py-6">No moderation actions recorded yet.</p>}
      </div>
    </Card>
  );
}

export default function Admin() {
  const [tab, setTab] = useState('reports');

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-extrabold text-ink flex items-center gap-2">
        <Flag size={20} className="text-primary" /> Moderation
      </h1>

      <div className="flex gap-1 mt-4 border-b border-border" role="tablist" aria-label="Moderation sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-bold min-h-[44px] border-b-2 -mb-px flex items-center gap-1.5 ${
              tab === t.id ? 'border-primary text-primary' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t.id === 'audit' && <ScrollText size={14} />}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === 'reports' && <ReportsTab />}
        {tab === 'users' && <UsersTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
