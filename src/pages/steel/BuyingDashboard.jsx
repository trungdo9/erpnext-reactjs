import { useState, useEffect, useCallback } from 'react';
import { ClipboardList, ShoppingBag, Truck, PackageCheck } from 'lucide-react';
import { db } from '../../api/frappeClient';
import DashboardLayout from '../../components/workspace/DashboardLayout';

function firstOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
function fmt(n) { return n == null || isNaN(n) ? '0' : Number(n).toLocaleString('vi-VN'); }

export default function BuyingDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pendingPO: 0, monthTotal: 0, suppliers: 0, receipts: 0 });
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await Promise.allSettled([
        db.getDocList('Purchase Order', { filters: [['docstatus', '=', 1], ['per_received', '<', 100]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Purchase Order', { filters: [['docstatus', '=', 1], ['transaction_date', '>=', firstOfMonth()]], fields: ['grand_total'], limit: 0 })
          .then(d => d.reduce((s, i) => s + (i.grand_total || 0), 0)),
        db.getDocList('Supplier', { fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Purchase Receipt', { filters: [['docstatus', '=', 1], ['posting_date', '>=', firstOfMonth()]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Purchase Order', {
          fields: ['name', 'supplier', 'grand_total', 'per_received', 'status', 'transaction_date'],
          orderBy: { field: 'transaction_date', order: 'desc' },
          limit: 15,
        }),
      ]);
      setStats({
        pendingPO: r[0].status === 'fulfilled' ? r[0].value : 0,
        monthTotal: r[1].status === 'fulfilled' ? r[1].value : 0,
        suppliers: r[2].status === 'fulfilled' ? r[2].value : 0,
        receipts: r[3].status === 'fulfilled' ? r[3].value : 0,
      });
      if (r[4].status === 'fulfilled') setRows(r[4].value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout
      kpis={[
        { icon: ShoppingBag, value: stats.pendingPO, label: 'PO chờ nhận hàng', color: 'orange' },
        { icon: ClipboardList, value: fmt(stats.monthTotal), label: 'Tổng mua tháng', color: 'blue' },
        { icon: Truck, value: stats.suppliers, label: 'Nhà cung cấp', color: 'green' },
        { icon: PackageCheck, value: stats.receipts, label: 'Nhận hàng tháng', color: 'purple' },
      ]}
      loading={loading}
      tableTitle="Đơn mua hàng gần đây"
      tableLink={{ label: 'Xem tất cả', path: '/form/Purchase Order' }}
      columns={[
        { key: 'name', label: 'Mã PO' },
        { key: 'supplier', label: 'Nhà cung cấp' },
        { key: 'grand_total', label: 'Tổng tiền', align: 'right' },
        { key: 'per_received', label: '% Nhận', align: 'right' },
        { key: 'status', label: 'Trạng thái' },
        { key: 'date', label: 'Ngày' },
      ]}
      rows={rows}
      renderRow={r => (
        <tr key={r.name} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <td className="px-4 py-2.5 font-medium text-blue-600">{r.name}</td>
          <td className="px-4 py-2.5">{r.supplier}</td>
          <td className="px-4 py-2.5 text-right">{fmt(r.grand_total)}</td>
          <td className="px-4 py-2.5 text-right">{r.per_received?.toFixed(0)}%</td>
          <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{r.status}</span></td>
          <td className="px-4 py-2.5 text-gray-500">{r.transaction_date}</td>
        </tr>
      )}
    />
  );
}
