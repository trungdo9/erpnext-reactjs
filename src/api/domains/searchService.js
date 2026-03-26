/**
 * Search Service
 *
 * Handles search operations across the application.
 */

import { apiClient, cacheManager } from '../gateway';
import { CacheKeys } from '../gateway/cache';

/**
 * Search Service class
 */
class SearchServiceClass {
    /**
     * Search for link field values
     * @param {string} doctype
     * @param {string} query
     * @param {object} options
     * @returns {Promise<Array>}
     */
    async searchLink(doctype, query, options = {}) {
        const {
            limit = 10,
            filters = null,
            reference_doctype = null,
            useCache = true,
        } = options;

        const cacheKey = CacheKeys.search(doctype, `${query}:${limit}:${JSON.stringify(filters)}`);

        // Check cache for short queries
        if (useCache && query.length >= 2) {
            const cached = cacheManager.get(cacheKey);
            if (cached) return cached;
        }

        try {
            const result = await apiClient.get('frappe.desk.search.search_link', {
                txt: query,
                doctype,
                page_length: limit,
                filters: filters ? JSON.stringify(filters) : undefined,
                reference_doctype,
            });

            const items = result?.results || result?.message || [];
            const transformed = items.map(item => ({
                value: item.value,
                label: item.description || item.value,
                description: item.description,
            }));

            // Cache for 30 seconds
            if (useCache && query.length >= 2) {
                cacheManager.set(cacheKey, transformed, 30000);
            }

            return transformed;
        } catch (error) {
            console.warn(`Search failed for ${doctype}: ${error.message}`);
            return [];
        }
    }

    /**
     * Global search across multiple doctypes
     * @param {string} query
     * @param {object} options
     * @returns {Promise<object>}
     */
    async globalSearch(query, options = {}) {
        const {
            doctypes = [],
            limit = 5,
        } = options;

        try {
            const result = await apiClient.get('frappe.desk.search.search_widget', {
                text: query,
                doctypes: JSON.stringify(doctypes),
                limit_page_length: limit,
            });

            return result?.message || {};
        } catch (error) {
            console.warn(`Global search failed: ${error.message}`);
            return {};
        }
    }

    /**
     * Full-text search within a doctype
     * @param {string} doctype
     * @param {string} query
     * @param {object} options
     * @returns {Promise<Array>}
     */
    async fullTextSearch(doctype, query, options = {}) {
        const {
            fields = ['name'],
            filters = [],
            limit = 20,
            start = 0,
        } = options;

        try {
            // Search using filters with LIKE operator
            const searchFilters = [
                ...filters,
                ['name', 'like', `%${query}%`],
            ];

            const result = await apiClient.getList(doctype, {
                fields,
                filters: searchFilters,
                limit_page_length: limit,
                limit_start: start,
            });

            return result;
        } catch (error) {
            console.warn(`Full-text search failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Get recent items for a doctype
     * @param {string} doctype
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async getRecent(doctype, limit = 5) {
        try {
            const result = await apiClient.getList(doctype, {
                fields: ['name', 'modified'],
                order_by: 'modified desc',
                limit_page_length: limit,
            });

            return result.map(item => ({
                value: item.name,
                label: item.name,
                modified: item.modified,
            }));
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn(`[SearchService] getRecent failed for ${doctype}:`, error);
            }
            return [];
        }
    }

    /**
     * Get awesomebar suggestions (command palette)
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async getAwesomebarSuggestions(query) {
        try {
            const result = await apiClient.get('frappe.desk.search.get_search_results', {
                text: query,
            });

            return result?.message || [];
        } catch (error) {
            if (import.meta.env.DEV) {
                console.warn('[SearchService] getAwesomebarSuggestions failed:', error);
            }
            return [];
        }
    }

    /**
     * Search with filters
     * @param {string} doctype
     * @param {Array} filters
     * @param {object} options
     * @returns {Promise<Array>}
     */
    async searchWithFilters(doctype, filters, options = {}) {
        const {
            fields = ['name'],
            limit = 20,
            orderBy = 'modified desc',
        } = options;

        try {
            return await apiClient.getList(doctype, {
                fields,
                filters,
                order_by: orderBy,
                limit_page_length: limit,
            });
        } catch (error) {
            console.warn(`Search with filters failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Clear search cache
     */
    clearCache() {
        cacheManager.invalidate('search:');
    }
}

// Export singleton
export const SearchService = new SearchServiceClass();
export default SearchService;
