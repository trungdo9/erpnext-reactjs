/**
 * Auth Store - Zustand
 *
 * Holds a lightweight mirror of authentication state so that the API
 * gateway layer can react to session errors without depending on a mounted
 * React component (AuthContext).
 *
 * Source of truth for user data is still AuthContext / the Frappe server.
 * This store is a *bridge*: AuthContext writes to it, the gateway reads from it.
 *
 * Usage (outside React):
 *   import useAuthStore from '@/stores/useAuthStore';
 *   useAuthStore.getState().handleSessionInvalid();
 *
 * Usage (inside React):
 *   const { isAuthenticated, currentUser } = useAuthStore();
 */

import { create } from 'zustand';

const useAuthStore = create((set, get) => ({
    /** Whether a valid user session exists */
    isAuthenticated: false,

    /** Full user profile object (same shape AuthContext builds from transformUserDoc) */
    currentUser: null,

    /**
     * True once the initial session check has completed (success or failure).
     * Consumers can use this to avoid flickering on app load.
     */
    sessionChecked: false,

    /**
     * Set current user and mark session as authenticated.
     * Called by AuthContext whenever userState changes to authenticated.
     * @param {Object} user - The profile object from AuthContext
     */
    setUser: (user) =>
        set({
            isAuthenticated: true,
            currentUser: user,
            sessionChecked: true,
        }),

    /**
     * Clear user and mark session as unauthenticated.
     * Called by AuthContext on logout or when auth state is cleared.
     */
    clearUser: () =>
        set({
            isAuthenticated: false,
            currentUser: null,
            sessionChecked: true,
        }),

    /**
     * Handle session invalidation triggered by the API gateway (e.g. 401 response).
     *
     * This method is intentionally synchronous and dependency-free so the gateway
     * can call it via `useAuthStore.getState().handleSessionInvalid()` at module
     * load time — no React component needs to be mounted.
     *
     * The redirect is handled here because AuthContext may not be mounted.
     * AuthContext will pick up the cleared state on its next render cycle and
     * confirm the unauthenticated state through its own session check.
     */
    handleSessionInvalid: () => {
        const { isAuthenticated } = get();

        // Only act if we actually thought we were authenticated.
        // Avoids spurious redirects on the login page itself.
        if (!isAuthenticated) return;

        if (import.meta.env.DEV) {
            console.log('[useAuthStore] handleSessionInvalid — clearing user and redirecting to login');
        }

        set({
            isAuthenticated: false,
            currentUser: null,
            sessionChecked: true,
        });

        // Redirect to login.  Use window.location to avoid a dependency on
        // React Router (which may not be available in the gateway context).
        // Preserve the current path so the login page can redirect back after
        // a successful re-authentication.
        const currentPath = window.location.pathname + window.location.search;
        const loginUrl =
            currentPath && currentPath !== '/' && !currentPath.startsWith('/login')
                ? `/login?redirect=${encodeURIComponent(currentPath)}`
                : '/login';

        if (window.location.pathname !== '/login') {
            window.location.href = loginUrl;
        }
    },
}));

export default useAuthStore;
