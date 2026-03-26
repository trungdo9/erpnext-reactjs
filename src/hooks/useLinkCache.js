/**
 * useLinkCache Hook
 *
 * React hook wrapper for LinkCacheService.
 * Provides reactive state for Link field options.
 */

import { useState, useCallback, useEffect } from 'react';
import { LinkCacheService } from '../services/LinkCacheService';

/**
 * Hook để quản lý cache cho Link field options
 * Uses global LinkCacheService to share cache across all Link fields
 *
 * @param {string} doctype - Linked doctype name
 * @returns {{ options, isLoading, error, isCached, fetchOptions, invalidate, filterOptions }}
 */
export function useLinkCache(doctype) {
    const [options, setOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Check if already cached on mount
    const isCached = doctype ? LinkCacheService.isCached(doctype) : false;

    // Subscribe to cache updates and load initial data
    useEffect(() => {
        if (!doctype) return;

        // Load from cache or fetch if not cached
        const loadInitialData = async () => {
            if (LinkCacheService.isCached(doctype)) {
                const cached = await LinkCacheService.getOptions(doctype);
                setOptions(cached);
            }
            // Note: We don't auto-fetch here - let the component decide when to fetch
            // This prevents unnecessary API calls on mount
        };

        loadInitialData();

        // Subscribe to updates
        const unsubscribe = LinkCacheService.subscribe(doctype, (data) => {
            setOptions(data);
        });

        return unsubscribe;
    }, [doctype]);

    /**
     * Fetch options từ API hoặc cache
     * @param {boolean} forceRefresh - Bỏ qua cache và fetch mới
     */
    const fetchOptions = useCallback(async (forceRefresh = false) => {
        if (!doctype) {
            console.warn('useLinkCache: No doctype provided');
            return [];
        }

        setIsLoading(true);
        setError(null);

        try {
            const data = await LinkCacheService.getOptions(doctype, forceRefresh);
            setOptions(data);
            return data;
        } catch (err) {
            console.error(`useLinkCache: Error fetching options for ${doctype}:`, err);
            setError((err.message || 'Failed to load options').replace(/<[^>]*>/g, ''));
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [doctype]);

    /**
     * Invalidate cache cho doctype này
     */
    const invalidate = useCallback(() => {
        if (doctype) {
            LinkCacheService.invalidate(doctype);
            setOptions([]);
        }
    }, [doctype]);

    /**
     * Filter options locally (no API call)
     * Uses local state if cache is empty
     * @param {string} query - Search text
     */
    const filterOptions = useCallback((query) => {
        if (!doctype) return [];

        // Try cache first
        const cached = LinkCacheService.filterOptions(doctype, query);
        if (cached.length > 0) return cached;

        // Fallback to local state if cache empty but we have options in state
        if (options.length > 0) {
            if (!query || query.trim() === '') {
                return options;
            }
            const lowerQuery = query.toLowerCase();
            return options.filter(item => {
                const value = typeof item === 'string' ? item : item.value;
                return value?.toLowerCase().includes(lowerQuery);
            });
        }

        return [];
    }, [doctype, options]);

    return {
        options,
        isLoading,
        error,
        isCached,
        fetchOptions,
        invalidate,
        filterOptions
    };
}

/**
 * Invalidate cache cho 1 doctype cụ thể (dùng ngoài hook)
 */
export function invalidateLinkCache(doctype) {
    LinkCacheService.invalidate(doctype);
}

/**
 * Invalidate toàn bộ cache
 */
export function invalidateAllLinkCache() {
    LinkCacheService.invalidate();
}

/**
 * Prefetch options cho nhiều doctypes
 */
export function prefetchLinkOptions(doctypes) {
    return LinkCacheService.prefetch(doctypes);
}

export default useLinkCache;
