/**
 * Hardcoded formula definitions for DocTypes
 *
 * These are used as fallback when "Cong Thuc" DocType doesn't exist
 * or doesn't have formulas for specific DocTypes.
 *
 * Formula types:
 * - sum: Sum of source fields
 * - average: Average of source fields
 * - percent: Percentage calculation
 * - custom: Custom expression (use safeEval)
 * - ratio: Division of two fields
 */

export const DOCTYPE_FORMULAS = {
    // Placeholder for custom formulas
    // Add formula definitions here as needed
};

/**
 * Get formulas for a DocType
 * @param {string} doctype - DocType name (Vietnamese or slug)
 * @returns {Array} Array of formula definitions
 */
export const getDocTypeFormulas = (doctype) => {
    // Direct match
    if (DOCTYPE_FORMULAS[doctype]) {
        return DOCTYPE_FORMULAS[doctype];
    }

    // Try variations of the name
    const variations = [
        doctype.replace(/ /g, '_'),           // "Hoat Dong CSB" -> "Hoat_Dong_CSB"
        doctype.replace(/_/g, ' '),           // "Hoat_Dong_CSB" -> "Hoat Dong CSB"
        doctype.toLowerCase(),
        doctype.toLowerCase().replace(/ /g, '_'),
    ];

    for (const variation of variations) {
        for (const [key, formulas] of Object.entries(DOCTYPE_FORMULAS)) {
            if (key.toLowerCase() === variation.toLowerCase() ||
                key.toLowerCase().replace(/ /g, '_') === variation.toLowerCase()) {
                return formulas;
            }
        }
    }

    return [];
};

export default DOCTYPE_FORMULAS;
