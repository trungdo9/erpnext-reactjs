import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import SidebarItem from './SidebarItem';
import { cn } from '../../../lib/utils';
import { useTranslation } from '../../../hooks/useTranslation';

const SidebarGroup = ({ group, onNavigate }) => {
    const { t } = useTranslation();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Render all items defined in the config
    const visibleItems = group.items;

    // Translate group label using sidebar.{id} key, fallback to original label
    const groupLabel = t(`sidebar.${group.id}`, group.label);

    // If no items, hide the group entirely (or show empty?)
    if (!visibleItems || visibleItems.length === 0) return null;

    return (
        <div className="mb-4 px-2">
            <div
                className="flex items-center justify-between px-3 py-2 mb-1 cursor-pointer group rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors duration-200">
                    {groupLabel}
                </span>
                <div className="text-muted-foreground/50 group-hover:text-foreground/80 transition-colors">
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </div>
            </div>

            <div className={cn(
                "space-y-0.5 overflow-hidden transition-[max-height,opacity] duration-300 ease-in-out",
                isCollapsed ? "max-h-0 opacity-0" : "max-h-[500px] opacity-100"
            )}>
                {visibleItems.map(item => (
                    <SidebarItem
                        key={item.id}
                        item={item}
                        onNavigate={onNavigate}
                    />
                ))}
            </div>
        </div>
    );
};

export default SidebarGroup;
