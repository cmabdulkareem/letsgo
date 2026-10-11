import { useEffect, useState } from 'react';
import { X, Download, RefreshCw } from 'lucide-react';

/**
 * "Add to Home Screen" prompt. Captures the `beforeinstallprompt` event and
 * shows a small dismissible banner. Never re-shows after dismissal this session.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onCanInstall = (e) => {
      e.preventDefault();
      setDeferred(e);
    };
    window.addEventListener('beforeinstallprompt', onCanInstall);
    return () => window.removeEventListener('beforeinstallprompt', onCanInstall);
  }, []);

  if (!deferred || dismissed) return null;

  const install = async () => {
    deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-20 lg:bottom-4 inset-x-4 z-50 mx-auto max-w-md card p-3 flex items-center gap-3 shadow-lift">
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <Download size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">Install Let&rsquo;s Go</p>
        <p className="text-xs text-ink-soft">Open it like an app — works offline too.</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="px-3 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-600"
      >
        Install
      </button>
      <button
        type="button"
        aria-label="Dismiss install prompt"
        onClick={() => setDismissed(true)}
        className="w-8 h-8 grid place-items-center rounded-full text-ink-soft hover:bg-border/40"
      >
        <X size={16} />
      </button>
    </div>
  );
}

/** Shown when the service worker finds a newer version of the shell. */
export function UpdatePrompt() {
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    const onUpdate = (e) => setWaitingWorker(e.detail);
    window.addEventListener('sw:update-available', onUpdate);
    return () => window.removeEventListener('sw:update-available', onUpdate);
  }, []);

  if (!waitingWorker) return null;

  const reload = () => {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  };

  return (
    <div className="fixed top-3 inset-x-4 z-50 mx-auto max-w-md card p-3 flex items-center gap-3 shadow-lift border-primary/40">
      <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
        <RefreshCw size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">New version available</p>
        <p className="text-xs text-ink-soft">Update to get the latest fixes.</p>
      </div>
      <button
        type="button"
        onClick={reload}
        className="px-3 py-2 rounded-full bg-primary text-white text-xs font-bold hover:bg-primary-600"
      >
        Update
      </button>
    </div>
  );
}

/** Registers the service worker in production and bridges waiting workers to the UI. */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const trackWaiting = (worker) => {
        if (worker?.waiting) {
          window.dispatchEvent(new CustomEvent('sw:update-available', { detail: worker.waiting }));
        }
      };
      trackWaiting(reg);
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent('sw:update-available', { detail: next }));
          }
        });
      });
      // Refresh once a new SW takes control (e.g. after SKIP_WAITING on next load).
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (err) {
      console.warn('SW registration failed:', err);
    }
  });
}
