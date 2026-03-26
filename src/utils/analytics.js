/**
 * Analytics Tracking Service
 *
 * Supports:
 * - Google Analytics 4
 * - Custom backend endpoint
 *
 * Setup:
 * 1. Add GA4 script to index.html (or use GTM)
 * 2. Set VITE_GA_TRACKING_ID in .env.production
 */

/**
 * Analytics configuration
 */
const config = {
    enabled: false,
    debug: import.meta.env.DEV,
    ga4TrackingId: import.meta.env.VITE_GA_TRACKING_ID || '',
    customEndpoint: import.meta.env.VITE_ANALYTICS_ENDPOINT || '',
};

/**
 * User context
 */
let userContext = {
    userId: null,
    email: null,
    role: null,
    properties: {},
};

/**
 * Check if GA4 is available
 */
function hasGA4() {
    return typeof window !== 'undefined' && typeof window.gtag === 'function';
}

/**
 * Initialize analytics
 * Call this once when the app starts
 *
 * @param {Object} options - Configuration options
 */
export function initAnalytics(options = {}) {
    Object.assign(config, options);

    // Auto-detect GA4
    if (config.ga4TrackingId && !hasGA4()) {
        loadGA4Script(config.ga4TrackingId);
    }

    config.enabled = config.enabled || hasGA4() || !!config.customEndpoint;

    if (config.debug) {
        console.log('[Analytics] Initialized:', {
            enabled: config.enabled,
            ga4: hasGA4() ? 'active' : 'not loaded',
            trackingId: config.ga4TrackingId ? '***configured***' : 'not set',
        });
    }
}

/**
 * Load GA4 script dynamically
 */
function loadGA4Script(trackingId) {
    if (typeof window === 'undefined') return;

    // Create script element
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${trackingId}`;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
        window.dataLayer.push(arguments);
    };
    window.gtag('js', new Date());
    window.gtag('config', trackingId, {
        send_page_view: false, // We'll handle page views manually
    });
}

/**
 * Identify user
 * Call this after user logs in
 *
 * @param {string} userId - User ID
 * @param {Object} traits - User traits (email, role, etc.)
 */
export function identify(userId, traits = {}) {
    userContext = {
        userId,
        ...traits,
        properties: { ...userContext.properties, ...traits },
    };

    if (config.debug) {
        console.log('[Analytics] Identify:', userId, traits);
    }

    // Set user properties in GA4
    if (hasGA4()) {
        window.gtag('set', 'user_properties', {
            user_id: userId,
            user_role: traits.role,
        });
        window.gtag('set', { user_id: userId });
    }
}

/**
 * Clear user context (on logout)
 */
export function reset() {
    userContext = {
        userId: null,
        email: null,
        role: null,
        properties: {},
    };

    if (config.debug) {
        console.log('[Analytics] Reset user context');
    }

    // Clear user in GA4
    if (hasGA4()) {
        window.gtag('set', { user_id: null });
    }
}

/**
 * Track a page view
 *
 * @param {string} pageName - Name of the page
 * @param {Object} properties - Additional properties
 */
export function pageView(pageName, properties = {}) {
    if (!config.enabled && !config.debug) return;

    const data = {
        page_title: pageName,
        page_location: window.location.href,
        page_path: window.location.pathname,
        ...properties,
    };

    if (config.debug) {
        console.log('[Analytics] Page View:', data);
    }

    // Send to GA4
    if (hasGA4()) {
        window.gtag('event', 'page_view', data);
    }

    // Send to custom endpoint
    sendToEndpoint('page_view', data);
}

/**
 * Track an event
 *
 * @param {string} eventName - Name of the event
 * @param {Object} properties - Event properties
 */
export function track(eventName, properties = {}) {
    if (!config.enabled && !config.debug) return;

    const data = {
        ...properties,
        timestamp: Date.now(),
        user_id: userContext.userId,
    };

    if (config.debug) {
        console.log('[Analytics] Track:', eventName, data);
    }

    // Send to GA4
    if (hasGA4()) {
        window.gtag('event', eventName, data);
    }

    // Send to custom endpoint
    sendToEndpoint(eventName, data);
}

/**
 * Send data to custom analytics endpoint
 */
function sendToEndpoint(eventName, data) {
    if (!config.customEndpoint) return;

    try {
        const payload = {
            event: eventName,
            data,
            user: userContext.userId,
            timestamp: Date.now(),
            url: window.location.href,
        };

        // Use sendBeacon for better reliability
        if (navigator.sendBeacon) {
            navigator.sendBeacon(
                config.customEndpoint,
                JSON.stringify(payload)
            );
        } else {
            fetch(config.customEndpoint, {
                method: 'POST',
                body: JSON.stringify(payload),
                headers: { 'Content-Type': 'application/json' },
                keepalive: true,
            }).catch(() => {});
        }
    } catch {
        // Silently fail
    }
}

/**
 * Track form submission
 */
export function trackFormSubmit(formName, doctype, isNew = false) {
    track('form_submit', {
        form_name: formName,
        doctype,
        action: isNew ? 'create' : 'update',
    });
}

/**
 * Track form error
 */
export function trackFormError(formName, errorType, errorMessage) {
    track('form_error', {
        form_name: formName,
        error_type: errorType,
        error_message: errorMessage?.slice(0, 100),
    });
}

/**
 * Track search
 */
export function trackSearch(query, resultCount, doctype = null) {
    track('search', {
        search_term: query,
        result_count: resultCount,
        doctype,
    });
}

/**
 * Track navigation
 */
export function trackNavigation(from, to) {
    track('navigation', {
        from_path: from,
        to_path: to,
    });
}

/**
 * Track feature usage
 */
export function trackFeature(featureName, action = 'used') {
    track('feature_usage', {
        feature: featureName,
        action,
    });
}

/**
 * Track error
 */
export function trackError(error, context = {}) {
    track('exception', {
        description: error.message || String(error),
        fatal: false,
        ...context,
    });
}

/**
 * Track timing/performance
 */
export function trackTiming(category, variable, duration) {
    track('timing_complete', {
        name: variable,
        value: Math.round(duration),
        event_category: category,
    });
}

/**
 * Track user engagement
 */
export function trackEngagement(engagementType, details = {}) {
    track('user_engagement', {
        engagement_type: engagementType,
        ...details,
    });
}

/**
 * Track conversion events
 */
export function trackConversion(conversionName, value = 0, currency = 'USD') {
    track('conversion', {
        conversion_name: conversionName,
        value,
        currency,
    });
}

/**
 * Export all methods as default object
 */
export default {
    init: initAnalytics,
    identify,
    reset,
    pageView,
    track,
    trackFormSubmit,
    trackFormError,
    trackSearch,
    trackNavigation,
    trackFeature,
    trackError,
    trackTiming,
    trackEngagement,
    trackConversion,
};
