import PropTypes from 'prop-types';

/**
 * Heading field for Heading fieldtype
 *
 * Display-only field that renders the label as a heading.
 * No input element is rendered.
 */
export function HeadingField({ field }) {
    if (!field.label) return null;

    return (
        <div className="w-full py-1">
            <h4 className="text-base font-semibold text-foreground">
                {field.label}
            </h4>
            {field.description && (
                <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
            )}
        </div>
    );
}

HeadingField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        description: PropTypes.string,
    }).isRequired,
};

export default HeadingField;
