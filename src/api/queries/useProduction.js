/**
 * Production Query Hooks
 *
 * React Query hooks for steel production domain operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductionService } from '../domains';
import { queryKeys } from './keys';

/**
 * Hook to get work order list
 */
export function useWorkOrderList(options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.production.workOrders.list(options),
        queryFn: () => ProductionService.getWorkOrderList(options),
        ...queryOptions,
    });
}

/**
 * Hook to get a single work order
 */
export function useWorkOrder(name, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.production.workOrders.detail(name),
        queryFn: () => ProductionService.getWorkOrder(name),
        enabled: !!name,
        ...queryOptions,
    });
}

/**
 * Hook to create work order
 */
export function useCreateWorkOrder(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => ProductionService.createWorkOrder(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.production.workOrders.all(),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.production.dashboard(),
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to update work order
 */
export function useUpdateWorkOrder(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ name, data }) =>
            ProductionService.updateWorkOrder(name, data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.production.workOrders.detail(variables.name),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.production.workOrders.all(),
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.production.dashboard(),
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to get job card list
 */
export function useJobCardList(options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.production.jobCards.list(options),
        queryFn: () => ProductionService.getJobCardList(options),
        ...queryOptions,
    });
}

/**
 * Hook to get a single job card
 */
export function useJobCard(name, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.production.jobCards.detail(name),
        queryFn: () => ProductionService.getJobCard(name),
        enabled: !!name,
        ...queryOptions,
    });
}

/**
 * Hook to get production dashboard stats
 */
export function useProductionDashboard(options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.production.dashboard(options),
        queryFn: () => ProductionService.getDashboardStats(options),
        staleTime: 60 * 1000, // 1 minute
        ...queryOptions,
    });
}

/**
 * Hook to get recent production activity
 */
export function useRecentActivity(limit = 10, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.production.activity(limit),
        queryFn: () => ProductionService.getRecentActivity(limit),
        staleTime: 30 * 1000, // 30 seconds
        ...queryOptions,
    });
}
