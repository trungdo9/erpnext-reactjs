import { memo } from 'react';
import { cn } from '../../lib/utils';
import PropTypes from 'prop-types';
import { STATUS } from '../../config/colors';

/**
 * Badge Component
 * Uses centralized status colors for consistency
 */
const SR_LABELS = {
    success: 'Success: ',
    warning: 'Warning: ',
    error: 'Error: ',
    info: 'Info: ',
    destructive: 'Error: ',
};

const Badge = ({ children, variant = "default", className }) => {
    const variants = {
        // Default - Subtle muted
        default: "border-transparent bg-muted text-foreground",

        // Secondary - Muted appearance
        secondary: cn(
            "border-transparent",
            "bg-secondary text-secondary-foreground",
            "hover:bg-secondary/80"
        ),

        // Status variants - Use theme CSS variables with opacity for backgrounds
        success: "border-transparent bg-success/10 text-success",
        warning: "border-transparent bg-warning/10 text-warning",
        error: "border-transparent bg-error/10 text-error",
        info: "border-transparent bg-info/10 text-info",

        // Alias for destructive (maps to error)
        destructive: "border-transparent bg-destructive/10 text-destructive",

        // Outline variant
        outline: "text-foreground border-border",

        // Neutral/muted
        neutral: "border-transparent bg-muted text-muted-foreground",
    };

    const srLabel = SR_LABELS[variant];

    return (
        <div className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
            "transition-colors duration-200",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
            variants[variant],
            className
        )}>
            {srLabel && <span className="sr-only">{srLabel}</span>}
            {children}
        </div>
    );
};

Badge.propTypes = {
    children: PropTypes.node.isRequired,
    variant: PropTypes.oneOf(['default', 'secondary', 'success', 'warning', 'error', 'info', 'destructive', 'outline', 'neutral']),
    className: PropTypes.string,
};

export default memo(Badge);
