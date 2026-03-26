import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { CARD_COLORS, getDoctypeColor } from '../../config/colors';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { LIST_ITEM, LAYOUT } from '../../config/styles';

/**
 * MenuCard - Reusable card component for menu/action items
 *
 * @param {Object} props
 * @param {string} props.id - Unique identifier (used for color mapping and routing)
 * @param {string} props.label - Display label
 * @param {React.ComponentType} props.icon - Lucide icon component
 * @param {string} [props.color] - Color scheme name (auto-detected from id if not provided)
 * @param {string} [props.description] - Optional description text
 * @param {string} [props.route] - Custom route (defaults to /app/doctype/{id})
 * @param {Function} [props.onClick] - Custom click handler (overrides navigation)
 * @param {string} [props.className] - Additional CSS classes
 */
const MenuCard = ({
    id,
    label,
    // eslint-disable-next-line no-unused-vars -- Used as JSX component below
    icon: IconComponent,
    color,
    description,
    route,
    onClick,
    className,
}) => {
    const navigate = useNavigate();
    const { t } = useTranslation();

    // Auto-detect color from doctype ID if not provided
    const colorName = color || getDoctypeColor(id);
    const colorScheme = CARD_COLORS[colorName] || CARD_COLORS.blue;

    const defaultRoute = `/app/doctype/${id}`;

    const handleClick = () => {
        if (onClick) {
            onClick();
        } else {
            navigate(route || defaultRoute, { state: { label } });
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(LIST_ITEM.card, className)}
        >
            {/* Icon */}
            <div
                className={cn(
                    'flex items-center justify-center w-11 h-11 rounded-lg shrink-0',
                    colorScheme.bg,
                )}
            >
                <IconComponent className={cn("h-5 w-5", colorScheme.text)} />
            </div>

            {/* Text content */}
            <div className="flex flex-col items-start min-w-0 flex-1 gap-0.5">
                <span className="text-sm font-semibold text-foreground truncate w-full text-left">
                    {label}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full text-left">
                    {description || t('menu.entry_for', { doctype: label })}
                </span>
            </div>

            {/* Arrow */}
            <ChevronRight className={LIST_ITEM.chevron} />
        </div>
    );
};

/**
 * MenuCardGrid - Container for MenuCard items with responsive grid layout
 */
export const MenuCardGrid = ({ children, className }) => (
    <div className={cn(LAYOUT.grid, className)}>
        {children}
    </div>
);

/**
 * MenuPageHeader - Consistent header for menu pages
 */
export const MenuPageHeader = ({ title, subtitle }) => {
    const { t } = useTranslation();
    return (
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
                {title}
            </h1>
            <p className="text-muted-foreground">
                {subtitle || t('menu.select_operation')}
            </p>
        </div>
    );
};

export default MenuCard;
