import { describe, it, expect } from 'vitest';
import {
    ApiError,
    ValidationError,
    PermissionError,
    ErrorCodes,
    isApiError,
    getErrorMessage,
} from './errors';

describe('ApiError', () => {
    it('creates error with default values', () => {
        const error = new ApiError('Test error');
        expect(error.message).toBe('Test error');
        expect(error.code).toBe(ErrorCodes.UNKNOWN);
        expect(error.httpStatus).toBeNull();
        expect(error.details).toBeNull();
        expect(error.isApiError).toBe(true);
        expect(error.timestamp).toBeDefined();
    });

    it('creates error with custom values', () => {
        const error = new ApiError('Not found', ErrorCodes.NOT_FOUND, 404, { id: 123 });
        expect(error.message).toBe('Not found');
        expect(error.code).toBe(ErrorCodes.NOT_FOUND);
        expect(error.httpStatus).toBe(404);
        expect(error.details).toEqual({ id: 123 });
    });

    describe('fromResponse', () => {
        it('creates error from 401 response', () => {
            const error = ApiError.fromResponse({ status: 401 });
            expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
            expect(error.httpStatus).toBe(401);
        });

        it('creates error from 403 response', () => {
            const error = ApiError.fromResponse({ status: 403 });
            expect(error.code).toBe(ErrorCodes.PERMISSION_DENIED);
            expect(error.httpStatus).toBe(403);
        });

        it('creates error from 404 response', () => {
            const error = ApiError.fromResponse({ status: 404 });
            expect(error.code).toBe(ErrorCodes.NOT_FOUND);
            expect(error.httpStatus).toBe(404);
        });

        it('extracts message from Frappe server messages', () => {
            const serverMessages = JSON.stringify([
                JSON.stringify({ message: 'Custom error message' }),
            ]);
            const error = ApiError.fromResponse({ status: 400 }, {
                _server_messages: serverMessages,
            });
            expect(error.message).toBe('Custom error message');
        });

        it('extracts message from details.message', () => {
            const error = ApiError.fromResponse({ status: 400 }, {
                message: 'Error from message field',
            });
            expect(error.message).toBe('Error from message field');
        });
    });

    describe('is', () => {
        it('returns true for matching code', () => {
            const error = new ApiError('Test', ErrorCodes.NOT_FOUND);
            expect(error.is(ErrorCodes.NOT_FOUND)).toBe(true);
        });

        it('returns false for non-matching code', () => {
            const error = new ApiError('Test', ErrorCodes.NOT_FOUND);
            expect(error.is(ErrorCodes.PERMISSION_DENIED)).toBe(false);
        });
    });

    describe('isPermissionError', () => {
        it('returns true for PERMISSION_DENIED', () => {
            const error = new ApiError('Test', ErrorCodes.PERMISSION_DENIED);
            expect(error.isPermissionError()).toBe(true);
        });

        it('returns true for UNAUTHORIZED', () => {
            const error = new ApiError('Test', ErrorCodes.UNAUTHORIZED);
            expect(error.isPermissionError()).toBe(true);
        });

        it('returns true for SESSION_EXPIRED', () => {
            const error = new ApiError('Test', ErrorCodes.SESSION_EXPIRED);
            expect(error.isPermissionError()).toBe(true);
        });

        it('returns false for other codes', () => {
            const error = new ApiError('Test', ErrorCodes.NOT_FOUND);
            expect(error.isPermissionError()).toBe(false);
        });
    });

    describe('isRetryable', () => {
        it('returns true for NETWORK_ERROR', () => {
            const error = new ApiError('Test', ErrorCodes.NETWORK_ERROR);
            expect(error.isRetryable()).toBe(true);
        });

        it('returns true for TIMEOUT', () => {
            const error = new ApiError('Test', ErrorCodes.TIMEOUT);
            expect(error.isRetryable()).toBe(true);
        });

        it('returns true for SERVER_ERROR', () => {
            const error = new ApiError('Test', ErrorCodes.SERVER_ERROR);
            expect(error.isRetryable()).toBe(true);
        });

        it('returns false for PERMISSION_DENIED', () => {
            const error = new ApiError('Test', ErrorCodes.PERMISSION_DENIED);
            expect(error.isRetryable()).toBe(false);
        });
    });

    describe('toJSON', () => {
        it('serializes error to JSON', () => {
            const error = new ApiError('Test', ErrorCodes.NOT_FOUND, 404, { id: 1 });
            const json = error.toJSON();
            expect(json).toEqual({
                name: 'ApiError',
                message: 'Test',
                code: ErrorCodes.NOT_FOUND,
                httpStatus: 404,
                timestamp: error.timestamp,
                details: { id: 1 },
            });
        });
    });
});

describe('ValidationError', () => {
    it('creates validation error with field errors', () => {
        const error = new ValidationError('Validation failed', {
            email: 'Invalid email format',
            name: 'Name is required',
        });
        expect(error.code).toBe(ErrorCodes.VALIDATION_ERROR);
        expect(error.httpStatus).toBe(400);
        expect(error.fieldErrors).toEqual({
            email: 'Invalid email format',
            name: 'Name is required',
        });
    });

    it('getFieldError returns error for specific field', () => {
        const error = new ValidationError('Failed', { email: 'Invalid' });
        expect(error.getFieldError('email')).toBe('Invalid');
        expect(error.getFieldError('name')).toBeNull();
    });

    it('hasFieldErrors returns true when errors exist', () => {
        const error = new ValidationError('Failed', { email: 'Invalid' });
        expect(error.hasFieldErrors()).toBe(true);
    });

    it('hasFieldErrors returns false when no errors', () => {
        const error = new ValidationError('Failed', {});
        expect(error.hasFieldErrors()).toBe(false);
    });
});

describe('PermissionError', () => {
    it('creates permission error with defaults', () => {
        const error = new PermissionError();
        expect(error.message).toBe('error.permission_denied');
        expect(error.code).toBe(ErrorCodes.PERMISSION_DENIED);
        expect(error.httpStatus).toBe(403);
    });

    it('creates permission error with custom message and resource', () => {
        const error = new PermissionError('No access to Sales', 'Sales Order');
        expect(error.message).toBe('No access to Sales');
        expect(error.resource).toBe('Sales Order');
    });
});

describe('isApiError', () => {
    it('returns true for ApiError instance', () => {
        const error = new ApiError('Test');
        expect(isApiError(error)).toBe(true);
    });

    it('returns true for ValidationError instance', () => {
        const error = new ValidationError('Test');
        expect(isApiError(error)).toBe(true);
    });

    it('returns true for PermissionError instance', () => {
        const error = new PermissionError();
        expect(isApiError(error)).toBe(true);
    });

    it('returns true for object with isApiError flag', () => {
        const error = { message: 'Test', isApiError: true };
        expect(isApiError(error)).toBe(true);
    });

    it('returns false for regular Error', () => {
        const error = new Error('Test');
        expect(isApiError(error)).toBe(false);
    });

    it('returns false for null/undefined', () => {
        expect(isApiError(null)).toBe(false);
        expect(isApiError(undefined)).toBe(false);
    });
});

describe('getErrorMessage', () => {
    it('returns message from ApiError', () => {
        const error = new ApiError('API error message');
        expect(getErrorMessage(error)).toBe('API error message');
    });

    it('returns string error directly', () => {
        expect(getErrorMessage('String error')).toBe('String error');
    });

    it('returns message from Error object', () => {
        const error = new Error('Regular error');
        expect(getErrorMessage(error)).toBe('Regular error');
    });

    it('returns default message for null', () => {
        expect(getErrorMessage(null)).toBe('error.unknown');
    });

    it('returns default message for object without message', () => {
        expect(getErrorMessage({})).toBe('error.generic');
    });
});
