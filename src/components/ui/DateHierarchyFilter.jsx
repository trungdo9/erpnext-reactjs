import { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { ChevronRight, ChevronDown, Calendar } from 'lucide-react';

/**
 * Hierarchical Date Filter Component - Excel-like
 *
 * Hardcoded years from 2023 to current year
 * Groups dates by Year > Month with expandable tree structure
 */

// Month translation keys (month.1 - month.12)
const MONTH_KEYS = [
    'month.1', 'month.2', 'month.3', 'month.4',
    'month.5', 'month.6', 'month.7', 'month.8',
    'month.9', 'month.10', 'month.11', 'month.12'
];

/**
 * Generate years from 2023 to current year
 */
const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= 2023; year--) {
        years.push(year);
    }
    return years;
};

const DateHierarchyFilter = ({
    // eslint-disable-next-line no-unused-vars
    dateValues = [], // Not used anymore, kept for compatibility
    selectedValues = [],
    onSelectionChange,
    maxHeight = 200
}) => {
    const { t } = useTranslation();
    const [expandedYears, setExpandedYears] = useState(new Set());

    // Hardcoded years from 2023 to current year
    const years = useMemo(() => generateYears(), []);

    // Parse selected values to determine what's selected
    const selectedRanges = useMemo(() => {
        const ranges = { years: new Set(), months: new Set() };

        // Check if selectedValues contains range info or individual dates
        selectedValues.forEach(val => {
            if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month] = val.split('-');
                ranges.years.add(parseInt(year));
                ranges.months.add(`${year}-${month}`);
            }
        });

        return ranges;
    }, [selectedValues]);

    // Toggle year expansion
    const toggleYear = (year) => {
        setExpandedYears(prev => {
            const next = new Set(prev);
            if (next.has(year)) {
                next.delete(year);
            } else {
                next.add(year);
            }
            return next;
        });
    };

    // Check if year is selected (any month selected = partial)
    const isYearSelected = (year) => {
        // Check if all 12 months are selected
        for (let m = 0; m < 12; m++) {
            const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`;
            if (!selectedRanges.months.has(monthKey)) {
                return false;
            }
        }
        return true;
    };

    const isYearPartial = (year) => {
        let count = 0;
        for (let m = 0; m < 12; m++) {
            const monthKey = `${year}-${String(m + 1).padStart(2, '0')}`;
            if (selectedRanges.months.has(monthKey)) {
                count++;
            }
        }
        return count > 0 && count < 12;
    };

    // Check if month is selected
    const isMonthSelected = (year, month) => {
        const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
        return selectedRanges.months.has(monthKey);
    };

    // Toggle year selection - select/deselect all months
    const handleYearToggle = (year) => {
        const allSelected = isYearSelected(year);

        if (allSelected) {
            // Deselect - remove this year's dates from selection
            const newSelection = selectedValues.filter(d => {
                if (typeof d === 'string') {
                    return !d.startsWith(`${year}-`);
                }
                return true;
            });
            onSelectionChange(newSelection);
        } else {
            // Select - add representative dates for all months
            const newDates = [];
            for (let m = 0; m < 12; m++) {
                const monthStr = String(m + 1).padStart(2, '0');
                newDates.push(`${year}-${monthStr}-01`);
            }
            const newSelection = [...new Set([...selectedValues, ...newDates])];
            onSelectionChange(newSelection);
        }
    };

    // Toggle month selection
    const handleMonthToggle = (year, month) => {
        const monthStr = String(month + 1).padStart(2, '0');
        const monthDate = `${year}-${monthStr}-01`;
        const isSelected = isMonthSelected(year, month);

        if (isSelected) {
            // Deselect - remove this month's dates
            const newSelection = selectedValues.filter(d => {
                if (typeof d === 'string') {
                    return !d.startsWith(`${year}-${monthStr}`);
                }
                return true;
            });
            onSelectionChange(newSelection);
        } else {
            // Select - add representative date for month
            onSelectionChange([...selectedValues, monthDate]);
        }
    };

    return (
        <div className="overflow-y-auto" style={{ maxHeight }}>
            {years.map(year => {
                const isExpanded = expandedYears.has(year);
                const isSelected = isYearSelected(year);
                const isPartial = isYearPartial(year);

                return (
                    <div key={year}>
                        {/* Year Level */}
                        <div className="flex items-center hover:bg-muted/50">
                            <button
                                onClick={() => toggleYear(year)}
                                className="p-1.5 hover:bg-muted rounded"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                )}
                            </button>
                            <label className="flex-1 flex items-center gap-2 py-1.5 pr-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    ref={el => el && (el.indeterminate = isPartial)}
                                    onChange={() => handleYearToggle(year)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 focus:ring-offset-0"
                                />
                                <Calendar className="w-4 h-4 text-emerald-500" />
                                <span className={cn(
                                    "text-sm font-medium",
                                    isSelected ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {year}
                                </span>
                            </label>
                        </div>

                        {/* Month Level */}
                        {isExpanded && (
                            <div className="ml-6">
                                {Array.from({ length: 12 }, (_, month) => {
                                    const isMonthSel = isMonthSelected(year, month);

                                    return (
                                        <label
                                            key={month}
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 cursor-pointer",
                                                "hover:bg-muted/50",
                                                isMonthSel && "bg-primary/5"
                                            )}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isMonthSel}
                                                onChange={() => handleMonthToggle(year, month)}
                                                className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 focus:ring-offset-0"
                                            />
                                            <span className={cn(
                                                "text-sm",
                                                isMonthSel ? "text-foreground font-medium" : "text-muted-foreground"
                                            )}>
                                                {t(MONTH_KEYS[month])}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default DateHierarchyFilter;
