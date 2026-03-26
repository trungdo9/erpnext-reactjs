import { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Warehouse, Package, Layers } from 'lucide-react';
import { db } from '../../api/frappeClient';
import DashboardLayout from '../../components/workspace/DashboardLayout';

function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function StockDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ items: 0, todaySE: 0, warehouses: 0, batches: 0 });
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await Promise.allSettled([
        db.getDocList('Item', { fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Stock Entry', { filters: [['posting_date', '=', todayStr()], ['docstatus', '=', 1]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Warehouse', { filters: [['is_group', '=', 0], ['disabled', '=', 0]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Batch', { filters: [['disabled', '=', 0]], fields: ['name'], limit: 0 }).then(d => d.length),
        db.getDocList('Stock Entry', {
          fields: ['name', 'stock_entry_type', 'posting_date', 'custom_production_type', 'docstatus'],
          orderBy: { field: 'posting_date', order: 'desc' },
          limit: 15,
        }),
      ]);
      setStats({
        items: r[0].status === 'fulfilled' ? r[0].value : 0,
        todaySE: r[1].status === 'fulfilled' ? r[1].value : 0,
        warehouses: r[2].status === 'fulfilled' ? r[2].value : 0,
        batches: r[3].status === 'fulfilled' ? r[3].value : 0,
      });
      if (r[4].status === 'fulfilled') setRows(r[4].value);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const statusLabel = (ds) => ds === 1 ? 'Đã duyệt' : ds === 0 ? 'Nháp' : 'Đã hủy';
  const statusColor = (ds) => ds === 1 ? 'bg-green-100 text-green-700' : ds === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';

  return (
    <DashboardLayout
      kpis={[
        { icon: Package, value: stats.items, label: 'Tổng mặt hàng', color: 'blue' },
        { icon: ArrowLeftRight, value: stats.todaySE, label: 'Phiếu kho hôm nay', color: 'orange' },
        { icon: Warehouse, value: stats.warehouses, label: 'Kho hoạt động', color: 'cyan' },
        { icon: Layers, value: stats.batches, label: 'Batch đang dùng', color: 'purple' },
      ]}
      loading={loading}
      tableTitle="Phiếu kho gần đây"
      tableLink={{ label: 'Xem tất cả', path: '/form/Stock Entry' }}
      columns={[
        { key: 'name', label: 'Mã phiếu' },
        { key: 'type', label: 'Loại' },
        { key: 'date', label: 'Ngày' },
        { key: 'prod', label: 'Loại SX' },
        { key: 'status', label: 'Trạng thái' },
      ]}
      rows={rows}
      renderRow={r => (
        <tr key={r.name} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
          <td className="px-4 py-2.5 font-medium text-blue-600">{r.name}</td>
          <td className="px-4 py-2.5">{r.stock_entry_type}</td>
          <td className="px-4 py-2.5 text-gray-500">{r.posting_date}</td>
          <td className="px-4 py-2.5">{r.custom_production_type || '-'}</td>
          <td className="px-4 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs ${statusColor(r.docstatus)}`}>{statusLabel(r.docstatus)}</span></td>
        </tr>
      )}
    />
  );
}
