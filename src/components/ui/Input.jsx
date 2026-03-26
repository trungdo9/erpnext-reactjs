import { useRef } from 'react';
import { cn } from '../../lib/utils';
import PropTypes from 'prop-types';

const Input = ({ label, error, className, id, size = 'default', type, onClick, ...props }) => {
    const inputRef = useRef(null);
    const inputId = id || props.name;
    const errorId = error ? `${inputId}-error` : undefined;

    const sizeClasses = {
        sm: 'h-8 text-base md:text-sm px-2.5',
        default: 'h-9 text-base md:text-sm px-3',
        lg: 'h-12 text-base md:text-sm px-3',
    };

    // Handle click for date/time inputs to ensure picker opens
    const handleClick = (e) => {
        if (onClick) onClick(e);

        // For date/time inputs, try to show the native picker
        const isDateTimeInput = ['date', 'time', 'datetime-local'].includes(type);
        if (isDateTimeInput && inputRef.current?.showPicker) {
            try {
                inputRef.current.showPicker();
            } catch {
                // showPicker() may throw in some browsers, ignore
            }
        }
    };

    return (
        <div className="w-full">
            {label && (
                <label
                    htmlFor={inputId}
                    className="block text-[13px] font-medium text-muted-foreground mb-1.5"
                >
                    {label}
                    {props.required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
                </label>
            )}
            <input
                ref={inputRef}
                id={inputId}
                type={type}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={errorId}
                aria-required={props.required}
                onClick={handleClick}
                className={cn(
                    "flex w-full rounded-lg border-0 bg-muted py-1.5 transition-colors duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 focus-visible:bg-card disabled:cursor-not-allowed disabled:opacity-50",
                    sizeClasses[size] || sizeClasses.default,
                    error && "ring-1 ring-destructive focus-visible:ring-destructive focus-visible:shadow-[0_0_0_3px_rgba(224,54,54,0.15)] animate-shake",
                    className
                )}
                {...props}
            />
            {error && (
                <p id={errorId} className="mt-1.5 text-xs text-destructive font-medium" role="alert">
                    {error}
                </p>
            )}
        </div>
    );
};

Input.propTypes = {
    label: PropTypes.string,
    id: PropTypes.string,
    error: PropTypes.string,
    className: PropTypes.string,
    size: PropTypes.oneOf(['sm', 'default', 'lg']),
    type: PropTypes.string,
    onClick: PropTypes.func,
};

export default Input;
