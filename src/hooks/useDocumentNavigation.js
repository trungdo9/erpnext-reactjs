import { useQuery } from '@tanstack/react-query';
import { DocumentService } from '../api/domains';

/**
 * Hook to fetch previous/next document names for form navigation.
 *
 * Uses the document's `creation` timestamp to determine ordering.
 * - Previous: document with creation < current, sorted by creation desc, limit 1
 * - Next: document with creation > current, sorted by creation asc, limit 1
 *
 * Results are cached via React Query to avoid refetching on every render.
 *
 * @param {string} doctype - The doctype name
 * @param {string} name - The current document name
 * @param {Object} options
 * @param {string} options.creation - The creation timestamp of the current document
 * @param {boolean} options.enabled - Whether to run queries (default: true)
 * @returns {{ prevName: string|null, nextName: string|null, hasPrev: boolean, hasNext: boolean, isLoading: boolean }}
 */
export function useDocumentNavigation(doctype, name, options = {}) {
    const {
        creation = null,
        enabled = true,
    } = options;

    const canQuery = !!doctype && !!name && !!creation && enabled;

    // Fetch previous document (created before current, most recent first)
    const {
        data: prevData,
        isLoading: prevLoading,
    } = useQuery({
        queryKey: ['doc-nav', 'prev', doctype, name],
        queryFn: async () => {
            const result = await DocumentService.getList(doctype, {
                fields: ['name'],
                filters: [['creation', '<', creation]],
                orderBy: 'creation desc',
                limit: 1,
                useCache: false,
            });
            return result?.data?.[0]?.name || null;
        },
        enabled: canQuery,
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000,
    });

    // Fetch next document (created after current, earliest first)
    const {
        data: nextData,
        isLoading: nextLoading,
    } = useQuery({
        queryKey: ['doc-nav', 'next', doctype, name],
        queryFn: async () => {
            const result = await DocumentService.getList(doctype, {
                fields: ['name'],
                filters: [['creation', '>', creation]],
                orderBy: 'creation asc',
                limit: 1,
                useCache: false,
            });
            return result?.data?.[0]?.name || null;
        },
        enabled: canQuery,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
    });

    const prevName = prevData ?? null;
    const nextName = nextData ?? null;

    return {
        prevName,
        nextName,
        hasPrev: !!prevName,
        hasNext: !!nextName,
        isLoading: prevLoading || nextLoading,
    };
}

export default useDocumentNavigation;
