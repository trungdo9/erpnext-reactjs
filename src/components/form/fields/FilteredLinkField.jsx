/**
 * FilteredLinkField Component
 *
 * A Link field variant that supports dynamic filtering based on other form field values.
 * Used for hierarchical relationships where the available options depend on related fields.
 *
 * Example: In "Vi Tri" doctype, the "Vị Trí Cha" (Parent Location) field is filtered
 * based on the selected "Loại Vị Trí" (Location Type).
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useTranslation } from '../../../hooks/useTranslation';
import { useFilteredLinkOptions } from '../../../hooks/useFilteredLinkOptions';
import { getLinkFieldFilter } from '../../../config/doctype.behaviors';
import { ChevronDown, Loader2, X, AlertCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * FilteredLinkField - Link field with dynamic filtering
 */
export function FilteredLinkField({
    field,
    value,
    onChange,
    disabled,
    error,
    formData,
    parentDoctype,
}) {
    const { t } = useTranslation();
    const [query, setQuery] = useState(value || '');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const dropdownRef = useRef(null);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    // Linked doctype from field.options
    const linkedDoctype = field.options;

    // Get dynamic filter based on current form values
    const dynamicFilter = useMemo(() => {
        if (!parentDoctype || !formData) return undefined;
        return getLinkFieldFilter(parentDoctype, field.fieldname, formData);
    }, [parentDoctype, field.fieldname, formData]);

    // Use filtered options hook
    const {
        options,
        isLoading,
        filterOptions,
    } = useFilteredLinkOptions(linkedDoctype, dynamicFilter);

    // Filtered options based on query
    const filteredOptions = useMemo(() => {
        return filterOptions(query);
    }, [filterOptions, query]);

    // Check if this is a root level (no parent allowed)
    const isRootLevel = dynamicFilter === null;

    // Sync query with external value changes
    useEffect(() => {
        const normalizedValue = value || '';
        if (normalizedValue !== query) {
            setQuery(normalizedValue);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    // Handle click outside to close dropdown (accounts for portal)
    useEffect(() => {
        const handleClickOutside = (e) => {
            const inWrapper = wrapperRef.current && wrapperRef.current.contains(e.target);
            const inDropdown = dropdownRef.current && dropdownRef.current.contains(e.target);
            if (!inWrapper && !inDropdown) {
                setIsOpen(false);
                setHighlightedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Position dropdown via portal when open
    useEffect(() => {
        if (isOpen && inputRef.current) {
            const MIN_DROPDOWN_WIDTH = 220;
            const updatePos = () => {
                const rect = inputRef.current.getBoundingClientRect();
                const dropdownWidth = Math.max(rect.width, MIN_DROPDOWN_WIDTH);

                const spaceBelow = window.innerHeight - rect.bottom;
                const dropdownHeight = 288;
                const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

                let left = rect.left;
                if (left + dropdownWidth > window.innerWidth - 8) {
                    left = window.innerWidth - dropdownWidth - 8;
                }
                if (left < 8) left = 8;

                setDropdownPos({
                    top: showAbove ? rect.top - dropdownHeight - 4 : rect.bottom + 4,
                    left,
                    width: dropdownWidth,
                });
            };
            updatePos();

            const handleScroll = (e) => {
                if (dropdownRef.current && dropdownRef.current.contains(e.target)) return;
                updatePos();
            };
            const handleResize = () => setIsOpen(false);
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('resize', handleResize);
            return () => {
                window.removeEventListener('scroll', handleScroll, true);
                window.removeEventListener('resize', handleResize);
            };
        }
    }, [isOpen]);

    // Reset highlight when filtered options change
    useEffect(() => {
        setHighlightedIndex(-1);
    }, [filteredOptions]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-option]');
            items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    /**
     * Handle focus
     */
    const handleFocus = useCallback(() => {
        if (disabled || field.read_only === 1 || isRootLevel) return;
        setIsOpen(true);
    }, [disabled, field.read_only, isRootLevel]);

    /**
     * Toggle dropdown
     */
    const handleToggle = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled || field.read_only === 1 || isRootLevel) return;

        if (isOpen) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
            inputRef.current?.focus();
        }
    }, [disabled, field.read_only, isRootLevel, isOpen]);

    /**
     * Handle input change
     */
    const handleInputChange = useCallback((e) => {
        const newValue = e.target.value;
        setQuery(newValue);
        setIsOpen(true);
        setHighlightedIndex(-1);
    }, []);

    /**
     * Handle selection
     */
    const handleSelect = useCallback((item) => {
        const selectedValue = typeof item === 'string' ? item : item.value;
        setQuery(selectedValue);
        onChange(field.fieldname, selectedValue);
        setIsOpen(false);
        setHighlightedIndex(-1);
    }, [field.fieldname, onChange]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                if (!isRootLevel) {
                    setIsOpen(true);
                }
            }
            return;
        }

        switch (e.key) {
            case 'Escape':
                setIsOpen(false);
                setHighlightedIndex(-1);
                break;
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev =>
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex]);
                }
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    }, [isOpen, isRootLevel, filteredOptions, highlightedIndex, handleSelect]);

    /**
     * Clear the field
     */
    const handleClear = useCallback((e) => {
        e.stopPropagation();
        setQuery('');
        onChange(field.fieldname, null);
        setHighlightedIndex(-1);
        inputRef.current?.focus();
    }, [field.fieldname, onChange]);

    // Get helper message based on state
    const getHelperMessage = () => {
        if (isRootLevel) {
            return t('link.root_level_no_parent', 'Cấp cao nhất - không có vị trí cha');
        }
        if (dynamicFilter === undefined && !formData?.cap) {
            return t('link.select_type_first', 'Vui lòng chọn loại vị trí trước');
        }
        return null;
    };

    const helperMessage = getHelperMessage();

    return (
        <div className="w-full" ref={wrapperRef}>
            {field.label && (
                <label
                    htmlFor={field.fieldname}
                    className="block text-[13px] font-medium text-muted-foreground mb-1.5"
                >
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            )}

            <div className="relative group">
                <input
                    ref={inputRef}
                    type="text"
                    id={field.fieldname}
                    name={field.fieldname}
                    value={query}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || field.read_only === 1 || isRootLevel}
                    required={field.reqd === 1 && !isRootLevel}
                    placeholder={
                        isRootLevel
                            ? t('link.no_parent_needed', 'Không cần vị trí cha')
                            : t('link.select').replace('{label}', field.label || linkedDoctype)
                    }
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    className={cn(
                        "flex h-9 w-full rounded-lg border-0 bg-muted px-3 py-1.5 pr-16 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
                        error && "ring-1 ring-destructive focus-visible:ring-destructive"
                    )}
                />

                {/* Right Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {/* Clear button */}
                    {query && !disabled && field.read_only !== 1 && !isRootLevel && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-accent"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}

                    {/* Loader or Chevron */}
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    ) : isRootLevel ? (
                        <AlertCircle className="w-4 h-4 text-muted-foreground" />
                    ) : (
                        <button
                            type="button"
                            onClick={handleToggle}
                            className="text-muted-foreground hover:text-foreground p-0.5"
                            tabIndex={-1}
                        >
                            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
                        </button>
                    )}
                </div>

                {/* Dropdown via Portal to escape overflow containers */}
                {isOpen && !isRootLevel && createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed z-[9999] overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95"
                        style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                    >
                        <ul
                            ref={listRef}
                            role="listbox"
                            className="max-h-72 overflow-auto p-1"
                        >
                            {filteredOptions.map((item, idx) => {
                                const itemValue = typeof item === 'string' ? item : item.value;
                                const itemDesc = typeof item === 'object' ? item.description : null;
                                const isSelected = query === itemValue;

                                return (
                                    <li
                                        key={`${itemValue}-${idx}`}
                                        data-option
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(item)}
                                        className={cn(
                                            "relative flex w-full cursor-pointer select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none hover:bg-muted transition-colors",
                                            highlightedIndex === idx && "bg-muted",
                                            isSelected && "bg-primary/10 text-primary font-medium"
                                        )}
                                    >
                                        <div className="flex flex-col w-full">
                                            <span>{itemValue}</span>
                                            {itemDesc && (
                                                <span className="text-xs text-muted-foreground mt-0.5">{itemDesc}</span>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}

                            {!isLoading && filteredOptions.length === 0 && (
                                <li className="px-2.5 py-3 text-sm text-muted-foreground text-center">
                                    {query && options.length > 0
                                        ? t('link.no_results', 'Không tìm thấy')
                                        : options.length === 0
                                            ? t('link.no_options', 'Không có lựa chọn phù hợp')
                                            : t('link.type_to_search', 'Nhập để tìm kiếm')
                                    }
                                </li>
                            )}

                            {isLoading && (
                                <li className="px-2.5 py-2.5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    {t('common.loading', 'Đang tải...')}
                                </li>
                            )}
                        </ul>
                    </div>,
                    document.body
                )}
            </div>

            {/* Helper message */}
            {helperMessage && !error && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {helperMessage}
                </p>
            )}

            {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
            )}
            {field.description && !error && !helperMessage && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
        </div>
    );
}

FilteredLinkField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        options: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
    formData: PropTypes.object,
    parentDoctype: PropTypes.string,
};

export default FilteredLinkField;
