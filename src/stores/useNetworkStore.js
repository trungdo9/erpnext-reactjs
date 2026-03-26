/**
 * Network Store - Zustand
 *
 * Manages network connectivity state, sync queue, and offline detection.
 * Foundation for offline-first architecture.
 *
 * Usage:
 * import { useNetworkStore } from '@/stores';
 * const { isOnline, pendingSyncCount, forceSync } = useNetworkStore();
 */

import { create } from 'zustand';

const CONNECTIVITY_CHECK_INTERVAL = 30000; // 30s
const CONNECTIVITY_CHECK_URL = '/api/method/ping';

const useNetworkStore = create((set, get) => ({
    // State
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: 'unknown', // 'wifi' | '4g' | '3g' | '2g' | 'unknown'
    isSlowConnection: false,
    lastOnlineAt: null,
    lastOfflineAt: null,

    // Sync state
    pendingSyncCount: 0,
    isSyncing: false,
    syncProgress: { current: 0, total: 0, percentage: 0 },
    lastSyncAt: null,
    syncErrors: [],
    hasSyncConflicts: false,

    // Actions
    setOnline: (isOnline) => {
        const now = new Date().toISOString();
        set((state) => ({
            isOnline,
            lastOnlineAt: isOnline ? now : state.lastOnlineAt,
            lastOfflineAt: !isOnline ? now : state.lastOfflineAt,
        }));

        // Auto-trigger sync when coming back online
        if (isOnline && get().pendingSyncCount > 0) {
            get().startSync();
        }
    },

    setConnectionType: (type) => {
        const slow = ['slow-2g', '2g', '3g'].includes(type);
        set({ connectionType: type, isSlowConnection: slow });
    },

    // Sync queue management
    addToSyncQueue: () => {
        set((state) => ({
            pendingSyncCount: state.pendingSyncCount + 1,
        }));
    },

    removeFromSyncQueue: (count = 1) => {
        set((state) => ({
            pendingSyncCount: Math.max(0, state.pendingSyncCount - count),
        }));
    },

    setSyncProgress: (current, total) => {
        set({
            syncProgress: {
                current,
                total,
                percentage: total > 0 ? Math.round((current / total) * 100) : 0,
            },
        });
    },

    startSync: () => {
        if (get().isSyncing) return;
        set({ isSyncing: true, syncErrors: [] });
        // Actual sync logic will be in useOfflineSync hook
    },

    finishSync: (errors = []) => {
        set({
            isSyncing: false,
            lastSyncAt: new Date().toISOString(),
            syncErrors: errors,
            syncProgress: { current: 0, total: 0, percentage: 0 },
        });
    },

    setSyncConflicts: (has) => set({ hasSyncConflicts: has }),

    // Force sync (manual trigger)
    forceSync: () => {
        if (!get().isOnline) return;
        get().startSync();
    },

    // Reset
    reset: () =>
        set({
            pendingSyncCount: 0,
            isSyncing: false,
            syncProgress: { current: 0, total: 0, percentage: 0 },
            syncErrors: [],
            hasSyncConflicts: false,
        }),
}));

// Initialize network listeners
if (typeof window !== 'undefined') {
    // Online/offline events
    window.addEventListener('online', () => {
        useNetworkStore.getState().setOnline(true);
    });
    window.addEventListener('offline', () => {
        useNetworkStore.getState().setOnline(false);
    });

    // Connection type detection (Network Information API)
    if (navigator.connection) {
        const updateConnection = () => {
            useNetworkStore
                .getState()
                .setConnectionType(navigator.connection.effectiveType || 'unknown');
        };
        updateConnection();
        navigator.connection.addEventListener('change', updateConnection);
    }

    // Periodic connectivity check (ping server)
    let checkInterval = null;
    const startConnectivityCheck = () => {
        if (checkInterval) return;
        checkInterval = setInterval(async () => {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                const response = await fetch(CONNECTIVITY_CHECK_URL, {
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-store',
                });
                clearTimeout(timeout);
                if (response.ok && !useNetworkStore.getState().isOnline) {
                    useNetworkStore.getState().setOnline(true);
                }
            } catch {
                // Don't immediately mark as offline - trust browser events
            }
        }, CONNECTIVITY_CHECK_INTERVAL);
    };

    // Start checking after page load
    if (document.readyState === 'complete') {
        startConnectivityCheck();
    } else {
        window.addEventListener('load', startConnectivityCheck);
    }
}

export default useNetworkStore;
