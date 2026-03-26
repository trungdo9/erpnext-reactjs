/**
 * Metadata Service
 *
 * Handles DocType metadata, field definitions, and schema information.
 * Provides caching for frequently accessed metadata.
 */

import { apiClient, cacheManager, GatewayConfig } from '../gateway';
import { CacheKeys } from '../gateway/cache';

/**
 * Field type mappings for UI rendering
 */
const FIELD_TYPE_MAP = {
    // Text fields
    'Data': 'text',
    'Text': 'textarea',
    'Small Text': 'textarea',
    'Long Text': 'textarea',
    'Text Editor': 'richtext',
    'Code': 'code',
    'Password': 'password',

    // Number fields
    'Int': 'integer',
    'Float': 'decimal',
    'Currency': 'currency',
    'Percent': 'percent',

    // Date/Time fields
    'Date': 'date',
    'Datetime': 'datetime',
    'Time': 'time',

    // Selection fields
    'Select': 'select',
    'Link': 'link',
    'Dynamic Link': 'dynamiclink',

    // Boolean
    'Check': 'checkbox',

    // File
    'Attach': 'file',
    'Attach Image': 'image',

    // Special
    'Table': 'table',
    'Table MultiSelect': 'multiselect',
    'HTML': 'html',
    'Read Only': 'readonly',
    'Signature': 'signature',
    'Color': 'color',
    'Rating': 'rating',
    'Geolocation': 'geolocation',
    'Duration': 'duration',
    'Phone': 'phone',

    // Layout (non-data)
    'Section Break': 'section',
    'Column Break': 'column',
    'Tab Break': 'tab',
};

/**
 * Metadata Service class
 */
class MetadataServiceClass {
    /**
     * Get metadata for a DocType
     * @param {string} doctype
     * @param {object} options
     * @returns {Promise<object>}
     */
    async getMeta(doctype, options = {}) {
        const { useCache = true } = options;
        const cacheKey = CacheKeys.meta(doctype);

        // Check cache
        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached) return cached;
        }

        // Fetch metadata
        const result = await apiClient.get('frappe.desk.form.load.getdoctype', { doctype });

        // Transform metadata
        const meta = this.transformMeta(result?.docs?.[0] || result?.message?.docs?.[0]);

        // Cache the result
        if (useCache && meta) {
            cacheManager.set(cacheKey, meta, GatewayConfig.cacheTTL.metadata);
        }

        return meta;
    }

    /**
     * Get metadata for multiple DocTypes
     * @param {Array<string>} doctypes
     * @returns {Promise<object>}
     */
    async getMultipleMeta(doctypes) {
        const results = {};
        const promises = doctypes.map(async (doctype) => {
            results[doctype] = await this.getMeta(doctype);
        });
        await Promise.all(promises);
        return results;
    }

    /**
     * Get field definitions for a DocType
     * @param {string} doctype
     * @returns {Promise<Array>}
     */
    async getFields(doctype) {
        const meta = await this.getMeta(doctype);
        return meta?.fields || [];
    }

    /**
     * Get editable fields (excluding layout fields)
     * @param {string} doctype
     * @returns {Promise<Array>}
     */
    async getEditableFields(doctype) {
        const fields = await this.getFields(doctype);
        return fields.filter(f => !this.isLayoutField(f));
    }

    /**
     * Get required fields
     * @param {string} doctype
     * @returns {Promise<Array>}
     */
    async getRequiredFields(doctype) {
        const fields = await this.getFields(doctype);
        return fields.filter(f => f.reqd && !this.isLayoutField(f));
    }

    /**
     * Get child table metadata
     * @param {string} doctype
     * @returns {Promise<object>}
     */
    async getChildTableMeta(doctype) {
        const fields = await this.getFields(doctype);
        const tableFields = fields.filter(f => f.fieldtype === 'Table');

        const childMetas = {};
        for (const field of tableFields) {
            if (field.options) {
                childMetas[field.fieldname] = await this.getMeta(field.options);
            }
        }

        return childMetas;
    }

    /**
     * Check if DocType is submittable
     * @param {string} doctype
     * @returns {Promise<boolean>}
     */
    async isSubmittable(doctype) {
        const meta = await this.getMeta(doctype);
        return !!meta?.is_submittable;
    }

    /**
     * Check if DocType has workflow
     * @param {string} doctype
     * @returns {Promise<boolean>}
     */
    async hasWorkflow(doctype) {
        const meta = await this.getMeta(doctype);
        return !!meta?.workflow;
    }

    /**
     * Get naming rule for DocType
     * @param {string} doctype
     * @returns {Promise<string>}
     */
    async getNamingRule(doctype) {
        const meta = await this.getMeta(doctype);
        return meta?.autoname || 'hash';
    }

    /**
     * Transform raw metadata to clean format
     */
    transformMeta(rawMeta) {
        if (!rawMeta) return null;

        return {
            name: rawMeta.name,
            doctype: rawMeta.name,
            module: rawMeta.module,
            title_field: rawMeta.title_field,
            image_field: rawMeta.image_field,
            search_fields: rawMeta.search_fields?.split(',').map(s => s.trim()) || [],
            sort_field: rawMeta.sort_field || 'modified',
            sort_order: rawMeta.sort_order || 'desc',

            // Flags
            is_submittable: rawMeta.is_submittable,
            is_single: rawMeta.issingle,
            is_tree: rawMeta.is_tree,
            is_child_table: rawMeta.istable,
            quick_entry: rawMeta.quick_entry,
            track_changes: rawMeta.track_changes,
            allow_rename: rawMeta.allow_rename,

            // Workflow
            workflow: rawMeta.workflow_state_field ? true : false,
            workflow_state_field: rawMeta.workflow_state_field,

            // Naming
            autoname: rawMeta.autoname,

            // Permissions
            permissions: rawMeta.__permlevelwise_fields || [],

            // Fields
            fields: (rawMeta.fields || []).map(f => this.transformField(f)),
        };
    }

    /**
     * Transform field definition
     */
    transformField(field) {
        return {
            name: field.fieldname,
            fieldname: field.fieldname,
            label: field.label || field.fieldname,
            fieldtype: field.fieldtype,
            uiType: FIELD_TYPE_MAP[field.fieldtype] || 'text',

            // Options
            options: field.options,
            default: field.default,

            // Validation
            required: !!field.reqd,
            unique: !!field.unique,
            readOnly: !!field.read_only,
            hidden: !!field.hidden,

            // Link field options
            linkDoctype: field.fieldtype === 'Link' ? field.options : null,
            linkFilters: field.link_filters ? JSON.parse(field.link_filters) : null,

            // Select options
            selectOptions: field.fieldtype === 'Select' && field.options
                ? field.options.split('\n').filter(Boolean)
                : [],

            // Table options
            childDoctype: field.fieldtype === 'Table' ? field.options : null,

            // Layout
            inListView: !!field.in_list_view,
            inStandardFilter: !!field.in_standard_filter,
            inGlobalSearch: !!field.in_global_search,

            // Description
            description: field.description,
            placeholder: field.placeholder,

            // Conditional
            depends_on: field.depends_on,
            mandatory_depends_on: field.mandatory_depends_on,
            read_only_depends_on: field.read_only_depends_on,

            // Precision
            precision: field.precision,
            length: field.length,

            // Display
            columns: field.columns,
            width: field.width,
            print_width: field.print_width,

            // Fetch From - Auto-populate from linked document
            fetch_from: field.fetch_from || null,
            fetch_if_empty: !!field.fetch_if_empty,

            // Raw
            _raw: field,
        };
    }

    /**
     * Get fetch_from mapping for a DocType
     * Returns: { targetField: { linkField, sourceField } }
     * Example: { ngay: { linkField: 'hoat_dong_thu_hoach', sourceField: 'ngay_thuc_hien' } }
     * @param {string} doctype
     * @returns {Promise<object>}
     */
    async getFetchFromMapping(doctype) {
        const fields = await this.getFields(doctype);
        const mapping = {};

        for (const field of fields) {
            if (field.fetch_from) {
                // fetch_from format: "link_field.source_field"
                const parts = field.fetch_from.split('.');
                if (parts.length === 2) {
                    const [linkField, sourceField] = parts;
                    mapping[field.fieldname] = {
                        linkField,
                        sourceField,
                        fetchIfEmpty: field.fetch_if_empty,
                    };
                }
            }
        }

        return mapping;
    }

    /**
     * Get all link fields for a DocType
     * @param {string} doctype
     * @returns {Promise<Array>}
     */
    async getLinkFields(doctype) {
        const fields = await this.getFields(doctype);
        return fields.filter(f => f.fieldtype === 'Link');
    }

    /**
     * Check if field is a layout field (non-data)
     */
    isLayoutField(field) {
        const layoutTypes = ['Section Break', 'Column Break', 'Tab Break', 'HTML'];
        return layoutTypes.includes(field.fieldtype);
    }

    /**
     * Check if user has read access to a Doctype
     * Uses a lightweight probe (fetch 1 record) to determine access.
     * @param {string} doctype
     * @returns {Promise<boolean>}
     */
    async checkDoctypeAccess(doctype) {
        try {
            const response = await fetch(
                `/api/resource/${encodeURIComponent(doctype)}?limit_page_length=0`,
                { method: 'GET', credentials: 'include' }
            );
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get user permissions for a doctype
     * @param {string} doctype
     * @returns {Promise<Object>} { read, write, create, delete, submit, cancel, report, export, import }
     */
    async getDoctypePermissions(doctype) {
        const cacheKey = `perms:${doctype}`;

        // Check cache
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            const result = await apiClient.get('frappe.client.get_permissions', {
                doctype,
            });

            const perms = result?.message || {};
            const permissions = {
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

            // Cache for 10 minutes
            cacheManager.set(cacheKey, permissions, GatewayConfig.cacheTTL.permissions);

            return permissions;
        } catch {
            // Permission fetch failed - return empty (no console spam)
            return {
                read: false, write: false, create: false, delete: false,
                submit: false, cancel: false, report: false, export: false, import: false,
            };
        }
    }

    /**
     * Invalidate metadata cache
     */
    invalidate(doctype) {
        if (doctype) {
            cacheManager.delete(CacheKeys.meta(doctype));
        } else {
            cacheManager.invalidate('meta:');
        }
    }
}

// Export singleton
export const MetadataService = new MetadataServiceClass();
export default MetadataService;
