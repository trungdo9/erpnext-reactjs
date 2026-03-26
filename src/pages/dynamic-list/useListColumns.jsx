/**
 * useListColumns - Column definition builder for DynamicListView
 * 
 * Builds TanStack Table column definitions from either:
 * - External column config (externalColumns prop)
 * - DocType metadata (meta.fields)
 */

import { useMemo, useCallback } from 'react';
import { formatDate, formatDateTime, getCurrentNumberLocale } from '../../utils/dateUtils';
import Badge from '../../components/ui/Badge';
import { LIST_EXTRA_FIELDS } from '../../config/doctype.behaviors';

// System-generated fields to hide from list view
const SYSTEM_FIELDS = [
    'name', 'modified', 'creation', 'modified_by', 'owner',
    'docstatus', 'idx', '_user_tags', '_comments', '_assign', '_liked_by'
];

/**
 * Format a cell value based on its field type
 */
function formatCellValue(value, fieldtype, fieldname, { isFirst, t }) {
    if (value === null || value === undefined) return fieldtype ? '-' : value;

    // Status badge
    if (fieldname === 'status' || fieldname === 'workflow_state') {
        const colors = {
            'Draft': 'default', 'Submitted': 'success', 'Cancelled': 'destructive',
            'Pending': 'secondary', 'Approved': 'success', 'Rejected': 'destructive'
        };
        return <Badge variant={colors[value] || 'default'}>{t(`status.${value}`, value)}</Badge>;
    }

    if (fieldtype === 'Date') return formatDate(value);
    if (fieldtype === 'Datetime' || fieldname === 'modified' || fieldname === 'creation') return formatDateTime(value);

    if (fieldtype === 'Currency') {
        return parseFloat(value).toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    if (fieldtype === 'Float') {
        return parseFloat(value).toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    }
    if (fieldtype === 'Int') {
        return parseInt(value).toLocaleString(getCurrentNumberLocale());
    }
    if (fieldtype === 'Percent') {
        const f = parseFloat(value).toLocaleString(getCurrentNumberLocale(), { minimumFractionDigits: 1, maximumFractionDigits: 2 });
        return `${f}%`;
    }
    if (fieldtype === 'Check') return value ? 'Yes' : 'No';

    const str = String(value);
    if (isFirst && str) return <span className="text-primary font-medium hover:text-primary/80 cursor-pointer">{str}</span>;
    return str || value;
}

export function useListColumns({ isExternalMode, externalColumns, meta, t, getFieldLabel, language }) {
    // Build field accessors for API (includes 'name' for row navigation)
    const fieldAccessors = useMemo(() => {
        if (isExternalMode) return [];
        if (!meta) return ['modified', 'name'];
        const cols = [];
        // Inject config-driven extra fields first (e.g. employee_number for Employee)
        const extraFields = LIST_EXTRA_FIELDS[meta.name] || [];
        const fieldNames = meta.fields?.map(f => f.fieldname) || [];
        extraFields.forEach(fn => {
            if (fieldNames.includes(fn) && !cols.includes(fn)) cols.push(fn);
        });
        if (meta.title_field && meta.title_field !== 'name' && !cols.includes(meta.title_field)) cols.push(meta.title_field);
        const listViewFields = (meta.fields || [])
            .filter(f => f.inListView && !cols.includes(f.fieldname) && f.fieldname !== 'name')
            .filter(f => !['Section Break', 'Column Break', 'Tab Break', 'HTML', 'Button'].includes(f.fieldtype))
            .map(f => f.fieldname);
        cols.push(...listViewFields);
        if (fieldNames.includes('status') && !cols.includes('status')) cols.push('status');
        if (fieldNames.includes('workflow_state') && !cols.includes('workflow_state')) cols.push('workflow_state');
        if (!cols.includes('modified')) cols.push('modified');
        cols.push('name');
        if (!cols.includes('docstatus')) cols.push('docstatus');
        return [...new Set(cols)];
    }, [isExternalMode, meta]);

    // Visible columns (exclude system fields if we have meaningful user fields)
    const visibleFields = useMemo(() => {
        if (isExternalMode) {
            return (externalColumns || []).map(c => c.fieldname);
        }
        const hasMeaningfulFields = meta?.title_field ||
            (meta?.fields || []).some(f => f.inListView && !SYSTEM_FIELDS.includes(f.fieldname));
        if (hasMeaningfulFields) {
            return fieldAccessors.filter(f => !SYSTEM_FIELDS.includes(f));
        }
        return fieldAccessors;
    }, [isExternalMode, externalColumns, fieldAccessors, meta]);

    // Build TanStack Table column definitions
    const columns = useMemo(() => {
        // External mode: build from externalColumns
        if (isExternalMode && externalColumns?.length > 0) {
            return externalColumns.map((col, idx) => {
                const fieldtype = col.fieldtype || 'Data';
                const isFirst = idx === 0;
                return {
                    accessorKey: col.fieldname,
                    header: getFieldLabel(col.label, col.fieldname) || col.fieldname,
                    cell: ({ getValue }) => formatCellValue(getValue(), fieldtype, col.fieldname, { isFirst, t, language }),
                    meta: {
                        fieldtype,
                        align: ['Currency', 'Float', 'Int', 'Percent'].includes(fieldtype) ? 'text-right'
                            : fieldtype === 'Check' ? 'text-center' : 'text-left',
                    },
                };
            });
        }

        // Doctype mode: build from meta fields
        const cols = [];

        // Checkbox column
        cols.push({
            id: 'select',
            header: ({ table }) => (
                <input
                    type="checkbox"
                    className="rounded border-border checked:bg-primary checked:border-primary focus:ring-primary"
                    checked={table.getIsAllRowsSelected()}
                    onChange={table.getToggleAllRowsSelectedHandler()}
                />
            ),
            cell: ({ row }) => (
                <div onClick={e => e.stopPropagation()}>
                    <input
                        type="checkbox"
                        className="rounded border-border checked:bg-primary checked:border-primary focus:ring-primary"
                        checked={row.getIsSelected()}
                        onChange={row.getToggleSelectedHandler()}
                    />
                </div>
            ),
            size: 50,
        });

        // Status indicator dot column
        cols.push({
            id: 'status_indicator',
            header: '',
            cell: ({ row }) => {
                const docstatus = row.original.docstatus;
                const statusColors = {
                    0: 'bg-emerald-400',
                    1: 'bg-emerald-500',
                    2: 'bg-red-500',
                };
                const colorClass = statusColors[docstatus] ?? 'bg-muted-foreground';
                return (
                    <span
                        className={`inline-block w-1.5 h-1.5 rounded-full ${colorClass}`}
                        title={docstatus === 0 ? 'Draft' : docstatus === 1 ? 'Submitted' : docstatus === 2 ? 'Cancelled' : ''}
                    />
                );
            },
            size: 32,
        });

        // Data columns
        const firstVisibleField = visibleFields[0];
        visibleFields.forEach(fieldname => {
            const fieldMeta = meta?.fields?.find(f => f.fieldname === fieldname);
            const fieldtype = fieldMeta?.fieldtype || (fieldname === 'modified' ? 'Datetime' : 'Data');
            const isFirstColumn = fieldname === firstVisibleField || fieldname === meta?.title_field;

            cols.push({
                accessorKey: fieldname,
                header: getFieldLabel(fieldMeta?.label, fieldname) || fieldname.replace(/_/g, ' '),
                cell: ({ getValue }) => formatCellValue(getValue(), fieldtype, fieldname, { isFirst: isFirstColumn, t, language }),
                meta: {
                    fieldtype, fieldMeta,
                    align: ['Currency', 'Float', 'Int', 'Percent'].includes(fieldtype) ? 'text-right'
                        : (fieldname === 'status' || fieldname === 'workflow_state' || fieldtype === 'Check') ? 'text-center'
                            : 'text-left',
                },
            });
        });

        return cols;
    }, [isExternalMode, externalColumns, visibleFields, meta, t, getFieldLabel, language]);

    // Get field type for filter dropdown
    const getFieldType = useCallback((fieldname) => {
        if (isExternalMode) {
            const col = externalColumns?.find(c => c.fieldname === fieldname);
            if (!col) return 'text';
            if (['Int', 'Float', 'Currency', 'Percent'].includes(col.fieldtype)) return 'number';
            if (['Date', 'Datetime'].includes(col.fieldtype)) return 'date';
            return 'text';
        }
        if (!meta?.fields) return fieldname === 'modified' || fieldname === 'creation' ? 'date' : 'text';
        const field = meta.fields.find(f => f.fieldname === fieldname);
        if (!field) return fieldname === 'modified' || fieldname === 'creation' ? 'date' : 'text';
        if (['Int', 'Float', 'Currency', 'Percent'].includes(field.fieldtype)) return 'number';
        if (['Date', 'Datetime'].includes(field.fieldtype)) return 'date';
        return 'text';
    }, [isExternalMode, externalColumns, meta]);

    // Get filter column label
    const getFilterColumnLabel = useCallback((col) => {
        if (isExternalMode) {
            const extCol = externalColumns?.find(c => c.fieldname === col);
            const rawLabel = extCol?.label || col.replace(/_/g, ' ');
            return getFieldLabel(rawLabel, col) || rawLabel;
        }
        const fm = meta?.fields?.find(f => f.fieldname === col);
        const rawLabel = fm?.label || col.replace(/_/g, ' ');
        return getFieldLabel(rawLabel, col) || rawLabel;
    }, [isExternalMode, externalColumns, meta, getFieldLabel]);

    return {
        fieldAccessors,
        visibleFields,
        columns,
        getFieldType,
        getFilterColumnLabel,
    };
}
