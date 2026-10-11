import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(relativeTime);
dayjs.extend(utc);
dayjs.extend(timezone);

export const tz = 'Asia/Kolkata';

export function formatDateTime(value, withTime = true) {
  if (!value) return 'TBD';
  const d = dayjs(value);
  return withTime ? d.tz(tz).format('ddd, MMM D · h:mm A') : d.tz(tz).format('ddd, MMM D');
}

export function formatTime(value) {
  if (!value) return '';
  return dayjs(value).tz(tz).format('h:mm A');
}

export function fromNow(value) {
  if (!value) return '';
  return dayjs(value).fromNow();
}

export function toInputDateTime(value) {
  // For datetime-local inputs in the room's local zone.
  return dayjs(value).tz(tz).format('YYYY-MM-DDTHH:mm');
}

export function isPast(value) {
  return value && dayjs(value).isBefore(dayjs());
}

export const STATUS_LABELS = {
  draft: 'Draft',
  open: 'Open',
  full: 'Full',
  scheduling: 'Scheduling',
  scheduled: 'Scheduled',
  in_progress: 'In progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  archived: 'Archived',
};

export function timeOfDayLabel(slot) {
  const h = dayjs(slot).hour();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}
