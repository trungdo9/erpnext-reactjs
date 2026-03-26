/**
 * Input Validation Utilities
 * Production-ready validation for form inputs
 */

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    // RFC 5322 compliant regex (simplified)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validate phone number (international format)
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
    if (!phone || typeof phone !== 'string') return false;
    // Allows +, digits, spaces, hyphens, parentheses
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/;
    const cleaned = phone.replace(/[\s-()]/g, '');
    return phoneRegex.test(phone) && cleaned.length >= 7 && cleaned.length <= 15;
}

/**
 * Validate URL format
 * @param {string} url
 * @returns {boolean}
 */
export function isValidUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate required field
 * @param {any} value
 * @returns {boolean}
 */
export function isRequired(value) {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
}

/**
 * Validate minimum length
 * @param {string} value
 * @param {number} minLength
 * @returns {boolean}
 */
export function minLength(value, minLength) {
    if (!value || typeof value !== 'string') return false;
    return value.trim().length >= minLength;
}

/**
 * Validate maximum length
 * @param {string} value
 * @param {number} maxLength
 * @returns {boolean}
 */
export function maxLength(value, maxLength) {
    if (!value) return true;
    if (typeof value !== 'string') return false;
    return value.length <= maxLength;
}

/**
 * Validate number range
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {boolean}
 */
export function inRange(value, min, max) {
    const num = Number(value);
    if (isNaN(num)) return false;
    return num >= min && num <= max;
}

/**
 * Validate positive number
 * @param {number} value
 * @returns {boolean}
 */
export function isPositive(value) {
    const num = Number(value);
    return !isNaN(num) && num > 0;
}

/**
 * Validate non-negative number
 * @param {number} value
 * @returns {boolean}
 */
export function isNonNegative(value) {
    const num = Number(value);
    return !isNaN(num) && num >= 0;
}

/**
 * Validate date is not in the past
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isNotPastDate(date) {
    if (!date) return false;
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return inputDate >= today;
}

/**
 * Validate date is not in the future
 * @param {string|Date} date
 * @returns {boolean}
 */
export function isNotFutureDate(date) {
    if (!date) return false;
    const inputDate = new Date(date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return inputDate <= today;
}

/**
 * Validate alphanumeric only
 * @param {string} value
 * @returns {boolean}
 */
export function isAlphanumeric(value) {
    if (!value || typeof value !== 'string') return false;
    return /^[a-zA-Z0-9]+$/.test(value);
}

/**
 * Validate pattern match
 * @param {string} value
 * @param {RegExp} pattern
 * @returns {boolean}
 */
export function matchesPattern(value, pattern) {
    if (!value || typeof value !== 'string') return false;
    return pattern.test(value);
}

/**
 * Sanitize string input (prevent XSS)
 * @param {string} input
 * @returns {string}
 */
export function sanitizeString(input) {
    if (!input || typeof input !== 'string') return '';
    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

/**
 * Validate Frappe doctype field based on fieldtype
 * @param {any} value
 * @param {Object} fieldMeta - Field metadata from Frappe
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateFrappeField(value, fieldMeta) {
    const { fieldtype, reqd, options, fieldname } = fieldMeta;

    // Check required
    if (reqd && !isRequired(value)) {
        return { valid: false, error: 'validation.required' };
    }

    // Skip validation for empty optional fields
    if (!reqd && !isRequired(value)) {
        return { valid: true };
    }

    switch (fieldtype) {
        case 'Data':
            if (fieldname?.toLowerCase().includes('email')) {
                if (!isValidEmail(value)) {
                    return { valid: false, error: 'validation.invalid_email' };
                }
            }
            if (fieldname?.toLowerCase().includes('phone') || fieldname?.toLowerCase().includes('mobile')) {
                if (!isValidPhone(value)) {
                    return { valid: false, error: 'validation.invalid_phone' };
                }
            }
            break;

        case 'Int':
            if (isNaN(parseInt(value, 10))) {
                return { valid: false, error: 'validation.invalid_integer' };
            }
            break;

        case 'Float':
        case 'Currency':
        case 'Percent':
            if (isNaN(parseFloat(value))) {
                return { valid: false, error: 'validation.invalid_number' };
            }
            if (fieldtype === 'Percent' && !inRange(value, 0, 100)) {
                return { valid: false, error: 'validation.percent_range' };
            }
            break;

        case 'Date':
        case 'Datetime':
            if (value && isNaN(new Date(value).getTime())) {
                return { valid: false, error: 'validation.invalid_date' };
            }
            break;

        case 'Select':
            if (options) {
                const validOptions = options.split('\n').map(o => o.trim()).filter(Boolean);
                if (!validOptions.includes(value)) {
                    return { valid: false, error: 'validation.invalid_selection' };
                }
            }
            break;

        case 'Link':
            // Link validation should be done via API
            break;

        default:
            break;
    }

    return { valid: true };
}

/**
 * Validate entire form data
 * @param {Object} formData
 * @param {Array} fields - Array of field metadata
 * @returns {{ valid: boolean, errors: Object }}
 */
export function validateForm(formData, fields) {
    const errors = {};
    let valid = true;

    for (const field of fields) {
        if (field.fieldtype === 'Section Break' || field.fieldtype === 'Column Break') {
            continue;
        }

        const value = formData[field.fieldname];
        const result = validateFrappeField(value, field);

        if (!result.valid) {
            errors[field.fieldname] = result.error;
            valid = false;
        }
    }

    return { valid, errors };
}

/**
 * Create a validator function from rules
 * @param {Object} rules - Validation rules object
 * @returns {Function} Validator function
 */
export function createValidator(rules) {
    return (value) => {
        for (const [rule, config] of Object.entries(rules)) {
            switch (rule) {
                case 'required':
                    if (config && !isRequired(value)) {
                        return config.message || 'validation.required';
                    }
                    break;
                case 'email':
                    if (config && value && !isValidEmail(value)) {
                        return config.message || 'validation.invalid_email';
                    }
                    break;
                case 'phone':
                    if (config && value && !isValidPhone(value)) {
                        return config.message || 'validation.invalid_phone';
                    }
                    break;
                case 'minLength':
                    if (config.value && !minLength(value, config.value)) {
                        return config.message || 'validation.min_length';
                    }
                    break;
                case 'maxLength':
                    if (config.value && !maxLength(value, config.value)) {
                        return config.message || 'validation.max_length';
                    }
                    break;
                case 'pattern':
                    if (config.value && !matchesPattern(value, config.value)) {
                        return config.message || 'validation.invalid_format';
                    }
                    break;
                case 'custom':
                    if (typeof config.validate === 'function') {
                        const error = config.validate(value);
                        if (error) return error;
                    }
                    break;
            }
        }
        return null; // No error
    };
}
