import { Link } from 'react-router-dom';
import { MapPin, Clock, Bookmark, BookmarkCheck, Users, Wallet, Lock, ShieldCheck } from 'lucide-react';
import { Badge } from './ui';
import { UserAvatar, MemberStack, VerifiedBadge } from './Avatar';
import { CategoryCover } from './CategoryIcon';
import { formatDateTime, STATUS_LABELS } from '../lib/format';

function coverSrc(path) {
  if (!path) return null;
  return `${import.meta.env.VITE_SOCKET_URL || ''}${path}`;
}

export function locationLine(location) {
  if (!location) return '';
  return [location.area, location.city].filter(Boolean).join(', ') || location.name || '';
}

export default function ActivityCard({ activity, members = [], saved = false, onSave, dense = false }) {
  const spotsLeft = Math.max(0, activity.maximumParticipants - activity.memberCount);
  const isFull = activity.roomStatus === 'full' || spotsLeft === 0;
  const when = activity.nextAt || activity.confirmedStartAt;

  const saveButton = (
    <button
      type="button"
      aria-label={saved ? 'Unsave activity' : 'Save activity'}
      aria-pressed={saved}
      onClick={(e) => {
        e.preventDefault();
        onSave?.(activity);
      }}
      className="w-9 h-9 grid place-items-center rounded-full bg-black/35 text-white backdrop-blur-sm hover:bg-black/50 transition"
    >
      {saved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
    </button>
  );

  return (
    <Link
      to={`/activities/${activity._id}`}
      className="card block overflow-hidden hover:shadow-lift transition group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <CategoryCover category={activity.category} className={dense ? 'h-32' : 'h-40'}>
        {coverSrc(activity.coverImage) && (
          <img
            src={coverSrc(activity.coverImage)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <div className="absolute top-3 left-3 flex items-center gap-1.5">
          {activity.visibility === 'private' && (
            <span className="chip bg-black/45 text-white backdrop-blur-sm">
              <Lock size={11} className="mr-0.5" /> Private
            </span>
          )}
          {activity.joinPolicy === 'approval' && (
            <span className="chip bg-black/45 text-white backdrop-blur-sm">
              <ShieldCheck size={11} className="mr-0.5" /> Approval
            </span>
          )}
          {!activity.cost?.isFree && (
            <span className="chip bg-navy/85 text-white backdrop-blur-sm">
              <Wallet size={11} className="mr-0.5" /> {activity.cost?.currency} {activity.cost?.amount}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3">{saveButton}</div>
      </CategoryCover>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary">
              {activity.category?.name || 'Activity'}
            </span>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {activity.visibility === 'private' ? 'Private Room' : 'Public Room'}
            </span>
          </div>
          <Badge tone={activity.roomStatus === 'cancelled' ? 'red' : isFull ? 'amber' : 'neutral'}>
            {STATUS_LABELS[activity.roomStatus] || activity.roomStatus}
          </Badge>
        </div>

        <h3 className="font-extrabold text-ink leading-snug line-clamp-1 group-hover:text-primary transition-colors">
          {activity.title}
        </h3>

        {activity.description && (
          <p className="text-xs text-ink-soft line-clamp-1 mt-0.5">
            {activity.description}
          </p>
        )}

        <div className="mt-2.5 space-y-1 text-xs text-ink-soft">
          <p className="flex items-center gap-1.5 min-w-0">
            <MapPin size={13} className="shrink-0 text-primary" />
            <span className="truncate">
              {locationLine(activity.location) || 'Location TBD'}
              {typeof activity.distance === 'number' && ` • ${activity.distance} km`}
            </span>
          </p>
          <p className="flex items-center gap-1.5">
            <Clock size={13} className="shrink-0 text-primary" />
            <span className={when ? '' : 'italic'}>
              {when ? formatDateTime(when) : 'Date being voted'}
            </span>
          </p>
        </div>

        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MemberStack
              members={members.length > 0 ? members : (activity.membersPreview || [])}
              size={24}
              max={4}
              totalCount={activity.memberCount}
            />
          </div>
          <span className="text-xs font-black text-primary">
            {activity.memberCount}/{activity.maximumParticipants}
          </span>
        </div>
      </div>
    </Link>
  );
}
