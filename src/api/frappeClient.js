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
 * Fetch CSRF token from Frappe backend HTML page (Frappe v16).
 * Must be called before the first POST request.
 */
async function fetchCsrfToken() {
  if (window.csrf_token && window.csrf_token !== '{{ csrf_token }}') return;
  try {
    const resp = await fetch('/api/method/frappe.auth.get_logged_in_user', { credentials: 'include' });
    // The CSRF token is in the response cookie or we fetch from HTML
    const match2 = document.cookie.match(/csrf_token=([^;]+)/);
    if (match2) {
      window.csrf_token = decodeURIComponent(match2[1]);
      return;
    }
    // Fallback: fetch the desk page to get csrf_token from HTML
    const htmlResp = await fetch('/', { credentials: 'include' });
    const html = await htmlResp.text();
    const m = html.match(/csrf_token\s*=\s*"([^"]+)"/);
    if (m) {
      window.csrf_token = m[1];
    }
  } catch (e) {
    console.warn('[FrappeClient] Failed to fetch CSRF token:', e);
  }
}

// Sync on init (cookie check), then async fetch
syncCsrfToken();
fetchCsrfToken();

const frappe = new FrappeApp(frappeUrl, {
  useToken: false,
});

export const db = frappe.db();
export const auth = frappe.auth();
export const call = frappe.call();
export { syncCsrfToken, fetchCsrfToken };

export default frappe;
