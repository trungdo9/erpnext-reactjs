/**
 * DynamicDashboard — Trang chủ Steel ERP
 *
 * Route: / and /dashboard
 *
 * Executive dashboard showing cross-department KPIs:
 * - Production (work orders, job cards, quality)
 * - HR (headcount, leaves)
 * - Warehouse (stock, inventory)
 * - Vehicle (fleet status)
 * - Office (assets, documents)
 * - Workspace navigation grid
 */

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../api/gateway';
import { useWorkspaceSidebar } from '../hooks/useDynamicSidebar';
import { getWorkspaceImage, CUSTOM_WORKSPACE_REDIRECTS } from '../config/doctype.behaviors';
import { getIcon } from '../config/icons';
import { SIDEBAR } from '../config/layout';
import { CARD, TEXT, TRANSITION } from '../config/styles';
import { BarChart } from '../components/charts/AnimatedChart';
import {
    LayoutDashboard, Users, UserPlus, CalendarOff, ClipboardCheck,
    Factory, Truck, Scissors, Scale, Package, TrendingUp,
    UtensilsCrossed, Car, Boxes, FileText, Calendar,
    ChevronRight, Briefcase, Home,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n) => (n || 0).toLocaleString('vi-VN');
const fmtDec = (n) => (n || 0).toLocaleString('vi-VN', { maximumFractionDigits: 1 });

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
    blue:    { icon: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-500/10' },
    emerald: { icon: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
    green:   { icon: 'text-green-600 dark:text-green-400',   bg: 'bg-green-500/10' },
    purple:  { icon: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
    amber:   { icon: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-500/10' },
    indigo:  { icon: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10' },
    red:     { icon: 'text-red-600 dark:text-red-400',       bg: 'bg-red-500/10' },
    orange:  { icon: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
    violet:  { icon: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
    cyan:    { icon: 'text-cyan-600 dark:text-cyan-400',     bg: 'bg-cyan-500/10' },
};

// ─── KPI Card ────────────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
function KPI({ icon: Icon, label, value, unit, color = 'blue', onClick }) {
    const c = C[color] || C.blue;
    const Tag = onClick ? 'button' : 'div';
    return (
        <Tag onClick={onClick}
            className={`${CARD.static} p-3 flex items-center gap-3 text-left ${onClick ? `cursor-pointer hover:bg-muted/40 ${TRANSITION.colors}` : ''}`}>
            <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${c.bg}`}>
                <Icon className={`w-5 h-5 ${c.icon}`} />
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[11px] text-muted-foreground truncate">{label}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-foreground tabular-nums">{value}</span>
                    {unit && <span className="text-[11px] text-muted-foreground">{unit}</span>}
                </div>
            </div>
        </Tag>
    );
}

// ─── Section Header ──────────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
function SH({ icon: Icon, title, color = 'blue', to, navigate }) {
    const c = C[color] || C.blue;
    return (
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-7 h-7 rounded-lg ${c.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
                </div>
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            </div>
            {to && (
                <button onClick={() => navigate(to)}
                    className={`text-xs ${c.icon} flex items-center gap-0.5`}>
                    Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

// ─── Dept Bar ────────────────────────────────────────────────────────────────

function DeptBar({ items }) {
    if (!items?.length) return null;
    const maxVal = Math.max(...items.map(d => d.cnt || 0), 1);
    return (
        <div className="space-y-1">
            {items.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground w-24 truncate text-right">{d.department?.replace(' - TVS', '') || '—'}</span>
                    <div className="flex-1 h-4 bg-muted/40 rounded-sm overflow-hidden">
                        <div className="h-full bg-blue-500/50 dark:bg-blue-400/30 rounded-sm"
                            style={{ width: `${(d.cnt / maxVal * 100)}%` }} />
                    </div>
                    <span className="text-[11px] font-medium tabular-nums w-7 text-right">{d.cnt}</span>
                </div>
            ))}
        </div>
    );
}

// ─── Workspace Tile ──────────────────────────────────────────────────────────

/* eslint-disable react-hooks/static-components -- getIcon returns a stable component ref from registry */
function WSTile({ ws, onClick }) {
    const image = getWorkspaceImage(ws.label || ws.name) || getWorkspaceImage(ws.name);
    const IconComp = getIcon(ws.icon);
    return (
        <button onClick={() => onClick(ws.name)}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${CARD.interactive} text-center`}>
            <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center bg-emerald-500/10">
                {image
                    ? <img src={image} alt="" className="w-full h-full object-cover" loading="lazy" />
                    : <IconComp className="w-5 h-5 text-emerald-500/60" />
                }
            </div>
            <span className="text-[11px] font-medium text-foreground leading-tight line-clamp-2 w-full">
                {ws.label || ws.name}
            </span>
        </button>
    );
}
/* eslint-enable react-hooks/static-components */

// ─── Main Component ──────────────────────────────────────────────────────────

export default function DynamicDashboard() {
    const navigate = useNavigate();
    const { workspaces, isLoading: wsLoading } = useWorkspaceSidebar();

    const { data: d, isLoading } = useQuery({
        queryKey: ['tvs-dashboard'],
        queryFn: async () => {
            // No custom dashboard API — return empty
            return {};
        },
        staleTime: 3 * 60 * 1000,
    });

    const hr = d?.hr || {};
    const prod = d?.production || {};
    const vehicle = d?.vehicle || {};
    const office = d?.office || {};
    const monthLabel = d?.month_label || '';

    const trendData = useMemo(() =>
        (prod.monthly_trend || []).map(m => ({ label: m.month?.slice(5) || '', value: m.tan || 0 })),
    [prod.monthly_trend]);

    return (
        <div className="w-full space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                    <LayoutDashboard className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                    <h1 className={TEXT.title}>Steel ERP</h1>
                    <p className={TEXT.muted}>{monthLabel} — Tổng quan liên phòng ban</p>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-emerald-500" />
                </div>
            ) : (
                <>
                    {/* ═══ PRODUCTION ═══ */}
                    <div>
                        <SH icon={Factory} title={`Sản Xuất — ${monthLabel}`} color="emerald"
                            to="/app/san-xuat" navigate={navigate} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            <KPI icon={Factory} label="Work Orders" value={fmt(prod.work_orders_month)} unit="lệnh"
                                color="amber" onClick={() => navigate('/app/san-xuat')} />
                            <KPI icon={Package} label="Sản lượng tháng" value={fmtDec(prod.produced_month?.tan)} unit="tấn"
                                color="indigo" onClick={() => navigate('/app/bao-cao-san-xuat')} />
                            <KPI icon={Scale} label="Chất lượng đạt" value={fmt(prod.quality_pass_rate)} unit="%"
                                color="purple" />
                            <KPI icon={Scale} label="Lũy kế sản xuất" value={fmtDec(prod.produced_total?.tan)} unit="tấn"
                                color="emerald" />
                        </div>

                        {trendData.length > 1 && (
                            <div className={`${CARD.static} p-4 mt-2.5`}>
                                <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-xs font-semibold text-muted-foreground">Sản lượng xưởng (tấn/tháng)</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <BarChart data={trendData} width={Math.max(trendData.length * 60, 300)} height={140} color="emerald" />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ═══ HR ═══ */}
                    <div>
                        <SH icon={Users} title="Nhân Sự" color="blue" to="/app/nhan-su" navigate={navigate} />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                            <KPI icon={Users} label="Nhân viên" value={fmt(hr.active)} unit="người"
                                color="blue" onClick={() => navigate('/app/danh-ba-nhan-vien')} />
                            <KPI icon={UserPlus} label="Mới tháng này" value={fmt(hr.new_month)} color="green" />
                            <KPI icon={CalendarOff} label="Nghỉ hôm nay" value={fmt(hr.on_leave_today)}
                                color="amber" onClick={() => navigate('/app/nghi-phep')} />
                            <KPI icon={ClipboardCheck} label="Chấm công" value="—"
                                color="indigo" onClick={() => navigate('/app/cham-cong')} />
                        </div>

                        {hr.by_department?.length > 0 && (
                            <div className={`${CARD.static} p-3 mt-2.5`}>
                                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">Theo phòng ban</p>
                                <DeptBar items={hr.by_department} />
                            </div>
                        )}
                    </div>

                    {/* ═══ VEHICLE + OFFICE — compact row ═══ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Vehicle */}
                        <div>
                            <SH icon={Car} title="Xe Cộ" color="blue"
                                to="/app/quan-ly-xe" navigate={navigate} />
                            <div className="space-y-2">
                                <KPI icon={Car} label="Xe sẵn sàng" value={`${fmt(vehicle.available)}/${fmt(vehicle.total)}`} color="blue" />
                                <KPI icon={Truck} label="Chuyến tháng" value={fmt(vehicle.trips_month)} color="indigo" />
                            </div>
                        </div>

                        {/* Office */}
                        <div>
                            <SH icon={Briefcase} title="Văn Phòng" color="violet"
                                to="/app/tai-san" navigate={navigate} />
                            <div className="space-y-2">
                                <KPI icon={Boxes} label="Tổng tài sản" value={fmt(office.assets)} color="amber" />
                                <KPI icon={FileText} label="VB chờ ký" value={fmt(office.pending_docs)}
                                    color="violet" onClick={() => navigate('/app/ky-van-ban')} />
                            </div>
                        </div>
                    </div>

                    {/* ═══ WORKSPACES ═══ */}
                    <div>
                        <SH icon={LayoutDashboard} title="Phòng ban" color="emerald" />
                        {wsLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-500" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2">
                                {workspaces.map(ws => (
                                    <WSTile key={ws.name} ws={ws}
                                        onClick={(name) => navigate(CUSTOM_WORKSPACE_REDIRECTS[name] || `/app/workspace/${encodeURIComponent(name)}`)} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
