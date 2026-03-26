/**
 * Workflow Service
 *
 * Handles document workflows, state transitions, and approvals.
 */

import { apiClient, cacheManager } from '../gateway';
import { CacheKeys } from '../gateway/cache';

/**
 * Workflow Service class
 */
class WorkflowServiceClass {
    /**
     * Get available workflow transitions for a document
     * @param {string} doctype
     * @param {string} name
     * @returns {Promise<Array>}
     */
    async getTransitions(doctype, name) {
        const cacheKey = CacheKeys.workflow(doctype, name);
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            const result = await apiClient.post('frappe.model.workflow.get_transitions', {
                doc: { doctype, name },
            });

            const transitions = (result?.message || []).map(t => ({
                action: t.action,
                nextState: t.next_state,
                allowed: t.allowed,
                doc_status: t.doc_status,
            }));

            cacheManager.set(cacheKey, transitions, 30000); // 30 seconds
            return transitions;
        } catch (error) {
            // Workflow might not exist for this doctype
            if (error.httpStatus === 404 || error.httpStatus === 417) {
                return [];
            }
            console.warn(`Failed to get workflow transitions: ${error.message}`);
            return [];
        }
    }

    /**
     * Apply a workflow transition
     * @param {string} doctype
     * @param {string} name
     * @param {string} action
     * @returns {Promise<object>}
     */
    async applyTransition(doctype, name, action) {
        const result = await apiClient.post('frappe.model.workflow.apply_workflow', {
            doc: { doctype, name },
            action,
        });

        // Invalidate caches
        cacheManager.delete(CacheKeys.workflow(doctype, name));
        cacheManager.delete(CacheKeys.doc(doctype, name));

        return result?.message;
    }

    /**
     * Get current workflow state
     * @param {string} doctype
     * @param {string} name
     * @returns {Promise<string|null>}
     */
    async getCurrentState(doctype, name) {
        try {
            const doc = await apiClient.getDoc(doctype, name);
            return doc?.workflow_state || null;
        } catch {
            return null;
        }
    }

    /**
     * Check if transition is allowed
     * @param {string} doctype
     * @param {string} name
     * @param {string} action
     * @returns {Promise<boolean>}
     */
    async canTransition(doctype, name, action) {
        const transitions = await this.getTransitions(doctype, name);
        return transitions.some(t => t.action === action && t.allowed);
    }

    /**
     * Submit a document
     * @param {string} doctype
     * @param {string} name
     * @returns {Promise<object>}
     */
    async submit(doctype, name) {
        const result = await apiClient.post('frappe.client.submit', {
            doctype,
            name,
        });

        // Invalidate caches
        cacheManager.delete(CacheKeys.doc(doctype, name));
        cacheManager.invalidate(`list:${doctype}`);

        return result?.message;
    }

    /**
     * Cancel a document
     * @param {string} doctype
     * @param {string} name
     * @returns {Promise<object>}
     */
    async cancel(doctype, name) {
        const result = await apiClient.post('frappe.client.cancel', {
            doctype,
            name,
        });

        // Invalidate caches
        cacheManager.delete(CacheKeys.doc(doctype, name));
        cacheManager.invalidate(`list:${doctype}`);

        return result?.message;
    }

    /**
     * Amend a cancelled document
     * @param {string} doctype
     * @param {string} name
     * @returns {Promise<object>}
     */
    async amend(doctype, name) {
        const result = await apiClient.post('frappe.client.amend', {
            doctype,
            name,
        });

        return result?.message;
    }

    /**
     * Get workflow history for a document
     * @param {string} doctype
     * @param {string} name
     * @returns {Promise<Array>}
     */
    async getHistory(doctype, name) {
        try {
            const result = await apiClient.get('frappe.desk.form.utils.get_communication_data', {
                doctype,
                name,
            });

            return (result?.message || [])
                .filter(c => c.comment_type === 'Workflow')
                .map(c => ({
                    date: c.creation,
                    fromState: c.from_state,
                    toState: c.to_state,
                    action: c.action,
                    user: c.owner,
                    comment: c.content,
                }));
        } catch {
            return [];
        }
    }

    /**
     * Invalidate workflow cache for a document
     */
    invalidateCache(doctype, name) {
        cacheManager.delete(CacheKeys.workflow(doctype, name));
    }
}

// Export singleton
export const WorkflowService = new WorkflowServiceClass();
export default WorkflowService;
