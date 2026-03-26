import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Download, Loader2, RefreshCw, Filter, Calendar,
  Package, Scissors, LayoutGrid, AlertTriangle
} from 'lucide-react';
import { db } from '../../api/frappeClient';
import XLSX from 'xlsx-js-style';

function todayStr() { return new Date().toISOString().slice(0, 10); }
function formatNum(n, d = 0) { return n == null || isNaN(n) ? '-' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }); }

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const CURRENT_MONTH = now.getMonth() + 1;

// Generate year options (current year and 2 years back)
const YEAR_OPTIONS = Array.from({ length: 3 }, (_, i) => CURRENT_YEAR - i);
// Month options 1-12
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const TYPE_OPTIONS = [
  { value: '', label: 'Tất cả' },
  { value: 'Nhập cuộn', label: 'Nhập cuộn' },
  { value: 'Xả băng', label: 'Xả băng' },
  { value: 'Cắt tấm', label: 'Cắt tấm' },
];

function getMonthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

export default function ProductionReport() {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [month, setMonth] = useState(CURRENT_MONTH);

  const defaultRange = getMonthRange(CURRENT_YEAR, CURRENT_MONTH);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(todayStr());

  const [typeFilter, setTypeFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState([]);
  const [kpi, setKpi] = useState({ totalInput: 0, totalOutput: 0, totalScrap: 0, woCount: 0 });

  // When year or month changes, update date range
  const handleYearChange = (y) => {
    setYear(y);
    const range = getMonthRange(y, month);
    setDateFrom(range.from);
    // If current year+month, cap to today
    if (y === CURRENT_YEAR && month === CURRENT_MONTH) {
      setDateTo(todayStr());
    } else {
      setDateTo(range.to);
    }
  };

  const handleMonthChange = (m) => {
    setMonth(m);
    const range = getMonthRange(year, m);
    setDateFrom(range.from);
    if (year === CURRENT_YEAR && m === CURRENT_MONTH) {
      setDateTo(todayStr());
    } else {
      setDateTo(range.to);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters = [
        ['docstatus', '=', 1],
        ['posting_date', '>=', dateFrom],
        ['posting_date', '<=', dateTo],
      ];
      if (typeFilter) {
        filters.push(['custom_production_type', '=', typeFilter]);
      }

      const data = await db.getDocList('Stock Entry', {
        filters,
        fields: ['name', 'stock_entry_type', 'posting_date', 'custom_production_type', 'custom_source_batch', 'custom_batch_id', 'total_outgoing_value', 'total_incoming_value', 'remarks'],
        orderBy: { field: 'posting_date', order: 'desc' },
        limit: 200,
      });

      setEntries(data);

      let totalInput = 0, totalOutput = 0, totalScrap = 0, woCount = data.length;

      try {
        const batches = await db.getDocList('Batch', {
          filters: [['creation', '>=', dateFrom], ['creation', '<=', dateTo + ' 23:59:59']],
          fields: ['custom_actual_weight_kg', 'custom_source_type'],
          limit: 500,
        });
        for (const b of batches) {
          const w = b.custom_actual_weight_kg || 0;
          if (b.custom_source_type === 'Nhập cuộn') totalInput += w;
          else if (b.custom_source_type === 'Xả băng' || b.custom_source_type === 'Cắt tấm') totalOutput += w;
        }
      } catch (_) {}

      try {
        const scrapEntries = await db.getDocList('Stock Entry Detail', {
          filters: [
            ['parent', 'in', data.map(d => d.name)],
            ['item_code', 'like', '%Phế liệu%'],
          ],
          fields: ['qty'],
          limit: 500,
        });
        totalScrap = scrapEntries.reduce((sum, s) => sum + (s.qty || 0), 0);
      } catch (_) {}

      setKpi({ totalInput, totalOutput, totalScrap, woCount });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const scrapPct = kpi.totalInput > 0 ? (kpi.totalScrap / kpi.totalInput * 100) : 0;

  const getTypeIcon = (type) => {
    if (type === 'Nhập cuộn') return <Package className="w-4 h-4 text-blue-500" />;
    if (type === 'Xả băng') return <Scissors className="w-4 h-4 text-orange-500" />;
    if (type === 'Cắt tấm') return <LayoutGrid className="w-4 h-4 text-green-500" />;
    return <BarChart3 className="w-4 h-4 text-gray-500" />;
  };

  const getTypeBadge = (type) => {
    const colors = {
      'Nhập cuộn': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'Xả băng': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      'Cắt tấm': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  };

  const exportExcel = () => {
    if (entries.length === 0) return;

    const headerStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '4472C4' } }, alignment: { horizontal: 'center' } };
    const header = ['Mã SE', 'Ngày', 'Loại', 'SE Type', 'Batch nguồn', 'Ghi chú'].map(v => ({ v, s: headerStyle }));

    const dataRows = entries.map(e => [
      e.name,
      e.posting_date,
      e.custom_production_type || '',
      e.stock_entry_type || '',
      e.custom_source_batch || e.custom_batch_id || '',
      e.remarks || '',
    ]);

    const kpiStyle = { font: { bold: true }, fill: { fgColor: { rgb: 'E2EFDA' } } };
    const summaryRows = [
      [],
      [{ v: 'Tổng nhập (tấn)', s: kpiStyle }, { v: kpi.totalInput / 1000, s: kpiStyle, t: 'n' }],
      [{ v: 'Tổng output (tấn)', s: kpiStyle }, { v: kpi.totalOutput / 1000, s: kpiStyle, t: 'n' }],
      [{ v: 'Phế liệu (kg)', s: kpiStyle }, { v: kpi.totalScrap, s: kpiStyle, t: 'n' }],
      [{ v: 'Số lệnh SX', s: kpiStyle }, { v: kpi.woCount, s: kpiStyle, t: 'n' }],
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows, ...summaryRows]);
    ws['!cols'] = [{ wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 20 }, { wch: 30 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Báo cáo SX');
    XLSX.writeFile(wb, `bao-cao-san-xuat_${dateFrom}_${dateTo}.xlsx`);
  };

  const selectCls = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";
  const labelCls = "block text-xs text-gray-500 mb-1";

  return (
    <div className="space-y-6 w-full">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Bộ lọc</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
          {/* Year */}
          <div>
            <label className={labelCls}>Năm</label>
            <select value={year} onChange={e => handleYearChange(Number(e.target.value))} className={selectCls}>
              {YEAR_OPTIONS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {/* Month */}
          <div>
            <label className={labelCls}>Tháng</label>
            <select value={month} onChange={e => handleMonthChange(Number(e.target.value))} className={selectCls}>
              {MONTH_OPTIONS.map(m => <option key={m} value={m}>Tháng {m}</option>)}
            </select>
          </div>
          {/* From date */}
          <div>
            <label className={labelCls}>Từ ngày</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selectCls} />
          </div>
          {/* To date */}
          <div>
            <label className={labelCls}>Đến ngày</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selectCls} />
          </div>
          {/* Type */}
          <div>
            <label className={labelCls}>Loại</label>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className={selectCls}>
              {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          {/* Reload */}
          <div className="flex items-end">
            <button onClick={loadData} disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 text-sm font-medium">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Tải lại
            </button>
          </div>
          {/* Export */}
          <div className="flex items-end">
            <button onClick={exportExcel} disabled={entries.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium disabled:opacity-40">
              <Download className="w-4 h-4" /> Xuất Excel
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Tổng nhập</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNum(kpi.totalInput / 1000, 1)}</p>
          <p className="text-xs text-gray-400">tấn</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <LayoutGrid className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Tổng output</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNum(kpi.totalOutput / 1000, 1)}</p>
          <p className="text-xs text-gray-400">tấn</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Phế liệu</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatNum(kpi.totalScrap)} kg</p>
          <p className="text-xs text-gray-400">{formatNum(scrapPct, 1)}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">Số lệnh SX</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{kpi.woCount}</p>
          <p className="text-xs text-gray-400">Stock Entry</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Mã SE</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Ngày</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Loại</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">SE Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Batch nguồn</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Ghi chú</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /></td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>
              ) : entries.map(e => (
                <tr key={e.name} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-white">{e.name}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{e.posting_date}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${getTypeBadge(e.custom_production_type)}`}>
                      {getTypeIcon(e.custom_production_type)}
                      {e.custom_production_type || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">{e.stock_entry_type}</td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400 font-mono text-xs">{e.custom_source_batch || e.custom_batch_id || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 max-w-xs truncate">{e.remarks || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {entries.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
            Hiển thị {entries.length} kết quả
          </div>
        )}
      </div>
    </div>
  );
}
