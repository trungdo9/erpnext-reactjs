/**
 * API Client
 *
 * Low-level HTTP client that wraps Frappe SDK.
 * Provides:
 * - Unified error handling
 * - Request/response interceptors
 * - Retry logic
 * - Timeout handling
 * - Request deduplication
 */

import { db, call, auth } from '../frappeClient';
import { handleApiError } from '../../utils/errorHandler';

// Lazy import to avoid circular dependency (index.js imports client.js)
let _gatewayConfig = null;
function getGatewayConfig() {
    if (!_gatewayConfig) {
         
        _gatewayConfig = {
            timeout: 30000,
            retry: {
                maxAttempts: 3,
                backoffMs: 1000,
                retryableStatuses: [408, 429, 500, 502, 503, 504],
            },
        };
    }
    return _gatewayConfig;
}

/** Update config after gateway initializes (called from index.js) */
export function setGatewayConfig(config) {
    _gatewayConfig = config;
}

/**
 * Request states for deduplication
 */
const pendingRequests = new Map();

/**
 * Generate a unique key for request deduplication
 */
function getRequestKey(method, endpoint, params) {
    return `${method}:${endpoint}:${JSON.stringify(params)}`;
}

/**
 * Sleep utility for retry backoff
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * API Client class
 */
export class ApiClient {
    constructor() {
        this.interceptors = {
            request: [],
            response: [],
            error: [],
        };
    }

    /**
     * Add request interceptor
     */
    onRequest(fn) {
        this.interceptors.request.push(fn);
        return () => {
            const idx = this.interceptors.request.indexOf(fn);
            if (idx > -1) this.interceptors.request.splice(idx, 1);
        };
    }

    /**
     * Add response interceptor
     */
    onResponse(fn) {
        this.interceptors.response.push(fn);
        return () => {
            const idx = this.interceptors.response.indexOf(fn);
            if (idx > -1) this.interceptors.response.splice(idx, 1);
        };
    }

    /**
     * Add error interceptor
     */
    onError(fn) {
        this.interceptors.error.push(fn);
        return () => {
            const idx = this.interceptors.error.indexOf(fn);
            if (idx > -1) this.interceptors.error.splice(idx, 1);
        };
    }

    /**
     * Run request through interceptors
     */
    async runRequestInterceptors(config) {
        let result = config;
        for (const interceptor of this.interceptors.request) {
            result = await interceptor(result);
        }
        return result;
    }

    /**
     * Run response through interceptors
     */
    async runResponseInterceptors(response) {
        let result = response;
        for (const interceptor of this.interceptors.response) {
            result = await interceptor(result);
        }
        return result;
    }

    /**
     * Run error through interceptors
     */
    async runErrorInterceptors(error) {
        let result = error;
        for (const interceptor of this.interceptors.error) {
            result = await interceptor(result);
        }
        return result;
    }

    /**
     * Execute a function with a timeout using AbortController
     */
    async executeWithTimeout(fn) {
        const timeout = getGatewayConfig().timeout;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const result = await Promise.race([
                fn(controller.signal),
                new Promise((_, reject) => {
                    controller.signal.addEventListener('abort', () => {
                        reject(new Error(`Request timed out after ${timeout}ms`));
                    });
                }),
            ]);
            return result;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Execute request with retry logic
     */
    async executeWithRetry(fn, context, attempt = 1) {
        try {
            return await this.executeWithTimeout(fn);
        } catch (error) {
            const apiError = handleApiError(error, context);
            const { maxAttempts, backoffMs, retryableStatuses } = getGatewayConfig().retry;

            // Check if we should retry
            if (
                attempt < maxAttempts &&
                retryableStatuses.includes(apiError.httpStatus)
            ) {
                await sleep(backoffMs * attempt * (0.5 + Math.random() * 0.5));
                return this.executeWithRetry(fn, context, attempt + 1);
            }

            // Run error interceptors
            await this.runErrorInterceptors(apiError);
            throw apiError;
        }
    }

    /**
     * Deduplicate concurrent identical requests
     */
    async deduplicatedRequest(key, fn) {
        // Check if same request is pending
        if (pendingRequests.has(key)) {
            return pendingRequests.get(key);
        }

        // Create new request promise
        const promise = fn().finally(() => {
            pendingRequests.delete(key);
        });

        pendingRequests.set(key, promise);
        return promise;
    }

    // =========================================================================
    // Document Operations
    // =========================================================================

    /**
     * Get list of documents
     */
    async getList(doctype, params = {}) {
        const key = getRequestKey('GET_LIST', doctype, params);

        return this.deduplicatedRequest(key, () =>
            this.executeWithRetry(
                () => db.getDocList(doctype, params),
                { operation: 'getList', doctype, params }
            )
        );
    }

    /**
     * Get single document
     */
    async getDoc(doctype, name) {
        const key = getRequestKey('GET_DOC', doctype, name);

        return this.deduplicatedRequest(key, () =>
            this.executeWithRetry(
                () => db.getDoc(doctype, name),
                { operation: 'getDoc', doctype, name }
            )
        );
    }

    /**
     * Create document
     */
    async createDoc(doctype, data) {
        const transformedData = await this.runRequestInterceptors({
            type: 'create',
            doctype,
            data,
        });

        const result = await this.executeWithRetry(
            () => db.createDoc(doctype, transformedData.data),
            { operation: 'createDoc', doctype }
        );

        return this.runResponseInterceptors(result);
    }

    /**
     * Update document
     */
    async updateDoc(doctype, name, data) {
        const transformedData = await this.runRequestInterceptors({
            type: 'update',
            doctype,
            name,
            data,
        });

        const result = await this.executeWithRetry(
            () => db.updateDoc(doctype, name, transformedData.data),
            { operation: 'updateDoc', doctype, name }
        );

        return this.runResponseInterceptors(result);
    }

    /**
     * Delete document
     */
    async deleteDoc(doctype, name) {
        return this.executeWithRetry(
            () => call.post('frappe.client.delete', { doctype, name }),
            { operation: 'deleteDoc', doctype, name }
        );
    }

    // =========================================================================
    // Method Calls
    // =========================================================================

    /**
     * Call a whitelisted method (GET)
     */
    async get(method, args = {}) {
        const key = getRequestKey('GET', method, args);

        return this.deduplicatedRequest(key, () =>
            this.executeWithRetry(
                () => call.get(method, args),
                { operation: 'get', method }
            )
        );
    }

    /**
     * Call a whitelisted method (POST)
     */
    async post(method, args = {}) {
        // If offline and a queue is attached, enqueue the mutation for later
        if (!navigator.onLine && this._queue) {
            return this._queue.enqueue({ method: 'POST', endpoint: method, data: args });
        }

        const result = await this.executeWithRetry(
            () => call.post(method, args),
            { operation: 'post', method }
        );

        return this.runResponseInterceptors(result);
    }

    /**
     * Attach a RequestQueue instance for offline support
     */
    setQueue(queue) {
        this._queue = queue;
    }

    // =========================================================================
    // Auth Operations
    // =========================================================================

    /**
     * Get current user
     */
    async getCurrentUser() {
        return auth.getLoggedInUser();
    }

    /**
     * Login
     */
    async login(username, password) {
        return auth.loginWithUsernamePassword({ username, password });
    }

    /**
     * Logout
     */
    async logout() {
        return auth.logout();
    }
}

export default ApiClient;
