/**
 * TreeView Component
 *
 * Displays hierarchical data in a tree structure with expand/collapse functionality.
 * Used for tree-type DocTypes like Item Group, Account, Cost Center, etc.
 */

import { useState, useCallback, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronRight, ChevronDown, Folder, FolderOpen, File, Plus, MoreVertical, Loader2, Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';

/**
 * TreeNode Component - Individual node in the tree
 */
export function TreeNode({
    node,
    level = 0,
    onToggle,
    onSelect,
    onAddChild,
    onContextMenu,
    selectedNode,
    loadingNodes,
    renderLabel,
    showActions = true,
}) {
    const { t } = useTranslation();
    const isSelected = selectedNode === node.name;
    const isExpanded = node.expanded;
    const isLoading = loadingNodes?.has(node.name);
    const hasChildren = node.is_group === 1 || (node.children && node.children.length > 0);
    const indent = level * 20;

    const handleToggle = useCallback((e) => {
        e.stopPropagation();
        if (hasChildren && onToggle) {
            onToggle(node);
        }
    }, [hasChildren, node, onToggle]);

    const handleSelect = useCallback(() => {
        if (onSelect) {
            onSelect(node);
        }
    }, [node, onSelect]);

    const handleAddChild = useCallback((e) => {
        e.stopPropagation();
        if (onAddChild) {
            onAddChild(node);
        }
    }, [node, onAddChild]);

    const handleContextMenu = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onContextMenu) {
            onContextMenu(e, node);
        }
    }, [node, onContextMenu]);

    return (
        <div className="select-none">
            {/* Node Row */}
            <div
                className={cn(
                    "relative flex items-center gap-1.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group",
                    "hover:bg-accent",
                    isSelected && "bg-primary/10 text-primary font-medium"
                )}
                style={{ paddingLeft: `${indent + 8}px` }}
                onClick={handleSelect}
                onContextMenu={handleContextMenu}
            >
                {/* Hierarchy indicator line */}
                {level > 0 && (
                    <div
                        className="absolute left-0 top-0 bottom-0 w-px bg-border/50"
                        style={{ left: `${indent - 12}px` }}
                    />
                )}

                {/* Expand/Collapse Toggle */}
                <button
                    type="button"
                    onClick={handleToggle}
                    className={cn(
                        "p-0.5 rounded-md hover:bg-accent transition-colors shrink-0",
                        !hasChildren && "invisible"
                    )}
                    disabled={!hasChildren}
                >
                    {isLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    ) : isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                </button>

                {/* Icon */}
                <span className="shrink-0">
                    {hasChildren ? (
                        isExpanded ? (
                            <FolderOpen className="w-4 h-4 text-emerald-500" />
                        ) : (
                            <Folder className="w-4 h-4 text-emerald-500" />
                        )
                    ) : (
                        <File className="w-4 h-4 text-muted-foreground" />
                    )}
                </span>

                {/* Label */}
                <span className="flex-1 truncate text-[13px]">
                    {renderLabel ? renderLabel(node) : node.name}
                </span>

                {/* Action Buttons */}
                {showActions && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {hasChildren && (
                            <button
                                type="button"
                                onClick={handleAddChild}
                                className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                title={t('tree.add_child', 'Thêm con')}
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={handleContextMenu}
                            className="p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            title={t('common.more', 'Thêm')}
                        >
                            <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Children */}
            {isExpanded && node.children && node.children.length > 0 && (
                <div className="tree-children">
                    {node.children.map((child) => (
                        <TreeNode
                            key={child.name}
                            node={child}
                            level={level + 1}
                            onToggle={onToggle}
                            onSelect={onSelect}
                            onAddChild={onAddChild}
                            onContextMenu={onContextMenu}
                            selectedNode={selectedNode}
                            loadingNodes={loadingNodes}
                            renderLabel={renderLabel}
                            showActions={showActions}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

TreeNode.propTypes = {
    node: PropTypes.shape({
        name: PropTypes.string.isRequired,
        is_group: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
        expanded: PropTypes.bool,
        children: PropTypes.array,
    }).isRequired,
    level: PropTypes.number,
    onToggle: PropTypes.func,
    onSelect: PropTypes.func,
    onAddChild: PropTypes.func,
    onContextMenu: PropTypes.func,
    selectedNode: PropTypes.string,
    loadingNodes: PropTypes.instanceOf(Set),
    renderLabel: PropTypes.func,
    showActions: PropTypes.bool,
};

/**
 * TreeView Component - Main tree container
 */
export function TreeView({
    nodes,
    onToggle,
    onSelect,
    onAddChild,
    onContextMenu,
    onAddRoot,
    selectedNode,
    loadingNodes,
    isLoading,
    error,
    emptyMessage,
    renderLabel,
    showSearch = true,
    showActions = true,
    className,
}) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredNodes, setFilteredNodes] = useState(nodes);

    // Filter nodes based on search
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredNodes(nodes);
            return;
        }

        const query = searchQuery.toLowerCase();

        // Recursive filter function
        const filterTree = (nodeList) => {
            return nodeList.reduce((acc, node) => {
                const nameMatch = node.name.toLowerCase().includes(query);
                const filteredChildren = node.children ? filterTree(node.children) : [];

                if (nameMatch || filteredChildren.length > 0) {
                    acc.push({
                        ...node,
                        children: filteredChildren,
                        expanded: filteredChildren.length > 0, // Auto-expand if children match
                    });
                }

                return acc;
            }, []);
        };

        setFilteredNodes(filterTree(nodes));
    }, [nodes, searchQuery]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-8 text-destructive">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className={cn("tree-view", className)}>
            {/* Search Bar */}
            {showSearch && (
                <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('tree.search', 'Tìm kiếm...')}
                        className="w-full pl-9 pr-4 py-2 text-[13px] rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                    />
                </div>
            )}

            {/* Add Root Button */}
            {onAddRoot && (
                <button
                    type="button"
                    onClick={onAddRoot}
                    className="flex items-center gap-2 w-full px-3 py-2 mb-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    {t('tree.add_root', 'Thêm mục gốc')}
                </button>
            )}

            {/* Tree Nodes */}
            <div className="tree-nodes">
                {filteredNodes && filteredNodes.length > 0 ? (
                    filteredNodes.map((node) => (
                        <TreeNode
                            key={node.name}
                            node={node}
                            level={0}
                            onToggle={onToggle}
                            onSelect={onSelect}
                            onAddChild={onAddChild}
                            onContextMenu={onContextMenu}
                            selectedNode={selectedNode}
                            loadingNodes={loadingNodes}
                            renderLabel={renderLabel}
                            showActions={showActions}
                        />
                    ))
                ) : (
                    <div className="text-center py-8 text-muted-foreground text-[13px]">
                        {searchQuery
                            ? t('tree.no_results', 'Không tìm thấy kết quả')
                            : emptyMessage || t('tree.empty', 'Chưa có dữ liệu')
                        }
                    </div>
                )}
            </div>
        </div>
    );
}

TreeView.propTypes = {
    nodes: PropTypes.arrayOf(PropTypes.shape({
        name: PropTypes.string.isRequired,
        is_group: PropTypes.oneOfType([PropTypes.number, PropTypes.bool]),
        expanded: PropTypes.bool,
        children: PropTypes.array,
    })),
    onToggle: PropTypes.func,
    onSelect: PropTypes.func,
    onAddChild: PropTypes.func,
    onContextMenu: PropTypes.func,
    onAddRoot: PropTypes.func,
    selectedNode: PropTypes.string,
    loadingNodes: PropTypes.instanceOf(Set),
    isLoading: PropTypes.bool,
    error: PropTypes.string,
    emptyMessage: PropTypes.string,
    renderLabel: PropTypes.func,
    showSearch: PropTypes.bool,
    showActions: PropTypes.bool,
    className: PropTypes.string,
};

export default TreeView;
