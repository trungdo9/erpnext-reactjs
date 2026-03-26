import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

import { apiClient } from '../../api/gateway';
import { X, Search, Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * QuickPickModal - Multi-select modal for child table rows.
 * Shows all available items as a searchable checkbox list.
 * Existing items are pre-checked and disabled.
 */
export function QuickPickModal({
    isOpen,
    onClose,
    onAdd,
    config,
    existingValues = [],
}) {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState(new Set());

    // Fetch all available items
    useEffect(() => {
        if (!isOpen || !config) return;

        const fetchItems = async () => {
            setIsLoading(true);
            try {
                const filters = config.filters
                    ? Object.entries(config.filters).map(([k, v]) =>
                        Array.isArray(v) ? [k, 'in', v] : [k, '=', v]
                    )
                    : [];

                const response = await apiClient.post('frappe.client.get_list', {
                    doctype: config.sourceDoctype,
                    fields: ['name', config.displayField || 'name'],
                    filters,
                    order_by: `${config.displayField || 'name'} asc`,
                    limit_page_length: 500,
                });

                setItems(response?.message || []);
            } catch (err) {
                console.error('[QuickPick] Failed to fetch items:', err);
                setItems([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchItems();
        setSelected(new Set());
        setSearch('');
    }, [isOpen, config]);

    // Existing values set for quick lookup
    const existingSet = useMemo(() => new Set(existingValues), [existingValues]);

    // Filter items by search
    const filteredItems = useMemo(() => {
        if (!search.trim()) return items;
        const q = search.toLowerCase();
        return items.filter(item => {
            const name = item.name?.toLowerCase() || '';
            const display = item[config?.displayField]?.toLowerCase() || '';
            return name.includes(q) || display.includes(q);
        });
    }, [items, search, config?.displayField]);

    // Toggle selection
    const toggleItem = useCallback((itemName) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(itemName)) {
                next.delete(itemName);
            } else {
                next.add(itemName);
            }
            return next;
        });
    }, []);

    // Select all visible (non-existing)
    const selectAll = useCallback(() => {
        const newSelected = new Set(selected);
        filteredItems.forEach(item => {
            if (!existingSet.has(item.name)) {
                newSelected.add(item.name);
            }
        });
        setSelected(newSelected);
    }, [filteredItems, existingSet, selected]);

    // Deselect all
    const deselectAll = useCallback(() => {
        setSelected(new Set());
    }, []);

    // Handle add
    const handleAdd = useCallback(() => {
        if (selected.size === 0) return;
        onAdd(Array.from(selected));
        onClose();
    }, [selected, onAdd, onClose]);

    // Handle escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const newCount = selected.size;
    const existingCount = existingSet.size;
    const totalItems = items.length;

    return createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div
                role="dialog"
                aria-modal="true"
                aria-label={config?.label || 'Quick pick'}
                className="relative z-[9999] w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in-0 zoom-in-95"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                    <div>
                        <h3 className="text-base font-semibold text-foreground">
                            {config?.label || 'Chọn nhanh'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {existingCount > 0 && `${existingCount} đã chọn · `}
                            {totalItems} món có sẵn
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search + Select all */}
                <div className="px-5 py-3 border-b border-border space-y-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Tìm món ăn..."
                            autoFocus
                            className="w-full h-11 pl-9 pr-3 rounded-lg border-0 bg-muted text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                        />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                        <button
                            type="button"
                            onClick={selectAll}
                            className="text-primary hover:text-primary/80 font-medium"
                        >
                            Chọn tất cả
                        </button>
                        <span className="text-border">|</span>
                        <button
                            type="button"
                            onClick={deselectAll}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Bỏ chọn
                        </button>
                    </div>
                </div>

                {/* Item list */}
                <div className="max-h-[50vh] overflow-auto px-2 py-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Đang tải...</span>
                        </div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-sm text-muted-foreground">
                            {search ? 'Không tìm thấy' : 'Không có dữ liệu'}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-0.5">
                            {filteredItems.map((item) => {
                                const isExisting = existingSet.has(item.name);
                                const isChecked = isExisting || selected.has(item.name);
                                const displayName = item[config?.displayField] || item.name;

                                return (
                                    <button
                                        key={item.name}
                                        type="button"
                                        onClick={() => !isExisting && toggleItem(item.name)}
                                        disabled={isExisting}
                                        className={cn(
                                            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors",
                                            isExisting
                                                ? "opacity-50 cursor-not-allowed bg-muted/30"
                                                : isChecked
                                                    ? "bg-primary/10 text-primary"
                                                    : "hover:bg-muted"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                                            isChecked
                                                ? "bg-primary border-primary"
                                                : "border-border"
                                        )}>
                                            {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <span className={cn(
                                            "truncate",
                                            isExisting && "line-through"
                                        )}>
                                            {displayName}
                                        </span>
                                        {isExisting && (
                                            <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                                đã thêm
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-muted/30">
                    <span className="text-sm text-muted-foreground">
                        {newCount > 0 ? `${newCount} món mới` : 'Chưa chọn món nào'}
                    </span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
                        >
                            Hủy
                        </button>
                        <button
                            type="button"
                            onClick={handleAdd}
                            disabled={newCount === 0}
                            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
                        >
                            Thêm {newCount > 0 ? `${newCount} món` : ''}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

QuickPickModal.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
    config: PropTypes.shape({
        targetField: PropTypes.string.isRequired,
        sourceDoctype: PropTypes.string.isRequired,
        filters: PropTypes.object,
        displayField: PropTypes.string,
        label: PropTypes.string,
    }),
    existingValues: PropTypes.arrayOf(PropTypes.string),
};

export default QuickPickModal;
