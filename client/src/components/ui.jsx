import { forwardRef } from 'react';
import { Loader2, Inbox } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-primary text-white hover:bg-primary-600 active:bg-primary-700 disabled:bg-primary/50',
  secondary:
    'bg-surface text-ink border border-border hover:border-primary hover:text-primary disabled:opacity-50',
  danger: 'bg-red-500 text-white hover:bg-red-600 disabled:bg-red-300',
  ghost: 'text-ink-soft hover:bg-border/40 hover:text-ink disabled:opacity-50',
  navy: 'bg-navy text-white hover:bg-navy/90',
};

export function Button({ variant = 'primary', size = 'md', loading = false, className = '', children, ...props }) {
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-5 py-3 text-base' };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full font-semibold transition min-h-[44px] ${VARIANTS[variant]} ${sizes[size]} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}

export const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <input ref={ref} className={`input ${error ? 'border-red-400 ring-2 ring-red-500/20' : ''}`} {...props} />
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, className = '', ...props }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <textarea ref={ref} className={`input min-h-[100px] resize-y ${error ? 'border-red-400 ring-2 ring-red-500/20' : ''}`} {...props} />
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});

export const Select = forwardRef(function Select({ label, error, children, className = '', ...props }, ref) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      <select ref={ref} className={`input ${error ? 'border-red-400 ring-2 ring-red-500/20' : ''}`} {...props}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});

export function Chip({ color = '#08B981', children, className = '' }) {
  return (
    <span className="chip" style={{ backgroundColor: `${color}1A`, color }}>
      {children}
    </span>
  );
}

export function Badge({ children, tone = 'neutral' }) {
  const tones = {
    neutral: 'bg-border/50 text-ink-soft',
    primary: 'bg-primary/10 text-primary',
    blue: 'bg-blue-500/10 text-blue-600',
    amber: 'bg-amber-500/10 text-amber-600',
    red: 'bg-red-500/10 text-red-600',
    green: 'bg-primary/10 text-primary',
  };
  return <span className={`chip ${tones[tone]}`}>{children}</span>;
}

export function Card({ className = '', ...props }) {
  return <div className={`card ${className}`} {...props} />;
}

export function Spinner({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-ink-soft" role="status">
      <Loader2 className="animate-spin" size={20} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-border/50 ${className}`} />;
}

export function EmptyState({ icon, title, hint, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
        {icon || <Inbox size={26} />}
      </div>
      <h3 className="font-bold text-ink">{title}</h3>
      {hint && <p className="text-sm text-ink-soft mt-1 max-w-xs">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Could not load this right now', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <p className="text-sm text-ink-soft">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
