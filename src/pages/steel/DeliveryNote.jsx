import { useState, useEffect, useCallback } from 'react';
import {
  Truck, Loader2, CheckCircle, AlertCircle, X, Printer,
  RefreshCw, Search, FileText, ChevronRight, ArrowLeft
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

export default function DeliveryNote() {
  const [view, setView] = useState('list'); // list | create
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // SO selection for delivery
  const [soSearch, setSoSearch] = useState('');
  const [soList, setSoList] = useState([]);
  const [loadingSO, setLoadingSO] = useState(false);
  const [selectedSO, setSelectedSO] = useState(null);
  const [soDoc, setSoDoc] = useState(null);
  const [deliveryItems, setDeliveryItems] = useState([]);
  const [postingDate, setPostingDate] = useState(today());

  // Recent deliveries
  const [recent, setRecent] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [filter, setFilter] = useState('');

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // ─── Search SOs with pending delivery ───
  const searchSOs = useCallback(async (q) => {
    setLoadingSO(true);
    try {
      const filters = [
        ['docstatus', '=', 1],
        ['status', 'not in', ['Completed', 'Cancelled', 'Closed']],
        ['per_delivered', '<', 100],
      ];
      if (q) filters.push(['name', 'like', `%${q}%`]);
      const list = await db.getDocList('Sales Order', {
        filters,
        fields: ['name', 'customer', 'customer_name', 'transaction_date', 'grand_total', 'per_delivered'],
        orderBy: { field: 'transaction_date', order: 'desc' },
        limit: 20,
      });
      setSoList(list);
    } catch { /* ignore */ }
    setLoadingSO(false);
  }, []);

  useEffect(() => { searchSOs(''); }, []);
  useEffect(() => {
    const t = setTimeout(() => searchSOs(soSearch), 300);
    return () => clearTimeout(t);
  }, [soSearch]);

  // ─── Select SO ───
  const selectSO = async (so) => {
    setSelectedSO(so);
    try {
      const doc = await db.getDoc('Sales Order', so.name);
      setSoDoc(doc);
      const items = (doc.items || []).map((it, idx) => {
        const remaining = (it.qty || 0) - (it.delivered_qty || 0);
        return {
          id: `${it.name}-${idx}`,
          soItem: it,
          item_code: it.item_code,
          item_name: it.item_name,
          ordered: it.qty || 0,
          delivered: it.delivered_qty || 0,
          remaining: Math.max(0, remaining),
          deliverQty: remaining > 0 ? remaining : 0,
          uom: it.uom || 'Kg',
        };
      });
      setDeliveryItems(items);
      setView('create');
    } catch (err) {
      showToast('error', 'Không thể tải SO: ' + (err.message || ''));
    }
  };

  const updateDeliveryQty = (id, qty) => {
    setDeliveryItems(prev => prev.map(i => i.id === id ? { ...i, deliverQty: qty } : i));
  };

  // ─── Submit Delivery Note ───
  const handleSubmit = async () => {
    const valid = deliveryItems.filter(i => parseFloat(i.deliverQty) > 0);
    if (valid.length === 0) return showToast('error', 'Chưa có sản phẩm nào để giao');

    setSubmitting(true);
    try {
      const dnDoc = {
        doctype: 'Delivery Note',
        company: COMPANY,
        customer: soDoc.customer,
        posting_date: postingDate,
        set_warehouse: WH,
        items: valid.map(i => ({
          item_code: i.item_code,
          qty: parseFloat(i.deliverQty),
          uom: i.uom,
          stock_uom: i.uom,
          against_sales_order: selectedSO.name,
          so_detail: i.soItem.name,
          warehouse: WH,
        })),
      };
      const res = await call.post('frappe.client.insert', { doc: dnDoc });
      const dn = res.message || res;
      await call.post('frappe.client.submit', { doc: dn });
      showToast('success', `Tạo phiếu giao hàng thành công: ${dn.name}`);
      setView('list');
      setSelectedSO(null);
      setSoDoc(null);
      setDeliveryItems([]);
      loadRecent();
      searchSOs('');
    } catch (err) {
      showToast('error', 'Lỗi tạo DN: ' + (err.message || err._server_messages || ''));
    }
    setSubmitting(false);
  };

  // ─── Print ───
  const handlePrint = (dnName) => {
    window.open(`/printview?doctype=Delivery Note&name=${dnName}&format=Standard`, '_blank');
  };

  // ─── Load recent ───
  const loadRecent = useCallback(async () => {
    setLoadingRecent(true);
    try {
      const list = await db.getDocList('Delivery Note', {
        filters: [['docstatus', '=', 1]],
        fields: ['name', 'customer', 'customer_name', 'posting_date', 'grand_total', 'status'],
        orderBy: { field: 'posting_date', order: 'desc' },
        limit: 30,
      });
      setRecent(list);
    } catch { /* ignore */ }
    setLoadingRecent(false);
  }, []);

  useEffect(() => { loadRecent(); }, [loadRecent]);

  const filtered = recent.filter(r => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return r.name?.toLowerCase().includes(q) || r.customer_name?.toLowerCase().includes(q);
  });

  // ═══════════════════════════════════════════
  // CREATE VIEW - Select SO then deliver
  // ═══════════════════════════════════════════
  if (view === 'create' && soDoc) {
    return (
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <Toast toast={toast} onClose={() => setToast(null)} />
        <button onClick={() => { setView('list'); setSelectedSO(null); setSoDoc(null); }}
          className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="w-4 h-4" /> Quay lại
        </button>

        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Ngày giao</label>
            <input type="date" value={postingDate} onChange={e => setPostingDate(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Sản phẩm</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Đặt hàng</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Đã giao</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Còn lại</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground w-28">Giao lần này</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {deliveryItems.map(i => (
                  <tr key={i.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-medium text-foreground">{i.item_code}</span>
                      <div className="text-xs text-muted-foreground">{i.item_name}</div>
                    </td>
                    <td className="text-right px-4 py-3 text-foreground">{fmt(i.ordered)}</td>
                    <td className="text-right px-4 py-3 text-muted-foreground">{fmt(i.delivered)}</td>
                    <td className="text-right px-4 py-3 text-foreground font-medium">{fmt(i.remaining)}</td>
                    <td className="px-4 py-2">
                      <input type="number" value={i.deliverQty} onChange={e => updateDeliveryQty(i.id, e.target.value)}
                        max={i.remaining}
                        className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm text-right focus:ring-2 focus:ring-primary/20" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
              {submitting ? 'Đang tạo...' : 'Xác nhận giao hàng'}
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

      {/* Pending SOs */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <h2 className="font-semibold text-foreground mb-3">Đơn hàng chờ giao</h2>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={soSearch} onChange={e => setSoSearch(e.target.value)}
            placeholder="Tìm SO theo mã..."
            className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        {loadingSO ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : soList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Không có đơn hàng nào chờ giao</p>
        ) : (
          <div className="space-y-2">
            {soList.map(so => {
              const pct = Math.round(so.per_delivered || 0);
              return (
                <button key={so.name} onClick={() => selectSO(so)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors text-left group">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg shrink-0">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{so.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{so.transaction_date}</span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{so.customer_name}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-medium text-foreground">{fmt(so.grand_total)} VNĐ</div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground">Giao {pct}%</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Deliveries */}
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Phiếu giao hàng gần đây</h2>
          <button onClick={loadRecent} className="p-1.5 rounded-lg hover:bg-muted">
            <RefreshCw className={`w-4 h-4 text-muted-foreground ${loadingRecent ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="Tìm phiếu giao..."
            className="w-full pl-10 pr-4 py-2 border border-border rounded-xl bg-background text-foreground text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary" />
        </div>
        {loadingRecent ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Chưa có phiếu giao hàng nào</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Mã phiếu</th>
                  <th className="text-left px-4 py-2 font-medium text-muted-foreground">Khách hàng</th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">Ngày</th>
                  <th className="text-right px-4 py-2 font-medium text-muted-foreground">Tổng tiền</th>
                  <th className="text-center px-4 py-2 font-medium text-muted-foreground">TT</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(dn => (
                  <tr key={dn.name} className="hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium text-foreground">{dn.name}</td>
                    <td className="px-4 py-2 text-foreground">{dn.customer_name}</td>
                    <td className="text-center px-4 py-2 text-muted-foreground">{dn.posting_date}</td>
                    <td className="text-right px-4 py-2 text-foreground">{fmt(dn.grand_total)}</td>
                    <td className="text-center px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {dn.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => handlePrint(dn.name)} className="p-1 text-muted-foreground hover:text-primary">
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
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
