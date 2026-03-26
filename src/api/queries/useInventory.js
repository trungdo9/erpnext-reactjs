/**
 * Inventory Query Hooks
 *
 * React Query hooks for inventory domain operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { InventoryService } from '../domains';
import { queryKeys } from './keys';

/**
 * Hook to get items list
 */
export function useItems(options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.inventory.items.list(options),
        queryFn: () => InventoryService.getItems(options),
        ...queryOptions,
    });
}

/**
 * Hook to get a single item
 */
export function useItem(itemCode, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.inventory.items.detail(itemCode),
        queryFn: () => InventoryService.getItem(itemCode),
        enabled: !!itemCode,
        ...queryOptions,
    });
}

/**
 * Hook to create an item
 */
export function useCreateItem(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => InventoryService.createItem(data),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: queryKeys.inventory.items.all(),
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to get stock balance
 */
export function useStockBalance(itemCode, warehouse = null, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.inventory.stock.balance(itemCode, warehouse),
        queryFn: () => InventoryService.getStockBalance(itemCode, warehouse),
        enabled: !!itemCode,
        staleTime: 30 * 1000, // 30 seconds - stock changes frequently
        ...queryOptions,
    });
}

/**
 * Hook to get bulk stock balance
 */
export function useBulkStockBalance(itemCodes, warehouse = null, queryOptions = {}) {
    return useQuery({
        queryKey: ['inventory', 'stock', 'bulk', itemCodes, warehouse],
        queryFn: () => InventoryService.getBulkStockBalance(itemCodes, warehouse),
        enabled: itemCodes?.length > 0,
        staleTime: 30 * 1000,
        ...queryOptions,
    });
}

/**
 * Hook to create stock entry
 */
export function useCreateStockEntry(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => InventoryService.createStockEntry(data),
        onSuccess: (_, variables) => {
            // Invalidate stock balance for affected items
            variables.items.forEach(item => {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.inventory.stock.balance(item.itemCode),
                });
            });
            queryClient.invalidateQueries({
                queryKey: queryKeys.inventory.stock.ledger(),
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to receive stock
 */
export function useReceiveStock(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => InventoryService.receiveStock(data),
        onSuccess: (_, variables) => {
            variables.items.forEach(item => {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.inventory.stock.balance(item.itemCode),
                });
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to issue stock
 */
export function useIssueStock(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => InventoryService.issueStock(data),
        onSuccess: (_, variables) => {
            variables.items.forEach(item => {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.inventory.stock.balance(item.itemCode),
                });
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to transfer stock
 */
export function useTransferStock(mutationOptions = {}) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data) => InventoryService.transferStock(data),
        onSuccess: (_, variables) => {
            variables.items.forEach(item => {
                queryClient.invalidateQueries({
                    queryKey: queryKeys.inventory.stock.balance(item.itemCode),
                });
            });
        },
        ...mutationOptions,
    });
}

/**
 * Hook to get warehouses
 */
export function useWarehouses(options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.inventory.warehouses.list(options),
        queryFn: () => InventoryService.getWarehouses(options),
        staleTime: 5 * 60 * 1000, // 5 minutes - warehouses don't change often
        ...queryOptions,
    });
}

/**
 * Hook to get warehouse with stock summary
 */
export function useWarehouseWithStock(warehouseName, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.inventory.warehouses.detail(warehouseName),
        queryFn: () => InventoryService.getWarehouseWithStock(warehouseName),
        enabled: !!warehouseName,
        staleTime: 60 * 1000, // 1 minute
        ...queryOptions,
    });
}

/**
 * Hook to get stock ledger
 */
export function useStockLedger(options = {}, queryOptions = {}) {
    return useQuery({
        queryKey: queryKeys.inventory.stock.ledger(options),
        queryFn: () => InventoryService.getStockLedger(options),
        ...queryOptions,
    });
}
