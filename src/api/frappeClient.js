import { tokenService } from '../auth/tokenService';

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
 * frappe-js-sdk v1.10.0+ reads window.csrf_token dynamically before every
 * Axios request — we just need to populate it from the best available source.
 *
 * Priority:
 *   1. Cookie csrf_token   — Frappe v15 (readable cookie)
 *   2. window.frappe.csrf_token — when served as a Frappe desk page
 *   3. Existing window.csrf_token — already fetched via fetchCsrfToken()
 */
function syncCsrfToken() {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  if (match) { window.csrf_token = decodeURIComponent(match[1]); return; }
  if (window.frappe?.csrf_token && window.frappe.csrf_token !== '{{ csrf_token }}') {
    window.csrf_token = window.frappe.csrf_token; return;
  }
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
    const resp = await fetch('/api/method/frappe.auth.get_logged_user', { credentials: 'include' });

    // 1. Try cookie (Frappe v15 sets csrf_token as a readable cookie)
    const cookieMatch = document.cookie.match(/csrf_token=([^;]+)/);
    if (cookieMatch) {
      window.csrf_token = decodeURIComponent(cookieMatch[1]);
      return;
    }

    // 2. Read from response header
    const headerToken = resp.headers.get('X-Frappe-CSRF-Token');
    if (headerToken && headerToken !== 'fetch') {
      window.csrf_token = headerToken;
      if (import.meta.env.DEV) console.log('[FrappeClient] CSRF token from header: ok');
    }
  } catch (e) {
    console.warn('[FrappeClient] Failed to fetch CSRF token:', e);
  }
}

// Sync on init (cookie check), then async fetch
syncCsrfToken();
await fetchCsrfToken();

/**
 * Live-bound exports — FrappeWrapper populates these via _setFrappeInstances()
 * during render (before AuthProvider and all other children render).
 * ES module live bindings ensure all consumers always see the current instance.
 */
export let db = null;
export let auth = null;
export let call = null;

/**
 * Called by FrappeSync (inside FrappeProvider) to sync the current FrappeApp
 * instances into these module exports. Called synchronously during render,
 * before any children of FrappeWrapper render.
 */
export function _setFrappeInstances(newDb, newAuth, newCall) {
  db = newDb;
  auth = newAuth;
  call = newCall;
}

export { syncCsrfToken, fetchCsrfToken };

/**
 * Validate API key + secret by calling Frappe directly (bypasses SDK config).
 * Uses raw fetch so it works before the FrappeApp token is configured.
 *
 * @param {string} apiKey
 * @param {string} apiSecret
 * @returns {Promise<Object>} User document data
 */
export async function validateApiToken(apiKey, apiSecret) {
  const authHeader = `token ${apiKey}:${apiSecret}`;

  // 1. Verify credentials — get_logged_user returns the email of the token owner
  const authResp = await fetch('/api/method/frappe.auth.get_logged_user', {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });
  if (!authResp.ok) throw new Error('Invalid API credentials');
  const authData = await authResp.json();
  const email = authData.message;
  if (!email || email === 'Guest') throw new Error('Invalid API credentials');

  // 2. Fetch full user profile
  const userResp = await fetch(`/api/resource/User/${encodeURIComponent(email)}`, {
    headers: { Authorization: authHeader, Accept: 'application/json' },
  });
  if (!userResp.ok) throw new Error('Could not fetch user profile');
  const userData = await userResp.json();
  return userData.data;
}

// Keep tokenService accessible if needed elsewhere
export { tokenService };
