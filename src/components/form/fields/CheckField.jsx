import { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Checkbox field for Check fieldtype
 */
const CheckField = memo(function CheckField({ field, value, onChange, disabled, error }) {
    const isChecked = value === 1 || value === true || value === '1';

    const handleChange = (e) => {
        // Frappe uses 1/0 for boolean
        onChange(field.fieldname, e.target.checked ? 1 : 0);
    };

    return (
        <div className="space-y-1">
            <label
                htmlFor={field.fieldname}
                className="flex items-center gap-3 cursor-pointer group"
            >
                <input
                    type="checkbox"
                    id={field.fieldname}
                    name={field.fieldname}
                    checked={isChecked}
                    onChange={handleChange}
                    disabled={disabled || field.read_only === 1}
                    className={`
                        h-5 w-5
                        rounded-[4px] border-border
                        text-primary
                        checked:bg-primary checked:border-primary
                        focus:ring-2 focus:ring-primary/20 focus:ring-offset-0
                        transition-colors duration-150
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${error ? 'border-destructive' : ''}
                    `}
                />
                <span className="text-[13px] font-medium text-foreground group-hover:text-foreground/80 transition-colors duration-150">
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </span>
            </label>
            {error && (
                <p className="text-sm text-destructive ml-8">{error}</p>
            )}
            {field.description && !error && (
                <p className="text-xs text-muted-foreground ml-8">{field.description}</p>
            )}
        </div>
    );
});

CheckField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.bool, PropTypes.string]),
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export { CheckField };
export default CheckField;
