/**
 * TreeLinkField Component
 *
 * A Link field variant that shows a tree selector for tree-type DocTypes.
 * Allows hierarchical navigation and selection.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { TreeService } from '../../../api/domains/treeService';
import { MetadataService } from '../../../api/domains/metadataService';
import { useTranslation } from '../../../hooks/useTranslation';
import { cn } from '../../../lib/utils';
import {
    ChevronDown,
    ChevronRight,
    Folder,
    FolderOpen,
    File,
    X,
    Search,
    Loader2,
    GitBranch,
} from 'lucide-react';

/**
 * TreeSelectNode - Node in the tree selector
 */
function TreeSelectNode({ node, level, parentField, onSelect, selectedValue, expandedNodes, onToggle, maxDepth }) {
    const isExpanded = expandedNodes.has(node.name);
    const isSelected = selectedValue === node.name;
    // If maxDepth is set, don't show children beyond that depth
    const shouldShowChildren = maxDepth === undefined || level < maxDepth;
    const hasChildren = shouldShowChildren && (node.is_group === 1 || (node.children && node.children.length > 0));
    const indent = level * 16;

    return (
        <div>
            <div
                className={cn(
                    "flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors",
                    "hover:bg-muted",
                    isSelected && "bg-primary/10 text-primary font-medium"
                )}
                style={{ paddingLeft: `${indent + 8}px` }}
                onClick={() => onSelect(node)}
            >
                {/* Toggle */}
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onToggle(node.name);
                    }}
                    className={cn(
                        "p-0.5 rounded hover:bg-accent shrink-0",
                        !hasChildren && "invisible"
                    )}
                >
                    {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                    )}
                </button>

                {/* Icon */}
                {hasChildren ? (
                    isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : (
                        <Folder className="w-4 h-4 text-emerald-500 shrink-0" />
                    )
                ) : (
                    <File className="w-4 h-4 text-muted-foreground shrink-0" />
                )}

                {/* Label - show _label (title) or fallback to name */}
                <span className="text-sm truncate">{node._label || node.name}</span>
            </div>

            {/* Children */}
            {isExpanded && shouldShowChildren && node.children && node.children.length > 0 && (
                <div>
                    {node.children.map(child => (
                        <TreeSelectNode
                            key={child.name}
                            node={child}
                            level={level + 1}
                            parentField={parentField}
                            onSelect={onSelect}
                            selectedValue={selectedValue}
                            expandedNodes={expandedNodes}
                            onToggle={onToggle}
                            maxDepth={maxDepth}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

TreeSelectNode.propTypes = {
    node: PropTypes.object.isRequired,
    level: PropTypes.number.isRequired,
    parentField: PropTypes.string.isRequired,
    onSelect: PropTypes.func.isRequired,
    selectedValue: PropTypes.string,
    expandedNodes: PropTypes.instanceOf(Set).isRequired,
    onToggle: PropTypes.func.isRequired,
    maxDepth: PropTypes.number,
};

/**
 * TreeLinkField Component
 */
export function TreeLinkField({ field, value, onChange, disabled, error, maxDepth: propMaxDepth }) {
    const { t } = useTranslation();
    const wrapperRef = useRef(null);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

    const linkedDoctype = field.options;

    // Parse link_filters from field definition (Frappe metadata)
    // Can be: {"field": "value"} or [["field", "=", "value"]]
    // Also auto-detect location type from field label for Vi Tri doctype
    const linkFilters = useMemo(() => {
        let filters = null;

        // First, try to parse from field.link_filters
        if (field.link_filters) {
            try {
                // Parse if string
                const parsed = typeof field.link_filters === 'string'
                    ? JSON.parse(field.link_filters)
                    : field.link_filters;

                // Convert array format to object format
                // [["field", "=", "value"]] -> {"field": "value"}
                if (Array.isArray(parsed)) {
                    const obj = {};
                    parsed.forEach(f => {
                        if (Array.isArray(f) && f.length >= 3 && f[1] === '=') {
                            obj[f[0]] = f[2];
                        }
                    });
                    filters = Object.keys(obj).length > 0 ? obj : null;
                } else {
                    filters = parsed;
                }
            } catch (err) {
                console.warn('[TreeLinkField] Failed to parse link_filters:', err);
            }
        }

        // Auto-detect location type from field label for Vi Tri doctype
        // Pattern: "Vị trí (Type)" or "Vi Tri (Type)" -> extract Type
        if (!filters && linkedDoctype === 'Vi Tri' && field.label) {
            const labelMatch = field.label.match(/[Vv][iị]\s*[Tt]r[íi]\s*\(([^)]+)\)/);
            if (labelMatch) {
                const locationType = labelMatch[1].trim();
                // Valid location types: Công ty, Xí nghiệp, Cụm, Nông trường, Lô, Thửa
                const validTypes = ['Công ty', 'Xí nghiệp', 'Cụm', 'Nông trường', 'Lô', 'Thửa'];
                if (validTypes.includes(locationType)) {
                    filters = { cap: locationType };
                }
            }
        }

        return filters;
    }, [field.link_filters, field.label, linkedDoctype]);

    // Determine max depth from prop, field description, or field label
    // Field description can contain "max_depth:N" to limit depth
    const maxDepth = useMemo(() => {
        if (propMaxDepth !== undefined) return propMaxDepth;

        // Check field description for max_depth setting
        const descMatch = field.description?.match(/max_depth[:\s]*(\d+)/i);
        if (descMatch) return parseInt(descMatch[1], 10);

        return undefined; // No limit
    }, [propMaxDepth, field.description]);

    // Check if should show flat list instead of tree
    // - When location type filter is applied (e.g., "Thửa" nodes have no meaningful parent-child)
    // - When field description specifies flat list
    const showFlatList = useMemo(() => {
        // Check field description for "leaves_only" or "flat" to show only leaves
        if (field.description?.match(/leaves_only|flat_list|only_leaves/i)) return true;

        // Check field description for "show_tree" or "show_all" to show full tree
        if (field.description?.match(/show_tree|show_all|full_tree/i)) return false;

        // If filtering by location type (cap), show flat list
        // because filtered nodes may not have valid parent-child relationships
        if (linkFilters?.cap) return true;

        // Default: show full tree structure for better navigation
        return false;
    }, [field.description, linkFilters]);

    // Fetch metadata to get parent field
    const { data: meta } = useQuery({
        queryKey: ['doctype-meta', linkedDoctype],
        queryFn: () => MetadataService.getDocTypeMeta(linkedDoctype),
        staleTime: 5 * 60 * 1000,
        enabled: !!linkedDoctype,
    });

    // Calculate parent field from metadata
    const parentField = useMemo(() => {
        if (!meta) return `parent_${linkedDoctype?.toLowerCase().replace(/ /g, '_')}`;

        // Method 1: Check nsm_parent_field (Frappe's tree parent field setting)
        if (meta.nsm_parent_field) {
            return meta.nsm_parent_field;
        }

        // Method 2: Find Link field that points to same doctype (self-referential)
        const selfLinkField = meta.fields?.find(f =>
            f.fieldtype === 'Link' &&
            f.options === linkedDoctype &&
            f.fieldname.startsWith('parent')
        );
        if (selfLinkField) {
            return selfLinkField.fieldname;
        }

        // Method 3: Find any Link field starting with 'parent_'
        const parentLinkField = meta.fields?.find(f =>
            f.fieldtype === 'Link' &&
            f.fieldname.startsWith('parent_')
        );
        if (parentLinkField) {
            return parentLinkField.fieldname;
        }

        // Method 4: Find field named exactly 'parent'
        const parentFieldDef = meta.fields?.find(f => f.fieldname === 'parent');
        if (parentFieldDef) {
            return 'parent';
        }

        // Fallback: Use default naming convention
        return `parent_${linkedDoctype.toLowerCase().replace(/ /g, '_')}`;
    }, [meta, linkedDoctype]);

    // Fetch all nodes (for dropdown)
    // Pass filters to server for efficient filtering
    const { data: allNodes, isLoading } = useQuery({
        queryKey: ['tree-nodes', linkedDoctype, JSON.stringify(linkFilters), 'debug-v2'], // Force fresh
        queryFn: async () => {
            // Include filter fields in fetch for debugging
            const fetchFields = ['name', 'is_group', 'lft', 'rgt'];
            if (linkFilters) {
                Object.keys(linkFilters).forEach(f => {
                    if (!fetchFields.includes(f)) fetchFields.push(f);
                });
            }
            const result = await TreeService.getAllNodes(linkedDoctype, {
                fields: fetchFields,
                filters: linkFilters, // Server-side filtering
                useCache: false, // Disable cache temporarily for debugging
            });
            return result;
        },
        staleTime: 60 * 1000,
        enabled: !!linkedDoctype && isOpen,
    });

    // Fetch selected value's label (for display when dropdown is closed)
    const { data: selectedNodeData } = useQuery({
        queryKey: ['tree-node-label', linkedDoctype, value],
        queryFn: () => TreeService.getNodeLabel(linkedDoctype, value),
        staleTime: 5 * 60 * 1000,
        enabled: !!linkedDoctype && !!value,
    });

    // Compute display value (label or ID)
    const displayValue = useMemo(() => {
        if (!value) return null;
        // First try from allNodes (when dropdown is/was open)
        if (allNodes) {
            const node = allNodes.find(n => n.name === value);
            if (node) return node._label || node.name;
        }
        // Then try from separate query
        if (selectedNodeData?._label) return selectedNodeData._label;
        // Fallback to value (ID)
        return value;
    }, [value, allNodes, selectedNodeData]);

    // Build tree structure or flat list
    const treeData = useMemo(() => {
        if (!allNodes || !parentField) return [];

        // If showing flat list (filtered by location type or field description)
        if (showFlatList) {
            // When linkFilters is applied (e.g., cap filter), show ALL matching nodes
            // Otherwise (leaves_only mode), filter to only non-group nodes
            let nodesToShow = allNodes;

            if (!linkFilters) {
                // Original leaves_only behavior - filter out groups
                nodesToShow = allNodes.filter(node => {
                    const isGroup = node.is_group;
                    const isGroupTruthy = isGroup === 1 || isGroup === '1' || isGroup === true || isGroup === 'true';
                    return !isGroupTruthy;
                });
            }

            return nodesToShow
                .sort((a, b) => (a._label || a.name).localeCompare(b._label || b.name))
                .map(node => ({ ...node, children: [] }));
        }

        return TreeService.buildTreeFromList(allNodes, parentField);
    }, [allNodes, parentField, showFlatList, linkFilters]);

    // Filter tree based on search (search both name and label)
    const filteredTree = useMemo(() => {
        if (!searchQuery.trim()) return treeData;

        const query = searchQuery.toLowerCase();

        const filterTree = (nodes) => {
            return nodes.reduce((acc, node) => {
                const label = node._label || node.name;
                const nameMatch = node.name.toLowerCase().includes(query) || label.toLowerCase().includes(query);
                const filteredChildren = node.children ? filterTree(node.children) : [];

                if (nameMatch || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren,
                    });
                }

                return acc;
            }, []);
        };

        return filterTree(treeData);
    }, [treeData, searchQuery]);

    // Auto-expand matching nodes when searching
    useEffect(() => {
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            const expandAll = new Set();
            const collectParents = (nodes, parents = []) => {
                nodes.forEach(node => {
                    const label = node._label || node.name;
                    if (node.name.toLowerCase().includes(query) || label.toLowerCase().includes(query)) {
                        parents.forEach(p => expandAll.add(p));
                    }
                    if (node.children) {
                        collectParents(node.children, [...parents, node.name]);
                    }
                });
            };
            collectParents(filteredTree);
            setExpandedNodes(expandAll);
        }
    }, [searchQuery, filteredTree]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                // Check if click is on dropdown portal
                const dropdown = document.getElementById('tree-link-dropdown');
                if (dropdown && dropdown.contains(e.target)) return;
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Calculate dropdown position
    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const dropdownHeight = 350;

            // Check if there's enough space below
            const spaceBelow = viewportHeight - rect.bottom;
            const openUpward = spaceBelow < dropdownHeight && rect.top > dropdownHeight;

            setDropdownPosition({
                top: openUpward ? rect.top - dropdownHeight : rect.bottom + 4,
                left: rect.left,
                width: rect.width,
            });
        }
    }, [isOpen]);

    // Handle toggle expand
    const handleToggle = useCallback((name) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(name)) {
                next.delete(name);
            } else {
                next.add(name);
            }
            return next;
        });
    }, []);

    // Handle select
    const handleSelect = useCallback((node) => {
        onChange(field.fieldname, node.name);
        setIsOpen(false);
        setSearchQuery('');
    }, [field.fieldname, onChange]);

    // Handle clear
    const handleClear = useCallback((e) => {
        e.stopPropagation();
        onChange(field.fieldname, null);
    }, [field.fieldname, onChange]);

    // Handle open
    const handleOpen = useCallback(() => {
        if (disabled || field.read_only === 1) return;
        setIsOpen(true);

        // Expand to show current value
        if (value && allNodes) {
            const expandParents = new Set();
            let current = value;

            while (current) {
                const node = allNodes.find(n => n.name === current);
                if (node && node[parentField]) {
                    expandParents.add(node[parentField]);
                    current = node[parentField];
                } else {
                    break;
                }
            }

            setExpandedNodes(expandParents);
        }
    }, [disabled, field.read_only, value, allNodes, parentField]);

    return (
        <div className="w-full" ref={wrapperRef}>
            {field.label && (
                <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            )}

            {/* Input */}
            <div className="relative">
                <div
                    onClick={handleOpen}
                    className={cn(
                        "flex items-center h-9 w-full rounded-lg border-0 bg-muted px-3 cursor-pointer transition-colors",
                        (disabled || field.read_only === 1) && "cursor-not-allowed opacity-50",
                        error && "ring-1 ring-destructive",
                        isOpen && "ring-1 ring-primary/40"
                    )}
                >
                    <GitBranch className="w-4 h-4 text-muted-foreground mr-2 shrink-0" />

                    <span className={cn(
                        "flex-1 truncate text-sm",
                        !value && "text-muted-foreground"
                    )}>
                        {displayValue || t('tree.select', `Chọn ${field.label || linkedDoctype}...`)}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                        {value && !disabled && field.read_only !== 1 && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 rounded-full hover:bg-accent"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <ChevronDown className={cn(
                            "w-4 h-4 text-muted-foreground transition-transform",
                            isOpen && "rotate-180"
                        )} />
                    </div>
                </div>
            </div>

            {/* Dropdown Portal */}
            {isOpen && createPortal(
                <div
                    id="tree-link-dropdown"
                    className="fixed z-[9999] bg-card border border-border rounded-lg shadow-lg overflow-hidden animate-in fade-in zoom-in-95"
                    style={{
                        top: dropdownPosition.top,
                        left: dropdownPosition.left,
                        width: dropdownPosition.width,
                        maxWidth: '400px',
                        minWidth: '280px',
                    }}
                >
                    {/* Search */}
                    <div className="p-2 border-b border-border">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={t('tree.search', 'Tìm kiếm...')}
                                className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border-0 bg-muted focus:outline-none focus:ring-1 focus:ring-primary/40"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Tree or Flat List */}
                    <div className="max-h-[300px] overflow-auto p-1">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                            </div>
                        ) : filteredTree.length > 0 ? (
                            showFlatList ? (
                                // Flat list mode - simple list of leaf nodes
                                filteredTree.map(node => (
                                    <div
                                        key={node.name}
                                        className={cn(
                                            "flex items-center gap-2 py-1.5 px-2.5 rounded-md cursor-pointer transition-colors",
                                            "hover:bg-muted",
                                            value === node.name && "bg-primary/10 text-primary font-medium"
                                        )}
                                        onClick={() => handleSelect(node)}
                                    >
                                        <File className="w-4 h-4 text-muted-foreground shrink-0" />
                                        <span className="text-sm truncate">{node._label || node.name}</span>
                                    </div>
                                ))
                            ) : (
                                // Tree mode
                                filteredTree.map(node => (
                                    <TreeSelectNode
                                        key={node.name}
                                        node={node}
                                        level={0}
                                        parentField={parentField}
                                        onSelect={handleSelect}
                                        selectedValue={value}
                                        expandedNodes={expandedNodes}
                                        onToggle={handleToggle}
                                        maxDepth={maxDepth}
                                    />
                                ))
                            )
                        ) : (
                            <div className="text-center py-6 text-muted-foreground text-sm">
                                {searchQuery
                                    ? t('tree.no_results', 'Không tìm thấy kết quả')
                                    : t('tree.empty', 'Chưa có dữ liệu')
                                }
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {error && (
                <p className="text-xs font-medium text-destructive">{error}</p>
            )}
            {field.description && !error && (
                <p className="text-xs text-muted-foreground">{field.description}</p>
            )}
        </div>
    );
}

TreeLinkField.propTypes = {
    field: PropTypes.shape({
        fieldname: PropTypes.string.isRequired,
        label: PropTypes.string,
        options: PropTypes.string,
        read_only: PropTypes.number,
        reqd: PropTypes.number,
        description: PropTypes.string,
    }).isRequired,
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
    maxDepth: PropTypes.number, // Max depth of tree to show (0 = only root, 1 = root + 1 level, etc.)
};

export default TreeLinkField;
