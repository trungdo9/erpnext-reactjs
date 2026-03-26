/**
 * TreeListView Page
 *
 * Displays tree-structured DocTypes (is_tree = true) in a hierarchical view.
 * Similar to ERPNext's tree view for Item Group, Account, Cost Center, etc.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { TreeView } from '../components/ui/TreeView';
import { TreeService } from '../api/domains/treeService';
import { MetadataService } from '../api/domains/metadataService';
import { DocumentService } from '../api/domains/documentService';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import {
    ArrowLeft,
    Plus,
    RefreshCw,
    List,
    GitBranch,
    Edit,
    Trash2,
    FolderPlus,
    Copy,
    X,
    ChevronRight,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { CARD, TRANSITION } from '../config/styles';

/**
 * TreeListView Component
 */
export function TreeListView() {
    const { t } = useTranslation();
    const { doctype } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Local state
    const [selectedNode, setSelectedNode] = useState(null);
    const [expandedNodes, setExpandedNodes] = useState(new Set());
    const [loadingNodes] = useState(new Set());
    const [treeData, setTreeData] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [addParent, setAddParent] = useState(null);
    const [newNodeName, setNewNodeName] = useState('');
    const [isGroup, setIsGroup] = useState(false);

    // Fetch metadata
    const { data: meta } = useQuery({
        queryKey: ['doctype-meta', doctype],
        queryFn: () => MetadataService.getDocTypeMeta(doctype),
    });

    // Get parent field name from metadata
    const parentField = useMemo(() => {
        if (!meta) return null;

        // Method 1: Check nsm_parent_field (Frappe's tree parent field setting)
        if (meta.nsm_parent_field) {
            return meta.nsm_parent_field;
        }

        // Method 2: Find Link field that points to same doctype (self-referential)
        const selfLinkField = meta.fields?.find(f =>
            f.fieldtype === 'Link' &&
            f.options === doctype &&
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
        return `parent_${doctype.toLowerCase().replace(/ /g, '_')}`;
    }, [meta, doctype]);

    // Fetch all nodes
    const { data: allNodes, isLoading, error, refetch } = useQuery({
        queryKey: ['tree-nodes', doctype],
        queryFn: async () => {
            const nodes = await TreeService.getAllNodes(doctype, {
                fields: ['name', 'is_group', 'lft', 'rgt'],
                useCache: false,
            });
            return nodes;
        },
        enabled: !!doctype && !!parentField,
    });

    // Build tree structure when nodes change
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!allNodes || !parentField) return;

        const tree = TreeService.buildTreeFromList(allNodes, parentField);

        // Restore expanded state
        const applyExpanded = (nodes) => {
            return nodes.map(node => ({
                ...node,
                expanded: expandedNodes.has(node.name),
                children: node.children ? applyExpanded(node.children) : [],
            }));
        };

        setTreeData(applyExpanded(tree));
    }, [allNodes, parentField, expandedNodes]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Handle node toggle (expand/collapse)
    const handleToggle = useCallback((node) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(node.name)) {
                next.delete(node.name);
            } else {
                next.add(node.name);
            }
            return next;
        });
    }, []);

    // Handle node selection
    const handleSelect = useCallback((node) => {
        setSelectedNode(node.name);
        setContextMenu(null);
    }, []);

    // Handle add child
    const handleAddChild = useCallback((parentNode) => {
        setAddParent(parentNode?.name || null);
        setNewNodeName('');
        setIsGroup(false);
        setShowAddDialog(true);
    }, []);

    // Handle add root
    const handleAddRoot = useCallback(() => {
        setAddParent(null);
        setNewNodeName('');
        setIsGroup(true);
        setShowAddDialog(true);
    }, []);

    // Handle context menu
    const handleContextMenu = useCallback((e, node) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            node,
        });
        setSelectedNode(node.name);
    }, []);

    // Close context menu on click outside
    useEffect(() => {
        const handleClick = () => setContextMenu(null);
        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, []);

    // Create new node
    const handleCreateNode = useCallback(async () => {
        if (!newNodeName.trim()) return;

        try {
            const data = {
                [meta?.autoname?.includes('field:') ? meta.autoname.split(':')[1] : 'name']: newNodeName,
                is_group: isGroup ? 1 : 0,
            };

            if (addParent) {
                data[parentField] = addParent;
            }

            await DocumentService.create(doctype, data);

            // Refresh tree
            refetch();
            setShowAddDialog(false);
            setNewNodeName('');

            // Expand parent if adding child
            if (addParent) {
                setExpandedNodes(prev => new Set([...prev, addParent]));
            }
        } catch (err) {
            console.error('Failed to create node:', err);
            alert(err.message || t('common.error'));
        }
    }, [newNodeName, isGroup, addParent, parentField, doctype, meta, refetch, t]);

    // Delete node
    const handleDelete = useCallback(async (node) => {
        if (!confirm(t('tree.confirm_delete', `Xác nhận xóa "${node.name}"?`))) return;

        try {
            await DocumentService.delete(doctype, node.name);
            refetch();
            setContextMenu(null);
            if (selectedNode === node.name) {
                setSelectedNode(null);
            }
        } catch (err) {
            console.error('Failed to delete node:', err);
            alert(err.message || t('common.error'));
        }
    }, [doctype, refetch, selectedNode, t]);

    // Edit node
    const handleEdit = useCallback((node) => {
        navigate(`/app/${doctype}/${encodeURIComponent(node.name)}`);
        setContextMenu(null);
    }, [doctype, navigate]);

    // Navigate to list view
    const handleSwitchToList = useCallback(() => {
        navigate(`/app/${doctype}`);
    }, [doctype, navigate]);

    // Refresh tree
    const handleRefresh = useCallback(() => {
        TreeService.invalidateTreeCache(doctype);
        queryClient.invalidateQueries({ queryKey: ['tree-nodes', doctype] });
        refetch();
    }, [doctype, queryClient, refetch]);

    // Get selected node details
    const selectedNodeData = useMemo(() => {
        if (!selectedNode || !allNodes) return null;
        return allNodes.find(n => n.name === selectedNode);
    }, [selectedNode, allNodes]);

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background border-b border-border">
                <div className="container mx-auto px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Link
                                to="/app"
                                className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Link>

                            <div>
                                <h1 className="text-base font-semibold flex items-center gap-2">
                                    <GitBranch className="w-5 h-5 text-primary" />
                                    {doctype}
                                </h1>
                                <p className="text-[12px] text-muted-foreground">
                                    {t('tree.view_mode', 'Chế độ xem cây')}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSwitchToList}
                                className="gap-1.5"
                            >
                                <List className="w-4 h-4" />
                                <span className="hidden sm:inline text-[13px]">{t('tree.list_view', 'Danh sách')}</span>
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                className="gap-1.5"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>

                            <Button
                                size="sm"
                                onClick={handleAddRoot}
                                className="gap-1.5"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline text-[13px]">{t('common.add', 'Thêm')}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Tree Panel */}
                    <div className="lg:col-span-2">
                        <div className={`${CARD.static} p-4`}>
                            <TreeView
                                nodes={treeData}
                                onToggle={handleToggle}
                                onSelect={handleSelect}
                                onAddChild={handleAddChild}
                                onContextMenu={handleContextMenu}
                                onAddRoot={handleAddRoot}
                                selectedNode={selectedNode}
                                loadingNodes={loadingNodes}
                                isLoading={isLoading}
                                error={error?.message}
                                showSearch={true}
                                showActions={true}
                            />
                        </div>
                    </div>

                    {/* Details Panel */}
                    <div className="lg:col-span-1">
                        <div className={`${CARD.static} p-4 sticky top-24`}>
                            {selectedNodeData ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <h3 className="font-semibold text-base truncate">
                                            {selectedNodeData.name}
                                        </h3>
                                        <button
                                            onClick={() => setSelectedNode(null)}
                                            className="p-1 rounded-md hover:bg-accent shrink-0"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-2 text-[13px]">
                                        <div className="flex justify-between items-center">
                                            <span className="text-muted-foreground text-[12px]">{t('tree.type', 'Loại')}</span>
                                            <span className={cn(
                                                "px-2 py-0.5 rounded-full text-[11px] font-medium",
                                                selectedNodeData.is_group
                                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                            )}>
                                                {selectedNodeData.is_group ? t('tree.group', 'Nhóm') : t('tree.item', 'Mục')}
                                            </span>
                                        </div>

                                        {selectedNodeData[parentField] && (
                                            <div className="flex justify-between items-center">
                                                <span className="text-muted-foreground text-[12px]">{t('tree.parent', 'Cha')}</span>
                                                <button
                                                    onClick={() => setSelectedNode(selectedNodeData[parentField])}
                                                    className="text-primary hover:underline text-[13px] truncate max-w-[180px]"
                                                >
                                                    {selectedNodeData[parentField]}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-border">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(selectedNodeData)}
                                            className="flex-1 gap-1.5"
                                        >
                                            <Edit className="w-4 h-4" />
                                            <span className="text-[13px]">{t('common.edit', 'Sửa')}</span>
                                        </Button>

                                        {selectedNodeData.is_group === 1 && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddChild(selectedNodeData)}
                                                className="flex-1 gap-1.5"
                                            >
                                                <FolderPlus className="w-4 h-4" />
                                                <span className="text-[13px]">{t('tree.add_child', 'Thêm con')}</span>
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-[13px]">{t('tree.select_node', 'Chọn một mục để xem chi tiết')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 bg-popover border border-border rounded-lg shadow-lg py-1 min-w-[160px] animate-in fade-in zoom-in-95"
                    style={{ top: contextMenu.y, left: contextMenu.x }}
                >
                    <button
                        className="w-full px-3 py-2 text-[13px] text-left hover:bg-accent flex items-center gap-2 transition-colors"
                        onClick={() => handleEdit(contextMenu.node)}
                    >
                        <Edit className="w-4 h-4" />
                        {t('common.edit', 'Sửa')}
                    </button>

                    {contextMenu.node.is_group === 1 && (
                        <button
                            className="w-full px-3 py-2 text-[13px] text-left hover:bg-accent flex items-center gap-2 transition-colors"
                            onClick={() => {
                                handleAddChild(contextMenu.node);
                                setContextMenu(null);
                            }}
                        >
                            <FolderPlus className="w-4 h-4" />
                            {t('tree.add_child', 'Thêm con')}
                        </button>
                    )}

                    <button
                        className="w-full px-3 py-2 text-[13px] text-left hover:bg-accent flex items-center gap-2 transition-colors"
                        onClick={() => {
                            navigator.clipboard.writeText(contextMenu.node.name);
                            setContextMenu(null);
                        }}
                    >
                        <Copy className="w-4 h-4" />
                        {t('common.copy_name', 'Sao chép tên')}
                    </button>

                    <hr className="my-1 border-border" />

                    <button
                        className="w-full px-3 py-2 text-[13px] text-left hover:bg-accent flex items-center gap-2 text-destructive transition-colors"
                        onClick={() => handleDelete(contextMenu.node)}
                    >
                        <Trash2 className="w-4 h-4" />
                        {t('common.delete', 'Xóa')}
                    </button>
                </div>
            )}

            {/* Add Dialog */}
            {showAddDialog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-card rounded-xl border border-border shadow-xl w-full max-w-md mx-4 p-6 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-semibold">
                                {addParent
                                    ? t('tree.add_child_to', `Thêm vào "${addParent}"`)
                                    : t('tree.add_root', 'Thêm mục gốc')
                                }
                            </h3>
                            <button
                                onClick={() => setShowAddDialog(false)}
                                className="p-1 rounded-md hover:bg-accent"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[13px] font-medium mb-2">
                                    {t('common.name', 'Tên')} <span className="text-destructive">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={newNodeName}
                                    onChange={(e) => setNewNodeName(e.target.value)}
                                    placeholder={t('tree.enter_name', 'Nhập tên...')}
                                    className="w-full px-3 py-2 text-[13px] rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateNode();
                                        if (e.key === 'Escape') setShowAddDialog(false);
                                    }}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_group"
                                    checked={isGroup}
                                    onChange={(e) => setIsGroup(e.target.checked)}
                                    className="rounded border-border"
                                />
                                <label htmlFor="is_group" className="text-[13px]">
                                    {t('tree.is_group', 'Là nhóm (có thể chứa mục con)')}
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <Button
                                variant="outline"
                                onClick={() => setShowAddDialog(false)}
                            >
                                <span className="text-[13px]">{t('common.cancel', 'Hủy')}</span>
                            </Button>
                            <Button
                                onClick={handleCreateNode}
                                disabled={!newNodeName.trim()}
                            >
                                <span className="text-[13px]">{t('common.create', 'Tạo')}</span>
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TreeListView;
