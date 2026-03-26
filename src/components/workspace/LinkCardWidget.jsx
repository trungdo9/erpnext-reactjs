/**
 * Link Card Widget
 *
 * Displays a card with grouped links (similar to ERPNext Link Cards)
 * Each card has a title and contains multiple links to doctypes/pages
 */

import { memo } from 'react';
import { ChevronRight, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getIcon } from '../../config/icons';
import { getDoctypeImage } from '../../config/doctype.behaviors';
import { useTranslation } from '../../hooks/useTranslation';
import { CARD, LIST_ITEM, TABLE, TRANSITION } from '../../config/styles';

const LinkCardWidget = memo(function LinkCardWidget({ linkCard, onNavigate }) {
    const { getWidgetLabel, getDoctypeLabel } = useTranslation();
    // Get icon component using centralized icon registry
    const getIconComponent = (iconName) => {
        return getIcon(iconName, FileText);
    };

    // Handle link click - calls onNavigate(type, linkTo, url)
    const handleLinkClick = (link) => {
        if (typeof onNavigate !== 'function') return;

        if (link.type === 'URL' && link.url) {
            onNavigate('URL', null, link.url);
        } else if (link.link_to) {
            onNavigate(link.type, link.link_to);
        }
    };

    if (!linkCard || !linkCard.links || linkCard.links.length === 0) {
        return null;
    }

    return (
        <div className={cn(CARD.static, "overflow-hidden h-full", TRANSITION.colors)}>
            {/* Card Header */}
            {linkCard.label && (
                <div className={CARD.header}>
                    <h3 className="text-sm font-semibold text-foreground">
                        {getWidgetLabel(linkCard.label)}
                    </h3>
                </div>
            )}

            {/* Links List */}
            <div className={cn("divide-y", TABLE.divider)}>
                {linkCard.links.map((link, index) => {
                    const dtImage = getDoctypeImage(link.link_to);
                    const IconComponent = getIconComponent(link.icon);

                    return (
                        <button
                            key={link.label || link.linkTo || index}
                            onClick={() => handleLinkClick(link)}
                            className={cn(
                                "w-full px-4 py-3 flex items-center justify-between text-left group",
                                "hover:bg-accent/50 dark:hover:bg-white/[0.06]",
                                "active:bg-accent dark:active:bg-white/[0.08]",
                                TRANSITION.colors,
                            )}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                {/* Icon or Image */}
                                {dtImage ? (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden">
                                        <img src={dtImage} alt="" className="w-full h-full object-cover" loading="lazy" />
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "flex-shrink-0 w-8 h-8 rounded-lg",
                                        "flex items-center justify-center",
                                        "bg-muted/80 dark:bg-white/[0.06] text-muted-foreground",
                                    )}>
                                        <IconComponent className="h-4 w-4" />
                                    </div>
                                )}

                                {/* Label & Description */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {getWidgetLabel(link.label) || getDoctypeLabel(link.link_to)}
                                    </p>
                                    {link.description && (
                                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                                            {link.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Arrow */}
                            <ChevronRight className={cn(LIST_ITEM.chevron, "ml-2")} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

export default LinkCardWidget;
