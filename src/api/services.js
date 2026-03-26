/**
 * API Services Layer
 *
 * Centralized API calls with standardized error handling.
 * All functions throw ApiError on failure for consistent error handling.
 */

import { db, call } from './frappeClient';
import { handleApiError } from '../utils/errorHandler';
import { ApiError } from '../utils/errors';

// ============================================================================
// DOCUMENT SERVICES
// ============================================================================

/**
 * Get a list of documents
 * @param {string} doctype
 * @param {object} params - { fields, filters, limit, order_by, start }
 * @returns {Promise<Array>}
 * @throws {ApiError}
 */
export const getList = async (doctype, params = {}) => {
    try {
        return await db.getDocList(doctype, params);
    } catch (error) {
        throw handleApiError(error, { operation: 'getList', doctype, params });
    }
};

/**
 * Get a single document by name
 * @param {string} doctype
 * @param {string} name
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const getDoc = async (doctype, name) => {
    try {
        return await db.getDoc(doctype, name);
    } catch (error) {
        throw handleApiError(error, { operation: 'getDoc', doctype, name });
    }
};

/**
 * Create a new document
 * @param {string} doctype
 * @param {object} data
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const createDoc = async (doctype, data) => {
    try {
        return await db.createDoc(doctype, data);
    } catch (error) {
        throw handleApiError(error, { operation: 'createDoc', doctype });
    }
};

/**
 * Update an existing document
 * @param {string} doctype
 * @param {string} name
 * @param {object} data
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const updateDoc = async (doctype, name, data) => {
    try {
        return await db.updateDoc(doctype, name, data);
    } catch (error) {
        throw handleApiError(error, { operation: 'updateDoc', doctype, name });
    }
};

/**
 * Delete a document
 * @param {string} doctype
 * @param {string} name
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const deleteDoc = async (doctype, name) => {
    try {
        return await call.post('frappe.client.delete', { doctype, name });
    } catch (error) {
        throw handleApiError(error, { operation: 'deleteDoc', doctype, name });
    }
};

// ============================================================================
// METADATA SERVICES
// ============================================================================

/**
 * Get metadata for a doctype
 * @param {string} doctype
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const getDoctypeMeta = async (doctype) => {
    try {
        return await call.get('frappe.desk.form.load.getdoctype', { doctype });
    } catch (error) {
        throw handleApiError(error, { operation: 'getDoctypeMeta', doctype });
    }
};

/**
 * Get count of documents
 * @param {string} doctype
 * @param {object} filters
 * @returns {Promise<number>}
 */
export const getCount = async (doctype, filters = {}) => {
    try {
        const result = await call.get('frappe.client.get_count', {
            doctype: doctype,
            filters: filters
        });
        return (result && result.message !== undefined) ? result.message : result;
    } catch (error) {
        // For count, we return 0 on error but still log it
        const apiError = handleApiError(error, { operation: 'getCount', doctype, filters });
        console.warn(`Count failed for ${doctype}, returning 0:`, apiError.message);
        return 0;
    }
};

// ============================================================================
// WORKFLOW SERVICES
// ============================================================================

/**
 * Get available workflow transitions
 * @param {string} doctype
 * @param {string} name
 * @returns {Promise<Array>}
 */
export const getWorkflowTransitions = async (doctype, name) => {
    try {
        const result = await call.post('frappe.model.workflow.get_transitions', {
            doc: { doctype, name }
        });
        return result.message || [];
    } catch (error) {
        // Workflow might not exist, return empty array but log
        const apiError = handleApiError(error, { operation: 'getWorkflowTransitions', doctype, name });
        if (apiError.httpStatus === 404 || apiError.httpStatus === 417) {
            return [];
        }
        // For other errors, still return empty but warn
        console.warn(`Workflow transitions failed for ${doctype}/${name}:`, apiError.message);
        return [];
    }
};

/**
 * Apply a workflow transition
 * @param {string} doctype
 * @param {string} name
 * @param {string} action
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const applyWorkflowTransition = async (doctype, name, action) => {
    try {
        return await call.post('frappe.model.workflow.apply_workflow', {
            doc: { doctype, name },
            action: action
        });
    } catch (error) {
        throw handleApiError(error, { operation: 'applyWorkflowTransition', doctype, name, action });
    }
};

/**
 * Submit a document
 * @param {string} doctype
 * @param {string} name
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const submitDoc = async (doctype, name) => {
    try {
        return await call.post('frappe.client.submit', { doctype, name });
    } catch (error) {
        throw handleApiError(error, { operation: 'submitDoc', doctype, name });
    }
};

/**
 * Cancel a document
 * @param {string} doctype
 * @param {string} name
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const cancelDoc = async (doctype, name) => {
    try {
        return await call.post('frappe.client.cancel', { doctype, name });
    } catch (error) {
        throw handleApiError(error, { operation: 'cancelDoc', doctype, name });
    }
};

// ============================================================================
// SEARCH SERVICES
// ============================================================================

/**
 * Search for link fields
 * @param {string} doctype
 * @param {string} text
 * @param {number} pageLength
 * @returns {Promise<Array>}
 */
export const searchLink = async (doctype, text, pageLength = 10) => {
    try {
        const result = await call.get('frappe.desk.search.search_link', {
            txt: text,
            doctype: doctype,
            page_length: pageLength
        });
        return result.results || result.message || [];
    } catch (error) {
        // Search failures should not crash the app
        const apiError = handleApiError(error, { operation: 'searchLink', doctype, text });
        console.warn(`Search failed for ${doctype}:`, apiError.message);
        return [];
    }
};

/**
 * Call a custom backend method
 * @param {string} method - 'dotted.path.to.method'
 * @param {object} args
 * @returns {Promise<any>}
 * @throws {ApiError}
 */
export const callMethod = async (method, args = {}) => {
    try {
        return await call.post(method, args);
    } catch (error) {
        throw handleApiError(error, { operation: 'callMethod', method });
    }
};

// ============================================================================
// FILE SERVICES
// ============================================================================

/**
 * Upload a file
 * @param {File} file
 * @param {string} doctype
 * @param {string} name
 * @param {string} fieldname
 * @returns {Promise<Object>}
 * @throws {ApiError}
 */
export const uploadFile = async (file, doctype, name, fieldname) => {
    try {
        const formData = new FormData();
        formData.append('file', file, file.name);
        formData.append('is_private', '0'); // Public for avatar images
        formData.append('doctype', doctype);
        formData.append('docname', name);
        formData.append('fieldname', fieldname);

        // Use the base URL from environment if available
        const baseUrl = import.meta.env.VITE_FRAPPE_URL || '';

        // Try the standard Frappe upload endpoint
        const uploadUrl = `${baseUrl}/api/method/frappe.handler.upload_file`;

        const response = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload error response:', response.status, errorText);
            throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();

        // Frappe returns { message: { file_url: "/files/...", name: "..." } }
        const fileInfo = data.message;
        const fileUrl = fileInfo?.file_url || fileInfo;

        if (!fileUrl) {
            throw new Error('No file URL returned from server');
        }

        // If file_url is relative, prepend base URL for display
        if (fileUrl.startsWith('/') && baseUrl) {
            return `${baseUrl}${fileUrl}`;
        }
        return fileUrl;

    } catch (error) {
        console.error('Upload file error:', error);
        throw handleApiError(error, { operation: 'uploadFile', doctype, name, fieldname });
    }
};

// ============================================================================
// PERMISSION SERVICES
// ============================================================================

/**
 * Check if user has read access to a Doctype
 * @param {string} doctype
 * @returns {Promise<boolean>}
 */
export const checkDoctypeAccess = async (doctype) => {
    try {
        const response = await fetch(`/api/resource/${encodeURIComponent(doctype)}?limit=1`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        });

        if (response.ok) return true;
        if (response.status === 403) return false;
        return false;

    } catch (error) {
        // Network errors should not grant access
        handleApiError(error, { operation: 'checkDoctypeAccess', doctype });
        return false;
    }
};

/**
 * Check if user has access to a Report
 * @param {string} reportName
 * @returns {Promise<boolean>}
 */
export const checkReportAccess = async (reportName) => {
    try {
        const result = await call.get('frappe.client.get_value', {
            doctype: 'Report',
            filters: { name: reportName },
            fieldname: ['name', 'disabled']
        });

        if (!result?.message?.name) return false;
        if (result.message.disabled) return false;

        // Report exists and is not disabled - user has access
        return true;
    } catch {
        // If error, assume no access
        return false;
    }
};

/**
 * Check if user has access to a Page
 * @param {string} pageName
 * @returns {Promise<boolean>}
 */
export const checkPageAccess = async (pageName) => {
    try {
        const result = await call.get('frappe.client.get_value', {
            doctype: 'Page',
            filters: { name: pageName },
            fieldname: ['name', 'disabled']
        });

        if (!result?.message?.name) return false;
        if (result.message.disabled) return false;

        return true;
    } catch {
        return false;
    }
};

/**
 * Get user permissions for a doctype
 * @param {string} doctype
 * @returns {Promise<Object>} { read, write, create, delete, submit, cancel }
 */
export const getDoctypePermissions = async (doctype) => {
    try {
        const result = await call.get('frappe.client.get_permissions', {
            doctype: doctype
        });

        const perms = result?.message || {};
        return {
            read: !!perms.read,
            write: !!perms.write,
            create: !!perms.create,
            delete: !!perms.delete,
            submit: !!perms.submit,
            cancel: !!perms.cancel,
            report: !!perms.report,
            export: !!perms.export,
            import: !!perms.import,
        };
    } catch (error) {
        const apiError = handleApiError(error, { operation: 'getDoctypePermissions', doctype });

        // Permission check failed, return no permissions
        if (apiError.isPermissionError()) {
            return {
                read: false, write: false, create: false, delete: false,
                submit: false, cancel: false, report: false, export: false, import: false,
            };
        }

        throw apiError;
    }
};

// ============================================================================
// ORGANIZED EXPORTS
// ============================================================================

export const DocService = {
    getList,
    getDoc,
    create: createDoc,
    update: updateDoc,
    delete: deleteDoc,
    submit: submitDoc,
    cancel: cancelDoc,
};

export const MetaService = {
    getDoctypeMeta,
    getCount,
};

export const WorkflowService = {
    getTransitions: getWorkflowTransitions,
    applyTransition: applyWorkflowTransition,
};

export const SearchService = {
    searchLink,
};

export const FileService = {
    upload: uploadFile,
};

export const PermissionService = {
    checkAccess: checkDoctypeAccess,
    checkReportAccess,
    checkPageAccess,
    getPermissions: getDoctypePermissions,
};
