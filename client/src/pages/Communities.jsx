import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, Users } from 'lucide-react';
import { api } from '../lib/api';
import { CategoryIcon } from '../components/CategoryIcon';
import { EmptyState, ErrorState, Select, Spinner } from '../components/ui';
import { MemberStack } from '../components/Avatar';

function CommunityCard({ community: c }) {
  return (
    <Link
      to={`/communities/${c._id}`}
      className="card block overflow-hidden hover:shadow-lift transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div
        className="h-24 relative"
        style={{ background: `linear-gradient(135deg, ${c.category?.color || '#08B981'}33, #10172A 130%)` }}
      >
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
          <span className="flex items-center gap-1.5 text-xs text-ink-soft">
            <Users size={13} />
            {c.memberCount ?? 0} members
          </span>
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

export default function Communities() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [sort, setSort] = useState('newest');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['communities', submitted, sort],
    queryFn: async () => (await api.get('/communities', { params: { q: submitted, sort, limit: 30 } })).data.data,
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-ink">Communities</h1>
          <p className="text-sm text-ink-soft mt-0.5">Crews that meet again and again.</p>
        </div>
        <Link to="/create">
          <button type="button" className="px-4 py-2.5 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary-600 min-h-[44px]">
            Create
          </button>
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q);
        }}
        className="card p-2 mt-4 flex gap-2"
      >
        <label className="flex items-center gap-2 flex-1 px-3 min-h-[44px]">
          <Search size={17} className="text-ink-soft shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search communities…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none"
            aria-label="Search communities"
          />
        </label>
        <div className="w-36">
          <Select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Newest</option>
            <option value="members">Most members</option>
          </Select>
        </div>
      </form>

      <div className="mt-5">
        {isLoading && <Spinner label="Loading communities…" />}
        {isError && <ErrorState message="Could not load communities" onRetry={refetch} />}
        {data?.items?.length === 0 && (
          <EmptyState title="No communities yet" hint="Be the first — create a crew for your favorite activity." />
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.items?.map((c) => (
            <CommunityCard key={c._id} community={c} />
          ))}
        </div>
      </div>
    </div>
  );
}
