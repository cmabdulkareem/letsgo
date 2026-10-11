import { BadgeCheck } from 'lucide-react';

const PALETTE = ['#08B981', '#2563EB', '#F59E0B', '#7C3AED', '#DB2777', '#0D9488', '#EA580C'];

export function avatarColor(name = '?') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export function AvatarUrl({ user, size = 40 }) {
  if (user?.avatar) return `${import.meta.env.VITE_SOCKET_URL || ''}${user.avatar}`;
  return null;
}

export function UserAvatar({ user, size = 40, showBadge = true }) {
  const src = AvatarUrl({ user });
  const style = { width: size, height: size, fontSize: size * 0.42 };
  if (src) {
    return (
      <img
        src={src}
        alt={user?.displayName || 'user'}
        style={style}
        className="rounded-full object-cover bg-border/50 shrink-0"
        loading="lazy"
      />
    );
  }
  return (
    <div
      style={{ ...style, backgroundColor: avatarColor(user?.displayName || user?.username) }}
      className="rounded-full grid place-items-center text-white font-bold shrink-0 select-none"
      aria-hidden
    >
      {(user?.displayName || user?.username || '?').slice(0, 1).toUpperCase()}
    </div>
  );
}

export function VerifiedBadge({ size = 14 }) {
  return <BadgeCheck size={size} className="text-primary inline-block ml-0.5" aria-label="Verified" />;
}

export function MemberStack({ members = [], max = 4, size = 28, totalCount }) {
  const shown = members.slice(0, max);
  const extra = totalCount ? Math.max(0, totalCount - shown.length) : Math.max(0, members.length - shown.length);
  return (
    <div className="flex items-center">
      {shown.map((m, i) => (
        <div key={m._id || m.user?._id || i} style={{ zIndex: shown.length - i }} className="-ml-2 first:ml-0 rounded-full ring-2 ring-surface">
          <UserAvatar user={m.user || m} size={size} showBadge={false} />
        </div>
      ))}
      {extra > 0 && (
        <div
          style={{ width: size, height: size, zIndex: 0 }}
          className="-ml-2 rounded-full bg-slate-200 dark:bg-slate-700 text-ink-soft grid place-items-center text-[10px] font-bold ring-2 ring-surface"
        >
          +{extra}
        </div>
      )}
    </div>
  );
}
