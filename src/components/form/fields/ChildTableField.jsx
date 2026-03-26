import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { useDoctypeMeta } from '../../../hooks/useDoctypeMeta';
import { useTranslation } from '../../../hooks/useTranslation';
import { Plus, X, Clipboard, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';
import {
    LinkField,
    FilteredLinkField,
    SelectField,
    DateField,
    NumberField,
    CheckField,
    TextField,
    TextareaField
} from './index';
import { isChildColumnReadOnly, isLuongChildDoctype, hasLinkFieldFilter, getChildFieldChangeHandler, getQuickPickConfig } from '../../../config/doctype.behaviors';
import { apiClient } from '../../../api/gateway';
import { QuickPickModal } from '../QuickPickModal';

// Number of rows to add at once for luống tables
const LUONG_BATCH_ADD_COUNT = 20;

// Pagination settings for large tables
const ROWS_PER_PAGE_OPTIONS = [20, 50, 100, 200];
const DEFAULT_ROWS_PER_PAGE = 100;
const PAGINATION_THRESHOLD = 30; // Show pagination if rows > this

/**
 * Registry of fields supported in Child Tables
 */
const TABLE_FIELD_COMPONENTS = {
    'Link': LinkField,
    'Select': SelectField,
    'Date': DateField,
    'Datetime': DateField,
    'Time': DateField,
    'Int': NumberField,
    'Float': NumberField,
    'Currency': NumberField,
    'Percent': NumberField,
    'Check': CheckField,
    'Data': TextField,
    'Text': TextareaField,
    'Small Text': TextareaField,
};

/**
 * Minimum column widths per field type (px)
 * Used as base for proportional sizing
 */
const FIELD_MIN_WIDTHS = {
    'Link': 160,
    'Dynamic Link': 160,
    'Select': 120,
    'Date': 120,
    'Datetime': 150,
    'Time': 100,
    'Int': 90,
    'Float': 100,
    'Currency': 110,
    'Percent': 90,
    'Check': 60,
    'Data': 150,
    'Text': 180,
    'Small Text': 180,
};

const getFieldMinWidth = (fieldtype) => FIELD_MIN_WIDTHS[fieldtype] || 120;

/**
 * Calculate total minimum width needed for all visible columns.
 * If less than container, table fills 100%; if more, horizontal scroll.
 */
const calcTableMinWidth = (fields) => {
    const ROW_NUM_WIDTH = 48;  // # column
    const ACTION_WIDTH = 48;   // delete button column
    return ROW_NUM_WIDTH + ACTION_WIDTH + fields.reduce((sum, f) => sum + getFieldMinWidth(f.fieldtype), 0);
};

/**
 * Child Table field for Table fieldtype
 *
 * This component:
 * 1. Fetches metadata for the child doctype (field.options)
 * 2. Renders an editable table using proper Field components
 * 3. Supports: Add row, Delete row
 * 4. Auto-populates rows for new documents based on doctype behaviors
 * 5. Supports read-only columns based on doctype behaviors
 */
export function ChildTableField({
    field,
    value,
    onChange,
    disabled,
    error,
    rowErrors = [],
    childMeta,
    parentDoctype,
    // eslint-disable-next-line no-unused-vars
    isNew = false
}) {
    const { t } = useTranslation();
    const childDoctype = field.options;

    // Quick pick config for this child doctype
    const quickPickConfig = useMemo(() => getQuickPickConfig(childDoctype), [childDoctype]);
    const [showQuickPick, setShowQuickPick] = useState(false);

    // Fetch child meta if not provided
    const { fields: fetchedFields, loading: metaLoading } = useDoctypeMeta(childDoctype, {
        skipLayoutFields: true,
        filterHidden: true,
        useCache: true,
        fetchChildMeta: false,
    });

    // Use provided childMeta or fetched fields (memoized to prevent dependency issues)
    const childFields = useMemo(() => {
        return childMeta?.fields || fetchedFields || [];
    }, [childMeta?.fields, fetchedFields]);

    // Filter to only show fields marked for list view or first few data fields
    // ERPNext renders "in_list_view" fields. If none, it falls back to first few.
    // Always exclude hidden fields (use == for loose comparison since API may return 0/1 or true/false)
    const visibleFields = useMemo(() => {
        if (!childFields.length) return [];

        // Always filter out hidden fields first
        const nonHidden = childFields.filter(f => !f.hidden);

        const inListView = nonHidden.filter(f => f.in_list_view == 1);
        if (inListView.length > 0) {
            return inListView;
        }

        // Fallback: Show first 6 non-section fields
        return nonHidden.filter(f =>
            !['Section Break', 'Column Break', 'Tab Break'].includes(f.fieldtype)
        ).slice(0, 6);
    }, [childFields]);

    // Ensure value is an array (memoized)
    const rows = useMemo(() => {
        return Array.isArray(value) ? value : [];
    }, [value]);

    // Ref to latest rows for async handlers
    const rowsRef = useRef(rows);
    useEffect(() => { rowsRef.current = rows; }, [rows]);

    // Note: Auto-populate is handled at DynamicForm level to prevent duplicates

    // Pagination state for large tables
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
    const needsPagination = rows.length > PAGINATION_THRESHOLD;

    // Calculate paginated rows
    const { paginatedRows, totalPages, startRow, endRow } = useMemo(() => {
        if (!needsPagination) {
            return {
                paginatedRows: rows,
                totalPages: 1,
                startRow: 0,
                endRow: rows.length
            };
        }

        const total = Math.ceil(rows.length / rowsPerPage);
        const validPage = Math.min(currentPage, total || 1);
        const start = (validPage - 1) * rowsPerPage;
        const end = Math.min(start + rowsPerPage, rows.length);

        return {
            paginatedRows: rows.slice(start, end),
            totalPages: total,
            startRow: start,
            endRow: end
        };
    }, [rows, currentPage, rowsPerPage, needsPagination]);

    // Reset to page 1 when rows change significantly
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Refs for keyboard navigation
    const tableRef = useRef(null);
    const cellRefs = useRef({}); // { "rowIdx-colIdx": element }
    const activeCell = useRef({ row: 0, col: 0 });
    const pendingFocusRef = useRef(null);

    /**
     * Focus a specific cell
     */
    const focusCell = useCallback((rowIdx, colIdx) => {
        const key = `${rowIdx}-${colIdx}`;
        const cellEl = cellRefs.current[key];
        if (cellEl) {
            const input = cellEl.querySelector('input, select, textarea, [tabindex]');
            if (input) {
                input.focus();
                activeCell.current = { row: rowIdx, col: colIdx };
            }
        }
    }, []);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((e, rowIdx, colIdx) => {
        const totalRows = rows.length;
        const totalCols = visibleFields.length;

        switch (e.key) {
            case 'Tab':
                e.preventDefault();
                if (e.shiftKey) {
                    // Move backward
                    if (colIdx > 0) {
                        focusCell(rowIdx, colIdx - 1);
                    } else if (rowIdx > 0) {
                        focusCell(rowIdx - 1, totalCols - 1);
                    }
                } else {
                    // Move forward
                    if (colIdx < totalCols - 1) {
                        focusCell(rowIdx, colIdx + 1);
                    } else if (rowIdx < totalRows - 1) {
                        focusCell(rowIdx + 1, 0);
                    }
                }
                break;

            case 'Enter':
                e.preventDefault();
                // Move to next row, same column
                if (rowIdx < totalRows - 1) {
                    focusCell(rowIdx + 1, colIdx);
                }
                break;

            case 'ArrowDown':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (rowIdx < totalRows - 1) {
                        focusCell(rowIdx + 1, colIdx);
                    }
                }
                break;

            case 'ArrowUp':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (rowIdx > 0) {
                        focusCell(rowIdx - 1, colIdx);
                    }
                }
                break;

            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (colIdx < totalCols - 1) {
                        focusCell(rowIdx, colIdx + 1);
                    }
                }
                break;

            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    if (colIdx > 0) {
                        focusCell(rowIdx, colIdx - 1);
                    }
                }
                break;
        }
    }, [rows.length, visibleFields.length, focusCell]);

    /**
     * Parse Excel/TSV clipboard data
     */
    const parseClipboardData = useCallback((text) => {
        if (!text) return [];

        // Split by newlines, then by tabs
        const lines = text.trim().split(/\r?\n/);
        return lines.map(line => line.split('\t'));
    }, []);

    /**
     * Handle paste from clipboard (Excel support)
     */
    const handlePaste = useCallback((e, startRowIdx, startColIdx) => {
        const clipboardData = e.clipboardData?.getData('text/plain');
        if (!clipboardData) return;

        const pastedData = parseClipboardData(clipboardData);
        if (pastedData.length === 0) return;

        // Check if this looks like multi-cell paste (has tabs or multiple lines)
        const isMultiCell = clipboardData.includes('\t') || clipboardData.includes('\n');
        if (!isMultiCell) return; // Let default paste behavior handle single values

        e.preventDefault();

        const newRows = [...rows];
        const totalCols = visibleFields.length;

        pastedData.forEach((rowData, pasteRowIdx) => {
            const targetRowIdx = startRowIdx + pasteRowIdx;

            // Create new rows if needed
            while (targetRowIdx >= newRows.length) {
                const newRow = {
                    doctype: childDoctype,
                    __islocal: 1,
                    idx: newRows.length + 1,
                };
                childFields.forEach(f => {
                    newRow[f.fieldname] = f.default ?? null;
                });
                newRows.push(newRow);
            }

            rowData.forEach((cellValue, pasteColIdx) => {
                const targetColIdx = startColIdx + pasteColIdx;
                if (targetColIdx >= totalCols) return;

                const fieldDef = visibleFields[targetColIdx];
                if (!fieldDef || fieldDef.read_only === 1) return;

                // Convert value based on field type
                let convertedValue = cellValue.trim();
                if (['Int', 'Float', 'Currency', 'Percent'].includes(fieldDef.fieldtype)) {
                    const num = parseFloat(convertedValue.replace(/,/g, ''));
                    convertedValue = isNaN(num) ? 0 : num;
                } else if (fieldDef.fieldtype === 'Check') {
                    convertedValue = ['1', 'true', 'yes', 'có', 'x'].includes(convertedValue.toLowerCase()) ? 1 : 0;
                }

                newRows[targetRowIdx][fieldDef.fieldname] = convertedValue;
            });
        });

        // Re-index all rows
        newRows.forEach((row, i) => {
            row.idx = i + 1;
        });

        onChange(field.fieldname, newRows);
    }, [rows, visibleFields, childFields, childDoctype, field.fieldname, onChange, parseClipboardData]);

    /**
     * Focus the first cell of newly added row
     */
    useEffect(() => {
        if (pendingFocusRef.current !== null) {
            const rowIdx = pendingFocusRef.current;
            pendingFocusRef.current = null;
            // Delay to let DOM update
            setTimeout(() => focusCell(rowIdx, 0), 50);
        }
    }, [rows.length, focusCell]);

    /**
     * Add new rows - for luống tables, add 20 rows with auto STT
     */
    const addRow = useCallback(() => {
        const isLuong = isLuongChildDoctype(childDoctype);
        const addCount = isLuong ? LUONG_BATCH_ADD_COUNT : 1;
        const newRows = [...rows];

        for (let i = 0; i < addCount; i++) {
            const newIdx = newRows.length + 1;
            const newRow = {
                doctype: childDoctype,
                __islocal: 1,
                idx: newIdx,
            };

            // Initialize fields with defaults
            childFields.forEach(f => {
                if (f.default !== undefined && f.default !== null) {
                    newRow[f.fieldname] = f.default;
                } else {
                    newRow[f.fieldname] = null;
                }
            });

            // Auto-fill so_luong (STT) for luống tables: L1, L2, ...
            if (isLuong) {
                newRow.so_luong = `L${newIdx}`;
                newRow.gia_tri = 0;
            }

            newRows.push(newRow);
        }

        pendingFocusRef.current = rows.length; // Focus the first new row
        onChange(field.fieldname, newRows);
    }, [rows, childFields, childDoctype, field.fieldname, onChange]);

    /**
     * Delete a row by index
     */
    const deleteRow = useCallback((idx) => {
        const newRows = rows.filter((_, i) => i !== idx);
        // Re-index
        newRows.forEach((row, i) => {
            row.idx = i + 1;
        });
        onChange(field.fieldname, newRows);
    }, [rows, field.fieldname, onChange]);

    /**
     * Update a cell value, with optional async handler for auto-populating related fields
     */
    const updateCell = useCallback((rowIdx, fieldname, cellValue) => {
        const newRows = rows.map((row, i) => {
            if (i === rowIdx) {
                return { ...row, [fieldname]: cellValue };
            }
            return row;
        });
        onChange(field.fieldname, newRows);

        // Check for async child field change handler (e.g., auto-fill BOM when dish selected)
        const handler = getChildFieldChangeHandler(childDoctype, fieldname);
        if (handler) {
            const result = handler(cellValue, newRows[rowIdx]);
            if (result?.updates) {
                // Synchronous updates
                const updatedRows = newRows.map((row, i) => {
                    if (i === rowIdx) return { ...row, ...result.updates };
                    return row;
                });
                onChange(field.fieldname, updatedRows);
            } else if (result?.api) {
                // Async API call - use rowsRef for latest state
                apiClient.post(result.api.method, result.api.args)
                    .then((response) => {
                        const updates = result.mapResponse(response);
                        if (updates && Object.keys(updates).length > 0) {
                            const latestRows = rowsRef.current;
                            const updatedRows = latestRows.map((row, i) => {
                                if (i === rowIdx) return { ...row, ...updates };
                                return row;
                            });
                            onChange(field.fieldname, updatedRows);
                        }
                    })
                    .catch((err) => {
                        console.warn(`[ChildTable] Async handler failed for ${childDoctype}.${fieldname}:`, err);
                    });
            }
        }
    }, [rows, field.fieldname, onChange, childDoctype]);

    /**
     * Handle quick pick: add multiple items at once
     */
    const handleQuickPickAdd = useCallback((selectedItems) => {
        if (!quickPickConfig || selectedItems.length === 0) return;

        const newRows = [...rows];
        selectedItems.forEach((itemName) => {
            const newRow = {
                doctype: childDoctype,
                __islocal: 1,
                idx: newRows.length + 1,
                [quickPickConfig.targetField]: itemName,
            };
            // Initialize other fields with defaults
            childFields.forEach(f => {
                if (f.fieldname !== quickPickConfig.targetField) {
                    newRow[f.fieldname] = f.default ?? null;
                }
            });
            newRows.push(newRow);
        });

        onChange(field.fieldname, newRows);

        // Trigger async handlers for each new row (e.g., auto-fill BOM)
        const handler = getChildFieldChangeHandler(childDoctype, quickPickConfig.targetField);
        if (handler) {
            selectedItems.forEach((itemName, i) => {
                const rowIdx = rows.length + i;
                const result = handler(itemName, newRows[rowIdx]);
                if (result?.api) {
                    apiClient.post(result.api.method, result.api.args)
                        .then((response) => {
                            const updates = result.mapResponse(response);
                            if (updates && Object.keys(updates).length > 0) {
                                const latestRows = rowsRef.current;
                                const updatedRows = latestRows.map((row, idx) => {
                                    if (idx === rowIdx) return { ...row, ...updates };
                                    return row;
                                });
                                onChange(field.fieldname, updatedRows);
                            }
                        })
                        .catch(() => {});
                }
            });
        }
    }, [rows, childFields, childDoctype, quickPickConfig, field.fieldname, onChange]);

    // Existing values for quick pick (to disable already-selected items)
    const existingQuickPickValues = useMemo(() => {
        if (!quickPickConfig) return [];
        return rows.map(r => r[quickPickConfig.targetField]).filter(Boolean);
    }, [rows, quickPickConfig]);

    if (metaLoading && !childMeta) {
        return (
            <div className="space-y-2">
                <label className="block text-[13px] font-medium text-foreground">
                    {field.label}
                </label>
                <div className="h-20 bg-muted rounded-lg animate-pulse flex items-center justify-center text-[13px] text-muted-foreground">
                    {t('table.loading')}
                </div>
            </div>
        );
    }

    if (childFields.length === 0 && !metaLoading) {
        // Fallback if no fields found (or not loaded yet)
        return null;
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="block text-[13px] font-medium text-foreground">
                    {field.label}
                    {field.reqd === 1 && <span className="text-destructive ml-1">*</span>}
                </label>
            </div>

            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm flex flex-col">
                {/* Table container with max-height for scrolling */}
                <div className="overflow-auto max-h-[400px] sm:max-h-[500px]">
                    <table ref={tableRef} className="w-full text-xs sm:text-sm" style={{ minWidth: calcTableMinWidth(visibleFields) }}>
                        <thead className="bg-muted/50 border-b border-border sticky top-0 z-10">
                            <tr>
                                <th className="w-12 px-2 py-2.5 sm:py-3 text-center text-[12px] font-medium text-muted-foreground uppercase whitespace-nowrap">
                                    #
                                </th>
                                {visibleFields.map(f => {
                                    const isNumeric = ['Currency', 'Float', 'Int', 'Percent'].includes(f.fieldtype);
                                    const align = isNumeric ? 'text-right' : 'text-left';
                                    return (
                                    <th
                                        key={f.fieldname}
                                        style={{ minWidth: getFieldMinWidth(f.fieldtype) }}
                                        className={`px-2 sm:px-3 py-2.5 sm:py-3 ${align} text-[12px] font-medium text-muted-foreground whitespace-nowrap ${f.reqd ? 'font-semibold' : ''}`}
                                    >
                                        {f.label}
                                        {f.reqd === 1 && <span className="text-destructive ml-0.5">*</span>}
                                    </th>
                                    );
                                })}
                                {!disabled && field.read_only !== 1 && (
                                    <th className="w-12 px-2 py-2.5 sm:py-3"></th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {paginatedRows.map((row, localIdx) => {
                                // Calculate actual row index in the full array
                                const rowIdx = startRow + localIdx;

                                // Check if this row has validation errors
                                const rowError = rowErrors?.find(e => e.row === rowIdx + 1);
                                const hasRowError = !!rowError;

                                return (
                                    <tr
                                        key={row.name || row.idx || rowIdx}
                                        className={`group hover:bg-muted/30 transition-colors ${hasRowError ? 'bg-destructive/10' : ''}`}
                                    >
                                        <td className={`px-2 py-2 sm:py-2.5 text-center text-xs whitespace-nowrap ${hasRowError ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>
                                            {rowIdx + 1}
                                        </td>
                                        {visibleFields.map((f, colIdx) => {
                                            // Check if this Link field has a configured filter in doctype.behaviors
                                            const useFilteredLink = f.fieldtype === 'Link' && hasLinkFieldFilter(childDoctype, f.fieldname);
                                            const Component = useFilteredLink
                                                ? FilteredLinkField
                                                : (TABLE_FIELD_COMPONENTS[f.fieldtype] || TextField);

                                            // Create a modified field definition for table view
                                            // Remove label to prevent it from rendering inside the cell
                                            const cellField = { ...f, label: null, description: null };
                                            const cellKey = `${rowIdx}-${colIdx}`;

                                            // Check if this specific cell has an error
                                            const hasCellError = rowError?.fields?.[f.fieldname];

                                            const isNumericField = ['Currency', 'Float', 'Int', 'Percent'].includes(f.fieldtype);

                                            // Extra props for FilteredLinkField
                                            const extraProps = useFilteredLink ? {
                                                formData: row,
                                                parentDoctype: childDoctype,
                                            } : {};

                                            return (
                                                <td
                                                    key={f.fieldname}
                                                    ref={el => { cellRefs.current[cellKey] = el; }}
                                                    style={{ minWidth: getFieldMinWidth(f.fieldtype) }}
                                                    className={`px-2 sm:px-3 py-2 sm:py-2.5 align-top relative ${isNumericField ? 'text-right' : ''} ${hasCellError ? 'bg-destructive/20' : ''}`}
                                                    onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                                    onPaste={(e) => handlePaste(e, rowIdx, colIdx)}
                                                >
                                                    <Component
                                                        field={cellField}
                                                        value={row[f.fieldname]}
                                                        onChange={(name, val) => updateCell(rowIdx, name, val)}
                                                        disabled={
                                                            disabled ||
                                                            field.read_only === 1 ||
                                                            f.read_only === 1 ||
                                                            (parentDoctype && isChildColumnReadOnly(parentDoctype, field.fieldname, f.fieldname, childDoctype))
                                                        }
                                                        error={hasCellError ? 'Required' : null}
                                                        {...extraProps}
                                                    />
                                                </td>
                                            );
                                        })}
                                        {!disabled && field.read_only !== 1 && (
                                            <td className="px-2 py-2 sm:py-2.5 text-center align-middle">
                                                <button
                                                    type="button"
                                                    onClick={() => deleteRow(rowIdx)}
                                                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded opacity-100 sm:opacity-0 group-hover:opacity-100 transition-[color,background-color,opacity]"
                                                    title={t('table.delete_row')}
                                                    aria-label={`${t('table.delete_row')} ${rowIdx + 1}`}
                                                >
                                                    <X className="w-4 h-4" aria-hidden="true" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}

                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={visibleFields.length + 2}
                                        className="px-4 py-8 text-center text-muted-foreground italic"
                                    >
                                        {t('table.no_data')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls for large tables */}
                {needsPagination && (
                    <div className="border-t border-border bg-muted/50 px-2 sm:px-3 py-1.5 sm:py-2 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground">
                            <span className="hidden sm:inline">{t('common.showing')} {startRow + 1}-{endRow} / {rows.length} {t('common.rows')}</span>
                            <span className="sm:hidden">{startRow + 1}-{endRow}/{rows.length}</span>
                            <select
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                aria-label="Rows per page"
                                className="px-1.5 sm:px-2 py-0.5 sm:py-1 border border-border rounded-lg bg-background text-xs text-foreground"
                            >
                                {ROWS_PER_PAGE_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center gap-0.5 sm:gap-1">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="p-1 sm:p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={t('table.first_page')}
                                aria-label={t('table.first_page')}
                            >
                                <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 sm:p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={t('table.prev_page')}
                                aria-label={t('table.prev_page')}
                            >
                                <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                            </button>
                            <span className="px-2 sm:px-3 py-0.5 sm:py-1 bg-background border border-border rounded text-foreground text-xs">
                                {currentPage}/{totalPages}
                            </span>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 sm:p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={t('table.next_page')}
                                aria-label={t('table.next_page')}
                            >
                                <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage === totalPages}
                                className="p-1 sm:p-1.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title={t('table.last_page')}
                                aria-label={t('table.last_page')}
                            >
                                <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Add Row Button & Quick Pick & Keyboard Hints - Always visible */}
                <div className="border-t border-border bg-muted/30 p-1.5 sm:p-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {quickPickConfig && !disabled && field.read_only !== 1 && (
                            <button
                                type="button"
                                onClick={() => setShowQuickPick(true)}
                                aria-label={quickPickConfig.label || 'Quick pick items'}
                                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg shadow-sm transition-colors"
                            >
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                                <span className="hidden sm:inline">{quickPickConfig.label}</span>
                                <span className="sm:hidden">Chọn</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={addRow}
                            disabled={disabled || field.read_only === 1}
                            aria-label={t('common.add_row')}
                            className={cn(
                                "flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium rounded-lg shadow-sm transition-colors",
                                quickPickConfig
                                    ? "text-foreground bg-muted hover:bg-muted/80 border border-border"
                                    : "text-white bg-primary hover:bg-primary/90",
                                "disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                            )}
                        >
                            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
                            <span className="hidden sm:inline">{t('common.add_row')}</span>
                            <span className="sm:hidden">{t('common.add')}</span>
                        </button>
                    </div>
                    {!disabled && field.read_only !== 1 && (
                        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs">Tab</kbd>
                                <span>{t('bulk.hint_tab')}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-xs">Enter</kbd>
                                <span>{t('bulk.hint_enter')}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Clipboard className="w-3 h-3" />
                                <span>{t('bulk.hint_paste')}</span>
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {error && (
                <p className="text-sm text-destructive mt-1">{error}</p>
            )}
            {field.description && !error && (
                <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
            )}

            {/* Quick Pick Modal */}
            {quickPickConfig && (
                <QuickPickModal
                    isOpen={showQuickPick}
                    onClose={() => setShowQuickPick(false)}
                    onAdd={handleQuickPickAdd}
                    config={quickPickConfig}
                    existingValues={existingQuickPickValues}
                />
            )}
        </div>
    );
}

ChildTableField.propTypes = {
    field: PropTypes.object.isRequired,
    value: PropTypes.array,
    onChange: PropTypes.func.isRequired,
    disabled: PropTypes.bool,
    error: PropTypes.string,
    rowErrors: PropTypes.array,
    childMeta: PropTypes.object,
    parentDoctype: PropTypes.string,
    isNew: PropTypes.bool,
};

export default ChildTableField;
