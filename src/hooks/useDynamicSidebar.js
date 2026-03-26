/**
 * Dynamic Sidebar Hook (ERPNext-style)
 *
 * Lấy danh sách Workspaces từ ERPNext giống giao diện ERPNext gốc
 * - Flat list of workspaces
 * - Each workspace can expand to show shortcuts/links
 * - Fallback to config file if API fails
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { WorkspaceService } from '../api/domains/workspaceService';
import { SIDEBAR_CONFIG } from '../config/sidebar.config';

/**
 * Query keys
 */
export const SIDEBAR_KEYS = {
    workspaces: ['sidebar', 'workspaces'],
    children: (name) => ['sidebar', 'workspace', name],
    doctypeMap: ['sidebar', 'doctype-workspace-map'],
};

/**
 * Hook to get workspace list for sidebar (ERPNext style)
 * Returns flat list of workspaces that can be expanded
 *
 * @returns {object} { workspaces, isLoading, isFromERPNext, apiSuccess, error }
 */
export function useWorkspaceSidebar() {
    const {
        data: result,
        isLoading,
        error,
        isSuccess
    } = useQuery({
        queryKey: SIDEBAR_KEYS.workspaces,
        queryFn: async () => {
            const workspaces = await WorkspaceService.getWorkspaceSidebar();
            // Return object with both data and success flag
            return { workspaces, apiSuccess: true };
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
        gcTime: 5 * 60 * 1000,   // 5 minutes
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const workspaces = result?.workspaces || [];
    const apiSuccess = isSuccess && result?.apiSuccess === true;
    const isFromERPNext = apiSuccess; // API succeeded (even if empty)

    return {
        workspaces,
        isLoading,
        isFromERPNext,
        apiSuccess,
        error
    };
}

/**
 * Hook to get workspace children (shortcuts, links) when expanded
 *
 * @param {string} workspaceName - Workspace name to fetch children for
 * @param {boolean} enabled - Whether to fetch (only when expanded)
 * @returns {object} { children, isLoading }
 */
export function useWorkspaceChildren(workspaceName, enabled = false) {
    const {
        data: children,
        isLoading
    } = useQuery({
        queryKey: SIDEBAR_KEYS.children(workspaceName),
        queryFn: () => WorkspaceService.getWorkspaceChildren(workspaceName),
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 15 * 60 * 1000,
        enabled: enabled && !!workspaceName,
        refetchOnWindowFocus: false,
    });

    return {
        children: children || { shortcuts: [], linkGroups: {} },
        isLoading
    };
}

/**
 * Combined hook for workspace sidebar with expand/collapse state
 *
 * @returns {object} Full sidebar state and handlers
 */
export function useWorkspaceSidebarWithState() {
    const { workspaces, isLoading, isFromERPNext, apiSuccess, error } = useWorkspaceSidebar();
    const [expandedWorkspaces, setExpandedWorkspaces] = useState(new Set());

    const toggleWorkspace = useCallback((workspaceName) => {
        setExpandedWorkspaces(prev => {
            const next = new Set(prev);
            if (next.has(workspaceName)) {
                next.delete(workspaceName);
            } else {
                next.add(workspaceName);
            }
            return next;
        });
    }, []);

    const isExpanded = useCallback((workspaceName) => {
        return expandedWorkspaces.has(workspaceName);
    }, [expandedWorkspaces]);

    const collapseAll = useCallback(() => {
        setExpandedWorkspaces(new Set());
    }, []);

    return {
        workspaces,
        isLoading,
        isFromERPNext,
        apiSuccess,
        error,
        expandedWorkspaces,
        toggleWorkspace,
        isExpanded,
        collapseAll
    };
}

/**
 * Hook to build a reverse map: doctype → { workspaceName, workspaceLabel }
 * Builds map from already-cached workspace children data only (no extra API calls).
 * Falls back to PAGE_WORKSPACE_MAP for custom pages.
 *
 * @returns {object} Map<doctype, { name, label }>
 */
export function useDoctypeWorkspaceMap() {
    const queryClient = useQueryClient();
    const { workspaces, isLoading: wsLoading } = useWorkspaceSidebar();

    const { data: doctypeMap } = useQuery({
        queryKey: SIDEBAR_KEYS.doctypeMap,
        queryFn: () => {
            const map = {};
            // Build map only from already-cached workspace children (zero API calls)
            for (const ws of workspaces) {
                const cached = queryClient.getQueryData(SIDEBAR_KEYS.children(ws.name));
                if (!cached) continue;
                const wsInfo = { name: ws.name, label: cached.label || ws.label || ws.name };

                if (cached.shortcuts) {
                    for (const s of cached.shortcuts) {
                        if (s.doctype) map[s.doctype] = wsInfo;
                    }
                }

                if (cached.linkGroups) {
                    for (const group of Object.values(cached.linkGroups)) {
                        for (const item of group) {
                            if (item.doctype) map[item.doctype] = wsInfo;
                        }
                    }
                }
            }
            return map;
        },
        enabled: !wsLoading && workspaces.length > 0,
        staleTime: 10 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    return doctypeMap || {};
}

/**
 * Legacy hook - Get dynamic sidebar with fallback to config
 * Keep for backwards compatibility
 *
 * @returns {object} { sidebarConfig, isLoading, isFromERPNext, source }
 */
export function useDynamicSidebar() {
    const { workspaces, isLoading, isFromERPNext } = useWorkspaceSidebar();

    // If we have workspaces from ERPNext, return them
    // Otherwise fallback to SIDEBAR_CONFIG
    if (isFromERPNext) {
        return {
            sidebarConfig: workspaces,
            isLoading,
            isFromERPNext: true,
            source: 'erpnext'
        };
    }

    return {
        sidebarConfig: SIDEBAR_CONFIG,
        isLoading,
        isFromERPNext: false,
        source: 'config'
    };
}

/**
 * Legacy hook - combines dynamic sidebar with permission filtering
 * Keep for backwards compatibility with existing Sidebar.jsx
 *
 * @returns {object} { filteredConfig, isLoading, source }
 */
export function useDynamicSidebarWithPermissions() {
    const { sidebarConfig, isLoading, source } = useDynamicSidebar();

    // Workspaces from ERPNext are already permission-filtered in the service
    // Config-based sidebar will be filtered by the component
    return {
        filteredConfig: sidebarConfig || [],
        isLoading,
        source
    };
}

export default useDynamicSidebar;
