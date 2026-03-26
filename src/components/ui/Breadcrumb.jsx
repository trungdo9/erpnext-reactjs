/**
 * Breadcrumb - Reusable breadcrumb navigation component
 *
 * Supports:
 * - Multiple items with labels and optional icons
 * - Click handlers for navigation
 * - Active state for current page
 * - Responsive design
 */

import { memo } from 'react';
import PropTypes from 'prop-types';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Single breadcrumb item
 */
const BreadcrumbItem = memo(({ item, isLast, onClick }) => {
    const IconComponent = item.icon;
    const isClickable = !isLast && (item.onClick || item.href || onClick);

    const handleClick = (e) => {
        if (!isClickable) return;

        e.preventDefault();
        if (item.onClick) {
            item.onClick();
        } else if (onClick) {
            onClick(item);
        }
    };

    const content = (
        <>
            {IconComponent && (
                <IconComponent className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
            )}
            <span className="truncate">{item.label}</span>
        </>
    );

    if (isClickable) {
        return (
            <button
                onClick={handleClick}
                className={cn(
                    "flex items-center max-w-[200px]",
                    "text-muted-foreground hover:text-foreground",
                    "transition-colors duration-150",
                    "group"
                )}
            >
                {content}
            </button>
        );
    }

    return (
        <span className={cn(
            "flex items-center max-w-[250px]",
            isLast ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
            {content}
        </span>
    );
});
BreadcrumbItem.displayName = 'BreadcrumbItem';

BreadcrumbItem.propTypes = {
    item: PropTypes.shape({
        label: PropTypes.string.isRequired,
        href: PropTypes.string,
        onClick: PropTypes.func,
        icon: PropTypes.elementType
    }).isRequired,
    isLast: PropTypes.bool,
    onClick: PropTypes.func
};

/**
 * Breadcrumb separator
 */
const BreadcrumbSeparator = memo(({ separator }) => (
    <span className="text-muted-foreground/50 mx-1.5 flex-shrink-0">
        {separator || <ChevronRight className="w-3.5 h-3.5" />}
    </span>
));
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

BreadcrumbSeparator.propTypes = {
    separator: PropTypes.node
};

/**
 * Main Breadcrumb component
 */
const Breadcrumb = ({
    items = [],
    separator,
    showHome = false,
    homeHref = '/dashboard',
    onHomeClick,
    onItemClick,
    className
}) => {
    if (items.length === 0 && !showHome) return null;

    // Build items array with optional home
    const allItems = showHome
        ? [{ label: 'Home', href: homeHref, onClick: onHomeClick, icon: Home }, ...items]
        : items;

    return (
        <nav
            aria-label="Breadcrumb"
            className={cn(
                "flex items-center text-sm overflow-x-auto scrollbar-hide",
                className
            )}
        >
            <ol className="flex items-center">
                {allItems.map((item, index) => {
                    const isLast = index === allItems.length - 1;

                    return (
                        <li key={item.label || item.path || index} className="flex items-center">
                            <BreadcrumbItem
                                item={item}
                                isLast={isLast}
                                onClick={onItemClick}
                            />
                            {!isLast && <BreadcrumbSeparator separator={separator} />}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};

Breadcrumb.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        href: PropTypes.string,
        onClick: PropTypes.func,
        icon: PropTypes.elementType
    })),
    separator: PropTypes.node,
    showHome: PropTypes.bool,
    homeHref: PropTypes.string,
    onHomeClick: PropTypes.func,
    onItemClick: PropTypes.func,
    className: PropTypes.string
};

/**
 * PageBreadcrumb - Convenience wrapper for page-level breadcrumbs
 * Includes common styling and home link
 */
export const PageBreadcrumb = memo(({
    items = [],
    onNavigate,
    className
}) => {
    const handleItemClick = (item) => {
        if (onNavigate && item.href) {
            onNavigate(item.href);
        }
    };

    return (
        <Breadcrumb
            items={items}
            showHome={true}
            onHomeClick={() => onNavigate?.('/dashboard')}
            onItemClick={handleItemClick}
            className={cn("mb-4", className)}
        />
    );
});
PageBreadcrumb.displayName = 'PageBreadcrumb';

PageBreadcrumb.propTypes = {
    items: PropTypes.arrayOf(PropTypes.shape({
        label: PropTypes.string.isRequired,
        href: PropTypes.string,
        onClick: PropTypes.func,
        icon: PropTypes.elementType
    })),
    onNavigate: PropTypes.func,
    className: PropTypes.string
};

export default memo(Breadcrumb);
