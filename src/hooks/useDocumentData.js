import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { DocumentService } from "../api/domains";

/**
 * Hook to fetch and manage document data
 *
 * MIGRATED TO REACT QUERY
 *
 * Before (useEffect):
 * - Manual loading/error states
 * - Manual mounted flag for cleanup
 * - Duplicate fetch prevention with refs
 *
 * After (React Query):
 * - Automatic caching (5 min staleTime)
 * - Built-in loading/error states
 * - Automatic request deduplication
 * - Background refetching
 *
 * @param {string} doctype - The doctype name
 * @param {string} name - The document name (or 'new' for new documents)
 * @param {Object} options - Configuration options
 * @param {Object} options.defaultValues - Default values for new documents
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 *
 * @returns {Object} { data, isLoading, error, refetch, isNew }
 */
export function useDocumentData(doctype, name, options = {}) {
    const {
        defaultValues = {},
        enabled = true,
    } = options;

    const isNew = !name || name === 'new';

    // Fetch document data using React Query
    const {
        data: docData,
        isLoading,
        error,
        refetch,
    } = useQuery({
        queryKey: ['document', doctype, name],
        queryFn: () => DocumentService.get(doctype, name),
        enabled: !!doctype && !!name && !isNew && enabled,
        gcTime: 30 * 60 * 1000,
    });

    // For new documents, return default values
    const data = useMemo(() => {
        if (isNew) {
            return defaultValues;
        }
        return docData || null;
    }, [isNew, defaultValues, docData]);

    return {
        data,
        isLoading: isNew ? false : isLoading,
        error: error?.message || null,
        refetch,
        isNew,
    };
}

export default useDocumentData;
