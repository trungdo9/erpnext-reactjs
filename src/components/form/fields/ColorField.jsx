import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../lib/utils';

/**
 * Color picker field for Color fieldtype
 * Renders a color picker input alongside a text input showing the hex value.
 * Value is stored as a hex string like "#FF0000".
 */
export function ColorField({ field, value, onChange, disabled, error }) {
    const currentValue = value || '#000000';
    const isDisabled = disabled || field.read_only === 1;

    const handleColorChange = useCallback((e) => {
        onChange(field.fieldname, e.target.value);
    }, [field.fieldname, onChange]);

    const handleTextChange = useCallback((e) => {
        const hex = e.target.value;
        onChange(field.fieldname, hex);
    }, [field.fieldname, onChange]);

    return (
        <div className="w-full">
            {field.label && (
                <label
                    htmlFor={field.fieldname}
                    className="block text-[13px] font-medium text-muted-foreground mb-1.5"
                >
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            )}
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    id={`${field.fieldname}-picker`}
                    value={currentValue}
                    onChange={handleColorChange}
                    disabled={isDisabled}
                    className={cn(
                        "h-10 w-12 rounded-[6px] border-0 bg-muted p-1 cursor-pointer",
                        isDisabled && "cursor-not-allowed opacity-50"
                    )}
                />
                <input
                    type="text"
                    id={field.fieldname}
                    name={field.fieldname}
                    value={value ?? ''}
                    onChange={handleTextChange}
                    disabled={isDisabled}
                    placeholder="#000000"
                    maxLength={7}
                    className={cn(
                        "flex h-10 w-full rounded-[6px] border-0 bg-muted px-3 py-1.5 text-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
                        error && "ring-1 ring-destructive focus-visible:ring-destructive"
                    )}
                />
            </div>
            {error && (
                <p className="mt-1.5 text-xs text-destructive font-medium">{error}</p>
            )}
            {field.description && !error && (
                <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
        </div>
    );
}

ColorField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export default ColorField;
