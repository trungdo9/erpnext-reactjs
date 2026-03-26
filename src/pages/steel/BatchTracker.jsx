import { useState, useCallback } from 'react';
import {
  Search, Loader2, ChevronRight, ChevronDown, Package, Scissors,
  LayoutGrid, AlertTriangle, Info, X, GitBranch
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { db } from '../../api/frappeClient';

function formatNum(n, d = 2) { return n == null || isNaN(n) ? '-' : Number(n).toLocaleString('vi-VN', { minimumFractionDigits: d, maximumFractionDigits: d }); }

// Color config by source type
const typeConfig = {
  'Nhập cuộn': { color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: Package, label: 'Cuộn gốc' },
  'Xả băng': { color: 'bg-orange-500', textColor: 'text-orange-700 dark:text-orange-300', bgColor: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', icon: Scissors, label: 'Strip' },
  'Cắt tấm': { color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300', bgColor: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: LayoutGrid, label: 'Tấm' },
  'Phế': { color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300', bgColor: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: AlertTriangle, label: 'Phế liệu' },
};

function getConfig(type) { return typeConfig[type] || typeConfig['Nhập cuộn']; }

// ---------- Tree Node ----------
function TreeNode({ node, depth = 0, onSelect, selectedBatch }) {
  const [expanded, setExpanded] = useState(true);
  const cfg = getConfig(node.custom_source_type);
  const Icon = cfg.icon;
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedBatch?.name === node.name;

  return (
    <div className={depth > 0 ? 'ml-4 md:ml-6' : ''}>
      {depth > 0 && (
        <div className="flex items-center h-4">
          <div className="w-4 md:w-6 border-l-2 border-b-2 border-gray-300 dark:border-gray-600 h-full rounded-bl" />
        </div>
      )}
      <div
        className={`flex items-start gap-2 p-2 md:p-3 rounded-lg border cursor-pointer transition-colors ${isSelected ? `${cfg.bgColor} ${cfg.border}` : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
        onClick={() => onSelect(node)}
      >
        <div className={`w-3 h-3 mt-1 rounded-sm flex-shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{node.name}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded ${cfg.bgColor} ${cfg.textColor}`}>{cfg.label}</span>
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {node.item && <span>{node.item} | </span>}
            {node.custom_coil_width_mm && <span>{node.custom_coil_width_mm}x{node.custom_coil_thickness_mm}mm | </span>}
            <span className="font-medium">{formatNum(node.custom_actual_weight_kg)} kg</span>
            {node.custom_theoretical_length_m > 0 && <span> | {formatNum(node.custom_theoretical_length_m)}m</span>}
            {node.custom_sheet_count > 0 && <span> | {node.custom_sheet_count} tấm</span>}
          </div>
        </div>
        {hasChildren && (
          <button onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
            {expanded ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
          </button>
        )}
      </div>
      {hasChildren && expanded && (
        <div className="space-y-1 mt-1">
          {node.children.map(child => (
            <TreeNode key={child.name} node={child} depth={depth + 1} onSelect={onSelect} selectedBatch={selectedBatch} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Detail Panel ----------
function DetailPanel({ batch, onClose }) {
  if (!batch) return null;
  const cfg = getConfig(batch.custom_source_type);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-white">{batch.name}</h3>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"><X className="w-4 h-4 text-gray-500" /></button>
      </div>

      <div className="flex justify-center">
        <QRCodeSVG value={batch.name} size={120} />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-gray-500">Loại</span><span className={`px-2 py-0.5 rounded ${cfg.bgColor} ${cfg.textColor} text-xs`}>{cfg.label}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Item</span><span className="text-gray-900 dark:text-white">{batch.item || '-'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Rộng</span><span>{batch.custom_coil_width_mm || '-'} mm</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Dày</span><span>{batch.custom_coil_thickness_mm || '-'} mm</span></div>
        <div className="flex justify-between"><span className="text-gray-500">KL thực tế</span><span className="font-bold">{formatNum(batch.custom_actual_weight_kg)} kg</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Dài LT</span><span>{formatNum(batch.custom_theoretical_length_m)} m</span></div>
        {batch.custom_sheet_count > 0 && (
          <>
            <div className="flex justify-between"><span className="text-gray-500">Số tấm</span><span>{batch.custom_sheet_count}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Dài tấm</span><span>{batch.custom_sheet_length_mm} mm</span></div>
          </>
        )}
        <hr className="border-gray-200 dark:border-gray-700" />
        <div className="flex justify-between"><span className="text-gray-500">Batch nguồn</span><span className="text-gray-900 dark:text-white">{batch.custom_source_batch || '(gốc)'}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Cuộn gốc</span><span className="text-gray-900 dark:text-white">{batch.custom_origin_coil_batch || batch.name}</span></div>
        <div className="flex justify-between"><span className="text-gray-500">Ngày tạo</span><span>{batch.creation?.slice(0, 10) || '-'}</span></div>
        {batch.custom_supplier && (
          <div className="flex justify-between"><span className="text-gray-500">NCC</span><span>{batch.custom_supplier}</span></div>
        )}
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function BatchTracker() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [tree, setTree] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [error, setError] = useState('');

  // Recursive fetch: build tree from a root batch
  const buildTree = useCallback(async (batchName) => {
    const batch = await db.getDoc('Batch', batchName);

    // Fetch children
    const children = await db.getDocList('Batch', {
      filters: [['custom_source_batch', '=', batchName], ['name', '!=', batchName]],
      fields: ['name', 'item', 'custom_coil_width_mm', 'custom_coil_thickness_mm', 'custom_actual_weight_kg', 'custom_theoretical_length_m', 'custom_source_batch', 'custom_origin_coil_batch', 'custom_source_type', 'custom_sheet_count', 'custom_sheet_length_mm', 'custom_supplier', 'creation'],
      orderBy: { field: 'creation', order: 'asc' },
      limit: 100,
    });

    // Recursively build children trees
    const childTrees = await Promise.all(
      children.map(async (child) => {
        try {
          return await buildTree(child.name);
        } catch (_) {
          return { ...child, children: [] };
        }
      })
    );

    return { ...batch, children: childTrees };
  }, []);

  // Find root batch (walk up via custom_source_batch)
  const findRoot = useCallback(async (batchName) => {
    let current = batchName;
    let visited = new Set();
    for (let i = 0; i < 20; i++) { // max depth guard
      if (visited.has(current)) break;
      visited.add(current);
      try {
        const b = await db.getDoc('Batch', current);
        if (!b.custom_source_batch || b.custom_source_batch === current || b.custom_source_batch === '') {
          return current; // this is the root
        }
        current = b.custom_source_batch;
      } catch (_) {
        return current;
      }
    }
    return current;
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError('');
    setTree(null);
    setSelectedBatch(null);

    try {
      // Try direct batch name first
      let batchName = searchQuery.trim();

      // Check if it exists
      try {
        await db.getDoc('Batch', batchName);
      } catch (_) {
        // Search by partial name
        const results = await db.getDocList('Batch', {
          filters: [['name', 'like', `%${batchName}%`]],
          fields: ['name'],
          limit: 1,
        });
        if (results.length === 0) {
          // Try searching by item
          const byItem = await db.getDocList('Batch', {
            filters: [['item', 'like', `%${batchName}%`]],
            fields: ['name'],
            limit: 1,
            orderBy: { field: 'creation', order: 'desc' },
          });
          if (byItem.length === 0) {
            setError('Không tìm thấy batch');
            setLoading(false);
            return;
          }
          batchName = byItem[0].name;
        } else {
          batchName = results[0].name;
        }
      }

      // Find root and build tree
      const root = await findRoot(batchName);
      const treeData = await buildTree(root);
      setTree(treeData);
      setSelectedBatch(treeData);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Lỗi khi tìm batch');
    } finally {
      setLoading(false);
    }
  };

  // Weight balance summary for root
  const calcBalance = (node) => {
    if (!node) return { total: 0, outputs: 0, scrap: 0 };
    let outputs = 0;
    const walk = (n) => {
      if (!n.children || n.children.length === 0) {
        outputs += n.custom_actual_weight_kg || 0;
      } else {
        n.children.forEach(walk);
      }
    };
    if (node.children?.length > 0) {
      node.children.forEach(walk);
    }
    return { total: node.custom_actual_weight_kg || 0, outputs };
  };

  const balance = tree ? calcBalance(tree) : null;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
              placeholder="Nhập tên batch, mã item, hoặc scan QR..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 font-medium flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Tìm
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" /> {error}
          </p>
        )}
      </div>

      {/* Result */}
      {tree && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tree */}
          <div className="lg:col-span-2 space-y-4">
            {/* Balance summary */}
            {balance && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Cân bằng tổng thể</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-gray-500">Cuộn gốc</p>
                    <p className="font-bold text-lg text-blue-700 dark:text-blue-300">{formatNum(balance.total, 0)} kg</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-gray-500">Tổng output (lá)</p>
                    <p className="font-bold text-lg text-green-700 dark:text-green-300">{formatNum(balance.outputs, 0)} kg</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-gray-500">Chênh lệch</p>
                    <p className={`font-bold text-lg ${Math.abs(balance.total - balance.outputs) < 10 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatNum(balance.total - balance.outputs, 0)} kg
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tree visualization */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <GitBranch className="w-4 h-4" /> Cây phả hệ Batch
              </h3>
              <div className="space-y-1">
                <TreeNode node={tree} onSelect={setSelectedBatch} selectedBatch={selectedBatch} />
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs">
              {Object.entries(typeConfig).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div className={`w-3 h-3 rounded-sm ${cfg.color}`} />
                  <span className="text-gray-600 dark:text-gray-400">{cfg.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div>
            {selectedBatch ? (
              <DetailPanel batch={selectedBatch} onClose={() => setSelectedBatch(null)} />
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center">
                <Info className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Chọn một node trong cây để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!tree && !loading && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
          <GitBranch className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">Truy xuất nguồn gốc</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Nhập tên batch hoặc scan QR code để xem cây phả hệ sản phẩm</p>
        </div>
      )}
    </div>
  );
}
