/**
 * FloatingActionButton (FAB) - Mobile action button
 *
 * Positioned at bottom-right for easy thumb access on mobile.
 */

import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Plus, X } from 'lucide-react';

export function FloatingActionButton({
    onClick,
    icon: Icon = Plus, // eslint-disable-line no-unused-vars
    label,
    variant = 'primary', // 'primary' | 'secondary' | 'danger'
    size = 'md', // 'sm' | 'md' | 'lg'
    className,
    disabled = false,
    loading = false,
    expanded = false,
    actions = [], // For expandable FAB
}) {
    const variants = {
        primary: 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm',
        secondary: 'bg-muted hover:bg-muted/80 text-foreground shadow-sm',
        danger: 'bg-destructive hover:bg-destructive/90 text-primary-foreground shadow-sm',
    };

    const sizes = {
        sm: 'w-12 h-12',
        md: 'w-14 h-14',
        lg: 'w-16 h-16',
    };

    const iconSizes = {
        sm: 'w-5 h-5',
        md: 'w-6 h-6',
        lg: 'w-7 h-7',
    };

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col-reverse items-center gap-3">
            {/* Expanded actions */}
            <AnimatePresence>
                {expanded &&
                    actions.map((action, index) => (
                        <motion.button
                            key={action.id || index}
                            initial={{ opacity: 0, scale: 0.5, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.5, y: 20 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={action.onClick}
                            disabled={action.disabled}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-full',
                                'bg-card shadow-lg',
                                'text-foreground',
                                'hover:bg-muted',
                                'transition-colors',
                                action.disabled && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            {action.icon && <action.icon className="w-5 h-5" />}
                            <span className="text-sm font-medium">{action.label}</span>
                        </motion.button>
                    ))}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClick}
                disabled={disabled || loading}
                aria-label={label || 'Action button'}
                className={cn(
                    'rounded-full shadow-lg flex items-center justify-center',
                    'transition-[color,background-color,box-shadow] duration-200',
                    sizes[size],
                    variants[variant],
                    disabled && 'opacity-50 cursor-not-allowed',
                    className
                )}
            >
                {loading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className={iconSizes[size]}
                    >
                        <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
                            <circle
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray="31.4 31.4"
                            />
                        </svg>
                    </motion.div>
                ) : expanded ? (
                    <X className={iconSizes[size]} />
                ) : (
                    <Icon className={iconSizes[size]} />
                )}
            </motion.button>

            {/* Label tooltip */}
            {label && !expanded && (
                <motion.span
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-card text-foreground text-sm whitespace-nowrap shadow-lg border border-border"
                >
                    {label}
                </motion.span>
            )}
        </div>
    );
}

FloatingActionButton.propTypes = {
    onClick: PropTypes.func.isRequired,
    icon: PropTypes.elementType,
    label: PropTypes.string,
    variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    className: PropTypes.string,
    disabled: PropTypes.bool,
    loading: PropTypes.bool,
    expanded: PropTypes.bool,
    actions: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string,
            label: PropTypes.string.isRequired,
            icon: PropTypes.elementType,
            onClick: PropTypes.func.isRequired,
            disabled: PropTypes.bool,
        })
    ),
};

export default FloatingActionButton;
