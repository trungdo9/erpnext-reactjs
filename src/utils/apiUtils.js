/**
 * API Utilities - Rate limiting, debounce, throttle
 * Production-ready utilities for API call management
 */

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function with cancel method
 */
export function debounce(func, wait = 300) {
    let timeoutId = null;

    const debounced = function(...args) {
        const context = this;

        if (timeoutId) {
            clearTimeout(timeoutId);
        }

        return new Promise((resolve) => {
            timeoutId = setTimeout(() => {
                timeoutId = null;
                resolve(func.apply(context, args));
            }, wait);
        });
    };

    debounced.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    debounced.flush = function(...args) {
        debounced.cancel();
        return func.apply(this, args);
    };

    return debounced;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 * @param {Function} func - Function to throttle
 * @param {number} wait - Milliseconds to wait between calls
 * @returns {Function} Throttled function
 */
export function throttle(func, wait = 300) {
    let lastCall = 0;
    let timeoutId = null;

    const throttled = function(...args) {
        const context = this;
        const now = Date.now();
        const remaining = wait - (now - lastCall);

        if (remaining <= 0) {
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            lastCall = now;
            return func.apply(context, args);
        } else if (!timeoutId) {
            timeoutId = setTimeout(() => {
                lastCall = Date.now();
                timeoutId = null;
                func.apply(context, args);
            }, remaining);
        }
    };

    throttled.cancel = () => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };

    return throttled;
}

/**
 * Simple in-memory cache with TTL
 */
class RequestCache {
    constructor(ttl = 60000) {
        this.cache = new Map();
        this.ttl = ttl;
    }

    generateKey(url, params) {
        return `${url}:${JSON.stringify(params || {})}`;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.data;
    }

    set(key, data, ttl = this.ttl) {
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttl,
        });
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Global request cache instance (5 minute default TTL)
export const requestCache = new RequestCache(5 * 60 * 1000);

/**
 * Wrapper for API calls with caching
 * @param {Function} apiCall - API function to call
 * @param {string} cacheKey - Unique cache key
 * @param {number} ttl - Cache TTL in milliseconds
 */
export async function cachedRequest(apiCall, cacheKey, ttl = 60000) {
    const cached = requestCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const result = await apiCall();
    requestCache.set(cacheKey, result, ttl);
    return result;
}

/**
 * Retry wrapper for API calls
 * @param {Function} apiCall - API function to call
 * @param {Object} options - Retry options
 */
export async function retryRequest(apiCall, options = {}) {
    const {
        maxRetries = 3,
        delay = 1000,
        backoff = 2,
        shouldRetry = (error) => {
            // Retry on network errors or 5xx server errors
            if (!error.httpStatus) return true;
            return error.httpStatus >= 500;
        }
    } = options;

    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await apiCall();
        } catch (error) {
            lastError = error;

            if (!shouldRetry(error) || attempt === maxRetries - 1) {
                throw error;
            }

            // Wait before retrying with exponential backoff
            const waitTime = delay * Math.pow(backoff, attempt);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }

    throw lastError;
}

/**
 * Request deduplication - prevents duplicate concurrent requests
 */
class RequestDeduplicator {
    constructor() {
        this.pending = new Map();
    }

    async execute(key, apiCall) {
        // If there's already a pending request with this key, return its promise
        if (this.pending.has(key)) {
            return this.pending.get(key);
        }

        // Create and store the promise
        const promise = apiCall().finally(() => {
            this.pending.delete(key);
        });

        this.pending.set(key, promise);
        return promise;
    }
}

export const requestDeduplicator = new RequestDeduplicator();

/**
 * Rate limiter for API calls
 */
class RateLimiter {
    constructor(maxRequests = 10, windowMs = 1000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    async acquire() {
        const now = Date.now();

        // Remove old requests outside the window
        this.requests = this.requests.filter(time => now - time < this.windowMs);

        if (this.requests.length >= this.maxRequests) {
            // Wait until the oldest request expires
            const oldestRequest = this.requests[0];
            const waitTime = this.windowMs - (now - oldestRequest);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            return this.acquire();
        }

        this.requests.push(now);
        return true;
    }

    async execute(apiCall) {
        await this.acquire();
        return apiCall();
    }
}

// Global rate limiter (10 requests per second)
export const rateLimiter = new RateLimiter(10, 1000);
