/**
 * MobileDataCard - Card view for table data on mobile
 *
 * Displays table row data as a card for better mobile UX.
 * Uses centralized STATUS tokens for consistent styling.
 */

import PropTypes from 'prop-types';
import { cn } from '../../lib/utils';
import { ChevronRight } from 'lucide-react';
import { STATUS } from '../../config/colors';
import { CARD, LIST_ITEM } from '../../config/styles';

export function MobileDataCard({
    data,
    columns,
    onClick,
    primaryField,
    secondaryField,
    statusField,
    className,
}) {
    const primaryValue = data[primaryField] || data.name;
    const secondaryValue = secondaryField ? data[secondaryField] : null;
    const status = statusField ? data[statusField] : null;

    // Get status color using centralized STATUS tokens
    const getStatusColor = (status) => {
        const statusLower = String(status).toLowerCase();
        if (statusLower.includes('active') || statusLower.includes('completed') || statusLower === '1') {
            return cn(STATUS.success.bg, STATUS.success.text);
        }
        if (statusLower.includes('pending') || statusLower.includes('draft')) {
            return cn(STATUS.warning.bg, STATUS.warning.text);
        }
        if (statusLower.includes('cancel') || statusLower.includes('reject') || statusLower === '0') {
            return cn(STATUS.error.bg, STATUS.error.text);
        }
        return cn(STATUS.neutral.bg, STATUS.neutral.text);
    };

    // Get other fields to display (excluding primary, secondary, status)
    const otherFields = columns.filter(
        (col) =>
            col.fieldname !== primaryField &&
            col.fieldname !== secondaryField &&
            col.fieldname !== statusField &&
            col.fieldname !== 'name'
    );

    return (
        <div
            onClick={onClick}
            className={cn(
                CARD.interactive,
                'relative p-4',
                !onClick && 'cursor-default',
                className
            )}
        >
            <div>
                {/* Header: Primary + Status */}
                <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                            {primaryValue}
                        </h3>
                        {secondaryValue && (
                            <p className="text-sm text-muted-foreground truncate">
                                {secondaryValue}
                            </p>
                        )}
                    </div>
                    {status && (
                        <span
                            className={cn(
                                'px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap',
                                getStatusColor(status)
                            )}
                        >
                            {status}
                        </span>
                    )}
                </div>

                {/* Other fields in grid */}
                {otherFields.length > 0 && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 pt-3 border-t border-border">
                        {otherFields.slice(0, 4).map((col) => (
                            <div key={col.fieldname} className="min-w-0">
                                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                    {col.label}
                                </span>
                                <p className="text-sm text-foreground truncate">
                                    {data[col.fieldname] || '-'}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chevron indicator */}
            {onClick && (
                <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />
            )}
        </div>
    );
}

MobileDataCard.propTypes = {
    data: PropTypes.object.isRequired,
    columns: PropTypes.arrayOf(
        PropTypes.shape({
            fieldname: PropTypes.string.isRequired,
            label: PropTypes.string,
        })
    ).isRequired,
    onClick: PropTypes.func,
    primaryField: PropTypes.string,
    secondaryField: PropTypes.string,
    statusField: PropTypes.string,
    className: PropTypes.string,
};

MobileDataCard.defaultProps = {
    primaryField: 'name',
};

export default MobileDataCard;
