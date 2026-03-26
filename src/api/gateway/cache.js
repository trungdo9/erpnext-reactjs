/**
 * Cache Manager
 *
 * In-memory cache with TTL support.
 * Features:
 * - Time-based expiration
 * - Pattern-based invalidation
 * - Cache statistics
 * - Optional persistence to localStorage
 */

/**
 * Cache entry structure
 */
class CacheEntry {
    constructor(value, ttl) {
        this.value = value;
        this.expiresAt = Date.now() + ttl;
        this.createdAt = Date.now();
        this.lastAccessedAt = Date.now();
    }

    isExpired() {
        return Date.now() > this.expiresAt;
    }
}

/**
 * Cache Manager class
 */
export class CacheManager {
    constructor(options = {}) {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            invalidations: 0,
        };

        // Options
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.defaultTTL || 60000; // 1 minute
        this.persistKey = options.persistKey || null;

        // Debounce timer for saveToStorage
        this._saveTimer = null;

        // Load from localStorage if persistence is enabled
        if (this.persistKey) {
            this.loadFromStorage();
        }

        // Cleanup expired entries periodically
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Every minute
    }

    /**
     * Get a value from cache
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            return null;
        }

        if (entry.isExpired()) {
            this.cache.delete(key);
            this.stats.misses++;
            return null;
        }

        this.stats.hits++;
        entry.lastAccessedAt = Date.now();
        return entry.value;
    }

    /**
     * Set a value in cache
     */
    set(key, value, ttl = this.defaultTTL) {
        // Enforce max size
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }

        this.cache.set(key, new CacheEntry(value, ttl));
        this.stats.sets++;

        // Persist if enabled (debounced to avoid thrashing on rapid sets)
        if (this.persistKey) {
            clearTimeout(this._saveTimer);
            this._saveTimer = setTimeout(() => this.saveToStorage(), 500);
        }
    }

    /**
     * Check if key exists and is not expired
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry || entry.isExpired()) {
            return false;
        }
        return true;
    }

    /**
     * Delete a specific key
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.invalidations++;
        }
        return deleted;
    }

    /**
     * Invalidate cache entries matching a pattern
     * Pattern can be:
     * - string: exact match
     * - RegExp: regex match
     * - function: predicate function
     */
    invalidate(pattern) {
        let count = 0;

        for (const key of this.cache.keys()) {
            let shouldDelete = false;

            if (typeof pattern === 'string') {
                shouldDelete = key.includes(pattern);
            } else if (pattern instanceof RegExp) {
                shouldDelete = pattern.test(key);
            } else if (typeof pattern === 'function') {
                shouldDelete = pattern(key);
            }

            if (shouldDelete) {
                this.cache.delete(key);
                count++;
            }
        }

        this.stats.invalidations += count;
        return count;
    }

    /**
     * Clear all cache entries
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.stats.invalidations += size;

        if (this.persistKey) {
            localStorage.removeItem(this.persistKey);
        }
    }

    /**
     * Remove expired entries
     */
    cleanup() {
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.isExpired()) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        return cleaned;
    }

    /**
     * Evict oldest entry (LRU)
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Infinity;

        for (const [key, entry] of this.cache.entries()) {
            if (entry.lastAccessedAt < oldestTime) {
                oldestTime = entry.lastAccessedAt;
                oldestKey = key;
            }
        }

        if (oldestKey) {
            this.cache.delete(oldestKey);
        }
    }

    /**
     * Get cache statistics
     */
    getStats() {
        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
        };
    }

    /**
     * Save cache to localStorage
     */
    saveToStorage() {
        if (!this.persistKey) return;

        try {
            const data = {};
            for (const [key, entry] of this.cache.entries()) {
                if (!entry.isExpired()) {
                    data[key] = {
                        value: entry.value,
                        expiresAt: entry.expiresAt,
                    };
                }
            }
            localStorage.setItem(this.persistKey, JSON.stringify(data));
        } catch (e) {
            console.warn('Failed to persist cache:', e);
        }
    }

    /**
     * Load cache from localStorage
     */
    loadFromStorage() {
        if (!this.persistKey) return;

        try {
            const data = localStorage.getItem(this.persistKey);
            if (!data) return;

            const parsed = JSON.parse(data);
            const now = Date.now();

            for (const [key, item] of Object.entries(parsed)) {
                if (item.expiresAt > now) {
                    const entry = new CacheEntry(item.value, item.expiresAt - now);
                    this.cache.set(key, entry);
                }
            }
        } catch (e) {
            console.warn('Failed to load cache from storage:', e);
        }
    }

    /**
     * Destroy the cache manager
     */
    destroy() {
        clearInterval(this.cleanupInterval);
        this.clear();
    }
}

/**
 * Create cache key helpers
 */
export const CacheKeys = {
    docList: (doctype, params) => `list:${doctype}:${JSON.stringify(params)}`,
    doc: (doctype, name) => `doc:${doctype}:${name}`,
    meta: (doctype) => `meta:${doctype}`,
    permissions: (doctype) => `perms:${doctype}`,
    search: (doctype, query) => `search:${doctype}:${query}`,
    workflow: (doctype, name) => `workflow:${doctype}:${name}`,
};

export default CacheManager;
