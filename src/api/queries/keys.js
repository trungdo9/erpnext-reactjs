/**
 * Query Keys
 *
 * Centralized query key definitions for React Query.
 * Following the factory pattern for consistent key generation.
 */

export const queryKeys = {
    // Documents
    documents: {
        all: ['documents'],
        lists: () => [...queryKeys.documents.all, 'list'],
        list: (doctype, options) => [...queryKeys.documents.lists(), doctype, options],
        details: () => [...queryKeys.documents.all, 'detail'],
        detail: (doctype, name) => [...queryKeys.documents.details(), doctype, name],
        count: (doctype, filters) => [...queryKeys.documents.all, 'count', doctype, filters],
    },

    // Metadata
    meta: {
        all: ['meta'],
        doctype: (doctype) => [...queryKeys.meta.all, doctype],
        fields: (doctype) => [...queryKeys.meta.all, 'fields', doctype],
        childTables: (doctype) => [...queryKeys.meta.all, 'childTables', doctype],
    },

    // Auth
    auth: {
        all: ['auth'],
        currentUser: () => [...queryKeys.auth.all, 'currentUser'],
        permissions: (doctype) => [...queryKeys.auth.all, 'permissions', doctype],
        roles: () => [...queryKeys.auth.all, 'roles'],
    },

    // Search
    search: {
        all: ['search'],
        link: (doctype, query) => [...queryKeys.search.all, 'link', doctype, query],
        global: (query) => [...queryKeys.search.all, 'global', query],
    },

    // Workflow
    workflow: {
        all: ['workflow'],
        transitions: (doctype, name) => [...queryKeys.workflow.all, 'transitions', doctype, name],
        history: (doctype, name) => [...queryKeys.workflow.all, 'history', doctype, name],
    },

    // Production
    production: {
        all: ['production'],
        workOrders: {
            all: () => [...queryKeys.production.all, 'workOrders'],
            list: (options) => [...queryKeys.production.workOrders.all(), 'list', options],
            detail: (name) => [...queryKeys.production.workOrders.all(), 'detail', name],
        },
        jobCards: {
            all: () => [...queryKeys.production.all, 'jobCards'],
            list: (options) => [...queryKeys.production.jobCards.all(), 'list', options],
            detail: (name) => [...queryKeys.production.jobCards.all(), 'detail', name],
        },
        dashboard: (options) => [...queryKeys.production.all, 'dashboard', options],
        activity: (limit) => [...queryKeys.production.all, 'activity', limit],
    },

    // Inventory
    inventory: {
        all: ['inventory'],
        items: {
            all: () => [...queryKeys.inventory.all, 'items'],
            list: (options) => [...queryKeys.inventory.items.all(), 'list', options],
            detail: (itemCode) => [...queryKeys.inventory.items.all(), 'detail', itemCode],
        },
        stock: {
            all: () => [...queryKeys.inventory.all, 'stock'],
            balance: (itemCode, warehouse) => [...queryKeys.inventory.stock.all(), 'balance', itemCode, warehouse],
            ledger: (options) => [...queryKeys.inventory.stock.all(), 'ledger', options],
        },
        warehouses: {
            all: () => [...queryKeys.inventory.all, 'warehouses'],
            list: (options) => [...queryKeys.inventory.warehouses.all(), 'list', options],
            detail: (name) => [...queryKeys.inventory.warehouses.all(), 'detail', name],
        },
    },

    // Files
    files: {
        all: ['files'],
        attachments: (doctype, docname) => [...queryKeys.files.all, 'attachments', doctype, docname],
    },
};

export default queryKeys;
