/**
 * Sidebar Store - Zustand
 *
 * Manages sidebar open/close state and mobile detection.
 * Replaces SidebarContext.jsx.
 *
 * Usage:
 * import useSidebarStore from '../stores/useSidebarStore';
 * const { isOpen, isMobile, toggle, open, close } = useSidebarStore();
 */

import { create } from 'zustand';
import { SIDEBAR } from '../config/layout';

const MOBILE_BREAKPOINT = SIDEBAR.breakpoint;

const useSidebarStore = create((set) => ({
    isOpen: typeof window !== 'undefined' ? window.innerWidth >= MOBILE_BREAKPOINT : true,
    isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,

    // Desktop collapse state - persist to localStorage
    isCollapsed: typeof window !== 'undefined' ? (localStorage.getItem('sidebar-collapsed') === 'true') : false,

    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),

    toggleCollapse: () => set((state) => {
        const newCollapsed = !state.isCollapsed;
        localStorage.setItem('sidebar-collapsed', newCollapsed);
        return { isCollapsed: newCollapsed };
    }),

    setCollapsed: (collapsed) => {
        localStorage.setItem('sidebar-collapsed', collapsed);
        set({ isCollapsed: collapsed });
    },

    // Called by resize listener
    _handleResize: () => {
        const mobile = window.innerWidth < MOBILE_BREAKPOINT;
        set({ isMobile: mobile, isOpen: !mobile });
    },
}));

// Initialize resize listener
if (typeof window !== 'undefined') {
    window.addEventListener('resize', () => {
        useSidebarStore.getState()._handleResize();
    });
}

export default useSidebarStore;
