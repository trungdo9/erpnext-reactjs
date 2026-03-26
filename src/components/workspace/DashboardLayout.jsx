/**
 * DashboardLayout - Reusable workspace dashboard layout
 *
 * Usage:
 *   <DashboardLayout
 *     kpis={[{ icon: Users, value: 10, label: 'Nhân viên', color: 'blue' }]}
 *     loading={loading}
 *     tableTitle="Nhân viên gần đây"
 *     tableLink={{ label: 'Xem tất cả', path: '/form/Employee' }}
 *     columns={[{ key: 'name', label: 'Mã NV' }, ...]}
 *     rows={rows}
 *     renderRow={(r) => <tr>...</tr>}
 *   />
 */

import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowRight } from 'lucide-react';

export default function DashboardLayout({ kpis = [], loading, tableTitle, tableLink, columns = [], rows = [], renderRow }) {
  const navigate = useNavigate();

  return (
    <div className="space-y-6 w-full">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 text-${k.color}-500`} />
                <span className="text-sm text-gray-500 dark:text-gray-400">{k.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {typeof k.value === 'number' ? k.value.toLocaleString('vi-VN') : k.value}
              </p>
              {k.sub && <p className="text-xs text-gray-400">{k.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{tableTitle}</h2>
          {tableLink && (
            <button onClick={() => navigate(tableLink.path)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              {tableLink.label} <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
        ) : rows.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-500">Không có dữ liệu</div>
        ) : (
          <table className="table-auto w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                {columns.map(col => (
                  <th key={col.key} className={`px-4 py-2.5 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(renderRow)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
