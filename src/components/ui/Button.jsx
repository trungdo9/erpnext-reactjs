import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Button Component - Steel ERP Blue Design
 * Premium gradient buttons with green accents
 */
const Button = ({
    children,
    variant = 'primary',
    size = 'default',
    className,
    isLoading,
    disabled,
    type = 'button',
    ...props
}) => {
    const variants = {
        // Primary - Brand gradient (emerald → green)
        primary: "bg-linear-to-r from-emerald-600 to-green-700 text-white font-semibold shadow-sm hover:from-emerald-700 hover:to-green-800 active:opacity-90",
        // Secondary - Light gray flat
        secondary: "bg-muted text-foreground hover:bg-accent",
        // Outline - Transparent with border
        outline: "bg-transparent border border-border text-foreground hover:bg-muted",
        // Ghost - Subtle hover
        ghost: "bg-transparent text-foreground hover:bg-muted active:bg-accent",
        // Danger - Gradient red
        danger: "bg-linear-to-r from-red-600 to-rose-600 text-white font-medium shadow-sm hover:from-red-700 hover:to-rose-700 active:opacity-90",
        // Success - Gradient green
        success: "bg-linear-to-r from-emerald-600 to-green-600 text-white font-medium shadow-sm hover:from-emerald-700 hover:to-green-700 active:opacity-90",
        // Link
        link: "text-primary underline-offset-4 hover:underline",
        // Info - Gradient teal
        info: "bg-linear-to-r from-teal-500 to-cyan-600 text-white font-semibold shadow-sm hover:from-teal-600 hover:to-cyan-700 active:opacity-90",
        // Warning - Gradient orange
        warning: "bg-linear-to-r from-amber-500 to-orange-500 text-white font-medium shadow-sm hover:from-amber-600 hover:to-orange-600 active:opacity-90",
    };

    const sizes = {
        sm: "h-10 md:h-9 px-3 md:px-2 text-xs rounded-lg",
        default: "h-11 md:h-10 px-4 md:px-3 text-sm rounded-lg",
        lg: "h-12 px-4 text-sm rounded-lg",
        icon: "h-11 w-11 md:h-10 md:w-10 rounded-lg",
        iconSm: "h-10 w-10 md:h-9 md:w-9 rounded-lg",
        iconLg: "h-12 w-12 rounded-lg",
    };

    return (
        <button
            type={type}
            disabled={disabled || isLoading}
            aria-busy={isLoading}
            aria-disabled={disabled || isLoading}
            className={cn(
                "inline-flex items-center justify-center gap-2",
                "whitespace-nowrap font-medium",
                "transition-colors duration-150",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                "disabled:pointer-events-none disabled:opacity-50",
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {children}
        </button>
    );
};

Button.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    disabled: PropTypes.bool,
    isLoading: PropTypes.bool,
    variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'link', 'info', 'warning']),
    size: PropTypes.oneOf(['sm', 'default', 'lg', 'icon', 'iconSm', 'iconLg']),
    className: PropTypes.string,
    type: PropTypes.oneOf(['button', 'submit', 'reset']),
};

export default Button;
