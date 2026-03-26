/**
 * Workflow Query Hooks
 *
 * React Query hooks for workflow operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WorkflowService } from '../domains';
import { queryKeys } from './keys';

/**
 * Hook to get workflow transitions
 */
export function useWorkflowTransitions(doctype, name, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.workflow.transitions(doctype, name),
        queryFn: () => WorkflowService.getTransitions(doctype, name),
        enabled: !!doctype && !!name,
        staleTime: 30 * 1000, // 30 seconds
        ...queryOptions,
    });
}

/**
 * Hook to apply workflow transition
 */
export function useApplyWorkflow(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ name, action }) =>
            WorkflowService.applyTransition(doctype, name, action),
        onSuccess: (_, variables) => {
            // Invalidate related queries
            queryClient.invalidateQueries({
                queryKey: queryKeys.workflow.transitions(doctype, variables.name),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.documents.detail(doctype, variables.name),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.documents.lists(),
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to submit a document
 */
export function useSubmitDocument(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (name) => WorkflowService.submit(doctype, name),
        onSuccess: (_, name) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.documents.detail(doctype, name),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.documents.lists(),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.workflow.transitions(doctype, name),
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to cancel a document
 */
export function useCancelDocument(doctype, mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (name) => WorkflowService.cancel(doctype, name),
        onSuccess: (_, name) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.documents.detail(doctype, name),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.documents.lists(),
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to get workflow history
 */
export function useWorkflowHistory(doctype, name, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.workflow.history(doctype, name),
        queryFn: () => WorkflowService.getHistory(doctype, name),
        enabled: !!doctype && !!name,
        ...queryOptions,
    });
}
