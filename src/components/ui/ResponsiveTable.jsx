/**
 * ResponsiveTable - Table that switches to cards on mobile
 *
 * Provides optimal UX for both desktop and mobile views.
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './Table';
import MobileDataCard from './MobileDataCard';
import { cn } from '../../lib/utils';

const MOBILE_BREAKPOINT = 768;

export function ResponsiveTable({
    data,
    columns,
    onRowClick,
    primaryField,
    secondaryField,
    statusField,
    emptyMessage = 'No data available',
    className,
    loading,
}) {
    const [isMobile, setIsMobile] = useState(
        typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
    );

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
        };

        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className={cn('animate-pulse', className)}>
                {isMobile ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="h-24 bg-muted rounded-xl"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-64 bg-muted rounded-xl" />
                )}
            </div>
        );
    }

    // Empty state
    if (!data || data.length === 0) {
        return (
            <div
                className={cn(
                    'flex items-center justify-center h-40 rounded-xl border-2 border-dashed',
                    'border-border',
                    'text-muted-foreground',
                    className
                )}
            >
                {emptyMessage}
            </div>
        );
    }

    // Mobile: Card view
    if (isMobile) {
        return (
            <div className={cn('space-y-3', className)}>
                {data.map((row, index) => (
                    <MobileDataCard
                        key={row.name || index}
                        data={row}
                        columns={columns}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                        primaryField={primaryField}
                        secondaryField={secondaryField}
                        statusField={statusField}
                    />
                ))}
            </div>
        );
    }

    // Desktop: Table view
    return (
        <Table className={className}>
            <TableHeader>
                <TableRow>
                    {columns.map((col) => (
                        <TableHead key={col.fieldname}>{col.label || col.fieldname}</TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {data.map((row, index) => (
                    <TableRow
                        key={row.name || index}
                        onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                        {columns.map((col) => (
                            <TableCell key={col.fieldname}>
                                {row[col.fieldname] ?? '-'}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

ResponsiveTable.propTypes = {
    data: PropTypes.arrayOf(PropTypes.object),
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            fieldname: PropTypes.string.isRequired,
            label: PropTypes.string,
        })
    ).isRequired,
    onRowClick: PropTypes.func,
    primaryField: PropTypes.string,
    secondaryField: PropTypes.string,
    statusField: PropTypes.string,
    emptyMessage: PropTypes.string,
    className: PropTypes.string,
    loading: PropTypes.bool,
};

export default ResponsiveTable;
