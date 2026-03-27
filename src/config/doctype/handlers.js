/**
 * Field Change Handlers & Link Field Filters
 * Steel ERP - clean slate
 */

export const LINK_FIELD_FILTERS = {};

export const CHILD_TABLE_QUICK_PICK = {};

export const CHILD_FIELD_CHANGE_HANDLERS = {};

export const FIELD_CHANGE_HANDLERS = {};

export const DYNAMIC_READONLY_FIELDS = {};

export function getQuickPickConfig(doctype, fieldname) {
    return CHILD_TABLE_QUICK_PICK[doctype]?.[fieldname] || null;
}

export function getChildFieldChangeHandler(doctype, fieldname) {
    return CHILD_FIELD_CHANGE_HANDLERS[doctype]?.[fieldname] || null;
}

export function getFieldChangeAutoSets(doctype) {
    return FIELD_CHANGE_HANDLERS[doctype] || null;
}

export function getDynamicReadOnlyFields(doctype) {
    return DYNAMIC_READONLY_FIELDS[doctype] || [];
}

export function getLinkFieldFilter(doctype, fieldname) {
    return LINK_FIELD_FILTERS[doctype]?.[fieldname] || null;
}

export function hasLinkFieldFilter(doctype, fieldname) {
    return !!(LINK_FIELD_FILTERS[doctype]?.[fieldname]);
}
