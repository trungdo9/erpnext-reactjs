/**
 * useListURLState - URL ↔ State synchronization for DynamicListView
 * 
 * Manages sorting, column filters, and search text via URL search params,
 * providing a single source of truth for list state.
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useListURLState({ isExternalMode }) {
    const [searchParams, setSearchParams] = useSearchParams();

    // =========================================================================
    // URL ← → State Serialization Helpers
    // =========================================================================
    const parseFiltersFromURL = useCallback(() => {
        const filtersParam = searchParams.get('filters');
        if (!filtersParam) return {};
        try {
            const parsed = JSON.parse(decodeURIComponent(filtersParam));
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            // Malformed URL param - ignore gracefully
        }
        return {};
    }, [searchParams]);

    const parseSortFromURL = useCallback(() => {
        const sortParam = searchParams.get('sort');
        if (!sortParam) return null;
        const [field, order] = sortParam.split(':');
        if (field) {
            return [{ id: field, desc: order === 'desc' }];
        }
        return null;
    }, [searchParams]);

    const parseSearchFromURL = useCallback(() => {
        return searchParams.get('search') || '';
    }, [searchParams]);

    // Derive state from URL params
    const columnFilters = useMemo(() => parseFiltersFromURL(), [parseFiltersFromURL]);
    const sorting = useMemo(() => {
        const fromURL = parseSortFromURL();
        if (fromURL) return fromURL;
        return isExternalMode ? [] : [{ id: 'modified', desc: true }];
    }, [parseSortFromURL, isExternalMode]);
    const searchText = useMemo(() => parseSearchFromURL(), [parseSearchFromURL]);

    // Update URL helper - uses replace:true to avoid history pollution
    const updateSearchParams = useCallback((updater) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            updater(next);
            return next;
        }, { replace: true });
    }, [setSearchParams]);

    // State setters that write to URL
    const setColumnFilters = useCallback((valOrUpdater) => {
        updateSearchParams((params) => {
            const current = (() => {
                const fp = params.get('filters');
                if (!fp) return {};
                try { const p = JSON.parse(decodeURIComponent(fp)); return (p && typeof p === 'object' && !Array.isArray(p)) ? p : {}; } catch { return {}; }
            })();
            const newFilters = typeof valOrUpdater === 'function' ? valOrUpdater(current) : valOrUpdater;
            if (Object.keys(newFilters).length > 0) {
                params.set('filters', encodeURIComponent(JSON.stringify(newFilters)));
            } else {
                params.delete('filters');
            }
        });
    }, [updateSearchParams]);

    const setSorting = useCallback((valOrUpdater) => {
        updateSearchParams((params) => {
            const currentSort = (() => {
                const sp = params.get('sort');
                if (!sp) return isExternalMode ? [] : [{ id: 'modified', desc: true }];
                const [field, order] = sp.split(':');
                return field ? [{ id: field, desc: order === 'desc' }] : (isExternalMode ? [] : [{ id: 'modified', desc: true }]);
            })();
            const newSorting = typeof valOrUpdater === 'function' ? valOrUpdater(currentSort) : valOrUpdater;
            if (newSorting.length > 0) {
                params.set('sort', `${newSorting[0].id}:${newSorting[0].desc ? 'desc' : 'asc'}`);
            } else {
                params.delete('sort');
            }
        });
    }, [updateSearchParams, isExternalMode]);

    const setSearchText = useCallback((val) => {
        updateSearchParams((params) => {
            if (val) {
                params.set('search', val);
            } else {
                params.delete('search');
            }
        });
    }, [updateSearchParams]);

    // Local search input state - syncs to URL after debounce
    const [localSearchText, setLocalSearchText] = useState(searchText);
    const [debouncedSearch, setDebouncedSearch] = useState(searchText);

    // Sync local search input when URL search param changes externally
    const prevSearchTextRef = useRef(searchText);
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (searchText !== prevSearchTextRef.current) {
            prevSearchTextRef.current = searchText;
            setLocalSearchText(searchText);
        }
    }, [searchText]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Debounce local search text (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(localSearchText);
            setSearchText(localSearchText);
        }, 300);
        return () => clearTimeout(timer);
    }, [localSearchText, setSearchText]);

    // Sort config for API
    const sortConfig = useMemo(() => {
        if (sorting.length === 0) return { field: 'modified', order: 'desc' };
        return { field: sorting[0].id, order: sorting[0].desc ? 'desc' : 'asc' };
    }, [sorting]);

    return {
        columnFilters,
        setColumnFilters,
        sorting,
        setSorting,
        searchText,
        setSearchText,
        localSearchText,
        setLocalSearchText,
        debouncedSearch,
        sortConfig,
    };
}
