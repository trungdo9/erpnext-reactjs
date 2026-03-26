import PropTypes from 'prop-types';
import DateInput from '../../ui/DateInput';
import { formatDate, formatDateTime } from '../../../utils/dateUtils';
import Input from '../../ui/Input';

/**
 * Date/Time input field for Date, Datetime, Time fieldtypes
 * Uses custom DateInput to always show dd/mm/yyyy format
 */
export function DateField({ field, value, onChange, disabled, error }) {
    // If read-only/disabled, show formatted text to enforce dd/mm/yyyy
    if (disabled || field.read_only === 1) {
        let displayValue = value;
        if (value) {
            try {
                if (field.fieldtype === 'Datetime') {
                    displayValue = formatDateTime(value);
                } else if (field.fieldtype === 'Date') {
                    displayValue = formatDate(value);
                }
            } catch {
                // Keep original if parse fails
            }
        }

        return (
            <Input
                type="text"
                label={field.label}
                value={displayValue || ''}
                disabled={true}
                required={field.reqd === 1}
                id={field.fieldname}
            />
        );
    }

    // Map fieldtype to DateInput mode
    let mode = 'date';
    if (field.fieldtype === 'Datetime') mode = 'datetime';
    else if (field.fieldtype === 'Time') mode = 'time';

    const handleChange = (e) => {
        const inputValue = e.target.value;
        onChange(field.fieldname, inputValue || null);
    };

    return (
        <DateInput
            mode={mode}
            label={field.label}
            value={value || ''}
            onChange={handleChange}
            disabled={disabled || field.read_only === 1}
            required={field.reqd === 1}
            id={field.fieldname}
            name={field.fieldname}
            error={error}
        />
    );
}

DateField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export default DateField;
