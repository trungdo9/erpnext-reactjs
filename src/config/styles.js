/**
 * Centralized Style Config
 *
 * All reusable UI style patterns in one place.
 * Components import from here instead of hardcoding Tailwind classes.
 *
 * Design: Clean minimal SAP Fiori / Corporate Enterprise style
 * - NO: shadows, gradients (except buttons), translate-y, scale, ring effects, backdrop-blur on cards
 * - YES: subtle borders, hover bg changes, transition-colors, rounded-xl
 */

// ---------------------------------------------------------------------------
// Card Styles
// ---------------------------------------------------------------------------

export const CARD = {
    /** Base card container */
    base: 'bg-card dark:bg-white/[0.03] border border-border/50 dark:border-white/[0.06] rounded-xl',

    /** Card with hover effect (clickable cards) */
    interactive: [
        'bg-card dark:bg-white/[0.03]',
        'border border-border/50 dark:border-white/[0.06]',
        'rounded-xl cursor-pointer',
        'hover:bg-accent/50 dark:hover:bg-white/[0.06]',
        'hover:border-border dark:hover:border-white/[0.12]',
        'active:bg-accent dark:active:bg-white/[0.08]',
        'transition-colors duration-150',
    ].join(' '),

    /** Card hover only (no active state) */
    hover: [
        'bg-card dark:bg-white/[0.03]',
        'border border-border/50 dark:border-white/[0.06]',
        'rounded-xl',
        'hover:bg-accent/50 dark:hover:bg-white/[0.06]',
        'hover:border-border dark:hover:border-white/[0.12]',
        'transition-colors duration-150',
    ].join(' '),

    /** Static card (no hover/active) */
    static: [
        'bg-card dark:bg-white/[0.03]',
        'border border-border/50 dark:border-white/[0.06]',
        'rounded-xl',
    ].join(' '),

    /** Card header section (inside a card) */
    header: 'px-4 py-3.5 border-b border-border/50 dark:border-white/[0.06]',

    /** Card body padding */
    body: 'p-4 md:p-5',

    /** Card body padding (larger) */
    bodyLg: 'p-5 md:p-6',
};

// ---------------------------------------------------------------------------
// List Item Styles
// ---------------------------------------------------------------------------

export const LIST_ITEM = {
    /** Standard list item (clickable) */
    base: [
        'group relative flex items-center gap-3.5 w-full',
        'px-4 py-3.5 cursor-pointer',
        'hover:bg-accent/50 dark:hover:bg-white/[0.06]',
        'active:bg-accent dark:active:bg-white/[0.08]',
        'transition-colors duration-150',
    ].join(' '),

    /** List item inside a card (with rounded corners) */
    card: [
        'group relative flex items-center gap-3.5 w-full',
        'px-4 py-3.5 rounded-xl cursor-pointer',
        'bg-card dark:bg-white/[0.03]',
        'border border-border/50 dark:border-white/[0.06]',
        'hover:bg-accent/50 dark:hover:bg-white/[0.06]',
        'hover:border-border dark:hover:border-white/[0.12]',
        'active:bg-accent dark:active:bg-white/[0.08]',
        'transition-colors duration-150',
    ].join(' '),

    /** Chevron arrow for list items */
    chevron: 'h-4 w-4 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors',
};

// ---------------------------------------------------------------------------
// Icon Container
// ---------------------------------------------------------------------------

export const ICON = {
    /** Small icon container (44x44 mobile, 36x36 desktop) */
    sm: 'flex items-center justify-center w-11 h-11 md:w-9 md:h-9 rounded-lg bg-muted/80 dark:bg-white/[0.06]',

    /** Medium icon container (44x44) */
    md: 'flex items-center justify-center w-11 h-11 rounded-lg bg-muted/80 dark:bg-white/[0.06]',

    /** Large icon container (48x48) */
    lg: 'flex items-center justify-center w-12 h-12 rounded-xl bg-muted/80 dark:bg-white/[0.06]',

    /** Icon inside container */
    iconSm: 'h-4 w-4 text-muted-foreground',
    iconMd: 'h-5 w-5 text-muted-foreground',
    iconLg: 'h-6 w-6 text-muted-foreground',
};

// ---------------------------------------------------------------------------
// Table Styles
// ---------------------------------------------------------------------------

export const TABLE = {
    /** Table container */
    container: 'relative w-full rounded-xl border border-border overflow-hidden',

    /** Table header row */
    header: 'sticky top-0 z-10 bg-muted',

    /** Table head cell */
    th: [
        'h-10 md:h-[30px] px-2 md:px-4 text-left align-middle',
        'font-semibold uppercase tracking-wider text-xs md:text-[11px]',
        'text-muted-foreground',
        'border-r border-border/30 dark:border-white/[0.04] last:border-r-0',
    ].join(' '),

    /** Table body cell */
    td: [
        'px-2 md:px-4 py-2.5 md:py-2 align-middle',
        'text-foreground',
        'border-r border-border/30 last:border-r-0',
    ].join(' '),

    /** Table row */
    row: [
        'transition-colors duration-150 border-b border-border/60',
        'hover:bg-muted/50 cursor-pointer',
    ].join(' '),

    /** Divider between cells */
    divider: 'border-border/30 dark:border-white/[0.04]',
};

// ---------------------------------------------------------------------------
// Button Styles
// ---------------------------------------------------------------------------

export const BUTTON = {
    /** Primary action button */
    primary: [
        'inline-flex items-center justify-center gap-1.5',
        'px-4 py-2 text-sm font-medium rounded-lg',
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90',
        'transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
    ].join(' '),

    /** Secondary / outline button */
    secondary: [
        'inline-flex items-center justify-center gap-1.5',
        'px-3 py-2 text-sm font-medium rounded-lg',
        'bg-background border border-border/60',
        'hover:bg-muted/50',
        'transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
    ].join(' '),

    /** Ghost button (no border) */
    ghost: [
        'inline-flex items-center justify-center gap-1.5',
        'px-3 py-2 text-sm font-medium rounded-lg',
        'hover:bg-muted/50',
        'transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
    ].join(' '),

    /** Icon-only button */
    icon: [
        'inline-flex items-center justify-center',
        'p-2 rounded-lg',
        'hover:bg-muted/50',
        'transition-colors duration-150',
        'disabled:opacity-50',
    ].join(' '),

    /** Destructive button */
    destructive: [
        'inline-flex items-center justify-center gap-1.5',
        'px-3 py-2 text-sm font-medium rounded-lg',
        'bg-background border border-border/60',
        'hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30',
        'transition-colors duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
    ].join(' '),
};

// ---------------------------------------------------------------------------
// Input / Form Styles
// ---------------------------------------------------------------------------

export const INPUT = {
    /** Standard text input (h-10 on mobile for 44px touch target) */
    base: [
        'w-full px-3 py-2.5 md:py-2 text-sm rounded-lg',
        'bg-background border border-border',
        'text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
        'transition-colors duration-150',
    ].join(' '),

    /** Select dropdown */
    select: [
        'w-full px-3 py-2.5 md:py-2 text-sm rounded-lg',
        'bg-background border border-border',
        'text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
        'transition-colors duration-150',
    ].join(' '),

    /** Search input with icon */
    search: [
        'w-full pl-9 pr-3 py-2.5 md:py-2 text-sm rounded-lg',
        'bg-muted/50 border border-border',
        'text-foreground placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
        'transition-colors duration-150',
    ].join(' '),
};

// ---------------------------------------------------------------------------
// Badge / Pill Styles
// ---------------------------------------------------------------------------

export const BADGE = {
    /** Neutral badge */
    neutral: 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-muted text-muted-foreground',

    /** Primary badge */
    primary: 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary',

    /** Success badge */
    success: 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',

    /** Warning badge */
    warning: 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400',

    /** Danger badge */
    danger: 'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-red-500/10 text-red-600 dark:text-red-400',
};

// ---------------------------------------------------------------------------
// Overlay / Modal Styles
// ---------------------------------------------------------------------------

export const OVERLAY = {
    /** Backdrop overlay */
    backdrop: 'fixed inset-0 bg-black/40 backdrop-blur-sm z-[500]',

    /** Modal container */
    modal: [
        'bg-card border border-border/50 dark:border-white/[0.06]',
        'rounded-xl shadow-xl',
    ].join(' '),

    /** Dropdown / popover */
    dropdown: [
        'bg-popover border border-border/50 dark:border-white/[0.06]',
        'rounded-xl shadow-lg',
    ].join(' '),
};

// ---------------------------------------------------------------------------
// Text Styles
// ---------------------------------------------------------------------------

export const TEXT = {
    /** Page title */
    title: 'text-xl md:text-2xl font-bold text-foreground tracking-tight',

    /** Section heading */
    heading: 'text-sm font-semibold text-foreground',

    /** Card label */
    label: 'text-sm font-semibold text-muted-foreground',

    /** Body text */
    body: 'text-sm text-foreground',

    /** Muted / secondary text */
    muted: 'text-sm text-muted-foreground',

    /** Small muted text */
    caption: 'text-xs text-muted-foreground',
};

// ---------------------------------------------------------------------------
// Layout Helpers
// ---------------------------------------------------------------------------

export const LAYOUT = {
    /** Page container with standard spacing */
    page: 'w-full space-y-5',

    /** Responsive grid: 1/2/3 columns */
    grid: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6',

    /** Divider line */
    divider: 'border-t border-border/50 dark:border-white/[0.06]',

    /** Sticky header within a scrollable area */
    stickyHeader: 'sticky top-0 z-10 bg-background',
};

// ---------------------------------------------------------------------------
// Sidebar Styles
// ---------------------------------------------------------------------------

export const SIDEBAR = {
    /** Sidebar container */
    container: 'flex flex-col h-full bg-card border-r border-border',

    /** Sidebar item (clickable) */
    item: [
        'flex items-center gap-3 px-3 py-2.5 rounded-lg',
        'text-sm text-muted-foreground',
        'hover:bg-accent/50 dark:hover:bg-white/[0.06]',
        'transition-colors duration-150',
        'cursor-pointer',
    ].join(' '),

    /** Sidebar item (active) */
    itemActive: [
        'flex items-center gap-3 px-3 py-2.5 rounded-lg',
        'text-sm font-medium text-foreground',
        'bg-accent dark:bg-white/[0.06]',
    ].join(' '),

    /** Sidebar section header */
    sectionHeader: 'px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider',
};

// ---------------------------------------------------------------------------
// Loading Styles
// ---------------------------------------------------------------------------

export const LOADING = {
    /** Skeleton shimmer block */
    skeleton: 'bg-muted rounded animate-pulse',

    /** Card loading placeholder */
    card: [
        'bg-card dark:bg-white/[0.03]',
        'border border-border/50 dark:border-white/[0.06]',
        'rounded-xl animate-pulse',
    ].join(' '),

    /** Spinner container */
    spinner: 'flex items-center justify-center p-4',
};

// ---------------------------------------------------------------------------
// Transition Presets
// ---------------------------------------------------------------------------

export const TRANSITION = {
    colors: 'transition-colors duration-150',
    fast: 'transition-colors duration-100',
    /** Transition for color, bg, border, and opacity changes. For transform/shadow transitions, use inline styles. */
    all: 'transition-[color,background-color,border-color,opacity] duration-150',
};
