/**
 * Dashboard Hooks
 *
 * React Query hooks for dashboard data with smart caching and background refresh
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { WorkspaceService } from '../api/domains/workspaceService';
import { REFRESH_CONFIG } from '../config/dashboard.config';

/**
 * Query keys for dashboard
 */
export const DASHBOARD_KEYS = {
    all: ['dashboard'],
    data: (workspace) => ['dashboard', 'data', workspace],
    stats: (workspace) => ['dashboard', 'stats', workspace],
    shortcuts: (workspace) => ['dashboard', 'shortcuts', workspace],
    activity: () => ['dashboard', 'activity']
};

/**
 * Main dashboard hook - gets all dashboard data in one call
 *
 * @param {string} workspace - Workspace name (default: 'Home')
 * @param {object} options - Additional options
 * @returns {object} { data, isLoading, error, refetch, isStale }
 *
 * @example
 * const { data, isLoading } = useDashboard('Home');
 * const { stats, shortcuts, recentActivity } = data;
 */
export function useDashboard(workspace = 'Home', options = {}) {
    const {
        enabled = true,
        refetchOnWindowFocus = false,
        refetchInterval = false
    } = options;

    const query = useQuery({
        queryKey: DASHBOARD_KEYS.data(workspace),
        queryFn: () => WorkspaceService.getDashboardData(workspace),
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus,
        refetchInterval,
        enabled,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    });

    // Memoized data with defaults
    const data = useMemo(() => ({
        stats: query.data?.stats ?? [],
        shortcuts: query.data?.shortcuts ?? [],
        recentActivity: query.data?.recentActivity ?? [],
        meta: query.data?.meta ?? { source: 'loading' }
    }), [query.data]);

    return {
        ...query,
        data,
        isEmpty: data.stats.length === 0 && data.shortcuts.length === 0,
        isFromCache: query.data?.meta?.source === 'cache',
        isFromFallback: query.data?.meta?.source === 'fallback'
    };
}

/**
 * Hook to refresh dashboard data
 *
 * @returns {object} { refresh, invalidate, isRefreshing }
 */
export function useDashboardRefresh() {
    const queryClient = useQueryClient();

    const refresh = useCallback((workspace = 'Home') => {
        return queryClient.refetchQueries({
            queryKey: DASHBOARD_KEYS.data(workspace)
        });
    }, [queryClient]);

    const invalidate = useCallback(() => {
        WorkspaceService.invalidateCache();
        return queryClient.invalidateQueries({
            queryKey: DASHBOARD_KEYS.all
        });
    }, [queryClient]);

    const isRefreshing = queryClient.isFetching({
        queryKey: DASHBOARD_KEYS.all
    }) > 0;

    return { refresh, invalidate, isRefreshing };
}

/**
 * Hook for just dashboard stats
 * Use when you only need stats without shortcuts/activity
 *
 * @param {string} workspace
 * @returns {object}
 */
export function useDashboardStats(workspace = 'Home') {
    const { data, isLoading, error } = useDashboard(workspace);

    return {
        stats: data.stats,
        isLoading,
        error,
        isEmpty: data.stats.length === 0
    };
}

/**
 * Hook for quick actions / shortcuts
 *
 * @param {string} workspace
 * @returns {object}
 */
export function useDashboardShortcuts(workspace = 'Home') {
    const { data, isLoading, error } = useDashboard(workspace);

    return {
        shortcuts: data.shortcuts,
        isLoading,
        error,
        isEmpty: data.shortcuts.length === 0
    };
}

/**
 * Hook for recent activity
 *
 * @param {string} workspace
 * @returns {object}
 */
export function useDashboardActivity(workspace = 'Home') {
    const { data, isLoading, error } = useDashboard(workspace);

    return {
        activity: data.recentActivity,
        isLoading,
        error,
        isEmpty: data.recentActivity.length === 0
    };
}

/**
 * Prefetch dashboard data (for navigation optimization)
 *
 * @param {string} workspace
 */
export function usePrefetchDashboard() {
    const queryClient = useQueryClient();

    return useCallback((workspace = 'Home') => {
        queryClient.prefetchQuery({
            queryKey: DASHBOARD_KEYS.data(workspace),
            queryFn: () => WorkspaceService.getDashboardData(workspace),
            // Uses global staleTime: 5 minutes
        });
    }, [queryClient]);
}

export default useDashboard;
