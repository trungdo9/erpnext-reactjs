/**
 * Environment Configuration
 * Centralized access to environment variables with defaults
 */

export const env = {
    // API Configuration
    frappeUrl: import.meta.env.VITE_FRAPPE_URL || '',
    apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT || '30000', 10),
    apiRetryCount: parseInt(import.meta.env.VITE_API_RETRY_COUNT || '3', 10),

    // App Settings
    appName: import.meta.env.VITE_APP_NAME || 'Phần mềm quản lý nội bộ',
    appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',

    // Feature Flags
    enablePwa: import.meta.env.VITE_ENABLE_PWA === 'true',
    enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
    enableErrorTracking: import.meta.env.VITE_ENABLE_ERROR_TRACKING !== 'false',

    // Analytics
    gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID || '',
    mixpanelToken: import.meta.env.VITE_MIXPANEL_TOKEN || '',

    // Error Tracking
    sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',

    // Environment Info
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
    mode: import.meta.env.MODE,
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(featureName) {
    const features = {
        pwa: env.enablePwa,
        analytics: env.enableAnalytics,
        errorTracking: env.enableErrorTracking,
    };
    return features[featureName] ?? false;
}

/**
 * Get API base URL
 */
export function getApiBaseUrl() {
    return env.frappeUrl || window.location.origin;
}

/**
 * Log environment info (dev only)
 */
export function logEnvInfo() {
    if (env.isDev) {
        console.group('[Environment]');
        console.log('Mode:', env.mode);
        console.log('App:', env.appName, 'v' + env.appVersion);
        console.log('API URL:', env.frappeUrl || '(relative)');
        console.log('Features:', {
            PWA: env.enablePwa,
            Analytics: env.enableAnalytics,
            ErrorTracking: env.enableErrorTracking,
        });
        console.groupEnd();
    }
}

export default env;
