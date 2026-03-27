/**
 * AuthContext - Single Source of Truth for User Authentication
 *
 * Principles:
 * 1. Single Source of Truth - All user info comes from server, not localStorage
 * 2. Revalidate on every app load - Don't trust cached data
 * 3. Full user profile after login - Always fetch complete user data
 * 4. Session mismatch handling - Clear state on 401/permission errors
 */

import { createContext, useState, useEffect, useCallback, useRef } from 'react';
import PropTypes from 'prop-types';
import { auth as frappeAuth, call as frappeCall, db, syncCsrfToken, fetchCsrfToken, validateApiToken } from '../api/frappeClient';
import { tokenService } from './tokenService';
import { usePersonaStore } from '../stores';
import useAuthStore from '../stores/useAuthStore';
import { useTranslation } from '../hooks/useTranslation';

/**
 * Fetch user profile via custom API endpoint (works for Website Users who
 * lack read permission on the User DocType).
 * Endpoint: /api/method/get_current_user_profile (Server Script, no User perm needed)
 */
async function fetchProfileViaCustomApi() {
    // No custom app installed — skip to standard Frappe fallback
    return null;
}

/**
 * @typedef {Object} UserState
 * @property {string|null} userId - User email/ID (primary key)
 * @property {string|null} fullName - Display name
 * @property {string|null} email - User email
 * @property {string|null} avatar - User avatar URL
 * @property {string[]} roles - User roles from Frappe
 * @property {boolean} isLoading - Loading state
 * @property {boolean} isAuthenticated - Whether user is authenticated
 * @property {Object|null} profile - Full user profile data
 */

const defaultUserState = {
    userId: null,
    fullName: null,
    email: null,
    avatar: null,
    roles: [],
    isLoading: true,
    isAuthenticated: false,
    profile: null,
};

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext({
    ...defaultUserState,
    login: async () => { },
    loginWithToken: async () => { },
    logout: async () => { },
    refreshUser: async () => { },
    updateProfile: async () => { },
    error: null,
});

// Dev mode logging helper
const isDev = import.meta.env.DEV;
const authLog = (message, data = null) => {
    if (isDev) {
        const timestamp = new Date().toISOString().slice(11, 23);
        if (data) {
            console.log(`[Auth ${timestamp}] ${message}`, data);
        } else {
            console.log(`[Auth ${timestamp}] ${message}`);
        }
    }
};

export const AuthProvider = ({ children }) => {
    const [userState, setUserState] = useState(defaultUserState);
    const [error, setError] = useState(null);
    const { t } = useTranslation();

    // Track if initial session check is done
    const sessionCheckedRef = useRef(false);
    // Track ongoing refresh to prevent duplicate calls
    const refreshPromiseRef = useRef(null);

    /**
     * Clear all auth state and caches
     * Called on logout or session invalidation
     */
    const clearAuthState = useCallback((reason = 'unknown') => {
        authLog(`Clearing auth state. Reason: ${reason}`);

        setUserState({
            ...defaultUserState,
            isLoading: false,
        });

        // Mirror cleared state into the Zustand auth store so the gateway
        // layer (and any other non-React code) sees the correct status.
        useAuthStore.getState().clearUser();

        // Clear permission caches from sessionStorage
        try {
            const keysToRemove = [];
            for (let i = 0; i < sessionStorage.length; i++) {
                const key = sessionStorage.key(i);
                if (key && (key.startsWith('perms:') || key.startsWith('cache:'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => sessionStorage.removeItem(key));
            authLog(`Cleared ${keysToRemove.length} cache entries from sessionStorage`);
        } catch {
            // Ignore storage errors
        }

        // Clear Zustand auth-storage (we don't trust it as source of truth)
        try {
            localStorage.removeItem('auth-storage');
        } catch {
            // Ignore storage errors
        }

        // Reset persona store on auth clear (logout, session expired, etc.)
        usePersonaStore.getState().reset();
    }, []);

    /**
     * Transform a raw user document (from db.getDoc or custom API) into the
     * clean profile shape used throughout the app.
     */
    const transformUserDoc = useCallback((userDoc) => {
        if (!userDoc) return null;
        return {
            name: userDoc.name,
            email: userDoc.email || userDoc.name,
            fullName: userDoc.full_name || userDoc.first_name || userDoc.email || userDoc.name,
            firstName: userDoc.first_name,
            lastName: userDoc.last_name,
            username: userDoc.username,
            avatar: userDoc.user_image,
            language: userDoc.language,
            timeZone: userDoc.time_zone,
            enabled: userDoc.enabled !== undefined ? !!userDoc.enabled : true,
            // db.getDoc returns roles as [{role:'X'}]; custom API also returns [{role:'X'}]
            roles: (userDoc.roles || []).map(r => (typeof r === 'string' ? r : r.role)),
            userType: userDoc.user_type,
            lastLogin: userDoc.last_login,
            lastActive: userDoc.last_active,
            bio: userDoc.bio,
            phone: userDoc.phone,
            mobile: userDoc.mobile_no,
            location: userDoc.location,
            gender: userDoc.gender,
            birthDate: userDoc.birth_date,
        };
    }, []);

    /**
     * Fetch full user profile from server.
     * Strategy:
     *  1. Try db.getDoc('User', username)  — works for System Users
     *  2. On PermissionError, fall back to custom API endpoint
     *     /api/method/get_current_user_profile — works for Website Users
     * This is the ONLY place we get user data - single source of truth
     */
    const fetchUserProfile = useCallback(async (username) => {
        authLog(`Fetching full profile for: ${username}`);

        // --- Attempt 1: standard frappe-js-sdk getDoc ---
        try {
            const userDoc = await db.getDoc('User', username);

            if (!userDoc) {
                authLog('User document not found via getDoc');
                return null;
            }

            const profile = transformUserDoc(userDoc);

            authLog('Profile fetched via getDoc', {
                userId: profile.email,
                fullName: profile.fullName,
                roles: profile.roles,
                userType: profile.userType,
            });

            return profile;
        } catch (err) {
            // PermissionError is expected for Website Users (user_type='Website User')
            // who have no read permission on the User DocType.
            // All other errors (network, 401, etc.) should propagate.
            const isPermError =
                err?.httpStatus === 403 ||
                err?.exc_type === 'PermissionError' ||
                (err?.message && err.message.includes('PermissionError')) ||
                (err?.message && err.message.includes('No permission')) ||
                (err?.message && err.message.includes('does not have doctype access'));

            if (!isPermError) {
                authLog('getDoc failed with non-permission error — propagating', err?.message);
                throw err;
            }

            authLog('getDoc permission denied (Website User) — falling back to custom API');
        }

        // --- Attempt 2: custom whitelisted API (bypasses User DocType perm) ---
        try {
            const raw = await fetchProfileViaCustomApi();

            if (!raw) {
                authLog('Custom profile API returned empty');
                return null;
            }

            const profile = transformUserDoc(raw);

            authLog('Profile fetched via custom API', {
                userId: profile.email,
                fullName: profile.fullName,
                roles: profile.roles,
                userType: profile.userType,
            });

            return profile;
        } catch (err) {
            authLog('Custom profile API failed', err?.message);
            throw err;
        }
    }, [transformUserDoc]);

    /**
     * Validate current session and refresh user data
     * Called on app load and can be called manually
     */
    const refreshUser = useCallback(async () => {
        // Prevent duplicate refresh calls
        if (refreshPromiseRef.current) {
            authLog('Refresh already in progress, reusing promise');
            return refreshPromiseRef.current;
        }

        const refreshPromise = (async () => {
            authLog('Revalidating session with server...');
            setUserState(prev => ({ ...prev, isLoading: true }));

            try {
                // Step 1: Check if user is logged in (with 10s timeout to prevent infinite hang)
                const username = await Promise.race([
                    frappeAuth.getLoggedInUser(),
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Auth check timed out')), 10000)
                    ),
                ]);

                if (!username || username === 'Guest') {
                    authLog('No valid session (user is Guest or null)');
                    clearAuthState('no_valid_session');
                    return null;
                }

                // Re-sync CSRF token (may have changed since page load)
                syncCsrfToken();
                await fetchCsrfToken();

                authLog(`Session valid for: ${username}`);

                // Step 2: Fetch full user profile from server
                const profile = await fetchUserProfile(username);

                if (!profile) {
                    authLog('Could not fetch user profile');
                    clearAuthState('profile_fetch_failed');
                    return null;
                }

                // Step 3: Update state with server data
                const newState = {
                    userId: profile.email,
                    fullName: profile.fullName,
                    email: profile.email,
                    avatar: profile.avatar,
                    roles: profile.roles,
                    isLoading: false,
                    isAuthenticated: true,
                    profile,
                };

                setUserState(newState);

                // Mirror authenticated state into the Zustand auth store.
                useAuthStore.getState().setUser(profile);

                // Detect persona from user roles on session restore
                usePersonaStore.getState().detectFromRoles(profile.roles);
                authLog('Persona detected from roles', { roles: profile.roles });

                authLog('User state updated from server', {
                    userId: newState.userId,
                    isAuthenticated: newState.isAuthenticated,
                });

                return profile;
            } catch (err) {
                const status = err?.httpStatus || err?.response?.status;
                authLog(`Session check failed with status: ${status}`, err?.message || err);

                // 401/403 means session is invalid; timeout means server unreachable
                if (status === 401 || status === 403 || err?.message === 'Auth check timed out') {
                    clearAuthState(err?.message === 'Auth check timed out' ? 'server_unreachable' : 'session_expired');
                } else {
                    // Network error - don't clear auth, might be temporary
                    setUserState(prev => ({ ...prev, isLoading: false }));
                }

                return null;
            }
        })();

        refreshPromiseRef.current = refreshPromise;

        try {
            return await refreshPromise;
        } finally {
            refreshPromiseRef.current = null;
        }
    }, [fetchUserProfile, clearAuthState]);

    /**
     * Login with username and password
     */
    const login = useCallback(async (username, password, rememberMe = false) => {
        authLog(`Login attempt for: ${username}`);
        setUserState(prev => ({ ...prev, isLoading: true }));
        setError(null);

        // Cancel any pending refresh to avoid race condition
        // where old refresh (started before login) returns null
        refreshPromiseRef.current = null;

        try {
            // Step 1: Authenticate with server (with 15s timeout)
            const loginPromise = rememberMe
                ? frappeCall.post('login', { usr: username, pwd: password, remember_me: 1 })
                : frappeAuth.loginWithUsernamePassword({ username, password });

            await Promise.race([
                loginPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error(t('auth.server_not_responding'))), 15000)
                ),
            ]);

            // Re-sync CSRF token after login (Frappe issues new token).
            // Force re-fetch to avoid using a stale token from a previous session.
            syncCsrfToken();
            await fetchCsrfToken(true);

            authLog('Login API successful, fetching user profile...');

            // Step 2: Fetch user profile directly (don't use refreshUser to avoid promise reuse)
            const profile = await fetchUserProfile(username);

            if (!profile) {
                throw new Error('Failed to fetch user profile after login');
            }

            // Save session auth to tokenService
            tokenService.setSessionAuth(profile);
            useAuthStore.getState().setAuthMode('session');

            // Step 3: Update state with server data
            const newState = {
                userId: profile.email,
                fullName: profile.fullName,
                email: profile.email,
                avatar: profile.avatar,
                roles: profile.roles,
                isLoading: false,
                isAuthenticated: true,
                profile,
            };

            setUserState(newState);

            // Mirror authenticated state into the Zustand auth store.
            useAuthStore.getState().setUser(profile);

            // Detect persona from user roles after successful login
            usePersonaStore.getState().detectFromRoles(profile.roles);
            authLog('Persona detected from roles', { roles: profile.roles });

            authLog('Login complete', { userId: profile.email, isAuthenticated: true });
            return profile;
        } catch (err) {
            authLog('Login failed', err);
            setError(err);
            setUserState(prev => ({ ...prev, isLoading: false }));
            throw err;
        }
    }, [fetchUserProfile, t]);

    /**
     * Login with API key and secret (token-based auth)
     */
    const loginWithToken = useCallback(async (apiKey, apiSecret) => {
        authLog(`Token login attempt`);
        setUserState(prev => ({ ...prev, isLoading: true }));
        setError(null);

        try {
            // Step 1: Validate API credentials
            const userDoc = await validateApiToken(apiKey, apiSecret);
            if (!userDoc) throw new Error('Invalid API credentials');

            // Step 2: Store token BEFORE profile fetch so SDK uses it
            tokenService.setTokenAuth(apiKey, apiSecret, { name: userDoc.name });

            // Step 3: Build profile
            const profile = transformUserDoc(userDoc);
            if (!profile) throw new Error('Failed to build user profile');

            // Step 4: Update state
            const newState = {
                userId: profile.email,
                fullName: profile.fullName,
                email: profile.email,
                avatar: profile.avatar,
                roles: profile.roles,
                isLoading: false,
                isAuthenticated: true,
                profile,
            };
            setUserState(newState);
            tokenService.setTokenAuth(apiKey, apiSecret, profile); // update with full profile
            useAuthStore.getState().setAuthMode('token');
            useAuthStore.getState().setUser(profile);
            usePersonaStore.getState().detectFromRoles(profile.roles);
            authLog('Token login complete', { userId: profile.email });
            return profile;
        } catch (err) {
            authLog('Token login failed', err);
            setError(err);
            setUserState(prev => ({ ...prev, isLoading: false }));
            tokenService.clear(); // cleanup on failure
            throw err;
        }
    }, [transformUserDoc]);

    /**
     * Logout current user
     */
    const logout = useCallback(async () => {
        authLog('Logout initiated');
        setUserState(prev => ({ ...prev, isLoading: true }));

        try {
            await frappeAuth.logout();
            authLog('Logout API successful');
        } catch (err) {
            authLog('Logout API failed (will clear state anyway)', err);
        } finally {
            // Clear stale CSRF token so next login fetches a fresh one
            window.csrf_token = null;
            tokenService.clear();
            clearAuthState('user_logout');
            useAuthStore.getState().setAuthMode('session');
        }
    }, [clearAuthState]);

    /**
     * Update user profile and refresh state
     * Uses frappe.client.set_value for better permission handling on mobile
     */
    const updateProfile = useCallback(async (data) => {
        if (!userState.userId) {
            throw new Error('No user logged in');
        }

        // Use document name (profile.name), not email, for API calls
        // For Administrator: name="Administrator", email="admin@example.com"
        // For regular users: name=email (e.g., "user@steel-erp.com")
        const docName = userState.profile?.name || userState.userId;
        authLog('Updating profile', { docName, data });

        try {
            // Update each field using frappe.client.set_value
            // This method has better permission handling for users updating their own profile
            for (const [fieldname, value] of Object.entries(data)) {
                authLog(`Setting ${fieldname} = ${value}`);
                await frappeCall.post('frappe.client.set_value', {
                    doctype: 'User',
                    name: docName,
                    fieldname: fieldname,
                    value: value,
                });
            }

            authLog('Profile updated on server, refreshing state...');

            // ALWAYS refresh from server after update
            // Don't just merge local data - get truth from server
            const profile = await refreshUser();

            authLog('Profile refresh complete');
            return profile;
        } catch (err) {
            authLog('Profile update failed', err);
            throw err;
        }
    }, [userState.userId, userState.profile, refreshUser]);

    /**
     * Initial session check on mount
     * Revalidates with server every time app loads
     */
    useEffect(() => {
        if (!sessionCheckedRef.current) {
            sessionCheckedRef.current = true;
            authLog('Initial session check on app load');
            refreshUser();
        }
    }, [refreshUser]);

    // Provide both old format (currentUser) and new format for backward compatibility
    const contextValue = {
        // New structured state
        ...userState,

        // Legacy support: currentUser as string (email) for backward compatibility
        currentUser: userState.userId,

        // Current auth mode ('token' | 'session' | null)
        authMode: tokenService.getMode() ?? 'session',

        // Actions
        login,
        loginWithToken,
        logout,
        refreshUser,
        updateProfile,
        error,

        // Helper for components to check if user data is ready
        isReady: !userState.isLoading && userState.isAuthenticated,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired,
};

// Note: useAuth hook is exported from ./useAuth.js to avoid duplication
