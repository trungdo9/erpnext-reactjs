/**
 * Safe expression evaluator for Frappe depends_on expressions
 * Uses a whitelist approach instead of new Function() for security
 */

// Helper functions matching Frappe Desk environment
const helpers = {
    in_list: (list, val) => Array.isArray(list) && list.includes(val),
    not_in_list: (list, val) => Array.isArray(list) && !list.includes(val),
    cint: (v) => parseInt(v, 10) || 0,
    cstr: (v) => (v == null ? "" : String(v)),
    flt: (v) => parseFloat(v) || 0,
};

/**
 * Safely get nested value from doc (e.g., "doc.field" -> doc['field'])
 * Note: Reserved for future use with complex nested expressions
 */
const _getDocValue = (path, doc) => {
    const parts = path.replace(/^doc\./, '').split('.');
    let value = doc;
    for (const part of parts) {
        if (value == null) return undefined;
        value = value[part];
    }
    return value;
};

/**
 * Parse and evaluate a simple comparison expression
 * Supports: ==, !=, >, <, >=, <=
 */
const evaluateComparison = (expr, doc) => {
    // Match patterns like: doc.field == 'value' or doc.field == 1
    const comparisonMatch = expr.match(/^doc\.(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
    if (comparisonMatch) {
        const [, field, operator, rawValue] = comparisonMatch;
        const docValue = doc[field];

        // Parse the comparison value
        let compareValue = rawValue.trim();
        if (compareValue.startsWith("'") || compareValue.startsWith('"')) {
            compareValue = compareValue.slice(1, -1);
        } else if (compareValue === 'true') {
            compareValue = true;
        } else if (compareValue === 'false') {
            compareValue = false;
        } else if (compareValue === 'null') {
            compareValue = null;
        } else if (!isNaN(Number(compareValue))) {
            compareValue = Number(compareValue);
        }

        switch (operator) {
            case '==': return docValue == compareValue;
            case '!=': return docValue != compareValue;
            case '>': return docValue > compareValue;
            case '<': return docValue < compareValue;
            case '>=': return docValue >= compareValue;
            case '<=': return docValue <= compareValue;
            default: return true;
        }
    }
    return null;
};

/**
 * Parse and evaluate in_list/not_in_list expressions
 */
const evaluateListCheck = (expr, doc) => {
    // Match: in_list(['a', 'b'], doc.field) or in_list(["a", "b"], doc.field)
    const inListMatch = expr.match(/^(in_list|not_in_list)\s*\(\s*\[([^\]]*)\]\s*,\s*doc\.(\w+)\s*\)$/);
    if (inListMatch) {
        const [, func, listStr, field] = inListMatch;
        const list = listStr.split(',').map(s => {
            const trimmed = s.trim();
            if (trimmed.startsWith("'") || trimmed.startsWith('"')) {
                return trimmed.slice(1, -1);
            }
            return trimmed;
        });
        const docValue = doc[field];
        return func === 'in_list' ? helpers.in_list(list, docValue) : helpers.not_in_list(list, docValue);
    }
    return null;
};

/**
 * Evaluate depends_on expression safely
 */
export const evaluateDependsOn = (expression, doc) => {
    if (!expression) return true;

    if (expression.startsWith("eval:")) {
        try {
            const jsExpr = expression.slice(5).trim();

            // Helper to evaluate a single part (no AND/OR)
            const evaluatePart = (part) => {
                part = part.trim();
                // Check simple truthy: doc.field
                if (/^doc\.\w+$/.test(part)) {
                    return !!doc[part.replace('doc.', '')];
                }
                // Check comparison
                const comp = evaluateComparison(part, doc);
                if (comp !== null) return comp;
                // Check in_list/not_in_list
                const list = evaluateListCheck(part, doc);
                if (list !== null) return list;
                // Unknown expression - default to true
                return true;
            };

            // Handle AND expressions FIRST (before single comparisons)
            if (jsExpr.includes('&&')) {
                const parts = jsExpr.split(/\s*&&\s*/);
                return parts.every(part => evaluatePart(part));
            }

            // Handle OR expressions
            if (jsExpr.includes('||')) {
                const parts = jsExpr.split(/\s*\|\|\s*/);
                return parts.some(part => evaluatePart(part));
            }

            // Handle single expression (no AND/OR)
            return evaluatePart(jsExpr);
        } catch (e) {
            console.warn(`Failed to evaluate depends_on: ${expression}`, e);
            return true;
        }
    }

    // Handle simple field=value syntax
    if (expression.includes('==')) {
        const [field, value] = expression.split('==').map(s => s.trim());
        let compareValue = value;
        if (value.startsWith("'") || value.startsWith('"')) {
            compareValue = value.slice(1, -1);
        }
        return doc[field] == compareValue;
    }

    // Fallback: check if the field specified by expression has a value
    return !!doc[expression];
};

export const validateMandatory = (fields, doc) => {
    const errors = [];
    fields.forEach(field => {
        if (field.reqd && !field.hidden) {
            const val = doc[field.fieldname];
            // Check for empty values: null, undefined, empty string
            // 0 is valid for numbers, false is valid for checkboxes (usually not mandatory though)
            if (val === null || val === undefined || val === '') {
                errors.push(field.label || field.fieldname);
            }
        }
    });
    return errors;
};

export const getEffectiveStatus = (doc) => {
    // 0 = Draft, 1 = Submitted, 2 = Cancelled
    // Returns 'Write', 'Read', 'Submitted', 'Cancelled'
    if (doc.docstatus === 1) return 'Submitted';
    if (doc.docstatus === 2) return 'Cancelled';
    return 'Write';
};
