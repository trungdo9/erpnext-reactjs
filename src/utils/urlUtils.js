/**
 * URL Utilities
 *
 * Helper functions for resolving URLs, especially for Frappe file paths.
 */

/**
 * Get the Frappe base URL from environment
 */
export const getFrappeUrl = () => {
    return import.meta.env.VITE_FRAPPE_URL || '';
};

/**
 * Resolve a Frappe file URL to an absolute URL
 *
 * Frappe stores file paths as relative URLs like:
 * - /files/user_avatar.png
 * - /private/files/document.pdf
 *
 * This function ensures they work in a separate React app
 *
 * @param {string} url - The file URL (relative or absolute)
 * @returns {string} - Resolved absolute URL
 */
export const resolveFrappeFileUrl = (url) => {
    if (!url) return '';

    // Already absolute URL (http:// or https://)
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }

    // Data URL (base64 encoded)
    if (url.startsWith('data:')) {
        return url;
    }

    // Relative URL - prefix with Frappe base URL
    const baseUrl = getFrappeUrl();

    // If no base URL configured (same domain), return as-is
    if (!baseUrl) {
        return url;
    }

    // Ensure proper joining (no double slashes)
    const cleanBase = baseUrl.replace(/\/$/, '');
    const cleanPath = url.startsWith('/') ? url : `/${url}`;

    return `${cleanBase}${cleanPath}`;
};

/**
 * Check if a URL is a valid image URL
 * @param {string} url
 * @returns {boolean}
 */
export const isValidImageUrl = (url) => {
    if (!url) return false;

    // Data URLs are valid
    if (url.startsWith('data:image/')) return true;

    // Check file extension
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
    const lowerUrl = url.toLowerCase();

    return imageExtensions.some(ext => lowerUrl.includes(ext));
};

export default {
    getFrappeUrl,
    resolveFrappeFileUrl,
    isValidImageUrl
};
