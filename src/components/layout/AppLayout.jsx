import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useCallback } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import useSidebarStore from '../../stores/useSidebarStore';
import Sidebar from './Sidebar';
import Header from './Header';
import BottomNav from './BottomNav';
import NetworkStatusBar from '../ui/NetworkStatusBar';
// AnnouncementBar removed - not needed for Steel ERP
import PWAInstallPrompt from '../ui/PWAInstallPrompt';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { NO_PADDING_PAGES } from '../../config/doctype.behaviors';
import { HIDE_BOTTOM_NAV_PAGES, SIDEBAR } from '../../config/layout';
// ChatWidget removed — replaced by contextual floating buttons in workspace pages

// 3D cinematic page transition (Metfone-inspired)
const pageTransitionFull = {
    initial: {
        opacity: 0,
        scale: 0.96,
        rotateY: -4,
        filter: 'blur(6px)',
    },
    animate: {
        opacity: 1,
        scale: 1,
        rotateY: 0,
        filter: 'blur(0px)',
        transition: {
            duration: 0.45,
            ease: [0.22, 1, 0.36, 1],
        },
    },
};

// Reduced-motion alternative: simple opacity fade, no transform/blur
const pageTransitionReduced = {
    initial: { opacity: 0 },
    animate: {
        opacity: 1,
        transition: { duration: 0.15, ease: 'easeOut' },
    },
};

const AppLayoutContent = () => {
    const { isOpen, isMobile, toggle: toggleSidebar, isCollapsed } = useSidebarStore();
    const navigate = useNavigate();
    const location = useLocation();
    const prefersReducedMotion = useReducedMotion();
    const pageTransition = prefersReducedMotion ? pageTransitionReduced : pageTransitionFull;
    const isNoPaddingPage = NO_PADDING_PAGES.includes(location.pathname);
    const hideBottomNav = HIDE_BOTTOM_NAV_PAGES.includes(location.pathname);

    // Global keyboard shortcuts
    const shortcutHandlers = useCallback(() => ({
        'navigate': (config) => navigate(config.path),
        'toggle-sidebar': () => toggleSidebar(),
        'command-palette': () => {
            window.dispatchEvent(new CustomEvent('toggle-command-palette'));
        },
        'toggle-theme': () => {
            document.documentElement.classList.toggle('dark');
        },
        'focus-search': () => {
            const searchInput = document.querySelector('[data-search-input]');
            if (searchInput) searchInput.focus();
        },
    }), [navigate, toggleSidebar]);

    useKeyboardShortcuts(undefined, shortcutHandlers());

    return (
        <div className="flex flex-col h-screen bg-background overflow-hidden font-sans text-foreground text-[14px]">
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
            >
                Skip to main content
            </a>
            {/* Network Status Bar - always visible at top above everything */}
            <NetworkStatusBar />
            <PWAInstallPrompt />
            {/* ChatWidget removed — replaced by contextual floating buttons */}

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar — only render on desktop (mobile uses BottomNav + slide-over) */}
                <Sidebar />

                {/* Main content area */}
                <div
                    className="flex-1 flex flex-col relative min-w-0 transition-[margin] duration-300 ease-out"
                    style={{
                        marginLeft: !isMobile && isOpen
                            ? (isCollapsed ? SIDEBAR.collapsedWidth : SIDEBAR.desktopWidth)
                            : 0,
                    }}
                >
                    <Header />

                    <main
                        id="main-content"
                        className={`relative flex-1 overflow-y-auto overflow-x-hidden ${isNoPaddingPage ? '' : 'p-4 md:p-6'} bg-background`}
                        style={{
                            backgroundImage: 'var(--gradient-mesh)',
                            // perspective only needed for the 3D rotateY page transition
                            perspective: prefersReducedMotion ? undefined : '1200px',
                            // Add bottom padding on mobile for BottomNav (56px nav + safe area)
                            paddingBottom: isMobile && !hideBottomNav && !isNoPaddingPage
                                ? 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 0.25rem)'
                                : undefined,
                        }}
                    >
                        {/* Aurora animated blobs — dark mode only, stays fixed while content scrolls.
                            Skipped entirely when the user prefers reduced motion (saves GPU work). */}
                        {!prefersReducedMotion && (
                            <div
                                className="sticky top-0 w-full pointer-events-none hidden dark:block"
                                style={{ height: 0, zIndex: 0 }}
                            >
                                <div
                                    className="absolute w-full overflow-hidden"
                                    style={{ height: '100vh', top: 0, filter: 'blur(30px)' }}
                                >
                                    <div style={{
                                        position: 'absolute', top: '10%', left: '-15%', width: '75%', height: '40%',
                                        background: 'linear-gradient(180deg, transparent, rgba(46,125,50,0.28) 40%, rgba(76,175,80,0.15) 70%, transparent)',
                                        borderRadius: '50%', animation: 'aurora1 18s ease-in-out infinite',
                                    }} />
                                    <div style={{
                                        position: 'absolute', top: '35%', right: '-10%', width: '65%', height: '30%',
                                        background: 'linear-gradient(180deg, transparent, rgba(76,175,80,0.2) 35%, rgba(0,150,136,0.1) 65%, transparent)',
                                        borderRadius: '50%', animation: 'aurora2 24s ease-in-out infinite',
                                    }} />
                                    <div style={{
                                        position: 'absolute', bottom: '5%', left: '15%', width: '55%', height: '18%',
                                        background: 'linear-gradient(180deg, transparent, rgba(255,215,0,0.06) 50%, transparent)',
                                        borderRadius: '50%', animation: 'aurora3 30s ease-in-out infinite',
                                    }} />
                                </div>
                            </div>
                        )}

                        <motion.div
                            key={location.pathname}
                            initial={pageTransition.initial}
                            animate={pageTransition.animate}
                            className={isNoPaddingPage ? 'h-full' : undefined}
                            style={{ transformStyle: prefersReducedMotion ? undefined : 'preserve-3d', position: 'relative', zIndex: 1 }}
                        >
                            <Outlet />
                        </motion.div>
                    </main>
                </div>
            </div>

            {/* Bottom Navigation — mobile only, hidden on full-screen pages */}
            {isMobile && !hideBottomNav && <BottomNav />}
        </div>
    );
};

const AppLayoutInner = () => {
    return (
        <AppLayoutContent />
    );
};

const AppLayout = () => {
    return (
        <AppLayoutInner />
    );
};

export default AppLayout;
