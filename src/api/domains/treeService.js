/**
 * Tree Service
 *
 * Handles tree-structured DocType operations (is_tree = true)
 * Supports Frappe's Nested Set Model with lft/rgt and parent fields
 */

import { apiClient, cacheManager, GatewayConfig } from '../gateway';
import { CacheKeys } from '../gateway/cache';
import { MetadataService } from './metadataService';

/**
 * Tree Service class
 */
class TreeServiceClass {
    /**
     * Get root nodes of a tree DocType
     * @param {string} doctype
     * @param {object} options - { fields, useCache }
     * @returns {Promise<Array>}
     */
    async getRootNodes(doctype, options = {}) {
        const {
            fields = ['name', 'parent_' + doctype.toLowerCase().replace(/ /g, '_'), 'is_group', 'lft', 'rgt'],
            useCache = true,
        } = options;

        const cacheKey = `tree:${doctype}:roots`;

        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached) return cached;
        }

        // Fetch root nodes (where parent is empty or null)
        const parentField = await this.getParentField(doctype);

        const data = await apiClient.getList(doctype, {
            fields: [...fields, parentField, 'is_group'],
            filters: [[parentField, 'in', ['', null]]],
            order_by: 'name asc',
            limit: 0, // 0 = no limit (get all)
        });

        if (useCache) {
            cacheManager.set(cacheKey, data, GatewayConfig.cacheTTL.list);
        }

        return data;
    }

    /**
     * Get children of a tree node
     * @param {string} doctype
     * @param {string} parent - Parent node name
     * @param {object} options - { fields, useCache }
     * @returns {Promise<Array>}
     */
    async getChildren(doctype, parent, options = {}) {
        const {
            fields = ['name', 'is_group', 'lft', 'rgt'],
            useCache = true,
        } = options;

        const cacheKey = `tree:${doctype}:children:${parent}`;

        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached) return cached;
        }

        const parentField = await this.getParentField(doctype);

        const data = await apiClient.getList(doctype, {
            fields: [...fields, parentField, 'is_group'],
            filters: [[parentField, '=', parent]],
            order_by: 'name asc',
            limit: 0, // 0 = no limit (get all)
        });

        if (useCache) {
            cacheManager.set(cacheKey, data, GatewayConfig.cacheTTL.list);
        }

        return data;
    }

    /**
     * Get all nodes as flat list (for building tree client-side)
     * @param {string} doctype
     * @param {object} options - { fields, filters, useCache }
     * @returns {Promise<Array>}
     */
    async getAllNodes(doctype, options = {}) {
        const {
            fields = ['name', 'is_group', 'lft', 'rgt'],
            filters = null, // Server-side filters (more efficient than client-side)
            useCache = true,
        } = options;

        // Include fields and filters in cache key
        const cacheKey = `tree:${doctype}:all:${JSON.stringify(fields)}:${JSON.stringify(filters)}`;

        if (useCache) {
            const cached = cacheManager.get(cacheKey);
            if (cached) return cached;
        }

        const parentField = await this.getParentField(doctype);

        // Get title field for display
        const titleField = await this.getTitleField(doctype);

        // Build fields list with title field for display
        const fetchFields = [...fields, parentField, 'is_group'];
        if (titleField && !fetchFields.includes(titleField)) {
            fetchFields.push(titleField);
        }

        // Build API request options
        const apiOptions = {
            fields: fetchFields,
            order_by: 'lft asc',
            limit: 0, // 0 = no limit (get all nodes)
        };

        // Add server-side filters if provided
        if (filters) {
            // Convert object filters to array format
            if (!Array.isArray(filters)) {
                apiOptions.filters = Object.entries(filters).map(([field, value]) => [field, '=', value]);
            } else {
                apiOptions.filters = filters;
            }
        }

        const data = await apiClient.getList(doctype, apiOptions);

        // Add _label field for display (title or name)
        const dataWithLabels = data.map(node => ({
            ...node,
            _label: titleField && node[titleField] ? node[titleField] : node.name,
        }));

        if (useCache) {
            cacheManager.set(cacheKey, dataWithLabels, GatewayConfig.cacheTTL.list);
        }

        return dataWithLabels;
    }

    /**
     * Get a single node's label for display
     * @param {string} doctype
     * @param {string} name - Node name/ID
     * @returns {Promise<object>}
     */
    async getNodeLabel(doctype, name) {
        if (!name) return null;

        const cacheKey = `tree:${doctype}:label:${name}`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        const titleField = await this.getTitleField(doctype);
        const fields = ['name'];
        if (titleField) fields.push(titleField);

        try {
            const doc = await apiClient.getDoc(doctype, name);
            const result = {
                name: doc.name,
                _label: titleField && doc[titleField] ? doc[titleField] : doc.name,
            };
            cacheManager.set(cacheKey, result, GatewayConfig.cacheTTL.list);
            return result;
        } catch (err) {
            console.warn(`[TreeService] Failed to get node label for ${doctype}/${name}:`, err);
            return { name, _label: name };
        }
    }

    /**
     * Get the title field for a doctype (used for display)
     * @param {string} doctype
     * @returns {Promise<string|null>}
     */
    async getTitleField(doctype) {
        const cacheKey = `tree:${doctype}:titleField`;
        const cached = cacheManager.get(cacheKey);
        if (cached !== undefined) return cached;

        try {
            const meta = await MetadataService.getMeta(doctype);

            // Method 1: Check title_field from metadata
            if (meta.title_field) {
                cacheManager.set(cacheKey, meta.title_field, 60 * 60 * 1000);
                return meta.title_field;
            }

            // Method 2: Common title field patterns
            const titlePatterns = ['title', 'subject', 'label'];
            for (const pattern of titlePatterns) {
                const field = meta.fields?.find(f => f.fieldname === pattern);
                if (field) {
                    cacheManager.set(cacheKey, pattern, 60 * 60 * 1000);
                    return pattern;
                }
            }

            // Method 3: Field named {doctype}_name (e.g., territory_name, item_group_name)
            const doctypeName = doctype.toLowerCase().replace(/ /g, '_') + '_name';
            const namedField = meta.fields?.find(f => f.fieldname === doctypeName);
            if (namedField) {
                cacheManager.set(cacheKey, doctypeName, 60 * 60 * 1000);
                return doctypeName;
            }

            // No title field found - will use name
            cacheManager.set(cacheKey, null, 60 * 60 * 1000);
            return null;
        } catch (err) {
            console.warn(`[TreeService] Failed to get title field for ${doctype}:`, err);
            return null;
        }
    }

    /**
     * Build tree structure from flat list
     * @param {Array} nodes - Flat list of nodes
     * @param {string} parentField - Name of parent field
     * @returns {Array} - Tree structure
     */
    buildTreeFromList(nodes, parentField) {
        const nodeMap = new Map();
        const roots = [];

        // First pass: create node objects
        nodes.forEach(node => {
            nodeMap.set(node.name, {
                ...node,
                children: [],
                expanded: false,
            });
        });

        // Second pass: build tree structure
        nodes.forEach(node => {
            const treeNode = nodeMap.get(node.name);
            const parentName = node[parentField];

            if (!parentName || parentName === '') {
                roots.push(treeNode);
            } else if (nodeMap.has(parentName)) {
                nodeMap.get(parentName).children.push(treeNode);
            } else {
                // Parent not found, treat as root
                roots.push(treeNode);
            }
        });

        return roots;
    }

    /**
     * Get the parent field name for a tree doctype
     * Fetches from DocType metadata to get the correct parent field
     * @param {string} doctype
     * @returns {Promise<string>}
     */
    async getParentField(doctype) {
        // Try to get from cache first
        const cacheKey = `tree:${doctype}:parentField`;
        const cached = cacheManager.get(cacheKey);
        if (cached) return cached;

        try {
            // Fetch metadata to get the correct parent field
            const meta = await MetadataService.getMeta(doctype);

            // Method 1: Check nsm_parent_field (Frappe's tree parent field setting)
            if (meta.nsm_parent_field) {
                cacheManager.set(cacheKey, meta.nsm_parent_field, 60 * 60 * 1000);
                return meta.nsm_parent_field;
            }

            // Method 2: Find Link field that points to same doctype (self-referential)
            const selfLinkField = meta.fields?.find(f =>
                f.fieldtype === 'Link' &&
                f.options === doctype &&
                f.fieldname.startsWith('parent')
            );
            if (selfLinkField) {
                cacheManager.set(cacheKey, selfLinkField.fieldname, 60 * 60 * 1000);
                return selfLinkField.fieldname;
            }

            // Method 3: Find any Link field starting with 'parent_'
            const parentLinkField = meta.fields?.find(f =>
                f.fieldtype === 'Link' &&
                f.fieldname.startsWith('parent_')
            );
            if (parentLinkField) {
                cacheManager.set(cacheKey, parentLinkField.fieldname, 60 * 60 * 1000);
                return parentLinkField.fieldname;
            }

            // Method 4: Find field named exactly 'parent'
            const parentField = meta.fields?.find(f => f.fieldname === 'parent');
            if (parentField) {
                cacheManager.set(cacheKey, 'parent', 60 * 60 * 1000);
                return 'parent';
            }

        } catch (err) {
            console.warn(`[TreeService] Failed to get parent field for ${doctype}:`, err);
        }

        // Fallback: Use default naming convention
        // e.g., "Item Group" -> "parent_item_group"
        const defaultParentField = 'parent_' + doctype.toLowerCase().replace(/ /g, '_');
        cacheManager.set(cacheKey, defaultParentField, 60 * 60 * 1000);
        return defaultParentField;
    }

    /**
     * Get node path (breadcrumb from root to node)
     * @param {string} doctype
     * @param {string} name
     * @returns {Promise<Array>}
     */
    async getNodePath(doctype, name) {
        const path = [];
        const parentField = await this.getParentField(doctype);
        let currentNode = name;

        while (currentNode) {
            const doc = await apiClient.getDoc(doctype, currentNode);
            if (!doc) break;

            path.unshift({ name: doc.name, label: doc.name });
            currentNode = doc[parentField];
        }

        return path;
    }

    /**
     * Add a child node
     * @param {string} doctype
     * @param {string} parent - Parent node name
     * @param {object} data - Node data
     * @returns {Promise<object>}
     */
    async addChild(doctype, parent, data) {
        const parentField = await this.getParentField(doctype);

        const result = await apiClient.createDoc(doctype, {
            ...data,
            [parentField]: parent,
        });

        // Invalidate tree caches
        this.invalidateTreeCache(doctype);

        return result;
    }

    /**
     * Move node to new parent
     * @param {string} doctype
     * @param {string} name - Node name to move
     * @param {string} newParent - New parent name
     * @returns {Promise<object>}
     */
    async moveNode(doctype, name, newParent) {
        const parentField = await this.getParentField(doctype);

        const result = await apiClient.updateDoc(doctype, name, {
            [parentField]: newParent,
        });

        // Invalidate tree caches
        this.invalidateTreeCache(doctype);

        return result;
    }

    /**
     * Convert node to group or back
     * @param {string} doctype
     * @param {string} name
     * @param {boolean} isGroup
     * @returns {Promise<object>}
     */
    async toggleGroup(doctype, name, isGroup) {
        const result = await apiClient.updateDoc(doctype, name, {
            is_group: isGroup ? 1 : 0,
        });

        this.invalidateTreeCache(doctype);
        return result;
    }

    /**
     * Invalidate all tree caches for a doctype
     * @param {string} doctype
     */
    invalidateTreeCache(doctype) {
        cacheManager.invalidate(`tree:${doctype}`);
        cacheManager.invalidate(`list:${doctype}`);
        cacheManager.invalidate(`link:${doctype}`);
    }

    /**
     * Search nodes in tree
     * @param {string} doctype
     * @param {string} query
     * @returns {Promise<Array>}
     */
    async searchNodes(doctype, query) {
        if (!query || query.length < 2) return [];

        const parentField = await this.getParentField(doctype);

        return apiClient.getList(doctype, {
            fields: ['name', parentField, 'is_group'],
            filters: [['name', 'like', `%${query}%`]],
            limit: 50, // Limit search results
            order_by: 'name asc',
        });
    }
}

// Export singleton
export const TreeService = new TreeServiceClass();
export default TreeService;
