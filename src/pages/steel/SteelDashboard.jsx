import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, Scissors, LayoutGrid, Search, BarChart3, Warehouse,
  Loader2, RefreshCw, ArrowRight, AlertTriangle, Calendar
} from 'lucide-react';
import { db } from '../../api/frappeClient';

function formatNum(n, d = 1) { return n == null || isNaN(n) ? '0' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function todayStr() { return new Date().toISOString().slice(0, 10); }
function firstOfMonth() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; }

const quickActions = [
  { label: '1. Nhập Cuộn', icon: Package, path: '/app/nhap-cuon', gradient: 'from-green-400 to-emerald-600', desc: 'Nhận cuộn vào kho NVL' },
  { label: '2. Xả Băng', icon: Scissors, path: '/app/xa-bang', gradient: 'from-blue-400 to-blue-600', desc: 'Xả cuộn thành strip' },
  { label: '3. Cắt Tấm', icon: LayoutGrid, path: '/app/cat-tam', gradient: 'from-orange-400 to-orange-600', desc: 'Cắt strip thành tấm' },
  { label: '4. Tồn Kho', icon: Warehouse, path: '/app/ton-kho', gradient: 'from-cyan-400 to-teal-600', desc: 'Xem tồn kho tất cả kho' },
  { label: '5. Theo dõi Batch', icon: Search, path: '/app/theo-doi-batch', gradient: 'from-purple-400 to-purple-600', desc: 'Truy xuất nguồn gốc' },
  { label: '6. Báo cáo SX', icon: BarChart3, path: '/app/bao-cao-san-xuat', gradient: 'from-red-400 to-rose-600', desc: 'Thống kê sản xuất' },
];

export default function SteelDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    coilsInStock: 0,
    totalStockTon: 0,
    todayWOs: 0,
    monthlyScrap: 0,
  });
  const [recentActivity, setRecentActivity] = useState([]);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        // 1. Count batches in NVL warehouse
        db.getDocList('Batch', {
          filters: [['disabled', '=', 0], ['custom_source_type', '=', 'Nhập cuộn']],
          fields: ['name'],
          limit: 0,
        }).then(r => r.length).catch(() =>
          db.getDocList('Batch', {
            filters: [['disabled', '=', 0]],
            fields: ['name'],
            limit: 500,
          }).then(r => r.length)
        ),

        // 2. Total stock in tons from Bin
        db.getDocList('Bin', {
          filters: [['warehouse', 'like', '% - TVS']],
          fields: ['actual_qty'],
          limit: 500,
        }).then(bins => bins.reduce((sum, b) => sum + (b.actual_qty || 0), 0) / 1000),

        // 3. Today's stock entries
        db.getDocList('Stock Entry', {
          filters: [['posting_date', '=', todayStr()], ['docstatus', '=', 1]],
          fields: ['name'],
          limit: 0,
        }).then(r => r.length),

        // 4. Monthly scrap
        db.getDocList('Stock Entry Detail', {
          filters: [
            ['item_code', 'like', '%Phế liệu%'],
            ['creation', '>=', firstOfMonth()],
          ],
          fields: ['qty'],
          limit: 500,
        }).then(items => items.reduce((sum, i) => sum + (i.qty || 0), 0)),

        // 5. Recent activity
        db.getDocList('Stock Entry', {
          filters: [['docstatus', '=', 1]],
          fields: ['name', 'stock_entry_type', 'posting_date', 'custom_production_type', 'custom_source_batch', 'custom_batch_id'],
          orderBy: { field: 'posting_date', order: 'desc' },
          limit: 10,
        }),
      ]);

      setStats({
        coilsInStock: results[0].status === 'fulfilled' ? results[0].value : 0,
        totalStockTon: results[1].status === 'fulfilled' ? results[1].value : 0,
        todayWOs: results[2].status === 'fulfilled' ? results[2].value : 0,
        monthlyScrap: results[3].status === 'fulfilled' ? results[3].value : 0,
      });

      if (results[4].status === 'fulfilled') {
        setRecentActivity(results[4].value);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const getTypeIcon = (type) => {
    if (type === 'Nhập cuộn') return <Package className="w-4 h-4 text-blue-500" />;
    if (type === 'Xả băng') return <Scissors className="w-4 h-4 text-orange-500" />;
    if (type === 'Cắt tấm') return <LayoutGrid className="w-4 h-4 text-green-500" />;
    return <Warehouse className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-end mb-4">
        <button onClick={loadStats} disabled={loading} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Package, value: stats.coilsInStock, label: 'Cuộn trong kho NVL', gradient: 'from-blue-500 to-indigo-600' },
          { icon: Warehouse, value: formatNum(stats.totalStockTon), label: 'Tổng tồn kho (tấn)', gradient: 'from-cyan-500 to-teal-600' },
          { icon: Calendar, value: stats.todayWOs, label: 'Lệnh SX hôm nay', gradient: 'from-emerald-500 to-green-600' },
          { icon: AlertTriangle, value: formatNum(stats.monthlyScrap, 0), label: 'Phế liệu tháng (kg)', gradient: 'from-red-500 to-rose-600' },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className={`bg-gradient-to-br ${kpi.gradient} rounded-2xl p-4 text-white relative overflow-hidden`}>
              <div className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-white/80" />
              </div>
              {loading && <Loader2 className="absolute top-3 right-14 w-4 h-4 animate-spin text-white/50" />}
              <p className="text-2xl font-bold mt-1">{kpi.value}</p>
              <p className="text-xs text-white/70 mt-1">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Thao tác nhanh</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.path)}
                className={`bg-gradient-to-br ${action.gradient} text-white rounded-2xl p-4 text-left transition-all hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden min-h-[110px] flex flex-col justify-end`}
              >
                <div className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="font-bold text-base">{action.label}</div>
                <div className="text-xs text-white/80 mt-0.5">{action.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Hoạt động gần đây</h2>
          <button onClick={() => navigate('/app/bao-cao-san-xuat')} className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
            Xem tất cả <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">Chưa có hoạt động</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {recentActivity.map(a => (
              <div key={a.name} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                {getTypeIcon(a.custom_production_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{a.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">{a.custom_production_type || a.stock_entry_type}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {a.posting_date} {a.custom_source_batch && `| Batch: ${a.custom_source_batch}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
