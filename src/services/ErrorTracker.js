/**
 * Error Tracking Service
 *
 * Centralized error tracking that can be connected to external services
 * like Sentry, Rollbar, or custom backends.
 *
 * Usage:
 * import ErrorTracker from '@/services/ErrorTracker';
 * ErrorTracker.captureError(error, { context: 'MyComponent' });
 */

class ErrorTrackerService {
    constructor() {
        this.isInitialized = false;
        this.sentry = null;
        this.config = {
            enabled: true,
            environment: import.meta.env.MODE || 'development',
            sampleRate: 1.0,
            sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
        };
        this.breadcrumbs = [];
        this.maxBreadcrumbs = 50;
    }

    /**
     * Initialize the error tracker
     * Call this once when the app starts
     */
    async init(options = {}) {
        this.config = { ...this.config, ...options };
        this.isInitialized = true;

        // Initialize Sentry if DSN is provided
        if (this.config.sentryDsn && import.meta.env.PROD) {
            await this.initSentry();
        }

        // Set up global error handlers
        this.setupGlobalHandlers();

        if (import.meta.env.DEV) {
            console.log('[ErrorTracker] Initialized', {
                ...this.config,
                sentryDsn: this.config.sentryDsn ? '***configured***' : 'not configured',
            });
        }
    }

    /**
     * Initialize Sentry SDK (lazy loaded)
     */
    async initSentry() {
        try {
            // Dynamic import to avoid loading Sentry in dev
            const Sentry = await import('@sentry/browser');

            Sentry.init({
                dsn: this.config.sentryDsn,
                environment: this.config.environment,
                sampleRate: this.config.sampleRate,
                integrations: [
                    Sentry.browserTracingIntegration(),
                ],
                tracesSampleRate: 0.1, // 10% of transactions
            });

            this.sentry = Sentry;
            console.log('[ErrorTracker] Sentry initialized');
        } catch (error) {
            // Sentry not installed, continue without it
            console.warn('[ErrorTracker] Sentry not available:', error.message);
        }
    }

    /**
     * Set up global error handlers
     */
    setupGlobalHandlers() {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.captureError(event.reason, {
                type: 'unhandledrejection',
                handled: false,
            });
        });

        // Catch global errors
        window.addEventListener('error', (event) => {
            this.captureError(event.error || event.message, {
                type: 'uncaught',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
            });
        });
    }

    /**
     * Add a breadcrumb for debugging context
     */
    addBreadcrumb(category, message, data = {}) {
        const breadcrumb = {
            timestamp: Date.now(),
            category,
            message,
            data,
        };

        this.breadcrumbs.push(breadcrumb);

        // Keep only the last N breadcrumbs
        if (this.breadcrumbs.length > this.maxBreadcrumbs) {
            this.breadcrumbs.shift();
        }
    }

    /**
     * Capture and report an error
     */
    captureError(error, context = {}) {
        if (!this.config.enabled) return;

        // Sample rate check
        if (Math.random() > this.config.sampleRate) return;

        const errorData = this.formatError(error, context);

        // Log in development
        if (import.meta.env.DEV) {
            console.group('[ErrorTracker] Captured Error');
            console.error('Error:', error);
            console.log('Context:', context);
            console.log('Breadcrumbs:', this.breadcrumbs.slice(-10));
            console.groupEnd();
        }

        // In production, send to error tracking service
        if (import.meta.env.PROD) {
            this.sendToService(errorData);
        }

        return errorData;
    }

    /**
     * Capture a message (non-error event)
     */
    captureMessage(message, level = 'info', context = {}) {
        if (!this.config.enabled) return;

        const messageData = {
            message,
            level,
            context,
            timestamp: Date.now(),
            environment: this.config.environment,
            breadcrumbs: this.breadcrumbs.slice(-10),
        };

        if (import.meta.env.DEV) {
            console.log(`[ErrorTracker] ${level.toUpperCase()}:`, message, context);
        }

        if (import.meta.env.PROD) {
            this.sendToService(messageData);
        }
    }

    /**
     * Set user context for error reports
     */
    setUser(user) {
        this.user = user;
        this.addBreadcrumb('user', 'User context set', { user: user?.email });

        // Set user in Sentry
        if (this.sentry && user) {
            this.sentry.setUser({
                id: user.userId || user.email,
                email: user.email,
                username: user.username || user.full_name,
            });
        }
    }

    /**
     * Clear user context (on logout)
     */
    clearUser() {
        this.user = null;
        this.addBreadcrumb('user', 'User context cleared');

        // Clear user in Sentry
        if (this.sentry) {
            this.sentry.setUser(null);
        }
    }

    /**
     * Format error for reporting
     */
    formatError(error, context) {
        const isApiError = error?.isApiError === true;

        return {
            // Error info
            name: error?.name || 'Error',
            message: error?.message || String(error),
            stack: error?.stack,
            code: isApiError ? error.code : undefined,
            httpStatus: isApiError ? error.httpStatus : undefined,

            // Context
            context,
            user: this.user,
            url: window.location.href,
            userAgent: navigator.userAgent,

            // Debugging info
            timestamp: Date.now(),
            environment: this.config.environment,
            breadcrumbs: this.breadcrumbs.slice(-10),
        };
    }

    /**
     * Send error to external service
     */
    sendToService(data) {
        // Send to Sentry if available
        if (this.sentry) {
            try {
                if (data.stack) {
                    // It's an error
                    this.sentry.captureException(new Error(data.message), {
                        extra: {
                            context: data.context,
                            breadcrumbs: data.breadcrumbs,
                            url: data.url,
                        },
                        user: data.user ? { email: data.user.email, id: data.user.userId } : undefined,
                        tags: {
                            errorCode: data.code,
                            httpStatus: data.httpStatus,
                        },
                    });
                } else {
                    // It's a message
                    this.sentry.captureMessage(data.message, {
                        level: data.level || 'info',
                        extra: data.context,
                    });
                }
            } catch (sentryError) {
                console.warn('[ErrorTracker] Sentry capture failed:', sentryError);
            }
        }

        // Also store locally for debugging
        try {
            const errors = JSON.parse(localStorage.getItem('_error_log') || '[]');
            errors.push({ ...data, id: Date.now() });
            // Keep only last 20 errors
            if (errors.length > 20) errors.shift();
            localStorage.setItem('_error_log', JSON.stringify(errors));
        } catch {
            // Ignore storage errors
        }
    }

    /**
     * Get stored errors (for debugging)
     */
    getStoredErrors() {
        try {
            return JSON.parse(localStorage.getItem('_error_log') || '[]');
        } catch {
            return [];
        }
    }

    /**
     * Clear stored errors
     */
    clearStoredErrors() {
        localStorage.removeItem('_error_log');
    }
}

// Export singleton instance
const ErrorTracker = new ErrorTrackerService();
export default ErrorTracker;

// Named exports for convenience
export const captureError = (error, context) => ErrorTracker.captureError(error, context);
export const captureMessage = (message, level, context) => ErrorTracker.captureMessage(message, level, context);
export const addBreadcrumb = (category, message, data) => ErrorTracker.addBreadcrumb(category, message, data);
