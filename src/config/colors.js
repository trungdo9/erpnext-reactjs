/**
 * Centralized Color Palette Configuration
 *
 * This file defines all color schemes used across the application.
 * Edit this file to change colors globally without touching individual components.
 *
 * USAGE:
 * - CARD_COLORS: For menu cards, stat cards, icon backgrounds
 * - STATUS_COLORS: For badges, alerts, notifications
 * - GRADIENTS: For buttons, banners, decorative elements
 * - SHADOWS: For hover states, elevation
 * - BORDERS: For card borders, dividers
 */

// ============================================
// SOLID COLOR DEFINITIONS (named GRADIENTS for historical reasons)
// Despite the name, these are flat solid bg-color classes, not CSS gradients.
// The name is kept for backward compatibility — do not change imports.
// Use for buttons, headers, status indicators, decorative elements.
// ============================================
export const GRADIENTS = {
    // Industrial Steel Blue theme
    primary: 'bg-[#1e3a5f]',
    primaryHover: 'hover:bg-[#254a73]',
    primarySubtle: 'bg-[#f0f4f8]',

    success: 'bg-[#30a66d]',
    successHover: 'hover:bg-[#268d5a]',

    danger: 'bg-[#e03636]',
    dangerHover: 'hover:bg-[#c42e2e]',

    info: 'bg-[#0289f7]',
    infoHover: 'hover:bg-[#0277d6]',

    warning: 'bg-[#e86c13]',
    warningHover: 'hover:bg-[#d15f0e]',

    cyan: 'bg-[#15aabf]',
    purple: 'bg-[#7c3aed]',
    rose: 'bg-[#e03636]',

    darkCard: 'bg-[#0f1a2e]',
    darkSubtle: 'bg-transparent',
};

// ============================================
// SHADOW DEFINITIONS
// Use for elevation, hover states
// ============================================
export const SHADOWS = {
    // Frappe 16 subtle shadows
    primary: 'shadow-sm',
    primaryLg: 'shadow-md',
    primaryGlow: 'shadow-sm',

    success: 'shadow-sm',
    successLg: 'shadow-md',

    danger: 'shadow-sm',
    dangerLg: 'shadow-md',

    info: 'shadow-sm',
    infoLg: 'shadow-md',

    cyan: 'shadow-sm',
    purple: 'shadow-sm',

    card: 'shadow-sm',
    cardHover: 'shadow-md',
    cardElevated: 'shadow-lg',
    // CSS variable references — use with style={{ boxShadow: SHADOWS.vars.card }}
    vars: {
        card: 'var(--shadow-card)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
    },
};

// ============================================
// BORDER DEFINITIONS
// Use for card borders, dividers
// ============================================
export const BORDERS = {
    // Primary
    primary: 'border-primary/30',
    primaryHover: 'hover:border-primary/50',
    primaryStrong: 'border-primary/50',

    // Default
    default: 'border-border',
    subtle: 'border-border/50',
    muted: 'border-muted',

    // Status
    success: 'border-emerald-500/30 dark:border-emerald-400/30',
    danger: 'border-red-500/30 dark:border-red-400/30',
    warning: 'border-amber-500/30 dark:border-amber-400/30',
    info: 'border-blue-500/30 dark:border-blue-400/30',
};

// ============================================
// OPACITY SCALE
// Consistent opacity values across the app
// ============================================
export const OPACITY = {
    subtle: '5',      // 0.05 - very faint backgrounds
    soft: '10',       // 0.10 - soft backgrounds
    light: '15',      // 0.15 - icon backgrounds (light mode)
    medium: '25',     // 0.25 - medium emphasis
    high: '40',       // 0.40 - strong emphasis
    darkLight: '20',  // 0.20 - icon backgrounds (dark mode)
};

// ============================================
// CARD COLORS
// Professional with subtle color accents
// ============================================
export const CARD_COLORS = {
    blue: {
        text: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-l-blue-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/30',
    },
    green: {
        text: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'border-l-emerald-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/30',
    },
    orange: {
        text: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'border-l-orange-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/30',
    },
    purple: {
        text: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'border-l-purple-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/30',
    },
    teal: {
        text: 'text-teal-600 dark:text-teal-400',
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        border: 'border-l-teal-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/30',
    },
    rose: {
        text: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-900/20',
        border: 'border-l-rose-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-900/30',
    },
    indigo: {
        text: 'text-indigo-600 dark:text-indigo-400',
        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
        border: 'border-l-indigo-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30',
    },
    cyan: {
        text: 'text-cyan-600 dark:text-cyan-400',
        bg: 'bg-cyan-50 dark:bg-cyan-900/20',
        border: 'border-l-cyan-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-cyan-600 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/30',
    },
    amber: {
        text: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border-l-amber-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/30',
    },
    lime: {
        text: 'text-lime-600 dark:text-lime-400',
        bg: 'bg-lime-50 dark:bg-lime-900/20',
        border: 'border-l-lime-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-lime-600 hover:bg-lime-50/50 dark:hover:bg-lime-900/30',
    },
    red: {
        text: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-l-red-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-red-600 hover:bg-red-50/50 dark:hover:bg-red-900/30',
    },
    slate: {
        text: 'text-slate-600 dark:text-slate-400',
        bg: 'bg-slate-50 dark:bg-slate-900/20',
        border: 'border-l-slate-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-900/30',
    },
    yellow: {
        text: 'text-yellow-600 dark:text-yellow-400',
        bg: 'bg-yellow-50 dark:bg-yellow-900/20',
        border: 'border-l-yellow-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-yellow-600 hover:bg-yellow-50/50 dark:hover:bg-yellow-900/30',
    },
    pink: {
        text: 'text-pink-600 dark:text-pink-400',
        bg: 'bg-pink-50 dark:bg-pink-900/20',
        border: 'border-l-pink-500 border-l-4 border-y border-r border-border',
        hover: 'hover:border-l-pink-600 hover:bg-pink-50/50 dark:hover:bg-pink-900/30',
    },
};

// Helper to get icon classes from a color scheme
export const getCardIconClasses = (colorName) => {
    const color = CARD_COLORS[colorName] || CARD_COLORS.blue;
    return `${color.text} ${color.bg}`;
};

// Helper to get full card classes from a color scheme
export const getCardClasses = (colorName) => {
    const color = CARD_COLORS[colorName] || CARD_COLORS.blue;
    return {
        icon: `${color.text} ${color.bg}`,
        border: color.border,
        hover: color.hover,
    };
};

// Status colors for badges and indicators
export const STATUS_COLORS = {
    success: 'text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/20',
    warning: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-500/20',
    error: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-500/20',
    info: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-500/20',
    neutral: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-500/20',
};

// Doctype-specific color mappings
// Maps doctype IDs to their designated colors for consistency
export const DOCTYPE_COLORS = {
    // Xưởng Sản Xuất
    cong_nhan: 'blue',
    phu_pham: 'orange',
    san_xuat: 'purple',
    nhap_kho: 'teal',
    xuat_kho: 'rose',

    // Steel Production
    cutting: 'indigo',
    welding: 'amber',
    bending: 'cyan',
    painting: 'slate',
    quality_check: 'purple',
    packaging: 'lime',
};

// Get color for a doctype by its ID
export const getDoctypeColor = (doctypeId) => {
    return DOCTYPE_COLORS[doctypeId] || 'blue';
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get icon container class for a color
 * @param {string} color - Color name (blue, green, amber, etc.)
 * @returns {string} CSS class for icon container
 */
export const getIconContainerClass = (color) => {
    return `icon-container icon-container-${color}`;
};

/**
 * Get gradient classes for a variant
 * @param {'primary' | 'success' | 'danger' | 'info' | 'warning'} variant
 * @param {boolean} withHover - Include hover state
 * @returns {string} Gradient classes
 */
export const getGradient = (variant = 'primary', withHover = true) => {
    const base = GRADIENTS[variant] || GRADIENTS.primary;
    const hover = GRADIENTS[`${variant}Hover`] || '';
    return withHover ? `${base} ${hover}` : base;
};

/**
 * Get shadow class for a variant
 * @param {'primary' | 'success' | 'danger' | 'info' | 'card'} variant
 * @param {'sm' | 'md' | 'lg'} size
 * @returns {string} Shadow class
 */
export const getShadow = (variant = 'primary', size = 'md') => {
    if (size === 'lg') {
        return SHADOWS[`${variant}Lg`] || SHADOWS[variant] || SHADOWS.primary;
    }
    return SHADOWS[variant] || SHADOWS.primary;
};

/**
 * Get border classes for a variant
 * @param {'primary' | 'success' | 'danger' | 'warning' | 'info' | 'default'} variant
 * @param {boolean} withHover
 * @returns {string} Border classes
 */
export const getBorder = (variant = 'default', withHover = false) => {
    const base = BORDERS[variant] || BORDERS.default;
    const hover = withHover ? (BORDERS[`${variant}Hover`] || BORDERS.primaryHover) : '';
    return `${base} ${hover}`.trim();
};

// ============================================
// STATIC COLOR MAPS for Tailwind JIT compatibility
// Dynamic template literals like `bg-${color}-500/15` are NOT detected
// by Tailwind's JIT scanner. These static maps ensure all classes are
// present in the final CSS bundle.
// ============================================

const COLOR_BG_MAP = {
    blue:    { subtle: 'bg-blue-500/5',    soft: 'bg-blue-500/10',    light: 'bg-blue-500/15',    medium: 'bg-blue-500/25',    high: 'bg-blue-500/40'    },
    indigo:  { subtle: 'bg-indigo-500/5',  soft: 'bg-indigo-500/10',  light: 'bg-indigo-500/15',  medium: 'bg-indigo-500/25',  high: 'bg-indigo-500/40'  },
    emerald: { subtle: 'bg-emerald-500/5', soft: 'bg-emerald-500/10', light: 'bg-emerald-500/15', medium: 'bg-emerald-500/25', high: 'bg-emerald-500/40' },
    teal:    { subtle: 'bg-teal-500/5',    soft: 'bg-teal-500/10',    light: 'bg-teal-500/15',    medium: 'bg-teal-500/25',    high: 'bg-teal-500/40'    },
    cyan:    { subtle: 'bg-cyan-500/5',    soft: 'bg-cyan-500/10',    light: 'bg-cyan-500/15',    medium: 'bg-cyan-500/25',    high: 'bg-cyan-500/40'    },
    purple:  { subtle: 'bg-purple-500/5',  soft: 'bg-purple-500/10',  light: 'bg-purple-500/15',  medium: 'bg-purple-500/25',  high: 'bg-purple-500/40'  },
    rose:    { subtle: 'bg-rose-500/5',    soft: 'bg-rose-500/10',    light: 'bg-rose-500/15',    medium: 'bg-rose-500/25',    high: 'bg-rose-500/40'    },
    amber:   { subtle: 'bg-amber-500/5',   soft: 'bg-amber-500/10',   light: 'bg-amber-500/15',   medium: 'bg-amber-500/25',   high: 'bg-amber-500/40'   },
    green:   { subtle: 'bg-green-500/5',   soft: 'bg-green-500/10',   light: 'bg-green-500/15',   medium: 'bg-green-500/25',   high: 'bg-green-500/40'   },
    red:     { subtle: 'bg-red-500/5',     soft: 'bg-red-500/10',     light: 'bg-red-500/15',     medium: 'bg-red-500/25',     high: 'bg-red-500/40'     },
    orange:  { subtle: 'bg-orange-500/5',  soft: 'bg-orange-500/10',  light: 'bg-orange-500/15',  medium: 'bg-orange-500/25',  high: 'bg-orange-500/40'  },
    yellow:  { subtle: 'bg-yellow-500/5',  soft: 'bg-yellow-500/10',  light: 'bg-yellow-500/15',  medium: 'bg-yellow-500/25',  high: 'bg-yellow-500/40'  },
    lime:    { subtle: 'bg-lime-500/5',    soft: 'bg-lime-500/10',    light: 'bg-lime-500/15',    medium: 'bg-lime-500/25',    high: 'bg-lime-500/40'    },
    slate:   { subtle: 'bg-slate-500/5',   soft: 'bg-slate-500/10',   light: 'bg-slate-500/15',   medium: 'bg-slate-500/25',   high: 'bg-slate-500/40'   },
    violet:  { subtle: 'bg-violet-500/5',  soft: 'bg-violet-500/10',  light: 'bg-violet-500/15',  medium: 'bg-violet-500/25',  high: 'bg-violet-500/40'  },
    pink:    { subtle: 'bg-pink-500/5',    soft: 'bg-pink-500/10',    light: 'bg-pink-500/15',    medium: 'bg-pink-500/25',    high: 'bg-pink-500/40'    },
    sky:     { subtle: 'bg-sky-500/5',     soft: 'bg-sky-500/10',     light: 'bg-sky-500/15',     medium: 'bg-sky-500/25',     high: 'bg-sky-500/40'     },
    fuchsia: { subtle: 'bg-fuchsia-500/5', soft: 'bg-fuchsia-500/10', light: 'bg-fuchsia-500/15', medium: 'bg-fuchsia-500/25', high: 'bg-fuchsia-500/40' },
    gray:    { subtle: 'bg-gray-500/5',    soft: 'bg-gray-500/10',    light: 'bg-gray-500/15',    medium: 'bg-gray-500/25',    high: 'bg-gray-500/40'    },
};

const COLOR_BG_DARK_MAP = {
    blue:    { subtle: 'dark:bg-blue-500/5',    soft: 'dark:bg-blue-500/10',    light: 'dark:bg-blue-500/20',    medium: 'dark:bg-blue-500/25',    high: 'dark:bg-blue-500/40'    },
    indigo:  { subtle: 'dark:bg-indigo-500/5',  soft: 'dark:bg-indigo-500/10',  light: 'dark:bg-indigo-500/20',  medium: 'dark:bg-indigo-500/25',  high: 'dark:bg-indigo-500/40'  },
    emerald: { subtle: 'dark:bg-emerald-500/5', soft: 'dark:bg-emerald-500/10', light: 'dark:bg-emerald-500/20', medium: 'dark:bg-emerald-500/25', high: 'dark:bg-emerald-500/40' },
    teal:    { subtle: 'dark:bg-teal-500/5',    soft: 'dark:bg-teal-500/10',    light: 'dark:bg-teal-500/20',    medium: 'dark:bg-teal-500/25',    high: 'dark:bg-teal-500/40'    },
    cyan:    { subtle: 'dark:bg-cyan-500/5',    soft: 'dark:bg-cyan-500/10',    light: 'dark:bg-cyan-500/20',    medium: 'dark:bg-cyan-500/25',    high: 'dark:bg-cyan-500/40'    },
    purple:  { subtle: 'dark:bg-purple-500/5',  soft: 'dark:bg-purple-500/10',  light: 'dark:bg-purple-500/20',  medium: 'dark:bg-purple-500/25',  high: 'dark:bg-purple-500/40'  },
    rose:    { subtle: 'dark:bg-rose-500/5',    soft: 'dark:bg-rose-500/10',    light: 'dark:bg-rose-500/20',    medium: 'dark:bg-rose-500/25',    high: 'dark:bg-rose-500/40'    },
    amber:   { subtle: 'dark:bg-amber-500/5',   soft: 'dark:bg-amber-500/10',   light: 'dark:bg-amber-500/20',   medium: 'dark:bg-amber-500/25',   high: 'dark:bg-amber-500/40'   },
    green:   { subtle: 'dark:bg-green-500/5',   soft: 'dark:bg-green-500/10',   light: 'dark:bg-green-500/20',   medium: 'dark:bg-green-500/25',   high: 'dark:bg-green-500/40'   },
    red:     { subtle: 'dark:bg-red-500/5',     soft: 'dark:bg-red-500/10',     light: 'dark:bg-red-500/20',     medium: 'dark:bg-red-500/25',     high: 'dark:bg-red-500/40'     },
    orange:  { subtle: 'dark:bg-orange-500/5',  soft: 'dark:bg-orange-500/10',  light: 'dark:bg-orange-500/20',  medium: 'dark:bg-orange-500/25',  high: 'dark:bg-orange-500/40'  },
    yellow:  { subtle: 'dark:bg-yellow-500/5',  soft: 'dark:bg-yellow-500/10',  light: 'dark:bg-yellow-500/20',  medium: 'dark:bg-yellow-500/25',  high: 'dark:bg-yellow-500/40'  },
    lime:    { subtle: 'dark:bg-lime-500/5',    soft: 'dark:bg-lime-500/10',    light: 'dark:bg-lime-500/20',    medium: 'dark:bg-lime-500/25',    high: 'dark:bg-lime-500/40'    },
    slate:   { subtle: 'dark:bg-slate-500/5',   soft: 'dark:bg-slate-500/10',   light: 'dark:bg-slate-500/20',   medium: 'dark:bg-slate-500/25',   high: 'dark:bg-slate-500/40'   },
    violet:  { subtle: 'dark:bg-violet-500/5',  soft: 'dark:bg-violet-500/10',  light: 'dark:bg-violet-500/20',  medium: 'dark:bg-violet-500/25',  high: 'dark:bg-violet-500/40'  },
    pink:    { subtle: 'dark:bg-pink-500/5',    soft: 'dark:bg-pink-500/10',    light: 'dark:bg-pink-500/20',    medium: 'dark:bg-pink-500/25',    high: 'dark:bg-pink-500/40'    },
    sky:     { subtle: 'dark:bg-sky-500/5',     soft: 'dark:bg-sky-500/10',     light: 'dark:bg-sky-500/20',     medium: 'dark:bg-sky-500/25',     high: 'dark:bg-sky-500/40'     },
    fuchsia: { subtle: 'dark:bg-fuchsia-500/5', soft: 'dark:bg-fuchsia-500/10', light: 'dark:bg-fuchsia-500/20', medium: 'dark:bg-fuchsia-500/25', high: 'dark:bg-fuchsia-500/40' },
    gray:    { subtle: 'dark:bg-gray-500/5',    soft: 'dark:bg-gray-500/10',    light: 'dark:bg-gray-500/20',    medium: 'dark:bg-gray-500/25',    high: 'dark:bg-gray-500/40'    },
};

const COLOR_TEXT_MAP = {
    blue:    { light: 'text-blue-600',    dark: 'dark:text-blue-400'    },
    indigo:  { light: 'text-indigo-600',  dark: 'dark:text-indigo-400'  },
    emerald: { light: 'text-emerald-600', dark: 'dark:text-emerald-400' },
    teal:    { light: 'text-teal-600',    dark: 'dark:text-teal-400'    },
    cyan:    { light: 'text-cyan-600',    dark: 'dark:text-cyan-400'    },
    purple:  { light: 'text-purple-600',  dark: 'dark:text-purple-400'  },
    rose:    { light: 'text-rose-600',    dark: 'dark:text-rose-400'    },
    amber:   { light: 'text-amber-600',   dark: 'dark:text-amber-400'   },
    green:   { light: 'text-green-600',   dark: 'dark:text-green-400'   },
    red:     { light: 'text-red-600',     dark: 'dark:text-red-400'     },
    orange:  { light: 'text-orange-600',  dark: 'dark:text-orange-400'  },
    yellow:  { light: 'text-yellow-600',  dark: 'dark:text-yellow-400'  },
    lime:    { light: 'text-lime-600',    dark: 'dark:text-lime-400'    },
    slate:   { light: 'text-slate-600',   dark: 'dark:text-slate-400'   },
    violet:  { light: 'text-violet-600',  dark: 'dark:text-violet-400'  },
    pink:    { light: 'text-pink-600',    dark: 'dark:text-pink-400'    },
    sky:     { light: 'text-sky-600',     dark: 'dark:text-sky-400'     },
    fuchsia: { light: 'text-fuchsia-600', dark: 'dark:text-fuchsia-400' },
    gray:    { light: 'text-gray-600',    dark: 'dark:text-gray-400'    },
};

/**
 * Build consistent background with opacity (static lookup, Tailwind JIT safe)
 * @param {string} color - Tailwind color (e.g., 'amber', 'blue', 'emerald')
 * @param {'subtle' | 'soft' | 'light' | 'medium' | 'high'} opacity
 * @returns {string} Background classes for light and dark mode
 */
export const getColorBg = (color, opacity = 'light') => {
    const bgEntry = COLOR_BG_MAP[color];
    const darkEntry = COLOR_BG_DARK_MAP[color];
    if (!bgEntry || !darkEntry) {
        // Fallback to blue if color not found
        return `${COLOR_BG_MAP.blue[opacity] || COLOR_BG_MAP.blue.light} ${COLOR_BG_DARK_MAP.blue[opacity] || COLOR_BG_DARK_MAP.blue.light}`;
    }
    return `${bgEntry[opacity] || bgEntry.light} ${darkEntry[opacity] || darkEntry.light}`;
};

/**
 * Build consistent text color (static lookup, Tailwind JIT safe)
 * @param {string} color - Tailwind color (e.g., 'amber', 'blue', 'emerald')
 * @returns {string} Text classes for light and dark mode
 */
export const getColorText = (color) => {
    const entry = COLOR_TEXT_MAP[color];
    if (!entry) {
        // Fallback to blue if color not found
        return `${COLOR_TEXT_MAP.blue.light} ${COLOR_TEXT_MAP.blue.dark}`;
    }
    return `${entry.light} ${entry.dark}`;
};

// ============================================
// DESIGN TOKENS - Standardized UI Values
// ============================================

/**
 * Spacing Scale (in Tailwind units)
 * Use these for consistent spacing across the app
 * 1 unit = 4px (Tailwind default)
 */
export const SPACING = {
    xs: '1',      // 4px
    sm: '2',      // 8px
    md: '3',      // 12px
    lg: '4',      // 16px
    xl: '6',      // 24px
    '2xl': '8',   // 32px
    '3xl': '12',  // 48px
};

/**
 * Border Radius Scale
 * Consistent corner rounding
 */
export const RADIUS = {
    none: 'rounded-none',
    sm: 'rounded',         // 4px
    md: 'rounded-md',      // 6px
    lg: 'rounded-lg',      // 8px
    xl: 'rounded-xl',      // 12px - used by cards in styles.js
    '2xl': 'rounded-2xl',  // 16px
    '3xl': 'rounded-3xl',  // 24px
    full: 'rounded-full',  // 9999px
};

/**
 * Typography Scale
 * Consistent font sizes and weights
 */
export const TYPOGRAPHY = {
    sizes: {
        xs: 'text-xs',       // 12px
        sm: 'text-sm',       // 14px
        base: 'text-base',   // 16px
        lg: 'text-lg',       // 18px
        xl: 'text-xl',       // 20px
        '2xl': 'text-2xl',   // 24px
    },
    weights: {
        normal: 'font-normal',
        medium: 'font-medium',
        semibold: 'font-semibold',
        bold: 'font-bold',
    },
    // Standard label styling - Frappe compact
    label: 'text-xs font-medium text-muted-foreground',
    // Standard description styling
    description: 'text-xs text-muted-foreground',
};

/**
 * Focus States
 * Consistent focus ring styling
 */
export const FOCUS = {
    // Frappe focus: blue ring + outer glow
    ring: 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0289f7] focus-visible:shadow-[0_0_0_3px_rgba(2,137,247,0.15)]',
    ringSubtle: 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0289f7]/50 focus-visible:ring-offset-0',
    within: 'focus-within:ring-1 focus-within:ring-[#0289f7]/50',
};

/**
 * Animation/Transition Timing
 * Consistent animation durations and easings
 */
export const ANIMATION = {
    // Durations
    fast: 'duration-150',
    normal: 'duration-200',
    slow: 'duration-300',
    slower: 'duration-500',
    // Easings
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
    // Combined transitions (use specific properties for better performance)
    transition: 'transition-[color,background-color,border-color,opacity] duration-200 ease-out',
    transitionFast: 'transition-[color,background-color,border-color,opacity] duration-150 ease-out',
    transitionSlow: 'transition-[color,background-color,border-color,opacity] duration-300 ease-out',
    transitionColors: 'transition-colors duration-200 ease-out',
};

/**
 * Input/Form Styles
 * Consistent form element styling
 */
export const FORM = {
    // Frappe 16: gray bg, no border, blue focus ring
    inputBase: 'w-full border-0 bg-muted text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
    inputSm: 'h-8 px-2 text-xs rounded-[6px]',
    inputMd: 'h-10 px-2 text-sm rounded-[6px]',
    inputLg: 'h-12 px-3 text-sm rounded-lg',
    inputFocus: 'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0289f7] focus-visible:shadow-[0_0_0_3px_rgba(2,137,247,0.15)]',
    label: 'block text-xs font-medium text-muted-foreground mb-1',
    inputError: 'ring-1 ring-[#e03636]',
    helperText: 'text-xs text-muted-foreground mt-0.5',
    errorText: 'text-xs text-[#e03636] mt-0.5',
};

/**
 * Button Sizes
 * Consistent button dimensions
 */
export const BUTTON_SIZES = {
    sm: 'h-9 px-2 text-xs rounded-[6px]',
    md: 'h-10 px-3 text-sm rounded-[6px]',
    lg: 'h-12 px-4 text-sm rounded-[6px]',
    icon: 'h-10 w-10 rounded-[6px]',
    iconSm: 'h-9 w-9 rounded-[6px]',
    iconLg: 'h-12 w-12 rounded-[6px]',
};

/**
 * Status Colors (Standardized)
 * Use CSS variable pattern for consistency
 */
export const STATUS = {
    success: {
        bg: 'bg-emerald-100 dark:bg-emerald-500/20',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-200 dark:border-emerald-500/30',
    },
    warning: {
        bg: 'bg-amber-100 dark:bg-amber-500/20',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-200 dark:border-amber-500/30',
    },
    error: {
        bg: 'bg-red-100 dark:bg-red-500/20',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-200 dark:border-red-500/30',
    },
    info: {
        bg: 'bg-blue-100 dark:bg-blue-500/20',
        text: 'text-blue-700 dark:text-blue-400',
        border: 'border-blue-200 dark:border-blue-500/30',
    },
    neutral: {
        bg: 'bg-gray-100 dark:bg-gray-500/20',
        text: 'text-gray-700 dark:text-gray-400',
        border: 'border-gray-200 dark:border-gray-500/30',
    },
    primary: {
        bg: 'bg-primary/10 dark:bg-primary/20',
        text: 'text-primary dark:text-primary',
        border: 'border-primary/20 dark:border-primary/30',
    },
};

/**
 * Get combined status classes
 */
export const getStatusClasses = (status = 'neutral') => {
    const s = STATUS[status] || STATUS.neutral;
    return `${s.bg} ${s.text}`;
};
