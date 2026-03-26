/**
 * DataTable - Shared TanStack Table renderer
 *
 * Used by DynamicListView and ReportPage for consistent table rendering.
 * Takes a TanStack Table instance and handles all rendering:
 * - Dual scrollbar (top + main)
 * - Sticky header with sort indicators
 * - Body rows with click handling
 * - Summary footer row
 * - Loading/empty states
 */

import { memo, useRef, useEffect } from 'react';
import { flexRender } from '@tanstack/react-table';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';
import { ArrowUp, ArrowDown, ArrowUpDown, Loader2 } from 'lucide-react';
import EmptyState from './EmptyState';
import { cn } from '../../lib/utils';
import PropTypes from 'prop-types';

const DataTable = memo(({
    // TanStack Table instance (required)
    table,

    // Rows to display (subset for pagination; defaults to table.getRowModel().rows)
    rows,

    // Loading / empty states
    loading = false,
    loadingMessage = 'Loading...',
    emptyMessage = 'No data',

    // Row interaction
    onRowClick,
    rowClassName,

    // Summary footer
    calculateTotal,
    dataLength,
    countColumnId,

    // Container
    maxHeight = 'calc(100vh - 220px)',
    showDualScrollbar = false,

    // Header customization
    // renderHeaderCell(header, sortIndicator) => ReactNode
    // If provided, replaces the default header button for non-special columns
    renderHeaderCell,
    // Column IDs that render header content directly (e.g. checkbox, status dot)
    specialColumns = [],
}) => {
    const displayRows = rows || table.getRowModel().rows;
    const allColumns = table.getAllColumns();

    // Dual scrollbar refs
    const topScrollRef = useRef(null);
    const mainScrollRef = useRef(null);
    const topScrollInnerRef = useRef(null);
    const isScrollingRef = useRef(false);

    // Sync top scrollbar width with main table
    useEffect(() => {
        if (!showDualScrollbar) return;
        const syncWidth = () => {
            if (mainScrollRef.current && topScrollInnerRef.current) {
                topScrollInnerRef.current.style.width = `${mainScrollRef.current.scrollWidth}px`;
            }
        };
        syncWidth();
        const timer = setTimeout(syncWidth, 100);
        return () => clearTimeout(timer);
    }, [displayRows, allColumns, showDualScrollbar]);

    const handleTopScroll = (e) => {
        if (isScrollingRef.current) return;
        isScrollingRef.current = true;
        if (mainScrollRef.current) mainScrollRef.current.scrollLeft = e.target.scrollLeft;
        requestAnimationFrame(() => { isScrollingRef.current = false; });
    };

    const handleMainScroll = (e) => {
        if (!showDualScrollbar || isScrollingRef.current) return;
        isScrollingRef.current = true;
        if (topScrollRef.current) topScrollRef.current.scrollLeft = e.target.scrollLeft;
        requestAnimationFrame(() => { isScrollingRef.current = false; });
    };

    // Determine which column shows the row count in footer
    const resolvedCountColumnId = countColumnId || allColumns[0]?.id;

    return (
        <div className="relative w-full min-w-0">
            {/* Top scrollbar - synced with main table */}
            {showDualScrollbar && (
                <div
                    ref={topScrollRef}
                    className="overflow-x-auto overflow-y-hidden sticky top-0 z-10 bg-card"
                    style={{ height: '14px' }}
                    onScroll={handleTopScroll}
                >
                    <div ref={topScrollInnerRef} style={{ height: '1px', minWidth: '100%' }} />
                </div>
            )}

            {/* Main table */}
            <div
                ref={mainScrollRef}
                className="w-full overflow-x-auto overflow-y-auto"
                style={{ maxHeight }}
                onScroll={handleMainScroll}
            >
                <Table className="w-full border-t-2 border-t-primary" noScroll>
                    <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                        {table.getHeaderGroups().map(headerGroup => (
                            <TableRow key={headerGroup.id} className="border-b border-border">
                                {headerGroup.headers.map(header => {
                                    const colAlign = header.column.columnDef.meta?.align || 'text-left';
                                    const justifyClass = colAlign === 'text-right' ? 'justify-end'
                                        : colAlign === 'text-center' ? 'justify-center' : 'justify-start';
                                    const isSpecial = specialColumns.includes(header.id);

                                    // Sort indicator element
                                    const isSorted = header.column.getIsSorted();
                                    const sortIndicator = isSorted === 'desc'
                                        ? <ArrowDown className="h-3 w-3 shrink-0 text-primary" />
                                        : isSorted === 'asc'
                                            ? <ArrowUp className="h-3 w-3 shrink-0 text-primary" />
                                            : <ArrowUpDown className="h-3 w-3 shrink-0 opacity-20 group-hover:opacity-50" />;

                                    return (
                                        <TableHead key={header.id} className={`relative group whitespace-nowrap ${colAlign}`}>
                                            {isSpecial ? (
                                                flexRender(header.column.columnDef.header, header.getContext())
                                            ) : renderHeaderCell ? (
                                                renderHeaderCell(header, sortIndicator, justifyClass)
                                            ) : (
                                                <button
                                                    onClick={header.column.getToggleSortingHandler()}
                                                    className={`inline-flex items-center gap-1.5 w-full text-muted-foreground font-semibold text-[11px] hover:text-foreground transition-colors whitespace-nowrap ${justifyClass}`}
                                                >
                                                    <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                                    {sortIndicator}
                                                </button>
                                            )}
                                        </TableHead>
                                    );
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>

                    <TableBody>
                        {loading && displayRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={allColumns.length} className="h-24 text-center">
                                    <div className="flex justify-center items-center text-muted-foreground">
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        {loadingMessage}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading && displayRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={allColumns.length}>
                                    <EmptyState
                                        type="no-data"
                                        title={emptyMessage}
                                        size="sm"
                                    />
                                </TableCell>
                            </TableRow>
                        )}
                        {displayRows.map(row => (
                            <TableRow
                                key={row.id}
                                className={cn(
                                    "border-b border-border hover:bg-muted/50 transition-colors",
                                    onRowClick && "cursor-pointer",
                                    typeof rowClassName === 'function' ? rowClassName(row) : rowClassName,
                                )}
                                onClick={() => onRowClick?.(row)}
                            >
                                {row.getVisibleCells().map(cell => (
                                    <TableCell
                                        key={cell.id}
                                        className={`text-[13px] whitespace-nowrap ${cell.column.columnDef.meta?.align || 'text-left'}`}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}
                    </TableBody>

                    {/* Summary footer row */}
                    {displayRows.length > 0 && calculateTotal && (
                        <tfoot className="sticky bottom-0 z-10 bg-card border-t-2 border-primary/20">
                            <tr>
                                {allColumns.map(column => {
                                    const colAlign = column.columnDef.meta?.align || 'text-left';
                                    const total = calculateTotal(column.id);
                                    const showCount = column.id === resolvedCountColumnId && dataLength != null;
                                    return (
                                        <td
                                            key={column.id}
                                            className={`px-2 md:px-4 py-2 text-xs font-semibold whitespace-nowrap ${colAlign} text-foreground`}
                                        >
                                            {showCount ? dataLength : total || ''}
                                        </td>
                                    );
                                })}
                            </tr>
                        </tfoot>
                    )}
                </Table>
            </div>
        </div>
    );
});

DataTable.displayName = 'DataTable';

DataTable.propTypes = {
    table: PropTypes.object.isRequired,
    rows: PropTypes.array,
    loading: PropTypes.bool,
    loadingMessage: PropTypes.string,
    emptyMessage: PropTypes.string,
    onRowClick: PropTypes.func,
    rowClassName: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
    calculateTotal: PropTypes.func,
    dataLength: PropTypes.number,
    countColumnId: PropTypes.string,
    maxHeight: PropTypes.string,
    showDualScrollbar: PropTypes.bool,
    renderHeaderCell: PropTypes.func,
    specialColumns: PropTypes.arrayOf(PropTypes.string),
};

export default DataTable;
