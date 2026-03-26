import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import DateHierarchyFilter from './DateHierarchyFilter';
import {
    Filter,
    ArrowUpAZ,
    ArrowDownAZ,
    ArrowUp01,
    ArrowDown01,
    Check,
    X,
    Search,
    ChevronRight,
    Calendar,
    Hash,
    Type,
    Loader2
} from 'lucide-react';

/**
 * Excel-like Filter Dropdown Component
 *
 * Features:
 * - Deduped & normalized unique values
 * - O(1) Set-based selection checks
 * - Auto-focus search with highlight
 * - Enter key to apply, Escape to close
 * - Bottom-aware viewport positioning
 * - Select All Visible / Clear All
 * - Sort ascending/descending
 * - Custom filter conditions (text/number/date)
 * - Date hierarchy filter
 */

const FILTER_CONDITIONS = {
    text: [
        { value: 'equals', label: 'filter.equals' },
        { value: 'not_equals', label: 'filter.not_equals' },
        { value: 'contains', label: 'filter.contains' },
        { value: 'not_contains', label: 'filter.not_contains' },
        { value: 'starts_with', label: 'filter.starts_with' },
        { value: 'ends_with', label: 'filter.ends_with' },
    ],
    number: [
        { value: 'equals', label: 'filter.equals' },
        { value: 'not_equals', label: 'filter.not_equals' },
        { value: 'greater_than', label: 'filter.greater_than' },
        { value: 'less_than', label: 'filter.less_than' },
        { value: 'between', label: 'filter.between' },
    ],
    date: [
        { value: 'today', label: 'filter.today' },
        { value: 'yesterday', label: 'filter.yesterday' },
        { value: 'this_week', label: 'filter.this_week' },
        { value: 'this_month', label: 'filter.this_month' },
        { value: 'this_year', label: 'filter.this_year' },
        { value: 'custom', label: 'filter.custom' },
    ]
};

const DROPDOWN_WIDTH = 288; // w-72
const DROPDOWN_MAX_HEIGHT = 480;
const VIEWPORT_PADDING = 16;

const ExcelFilterDropdown = ({
    columnKey,
    columnLabel,
    uniqueValues = [],
    isLoadingValues = false,
    currentFilter = null,
    currentSort = null,
    onApplyFilter,
    onApplySort,
    onClearFilter,
    onClose,
    fieldType = 'text',
    position = { top: 0, left: 0 }
}) => {
    const { t } = useTranslation();
    const dropdownRef = useRef(null);
    const searchInputRef = useRef(null);

    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedValues, setSelectedValues] = useState(
        currentFilter?.values || []
    );
    const [showCustomFilter, setShowCustomFilter] = useState(false);
    const [customCondition, setCustomCondition] = useState(
        currentFilter?.condition || 'contains'
    );
    const [customValue, setCustomValue] = useState(currentFilter?.customValue || '');
    const [customValue2, setCustomValue2] = useState(currentFilter?.customValue2 || '');

    // O(1) Set for selection checks
    const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);

    // Dedup & normalize unique values
    const dedupedValues = useMemo(() => {
        const seen = new Set();
        return uniqueValues.filter(val => {
            const normalized = val === null || val === undefined ? '' : String(val).trim();
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }, [uniqueValues]);

    // Filter values based on search
    const filteredValues = useMemo(() => {
        if (!searchQuery.trim()) return dedupedValues;
        const query = searchQuery.toLowerCase().trim();
        return dedupedValues.filter(val =>
            String(val).toLowerCase().includes(query)
        );
    }, [dedupedValues, searchQuery]);

    // Bottom-aware positioning
    const adjustedPosition = useMemo(() => {
        const { top, left } = position;
        const viewportH = window.innerHeight;
        const viewportW = window.innerWidth;

        let adjustedTop = top;
        let adjustedLeft = left;

        // Clamp horizontal
        if (adjustedLeft + DROPDOWN_WIDTH > viewportW - VIEWPORT_PADDING) {
            adjustedLeft = viewportW - DROPDOWN_WIDTH - VIEWPORT_PADDING;
        }
        adjustedLeft = Math.max(VIEWPORT_PADDING, adjustedLeft);

        // If dropdown would overflow bottom, flip above trigger
        const spaceBelow = viewportH - top - VIEWPORT_PADDING;
        if (spaceBelow < 300) {
            // Not enough space below — position above
            adjustedTop = Math.max(VIEWPORT_PADDING, top - DROPDOWN_MAX_HEIGHT - 8);
        }

        return {
            top: adjustedTop,
            left: adjustedLeft,
            maxHeight: `min(${DROPDOWN_MAX_HEIGHT}px, calc(100vh - ${adjustedTop}px - ${VIEWPORT_PADDING}px))`
        };
    }, [position]);

    // Auto-focus search input on open
    useEffect(() => {
        const timer = setTimeout(() => {
            searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
    }, []);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose?.();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Handle keyboard events
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleSelectAllVisible = useCallback(() => {
        // Select only currently visible (filtered) values
        setSelectedValues(prev => {
            const newSet = new Set(prev);
            filteredValues.forEach(v => newSet.add(v));
            return Array.from(newSet);
        });
    }, [filteredValues]);

    const handleClearAll = useCallback(() => {
        setSelectedValues([]);
    }, []);

    const handleToggleValue = useCallback((value) => {
        setSelectedValues(prev => {
            const set = new Set(prev);
            if (set.has(value)) set.delete(value);
            else set.add(value);
            return Array.from(set);
        });
    }, []);

    const handleApply = useCallback(() => {
        if (showCustomFilter && customValue) {
            onApplyFilter?.({
                type: 'custom',
                condition: customCondition,
                customValue,
                customValue2,
            });
        } else if (selectedValues.length > 0) {
            onApplyFilter?.({
                type: 'values',
                values: selectedValues,
            });
        }
        onClose?.();
    }, [showCustomFilter, customValue, customCondition, customValue2, selectedValues, onApplyFilter, onClose]);

    const handleClear = useCallback(() => {
        setSelectedValues([]);
        setCustomValue('');
        setCustomValue2('');
        setShowCustomFilter(false);
        onClearFilter?.();
        onClose?.();
    }, [onClearFilter, onClose]);

    const handleSort = useCallback((order) => {
        onApplySort?.(order);
        onClose?.();
    }, [onApplySort, onClose]);

    // Enter key to apply filter
    const handleKeyDownInDropdown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleApply();
        }
    }, [handleApply]);

    const isNumeric = fieldType === 'number';
    const isDate = fieldType === 'date';
    const hasActiveFilter = selectedValues.length > 0 || !!customValue;

    // Highlight search match in value text
    const renderHighlightedValue = (value) => {
        const str = String(value);
        if (!searchQuery.trim()) return str;
        const query = searchQuery.trim();
        const idx = str.toLowerCase().indexOf(query.toLowerCase());
        if (idx === -1) return str;
        return (
            <>
                {str.slice(0, idx)}
                <mark className="bg-yellow-200 dark:bg-yellow-900/60 text-inherit rounded-sm px-0.5">{str.slice(idx, idx + query.length)}</mark>
                {str.slice(idx + query.length)}
            </>
        );
    };

    return (
        <div
            ref={dropdownRef}
            className={cn(
                "fixed z-[9999] w-[calc(100vw-2rem)] sm:w-72 bg-card",
                "border border-border rounded-xl shadow-2xl",
                "animate-in slide-in-from-top-2 fade-in duration-200",
                "overflow-hidden"
            )}
            style={{
                top: adjustedPosition.top,
                left: adjustedPosition.left,
                maxHeight: adjustedPosition.maxHeight,
                display: 'flex',
                flexDirection: 'column'
            }}
            onKeyDown={handleKeyDownInDropdown}
            role="dialog"
            aria-label={`${t('filter.filter_for', 'Filter for')} ${columnLabel || columnKey}`}
        >
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-border bg-muted/50">
                <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5" />
                        {columnLabel || columnKey}
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={t('common.close', 'Close')}
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Sort Options */}
            <div className="px-2 py-2 border-b border-border">
                <button
                    onClick={() => handleSort('asc')}
                    className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-colors",
                        "hover:bg-primary/5 text-foreground",
                        currentSort === 'asc' && "bg-primary/5 text-primary font-medium"
                    )}
                >
                    {isNumeric ? <ArrowUp01 className="w-4 h-4" /> : <ArrowUpAZ className="w-4 h-4" />}
                    {isNumeric ? t('filter.sort_asc_num') : t('filter.sort_asc')}
                    {currentSort === 'asc' && <Check className="w-4 h-4 ml-auto text-primary" />}
                </button>
                <button
                    onClick={() => handleSort('desc')}
                    className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-colors",
                        "hover:bg-primary/5 text-foreground",
                        currentSort === 'desc' && "bg-primary/5 text-primary font-medium"
                    )}
                >
                    {isNumeric ? <ArrowDown01 className="w-4 h-4" /> : <ArrowDownAZ className="w-4 h-4" />}
                    {isNumeric ? t('filter.sort_desc_num') : t('filter.sort_desc')}
                    {currentSort === 'desc' && <Check className="w-4 h-4 ml-auto text-primary" />}
                </button>
            </div>

            {/* Custom Filter Toggle */}
            <div className="px-2 py-2 border-b border-border">
                <button
                    onClick={() => setShowCustomFilter(!showCustomFilter)}
                    className={cn(
                        "w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-colors",
                        "hover:bg-muted text-foreground",
                        showCustomFilter && "bg-muted"
                    )}
                >
                    {isNumeric ? <Hash className="w-4 h-4" /> : isDate ? <Calendar className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                    {isNumeric ? t('filter.number_filters') : isDate ? t('filter.date_filters') : t('filter.text_filters')}
                    <ChevronRight className={cn("w-4 h-4 ml-auto transition-transform", showCustomFilter && "rotate-90")} />
                </button>

                {/* Custom Filter Panel */}
                {showCustomFilter && (
                    <div className="mt-2 p-2 bg-muted/50 rounded-lg space-y-2">
                        <select
                            value={customCondition}
                            onChange={(e) => setCustomCondition(e.target.value)}
                            className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                        >
                            {FILTER_CONDITIONS[fieldType]?.map(cond => (
                                <option key={cond.value} value={cond.value}>
                                    {t(cond.label, cond.value)}
                                </option>
                            ))}
                        </select>
                        <input
                            type={isNumeric ? 'number' : isDate ? 'date' : 'text'}
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            placeholder={t('filter.value')}
                            className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                        />
                        {customCondition === 'between' && (
                            <input
                                type={isNumeric ? 'number' : isDate ? 'date' : 'text'}
                                value={customValue2}
                                onChange={(e) => setCustomValue2(e.target.value)}
                                placeholder={t('filter.value2')}
                                className="w-full text-sm border border-border rounded-lg px-2.5 py-1.5 bg-card text-foreground focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Search Box */}
            <div className="px-3 py-2 border-b border-border">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('filter.search_placeholder')}
                        className="w-full pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Select All / Clear All */}
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-border bg-muted/50">
                <button
                    onClick={handleSelectAllVisible}
                    className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    {searchQuery.trim()
                        ? t('filter.select_visible', 'Select visible')
                        : t('filter.select_all')
                    }
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">
                    {selectedValues.length > 0 && `${selectedValues.length} / ${dedupedValues.length}`}
                </span>
                <button
                    onClick={handleClearAll}
                    className="text-xs font-medium text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                    {t('filter.clear_all')}
                </button>
            </div>

            {/* Unique Values List - Scrollable middle section */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/30" role="listbox" aria-multiselectable="true">
                {isLoadingValues ? (
                    <div className="px-3 py-8 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">{t('common.loading', 'Loading...')}</span>
                    </div>
                ) : isDate ? (
                    <DateHierarchyFilter
                        dateValues={filteredValues}
                        selectedValues={selectedValues}
                        onSelectionChange={setSelectedValues}
                        maxHeight={200}
                    />
                ) : filteredValues.length === 0 ? (
                    <div className="px-3 py-6 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Search className="w-5 h-5 opacity-40" />
                        <p className="text-sm">{t('filter.no_results')}</p>
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="text-xs text-primary hover:underline"
                            >
                                {t('filter.clear_search', 'Clear search')}
                            </button>
                        )}
                    </div>
                ) : (
                    filteredValues.map((value, idx) => {
                        const isSelected = selectedSet.has(value);
                        return (
                            <label
                                key={idx}
                                className={cn(
                                    "flex items-center gap-2.5 px-3 py-1.5 cursor-pointer transition-colors",
                                    "hover:bg-muted/50",
                                    isSelected && "bg-primary/5"
                                )}
                                role="option"
                                aria-selected={isSelected}
                            >
                                <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleValue(value)}
                                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary/40 focus:ring-offset-0"
                                />
                                <span className={cn(
                                    "text-sm truncate flex-1",
                                    isSelected ? "text-foreground font-medium" : "text-muted-foreground"
                                )}>
                                    {value === null || value === '' ? (
                                        <span className="italic text-muted-foreground/60">{t('filter.blank')}</span>
                                    ) : (
                                        renderHighlightedValue(value)
                                    )}
                                </span>
                            </label>
                        );
                    })
                )}
            </div>

            {/* Footer Actions - Always visible */}
            <div className="flex-shrink-0 px-3 py-2.5 border-t border-border bg-muted/50 flex items-center gap-2">
                <button
                    onClick={handleClear}
                    className={cn(
                        "flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                        "border border-border",
                        "text-muted-foreground hover:bg-muted",
                        !hasActiveFilter && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!hasActiveFilter}
                >
                    {t('filter.clear_filter')}
                </button>
                <button
                    onClick={handleApply}
                    className={cn(
                        "flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-[color,background-color,opacity,box-shadow]",
                        "bg-primary hover:bg-primary/90 text-primary-foreground",
                        "shadow-sm hover:shadow-md",
                        !hasActiveFilter && "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!hasActiveFilter}
                >
                    {t('filter.apply')}
                    {selectedValues.length > 0 && ` (${selectedValues.length})`}
                </button>
            </div>
        </div>
    );
};

export default ExcelFilterDropdown;
