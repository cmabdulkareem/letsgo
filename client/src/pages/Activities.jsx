import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Search, MapPin, SlidersHorizontal, X, LocateFixed } from 'lucide-react';
import { api } from '../lib/api';
import ActivityCard from '../components/ActivityCard';
import { CategoryIcon } from '../components/CategoryIcon';
import { Button, EmptyState, ErrorState, Select, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';

const SORTS = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'newest', label: 'Newest' },
  { value: 'relevance', label: 'Relevance' },
  { value: 'distance', label: 'Distance' },
];

function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = (await api.get('/categories')).data.data;
      return res?.categories || res || [];
    },
    staleTime: 5 * 60_000,
  });
}

function buildParams(filters) {
  const params = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value !== '' && value !== undefined && value !== null) params[key] = value;
  }
  return params;
}

export default function Activities() {
  const [params] = useSearchParams();
  const initialCategory = params.get('category') || '';
  const initialQ = params.get('q') || '';
  const initialCity = params.get('city') || '';

  const [filters, setFilters] = useState({
    q: initialQ,
    city: initialCity,
    category: initialCategory,
    sort: 'upcoming',
    timeOfDay: '',
    skillLevel: '',
    cost: '',
    hasSpots: '',
    dateFrom: '',
    dateTo: '',
    lat: '',
    lng: '',
    maxKm: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [geoState, setGeoState] = useState({ status: 'idle', message: '' });
  const { showToast } = useToast();
  const { data: categories } = useCategories();

  const queryParams = useMemo(() => {
    const p = buildParams(filters);
    p.limit = 12;
    return p;
  }, [filters]);

  const query = useInfiniteQuery({
    queryKey: ['activities', queryParams],
    queryFn: async ({ pageParam = 1 }) => {
      const { data } = await api.get('/activities', { params: { ...queryParams, page: pageParam } });
      return data.data;
    },
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
  });

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoState({ status: 'error', message: 'Geolocation is not supported on this device.' });
      return;
    }
    setGeoState({ status: 'loading', message: '' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFilters((f) => ({
          ...f,
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
          maxKm: f.maxKm || '25',
          sort: 'distance',
        }));
        setGeoState({ status: 'ok', message: '' });
      },
      () => setGeoState({ status: 'error', message: 'Location permission denied. You can type a city instead.' }),
      { timeout: 8000 }
    );
  };

  const set = (key) => (e) => setFilters((f) => ({ ...f, [key]: e.target.value }));
  const clearFilters = () =>
    setFilters({ q: '', city: '', category: '', sort: 'upcoming', timeOfDay: '', skillLevel: '', cost: '', hasSpots: '', dateFrom: '', dateTo: '', lat: '', lng: '', maxKm: '' });

  const items = query.data?.pages.flatMap((p) => p.items) || [];
  const hasActiveFilters = Object.entries(filters).some(
    ([k, v]) => v && !['q', 'city', 'sort'].includes(k)
  );

  return (
    <div>
      <h1 className="text-xl font-extrabold text-ink">Discover activities</h1>
      <p className="text-sm text-ink-soft mt-0.5">Join strangers doing the things you love — no invite needed.</p>

      {/* Search bar */}
      <div className="card p-2 mt-4 flex gap-2">
        <label className="flex items-center gap-2 flex-1 px-2 min-h-[44px]">
          <Search size={17} className="text-ink-soft shrink-0" />
          <input
            value={filters.q}
            onChange={set('q')}
            placeholder="Search activities…"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none"
            aria-label="Search activities"
          />
        </label>
        <label className="flex items-center gap-2 flex-1 px-2 min-h-[44px] border-l border-border">
          <MapPin size={17} className="text-ink-soft shrink-0" />
          <input
            value={filters.city}
            onChange={set('city')}
            placeholder="City"
            className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none"
            aria-label="City"
          />
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          aria-label="Use my location"
          className="w-11 h-11 grid place-items-center rounded-full text-ink-soft hover:bg-border/40 hover:text-primary shrink-0"
        >
          <LocateFixed size={18} />
        </button>
      </div>
      {geoState.message && <p className="text-xs text-ink-soft mt-1.5">{geoState.message}</p>}

      {/* Category chips */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4">
        <button
          type="button"
          onClick={() => setFilters((f) => ({ ...f, category: '' }))}
          className={`chip border shrink-0 ${!filters.category ? 'bg-primary text-white border-primary' : 'border-border text-ink-soft'}`}
        >
          All
        </button>
        {(Array.isArray(categories) ? categories : []).map((c) => (
          <button
            key={c._id}
            type="button"
            onClick={() => setFilters((f) => ({ ...f, category: f.category === c.slug ? '' : c.slug }))}
            className={`chip border shrink-0 inline-flex items-center gap-1.5 ${
              filters.category === c.slug ? 'bg-primary text-white border-primary' : 'border-border text-ink-soft'
            }`}
          >
            <CategoryIcon category={c} size={18} iconSize={11} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Filter toggle + sort */}
      <div className="flex items-center gap-2 mt-4">
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className={`chip border ${showFilters || hasActiveFilters ? 'border-primary text-primary bg-primary/10' : 'border-border text-ink-soft'}`}
          aria-expanded={showFilters}
        >
          <SlidersHorizontal size={13} /> Filters
        </button>
        <div className="ml-auto w-40">
          <Select aria-label="Sort by" value={filters.sort} onChange={set('sort')}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                Sort: {s.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {showFilters && (
        <div className="card p-4 mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Select label="Time of day" value={filters.timeOfDay} onChange={set('timeOfDay')}>
            <option value="">Any time</option>
            <option value="morning">Morning</option>
            <option value="afternoon">Afternoon</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
          </Select>
          <Select label="Skill level" value={filters.skillLevel} onChange={set('skillLevel')}>
            <option value="">Any level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </Select>
          <Select label="Cost" value={filters.cost} onChange={set('cost')}>
            <option value="">Free + paid</option>
            <option value="free">Free only</option>
            <option value="paid">Paid only</option>
          </Select>
          <Select label="Availability" value={filters.hasSpots} onChange={set('hasSpots')}>
            <option value="">Any</option>
            <option value="true">Spots available</option>
            <option value="false">Full</option>
          </Select>
          <div>
            <label className="label" htmlFor="dateFrom">From date</label>
            <input id="dateFrom" type="date" className="input" value={filters.dateFrom} onChange={set('dateFrom')} />
          </div>
          <div>
            <label className="label" htmlFor="dateTo">To date</label>
            <input id="dateTo" type="date" className="input" value={filters.dateTo} onChange={set('dateTo')} />
          </div>
          {filters.lat && (
            <div className="col-span-2 sm:col-span-3 flex items-center gap-2">
              <span className="chip bg-primary/10 text-primary">
                Within {filters.maxKm || '∞'} km of you
              </span>
              <button
                type="button"
                className="text-xs font-semibold text-ink-soft hover:text-ink"
                onClick={() => setFilters((f) => ({ ...f, lat: '', lng: '', maxKm: '' }))}
              >
                <X size={12} className="inline" /> Clear location
              </button>
            </div>
          )}
          <div className="col-span-2 sm:col-span-3 flex gap-2">
            <Button variant="secondary" size="sm" onClick={clearFilters}>
              Reset all
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="mt-5">
        {query.isLoading && <Spinner label="Finding activities…" />}
        {query.isError && <ErrorState message="Could not load activities" onRetry={() => query.refetch()} />}
        {query.isSuccess && items.length === 0 && (
          <EmptyState
            title="No activities match those filters"
            hint="Try widening the date range, clearing filters, or create the activity yourself."
          />
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => (
            <ActivityCard key={a._id} activity={a} />
          ))}
        </div>
        {query.hasNextPage && (
          <div className="mt-6 text-center">
            <Button variant="secondary" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
