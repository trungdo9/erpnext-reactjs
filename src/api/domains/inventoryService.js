/**
 * Inventory Service
 *
 * Domain-specific service for inventory management operations.
 * Handles stock tracking, warehouse management, and inventory transactions.
 */

import { DocumentService } from './documentService';
import { apiClient, cacheManager } from '../gateway';

/**
 * Stock Entry types
 */
export const StockEntryType = {
    RECEIVE: 'Material Receipt',
    ISSUE: 'Material Issue',
    TRANSFER: 'Material Transfer',
    MANUFACTURE: 'Manufacture',
    REPACK: 'Repack',
    ADJUSTMENT: 'Stock Adjustment',
};

/**
 * Inventory Service class
 */
class InventoryServiceClass {
    // =========================================================================
    // Item Management
    // =========================================================================

    /**
     * Get items list
     * @param {object} options
     * @returns {Promise<object>}
     */
    async getItems(options = {}) {
        const {
            itemGroup,
            isStockItem,
            searchQuery,
            ...restOptions
        } = options;

        const filters = [];

        if (itemGroup) {
            filters.push(['item_group', '=', itemGroup]);
        }
        if (typeof isStockItem === 'boolean') {
            filters.push(['is_stock_item', '=', isStockItem ? 1 : 0]);
        }
        if (searchQuery) {
            filters.push(['item_name', 'like', `%${searchQuery}%`]);
        }

        return DocumentService.getList('Item', {
            ...restOptions,
            filters,
            fields: [
                'name', 'item_name', 'item_group', 'stock_uom',
                'is_stock_item', 'image', 'description', 'modified'
            ],
        });
    }

    /**
     * Get item by code
     * @param {string} itemCode
     * @returns {Promise<object>}
     */
    async getItem(itemCode) {
        const doc = await DocumentService.get('Item', itemCode);
        return this.transformItem(doc);
    }

    /**
     * Create new item
     * @param {object} data
     * @returns {Promise<object>}
     */
    async createItem(data) {
        this.validateItem(data);

        return DocumentService.create('Item', {
            item_code: data.itemCode,
            item_name: data.itemName,
            item_group: data.itemGroup,
            stock_uom: data.uom || 'Nos',
            is_stock_item: data.isStockItem !== false ? 1 : 0,
            ...data,
        });
    }

    // =========================================================================
    // Stock Balance
    // =========================================================================

    /**
     * Get stock balance for an item
     * @param {string} itemCode
     * @param {string} warehouse - Optional specific warehouse
     * @returns {Promise<object>}
     */
    async getStockBalance(itemCode, warehouse = null) {
        const cacheKey = `stock:${itemCode}:${warehouse || 'all'}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            const filters = [['item_code', '=', itemCode]];
            if (warehouse) {
                filters.push(['warehouse', '=', warehouse]);
            }

            const result = await apiClient.getList('Bin', {
                filters,
                fields: ['warehouse', 'actual_qty', 'planned_qty', 'reserved_qty', 'ordered_qty'],
            });

            const stockData = {
                itemCode,
                warehouses: result.map(bin => ({
                    warehouse: bin.warehouse,
                    actualQty: bin.actual_qty || 0,
                    plannedQty: bin.planned_qty || 0,
                    reservedQty: bin.reserved_qty || 0,
                    orderedQty: bin.ordered_qty || 0,
                    availableQty: (bin.actual_qty || 0) - (bin.reserved_qty || 0),
                })),
                totalQty: result.reduce((sum, bin) => sum + (bin.actual_qty || 0), 0),
                totalAvailable: result.reduce(
                    (sum, bin) => sum + ((bin.actual_qty || 0) - (bin.reserved_qty || 0)),
                    0
                ),
            };

            cacheManager.set(cacheKey, stockData, 30000); // 30 seconds
            return stockData;
        } catch (error) {
            console.warn(`Failed to get stock balance: ${error.message}`);
            return {
                itemCode,
                warehouses: [],
                totalQty: 0,
                totalAvailable: 0,
            };
        }
    }

    /**
     * Get stock balance for multiple items
     * @param {Array<string>} itemCodes
     * @param {string} warehouse
     * @returns {Promise<object>}
     */
    async getBulkStockBalance(itemCodes, warehouse = null) {
        const results = {};
        await Promise.all(
            itemCodes.map(async (code) => {
                results[code] = await this.getStockBalance(code, warehouse);
            })
        );
        return results;
    }

    // =========================================================================
    // Stock Entries
    // =========================================================================

    /**
     * Create stock entry (stock in/out/transfer)
     * @param {object} data
     * @returns {Promise<object>}
     */
    async createStockEntry(data) {
        this.validateStockEntry(data);

        const stockEntry = {
            stock_entry_type: data.type,
            posting_date: data.date || new Date().toISOString().split('T')[0],
            posting_time: data.time || new Date().toTimeString().split(' ')[0],
            from_warehouse: data.fromWarehouse,
            to_warehouse: data.toWarehouse,
            remarks: data.remarks,
            items: data.items.map(item => ({
                item_code: item.itemCode,
                qty: item.qty,
                s_warehouse: data.type === StockEntryType.ISSUE ? data.fromWarehouse : item.sourceWarehouse,
                t_warehouse: data.type === StockEntryType.RECEIVE ? data.toWarehouse : item.targetWarehouse,
                basic_rate: item.rate,
            })),
        };

        const result = await DocumentService.create('Stock Entry', stockEntry);

        // Invalidate stock caches
        data.items.forEach(item => {
            cacheManager.invalidate(`stock:${item.itemCode}`);
        });

        return result;
    }

    /**
     * Receive stock (Material Receipt)
     * @param {object} data
     * @returns {Promise<object>}
     */
    async receiveStock(data) {
        return this.createStockEntry({
            ...data,
            type: StockEntryType.RECEIVE,
        });
    }

    /**
     * Issue stock (Material Issue)
     * @param {object} data
     * @returns {Promise<object>}
     */
    async issueStock(data) {
        return this.createStockEntry({
            ...data,
            type: StockEntryType.ISSUE,
        });
    }

    /**
     * Transfer stock between warehouses
     * @param {object} data
     * @returns {Promise<object>}
     */
    async transferStock(data) {
        return this.createStockEntry({
            ...data,
            type: StockEntryType.TRANSFER,
        });
    }

    // =========================================================================
    // Warehouses
    // =========================================================================

    /**
     * Get warehouses list
     * @param {object} options
     * @returns {Promise<Array>}
     */
    async getWarehouses(options = {}) {
        const { parentWarehouse, isGroup, ...restOptions } = options;

        const filters = [];
        if (parentWarehouse) {
            filters.push(['parent_warehouse', '=', parentWarehouse]);
        }
        if (typeof isGroup === 'boolean') {
            filters.push(['is_group', '=', isGroup ? 1 : 0]);
        }

        return DocumentService.getList('Warehouse', {
            ...restOptions,
            filters,
            fields: ['name', 'warehouse_name', 'parent_warehouse', 'is_group', 'company'],
        });
    }

    /**
     * Get warehouse with stock summary
     * @param {string} warehouseName
     * @returns {Promise<object>}
     */
    async getWarehouseWithStock(warehouseName) {
        const warehouse = await DocumentService.get('Warehouse', warehouseName);

        // Get all bins for this warehouse
        const bins = await apiClient.getList('Bin', {
            filters: [['warehouse', '=', warehouseName]],
            fields: ['item_code', 'actual_qty', 'valuation_rate'],
        });

        return {
            ...warehouse,
            stockItems: bins.map(bin => ({
                itemCode: bin.item_code,
                qty: bin.actual_qty,
                value: bin.actual_qty * (bin.valuation_rate || 0),
            })),
            totalItems: bins.length,
            totalValue: bins.reduce(
                (sum, bin) => sum + (bin.actual_qty * (bin.valuation_rate || 0)),
                0
            ),
        };
    }

    // =========================================================================
    // Stock Ledger
    // =========================================================================

    /**
     * Get stock ledger entries
     * @param {object} options
     * @returns {Promise<Array>}
     */
    async getStockLedger(options = {}) {
        const {
            itemCode,
            warehouse,
            fromDate,
            toDate,
            limit = 50,
        } = options;

        const filters = [];
        if (itemCode) filters.push(['item_code', '=', itemCode]);
        if (warehouse) filters.push(['warehouse', '=', warehouse]);
        if (fromDate) filters.push(['posting_date', '>=', fromDate]);
        if (toDate) filters.push(['posting_date', '<=', toDate]);

        return apiClient.getList('Stock Ledger Entry', {
            filters,
            fields: [
                'name', 'item_code', 'warehouse', 'posting_date', 'posting_time',
                'actual_qty', 'qty_after_transaction', 'voucher_type', 'voucher_no'
            ],
            order_by: 'posting_date desc, posting_time desc',
            limit_page_length: limit,
        });
    }

    // =========================================================================
    // Validation
    // =========================================================================

    validateItem(data) {
        if (!data.itemName && !data.item_name) {
            throw new Error('Item name is required');
        }
        if (!data.itemGroup && !data.item_group) {
            throw new Error('Item group is required');
        }
    }

    validateStockEntry(data) {
        if (!data.type) {
            throw new Error('Stock entry type is required');
        }
        if (!data.items || data.items.length === 0) {
            throw new Error('At least one item is required');
        }

        for (const item of data.items) {
            if (!item.itemCode) {
                throw new Error('Item code is required for all items');
            }
            if (!item.qty || item.qty <= 0) {
                throw new Error('Valid quantity is required for all items');
            }
        }

        if (data.type === StockEntryType.TRANSFER) {
            if (!data.fromWarehouse && !data.items.some(i => i.sourceWarehouse)) {
                throw new Error('Source warehouse is required for transfer');
            }
            if (!data.toWarehouse && !data.items.some(i => i.targetWarehouse)) {
                throw new Error('Target warehouse is required for transfer');
            }
        }
    }

    // =========================================================================
    // Transformation
    // =========================================================================

    transformItem(doc) {
        if (!doc) return null;
        return {
            id: doc.name,
            code: doc.name,
            name: doc.item_name,
            group: doc.item_group,
            uom: doc.stock_uom,
            isStockItem: !!doc.is_stock_item,
            image: doc.image,
            description: doc.description,
            barcode: doc.barcodes?.[0]?.barcode,
            createdAt: doc.creation,
            updatedAt: doc.modified,
            _raw: doc,
        };
    }

    // =========================================================================
    // Cache Management
    // =========================================================================

    invalidateStockCache(itemCode = null) {
        if (itemCode) {
            cacheManager.invalidate(`stock:${itemCode}`);
        } else {
            cacheManager.invalidate('stock:');
        }
    }
}

// Export singleton
export const InventoryService = new InventoryServiceClass();
export default InventoryService;
