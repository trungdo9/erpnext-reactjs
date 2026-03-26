/**
 * Permission Hooks
 *
 * React hooks for checking user permissions.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PermissionService } from '../services/PermissionService';

/**
 * Hook to check if user can access a single doctype
 *
 * @param {string} doctype
 * @returns {{ canAccess: boolean, loading: boolean, refresh: Function }}
 *
 * @example
 * const { canAccess, loading } = useCanAccess('Sales Order');
 * if (loading) return <Spinner />;
 * if (!canAccess) return <NoPermission />;
 */
export function useCanAccess(doctype) {
    const [canAccess, setCanAccess] = useState(false);
    const [loading, setLoading] = useState(true);

    const checkAccess = useCallback(async () => {
        if (!doctype) {
            setCanAccess(false);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const hasAccess = await PermissionService.canAccess(doctype);
            setCanAccess(hasAccess);
        } catch (error) {
            console.warn(`Permission check failed for ${doctype}:`, error);
            setCanAccess(false);
        } finally {
            setLoading(false);
        }
    }, [doctype]);

    useEffect(() => {
        checkAccess();
    }, [checkAccess]);

    const refresh = useCallback(() => {
        PermissionService.invalidate(doctype);
        checkAccess();
    }, [doctype, checkAccess]);

    return { canAccess, loading, refresh };
}

/**
 * Hook to get full permissions for a doctype
 *
 * @param {string} doctype
 * @returns {{ permissions: Object, loading: boolean, refresh: Function }}
 *
 * @example
 * const { permissions, loading } = usePermissions('Sales Order');
 * if (permissions.write) { // show edit button }
 */
export function usePermissions(doctype) {
    const [permissions, setPermissions] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchPermissions = useCallback(async () => {
        if (!doctype) {
            setPermissions(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const perms = await PermissionService.getPermissions(doctype);
            setPermissions(perms);
        } catch (error) {
            console.warn(`Failed to get permissions for ${doctype}:`, error);
            setPermissions(null);
        } finally {
            setLoading(false);
        }
    }, [doctype]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    const refresh = useCallback(() => {
        PermissionService.invalidate(doctype);
        fetchPermissions();
    }, [doctype, fetchPermissions]);

    return { permissions, loading, refresh };
}

/**
 * Hook to bulk check access for multiple doctypes
 * Useful for sidebar filtering
 *
 * @param {string[]} doctypes
 * @returns {{ accessMap: Object, loading: boolean, refresh: Function }}
 *
 * @example
 * const doctypes = ['Sales Order', 'Purchase Order', 'Item'];
 * const { accessMap, loading } = useBulkAccess(doctypes);
 * // accessMap = { 'Sales Order': true, 'Purchase Order': false, 'Item': true }
 */
export function useBulkAccess(doctypes) {
    const [accessMap, setAccessMap] = useState({});
    const [loading, setLoading] = useState(true);

    // Memoize doctypes array to prevent unnecessary re-renders
    const _doctypeKey = useMemo(() =>
        Array.isArray(doctypes) ? doctypes.sort().join(',') : '',
        [doctypes]
    );

    const checkAll = useCallback(async () => {
        if (!doctypes || doctypes.length === 0) {
            setAccessMap({});
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const results = await PermissionService.bulkCheckAccess(doctypes);
            setAccessMap(results);
        } catch (error) {
            console.warn('Bulk access check failed:', error);
            // Set all to false on error
            const fallback = {};
            doctypes.forEach(dt => fallback[dt] = false);
            setAccessMap(fallback);
        } finally {
            setLoading(false);
        }
    }, [doctypes]);

    useEffect(() => {
        checkAll();
    }, [checkAll]);

    const refresh = useCallback(() => {
        PermissionService.invalidate();
        checkAll();
    }, [checkAll]);

    return { accessMap, loading, refresh };
}

/**
 * Hook for sidebar items - extracts doctypes and checks access
 *
 * @param {Array} sidebarConfig - Sidebar configuration array
 * @returns {{ filteredConfig: Array, loading: boolean }}
 */
export function useSidebarPermissions(sidebarConfig) {
    const [filteredConfig, setFilteredConfig] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkPermissions = async () => {
            if (!sidebarConfig || sidebarConfig.length === 0) {
                setFilteredConfig([]);
                setLoading(false);
                return;
            }

            setLoading(true);

            // Extract all doctypes from config
            const doctypes = new Set();
            sidebarConfig.forEach(group => {
                if (group.items) {
                    group.items.forEach(item => {
                        if (item.type === 'doctype' && item.doctype) {
                            doctypes.add(item.doctype);
                        }
                    });
                }
            });

            // Bulk check access
            const accessMap = await PermissionService.bulkCheckAccess([...doctypes]);

            // Filter config based on permissions
            const filtered = sidebarConfig.map(group => {
                if (!group.items) return group;

                const filteredItems = group.items.filter(item => {
                    // Non-doctype items (pages, reports, menu-pages) - show by default
                    if (item.type !== 'doctype') {
                        return true;
                    }

                    // Doctype items - check permission
                    return accessMap[item.doctype] === true;
                });

                return {
                    ...group,
                    items: filteredItems
                };
            }).filter(group => {
                // Remove empty groups
                return !group.items || group.items.length > 0;
            });

            setFilteredConfig(filtered);
            setLoading(false);
        };

        checkPermissions();
    }, [sidebarConfig]);

    return { filteredConfig, loading };
}

/**
 * Simple permission check without hook (for use in callbacks)
 */
export const checkPermission = PermissionService.check.bind(PermissionService);
export const canAccessDoctype = PermissionService.canAccess.bind(PermissionService);

export default usePermissions;
