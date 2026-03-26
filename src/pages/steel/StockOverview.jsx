import { useState, useEffect, useCallback } from 'react';
import { Warehouse, Filter, Loader2, RefreshCw, Search } from 'lucide-react';
import { db } from '../../api/frappeClient';

const WAREHOUSES = [
    { name: 'Kho Nguyên liệu - TVS', label: 'Kho Nguyên liệu', color: 'blue' },
    { name: 'Kho Bán thành phẩm - TVS', label: 'Kho Bán thành phẩm', color: 'orange' },
    { name: 'Kho Thành phẩm - TVS', label: 'Kho Thành phẩm', color: 'green' },
    { name: 'Kho Phế liệu - TVS', label: 'Kho Phế liệu', color: 'red' },
];

export default function StockOverview() {
    const [warehouseSummary, setWarehouseSummary] = useState({});
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterWarehouse, setFilterWarehouse] = useState('');
    const [filterItem, setFilterItem] = useState('');
    const [showFilter, setShowFilter] = useState(false);

    const fetchWarehouseSummary = useCallback(async () => {
        const summary = {};
        await Promise.all(
            WAREHOUSES.map(async (wh) => {
                try {
                    const bins = await db.getDocList('Bin', {
                        filters: [['warehouse', '=', wh.name], ['actual_qty', '>', 0]],
                        fields: ['item_code', 'actual_qty', 'warehouse'],
                        limit: 0,
                    });
                    const totalWeight = bins.reduce((sum, b) => sum + (b.actual_qty || 0), 0);
                    summary[wh.name] = {
                        count: bins.length,
                        weight: totalWeight,
                    };
                } catch {
                    summary[wh.name] = { count: 0, weight: 0 };
                }
            })
        );
        setWarehouseSummary(summary);
    }, []);

    const fetchStockDetail = useCallback(async () => {
        setLoading(true);
        try {
            const filters = [['actual_qty', '>', 0]];
            if (filterWarehouse) {
                filters.push(['warehouse', '=', filterWarehouse]);
            }
            if (filterItem) {
                filters.push(['item_code', 'like', `%${filterItem}%`]);
            }

            const bins = await db.getDocList('Bin', {
                filters,
                fields: ['item_code', 'warehouse', 'actual_qty', 'valuation_rate', 'stock_value', 'modified'],
                orderBy: { field: 'modified', order: 'desc' },
                limit: 100,
            });

            // Parse width/thickness from item_code pattern "Thép cuộn HRC-1230-10"
            const enriched = bins.map(bin => {
                const match = bin.item_code?.match(/(\w+)-(\d+)-(\d+)$/);
                return {
                    ...bin,
                    width: match ? match[2] : '-',
                    thickness: match ? match[3] : '-',
                };
            });

            setStockData(enriched);
        } catch (err) {
            console.error('Failed to fetch stock:', err);
            // Fallback: try Stock Ledger Entry
            try {
                const sle = await db.getDocList('Stock Ledger Entry', {
                    filters: [['is_cancelled', '=', 0]],
                    fields: ['item_code', 'warehouse', 'actual_qty', 'batch_no', 'posting_date'],
                    orderBy: { field: 'posting_date', order: 'desc' },
                    limit: 100,
                });
                const enriched = sle.map(entry => {
                    const match = entry.item_code?.match(/(\w+)-(\d+)-(\d+)$/);
                    return {
                        ...entry,
                        width: match ? match[2] : '-',
                        thickness: match ? match[3] : '-',
                    };
                });
                setStockData(enriched);
            } catch {
                setStockData([]);
            }
        } finally {
            setLoading(false);
        }
    }, [filterWarehouse, filterItem]);

    useEffect(() => {
        fetchWarehouseSummary();
        fetchStockDetail();
    }, [fetchWarehouseSummary, fetchStockDetail]);

    const handleRefresh = () => {
        fetchWarehouseSummary();
        fetchStockDetail();
    };

    const colors = {
        blue: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
        orange: 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20',
        green: 'border-l-green-500 bg-green-50 dark:bg-green-900/20',
        red: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
    };

    const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-colors';

    return (
        <div className="p-4 md:p-6 space-y-6">
            <div className="flex justify-end gap-2">
                <button
                    onClick={handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
                <button
                    onClick={() => setShowFilter(!showFilter)}
                    className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${showFilter ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <Filter className="w-4 h-4" />
                    Lọc
                </button>
            </div>

            {/* Filter bar */}
            {showFilter && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kho</label>
                            <select className={inputCls} value={filterWarehouse} onChange={e => setFilterWarehouse(e.target.value)}>
                                <option value="">Tất cả kho</option>
                                {WAREHOUSES.map(w => <option key={w.name} value={w.name}>{w.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tìm item</label>
                            <div className="relative">
                                <input className={inputCls} placeholder="VD: HRC-1230..." value={filterItem} onChange={e => setFilterItem(e.target.value)} />
                                <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
                            </div>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => { setFilterWarehouse(''); setFilterItem(''); }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
                            >
                                Xoá bộ lọc
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warehouse summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {WAREHOUSES.map(wh => {
                    const data = warehouseSummary[wh.name] || { count: 0, weight: 0 };
                    return (
                        <div
                            key={wh.name}
                            className={`rounded-lg border-l-4 p-4 cursor-pointer hover:shadow-md transition-shadow ${colors[wh.color]} ${filterWarehouse === wh.name ? 'ring-2 ring-blue-500' : ''}`}
                            onClick={() => setFilterWarehouse(filterWarehouse === wh.name ? '' : wh.name)}
                        >
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{wh.label}</p>
                            <p className="text-xl font-bold mt-1 text-gray-900 dark:text-white">
                                {(data.weight / 1000).toFixed(1)} tấn
                            </p>
                            <p className="text-xs text-gray-500 mt-1">{data.count} items</p>
                        </div>
                    );
                })}
            </div>

            {/* Stock table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold">Chi tiết tồn kho</h2>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                        <span className="ml-2 text-gray-500">Đang tải...</span>
                    </div>
                ) : stockData.length === 0 ? (
                    <div className="px-4 py-12 text-center text-gray-400">
                        Chưa có dữ liệu tồn kho
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Item</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Kho</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Khổ (mm)</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Dày (mm)</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">TL (kg)</th>
                                    <th className="px-4 py-3 text-right font-medium text-gray-600 dark:text-gray-300">Giá trị</th>
                                    <th className="px-4 py-3 text-left font-medium text-gray-600 dark:text-gray-300">Batch</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {stockData.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium">{row.item_code}</td>
                                        <td className="px-4 py-3 text-xs">
                                            <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300">
                                                {row.warehouse?.replace(' - TVS', '') || '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">{row.width}</td>
                                        <td className="px-4 py-3 text-right">{row.thickness}</td>
                                        <td className="px-4 py-3 text-right font-medium">{Number(row.actual_qty || 0).toLocaleString()}</td>
                                        <td className="px-4 py-3 text-right text-xs text-gray-500">
                                            {row.stock_value ? Number(row.stock_value).toLocaleString('vi-VN') + ' đ' : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-blue-600">{row.batch_no || '-'}</td>
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
