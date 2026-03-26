import { useState, useEffect, useCallback } from 'react';
import {
  PackagePlus, Loader2, CheckCircle, AlertCircle, X, Plus, Trash2,
  RefreshCw, Search, Package
} from 'lucide-react';
import { call, db } from '../../api/frappeClient';

const COMPANY = 'Thép Việt Steel';
const WH = 'Kho Thành phẩm - TVS';
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n, d = 0) => (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });

function Toast({ toast, onClose }) {
  if (!toast) return null;
  const bg = toast.type === 'success' ? 'bg-emerald-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600';
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white ${bg}`}>
      {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{toast.message}</span>
      <button onClick={onClose} className="ml-2"><X className="w-4 h-4" /></button>
    </div>
  );
}

export default function FinishedGoodsReceipt() {
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [postingDate, setPostingDate] = useState(today());

  // Receipt rows
  const [rows, setRows] = useState([]);
  const [itemSearch, setItemSearch] = useState('');
  const [itemResults, setItemResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Recent receipts
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [filter, setFilter] = useState('');

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ─── Search items ───
  useEffect(() => {
    if (!itemSearch || itemSearch.length < 1) { setItemResults([]); return; }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const items = await db.getDocList('Item', {
          filters: [['item_code', 'like', `%${itemSearch}%`]],
          fields: ['item_code', 'item_name', 'stock_uom'],
          limit: 10,
        });
        setItemResults(items);
      } catch { /* ignore */ }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [itemSearch]);

  const addItem = (item) => {
    setRows(prev => [...prev, {
      id: Date.now(),
      item_code: item.item_code,
      item_name: item.item_name,
      uom: item.stock_uom || 'Kg',
      qty: '',
      batch: '',
      source_batch: '',
    }]);
    setItemSearch('');
    setItemResults([]);
  };

  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));
  const updateRow = (id, field, value) => setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  // ─── Submit Material Receipt ───
  const handleSubmit = async () => {
    const valid = rows.filter(r => r.item_code && parseFloat(r.qty) > 0);
    if (valid.length === 0) return showToast('error', 'Chưa có dòng nào hợp lệ');

    setSubmitting(true);
    try {
      const seDoc = {
        doctype: 'Stock Entry',
        stock_entry_type: 'Material Receipt',
        company: COMPANY,
        posting_date: postingDate,
        custom_production_type: 'Nhập thành phẩm',
        remarks: `Nhập thành phẩm - ${valid.length} sản phẩm`,
        items: valid.map(r => ({
          item_code: r.item_code,
          qty: parseFloat(r.qty),
          uom: r.uom || 'Kg',
          stock_uom: r.uom || 'Kg',
          t_warehouse: WH,
          batch_no: r.batch || undefined,
          basic_rate: 15000,
        })),
      };
      const res = await call.post('frappe.client.insert', { doc: seDoc });
      const se = res.message || res;
      await call.post('frappe.client.submit', { doc: se });
      showToast('success', `Nhập thành phẩm thành công: ${se.name}`);
      setRows([]);
      loadRecent();
    } catch (err) {
      showToast('error', 'Lỗi nhập TP: ' + (err.message || ''));
    }
    setSubmitting(false);
  };

  // ─── Load recent ───
  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const entries = await db.getDocList('Stock Entry', {
        filters: [['stock_entry_type', '=', 'Material Receipt'], ['docstatus', '=', 1], ['custom_production_type', '=', 'Nhập thành phẩm']],
        fields: ['name', 'posting_date', 'remarks', 'total_incoming_value'],
        orderBy: { field: 'posting_date', order: 'desc' },
        limit: 30,
      });
      setRecent(entries);
    } catch {
      try {
        const entries = await db.getDocList('Stock Entry', {
          filters: [['stock_entry_type', '=', 'Material Receipt'], ['docstatus', '=', 1]],
          fields: ['name', 'posting_date', 'remarks'],
          orderBy: { field: 'posting_date', order: 'desc' },
          limit: 30,
        });
        setRecent(entries);
      } catch { /* ignore */ }
    }
    setLoadingRecent(false);
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const filtered = recent.filter(r => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.remarks?.toLowerCase().includes(q);
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Receipt Form */}
      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Ngày nhập</label>
            <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tìm sản phẩm</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" value={itemSearch} onChange={e => setItemSearch(e.target.value)}
                placeholder="Nhập mã sản phẩm..."
                className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
              {searchLoading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {itemResults.length > 0 && (
              <div className="mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-auto">
                {itemResults.map(it => (
                  <button key={it.item_code} onClick={() => addItem(it)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 text-foreground flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium">{it.item_code}</span>
                    <span className="text-xs text-muted-foreground">{it.item_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sản phẩm</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tên</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">SL (Kg)</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground w-40">Batch nguồn</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium text-foreground">{r.item_code}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.item_name}</td>
                      <td className="px-4 py-2">
                        <input type="number" value={r.qty} onChange={e => updateRow(r.id, 'qty', e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm text-right focus:ring-2 focus:ring-primary/20" placeholder="0" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="text" value={r.source_batch} onChange={e => updateRow(r.id, 'source_batch', e.target.value)}
                          placeholder="Batch gốc..."
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20" />
                      </td>
                      <td className="px-1 py-2">
                        <button onClick={() => removeRow(r.id)} className="p-1 text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">Tổng: {fmt(rows.reduce((s, r) => s + (parseFloat(r.qty) || 0), 0))} kg | {rows.length} SP</span>
              <button onClick={handleSubmit} disabled={submitting}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {submitting ? 'Đang nhập...' : 'Nhập kho TP'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Recent Receipts */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Phiếu nhập TP gần đây</h2>
          <button onClick={loadRecent} className="p-1.5 rounded-lg hover:bg-muted">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingRecent ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Tìm phiếu nhập..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        {loadingRecent ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Chưa có phiếu nhập TP nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Mã phiếu</th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">Ngày</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(e => (
                  <tr key={e.name} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground">{e.name}</td>
                    <td className="text-center px-4 py-2 text-muted-foreground">{e.posting_date}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{e.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
