import { useState, useEffect, useCallback } from 'react';
import { FileText, CreditCard, ShoppingCart, Banknote } from 'lucide-react';
import { db } from '../../api/frappeClient';
import DashboardLayout from '../../components/workspace/DashboardLayout';

function firstOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
function fmt(n) { return n == null || isNaN(n) ? '0' : Number(n).toLocaleString('vi-VN'); }

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ revenue: 0, receivable: 0, payable: 0, payments: 0 });
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await Promise.allSettled([
        db.getDocList('Sales Invoice', { filters: [['docstatus', '=', 1], ['posting_date', '>=', firstOfMonth()]], fields: ['grand_total'], limit: 0 })
          .then(d => d.reduce((s, i) => s + (i.grand_total || 0), 0)),
        db.getDocList('Sales Invoice', { filters: [['docstatus', '=', 1], ['outstanding_amount', '>', 0]], fields: ['outstanding_amount'], limit: 0 })
          .then(d => d.reduce((s, i) => s + (i.outstanding_amount || 0), 0)),
        db.getDocList('Purchase Invoice', { filters: [['docstatus', '=', 1], ['outstanding_amount', '>', 0]], fields: ['outstanding_amount'], limit: 0 })
          .then(d => d.reduce((s, i) => s + (i.outstanding_amount || 0), 0)),
        db.getDocList('Payment Entry', { filters: [['docstatus', '=', 1], ['posting_date', '>=', firstOfMonth()]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Sales Invoice', {
          fields: ['name', 'customer', 'grand_total', 'outstanding_amount', 'status', 'posting_date'],
          orderBy: { field: 'posting_date', order: 'desc' },
          limit: 15,
        }),
      ]);
      setStats({
        revenue: r[0].status === 'fulfilled' ? r[0].value : 0,
        receivable: r[1].status === 'fulfilled' ? r[1].value : 0,
        payable: r[2].status === 'fulfilled' ? r[2].value : 0,
        payments: r[3].status === 'fulfilled' ? r[3].value : 0,
      });
      if (r[4].status === 'fulfilled') setRows(r[4].value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout
      kpis={[
        { icon: FileText, value: fmt(stats.revenue), label: 'Doanh thu tháng', color: 'blue' },
        { icon: CreditCard, value: fmt(stats.receivable), label: 'Công nợ phải thu', color: 'orange' },
        { icon: ShoppingCart, value: fmt(stats.payable), label: 'Công nợ phải trả', color: 'red' },
        { icon: Banknote, value: stats.payments, label: 'Phiếu thu chi tháng', color: 'green' },
      ]}
      loading={loading}
      tableTitle="Hóa đơn bán gần đây"
      tableLink={{ label: 'Xem tất cả', path: '/form/Sales Invoice' }}
      columns={[
        { key: 'name', label: 'Mã HĐ' },
        { key: 'customer', label: 'Khách hàng' },
        { key: 'grand_total', label: 'Tổng tiền', align: 'right' },
        { key: 'outstanding', label: 'Còn nợ', align: 'right' },
        { key: 'status', label: 'Trạng thái' },
        { key: 'date', label: 'Ngày' },
      ]}
      rows={rows}
      renderRow={r => (
        <tr key={r.name} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <td className="px-4 py-2.5 font-medium text-blue-600">{r.name}</td>
          <td className="px-4 py-2.5">{r.customer}</td>
          <td className="px-4 py-2.5 text-right">{fmt(r.grand_total)}</td>
          <td className="px-4 py-2.5 text-right">{fmt(r.outstanding_amount)}</td>
          <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{r.status}</span></td>
          <td className="px-4 py-2.5 text-gray-500">{r.posting_date}</td>
        </tr>
      )}
    />
  );
}
