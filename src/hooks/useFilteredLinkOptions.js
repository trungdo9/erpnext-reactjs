/**
 * useFilteredLinkOptions Hook
 *
 * React hook for Link fields with dynamic filters based on form values.
 * Fetches options filtered by conditions that depend on other form fields.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { apiClient } from '../api/gateway';

/**
 * Convert filter object to Frappe array format
 * { field: value } -> [["field", "=", "value"]]
 */
function convertToFrappeFilters(filterObj) {
    if (!filterObj || typeof filterObj !== 'object') return null;

    return Object.entries(filterObj).map(([field, value]) => [field, '=', value]);
}

/**
 * Hook for Link fields with dynamic filtering
 *
 * @param {string} doctype - Linked doctype name
 * @param {Object|null|undefined} filter - Filter object, null (no options), or undefined (all options)
 * @returns {{ options, isLoading, error, fetchOptions, filterOptions }}
 */
export function useFilteredLinkOptions(doctype, filter) {
    const [options, setOptions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Track the last filter to detect changes
    const lastFilterRef = useRef(null);
    const filterKey = filter === null ? 'null' : filter === undefined ? 'undefined' : JSON.stringify(filter);

    /**
     * Fetch options from API with filter
     */
    const fetchOptions = useCallback(async () => {
        if (!doctype) {
            console.warn('useFilteredLinkOptions: No doctype provided');
            return [];
        }

        // If filter is null, no options should be shown (root level - no parent)
        if (filter === null) {
            setOptions([]);
            return [];
        }

        setIsLoading(true);
        setError(null);

        try {
            // Convert filter to Frappe array format
            const frappeFilters = convertToFrappeFilters(filter);

            // Use POST frappe.client.get_list for reliable filter support
            // NOTE: use explicit large limit (not 0) for reliable behavior across Frappe versions
            const response = await apiClient.post('frappe.client.get_list', {
                doctype,
                fields: ['name'],
                filters: frappeFilters || [],
                order_by: 'name asc',
                limit_page_length: 1000,
            });

            // Transform to option format
            const records = response?.message || [];
            const transformed = records.map(item => ({
                value: item.name,
                label: item.name,
            }));

            setOptions(transformed);
            return transformed;
        } catch (err) {
            console.error(`useFilteredLinkOptions: Error fetching options for ${doctype}:`, err);
            setError((err.message || 'Failed to load options').replace(/<[^>]*>/g, ''));
            return [];
        } finally {
            setIsLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doctype, filterKey]);

    // Fetch when filter changes
    useEffect(() => {
        if (filterKey !== lastFilterRef.current) {
            lastFilterRef.current = filterKey;
            fetchOptions();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterKey]);

    /**
     * Filter options locally by search query
     */
    const filterOptions = useCallback((query) => {
        if (!query || query.trim() === '') {
            return options;
        }

        const lowerQuery = query.toLowerCase();
        return options.filter(item => {
            const value = typeof item === 'string' ? item : item.value;
            return value?.toLowerCase().includes(lowerQuery);
        });
    }, [options]);

    return {
        options,
        isLoading,
        error,
        fetchOptions,
        filterOptions,
    };
}

export default useFilteredLinkOptions;
