/**
 * Link Cache Service
 *
 * Global cache for Link field options.
 * Prevents duplicate API calls when multiple Link fields reference the same doctype.
 *
 * Features:
 * - Singleton pattern with global cache
 * - Prevents duplicate in-flight requests
 * - TTL-based cache expiration
 * - Subscriber pattern for real-time updates
 * - Support for hierarchical doctypes (only show leaf nodes)
 */

import { apiClient } from '../api/gateway';

/**
 * Hierarchical doctypes that should only show leaf nodes (is_group = 0)
 * These are tree-structured doctypes in ERPNext
 */
const HIERARCHICAL_DOCTYPES = [
    'Vi Tri',           // Location tree
    'Farm',             // Farm hierarchy
    'Plot',             // Plot hierarchy
    'Area',             // Area/Zone
    'Vung',             // Zone
    'Cost Center',      // Cost center tree
    'Department',       // Department tree
    'Territory',        // Territory tree
    'Customer Group',   // Customer group tree
    'Item Group',       // Item group tree
    'Supplier Group',   // Supplier group tree
];

// Cache TTL: 10 minutes (links change less frequently)
const CACHE_TTL = 10 * 60 * 1000;

// Max items to cache per doctype (0 = unlimited from API, cap display at 2000)
const MAX_CACHE_SIZE = 2000;

// Global cache: { doctype: { data, timestamp } }
const linkCache = new Map();

// Pending requests to prevent duplicates
const pendingRequests = new Map();

// Subscribers for cache updates: { doctype: Set<callback> }
const subscribers = new Map();

export const LinkCacheService = {
    /**
     * Get options for a linked doctype
     * @param {string} doctype
     * @param {boolean} forceRefresh - Bypass cache
     * @returns {Promise<Array>}
     */
    async getOptions(doctype, forceRefresh = false) {
        if (!doctype) return [];

        // Check cache first
        if (!forceRefresh) {
            const cached = this._getCached(doctype);
            if (cached) return cached;
        }

        // Check if already fetching
        if (pendingRequests.has(doctype)) {
            return pendingRequests.get(doctype);
        }

        // Fetch from API
        const promise = this._fetchOptions(doctype);
        pendingRequests.set(doctype, promise);

        try {
            const data = await promise;
            this._setCache(doctype, data);
            this._notifySubscribers(doctype, data);
            return data;
        } finally {
            pendingRequests.delete(doctype);
        }
    },

    /**
     * Filter cached options locally (no API call)
     * @param {string} doctype
     * @param {string} query
     * @returns {Array}
     */
    filterOptions(doctype, query) {
        const cached = this._getCached(doctype);
        if (!cached) return [];

        if (!query || query.trim() === '') {
            return cached;
        }

        const lowerQuery = query.toLowerCase();
        return cached.filter(item => {
            const value = typeof item === 'string' ? item : item.value;
            return value?.toLowerCase().includes(lowerQuery);
        });
    },

    /**
     * Check if options are cached for a doctype
     * @param {string} doctype
     * @returns {boolean}
     */
    isCached(doctype) {
        return this._getCached(doctype) !== null;
    },

    /**
     * Prefetch options for multiple doctypes
     * @param {string[]} doctypes
     */
    async prefetch(doctypes) {
        const uncached = doctypes.filter(dt => !this.isCached(dt));
        await Promise.allSettled(
            uncached.map(dt => this.getOptions(dt))
        );
    },

    /**
     * Subscribe to cache updates for a doctype
     * @param {string} doctype
     * @param {Function} callback
     * @returns {Function} Unsubscribe function
     */
    subscribe(doctype, callback) {
        if (!subscribers.has(doctype)) {
            subscribers.set(doctype, new Set());
        }
        subscribers.get(doctype).add(callback);

        // Return unsubscribe function
        return () => {
            const subs = subscribers.get(doctype);
            if (subs) {
                subs.delete(callback);
                if (subs.size === 0) {
                    subscribers.delete(doctype);
                }
            }
        };
    },

    /**
     * Invalidate cache for a specific doctype or all
     * @param {string|null} doctype
     */
    invalidate(doctype = null) {
        if (doctype) {
            linkCache.delete(doctype);
        } else {
            linkCache.clear();
        }
    },

    /**
     * Get cache statistics (for debugging)
     */
    getStats() {
        const stats = {
            cachedDoctypes: linkCache.size,
            totalItems: 0,
            details: {}
        };

        for (const [doctype, entry] of linkCache) {
            const age = Date.now() - entry.timestamp;
            stats.details[doctype] = {
                itemCount: entry.data.length,
                ageSeconds: Math.round(age / 1000),
                expired: age > CACHE_TTL
            };
            stats.totalItems += entry.data.length;
        }

        return stats;
    },

    // =========== Private Methods ===========

    _getCached(doctype) {
        const entry = linkCache.get(doctype);
        if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
            return entry.data;
        }
        return null;
    },

    _setCache(doctype, data) {
        linkCache.set(doctype, {
            data: data.slice(0, MAX_CACHE_SIZE),
            timestamp: Date.now()
        });
    },

    async _fetchOptions(doctype) {
        try {
            // Check if this is a hierarchical doctype that needs leaf-only filter
            const isHierarchical = HIERARCHICAL_DOCTYPES.includes(doctype);

            // Build filters
            const filters = isHierarchical ? [['is_group', '=', 0]] : [];

            // Use POST frappe.client.get_list for reliable filter support
            // Use explicit large limit (not 0) for consistent behavior across Frappe versions
            const response = await apiClient.post('frappe.client.get_list', {
                doctype,
                fields: ['name'],
                filters,
                order_by: 'name asc',
                limit_page_length: 1000,
            });

            const records = response?.message || [];
            return records.map(item => ({
                value: item.name,
                label: item.name,
            }));
        } catch (error) {
            console.warn(`LinkCache: Failed to fetch options for ${doctype}:`, error);
            return [];
        }
    },

    _notifySubscribers(doctype, data) {
        const subs = subscribers.get(doctype);
        if (subs) {
            subs.forEach(callback => {
                try {
                    callback(data);
                } catch (err) {
                    console.warn('LinkCache subscriber error:', err);
                }
            });
        }
    }
};

export default LinkCacheService;
