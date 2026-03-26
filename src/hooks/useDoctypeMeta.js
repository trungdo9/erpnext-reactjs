import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { MetadataService } from "../api/domains";

/**
 * Fieldtypes to always skip (non-renderable, non-layout)
 */
export const SKIP_FIELDTYPES = [
    "Fold",
    "Button",
    "Spacer",
];

/**
 * Layout fieldtypes used for form structure (sections, columns, tabs).
 * These are kept when skipLayoutFields is false (e.g., FormRenderer needs them).
 * They are filtered out when skipLayoutFields is true (e.g., BulkCreate, ChildTable).
 */
export const LAYOUT_FIELDTYPES = [
    "Section Break",
    "Column Break",
    "Tab Break",
];

/**
 * Fieldtypes that are renderable in forms
 */
export const RENDERABLE_FIELDTYPES = [
    'Data', 'Text', 'Small Text', 'Long Text', 'Date', 'Datetime', 'Time',
    'Int', 'Float', 'Currency', 'Percent',
    'Link', 'Dynamic Link', 'Select', 'Check', 'Password', 'Read Only',
    'Table', 'Attach', 'Attach Image', 'Text Editor', 'HTML', 'Heading',
    'Color', 'Rating', 'Duration', 'Code', 'Signature', 'Geolocation',
];

/**
 * Hook to fetch and manage DocType metadata
 *
 * MIGRATED TO REACT QUERY
 *
 * Before (useEffect):
 * - Manual loading/error states
 * - Manual cache with Map
 * - Manual mounted flag for cleanup
 * - Duplicate fetch prevention with refs
 *
 * After (React Query):
 * - Automatic caching (10 min staleTime)
 * - Built-in loading/error states
 * - Automatic request deduplication
 * - Background refetching
 *
 * @param {string} doctype - The doctype name
 * @param {Object} options - Configuration options
 * @param {boolean} options.filterHidden - Filter out hidden fields (default: true)
 * @param {boolean} options.filterReadOnly - Filter out read-only fields (default: false)
 * @param {boolean} options.skipLayoutFields - Skip layout fieldtypes (default: true)
 * @param {boolean} options.fetchChildMeta - Fetch metadata for child tables (default: true)
 *
 * @returns {Object} { meta, fields, childMetas, loading, error, refetch }
 */
export function useDoctypeMeta(doctype, options = {}) {
    const {
        filterHidden = true,
        filterReadOnly = false,
        skipLayoutFields = true,
        fetchChildMeta = true,
    } = options;

    // Fetch main doctype metadata
    const {
        data: metaResponse,
        isLoading: metaLoading,
        error: metaError,
        refetch,
    } = useQuery({
        queryKey: ['doctype-meta', doctype],
        queryFn: () => MetadataService.getMeta(doctype),
        enabled: !!doctype,
        staleTime: 30 * 60 * 1000, // Metadata rarely changes
        gcTime: 30 * 60 * 1000,
    });

    // Process metadata
    const meta = useMemo(() => {
        if (!metaResponse) return null;

        // Handle structure difference: service returns { docs: [...] } or object
        const metaDoc = metaResponse.docs ? metaResponse.docs[0] : metaResponse;

        if (!metaDoc) return null;

        // Sort fields by idx (create new object to avoid mutating query cache)
        if (metaDoc.fields) {
            return { ...metaDoc, fields: [...metaDoc.fields].sort((a, b) => (a.idx || 0) - (b.idx || 0)) };
        }

        return metaDoc;
    }, [metaResponse]);

    // Find child table doctypes
    const childDoctypes = useMemo(() => {
        if (!fetchChildMeta || !meta?.fields) return [];
        return meta.fields
            .filter(f => f.fieldtype === 'Table' && f.options)
            .map(f => f.options);
    }, [meta, fetchChildMeta]);

    // Fetch child table metadata using useQueries for parallel fetching
    const childQueries = useQueries({
        queries: childDoctypes.map(childDoctype => ({
            queryKey: ['doctype-meta', childDoctype],
            queryFn: () => MetadataService.getMeta(childDoctype),
            enabled: !!childDoctype,
            staleTime: 30 * 60 * 1000,
            gcTime: 30 * 60 * 1000,
        })),
    });

    // Build childMetas map
    const childMetas = useMemo(() => {
        const result = {};
        childQueries.forEach((query, index) => {
            if (query.data) {
                const childMeta = query.data.docs ? query.data.docs[0] : query.data;
                if (childMeta) {
                    result[childDoctypes[index]] = childMeta;
                }
            }
        });
        return result;
    }, [childQueries, childDoctypes]);

    // Check if any child queries are still loading
    const childLoading = childQueries.some(q => q.isLoading);

    // Filter fields based on options
    const fields = useMemo(() => {
        if (!meta?.fields) return [];

        return meta.fields.filter((field) => {
            if (filterHidden && field.hidden) return false;
            if (filterReadOnly && (field.readOnly || field.read_only)) return false;
            // Always skip non-renderable junk fieldtypes
            if (SKIP_FIELDTYPES.includes(field.fieldtype)) return false;
            // Skip layout fieldtypes only when skipLayoutFields is true
            if (skipLayoutFields && LAYOUT_FIELDTYPES.includes(field.fieldtype)) {
                return false;
            }
            return true;
        });
    }, [meta, filterHidden, filterReadOnly, skipLayoutFields]);

    return {
        meta,
        fields,
        childMetas,
        loading: metaLoading || childLoading,
        error: metaError?.message || null,
        refetch,
    };
}

/**
 * Alias for backward compatibility
 */
export const useDocTypeMeta = useDoctypeMeta;

/**
 * Clear the metadata cache (now uses React Query)
 */
export const clearMetaCache = () => {
    // React Query handles cache internally
    // Use queryClient.invalidateQueries(['doctype-meta']) if needed
    console.warn('clearMetaCache is deprecated. Use queryClient.invalidateQueries instead.');
};

/**
 * Pre-fetch metadata for a doctype (now uses React Query)
 */
export const prefetchMeta = async (_doctype) => {
    // This is now handled by React Query automatically
    console.warn('prefetchMeta is deprecated. React Query handles prefetching automatically.');
    return null;
};

export default useDoctypeMeta;
