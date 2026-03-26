/**
 * DynamicListView - Refactored with TanStack Table
 *
 * Modes:
 * 1. Doctype mode (default): Server-side sorting, filtering, pagination via API
 * 2. External data mode: Client-side sorting, filtering for provided data
 *    Used by ReportPage to share the same table/filter UX.
 *
 * External mode props:
 * - externalData: Array of row objects
 * - externalColumns: Array of { fieldname, label, fieldtype, width }
 * - title: Display title override
 * - headerExtra: Additional header action elements
 */

import { useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    flexRender,
} from '@tanstack/react-table';
import { useTranslation } from '../hooks/useTranslation';
import { useToast } from '../hooks/useToast';
import useSidebarStore from '../stores/useSidebarStore';
import { MetadataService, DocumentService } from '../api/domains';
import { getCurrentNumberLocale } from '../utils/dateUtils';
import Button from '../components/ui/Button';
import ExcelFilterDropdown from '../components/ui/ExcelFilterDropdown';
import DataTable from '../components/ui/DataTable';

import { Plus, Trash2, FileText, Filter, Loader2, X, ArrowUp, ArrowDown, ArrowUpDown, Search, GitBranch, RefreshCw, FileSearch } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';

// Extracted hooks and components
import { useListURLState } from './dynamic-list/useListURLState';
import { useListColumns } from './dynamic-list/useListColumns';
import { buildApiFilters, filterExternalData, useSearchOrFilters } from './dynamic-list/useListFilters';
import MobileCard from './dynamic-list/MobileCard';
import { LIST_VIEW } from '../config/layout';

const PAGE_SIZE = LIST_VIEW.pageSize;

const DynamicListView = ({ doctype, isTree, externalData, externalColumns, title: titleProp, headerExtra }) => {
    const isExternalMode = Array.isArray(externalData);

    // Normalize external data: ensure rows are objects (handle array-of-arrays format)
    const normalizedExternalData = useMemo(() => {
        if (!isExternalMode || !externalData?.length) return externalData || [];
        if (Array.isArray(externalData[0]) && externalColumns?.length) {
            return externalData.map(row => {
                const obj = {};
                externalColumns.forEach((col, i) => { obj[col.fieldname] = row[i]; });
                return obj;
            });
        }
        return externalData;
    }, [isExternalMode, externalData, externalColumns]);

    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { t, getFieldLabel, getDoctypeLabel, language } = useTranslation();
    const { toast } = useToast();
    const { isMobile } = useSidebarStore();
    const passedLabel = location.state?.label;
    const passedWorkspace = location.state?.workspace;
    const passedWorkspaceLabel = location.state?.workspaceLabel;

    // =========================================================================
    // URL State (sorting, filters, search)
    // =========================================================================
    const {
        columnFilters, setColumnFilters,
        sorting, setSorting,
        setSearchText,
        localSearchText, setLocalSearchText,
        debouncedSearch,
        sortConfig,
    } = useListURLState({ isExternalMode });

    // UI State
    const [activeFilterCol, setActiveFilterCol] = useState(null);
    const [filterPosition, setFilterPosition] = useState({ top: 0, left: 0 });
    const [rowSelection, setRowSelection] = useState({});

    // =========================================================================
    // Metadata Query (doctype mode only)
    // =========================================================================
    const {
        data: meta,
        isLoading: metaLoading,
    } = useQuery({
        queryKey: ['meta', doctype],
        queryFn: () => MetadataService.getMeta(doctype),
        enabled: !isExternalMode && !!doctype,
    });

    // =========================================================================
    // Columns & Field Accessors
    // =========================================================================
    const {
        fieldAccessors,
        columns,
        getFieldType,
        getFilterColumnLabel,
    } = useListColumns({ isExternalMode, externalColumns, meta, t, getFieldLabel, language });

    // =========================================================================
    // Filters
    // =========================================================================
    const apiFilters = useMemo(() => buildApiFilters(columnFilters), [columnFilters]);
    const searchOrFilters = useSearchOrFilters(debouncedSearch, meta);

    // =========================================================================
    // Infinite List Data Query (doctype mode only)
    // =========================================================================
    const {
        data: listData,
        isLoading: listLoading,
        isFetching: listFetching,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteQuery({
        queryKey: ['list', doctype, fieldAccessors, sortConfig, apiFilters, searchOrFilters],
        queryFn: async ({ pageParam = 0 }) => {
            const docs = await DocumentService.getList(doctype, {
                fields: fieldAccessors,
                filters: apiFilters.length > 0 ? apiFilters : undefined,
                orFilters: searchOrFilters.length > 0 ? searchOrFilters : undefined,
                limit: PAGE_SIZE,
                start: pageParam,
                orderBy: `${sortConfig.field} ${sortConfig.order}`,
                useCache: false,
            });
            return {
                data: docs.data || docs,
                nextCursor: (docs.data || docs).length >= PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
            };
        },
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: !isExternalMode && !!doctype && fieldAccessors.length > 0,
    });

    // =========================================================================
    // Total Count Query (doctype mode only)
    // =========================================================================
    const {
        data: totalCount,
    } = useQuery({
        queryKey: ['count', doctype, apiFilters, searchOrFilters],
        queryFn: () => DocumentService.getCount(
            doctype,
            apiFilters.length > 0 ? apiFilters : [],
            searchOrFilters.length > 0 ? searchOrFilters : undefined,
        ),
        enabled: !isExternalMode && !!doctype,
    });

    // =========================================================================
    // Data: flatten API pages OR filter external data client-side
    // =========================================================================
    const data = useMemo(() => {
        if (isExternalMode) {
            return filterExternalData(normalizedExternalData, columnFilters, debouncedSearch);
        }
        const allData = listData?.pages?.flatMap(page => page.data) || [];
        const uniqueMap = new Map();
        allData.forEach(item => uniqueMap.set(item.name, item));
        return Array.from(uniqueMap.values());
    }, [isExternalMode, normalizedExternalData, columnFilters, debouncedSearch, listData]);

    // =========================================================================
    // TanStack Table Instance
    // =========================================================================
    // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table v8 API, safe to use
    const table = useReactTable({
        data,
        columns,
        state: { sorting, rowSelection },
        onSortingChange: setSorting,
        onRowSelectionChange: isExternalMode ? undefined : setRowSelection,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getRowId: isExternalMode ? (_, index) => String(index) : (row) => row.name,
        manualSorting: !isExternalMode,
        manualFiltering: !isExternalMode,
        manualPagination: !isExternalMode,
    });

    const loading = isExternalMode ? false : (metaLoading || listLoading);
    const selectedRowIds = useMemo(() => Object.keys(rowSelection).filter(id => rowSelection[id]), [rowSelection]);

    // =========================================================================
    // Filter Values Query (doctype mode - server-side distinct values)
    // =========================================================================
    const {
        data: filterUniqueValues,
        isLoading: filterValuesLoading,
    } = useQuery({
        queryKey: ['distinctValues', doctype, activeFilterCol],
        queryFn: async () => {
            if (!activeFilterCol) return [];
            const values = await DocumentService.getDistinctValues(doctype, activeFilterCol, [], 500);
            return values.sort((a, b) => {
                if (a === null || a === undefined || a === '') return 1;
                if (b === null || b === undefined || b === '') return -1;
                return String(a).localeCompare(String(b));
            });
        },
        enabled: !isExternalMode && !!doctype && !!activeFilterCol,
    });

    // Client-side unique values for external mode
    const externalFilterValues = useMemo(() => {
        if (!isExternalMode || !activeFilterCol || !normalizedExternalData?.length) return [];
        const valueSet = new Set();
        normalizedExternalData.forEach(row => {
            const v = row[activeFilterCol];
            if (v != null && v !== '') valueSet.add(v);
        });
        return Array.from(valueSet).sort((a, b) => {
            if (typeof a === 'number' && typeof b === 'number') return a - b;
            return String(a).localeCompare(String(b));
        });
    }, [isExternalMode, activeFilterCol, normalizedExternalData]);

    // =========================================================================
    // Delete Mutation (doctype mode only)
    // =========================================================================
    const deleteMutation = useMutation({
        mutationFn: async (names) => {
            const results = await Promise.allSettled(names.map(name => DocumentService.delete(doctype, name)));
            const failed = results.filter(r => r.status === 'rejected').length;
            return { total: names.length, failed };
        },
        onSuccess: ({ total, failed }) => {
            if (failed > 0) toast.error(t('common.error'), t('list.delete_failed_count', { failed, total }));
            else toast.success(t('common.success'), t('list.deleted_success', { count: total }));
            setRowSelection({});
            queryClient.invalidateQueries({ queryKey: ['list', doctype] });
        },
        onError: () => toast.error(t('common.error'), 'Delete failed'),
    });

    // =========================================================================
    // Helpers
    // =========================================================================
    const calculateTotal = useCallback((columnId) => {
        if (isExternalMode) {
            const col = externalColumns?.find(c => c.fieldname === columnId);
            if (!col) return null;
            const ft = col.fieldtype;
            if (!['Currency', 'Float', 'Int', 'Percent'].includes(ft)) return null;
            const sum = data.reduce((acc, row) => acc + (parseFloat(row[columnId]) || 0), 0);
            if (ft === 'Currency') return sum.toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 0 });
            if (ft === 'Percent') return sum.toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%';
            if (ft === 'Float') return sum.toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 3 });
            return sum.toLocaleString(getCurrentNumberLocale());
        }
        const fieldMeta = meta?.fields?.find(f => f.fieldname === columnId);
        const fieldType = fieldMeta?.fieldtype;
        if (!['Currency', 'Float', 'Percent', 'Int'].includes(fieldType)) return null;
        const values = data.map(d => d[columnId]).filter(v => v !== null && v !== undefined && v !== '');
        const sum = values.reduce((acc, curr) => acc + (parseFloat(curr) || 0), 0);
        if (fieldType === 'Currency') return sum.toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        if (fieldType === 'Percent') return sum.toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 2 }) + '%';
        if (fieldType === 'Float') return sum.toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 3 });
        return sum.toLocaleString(getCurrentNumberLocale());
    }, [isExternalMode, externalColumns, data, meta]);

    const hasActiveFilter = (col) => !!columnFilters[col];
    const activeFilterCount = Object.keys(columnFilters).length;

    // =========================================================================
    // Event Handlers
    // =========================================================================
    const handleRefresh = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['list', doctype] });
        queryClient.invalidateQueries({ queryKey: ['count', doctype] });
    }, [queryClient, doctype]);

    const handleLoadMore = useCallback(() => {
        if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const handleOpenFilter = (col, event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const dropdownWidth = 288;
        let left = rect.left;
        if (left + dropdownWidth > viewportWidth - 16) left = viewportWidth - dropdownWidth - 16;
        setFilterPosition({ top: rect.bottom + 4, left: Math.max(8, left) });
        setActiveFilterCol(activeFilterCol === col ? null : col);
    };

    const handleApplyFilter = (col, filterConfig) => {
        setColumnFilters(prev => ({ ...prev, [col]: filterConfig }));
    };

    const handleApplySort = (col, order) => {
        setSorting([{ id: col, desc: order === 'desc' }]);
    };

    const handleClearFilter = (col) => {
        setColumnFilters(prev => { const next = { ...prev }; delete next[col]; return next; });
    };

    const handleBulkDelete = async () => {
        if (selectedRowIds.length === 0) return;
        if (!confirm(`${t('common.confirm_delete')} (${selectedRowIds.length})`)) return;
        deleteMutation.mutate(selectedRowIds);
    };

    const handleMobileNavigate = useCallback((name) => {
        navigate(`/form/${doctype}/${name}`, { state: { workspace: passedWorkspace, workspaceLabel: passedWorkspaceLabel } });
    }, [navigate, doctype, passedWorkspace, passedWorkspaceLabel]);

    // =========================================================================
    // Render
    // =========================================================================
    const displayLabel = titleProp || passedLabel || getDoctypeLabel(doctype) || meta?.name;

    return (
        <div className="w-full min-w-0 space-y-2">

            {/* Row 1: Title + Search + Actions */}
            <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground truncate">
                    {displayLabel}
                </h1>

                {/* Search */}
                <div className="relative flex-1 min-w-[160px] max-w-xs order-last sm:order-none">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                    <input
                        type="text"
                        value={localSearchText}
                        onChange={(e) => setLocalSearchText(e.target.value)}
                        placeholder={t('common.search_placeholder')}
                        className="w-full h-10 md:h-8 pl-8 pr-8 text-[13px] rounded-md border-0 bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors"
                    />
                    {localSearchText && (
                        <button
                            onClick={() => { setLocalSearchText(''); setSearchText(''); }}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    {isExternalMode && headerExtra}
                    {!isExternalMode && isTree && (
                        <Button variant="outline" size="sm" onClick={() => navigate(`/app/${encodeURIComponent(doctype)}/tree`)} className="gap-1">
                            <GitBranch className="w-3.5 h-3.5" />
                            <span className="hidden lg:inline text-[13px]">{t('tree.switch_to_tree', 'Xem dạng cây')}</span>
                        </Button>
                    )}
                    {!isExternalMode && (
                        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={listFetching && !isFetchingNextPage} className="shrink-0" title={t('common.refresh', 'Làm mới')}>
                            <RefreshCw className={`h-3.5 w-3.5 ${listFetching && !isFetchingNextPage ? 'animate-spin' : ''}`} />
                        </Button>
                    )}
                    {!isExternalMode && (
                        <Button variant="primary" size="sm" onClick={() => navigate(`/form/${doctype}`, { state: { workspace: passedWorkspace, workspaceLabel: passedWorkspaceLabel } })} className="shrink-0">
                            <Plus className="h-4 w-4 md:mr-1.5" />
                            <span className="hidden md:inline">{t('common.create')}</span>
                        </Button>
                    )}
                </div>
            </div>

            {/* Row 2: Toolbar */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
                {activeFilterCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setColumnFilters({})} className="text-muted-foreground hover:text-red-600 shrink-0 text-xs h-7">
                        <Filter className="h-3 w-3 mr-1" />
                        <span className="hidden sm:inline">{t('common.clear_filter')}</span> ({activeFilterCount})
                    </Button>
                )}
                {!isExternalMode && selectedRowIds.length > 0 && (
                    <Button variant="danger" size="sm" onClick={handleBulkDelete} disabled={deleteMutation.isPending} className="shrink-0 text-xs h-7">
                        {deleteMutation.isPending ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Trash2 className="h-3 w-3 mr-1" />}
                        {t('common.delete')} ({selectedRowIds.length})
                    </Button>
                )}
                {!isExternalMode && (
                    <Button variant="outline" size="sm" onClick={() => navigate(`/form/${doctype}/bulk`)} className="shrink-0 text-xs h-7">
                        <FileText className="h-3 w-3 md:mr-1" />
                        <span className="hidden sm:inline">{t('list.bulk_entry')}</span>
                    </Button>
                )}
                {data.length > 0 && (
                    <span className="text-[11px] text-muted-foreground shrink-0 ml-auto tabular-nums">
                        {isExternalMode ? (
                            activeFilterCount > 0
                                ? `${data.length} / ${normalizedExternalData.length}`
                                : `${data.length} ${t('list.records')}`
                        ) : (
                            totalCount != null
                                ? `${data.length} / ${totalCount.toLocaleString()}`
                                : `${data.length} ${t('list.records')}`
                        )}
                    </span>
                )}
            </div>

            <div className="relative w-full min-w-0">
                {/* Mobile Card View */}
                {isMobile ? (
                    <div className="space-y-3">
                        {loading && data.length === 0 && (
                            <div className="flex justify-center items-center py-12 text-muted-foreground">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                {t('common.loading')}
                            </div>
                        )}
                        {!loading && data.length === 0 && (
                            <EmptyState
                                type={activeFilterCount > 0 || debouncedSearch ? 'no-results' : 'no-data'}
                                icon={activeFilterCount > 0 || debouncedSearch ? FileSearch : undefined}
                                description={activeFilterCount > 0 || debouncedSearch ? t('common.no_results_desc') : t('common.no_data_desc')}
                            />
                        )}
                        {isExternalMode ? (
                            data.map((row, index) => (
                                <div key={row.name || index} className="bg-card border rounded-lg shadow-sm p-3 space-y-1.5">
                                    {fieldAccessors.slice(0, 6).map(col => (
                                        <div key={col} className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground text-xs">{getFilterColumnLabel(col)}</span>
                                            <span className="font-medium text-foreground text-xs text-right max-w-[60%] truncate">{row[col] ?? '-'}</span>
                                        </div>
                                    ))}
                                </div>
                            ))
                        ) : (
                            data.map(doc => (
                                <MobileCard
                                    key={doc.name}
                                    doc={doc}
                                    meta={meta}
                                    fieldAccessors={fieldAccessors}
                                    selectedRowIds={selectedRowIds}
                                    t={t}
                                    onNavigate={handleMobileNavigate}
                                />
                            ))
                        )}
                        {!isExternalMode && hasNextPage && data.length > 0 && (
                            <div className="pt-2">
                                {isFetchingNextPage ? (
                                    <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">{t('common.loading')}</span>
                                    </div>
                                ) : (
                                    <Button variant="outline" onClick={handleLoadMore} className="w-full text-primary hover:bg-primary/5">
                                        <Plus className="h-4 w-4 mr-2" />
                                        {totalCount != null && totalCount > data.length
                                            ? `${t('list.load_more')} (${(totalCount - data.length).toLocaleString()} ${t('list.remaining')})`
                                            : t('list.load_more_10')
                                        }
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    /* TanStack Table View */
                    <DataTable
                        table={table}
                        loading={loading}
                        loadingMessage={t('common.loading')}
                        emptyMessage={t('common.no_data')}
                        onRowClick={isExternalMode ? undefined : (row) => navigate(`/form/${doctype}/${row.original.name}`, { state: { workspace: passedWorkspace, workspaceLabel: passedWorkspaceLabel } })}
                        rowClassName={isExternalMode ? undefined : (row) => row.getIsSelected() ? 'bg-primary/5 border-l-2 border-l-primary' : ''}
                        calculateTotal={calculateTotal}
                        dataLength={data.length}
                        countColumnId={isExternalMode ? undefined : "select"}
                        maxHeight={isExternalMode ? "calc(100vh - 280px)" : "calc(100vh - 220px)"}
                        showDualScrollbar
                        specialColumns={isExternalMode ? [] : ['select', 'status_indicator']}
                        renderHeaderCell={(header, _sortIndicator, justifyClass) => (
                            <button
                                onClick={(e) => handleOpenFilter(header.column.id, e)}
                                className={`inline-flex items-center gap-1.5 w-full text-muted-foreground font-bold text-[11px] hover:text-foreground transition-colors whitespace-nowrap ${justifyClass}`}
                            >
                                <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                                {sortConfig.field === header.column.id ? (
                                    sortConfig.order === 'desc' ? <ArrowDown className="h-3 w-3 shrink-0 text-primary" /> : <ArrowUp className="h-3 w-3 shrink-0 text-primary" />
                                ) : (
                                    <ArrowUpDown className="h-3 w-3 shrink-0 opacity-20 group-hover:opacity-50" />
                                )}
                                {hasActiveFilter(header.column.id) && <Filter className="h-3 w-3 shrink-0 text-primary" />}
                            </button>
                        )}
                    />
                )}

                {/* Load More (doctype mode, desktop) */}
                {!isExternalMode && !isMobile && hasNextPage && (
                    <div className="flex justify-center items-center p-4 border-t border-border">
                        {isFetchingNextPage ? (
                            <div className="flex items-center gap-2 text-muted-foreground text-[12px]">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{t('common.loading')}</span>
                            </div>
                        ) : (
                            <Button variant="outline" onClick={handleLoadMore} className="text-[13px]">
                                <Plus className="h-4 w-4 mr-2" />
                                {totalCount != null && totalCount > data.length
                                    ? `${t('list.load_more')} (${(totalCount - data.length).toLocaleString()} ${t('list.remaining')})`
                                    : t('list.load_more_10')
                                }
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Filter dropdown via Portal */}
            {activeFilterCol && createPortal(
                <ExcelFilterDropdown
                    columnKey={activeFilterCol}
                    columnLabel={getFilterColumnLabel(activeFilterCol)}
                    uniqueValues={isExternalMode ? externalFilterValues : (filterUniqueValues || [])}
                    isLoadingValues={isExternalMode ? false : filterValuesLoading}
                    currentFilter={columnFilters[activeFilterCol]}
                    currentSort={sortConfig.field === activeFilterCol ? sortConfig.order : null}
                    onApplyFilter={(config) => handleApplyFilter(activeFilterCol, config)}
                    onApplySort={(order) => handleApplySort(activeFilterCol, order)}
                    onClearFilter={() => handleClearFilter(activeFilterCol)}
                    onClose={() => setActiveFilterCol(null)}
                    fieldType={getFieldType(activeFilterCol)}
                    position={filterPosition}
                />,
                document.body
            )}
        </div>
    );
};

export default DynamicListView;
