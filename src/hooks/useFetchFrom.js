/**
 * useFetchFrom Hook
 *
 * Handles automatic fetching of field values from linked documents
 * based on fetch_from configuration in DocType metadata.
 *
 * When a Link field value changes, this hook automatically fetches
 * the related document and populates dependent fields.
 *
 * Example:
 * - Field "ngay" has fetch_from: "hoat_dong_thu_hoach.ngay_thuc_hien"
 * - When user selects "hoat_dong_thu_hoach", the hook fetches that document
 *   and auto-fills "ngay" with the value from "ngay_thuc_hien"
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MetadataService } from '../api/domains/metadataService';
import { apiClient } from '../api/gateway';

/**
 * Get fetch_from mapping for a doctype
 */
const useFetchFromMapping = (doctype) => {
    return useQuery({
        queryKey: ['fetchFromMapping', doctype],
        queryFn: () => MetadataService.getFetchFromMapping(doctype),
        enabled: !!doctype,
        staleTime: 10 * 60 * 1000, // 10 minutes - metadata rarely changes
        gcTime: 30 * 60 * 1000,
    });
};

/**
 * Group fetch_from fields by their source link field
 * Returns: { linkField: [{ targetField, sourceField, fetchIfEmpty }] }
 */
const groupByLinkField = (mapping) => {
    const grouped = {};

    for (const [targetField, config] of Object.entries(mapping)) {
        const { linkField, sourceField, fetchIfEmpty } = config;
        if (!grouped[linkField]) {
            grouped[linkField] = [];
        }
        grouped[linkField].push({ targetField, sourceField, fetchIfEmpty });
    }

    return grouped;
};

/**
 * Main hook for handling fetch_from auto-population
 *
 * @param {string} doctype - The DocType name
 * @param {object} formData - Current form data
 * @param {function} setFieldValue - Function to update a field value
 * @param {object} options - Additional options
 * @returns {object} - { handleLinkChange, isLoading, fetchFromMapping }
 */
export const useFetchFrom = (doctype, formData, setFieldValue, options = {}) => {
    const { enabled = true } = options;

    // Track which link fields have been processed to avoid loops
    const processingRef = useRef(new Set());

    // Get fetch_from mapping
    const { data: mapping = {}, isLoading: mappingLoading } = useFetchFromMapping(
        enabled ? doctype : null
    );

    // Group fields by link field for efficient lookup
    const groupedMapping = useMemo(() => {
        return groupByLinkField(mapping);
    }, [mapping]);

    // Get list of link fields that have dependent fetch_from fields
    const linkFieldsWithFetch = useMemo(() => {
        return Object.keys(groupedMapping);
    }, [groupedMapping]);

    // Get list of target fields that are populated via fetch_from (should be read-only)
    const fetchFromTargetFields = useMemo(() => {
        return Object.keys(mapping);
    }, [mapping]);

    /**
     * Fetch linked document and populate dependent fields
     */
    const fetchAndPopulate = useCallback(async (linkField, linkedDoctype, linkedValue) => {
        if (!linkedValue || !groupedMapping[linkField]) {
            return;
        }

        // Prevent re-processing
        const processKey = `${linkField}:${linkedValue}`;
        if (processingRef.current.has(processKey)) {
            return;
        }
        processingRef.current.add(processKey);

        try {
            // Fetch the linked document
            const linkedDoc = await apiClient.getDoc(linkedDoctype, linkedValue);

            if (!linkedDoc) {
                console.warn(`[useFetchFrom] Could not fetch ${linkedDoctype}/${linkedValue}`);
                return;
            }

            // Populate dependent fields
            const fieldsToFetch = groupedMapping[linkField];

            for (const { targetField, sourceField, fetchIfEmpty } of fieldsToFetch) {
                const sourceValue = linkedDoc[sourceField];
                const currentValue = formData[targetField];

                // Skip if fetchIfEmpty is true and field already has a value
                if (fetchIfEmpty && currentValue !== null && currentValue !== undefined && currentValue !== '') {
                    continue;
                }

                // Update the field if source has a value
                if (sourceValue !== undefined) {
                    setFieldValue(targetField, sourceValue);
                }
            }
        } catch (error) {
            console.error(`[useFetchFrom] Error fetching ${linkedDoctype}/${linkedValue}:`, error);
        } finally {
            // Clear processing flag after a delay to allow for batched updates
            setTimeout(() => {
                processingRef.current.delete(processKey);
            }, 100);
        }
    }, [groupedMapping, formData, setFieldValue]);

    /**
     * Handle link field change - call this when a link field value changes
     * @param {string} fieldname - The link field name
     * @param {string} value - The selected value
     * @param {string} linkedDoctype - The linked DocType name
     */
    const handleLinkChange = useCallback((fieldname, value, linkedDoctype) => {
        // Only process if this link field has fetch_from dependencies
        if (!linkFieldsWithFetch.includes(fieldname)) {
            return;
        }

        if (!value) {
            // Clear dependent fields when link is cleared
            const fieldsToFetch = groupedMapping[fieldname] || [];
            for (const { targetField } of fieldsToFetch) {
                setFieldValue(targetField, null);
            }
            return;
        }

        // Fetch and populate
        fetchAndPopulate(fieldname, linkedDoctype, value);
    }, [linkFieldsWithFetch, groupedMapping, fetchAndPopulate, setFieldValue]);

    /**
     * Check if a field name is a link field with fetch_from dependencies
     */
    const hasLinkFetchDependencies = useCallback((fieldname) => {
        return linkFieldsWithFetch.includes(fieldname);
    }, [linkFieldsWithFetch]);

    /**
     * Get dependent fields for a link field
     */
    const getDependentFields = useCallback((linkField) => {
        return groupedMapping[linkField] || [];
    }, [groupedMapping]);

    return {
        handleLinkChange,
        hasLinkFetchDependencies,
        getDependentFields,
        linkFieldsWithFetch,
        fetchFromTargetFields,
        fetchFromMapping: mapping,
        isLoading: mappingLoading,
    };
};

/**
 * Simplified hook that auto-watches form data changes
 * Use this if you want automatic handling without manual handleLinkChange calls
 */
export const useFetchFromAutoWatch = (doctype, formData, setFieldValue, fields = [], options = {}) => {
    const { enabled = true } = options;

    const {
        handleLinkChange,
        linkFieldsWithFetch,
        fetchFromMapping,
        isLoading,
    } = useFetchFrom(doctype, formData, setFieldValue, { enabled });

    // Track previous values to detect changes
    const prevValuesRef = useRef({});

    // Auto-watch link field changes
    useEffect(() => {
        if (!enabled || isLoading || linkFieldsWithFetch.length === 0) {
            return;
        }

        // Find link fields from the fields array
        const linkFields = fields.filter(f =>
            f.fieldtype === 'Link' && linkFieldsWithFetch.includes(f.fieldname)
        );

        for (const field of linkFields) {
            const currentValue = formData[field.fieldname];
            const prevValue = prevValuesRef.current[field.fieldname];

            // Only trigger if value actually changed
            if (currentValue !== prevValue) {
                prevValuesRef.current[field.fieldname] = currentValue;
                handleLinkChange(field.fieldname, currentValue, field.options);
            }
        }
    }, [enabled, isLoading, linkFieldsWithFetch, fields, formData, handleLinkChange]);

    return {
        fetchFromMapping,
        linkFieldsWithFetch,
        isLoading,
    };
};

export default useFetchFrom;
