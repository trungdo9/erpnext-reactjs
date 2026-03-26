/**
 * API Gateway Layer
 *
 * This layer abstracts ERPNext/Frappe API calls and provides:
 * - Domain-specific interfaces (not DocType-specific)
 * - Centralized error handling
 * - Request/response transformation
 * - Caching strategy
 * - Offline support preparation
 *
 * Frontend components should ONLY import from this gateway,
 * never directly from frappeClient or services.
 */

import { ApiClient, setGatewayConfig } from './client';
import { CacheManager } from './cache';
import { RequestQueue } from './queue';
import useAuthStore from '../../stores/useAuthStore';

/**
 * Gateway configuration
 */
export const GatewayConfig = {
    cacheTTL: {
        metadata: 30 * 60 * 1000,     // 30 minutes for doctype metadata
        list: 30 * 1000,               // 30 seconds for list data
        document: 60 * 1000,           // 1 minute for single documents
        permissions: 10 * 60 * 1000,   // 10 minutes for permissions
    },
    retry: {
        maxAttempts: 3,
        backoffMs: 1000,
        retryableStatuses: [408, 429, 500, 502, 503, 504],
    },
    timeout: 30000,
};

// Module-level debounce flag — replaces window.__authSessionInvalidPending global
let sessionInvalidPending = false;

// Initialize singleton instances
const apiClient = new ApiClient();
const cacheManager = new CacheManager();
const requestQueue = new RequestQueue();

// Wire the queue executor to route through apiClient instead of raw fetch()
requestQueue.setExecutor(async (request) => {
    const { method, endpoint, data } = request;
    const httpMethod = (method || 'POST').toUpperCase();
    if (httpMethod === 'GET') {
        return apiClient.get(endpoint, data);
    }
    // Bypass offline check in post() to avoid re-enqueue loop
    const { call: frappeCall } = await import('../frappeClient');
    return frappeCall.post(endpoint, data);
});

// Wire queue into apiClient so mutations are auto-enqueued when offline
apiClient.setQueue(requestQueue);

// Bridge RequestQueue events → NetworkStore for UI awareness.
// Use a cached reference to avoid repeated dynamic imports.
let _networkStore = null;
const getNetworkStore = async () => {
    if (!_networkStore) {
        const mod = await import('../../stores/useNetworkStore');
        _networkStore = mod.default;
    }
    return _networkStore;
};

requestQueue.subscribe(async (event) => {
    try {
        const store = (await getNetworkStore()).getState();
        switch (event) {
            case 'enqueue':
            case 'replaced':
                store.addToSyncQueue();
                break;
            case 'success':
                store.removeFromSyncQueue();
                break;
            case 'processing:start':
                store.startSync();
                break;
            case 'processing:end':
                store.finishSync();
                break;
        }
    } catch {
        // Store not yet initialized — safe to ignore
    }
});

/**
 * Setup 401/403 interceptor for session handling
 * This interceptor clears auth state when session is TRULY invalid
 *
 * Important: Not all 403 errors mean session is invalid!
 * - 401 = Unauthorized (session expired, not logged in) → LOGOUT
 * - 403 with error code PERMISSION_DENIED = Permission denied → DO NOT logout
 * - 403 with "not logged in" message = Session invalid → LOGOUT
 * - 403 with "does not have permission" = Permission denied → DO NOT logout
 */
const setup401Interceptor = () => {
    apiClient.onError((error) => {
        const status = error?.httpStatus || error?.response?.status || error?.status;
        const message = (error?.message || '').toLowerCase();
        const errorCode = error?.code;

        // Check if this is a permission-denied error (NOT session invalid)
        // These errors should NOT trigger logout
        // Check error code first, then message patterns
        const isPermissionDenied =
            errorCode === 'PERMISSION_DENIED' ||
            message.includes('does not have doctype access') ||
            message.includes('does not have permission') ||
            message.includes('does not have access to this document') ||
            message.includes('permission denied') ||
            message.includes('insufficient permission');

        // Session-related errors that SHOULD trigger logout
        // Only logout if it's truly a session error (401 or explicit session messages)
        // Do NOT logout on 403 if it's a permission error
        const isSessionError =
            status === 401 ||
            (status === 403 && !isPermissionDenied) ||
            message.includes('session expired') ||
            message.includes('not logged in') ||
            message.includes('please login');

        const isDev = import.meta.env.DEV;

        if (isPermissionDenied) {
            // Permission error - DO NOT logout, just log for debugging
            if (isDev) {
                console.log(`[API Gateway] Permission denied (${status}):`, error?.message || error);
                console.log('[API Gateway] This is NOT a session error, user remains logged in');
            }
            // Return error without invalidating session
            return error;
        }

        if (isSessionError) {
            if (isDev) {
                console.log(`[API Gateway] Session error detected (${status}):`, error?.message || error);
            }

            // Debounce to avoid multiple simultaneous redirects when several
            // requests fail at the same time (e.g. on page load after expiry).
            if (!sessionInvalidPending) {
                sessionInvalidPending = true;
                setTimeout(() => {
                    // Use the Zustand store directly — always available, no mounted
                    // React component (AuthContext) required.
                    useAuthStore.getState().handleSessionInvalid();
                    sessionInvalidPending = false;
                }, 100);
            }
        }

        // Always re-throw the error
        return error;
    });

    if (import.meta.env.DEV) {
        console.log('[API Gateway] 401/403 interceptor registered');
    }
};

// Setup interceptor immediately
setup401Interceptor();

// Sync config to client module (avoids circular import)
setGatewayConfig(GatewayConfig);

// NOTE: Do NOT add a response interceptor that unwraps .message here.
// frappe-js-sdk call.post already returns {message: data} and components
// expect to access res?.message themselves. Auto-unwrapping breaks all
// existing patterns (40+ files use res?.message || []).

/**
 * Base Gateway class - all domain gateways extend this
 * Cache layer removed: React Query is the single cache (see DocumentService).
 */
export class BaseGateway {
    constructor() {
        this.client = apiClient;
        this.queue = requestQueue;
    }

    transformResponse(data) {
        return data;
    }

    transformRequest(data) {
        return data;
    }
}

// Re-export for external use
export { apiClient, cacheManager, requestQueue };
export { ApiClient } from './client';
export { CacheManager } from './cache';
export { RequestQueue } from './queue';
