import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';

/**
 * HTML display field for HTML fieldtype
 * Renders sanitized HTML content using DOMPurify
 */
export function HtmlField({ field, value }) {
    const sanitizedHtml = DOMPurify.sanitize(value || field.options || '', {
        ALLOWED_TAGS: ['p', 'br', 'b', 'i', 'u', 'strong', 'em', 'a', 'ul', 'ol', 'li',
                       'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code',
                       'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'img'],
        ALLOWED_ATTR: ['href', 'target', 'class', 'src', 'alt', 'width', 'height'],
        ALLOW_DATA_ATTR: false,
    });

    if (!sanitizedHtml) {
        return null;
    }

    return (
        <div className="space-y-1">
            {field.label && (
                <label className="block text-[13px] font-medium text-foreground">
                    {field.label}
                </label>
            )}
            <div
                className="prose prose-sm dark:prose-invert max-w-none p-3 bg-muted/50 border border-border rounded-lg"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
        </div>
    );
}

HtmlField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        fieldtype: PropTypes.string,
        options: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
};

export default HtmlField;
