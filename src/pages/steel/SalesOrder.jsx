import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Loader2, CheckCircle, AlertCircle, X, Plus, Trash2,
  RefreshCw, Search, FileText, ChevronRight, Eye, ArrowLeft
} from 'lucide-react';
import { call, db } from '../../api/frappeClient';

const COMPANY = 'Thép Việt Steel';
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n, d = 0) => (n == null || isNaN(n)) ? '-' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });

// ─── Toast ───
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

// ─── Customer Search ───
function CustomerSearch({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await db.getDocList('Customer', {
          filters: [['name', 'like', `%${query}%`]],
          fields: ['name', 'customer_name'],
          limit: 10,
        });
        setResults(list);
        setOpen(true);
      } catch { /* ignore */ }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        value={value || query}
        onChange={e => { setQuery(e.target.value); onChange(null); }}
        placeholder="Tìm khách hàng..."
        className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      {loading && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}
      {open && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-auto">
          {results.map(c => (
            <button key={c.name} onClick={() => { onChange(c.name); setQuery(c.customer_name || c.name); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 text-foreground">
              {c.customer_name || c.name} <span className="text-muted-foreground text-xs">({c.name})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Item Search ───
function ItemSearch({ value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query || query.length < 1) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const list = await db.getDocList('Item', {
          filters: [['item_code', 'like', `%${query}%`]],
          fields: ['item_code', 'item_name', 'stock_uom'],
          limit: 10,
        });
        setResults(list);
        setOpen(true);
      } catch { /* ignore */ }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text" value={query}
        onChange={e => { setQuery(e.target.value); onChange(null); }}
        placeholder="Mã SP..."
        className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-auto">
          {results.map(it => (
            <button key={it.item_code} onClick={() => { onChange(it); setQuery(it.item_code); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-primary/5 text-foreground">
              {it.item_code} <span className="text-muted-foreground text-xs">{it.item_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main ───
export default function SalesOrder() {
  const [view, setView] = useState('list'); // list | create | detail
  const [soList, setSoList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [customer, setCustomer] = useState(null);
  const [deliveryDate, setDeliveryDate] = useState(today());
  const [items, setItems] = useState([{ id: Date.now(), item_code: '', item_name: '', qty: '', rate: '', delivery_date: today(), uom: 'Kg' }]);

  // Detail view
  const [detail, setDetail] = useState(null);
  const [linkedPOs, setLinkedPOs] = useState([]);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ─── Load SO list ───
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const list = await db.getDocList('Sales Order', {
        filters: [['docstatus', '=', 1], ['status', 'not in', ['Cancelled', 'Closed']]],
        fields: ['name', 'customer', 'customer_name', 'transaction_date', 'grand_total', 'per_delivered', 'status', 'delivery_date'],
        orderBy: { field: 'transaction_date', order: 'desc' },
        limit: 50,
      });
      setSoList(list);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  // ─── View detail ───
  const viewDetail = async (soName) => {
    try {
      const doc = await db.getDoc('Sales Order', soName);
      setDetail(doc);
      // Load linked POs
      try {
        const pos = await db.getDocList('Purchase Order', {
          filters: [['name', 'in', (doc.items || []).map(i => i.purchase_order).filter(Boolean)]],
          fields: ['name', 'supplier_name', 'status', 'per_received'],
          limit: 20,
        });
        setLinkedPOs(pos);
      } catch { setLinkedPOs([]); }
      setView('detail');
    } catch (err) {
      showToast('error', 'Không thể tải SO: ' + (err.message || ''));
    }
  };

  // ─── Submit new SO ───
  const handleSubmit = async () => {
    if (!customer) return showToast('error', 'Vui lòng chọn khách hàng');
    const validItems = items.filter(i => i.item_code && parseFloat(i.qty) > 0 && parseFloat(i.rate) > 0);
    if (validItems.length === 0) return showToast('error', 'Cần ít nhất 1 sản phẩm hợp lệ');

    setSubmitting(true);
    try {
      const doc = {
        doctype: 'Sales Order',
        company: COMPANY,
        customer,
        transaction_date: today(),
        delivery_date: deliveryDate,
        order_type: 'Sales',
        items: validItems.map(i => ({
          item_code: i.item_code,
          qty: parseFloat(i.qty),
          rate: parseFloat(i.rate),
          delivery_date: i.delivery_date || deliveryDate,
          uom: i.uom || 'Kg',
        })),
      };
      const res = await call.post('frappe.client.insert', { doc });
      const so = res.message || res;
      await call.post('frappe.client.submit', { doc: so });
      showToast('success', `Tạo thành công ${so.name}`);
      setView('list');
      setCustomer(null);
      setItems([{ id: Date.now(), item_code: '', item_name: '', qty: '', rate: '', delivery_date: today(), uom: 'Kg' }]);
      loadList();
    } catch (err) {
      showToast('error', 'Lỗi tạo SO: ' + (err.message || err._server_messages || ''));
    }
    setSubmitting(false);
  };

  // Item row helpers
  const addItem = () => setItems(prev => [...prev, { id: Date.now(), item_code: '', item_name: '', qty: '', rate: '', delivery_date: today(), uom: 'Kg' }]);
  const removeItem = (id) => setItems(prev => prev.length > 1 ? prev.filter(i => i.id !== id) : prev);
  const updateItem = (id, field, value) => setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const filtered = soList.filter(s => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return s.name?.toLowerCase().includes(q) || s.customer_name?.toLowerCase().includes(q);
  });

  // ═══════════════════════════════════════════
  // DETAIL VIEW
  // ═══════════════════════════════════════════
  if (view === 'detail' && detail) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <Toast toast={toast} onClose={() => setToast(null)} />
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </button>
        <div className="flex justify-end mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${detail.per_delivered >= 100 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
            Giao {Math.round(detail.per_delivered || 0)}%
          </span>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sản phẩm</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">SL đặt</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Đã giao</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Đơn giá</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(detail.items || []).map((it, idx) => (
                <tr key={idx} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-foreground">{it.item_code}<div className="text-xs text-muted-foreground">{it.item_name}</div></td>
                  <td className="text-right px-4 py-3 text-foreground">{fmt(it.qty)}</td>
                  <td className="text-right px-4 py-3 text-foreground">{fmt(it.delivered_qty)}</td>
                  <td className="text-right px-4 py-3 text-foreground">{fmt(it.rate)}</td>
                  <td className="text-right px-4 py-3 font-medium text-foreground">{fmt(it.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end">
          <div className="text-right">
            <span className="text-sm text-muted-foreground">Tổng cộng: </span>
            <span className="text-lg font-bold text-foreground">{fmt(detail.grand_total)} VNĐ</span>
          </div>
        </div>

        {linkedPOs.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-semibold text-foreground mb-3">Đơn mua hàng liên kết</h3>
            <div className="space-y-2">
              {linkedPOs.map(po => (
                <div key={po.name} className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{po.name}</span>
                  <span className="text-xs text-muted-foreground">{po.supplier_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{po.status} | Nhận {Math.round(po.per_received || 0)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // CREATE VIEW
  // ═══════════════════════════════════════════
  if (view === 'create') {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <Toast toast={toast} onClose={() => setToast(null)} />
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Khách hàng *</label>
              <CustomerSearch value={customer} onChange={setCustomer} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Ngày giao hàng</label>
              <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Sản phẩm</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus className="w-3 h-3" /> Thêm dòng
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground min-w-[200px]">Mã SP</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">SL (Kg)</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-28">Đơn giá</th>
                    <th className="text-center px-3 py-2 font-medium text-muted-foreground w-36">Ngày giao</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map(item => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <ItemSearch value={item.item_code} onChange={(it) => {
                          if (it) updateItem(item.id, 'item_code', it.item_code);
                          else updateItem(item.id, 'item_code', '');
                        }} />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.qty} onChange={e => updateItem(item.id, 'qty', e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm text-right focus:ring-2 focus:ring-primary/20" placeholder="0" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" value={item.rate} onChange={e => updateItem(item.id, 'rate', e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm text-right focus:ring-2 focus:ring-primary/20" placeholder="0" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="date" value={item.delivery_date} onChange={e => updateItem(item.id, 'delivery_date', e.target.value)}
                          className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20" />
                      </td>
                      <td className="px-1 py-2">
                        <button onClick={() => removeItem(item.id)} className="p-1 text-muted-foreground hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {submitting ? 'Đang tạo...' : 'Tạo & Duyệt đơn'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════
  // LIST VIEW
  // ═══════════════════════════════════════════
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <Toast toast={toast} onClose={() => setToast(null)} />

      <div className="flex justify-end mb-4">
        <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Tạo mới
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Tìm theo mã SO, khách hàng..."
            className="w-full pl-10 pr-10 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          <button onClick={loadList} className="absolute right-3 top-1/2 -translate-y-1/2">
            <RefreshCw className={`w-4 h-4 text-muted-foreground hover:text-primary ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Không có đơn hàng nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mã SO</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Khách hàng</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Ngày</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Tổng tiền</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Giao hàng</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Trạng thái</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(so => {
                  const pct = Math.round(so.per_delivered || 0);
                  return (
                    <tr key={so.name} onClick={() => viewDetail(so.name)} className="hover:bg-muted/30 cursor-pointer">
                      <td className="px-4 py-3 font-medium text-foreground">{so.name}</td>
                      <td className="px-4 py-3 text-foreground">{so.customer_name}</td>
                      <td className="text-center px-4 py-3 text-muted-foreground">{so.transaction_date}</td>
                      <td className="text-right px-4 py-3 text-foreground">{fmt(so.grand_total)}</td>
                      <td className="text-center px-4 py-3">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-muted-foreground">{pct}%</span>
                        </div>
                      </td>
                      <td className="text-center px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${so.status === 'Completed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {so.status}
                        </span>
                      </td>
                      <td className="px-2 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
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
