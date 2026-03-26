/**
 * useAsyncValidation Hook
 *
 * Provides async validation for form fields that require server-side checks.
 * Examples: email uniqueness, username availability, document existence.
 *
 * Features:
 * - Debounced validation to avoid excessive API calls
 * - Caching of validation results
 * - Loading state per field
 * - Configurable validation rules per doctype
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { apiClient } from '../api/gateway';
import { useTranslation } from './useTranslation';

/**
 * Async validation rules configuration
 * Key: DocType name
 * Value: Array of validation rules
 */
const ASYNC_VALIDATION_RULES = {
    // ===========================================
    // User Management
    // ===========================================
    'User': [
        {
            fieldname: 'email',
            type: 'unique',
            messageKey: 'validation.async.email_exists',
        },
        {
            fieldname: 'username',
            type: 'unique',
            messageKey: 'validation.async.username_taken',
        },
    ],

    // ===========================================
    // Work Management
    // ===========================================
    'Work Report': [
        {
            fieldname: 'report_code',
            type: 'unique',
            messageKey: 'validation.async.report_code_exists',
        },
    ],
    'Purchase Request': [
        {
            fieldname: 'request_code',
            type: 'unique',
            messageKey: 'validation.async.request_code_exists',
        },
    ],

    // ===========================================
    // Production - Cham Soc Buong
    // ===========================================
    'cat_bap': [
        {
            fieldname: 'ma_phieu',
            type: 'unique',
            messageKey: 'validation.async.ticket_code_exists',
        },
    ],
    'phun_buong': [
        {
            fieldname: 'ma_phieu',
            type: 'unique',
            messageKey: 'validation.async.ticket_code_exists',
        },
    ],
    'bao_buong': [
        {
            fieldname: 'ma_phieu',
            type: 'unique',
            messageKey: 'validation.async.ticket_code_exists',
        },
    ],
    'thu_hoach': [
        {
            fieldname: 'ma_phieu',
            type: 'unique',
            messageKey: 'validation.async.ticket_code_exists',
        },
    ],

    // ===========================================
    // Production - Work Orders
    // ===========================================

    // ===========================================
    // Production - Xuong San Xuat
    // ===========================================
    'san_xuat': [
        {
            fieldname: 'ma_lo',
            type: 'unique',
            messageKey: 'validation.async.production_lot_exists',
        },
    ],
    'nhap_kho': [
        {
            fieldname: 'ma_phieu_nhap',
            type: 'unique',
            messageKey: 'validation.async.receipt_code_exists',
        },
    ],
    'xuat_kho': [
        {
            fieldname: 'ma_phieu_xuat',
            type: 'unique',
            messageKey: 'validation.async.dispatch_code_exists',
        },
    ],
    'cong_nhan': [
        {
            fieldname: 'ma_cong_nhan',
            type: 'unique',
            messageKey: 'validation.async.worker_code_exists',
        },
    ],

    // ===========================================
    // Kiem Ke (Inventory/Pest Control)
    // ===========================================
    'bvtv': [
        {
            fieldname: 'ma_kiem_tra',
            type: 'unique',
            messageKey: 'validation.async.inspection_code_exists',
        },
    ],
    'fusarium': [
        {
            fieldname: 'ma_mau',
            type: 'unique',
            messageKey: 'validation.async.sample_code_exists',
        },
    ],
};

/**
 * Check if a value is unique in the doctype
 */
const checkUnique = async (doctype, fieldname, value, excludeName = null) => {
    if (!value || !doctype || !fieldname) return { valid: true };

    try {
        const filters = [[fieldname, '=', value]];

        // Exclude current document when editing
        if (excludeName) {
            filters.push(['name', '!=', excludeName]);
        }

        const result = await apiClient.getList(doctype, {
            filters,
            fields: ['name'],
            limit_page_length: 1,
        });

        return {
            valid: !result || result.length === 0,
            existing: result?.[0]?.name,
        };
    } catch (error) {
        console.warn('[useAsyncValidation] Check unique failed:', error.message);
        return { valid: true }; // Assume valid on error
    }
};

/**
 * Check if a linked document exists
 */
const checkExists = async (linkedDoctype, value) => {
    if (!value || !linkedDoctype) return { valid: true };

    try {
        const result = await apiClient.getDoc(linkedDoctype, value);
        return { valid: !!result, data: result };
    } catch {
        return { valid: false };
    }
};

/**
 * Custom validation function type
 */
const runCustomValidation = async (validateFn, value, formData) => {
    try {
        const result = await validateFn(value, formData);
        return typeof result === 'boolean'
            ? { valid: result }
            : result;
    } catch (error) {
        console.warn('[useAsyncValidation] Custom validation failed:', error.message);
        return { valid: true };
    }
};

/**
 * Main hook for async validation
 *
 * @param {string} doctype - The DocType name
 * @param {Object} formData - Current form data
 * @param {Object} options - Configuration options
 * @returns {Object} - Validation state and methods
 */
export function useAsyncValidation(doctype, formData, options = {}) {
    const {
        debounceMs = 500,
        enabled = true,
        customRules = [],
        documentName = null, // Current document name for edit mode
    } = options;

    const { t } = useTranslation();

    // Validation state per field
    const [validating, setValidating] = useState({});
    const [asyncErrors, setAsyncErrors] = useState({});
    const [validatedValues, setValidatedValues] = useState({});

    // Debounce timers
    const timersRef = useRef({});

    // Cache for validation results
    const cacheRef = useRef({});

    // Get validation rules for this doctype
    const rules = useMemo(() => {
        const doctypeRules = ASYNC_VALIDATION_RULES[doctype] || [];
        return [...doctypeRules, ...customRules];
    }, [doctype, customRules]);

    // Get fields that require async validation
    const asyncValidationFields = useMemo(() => {
        return rules.map(r => r.fieldname);
    }, [rules]);

    /**
     * Validate a single field asynchronously
     */
    const validateField = useCallback(async (fieldname, value) => {
        if (!enabled) return;

        const rule = rules.find(r => r.fieldname === fieldname);
        if (!rule) return;

        // Check cache first
        const cacheKey = `${doctype}:${fieldname}:${value}`;
        if (cacheRef.current[cacheKey] !== undefined) {
            const cached = cacheRef.current[cacheKey];
            if (!cached.valid) {
                setAsyncErrors(prev => ({ ...prev, [fieldname]: t(rule.messageKey) }));
            } else {
                setAsyncErrors(prev => {
                    const next = { ...prev };
                    delete next[fieldname];
                    return next;
                });
            }
            return cached;
        }

        // Set loading state
        setValidating(prev => ({ ...prev, [fieldname]: true }));

        try {
            let result;

            switch (rule.type) {
                case 'unique':
                    result = await checkUnique(doctype, fieldname, value, documentName);
                    break;

                case 'exists':
                    result = await checkExists(rule.linkedDoctype, value);
                    break;

                case 'custom':
                    result = await runCustomValidation(rule.validate, value, formData);
                    break;

                default:
                    result = { valid: true };
            }

            // Cache result
            cacheRef.current[cacheKey] = result;

            // Update error state
            if (!result.valid) {
                setAsyncErrors(prev => ({
                    ...prev,
                    [fieldname]: t(rule.messageKey || 'validation.async.invalid_value'),
                }));
            } else {
                setAsyncErrors(prev => {
                    const next = { ...prev };
                    delete next[fieldname];
                    return next;
                });
            }

            // Track validated values
            setValidatedValues(prev => ({ ...prev, [fieldname]: value }));

            return result;
        } finally {
            setValidating(prev => ({ ...prev, [fieldname]: false }));
        }
    }, [enabled, rules, doctype, documentName, formData, t]);

    /**
     * Handle field change with debounced validation
     */
    const handleFieldChangeForValidation = useCallback((fieldname, value) => {
        if (!asyncValidationFields.includes(fieldname)) return;

        // Clear existing timer
        if (timersRef.current[fieldname]) {
            clearTimeout(timersRef.current[fieldname]);
        }

        // Clear previous error while typing
        setAsyncErrors(prev => {
            const next = { ...prev };
            delete next[fieldname];
            return next;
        });

        // Skip validation for empty values
        if (!value) {
            setValidating(prev => ({ ...prev, [fieldname]: false }));
            return;
        }

        // Set debounced validation
        timersRef.current[fieldname] = setTimeout(() => {
            validateField(fieldname, value);
        }, debounceMs);
    }, [asyncValidationFields, validateField, debounceMs]);

    /**
     * Validate all async fields at once (for form submission)
     */
    const validateAllAsync = useCallback(async () => {
        if (!enabled || rules.length === 0) return true;

        const validations = [];

        for (const rule of rules) {
            const value = formData[rule.fieldname];
            if (value && value !== validatedValues[rule.fieldname]) {
                validations.push(validateField(rule.fieldname, value));
            }
        }

        if (validations.length === 0) {
            return Object.keys(asyncErrors).length === 0;
        }

        const results = await Promise.all(validations);
        return results.every(r => r?.valid !== false);
    }, [enabled, rules, formData, validatedValues, validateField, asyncErrors]);

    /**
     * Clear validation cache
     */
    const clearCache = useCallback(() => {
        cacheRef.current = {};
        setAsyncErrors({});
        setValidatedValues({});
    }, []);

    /**
     * Check if any field is currently validating
     */
    const isValidating = useMemo(() => {
        return Object.values(validating).some(Boolean);
    }, [validating]);

    return {
        // State
        asyncErrors,
        validating,
        isValidating,
        asyncValidationFields,

        // Methods
        handleFieldChangeForValidation,
        validateField,
        validateAllAsync,
        clearCache,
    };
}

export default useAsyncValidation;
