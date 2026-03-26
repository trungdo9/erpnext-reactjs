/**
 * Production Service
 *
 * Domain-specific service for steel production operations.
 * Encapsulates business logic for:
 * - Work Orders (Lệnh sản xuất)
 * - Job Cards (Phiếu công việc)
 * - Quality Inspection (Kiểm tra chất lượng)
 * - Production workflows
 */

import { DocumentService } from './documentService';
import { cacheManager } from '../gateway';

/**
 * Production status constants
 */
export const ProductionStatus = {
    DRAFT: 'Draft',
    NOT_STARTED: 'Not Started',
    IN_PROCESS: 'In Process',
    COMPLETED: 'Completed',
    STOPPED: 'Stopped',
    CANCELLED: 'Cancelled',
};

/**
 * Production Service class
 */
class ProductionServiceClass {
    // =========================================================================
    // Work Orders (Lệnh sản xuất)
    // =========================================================================

    /**
     * Get work order list
     * @param {object} options
     * @returns {Promise<object>}
     */
    async getWorkOrderList(options = {}) {
        const {
            status,
            productionItem,
            dateFrom,
            dateTo,
            ...restOptions
        } = options;

        const filters = [];

        if (status) {
            filters.push(['status', '=', status]);
        }
        if (productionItem) {
            filters.push(['production_item', '=', productionItem]);
        }
        if (dateFrom) {
            filters.push(['planned_start_date', '>=', dateFrom]);
        }
        if (dateTo) {
            filters.push(['planned_start_date', '<=', dateTo]);
        }

        return DocumentService.getList('Work Order', {
            ...restOptions,
            filters,
            fields: [
                'name', 'production_item', 'item_name', 'status',
                'qty', 'produced_qty', 'planned_start_date',
                'expected_delivery_date', 'modified'
            ],
        });
    }

    /**
     * Get work order by ID
     * @param {string} name
     * @returns {Promise<object>}
     */
    async getWorkOrder(name) {
        const doc = await DocumentService.get('Work Order', name);
        return this.transformWorkOrder(doc);
    }

    /**
     * Create work order
     * @param {object} data
     * @returns {Promise<object>}
     */
    async createWorkOrder(data) {
        this.validateWorkOrder(data);

        return DocumentService.create('Work Order', {
            ...data,
            status: data.status || ProductionStatus.DRAFT,
        });
    }

    /**
     * Update work order
     * @param {string} name
     * @param {object} data
     * @returns {Promise<object>}
     */
    async updateWorkOrder(name, data) {
        const existing = await this.getWorkOrder(name);
        this.validateWorkOrderUpdate(existing, data);

        return DocumentService.update('Work Order', name, data);
    }

    // =========================================================================
    // Job Cards (Phiếu công việc)
    // =========================================================================

    /**
     * Get job card list
     * @param {object} options
     * @returns {Promise<object>}
     */
    async getJobCardList(options = {}) {
        const {
            workOrder,
            status,
            workstation,
            dateFrom,
            dateTo,
            ...restOptions
        } = options;

        const filters = [];

        if (workOrder) {
            filters.push(['work_order', '=', workOrder]);
        }
        if (status) {
            filters.push(['status', '=', status]);
        }
        if (workstation) {
            filters.push(['workstation', '=', workstation]);
        }
        if (dateFrom) {
            filters.push(['posting_date', '>=', dateFrom]);
        }
        if (dateTo) {
            filters.push(['posting_date', '<=', dateTo]);
        }

        return DocumentService.getList('Job Card', {
            ...restOptions,
            filters,
            fields: [
                'name', 'work_order', 'operation', 'workstation',
                'status', 'for_quantity', 'total_completed_qty',
                'posting_date', 'modified'
            ],
        });
    }

    /**
     * Get job card by ID
     * @param {string} name
     * @returns {Promise<object>}
     */
    async getJobCard(name) {
        const doc = await DocumentService.get('Job Card', name);
        return this.transformJobCard(doc);
    }

    // =========================================================================
    // Dashboard & Analytics
    // =========================================================================

    /**
     * Get production dashboard stats
     * @param {object} options
     * @returns {Promise<object>}
     */
    async getDashboardStats(options = {}) {
        const { dateFrom, dateTo } = options;

        const filters = [];
        if (dateFrom) filters.push(['planned_start_date', '>=', dateFrom]);
        if (dateTo) filters.push(['planned_start_date', '<=', dateTo]);

        const [
            totalWorkOrders,
            completedWorkOrders,
            inProcessWorkOrders,
            draftWorkOrders,
        ] = await Promise.all([
            DocumentService.getCount('Work Order', filters),
            DocumentService.getCount('Work Order', [...filters, ['status', '=', 'Completed']]),
            DocumentService.getCount('Work Order', [...filters, ['status', '=', 'In Process']]),
            DocumentService.getCount('Work Order', [...filters, ['status', '=', 'Draft']]),
        ]);

        return {
            workOrders: {
                total: totalWorkOrders,
                completed: completedWorkOrders,
                inProcess: inProcessWorkOrders,
                draft: draftWorkOrders,
                completionRate: totalWorkOrders > 0
                    ? Math.round((completedWorkOrders / totalWorkOrders) * 100)
                    : 0,
            },
            overall: {
                total: totalWorkOrders,
                completed: completedWorkOrders,
                completionRate: totalWorkOrders > 0
                    ? Math.round((completedWorkOrders / totalWorkOrders) * 100)
                    : 0,
            },
        };
    }

    /**
     * Get recent activity
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async getRecentActivity(limit = 10) {
        const [workOrderActivity, jobCardActivity] = await Promise.all([
            DocumentService.getList('Work Order', {
                limit: limit,
                orderBy: 'modified desc',
                fields: ['name', 'production_item', 'item_name', 'status', 'modified'],
            }),
            DocumentService.getList('Job Card', {
                limit: limit,
                orderBy: 'modified desc',
                fields: ['name', 'work_order', 'operation', 'status', 'modified'],
            }),
        ]);

        const combined = [
            ...workOrderActivity.data.map(d => ({ ...d, type: 'work_order' })),
            ...jobCardActivity.data.map(d => ({ ...d, type: 'job_card' })),
        ].sort((a, b) => new Date(b.modified) - new Date(a.modified));

        return combined.slice(0, limit);
    }

    // =========================================================================
    // Validation Methods
    // =========================================================================

    validateWorkOrder(data) {
        if (!data.production_item) {
            throw new Error('Production item is required');
        }
        if (!data.qty || data.qty <= 0) {
            throw new Error('Quantity is required and must be positive');
        }
    }

    validateWorkOrderUpdate(existing, _data) {
        if (existing.status === ProductionStatus.CANCELLED) {
            throw new Error('Cannot update cancelled work order');
        }
        if (existing.status === ProductionStatus.COMPLETED) {
            throw new Error('Cannot update completed work order');
        }
    }

    // =========================================================================
    // Transformation Methods
    // =========================================================================

    transformWorkOrder(doc) {
        if (!doc) return null;
        return {
            id: doc.name,
            name: doc.name,
            productionItem: doc.production_item,
            itemName: doc.item_name,
            status: doc.status,
            qty: doc.qty,
            producedQty: doc.produced_qty,
            plannedStartDate: doc.planned_start_date,
            expectedDeliveryDate: doc.expected_delivery_date,
            createdAt: doc.creation,
            updatedAt: doc.modified,
            _raw: doc,
        };
    }

    transformJobCard(doc) {
        if (!doc) return null;
        return {
            id: doc.name,
            name: doc.name,
            workOrder: doc.work_order,
            operation: doc.operation,
            workstation: doc.workstation,
            status: doc.status,
            forQuantity: doc.for_quantity,
            totalCompletedQty: doc.total_completed_qty,
            postingDate: doc.posting_date,
            createdAt: doc.creation,
            updatedAt: doc.modified,
            _raw: doc,
        };
    }

    // =========================================================================
    // Cache Management
    // =========================================================================

    invalidateCache() {
        cacheManager.invalidate('Work Order');
        cacheManager.invalidate('Job Card');
    }
}

// Export singleton
export const ProductionService = new ProductionServiceClass();
export default ProductionService;
