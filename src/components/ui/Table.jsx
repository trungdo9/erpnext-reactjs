import { memo } from 'react';
import { cn } from '../../lib/utils';
import PropTypes from 'prop-types';

/**
 * Table Components - Frappe 16 Design
 * Neutral colors, compact rows, no amber accents
 */

export const Table = memo(({ children, className, fillHeight = false, noScroll = false }) => {
    return (
        <div className={cn(
            "relative w-full rounded-xl border border-border overflow-hidden",
            // Fill height mode: fill parent container height
            fillHeight && "h-full flex flex-col",
            className
        )}>
            <div className={cn(
                // noScroll: outer container handles scrolling
                noScroll ? "" : "overflow-auto",
                // fillHeight mode: fill remaining space
                !noScroll && (fillHeight ? "flex-1" : "max-h-[60vh] md:max-h-[75vh]")
            )}>
                <table className="w-full caption-bottom text-xs md:text-sm">
                    {children}
                </table>
            </div>
        </div>
    );
});
Table.displayName = 'Table';

export const TableHeader = memo(({ children, className }) => (
    <thead className={cn(
        "sticky top-0 z-10 bg-muted",
        className
    )}>
        {children}
    </thead>
));
TableHeader.displayName = 'TableHeader';

export const TableBody = memo(({ children, className }) => (
    <tbody className={cn("bg-card", className)}>
        {children}
    </tbody>
));
TableBody.displayName = 'TableBody';

export const TableRow = memo(({ children, className, ...props }) => (
    <tr
        className={cn(
            "transition-colors duration-150 border-b border-border/60",
            "hover:bg-muted/50",
            "cursor-pointer",
            className
        )}
        {...props}
    >
        {children}
    </tr>
));
TableRow.displayName = 'TableRow';

export const TableHead = memo(({ children, className }) => (
    <th className={cn(
        "h-10 md:h-[30px] px-2 md:px-4 text-left align-middle",
        "font-semibold uppercase tracking-wider text-xs md:text-[11px]",
        "text-muted-foreground",
        "border-r border-border/30 dark:border-white/[0.04] last:border-r-0",
        "relative",
        className
    )}>
        {children}
    </th>
));
TableHead.displayName = 'TableHead';

export const TableCell = memo(({ children, className, ...props }) => (
    <td className={cn(
        "px-2 md:px-4 py-2.5 md:py-2 align-middle",
        "text-foreground",
        "border-r border-border/30 last:border-r-0",
        className
    )} {...props}>
        {children}
    </td>
));
TableCell.displayName = 'TableCell';

export const TableFooter = memo(({ children, className }) => (
    <tfoot className={cn(
        "sticky bottom-0 z-10",
        "border-t border-border",
        "bg-muted font-medium text-muted-foreground",
        className
    )}>
        {children}
    </tfoot>
));
TableFooter.displayName = 'TableFooter';

Table.propTypes = { children: PropTypes.node, className: PropTypes.string, fillHeight: PropTypes.bool, noScroll: PropTypes.bool };
TableHeader.propTypes = { children: PropTypes.node, className: PropTypes.string };
TableBody.propTypes = { children: PropTypes.node, className: PropTypes.string };
TableRow.propTypes = { children: PropTypes.node, className: PropTypes.string };
TableHead.propTypes = { children: PropTypes.node, className: PropTypes.string };
TableCell.propTypes = { children: PropTypes.node, className: PropTypes.string };
TableFooter.propTypes = { children: PropTypes.node, className: PropTypes.string };
