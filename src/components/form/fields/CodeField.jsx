import { useCallback } from 'react';
import PropTypes from 'prop-types';
import { cn } from '../../../lib/utils';

/**
 * Code editor field for Code fieldtype
 *
 * Renders a textarea with monospace font and dark-themed styling.
 * `field.options` may specify the language (Python, JavaScript, etc.)
 * for display purposes.
 */
export function CodeField({ field, value, onChange, disabled, error }) {
    const isDisabled = disabled || field.read_only === 1;
    const language = field.options || '';

    const handleChange = useCallback((e) => {
        onChange(field.fieldname, e.target.value);
    }, [field.fieldname, onChange]);

    // Handle Tab key to insert spaces instead of moving focus
    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const textarea = e.target;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = value.substring(0, start) + '    ' + value.substring(end);
            onChange(field.fieldname, newValue);
            // Restore cursor position after React re-renders
            requestAnimationFrame(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            });
        }
    }, [value, field.fieldname, onChange]);

    return (
        <div className="w-full">
            {field.label && (
                <label
                    htmlFor={field.fieldname}
                    className="block text-[13px] font-medium text-muted-foreground mb-1.5"
                >
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                    {language && (
                        <span className="ml-2 text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground">
                            {language}
                        </span>
                    )}
                </label>
            )}
            <textarea
                id={field.fieldname}
                name={field.fieldname}
                value={value ?? ''}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                disabled={isDisabled}
                required={field.reqd === 1}
                rows={10}
                spellCheck={false}
                className={cn(
                    "flex w-full rounded-lg border border-border bg-muted px-4 py-3 text-[13px] text-foreground font-mono leading-relaxed transition-colors duration-200 placeholder:text-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 resize-y",
                    error && "ring-2 ring-destructive focus-visible:ring-destructive"
                )}
                placeholder={language ? `// ${language}` : '// Code'}
            />
            {error && (
                <p className="mt-1.5 text-xs text-destructive font-medium">{error}</p>
            )}
            {field.description && !error && (
                <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}
        </div>
    );
}

CodeField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        options: PropTypes.string, // Language hint (Python, JavaScript, etc.)
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export default CodeField;
