import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { api } from '../lib/api';
import ActivityCard from '../components/ActivityCard';
import { Button, EmptyState, ErrorState, Spinner } from '../components/ui';

export default function Saved() {
  const query = useQuery({
    queryKey: ['saved-activities'],
    queryFn: async () => (await api.get('/activities/saved')).data.data,
  });

  return (
    <div>
      <h1 className="text-xl font-extrabold text-ink">Saved activities</h1>
      <p className="text-sm text-ink-soft mt-0.5">Your bookmarked activities, all in one place.</p>

      <div className="mt-5">
        {query.isLoading && <Spinner label="Loading saved…" />}
        {query.isError && <ErrorState message="Could not load saved activities" onRetry={query.refetch} />}
        {query.isSuccess && query.data?.items?.length === 0 && (
          <EmptyState
            icon={<Bookmark size={26} />}
            title="Nothing saved yet"
            hint="Tap the bookmark on any activity card to keep it here."
            action={
              <Link to="/explore">
                <Button>Browse activities</Button>
              </Link>
            }
          />
        )}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {query.data?.items?.map((a) => (
            <ActivityCard key={a._id} activity={a} />
          ))}
        </div>
      </div>
    </div>
  );
}
