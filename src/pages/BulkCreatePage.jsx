/**
 * BulkCreatePage - Spreadsheet-like bulk document creation
 *
 * MIGRATED TO REACT QUERY
 *
 * Before:
 * - Manual createDoc calls in loop
 * - No cache invalidation
 *
 * After:
 * - useMutation for bulk create with cache invalidation
 * - Better error handling per row
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDoctypeMeta } from '../hooks/useDoctypeMeta';
import { DocumentService } from '../api/domains';
import { useTranslation } from '../hooks/useTranslation';
import { useToast } from '../hooks/useToast';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Autocomplete from '../components/ui/Autocomplete';
import { Plus, Trash2, Save, ArrowLeft, Clipboard } from 'lucide-react';

const BulkCreatePage = () => {
    const { doctype } = useParams();
    const navigate = useNavigate();
    const { t, getDoctypeLabel } = useTranslation();
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { meta: _meta, fields, loading, error } = useDoctypeMeta(doctype, {
        filterHidden: true,
        filterReadOnly: true,
        skipLayoutFields: true,
    });

    const [rows, setRows] = useState([]);

    // Refs for keyboard navigation
    const cellRefs = useRef({});
    const pendingFocusRef = useRef(null);
    const handleAddRowRef = useRef(null);

    // Determine columns (simple logic: required fields or first 6 data fields)
    const columns = useMemo(() => fields.slice(0, 6), [fields]);

    // Bulk create mutation
    const bulkCreateMutation = useMutation({
        mutationFn: async (validRows) => {
            const results = { success: 0, errors: [] };

            for (const row of validRows) {
                try {
                    const { _id, ...data } = row;
                    await DocumentService.create(doctype, data);
                    results.success++;
                } catch (err) {
                    results.errors.push(`Row error: ${err.message}`);
                }
            }

            return results;
        },
        onSuccess: (results) => {
            // Invalidate list queries
            queryClient.invalidateQueries({ queryKey: ['list', doctype] });

            if (results.success > 0) {
                toast.success(t('common.success'), t('bulk.created_success').replace('{count}', results.success));
            }

            if (results.errors.length > 0) {
                toast.error(t('common.error'), t('bulk.errors_count', { count: results.errors.length }));
            } else {
                navigate(`/app/doctype/${doctype}`);
            }
        },
        onError: (err) => {
            toast.error(t('common.error'), err.message);
        },
    });

    /**
     * Focus a specific cell (defined early to avoid hoisting issues)
     */
    const focusCell = useCallback((rowIdx, colIdx) => {
        const key = `${rowIdx}-${colIdx}`;
        const cellEl = cellRefs.current[key];
        if (cellEl) {
            const input = cellEl.querySelector('input, select, textarea, [tabindex]');
            if (input) {
                input.focus();
            }
        }
    }, []);

    // Initialize with one empty row
    useEffect(() => {
        if (!loading && rows.length === 0) {
            handleAddRow();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loading]);

    // Focus management for newly added rows
    useEffect(() => {
        if (pendingFocusRef.current !== null) {
            const rowIdx = pendingFocusRef.current;
            pendingFocusRef.current = null;
            setTimeout(() => focusCell(rowIdx, 0), 50);
        }
    }, [rows.length, focusCell]);

    /**
     * Handle keyboard navigation
     */
    const handleKeyDown = useCallback((e, rowIdx, colIdx) => {
        const totalRows = rows.length;
        const totalCols = columns.length;

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
                    } else {
                        // At last cell, add new row
                        handleAddRowRef.current?.();
                    }
                }
                break;

            case 'Enter':
                e.preventDefault();
                // Move to next row, same column
                if (rowIdx < totalRows - 1) {
                    focusCell(rowIdx + 1, colIdx);
                } else {
                    // At last row, add new row and focus
                    handleAddRowRef.current?.();
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
    }, [rows.length, columns.length, focusCell]);

    /**
     * Parse Excel/TSV clipboard data
     */
    const parseClipboardData = useCallback((text) => {
        if (!text) return [];
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

        // Check if this looks like multi-cell paste
        const isMultiCell = clipboardData.includes('\t') || clipboardData.includes('\n');
        if (!isMultiCell) return; // Let default paste behavior handle single values

        e.preventDefault();

        setRows(prevRows => {
            const newRows = [...prevRows];
            const totalCols = columns.length;

            pastedData.forEach((rowData, pasteRowIdx) => {
                const targetRowIdx = startRowIdx + pasteRowIdx;

                // Create new rows if needed
                while (targetRowIdx >= newRows.length) {
                    const newRow = { _id: Date.now() + newRows.length };
                    columns.forEach(col => {
                        newRow[col.fieldname] = '';
                    });
                    newRows.push(newRow);
                }

                rowData.forEach((cellValue, pasteColIdx) => {
                    const targetColIdx = startColIdx + pasteColIdx;
                    if (targetColIdx >= totalCols) return;

                    const col = columns[targetColIdx];
                    if (!col) return;

                    // Convert value based on field type
                    let convertedValue = cellValue.trim();
                    if (['Int', 'Float', 'Currency', 'Percent'].includes(col.fieldtype)) {
                        const num = parseFloat(convertedValue.replace(/,/g, ''));
                        convertedValue = isNaN(num) ? '' : num;
                    } else if (col.fieldtype === 'Check') {
                        convertedValue = ['1', 'true', 'yes', 'có', 'x'].includes(convertedValue.toLowerCase()) ? 1 : 0;
                    }

                    newRows[targetRowIdx][col.fieldname] = convertedValue;
                });
            });

            return newRows;
        });

        toast.success(t('bulk.paste_success'), t('bulk.paste_rows', { count: pastedData.length }));
    }, [columns, parseClipboardData, toast, t]);

    const handleAddRow = useCallback(() => {
        const newRow = { _id: Date.now() };
        columns.forEach(col => {
            newRow[col.fieldname] = '';
        });
        setRows(prev => {
            pendingFocusRef.current = prev.length; // Focus the new row
            return [...prev, newRow];
        });
    }, [columns]);

    // Keep ref in sync
    handleAddRowRef.current = handleAddRow;

    const handleRemoveRow = useCallback((id) => {
        setRows(prev => {
            if (prev.length <= 1) return prev;
            return prev.filter(row => row._id !== id);
        });
    }, []);

    const handleCellChange = useCallback((id, fieldname, value) => {
        setRows(prev => prev.map(row =>
            row._id === id ? { ...row, [fieldname]: value } : row
        ));
    }, []);

    const handleSaveAll = () => {
        // Filter out empty rows
        const validRows = rows.filter(row =>
            Object.keys(row).some(key => key !== '_id' && row[key])
        );

        if (validRows.length === 0) {
            toast.warning('Warning', t('bulk.enter_data_first'));
            return;
        }

        bulkCreateMutation.mutate(validRows);
    };

    if (loading) return <div className="p-6">{t('common.loading')}</div>;
    if (error) return <div className="p-6 text-destructive">{t('common.error')}: {error}</div>;

    return (
        <div className="p-6 max-w-[95%] mx-auto">
            <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <button onClick={() => navigate(`/app/doctype/${doctype}`)} className="hover:text-foreground flex items-center gap-1">
                        <ArrowLeft className="w-4 h-4" /> {getDoctypeLabel(doctype)}
                    </button>
                    <span>/</span>
                    <span>{t('bulk.title')}</span>
                </div>
                <h1 className="text-2xl font-bold">{t('bulk.quick_add')} {getDoctypeLabel(doctype)}</h1>
            </div>

            <Card variant="solid" className="overflow-visible min-h-[500px]">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-xs uppercase text-foreground">
                            <tr>
                                <th className="px-4 py-3 text-center w-12">#</th>
                                {columns.map(col => (
                                    <th key={col.fieldname} className="px-4 py-3 min-w-[150px]">
                                        {col.label} {col.reqd ? <span className="text-destructive">*</span> : ''}
                                    </th>
                                ))}
                                <th className="px-4 py-3 text-center w-12"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-card">
                            {rows.map((row, rowIdx) => (
                                <tr key={row._id} className="hover:bg-muted/50 group bg-card">
                                    <td className="px-4 py-2 text-center text-muted-foreground">{rowIdx + 1}</td>
                                    {columns.map((col, colIdx) => (
                                        <td
                                            key={col.fieldname}
                                            ref={el => { cellRefs.current[`${rowIdx}-${colIdx}`] = el; }}
                                            className="px-2 py-2"
                                            onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                            onPaste={(e) => handlePaste(e, rowIdx, colIdx)}
                                        >
                                            {col.fieldtype === 'Link' ? (
                                                <Autocomplete
                                                    doctype={col.options}
                                                    value={row[col.fieldname] || ''}
                                                    onChange={(val) => handleCellChange(row._id, col.fieldname, val)}
                                                    placeholder={col.label}
                                                    inputClassName="h-[32px] box-border w-full text-sm bg-card border-border text-foreground"
                                                    className="w-full"
                                                />
                                            ) : (
                                                <input
                                                    type={col.fieldtype === 'Int' || col.fieldtype === 'Currency' ? 'number' : 'text'}
                                                    className="w-full px-2 py-1.5 border border-border rounded focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors text-sm h-[32px] box-border bg-card text-foreground placeholder:text-muted-foreground"
                                                    value={row[col.fieldname] || ''}
                                                    onChange={(e) => handleCellChange(row._id, col.fieldname, e.target.value)}
                                                    placeholder={col.label}
                                                />
                                            )}
                                        </td>
                                    ))}
                                    <td className="px-2 py-2 text-center">
                                        <button
                                            onClick={() => handleRemoveRow(row._id)}
                                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                                            disabled={rows.length === 1}
                                            title={t('table.delete_row')}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-border bg-muted/50 flex justify-between items-center rounded-b-lg">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={handleAddRow}>
                            <Plus className="w-4 h-4 mr-2" /> {t('common.add_row')}
                        </Button>

                        {/* Keyboard Hints */}
                        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Tab</kbd>
                                <span>{t('bulk.hint_tab')}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd>
                                <span>{t('bulk.hint_enter')}</span>
                            </span>
                            <span className="flex items-center gap-1">
                                <Clipboard className="w-3 h-3" />
                                <span>{t('bulk.hint_paste')}</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => navigate(`/app/doctype/${doctype}`)}>
                            {t('common.cancel')}
                        </Button>
                        <Button variant="primary" onClick={handleSaveAll} disabled={bulkCreateMutation.isPending}>
                            <Save className="w-4 h-4 mr-2" />
                            {bulkCreateMutation.isPending ? t('bulk.saving') : t('bulk.save_all')}
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default BulkCreatePage;
