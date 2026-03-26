import { memo } from 'react';
import PropTypes from 'prop-types';
import Textarea from '../../ui/Textarea';

/**
 * Textarea field for Text, Small Text, Long Text fieldtypes
 */
const TextareaField = memo(function TextareaField({ field, value, onChange, disabled, error }) {
    // Determine rows based on fieldtype
    let rows = 3;
    switch (field.fieldtype) {
        case 'Long Text':
        case 'Text Editor':
            rows = 6;
            break;
        case 'Small Text':
            rows = 2;
            break;
        case 'Text':
        default:
            rows = 3;
            break;
    }

    const handleChange = (e) => {
        onChange(field.fieldname, e.target.value);
    };

    return (
        <Textarea
            label={field.label}
            value={value ?? ''}
            onChange={handleChange}
            placeholder={field.label}
            disabled={disabled || field.read_only === 1}
            required={field.reqd === 1}
            id={field.fieldname}
            name={field.fieldname}
            rows={rows}
            error={error}
            maxLength={field.length || undefined}
        />
    );
});

TextareaField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        length: PropTypes.number,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
};

export { TextareaField };
export default TextareaField;
