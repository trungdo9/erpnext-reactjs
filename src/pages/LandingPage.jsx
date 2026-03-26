import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Layers, Scissors, RulerIcon, Search, BarChart3, Shield,
    ChevronRight, ArrowRight, Factory, Truck, Package,
    CheckCircle, Zap, Clock, TrendingUp, Users, Database
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// LANDING PAGE - Thép Việt Steel ERP
// ═══════════════════════════════════════════════════════════════

const LandingPage = () => {
    const [scrollY, setScrollY] = useState(0);
    const [visibleSections, setVisibleSections] = useState(new Set());

    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Intersection observer for fade-in animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisibleSections((prev) => new Set([...prev, entry.target.id]));
                    }
                });
            },
            { threshold: 0.15 }
        );
        document.querySelectorAll('[data-animate]').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    const isVisible = (id) => visibleSections.has(id);

    return (
        <div className="min-h-screen bg-[#0a0e17] text-gray-100 overflow-x-hidden">
            {/* ── Animated background pattern ── */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: `repeating-linear-gradient(
                            0deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px
                        ), repeating-linear-gradient(
                            90deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px
                        )`,
                    }}
                />
                <div
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full opacity-20"
                    style={{
                        background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)',
                        transform: `translate(-50%, ${scrollY * -0.1}px)`,
                    }}
                />
            </div>

            {/* ════════════════════════════════════════════════════ */}
            {/* NAVBAR */}
            {/* ════════════════════════════════════════════════════ */}
            <nav
                className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
                style={{
                    backgroundColor: scrollY > 50 ? 'rgba(10,14,23,0.95)' : 'transparent',
                    backdropFilter: scrollY > 50 ? 'blur(12px)' : 'none',
                    borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
                }}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16 sm:h-20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <Factory className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <span className="text-lg font-bold tracking-tight text-white">TVS</span>
                                <span className="text-lg font-light text-gray-400 ml-1">Steel ERP</span>
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Tính năng</a>
                            <a href="#workflow" className="text-sm text-gray-400 hover:text-white transition-colors">Quy trình</a>
                            <a href="#stats" className="text-sm text-gray-400 hover:text-white transition-colors">Hiệu quả</a>
                        </div>
                        <Link
                            to="/login"
                            className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-400 hover:to-orange-500 transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                        >
                            Đăng nhập
                        </Link>
                    </div>
                </div>
            </nav>

            {/* ════════════════════════════════════════════════════ */}
            {/* HERO SECTION */}
            {/* ════════════════════════════════════════════════════ */}
            <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-32 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-4xl mx-auto text-center">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 animate-fadeIn">
                            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                            <span className="text-sm text-gray-300">Hệ thống quản lý sản xuất thép thông minh</span>
                        </div>

                        {/* Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold leading-tight mb-6 animate-slideUp">
                            <span className="text-white">Quản lý sản xuất</span>
                            <br />
                            <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                                Thép chuyên nghiệp
                            </span>
                        </h1>

                        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed animate-slideUp animation-delay-200">
                            Từ nhập cuộn thép đến xả băng, cắt tấm — kiểm soát toàn bộ quy trình sản xuất,
                            truy xuất LOT và báo cáo realtime trên một nền tảng duy nhất.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slideUp animation-delay-400">
                            <Link
                                to="/login"
                                className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-400 hover:to-orange-500 transition-all shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5"
                            >
                                Bắt đầu ngay
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <a
                                href="#workflow"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium text-gray-300 border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all"
                            >
                                Xem quy trình
                            </a>
                        </div>
                    </div>

                    {/* Hero visual - Abstract steel coil illustration */}
                    <div className="mt-16 sm:mt-24 max-w-5xl mx-auto relative">
                        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-transparent p-1 shadow-2xl">
                            <div className="rounded-xl bg-[#0d1220] overflow-hidden">
                                {/* Mock dashboard preview */}
                                <div className="p-4 sm:p-8">
                                    {/* Top bar */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                            <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                        </div>
                                        <div className="flex-1 h-8 rounded-lg bg-white/5 flex items-center px-4">
                                            <span className="text-xs text-gray-500">erp.snuol.com.vn/dashboard</span>
                                        </div>
                                    </div>
                                    {/* Mock cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                        {[
                                            { label: 'Cuộn nhập hôm nay', value: '24', color: 'from-blue-500/20 to-blue-600/5', border: 'border-blue-500/20' },
                                            { label: 'Lệnh xả băng', value: '12', color: 'from-orange-500/20 to-orange-600/5', border: 'border-orange-500/20' },
                                            { label: 'Lệnh cắt tấm', value: '8', color: 'from-emerald-500/20 to-emerald-600/5', border: 'border-emerald-500/20' },
                                            { label: 'Tồn kho (tấn)', value: '1,842', color: 'from-purple-500/20 to-purple-600/5', border: 'border-purple-500/20' },
                                        ].map((card) => (
                                            <div key={card.label} className={`rounded-xl bg-gradient-to-b ${card.color} border ${card.border} p-4`}>
                                                <p className="text-xs text-gray-400 mb-1">{card.label}</p>
                                                <p className="text-2xl font-bold text-white">{card.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Mock chart area */}
                                    <div className="h-32 sm:h-48 rounded-xl bg-white/[0.02] border border-white/5 flex items-end justify-around px-6 pb-4">
                                        {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                                            <div
                                                key={i}
                                                className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-orange-500/60 to-orange-400/20 animate-growUp"
                                                style={{
                                                    height: `${h}%`,
                                                    animationDelay: `${i * 100}ms`,
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Glow effect */}
                        <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-orange-500/20 via-transparent to-blue-500/10 -z-10 blur-xl opacity-50" />
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════ */}
            {/* FEATURES SECTION */}
            {/* ════════════════════════════════════════════════════ */}
            <section id="features" className="py-20 sm:py-32 px-4 relative">
                <div className="max-w-7xl mx-auto">
                    <div
                        id="features-header"
                        data-animate
                        className={`text-center mb-16 transition-all duration-700 ${isVisible('features-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        <span className="text-sm font-medium text-orange-400 tracking-wider uppercase mb-4 block">Tính năng</span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                            Tất cả trong một nền tảng
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            Quản lý trọn vẹn chuỗi sản xuất thép từ kho nguyên liệu đến thành phẩm
                        </p>
                    </div>

                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            {
                                icon: Layers,
                                title: 'Quản lý cuộn thép',
                                desc: 'Nhập cuộn, phân loại theo nhà cung cấp, mác thép, độ dày. Quản lý LOT tự động.',
                                color: 'blue',
                            },
                            {
                                icon: Scissors,
                                title: 'Xả băng (Slitting)',
                                desc: 'Tạo lệnh xả băng, tính toán phôi đầu ra, theo dõi tiến độ realtime.',
                                color: 'orange',
                            },
                            {
                                icon: RulerIcon,
                                title: 'Cắt tấm (Cut-to-length)',
                                desc: 'Lệnh cắt tấm theo đơn hàng, quản lý kích thước và số lượng chính xác.',
                                color: 'emerald',
                            },
                            {
                                icon: Search,
                                title: 'Truy xuất LOT',
                                desc: 'Truy xuất nguồn gốc từng sản phẩm, từ cuộn thép gốc đến thành phẩm cuối cùng.',
                                color: 'purple',
                            },
                            {
                                icon: BarChart3,
                                title: 'Báo cáo sản xuất',
                                desc: 'Dashboard realtime, báo cáo sản lượng, tỷ lệ hao hụt, hiệu suất máy.',
                                color: 'cyan',
                            },
                            {
                                icon: Shield,
                                title: 'Quản lý tồn kho',
                                desc: 'Theo dõi tồn kho theo vị trí, cảnh báo tồn kho thấp, xuất nhập tự động.',
                                color: 'amber',
                            },
                        ].map((feature, i) => {
                            const id = `feature-${i}`;
                            const colorMap = {
                                blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-400', glow: 'group-hover:shadow-blue-500/10' },
                                orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: 'text-orange-400', glow: 'group-hover:shadow-orange-500/10' },
                                emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-400', glow: 'group-hover:shadow-emerald-500/10' },
                                purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-400', glow: 'group-hover:shadow-purple-500/10' },
                                cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', icon: 'text-cyan-400', glow: 'group-hover:shadow-cyan-500/10' },
                                amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-400', glow: 'group-hover:shadow-amber-500/10' },
                            };
                            const c = colorMap[feature.color];
                            return (
                                <div
                                    key={i}
                                    id={id}
                                    data-animate
                                    className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 hover:bg-white/[0.04] transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${c.glow} ${isVisible(id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                    style={{ transitionDelay: `${i * 100}ms` }}
                                >
                                    <div className={`w-12 h-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-5`}>
                                        <feature.icon className={`w-6 h-6 ${c.icon}`} />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                    <p className="text-gray-400 leading-relaxed text-sm">{feature.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════ */}
            {/* WORKFLOW SECTION */}
            {/* ════════════════════════════════════════════════════ */}
            <section id="workflow" className="py-20 sm:py-32 px-4 relative">
                {/* Subtle section divider */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="max-w-7xl mx-auto">
                    <div
                        id="workflow-header"
                        data-animate
                        className={`text-center mb-16 sm:mb-20 transition-all duration-700 ${isVisible('workflow-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        <span className="text-sm font-medium text-orange-400 tracking-wider uppercase mb-4 block">Quy trình</span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                            Quy trình sản xuất thép
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            Kiểm soát từng bước trong chuỗi sản xuất, từ nguyên liệu đầu vào đến thành phẩm
                        </p>
                    </div>

                    {/* Workflow steps */}
                    <div className="relative">
                        {/* Connecting line (desktop) */}
                        <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent -translate-y-1/2" />

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
                            {[
                                {
                                    step: '01',
                                    icon: Truck,
                                    title: 'Nhập cuộn thép',
                                    desc: 'Nhập cuộn thép từ nhà cung cấp, ghi nhận thông số: mác thép, độ dày, trọng lượng, LOT.',
                                },
                                {
                                    step: '02',
                                    icon: Scissors,
                                    title: 'Xả băng (Slitting)',
                                    desc: 'Cắt cuộn thép thành các băng hẹp theo kích thước yêu cầu. Tự động tính toán phôi.',
                                },
                                {
                                    step: '03',
                                    icon: RulerIcon,
                                    title: 'Cắt tấm (Cutting)',
                                    desc: 'Cắt băng thép thành tấm theo kích thước đặt hàng. Ghi nhận số lượng thành phẩm.',
                                },
                                {
                                    step: '04',
                                    icon: Package,
                                    title: 'Xuất kho',
                                    desc: 'Đóng gói, gán LOT truy xuất, xuất kho theo đơn hàng. Cập nhật tồn kho tự động.',
                                },
                            ].map((item, i) => {
                                const id = `workflow-${i}`;
                                return (
                                    <div
                                        key={i}
                                        id={id}
                                        data-animate
                                        className={`relative transition-all duration-700 ${isVisible(id) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                                        style={{ transitionDelay: `${i * 150}ms` }}
                                    >
                                        <div className="relative bg-[#0d1220] rounded-2xl border border-white/[0.06] p-6 sm:p-8 text-center hover:border-orange-500/20 transition-colors group">
                                            {/* Step number */}
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-xs font-bold text-white shadow-lg shadow-orange-500/25">
                                                Bước {item.step}
                                            </div>
                                            {/* Icon */}
                                            <div className="w-16 h-16 mx-auto mt-4 mb-5 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                                <item.icon className="w-8 h-8 text-orange-400" />
                                            </div>
                                            <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                                            <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                                        </div>
                                        {/* Arrow between steps (desktop) */}
                                        {i < 3 && (
                                            <div className="hidden lg:flex absolute top-1/2 -right-6 -translate-y-1/2 z-10 w-12 h-12 items-center justify-center">
                                                <ChevronRight className="w-5 h-5 text-orange-500/50" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════ */}
            {/* STATS SECTION */}
            {/* ════════════════════════════════════════════════════ */}
            <section id="stats" className="py-20 sm:py-32 px-4 relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div className="max-w-7xl mx-auto">
                    <div
                        id="stats-header"
                        data-animate
                        className={`text-center mb-16 transition-all duration-700 ${isVisible('stats-header') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        <span className="text-sm font-medium text-orange-400 tracking-wider uppercase mb-4 block">Hiệu quả</span>
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                            Nâng cao hiệu suất sản xuất
                        </h2>
                        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
                            Số liệu thực tế từ các doanh nghiệp sử dụng TVS Steel ERP
                        </p>
                    </div>

                    <div
                        id="stats-grid"
                        data-animate
                        className={`grid grid-cols-2 lg:grid-cols-4 gap-5 transition-all duration-700 ${isVisible('stats-grid') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        {[
                            { icon: TrendingUp, value: '35%', label: 'Tăng hiệu suất sản xuất', color: 'text-emerald-400' },
                            { icon: Clock, value: '60%', label: 'Giảm thời gian báo cáo', color: 'text-blue-400' },
                            { icon: Database, value: '99.9%', label: 'Chính xác truy xuất LOT', color: 'text-purple-400' },
                            { icon: Users, value: '500+', label: 'Người dùng hoạt động', color: 'text-orange-400' },
                        ].map((stat, i) => (
                            <div
                                key={i}
                                className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-8 text-center hover:bg-white/[0.04] transition-all group"
                            >
                                <stat.icon className={`w-8 h-8 mx-auto mb-4 ${stat.color} opacity-80`} />
                                <p className="text-3xl sm:text-4xl font-bold text-white mb-2">{stat.value}</p>
                                <p className="text-sm text-gray-400">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    {/* Benefits list */}
                    <div
                        id="benefits"
                        data-animate
                        className={`mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-700 ${isVisible('benefits') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                    >
                        {[
                            'Quản lý đa kho, đa xưởng',
                            'Truy xuất LOT xuyên suốt chuỗi sản xuất',
                            'Tích hợp kế toán và CRM',
                            'Báo cáo sản lượng realtime',
                            'Phân quyền theo vai trò',
                            'Hỗ trợ mobile (PWA)',
                        ].map((benefit, i) => (
                            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                                <span className="text-sm text-gray-300">{benefit}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════ */}
            {/* CTA SECTION */}
            {/* ════════════════════════════════════════════════════ */}
            <section className="py-20 sm:py-32 px-4 relative">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                <div
                    id="cta"
                    data-animate
                    className={`max-w-4xl mx-auto text-center transition-all duration-700 ${isVisible('cta') ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                >
                    <div className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-orange-500/[0.08] to-transparent p-8 sm:p-16 overflow-hidden">
                        {/* Background glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-orange-500/10 rounded-full blur-[100px] -z-10" />

                        <Zap className="w-12 h-12 text-orange-400 mx-auto mb-6" />
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                            Sẵn sàng số hóa sản xuất?
                        </h2>
                        <p className="text-gray-400 max-w-xl mx-auto text-lg mb-8">
                            Đăng nhập ngay để trải nghiệm hệ thống quản lý sản xuất thép hiện đại nhất Việt Nam
                        </p>
                        <Link
                            to="/login"
                            className="group inline-flex items-center gap-2 px-10 py-4 text-lg font-semibold bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl hover:from-orange-400 hover:to-orange-500 transition-all shadow-2xl shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5"
                        >
                            Đăng nhập hệ thống
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* ════════════════════════════════════════════════════ */}
            {/* FOOTER */}
            {/* ════════════════════════════════════════════════════ */}
            <footer className="border-t border-white/[0.06] py-8 px-4">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                            <Factory className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm text-gray-400">
                            <span className="font-semibold text-white">TVS</span> Steel ERP
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} Thép Việt Steel. Designed for steel manufacturers.
                    </p>
                </div>
            </footer>

            {/* ── CSS Animations ── */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes growUp {
                    from { height: 0; }
                    to { height: var(--h); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.8s ease-out both;
                }
                .animate-slideUp {
                    animation: slideUp 0.8s ease-out both;
                }
                .animation-delay-200 {
                    animation-delay: 200ms;
                }
                .animation-delay-400 {
                    animation-delay: 400ms;
                }
                .animate-growUp {
                    animation: slideUp 0.6s ease-out both;
                }
                html {
                    scroll-behavior: smooth;
                }
            `}</style>
        </div>
    );
};

export default LandingPage;
