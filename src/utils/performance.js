/**
 * Performance Monitoring Utilities
 * Track Web Vitals and custom metrics
 */

/**
 * Web Vitals metrics
 */
const metrics = {
    FCP: null,  // First Contentful Paint
    LCP: null,  // Largest Contentful Paint
    FID: null,  // First Input Delay
    CLS: null,  // Cumulative Layout Shift
    TTFB: null, // Time to First Byte
    INP: null,  // Interaction to Next Paint
};

/**
 * Performance observer for Web Vitals
 */

/**
 * Initialize performance monitoring
 */
export function initPerformanceMonitoring() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        return;
    }

    // Track LCP (Largest Contentful Paint)
    try {
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            metrics.LCP = lastEntry.startTime;
            reportMetric('LCP', lastEntry.startTime);
        });
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch {
        // LCP not supported
    }

    // Track FID (First Input Delay)
    try {
        const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (!metrics.FID) {
                    metrics.FID = entry.processingStart - entry.startTime;
                    reportMetric('FID', metrics.FID);
                }
            });
        });
        fidObserver.observe({ type: 'first-input', buffered: true });
    } catch {
        // FID not supported
    }

    // Track CLS (Cumulative Layout Shift)
    try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                    metrics.CLS = clsValue;
                }
            }
        });
        clsObserver.observe({ type: 'layout-shift', buffered: true });

        // Report CLS when page is hidden
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && metrics.CLS !== null) {
                reportMetric('CLS', metrics.CLS);
            }
        });
    } catch {
        // CLS not supported
    }

    // Track FCP (First Contentful Paint)
    try {
        const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry) => {
                if (entry.name === 'first-contentful-paint') {
                    metrics.FCP = entry.startTime;
                    reportMetric('FCP', entry.startTime);
                }
            });
        });
        fcpObserver.observe({ type: 'paint', buffered: true });
    } catch {
        // FCP not supported
    }

    // Track TTFB (Time to First Byte)
    try {
        const navEntry = performance.getEntriesByType('navigation')[0];
        if (navEntry) {
            metrics.TTFB = navEntry.responseStart;
            reportMetric('TTFB', navEntry.responseStart);
        }
    } catch {
        // TTFB not supported
    }
}

/**
 * Report metric to analytics/monitoring service
 */
function reportMetric(name, value) {
    // Log in development
    if (import.meta.env.DEV) {
        const rating = getMetricRating(name, value);
        console.log(`[Performance] ${name}: ${value.toFixed(2)}ms (${rating})`);
    }

    // In production, send to analytics
    if (import.meta.env.PROD && window.gtag) {
        window.gtag('event', name, {
            event_category: 'Web Vitals',
            event_label: getMetricRating(name, value),
            value: Math.round(value),
            non_interaction: true,
        });
    }

    // Custom analytics callback
    if (typeof window.__reportPerformance === 'function') {
        window.__reportPerformance(name, value);
    }
}

/**
 * Get rating for a metric value
 */
function getMetricRating(name, value) {
    const thresholds = {
        FCP: { good: 1800, poor: 3000 },
        LCP: { good: 2500, poor: 4000 },
        FID: { good: 100, poor: 300 },
        CLS: { good: 0.1, poor: 0.25 },
        TTFB: { good: 800, poor: 1800 },
        INP: { good: 200, poor: 500 },
    };

    const threshold = thresholds[name];
    if (!threshold) return 'unknown';

    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
}

/**
 * Get all collected metrics
 */
export function getMetrics() {
    return { ...metrics };
}

/**
 * Track custom timing
 */
export function trackTiming(name, duration, category = 'Custom') {
    if (import.meta.env.DEV) {
        console.log(`[Performance] ${category}/${name}: ${duration.toFixed(2)}ms`);
    }

    if (import.meta.env.PROD && window.gtag) {
        window.gtag('event', 'timing_complete', {
            name,
            value: Math.round(duration),
            event_category: category,
        });
    }
}

/**
 * Create a performance marker
 */
export function mark(name) {
    if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark(name);
    }
}

/**
 * Measure between two marks
 */
export function measure(name, startMark, endMark) {
    if (typeof performance !== 'undefined' && performance.measure) {
        try {
            const measure = performance.measure(name, startMark, endMark);
            trackTiming(name, measure.duration, 'Measure');
            return measure.duration;
        } catch {
            return null;
        }
    }
    return null;
}

/**
 * Track component render time
 */
export function trackRender(componentName, renderTime) {
    trackTiming(`${componentName}_render`, renderTime, 'Component');
}

/**
 * Track API call duration
 */
export function trackApiCall(endpoint, duration, success = true) {
    const name = `api_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
    trackTiming(name, duration, success ? 'API_Success' : 'API_Error');
}

/**
 * Memory usage tracking (if available)
 */
export function getMemoryUsage() {
    if (performance.memory) {
        return {
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        };
    }
    return null;
}

/**
 * Log performance summary
 */
export function logPerformanceSummary() {
    console.group('[Performance Summary]');
    console.table(metrics);

    const memory = getMemoryUsage();
    if (memory) {
        console.log('Memory:', {
            used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
            total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        });
    }
    console.groupEnd();
}

export default {
    init: initPerformanceMonitoring,
    getMetrics,
    trackTiming,
    trackRender,
    trackApiCall,
    mark,
    measure,
    logSummary: logPerformanceSummary,
};
