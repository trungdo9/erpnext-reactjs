/**
 * DocType Behaviors Configuration
 *
 * Defines client-side behaviors for specific doctypes:
 * - Field visibility conditions (replaces Frappe toggle_display)
 * - Auto-populate child tables for new documents
 * - Read-only columns in child tables
 * - Tree-type doctypes for hierarchical display
 *
 * This replaces Frappe Client Scripts in the React frontend.
 */

/**
 * Number formatting for the project
 * Thousands separator: . (dot), Decimal separator: , (comma)
 * e.g. 18500 → "18.500", 1234.56 → "1.234,56"
 */
export const NUMBER_FORMAT = {
    locale: 'vi-VN',
    /** Format a number with project-standard separators (. thousands, , decimal) */
    format: (value, decimals) => {
        const num = Number(value) || 0;
        return num.toLocaleString('vi-VN', decimals != null ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals } : undefined);
    },
};

/**
 * Tree-type DocTypes (is_tree = true in Frappe)
 * These doctypes have hierarchical structure and should use tree views
 */
export const TREE_DOCTYPES = [
    'Item Group',
    'Account',
    'Cost Center',
    'Territory',
    'Sales Person',
    'Customer Group',
    'Supplier Group',
    'Department',
    'Company',
    'Warehouse',
    'Vi Tri',
    // Add more tree doctypes as needed
];

/**
 * Child DocTypes that should auto-populate with "luống" rows
 */
export const LUONG_CHILD_DOCTYPES = ['Chi Tiet Luong'];
export const LUONG_ROW_COUNT = 200;

/**
 * Doctypes that should auto-populate luống child tables.
 * Only the FIRST Table field with "Chi Tiet Luong" child doctype will be populated.
 */
export const AUTO_POPULATE_DOCTYPES = [
    // Add doctypes here as needed
];

// Track which forms have already auto-populated (to prevent duplicates)
const autoPopulatedFields = new Map();

export const DOCTYPE_BEHAVIORS = {
    'Vi Tri': {
        fieldVisibility: {
            // Always hide - auto-set by cap change handler (Thửa=0, else=1)
            'is_group': () => false,
        },
    },
};

/**
 * Get behavior configuration for a doctype
 * @param {string} doctype - DocType name
 * @returns {Object|null} Behavior configuration or null
 */
export function getDoctypeBehavior(doctype) {
    return DOCTYPE_BEHAVIORS[doctype] || null;
}

/**
 * Check if a field should be visible based on doctype behaviors
 * @param {string} doctype - DocType name
 * @param {string} fieldname - Field name
 * @param {Object} doc - Current document data
 * @returns {boolean} Whether field should be visible
 */
export function isFieldVisible(doctype, fieldname, doc) {
    const behavior = DOCTYPE_BEHAVIORS[doctype];
    if (!behavior?.fieldVisibility?.[fieldname]) {
        return true; // No rule = visible
    }

    try {
        return behavior.fieldVisibility[fieldname](doc);
    } catch (err) {
        console.warn(`[DoctypeBehaviors] Error evaluating visibility for ${doctype}.${fieldname}:`, err);
        return true;
    }
}

/**
 * Check if a child doctype is a "luống" type that needs auto-populate
 * @param {string} childDoctype - Child DocType name
 * @returns {boolean}
 */
export function isLuongChildDoctype(childDoctype) {
    return LUONG_CHILD_DOCTYPES.includes(childDoctype);
}

/**
 * Check if a doctype is a tree-type (hierarchical structure)
 * @param {string} doctype - DocType name
 * @returns {boolean}
 */
export function isTreeDoctype(doctype) {
    return TREE_DOCTYPES.includes(doctype);
}

/**
 * Reset auto-populate tracking for a doctype (call when form closes/resets)
 * @param {string} doctype - Parent DocType name
 */
export function resetAutoPopulateTracking(doctype) {
    autoPopulatedFields.delete(doctype);
}

/**
 * Check if a field should be auto-populated
 * Only allows the FIRST luống Table field per doctype
 * @param {string} doctype - Parent DocType name
 * @param {string} fieldname - Field name
 * @param {string} childDoctype - Child DocType name
 * @returns {boolean}
 */
export function shouldAutoPopulateField(doctype, fieldname, childDoctype) {
    // Check if doctype is in the allowed list
    if (!AUTO_POPULATE_DOCTYPES.includes(doctype)) {
        return false;
    }

    // Check if child doctype is a "luống" type
    if (!isLuongChildDoctype(childDoctype)) {
        return false;
    }

    // Check if we've already populated a field for this doctype
    if (autoPopulatedFields.has(doctype)) {
        return false;
    }

    // Mark this field as the one being populated
    autoPopulatedFields.set(doctype, fieldname);
    return true;
}

/**
 * Generate auto-populate rows for a child table
 * Only populates the FIRST Table field with "Chi Tiet Luong" child doctype
 *
 * @param {string} doctype - Parent DocType name
 * @param {string} tablefield - Child table field name
 * @param {string} childDoctype - Child DocType name
 * @returns {Array} Array of row objects or empty array
 */
export function generateAutoPopulateRows(doctype, tablefield, childDoctype) {
    // Check if this field should be auto-populated (first luống table only)
    if (!shouldAutoPopulateField(doctype, tablefield, childDoctype)) {
        return [];
    }

    const rows = [];
    for (let i = 0; i < LUONG_ROW_COUNT; i++) {
        rows.push({
            doctype: childDoctype,
            __islocal: 1,
            idx: i + 1,
            so_luong: `L${i + 1}`,
            gia_tri: 0,
        });
    }

    return rows;
}

/**
 * Check if a column in child table should be read-only
 * Dynamic: for "Chi Tiet Luong" child doctype, "so_luong" column is always read-only
 *
 * @param {string} doctype - Parent DocType name
 * @param {string} tablefield - Child table field name
 * @param {string} columnName - Column/field name
 * @param {string} childDoctype - Child DocType name (optional, for dynamic detection)
 * @returns {boolean} Whether column is read-only
 */
export function isChildColumnReadOnly(doctype, tablefield, columnName, childDoctype) {
    // Dynamic detection: for luống child tables, so_luong is read-only
    if (childDoctype && isLuongChildDoctype(childDoctype) && columnName === 'so_luong') {
        return true;
    }
    return false;
}

// Export autoPopulatedFields for external access (e.g., testing)
export { autoPopulatedFields };

// Signature field config
export const SIGNATURE_CONFIG = {
    penColor: { light: '#1a1a2e', dark: '#e5e5e5' },
    backgroundColor: 'rgba(255,255,255,0)',
    minWidth: 0.5,
    maxWidth: 2.5,
    canvasHeight: 200,
    canvasHeightMobile: 160,
};

export default DOCTYPE_BEHAVIORS;
