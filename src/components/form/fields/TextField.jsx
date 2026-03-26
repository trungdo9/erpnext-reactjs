import PropTypes from 'prop-types';
import Input from '../../ui/Input';

/**
 * Text input field for Data, Password fieldtypes
 */
export function TextField({ field, value, onChange, disabled, error }) {
    const inputType = field.fieldtype === 'Password' ? 'password' : 'text';

    return (
        <Input
            type={inputType}
            label={field.label}
            value={value ?? ''}
            onChange={(e) => onChange(field.fieldname, e.target.value)}
            placeholder={field.label}
            disabled={disabled || field.read_only === 1}
            required={field.reqd === 1}
            id={field.fieldname}
            name={field.fieldname}
            error={error}
            maxLength={field.length || undefined}
        />
    );
}

TextField.propTypes = {
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

export default TextField;
