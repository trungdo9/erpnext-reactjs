import { useState, useEffect, useCallback } from 'react';
import {
  LayoutGrid, Loader2, CheckCircle, AlertCircle, X, Search,
  ChevronRight, ChevronLeft, Scale, RefreshCw
} from 'lucide-react';
import { call, db } from '../../api/frappeClient';

const SOURCE_WAREHOUSES = ['Kho Bán thành phẩm - TVS', 'Kho Nguyên liệu - TVS'];
const TARGET_WAREHOUSE = 'Kho Thành phẩm - TVS';
const SCRAP_WAREHOUSE = 'Kho Phế liệu - TVS';
const DENSITY = 7850;

function todayStr() { return new Date().toISOString().slice(0, 10); }
function formatNum(n, d = 2) { return n == null || isNaN(n) ? '-' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function calcSheetWeight(width_mm, cut_length_mm, thickness_mm) {
  if (!width_mm || !cut_length_mm || !thickness_mm) return 0;
  return (width_mm / 1000) * (cut_length_mm / 1000) * (thickness_mm / 1000) * DENSITY;
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const c = toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${c} text-white`}>
      {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onClose}><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function CuttingOrder() {
  const [step, setStep] = useState(1);
  const [toast, setToast] = useState(null);
  const showToast = (type, message) => { setToast({ type, message }); setTimeout(() => setToast(null), 4000); };

  // Step 1
  const [batchSearch, setBatchSearch] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [sourceBatch, setSourceBatch] = useState(null);
  const [sourceWarehouse, setSourceWarehouse] = useState(SOURCE_WAREHOUSES[0]);

  // Step 2
  const [cutLength_mm, setCutLength_mm] = useState('2000');
  const [numSheets, setNumSheets] = useState('');
  const [postingDate, setPostingDate] = useState(todayStr());
  const [notes, setNotes] = useState('');

  // Step 3
  const [actualTotalWeight, setActualTotalWeight] = useState('');
  const [scrapWeight, setScrapWeight] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  // Derived
  const coilLength_m = sourceBatch?.custom_theoretical_length_m || 0;
  const width_mm = sourceBatch?.custom_coil_width_mm || 0;
  const thickness_mm = sourceBatch?.custom_coil_thickness_mm || 0;
  const inputWeight = sourceBatch?.custom_actual_weight_kg || 0;
  const cutLen = parseFloat(cutLength_mm) || 0;
  const maxSheets = coilLength_m > 0 && cutLen > 0 ? Math.floor((coilLength_m * 1000) / cutLen) : 0;
  const sheets = parseInt(numSheets) || 0;
  const weightPerSheet = calcSheetWeight(width_mm, cutLen, thickness_mm);
  const totalTheoreticalWeight = weightPerSheet * sheets;
  const usedLength_m = (cutLen * sheets) / 1000;
  const scrap = parseFloat(scrapWeight) || 0;
  const actualTotal = parseFloat(actualTotalWeight) || 0;
  const outputWt = actualTotal || totalTheoreticalWeight;
  const remainingWeight = inputWeight - outputWt - scrap;

  // Batch search
  const searchBatches = useCallback(async (query) => {
    setLoadingBatches(true);
    try {
      const filters = [['disabled', '=', 0]];
      if (query && query.length >= 1) filters.push(['name', 'like', `%${query}%`]);
      const batches = await db.getDocList('Batch', {
        filters,
        fields: ['name', 'item', 'custom_coil_width_mm', 'custom_coil_thickness_mm', 'custom_actual_weight_kg', 'custom_theoretical_length_m', 'custom_origin_coil_batch', 'custom_source_batch'],
        limit: 15,
        orderBy: { field: 'creation', order: 'desc' },
      });
      setBatchResults(batches);
    } catch (e) { console.error(e); }
    finally { setLoadingBatches(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchBatches(batchSearch), 300);
    return () => clearTimeout(t);
  }, [batchSearch, searchBatches]);

  const handleBatchFocus = () => { if (!sourceBatch && batchResults.length === 0) searchBatches(''); };

  // Submit
  const handleSubmit = async () => {
    if (!sourceBatch) { showToast('error', 'Chọn nguồn'); return; }
    if (!sheets || sheets <= 0) { showToast('error', 'Nhập số tấm'); return; }

    setSubmitting(true);
    try {
      const originBatch = sourceBatch.custom_origin_coil_batch || sourceBatch.name;

      let outputItemCode = sourceBatch.item;
      try {
        const items = await db.getDocList('Item', {
          filters: [['name', 'like', `%${width_mm}x${cutLen}x${thickness_mm}%`], ['has_variants', '=', 0]],
          fields: ['name'], limit: 1,
        });
        if (items.length > 0) outputItemCode = items[0].name;
      } catch (_) {}

      const batchName = `SHT-${width_mm}x${cutLen}x${thickness_mm}-${postingDate.replace(/-/g, '')}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      const batchRes = await call.post('frappe.client.insert', {
        doc: {
          doctype: 'Batch', batch_id: batchName, item: outputItemCode,
          custom_coil_width_mm: width_mm, custom_coil_thickness_mm: thickness_mm,
          custom_actual_weight_kg: outputWt,
          custom_source_batch: sourceBatch.name, custom_origin_coil_batch: originBatch,
          custom_source_type: 'Cắt tấm', custom_sheet_count: sheets, custom_sheet_length_mm: cutLen,
        },
      });
      const batchDoc = batchRes.message || batchRes;

      // Helper: create Serial and Batch Bundle for Frappe v16
      const makeSBB = async (itemCode, warehouse, txnType, batchNo, qty) => {
        const r = await call.post('frappe.client.insert', {
          doc: {
            doctype: 'Serial and Batch Bundle',
            item_code: itemCode, warehouse, company: 'Thép Việt Steel',
            type_of_transaction: txnType, voucher_type: 'Stock Entry',
            has_batch_no: 1,
            entries: [{ batch_no: batchNo, qty: txnType === 'Outward' ? -Math.abs(qty) : Math.abs(qty) }],
          },
        });
        return (r.message || r).name;
      };

      // Only consume what we take out (output + scrap), coil stock auto-reduces
      const consumedKg = outputWt + scrap;

      const sbbSrc = await makeSBB(sourceBatch.item, sourceWarehouse, 'Outward', sourceBatch.name, consumedKg);
      const sbbOut = await makeSBB(outputItemCode, TARGET_WAREHOUSE, 'Inward', batchDoc.name, outputWt);

      const seItems = [
        { item_code: sourceBatch.item, qty: consumedKg, uom: 'Kg', stock_uom: 'Kg', s_warehouse: sourceWarehouse, serial_and_batch_bundle: sbbSrc, allow_zero_valuation_rate: 1 },
        { item_code: outputItemCode, qty: outputWt, uom: 'Kg', stock_uom: 'Kg', t_warehouse: TARGET_WAREHOUSE, serial_and_batch_bundle: sbbOut, set_basic_rate_manually: 1, basic_rate: 0, allow_zero_valuation_rate: 1 },
      ];

      if (scrap > 0) {
        seItems.push({ item_code: 'Phế liệu thép', qty: scrap, uom: 'Kg', stock_uom: 'Kg', t_warehouse: SCRAP_WAREHOUSE, set_basic_rate_manually: 1, basic_rate: 0, allow_zero_valuation_rate: 1 });
      }

      // Update source batch metadata (stock auto-reduces via SBB)
      if (remainingWeight > 0.5) {
        try { await call.post('frappe.client.set_value', { doctype: 'Batch', name: sourceBatch.name, fieldname: { custom_actual_weight_kg: remainingWeight, custom_theoretical_length_m: Math.round((coilLength_m - usedLength_m) * 100) / 100 } }); } catch (_) {}
      }

      const seRes = await call.post('frappe.client.insert', {
        doc: {
          doctype: 'Stock Entry', stock_entry_type: 'Repack', company: 'Thép Việt Steel', posting_date: postingDate,
          custom_production_type: 'Cắt tấm', custom_source_batch: sourceBatch.name,
          remarks: notes || `Cắt ${sheets} tấm ${width_mm}x${cutLen}x${thickness_mm} từ ${sourceBatch.name}`,
          items: seItems,
        },
      });
      const se = seRes.message || seRes;
      await call.post('frappe.client.submit', { doc: se });

      showToast('success', `Hoàn thành: ${se.name} - ${sheets} tấm`);
      setStep(1); setSourceBatch(null); setBatchSearch(''); setCutLength_mm('2000'); setNumSheets('');
      setActualTotalWeight(''); setScrapWeight(''); setNotes('');
      loadRecentOrders();
    } catch (err) {
      console.error('Cắt tấm error:', err);
      let msg = 'Lỗi khi tạo lệnh cắt tấm';
      try {
        const raw = err?.response?.data || err;
        if (raw?._server_messages) {
          const parsed = JSON.parse(raw._server_messages);
          msg = parsed.map(m => { try { return JSON.parse(m).message; } catch { return m; } }).join('; ');
        } else if (raw?.exception) {
          msg = raw.exception.split(':').slice(1).join(':').trim() || raw.exception;
        } else if (err?.message) msg = err.message;
      } catch (_) {}
      showToast('error', msg);
    } finally { setSubmitting(false); }
  };

  const loadRecentOrders = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const entries = await db.getDocList('Stock Entry', {
        filters: [['custom_production_type', '=', 'Cắt tấm'], ['docstatus', '=', 1]],
        fields: ['name', 'posting_date', 'custom_source_batch', 'remarks'],
        orderBy: { field: 'posting_date', order: 'desc' }, limit: 20,
      });
      setRecentOrders(entries);
    } catch (e) { console.error(e); }
    finally { setLoadingRecent(false); }
  }, []);

  useEffect(() => { loadRecentOrders(); }, [loadRecentOrders]);

  const stepTitles = ['Chọn nguồn', 'Cài đặt cắt', 'Cân & Phế', 'Xác nhận'];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Stepper */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {stepTitles.map((title, i) => {
          const s = i + 1, active = step === s, done = step > s;
          return (
            <button key={s} onClick={() => { if (done || s <= step) setStep(s); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${active ? 'bg-green-600 text-white' : done ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
              <span className={`w-5 h-5 flex items-center justify-center rounded-full text-xs ${active ? 'bg-white/20' : done ? 'bg-green-200 dark:bg-green-800' : 'bg-gray-200 dark:bg-gray-600'}`}>
                {done ? <CheckCircle className="w-3.5 h-3.5" /> : s}
              </span>
              <span className="hidden sm:inline">{title}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 md:p-6">

            {/* Step 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bước 1: Chọn cuộn/strip nguồn</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kho nguồn</label>
                  <select value={sourceWarehouse} onChange={e => setSourceWarehouse(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
                    {SOURCE_WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input type="text" value={sourceBatch ? sourceBatch.name : batchSearch}
                    onChange={e => { setBatchSearch(e.target.value); setSourceBatch(null); }}
                    onFocus={handleBatchFocus}
                    placeholder="Tìm batch..."
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  {loadingBatches && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />}
                </div>
                {batchResults.length > 0 && !sourceBatch && (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                    {batchResults.map(b => (
                      <button key={b.name} onClick={() => { setSourceBatch(b); setBatchResults([]); }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white">{b.name}</span>
                          <span className="text-sm text-gray-500">{formatNum(b.custom_actual_weight_kg)} kg</span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{b.item} | {b.custom_coil_width_mm}x{b.custom_coil_thickness_mm}mm | {formatNum(b.custom_theoretical_length_m)}m</div>
                      </button>
                    ))}
                  </div>
                )}
                {sourceBatch && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-green-800 dark:text-green-300">{sourceBatch.name}</h3>
                      <button onClick={() => { setSourceBatch(null); setBatchSearch(''); }}><X className="w-4 h-4 text-green-600" /></button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                      <div><span className="text-gray-500">Item</span><p className="font-medium text-gray-900 dark:text-white">{sourceBatch.item}</p></div>
                      <div><span className="text-gray-500">Rộng</span><p>{width_mm} mm</p></div>
                      <div><span className="text-gray-500">Dày</span><p>{thickness_mm} mm</p></div>
                      <div><span className="text-gray-500">KL</span><p className="font-semibold text-green-700 dark:text-green-300">{formatNum(inputWeight)} kg</p></div>
                      <div><span className="text-gray-500">Dài</span><p>{formatNum(coilLength_m)} m</p></div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={() => { if (sourceBatch) setStep(2); else showToast('error', 'Chọn nguồn'); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    Tiếp theo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && sourceBatch && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bước 2: Cài đặt cắt</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chiều dài cắt (mm)</label>
                    <input type="number" value={cutLength_mm} onChange={e => setCutLength_mm(e.target.value)} placeholder="2000"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Số tấm</label>
                    <input type="number" value={numSheets} onChange={e => setNumSheets(e.target.value)} placeholder={String(maxSheets)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <p className="text-xs text-gray-400 mt-1">Tối đa: {maxSheets} tấm (chiều dài cuộn: {formatNum(coilLength_m)}m)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ngày SX</label>
                    <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                </div>

                {cutLen > 0 && sheets > 0 && (
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    <h4 className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2 flex items-center gap-1">
                      <Scale className="w-4 h-4" /> Tính toán lý thuyết
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-gray-500">Kích thước tấm</span><p className="font-medium text-gray-900 dark:text-white">{width_mm} x {cutLen} x {thickness_mm} mm</p></div>
                      <div><span className="text-gray-500">KL/tấm</span><p className="font-medium text-indigo-700 dark:text-indigo-300">{formatNum(weightPerSheet)} kg</p></div>
                      <div><span className="text-gray-500">Tổng KL ({sheets} tấm)</span><p className="font-bold text-indigo-700 dark:text-indigo-300">{formatNum(totalTheoreticalWeight)} kg</p></div>
                      <div><span className="text-gray-500">Dùng hết</span><p>{formatNum(usedLength_m)} / {formatNum(coilLength_m)} m</p></div>
                    </div>
                    {sheets > maxSheets && <p className="mt-2 text-sm text-red-600 font-medium">Vượt quá chiều dài cuộn!</p>}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ghi chú</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm" />
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <ChevronLeft className="w-4 h-4" /> Quay lại
                  </button>
                  <button onClick={() => { if (sheets > 0 && cutLen > 0) setStep(3); else showToast('error', 'Nhập đầy đủ'); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    Tiếp theo <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bước 3: Cân thực tế & Phế liệu</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tổng KL thực tế ({sheets} tấm) (kg)</label>
                    <input type="number" value={actualTotalWeight} onChange={e => setActualTotalWeight(e.target.value)}
                      placeholder={String(Math.round(totalTheoreticalWeight))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                    <p className="text-xs text-gray-400 mt-1">LT: {formatNum(totalTheoreticalWeight)} kg | KL/tấm: {formatNum(weightPerSheet)} kg</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phế liệu (kg)</label>
                    <input type="number" value={scrapWeight} onChange={e => setScrapWeight(e.target.value)} placeholder="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                  </div>
                </div>

                <div className={`p-4 rounded-lg border-2 ${remainingWeight >= -0.5 ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20' : 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20'}`}>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    {remainingWeight >= -0.5 ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                    Cân bằng khối lượng
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                      <p className="text-gray-500">Input</p><p className="font-bold text-lg">{formatNum(inputWeight, 0)} kg</p>
                    </div>
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                      <p className="text-gray-500">Output</p><p className="font-bold text-lg text-green-600">{formatNum(outputWt, 0)} kg</p><p className="text-xs text-gray-400">{sheets} tấm</p>
                    </div>
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                      <p className="text-gray-500">Phế</p><p className="font-bold text-lg text-red-600">{formatNum(scrap, 0)} kg</p>
                    </div>
                    <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                      <p className="text-gray-500">Còn lại</p><p className={`font-bold text-lg ${remainingWeight >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatNum(remainingWeight, 0)} kg</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <button onClick={() => setStep(2)} className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <ChevronLeft className="w-4 h-4" /> Quay lại
                  </button>
                  <button onClick={() => setStep(4)} className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium">
                    Xác nhận <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 4 */}
            {step === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bước 4: Xác nhận</h2>
                <div className="space-y-2 text-sm">
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Nguồn:</span><span className="font-medium text-gray-900 dark:text-white">{sourceBatch?.name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Kho:</span><span>{sourceWarehouse}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">KL input:</span><span className="font-bold">{formatNum(inputWeight)} kg</span></div>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-900/10 rounded-lg space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Tấm:</span><span>{width_mm} x {cutLen} x {thickness_mm} mm</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Số tấm:</span><span className="font-bold">{sheets}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">KL output:</span><span className="font-bold text-green-700">{formatNum(outputWt)} kg</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Kho đích:</span><span>{TARGET_WAREHOUSE}</span></div>
                  </div>
                  {scrap > 0 && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-lg">
                      <div className="flex justify-between"><span className="text-gray-500">Phế:</span><span className="font-bold text-red-600">{formatNum(scrap)} kg</span></div>
                    </div>
                  )}
                  {remainingWeight > 0.5 && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                      <div className="flex justify-between"><span className="text-gray-500">Còn lại:</span><span className="font-bold text-blue-600">{formatNum(remainingWeight)} kg</span></div>
                    </div>
                  )}
                </div>
                <div className="flex justify-between">
                  <button onClick={() => setStep(3)} className="flex items-center gap-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <ChevronLeft className="w-4 h-4" /> Quay lại
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex items-center gap-2 px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 font-medium">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                    {submitting ? 'Đang xử lý...' : 'Xác nhận cắt tấm'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recent */}
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Lệnh cắt gần đây</h3>
              <button onClick={loadRecentOrders} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingRecent ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {loadingRecent ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">Chưa có</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {recentOrders.map(o => (
                  <div key={o.name} className="p-2 rounded-lg border border-gray-100 dark:border-gray-700 text-sm">
                    <div className="font-medium text-gray-900 dark:text-white">{o.name}</div>
                    <div className="text-xs text-gray-500">{o.posting_date} | {o.custom_source_batch || '-'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
