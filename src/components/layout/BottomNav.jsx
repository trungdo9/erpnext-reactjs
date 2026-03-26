/**
 * BottomNav — Native app-style bottom navigation for mobile
 *
 * 3 tabs: Home, Chat, Map
 * - 44px touch targets
 * - Active tab indicator (emerald dot)
 * - Unread badge on Chat tab
 * - Frosted glass backdrop
 * - Safe area padding for notched phones
 */

import { useLocation, useNavigate } from 'react-router-dom';
import useChatStore from '../../stores/useChatStore';
import { useTranslation } from '../../hooks/useTranslation';
import { BOTTOM_NAV_TABS, Z_INDEX } from '../../config/layout';

function isTabActive(tabPath, pathname) {
    if (tabPath === '/') return pathname === '/' || pathname === '/dashboard';
    return pathname.startsWith(tabPath);
}

const BottomNav = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Unread count for chat badge
    const unreadCounts = useChatStore(s => s.unreadCounts);
    const totalUnread = Object.values(unreadCounts).reduce((sum, c) => sum + (c || 0), 0);

    return (
        <nav
            className="fixed bottom-0 left-0 right-0 md:hidden"
            style={{ zIndex: Z_INDEX.bottomNav, paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
            aria-label="Bottom navigation"
        >
            {/* Frosted glass background */}
            <div className="absolute inset-0 bg-card/80 backdrop-blur-xl border-t border-border/60" />

            <div className="relative grid grid-cols-3 h-14">
                {BOTTOM_NAV_TABS.map((tab) => {
                    const active = isTabActive(tab.path, location.pathname);
                    const Icon = tab.icon;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            className="flex flex-col items-center justify-center gap-0.5 relative active:opacity-70 transition-opacity"
                            aria-label={t(tab.label)}
                            aria-current={active ? 'page' : undefined}
                        >
                            <div className="relative">
                                <Icon
                                    className={`w-[22px] h-[22px] transition-colors ${
                                        active
                                            ? 'text-emerald-500'
                                            : 'text-muted-foreground'
                                    }`}
                                    strokeWidth={active ? 2.2 : 1.8}
                                />
                                {/* Unread badge on Chat */}
                                {tab.id === 'chat' && totalUnread > 0 && (
                                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
                                        {totalUnread > 99 ? '99+' : totalUnread}
                                    </span>
                                )}
                            </div>
                            <span className={`text-[10px] font-medium leading-none ${
                                active ? 'text-emerald-500' : 'text-muted-foreground'
                            }`}>
                                {t(tab.label)}
                            </span>
                            {/* Active dot indicator */}
                            {active && (
                                <div className="absolute top-0.5 w-1 h-1 rounded-full bg-emerald-500" />
                            )}
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};

export default BottomNav;
