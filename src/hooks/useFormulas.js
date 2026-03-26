/**
 * useFormulas Hook
 *
 * Handles automatic calculations based on formula definitions
 * stored in "Cong Thuc" DocType.
 *
 * Features:
 * - Circular dependency detection
 * - Topological sort for correct calculation order
 * - Safe expression evaluation (no code injection)
 *
 * Formula types:
 * - sum: Sum of source fields
 * - average: Average of source fields
 * - percent: Percentage calculation
 * - custom: Custom JavaScript expression
 *
 * Example formula in "Cong Thuc":
 * {
 *   doctype_name: "Danh Gia Chat Luong",
 *   target_field: "tong_loi",
 *   formula_type: "sum",
 *   source_fields: "thieu_kich_thuoc\nqua_kich_thuoc\nkhong_dat",
 *   formula: "thieu_kich_thuoc + qua_kich_thuoc + khong_dat"
 * }
 */

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/gateway';
import { safeEvaluate } from '../utils/safeEval';
import { getDocTypeFormulas } from '../config/formulas';

/**
 * Fetch formulas for a DocType from "Cong Thuc"
 * Falls back to hardcoded formulas from config/formulas.js if API returns empty
 */
const fetchFormulas = async (doctype) => {
    if (!doctype) return [];

    try {
        const result = await apiClient.getList('Cong Thuc', {
            filters: [['doctype_name', '=', doctype]],
            fields: ['target_field', 'formula', 'formula_type', 'source_fields', 'description'],
            limit_page_length: 0,
        });

        // If API returns formulas, use them
        if (result && result.length > 0) {
            return result;
        }

        // Fallback to hardcoded formulas from config
        const fallbackFormulas = getDocTypeFormulas(doctype);
        if (fallbackFormulas.length > 0) {
            console.info(`[useFormulas] Using fallback formulas for "${doctype}"`);
            return fallbackFormulas;
        }

        return [];
    } catch (error) {
        // Cong Thuc DocType might not exist - try fallback
        console.warn('[useFormulas] Could not fetch formulas:', error.message);

        // Use fallback formulas from config
        const fallbackFormulas = getDocTypeFormulas(doctype);
        if (fallbackFormulas.length > 0) {
            console.info(`[useFormulas] Using fallback formulas for "${doctype}"`);
            return fallbackFormulas;
        }

        return [];
    }
};

/**
 * Hook to fetch formulas for a doctype
 */
const useFormulaDefinitions = (doctype) => {
    return useQuery({
        queryKey: ['formulas', doctype],
        queryFn: () => fetchFormulas(doctype),
        enabled: !!doctype,
        staleTime: 10 * 60 * 1000, // 10 minutes - formulas rarely change
        gcTime: 30 * 60 * 1000,
    });
};

/**
 * Parse source fields from newline-separated string
 */
const parseSourceFields = (sourceFieldsStr) => {
    if (!sourceFieldsStr) return [];
    return sourceFieldsStr.split('\n').map(s => s.trim()).filter(Boolean);
};

/**
 * Detect circular dependencies in formulas using DFS
 * Returns array of cycles found (each cycle is an array of field names)
 *
 * @param {Array} formulas - Array of formula definitions
 * @returns {Object} - { hasCycle, cycles, safeOrder }
 */
const detectCircularDependencies = (formulas) => {
    if (!formulas || formulas.length === 0) {
        return { hasCycle: false, cycles: [], safeOrder: [] };
    }

    // Build dependency graph: target -> [sources that depend on it]
    const graph = new Map();
    const targetToFormula = new Map();

    // Initialize nodes
    formulas.forEach(f => {
        const target = f.target_field;
        const sources = parseSourceFields(f.source_fields);
        graph.set(target, sources);
        targetToFormula.set(target, f);
    });

    // DFS to detect cycles
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (node, path = []) => {
        if (recursionStack.has(node)) {
            // Found cycle - extract the cycle from path
            const cycleStart = path.indexOf(node);
            const cycle = path.slice(cycleStart).concat(node);
            cycles.push(cycle);
            return true;
        }

        if (visited.has(node)) {
            return false;
        }

        visited.add(node);
        recursionStack.add(node);
        path.push(node);

        // Check if this node is a target field that depends on other targets
        const sources = graph.get(node) || [];
        for (const source of sources) {
            // Only follow if source is also a target (formula output)
            if (graph.has(source)) {
                dfs(source, [...path]);
            }
        }

        recursionStack.delete(node);
        return false;
    };

    // Run DFS from each target field
    for (const target of graph.keys()) {
        if (!visited.has(target)) {
            dfs(target, []);
        }
    }

    // Topological sort for safe execution order (Kahn's algorithm)
    const safeOrder = [];
    if (cycles.length === 0) {
        const inDegree = new Map();
        const adjList = new Map();

        // Initialize
        for (const target of graph.keys()) {
            inDegree.set(target, 0);
            adjList.set(target, []);
        }

        // Build in-degree count
        for (const [target, sources] of graph) {
            for (const source of sources) {
                if (graph.has(source)) {
                    inDegree.set(target, (inDegree.get(target) || 0) + 1);
                    adjList.get(source).push(target);
                }
            }
        }

        // Process nodes with 0 in-degree
        const queue = [];
        for (const [node, degree] of inDegree) {
            if (degree === 0) {
                queue.push(node);
            }
        }

        while (queue.length > 0) {
            const node = queue.shift();
            safeOrder.push(node);

            for (const neighbor of adjList.get(node) || []) {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            }
        }
    }

    return {
        hasCycle: cycles.length > 0,
        cycles,
        safeOrder,
    };
};

/**
 * Safely evaluate a formula expression using expr-eval
 * @param {string} formula - Formula expression (e.g., "a + b * 100 / c")
 * @param {Object} context - Object with field values
 * @returns {number|null} Calculated value or null on error
 */
const evaluateFormula = (formula, context) => {
    if (!formula) return null;

    // Build variables object with numeric values
    const variables = {};
    for (const [fieldname, value] of Object.entries(context)) {
        variables[fieldname] = parseFloat(value) || 0;
    }

    // Use safe expression evaluator (no code injection risk)
    const result = safeEvaluate(formula, variables);

    if (result !== null && typeof result === 'number') {
        return result;
    }

    return null;
};

/**
 * Apply a single formula based on its type
 */
const applyFormula = (formulaDef, formData) => {
    const { formula_type, formula, source_fields } = formulaDef;
    const sourceFieldList = parseSourceFields(source_fields);

    // Build context with source field values
    const context = {};
    sourceFieldList.forEach(fieldname => {
        context[fieldname] = formData[fieldname];
    });

    switch (formula_type) {
        case 'sum': {
            // Sum all source fields
            let sum = 0;
            for (const fieldname of sourceFieldList) {
                sum += parseFloat(formData[fieldname]) || 0;
            }
            return sum;
        }

        case 'average': {
            // Average of source fields
            if (sourceFieldList.length === 0) return 0;
            let sum = 0;
            let count = 0;
            for (const fieldname of sourceFieldList) {
                const val = parseFloat(formData[fieldname]);
                if (!isNaN(val)) {
                    sum += val;
                    count++;
                }
            }
            return count > 0 ? sum / count : 0;
        }

        case 'percent': {
            // Evaluate custom percent formula
            return evaluateFormula(formula, context);
        }

        case 'custom':
        default: {
            // Evaluate custom expression
            return evaluateFormula(formula, context);
        }
    }
};

/**
 * Main hook for handling formula calculations
 *
 * @param {string} doctype - The DocType name
 * @param {object} formData - Current form data
 * @param {function} setFieldValue - Function to update a field value
 * @param {object} options - Additional options
 * @returns {object} - { applyFormulas, formulaFields, isLoading }
 */
export const useFormulas = (doctype, formData, setFieldValue, options = {}) => {
    const { enabled = true, debounceMs = 100 } = options;

    // Track which fields are being calculated to avoid loops
    const calculatingRef = useRef(new Set());
    const debounceTimerRef = useRef(null);

    // Fetch formula definitions
    const { data: formulas = [], isLoading } = useFormulaDefinitions(
        enabled ? doctype : null
    );

    // Get list of target fields (calculated fields)
    const formulaFields = useMemo(() => {
        return formulas.map(f => f.target_field);
    }, [formulas]);

    // Get list of source fields that trigger recalculation
    const sourceFields = useMemo(() => {
        const fields = new Set();
        formulas.forEach(f => {
            parseSourceFields(f.source_fields).forEach(sf => fields.add(sf));
        });
        return Array.from(fields);
    }, [formulas]);

    // Detect circular dependencies
    const dependencyAnalysis = useMemo(() => {
        return detectCircularDependencies(formulas);
    }, [formulas]);

    // Log warning if circular dependencies detected
    useEffect(() => {
        if (dependencyAnalysis.hasCycle && formulas.length > 0) {
            console.warn(
                '[useFormulas] Circular dependency detected! Cycles:',
                dependencyAnalysis.cycles.map(c => c.join(' → ')).join(', ')
            );
        }
    }, [dependencyAnalysis, formulas.length]);

    // Sort formulas by safe dependency order (topological sort) or fallback to type order
    const sortedFormulas = useMemo(() => {
        if (dependencyAnalysis.safeOrder.length > 0) {
            // Use topological order
            const orderMap = new Map();
            dependencyAnalysis.safeOrder.forEach((field, idx) => {
                orderMap.set(field, idx);
            });

            return [...formulas].sort((a, b) => {
                const orderA = orderMap.get(a.target_field) ?? 999;
                const orderB = orderMap.get(b.target_field) ?? 999;
                return orderA - orderB;
            });
        }

        // Fallback: sort by formula type
        const order = { sum: 1, custom: 2, average: 3, percent: 4 };
        return [...formulas].sort((a, b) => {
            return (order[a.formula_type] || 5) - (order[b.formula_type] || 5);
        });
    }, [formulas, dependencyAnalysis.safeOrder]);

    /**
     * Apply all formulas to the current form data
     */
    const applyAllFormulas = useCallback(() => {
        if (!enabled || formulas.length === 0) return;

        // Work with a copy to calculate all at once
        const updates = {};

        for (const formulaDef of sortedFormulas) {
            const targetField = formulaDef.target_field;

            // Skip if already being calculated (prevent loops)
            if (calculatingRef.current.has(targetField)) {
                continue;
            }

            calculatingRef.current.add(targetField);

            try {
                // Merge current formData with any updates we've calculated so far
                const currentData = { ...formData, ...updates };
                const newValue = applyFormula(formulaDef, currentData);

                if (newValue !== null && newValue !== formData[targetField]) {
                    updates[targetField] = newValue;
                }
            } finally {
                calculatingRef.current.delete(targetField);
            }
        }

        // Apply all updates at once
        Object.entries(updates).forEach(([field, value]) => {
            // Round to 2 decimal places for display
            const roundedValue = Math.round(value * 100) / 100;
            setFieldValue(field, roundedValue);
        });
    }, [enabled, formulas.length, sortedFormulas, formData, setFieldValue]);

    /**
     * Check if a field change should trigger formula recalculation
     */
    const shouldRecalculate = useCallback((fieldname) => {
        return sourceFields.includes(fieldname);
    }, [sourceFields]);

    /**
     * Handle field change - trigger formula recalculation if needed
     */
    const handleFieldChangeForFormulas = useCallback((fieldname) => {
        if (!shouldRecalculate(fieldname)) return;

        // Debounce recalculation to avoid excessive updates
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = setTimeout(() => {
            applyAllFormulas();
        }, debounceMs);
    }, [shouldRecalculate, applyAllFormulas, debounceMs]);

    // Cleanup debounce timer
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    return {
        applyAllFormulas,
        handleFieldChangeForFormulas,
        shouldRecalculate,
        formulaFields,
        sourceFields,
        formulas,
        isLoading,
        // Circular dependency info
        hasCircularDependency: dependencyAnalysis.hasCycle,
        circularCycles: dependencyAnalysis.cycles,
    };
};

export default useFormulas;
