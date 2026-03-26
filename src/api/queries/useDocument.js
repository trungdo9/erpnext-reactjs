/**
 * Document Query Hooks
 *
 * React Query hooks for document CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DocumentService } from '../domains';
import { queryKeys } from './keys';

/**
 * Hook to fetch a list of documents
 */
export function useDocumentList(doctype, options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.documents.list(doctype, options),
        queryFn: () => DocumentService.getList(doctype, options),
        enabled: !!doctype,
        ...queryOptions,
    });
}

/**
 * Hook to fetch a single document
 */
export function useDocument(doctype, name, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.documents.detail(doctype, name),
        queryFn: () => DocumentService.get(doctype, name),
        enabled: !!doctype && !!name,
        ...queryOptions,
    });
}

/**
 * Hook to get document count
 */
export function useDocumentCount(doctype, filters = [], queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.documents.count(doctype, filters),
        queryFn: () => DocumentService.getCount(doctype, filters),
        enabled: !!doctype,
        ...queryOptions,
    });
}

/**
 * Hook to create a document
 */
export function useCreateDocument(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => DocumentService.create(doctype, data),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.documents.lists(), doctype],
            });

            queryClient.setQueryData(
                queryKeys.documents.detail(doctype, data.name),
                data
            );
        },
        ...mutationOptions,
    });
}

/**
 * Hook to update a document
 */
export function useUpdateDocument(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ name, data }) => DocumentService.update(doctype, name, data),
        onSuccess: (data, variables) => {
            queryClient.setQueryData(
                queryKeys.documents.detail(doctype, variables.name),
                data
            );

            queryClient.invalidateQueries({
                queryKey: [...queryKeys.documents.lists(), doctype],
            });
        },
        // Optimistic update
        onMutate: async ({ name, data }) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({
                queryKey: queryKeys.documents.detail(doctype, name),
            });

            // Snapshot previous value
            const previousDoc = queryClient.getQueryData(
                queryKeys.documents.detail(doctype, name)
            );

            // Optimistically update
            if (previousDoc) {
                queryClient.setQueryData(
                    queryKeys.documents.detail(doctype, name),
                    { ...previousDoc, ...data }
                );
            }

            return { previousDoc };
        },
        onError: (err, variables, context) => {
            // Rollback on error
            if (context?.previousDoc) {
                queryClient.setQueryData(
                    queryKeys.documents.detail(doctype, variables.name),
                    context.previousDoc
                );
            }
        },
        ...mutationOptions,
    });
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (name) => DocumentService.delete(doctype, name),
        onSuccess: (_, name) => {
            queryClient.removeQueries({
                queryKey: queryKeys.documents.detail(doctype, name),
            });

            queryClient.invalidateQueries({
                queryKey: [...queryKeys.documents.lists(), doctype],
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook for bulk create
 */
export function useBulkCreateDocuments(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (items) => DocumentService.bulkCreate(doctype, items),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.documents.lists(), doctype],
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook for bulk update
 */
export function useBulkUpdateDocuments(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (updates) => DocumentService.bulkUpdate(doctype, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.documents.lists(), doctype],
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook for bulk delete
 */
export function useBulkDeleteDocuments(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (names) => DocumentService.bulkDelete(doctype, names),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [...queryKeys.documents.lists(), doctype],
            });
        },
        ...mutationOptions,
    });
}

/**
 * Prefetch a document
 */
export async function prefetchDocument(queryClient, doctype, name) {
    await queryClient.prefetchQuery({
        queryKey: queryKeys.documents.detail(doctype, name),
        queryFn: () => DocumentService.get(doctype, name),
    });
}

/**
 * Prefetch a document list
 */
export async function prefetchDocumentList(queryClient, doctype, options = {}) {
    await queryClient.prefetchQuery({
        queryKey: queryKeys.documents.list(doctype, options),
        queryFn: () => DocumentService.getList(doctype, options),
    });
}
