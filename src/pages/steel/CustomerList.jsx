import { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import {
  Users, Plus, Loader2, CheckCircle, AlertCircle, X, Search,
  Download, Phone, Mail, MapPin, FileText, ShoppingCart, Truck,
  Edit, Building2, CreditCard, ArrowLeft, ChevronDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { call, db } from '../../api/frappeClient';

// ─── Constants ───────────────────────────────────────────────
const COMPANY = 'Thép Việt Steel';

// ─── Helpers ─────────────────────────────────────────────────
const fmt = (n, d = 0) => (n == null || isNaN(n)) ? '—' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d });

const CUSTOMER_GROUPS = [
  'Tất cả',
  'Commercial',
  'Company',
  'Government',
  'Individual',
  'Non Profit',
];

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

// ─── Dropdown with Portal ────────────────────────────────────
function PortalDropdown({ options, value, onChange, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target) && !e.target.closest('[data-portal-dropdown]')) setOpen(false);
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [open]);

  useEffect(() => {
    if (!open || !ref.current) return;
    const update = () => {
      const r = ref.current.getBoundingClientRect();
      setPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 180) });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update, true); window.removeEventListener('resize', update); };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
        <span>{value || placeholder}</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
      {open && ReactDOM.createPortal(
        <div data-portal-dropdown style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, zIndex: 9990 }}
          className="max-h-48 overflow-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl">
          {options.map((opt, i) => (
            <button key={i} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700/50 last:border-0 ${opt === value ? 'bg-blue-50 dark:bg-blue-900/30 font-medium' : ''}`}>
              {opt}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function CustomerList() {
  const [view, setView] = useState('list'); // list | create | detail
  const [toast, setToast] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  return (
    <div className="space-y-4">
      <Toast toast={toast} onClose={() => setToast(null)} />
      {view === 'list' && (
        <ListView
          onCreateNew={() => setView('create')}
          onSelectCustomer={(c) => { setSelectedCustomer(c); setView('detail'); }}
          showToast={showToast}
        />
      )}
      {view === 'create' && (
        <CreateView
          onBack={() => setView('list')}
          showToast={showToast}
          onCreated={(name) => {
            showToast('success', `Đã tạo khách hàng: ${name}`);
            setView('list');
          }}
        />
      )}
      {view === 'detail' && selectedCustomer && (
        <DetailView
          customerName={selectedCustomer}
          onBack={() => setView('list')}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// LIST VIEW
// ═══════════════════════════════════════════════════════════════
function ListView({ onCreateNew, onSelectCustomer, showToast }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('Tất cả');
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [filterMonth, setFilterMonth] = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const filters = [];
      if (search) {
        filters.push(['customer_name', 'like', `%${search}%`]);
      }
      if (groupFilter && groupFilter !== 'Tất cả') {
        filters.push(['customer_group', '=', groupFilter]);
      }

      const list = await db.getDocList('Customer', {
        filters,
        fields: ['name', 'customer_name', 'customer_group', 'mobile_no', 'tax_id'],
        orderBy: { field: 'modified', order: 'desc' },
        limit: 200,
      });

      // Fetch outstanding and total purchases for each customer
      const enriched = await Promise.all(list.map(async (c) => {
        let outstanding = 0;
        let totalPurchases = 0;
        try {
          const invoices = await db.getDocList('Sales Invoice', {
            filters: [['customer', '=', c.name], ['outstanding_amount', '>', 0], ['docstatus', '=', 1]],
            fields: ['outstanding_amount'],
            limit: 0,
          });
          outstanding = invoices.reduce((s, inv) => s + (parseFloat(inv.outstanding_amount) || 0), 0);
        } catch { /* ignore */ }
        try {
          const orders = await db.getDocList('Sales Order', {
            filters: [['customer', '=', c.name], ['docstatus', '=', 1]],
            fields: ['grand_total'],
            limit: 0,
          });
          totalPurchases = orders.reduce((s, o) => s + (parseFloat(o.grand_total) || 0), 0);
        } catch { /* ignore */ }
        return { ...c, outstanding, totalPurchases };
      }));

      setCustomers(enriched);
    } catch (err) {
      showToast('error', 'Lỗi tải danh sách khách hàng: ' + (err.message || err));
    }
    setLoading(false);
  }, [search, groupFilter, showToast]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const exportExcel = () => {
    if (!customers.length) return showToast('error', 'Không có dữ liệu để xuất');
    const data = customers.map((c, i) => ({
      '#': i + 1,
      'Tên KH': c.customer_name,
      'Mã KH': c.name,
      'Nhóm KH': c.customer_group,
      'Điện thoại': c.mobile_no || '',
      'MST': c.tax_id || '',
      'Công nợ': c.outstanding,
      'Tổng mua': c.totalPurchases,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Khách hàng');
    XLSX.writeFile(wb, `KhachHang_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('success', 'Đã xuất Excel');
  };

  const years = [];
  for (let y = new Date().getFullYear(); y >= 2020; y--) years.push(String(y));
  const months = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Users className="w-7 h-7" />
            <div>
              <h2 className="text-xl font-bold">Khách hàng</h2>
              <p className="text-blue-100 text-sm">{customers.length} khách hàng</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportExcel} className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition">
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
            <button onClick={onCreateNew} className="flex items-center gap-1.5 px-4 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-semibold transition">
              <Plus className="w-4 h-4" /> Tạo mới
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm theo tên khách hàng..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
          </div>
          <PortalDropdown options={CUSTOMER_GROUPS} value={groupFilter} onChange={setGroupFilter} placeholder="Nhóm KH" className="w-40" />
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm">
            <option value="">Tất cả tháng</option>
            {months.filter(m => m).map(m => <option key={m} value={m}>Tháng {m}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Đang tải...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Không tìm thấy khách hàng</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-semibold w-10">#</th>
                  <th className="px-4 py-3 text-left font-semibold">Tên KH</th>
                  <th className="px-4 py-3 text-left font-semibold">Mã KH</th>
                  <th className="px-4 py-3 text-left font-semibold">Nhóm KH</th>
                  <th className="px-4 py-3 text-left font-semibold">Điện thoại</th>
                  <th className="px-4 py-3 text-right font-semibold">Công nợ</th>
                  <th className="px-4 py-3 text-right font-semibold">Tổng mua</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {customers.map((c, i) => (
                  <tr key={c.name} onClick={() => onSelectCustomer(c.name)}
                    className="hover:bg-blue-50/50 dark:hover:bg-gray-700/40 cursor-pointer transition">
                    <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.customer_name}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 font-mono text-xs">{c.name}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        {c.customer_group}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{c.mobile_no || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600 dark:text-red-400">{c.outstanding > 0 ? fmt(c.outstanding) : '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400">{c.totalPurchases > 0 ? fmt(c.totalPurchases) : '—'}</td>
                  </tr>
                ))}
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
function CreateView({ onBack, showToast, onCreated }) {
  const [form, setForm] = useState({
    customer_name: '',
    customer_group: 'Company',
    territory: 'Việt Nam',
    mobile_no: '',
    email_id: '',
    tax_id: '',
    address: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer_name.trim()) return showToast('error', 'Vui lòng nhập tên khách hàng');

    setSubmitting(true);
    try {
      const doc = {
        doctype: 'Customer',
        customer_name: form.customer_name.trim(),
        customer_type: 'Company',
        customer_group: form.customer_group,
        territory: form.territory,
        mobile_no: form.mobile_no,
        email_id: form.email_id,
        tax_id: form.tax_id,
        customer_primary_address: form.address,
        default_company: COMPANY,
      };
      const res = await call.post('frappe.client.insert', { doc });
      onCreated(res.message?.name || form.customer_name);
    } catch (err) {
      showToast('error', 'Lỗi tạo khách hàng: ' + (err.message || err));
    }
    setSubmitting(false);
  };

  const inputCls = 'w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';
  const labelCls = 'block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5';

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 hover:bg-white/20 rounded-lg transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold">Tạo khách hàng mới</h2>
            <p className="text-blue-100 text-sm">Loại: Doanh nghiệp (B2B)</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className={labelCls}>Tên khách hàng *</label>
            <input type="text" value={form.customer_name} onChange={e => set('customer_name', e.target.value)}
              placeholder="Công ty TNHH..." className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Nhóm khách hàng</label>
            <PortalDropdown options={CUSTOMER_GROUPS.filter(g => g !== 'Tất cả')} value={form.customer_group}
              onChange={v => set('customer_group', v)} placeholder="Chọn nhóm" />
          </div>
          <div>
            <label className={labelCls}>Khu vực</label>
            <input type="text" value={form.territory} onChange={e => set('territory', e.target.value)}
              className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Số điện thoại</label>
            <input type="text" value={form.mobile_no} onChange={e => set('mobile_no', e.target.value)}
              placeholder="0901 234 567" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.email_id} onChange={e => set('email_id', e.target.value)}
              placeholder="info@company.vn" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Mã số thuế (MST)</label>
            <input type="text" value={form.tax_id} onChange={e => set('tax_id', e.target.value)}
              placeholder="0123456789" className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Địa chỉ</label>
            <textarea value={form.address} onChange={e => set('address', e.target.value)}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP" rows={2} className={inputCls} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Ghi chú</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Ghi chú nội bộ..." rows={2} className={inputCls} />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl font-semibold text-sm transition disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Tạo khách hàng
          </button>
          <button type="button" onClick={onBack}
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            Hủy
          </button>
        </div>
      </form>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETAIL VIEW
// ═══════════════════════════════════════════════════════════════
function DetailView({ customerName, onBack, showToast }) {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [outstanding, setOutstanding] = useState(0);
  const [totalPurchases, setTotalPurchases] = useState(0);
  const [salesOrders, setSalesOrders] = useState([]);
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const doc = await db.getDoc('Customer', customerName);
      setCustomer(doc);
      setEditForm({
        mobile_no: doc.mobile_no || '',
        email_id: doc.email_id || '',
        tax_id: doc.tax_id || '',
        customer_group: doc.customer_group || '',
        territory: doc.territory || '',
      });

      // Outstanding
      try {
        const invoices = await db.getDocList('Sales Invoice', {
          filters: [['customer', '=', customerName], ['outstanding_amount', '>', 0], ['docstatus', '=', 1]],
          fields: ['outstanding_amount'],
          limit: 0,
        });
        setOutstanding(invoices.reduce((s, inv) => s + (parseFloat(inv.outstanding_amount) || 0), 0));
      } catch { /* ignore */ }

      // Total purchases
      try {
        const orders = await db.getDocList('Sales Order', {
          filters: [['customer', '=', customerName], ['docstatus', '=', 1]],
          fields: ['grand_total'],
          limit: 0,
        });
        setTotalPurchases(orders.reduce((s, o) => s + (parseFloat(o.grand_total) || 0), 0));
      } catch { /* ignore */ }

      // Recent Sales Orders
      try {
        const so = await db.getDocList('Sales Order', {
          filters: [['customer', '=', customerName]],
          fields: ['name', 'transaction_date', 'grand_total', 'status', 'docstatus'],
          orderBy: { field: 'transaction_date', order: 'desc' },
          limit: 10,
        });
        setSalesOrders(so);
      } catch { /* ignore */ }

      // Recent Delivery Notes
      try {
        const dn = await db.getDocList('Delivery Note', {
          filters: [['customer', '=', customerName]],
          fields: ['name', 'posting_date', 'grand_total', 'status', 'docstatus'],
          orderBy: { field: 'posting_date', order: 'desc' },
          limit: 10,
        });
        setDeliveryNotes(dn);
      } catch { /* ignore */ }

    } catch (err) {
      showToast('error', 'Lỗi tải thông tin: ' + (err.message || err));
    }
    setLoading(false);
  }, [customerName, showToast]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await call.post('frappe.client.set_value', {
        doctype: 'Customer',
        name: customerName,
        fieldname: editForm,
      });
      showToast('success', 'Đã cập nhật thông tin');
      setEditing(false);
      fetchDetail();
    } catch (err) {
      showToast('error', 'Lỗi cập nhật: ' + (err.message || err));
    }
    setSaving(false);
  };

  const statusBadge = (status, docstatus) => {
    const map = {
      'Completed': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      'To Deliver and Bill': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300',
      'To Bill': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300',
      'To Deliver': 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      'Draft': 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
      'Cancelled': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
    };
    const label = docstatus === 0 ? 'Draft' : docstatus === 2 ? 'Cancelled' : (status || 'Submitted');
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[label] || map['Draft']}`}>{label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">Đang tải...</span>
      </div>
    );
  }

  if (!customer) return null;

  const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500';

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 hover:bg-white/20 rounded-lg transition">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-xl font-bold">{customer.customer_name}</h2>
              <p className="text-blue-100 text-sm">{customer.name} | {customer.customer_group}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.open(`/app/quotation/new?customer=${encodeURIComponent(customerName)}`, '_blank')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition">
              <FileText className="w-4 h-4" /> Tạo Báo giá
            </button>
            <button onClick={() => window.open(`/app/sales-order/new?customer=${encodeURIComponent(customerName)}`, '_blank')}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-medium transition">
              <ShoppingCart className="w-4 h-4" /> Tạo Đơn hàng
            </button>
            <button onClick={() => setEditing(!editing)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white text-blue-600 hover:bg-blue-50 rounded-xl text-sm font-semibold transition">
              <Edit className="w-4 h-4" /> Sửa
            </button>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-blue-100 text-xs font-semibold uppercase tracking-wider">
            <Building2 className="w-4 h-4" /> Khách hàng
          </div>
          <p className="font-bold text-lg leading-tight">{customer.customer_name}</p>
          <p className="text-blue-100 text-sm mt-1">{customer.customer_group}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-emerald-100 text-xs font-semibold uppercase tracking-wider">
            <Phone className="w-4 h-4" /> Liên hệ
          </div>
          <p className="font-bold text-lg">{customer.mobile_no || '—'}</p>
          <p className="text-emerald-100 text-sm mt-1 truncate">{customer.email_id || '—'}</p>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-red-100 text-xs font-semibold uppercase tracking-wider">
            <CreditCard className="w-4 h-4" /> Công nợ
          </div>
          <p className="font-bold text-2xl">{fmt(outstanding)}</p>
          <p className="text-red-100 text-sm mt-1">VND</p>
        </div>
        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2 text-violet-100 text-xs font-semibold uppercase tracking-wider">
            <ShoppingCart className="w-4 h-4" /> Tổng mua
          </div>
          <p className="font-bold text-2xl">{fmt(totalPurchases)}</p>
          <p className="text-violet-100 text-sm mt-1">VND</p>
        </div>
      </div>

      {/* Extra Info */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-5 py-3 text-white text-sm font-semibold flex items-center gap-2">
          <MapPin className="w-4 h-4" /> Thông tin chi tiết
        </div>
        {editing ? (
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Điện thoại</label>
                <input type="text" value={editForm.mobile_no} onChange={e => setEditForm(p => ({ ...p, mobile_no: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email</label>
                <input type="email" value={editForm.email_id} onChange={e => setEditForm(p => ({ ...p, email_id: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">MST</label>
                <input type="text" value={editForm.tax_id} onChange={e => setEditForm(p => ({ ...p, tax_id: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Khu vực</label>
                <input type="text" value={editForm.territory} onChange={e => setEditForm(p => ({ ...p, territory: e.target.value }))} className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Lưu
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm">Hủy</button>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-xs">MST</span>
                <p className="text-gray-900 dark:text-white font-medium">{customer.tax_id || '—'}</p>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-xs">Khu vực</span>
                <p className="text-gray-900 dark:text-white font-medium">{customer.territory || '—'}</p>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-xs">Địa chỉ</span>
                <p className="text-gray-900 dark:text-white font-medium">{customer.customer_primary_address || '—'}</p>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-xs">Loại KH</span>
                <p className="text-gray-900 dark:text-white font-medium">{customer.customer_type || 'Company'}</p>
              </div>
              <div>
                <span className="text-gray-400 dark:text-gray-500 text-xs">Công ty mặc định</span>
                <p className="text-gray-900 dark:text-white font-medium">{customer.default_company || COMPANY}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Sales Orders */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-5 py-3 text-white text-sm font-semibold flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" /> Đơn hàng gần đây
        </div>
        {salesOrders.length === 0 ? (
          <p className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Chưa có đơn hàng</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-semibold">Mã đơn</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Ngày</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Tổng tiền</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {salesOrders.map(so => (
                  <tr key={so.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400 cursor-pointer hover:underline"
                      onClick={() => window.open(`/app/sales-order/${so.name}`, '_blank')}>{so.name}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{so.transaction_date}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{fmt(so.grand_total)}</td>
                    <td className="px-4 py-2.5 text-center">{statusBadge(so.status, so.docstatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Delivery Notes */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 text-white text-sm font-semibold flex items-center gap-2">
          <Truck className="w-4 h-4" /> Phiếu giao hàng gần đây
        </div>
        {deliveryNotes.length === 0 ? (
          <p className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">Chưa có phiếu giao hàng</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 text-xs uppercase tracking-wider">
                  <th className="px-4 py-2.5 text-left font-semibold">Mã phiếu</th>
                  <th className="px-4 py-2.5 text-left font-semibold">Ngày</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Tổng tiền</th>
                  <th className="px-4 py-2.5 text-center font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {deliveryNotes.map(dn => (
                  <tr key={dn.name} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline"
                      onClick={() => window.open(`/app/delivery-note/${dn.name}`, '_blank')}>{dn.name}</td>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{dn.posting_date}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-900 dark:text-white">{fmt(dn.grand_total)}</td>
                    <td className="px-4 py-2.5 text-center">{statusBadge(dn.status, dn.docstatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
