/**
 * React Query Integration
 *
 * Provides React Query hooks for data fetching with:
 * - Automatic caching
 * - Background refetching
 * - Optimistic updates
 * - Error handling
 */

export { queryClient } from './queryConfig';
export { QueryProvider, QueryDevtools } from './client';
export { queryKeys } from './keys';

// Document hooks
export {
    useDocument,
    useDocumentList,
    useCreateDocument,
    useUpdateDocument,
    useDeleteDocument,
    useBulkCreateDocuments,
    useBulkUpdateDocuments,
    useBulkDeleteDocuments,
    useDocumentCount,
    prefetchDocument,
    prefetchDocumentList,
} from './useDocument';

// Metadata hooks
export {
    useDocTypeMeta,
    useDocTypeFields,
    useChildTableMeta,
    prefetchMeta,
} from './useMeta';

// Auth hooks
export {
    useCurrentUser,
    useLogin,
    useLogout,
    usePermissions,
    useHasRole,
} from './useAuth';

// Search hooks
export {
    useLinkSearch,
    useGlobalSearch,
} from './useSearch';

// Workflow hooks
export {
    useWorkflowTransitions,
    useApplyWorkflow,
    useSubmitDocument,
    useCancelDocument,
} from './useWorkflow';

// Production hooks
export {
    useWorkOrderList,
    useWorkOrder,
    useCreateWorkOrder,
    useJobCardList,
    useProductionDashboard,
} from './useProduction';

// Inventory hooks
export {
    useItems,
    useItem,
    useStockBalance,
    useCreateStockEntry,
} from './useInventory';
