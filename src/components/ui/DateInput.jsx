import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/**
 * Custom date input that always displays dd/mm/yyyy format
 * regardless of OS/browser locale settings.
 *
 * Uses a text input for display + hidden native date picker for calendar.
 *
 * @param {string} value - ISO date string (YYYY-MM-DD) or empty
 * @param {function} onChange - Called with ISO date string (YYYY-MM-DD) or null
 * @param {string} mode - 'date' | 'datetime' | 'time'
 */
const DateInput = ({ label, value, onChange, disabled, required, error, id, name, mode = 'date', className }) => {
    const hiddenDateRef = useRef(null);
    const inputId = id || name;
    const errorId = error ? `${inputId}-error` : undefined;

    // Convert ISO value to display format
    const getDisplayValue = useCallback((isoVal) => {
        if (!isoVal) return '';
        if (mode === 'time') return isoVal;

        const parsed = dayjs(isoVal);
        if (!parsed.isValid()) return isoVal;

        if (mode === 'datetime') {
            return parsed.format('DD/MM/YYYY HH:mm');
        }
        return parsed.format('DD/MM/YYYY');
    }, [mode]);

    // Convert ISO value to native input format
    const getNativeValue = useCallback((isoVal) => {
        if (!isoVal) return '';
        if (mode === 'time') return isoVal;

        const parsed = dayjs(isoVal);
        if (!parsed.isValid()) return '';

        if (mode === 'datetime') {
            return parsed.format('YYYY-MM-DDTHH:mm');
        }
        return parsed.format('YYYY-MM-DD');
    }, [mode]);

    const [textValue, setTextValue] = useState(() => getDisplayValue(value));
    const [isFocused, setIsFocused] = useState(false);

    // Sync textValue when value prop changes externally
    const prevValueRef = useRef(value);
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (value !== prevValueRef.current) {
            prevValueRef.current = value;
            const newDisplay = getDisplayValue(value);
            if (newDisplay !== textValue && !isFocused) {
                setTextValue(newDisplay);
            }
        }
    }, [value, getDisplayValue, textValue, isFocused]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Parse user-typed text back to ISO
    const parseTextToISO = useCallback((text) => {
        if (!text || !text.trim()) return null;

        if (mode === 'time') return text;

        // Try dd/mm/yyyy format first
        let parsed = dayjs(text, 'DD/MM/YYYY', true);
        if (parsed.isValid()) return parsed.format('YYYY-MM-DD');

        // Try dd/mm/yyyy HH:mm for datetime
        if (mode === 'datetime') {
            parsed = dayjs(text, 'DD/MM/YYYY HH:mm', true);
            if (parsed.isValid()) return parsed.format('YYYY-MM-DD HH:mm:ss');
        }

        // Try other common formats
        parsed = dayjs(text, 'D/M/YYYY', true);
        if (parsed.isValid()) return parsed.format('YYYY-MM-DD');

        parsed = dayjs(text, 'DD-MM-YYYY', true);
        if (parsed.isValid()) return parsed.format('YYYY-MM-DD');

        // If nothing parses, return null
        return null;
    }, [mode]);

    // Handle text input change
    const handleTextChange = (e) => {
        const newText = e.target.value;
        setTextValue(newText);

        // Auto-insert slashes as user types: 18 -> 18/ , 18/02 -> 18/02/
        if (mode !== 'time') {
            const digits = newText.replace(/\D/g, '');
            if (digits.length >= 2 && newText.length === 2 && !newText.includes('/')) {
                setTextValue(digits.slice(0, 2) + '/');
                return;
            }
            if (digits.length >= 4 && newText.length === 5 && newText.split('/').length === 2) {
                setTextValue(digits.slice(0, 2) + '/' + digits.slice(2, 4) + '/');
                return;
            }
        }
    };

    // On blur, try to parse and emit
    const handleBlur = () => {
        setIsFocused(false);
        if (!textValue) {
            onChange?.({ target: { value: '' } });
            return;
        }

        const iso = parseTextToISO(textValue);
        if (iso) {
            onChange?.({ target: { value: iso } });
            setTextValue(getDisplayValue(iso));
        } else {
            // Invalid input - revert to last valid value
            setTextValue(getDisplayValue(value));
        }
    };

    // Handle Enter key
    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    // Handle native picker change
    const handleNativeChange = (e) => {
        const nativeVal = e.target.value;
        if (!nativeVal) {
            setTextValue('');
            onChange?.({ target: { value: '' } });
            return;
        }

        let isoVal;
        if (mode === 'datetime') {
            // datetime-local returns YYYY-MM-DDTHH:mm
            isoVal = nativeVal.replace('T', ' ') + ':00';
        } else {
            isoVal = nativeVal;
        }

        setTextValue(getDisplayValue(isoVal));
        onChange?.({ target: { value: isoVal } });
    };

    // Open native date picker
    const openPicker = () => {
        if (disabled) return;
        if (hiddenDateRef.current?.showPicker) {
            try {
                hiddenDateRef.current.showPicker();
            } catch {
                hiddenDateRef.current.click();
            }
        } else {
            hiddenDateRef.current?.click();
        }
    };

    if (mode === 'time') {
        // Time fields can keep native input - no locale issues
        return (
            <div className="w-full">
                {label && (
                    <label htmlFor={inputId} className="block text-[13px] font-medium text-muted-foreground mb-1.5">
                        {label}
                        {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                    </label>
                )}
                <input
                    type="time"
                    id={inputId}
                    name={name}
                    value={value || ''}
                    onChange={onChange}
                    disabled={disabled}
                    required={required}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={errorId}
                    className={cn(
                        "flex w-full rounded-lg border-0 bg-muted h-9 text-base md:text-sm px-3 py-1.5 transition-colors duration-150 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50",
                        error && "ring-1 ring-destructive",
                        className
                    )}
                />
                {error && (
                    <p id={errorId} className="mt-1.5 text-xs text-destructive font-medium" role="alert">{error}</p>
                )}
            </div>
        );
    }

    const placeholder = mode === 'datetime' ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy';
    const nativeType = mode === 'datetime' ? 'datetime-local' : 'date';

    return (
        <div className="w-full">
            {label && (
                <label htmlFor={inputId} className="block text-[13px] font-medium text-muted-foreground mb-1.5">
                    {label}
                    {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                </label>
            )}
            <div className="relative">
                {/* Text input - always shows dd/mm/yyyy */}
                <input
                    type="text"
                    id={inputId}
                    name={name}
                    value={textValue}
                    onChange={handleTextChange}
                    onBlur={handleBlur}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    required={required}
                    placeholder={placeholder}
                    autoComplete="off"
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={errorId}
                    className={cn(
                        "flex w-full rounded-lg border-0 bg-muted h-9 text-base md:text-sm px-3 pr-9 py-1.5 transition-colors duration-150 placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50",
                        error && "ring-1 ring-destructive focus-visible:ring-destructive",
                        className
                    )}
                />

                {/* Calendar button */}
                <button
                    type="button"
                    onClick={openPicker}
                    disabled={disabled}
                    tabIndex={-1}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary disabled:opacity-50 disabled:pointer-events-none"
                    aria-label="Open calendar"
                >
                    <Calendar className="h-4 w-4" />
                </button>

                {/* Hidden native date input for calendar picker */}
                <input
                    ref={hiddenDateRef}
                    type={nativeType}
                    value={getNativeValue(value)}
                    onChange={handleNativeChange}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute inset-0 opacity-0 pointer-events-none"
                    style={{ width: 0, height: 0, overflow: 'hidden' }}
                />
            </div>
            {error && (
                <p id={errorId} className="mt-1.5 text-xs text-destructive font-medium" role="alert">{error}</p>
            )}
        </div>
    );
};

export default DateInput;
