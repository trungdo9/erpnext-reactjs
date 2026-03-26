/**
 * PivotTableView - Wrapper around react-pivottable
 *
 * Takes ERPNext report data (columns + rows from query_report.run)
 * and renders an interactive drag-and-drop pivot table.
 */

import { useState, useMemo } from 'react';
import PivotTableUI from 'react-pivottable/PivotTableUI';
import TableRenderers from 'react-pivottable/TableRenderers';
import 'react-pivottable/pivottable.css';
import { useTranslation } from '../../hooks/useTranslation';

export function PivotTableView({ data, columns }) {
    const { t } = useTranslation();
    const [pivotState, setPivotState] = useState({});

    // Normalize data: convert array-of-arrays to array-of-objects using column headers
    const normalizedData = useMemo(() => {
        if (!data || data.length === 0 || !columns || columns.length === 0) return [];

        // If first row is array (legacy format), convert to objects
        if (Array.isArray(data[0])) {
            return data.map(row => {
                const obj = {};
                columns.forEach((col, i) => {
                    obj[col.label || col.fieldname] = row[i];
                });
                return obj;
            });
        }

        // If object format, remap keys to labels for better display
        return data.map(row => {
            const obj = {};
            columns.forEach(col => {
                obj[col.label || col.fieldname] = row[col.fieldname];
            });
            return obj;
        });
    }, [data, columns]);

    if (!data || data.length === 0 || !columns || columns.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground text-sm">
                {t('report.noData', 'No data available')}
            </div>
        );
    }

    return (
        <div className="pivot-container">
            <PivotTableUI
                data={normalizedData}
                onChange={(s) => setPivotState(s)}
                renderers={TableRenderers}
                {...pivotState}
            />
            <style>{pivotStyles}</style>
        </div>
    );
}

/**
 * CSS overhaul - Flex layout for react-pivottable
 *
 * DOM structure (horizUnused = true):
 *   table.pvtUi > tbody
 *     tr:nth-child(1) > td.pvtRenderers + td.pvtAxisContainer.pvtUnused.pvtHorizList
 *     tr:nth-child(2) > td.pvtVals      + td.pvtAxisContainer.pvtHorizList.pvtCols
 *     tr:nth-child(3) > td.pvtAxisContainer.pvtVertList.pvtRows + td.pvtOutput
 *
 * Strategy:
 *   - Row 1: hide renderer, unused pills stretch full width (toolbar)
 *   - Row 2: aggregator (shrink-to-fit) + column drop zone (stretch)
 *   - Row 3: row drop zone (narrow, fixed) + output table (fills remaining)
 *   - All three rows are independent flex rows; no cross-row column alignment needed
 */
const pivotStyles = `
/* ==================================================================
   CONTAINER
   ================================================================== */
.pivot-container {
    overflow: auto;
    max-height: 85vh;
}

/* ==================================================================
   BREAK TABLE LAYOUT -> FLEX
   ================================================================== */
.pivot-container .pvtUi {
    display: block !important;
    width: 100%;
    font-size: 12px;
    font-family: inherit;
    color: var(--color-foreground, #1e293b);
    border: none;
    background: transparent;
}
.pivot-container .pvtUi > tbody {
    display: flex !important;
    flex-direction: column;
    gap: 0;
    width: 100%;
}
.pivot-container .pvtUi > tbody > tr {
    display: flex !important;
    align-items: stretch;
    width: 100%;
}
.pivot-container .pvtUi > tbody > tr > td {
    display: block !important;
    padding: 0;
    border: none;
    background: transparent;
    vertical-align: top;
}

/* ==================================================================
   ROW 1: TOOLBAR - Renderer (hidden) + Unused pills (full width)
   ================================================================== */
.pivot-container .pvtUi > tbody > tr:first-child {
    background: var(--color-muted, #f8fafc);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px 6px 0 0;
    padding: 4px 8px;
    min-height: 32px;
    align-items: center;
}

/* Hide renderer dropdown completely - no space taken */
.pivot-container td.pvtRenderers {
    display: none !important;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    padding: 0 !important;
    margin: 0 !important;
}

/* Unused attrs: horizontal pill bar, fills the entire row */
.pivot-container td.pvtAxisContainer.pvtUnused {
    flex: 1 1 0% !important;
    display: flex !important;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 0 !important;
    margin: 0;
    min-height: 0;
    background: transparent !important;
    border: none !important;
    border-radius: 0;
    min-width: 0;
    width: auto !important;
}

/* ==================================================================
   ROW 2: Aggregator (compact) + Column drop zone (fills)
   ================================================================== */
.pivot-container .pvtUi > tbody > tr:nth-child(2) {
    gap: 6px;
    padding: 4px 0;
    align-items: stretch;
}

/* Aggregator cell: shrink to content */
.pivot-container td.pvtVals {
    flex: 0 0 auto !important;
    display: flex !important;
    align-items: center;
    gap: 2px;
    background: var(--color-background, #fff);
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px;
    padding: 2px 6px !important;
    white-space: nowrap;
    min-width: 0;
    max-width: 260px;
}
/* Force dropdowns inside pvtVals to be compact */
.pivot-container td.pvtVals .pvtDropdown {
    margin: 1px 0;
}
.pivot-container td.pvtVals .pvtDropdownCurrent {
    width: auto;
    min-width: 100px;
    max-width: 180px;
    padding: 1px 5px;
    font-size: 11px;
    border-color: var(--color-border, #e2e8f0);
    border-radius: 4px;
    background: var(--color-background, #fff);
}
.pivot-container td.pvtVals .pvtDropdownIcon {
    margin-left: 4px;
}
.pivot-container td.pvtVals br {
    display: none;
}

/* Column drop zone: fills remaining width */
.pivot-container td.pvtAxisContainer.pvtHorizList.pvtCols {
    flex: 1 1 0% !important;
    display: flex !important;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
    padding: 4px 8px !important;
    min-height: 28px;
    background: var(--color-muted, #f8fafc);
    border: 1px dashed var(--color-border, #e2e8f0);
    border-radius: 6px;
    min-width: 0;
}

/* ==================================================================
   ROW 3: Row drop zone (narrow) + Output table (fills all space)
   ================================================================== */
.pivot-container .pvtUi > tbody > tr:nth-child(3) {
    gap: 6px;
    align-items: flex-start;
}

/* Row drop zone: narrow column, stacks pills vertically */
.pivot-container td.pvtAxisContainer.pvtVertList.pvtRows {
    flex: 0 0 auto !important;
    width: auto;
    min-width: 40px;
    max-width: 120px;
    padding: 4px !important;
    background: var(--color-muted, #f8fafc);
    border: 1px dashed var(--color-border, #e2e8f0);
    border-radius: 6px;
    min-height: 28px;
    display: flex !important;
    flex-direction: column;
    gap: 3px;
}
/* When rows zone is empty, collapse it tight */
.pivot-container td.pvtAxisContainer.pvtVertList.pvtRows:empty {
    min-width: 28px;
    max-width: 28px;
}

/* Output table: fills ALL remaining horizontal space */
.pivot-container td.pvtOutput {
    flex: 1 1 0% !important;
    min-width: 0;
    overflow-x: auto;
    overflow-y: visible;
}

/* ==================================================================
   DROPDOWN COMPONENT (pvtDropdown)
   ================================================================== */
.pivot-container .pvtDropdown {
    display: inline-block;
    position: relative;
    margin: 1px 2px;
}
.pivot-container .pvtDropdownCurrent {
    text-align: left;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 4px;
    display: inline-block;
    position: relative;
    width: auto;
    min-width: 100px;
    max-width: 200px;
    box-sizing: border-box;
    background: var(--color-background, #fff);
    padding: 2px 6px;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;
    line-height: 20px;
}
.pivot-container .pvtDropdownCurrentOpen {
    border-radius: 4px 4px 0 0;
}
.pivot-container .pvtDropdownIcon {
    float: right;
    color: var(--color-muted-foreground, #94a3b8);
    margin-left: 6px;
    font-size: 10px;
    line-height: 20px;
}
.pivot-container .pvtDropdownMenu {
    background: var(--color-background, #fff);
    position: absolute;
    width: 100%;
    min-width: 140px;
    margin-top: -1px;
    border-radius: 0 0 6px 6px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-top: 1px solid var(--color-border, #e2e8f0);
    box-sizing: border-box;
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    max-height: 240px;
    overflow-y: auto;
    z-index: 100;
}
.pivot-container .pvtDropdownValue {
    padding: 3px 8px;
    font-size: 11px;
    text-align: left;
    cursor: pointer;
    font-family: inherit;
}
.pivot-container .pvtDropdownValue:hover {
    background: var(--color-accent, #f1f5f9);
}
.pivot-container .pvtDropdownActiveValue {
    background: var(--color-accent, #eff6ff);
    font-weight: 500;
}

/* ==================================================================
   SORT ARROWS (inside pvtVals)
   ================================================================== */
.pivot-container .pvtRowOrder,
.pivot-container .pvtColOrder {
    font-size: 10px;
    cursor: pointer;
    padding: 0 2px;
    opacity: 0.4;
    text-decoration: none !important;
    display: inline-block;
    width: auto;
    margin-left: 2px;
    user-select: none;
}
.pivot-container .pvtRowOrder:hover,
.pivot-container .pvtColOrder:hover {
    opacity: 1;
}

/* ==================================================================
   ATTRIBUTE PILLS
   ================================================================== */
.pivot-container .pvtAxisContainer {
    list-style: none;
}
.pivot-container .pvtAxisContainer li {
    padding: 0;
    margin: 0;
    list-style: none;
    display: inline-block;
}
/* In vertical containers (pvtRows), stack them */
.pivot-container .pvtVertList li {
    display: block;
}

.pivot-container .pvtAxisContainer li span.pvtAttr {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-size: 11px;
    font-weight: 500;
    font-family: inherit;
    padding: 2px 8px;
    border-radius: 4px;
    background: var(--color-background, #fff);
    border: 1px solid var(--color-border, #d1d5db);
    color: var(--color-foreground, #1e293b);
    cursor: grab;
    white-space: nowrap;
    line-height: 18px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    user-select: none;
    transition: border-color 0.1s, background 0.1s;
}
.pivot-container .pvtAxisContainer li span.pvtAttr:hover {
    border-color: var(--color-primary, #3b82f6);
    background: var(--color-accent, #eff6ff);
}
.pivot-container .pvtAxisContainer li span.pvtAttr:active {
    cursor: grabbing;
    box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

/* Active pills (in rows/cols) - blue accent */
.pivot-container .pvtCols li span.pvtAttr,
.pivot-container .pvtRows li span.pvtAttr {
    background: #eff6ff;
    border-color: #93c5fd;
    color: #1e40af;
}

/* Placeholder while dragging */
.pivot-container li.pvtPlaceholder {
    border: 1px dashed #93c5fd !important;
    border-radius: 4px;
    padding: 2px 12px;
    min-height: 22px;
    background: rgba(59,130,246,0.04);
}
.pivot-container li.pvtPlaceholder span.pvtAttr {
    display: none;
}

/* Triangle (filter toggle) */
.pivot-container .pvtTriangle {
    color: var(--color-muted-foreground, #94a3b8);
    font-size: 7px;
    opacity: 0.5;
    cursor: pointer;
}
.pivot-container .pvtAttr:hover .pvtTriangle {
    opacity: 1;
    color: var(--color-primary, #3b82f6);
}

/* Filtered attribute italic */
.pivot-container .pvtFilteredAttribute {
    font-style: italic;
}

/* Drop zone hover feedback */
.pivot-container .pvtAxisContainer.pvtCols:hover,
.pivot-container .pvtAxisContainer.pvtRows:hover {
    border-color: var(--color-primary, #3b82f6);
    background: rgba(59, 130, 246, 0.03);
}

/* ==================================================================
   PIVOT DATA TABLE (the actual output)
   ================================================================== */
.pivot-container table.pvtTable {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
    font-family: inherit;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 6px;
    overflow: hidden;
    margin: 0;
}

/* Headers */
.pivot-container table.pvtTable thead tr th,
.pivot-container table.pvtTable tbody tr th {
    font-size: 11px;
    font-weight: 600;
    padding: 6px 10px;
    background: var(--color-muted, #f8fafc);
    color: var(--color-muted-foreground, #475569);
    border: 1px solid var(--color-border, #e2e8f0);
    white-space: nowrap;
    text-align: center;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    font-family: inherit;
}
.pivot-container table.pvtTable .pvtAxisLabel {
    text-align: left;
}
.pivot-container table.pvtTable .pvtColLabel {
    text-align: center;
}
.pivot-container table.pvtTable .pvtTotalLabel {
    text-align: left;
    font-weight: 700;
    color: var(--color-foreground, #1e293b);
}

/* Row labels */
.pivot-container table.pvtTable .pvtRowLabel {
    font-size: 12px;
    font-weight: 500;
    padding: 5px 10px;
    background: var(--color-card, #fff);
    color: var(--color-foreground, #1e293b);
    border: 1px solid var(--color-border, #e2e8f0);
    text-align: left;
    white-space: nowrap;
}

/* Data cells */
.pivot-container table.pvtTable tbody tr td {
    font-size: 12px;
    padding: 5px 10px;
    text-align: right;
    font-variant-numeric: tabular-nums;
    border: 1px solid var(--color-border, #e2e8f0);
    color: var(--color-foreground, #1e293b);
    background: var(--color-card, #fff);
    white-space: nowrap;
    vertical-align: middle;
    font-family: inherit;
}
.pivot-container table.pvtTable tbody tr td:hover {
    background: var(--color-muted, #f8fafc);
}

/* Totals */
.pivot-container table.pvtTable .pvtTotal {
    font-weight: 600;
    background: var(--color-muted, #f1f5f9);
    border: 1px solid var(--color-border, #e2e8f0);
}

/* Grand total */
.pivot-container table.pvtTable .pvtGrandTotal {
    font-weight: 700;
    background: var(--color-accent, #e2e8f0);
    color: var(--color-foreground, #0f172a);
    border: 1px solid var(--color-border, #cbd5e1);
}

/* Zebra striping */
.pivot-container table.pvtTable tbody tr:nth-child(even) td {
    background: var(--color-muted, #fafbfc);
}
.pivot-container table.pvtTable tbody tr:nth-child(even) td:hover {
    background: var(--color-accent, #f1f5f9);
}

/* Empty cells */
.pivot-container table.pvtTable .pvtEmpty {
    background: var(--color-muted, #fafbfc);
    color: var(--color-muted-foreground, #cbd5e1);
}

/* ==================================================================
   FILTER POPOVER
   ================================================================== */
.pivot-container .pvtFilterBox {
    z-index: 200;
    border-radius: 8px;
    border: 1px solid var(--color-border, #e2e8f0);
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    background: var(--color-card, #fff);
    padding: 10px;
    font-size: 12px;
    min-width: 200px;
    max-width: 280px;
    font-family: inherit;
}
.pivot-container .pvtFilterBox h4 {
    margin: 0 0 8px 0;
    font-size: 13px;
    font-weight: 600;
    color: var(--color-foreground, #1e293b);
}
.pivot-container .pvtFilterBox p {
    margin: 6px 0;
}
.pivot-container .pvtFilterBox input[type="text"],
.pivot-container .pvtFilterBox input.pvtSearch {
    font-size: 12px;
    font-family: inherit;
    padding: 4px 8px;
    border: 1px solid var(--color-border, #e2e8f0);
    border-radius: 5px;
    width: 100%;
    outline: none;
    box-sizing: border-box;
    color: var(--color-foreground, #1e293b);
}
.pivot-container .pvtFilterBox input[type="text"]:focus {
    border-color: var(--color-primary, #3b82f6);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}
.pivot-container .pvtFilterBox .pvtButton {
    font-size: 11px;
    font-weight: 500;
    font-family: inherit;
    padding: 3px 10px;
    border-radius: 5px;
    border: 1px solid var(--color-border, #e2e8f0);
    background: var(--color-background, #fff);
    color: var(--color-foreground, #475569);
    cursor: pointer;
    margin: 2px;
    text-decoration: none !important;
    transition: background 0.15s;
}
.pivot-container .pvtFilterBox .pvtButton:hover {
    background: var(--color-muted, #f1f5f9);
}
.pivot-container .pvtCloseX {
    position: absolute;
    right: 8px;
    top: 6px;
    font-size: 16px;
    cursor: pointer;
    color: var(--color-muted-foreground, #94a3b8);
    text-decoration: none !important;
    line-height: 1;
}
.pivot-container .pvtCloseX:hover {
    color: var(--color-foreground, #1e293b);
}
.pivot-container .pvtDragHandle {
    position: absolute;
    left: 8px;
    top: 6px;
    font-size: 14px;
    cursor: move;
    color: var(--color-muted-foreground, #cbd5e1);
}
.pivot-container .pvtCheckContainer {
    max-height: 180px;
    overflow-y: auto;
    font-size: 12px;
    margin: 6px 0;
    border-top: 1px solid var(--color-border, #e2e8f0);
    text-align: left;
}
.pivot-container .pvtCheckContainer p {
    margin: 0;
    padding: 2px 4px;
    cursor: default;
    display: flex;
    align-items: center;
    border-radius: 3px;
}
.pivot-container .pvtCheckContainer p:hover {
    background: var(--color-accent, #f1f5f9);
}
.pivot-container .pvtCheckContainer p.selected {
    background: var(--color-accent, #eff6ff);
}
.pivot-container .pvtOnly {
    display: none;
    font-size: 10px;
    padding-left: 4px;
    cursor: pointer;
    color: var(--color-primary, #3b82f6);
    text-decoration: none !important;
}
.pivot-container .pvtCheckContainer p:hover .pvtOnly {
    display: inline;
}
.pivot-container .pvtOnlySpacer {
    display: inline-block;
    width: 30px;
}
.pivot-container .pvtCheckContainer p:hover .pvtOnlySpacer {
    display: none;
}
.pivot-container .pvtSearch {
    margin-bottom: 6px;
}

/* ==================================================================
   RESPONSIVE
   ================================================================== */
@media (max-width: 768px) {
    .pivot-container .pvtUi > tbody > tr {
        flex-wrap: wrap;
    }
    .pivot-container .pvtUi > tbody > tr:first-child {
        border-radius: 6px;
    }
    .pivot-container .pvtUi > tbody > tr:nth-child(2) {
        flex-direction: column;
    }
    .pivot-container .pvtUi > tbody > tr:nth-child(3) {
        flex-direction: column;
    }
    .pivot-container td.pvtAxisContainer.pvtVertList.pvtRows {
        max-width: 100%;
        flex-direction: row;
        flex-wrap: wrap;
    }
    .pivot-container td.pvtAxisContainer.pvtVertList.pvtRows li {
        display: inline-block;
    }
    .pivot-container table.pvtTable tbody tr td,
    .pivot-container table.pvtTable thead tr th,
    .pivot-container table.pvtTable tbody tr th {
        padding: 4px 6px;
        font-size: 10px;
    }
    .pivot-container .pvtAxisContainer li span.pvtAttr {
        font-size: 10px;
        padding: 1px 5px;
    }
}
`;

export default PivotTableView;
