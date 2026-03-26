import { useMemo } from 'react';
import PropTypes from 'prop-types';
import { LinkField } from './LinkField';

/**
 * Dynamic Link field - a Link field where the target DocType is determined
 * by another field's value.
 *
 * In ERPNext, `field.options` contains the fieldname that holds the DocType name.
 * Example: if field.options = "link_doctype" and formData.link_doctype = "Customer",
 * then this field searches Customer records.
 */
export function DynamicLinkField({ field, value, onChange, disabled, error, formData }) {
    // Resolve the target doctype from formData using field.options as the key
    const targetDoctype = formData?.[field.options] || '';

    // Build a modified field descriptor with the resolved doctype as options
    const resolvedField = useMemo(() => ({
        ...field,
        options: targetDoctype,
        // Keep original fieldtype info for reference
        _originalFieldtype: 'Dynamic Link',
    }), [field, targetDoctype]);

    // If no target doctype is set, show a disabled input with a hint
    if (!targetDoctype) {
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
                <input
                    type="text"
                    id={field.fieldname}
                    name={field.fieldname}
                    value={value ?? ''}
                    disabled
                    placeholder={`Select ${field.options || 'link type'} first`}
                    className="flex h-10 w-full rounded-[6px] border-0 bg-muted px-3 py-1.5 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
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

    // Delegate to LinkField with the resolved doctype
    return (
        <LinkField
            field={resolvedField}
            value={value}
            onChange={onChange}
            disabled={disabled}
            error={error}
        />
    );
}

DynamicLinkField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        options: PropTypes.string, // The fieldname that holds the target doctype
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
    formData: PropTypes.object,
};

export default DynamicLinkField;
