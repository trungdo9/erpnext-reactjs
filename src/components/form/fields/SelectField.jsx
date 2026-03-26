import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useTranslation } from '../../../hooks/useTranslation';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

/**
 * Parse options string into array
 * Options can be newline-separated or from field.options
 */
const parseOptions = (optionsStr) => {
    if (!optionsStr) return [];
    return optionsStr
        .split('\n')
        .map(opt => opt.trim())
        .filter(opt => opt.length > 0);
};

/**
 * Select dropdown field for Select fieldtype
 * Custom dropdown matching the design system (no native <select>)
 */
export function SelectField({ field, value, onChange, disabled, error }) {
    const { t } = useTranslation();
    const options = parseOptions(field.options);
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const wrapperRef = useRef(null);
    const buttonRef = useRef(null);
    const listRef = useRef(null);
    const dropdownRef = useRef(null);

    const isDisabled = disabled || field.read_only === 1;

    // Find the display value
    const displayValue = value || '';

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
        if (isOpen && buttonRef.current) {
            const MIN_DROPDOWN_WIDTH = 220;
            const updatePos = () => {
                const rect = buttonRef.current.getBoundingClientRect();
                const dropdownWidth = Math.max(rect.width, MIN_DROPDOWN_WIDTH);

                // Check if dropdown fits below
                const spaceBelow = window.innerHeight - rect.bottom;
                const dropdownHeight = 240; // max-h-60 = 15rem = 240px approx
                const showAbove = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

                // Check if dropdown fits to the right
                let left = rect.left;
                if (left + dropdownWidth > window.innerWidth - 8) {
                    left = window.innerWidth - dropdownWidth - 8;
                }
                // Don't go past left edge
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

    // Reset highlight when opening
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (isOpen && value) {
            const idx = options.indexOf(value);
            setHighlightedIndex(idx >= 0 ? idx : -1);
        }
    }, [isOpen, value, options]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlightedIndex >= 0 && listRef.current) {
            const items = listRef.current.querySelectorAll('[data-option]');
            items[highlightedIndex]?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlightedIndex]);

    const handleToggle = useCallback(() => {
        if (isDisabled) return;
        setIsOpen(prev => !prev);
    }, [isDisabled]);

    const handleSelect = useCallback((opt) => {
        onChange(field.fieldname, opt || null);
        setIsOpen(false);
        setHighlightedIndex(-1);
    }, [field.fieldname, onChange]);

    const handleKeyDown = useCallback((e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsOpen(true);
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
                    prev < options.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (highlightedIndex >= 0 && options[highlightedIndex]) {
                    handleSelect(options[highlightedIndex]);
                }
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    }, [isOpen, options, highlightedIndex, handleSelect]);

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

            {/* Custom select trigger */}
            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    id={field.fieldname}
                    onClick={handleToggle}
                    onKeyDown={handleKeyDown}
                    disabled={isDisabled}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                    className={cn(
                        "flex items-center justify-between h-9 w-full rounded-lg border-0 bg-muted px-3 text-sm text-left",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
                        "disabled:cursor-not-allowed disabled:opacity-50",
                        error && "ring-1 ring-destructive focus-visible:ring-destructive",
                        !displayValue && "text-muted-foreground"
                    )}
                >
                    <span className="truncate">
                        {displayValue || `-- ${t('common.select')} ${field.label} --`}
                    </span>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-muted-foreground shrink-0 ml-2 transition-transform",
                        isOpen && "rotate-180"
                    )} />
                </button>

                {/* Dropdown via Portal to escape overflow containers */}
                {isOpen && createPortal(
                    <div
                        ref={dropdownRef}
                        className="fixed z-[9999] overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-in fade-in-0 zoom-in-95"
                        style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
                    >
                        <ul
                            ref={listRef}
                            role="listbox"
                            className="max-h-60 overflow-auto p-1"
                        >
                            {/* Empty option */}
                            <li
                                data-option
                                role="option"
                                aria-selected={!value}
                                onClick={() => handleSelect(null)}
                                className={cn(
                                    "relative flex w-full cursor-pointer select-none items-center rounded-md px-2.5 py-1.5 text-sm outline-none hover:bg-muted transition-colors text-muted-foreground",
                                    highlightedIndex === -1 && !value && "bg-muted"
                                )}
                            >
                                -- {t('common.select')} {field.label} --
                            </li>

                            {options.map((opt, idx) => {
                                const isSelected = value === opt;

                                return (
                                    <li
                                        key={opt}
                                        data-option
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(opt)}
                                        className={cn(
                                            "relative flex w-full cursor-pointer select-none items-center justify-between rounded-md px-2.5 py-1.5 text-sm outline-none hover:bg-muted transition-colors",
                                            highlightedIndex === idx && "bg-muted",
                                            isSelected && "bg-primary/10 text-primary font-medium"
                                        )}
                                    >
                                        <span className="truncate">{opt}</span>
                                        {isSelected && (
                                            <Check className="w-3.5 h-3.5 shrink-0 ml-2" />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    </div>,
                    document.body
                )}
            </div>

            {error && (
                <p className="text-xs text-destructive font-medium mt-1">{error}</p>
            )}
            {field.description && !error && (
                <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
        </div>
    );
}

SelectField.propTypes = {
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
};

export default SelectField;
