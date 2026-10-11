/* Let's Go service worker.
 *
 * Strategy summary:
 *  - App shell: precached on install (versioned), served cache-first with an update check.
 *  - Vite build assets (/assets/*): stale-while-revalidate (immutable, content-hashed).
 *  - API requests: network-only. Private data is never written to Cache Storage.
 *  - Navigations: network-first, falling back to the cached shell, then /offline.html.
 *  - Push: displays notifications; click focuses/opens the app.
 */

const VERSION = 'v1';
const SHELL_CACHE = `letsgo-shell-${VERSION}`;
const RUNTIME_CACHE = `letsgo-runtime-${VERSION}`;

const SHELL = ['/', '/index.html', '/offline.html', '/manifest.webmanifest', '/icons/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k.startsWith('letsgo-') && k !== SHELL_CACHE && k !== RUNTIME_CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses or auth endpoints — protects private data.
  if (url.pathname.startsWith('/api/')) return;

  // Build assets: content-hashed, safe to cache aggressively.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
    return;
  }

  // User uploads: cache-first (immutable content, long expiry set by the server).
  if (url.pathname.startsWith('/uploads/')) {
    event.respondWith(cacheFirst(request, RUNTIME_CACHE));
    return;
  }

  // Navigations: network-first with offline fallback.
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  // Other same-origin GETs (icons, fonts if ever same-origin): network-first.
  event.respondWith(networkFirstNavigation(request));
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetching = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fetching;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok && !request.url.includes('sw.js')) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const offline = await caches.match('/offline.html');
      if (offline) return offline;
    }
    throw err;
  }
}

// ------------------------------------------------------------- update flow

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ------------------------------------------------------------- push events

self.addEventListener('push', (event) => {
  let payload = { title: "Let's Go", body: 'You have a new notification.', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    payload.body = event.data ? event.data.text() : payload.body;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
