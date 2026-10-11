import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, MapPin, ArrowRight, ShieldCheck, Users, CalendarCheck,
  Sparkles, Download, Check
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/AppLayout';
import ActivityCard from '../components/ActivityCard';
import { CategoryIcon } from '../components/CategoryIcon';
import { Button, Skeleton } from '../components/ui';

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

function useFeatured() {
  return useQuery({
    queryKey: ['featured-activities'],
    queryFn: async () => (await api.get('/activities', { params: { sort: 'upcoming', limit: 6 } })).data.data,
  });
}

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (city.trim()) params.set('city', city.trim());
    navigate(`/activities?${params.toString()}`);
  };

  return (
    <form onSubmit={submit} className="card p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto shadow-lift">
      <label className="flex items-center gap-2 flex-1 px-3 min-h-[44px]">
        <Search size={18} className="text-ink-soft shrink-0" />
        <span className="sr-only">Activity</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cricket, trekking, board games…"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none"
        />
      </label>
      <label className="flex items-center gap-2 flex-1 px-3 min-h-[44px] border-t sm:border-t-0 sm:border-l border-border">
        <MapPin size={18} className="text-ink-soft shrink-0" />
        <span className="sr-only">Location</span>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Kasaragod"
          className="w-full bg-transparent text-sm text-ink placeholder:text-ink-soft/70 focus:outline-none"
        />
      </label>
      <Button type="submit" className="shrink-0">
        Find an activity
      </Button>
    </form>
  );
}

const STEPS = [
  { icon: Search, title: 'Discover', text: 'Browse public activities near you — no invite needed.' },
  { icon: Users, title: 'Join a room', text: 'Meet people who want to do the same thing you do.' },
  { icon: CalendarCheck, title: 'Vote & schedule', text: 'Pick dates that work; the host locks the plan.' },
  { icon: Sparkles, title: 'Show up', text: 'Play, ride, watch, explore — then come back for more.' },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { data: categories } = useCategories();
  const { data: featured, isLoading } = useFeatured();
  const home = isAuthenticated ? '/home' : '/register';

  return (
    <div className="-mx-4 -my-4 pb-16">
      {/* Hero Onboarding matching Mockup Screen 1 */}
      <section className="relative min-h-[85vh] sm:min-h-[75vh] flex flex-col justify-between bg-navy text-white overflow-hidden px-4 py-8">
        {/* Scenic sunrise mountain backdrop */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-navy/40 to-navy z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-transparent to-transparent z-10" />
          <img
            src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80"
            alt="Hikers on mountain at sunrise"
            className="w-full h-full object-cover object-center opacity-45 transform scale-105"
          />
        </div>

        {/* Brand Header */}
        <div className="relative z-20 pt-4 text-center">
          <div className="inline-flex flex-col items-center">
            <span className="font-black text-3xl sm:text-4xl text-white tracking-tight flex items-center gap-1.5 font-sans drop-shadow-md">
              Let&rsquo;s Go <span className="text-primary font-black">▸</span>
            </span>
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-emerald-400 mt-1 uppercase">
              People. Activities. Real Connections.
            </p>
          </div>
        </div>

        {/* Hero Headline & Actions matching Mockup Screen 1 */}
        <div className="relative z-20 max-w-lg mx-auto w-full text-center my-auto py-10">
          <h1 className="text-3xl sm:text-5xl font-black leading-tight tracking-tight drop-shadow-md">
            Don&rsquo;t wait for friends.
            <br />
            <span className="text-primary">Find your people.</span>
          </h1>

          <p className="mt-3 text-slate-300 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            Join public cricket matches, weekend rides, trekking groups, or board games in Kasaragod and beyond.
          </p>

          {/* Carousel dots indicator matching Mockup Screen 1 */}
          <div className="flex items-center justify-center gap-2 mt-6 mb-8" aria-hidden>
            <span className="w-6 h-1.5 rounded-full bg-primary" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
            <Link to={home} className="w-full">
              <Button
                size="lg"
                className="w-full !rounded-full !py-3.5 !text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-primary/30"
              >
                Get Started <ArrowRight size={17} />
              </Button>
            </Link>

            <Link to="/login" className="w-full">
              <button
                type="button"
                className="w-full py-3.5 px-6 rounded-full border border-slate-600/80 bg-slate-900/60 backdrop-blur-md text-white text-sm font-bold hover:bg-slate-800 transition shadow-sm"
              >
                I already have an account
              </button>
            </Link>
          </div>
        </div>

        {/* Quick Search on Hero Bottom */}
        <div className="relative z-20 pb-4 max-w-xl mx-auto w-full">
          <HeroSearch />
        </div>
      </section>

      {/* Popular Categories */}
      <section className="max-w-5xl mx-auto px-4 mt-12">
        <h2 className="text-lg font-extrabold text-ink">Popular categories</h2>
        <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {(Array.isArray(categories) ? categories : []).slice(0, 9).map((c) => (
            <Link
              key={c._id}
              to={`/activities?category=${c.slug}`}
              className="card !shadow-none p-3 flex flex-col items-center gap-2 text-center hover:border-primary transition-colors"
            >
              <CategoryIcon category={c} size={44} iconSize={22} />
              <span className="text-[11px] font-semibold text-ink-soft leading-tight">{c.name}</span>
            </Link>
          ))}
          {isLoading && Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </section>

      {/* Happening Soon */}
      <section className="max-w-5xl mx-auto px-4 mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-ink">Happening soon</h2>
          <Link to="/activities" className="text-sm font-bold text-primary hover:underline">
            See all
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading && Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
          {featured?.items?.map((a) => <ActivityCard key={a._id} activity={a} />)}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 mt-14">
        <h2 className="text-lg font-extrabold text-ink text-center">How Let&rsquo;s Go works</h2>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="card p-5">
              <span className="w-11 h-11 rounded-2xl bg-primary/10 text-primary grid place-items-center">
                <Icon size={20} />
              </span>
              <p className="mt-3 text-sm font-extrabold text-ink">
                <span className="text-primary mr-1">{i + 1}.</span>
                {title}
              </p>
              <p className="mt-1 text-sm text-ink-soft">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Communities + Safety */}
      <section className="max-w-5xl mx-auto px-4 mt-14 grid lg:grid-cols-2 gap-4">
        <div className="card p-6 bg-gradient-to-br from-primary/10 to-transparent">
          <h2 className="text-lg font-extrabold text-ink">Build a crew that lasts</h2>
          <p className="mt-2 text-sm text-ink-soft leading-relaxed">
            One-off activities are just the start. Communities like Sunday Cricket Crew or Weekend Cyclists keep the
            same people coming back — with recurring sessions, shared chat and a history of everything you&rsquo;ve done
            together.
          </p>
          <Link to="/communities" className="inline-block mt-4 text-sm font-bold text-primary hover:underline">
            Explore communities →
          </Link>
        </div>
        <div className="card p-6">
          <h2 className="text-lg font-extrabold text-ink flex items-center gap-2">
            <ShieldCheck size={20} className="text-primary" /> Built with safety in mind
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-ink-soft list-disc pl-5">
            <li>Verified email badges and honest host profiles.</li>
            <li>Block and report tools on every profile and message.</li>
            <li>Your exact location is never shared — only the meeting point.</li>
            <li>Public community guidelines keep rooms welcoming.</li>
          </ul>
          <Link to="/guidelines" className="inline-block mt-4 text-sm font-bold text-primary hover:underline">
            Read safety guidelines →
          </Link>
        </div>
      </section>

      {/* Install PWA Prompt */}
      <section className="max-w-5xl mx-auto px-4 mt-14">
        <div className="card p-6 flex flex-col sm:flex-row items-center gap-4 bg-navy !border-navy text-white">
          <span className="w-12 h-12 rounded-2xl bg-primary grid place-items-center shrink-0">
            <Download size={22} />
          </span>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-extrabold text-base">Install the Let&rsquo;s Go PWA</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Add Let&rsquo;s Go to your mobile home screen for instant access, real-time notifications, and offline browsing.
            </p>
          </div>
          <Link to={home}>
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto px-4 mt-14 pt-6 border-t border-border">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-soft">
          <Logo />
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs">
            <Link to="/privacy" className="hover:text-ink">Privacy</Link>
            <Link to="/terms" className="hover:text-ink">Terms</Link>
            <Link to="/guidelines" className="hover:text-ink">Safety guidelines</Link>
            <a href="mailto:support@letsgo.app" className="hover:text-ink">Contact</a>
          </nav>
        </div>
        <p className="text-center text-xs text-ink-soft mt-4">
          &ldquo;You don&rsquo;t need a group to join. You join to find your group.&rdquo;
        </p>
      </footer>
    </div>
  );
}
