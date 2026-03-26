import { vi } from '../locales/vi';

// Deprecated: This list is now moved to src/locales/vi.js
// We keep this export empty or minimal if other files import it directly, 
// but getDoctypeLabel will use the locale source.
export const DOCTYPE_LABELS = {};

export const getDoctypeLabel = (doctype) => {
    if (!doctype) return '';
    const key = `doctype.${doctype}`;
    // Fallback to strict exact match or try to match with spaces if needed
    // The vi.js keys match the doctype IDs directly usually.
    return vi[key] || vi[`doctype.${doctype.replace(/ /g, '_')}`] || doctype;
};
