import { memo } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';
import { CARD, TRANSITION } from '../../config/styles';

/**
 * Card Component - Clean Corporate Design
 * Uses centralized styles from config/styles.js
 */
const Card = ({
    children,
    className,
    title,
    description,
    icon: Icon,
    iconColor = 'emerald',
    footer,
    variant = 'default',
    // eslint-disable-next-line no-unused-vars
    accent = false,
    // eslint-disable-next-line no-unused-vars
    interactive = false,
    noPadding = false,
    ...props
}) => {
    const variants = {
        default: CARD.hover,
        glass: [CARD.static, 'bg-card/80 dark:bg-white/[0.03]', TRANSITION.colors].join(' '),
        dark: [CARD.static, 'text-foreground', TRANSITION.colors].join(' '),
        gradient: ['text-white border-0', TRANSITION.colors].join(' '),
        primary: [CARD.static, 'hover:border-primary/30 dark:hover:border-primary/30', TRANSITION.colors].join(' '),
        solid: [CARD.static, TRANSITION.colors].join(' '),
    };

    // Inline styles for variants that need CSS custom properties
    const variantStyles = {
        gradient: { background: 'var(--gradient-brand)' },
    };

    const iconColors = {
        emerald: 'icon-container-emerald',
        amber: 'icon-container-amber',
        blue: 'icon-container-blue',
        purple: 'icon-container-purple',
        cyan: 'icon-container-cyan',
        rose: 'icon-container-rose',
    };

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-xl",
                variants[variant],
                className
            )}
            style={variantStyles[variant] || undefined}
            {...props}
        >
            {/* Header */}
            {(title || description || Icon) && (
                <div className="relative px-5 md:px-6 pt-5 md:pt-6 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        {Icon && (
                            <div className={cn("icon-container", iconColors[iconColor])}>
                                <Icon className="w-5 h-5" />
                            </div>
                        )}
                        <div>
                            {title && (
                                <h3 className="font-bold text-base tracking-tight text-foreground">
                                    {title}
                                </h3>
                            )}
                            {description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={cn(
                "relative",
                !noPadding && "p-5 md:p-6",
                !noPadding && (title || description || Icon) && "pt-5 md:pt-6"
            )}>
                {children}
            </div>

            {/* Footer */}
            {footer && (
                <div className="relative px-5 md:px-6 py-3 border-t border-border">
                    {footer}
                </div>
            )}
        </div>
    );
};

Card.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    icon: PropTypes.elementType,
    iconColor: PropTypes.oneOf(['emerald', 'amber', 'blue', 'purple', 'cyan', 'rose']),
    footer: PropTypes.node,
    variant: PropTypes.oneOf(['default', 'glass', 'dark', 'gradient', 'primary', 'solid']),
    accent: PropTypes.bool,
    noPadding: PropTypes.bool,
};

export default memo(Card);
