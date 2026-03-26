/**
 * Layout Configuration
 *
 * Centralized layout constants for the entire app.
 * All layout-related hardcoded values live here — no magic numbers in components.
 *
 * Sections:
 * - Z_INDEX: Layering hierarchy
 * - SIDEBAR: Sidebar widths & breakpoint
 * - BOTTOM_NAV: Mobile bottom navigation tabs
 * - CHAT_WIDGET: Floating AI chat position & sizing
 * - PAGES: Page-level layout overrides
 * - MOBILE: Mobile-specific breakpoints & sizing
 */

import { Home, MessageCircle, Map, UtensilsCrossed, ClipboardList, CalendarClock, Truck, CalendarDays, Clock } from 'lucide-react';

// ─── Z-Index Hierarchy ──────────────────────────────────────────────────────
// Single source of truth for all z-index values.
// Higher number = closer to user.
export const Z_INDEX = {
    header:             10,    // Desktop header
    headerMobile:       30,    // Mobile sticky header
    announcementBar:    50,    // Top banner / announcements
    bottomNav:          50,    // Mobile bottom navigation
    sidebarOverlay:     60,    // Mobile sidebar backdrop
    sidebar:            70,    // Sidebar panel
    chatWidget:         80,    // Floating AI chat button & panel
    tooltip:            200,   // Tooltips
    dropdown:           300,   // Select/Link/Filter dropdowns
    contextMenu:        400,   // Right-click / cell context menus
    modal:              500,   // Modals, dialogs, overlays
    toast:              600,   // Toast notifications
    popover:            350,   // User profile popover, popovers
};

// ─── Sidebar ────────────────────────────────────────────────────────────────
export const SIDEBAR = {
    mobileWidth:    260,       // px — mobile slide-over width
    desktopWidth:   220,       // px — desktop expanded width
    collapsedWidth: 60,        // px — desktop collapsed width
    breakpoint:     768,       // px — mobile/desktop breakpoint (matches Tailwind md:)
};

// ─── Bottom Navigation (Mobile) ─────────────────────────────────────────────
export const BOTTOM_NAV_TABS = [
    { id: 'home', icon: Home, label: 'nav.home', path: '/' },
    { id: 'chat', icon: MessageCircle, label: 'nav.chat', path: '/app/chat' },
    { id: 'map', icon: Map, label: 'nav.map', path: '/app/map' },
];

// ─── Chat Widget ────────────────────────────────────────────────────────────
export const CHAT_WIDGET = {
    width:      380,           // px — chat panel width
    height:     560,           // px — chat panel max height
    maxVH:      75,            // vh — max height as viewport %
    btnSize:    56,            // px — floating button size (w-14 h-14)
    position:   { bottom: 20, right: 20 }, // px from edges
};

// ─── Pages Config ───────────────────────────────────────────────────────────
// Pages where bottom nav is hidden (full-screen experiences)
export const HIDE_BOTTOM_NAV_PAGES = ['/app/chat', '/app/map'];

// ─── Mobile ─────────────────────────────────────────────────────────────────
export const MOBILE = {
    breakpoint:         768,   // px — same as SIDEBAR.breakpoint
    touchTarget:        44,    // px — minimum touch target (WCAG 2.5.5)
    bottomNavHeight:    56,    // px — h-14 = 3.5rem
};

// ─── List View ──────────────────────────────────────────────────────────────
export const LIST_VIEW = {
    pageSize:           20,    // Default rows per page
    mobileMaxFields:    6,     // Max fields shown in mobile card
    desktopMaxHeight:   'calc(100vh - 220px)',
    externalMaxHeight:  'calc(100vh - 280px)',
};

// ─── Role-Based Access ───────────────────────────────────────────────────────
// Roles considered "manager" level — used to gate tools & pages
export const MANAGER_ROLES = new Set([
    'System Manager', 'Administrator',
    'Tổng Giám Đốc', 'Phó Tổng Giám Đốc',
    'Ban Giám Đốc', 'Giám Đốc Xí Nghiệp', 'Phó Giám Đốc Xí Nghiệp',
    'Giám Đốc Nông Trường', 'Phó Giám Đốc Nông Trường',
    'Giám Đốc Kỹ Thuật', 'Giám Đốc Nhân Sự', 'Giám Đốc Đời Sống',
    'Trưởng Ban Chức Năng', 'Trưởng Phòng', 'Phó Phòng',
    'Quản Đốc Xưởng', 'Phân Xưởng Trưởng',
    'Trưởng BĐH Công Trình', 'Trưởng Bộ Phận Kế Hoạch',
    'Trưởng Kho', 'Quản Lý Xe', 'Quản Lý Bếp', 'Quản Lý Bếp Ăn', 'Quản Lý Nhà Ở',
    'Bếp Trưởng', 'HR Manager', 'HR User',
    'Chuyên Viên Kế Hoạch KPI',
]);

/** Check if user roles include any manager role */
export const hasManagerRole = (userRoles) => {
    if (!userRoles?.length) return false;
    return userRoles.some(r => MANAGER_ROLES.has(r));
};

// ─── Mobile Home Tool Shortcuts ─────────────────────────────────────────────
// Quick-access tools on mobile dashboard home screen
// managerOnly: true = only visible to users with a MANAGER_ROLES role
export const MOBILE_TOOL_ITEMS = [
    // All employees
    { id: 'leave', icon: CalendarDays, label: 'page.leaveManager', fallback: 'Nghỉ phép', path: '/app/nghi-phep', imgKey: 'nghi-phep' },
    { id: 'attendance', icon: Clock, label: 'page.attendanceTracker', fallback: 'Chấm công', path: '/app/cham-cong', imgKey: 'cham-cong' },
    { id: 'chat', icon: MessageCircle, label: 'Chat', fallback: 'Chat', path: '/app/chat', imgKey: 'chat' },
    // Manager only
    { id: 'meeting', icon: CalendarClock, label: 'sidebar.meetingRoom', fallback: 'Phòng họp', path: '/app/dat-lich-phong-hop', imgKey: 'dat-lich-phong-hop', managerOnly: true },
    { id: 'vehicle', icon: Truck, label: 'page.vehicleBooking', fallback: 'Đặt xe', path: '/app/dat-xe', imgKey: 'quan-ly-xe', managerOnly: true },
];

export default {
    Z_INDEX,
    SIDEBAR,
    BOTTOM_NAV_TABS,
    CHAT_WIDGET,
    HIDE_BOTTOM_NAV_PAGES,
    MOBILE,
    LIST_VIEW,
    MOBILE_TOOL_ITEMS,
    MANAGER_ROLES,
    hasManagerRole,
};
