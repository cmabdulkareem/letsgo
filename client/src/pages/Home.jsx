import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  MapPin, ChevronDown, Search, Bell, Trophy, Mountain, Gamepad2,
  UtensilsCrossed, Users, CalendarClock, ArrowRight, Compass,
  Crosshair, X
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import ActivityCard from '../components/ActivityCard';
import { Card, EmptyState, ErrorState, Skeleton } from '../components/ui';
import { UserAvatar, MemberStack } from '../components/Avatar';
import { formatDateTime } from '../lib/format';

const QUICK_CATEGORIES = [
  { slug: 'cricket', name: 'Sports', icon: Trophy, bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-500' },
  { slug: 'trekking-hiking', name: 'Outdoors', icon: Mountain, bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-600' },
  { slug: 'video-games', name: 'Games', icon: Gamepad2, bg: 'bg-indigo-50 dark:bg-indigo-950/40', text: 'text-indigo-600' },
  { slug: 'food-outings', name: 'Food', icon: UtensilsCrossed, bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-500' },
  { slug: 'board-games', name: 'Social', icon: Users, bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-600' },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [city, setCity] = useState(user?.city || 'Kasaragod');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: notifData } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: async () => (await api.get('/notifications', { params: { limit: 1 } })).data.data,
    enabled: Boolean(user),
    staleTime: 15000,
  });
  const unreadCount = notifData?.unreadCount || 0;

  const mine = useQuery({
    queryKey: ['my-activity', 'upcoming'],
    queryFn: async () => (await api.get('/users/me/activities', { params: { tab: 'upcoming', limit: 5 } })).data.data,
  });

  const popular = useQuery({
    queryKey: ['popular-activities', city],
    queryFn: async () =>
      (await api.get('/activities', { params: { city: city || '', sort: 'upcoming', limit: 6 } })).data.data,
  });

  const communities = useQuery({
    queryKey: ['my-communities', 'home'],
    queryFn: async () => (await api.get('/users/me/communities')).data.data,
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const handleGpsLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => {
        setCity('Kasaragod');
        setShowLocationModal(false);
      },
      () => {
        setShowLocationModal(false);
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar matching Mockup Screen 2 */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowLocationModal(true)}
          className="flex items-center gap-1.5 text-sm font-bold text-ink hover:text-primary transition-colors py-1 px-1 -ml-1 rounded-lg"
          aria-label="Change location"
        >
          <MapPin size={18} className="text-primary shrink-0" />
          <span>{city}</span>
          <ChevronDown size={15} className="text-ink-soft shrink-0" />
        </button>

        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            className="relative w-10 h-10 grid place-items-center rounded-full hover:bg-border/40 text-ink-soft hover:text-ink transition"
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface" />
            )}
          </Link>

          <Link to="/profile" className="shrink-0" aria-label="Profile">
            <UserAvatar user={user} size={36} />
          </Link>
        </div>
      </div>

      {/* Greeting Heading */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-ink tracking-tight flex items-center gap-2">
          Hi there! <span className="inline-block animate-pulse">👋</span>
        </h1>
        <p className="text-sm font-medium text-ink-soft mt-0.5">
          What do you want to do today?
        </p>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search activities, people or places..."
          className="w-full bg-surface rounded-2xl border border-border pl-11 pr-4 py-3 text-sm text-ink placeholder:text-ink-soft/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
        />
      </form>

      {/* Category Icons Row matching Mockup Screen 2 */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 pt-1 -mx-4 px-4 no-scrollbar">
        {QUICK_CATEGORIES.map(({ slug, name, icon: Icon, bg, text }) => (
          <Link
            key={slug}
            to={`/explore?category=${slug}`}
            className="flex flex-col items-center gap-2 shrink-0 group focus:outline-none"
          >
            <div
              className={`w-14 h-14 rounded-full ${bg} ${text} grid place-items-center shadow-sm group-hover:scale-105 active:scale-95 transition-transform`}
            >
              <Icon size={24} />
            </div>
            <span className="text-xs font-bold text-ink-soft group-hover:text-ink transition-colors">
              {name}
            </span>
          </Link>
        ))}
      </div>

      {/* Popular near you */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-ink">Popular near you</h2>
          <Link to="/explore" className="text-xs font-bold text-primary hover:underline">
            See all
          </Link>
        </div>

        {popular.isLoading && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        )}
        {popular.isError && (
          <ErrorState message="Could not load activities" onRetry={popular.refetch} />
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {popular.data?.items?.map((a) => (
            <ActivityCard key={a._id} activity={a} />
          ))}
        </div>
      </section>

      {/* My upcoming */}
      {mine.data?.items?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <CalendarClock size={18} className="text-primary" /> Your upcoming
            </h2>
            <Link to="/my-activity" className="text-xs font-bold text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {mine.data.items.map((m) => (
              <Link
                key={m.room?._id || m._id}
                to={`/rooms/${m.room?._id}`}
                className="card p-3.5 flex items-center gap-3 hover:shadow-lift transition"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink truncate">{m.room?.title}</p>
                  <p className="text-xs text-ink-soft mt-0.5">
                    {m.room?.confirmedStartAt ? formatDateTime(m.room.confirmedStartAt) : 'Date being voted'}
                    {m.attendanceStatus === 'going' && ' • You’re going'}
                  </p>
                </div>
                <MemberStack members={(m.room?.membersPreview || []).slice(0, 3)} size={26} max={3} />
                <ArrowRight size={16} className="text-ink-soft shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* My communities strip */}
      {communities.data?.items?.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
              <Users size={18} className="text-primary" /> Your communities
            </h2>
            <Link to="/communities" className="text-xs font-bold text-primary hover:underline">
              See all
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {communities.data.items.slice(0, 8).map((c) => (
              <Link
                key={c.community?._id || c._id}
                to={`/communities/${c.community?._id}`}
                className="card p-3.5 w-48 shrink-0 hover:border-primary transition-colors"
              >
                <p className="text-sm font-extrabold text-ink truncate">{c.community?.name}</p>
                <p className="text-xs text-ink-soft mt-1 truncate">
                  {c.community?.memberCount ?? 1} members
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Location Picker Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="card max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-ink">Choose location</h3>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="w-8 h-8 grid place-items-center rounded-full text-ink-soft hover:text-ink"
              >
                <X size={18} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleGpsLocation}
              className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-primary/30 bg-primary/5 text-primary text-sm font-bold hover:bg-primary/10 transition"
            >
              <Crosshair size={18} /> Use my current location (GPS)
            </button>

            <div className="space-y-1 pt-1">
              {['Kasaragod', 'Kanhangad', 'Bekal', 'Mangalore', 'Kannur', 'Bangalore'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCity(c);
                    setShowLocationModal(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                    city === c ? 'bg-primary text-white' : 'text-ink hover:bg-border/50'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
