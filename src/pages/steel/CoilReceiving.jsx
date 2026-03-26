import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Package, Loader2, CheckCircle, AlertCircle, X, Trash2,
  RefreshCw, QrCode, Printer, Search, Plus, Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { call, db } from '../../api/frappeClient';
import * as XLSX from 'xlsx';

// ─── Constants ───────────────────────────────────────────────
const WH = 'Kho Nguyên liệu - TVS';
const COMPANY = 'Thép Việt Steel';
const DENSITY = 7850; // kg/m³

// ─── Helpers ─────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const calcLen = (kg, w, t) => (kg && w && t) ? kg / ((w / 1000) * (t / 1000) * DENSITY) : 0;
const fmt = (n, d = 2) => (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });

const newRow = () => ({
  id: Date.now() + Math.random(),
  itemCode: '',
  width: '',
  thickness: '',
  weight: '',
  length: '',
  postingDate: new Date().toISOString().slice(0, 10),
  supplier: '',
  supplierName: '',
  rate: '',
  status: 'idle',
  batchName: '',
  errorMsg: '',
});

// ─── Toast ───────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const colors = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    info: 'bg-blue-600',
  };
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white ${colors[toast.type] || colors.info}`}>
      {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onClose} className="ml-2"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── QR Print Modal ──────────────────────────────────────────
function QRModal({ batch, onClose }) {
  if (!batch) return null;
  const ref = useRef();
  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>QR</title><style>body{font-family:sans-serif;text-align:center;padding:20px}p{margin:2px 0;font-size:13px}</style></head><body>');
    w.document.write(ref.current.innerHTML);
    w.document.write('</body></html>');
    w.document.close();
    w.print();
  };
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', padding: '1rem' }} onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-6 max-w-xs w-full" onClick={e => e.stopPropagation()}>
        <div ref={ref} className="text-center space-y-2">
          <p className="font-bold text-gray-900 dark:text-white">{batch.name}</p>
          <QRCodeSVG value={batch.name} size={160} className="mx-auto" />
          <p className="text-xs text-gray-500 dark:text-gray-400">{batch.item} | {batch.width}×{batch.thickness}mm | {fmt(batch.weight, 0)}kg</p>
        </div>
        <button onClick={handlePrint} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-emerald-600 to-green-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-green-800">
          <Printer className="w-4 h-4" /> In nhãn QR
        </button>
        <button onClick={onClose} className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white py-1">Đóng</button>
      </div>
    </div>,
    document.body
  );
}

// ─── Batch sequence lookup ───────────────────────────────────
async function nextSeq(prefix) {
  try {
    const list = await db.getDocList('Batch', {
      filters: [['name', 'like', `${prefix}-%`]],
      fields: ['name'], orderBy: { field: 'name', order: 'desc' }, limit: 1,
    });
    if (list.length) {
      const n = parseInt(list[0].name.split('-').pop(), 10);
      return isNaN(n) ? 1 : n + 1;
    }
  } catch { /* ignore */ }
  return 1;
}

// ─── Autocomplete Dropdown (shared) ──────────────────────────
function Autocomplete({ value, onSelect, onType, placeholder, fetchFn, renderItem, className = '' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef();

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-autocomplete-dropdown]')) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try { setResults(await fetchFn(query)); } catch { setResults([]); }
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, fetchFn]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onType?.(v);
    setOpen(true);
  };

  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !ref.current) return;
    const update = () => {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 220) });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  return (
    <div ref={ref}>
      <input type="text" value={query}
        onFocus={() => setOpen(true)}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary ${className}`}
      />
      {open && (loading || results.length > 0) && ReactDOM.createPortal(
        <div data-autocomplete-dropdown style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9990 }}
          className="max-h-48 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
          {loading ? (
            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
          ) : results.map((item, i) => (
            <button key={i} onClick={() => { onSelect(item); setQuery(renderItem(item).label); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
              {renderItem(item).content}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Fetch functions ─────────────────────────────────────────
const fetchItems = async (q) => {
  const filters = q ? [['item_code', 'like', `%${q}%`]] : [['item_group', 'like', '%Cuộn%']];
  return db.getDocList('Item', { filters, fields: ['item_code', 'item_name', 'item_group'], limit: 12, orderBy: { field: 'item_code', order: 'asc' } });
};

const fetchSuppliers = async (q) => {
  const filters = q ? [['supplier_name', 'like', `%${q}%`]] : [];
  return db.getDocList('Supplier', { filters, fields: ['name', 'supplier_name'], limit: 10, orderBy: { field: 'supplier_name', order: 'asc' } });
};

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CoilReceiving() {
  const [rows, setRows] = useState([newRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [qrBatch, setQrBatch] = useState(null);

  // Recent entries
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentFilter, setRecentFilter] = useState('');
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterDay, setFilterDay] = useState(String(new Date().getDate()));
  const [filterItem, setFilterItem] = useState('');

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ─── Row CRUD ────────────────────────────────────────────
  const addRow = () => setRows(prev => [...prev, newRow()]);
  const removeRow = (id) => setRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const updateRow = (id, patch) => setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const setItemCode = (id, itemCode) => {
    const m = itemCode.match(/(\d{3,4})\s*[xX×]\s*(\d+\.?\d*)/);
    updateRow(id, { itemCode, ...(m ? { width: m[1], thickness: m[2] } : {}) });
  };

  // ─── Submit ──────────────────────────────────────────────
  const handleSubmit = async () => {
    const pending = rows.filter(r => {
      const kg = parseFloat(r.weight) || 0;
      return r.status !== 'done' && kg > 0 && parseFloat(r.width) > 0 && parseFloat(r.thickness) > 0 && r.itemCode;
    });
    if (pending.length === 0) return showToast('error', 'Chưa có cuộn hợp lệ (cần mã hàng, rộng, dày, KL > 0)');

    setSubmitting(true);
    let ok = 0, fail = 0;

    for (const row of pending) {
      const kg = parseFloat(row.weight);
      const w = parseFloat(row.width);
      const t = parseFloat(row.thickness);
      const rate = parseFloat(row.rate) || 15000;
      const supplier = row.supplier || undefined;

      updateRow(row.id, { status: 'submitting' });

      try {
        const len = parseFloat(row.length) || Math.round(calcLen(kg, w, t) * 100) / 100;
        const dc = row.postingDate.replace(/-/g, '');
        const prefix = `HRC-${w}x${t}-${dc}`;
        const seq = await nextSeq(prefix);
        const batchName = `${prefix}-${String(seq).padStart(3, '0')}`;

        // Create Batch
        const bRes = await call.post('frappe.client.insert', {
          doc: {
            doctype: 'Batch', batch_id: batchName, item: row.itemCode,
            custom_coil_width_mm: w, custom_coil_thickness_mm: t,
            custom_actual_weight_kg: kg, custom_theoretical_length_m: len,
            custom_source_type: 'Nhập cuộn', custom_supplier: supplier,
          },
        });
        const batch = bRes.message || bRes;
        await call.post('frappe.client.set_value', {
          doctype: 'Batch', name: batch.name,
          fieldname: 'custom_origin_coil_batch', value: batch.name,
        });

        // Create & submit Stock Entry
        const seRes = await call.post('frappe.client.insert', {
          doc: {
            doctype: 'Stock Entry', stock_entry_type: 'Material Receipt',
            company: COMPANY, posting_date: row.postingDate,
            custom_production_type: 'Nhập cuộn', custom_batch_id: batch.name,
            remarks: `Nhập cuộn ${row.itemCode} | ${w}×${t}mm | ${kg}kg`,
            items: [{
              item_code: row.itemCode, qty: kg, uom: 'Kg', stock_uom: 'Kg',
              t_warehouse: WH, batch_no: batch.name, basic_rate: rate,
            }],
          },
        });
        const se = seRes.message || seRes;
        await call.post('frappe.client.submit', { doc: se });

        updateRow(row.id, { status: 'done', batchName: batch.name });
        ok++;
      } catch (err) {
        updateRow(row.id, { status: 'error', errorMsg: err.message || 'Lỗi' });
        fail++;
      }
    }

    showToast(fail === 0 ? 'success' : 'error', `Nhập xong: ${ok} thành công${fail ? `, ${fail} lỗi` : ''}`);
    setSubmitting(false);
    loadRecent();

    // Reset: keep error rows for retry, remove done rows, add fresh row
    setRows(prev => {
      const errorRows = prev.filter(r => r.status === 'error');
      return errorRows.length > 0 ? errorRows : [newRow()];
    });
  };

  // ─── Recent entries ──────────────────────────────────────
  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const entries = await db.getDocList('Stock Entry', {
        filters: [['stock_entry_type', '=', 'Material Receipt'], ['docstatus', '=', 1], ['custom_production_type', '=', 'Nhập cuộn']],
        fields: ['name', 'posting_date', 'custom_batch_id'],
        orderBy: { field: 'posting_date', order: 'desc' },
        limit: 200,
      });
      const batchIds = entries.map(e => e.custom_batch_id).filter(Boolean);
      let batchMap = {};
      if (batchIds.length > 0) {
        try {
          const batches = await db.getDocList('Batch', {
            filters: [['name', 'in', batchIds]],
            fields: ['name', 'item', 'custom_coil_width_mm', 'custom_coil_thickness_mm', 'custom_actual_weight_kg', 'custom_theoretical_length_m', 'custom_supplier'],
            limit: batchIds.length,
          });
          for (const b of batches) batchMap[b.name] = b;
        } catch { /* ignore */ }
      }
      setRecent(entries.map(e => ({ ...e, batch: batchMap[e.custom_batch_id] || null })));
    } catch { setRecent([]); }
    setLoadingRecent(false);
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const filtered = recent.filter(r => {
    const d = r.posting_date || '';
    if (filterYear && d.slice(0, 4) !== filterYear) return false;
    if (filterMonth && d.slice(5, 7) !== filterMonth.padStart(2, '0')) return false;
    if (filterDay && d.slice(8, 10) !== filterDay.padStart(2, '0')) return false;
    if (filterItem && !(r.batch?.item || '').toLowerCase().includes(filterItem.toLowerCase())) return false;
    if (recentFilter) {
      const q = recentFilter.toLowerCase();
      if (!r.custom_batch_id?.toLowerCase().includes(q) && !r.batch?.item?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ─── Derived ─────────────────────────────────────────────
  const pendingRows = rows.filter(r => {
    return r.status !== 'done' && r.itemCode && parseFloat(r.weight) > 0 && parseFloat(r.width) > 0 && parseFloat(r.thickness) > 0;
  });
  const totalWeight = rows.reduce((s, r) => s + (r.status !== 'done' ? (parseFloat(r.weight) || 0) : 0), 0);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <QRModal batch={qrBatch} onClose={() => setQrBatch(null)} />

      {/* ── Data Entry Table ─────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">

        {/* Desktop table */}
        <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
          <table className="w-full text-sm" style={{ tableLayout: 'auto' }}>
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                <th className="px-2 py-2.5 text-center">#</th>
                <th className="px-2 py-2.5">Mã sản phẩm</th>
                <th className="px-2 py-2.5">Rộng</th>
                <th className="px-2 py-2.5">Dày</th>
                <th className="px-2 py-2.5">KL (kg)</th>
                <th className="px-2 py-2.5">Dài (m)</th>
                <th className="px-2 py-2.5">Giá</th>
                <th className="px-2 py-2.5">Ngày nhập</th>
                <th className="px-2 py-2.5">NCC</th>
                <th className="px-2 py-2.5 text-center">TT</th>
                <th className="px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {rows.map((row, idx) => {
                const kg = parseFloat(row.weight) || 0;
                const w = parseFloat(row.width) || 0;
                const t = parseFloat(row.thickness) || 0;
                const len = calcLen(kg, w, t);
                const isDone = row.status === 'done';
                const isErr = row.status === 'error';
                const isBusy = row.status === 'submitting';

                return (
                  <tr key={row.id} className={
                    isDone ? 'bg-green-50/50 dark:bg-green-900/10'
                    : isErr ? 'bg-red-50/50 dark:bg-red-900/10'
                    : 'hover:bg-gray-50/50 dark:hover:bg-gray-700/20'
                  }>
                    {/* # */}
                    <td className="px-2 py-1.5 text-gray-400 text-xs">{idx + 1}</td>

                    {/* Mã sản phẩm */}
                    <td className="px-2 py-1.5">
                      {isDone ? (
                        <span className="font-medium text-gray-900 dark:text-white">{row.itemCode}</span>
                      ) : (
                        <Autocomplete
                          value={row.itemCode}
                          placeholder="Mã hàng..."
                          fetchFn={fetchItems}
                          renderItem={(item) => ({
                            label: item.item_code,
                            content: (
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-900 dark:text-white">{item.item_code}</span>
                                <span className="text-xs text-gray-400 ml-2">{item.item_group}</span>
                              </div>
                            ),
                          })}
                          onSelect={(item) => setItemCode(row.id, item.item_code)}
                          onType={(v) => setItemCode(row.id, v)}
                        />
                      )}
                    </td>

                    {/* Rộng */}
                    <td className="px-2 py-1.5">
                      {isDone ? (
                        <span className="text-gray-600 dark:text-gray-300">{row.width}</span>
                      ) : (
                        <input type="number" value={row.width} onChange={e => updateRow(row.id, { width: e.target.value })}
                          placeholder="1230" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      )}
                    </td>

                    {/* Dày */}
                    <td className="px-2 py-1.5">
                      {isDone ? (
                        <span className="text-gray-600 dark:text-gray-300">{row.thickness}</span>
                      ) : (
                        <input type="number" value={row.thickness} onChange={e => updateRow(row.id, { thickness: e.target.value })}
                          placeholder="2.0" step="0.1" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      )}
                    </td>

                    {/* KL */}
                    <td className="px-2 py-1.5">
                      {isDone ? (
                        <span className="font-medium text-gray-900 dark:text-white">{fmt(kg, 0)}</span>
                      ) : (
                        <input type="number" value={row.weight} onChange={e => updateRow(row.id, { weight: e.target.value })}
                          placeholder="5000" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      )}
                    </td>

                    {/* Dài */}
                    <td className="px-2 py-1.5">
                      {isDone ? (
                        <span className="text-blue-600 dark:text-blue-400 font-medium">{fmt(parseFloat(row.length) || len, 1)}</span>
                      ) : (
                        <input type="number" value={row.length} onChange={e => updateRow(row.id, { length: e.target.value })}
                          placeholder={len > 0 ? fmt(len, 1) : '-'} step="0.1"
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 text-sm placeholder:text-gray-300 dark:placeholder:text-gray-600" />
                      )}
                    </td>

                    {/* Giá */}
                    <td className="px-2 py-1.5">
                      {isDone ? (
                        <span className="text-gray-600 dark:text-gray-300">{fmt(parseFloat(row.rate) || 15000, 0)}</span>
                      ) : (
                        <input type="number" value={row.rate} onChange={e => updateRow(row.id, { rate: e.target.value })}
                          placeholder="15000" className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      )}
                    </td>

                    {/* Ngày nhập */}
                    <td className="px-2 py-1.5">
                      {isDone ? (
                        <span className="text-gray-600 dark:text-gray-300 text-xs">{row.postingDate}</span>
                      ) : (
                        <input type="date" value={row.postingDate} onChange={e => updateRow(row.id, { postingDate: e.target.value })}
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      )}
                    </td>

                    {/* NCC */}
                    <td className="px-2 py-1.5">
                      {isDone ? (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{row.supplierName || '-'}</span>
                      ) : (
                        <Autocomplete
                          value={row.supplierName || ''}
                          placeholder="NCC riêng..."
                          fetchFn={fetchSuppliers}
                          renderItem={(s) => ({ label: s.supplier_name, content: <span>{s.supplier_name}</span> })}
                          onSelect={(s) => updateRow(row.id, { supplier: s.name, supplierName: s.supplier_name })}
                          onType={() => updateRow(row.id, { supplier: '', supplierName: '' })}
                        />
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-2 py-1.5 text-center">
                      {isDone ? (
                        <button onClick={() => setQrBatch({ name: row.batchName, item: row.itemCode, width: w, thickness: t, weight: kg })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700">
                          <QrCode className="w-3.5 h-3.5" />
                        </button>
                      ) : isErr ? (
                        <span title={row.errorMsg} className="inline-flex items-center text-red-500">
                          <AlertCircle className="w-4 h-4" />
                        </span>
                      ) : isBusy ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-400 mx-auto" />
                      ) : null}
                    </td>

                    {/* Xóa */}
                    <td className="px-2 py-1.5">
                      {!isDone && (
                        <button onClick={() => removeRow(row.id)} disabled={rows.length <= 1}
                          className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-20 disabled:cursor-not-allowed">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add row + Submit */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <button onClick={addRow} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="w-4 h-4" /> Thêm cuộn
          </button>

          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="font-semibold text-gray-900 dark:text-white">{pendingRows.length}</span> cuộn
              {totalWeight > 0 && <span className="ml-2">· <strong className="text-gray-900 dark:text-white">{fmt(totalWeight, 0)}</strong> kg</span>}
            </div>
            <button onClick={handleSubmit} disabled={submitting || pendingRows.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-linear-to-r from-emerald-600 to-green-700 text-white rounded-lg font-semibold hover:from-emerald-700 hover:to-green-800 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              {submitting ? 'Đang nhập...' : 'Nhập kho'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Recent ───────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Cuộn đã nhập</h2>
            <button onClick={loadRecent} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loadingRecent ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">Năm</option>
              {[...Array(5)].map((_, i) => { const y = new Date().getFullYear() - i; return <option key={y} value={String(y)}>{y}</option>; })}
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">Tháng</option>
              {[...Array(12)].map((_, i) => <option key={i + 1} value={String(i + 1)}>T{i + 1}</option>)}
            </select>
            <select value={filterDay} onChange={e => setFilterDay(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">Ngày</option>
              {[...Array(31)].map((_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={filterItem} onChange={e => setFilterItem(e.target.value)} placeholder="Mã hàng..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-36" />
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={recentFilter} onChange={e => setRecentFilter(e.target.value)} placeholder="Batch/tên..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-36" />
            </div>
            <button onClick={() => {
              const data = filtered.map((r, i) => {
                const b = r.batch;
                return { 'STT': i + 1, 'Batch': r.custom_batch_id || '', 'Mã hàng': b?.item || '', 'Rộng (mm)': b?.custom_coil_width_mm || '', 'Dày (mm)': b?.custom_coil_thickness_mm || '',
                  'KL (kg)': b?.custom_actual_weight_kg || '', 'Dài (m)': b?.custom_theoretical_length_m || '', 'NCC': b?.custom_supplier || '', 'Ngày': r.posting_date || '' };
              });
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Nhập cuộn');
              XLSX.writeFile(wb, `nhap-cuon-${filterYear||'all'}-${filterMonth||'all'}-${filterDay||'all'}.xlsx`);
            }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Xuất Excel">
              <Download className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {filtered.length} cuộn · {fmt(filtered.reduce((s, r) => s + (parseFloat(r.batch?.custom_actual_weight_kg) || 0), 0), 0)} kg
            </span>
          </div>
        </div>

        {loadingRecent ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Chưa có cuộn nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium w-10 text-center">#</th>
                  <th className="px-4 py-2 font-medium">Batch</th>
                  <th className="px-4 py-2 font-medium">Mã hàng</th>
                  <th className="px-4 py-2 font-medium">Kích thước</th>
                  <th className="px-4 py-2 font-medium">KL (kg)</th>
                  <th className="px-4 py-2 font-medium">Dài (m)</th>
                  <th className="px-4 py-2 font-medium">NCC</th>
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium w-10 text-center">QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((r, idx) => {
                  const b = r.batch;
                  return (
                    <tr key={r.name} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                      <td className="px-2 py-1.5.5 text-center text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{r.custom_batch_id || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{b?.item || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">
                        {b ? `${b.custom_coil_width_mm || '-'}×${b.custom_coil_thickness_mm || '-'}mm` : '-'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900 dark:text-white">{b ? fmt(b.custom_actual_weight_kg, 0) : '-'}</td>
                      <td className="px-4 py-2.5 text-blue-600 dark:text-blue-400 font-medium">{b ? fmt(b.custom_theoretical_length_m) : '-'}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400">{b?.custom_supplier || '-'}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{r.posting_date}</td>
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => setQrBatch({
                            name: r.custom_batch_id || r.name,
                            item: b?.item || '-',
                            width: b?.custom_coil_width_mm || '-',
                            thickness: b?.custom_coil_thickness_mm || '-',
                            weight: b?.custom_actual_weight_kg || 0,
                          })}
                          className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400" title="In QR"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
