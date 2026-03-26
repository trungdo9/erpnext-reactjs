/**
 * Document Service
 *
 * Generic document operations with business logic.
 * This is the main CRUD service that domain-specific services extend.
 */

import { apiClient } from '../gateway';

const BULK_CONCURRENCY = 5;

async function processInBatches(items, fn) {
    const results = [];
    for (let i = 0; i < items.length; i += BULK_CONCURRENCY) {
        const batch = items.slice(i, i + BULK_CONCURRENCY);
        const batchResults = await Promise.allSettled(batch.map(fn));
        results.push(...batchResults);
    }
    return results;
}

/**
 * Document Service class
 */
class DocumentServiceClass {
    /**
     * Get a list of documents with caching
     * @param {string} doctype
     * @param {object} options - { fields, filters, orderBy, limit, start }
     * @returns {Promise<{ data: Array, total: number }>}
     */
    async getList(doctype, options = {}) {
        const {
            fields = ['name'],
            filters = [],
            orFilters,
            orderBy = 'modified desc',
            limit = 20,
            start = 0,
        } = options;

        const params = {
            doctype,
            fields,
            filters,
            order_by: orderBy,
            limit_page_length: limit,
            limit_start: start,
        };
        if (orFilters && orFilters.length > 0) {
            params.or_filters = orFilters;
        }

        // Use POST frappe.client.get_list for reliable filter/or_filter support
        // Caching is handled by React Query at the hook layer - no dual-cache here
        const response = await apiClient.post('frappe.client.get_list', params);
        const data = response?.message || [];

        return { data };
    }

    /**
     * Get a single document
     * @param {string} doctype
     * @param {string} name
     * @param {object} options - { useCache }
     * @returns {Promise<object>}
     */
    async get(doctype, name, _options = {}) {
        // Caching is handled by React Query at the hook layer - no dual-cache here
        return apiClient.getDoc(doctype, name);
    }

    /**
     * Create a new document
     * @param {string} doctype
     * @param {object} data
     * @returns {Promise<object>}
     */
    async create(doctype, data) {
        // Validate before creating
        this.validateBeforeCreate(doctype, data);

        // Create document — cache invalidation handled by React Query onSuccess
        return apiClient.createDoc(doctype, data);
    }

    /**
     * Update an existing document
     * @param {string} doctype
     * @param {string} name
     * @param {object} data
     * @returns {Promise<object>}
     */
    async update(doctype, name, data) {
        // Validate before updating
        this.validateBeforeUpdate(doctype, name, data);

        // Update document — cache invalidation handled by React Query onSuccess
        return apiClient.updateDoc(doctype, name, data);
    }

    /**
     * Delete a document
     * @param {string} doctype
     * @param {string} name
     * @returns {Promise<void>}
     */
    async delete(doctype, name) {
        // Validate before deleting
        await this.validateBeforeDelete(doctype, name);

        // Delete document — cache invalidation handled by React Query onSuccess
        await apiClient.deleteDoc(doctype, name);
    }

    /**
     * Get document count
     * @param {string} doctype
     * @param {Array} filters
     * @returns {Promise<number>}
     */
    async getCount(doctype, filters = {}) {
        try {
            const result = await apiClient.post('frappe.client.get_count', {
                doctype,
                filters,
            });
            return result?.message ?? 0;
        } catch {
            return 0;
        }
    }

    /**
     * Get distinct values for a field (for filter dropdowns)
     * Uses Frappe's group_by to efficiently fetch unique values from entire dataset
     * @param {string} doctype
     * @param {string} fieldname
     * @param {Array} filters - Optional filters to apply
     * @param {number} limit - Max number of unique values to return
     * @returns {Promise<Array>}
     */
    async getDistinctValues(doctype, fieldname, filters = [], limit = 500) {
        try {
            // Use POST frappe.client.get_list with group_by for distinct values
            const response = await apiClient.post('frappe.client.get_list', {
                doctype,
                fields: [fieldname],
                filters,
                group_by: fieldname,
                order_by: `${fieldname} asc`,
                limit_page_length: limit,
            });
            const data = response?.message || [];

            // Extract values (each row is already unique due to group_by)
            return data
                .map(item => item[fieldname])
                .filter(value => value !== undefined && value !== null && value !== '');
        } catch (error) {
            console.error(`Error fetching distinct values for ${doctype}.${fieldname}:`, error);
            // Fallback: try without group_by
            try {
                const response = await apiClient.post('frappe.client.get_list', {
                    doctype,
                    fields: [fieldname],
                    filters,
                    order_by: `${fieldname} asc`,
                    limit_page_length: 2000,
                });
                const data = response?.message || [];
                const uniqueSet = new Set();
                for (const item of data) {
                    const value = item[fieldname];
                    if (value !== undefined && value !== null && value !== '') {
                        uniqueSet.add(value);
                    }
                }
                return Array.from(uniqueSet).slice(0, limit);
            } catch (fallbackError) {
                console.error(`Fallback also failed:`, fallbackError);
                return [];
            }
        }
    }

    /**
     * Get aggregate values (COUNT, SUM) for numeric fields
     * This calculates totals across the ENTIRE filtered dataset
     * @param {string} doctype
     * @param {Array<string>} numericFields - Fields to sum
     * @param {Array} filters - Filters to apply
     * @returns {Promise<{count: number, sums: object}>}
     */
    async getAggregates(doctype, numericFields = [], filters = []) {
        try {
            // Build aggregate fields: count + sum for each numeric field
            const aggFields = ['count(name) as total'];
            for (const field of numericFields) {
                aggFields.push(`sum(${field}) as sum_${field}`);
            }

            const response = await apiClient.post('frappe.client.get_list', {
                doctype,
                fields: aggFields,
                filters,
                limit_page_length: 1,
            });
            const rows = response?.message || [];
            const row = rows[0] || {};

            const count = row.total ?? 0;
            const sums = {};
            for (const field of numericFields) {
                sums[field] = parseFloat(row[`sum_${field}`]) || 0;
            }

            return { count, sums };
        } catch (error) {
            console.error(`Error fetching aggregates for ${doctype}:`, error);
            return { count: 0, sums: {} };
        }
    }

    /**
     * Bulk create documents
     * @param {string} doctype
     * @param {Array<object>} items
     * @returns {Promise<Array>}
     */
    async bulkCreate(doctype, items) {
        const results = [];
        const errors = [];

        const settled = await processInBatches(items, (item) => this.create(doctype, item));

        for (let i = 0; i < settled.length; i++) {
            const outcome = settled[i];
            if (outcome.status === 'fulfilled') {
                results.push({ success: true, data: outcome.value });
            } else {
                errors.push({ success: false, error: outcome.reason?.message || String(outcome.reason), item: items[i] });
            }
        }

        return { results, errors, total: items.length, successful: results.length };
    }

    /**
     * Bulk update documents
     * @param {string} doctype
     * @param {Array<{name: string, data: object}>} updates
     * @returns {Promise<object>}
     */
    async bulkUpdate(doctype, updates) {
        const results = [];
        const errors = [];

        const settled = await processInBatches(updates, ({ name, data }) => this.update(doctype, name, data));

        for (let i = 0; i < settled.length; i++) {
            const outcome = settled[i];
            if (outcome.status === 'fulfilled') {
                results.push({ success: true, name: updates[i].name, data: outcome.value });
            } else {
                errors.push({ success: false, name: updates[i].name, error: outcome.reason?.message || String(outcome.reason) });
            }
        }

        return { results, errors, total: updates.length, successful: results.length };
    }

    /**
     * Bulk delete documents
     * @param {string} doctype
     * @param {Array<string>} names
     * @returns {Promise<object>}
     */
    async bulkDelete(doctype, names) {
        const results = [];
        const errors = [];

        const settled = await processInBatches(names, (name) => this.delete(doctype, name));

        for (let i = 0; i < settled.length; i++) {
            const outcome = settled[i];
            if (outcome.status === 'fulfilled') {
                results.push({ success: true, name: names[i] });
            } else {
                errors.push({ success: false, name: names[i], error: outcome.reason?.message || String(outcome.reason) });
            }
        }

        return { results, errors, total: names.length, successful: results.length };
    }

    // =========================================================================
    // Validation Methods (Override in subclasses for business rules)
    // =========================================================================

    /**
     * Validate data before creating
     * Override in domain-specific services
     */
    validateBeforeCreate(doctype, data) {
        // Base validation - check required fields exist
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid document data');
        }
    }

    /**
     * Validate data before updating
     * Override in domain-specific services
     */
    validateBeforeUpdate(doctype, name, data) {
        if (!name) {
            throw new Error('Document name is required for update');
        }
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid update data');
        }
    }

    /**
     * Validate before deleting
     * Override in domain-specific services
     */
    async validateBeforeDelete(doctype, name) {
        if (!name) {
            throw new Error('Document name is required for delete');
        }
        // Subclasses can add checks like:
        // - Check if document is linked to other records
        // - Check if document is in a state that allows deletion
    }

    // =========================================================================
    // Prefetch helpers (warm React Query cache via direct fetch)
    // =========================================================================

    async prefetch(doctype, name) {
        await this.get(doctype, name);
    }

    async prefetchList(doctype, names) {
        return Promise.all(names.map(name => this.prefetch(doctype, name)));
    }
}

// Export singleton
export const DocumentService = new DocumentServiceClass();
export default DocumentService;
