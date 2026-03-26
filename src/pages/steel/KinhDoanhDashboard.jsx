import { useState, useEffect, useCallback } from 'react';
import { Users, FileText, ShoppingCart, Truck } from 'lucide-react';
import { db } from '../../api/frappeClient';
import DashboardLayout from '../../components/workspace/DashboardLayout';

function firstOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }
function fmt(n) { return n == null || isNaN(n) ? '0' : Number(n).toLocaleString('vi-VN'); }

export default function KinhDoanhDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ customers: 0, openQuotes: 0, monthOrders: 0, pendingDelivery: 0 });
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await Promise.allSettled([
        db.getDocList('Customer', { fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Quotation', { filters: [['docstatus', '=', 0]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Sales Order', { filters: [['transaction_date', '>=', firstOfMonth()], ['docstatus', '=', 1]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Sales Order', { filters: [['docstatus', '=', 1], ['per_delivered', '<', 100]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Sales Order', {
          fields: ['name', 'customer', 'grand_total', 'per_delivered', 'delivery_status', 'transaction_date'],
          orderBy: { field: 'transaction_date', order: 'desc' },
          limit: 15,
        }),
      ]);
      setStats({
        customers: r[0].status === 'fulfilled' ? r[0].value : 0,
        openQuotes: r[1].status === 'fulfilled' ? r[1].value : 0,
        monthOrders: r[2].status === 'fulfilled' ? r[2].value : 0,
        pendingDelivery: r[3].status === 'fulfilled' ? r[3].value : 0,
      });
      if (r[4].status === 'fulfilled') setRows(r[4].value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout
      kpis={[
        { icon: Users, value: stats.customers, label: 'Khách hàng', color: 'blue' },
        { icon: FileText, value: stats.openQuotes, label: 'Báo giá mở', color: 'orange' },
        { icon: ShoppingCart, value: stats.monthOrders, label: 'Đơn hàng tháng', color: 'green' },
        { icon: Truck, value: stats.pendingDelivery, label: 'Chờ giao hàng', color: 'red' },
      ]}
      loading={loading}
      tableTitle="Đơn hàng gần đây"
      tableLink={{ label: 'Xem tất cả', path: '/app/ban-hang' }}
      columns={[
        { key: 'name', label: 'Mã SO' },
        { key: 'customer', label: 'Khách hàng' },
        { key: 'grand_total', label: 'Tổng tiền', align: 'right' },
        { key: 'per_delivered', label: '% Giao', align: 'right' },
        { key: 'delivery', label: 'Giao hàng' },
        { key: 'date', label: 'Ngày' },
      ]}
      rows={rows}
      renderRow={r => (
        <tr key={r.name} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <td className="px-4 py-2.5 font-medium text-blue-600">{r.name}</td>
          <td className="px-4 py-2.5">{r.customer}</td>
          <td className="px-4 py-2.5 text-right">{fmt(r.grand_total)}</td>
          <td className="px-4 py-2.5 text-right">{r.per_delivered?.toFixed(0)}%</td>
          <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{r.delivery_status || '-'}</span></td>
          <td className="px-4 py-2.5 text-gray-500">{r.transaction_date}</td>
        </tr>
      )}
    />
  );
}
