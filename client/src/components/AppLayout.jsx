import { useState } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home, Search, Plus, CalendarClock, User, Users, Bell, LogOut, Moon, Sun, Menu, X, Shield,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UserAvatar } from './Avatar';

export const NAV_ITEMS = [
  { to: '/home', label: 'Home', icon: Home },
  { to: '/explore', label: 'Explore', icon: Search },
  { to: '/create', label: 'Create', icon: Plus },
  { to: '/my-activity', label: 'My Activity', icon: CalendarClock },
  { to: '/profile', label: 'Profile', icon: User },
];

export function Logo({ className = '' }) {
  return (
    <Link to="/" className={`flex items-center gap-2 shrink-0 ${className}`} aria-label="Let's Go home">
      <span className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-emerald-400 grid place-items-center shadow-sm">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="white" aria-hidden>
          <path d="M6 4l14 8-14 8V4z" />
        </svg>
      </span>
      <span className="font-black text-xl text-ink tracking-tight font-sans">
        Let&rsquo;s Go<span className="text-primary font-black ml-0.5">▸</span>
      </span>
    </Link>
  );
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="w-10 h-10 grid place-items-center rounded-full text-ink-soft hover:bg-border/40 hover:text-ink transition"
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}

function LogoutButton({ onDone, className = '', label = 'Log out' }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        onDone?.();
        await logout();
        navigate('/');
      }}
    >
      <LogOut size={18} /> {label}
    </button>
  );
}

export function MobileBottomNav() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-border safe-bottom"
    >
      <div className="grid grid-cols-5 items-center px-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
          if (to === '/create') {
            return (
              <NavLink
                key={to}
                to={to}
                className="flex flex-col items-center justify-center -mt-5 group"
                aria-label="Create activity"
              >
                <span className="w-12 h-12 rounded-full bg-primary text-white grid place-items-center shadow-lg shadow-primary/30 group-hover:scale-105 active:scale-95 transition-transform">
                  <Plus size={26} strokeWidth={2.8} />
                </span>
                <span className="text-[10px] font-bold text-ink-soft mt-1">Create</span>
              </NavLink>
            );
          }
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 py-2 min-h-[56px] justify-center text-[11px] font-semibold transition-colors ${
                  isActive ? 'text-primary' : 'text-ink-soft hover:text-ink'
                }`
              }
            >
              <Icon size={22} />
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function NotifBell({ size = 19 }) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: async () => (await api.get('/notifications', { params: { limit: 1 } })).data.data,
    enabled: Boolean(user),
    staleTime: 15000,
  });
  const unread = data?.unreadCount || 0;

  return (
    <Link
      to="/notifications"
      aria-label="Notifications"
      className="relative w-10 h-10 grid place-items-center rounded-full text-ink-soft hover:bg-border/40 hover:text-ink transition"
    >
      <Bell size={size} />
      {unread > 0 && (
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-surface" />
      )}
    </Link>
  );
}

export function DesktopNav() {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <aside className="hidden lg:flex flex-col w-60 shrink-0 sticky top-0 h-screen border-r border-border bg-surface px-4 py-6">
      <Logo />
      <nav className="mt-8 flex flex-col gap-1" aria-label="Primary">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                isActive ? 'bg-primary/10 text-primary' : 'text-ink-soft hover:bg-border/40 hover:text-ink'
              }`
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center gap-1">
        <ThemeToggle />
        {user && <NotifBell size={19} />}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Account menu"
            className="w-10 h-10 grid place-items-center rounded-full hover:bg-border/40 transition"
          >
            <UserAvatar user={user} size={30} />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div role="menu" className="absolute bottom-12 left-0 card p-2 w-56 shadow-lift z-50">
                <Link role="menuitem" to="/profile" onClick={() => setMenuOpen(false)} className="menu-item">
                  <User size={16} /> Profile
                </Link>
                <Link role="menuitem" to="/settings" onClick={() => setMenuOpen(false)} className="menu-item">
                  <Menu size={16} /> Settings
                </Link>
                {user?.role === 'admin' && (
                  <Link role="menuitem" to="/admin" onClick={() => setMenuOpen(false)} className="menu-item">
                    <Shield size={16} /> Moderation
                  </Link>
                )}
                <LogoutButton
                  onDone={() => setMenuOpen(false)}
                  className="menu-item w-full text-red-500"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const anonLinks = [
    { to: '/activities', label: 'Browse activities', icon: Search },
    { to: '/communities', label: 'Communities', icon: Users },
    { to: '/login', label: 'Sign in', icon: User },
  ];

  return (
    <header className="lg:hidden sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <Logo />
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user && <NotifBell size={20} />}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="w-10 h-10 grid place-items-center rounded-full text-ink-soft hover:text-ink"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav aria-label="Mobile menu" className="border-t border-border px-4 py-2 bg-surface">
          {(user ? NAV_ITEMS : anonLinks).map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold ${
                  isActive ? 'text-primary bg-primary/10' : 'text-ink-soft'
                }`
              }
            >
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          {user && (
            <LogoutButton
              onDone={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-red-500 w-full"
            />
          )}
        </nav>
      )}
    </header>
  );
}

export default function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <DesktopNav />
      <div className="min-w-0 flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 pb-24 lg:pb-8">{children}</main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
