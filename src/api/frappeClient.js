import { FrappeApp } from 'frappe-js-sdk';

// IMPORTANT: For production, VITE_FRAPPE_URL should be EMPTY
// This ensures all API calls go through nginx proxy (same origin)
// which properly handles session cookies
//
// Only set VITE_FRAPPE_URL for development when NOT using nginx
const frappeUrl = import.meta.env.VITE_FRAPPE_URL || '';

// Log which URL is being used
if (import.meta.env.DEV) {
  console.log('[FrappeClient] Using URL:', frappeUrl || '(same origin - via proxy)');
}

/**
 * Sync CSRF token so frappe-js-sdk can send X-Frappe-CSRF-Token header.
 *
 * Frappe v16 no longer sets a csrf_token cookie. Instead the token is
 * embedded in the HTML page as `csrf_token = "..."`. We fetch it once
 * from the backend and cache it on window.csrf_token.
 */
function syncCsrfToken() {
  // 1. Try cookie (Frappe v15 style)
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  if (match) {
    window.csrf_token = decodeURIComponent(match[1]);
    return;
  }
  // 2. Already fetched
  if (window.csrf_token && window.csrf_token !== '{{ csrf_token }}') return;
}

/**
 * Fetch CSRF token from Frappe backend (Frappe v15/v16).
 * Must be called before the first POST request.
 *
 * @param {boolean} force - Force re-fetch even if token already cached (use after login/logout)
 */
async function fetchCsrfToken(force = false) {
  if (!force && window.csrf_token && window.csrf_token !== '{{ csrf_token }}') return;
  try {
    // Any GET request to Frappe returns X-Frappe-CSRF-Token in headers.
    // NOTE: Frappe v16 renamed get_logged_in_user → get_logged_user
    const resp = await fetch('/api/method/frappe.auth.get_logged_user', { credentials: 'include' });

    // 1. Try cookie (Frappe v15 sets csrf_token as a readable cookie)
    const cookieMatch = document.cookie.match(/csrf_token=([^;]+)/);
    if (cookieMatch) {
      window.csrf_token = decodeURIComponent(cookieMatch[1]);
      if (import.meta.env.DEV) console.log('[FrappeClient] CSRF token from cookie:', window.csrf_token);
      return;
    }

    // 2. Read from response header — Frappe always includes this on authenticated responses
    const headerToken = resp.headers.get('X-Frappe-CSRF-Token');
    if (headerToken && headerToken !== 'fetch') {
      window.csrf_token = headerToken;
      if (import.meta.env.DEV) console.log('[FrappeClient] CSRF token from header: ok');
    } else {
      if (import.meta.env.DEV) console.log('[FrappeClient] CSRF token not available (unauthenticated or guest)');
    }
  } catch (e) {
    console.warn('[FrappeClient] Failed to fetch CSRF token:', e);
  }
}

// Sync on init (cookie check), then async fetch
syncCsrfToken();
await fetchCsrfToken();

const frappe = new FrappeApp(frappeUrl, {
  useToken: false,
});

export const db = frappe.db();
export const auth = frappe.auth();
export const call = frappe.call();
export { syncCsrfToken, fetchCsrfToken };

export default frappe;
