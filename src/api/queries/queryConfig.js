/**
 * React Query Configuration (non-component exports)
 *
 * Separated from client.jsx to satisfy react-refresh
 * (files with components should only export components).
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Stale time presets for different query types.
 * Individual hooks can override via queryOptions.
 */
export const STALE_TIMES = {
    /** Metadata (doctype schemas) — rarely changes */
    metadata: 30 * 60 * 1000, // 30 minutes
    /** List queries — moderate freshness */
    list: 5 * 60 * 1000,      // 5 minutes
    /** Single document — needs fresher data */
    document: 2 * 60 * 1000,  // 2 minutes
    /** Default fallback */
    default: 5 * 60 * 1000,   // 5 minutes
};

/**
 * Default query options
 */
const defaultQueryOptions = {
    queries: {
        staleTime: STALE_TIMES.default,
        gcTime: 30 * 60 * 1000,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
        refetchOnWindowFocus: false,
        refetchOnMount: true,
        refetchOnReconnect: true,
    },
    mutations: {
        retry: 1,
    },
};

/**
 * Singleton query client
 */
export const queryClient = new QueryClient({
    defaultOptions: defaultQueryOptions,
});

/**
 * Helper to invalidate queries
 */
export function invalidateQueries(keys) {
    if (Array.isArray(keys)) {
        keys.forEach(key => queryClient.invalidateQueries({ queryKey: key }));
    } else {
        queryClient.invalidateQueries({ queryKey: keys });
    }
}

/**
 * Helper to prefetch queries
 */
export async function prefetchQuery(key, fetcher, options = {}) {
    return queryClient.prefetchQuery({
        queryKey: key,
        queryFn: fetcher,
        ...options,
    });
}

/**
 * Helper to set query data directly
 */
export function setQueryData(key, data) {
    queryClient.setQueryData(key, data);
}

/**
 * Helper to get cached query data
 */
export function getQueryData(key) {
    return queryClient.getQueryData(key);
}
