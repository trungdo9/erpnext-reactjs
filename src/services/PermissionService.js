/**
 * Unified Permission Service
 *
 * Central service for checking user permissions with caching.
 * All permission checks should go through this service.
 */

import { MetadataService } from '../api/domains';

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Permission cache: { doctype: { permissions, timestamp } }
const permissionCache = new Map();

// Pending requests to prevent duplicate API calls
const pendingRequests = new Map();

/**
 * Permission Service - Singleton for managing permissions
 */
export const PermissionService = {
    /**
     * Check if user has specific permission on a doctype
     * @param {string} doctype
     * @param {string} permLevel - 'read', 'write', 'create', 'delete', 'submit', 'cancel'
     * @returns {Promise<boolean>}
     */
    async check(doctype, permLevel = 'read') {
        const perms = await this.getPermissions(doctype);
        return perms[permLevel] === true;
    },

    /**
     * Get all permissions for a doctype
     * @param {string} doctype
     * @param {boolean} forceRefresh - Bypass cache
     * @returns {Promise<Object>} { read, write, create, delete, submit, cancel, ... }
     */
    async getPermissions(doctype, forceRefresh = false) {
        if (!doctype) {
            return this._emptyPermissions();
        }

        // Check cache first
        if (!forceRefresh) {
            const cached = this._getCached(doctype);
            if (cached) return cached;
        }

        // Check if already fetching
        if (pendingRequests.has(doctype)) {
            return pendingRequests.get(doctype);
        }

        // Fetch permissions
        const promise = this._fetchPermissions(doctype);
        pendingRequests.set(doctype, promise);

        try {
            const perms = await promise;
            this._setCache(doctype, perms);
            return perms;
        } finally {
            pendingRequests.delete(doctype);
        }
    },

    /**
     * Quick check if user can access a doctype (read permission)
     * Uses a faster probe method
     * @param {string} doctype
     * @returns {Promise<boolean>}
     */
    async canAccess(doctype) {
        // First check cache
        const cached = this._getCached(doctype);
        if (cached) return cached.read === true;

        // Use faster probe check
        const hasAccess = await MetadataService.checkDoctypeAccess(doctype);

        // Cache the result
        if (hasAccess) {
            // If has access, we know at least read is true
            // Full permissions will be fetched lazily when needed
            this._setCache(doctype, { ...this._emptyPermissions(), read: true, _partial: true });
        } else {
            this._setCache(doctype, this._emptyPermissions());
        }

        return hasAccess;
    },

    /**
     * Bulk check access for multiple doctypes
     * @param {string[]} doctypes
     * @returns {Promise<Object>} { doctype: boolean }
     */
    async bulkCheckAccess(doctypes) {
        const uniqueDoctypes = [...new Set(doctypes)];
        const results = {};

        // Check cache first
        const uncached = [];
        for (const dt of uniqueDoctypes) {
            const cached = this._getCached(dt);
            if (cached) {
                results[dt] = cached.read === true;
            } else {
                uncached.push(dt);
            }
        }

        // Fetch uncached in parallel
        if (uncached.length > 0) {
            const checks = await Promise.allSettled(
                uncached.map(dt => this.canAccess(dt).then(access => ({ dt, access })))
            );

            for (const result of checks) {
                if (result.status === 'fulfilled') {
                    results[result.value.dt] = result.value.access;
                } else {
                    // On error, assume no access
                    results[result.reason?.dt] = false;
                }
            }
        }

        return results;
    },

    /**
     * Bulk get full permissions for multiple doctypes
     * @param {string[]} doctypes
     * @returns {Promise<Object>} { doctype: permissions }
     */
    async bulkGetPermissions(doctypes) {
        const uniqueDoctypes = [...new Set(doctypes)];
        const results = {};

        const promises = uniqueDoctypes.map(async (dt) => {
            const perms = await this.getPermissions(dt);
            results[dt] = perms;
        });

        await Promise.allSettled(promises);
        return results;
    },

    /**
     * Invalidate cache for a specific doctype or all
     * @param {string|null} doctype - null to clear all
     */
    invalidate(doctype = null) {
        if (doctype) {
            permissionCache.delete(doctype);
        } else {
            permissionCache.clear();
        }
    },

    /**
     * Get cache status (for debugging)
     */
    getCacheStatus() {
        const status = {};
        for (const [key, value] of permissionCache) {
            status[key] = {
                permissions: value.permissions,
                age: Date.now() - value.timestamp,
                expired: Date.now() - value.timestamp > CACHE_TTL
            };
        }
        return status;
    },

    // =========== Private Methods ===========

    _getCached(doctype) {
        const cached = permissionCache.get(doctype);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            // If partial cache, check if we need full permissions
            if (cached.permissions._partial) {
                return null; // Force fetch full permissions
            }
            return cached.permissions;
        }
        return null;
    },

    _setCache(doctype, permissions) {
        permissionCache.set(doctype, {
            permissions,
            timestamp: Date.now()
        });
    },

    async _fetchPermissions(doctype) {
        try {
            return await MetadataService.getDoctypePermissions(doctype);
        } catch {
            // Permission fetch failed - return empty (no console spam)
            return this._emptyPermissions();
        }
    },

    _emptyPermissions() {
        return {
            read: false,
            write: false,
            create: false,
            delete: false,
            submit: false,
            cancel: false,
            report: false,
            export: false,
            import: false,
        };
    }
};

export default PermissionService;
