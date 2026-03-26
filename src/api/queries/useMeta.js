/**
 * Metadata Query Hooks
 *
 * React Query hooks for DocType metadata.
 */

import { useQuery, useQueries } from '@tanstack/react-query';
import { MetadataService } from '../domains';
import { queryKeys } from './keys';
import { STALE_TIMES } from './queryConfig';

/**
 * Hook to fetch DocType metadata
 */
export function useDocTypeMeta(doctype, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.meta.doctype(doctype),
        queryFn: () => MetadataService.getMeta(doctype),
        enabled: !!doctype,
        // Metadata rarely changes, use longer stale time
        staleTime: STALE_TIMES.metadata, // 30 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
        ...queryOptions,
    });
}

/**
 * Hook to fetch DocType fields
 */
export function useDocTypeFields(doctype, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.meta.fields(doctype),
        queryFn: () => MetadataService.getFields(doctype),
        enabled: !!doctype,
        staleTime: STALE_TIMES.metadata,
        gcTime: 30 * 60 * 1000,
        ...queryOptions,
    });
}

/**
 * Hook to fetch child table metadata
 */
export function useChildTableMeta(doctype, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.meta.childTables(doctype),
        queryFn: () => MetadataService.getChildTableMeta(doctype),
        enabled: !!doctype,
        staleTime: STALE_TIMES.metadata,
        gcTime: 30 * 60 * 1000,
        ...queryOptions,
    });
}

/**
 * Hook to fetch multiple DocType metadata
 */
export function useMultipleDocTypeMeta(doctypes, queryOptions = {}) {
    const results = useQueries({
        queries: doctypes.map(doctype => ({
            queryKey: queryKeys.meta.doctype(doctype),
            queryFn: () => MetadataService.getMeta(doctype),
            enabled: !!doctype,
            staleTime: STALE_TIMES.metadata,
            gcTime: 30 * 60 * 1000,
            ...queryOptions,
        })),
    });

    return {
        data: results.reduce((acc, result, index) => {
            if (result.data) {
                acc[doctypes[index]] = result.data;
            }
            return acc;
        }, {}),
        isLoading: results.some(r => r.isLoading),
        isError: results.some(r => r.isError),
        errors: results.filter(r => r.error).map(r => r.error),
    };
}

/**
 * Prefetch metadata
 */
export async function prefetchMeta(queryClient, doctype) {
    await queryClient.prefetchQuery({
        queryKey: queryKeys.meta.doctype(doctype),
        queryFn: () => MetadataService.getMeta(doctype),
        staleTime: STALE_TIMES.metadata,
    });
}

/**
 * Hook that returns specific field info
 */
export function useFieldInfo(doctype, fieldname) {
    const { data: meta, isLoading, error } = useDocTypeMeta(doctype);

    const field = meta?.fields?.find(f => f.fieldname === fieldname);

    return {
        field,
        isLoading,
        error,
    };
}

/**
 * Hook that returns editable fields only
 */
export function useEditableFields(doctype) {
    const { data: meta, isLoading, error } = useDocTypeMeta(doctype);

    const editableFields = meta?.fields?.filter(f => {
        const layoutTypes = ['Section Break', 'Column Break', 'Tab Break', 'HTML'];
        return !layoutTypes.includes(f.fieldtype);
    }) || [];

    return {
        fields: editableFields,
        isLoading,
        error,
    };
}

/**
 * Hook that returns required fields
 */
export function useRequiredFields(doctype) {
    const { data: meta, isLoading, error } = useDocTypeMeta(doctype);

    const requiredFields = meta?.fields?.filter(f => f.required) || [];

    return {
        fields: requiredFields,
        isLoading,
        error,
    };
}
