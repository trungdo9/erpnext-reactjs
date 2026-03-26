/**
 * Search Query Hooks
 *
 * React Query hooks for search operations.
 */

import { useQuery } from '@tanstack/react-query';
import { SearchService } from '../domains';
import { queryKeys } from './keys';

/**
 * Hook for link field search
 */
export function useLinkSearch(doctype, query, options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.search.link(doctype, query),
        queryFn: () => SearchService.searchLink(doctype, query, options),
        enabled: !!doctype && query?.length >= 1,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        ...queryOptions,
    });
}

/**
 * Hook for global search
 */
export function useGlobalSearch(query, options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.search.global(query),
        queryFn: () => SearchService.globalSearch(query, options),
        enabled: query?.length >= 2,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
        ...queryOptions,
    });
}

/**
 * Hook for debounced search
 * Use with a debounced query state
 */
export function useDebouncedSearch(doctype, debouncedQuery, options = {}) {
    return useLinkSearch(doctype, debouncedQuery, options, {
        // Keep previous data while fetching new
        placeholderData: (prev) => prev,
    });
}
