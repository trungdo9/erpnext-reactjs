/**
 * useListFilters - API filter building for DynamicListView
 * 
 * Converts column filter configs → API filter arrays (doctype mode)
 * and builds search or_filters from metadata search fields.
 */

import { useMemo } from 'react';

/**
 * Build API filter array from column filter state
 */
export function buildApiFilters(columnFilters) {
    const filters = [];
    Object.entries(columnFilters).forEach(([field, filterConfig]) => {
        if (!filterConfig) return;
        if (filterConfig.type === 'values' && filterConfig.values?.length > 0) {
            if (filterConfig.values.length === 1) {
                filters.push([field, '=', filterConfig.values[0]]);
            } else {
                filters.push([field, 'in', filterConfig.values]);
            }
        } else if (filterConfig.type === 'custom' && filterConfig.customValue) {
            const { condition, customValue, customValue2 } = filterConfig;
            switch (condition) {
                case 'equals': filters.push([field, '=', customValue]); break;
                case 'not_equals': filters.push([field, '!=', customValue]); break;
                case 'contains': filters.push([field, 'like', `%${customValue}%`]); break;
                case 'not_contains': filters.push([field, 'not like', `%${customValue}%`]); break;
                case 'starts_with': filters.push([field, 'like', `${customValue}%`]); break;
                case 'ends_with': filters.push([field, 'like', `%${customValue}`]); break;
                case 'greater_than': filters.push([field, '>', customValue]); break;
                case 'less_than': filters.push([field, '<', customValue]); break;
                case 'between':
                    filters.push([field, '>=', customValue]);
                    if (customValue2) filters.push([field, '<=', customValue2]);
                    break;
                case 'today': filters.push([field, '=', new Date().toISOString().split('T')[0]]); break;
                case 'yesterday': {
                    const d = new Date(); d.setDate(d.getDate() - 1);
                    filters.push([field, '=', d.toISOString().split('T')[0]]); break;
                }
                case 'this_week': {
                    const now = new Date();
                    const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
                    filters.push([field, '>=', startOfWeek.toISOString().split('T')[0]]);
                    filters.push([field, '<=', now.toISOString().split('T')[0]]); break;
                }
                case 'this_month': {
                    const now2 = new Date();
                    filters.push([field, '>=', `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, '0')}-01`]);
                    filters.push([field, '<=', now2.toISOString().split('T')[0]]); break;
                }
                case 'this_year': {
                    filters.push([field, '>=', `${new Date().getFullYear()}-01-01`]);
                    filters.push([field, '<=', new Date().toISOString().split('T')[0]]); break;
                }
                default: filters.push([field, 'like', `%${customValue}%`]);
            }
        }
    });
    return filters;
}

/**
 * Client-side filter for external data mode
 */
export function filterExternalData(data, columnFilters, searchTerm) {
    let filtered = data;

    if (Object.keys(columnFilters).length > 0) {
        filtered = filtered.filter(row => {
            return Object.entries(columnFilters).every(([field, filterConfig]) => {
                if (!filterConfig) return true;
                const value = row[field];
                const strValue = value != null ? String(value) : '';

                if (filterConfig.type === 'values' && filterConfig.values?.length > 0) {
                    return filterConfig.values.includes(strValue) || filterConfig.values.includes(value);
                }

                if (filterConfig.type === 'custom' && filterConfig.customValue) {
                    const { condition, customValue, customValue2 } = filterConfig;
                    const numVal = parseFloat(value);
                    const numCustom = parseFloat(customValue);

                    switch (condition) {
                        case 'equals': return strValue === customValue;
                        case 'not_equals': return strValue !== customValue;
                        case 'contains': return strValue.toLowerCase().includes(customValue.toLowerCase());
                        case 'not_contains': return !strValue.toLowerCase().includes(customValue.toLowerCase());
                        case 'starts_with': return strValue.toLowerCase().startsWith(customValue.toLowerCase());
                        case 'ends_with': return strValue.toLowerCase().endsWith(customValue.toLowerCase());
                        case 'greater_than': return !isNaN(numVal) && numVal > numCustom;
                        case 'less_than': return !isNaN(numVal) && numVal < numCustom;
                        case 'between': return !isNaN(numVal) && numVal >= numCustom && (!customValue2 || numVal <= parseFloat(customValue2));
                        default: return strValue.toLowerCase().includes(customValue.toLowerCase());
                    }
                }
                return true;
            });
        });
    }

    if (searchTerm?.trim()) {
        const term = searchTerm.trim().toLowerCase();
        filtered = filtered.filter(row =>
            Object.values(row).some(v =>
                v != null && String(v).toLowerCase().includes(term)
            )
        );
    }

    return filtered;
}

/**
 * Hook: useSearchOrFilters - builds text search or_filters for API
 */
export function useSearchOrFilters(debouncedSearch, meta) {
    return useMemo(() => {
        if (!debouncedSearch.trim()) return [];
        const searchTerm = `%${debouncedSearch.trim()}%`;
        const searchFieldSet = new Set(['name']);
        if (meta?.title_field) searchFieldSet.add(meta.title_field);
        if (meta?.search_fields) {
            meta.search_fields.forEach(f => { if (f) searchFieldSet.add(f); });
        }
        return Array.from(searchFieldSet).map(field => [field, 'like', searchTerm]);
    }, [debouncedSearch, meta]);
}
