/**
 * Error Handler Utilities
 *
 * Central place for transforming, logging, and handling errors
 */

import { ApiError, ErrorCodes, isApiError, getErrorMessage } from './errors';
import ErrorTracker from '../services/ErrorTracker';

/**
 * Transform any error into a standardized ApiError
 *
 * @param {Error|Object} error - Raw error from API or network
 * @param {Object} context - Additional context for logging
 * @returns {ApiError}
 */
export function handleApiError(error, context = {}) {
    // Already an ApiError, just add context
    if (isApiError(error)) {
        error.context = { ...error.context, ...context };
        logError(error, context);
        return error;
    }

    let apiError;

    // Frappe SDK error format
    if (error.httpStatus || error.response?.status) {
        const status = error.httpStatus || error.response?.status;
        const data = error.response?.data || error;

        apiError = ApiError.fromResponse({ status }, data);
    }
    // Fetch Response object
    else if (error instanceof Response) {
        apiError = ApiError.fromResponse(error);
    }
    // Network errors
    else if (error.name === 'TypeError' && error.message.includes('fetch')) {
        apiError = ApiError.fromNetworkError(error);
    }
    // Axios-style errors
    else if (error.response) {
        apiError = ApiError.fromResponse(
            error.response,
            error.response.data
        );
    }
    // Generic Error object
    else if (error instanceof Error) {
        apiError = new ApiError(
            error.message || 'error.generic',
            ErrorCodes.UNKNOWN,
            null,
            { originalError: error.name }
        );
    }
    // Unknown error format
    else {
        apiError = new ApiError(
            typeof error === 'string' ? error : 'error.unknown',
            ErrorCodes.UNKNOWN,
            null,
            error
        );
    }

    apiError.context = context;
    logError(apiError, context);

    return apiError;
}

/**
 * Log error with context and send to error tracking service
 */
function logError(error, context) {
    // Development: detailed console logging
    if (import.meta.env.DEV) {
        console.group(`🔴 API Error: ${error.code}`);
        console.error('Message:', error.message);
        console.error('HTTP Status:', error.httpStatus);
        console.error('Context:', context);
        if (error.details) {
            console.error('Details:', error.details);
        }
        console.groupEnd();
    }

    // Send to error tracking service (works in both dev and prod)
    ErrorTracker.captureError(error, {
        ...context,
        code: error.code,
        httpStatus: error.httpStatus,
    });
}

/**
 * Wrapper for async functions with automatic error handling
 *
 * @param {Function} fn - Async function to wrap
 * @param {Object} context - Error context
 * @returns {Function} Wrapped function that returns ApiError on failure
 *
 * @example
 * const safeGetDoc = withErrorHandler(
 *   (doctype, name) => db.getDoc(doctype, name),
 *   { operation: 'getDoc' }
 * );
 */
export function withErrorHandler(fn, context = {}) {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            throw handleApiError(error, { ...context, args });
        }
    };
}

/**
 * Try-catch wrapper that returns [error, result] tuple
 *
 * @example
 * const [error, data] = await tryCatch(() => getDoc('User', 'admin'));
 * if (error) {
 *   console.log(error.message);
 * }
 */
export async function tryCatch(fn) {
    try {
        const result = await fn();
        return [null, result];
    } catch (error) {
        return [handleApiError(error), null];
    }
}

/**
 * Retry wrapper for transient errors
 *
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} Result of successful call
 */
export async function withRetry(fn, options = {}) {
    const {
        maxRetries = 3,
        delay = 1000,
        backoff = 2,
        retryOn = (error) => error.isRetryable?.(),
    } = options;

    let lastError;
    let currentDelay = delay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = handleApiError(error, { attempt });

            if (attempt === maxRetries || !retryOn(lastError)) {
                throw lastError;
            }

            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, currentDelay));
            currentDelay *= backoff;
        }
    }

    throw lastError;
}

/**
 * Get localized error message for display to users
 *
 * @param {Error} error - Error object
 * @param {Function} t - Translation function (optional)
 * @returns {string} User-friendly message
 */
export function getUserMessage(error, t = null) {
    if (!isApiError(error)) {
        return getErrorMessage(error);
    }

    // Translation keys for each error code
    const messageKeys = {
        [ErrorCodes.PERMISSION_DENIED]: 'error.permission_denied',
        [ErrorCodes.UNAUTHORIZED]: 'error.unauthorized',
        [ErrorCodes.SESSION_EXPIRED]: 'error.session_expired',
        [ErrorCodes.NOT_FOUND]: 'error.not_found',
        [ErrorCodes.VALIDATION_ERROR]: 'error.validation',
        [ErrorCodes.NETWORK_ERROR]: 'error.network',
        [ErrorCodes.TIMEOUT]: 'error.timeout',
        [ErrorCodes.SERVER_ERROR]: 'error.server',
        [ErrorCodes.UNKNOWN]: 'error.unknown',
    };

    const key = messageKeys[error.code] || messageKeys[ErrorCodes.UNKNOWN];

    // Use translation if available
    if (t && typeof t === 'function') {
        const translated = t(key);
        if (translated !== key) {
            return translated;
        }
    }

    // Fallback to error message
    return error.message;
}

/**
 * Check if error requires user to re-login
 */
export function requiresReauth(error) {
    if (!isApiError(error)) return false;

    return error.is(ErrorCodes.UNAUTHORIZED) ||
        error.is(ErrorCodes.SESSION_EXPIRED);
}

/**
 * Check if error should show a toast notification
 */
export function shouldShowToast(error) {
    if (!isApiError(error)) return true;

    // Don't show toast for permission errors (handled by UI)
    // or for validation errors (shown inline)
    return ![
        ErrorCodes.PERMISSION_DENIED,
        ErrorCodes.VALIDATION_ERROR,
    ].includes(error.code);
}

export { getErrorMessage };
