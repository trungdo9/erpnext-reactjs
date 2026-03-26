import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Scissors, Plus, Loader2, CheckCircle, AlertCircle, X, Trash2,
  RefreshCw, Search, Scale, Ruler, QrCode, Printer, Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import { Html5Qrcode } from 'html5-qrcode';
import { call, db } from '../../api/frappeClient';

// ─── Constants ───────────────────────────────────────────────
const SOURCE_WH = 'Kho Nguyên liệu - TVS';
const TARGET_WH = 'Kho Bán thành phẩm - TVS';
const SCRAP_WH = 'Kho Phế liệu - TVS';
const COMPANY = 'Thép Việt Steel';
const DENSITY = 7850;

// ─── Helpers ─────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n, d = 2) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });
const calcWeight = (w_mm, l_m, t_mm) => (w_mm && l_m && t_mm) ? (w_mm / 1000) * l_m * (t_mm / 1000) * DENSITY : 0;
const calcLength = (kg, w_mm, t_mm) => (kg && w_mm && t_mm) ? kg / ((w_mm / 1000) * (t_mm / 1000) * DENSITY) : 0;

const newStrip = () => ({
  id: Date.now() + Math.random(),
  width_mm: '', length_m: '', actual_weight: '',
  status: 'idle', batchName: '', errorMsg: '',
});

// ─── Toast ───────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const c = toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white ${c}`}>
      {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── QR Modal ────────────────────────────────────────────────
function QRModal({ batch, onClose }) {
  if (!batch) return null;
  const ref = useRef();
  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write('<html><head><title>QR</title><style>body{font-family:sans-serif;text-align:center;padding:20px}p{margin:2px 0;font-size:13px}</style></head><body>');
    w.document.write(ref.current.innerHTML);
    w.document.write('</body></html>');
    w.document.close(); w.print();
  };
  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-6 max-w-xs w-full" onClick={e => e.stopPropagation()}>
        <div ref={ref} className="text-center space-y-2">
          <p className="font-bold text-gray-900 dark:text-white">{batch.name}</p>
          <QRCodeSVG value={batch.name} size={160} className="mx-auto" />
          <p className="text-xs text-gray-500">{batch.item} | {batch.width}×{batch.thickness}mm | {fmt(batch.weight, 0)}kg</p>
        </div>
        <button onClick={handlePrint} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-linear-to-r from-emerald-600 to-green-700 text-white rounded-xl font-semibold">
          <Printer className="w-4 h-4" /> In nhãn QR
        </button>
        <button onClick={onClose} className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700 py-1">Đóng</button>
      </div>
    </div>,
    document.body
  );
}

// ─── QR Scanner Modal ────────────────────────────────────────
function QRScanner({ onScan, onClose }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const containerRef = useCallback((node) => {
    if (!node) return;
    // Small delay to ensure DOM is painted
    const timer = setTimeout(() => {
      const id = 'qr-scanner-' + Date.now();
      node.id = id;
      const scanner = new Html5Qrcode(id);
      scannerRef.current = scanner;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          scanner.stop().catch(() => {});
          scannerRef.current = null;
          onScanRef.current(text);
        },
        () => {},
      ).catch((err) => {
        console.error('QR scanner error:', err);
        setError('Không thể mở camera. Kiểm tra quyền truy cập camera.');
      });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Quét QR cuộn nguồn</h3>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>
        <div ref={containerRef} className="rounded-lg overflow-hidden" style={{ minHeight: 280 }} />
        {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
        <button onClick={onClose} className="mt-3 w-full text-sm text-gray-500 hover:text-gray-700 py-1">Đóng</button>
      </div>
    </div>,
    document.body
  );
}

// ─── Batch Search Autocomplete ───────────────────────────────
function BatchSearch({ value, onSelect, onClear }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const ref = useRef();

  const handleScanResult = useCallback(async (text) => {
    setScanning(false);
    // text = batch name from QR, look it up
    try {
      const batches = await db.getDocList('Batch', {
        filters: [['name', '=', text], ['disabled', '=', 0]],
        fields: ['name', 'item', 'custom_coil_width_mm', 'custom_coil_thickness_mm', 'custom_actual_weight_kg', 'custom_theoretical_length_m', 'custom_origin_coil_batch', 'custom_segments'],
        limit: 1,
      });
      if (batches.length > 0) onSelect(batches[0]);
    } catch {}
  }, [onSelect]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const filters = [['disabled', '=', 0]];
        if (query.length >= 1) filters.push(['name', 'like', `%${query}%`]);
        const batches = await db.getDocList('Batch', {
          filters,
          fields: ['name', 'item', 'custom_coil_width_mm', 'custom_coil_thickness_mm', 'custom_actual_weight_kg', 'custom_theoretical_length_m', 'custom_origin_coil_batch', 'custom_segments'],
          limit: 15, orderBy: { field: 'creation', order: 'desc' },
        });
        setResults(batches);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query, open]);

  if (value) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg">
        <span className="font-medium text-orange-800 dark:text-orange-300 text-sm">{value.name}</span>
        <span className="text-xs text-gray-500">{value.item} | {value.custom_coil_width_mm}×{value.custom_coil_thickness_mm}mm | {fmt(value.custom_actual_weight_kg)}kg | {fmt(value.custom_theoretical_length_m)}m</span>
        <button onClick={onClear} className="ml-auto p-0.5 hover:bg-orange-100 rounded"><X className="w-3.5 h-3.5 text-orange-600" /></button>
      </div>
    );
  }

  return (
    <>
      {scanning && <QRScanner onScan={handleScanResult} onClose={() => setScanning(false)} />}
      <div className="flex gap-2">
        <div className="relative flex-1" ref={ref}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)} placeholder="Tìm batch cuộn nguồn (VD: HRC-1230...)"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
          {open && (loading || results.length > 0) && (
            <div className="absolute top-full left-0 mt-1 w-full max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[100]">
              {loading ? (
                <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-gray-400" /></div>
              ) : results.map(b => (
                <button key={b.name} onClick={() => { onSelect(b); setOpen(false); setQuery(''); }}
                  className="w-full text-left px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700/50 last:border-0 text-sm">
                  <div className="flex justify-between"><span className="font-medium">{b.name}</span><span className="text-gray-500">{fmt(b.custom_actual_weight_kg)} kg</span></div>
                  <div className="text-xs text-gray-500">{b.item} | {b.custom_coil_width_mm}×{b.custom_coil_thickness_mm}mm | {fmt(b.custom_theoretical_length_m)}m</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={() => setScanning(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap">
          <QrCode className="w-4 h-4" /> Quét QR
        </button>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function SlittingOrder() {
  const [toast, setToast] = useState(null);
  const [qrBatch, setQrBatch] = useState(null);
  const showToast = (type, msg) => { setToast({ type, message: msg }); setTimeout(() => setToast(null), 5000); };

  // Source coil
  const [sourceBatch, setSourceBatch] = useState(null);

  // Strips
  const [strips, setStrips] = useState([newStrip()]);
  const [slitLength, setSlitLength] = useState('');
  const [coilRemainWeight, setCoilRemainWeight] = useState('');
  const [scrapWeight, setScrapWeight] = useState('');
  const [postingDate, setPostingDate] = useState(today());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recent
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterDay, setFilterDay] = useState(String(new Date().getDate()));
  const [recentFilter, setRecentFilter] = useState('');

  // ─── Derived ───────────────────────────────────────────────
  const thick = sourceBatch?.custom_coil_thickness_mm || 0;
  const srcW = sourceBatch?.custom_coil_width_mm || 0;
  const srcLen = sourceBatch?.custom_theoretical_length_m || 0;
  const srcKg = sourceBatch?.custom_actual_weight_kg || 0;
  const slitLen = parseFloat(slitLength) || 0;

  let existingSegments = [];
  try { existingSegments = JSON.parse(sourceBatch?.custom_segments || '[]'); } catch {}

  const totalStripWidth = strips.reduce((s, st) => s + (parseFloat(st.width_mm) || 0), 0);
  const remainSlitWidth = srcW - totalStripWidth;
  const widthOverflow = totalStripWidth > srcW;

  const stripLens = strips.map(s => parseFloat(s.length_m) || slitLen);
  const maxStripLen = Math.max(...stripLens, 0);
  const stripTheoKg = strips.map((s, i) => calcWeight(parseFloat(s.width_mm) || 0, stripLens[i], thick));
  const totalStripActual = strips.reduce((s, st) => s + (parseFloat(st.actual_weight) || 0), 0);

  const scrap = parseFloat(scrapWeight) || 0;
  const coilRemainActual = parseFloat(coilRemainWeight) || 0;
  const isFullSlit = maxStripLen >= srcLen - 0.1;

  const newSegments = [];
  if (remainSlitWidth > 0 && maxStripLen > 0) {
    newSegments.push({ width_mm: remainSlitWidth, length_m: Math.round(maxStripLen * 100) / 100, note: 'Đã qua dao' });
  }
  if (!isFullSlit && srcLen - maxStripLen > 0.1) {
    newSegments.push({ width_mm: srcW, length_m: Math.round((srcLen - maxStripLen) * 100) / 100, note: 'Chưa qua dao' });
  }

  const coilRemainTheoKg = newSegments.reduce((sum, seg) => sum + calcWeight(seg.width_mm, seg.length_m, thick), 0);
  const totalOut = totalStripActual + coilRemainActual + scrap;
  const diff = srcKg - totalOut;
  const isBalanced = Math.abs(diff) < 5;

  // ─── Strip CRUD ────────────────────────────────────────────
  const updateStrip = (id, f, v) => setStrips(p => p.map(s => s.id === id ? { ...s, [f]: v } : s));
  const addStrip = () => setStrips(p => [...p, newStrip()]);
  const removeStrip = (id) => setStrips(p => p.length > 1 ? p.filter(s => s.id !== id) : p);

  // ─── Submit ────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!sourceBatch) { showToast('error', 'Chọn cuộn nguồn'); return; }
    if (widthOverflow) { showToast('error', 'Tổng rộng strip vượt rộng cuộn'); return; }
    if (strips.some(s => !s.width_mm || !s.actual_weight)) { showToast('error', 'Nhập đủ rộng & cân cho strip'); return; }
    if (strips.some((s, i) => !stripLens[i])) { showToast('error', 'Nhập chiều dài cho strip'); return; }
    const isFullConsume = isFullSlit && remainSlitWidth <= 0;
    if (!coilRemainActual && !isFullConsume) { showToast('error', 'Nhập cân cuộn gốc sau xả'); return; }

    setSubmitting(true);
    try {
      const origin = sourceBatch.custom_origin_coil_batch || sourceBatch.name;
      const consumedKg = totalStripActual + scrap;

      const makeSBB = async (itemCode, warehouse, txnType, batchNo, qty) => {
        const r = await call.post('frappe.client.insert', {
          doc: {
            doctype: 'Serial and Batch Bundle',
            item_code: itemCode, warehouse, company: COMPANY,
            type_of_transaction: txnType, voucher_type: 'Stock Entry',
            has_batch_no: 1,
            entries: [{ batch_no: batchNo, qty: txnType === 'Outward' ? -Math.abs(qty) : Math.abs(qty) }],
          },
        });
        return (r.message || r).name;
      };

      const sbbOut = await makeSBB(sourceBatch.item, SOURCE_WH, 'Outward', sourceBatch.name, consumedKg);

      const seItems = [{
        item_code: sourceBatch.item, qty: consumedKg,
        uom: 'Kg', stock_uom: 'Kg',
        s_warehouse: SOURCE_WH, serial_and_batch_bundle: sbbOut,
        allow_zero_valuation_rate: 1,
      }];

      const createdBatches = [];

      for (const s of strips) {
        const w = parseFloat(s.width_mm);
        const kg = parseFloat(s.actual_weight);
        const len = calcLength(kg, w, thick);

        const bName = `STR-${w}x${thick}-${postingDate.replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
        let itemCode = sourceBatch.item;
        try {
          const items = await db.getDocList('Item', {
            filters: [['name', 'like', `%${w}x${thick}%`], ['has_variants', '=', 0], ['disabled', '=', 0]],
            fields: ['name'], limit: 1,
          });
          if (items.length > 0) itemCode = items[0].name;
        } catch (_) {}

        const batchRes = await call.post('frappe.client.insert', {
          doc: {
            doctype: 'Batch', batch_id: bName, item: itemCode,
            custom_coil_width_mm: w, custom_coil_thickness_mm: thick,
            custom_actual_weight_kg: kg,
            custom_theoretical_length_m: Math.round(len * 100) / 100,
            custom_source_batch: sourceBatch.name,
            custom_origin_coil_batch: origin,
            custom_source_type: 'Xả băng',
          },
        });
        const doc = batchRes.message || batchRes;
        createdBatches.push(doc);

        const sbbStrip = await makeSBB(itemCode, TARGET_WH, 'Inward', doc.name, kg);
        seItems.push({
          item_code: itemCode, qty: kg, uom: 'Kg', stock_uom: 'Kg',
          t_warehouse: TARGET_WH, serial_and_batch_bundle: sbbStrip,
          set_basic_rate_manually: 1, basic_rate: 0, allow_zero_valuation_rate: 1,
        });
      }

      if (scrap > 0) {
        seItems.push({
          item_code: 'Phế liệu thép', qty: scrap, uom: 'Kg', stock_uom: 'Kg',
          t_warehouse: SCRAP_WH, set_basic_rate_manually: 1, basic_rate: 0, allow_zero_valuation_rate: 1,
        });
      }

      const seRes = await call.post('frappe.client.insert', {
        doc: {
          doctype: 'Stock Entry', stock_entry_type: 'Repack', company: COMPANY,
          posting_date: postingDate, custom_production_type: 'Xả băng',
          custom_source_batch: sourceBatch.name,
          remarks: notes || `Xả từ ${sourceBatch.name}: ${strips.map((s, i) => `${s.width_mm}mm×${fmt(stripLens[i], 1)}m`).join(' + ')}`,
          items: seItems,
        },
      });
      const se = seRes.message || seRes;
      await call.post('frappe.client.submit', { doc: se });

      try {
        await call.post('frappe.client.set_value', {
          doctype: 'Batch', name: sourceBatch.name,
          fieldname: { custom_actual_weight_kg: coilRemainActual, custom_segments: JSON.stringify(newSegments) },
        });
      } catch (_) {}

      showToast('success', `OK: ${se.name} — ${createdBatches.length} strip tạo thành công`);

      // Reset
      setSourceBatch(null); setStrips([newStrip()]); setSlitLength('');
      setCoilRemainWeight(''); setScrapWeight(''); setNotes('');
      loadRecent();
    } catch (err) {
      console.error('Xả băng error:', err);
      let msg = 'Lỗi khi xả băng';
      try {
        const raw = err?.response?.data || err;
        if (raw?._server_messages) {
          const parsed = JSON.parse(raw._server_messages);
          msg = parsed.map(m => { try { return JSON.parse(m).message; } catch { return m; } }).join('; ');
        } else if (raw?.exception) {
          msg = raw.exception.split(':').slice(1).join(':').trim() || raw.exception;
        } else if (err?.message) { msg = err.message; }
      } catch (_) {}
      showToast('error', msg);
    } finally { setSubmitting(false); }
  };

  // ─── Recent ────────────────────────────────────────────────
  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const entries = await db.getDocList('Stock Entry', {
        filters: [['stock_entry_type', '=', 'Repack'], ['docstatus', '=', 1], ['custom_production_type', '=', 'Xả băng']],
        fields: ['name', 'posting_date', 'custom_source_batch', 'remarks', 'total_outgoing_value'],
        orderBy: { field: 'posting_date', order: 'desc' }, limit: 200,
      });
      // Fetch source batch details
      const batchIds = [...new Set(entries.map(e => e.custom_source_batch).filter(Boolean))];
      let batchMap = {};
      if (batchIds.length > 0) {
        try {
          const batches = await db.getDocList('Batch', {
            filters: [['name', 'in', batchIds]],
            fields: ['name', 'item', 'custom_coil_width_mm', 'custom_coil_thickness_mm', 'custom_actual_weight_kg'],
            limit: batchIds.length,
          });
          for (const b of batches) batchMap[b.name] = b;
        } catch {}
      }
      // Fetch SE items to count strips & total weight
      const seNames = entries.map(e => e.name);
      let itemMap = {};
      if (seNames.length > 0) {
        try {
          const items = await db.getDocList('Stock Entry Detail', {
            filters: [['parent', 'in', seNames], ['t_warehouse', '!=', '']],
            fields: ['parent', 'item_code', 'qty', 't_warehouse'],
            limit: seNames.length * 10,
          });
          for (const it of items) {
            if (!itemMap[it.parent]) itemMap[it.parent] = [];
            itemMap[it.parent].push(it);
          }
        } catch {}
      }
      setRecent(entries.map(e => ({
        ...e,
        batch: batchMap[e.custom_source_batch] || null,
        outputItems: itemMap[e.name] || [],
      })));
    } catch { setRecent([]); }
    setLoadingRecent(false);
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const filtered = recent.filter(r => {
    const d = r.posting_date || '';
    if (filterYear && d.slice(0, 4) !== filterYear) return false;
    if (filterMonth && d.slice(5, 7) !== filterMonth.padStart(2, '0')) return false;
    if (filterDay && d.slice(8, 10) !== filterDay.padStart(2, '0')) return false;
    if (recentFilter) {
      const q = recentFilter.toLowerCase();
      if (!r.name?.toLowerCase().includes(q) && !r.custom_source_batch?.toLowerCase().includes(q) && !r.remarks?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <QRModal batch={qrBatch} onClose={() => setQrBatch(null)} />

      {/* ── Source Coil ─────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2"><Scissors className="w-4 h-4" /> Cuộn nguồn</h2>
        </div>
        <div className="p-4 space-y-3">
        <BatchSearch value={sourceBatch} onSelect={setSourceBatch} onClear={() => setSourceBatch(null)} />

        {sourceBatch && (
          <>
            {/* Source info cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ['Mã hàng', sourceBatch.item, 'from-blue-500 to-blue-600'],
                ['Rộng', `${srcW} mm`, 'from-violet-500 to-purple-600'],
                ['Dày', `${thick} mm`, 'from-cyan-500 to-teal-600'],
                ['Dài', `${fmt(srcLen)} m`, 'from-emerald-500 to-green-600'],
                ['KL', `${fmt(srcKg)} kg`, 'from-orange-500 to-red-500'],
              ].map(([label, val, grad]) => (
                <div key={label} className={`text-center p-3 rounded-xl bg-gradient-to-br ${grad} shadow-sm`}>
                  <p className="text-[10px] text-white/70 uppercase tracking-wide font-medium">{label}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{val}</p>
                </div>
              ))}
            </div>

            {existingSegments.length > 0 && (
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-700 text-xs">
                <p className="font-medium text-amber-800 dark:text-amber-300">Đã xả trước — {existingSegments.length} đoạn:</p>
                {existingSegments.map((seg, i) => (
                  <p key={i} className="text-amber-700 dark:text-amber-400">• {seg.width_mm}mm × {fmt(seg.length_m)}m {seg.note ? `(${seg.note})` : ''}</p>
                ))}
              </div>
            )}

            {/* Width bar */}
            <div className="p-3 bg-gradient-to-r from-gray-50 to-orange-50 dark:from-gray-700/30 dark:to-orange-900/10 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex justify-between text-xs mb-1">
                <span>Strip: <strong>{totalStripWidth}</strong> / {srcW} mm</span>
                <span className={widthOverflow ? 'text-red-600 font-bold' : remainSlitWidth > 0 ? 'text-blue-600' : 'text-green-600 font-medium'}>
                  {widthOverflow ? 'Vượt rộng!' : remainSlitWidth > 0 ? `Dính cuộn: ${remainSlitWidth}mm` : 'Xả hết rộng'}
                </span>
              </div>
              <div className="w-full h-2.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden flex">
                {strips.map(s => {
                  const w = parseFloat(s.width_mm) || 0;
                  return <div key={s.id} className="h-full bg-orange-500 border-r border-white" style={{ width: `${(w / srcW) * 100}%` }} />;
                })}
                {remainSlitWidth > 0 && !widthOverflow && (
                  <div className="h-full bg-blue-300/50" style={{ width: `${(remainSlitWidth / srcW) * 100}%` }} />
                )}
              </div>
            </div>
          </>
        )}
        </div>
      </div>

      {/* ── Default Slit Length ─────────────────────────────── */}
      {sourceBatch && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Ruler className="w-4 h-4 text-blue-600" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Dài mặc định (m)</label>
            <input type="number" value={slitLength} onChange={e => setSlitLength(e.target.value)}
              placeholder={`Max ${fmt(srcLen, 1)}`}
              className="w-32 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            <span className="text-xs text-gray-500">/ {fmt(srcLen)} m</span>
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={isFullSlit && slitLen > 0}
                onChange={e => setSlitLength(e.target.checked ? String(srcLen) : '')}
                className="w-4 h-4 rounded border-gray-300 text-blue-600" />
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400">Xả hết cuộn</span>
            </label>
          </div>
        </div>
      )}

      {/* ── Strip Table ────────────────────────────────────── */}
      {sourceBatch && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ overflow: 'visible' }}>
          <div className="px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Strip tách ra → kho BTP</h2>
            <button onClick={addStrip} className="flex items-center gap-1 text-xs text-white/90 hover:text-white font-medium">
              <Plus className="w-3.5 h-3.5" /> Thêm strip
            </button>
          </div>

          <div className="overflow-x-auto" style={{ overflow: 'visible' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2 w-10 text-center">#</th>
                  <th className="px-3 py-2">Rộng (mm)</th>
                  <th className="px-3 py-2">Dài (m)</th>
                  <th className="px-3 py-2">KL lý thuyết</th>
                  <th className="px-3 py-2">KL thực tế (kg)</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {strips.map((s, i) => {
                  const otherW = strips.reduce((sum, st) => st.id === s.id ? sum : sum + (parseFloat(st.width_mm) || 0), 0);
                  const remainForThis = srcW - otherW;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                      <td className="px-3 py-2 text-center text-xs text-gray-400 font-bold">{i + 1}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <input type="number" value={s.width_mm} onChange={e => updateStrip(s.id, 'width_mm', e.target.value)}
                            placeholder="VD: 200"
                            className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                          {i === strips.length - 1 && remainForThis > 0 && (
                            <label className="flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                              <input type="checkbox"
                                checked={parseFloat(s.width_mm) === remainForThis}
                                onChange={e => updateStrip(s.id, 'width_mm', e.target.checked ? String(remainForThis) : '')}
                                className="w-3.5 h-3.5 rounded border-gray-300 text-orange-600" />
                              <span className="text-[10px] text-orange-600 font-medium">Hết ({remainForThis})</span>
                            </label>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <input type="number" value={s.length_m} onChange={e => updateStrip(s.id, 'length_m', e.target.value)}
                            placeholder={slitLen ? String(slitLen) : `Max ${fmt(srcLen, 1)}`}
                            className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                          <label className="flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                            <input type="checkbox"
                              checked={parseFloat(s.length_m) >= srcLen - 0.1 && parseFloat(s.length_m) > 0}
                              onChange={e => updateStrip(s.id, 'length_m', e.target.checked ? String(srcLen) : '')}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-blue-600" />
                            <span className="text-[10px] text-blue-600 font-medium">Hết</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-indigo-600 dark:text-indigo-400 font-medium">
                        {stripTheoKg[i] > 0 ? `${fmt(stripTheoKg[i])} kg` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="relative">
                            <input type="number" value={s.actual_weight} onChange={e => updateStrip(s.id, 'actual_weight', e.target.value)}
                              placeholder={stripTheoKg[i] > 0 ? String(Math.round(stripTheoKg[i])) : ''}
                              className="w-28 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm pr-7" />
                            <Scale className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                          </div>
                          <label className="flex items-center gap-1 cursor-pointer select-none whitespace-nowrap">
                            <input type="checkbox"
                              checked={stripTheoKg[i] > 0 && Math.abs((parseFloat(s.actual_weight) || 0) - Math.round(stripTheoKg[i])) < 1}
                              onChange={e => updateStrip(s.id, 'actual_weight', e.target.checked && stripTheoKg[i] > 0 ? String(Math.round(stripTheoKg[i])) : '')}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-orange-600" />
                            <span className="text-[10px] text-orange-600 font-medium">=LT</span>
                          </label>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => removeStrip(s.id)} disabled={strips.length <= 1}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-30">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Coil Remain + Scrap + Balance ─────────────────── */}
      {sourceBatch && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Coil remain + scrap + date */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500">
              <h2 className="text-sm font-semibold text-white">Cuộn gốc sau xả</h2>
            </div>
            <div className="p-4 space-y-3">

            {newSegments.length > 0 && (
              <div className="text-xs text-green-700 dark:text-green-400 space-y-0.5">
                <p className="font-medium">Sẽ có {newSegments.length} đoạn:</p>
                {newSegments.map((seg, i) => (
                  <p key={i}>• {seg.width_mm}mm × {fmt(seg.length_m)}m — {seg.note}</p>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">KL lý thuyết</label>
                <p className="text-sm font-medium text-indigo-600">{coilRemainTheoKg > 0 ? `${fmt(coilRemainTheoKg)} kg` : '—'}</p>
              </div>
              <div>
                <label className="text-xs text-gray-500">KL thực tế (kg) — CÂN LẠI</label>
                <div className="relative">
                  <input type="number" value={coilRemainWeight} onChange={e => setCoilRemainWeight(e.target.value)}
                    placeholder={coilRemainTheoKg > 0 ? String(Math.round(coilRemainTheoKg)) : ''}
                    className="w-full px-3 py-1.5 border border-green-300 dark:border-green-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm pr-8" />
                  <Scale className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Phế (kg)</label>
                <input type="number" value={scrapWeight} onChange={e => setScrapWeight(e.target.value)} placeholder="0"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ngày SX</label>
                <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Ghi chú</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="VD: ĐH #123"
                  className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
              </div>
            </div>
            </div>
          </div>

          {/* Right: Balance */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className={`px-4 py-2.5 ${isBalanced ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-amber-500 to-orange-500'}`}>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                {isBalanced ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                Cân bằng KL
              </h2>
            </div>
            <div className={`p-4 ${isBalanced ? 'bg-green-50 dark:bg-green-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
            <div className="text-sm space-y-1">
              <div className="flex justify-between font-medium"><span>Cuộn ban đầu</span><span>{fmt(srcKg)} kg</span></div>
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
              {strips.map((s, i) => (
                <div key={s.id} className="flex justify-between text-orange-700 dark:text-orange-400">
                  <span>Strip {s.width_mm || '?'}mm × {fmt(stripLens[i])}m</span>
                  <span>{s.actual_weight ? `${fmt(parseFloat(s.actual_weight))} kg` : '—'}</span>
                </div>
              ))}
              <div className="flex justify-between text-green-700 dark:text-green-400">
                <span>Cuộn gốc sau xả</span>
                <span>{coilRemainActual ? `${fmt(coilRemainActual)} kg` : '—'}</span>
              </div>
              {scrap > 0 && <div className="flex justify-between text-red-600"><span>Phế</span><span>{fmt(scrap)} kg</span></div>}
              <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
              <div className={`flex justify-between font-bold ${isBalanced ? 'text-green-700' : 'text-amber-700'}`}>
                <span>Chênh lệch</span><span>{diff > 0 ? '+' : ''}{fmt(diff, 1)} kg</span>
              </div>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Submit ─────────────────────────────────────────── */}
      {sourceBatch && (
        <div className="flex justify-end">
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 disabled:opacity-60 font-semibold shadow-lg">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Scissors className="w-5 h-5" />}
            {submitting ? 'Đang xử lý...' : 'Xác nhận xả băng'}
          </button>
        </div>
      )}

      {/* ── Recent ─────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-600 to-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-white text-sm">Lệnh xả băng gần đây</h2>
          <button onClick={loadRecent} className="p-1.5 hover:bg-white/10 rounded-lg">
              <RefreshCw className={`w-4 h-4 text-white/70 ${loadingRecent ? 'animate-spin' : ''}`} />
            </button>
        </div>
        <div className="px-4 py-2.5 border-b border-gray-200 dark:border-gray-700">
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
              <input type="text" value={recentFilter} onChange={e => setRecentFilter(e.target.value)} placeholder="Tìm..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-36" />
            </div>
            <button onClick={() => {
              const data = filtered.map((r, i) => {
                const b = r.batch;
                const st = (r.outputItems || []).filter(it => it.t_warehouse && !it.item_code?.includes('Phế'));
                const kg = st.reduce((s, it) => s + (parseFloat(it.qty) || 0), 0);
                return {
                  'STT': i + 1, 'Mã phiếu': r.name, 'Cuộn nguồn': r.custom_source_batch || '',
                  'Kích thước': b ? `${b.custom_coil_width_mm}×${b.custom_coil_thickness_mm}mm` : '',
                  'Số strip': st.length, 'KL xuất (kg)': kg || '',
                  'Ngày': r.posting_date || '', 'Ghi chú': r.remarks || '',
                };
              });
              const ws = XLSX.utils.json_to_sheet(data);
              const wb = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(wb, ws, 'Xả băng');
              XLSX.writeFile(wb, `xa-bang-${filterYear || 'all'}-${filterMonth || 'all'}-${filterDay || 'all'}.xlsx`);
            }} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Xuất Excel">
              <Download className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {filtered.length} lệnh · {fmt(filtered.reduce((s, r) => s + (r.outputItems || []).filter(it => it.t_warehouse && !it.item_code?.includes('Phế')).reduce((ss, it) => ss + (parseFloat(it.qty) || 0), 0), 0), 0)} kg
            </span>
          </div>
        </div>

        {loadingRecent ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Chưa có lệnh nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2 w-10 text-center">#</th>
                  <th className="px-3 py-2">Mã phiếu</th>
                  <th className="px-3 py-2">Cuộn nguồn</th>
                  <th className="px-3 py-2">Kích thước</th>
                  <th className="px-3 py-2">Strip</th>
                  <th className="px-3 py-2">KL xuất (kg)</th>
                  <th className="px-3 py-2">Ngày</th>
                  <th className="px-3 py-2 w-10 text-center">QR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((r, idx) => {
                  const b = r.batch;
                  const strips = (r.outputItems || []).filter(it => it.t_warehouse && !it.item_code?.includes('Phế'));
                  const totalKg = strips.reduce((s, it) => s + (parseFloat(it.qty) || 0), 0);
                  const stripSummary = strips.map(it => it.item_code?.match(/(\d+)x/)?.[1] || '?').join('+');
                  return (
                  <tr key={r.name} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                    <td className="px-3 py-2.5 text-center text-xs text-gray-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white text-xs">{r.name}</td>
                    <td className="px-3 py-2.5 text-orange-600 dark:text-orange-400 font-medium text-xs">{r.custom_source_batch || '-'}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-300 text-xs">
                      {b ? `${b.custom_coil_width_mm}×${b.custom_coil_thickness_mm}mm` : '-'}
                    </td>
                    <td className="px-3 py-2.5 text-xs">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">{strips.length} strip</span>
                      {stripSummary && <span className="text-gray-400 ml-1">({stripSummary}mm)</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-900 dark:text-white font-medium text-xs">{totalKg > 0 ? fmt(totalKg, 0) : '-'}</td>
                    <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{r.posting_date}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button onClick={() => setQrBatch({
                        name: r.custom_source_batch || r.name,
                        item: b?.item || '-',
                        width: b?.custom_coil_width_mm || '-',
                        thickness: b?.custom_coil_thickness_mm || '-',
                        weight: b?.custom_actual_weight_kg || 0,
                      })}
                        className="p-1 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400" title="QR">
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
