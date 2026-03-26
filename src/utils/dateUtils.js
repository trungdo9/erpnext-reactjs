import dayjs from 'dayjs';

// ═══════════════════════════════════════════════════════════════
// STANDARD DATE FORMAT: dd/mm/yyyy
// This is the single source of truth for date formatting
// ═══════════════════════════════════════════════════════════════

export const DATE_FORMAT = 'DD/MM/YYYY';
export const DATETIME_FORMAT = 'DD/MM/YYYY HH:mm';
export const TIME_FORMAT = 'HH:mm';

// ═══════════════════════════════════════════════════════════════
// INPUT FORMATS (for HTML date inputs - always YYYY-MM-DD)
// ═══════════════════════════════════════════════════════════════

export const formatDateForInput = (isoString) => {
    if (!isoString) return '';
    if (isoString.includes(' ')) {
        return isoString.split(' ')[0];
    }
    return isoString;
};

export const formatDatetimeForInput = (isoString) => {
    if (!isoString) return '';
    return isoString.replace(' ', 'T').substring(0, 16);
};

// ═══════════════════════════════════════════════════════════════
// DISPLAY FORMATS (for UI - always dd/mm/yyyy)
// ═══════════════════════════════════════════════════════════════

/**
 * Format date for display: dd/mm/yyyy
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
    if (!date) return '';
    return dayjs(date).format(DATE_FORMAT);
};

/**
 * Format datetime for display: dd/mm/yyyy HH:mm
 * @param {string|Date} datetime - Datetime to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTime = (datetime) => {
    if (!datetime) return '';
    return dayjs(datetime).format(DATETIME_FORMAT);
};

/**
 * Format time for display: HH:mm
 * @param {string|Date} time - Time to format
 * @returns {string} Formatted time string
 */
export const formatTime = (time) => {
    if (!time) return '';
    return dayjs(time).format(TIME_FORMAT);
};

// ═══════════════════════════════════════════════════════════════
// HOOK FOR DATE FORMATTING (for components)
// ═══════════════════════════════════════════════════════════════

/**
 * Hook for formatting dates - always uses dd/mm/yyyy
 * @returns {Function} Date formatter function
 */
export const useDateFormatter = () => {
    return (date) => {
        if (!date) return '';
        return dayjs(date).format(DATE_FORMAT);
    };
};

/**
 * Hook for formatting datetimes - always uses dd/mm/yyyy HH:mm
 * @returns {Function} Datetime formatter function
 */
export const useDateTimeFormatter = () => {
    return (datetime) => {
        if (!datetime) return '';
        return dayjs(datetime).format(DATETIME_FORMAT);
    };
};

// ═══════════════════════════════════════════════════════════════
// NUMBER LOCALE MAPPING
// Maps language codes to Intl locale strings for number formatting
// ═══════════════════════════════════════════════════════════════

const NUMBER_LOCALE_MAP = {
    vi: 'vi-VN',
    en: 'en-US',
    km: 'km-KH',
    zh: 'zh-CN',
};

/**
 * Get the Intl-compatible locale string for number/date formatting
 * @param {string} lang - Language code (vi, en, km, zh)
 * @returns {string} Intl locale string (e.g., 'vi-VN', 'en-US')
 */
export const getNumberLocale = (lang) => {
    return NUMBER_LOCALE_MAP[lang] || NUMBER_LOCALE_MAP.vi;
};

/**
 * Get the Intl-compatible locale string from localStorage
 * Falls back to 'vi-VN' if not found
 * @returns {string} Intl locale string
 */
export const getCurrentNumberLocale = () => {
    const lang = localStorage.getItem('erp_language') || 'en';
    return getNumberLocale(lang);
};

// ═══════════════════════════════════════════════════════════════
// DATE CALCULATION UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get date N days ago in YYYY-MM-DD format (for API filters)
 * @param {number} days - Number of days ago
 * @returns {string} Date in YYYY-MM-DD format
 */
export const getDaysAgo = (days = 30) => {
    return dayjs().subtract(days, 'day').format('YYYY-MM-DD');
};

/**
 * Get today's date in YYYY-MM-DD format (for API filters)
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getToday = () => {
    return dayjs().format('YYYY-MM-DD');
};
