import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Users, Compass } from 'lucide-react';
import { api } from '../lib/api';
import ActivityCard from '../components/ActivityCard';
import { CategoryIcon } from '../components/CategoryIcon';
import { EmptyState, ErrorState, Select, Spinner } from '../components/ui';
import { MemberStack } from '../components/Avatar';

function CommunityCard({ community }) {
  const c = community;
  return (
    <Link
      to={`/communities/${c._id}`}
      className="card block overflow-hidden hover:shadow-lift transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="h-24 relative" style={{ background: `linear-gradient(135deg, ${c.category?.color || '#08B981'}33, #10172A 130%)` }}>
        <div className="absolute inset-0 grid place-items-center opacity-25">
          <CategoryIcon category={c.category} size={90} iconSize={48} />
        </div>
        <div className="absolute top-3 left-3">
          {c.visibility === 'private' ? (
            <span className="chip bg-black/45 text-white">Private</span>
          ) : (
            <span className="chip bg-primary text-white">{c.category?.name}</span>
          )}
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-ink group-hover:text-primary transition-colors truncate">{c.name}</h3>
        <p className="text-xs text-ink-soft mt-1 line-clamp-2">{c.description}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Users size={13} />
            {c.memberCount ?? 0} members
          </div>
          {c.nextSession?.startAt && (
            <span className="text-[11px] font-semibold text-primary">
              Next: {new Date(c.nextSession.startAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Explore() {
  const [tab, setTab] = useState('activities');
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [submitted, setSubmitted] = useState({ q: '', city: '' });

  const activities = useQuery({
    queryKey: ['explore-activities', submitted],
    queryFn: async () =>
      (await api.get('/activities', { params: { q: submitted.q, city: submitted.city, sort: 'upcoming', limit: 24 } })).data.data,
    enabled: tab === 'activities',
  });

  const communities = useQuery({
    queryKey: ['explore-communities', submitted],
    queryFn: async () =>
      (await api.get('/communities', { params: { q: submitted.q, city: submitted.city, sort: 'members', limit: 24 } })).data.data,
    enabled: tab === 'communities',
  });

  const submit = (e) => {
    e.preventDefault();
    setSubmitted({ q, city });
  };

  return (
    <div>
      <h1 className="text-xl font-extrabold text-ink">Explore</h1>

      <form onSubmit={submit} className="card p-2 mt-3 flex flex-col sm:flex-row gap-2">
        <label className="flex items-center gap-2 flex-1 px-3 min-h-[44px]">
          <Search size={17} className="text-ink-soft shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={tab === 'activities' ? 'Search activities…' : 'Search communities…'}
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none"
            aria-label="Search"
          />
        </label>
        <label className="flex items-center gap-2 flex-1 px-3 min-h-[44px] sm:border-l border-border">
          <span className="text-sm text-ink-soft shrink-0">City</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Kasaragod"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none"
            aria-label="City"
          />
        </label>
        <button
          type="submit"
          className="px-5 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-600 min-h-[44px]"
        >
          Search
        </button>
      </form>

      <div className="flex gap-2 mt-4">
        {[
          { id: 'activities', label: 'Activities', icon: Compass },
          { id: 'communities', label: 'Communities', icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-pressed={tab === id}
            className={`chip border min-h-[40px] ${
              tab === id ? 'bg-primary text-white border-primary' : 'border-border text-ink-soft'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {tab === 'activities' && (
        <div className="mt-5">
          {activities.isLoading && <Spinner label="Searching…" />}
          {activities.isError && <ErrorState message="Search failed" onRetry={activities.refetch} />}
          {activities.data?.items?.length === 0 && (
            <EmptyState title="No activities found" hint="Try a different keyword or city — or create one yourself." />
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activities.data?.items?.map((a) => (
              <ActivityCard key={a._id} activity={a} />
            ))}
          </div>
        </div>
      )}

      {tab === 'communities' && (
        <div className="mt-5">
          {communities.isLoading && <Spinner label="Searching…" />}
          {communities.isError && <ErrorState message="Search failed" onRetry={communities.refetch} />}
          {communities.data?.items?.length === 0 && (
            <EmptyState title="No communities found" hint="Try another keyword or city." />
          )}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {communities.data?.items?.map((c) => (
              <CommunityCard key={c._id} community={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
