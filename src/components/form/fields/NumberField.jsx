import PropTypes from 'prop-types';
import Input from '../../ui/Input';

/**
 * Number input field for Int, Float, Currency, Percent fieldtypes
 */
export function NumberField({ field, value, onChange, disabled, error }) {
    const isInteger = field.fieldtype === 'Int';
    const step = isInteger ? '1' : 'any';

    // Format display value
    const displayValue = value ?? '';

    const handleChange = (e) => {
        const inputValue = e.target.value;

        // Allow empty input
        if (inputValue === '') {
            onChange(field.fieldname, null);
            return;
        }

        // Parse based on type
        if (isInteger) {
            const parsed = parseInt(inputValue, 10);
            onChange(field.fieldname, isNaN(parsed) ? inputValue : parsed);
        } else {
            const parsed = parseFloat(inputValue);
            onChange(field.fieldname, isNaN(parsed) ? inputValue : parsed);
        }
    };

    return (
        <Input
            type="number"
            label={field.label}
            value={displayValue}
            onChange={handleChange}
            placeholder={field.label}
            disabled={disabled || field.read_only === 1}
            required={field.reqd === 1}
            id={field.fieldname}
            name={field.fieldname}
            step={step}
            min={field.min_value}
            max={field.max_value}
            error={error}
            className="text-right tabular-nums"
        />
    );
}

NumberField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        options: PropTypes.string,
        min_value: PropTypes.number,
        max_value: PropTypes.number,
    }).isRequired,
    value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export default NumberField;
