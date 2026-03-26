import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useTranslation } from "./useTranslation";

/**
 * Hook to manage form state with validation
 *
 * @param {Object} initialData - Initial document data
 * @param {Array} fields - Field definitions from metadata
 * @param {Object} options - Configuration options
 * @param {Object} options.childMetas - Metadata for child tables (key: child doctype name)
 *
 * @returns {Object} Form state and methods
 */
export function useFormState(initialData = {}, fields = [], options = {}) {
    const {
        validateOnChange: _validateOnChange = false, // Reserved for future validation feature
        childMetas = {}, // Metadata for child tables
    } = options;

    const { t } = useTranslation();

    const [formData, setFormData] = useState(() => initialData || {});
    const [originalData, setOriginalData] = useState(() => initialData || {});
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    // Track if initial data has been set to prevent re-sync
    const initialDataRef = useRef(null);
    const initialDataStr = JSON.stringify(initialData || {});

    // Sync with initialData changes (e.g., when document loads)
    // Only sync when the stringified data actually changes
    // This is intentional state sync from props - a valid pattern for controlled forms
    useEffect(() => {
        if (initialDataStr !== initialDataRef.current && initialData && Object.keys(initialData).length > 0) {
            initialDataRef.current = initialDataStr;
            // Using functional updates to avoid stale closures
            setFormData(() => initialData);
            setOriginalData(() => initialData);
            setErrors(() => ({}));
            setTouched(() => ({}));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialDataStr]);

    /**
     * Set a single field value
     */
    const setField = useCallback((fieldname, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldname]: value
        }));
        setTouched(prev => ({
            ...prev,
            [fieldname]: true
        }));

        // Clear error when field is modified
        if (errors[fieldname]) {
            setErrors(prev => {
                const next = { ...prev };
                delete next[fieldname];
                return next;
            });
        }
    }, [errors]);

    /**
     * Set multiple field values at once
     */
    const setFields = useCallback((updates) => {
        setFormData(prev => ({
            ...prev,
            ...updates
        }));
        setTouched(prev => ({
            ...prev,
            ...Object.keys(updates).reduce((acc, key) => {
                acc[key] = true;
                return acc;
            }, {})
        }));
    }, []);

    /**
     * Check if form has unsaved changes
     */
    const isDirty = useMemo(() => {
        const currentKeys = Object.keys(formData);
        const originalKeys = Object.keys(originalData);

        // Check if any key differs
        for (const key of currentKeys) {
            const current = formData[key];
            const original = originalData[key];

            // Handle arrays (child tables)
            if (Array.isArray(current) && Array.isArray(original)) {
                if (JSON.stringify(current) !== JSON.stringify(original)) {
                    return true;
                }
            } else if (current !== original) {
                // Handle undefined vs null vs empty string
                const currentEmpty = current === undefined || current === null || current === '';
                const originalEmpty = original === undefined || original === null || original === '';
                if (!(currentEmpty && originalEmpty)) {
                    return true;
                }
            }
        }

        // Check for keys in original not in current
        for (const key of originalKeys) {
            if (!(key in formData)) {
                return true;
            }
        }

        return false;
    }, [formData, originalData]);

    /**
     * Validate all fields based on metadata
     * Also validates child table cells based on childMetas
     */
    const validate = useCallback(() => {
        const newErrors = {};

        for (const field of fields) {
            const value = formData[field.fieldname];

            // Skip hidden fields
            if (field.hidden === 1) continue;

            // Required validation for non-table fields
            if (field.reqd === 1 && field.fieldtype !== 'Table') {
                const isEmpty =
                    value === undefined ||
                    value === null ||
                    value === '' ||
                    (Array.isArray(value) && value.length === 0);

                if (isEmpty) {
                    newErrors[field.fieldname] = t('validation.field_required', { field: field.label || field.fieldname });
                }
            }

            // Table field validation - validate each row based on child metadata
            if (field.fieldtype === 'Table' && Array.isArray(value)) {
                const childDoctype = field.options;
                const childMeta = childMetas[childDoctype];

                // If child table is required, check it has at least one row
                if (field.reqd === 1 && value.length === 0) {
                    newErrors[field.fieldname] = t('validation.table_requires_row', { field: field.label || field.fieldname });
                }

                // Validate each row's cells based on child metadata
                if (childMeta?.fields && value.length > 0) {
                    const requiredChildFields = childMeta.fields.filter(f =>
                        f.reqd === 1 && f.hidden !== 1
                    );

                    if (requiredChildFields.length > 0) {
                        const rowErrors = [];

                        value.forEach((row, rowIdx) => {
                            const cellErrors = {};

                            for (const childField of requiredChildFields) {
                                const cellValue = row[childField.fieldname];
                                const cellEmpty =
                                    cellValue === undefined ||
                                    cellValue === null ||
                                    cellValue === '';

                                if (cellEmpty) {
                                    cellErrors[childField.fieldname] = true;
                                }
                            }

                            if (Object.keys(cellErrors).length > 0) {
                                rowErrors.push({
                                    row: rowIdx + 1,
                                    fields: cellErrors,
                                    message: t('validation.row_missing_fields', { row: rowIdx + 1, fields: Object.keys(cellErrors).join(', ') })
                                });
                            }
                        });

                        if (rowErrors.length > 0) {
                            // Summarize errors for the table field
                            newErrors[field.fieldname] = t('validation.rows_incomplete', { count: rowErrors.length });
                            // Store detailed errors for potential cell highlighting
                            newErrors[`${field.fieldname}_rows`] = rowErrors;
                        }
                    }
                }
            }

            // Type-specific validation for non-table fields
            if (value !== undefined && value !== null && value !== '' && field.fieldtype !== 'Table') {
                switch (field.fieldtype) {
                    case 'Int':
                        if (!Number.isInteger(Number(value))) {
                            newErrors[field.fieldname] = t('validation.must_be_integer', { field: field.label });
                        }
                        break;
                    case 'Float':
                    case 'Currency':
                    case 'Percent':
                        if (isNaN(Number(value))) {
                            newErrors[field.fieldname] = t('validation.must_be_number', { field: field.label });
                        }
                        break;
                    case 'Date':
                    case 'Datetime':
                        if (value && isNaN(Date.parse(value))) {
                            newErrors[field.fieldname] = t('validation.must_be_valid_date', { field: field.label });
                        }
                        break;
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }, [fields, formData, childMetas, t]);

    /**
     * Reset form to original data
     */
    const reset = useCallback(() => {
        setFormData(originalData);
        setErrors({});
        setTouched({});
    }, [originalData]);

    /**
     * Get clean data for saving (remove system fields)
     */
    const getCleanData = useCallback(() => {
        const systemFields = [
            'name', 'owner', 'creation', 'modified', 'modified_by',
            'docstatus', 'idx', '__last_sync_on', 'doctype'
        ];

        const cleanData = { ...formData };
        systemFields.forEach(key => delete cleanData[key]);

        return cleanData;
    }, [formData]);

    /**
     * Mark form as saved (update original data)
     */
    const markSaved = useCallback((savedData) => {
        const newData = savedData || formData;
        setFormData(newData);
        setOriginalData(newData);
        setTouched({});
    }, [formData]);

    /**
     * Set errors from external source (e.g., server validation)
     * Merges with existing errors
     */
    const setFormErrors = useCallback((newErrors) => {
        setErrors(prev => ({
            ...prev,
            ...newErrors
        }));
    }, []);

    /**
     * Clear all errors
     */
    const clearErrors = useCallback(() => {
        setErrors({});
    }, []);

    return {
        formData,
        setField,
        setFields,
        isDirty,
        validate,
        errors,
        touched,
        reset,
        getCleanData,
        markSaved,
        setFormErrors,
        clearErrors,
    };
}

export default useFormState;
