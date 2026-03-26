import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  FileText, Plus, Loader2, CheckCircle, AlertCircle, X, Trash2,
  RefreshCw, Search, Download, Printer, Eye, ShoppingCart, XCircle,
  ChevronLeft, Send, Save, Calendar, User, Clock, DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { call, db } from '../../api/frappeClient';

// ─── Constants ───────────────────────────────────────────────
const COMPANY = 'Thép Việt Steel';

// ─── Helpers ─────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n, d = 0) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });

const STATUS_MAP = {
  Draft: { label: 'Nháp', color: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  Open: { label: 'Mở', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  Ordered: { label: 'Đã đặt hàng', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  Lost: { label: 'Mất', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

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

// ─── Autocomplete (portal-based) ─────────────────────────────
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
const fetchCustomers = async (q) => {
  const filters = q ? [['customer_name', 'like', `%${q}%`]] : [];
  return db.getDocList('Customer', { filters, fields: ['name', 'customer_name'], limit: 10, orderBy: { field: 'customer_name', order: 'asc' } });
};

const fetchItems = async (q) => {
  const filters = q ? [['item_code', 'like', `%${q}%`]] : [];
  return db.getDocList('Item', { filters, fields: ['item_code', 'item_name', 'standard_rate'], limit: 12, orderBy: { field: 'item_code', order: 'asc' } });
};

// ─── Print Preview ───────────────────────────────────────────
function PrintPreview({ doc, onClose }) {
  if (!doc) return null;
  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>Báo giá ${doc.name}</title><style>
      body{font-family:sans-serif;padding:40px;color:#333}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:13px}
      th{background:#f5f5f5;font-weight:600}
      .right{text-align:right}
      h1{font-size:20px;color:#d97706}
      .info{display:flex;gap:40px;margin:16px 0}
      .info div{font-size:13px}
      .info label{font-weight:600;display:block;margin-bottom:2px;color:#666}
      .total{text-align:right;font-size:16px;font-weight:700;margin-top:12px}
    </style></head><body>`);
    w.document.write(`<h1>BÁO GIÁ - ${doc.name}</h1>`);
    w.document.write(`<div class="info">
      <div><label>Khách hàng</label>${doc.party_name || doc.customer_name || ''}</div>
      <div><label>Ngày</label>${doc.transaction_date || ''}</div>
      <div><label>Hạn hiệu lực</label>${doc.valid_till || ''}</div>
    </div>`);
    w.document.write(`<table><thead><tr><th>#</th><th>Mã SP</th><th>Mô tả</th><th class="right">SL (kg)</th><th class="right">Đơn giá</th><th class="right">Thành tiền</th></tr></thead><tbody>`);
    (doc.items || []).forEach((item, i) => {
      w.document.write(`<tr><td>${i + 1}</td><td>${item.item_code || ''}</td><td>${item.description || ''}</td><td class="right">${fmt(item.qty)}</td><td class="right">${fmt(item.rate)}</td><td class="right">${fmt(item.amount)}</td></tr>`);
    });
    w.document.write(`</tbody></table>`);
    w.document.write(`<div class="total">Tổng cộng: ${fmt(doc.grand_total || doc.total)} ₫</div>`);
    if (doc.terms) w.document.write(`<div style="margin-top:20px;font-size:12px;white-space:pre-wrap;border-top:1px solid #ddd;padding-top:12px">${doc.terms}</div>`);
    w.document.write('</body></html>');
    w.document.close();
    w.print();
  };

  return ReactDOM.createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }} onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">In báo giá {doc.name}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Nhấn nút bên dưới để mở bản in.</p>
        <button onClick={handlePrint} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-700">
          <Printer className="w-4 h-4" /> In báo giá
        </button>
        <button onClick={onClose} className="mt-2 w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white py-1">Đóng</button>
      </div>
    </div>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function QuotationPage() {
  const [view, setView] = useState('list'); // list | create | detail
  const [toast, setToast] = useState(null);
  const [detailName, setDetailName] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  const goList = () => { setView('list'); setDetailName(null); };
  const goCreate = () => setView('create');
  const goDetail = (name) => { setDetailName(name); setView('detail'); };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Toast toast={toast} onClose={() => setToast(null)} />
      {view === 'list' && <ListView onDetail={goDetail} onCreate={goCreate} showToast={showToast} />}
      {view === 'create' && <CreateView onBack={goList} onCreated={(name) => { goDetail(name); }} showToast={showToast} />}
      {view === 'detail' && <DetailView name={detailName} onBack={goList} showToast={showToast} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIST VIEW
// ═══════════════════════════════════════════════════════════════
function ListView({ onDetail, onCreate, showToast }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState(String(new Date().getMonth() + 1));
  const [filterDay, setFilterDay] = useState(String(new Date().getDate()));

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = [['quotation_to', '=', 'Customer']];
      if (statusFilter) filters.push(['status', '=', statusFilter]);
      const list = await db.getDocList('Quotation', {
        filters,
        fields: ['name', 'party_name', 'transaction_date', 'valid_till', 'grand_total', 'status', 'docstatus'],
        orderBy: { field: 'creation', order: 'desc' },
        limit: 500,
      });
      setData(list);
    } catch (err) {
      showToast('error', 'Lỗi tải danh sách: ' + (err.message || err));
      setData([]);
    }
    setLoading(false);
  }, [statusFilter, showToast]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = data.filter(r => {
    const d = r.transaction_date || '';
    if (filterYear && d.slice(0, 4) !== filterYear) return false;
    if (filterMonth && d.slice(5, 7) !== filterMonth.padStart(2, '0')) return false;
    if (filterDay && d.slice(8, 10) !== filterDay.padStart(2, '0')) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.name?.toLowerCase().includes(q) && !r.party_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalAmount = filtered.reduce((s, r) => s + (parseFloat(r.grand_total) || 0), 0);

  const exportExcel = () => {
    const rows = filtered.map((r, i) => ({
      'STT': i + 1,
      'Mã BG': r.name,
      'Khách hàng': r.party_name || '',
      'Ngày': r.transaction_date || '',
      'Hạn': r.valid_till || '',
      'Tổng tiền': r.grand_total || 0,
      'Trạng thái': STATUS_MAP[r.status]?.label || r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo giá');
    XLSX.writeFile(wb, `bao-gia-${filterYear || 'all'}-${filterMonth || 'all'}-${filterDay || 'all'}.xlsx`);
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-white" />
          <h2 className="text-lg font-bold text-white">Báo giá</h2>
        </div>
        <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg font-semibold text-sm backdrop-blur-sm">
          <Plus className="w-4 h-4" /> Tạo báo giá
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 space-y-2">
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
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
              <option value="">Tất cả TT</option>
              <option value="Draft">Nháp</option>
              <option value="Open">Mở</option>
              <option value="Ordered">Đã đặt hàng</option>
              <option value="Lost">Mất</option>
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã BG, KH..."
                className="pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white w-44" />
            </div>
            <button onClick={loadData} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <RefreshCw className={`w-4 h-4 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={exportExcel} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Xuất Excel">
              <Download className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-xs text-gray-400 ml-auto">
              {filtered.length} báo giá · {fmt(totalAmount)} ₫
            </span>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Chưa có báo giá nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="px-3 py-2 font-medium w-10 text-center">#</th>
                  <th className="px-4 py-2 font-medium">Mã BG</th>
                  <th className="px-4 py-2 font-medium">Khách hàng</th>
                  <th className="px-4 py-2 font-medium">Ngày</th>
                  <th className="px-4 py-2 font-medium">Hạn</th>
                  <th className="px-4 py-2 font-medium text-right">Tổng tiền</th>
                  <th className="px-4 py-2 font-medium text-center">Trạng thái</th>
                  <th className="px-4 py-2 font-medium w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((r, idx) => {
                  const st = STATUS_MAP[r.status] || { label: r.status, color: 'bg-gray-100 text-gray-600' };
                  return (
                    <tr key={r.name} onClick={() => onDetail(r.name)} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20 cursor-pointer">
                      <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{r.name}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{r.party_name || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{r.transaction_date}</td>
                      <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400">{r.valid_till || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{fmt(r.grand_total)}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Eye className="w-4 h-4 text-gray-400" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// CREATE VIEW
// ═══════════════════════════════════════════════════════════════
function CreateView({ onBack, onCreated, showToast }) {
  const [customer, setCustomer] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [transactionDate, setTransactionDate] = useState(today());
  const [validTill, setValidTill] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([newItem()]);
  const [submitting, setSubmitting] = useState(false);

  function newItem() {
    return { id: Date.now() + Math.random(), item_code: '', description: '', qty: '', rate: '' };
  }

  const addItem = () => setItems(prev => [...prev, newItem()]);
  const removeItem = (id) => setItems(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);
  const updateItem = (id, patch) => setItems(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  const totalAmount = items.reduce((s, r) => s + ((parseFloat(r.qty) || 0) * (parseFloat(r.rate) || 0)), 0);

  const buildDoc = (docstatus) => ({
    doctype: 'Quotation',
    quotation_to: 'Customer',
    party_name: customer,
    customer_name: customerName,
    company: COMPANY,
    transaction_date: transactionDate,
    valid_till: validTill || undefined,
    terms: notes || undefined,
    items: items.filter(r => r.item_code && parseFloat(r.qty) > 0).map(r => ({
      item_code: r.item_code,
      qty: parseFloat(r.qty) || 0,
      rate: parseFloat(r.rate) || 0,
      uom: 'Kg',
      description: r.description || r.item_code,
    })),
  });

  const handleSaveDraft = async () => {
    if (!customer) return showToast('error', 'Chọn khách hàng');
    const validItems = items.filter(r => r.item_code && parseFloat(r.qty) > 0);
    if (validItems.length === 0) return showToast('error', 'Thêm ít nhất 1 sản phẩm');

    setSubmitting(true);
    try {
      const doc = buildDoc(0);
      const res = await call.post('frappe.client.insert', { doc });
      showToast('success', `Đã lưu nháp: ${res.name}`);
      onCreated(res.name);
    } catch (err) {
      showToast('error', 'Lỗi lưu: ' + (err.message || err));
    }
    setSubmitting(false);
  };

  const handleSubmit = async () => {
    if (!customer) return showToast('error', 'Chọn khách hàng');
    const validItems = items.filter(r => r.item_code && parseFloat(r.qty) > 0);
    if (validItems.length === 0) return showToast('error', 'Thêm ít nhất 1 sản phẩm');

    setSubmitting(true);
    try {
      const doc = buildDoc(0);
      const res = await call.post('frappe.client.insert', { doc });
      // Now submit it
      const full = await db.getDoc('Quotation', res.name);
      await call.post('frappe.client.submit', { doc: full });
      showToast('success', `Đã gửi báo giá: ${res.name}`);
      onCreated(res.name);
    } catch (err) {
      showToast('error', 'Lỗi gửi: ' + (err.message || err));
    }
    setSubmitting(false);
  };

  return (
    <>
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white font-medium">
        <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl px-5 py-4">
        <div className="flex items-center gap-3">
          <Plus className="w-6 h-6 text-white" />
          <h2 className="text-lg font-bold text-white">Tạo báo giá mới</h2>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-5 py-4 space-y-4">
          {/* Customer + dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Khách hàng *</label>
              <Autocomplete
                value={customerName}
                placeholder="Tìm khách hàng..."
                fetchFn={fetchCustomers}
                renderItem={(c) => ({
                  label: c.customer_name,
                  content: (
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 dark:text-white">{c.customer_name}</span>
                      <span className="text-xs text-gray-400 ml-2">{c.name}</span>
                    </div>
                  ),
                })}
                onSelect={(c) => { setCustomer(c.name); setCustomerName(c.customer_name); }}
                onType={(v) => { setCustomerName(v); setCustomer(''); }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Ngày báo giá</label>
              <input type="date" value={transactionDate} onChange={e => setTransactionDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Hiệu lực đến</label>
              <input type="date" value={validTill} onChange={e => setValidTill(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            </div>
          </div>

          {/* Items header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg px-4 py-2">
            <span className="text-sm font-semibold text-white">Sản phẩm báo giá</span>
          </div>

          {/* Items table */}
          <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
            <table className="w-full text-sm" style={{ tableLayout: 'auto' }}>
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                  <th className="px-2 py-2.5 text-center w-10">#</th>
                  <th className="px-2 py-2.5">Mã SP</th>
                  <th className="px-2 py-2.5">Mô tả</th>
                  <th className="px-2 py-2.5 w-28">SL (kg)</th>
                  <th className="px-2 py-2.5 w-32">Đơn giá (₫/kg)</th>
                  <th className="px-2 py-2.5 w-36 text-right">Thành tiền</th>
                  <th className="px-2 py-2.5 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {items.map((row, idx) => {
                  const amount = (parseFloat(row.qty) || 0) * (parseFloat(row.rate) || 0);
                  return (
                    <tr key={row.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                      <td className="px-2 py-1.5 text-gray-400 text-xs text-center">{idx + 1}</td>
                      <td className="px-2 py-1.5">
                        <Autocomplete
                          value={row.item_code}
                          placeholder="Mã hàng..."
                          fetchFn={fetchItems}
                          renderItem={(item) => ({
                            label: item.item_code,
                            content: (
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-gray-900 dark:text-white">{item.item_code}</span>
                                <span className="text-xs text-gray-400 ml-2">{item.item_name}</span>
                              </div>
                            ),
                          })}
                          onSelect={(item) => updateItem(row.id, { item_code: item.item_code, description: item.item_name, rate: item.standard_rate || row.rate })}
                          onType={(v) => updateItem(row.id, { item_code: v })}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="text" value={row.description} onChange={e => updateItem(row.id, { description: e.target.value })}
                          placeholder="Mô tả..."
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={row.qty} onChange={e => updateItem(row.id, { qty: e.target.value })}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={row.rate} onChange={e => updateItem(row.id, { rate: e.target.value })}
                          placeholder="0"
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm text-right" />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium text-gray-900 dark:text-white whitespace-nowrap">
                        {amount > 0 ? fmt(amount) + ' ₫' : '—'}
                      </td>
                      <td className="px-2 py-1.5 text-center">
                        <button onClick={() => removeItem(row.id)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-400 hover:text-red-600">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Add row + total */}
          <div className="flex items-center justify-between">
            <button onClick={addItem} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
              <Plus className="w-4 h-4" /> Thêm dòng
            </button>
            <div className="text-sm">
              Tổng cộng: <span className="font-bold text-lg text-gray-900 dark:text-white">{fmt(totalAmount)} ₫</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Ghi chú / Điều khoản</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Điều khoản thanh toán, giao hàng..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button onClick={onBack} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white font-medium">
            Huỷ
          </button>
          <button onClick={handleSaveDraft} disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Lưu nháp
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold text-sm hover:from-amber-600 hover:to-orange-700 disabled:opacity-40 shadow-sm">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Gửi báo giá
          </button>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
function DetailView({ name, onBack, showToast }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [printDoc, setPrintDoc] = useState(null);

  const loadDoc = useCallback(async () => {
    setLoading(true);
    try {
      const d = await db.getDoc('Quotation', name);
      setDoc(d);
    } catch (err) {
      showToast('error', 'Lỗi tải báo giá: ' + (err.message || err));
    }
    setLoading(false);
  }, [name, showToast]);

  useEffect(() => { loadDoc(); }, [loadDoc]);

  const handleMakeSO = async () => {
    setActing(true);
    try {
      const res = await call.post('erpnext.selling.doctype.quotation.quotation.make_sales_order', { source_name: name });
      if (res?.name) {
        showToast('success', `Đã tạo đơn hàng: ${res.name}`);
      } else {
        // Insert the returned doc
        const so = await call.post('frappe.client.insert', { doc: res });
        showToast('success', `Đã tạo đơn hàng: ${so.name}`);
      }
      loadDoc();
    } catch (err) {
      showToast('error', 'Lỗi tạo đơn hàng: ' + (err.message || err));
    }
    setActing(false);
  };

  const handleMarkLost = async () => {
    setActing(true);
    try {
      await call.post('frappe.client.cancel', { doctype: 'Quotation', name });
      // Or use set_status
      // await call.post('erpnext.selling.doctype.quotation.quotation.set_expired_status');
      showToast('success', 'Đã đánh dấu mất');
      loadDoc();
    } catch {
      // Try alternative: declare as lost
      try {
        await call.post('frappe.client.api', {
          method: 'erpnext.selling.doctype.quotation.quotation.make_sales_order',
        });
      } catch {}
      // Direct status update
      try {
        await call.post('frappe.client.set_value', {
          doctype: 'Quotation', name, fieldname: 'status', value: 'Lost',
        });
        showToast('success', 'Đã đánh dấu mất');
        loadDoc();
      } catch (err2) {
        showToast('error', 'Lỗi: ' + (err2.message || err2));
      }
    }
    setActing(false);
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>;
  if (!doc) return <p className="text-center text-gray-400 py-16">Không tìm thấy báo giá</p>;

  const st = STATUS_MAP[doc.status] || { label: doc.status, color: 'bg-gray-100 text-gray-600' };

  return (
    <>
      <PrintPreview doc={printDoc} onClose={() => setPrintDoc(null)} />

      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white font-medium">
        <ChevronLeft className="w-4 h-4" /> Quay lại danh sách
      </button>

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-white" />
          <div>
            <h2 className="text-lg font-bold text-white">{doc.name}</h2>
            <p className="text-sm text-white/80">{doc.party_name}</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${st.color}`}>{st.label}</span>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-4 border border-blue-200/50 dark:border-blue-700/30">
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <User className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Khách hàng</span>
          </div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{doc.party_name || '—'}</p>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-xl p-4 border border-green-200/50 dark:border-green-700/30">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Ngày báo giá</span>
          </div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{doc.transaction_date || '—'}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/30">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Hiệu lực đến</span>
          </div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{doc.valid_till || '—'}</p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/20 dark:to-orange-800/20 rounded-xl p-4 border border-amber-200/50 dark:border-amber-700/30">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Tổng tiền</span>
          </div>
          <p className="font-bold text-gray-900 dark:text-white text-sm">{fmt(doc.grand_total || doc.total)} ₫</p>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-t-xl px-4 py-2">
          <span className="text-sm font-semibold text-white">Chi tiết sản phẩm</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <th className="px-3 py-2 font-medium w-10 text-center">#</th>
                <th className="px-4 py-2 font-medium">Mã SP</th>
                <th className="px-4 py-2 font-medium">Mô tả</th>
                <th className="px-4 py-2 font-medium text-right">SL (kg)</th>
                <th className="px-4 py-2 font-medium text-right">Đơn giá</th>
                <th className="px-4 py-2 font-medium text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {(doc.items || []).map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                  <td className="px-3 py-2.5 text-center text-gray-400 text-xs">{idx + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{item.item_code}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{item.description || '—'}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900 dark:text-white">{fmt(item.qty)}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600 dark:text-gray-300">{fmt(item.rate)}</td>
                  <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{fmt(item.amount)} ₫</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <td colSpan={5} className="px-4 py-2.5 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">Tổng cộng</td>
                <td className="px-4 py-2.5 text-right text-sm font-bold text-gray-900 dark:text-white">{fmt(doc.grand_total || doc.total)} ₫</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Terms */}
        {doc.terms && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Ghi chú / Điều khoản</p>
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{doc.terms}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        {doc.docstatus === 1 && doc.status !== 'Ordered' && doc.status !== 'Lost' && (
          <button onClick={handleMakeSO} disabled={acting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-green-700 text-white rounded-xl font-semibold text-sm hover:from-emerald-700 hover:to-green-800 disabled:opacity-40 shadow-sm">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
            Chuyển thành Đơn hàng
          </button>
        )}
        {doc.docstatus === 1 && doc.status !== 'Ordered' && doc.status !== 'Lost' && (
          <button onClick={handleMarkLost} disabled={acting}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl font-semibold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40">
            {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Đánh dấu Mất
          </button>
        )}
        <button onClick={() => setPrintDoc(doc)}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl font-semibold text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
          <Printer className="w-4 h-4" /> In báo giá
        </button>
      </div>
    </>
  );
}
