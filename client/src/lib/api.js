import axios from 'axios';

// Normalize: if VITE_API_URL is a bare domain (e.g. https://letsgo.onrender.com)
// without the /api/v1 path, append it automatically.
function resolveBaseURL() {
  const raw = import.meta.env.VITE_API_URL || '';
  if (!raw) return '/api/v1'; // local dev — Vite proxy handles it
  const clean = raw.replace(/\/$/, ''); // strip trailing slash
  if (clean.endsWith('/api/v1')) return clean;
  return `${clean}/api/v1`;
}

const baseURL = resolveBaseURL();


export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

let accessToken = null;
let refreshPromise = null;

export function setAccessToken(token) {
  accessToken = token;
}
export function getAccessToken() {
  return accessToken;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

async function doRefresh() {
  const { data } = await axios.post(
    `${baseURL}/auth/refresh`,
    {},
    { withCredentials: true, headers: { 'X-Requested-With': 'XMLHttpRequest' } }
  );
  return data.data;
}

/** One refresh at a time across all concurrent requests. */
export function refreshTokens() {
  if (!refreshPromise) {
    refreshPromise = doRefresh()
      .then((tokens) => {
        setAccessToken(tokens.accessToken);
        window.dispatchEvent(new CustomEvent('auth:refreshed', { detail: tokens.user }));
        return tokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const url = original?.url || '';

    // 401 from the refresh endpoint itself means the session is gone — don't loop.
    if (status === 401 && !original._retried && !url.includes('/auth/refresh')) {
      original._retried = true;
      try {
        await refreshTokens();
        return api(original);
      } catch {
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback;
}

export { baseURL };
