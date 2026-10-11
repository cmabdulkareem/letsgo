import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarClock, CheckCircle2, History } from 'lucide-react';
import { api } from '../lib/api';
import { Badge, Card, EmptyState, ErrorState, Spinner } from '../components/ui';
import { CategoryIcon } from '../components/CategoryIcon';
import { MemberStack } from '../components/Avatar';
import { formatDateTime } from '../lib/format';

const TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'joined', label: 'Joined' },
  { id: 'hosted', label: 'Hosting' },
  { id: 'past', label: 'Past' },
];

export default function MyActivity() {
  const [tab, setTab] = useState('upcoming');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-activity', tab],
    queryFn: async () => (await api.get('/users/me/activities', { params: { tab, limit: 30 } })).data.data,
  });

  const items = data?.items || [];

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-extrabold text-ink">My Activity</h1>

      <div className="flex gap-2 mt-4 overflow-x-auto -mx-4 px-4 pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`chip border shrink-0 min-h-[40px] ${
              tab === t.id ? 'bg-primary text-white border-primary' : 'border-border text-ink-soft'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {isLoading && <Spinner label="Loading…" />}
        {isError && <ErrorState message="Could not load your activity" onRetry={refetch} />}
        {!isLoading && !isError && items.length === 0 && (
          <Card>
            <EmptyState
              icon={tab === 'hosted' ? <CalendarClock size={26} /> : <History size={26} />}
              title={
                tab === 'hosted'
                  ? "You haven't hosted yet"
                  : tab === 'past'
                    ? 'Nothing in the past yet'
                    : 'Nothing here yet'
              }
              hint="Discover something happening near you and it will show up here."
            />
          </Card>
        )}
        {items.map((m) => {
          const room = m.room;
          if (!room) return null;
          const isHost = m.role === 'host';
          return (
            <Link key={m._id} to={`/rooms/${room._id}`} className="card p-3 flex items-center gap-3 hover:shadow-lift transition">
              <CategoryIcon category={room.category} size={44} iconSize={22} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-ink truncate">{room.title}</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  {room.confirmedStartAt || room.nextAt ? formatDateTime(room.confirmedStartAt || room.nextAt) : 'Date being decided'}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  {isHost && <Badge tone="blue">Host</Badge>}
                  {m.attendanceStatus === 'going' && (
                    <Badge tone="green">
                      <CheckCircle2 size={11} className="mr-0.5" /> Going
                    </Badge>
                  )}
                  {m.membershipStatus === 'waitlisted' && <Badge tone="amber">Waitlisted</Badge>}
                </div>
              </div>
              {room.membersPreview?.length > 0 && <MemberStack members={room.membersPreview} size={26} max={3} />}
            </Link>
          );
        })}
      </div>

      {items.length > 0 && (
        <p className="text-center mt-6">
          <Link to="/explore" className="text-sm font-semibold text-primary hover:underline">
            Find more activities
          </Link>
        </p>
      )}
    </div>
  );
}
