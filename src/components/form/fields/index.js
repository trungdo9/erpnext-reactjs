/**
 * Field Component Registry
 *
 * Maps Frappe fieldtypes to React components.
 * All form rendering should use this registry - no hardcoded field logic!
 */

import TextField from './TextField';
import NumberField from './NumberField';
import DateField from './DateField';
import SelectField from './SelectField';
import CheckField from './CheckField';
import TextareaField from './TextareaField';
import LinkField from './LinkField';
import TreeLinkField from './TreeLinkField';
import FilteredLinkField from './FilteredLinkField';
import AttachField from './AttachField';
import HtmlField from './HtmlField';
import ChildTableField from './ChildTableField';
import DynamicLinkField from './DynamicLinkField';
import ColorField from './ColorField';
import RatingField from './RatingField';
import DurationField from './DurationField';
import CodeField from './CodeField';
import HeadingField from './HeadingField';
import SignatureField from './SignatureField';
import GeolocationField from './GeolocationField';

// Re-export all field components
export {
    TextField,
    NumberField,
    DateField,
    SelectField,
    CheckField,
    TextareaField,
    LinkField,
    TreeLinkField,
    FilteredLinkField,
    AttachField,
    HtmlField,
    ChildTableField,
    DynamicLinkField,
    ColorField,
    RatingField,
    DurationField,
    CodeField,
    HeadingField,
    SignatureField,
    GeolocationField,
};

/**
 * Fieldtype to Component mapping
 */
export const FIELD_COMPONENTS = {
    // Text inputs
    'Data': TextField,
    'Password': TextField,
    'Read Only': TextField,

    // Number inputs
    'Int': NumberField,
    'Float': NumberField,
    'Currency': NumberField,
    'Percent': NumberField,

    // Date/Time inputs
    'Date': DateField,
    'Datetime': DateField,
    'Time': DateField,

    // Selection
    'Select': SelectField,
    'Check': CheckField,

    // Text areas
    'Text': TextareaField,
    'Small Text': TextareaField,
    'Long Text': TextareaField,
    'Text Editor': TextareaField,

    // Link (autocomplete)
    'Link': LinkField,

    // File upload
    'Attach': AttachField,
    'Attach Image': AttachField,

    // Display only
    'HTML': HtmlField,

    // Child table
    'Table': ChildTableField,

    // Dynamic Link (target doctype determined by another field)
    'Dynamic Link': DynamicLinkField,

    // Color picker
    'Color': ColorField,

    // Star rating (0-1 decimal, displayed as 5 stars)
    'Rating': RatingField,

    // Duration (stored as seconds)
    'Duration': DurationField,

    // Code editor (monospace textarea)
    'Code': CodeField,

    // Heading (display only)
    'Heading': HeadingField,

    // Signature (placeholder)
    'Signature': SignatureField,

    // Geolocation (lat/lng)
    'Geolocation': GeolocationField,
};

/**
 * Layout fieldtypes used for form structure (sections, columns, tabs)
 * These are NOT skipped - they are processed by groupFieldsIntoSections()
 */
export const LAYOUT_FIELDTYPES = [
    'Section Break',
    'Column Break',
    'Tab Break',
];

/**
 * Fieldtypes that should be skipped during form rendering (non-layout, non-renderable)
 */
export const SKIP_FIELDTYPES = [
    'Fold',
    'Button',
    'Spacer',
];

/**
 * Get the appropriate component for a fieldtype
 * 
 * @param {string} fieldtype - The Frappe fieldtype
 * @returns {React.Component|null} The component to render, or null if not supported
 */
export function getFieldComponent(fieldtype) {
    return FIELD_COMPONENTS[fieldtype] || null;
}

/**
 * Check if a fieldtype is renderable
 * 
 * @param {string} fieldtype - The Frappe fieldtype
 * @returns {boolean}
 */
export function isRenderableFieldtype(fieldtype) {
    return fieldtype in FIELD_COMPONENTS;
}

/**
 * Check if a fieldtype should be skipped
 * 
 * @param {string} fieldtype - The Frappe fieldtype
 * @returns {boolean}
 */
export function shouldSkipFieldtype(fieldtype) {
    return SKIP_FIELDTYPES.includes(fieldtype);
}

export default FIELD_COMPONENTS;
