import { memo } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { CARD, ICON } from '../../config/styles';

/**
 * Modern StatCard Component
 * Premium design matching weather card style
 */
const StatCard = ({
    label,
    value,
    trend,
    trendValue,
    icon: Icon,
    // eslint-disable-next-line no-unused-vars
    color = 'primary',
    className
}) => {
    const _colors = {
        primary: {
            icon: 'text-muted-foreground bg-muted/80 dark:bg-white/[0.06]',
            trend: { up: 'text-emerald-500', down: 'text-red-500' }
        },
        blue: {
            icon: 'text-muted-foreground bg-muted/80 dark:bg-white/[0.06]',
            trend: { up: 'text-emerald-500', down: 'text-red-500' }
        },
        emerald: {
            icon: 'text-muted-foreground bg-muted/80 dark:bg-white/[0.06]',
            trend: { up: 'text-emerald-500', down: 'text-red-500' }
        },
        amber: {
            icon: 'text-muted-foreground bg-muted/80 dark:bg-white/[0.06]',
            trend: { up: 'text-emerald-500', down: 'text-red-500' }
        },
        purple: {
            icon: 'text-muted-foreground bg-muted/80 dark:bg-white/[0.06]',
            trend: { up: 'text-emerald-500', down: 'text-red-500' }
        },
    };

    return (
        <div className={cn(CARD.hover, "p-4 md:p-5", className)}>
            {/* Subtle background */}

            <div className="relative flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-muted-foreground mb-1.5 md:mb-3 truncate">
                        {label}
                    </p>

                    <div className="flex items-baseline gap-2 md:gap-3 flex-wrap">
                        <span className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
                            {value}
                        </span>

                        {trend && trendValue && (
                            <span className={cn(
                                "inline-flex items-center gap-0.5 text-xs font-semibold px-1 md:px-1.5 py-0.5 rounded-full",
                                trend === 'up'
                                    ? "bg-emerald-500/10 text-emerald-500"
                                    : "bg-red-500/10 text-red-500"
                            )}>
                                {trend === 'up'
                                    ? <ArrowUpRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                    : <ArrowDownRight className="h-2.5 w-2.5 md:h-3 md:w-3" />
                                }
                                {trendValue}
                            </span>
                        )}
                    </div>
                </div>

                {Icon && (
                    <div className={cn(ICON.md, "shrink-0")}>
                        <Icon className={ICON.iconMd} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(StatCard);
