/* eslint-disable react-hooks/static-components -- getIcon returns stable component refs from registry */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../../lib/utils';
import { getIcon } from '../../../config/icons';
import { getDoctypeImage } from '../../../config/doctype.behaviors';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { TRANSITION } from '../../../config/styles';

const SidebarItem = ({ item, onNavigate, compact = false, workspaceName }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();

    // Get translated label based on item type
    const getItemLabel = () => {
        // For doctypes, try doctype.{Doctype Name} (space) then underscore variant
        if (item.type === 'doctype' && item.doctype) {
            const spaceKey = `doctype.${item.doctype}`;
            const spaceResult = t(spaceKey, null);
            if (spaceResult !== spaceKey) return spaceResult;
            const underscoreKey = `doctype.${item.doctype.replace(/ /g, '_')}`;
            const underscoreResult = t(underscoreKey, null);
            if (underscoreResult !== underscoreKey) return underscoreResult;
        }
        // For menu pages, try menu.{id}
        if (item.type === 'menu-page') {
            const menuKey = `menu.${item.id.toLowerCase().replace(/ /g, '_')}`;
            const translated = t(menuKey, null);
            if (translated !== menuKey) return translated;
        }
        // Try sidebar.{id} as fallback
        const sidebarKey = `sidebar.${item.id.toLowerCase().replace(/ /g, '_')}`;
        const translated = t(sidebarKey, null);
        if (translated !== sidebarKey) return translated;
        // Final fallback to original label
        return item.label;
    };

    const itemLabel = getItemLabel();

    // Get icon from registry - returns a static component reference from a lookup map
     
    const IconComponent = React.useMemo(() => getIcon(item.icon), [item.icon]);

    // Get real image: try doctype, then page/report name, then id
     
    const dtImage = React.useMemo(
        () => getDoctypeImage(item.doctype) || getDoctypeImage(item.page) || getDoctypeImage(item.report) || getDoctypeImage(item.id),
        [item.doctype, item.page, item.report, item.id]
    );

    // Resolve Route dynamically based on type
    const resolveRoute = (item) => {
        if (item.type === 'page') {
            // Map dashboard pages to /dashboard
            if (item.page === 'main-dashboard' || item.page === 'production-dashboard') {
                return '/dashboard';
            }
            return `/app/${item.page}`;
        }
        if (item.type === 'menu-page') {
            // Explicit route for custom pages
            return item.route;
        }
        if (item.type === 'report') {
            // FIX: Add /app prefix to match router definition
            return `/app/report/${encodeURIComponent(item.report)}`;
        }
        if (item.type === 'doctype') {
            let path = `/app/doctype/${encodeURIComponent(item.doctype)}`;
            if (item.filters) {
                const filterStr = encodeURIComponent(JSON.stringify(item.filters));
                path += `?filters=${filterStr}`;
            }
            return path;
        }
        return '#';
    };

    const path = resolveRoute(item);

    // Check Active State
    const isActive = (currentPath, targetPath) => {
        // Dashboard matches both / and /dashboard
        if (targetPath === '/dashboard') {
            return currentPath === '/' || currentPath === '/dashboard';
        }
        // Remove query params for matching
        const cleanTarget = targetPath.split('?')[0];
        return currentPath.startsWith(cleanTarget);
    };

    const active = isActive(location.pathname, path);

    const handleClick = () => {
        navigate(path, { state: { label: itemLabel, workspace: workspaceName } });
        if (onNavigate) onNavigate();
    };

    // If collapsed, only show icon centered
    if (compact && !workspaceName) {
        // Logic might need adjustment: 'compact' usually means "inside a list" (small)
        // If we want 'collapsed' (sidebar closed), we need a new prop.
    }

    return (
        <div
            onClick={handleClick}
            title={compact ? undefined : itemLabel} // Show tooltip if collapsed logic applied later, for now sticking to simple fix
            className={cn(
                "group flex items-center justify-between rounded-lg cursor-pointer border border-transparent",
                TRANSITION.colors,
                compact
                    ? "px-2 py-1.5 text-[13px] mb-0.5"
                    : "px-3.5 py-2.5 text-sm mb-1",
                active
                    ? "bg-accent dark:bg-white/[0.06]"
                    : "hover:bg-accent/50 dark:hover:bg-white/[0.06]"
            )}
        >
            <div className={cn("flex items-center", compact ? "gap-2" : "gap-3")}>
                <div className={cn(
                    "flex items-center justify-center rounded-lg overflow-hidden",
                    TRANSITION.colors,
                    compact ? "w-6 h-6" : "w-8 h-8",
                    active
                        ? dtImage
                            ? "ring-1 ring-primary/50"
                            : "bg-primary/10 text-primary"
                        : dtImage
                            ? "ring-1 ring-border/50"
                            : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                )}>
                    {dtImage ? (
                        <img src={dtImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                        <IconComponent className={cn(
                            "flex-shrink-0",
                            compact ? "h-3.5 w-3.5" : "h-4 w-4",
                        )} />
                    )}
                </div>
                <span className={cn(
                    "truncate font-medium",
                    active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}>
                    {itemLabel}
                </span>
            </div>

            {/* Active Indicator (Dot) */}
            {active && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary mr-1" />
            )}
        </div>
    );
};

export default SidebarItem;
