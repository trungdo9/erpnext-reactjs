/* eslint-disable react-hooks/static-components -- getIcon returns stable component refs from registry */
/**
 * WorkspaceItem - Premium workspace item in sidebar
 *
 * Features:
 * - Colored icon backgrounds based on workspace type
 * - Smooth expand/collapse animations
 * - Active state with gradient accent
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { getIcon } from '../../../config/icons';
import { getWorkspaceImage, CUSTOM_WORKSPACE_REDIRECTS } from '../../../config/doctype.behaviors';
import { useWorkspaceChildren } from '../../../hooks/useDynamicSidebar';
import { useTranslation } from '../../../hooks/useTranslation';
import SidebarItem from './SidebarItem';
import { TRANSITION } from '../../../config/styles';

/**
 * Single unified accent color for all workspace icons.
 * Using brand blue keeps the sidebar clean and professional
 * instead of a rainbow of 16+ different colors.
 */


const WorkspaceItem = ({ workspace, isExpanded, onToggle, onNavigate, isCollapsed }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();

    // Fetch children only when expanded
    const { children, isLoading: childrenLoading } = useWorkspaceChildren(
        workspace.name,
        isExpanded
    );

    // Get icon component and workspace image
     
    const IconComponent = React.useMemo(
        () => getIcon(workspace.icon),
        [workspace.icon]
    );

    const workspaceImage = React.useMemo(
        () => getWorkspaceImage(workspace.name) || getWorkspaceImage(workspace.label),
        [workspace.name, workspace.label]
    );

    // Check if this workspace is active (any child route is active)
    const redirect = CUSTOM_WORKSPACE_REDIRECTS[workspace.name];
    const isActive = redirect
        ? location.pathname.startsWith(redirect)
        : location.pathname.includes(`/workspace/${encodeURIComponent(workspace.name)}`);

    const handleClick = () => {
        // Custom workspace redirect (e.g. Production Hub replaces workspace page)
        const redirect = CUSTOM_WORKSPACE_REDIRECTS[workspace.name];
        if (redirect) {
            navigate(redirect);
        } else {
            navigate(`/app/workspace/${encodeURIComponent(workspace.name)}`);
        }
        if (onNavigate) onNavigate();
    };

    const handleToggle = (e) => {
        e.stopPropagation();
        onToggle(workspace.name);
    };

    // Render children items when expanded
    const renderChildren = () => {
        if (!isExpanded) return null;

        if (childrenLoading) {
            return (
                <div className="ml-11 py-3 flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-xs">{t('common.loading')}</span>
                </div>
            );
        }

        const { shortcuts, linkGroups } = children;
        const hasChildren = shortcuts?.length > 0 || Object.keys(linkGroups || {}).length > 0;

        if (!hasChildren) {
            return (
                <div className="ml-11 py-3 text-xs text-muted-foreground italic">
                    {t('workspace.no_items')}
                </div>
            );
        }

        return (
            <div className="ml-6 mt-1 pl-4 border-l border-border space-y-0.5">
                {/* Render shortcuts first */}
                {shortcuts?.map((item) => (
                    <SidebarItem
                        key={item.id}
                        item={item}
                        onNavigate={onNavigate}
                        compact
                        workspaceName={workspace.name}
                    />
                ))}

                {/* Render link groups */}
                {Object.entries(linkGroups || {}).map(([groupName, items]) => (
                    <div key={groupName} className="mt-2">
                        {groupName !== 'Other' && (
                            <div className="text-[11px] font-semibold text-foreground px-2 py-1.5 uppercase tracking-wider">
                                {groupName}
                            </div>
                        )}
                        {items.map((item) => (
                            <SidebarItem
                                key={item.id}
                                item={item}
                                onNavigate={onNavigate}
                                compact
                                workspaceName={workspace.name}
                            />
                        ))}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="mb-1">
            <div
                onClick={handleClick}
                title={isCollapsed ? t(`workspace.name.${workspace.name}`, workspace.label) : undefined}
                className={cn(
                    "group relative flex items-center justify-between rounded-lg text-sm cursor-pointer border border-transparent",
                    TRANSITION.colors,
                    isCollapsed ? "justify-center px-0 py-2.5 mx-auto w-full" : "px-3.5 py-2.5",
                    isActive
                        ? "bg-accent dark:bg-white/[0.06]"
                        : "hover:bg-accent/50 dark:hover:bg-white/[0.06]"
                )}
            >
                <div className={cn("flex items-center min-w-0", isCollapsed ? "gap-0 justify-center w-full" : "gap-3")}>
                    {/* Icon */}
                    <div className={cn(
                        "flex items-center justify-center rounded-lg overflow-hidden w-8 h-8",
                        TRANSITION.colors,
                        isActive
                            ? workspaceImage
                                ? "ring-1 ring-primary/50"
                                : "bg-primary/10 text-primary"
                            : workspaceImage
                                ? "ring-1 ring-border/50"
                                : "text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
                    )}>
                        {workspaceImage ? (
                            <img src={workspaceImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                            <IconComponent className="flex-shrink-0 h-4 w-4" />
                        )}
                    </div>
                    {!isCollapsed && (
                        <span className={cn(
                            "truncate font-medium",
                            isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}>
                            {t(`workspace.name.${workspace.name}`, workspace.label)}
                        </span>
                    )}
                </div>

                {/* Expand/collapse indicator */}
                {workspace.hasChildren && !isCollapsed && (
                    <button
                        onClick={handleToggle}
                        className={cn(
                            "p-1 rounded-md ml-2 hover:bg-muted/50",
                            TRANSITION.colors,
                            isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {isExpanded
                            ? <ChevronDown className="h-3.5 w-3.5" />
                            : <ChevronRight className="h-3.5 w-3.5" />
                        }
                    </button>
                )}

                {/* Active Indicator (Dot) - Only if active and NOT expanded (to avoid visual cutter) */}
                {isActive && !isExpanded && !isCollapsed && (
                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-primary" />
                )}
            </div>

            {/* Children (expanded content) */}
            {!isCollapsed && (
                <div className={cn(
                    "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
                    isExpanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0 mt-0"
                )}>
                    <div className="overflow-hidden">
                        {renderChildren()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspaceItem;
