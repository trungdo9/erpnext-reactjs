/**
 * Report template utilities for PDF (print) and Excel exports.
 * Style matches Steel ERP professional report format:
 *   - Blue header rows, yellow total rows, proper borders
 *   - Company header + centered title + date
 */

// ─── PDF / Print ─────────────────────────────────────────────────────────────

const REPORT_CSS = `
* { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; color-adjust:exact !important; }
body { font-family:'Segoe UI',Arial,sans-serif; padding:20px; color:#111; font-size:11px; line-height:1.35; }
.hdr { display:flex; align-items:flex-start; margin-bottom:14px; border-bottom:2px solid #1e3a5f; padding-bottom:8px; }
.hdr-l { flex:1; }
.hdr-c { flex:2; text-align:center; }
.hdr-r { flex:1; text-align:right; font-size:11px; color:#444; }
.company { font-size:14px; font-weight:700; color:#1e3a5f; }
.company-sub { font-size:10px; color:#666; }
.rpt-title { font-size:15px; font-weight:700; color:#C62828; text-transform:uppercase; letter-spacing:.5px; }
.rpt-sub { font-size:11px; color:#555; margin-top:2px; }
.sec { margin-top:14px; page-break-inside:avoid; }
.sec-title { font-size:12px; font-weight:700; margin-bottom:5px; color:#222; }
table { width:100%; border-collapse:collapse; margin-bottom:8px; font-size:10.5px; }
th,td { border:1px solid #555; padding:3px 6px; }
th { background:#1e3a5f; color:#fff; font-weight:600; text-align:center; white-space:nowrap; font-size:10px; }
th.group { background:#3A7A2E; }
td { background:#fff; }
.r { text-align:right; font-variant-numeric:tabular-nums; }
.c { text-align:center; }
.b { font-weight:700; }
tr.sub td { background:#FFFF99; font-weight:600; }
tr.total td { background:#FFD700; font-weight:700; }
.note { font-size:9px; color:#888; font-style:italic; margin-top:2px; }
@media print { body{padding:8px;} .sec{page-break-inside:avoid;} }
@page { margin:8mm; size:A4 portrait; }
.sign { margin-top:24px; page-break-inside:avoid; }
.sign table { border:none; font-size:10px; }
.sign td { border:none; text-align:center; vertical-align:top; padding:4px 12px; width:33.33%; }
.sign .role { font-weight:700; text-transform:uppercase; }
.sign .space { height:50px; }
.sign .name { border-top:1px dotted #555; padding-top:3px; font-style:italic; }
`;

/** Open print window with professional report layout */
export function openReport(title, bodyHtml) {
    const win = window.open('', '_blank', 'width=1200,height=800');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${REPORT_CSS}</style></head><body>${bodyHtml}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
}

/** Report header: company + title + date. Pass `t` for i18n. */
export function reportHeader(title, subtitle, dateInfo, t) {
    const company = t ? t('print.companyName') : 'STEEL ERP';
    const companySub = t ? t('print.companySubtitle') : 'Quản lý Thép';
    return `<div class="hdr">
<div class="hdr-l"><div class="company">${esc(company)}</div><div class="company-sub">${esc(companySub)}</div></div>
<div class="hdr-c"><div class="rpt-title">${esc(title)}</div>${subtitle ? `<div class="rpt-sub">${esc(subtitle)}</div>` : ''}</div>
<div class="hdr-r">${esc(dateInfo)}</div>
</div>`;
}

/** Section title with numbering */
export function secTitle(num, text) {
    return `<div class="sec"><div class="sec-title">${num}. ${esc(text)}</div></div>`;
}

/**
 * Styled HTML table.
 * @param {string[]} headers
 * @param {Array<{cells:(string|number)[], cls?:'sub'|'total'}>} rows
 * @param {string[]} [aligns] 'l','r','c' per col
 */
export function table(headers, rows, aligns) {
    const al = (i) => aligns?.[i] === 'r' ? ' class="r"' : aligns?.[i] === 'c' ? ' class="c"' : '';
    let h = '<table><thead><tr>';
    headers.forEach((t, i) => { h += `<th${al(i)}>${esc(String(t))}</th>`; });
    h += '</tr></thead><tbody>';
    for (const row of rows) {
        h += row.cls ? `<tr class="${row.cls}">` : '<tr>';
        row.cells.forEach((v, i) => { h += `<td${al(i)}${row.cls ? ' class="b"' : ''}>${v ?? ''}</td>`; });
        h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
}

// ─── Excel (xlsx-js-style) ───────────────────────────────────────────────────

const _b = { style: 'thin', color: { rgb: '444444' } };
const BORDER = { top: _b, bottom: _b, left: _b, right: _b };

/** Cell style presets */
export const XS = {
    title: { font: { bold: true, sz: 14, color: { rgb: 'C62828' } }, alignment: { horizontal: 'center' } },
    company: { font: { bold: true, sz: 12, color: { rgb: '2E7D32' } } },
    header: { fill: { fgColor: { rgb: '4E8D3F' } }, font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDER },
    cell: { font: { sz: 10 }, border: BORDER },
    cellR: { font: { sz: 10 }, border: BORDER, alignment: { horizontal: 'right' }, numFmt: '#,##0' },
    cellR2: { font: { sz: 10 }, border: BORDER, alignment: { horizontal: 'right' }, numFmt: '#,##0.00' },
    cellC: { font: { sz: 10 }, border: BORDER, alignment: { horizontal: 'center' } },
    sub: { fill: { fgColor: { rgb: 'FFFF99' } }, font: { bold: true, sz: 10 }, border: BORDER },
    subR: { fill: { fgColor: { rgb: 'FFFF99' } }, font: { bold: true, sz: 10 }, border: BORDER, alignment: { horizontal: 'right' }, numFmt: '#,##0' },
    total: { fill: { fgColor: { rgb: 'FFD700' } }, font: { bold: true, sz: 11 }, border: BORDER },
    totalR: { fill: { fgColor: { rgb: 'FFD700' } }, font: { bold: true, sz: 11 }, border: BORDER, alignment: { horizontal: 'right' }, numFmt: '#,##0' },
};

/**
 * Add a styled sheet to an xlsx workbook.
 * @param {object} XLSX - xlsx-js-style module
 * @param {object} wb - workbook
 * @param {string} name - sheet name
 * @param {object} opts
 * @param {string} opts.title - report title (row 0, merged)
 * @param {string[]} opts.headers - column headers
 * @param {Array<{cells:any[], type?:'sub'|'total'}>} opts.rows - data rows
 * @param {string[]} [opts.aligns] - 'l','r','c' per col
 * @param {number[]} [opts.colWidths] - column widths
 */
export function addSheet(XLSX, wb, name, { title, headers, rows, aligns, colWidths }) {
    const nc = headers.length;
    const aoa = [[title], [], headers, ...rows.map(r => r.cells)];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Title merge
    if (!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: nc - 1 } });

    // Col widths
    if (colWidths) ws['!cols'] = colWidths.map(w => ({ wch: w }));

    // Style title row
    _styleRow(ws, XLSX, 0, nc, XS.title);

    // Style header row
    _styleRow(ws, XLSX, 2, nc, XS.header);

    // Style data rows
    rows.forEach((row, i) => {
        const r = 3 + i;
        for (let c = 0; c < nc; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            if (!ws[addr]) ws[addr] = { v: '', t: 's' };
            const al = aligns?.[c];
            let s;
            if (row.type === 'total') s = al === 'r' ? XS.totalR : XS.total;
            else if (row.type === 'sub') s = al === 'r' ? XS.subR : XS.sub;
            else s = al === 'r' ? XS.cellR : al === 'c' ? XS.cellC : XS.cell;
            ws[addr].s = s;
        }
    });

    XLSX.utils.book_append_sheet(wb, ws, name);
}

function _styleRow(ws, XLSX, row, numCols, style) {
    for (let c = 0; c < numCols; c++) {
        const addr = XLSX.utils.encode_cell({ r: row, c });
        if (!ws[addr]) ws[addr] = { v: '', t: 's' };
        ws[addr].s = style;
    }
}

// ─── Signature block (PDF + Excel) ──────────────────────────────────────────

/** Signature block HTML (3 columns: Người lập / Kiểm tra / Phê duyệt). Pass `t` for i18n. */
export function signatureBlock(t) {
    const r1 = t ? t('print.signPreparer') : 'Người lập';
    const r2 = t ? t('print.signChecker') : 'Người kiểm tra';
    const r3 = t ? t('print.signApprover') : 'Người phê duyệt';
    const hint = t ? t('print.signInstruction') : '(Ký, ghi rõ họ tên)';
    return `<div class="sign"><table><tr>
<td><div class="role">${esc(r1)}</div><div class="space"></div><div class="name">${esc(hint)}</div></td>
<td><div class="role">${esc(r2)}</div><div class="space"></div><div class="name">${esc(hint)}</div></td>
<td><div class="role">${esc(r3)}</div><div class="space"></div><div class="name">${esc(hint)}</div></td>
</tr></table></div>`;
}

/** Add signature rows to an Excel worksheet (call after addSheet). Pass `t` for i18n. */
export function addSignatureToSheet(XLSX, wb, sheetName, t) {
    const ws = wb.Sheets[sheetName];
    if (!ws) return;

    const range = XLSX.utils.decode_range(ws['!ref']);
    const startRow = range.e.r + 2; // 1 blank row gap
    const roles = t
        ? [t('print.signPreparer'), t('print.signChecker'), t('print.signApprover')]
        : ['Người lập', 'Người kiểm tra', 'Người phê duyệt'];
    const signStyle = { font: { bold: true, sz: 10 }, alignment: { horizontal: 'center' } };
    const nameStyle = { font: { italic: true, sz: 9, color: { rgb: '666666' } }, alignment: { horizontal: 'center' } };

    // Place roles across 3 evenly-spaced columns
    const nc = range.e.c + 1;
    const positions = nc >= 6
        ? [1, Math.floor(nc / 2), nc - 2]
        : [0, Math.min(2, nc - 1), Math.min(4, nc - 1)];

    roles.forEach((role, i) => {
        const c = positions[i];
        const addrRole = XLSX.utils.encode_cell({ r: startRow, c });
        ws[addrRole] = { v: role, t: 's', s: signStyle };
        const addrName = XLSX.utils.encode_cell({ r: startRow + 3, c });
        const hint = t ? t('print.signInstruction') : '(Ký, ghi rõ họ tên)';
        ws[addrName] = { v: hint, t: 's', s: nameStyle };
    });

    // Update range
    const newEndRow = startRow + 4;
    range.e.r = Math.max(range.e.r, newEndRow);
    ws['!ref'] = XLSX.utils.encode_range(range);
}

// ─── Shared formatters ───────────────────────────────────────────────────────

export const fmt = (v) => new Intl.NumberFormat('vi-VN').format(Math.round(Number(v) || 0));
export const fmt2 = (v) => new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(v) || 0);

function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
