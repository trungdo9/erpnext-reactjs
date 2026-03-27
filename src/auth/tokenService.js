/**
 * tokenService - Manages authentication token storage in localStorage.
 *
 * Supports two auth modes:
 *   - 'token': API key/secret pair sent as Authorization header
 *   - 'session': Session cookie + CSRF token (default Frappe auth)
 *
 * localStorage key: 'erpnext_auth'
 * StoredAuth shape: { token, mode, user, createdAt }
 */

const STORAGE_KEY = 'erpnext_auth';

const TOKEN_MAX_AGE_DAYS = Number(import.meta.env.VITE_TOKEN_MAX_AGE_DAYS ?? 30);
const SESSION_MAX_AGE_HOURS = Number(import.meta.env.VITE_SESSION_MAX_AGE_HOURS ?? 8);

const TOKEN_MAX_AGE_MS = TOKEN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_HOURS * 60 * 60 * 1000;

/**
 * Read raw stored auth from localStorage, or null if missing/corrupt.
 * @returns {Object|null}
 */
function _read() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

/**
 * Write auth data to localStorage.
 * @param {Object} data
 */
function _write(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Ignore storage errors (e.g. private mode quota)
    }
}

const tokenService = {
    /**
     * Store token-based auth.
     * @param {string} key   - API key
     * @param {string} secret - API secret
     * @param {Object} user  - User object (at minimum { name })
     */
    setTokenAuth(key, secret, user) {
        _write({
            token: `${key}:${secret}`,
            mode: 'token',
            user,
            createdAt: Date.now(),
        });
    },

    /**
     * Store session-based auth (no token — relies on cookies + CSRF).
     * @param {Object} user - User object
     */
    setSessionAuth(user) {
        _write({
            token: '',
            mode: 'session',
            user,
            createdAt: Date.now(),
        });
    },

    /**
     * Return the stored token string ('key:secret'), or '' if not present.
     * @returns {string}
     */
    getToken() {
        return _read()?.token ?? '';
    },

    /**
     * Return the auth mode ('token' | 'session'), or null if not stored.
     * @returns {'token'|'session'|null}
     */
    getMode() {
        return _read()?.mode ?? null;
    },

    /**
     * Return the stored user object, or null.
     * @returns {Object|null}
     */
    getUser() {
        return _read()?.user ?? null;
    },

    /**
     * Return true if any auth data is stored (token or session).
     * @returns {boolean}
     */
    hasAuth() {
        return _read() !== null;
    },

    /**
     * Return true if stored auth is token mode with a non-empty token.
     * @returns {boolean}
     */
    hasToken() {
        const stored = _read();
        return stored?.mode === 'token' && !!stored?.token;
    },

    /**
     * Return true if the stored auth has exceeded its max-age.
     * Token auth: TOKEN_MAX_AGE_DAYS (default 30 days)
     * Session auth: SESSION_MAX_AGE_HOURS (default 8 hours)
     * @returns {boolean}
     */
    isStale() {
        const stored = _read();
        if (!stored?.createdAt) return true;
        const age = Date.now() - stored.createdAt;
        if (stored.mode === 'token') {
            return age > TOKEN_MAX_AGE_MS;
        }
        return age > SESSION_MAX_AGE_MS;
    },

    /**
     * Remove all stored auth data.
     */
    clear() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignore storage errors
        }
    },
};

export { tokenService };
export default tokenService;
