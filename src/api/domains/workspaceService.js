/**
 * Workspace Service
 *
 * Lấy dashboard data từ ERPNext với fallback về config
 *
 * Strategy:
 * 1. Try ERPNext APIs (Workspace, Number Cards)
 * 2. Fallback về dashboard.config.js nếu fail
 * 3. Filter theo user permissions
 */

import { apiClient, cacheManager, GatewayConfig } from '../gateway';
import usePersonaStore from '../../stores/usePersonaStore';
import {
    DEFAULT_STATS,
    DEFAULT_QUICK_ACTIONS,
    RECENT_ACTIVITY_CONFIG,
    REFRESH_CONFIG,
    getIconForDoctype,
    getColorForIndex
} from '../../config/dashboard.config';
import { HIDDEN_WORKSPACES } from '../../config/doctype.behaviors';

/**
 * Workspace Service Class
 */
class WorkspaceServiceClass {

    // =========================================================================
    // MAIN API - Get Full Dashboard Data
    // =========================================================================

    /**
     * Get complete dashboard data
     * @param {string} workspace - Workspace name (default: 'Home')
     * @returns {Promise<DashboardData>}
     */
    async getDashboardData(workspace = 'Home') {
        const cacheKey = `dashboard:${workspace}`;

        // Check cache first (2 min TTL)
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            // Try to get from ERPNext first
            const [stats, shortcuts, recentActivity] = await Promise.all([
                this.getStatsWithFallback(workspace),
                this.getShortcutsWithFallback(workspace),
                this.getRecentActivity()
            ]);

            const data = {
                stats,
                shortcuts,
                recentActivity,
                meta: {
                    source: 'api',
                    workspace,
                    generatedAt: new Date().toISOString()
                }
            };

            // Cache the result
            cacheManager.set(cacheKey, data, REFRESH_CONFIG.stats);

            return data;

        } catch (error) {
            console.debug('[WorkspaceService] API failed, using full fallback:', error);
            return this.getFullFallbackData();
        }
    }

    // =========================================================================
    // STATS - Number Cards with Counts & Trends
    // =========================================================================

    /**
     * Get stats with ERPNext API, fallback to config
     */
    async getStatsWithFallback(workspace) {
        try {
            // Try ERPNext Number Cards first
            const numberCards = await this.getNumberCardsFromWorkspace(workspace);

            if (numberCards && numberCards.length > 0) {
                return this.buildStatsFromNumberCards(numberCards);
            }
        } catch (error) {
            console.debug('[WorkspaceService] Number Cards API failed:', error.message);
        }

        // Fallback to config
        return this.buildStatsFromConfig();
    }

    /**
     * Get Number Cards from Workspace
     */
    async getNumberCardsFromWorkspace(workspace) {
        try {
            const workspaceDoc = await apiClient.getDoc('Workspace', workspace);

            if (workspaceDoc?.number_cards?.length > 0) {
                const cardNames = workspaceDoc.number_cards.map(c => c.number_card_name).filter(Boolean);
                return this.getNumberCardDetails(cardNames);
            }

            // No number_cards configured - skip (don't probe Number Card doctype)
            return [];
        } catch (error) {
            console.debug('[WorkspaceService] getNumberCardsFromWorkspace failed:', error.message);
            return [];
        }
    }

    /**
     * Get Number Card details by names
     * Uses simple fetch() to avoid gateway retry on 503/500
     */
    async getNumberCardDetails(cardNames) {
        try {
            const cards = await Promise.all(
                cardNames.slice(0, 8).map(async (name) => {
                    try {
                        const res = await fetch(
                            `/api/resource/Number Card/${encodeURIComponent(name)}`,
                            { method: 'GET', credentials: 'include' }
                        );
                        if (!res.ok) return null;
                        const json = await res.json();
                        return json.data || null;
                    } catch {
                        return null;
                    }
                })
            );
            return cards.filter(Boolean);
        } catch {
            return [];
        }
    }

    /**
     * Build stats from Number Cards (ERPNext data)
     */
    async buildStatsFromNumberCards(numberCards) {
        const stats = await Promise.all(
            numberCards.map(async (card, index) => {
                const doctype = card.document_type;

                // No permission checking - show all cards, like ERPNext does
                const filters = this.parseFilters(card.filters_json);
                const [currentCount, trendData] = await Promise.all([
                    this.getCount(doctype, filters),
                    this.getTrendData(doctype, filters)
                ]);

                return {
                    id: card.name,
                    doctype,
                    label: card.label || doctype,
                    value: currentCount,
                    icon: card.icon || getIconForDoctype(doctype),
                    color: card.color || getColorForIndex(index),
                    trend: trendData.trend,
                    trendValue: trendData.trendValue,
                    route: `/list/${doctype}`,
                    source: 'erpnext'
                };
            })
        );

        return stats.filter(Boolean);
    }

    /**
     * Build stats from config (fallback)
     */
    async buildStatsFromConfig() {
        const stats = await Promise.all(
            DEFAULT_STATS.map(async (config, index) => {
                // No permission checking - show all stats, like ERPNext does
                const [currentCount, trendData] = await Promise.all([
                    this.getCount(config.doctype, config.filters || {}),
                    config.showTrend
                        ? this.getTrendData(config.doctype, config.filters || {})
                        : { trend: null, trendValue: null }
                ]);

                return {
                    id: config.id,
                    doctype: config.doctype,
                    label: config.label,
                    value: currentCount,
                    icon: config.icon,
                    color: config.color || getColorForIndex(index),
                    trend: trendData.trend,
                    trendValue: trendData.trendValue,
                    route: `/list/${config.doctype}`,
                    source: 'config'
                };
            })
        );

        return stats.filter(Boolean);
    }

    // =========================================================================
    // SHORTCUTS / QUICK ACTIONS
    // =========================================================================

    /**
     * Get shortcuts with fallback
     */
    async getShortcutsWithFallback(workspace) {
        try {
            const shortcuts = await this.getShortcutsFromWorkspace(workspace);
            if (shortcuts && shortcuts.length > 0) {
                return this.filterShortcutsByPermission(shortcuts);
            }
        } catch (error) {
            console.debug('[WorkspaceService] Shortcuts API failed:', error.message);
        }

        // Fallback to config
        return this.getQuickActionsFromConfig();
    }

    /**
     * Get shortcuts from Workspace
     */
    async getShortcutsFromWorkspace(workspace) {
        try {
            const workspaceDoc = await apiClient.getDoc('Workspace', workspace);

            if (workspaceDoc?.shortcuts?.length > 0) {
                return workspaceDoc.shortcuts.map(sc => ({
                    id: sc.name || sc.label,
                    type: sc.type,
                    label: sc.label,
                    linkTo: sc.link_to,
                    icon: sc.icon || getIconForDoctype(sc.link_to),
                    color: sc.color || 'gray',
                    route: this.buildRoute(sc.type, sc.link_to),
                    doctype: sc.type === 'DocType' ? sc.link_to : null,
                    source: 'erpnext'
                }));
            }

            return [];
        } catch {
            return [];
        }
    }

    /**
     * Filter shortcuts by permission
     * No permission checking - return all shortcuts, like ERPNext does
     */
    filterShortcutsByPermission(shortcuts) {
        return shortcuts;
    }

    /**
     * Get quick actions from config (fallback)
     * No permission checking - return all actions, like ERPNext does
     */
    getQuickActionsFromConfig() {
        return DEFAULT_QUICK_ACTIONS.map(action => ({ ...action, source: 'config' }));
    }

    // =========================================================================
    // RECENT ACTIVITY
    // =========================================================================

    /**
     * Get recent activity across doctypes
     */
    async getRecentActivity() {
        const { doctypes, limit, orderBy, fields } = RECENT_ACTIVITY_CONFIG;

        try {
            // No permission checking - use all configured doctypes, like ERPNext does
            if (doctypes.length === 0) return [];

            // Get recent from each doctype
            const results = await Promise.all(
                doctypes.map(async (doctype) => {
                    try {
                        const items = await apiClient.getList(doctype, {
                            fields: [...fields, 'name'],
                            order_by: orderBy,
                            limit_page_length: Math.ceil(limit / doctypes.length)
                        });

                        return items.map(item => ({
                            ...item,
                            doctype,
                            doctypeLabel: doctype.replace(/_/g, ' ')
                        }));
                    } catch {
                        return [];
                    }
                })
            );

            // Merge and sort by modified
            const merged = results
                .flat()
                .sort((a, b) => new Date(b.modified) - new Date(a.modified))
                .slice(0, limit);

            return merged;

        } catch (error) {
            console.debug('[WorkspaceService] Recent activity failed:', error);
            return [];
        }
    }

    // =========================================================================
    // UTILITIES
    // =========================================================================

    /**
     * Get count for a doctype with filters
     */
    async getCount(doctype, filters = {}) {
        try {
            // Use GET-based frappe.client.get_count (no CSRF needed)
            const result = await apiClient.get('frappe.client.get_count', {
                doctype,
                filters: JSON.stringify(filters),
            });
            return result?.message ?? 0;
        } catch {
            return 0;
        }
    }

    /**
     * Get trend data (compare with last 7 days)
     */
    async getTrendData(doctype, baseFilters = {}) {
        try {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const dateStr = sevenDaysAgo.toISOString().split('T')[0];

            // Build recent filters - handle both array and object formats
            let recentFilters;
            if (Array.isArray(baseFilters)) {
                // Array format: append creation filter
                recentFilters = [...baseFilters, ['creation', '>=', dateStr]];
            } else {
                // Object format: merge with creation filter
                recentFilters = {
                    ...baseFilters,
                    creation: ['>=', dateStr]
                };
            }

            const recentCount = await this.getCount(doctype, recentFilters);

            // Calculate trend
            if (recentCount > 0) {
                return {
                    trend: 'up',
                    trendValue: `+${recentCount}`
                };
            } else {
                return {
                    trend: null,
                    trendValue: null
                };
            }
        } catch {
            return { trend: null, trendValue: null };
        }
    }

    /**
     * Parse filters JSON safely
     */
    parseFilters(filtersJson) {
        if (!filtersJson) return {};
        try {
            return typeof filtersJson === 'string'
                ? JSON.parse(filtersJson)
                : filtersJson;
        } catch {
            return {};
        }
    }

    /**
     * Build route based on type
     */
    buildRoute(type, linkTo) {
        switch (type) {
            case 'DocType':
                return `/list/${linkTo}`;
            case 'Report':
                return `/report/${linkTo}`;
            case 'Page':
                return `/page/${linkTo}`;
            default:
                return `/${linkTo}`;
        }
    }

    /**
     * Get full fallback data when everything fails
     */
    async getFullFallbackData() {
        const [stats, shortcuts, recentActivity] = await Promise.all([
            this.buildStatsFromConfig(),
            this.getQuickActionsFromConfig(),
            this.getRecentActivity()
        ]);

        return {
            stats,
            shortcuts,
            recentActivity,
            meta: {
                source: 'fallback',
                workspace: 'config',
                generatedAt: new Date().toISOString()
            }
        };
    }

    /**
     * Invalidate dashboard cache
     */
    invalidateCache() {
        cacheManager.invalidate('dashboard');
        cacheManager.invalidate('sidebar');
    }

    // =========================================================================
    // SIDEBAR - Dynamic from ERPNext Workspace (ERPNext-style flat list)
    // =========================================================================

    /**
     * Get workspace list for sidebar (ERPNext style)
     * Returns flat list of workspaces that can be expanded
     * @param {boolean} forceRefresh - Skip cache and fetch fresh data
     * @returns {Promise<Array>} Workspace items for sidebar
     */
    async getWorkspaceSidebar(forceRefresh = false) {
        // Cache key includes username to prevent cross-user cache contamination
        // (e.g., admin logs in first, caches all workspaces, then ESS user
        //  gets served admin's cached result within TTL window)
        const username = await this.getCurrentUser();
        const cacheKey = `sidebar:workspaces:${username}`;

        // Check cache (skip if force refresh)
        if (!forceRefresh) {
            const cached = cacheManager.get(cacheKey);
            if (cached) return cached;
        }

        try {
            const workspaces = await this.getWorkspaceList();

            if (workspaces && workspaces.length > 0) {
                // Deduplicate workspaces by name to prevent React duplicate key warnings
                const seen = new Set();
                const uniqueWorkspaces = workspaces.filter(ws => {
                    if (seen.has(ws.name)) {
                        console.warn(`[WorkspaceService] Duplicate workspace filtered out: "${ws.name}"`);
                        return false;
                    }
                    seen.add(ws.name);
                    return true;
                });

                // Filter out hidden default workspaces
                const visibleWorkspaces = uniqueWorkspaces.filter(ws =>
                    !HIDDEN_WORKSPACES.has(ws.name) && !HIDDEN_WORKSPACES.has(ws.label)
                );

                // Sort explicitly by sequence_id to guarantee order
                visibleWorkspaces.sort((a, b) => (a.sequence_id || 0) - (b.sequence_id || 0));

                const sidebarItems = visibleWorkspaces.map(ws => ({
                    name: ws.name,
                    label: ws.label || ws.name,
                    icon: ws.icon || 'Folder',
                    module: ws.module,
                    type: 'workspace',
                    route: `/app/workspace/${encodeURIComponent(ws.name)}`,
                    hasChildren: true,
                    source: 'erpnext'
                }));

                cacheManager.set(cacheKey, sidebarItems, REFRESH_CONFIG.shortcuts);
                return sidebarItems;
            }
        } catch (error) {
            console.debug('[WorkspaceService] getWorkspaceSidebar failed:', error.message);
        }

        return [];
    }

    /**
     * Get list of workspaces from ERPNext
     *
     * PRIMARY PATH: Custom API (steel_erp.api.get_user_workspaces)
     *   - Server-side role filtering with ignore_permissions
     *   - Works for both System Users and Website Users
     *
     * FALLBACK PATH: getList('Workspace', public=1) + client-side filter
     *   - Only works for System Users who can read Workspace doctype
     */
    async getWorkspaceList() {
        // Direct getList from Workspace doctype
        try {
            const workspaceList = await apiClient.getList('Workspace', {
                fields: ['name', 'label', 'icon', 'module', 'sequence_id', 'public'],
                filters: [['public', '=', 1]],
                orderBy: { field: 'sequence_id', order: 'asc' },
                limit: 100
            });

            if (workspaceList && workspaceList.length > 0) {
                const mappedWorkspaces = workspaceList.map(ws => ({
                    name: ws.name,
                    label: ws.label || ws.name,
                    icon: ws.icon || 'Folder',
                    module: ws.module,
                    sequence_id: ws.sequence_id || 0,
                    hasChildren: true
                }));

                return this.filterWorkspacesByUserRoles(mappedWorkspaces);
            }

            return [];
        } catch (error) {
            console.debug('[WorkspaceService] getWorkspaceList fallback failed:', error.message);
            return [];
        }
    }

    /**
     * Filter workspaces by user's roles
     * If workspace has roles assigned, only show if user has one of those roles
     * If workspace has no roles (empty), show to everyone
     * Admin users (Administrator, System Manager) see all workspaces
     *
     * NOTE: Only used in the getList fallback path.
     * The primary path (get_workspace_sidebar_items) is filtered server-side.
     */
    async filterWorkspacesByUserRoles(workspaces) {
        try {
            // Get user's roles
            const userRoles = await this.getUserRoles();


            // If we can't determine roles, show all workspaces (safe fallback)
            if (!userRoles || userRoles.length === 0) {
                console.warn('[WorkspaceService] Could not determine user roles - showing all workspaces (unsafe fallback)');
                return workspaces;
            }

            const userRoleSet = new Set(userRoles);

            // Admin users see all workspaces
            const adminRoles = ['Administrator', 'System Manager'];
            if (adminRoles.some(role => userRoleSet.has(role))) {

                return workspaces;
            }

            // Get workspace role assignments (reads roles child table for each workspace)
            const workspaceRoles = await this.getWorkspaceRoleAssignments(
                workspaces.map(ws => ws.name)
            );


            // Filter workspaces
            const filtered = workspaces.filter(ws => {
                const roles = workspaceRoles[ws.name] || [];

                // If no roles assigned, workspace is visible to everyone
                if (roles.length === 0) {

                    return true;
                }

                // If roles assigned, check if user has any of those roles
                // Also check for 'All' role which is a catch-all
                const hasAccess = roles.some(role => userRoleSet.has(role) || role === 'All');
                return hasAccess;
            });

            return filtered;
        } catch (error) {
            console.debug('[WorkspaceService] filterWorkspacesByUserRoles failed:', error);
            // On error, return all workspaces
            return workspaces;
        }
    }

    /**
     * Get current user's roles
     */
    async getUserRoles() {
        try {
            // Try persona store first (roles loaded at login)
            const storeRoles = usePersonaStore?.getState?.()?.roles;
            if (Array.isArray(storeRoles) && storeRoles.length > 0) {
                return storeRoles;
            }

            // Fallback: get roles from User doc (always works)
            const currentUser = await this.getCurrentUser();
            if (currentUser && currentUser !== 'Guest') {
                const userDoc = await apiClient.getDoc('User', currentUser);
                if (userDoc?.roles && Array.isArray(userDoc.roles)) {
                    return userDoc.roles.map(r => r.role);
                }
            }
            return [];
        } catch (error) {
            console.debug('[WorkspaceService] getUserRoles failed:', error);
            return [];
        }
    }

    /**
     * Get current logged in user
     */
    async getCurrentUser() {
        try {
            const user = await apiClient.getCurrentUser();
            return user || 'Guest';
        } catch {
            return 'Guest';
        }
    }

    /**
     * Get role assignments for workspaces
     * Returns { workspaceName: [role1, role2, ...] }
     * Uses single batch API call instead of N sequential getDoc calls
     */
    async getWorkspaceRoleAssignments(workspaceNames) {
        try {
            const roleMap = {};
            const results = await Promise.allSettled(
                workspaceNames.map(name =>
                    apiClient.getDoc('Workspace', name).then(ws => ({ name, ws }))
                )
            );
            for (const result of results) {
                if (result.status === 'fulfilled' && result.value?.ws?.roles) {
                    roleMap[result.value.name] = result.value.ws.roles.map(r => r.role);
                }
            }
            return roleMap;
        } catch (error) {
            console.debug('[WorkspaceService] getWorkspaceRoleAssignments failed:', error);
            return {};
        }
    }

    /**
     * Get workspace details with shortcuts and links (for expanded view)
     * @param {string} workspaceName - Workspace name
     * @returns {Promise<Object>} Workspace with children items
     */
    async getWorkspaceChildren(workspaceName) {
        const cacheKey = `sidebar:workspace:${workspaceName}`;

        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            const wsDoc = await apiClient.getDoc('Workspace', workspaceName);
            if (!wsDoc) return { shortcuts: [], links: [] };

            const items = [];

            // Process shortcuts - no permission checking, like ERPNext does
            if (wsDoc.shortcuts?.length > 0) {
                for (const sc of wsDoc.shortcuts) {
                    const item = this.convertShortcutToSidebarItem(sc);
                    if (item) {
                        items.push(item);
                    }
                }
            }

            // Process links (grouped by link_type) - no permission checking, like ERPNext does
            const linkGroups = {};
            if (wsDoc.links?.length > 0) {
                for (const link of wsDoc.links) {
                    if (link.type === 'DocType' && link.link_to) {
                        // Avoid duplicates with shortcuts
                        if (items.some(i => i.doctype === link.link_to)) continue;

                        const groupName = link.link_type || 'Other';
                        if (!linkGroups[groupName]) {
                            linkGroups[groupName] = [];
                        }

                        linkGroups[groupName].push({
                            id: link.link_to.replace(/ /g, '_'),
                            type: 'doctype',
                            label: link.label || link.link_to,
                            doctype: link.link_to,
                            icon: link.icon || getIconForDoctype(link.link_to),
                            onboard: link.onboard || 0
                        });
                    }
                }
            }

            const result = {
                name: workspaceName,
                label: wsDoc.label || workspaceName,
                icon: wsDoc.icon,
                shortcuts: items,
                linkGroups,
                source: 'erpnext'
            };

            cacheManager.set(cacheKey, result, REFRESH_CONFIG.shortcuts);
            return result;

        } catch (error) {
            console.debug(`[WorkspaceService] getWorkspaceChildren failed for ${workspaceName}:`, error.message);
            return { shortcuts: [], linkGroups: {} };
        }
    }

    /**
     * Get sidebar config (legacy - for fallback)
     * @returns {Promise<Array|null>} Sidebar groups or null for fallback
     */
    async getSidebarConfig() {
        const workspaces = await this.getWorkspaceSidebar();
        return workspaces.length > 0 ? workspaces : null;
    }

    /**
     * Convert ERPNext shortcut to sidebar item
     */
    convertShortcutToSidebarItem(shortcut) {
        // URL type: extract page name from internal /app/ URLs
        if (shortcut.type === 'URL' && shortcut.url) {
            const match = shortcut.url.match(/^\/app\/(.+)/);
            if (match) {
                return {
                    id: match[1].replace(/ /g, '_'),
                    label: shortcut.label || match[1],
                    icon: shortcut.icon || null,
                    type: 'page',
                    page: match[1],
                };
            }
            return null;
        }

        if (!shortcut.link_to) return null;

        const baseItem = {
            id: shortcut.link_to.replace(/ /g, '_'),
            label: shortcut.label || shortcut.link_to,
            icon: shortcut.icon || getIconForDoctype(shortcut.link_to)
        };

        switch (shortcut.type) {
            case 'DocType':
                return { ...baseItem, type: 'doctype', doctype: shortcut.link_to };
            case 'Report':
                return { ...baseItem, type: 'report', report: shortcut.link_to };
            case 'Page':
                return { ...baseItem, type: 'page', page: shortcut.link_to };
            default:
                return null;
        }
    }
}

// Export singleton
export const WorkspaceService = new WorkspaceServiceClass();
export default WorkspaceService;
