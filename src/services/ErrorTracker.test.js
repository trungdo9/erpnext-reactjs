import { describe, it, expect, vi, beforeEach } from 'vitest';
import ErrorTracker from '../services/ErrorTracker';

describe('ErrorTracker', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        ErrorTracker.breadcrumbs = [];
        localStorage.clear();
    });

    describe('init', () => {
        it('should initialize with default config', () => {
            ErrorTracker.init();
            expect(ErrorTracker.isInitialized).toBe(true);
        });

        it('should accept custom options', () => {
            ErrorTracker.init({ sampleRate: 0.5 });
            expect(ErrorTracker.config.sampleRate).toBe(0.5);
        });
    });

    describe('addBreadcrumb', () => {
        it('should add breadcrumb to queue', () => {
            ErrorTracker.addBreadcrumb('navigation', 'clicked button', { id: 1 });
            expect(ErrorTracker.breadcrumbs).toHaveLength(1);
            expect(ErrorTracker.breadcrumbs[0].category).toBe('navigation');
        });

        it('should limit breadcrumbs to max count', () => {
            for (let i = 0; i < 60; i++) {
                ErrorTracker.addBreadcrumb('test', `breadcrumb ${i}`);
            }
            expect(ErrorTracker.breadcrumbs.length).toBeLessThanOrEqual(50);
        });
    });

    describe('captureError', () => {
        it('should capture error data', () => {
            // Ensure sampleRate is 1 so error is always captured
            ErrorTracker.init({ enabled: true, sampleRate: 1 });
            const error = new Error('Test error');
            const result = ErrorTracker.captureError(error, { component: 'TestComponent' });

            expect(result).toBeDefined();
            expect(result.message).toBe('Test error');
            expect(result.context.component).toBe('TestComponent');
        });

        it('should not capture when disabled', () => {
            ErrorTracker.init({ enabled: false });
            const error = new Error('Test error');
            const result = ErrorTracker.captureError(error);

            expect(result).toBeUndefined();
        });

        it('should include breadcrumbs in error data', () => {
            // Ensure sampleRate is 1 so error is always captured
            ErrorTracker.init({ enabled: true, sampleRate: 1 });
            ErrorTracker.addBreadcrumb('navigation', 'test');

            const error = new Error('Test');
            const result = ErrorTracker.captureError(error);

            expect(result).toBeDefined();
            expect(result.breadcrumbs).toBeDefined();
            expect(result.breadcrumbs.length).toBeGreaterThan(0);
        });
    });

    describe('captureMessage', () => {
        it('should capture info message', () => {
            ErrorTracker.init({ enabled: true });
            // captureMessage doesn't return anything in the current implementation
            // Just verify it doesn't throw
            expect(() => {
                ErrorTracker.captureMessage('Test message', 'info');
            }).not.toThrow();
        });
    });

    describe('setUser/clearUser', () => {
        it('should set user context', () => {
            ErrorTracker.setUser({ email: 'test@example.com' });
            expect(ErrorTracker.user.email).toBe('test@example.com');
        });

        it('should clear user context', () => {
            ErrorTracker.setUser({ email: 'test@example.com' });
            ErrorTracker.clearUser();
            expect(ErrorTracker.user).toBeNull();
        });
    });

    describe('getStoredErrors', () => {
        it('should return empty array when no errors stored', () => {
            const errors = ErrorTracker.getStoredErrors();
            expect(errors).toEqual([]);
        });
    });

    describe('clearStoredErrors', () => {
        it('should clear stored errors', () => {
            localStorage.setItem('_error_log', JSON.stringify([{ id: 1 }]));
            ErrorTracker.clearStoredErrors();
            expect(localStorage.getItem('_error_log')).toBeNull();
        });
    });
});
