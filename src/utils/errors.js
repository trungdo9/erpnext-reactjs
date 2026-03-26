/**
 * Standardized Error Classes for ERP Frontend
 *
 * Usage:
 * - ApiError: For all API-related errors
 * - ValidationError: For form/data validation errors
 * - PermissionError: For permission denied cases
 */

/**
 * Error codes - use these for programmatic error handling
 */
export const ErrorCodes = {
    // Permission errors
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    UNAUTHORIZED: 'UNAUTHORIZED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',

    // Resource errors
    NOT_FOUND: 'NOT_FOUND',
    ALREADY_EXISTS: 'ALREADY_EXISTS',
    CONFLICT: 'CONFLICT',

    // Validation errors
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    REQUIRED_FIELD: 'REQUIRED_FIELD',
    INVALID_FORMAT: 'INVALID_FORMAT',

    // Network errors
    NETWORK_ERROR: 'NETWORK_ERROR',
    TIMEOUT: 'TIMEOUT',
    SERVER_ERROR: 'SERVER_ERROR',

    // Business logic errors
    WORKFLOW_ERROR: 'WORKFLOW_ERROR',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
    LINK_EXISTS: 'LINK_EXISTS',

    // Generic
    UNKNOWN: 'UNKNOWN',
};

/**
 * HTTP Status to Error Code mapping
 */
const HTTP_STATUS_MAP = {
    400: ErrorCodes.VALIDATION_ERROR,
    401: ErrorCodes.UNAUTHORIZED,
    403: ErrorCodes.PERMISSION_DENIED,
    404: ErrorCodes.NOT_FOUND,
    408: ErrorCodes.TIMEOUT,
    409: ErrorCodes.CONFLICT,
    417: ErrorCodes.VALIDATION_ERROR, // Frappe uses 417 for validation
    500: ErrorCodes.SERVER_ERROR,
    502: ErrorCodes.SERVER_ERROR,
    503: ErrorCodes.SERVER_ERROR,
};

/**
 * Base API Error class
 */
export class ApiError extends Error {
    constructor(message, code = ErrorCodes.UNKNOWN, httpStatus = null, details = null) {
        super(message);
        this.name = 'ApiError';
        this.code = code;
        this.httpStatus = httpStatus;
        this.details = details;
        this.timestamp = Date.now();
        this.isApiError = true; // For instanceof checks across modules
    }

    /**
     * Create ApiError from HTTP response
     */
    static fromResponse(response, details = null) {
        const status = response?.status || 500;
        const code = HTTP_STATUS_MAP[status] || ErrorCodes.UNKNOWN;

        let message = 'error.generic';

        // Try to extract message from Frappe response
        if (details?._server_messages) {
            try {
                const serverMsgs = JSON.parse(details._server_messages);
                if (Array.isArray(serverMsgs) && serverMsgs.length > 0) {
                    const firstMsg = JSON.parse(serverMsgs[0]);
                    message = firstMsg.message || message;
                }
            } catch {
                // Ignore parse errors
            }
        } else if (details?.message) {
            message = details.message;
        } else if (details?.exc_type) {
            message = details.exc_type;
        }

        // Strip HTML tags from ERPNext error messages (e.g. <strong>Vi Tri.fieldname</strong>)
        message = message.replace(/<[^>]*>/g, '');

        return new ApiError(message, code, status, details);
    }

    /**
     * Create ApiError from network error
     */
    static fromNetworkError(error) {
        if (error.name === 'AbortError') {
            return new ApiError('error.request_cancelled', ErrorCodes.TIMEOUT, null, error);
        }

        if (!navigator.onLine) {
            return new ApiError('error.no_network', ErrorCodes.NETWORK_ERROR, null, error);
        }

        return new ApiError(
            'error.cannot_connect',
            ErrorCodes.NETWORK_ERROR,
            null,
            error
        );
    }

    /**
     * Check if error is a specific type
     */
    is(code) {
        return this.code === code;
    }

    /**
     * Check if error is permission related
     */
    isPermissionError() {
        return [
            ErrorCodes.PERMISSION_DENIED,
            ErrorCodes.UNAUTHORIZED,
            ErrorCodes.SESSION_EXPIRED
        ].includes(this.code);
    }

    /**
     * Check if error is retryable
     */
    isRetryable() {
        return [
            ErrorCodes.NETWORK_ERROR,
            ErrorCodes.TIMEOUT,
            ErrorCodes.SERVER_ERROR
        ].includes(this.code);
    }

    /**
     * Serialize for logging
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            httpStatus: this.httpStatus,
            timestamp: this.timestamp,
            details: this.details,
        };
    }
}

/**
 * Validation Error - for form validation failures
 */
export class ValidationError extends ApiError {
    constructor(message, fieldErrors = {}) {
        super(message, ErrorCodes.VALIDATION_ERROR, 400, fieldErrors);
        this.name = 'ValidationError';
        this.fieldErrors = fieldErrors;
    }

    /**
     * Get error for a specific field
     */
    getFieldError(fieldname) {
        return this.fieldErrors[fieldname] || null;
    }

    /**
     * Check if has any field errors
     */
    hasFieldErrors() {
        return Object.keys(this.fieldErrors).length > 0;
    }
}

/**
 * Permission Error - for access denied cases
 */
export class PermissionError extends ApiError {
    constructor(message = 'error.permission_denied', resource = null) {
        super(message, ErrorCodes.PERMISSION_DENIED, 403, { resource });
        this.name = 'PermissionError';
        this.resource = resource;
    }
}

/**
 * Check if an error is an ApiError instance
 */
export function isApiError(error) {
    return error?.isApiError === true || error instanceof ApiError;
}

/**
 * Utility to extract user-friendly message from any error
 */
export function getErrorMessage(error) {
    if (!error) return 'error.unknown';

    if (isApiError(error)) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error.message) {
        return error.message;
    }

    return 'error.generic';
}

/**
 * Parse Frappe server validation errors and extract field-level errors
 *
 * Frappe returns errors in various formats:
 * - _server_messages: JSON array of {message, indicator, ...}
 * - exc_type: "MandatoryError", "ValidationError", "LinkValidationError"
 * - Message patterns: "Value missing for fieldname: Label"
 *
 * @param {Error|Object} error - Error from API
 * @returns {{ message: string, fieldErrors: Object<string, string> }}
 */
export function parseServerErrors(error) {
    const result = {
        message: getErrorMessage(error),
        fieldErrors: {},
    };

    if (!error) return result;

    const details = error.details || error;

    // Parse _server_messages
    if (details._server_messages) {
        try {
            const serverMsgs = JSON.parse(details._server_messages);
            if (Array.isArray(serverMsgs)) {
                for (const msgStr of serverMsgs) {
                    try {
                        const msg = JSON.parse(msgStr);
                        const msgText = msg.message || msgStr;

                        // Extract field from message patterns
                        const fieldError = extractFieldFromMessage(msgText);
                        if (fieldError) {
                            result.fieldErrors[fieldError.field] = fieldError.message;
                        }
                    } catch {
                        // Try parsing as plain string
                        const fieldError = extractFieldFromMessage(msgStr);
                        if (fieldError) {
                            result.fieldErrors[fieldError.field] = fieldError.message;
                        }
                    }
                }
            }
        } catch {
            // Ignore parse errors
        }
    }

    // Parse exception message for field info
    if (details.message) {
        const fieldError = extractFieldFromMessage(details.message);
        if (fieldError && !result.fieldErrors[fieldError.field]) {
            result.fieldErrors[fieldError.field] = fieldError.message;
        }
    }

    // Handle exc_type for additional context
    if (details.exc_type === 'MandatoryError') {
        result.message = 'error.mandatory_fields';
    } else if (details.exc_type === 'LinkValidationError') {
        result.message = 'error.invalid_link';
    } else if (details.exc_type === 'DuplicateEntryError') {
        result.message = 'error.duplicate_entry';
    }

    return result;
}

/**
 * Extract field name from Frappe error message patterns
 *
 * Common patterns:
 * - "Value missing for fieldname: Label"
 * - "fieldname is required"
 * - "Value for fieldname cannot be negative"
 * - "Row #N: fieldname is required"
 * - "{label} is mandatory"
 *
 * @param {string} message - Error message
 * @returns {{ field: string, message: string } | null}
 */
function extractFieldFromMessage(message) {
    if (!message || typeof message !== 'string') return null;

    // Pattern: "Value missing for fieldname: Label"
    let match = message.match(/Value missing for (\w+):/i);
    if (match) {
        return { field: match[1], message: 'validation.required' };
    }

    // Pattern: "fieldname is required" or "fieldname is mandatory"
    match = message.match(/(\w+) is (?:required|mandatory)/i);
    if (match) {
        return { field: match[1].toLowerCase(), message: 'validation.required' };
    }

    // Pattern: "{label}: {fieldname} is mandatory"
    match = message.match(/:\s*(\w+) is mandatory/i);
    if (match) {
        return { field: match[1].toLowerCase(), message: 'validation.required' };
    }

    // Pattern: "Row #N: fieldname is required"
    match = message.match(/Row #\d+:\s*(\w+) is (?:required|mandatory)/i);
    if (match) {
        return { field: match[1].toLowerCase(), message };
    }

    // Pattern: "Value for fieldname cannot be..."
    match = message.match(/Value for (\w+) cannot/i);
    if (match) {
        return { field: match[1], message };
    }

    // Pattern: "{fieldname}: ..."
    match = message.match(/^(\w+):\s+(.+)/);
    if (match && match[1].length < 30) {
        return { field: match[1].toLowerCase(), message: match[2] };
    }

    return null;
}
