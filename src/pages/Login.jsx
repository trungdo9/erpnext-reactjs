import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { useTranslation } from '../hooks/useTranslation';
import ThemeToggle from '../components/ui/ThemeToggle';
import LanguageSelector from '../components/ui/LanguageSelector';
import { LogoFull } from '../components/ui/Logo';
import { APP_CONFIG } from '../config/app';
import PWAInstallPrompt from '../components/ui/PWAInstallPrompt';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AuthService } from '../api/domains/authService';
import { Download, ArrowLeft, UserPlus, Search, Eye, EyeOff, CheckCircle, KeyRound } from 'lucide-react';
import slide1 from '../assets/slide-1.jpg';

// ═══════════════════════════════════════════════════════════════
// OPENCLAW THEME CONSTANTS
// ═══════════════════════════════════════════════════════════════
const C = {
    // Dark mode
    bgDeep: '#050810',
    bgSurface: '#0a0f1a',
    bgElevated: '#111827',
    coral: '#ff4d4d',
    coralMid: '#e63946',
    coralDark: '#991b1b',
    cyan: '#00e5cc',
    cyanMid: '#14b8a6',
    cyanGlow: 'rgba(0, 229, 204, 0.4)',
    textPrimary: '#f0f4ff',
    textSecondary: '#8892b0',
    textMuted: '#5a6480',
    borderSubtle: 'rgba(136, 146, 176, 0.15)',
    borderAccent: 'rgba(255, 77, 77, 0.3)',
    surfaceCard: 'rgba(10, 15, 26, 0.65)',
    surfaceCardStrong: 'rgba(10, 15, 26, 0.8)',
    coralGlow: 'rgba(255,77,77,0.35)',
    // Light mode
    light: {
        bgDeep: '#fcfeff',
        bgSurface: '#ffffff',
        bgElevated: '#f5f9ff',
        coral: '#ef4b58',
        textPrimary: '#0b1220',
        textSecondary: '#2e405c',
        textMuted: '#5f7290',
        borderSubtle: 'rgba(15, 23, 42, 0.16)',
        surfaceCard: 'rgba(255, 255, 255, 0.88)',
    },
};

// Helper: get themed value
const th = (isDark, darkVal, lightVal) => isDark ? darkVal : lightVal;

// ═══════════════════════════════════════════════════════════════
// DATA
// ═══════════════════════════════════════════════════════════════
const PARTNER_BRANDS = [
    { name: 'Thép Việt Steel', color: '#1565c0', logo: null, desc: 'Sản xuất thép cuộn' },
    { name: 'ERPNext', color: '#0089ff', logo: null, desc: 'Nền tảng ERP' },
    { name: 'React 19', color: '#61dafb', logo: null, desc: 'Frontend Framework' },
    { name: 'Frappe', color: '#00a86b', logo: null, desc: 'Backend Framework' },
    { name: 'AI Assistant', color: '#7b1fa2', logo: null, desc: 'Trợ lý thông minh' },
    { name: 'GIS Maps', color: '#2e7d32', logo: null, desc: 'Bản đồ số' },
    { name: 'PWA', color: '#ef6c00', logo: null, desc: 'Ứng dụng di động' },
    { name: 'MariaDB', color: '#003545', logo: null, desc: 'Cơ sở dữ liệu' },
];

const FEATURES = [
    { icon: 'M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21', titleKey: 'auth.landing.feat_production', descKey: 'auth.landing.feat_production_desc', emoji: '\uD83C\uDFED' },
    { icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z', titleKey: 'auth.landing.feat_hr', descKey: 'auth.landing.feat_hr_desc', emoji: '\uD83D\uDC65' },
    { icon: 'M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z', titleKey: 'auth.landing.feat_warehouse', descKey: 'auth.landing.feat_warehouse_desc', emoji: '\uD83D\uDCE6' },
    { icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z', titleKey: 'auth.landing.feat_digital', descKey: 'auth.landing.feat_digital_desc', emoji: '\u26A1' },
];


const INTEGRATIONS = [
    { name: 'ERPNext', icon: '\uD83C\uDFE2' },
    { name: 'React 19', icon: '\u269B\uFE0F' },
    { name: 'AI Chat', icon: '\uD83E\uDD16' },
    { name: 'OpenLayers', icon: '\uD83D\uDDFA\uFE0F' },
    { name: 'Frappe SDK', icon: '\uD83D\uDD27' },
    { name: 'Tailwind CSS', icon: '\uD83C\uDFA8' },
    { name: 'Zustand', icon: '\uD83D\uDCBE' },
    { name: 'React Query', icon: '\uD83D\uDD04' },
    { name: 'PWA', icon: '\uD83D\uDCF1' },
    { name: 'Vite 7', icon: '\u26A1' },
    { name: 'MariaDB', icon: '\uD83D\uDDC4\uFE0F' },
    { name: 'Docker', icon: '\uD83D\uDC33' },
];

const QUICK_START_TABS = [
    {
        label: 'Nhân viên',
        lines: [
            { prompt: true, text: '# Bước 1: Nhập mã số nhân viên' },
            { prompt: false, text: 'Tài khoản: [MSNV]@steel.local' },
            { prompt: false, text: '' },
            { prompt: true, text: '# Bước 2: Đăng nhập hệ thống' },
            { prompt: false, text: 'Username: 12345@steel.local' },
            { prompt: false, text: 'Password: ********' },
            { prompt: false, text: '' },
            { prompt: true, text: '# Bước 3: Bắt đầu sử dụng' },
            { prompt: false, text: '\u2713 Dashboard \u2192 Xem tổng quan' },
            { prompt: false, text: '\u2713 Sản xuất  \u2192 Xả băng, cắt tấm' },
            { prompt: false, text: '\u2713 Nhân sự   \u2192 Chấm công, nghỉ phép' },
        ],
    },
    {
        label: 'Quản lý',
        lines: [
            { prompt: true, text: '# Đăng nhập với tài khoản quản lý' },
            { prompt: false, text: 'Email: manager@thepviet.com' },
            { prompt: false, text: '' },
            { prompt: true, text: '# Các chức năng quản lý' },
            { prompt: false, text: '\u2713 Phê duyệt nghỉ phép' },
            { prompt: false, text: '\u2713 Báo cáo sản xuất tổng hợp' },
            { prompt: false, text: '\u2713 Quản lý nhân sự phòng ban' },
            { prompt: false, text: '\u2713 Theo dõi tồn kho thép' },
            { prompt: false, text: '\u2713 Truy xuất LOT cuộn thép' },
        ],
    },
];

const CTA_CARDS = [
    { title: 'Đăng nhập', desc: 'Truy cập hệ thống ERP', icon: '\uD83D\uDD11', action: 'login' },
    { title: 'Tài liệu', desc: 'Hướng dẫn sử dụng chi tiết', icon: '\uD83D\uDCDA', action: 'docs' },
    { title: 'Video', desc: 'Xem giới thiệu Steel ERP', icon: '\uD83C\uDFAC', action: 'video' },
    { title: 'Liên hệ', desc: 'Hỗ trợ kỹ thuật & đào tạo', icon: '\uD83D\uDCDE', action: 'contact' },
];

const PRESS_CARDS = [
    { title: 'Quản lý sản xuất thép toàn diện', desc: 'Nhập cuộn, xả băng, cắt tấm — kiểm soát toàn bộ quy trình sản xuất thép với truy xuất LOT xuyên suốt.', stat: '100%', statLabel: 'Truy xuất' },
    { title: 'Số hóa nhà máy thép', desc: 'Triển khai ERP quản lý sản xuất, tồn kho, báo cáo sản lượng realtime trên một nền tảng duy nhất.', stat: '6+', statLabel: 'Modules' },
];

// ═══════════════════════════════════════════════════════════════
// HELPER COMPONENTS
// ═══════════════════════════════════════════════════════════════

function FadeIn({ children, delay = 0, className = '' }) {
    return (
        <div className={className} style={{
            opacity: 0, animation: `fadeSlideUp 0.6s ease forwards`, animationDelay: `${delay}ms`,
            willChange: 'transform, opacity',
        }}>{children}</div>
    );
}

function ScrollReveal({ children, className = '', delay = 0, direction = 'up' }) {
    const ref = useRef(null);
    const [v, setV] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) { setV(true); obs.unobserve(el); } },
            { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    const origin = { up: 'translateY(50px)', left: 'translateX(-50px)', right: 'translateX(50px)', scale: 'scale(0.92) translateY(20px)' };
    return (
        <div ref={ref} className={className} style={{
            opacity: v ? 1 : 0, transform: v ? 'none' : (origin[direction] || origin.up),
            transition: `opacity 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.8s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
        }}>{children}</div>
    );
}

function CountOnScroll({ end, suffix = '', duration = 2000 }) {
    const [count, setCount] = useState(0);
    const ref = useRef(null);
    const started = useRef(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => {
            if (e.isIntersecting && !started.current) {
                started.current = true;
                const startTime = performance.now();
                const animate = (now) => {
                    const progress = Math.min((now - startTime) / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 3);
                    setCount(eased * end);
                    if (progress < 1) requestAnimationFrame(animate);
                };
                requestAnimationFrame(animate);
            }
        }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, [end, duration]);
    const display = Number.isInteger(end) ? Math.floor(count).toLocaleString() : count.toFixed(1);
    return <span ref={ref}>{display}{suffix}</span>;
}

function AnimatedBorder() {
    return (
        <div className="animated-border-glass" style={{
            position: 'absolute', inset: 0, borderRadius: 20, padding: '1px',
            background: `conic-gradient(from var(--ba) at 50% 50%,
                rgba(255,77,77,0.0) 0deg, rgba(255,77,77,0.5) 72deg, rgba(0,229,204,0.25) 144deg,
                rgba(255,77,77,0.0) 180deg, rgba(0,229,204,0.15) 270deg, rgba(255,77,77,0.0) 360deg)`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor', maskComposite: 'exclude',
            zIndex: 3, pointerEvents: 'none',
        }} />
    );
}

function GlowInput({ label, id, isDark = true, children, ...props }) {
    const [focused, setFocused] = useState(false);
    const accentColor = isDark ? C.coral : C.light.coral;
    return (
        <div className="mb-4">
            <label className="block text-xs font-medium mb-1.5" htmlFor={id}
                style={{ color: focused ? accentColor : (isDark ? C.textSecondary : C.light.textMuted), transition: 'color 0.25s' }}>
                {label}
            </label>
            <div className="relative">
                <input id={id} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    className={`w-full h-10 px-3 rounded-lg text-sm transition-colors ${isDark ? 'text-white placeholder:text-white/40' : 'text-gray-900 placeholder:text-gray-400'}`}
                    style={{
                        background: focused ? (isDark ? 'rgba(255,77,77,0.07)' : '#fff') : (isDark ? 'rgba(255,255,255,0.05)' : '#F9FAFB'),
                        border: focused ? `1px solid rgba(255,77,77,0.45)` : (isDark ? `1px solid ${C.borderSubtle}` : '1px solid #D1D5DB'),
                        outline: 'none',
                        boxShadow: focused ? `0 0 0 3px rgba(255,77,77,0.15), inset 0 0 6px rgba(255,77,77,0.05)` : 'none',
                    }} {...props} />
                {children}
            </div>
        </div>
    );
}

function PremiumButton({ children, isLoading, disabled, ...props }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button type="submit" disabled={disabled || isLoading}
            onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            className="relative w-full h-11 rounded-xl text-white font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
                background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`,
                boxShadow: hovered ? `0 6px 24px ${C.coralGlow}` : `0 4px 16px rgba(255,77,77,0.25)`,
                filter: hovered ? 'brightness(1.1)' : 'brightness(1)',
                transition: 'filter 0.3s ease, box-shadow 0.3s ease',
            }} {...props}>
            {hovered && <span className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)',
                    backgroundSize: '200% 100%', animation: 'shimmerSweep 0.7s ease forwards' }} />}
            <span style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.2s' }}>{children}</span>
            {isLoading && (
                <span className="absolute inset-0 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </span>
            )}
        </button>
    );
}

// ═══════════════════════════════════════════════════════════════
// STARFIELD BACKGROUND (canvas-based, 120 stars, twinkle, colored)
// ═══════════════════════════════════════════════════════════════
function Starfield() {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        const stars = [];
        const STAR_COUNT = 120;

        const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        resize();
        window.addEventListener('resize', resize);

        for (let i = 0; i < STAR_COUNT; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                r: Math.random() * 1.5 + 0.3,
                a: Math.random(),
                speed: Math.random() * 0.3 + 0.05,
                phase: Math.random() * Math.PI * 2,
                color: Math.random() > 0.92 ? (Math.random() > 0.5 ? '255,77,77' : '0,229,204') : '255,255,255',
            });
        }

        const draw = (time) => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const s of stars) {
                const twinkle = 0.4 + 0.6 * Math.sin(time * 0.001 * s.speed + s.phase);
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${s.color},${twinkle * s.a})`;
                ctx.fill();
                if (s.r > 1 || s.color !== '255,255,255') {
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${s.color},${twinkle * 0.08})`;
                    ctx.fill();
                }
            }
            animId = requestAnimationFrame(draw);
        };
        animId = requestAnimationFrame(draw);
        return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize); };
    }, []);

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
            {/* Nebula glow blobs */}
            <div className="absolute inset-0" style={{
                background: `radial-gradient(ellipse at 20% 50%, rgba(255,77,77,0.08) 0%, transparent 50%),
                             radial-gradient(ellipse at 80% 20%, rgba(0,229,204,0.06) 0%, transparent 45%),
                             radial-gradient(ellipse at 50% 90%, rgba(255,77,77,0.04) 0%, transparent 50%)`,
                animation: 'oc-nebula-drift 20s ease-in-out infinite alternate',
            }} />
            <div className="absolute inset-0" style={{
                background: `radial-gradient(ellipse at 70% 60%, rgba(0,229,204,0.05) 0%, transparent 40%),
                             radial-gradient(ellipse at 30% 80%, rgba(255,107,53,0.04) 0%, transparent 45%)`,
                animation: 'oc-nebula-drift 25s ease-in-out infinite alternate-reverse',
            }} />
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// SECTION HEADER (OpenClaw pattern)
// ═══════════════════════════════════════════════════════════════
function SectionHeader({ children, isDark }) {
    return (
        <h2 style={{
            fontWeight: 600, fontSize: '1.05rem', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 10,
            color: isDark ? C.textPrimary : C.light.textPrimary,
        }}>
            <span style={{ color: C.coral }}>{'\u27E9'}</span> {children}
        </h2>
    );
}

// ═══════════════════════════════════════════════════════════════
// QUICK START TERMINAL
// ═══════════════════════════════════════════════════════════════
function QuickStartTerminal({ isDark }) {
    const [activeTab, setActiveTab] = useState(0);
    const tab = QUICK_START_TABS[activeTab];

    return (
        <div style={{
            borderRadius: 14, overflow: 'hidden',
            border: `1px solid ${isDark ? C.borderSubtle : C.light.borderSubtle}`,
            background: isDark ? C.bgSurface : '#1e293b',
        }}>
            {/* Tab bar */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 0,
                borderBottom: `1px solid ${isDark ? C.borderSubtle : 'rgba(255,255,255,0.1)'}`,
                background: isDark ? C.bgElevated : '#0f172a',
                padding: '0 12px',
            }}>
                {/* Traffic lights */}
                <div style={{ display: 'flex', gap: 6, padding: '12px 8px 12px 4px' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                </div>
                {QUICK_START_TABS.map((t, i) => (
                    <button key={i} onClick={() => setActiveTab(i)}
                        className="cursor-pointer"
                        style={{
                            padding: '10px 16px', fontSize: '0.8rem', fontWeight: 500,
                            color: activeTab === i ? '#ffffff' : 'rgba(255,255,255,0.4)',
                            background: activeTab === i ? (isDark ? C.bgSurface : '#1e293b') : 'transparent',
                            border: 'none', borderBottom: activeTab === i ? `2px solid ${C.coral}` : '2px solid transparent',
                            transition: 'all 0.2s',
                        }}>
                        {t.label}
                    </button>
                ))}
            </div>
            {/* Terminal content */}
            <div style={{ padding: '16px 20px', fontFamily: "'SF Mono', 'Fira Code', monospace", fontSize: '0.82rem', lineHeight: 1.8 }}>
                {tab.lines.map((line, i) => (
                    <div key={i} style={{ color: line.prompt ? 'rgba(0,229,204,0.8)' : 'rgba(240,244,255,0.7)' }}>
                        {line.prompt ? line.text : (line.text ? `  ${line.text}` : '\u00A0')}
                    </div>
                ))}
                <div style={{ marginTop: 8 }}>
                    <span style={{ color: C.coral }}>$</span>
                    <span style={{ color: 'rgba(240,244,255,0.5)', marginLeft: 8 }}>_</span>
                    <span className="oc-cursor-blink" style={{ display: 'inline-block', width: 8, height: 16, background: C.coral, marginLeft: 2, verticalAlign: 'text-bottom' }} />
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// REGISTER VIEW
// ═══════════════════════════════════════════════════════════════
function RegisterView({ t, setAuthView, isDark = true }) {
    const [step, setStep] = useState('lookup');
    const [employeeId, setEmployeeId] = useState('');
    const [employeeName, setEmployeeName] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [generatedEmail, setGeneratedEmail] = useState('');

    const handleLookup = async (e) => {
        e.preventDefault();
        if (!employeeId.trim()) return;
        setError(''); setIsLoading(true);
        try {
            const result = await AuthService.lookupEmployeeForRegistration(employeeId.trim());
            if (result.ok) {
                setEmployeeName(result.employee_name);
                setGeneratedEmail(`${employeeId.trim().toLowerCase()}@steel.local`);
                setStep('set-password');
            } else {
                setError(result.error || t('auth.register.error.not_found'));
            }
        } catch {
            setError(t('auth.register.error.generic'));
        } finally { setIsLoading(false); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 8) { setError(t('auth.register.error.password_min')); return; }
        if (newPassword !== confirmPassword) { setError(t('auth.register.error.password_mismatch')); return; }
        setIsLoading(true);
        try {
            const result = await AuthService.registerEmployeeAccount(employeeId.trim(), newPassword);
            if (result.ok) { setStep('success'); }
            else { setError(result.error || t('auth.register.error.generic')); }
        } catch {
            setError(t('auth.register.error.generic'));
        } finally { setIsLoading(false); }
    };

    const backBtn = (target) => (
        <button onClick={() => target === 'login' ? setAuthView('login') : setStep('lookup')}
            className={`flex items-center gap-1.5 text-sm transition-colors mb-4 cursor-pointer ${isDark ? 'text-white/55 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
            <ArrowLeft className="w-4 h-4" /> {t('auth.forgot_password_back')}
        </button>
    );

    const errBlock = error && <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm border ${isDark ? 'bg-red-500/15 border-red-500/25 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>{error}</div>;

    if (step === 'success') {
        return (
            <>
                <FadeIn delay={100}>
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(0,229,204,0.12)', border: '1px solid rgba(0,229,204,0.2)' }}>
                            <CheckCircle className="w-8 h-8" style={{ color: C.cyan }} />
                        </div>
                        <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('auth.register.success')}</h2>
                        <p className={`text-sm mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{t('auth.register.success_desc')}</p>
                        <div className="px-3 py-2 rounded-lg mb-4" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6' }}>
                            <p className={`text-xs ${isDark ? 'text-white/55' : 'text-gray-400'}`}>{t('auth.register.your_login')}</p>
                            <p className="text-sm font-mono mt-0.5" style={{ color: C.cyan }}>{generatedEmail}</p>
                        </div>
                    </div>
                </FadeIn>
                <FadeIn delay={300}>
                    <button onClick={() => setAuthView('login')}
                        className="w-full h-11 rounded-xl text-white font-semibold transition-[filter] hover:brightness-110 cursor-pointer"
                        style={{ background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`, boxShadow: `0 4px 20px ${C.coralGlow}` }}>
                        {t('auth.register.go_to_login')}
                    </button>
                </FadeIn>
            </>
        );
    }

    if (step === 'set-password') {
        return (
            <>
                <FadeIn delay={100}>
                    {backBtn('lookup')}
                    <h2 className={`text-xl font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('auth.register.set_password')}</h2>
                    <div className="px-3 py-2.5 rounded-lg mb-5" style={{ background: isDark ? 'rgba(0,229,204,0.08)' : 'rgba(0,229,204,0.05)', border: '1px solid rgba(0,229,204,0.15)' }}>
                        <p className="text-sm font-medium" style={{ color: C.cyan }}>{t('auth.register.welcome').replace('{name}', employeeName)}</p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-white/55' : 'text-gray-400'}`}>{t('auth.register.your_login')} <span className={`font-mono ${isDark ? 'text-white/55' : 'text-gray-600'}`}>{generatedEmail}</span></p>
                    </div>
                </FadeIn>
                <form onSubmit={handleRegister}>
                    <FadeIn delay={200}>
                        <GlowInput label={t('auth.register.new_password')} id="reg-password" isDark={isDark}
                            type={showPwd ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••" autoComplete="new-password" required>
                            <button type="button" onClick={() => setShowPwd(!showPwd)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors cursor-pointer ${isDark ? 'text-white/45 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
                                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </GlowInput>
                    </FadeIn>
                    <FadeIn delay={280}>
                        <GlowInput label={t('auth.register.confirm_password')} id="reg-confirm" isDark={isDark}
                            type={showConfirmPwd ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••" autoComplete="new-password" required>
                            <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                                className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors cursor-pointer ${isDark ? 'text-white/45 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
                                {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </GlowInput>
                    </FadeIn>
                    <FadeIn delay={320}><p className={`text-xs mb-4 ${isDark ? 'text-white/45' : 'text-gray-400'}`}>{t('auth.register.password_hint')}</p></FadeIn>
                    {errBlock}
                    <FadeIn delay={360}><PremiumButton isLoading={isLoading} disabled={isLoading}>{t('auth.register.create_account')}</PremiumButton></FadeIn>
                </form>
            </>
        );
    }

    return (
        <>
            <FadeIn delay={100}>
                {backBtn('login')}
                <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center"
                    style={{ background: isDark ? 'rgba(0,229,204,0.1)' : 'rgba(0,229,204,0.06)', border: '1px solid rgba(0,229,204,0.15)' }}>
                    <UserPlus className="w-6 h-6" style={{ color: C.cyan }} />
                </div>
                <h2 className={`text-xl font-semibold mb-1 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('auth.register.title')}</h2>
                <p className={`text-sm mb-6 text-center ${isDark ? 'text-white/55' : 'text-gray-500'}`}>{t('auth.register.subtitle')}</p>
            </FadeIn>
            <form onSubmit={handleLookup}>
                <FadeIn delay={200}>
                    <GlowInput label={t('auth.register.employee_id')} id="reg-employee-id" isDark={isDark} type="text"
                        value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}
                        placeholder={t('auth.register.employee_id_placeholder')} autoComplete="off" required />
                </FadeIn>
                {errBlock}
                <FadeIn delay={300}>
                    <PremiumButton isLoading={isLoading} disabled={isLoading}>
                        <span className="flex items-center justify-center gap-2"><Search className="w-4 h-4" /> {t('auth.register.lookup_button')}</span>
                    </PremiumButton>
                </FadeIn>
            </form>
            <FadeIn delay={400}>
                <div className="mt-4 text-center">
                    <span className={`text-sm ${isDark ? 'text-white/55' : 'text-gray-400'}`}>{t('auth.register.already_have_account')} </span>
                    <button type="button" onClick={() => setAuthView('login')}
                        className="text-sm transition-colors cursor-pointer font-medium" style={{ color: C.cyan }}>
                        {t('auth.register.sign_in')}
                    </button>
                </div>
            </FadeIn>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
// FORGOT PASSWORD VIEW
// ═══════════════════════════════════════════════════════════════
function ForgotPasswordView({ t, setAuthView, isDark = true }) {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [showAdminContact, setShowAdminContact] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;
        setError(''); setIsLoading(true);
        const input = email.trim();
        const emailToReset = input.includes('@') ? input : `${input.toLowerCase()}@steel.local`;
        if (emailToReset.endsWith('@steel.local')) { setShowAdminContact(true); setIsLoading(false); return; }
        try { await AuthService.requestPasswordReset(emailToReset); setSent(true); }
        catch { setError(t('auth.forgot_password_error')); }
        finally { setIsLoading(false); }
    };

    if (sent) {
        return (
            <>
                <FadeIn delay={100}>
                    <div className="text-center py-4">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(0,229,204,0.12)', border: '1px solid rgba(0,229,204,0.2)' }}>
                            <CheckCircle className="w-8 h-8" style={{ color: C.cyan }} />
                        </div>
                        <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('auth.forgot_password_sent')}</h2>
                        <p className={`text-sm ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{t('auth.forgot_password_sent_desc')}</p>
                    </div>
                </FadeIn>
                <FadeIn delay={300}>
                    <button onClick={() => setAuthView('login')}
                        className="w-full h-11 rounded-xl text-white font-semibold transition-[filter] hover:brightness-110 cursor-pointer"
                        style={{ background: `linear-gradient(135deg, ${C.coral}, #ff6b35)` }}>
                        {t('auth.forgot_password_back')}
                    </button>
                </FadeIn>
            </>
        );
    }

    return (
        <>
            <FadeIn delay={100}>
                <button onClick={() => setAuthView('login')}
                    className={`flex items-center gap-1.5 text-sm transition-colors mb-4 cursor-pointer ${isDark ? 'text-white/55 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
                    <ArrowLeft className="w-4 h-4" /> {t('auth.forgot_password_back')}
                </button>
                <h2 className={`text-xl font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('auth.forgot_password_title')}</h2>
                <p className={`text-sm mb-6 ${isDark ? 'text-white/55' : 'text-gray-500'}`}>{t('auth.forgot_password_desc')}</p>
            </FadeIn>

            {showAdminContact ? (
                <>
                    <FadeIn delay={100}>
                        <div className="mb-4 px-3 py-2.5 rounded-lg text-sm" style={{ background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <p className={isDark ? 'text-amber-300/80' : 'text-amber-700'}>{t('auth.forgot_password_no_email')}</p>
                        </div>
                        <div className="rounded-xl p-4 space-y-3 mb-5" style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB' }}>
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0`}
                                    style={{ background: 'rgba(0,229,204,0.12)' }}>
                                    <svg className="w-5 h-5" style={{ color: C.cyan }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <div>
                                    <p className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>{APP_CONFIG.admin.name}</p>
                                    <p className={`text-xs ${isDark ? 'text-white/50' : 'text-gray-500'}`}>{APP_CONFIG.admin.title}</p>
                                </div>
                            </div>
                            <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-white/8' : 'border-gray-200'}`}>
                                <a href={`mailto:${APP_CONFIG.admin.email}`} className={`flex items-center gap-3 p-2 rounded-lg transition-colors group ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
                                    <svg className={`w-4 h-4 flex-shrink-0 ${isDark ? 'text-white/60 group-hover:text-[#00e5cc]' : 'text-gray-400 group-hover:text-teal-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span className={`text-sm ${isDark ? 'text-white/80 group-hover:text-[#00e5cc]' : 'text-gray-700 group-hover:text-teal-600'}`}>{APP_CONFIG.admin.email}</span>
                                </a>
                                <div className="flex items-center gap-3 p-2 rounded-lg" style={{ background: 'rgba(0,229,204,0.08)' }}>
                                    <svg className="w-4 h-4 flex-shrink-0" style={{ color: C.cyan }} viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12.49 10.272v-.45h1.347v6.322h-1.347v-.45a2.573 2.573 0 01-1.67.595c-1.678 0-2.91-1.37-2.91-3.066s1.232-3.066 2.91-3.066c.638 0 1.222.216 1.67.595v.52zm-1.49 4.526c1.006 0 1.67-.768 1.67-1.72 0-.953-.664-1.72-1.67-1.72s-1.67.767-1.67 1.72c0 .952.664 1.72 1.67 1.72z" />
                                        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM4 12c0-4.418 3.582-8 8-8s8 3.582 8 8-3.582 8-8 8-8-3.582-8-8z" />
                                    </svg>
                                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>Zalo: {APP_CONFIG.admin.zalo}</p>
                                </div>
                            </div>
                        </div>
                    </FadeIn>
                    <FadeIn delay={200}>
                        <button onClick={() => { setShowAdminContact(false); setEmail(''); }}
                            className="w-full h-11 rounded-xl text-white font-semibold transition-[filter] hover:brightness-110 cursor-pointer"
                            style={{ background: `linear-gradient(135deg, ${C.coral}, #ff6b35)` }}>
                            {t('auth.understood')}
                        </button>
                    </FadeIn>
                </>
            ) : (
                <form onSubmit={handleSubmit}>
                    <FadeIn delay={200}>
                        <GlowInput label={t('auth.forgot_password_email_label')} id="forgot-email" isDark={isDark} type="text"
                            value={email} onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('auth.forgot_password_email_placeholder')} autoComplete="email" required />
                    </FadeIn>
                    {error && <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm border ${isDark ? 'bg-red-500/15 border-red-500/25 text-red-300' : 'bg-red-50 border-red-200 text-red-700'}`}>{error}</div>}
                    <FadeIn delay={300}>
                        <PremiumButton isLoading={isLoading} disabled={isLoading}>{t('auth.forgot_password_send')}</PremiumButton>
                    </FadeIn>
                </form>
            )}

            <FadeIn delay={400}>
                <div className="mt-4 text-center">
                    <button type="button" onClick={() => setAuthView('login')}
                        className="text-sm transition-colors cursor-pointer font-medium" style={{ color: C.cyan }}>
                        {t('auth.forgot_password_back')}
                    </button>
                </div>
            </FadeIn>
        </>
    );
}

// ═══════════════════════════════════════════════════════════════
// MAIN LOGIN COMPONENT
// ═══════════════════════════════════════════════════════════════
const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errorObj, setErrorObj] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loginMode, setLoginMode] = useState('password');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [showApiSecret, setShowApiSecret] = useState(false);
    const [authView, setAuthView] = useState('login');
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [modalAuthView, setModalAuthView] = useState('login');
    const [showFloatingCTA, setShowFloatingCTA] = useState(false);
    const [pageLoaded, setPageLoaded] = useState(false);
    const [showVideoLightbox, setShowVideoLightbox] = useState(false);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));

    useEffect(() => {
        const obs = new MutationObserver(() => setIsDark(document.documentElement.classList.contains('dark')));
        obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 767px)');
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    useEffect(() => { const t = setTimeout(() => setPageLoaded(true), 300); return () => clearTimeout(t); }, []);

    useEffect(() => {
        const saved = localStorage.getItem('remembered_username');
        if (saved) { setUsername(saved); setRememberMe(true); }
    }, []);

    const { login, loginWithToken, isAuthenticated } = useAuth();
    const { t } = useTranslation();
    const { canInstall, isInstalled, install } = usePWAInstall();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || '/';

    useEffect(() => {
        if (!showVideoLightbox) return;
        const handler = (e) => { if (e.key === 'Escape') setShowVideoLightbox(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [showVideoLightbox]);

    useEffect(() => {
        if (isMobile) return;
        const onScroll = () => { setShowFloatingCTA(window.scrollY > window.innerHeight * 0.7); };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, [isMobile]);

    const handleInstall = async () => {
        if (canInstall) await install();
        else window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setErrorObj(null); setIsLoading(true);
        try {
            const input = username.trim();
            const loginId = /^\d+$/.test(input) ? `${input}@steel.local` : input;
            await login(loginId, password, rememberMe);
            if (rememberMe) localStorage.setItem('remembered_username', username);
            else localStorage.removeItem('remembered_username');
            navigate(from, { replace: true });
        } catch (err) { console.error(err); setErrorObj(t('auth.error.credentials')); }
        finally { setIsLoading(false); }
    };

    const handleTokenSubmit = async (e) => {
        e.preventDefault(); setErrorObj(null); setIsLoading(true);
        try {
            await loginWithToken(apiKey.trim(), apiSecret.trim());
            navigate(from, { replace: true });
        } catch (err) { console.error(err); setErrorObj(t('auth.token.error')); }
        finally { setIsLoading(false); }
    };

    const loginFormContent = (idPrefix, viewSetter) => (
        <>
            <h2 className={`text-xl font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('auth.login.title')}</h2>
            <p className={`text-sm mb-4 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>{t('auth.login.subtitle')}</p>

            {/* Login mode tab switcher */}
            <div className={`flex rounded-lg p-0.5 mb-5 ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <button type="button" onClick={() => { setLoginMode('password'); setErrorObj(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${loginMode === 'password'
                        ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                        : (isDark ? 'text-white/50 hover:text-white/70' : 'text-gray-500 hover:text-gray-700')}`}>
                    <Eye className="w-3.5 h-3.5" />{t('auth.tab.password')}
                </button>
                <button type="button" onClick={() => { setLoginMode('token'); setErrorObj(null); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${loginMode === 'token'
                        ? (isDark ? 'bg-white/10 text-white shadow-sm' : 'bg-white text-gray-900 shadow-sm')
                        : (isDark ? 'text-white/50 hover:text-white/70' : 'text-gray-500 hover:text-gray-700')}`}>
                    <KeyRound className="w-3.5 h-3.5" />{t('auth.tab.token')}
                </button>
            </div>

            {loginMode === 'password' ? (
                <form onSubmit={handleSubmit}>
                    <GlowInput label={t('auth.username')} id={`${idPrefix}-username`} isDark={isDark} type="text"
                        value={username} onChange={(e) => setUsername(e.target.value)}
                        placeholder={t('auth.username.placeholder')} autoComplete="username" required />
                    <GlowInput label={t('auth.password')} id={`${idPrefix}-password`} isDark={isDark}
                        type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.password.placeholder')} autoComplete="current-password" required>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors cursor-pointer ${isDark ? 'text-white/45 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </GlowInput>
                    <div className="flex flex-wrap justify-between items-center mb-5 gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)}
                                className={`w-4 h-4 rounded focus:ring-offset-0 ${isDark ? 'border-white/20 bg-white/5' : 'border-gray-300 bg-white'}`}
                                style={{ accentColor: C.coral }} />
                            <span className={`text-sm transition-colors ${isDark ? 'text-white/60 group-hover:text-white/70' : 'text-gray-500 group-hover:text-gray-700'}`}>{t('auth.remember_me')}</span>
                        </label>
                        <button type="button" onClick={() => viewSetter('forgot-password')}
                            className={`text-sm transition-colors cursor-pointer ${isDark ? 'text-white/50 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>{t('auth.forgot_password')}</button>
                    </div>
                    {errorObj && <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm ${isDark ? 'bg-red-500/15 border border-red-500/25 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>{errorObj}</div>}
                    <PremiumButton isLoading={isLoading} disabled={isLoading}>{t('auth.login_button')}</PremiumButton>
                    <div className="mt-4 text-center">
                        <span className={`text-sm ${isDark ? 'text-white/55' : 'text-gray-400'}`}>{t('auth.no_account')} </span>
                        <button type="button" onClick={() => viewSetter('register')}
                            className="text-sm transition-colors cursor-pointer font-medium" style={{ color: C.cyan }}>
                            {t('auth.create_account')}
                        </button>
                    </div>
                    {import.meta.env.VITE_DEMO_MODE === 'true' && (
                        <button type='button' onClick={async () => {
                            setErrorObj(null); setIsLoading(true);
                            try { await login('demo', 'demo', false); } catch { setErrorObj(null); }
                            finally { setIsLoading(false); }
                        }}
                        className={`w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer border ${isDark ? 'border-white/15 text-white/70 hover:bg-white/10' : 'border-gray-300 text-gray-600 hover:bg-gray-100'}`}>
                            {t('auth.demo_button', 'Vào xem Demo')}
                        </button>
                    )}
                </form>
            ) : (
                <form onSubmit={handleTokenSubmit}>
                    <div className={`mb-4 px-3 py-2.5 rounded-lg text-xs flex items-start gap-2 ${isDark ? 'bg-white/5 border border-white/10 text-white/50' : 'bg-blue-50 border border-blue-100 text-blue-600'}`}>
                        <KeyRound className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span>{t('auth.token.hint')}</span>
                    </div>
                    <GlowInput label={t('auth.token.api_key')} id={`${idPrefix}-api-key`} isDark={isDark} type="text"
                        value={apiKey} onChange={(e) => setApiKey(e.target.value)}
                        placeholder={t('auth.token.api_key_placeholder')} autoComplete="off" required />
                    <GlowInput label={t('auth.token.api_secret')} id={`${idPrefix}-api-secret`} isDark={isDark}
                        type={showApiSecret ? 'text' : 'password'} value={apiSecret} onChange={(e) => setApiSecret(e.target.value)}
                        placeholder={t('auth.token.api_secret_placeholder')} autoComplete="off" required>
                        <button type="button" onClick={() => setShowApiSecret(!showApiSecret)} aria-label={showApiSecret ? 'Hide secret' : 'Show secret'}
                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition-colors cursor-pointer ${isDark ? 'text-white/45 hover:text-white/70' : 'text-gray-400 hover:text-gray-600'}`}>
                            {showApiSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </GlowInput>
                    {errorObj && <div className={`mb-4 px-3 py-2.5 rounded-lg text-sm ${isDark ? 'bg-red-500/15 border border-red-500/25 text-red-300' : 'bg-red-50 border border-red-200 text-red-600'}`}>{errorObj}</div>}
                    <PremiumButton isLoading={isLoading} disabled={isLoading}>{t('auth.token.submit')}</PremiumButton>
                </form>
            )}
        </>
    );

    const authenticatedContent = (onGo) => (
        <>
            <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                    style={{ background: 'rgba(0,229,204,0.12)', border: '1px solid rgba(0,229,204,0.2)' }}>
                    <CheckCircle className="w-8 h-8" style={{ color: C.cyan }} />
                </div>
                <h2 className={`text-xl font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t('auth.landing.welcome_back')}</h2>
                <p className={`text-sm mb-6 ${isDark ? 'text-white/70' : 'text-gray-500'}`}>{t('auth.landing.preview_desc')}</p>
            </div>
            <button onClick={onGo}
                className="w-full h-12 rounded-xl text-white font-semibold transition-[filter] hover:brightness-110 cursor-pointer flex items-center justify-center gap-2"
                style={{ background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`, boxShadow: `0 4px 20px ${C.coralGlow}` }}>
                {t('onboarding.final_enter')}
            </button>
            {!isInstalled && (
                <button onClick={handleInstall}
                    className={`w-full h-11 mt-3 rounded-xl font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2 border ${isDark
                        ? 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}>
                    <Download className="w-4 h-4" />{t('pwa.install_button')}
                </button>
            )}
        </>
    );

    // ═══ MOBILE VIEW ═══
    if (isMobile) {
        return (
            <div className="relative font-sans min-h-screen flex flex-col" style={{ background: isDark ? C.bgDeep : '#ffffff' }}>
                <PWAInstallPrompt />
                {isDark && (
                    <>
                        <img src={slide1} alt="" role="presentation" width={1920} height={1080}
                            loading="eager" decoding="sync" fetchPriority="high"
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ filter: 'brightness(0.1) saturate(0.3)' }} />
                        <div className="absolute inset-0" style={{ background: `${C.bgDeep}cc` }} />
                    </>
                )}
                <div className="fixed top-0 left-0 right-0 h-1 z-30"
                    style={{ background: `linear-gradient(90deg, ${C.coral}, #ff6b35 40%, ${C.cyan} 60%, ${C.coral})` }} />
                <div className="fixed top-3 right-3 z-30 flex items-center gap-1.5">
                    <LanguageSelector variant="ghost" />
                    <ThemeToggle />
                </div>
                <div className="relative z-10 flex-1 flex flex-col justify-center px-6 pt-14 pb-8">
                    <div className="mb-5"><LogoFull /></div>
                    {isAuthenticated ? authenticatedContent(() => navigate('/dashboard')) : authView === 'register' ? (
                        <RegisterView t={t} setAuthView={setAuthView} isDark={isDark} />
                    ) : authView === 'forgot-password' ? (
                        <ForgotPasswordView t={t} setAuthView={setAuthView} isDark={isDark} />
                    ) : loginFormContent('m', setAuthView)}
                    <div className={`mt-5 pt-3 border-t text-center text-xs ${isDark ? 'border-white/8 text-white/40' : 'border-gray-100 text-gray-400'}`}>
                        <p>{t('auth.footer_rights')}</p>
                        <p className="mt-1">{t('auth.footer_powered')}</p>
                    </div>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // DESKTOP: OpenClaw-faithful landing page
    // ═══════════════════════════════════════════════════════════
    const bg = isDark ? C.bgDeep : C.light.bgDeep;
    const bgAlt = isDark ? C.bgSurface : C.light.bgElevated;
    const textPri = isDark ? C.textPrimary : C.light.textPrimary;
    const textSec = isDark ? C.textSecondary : C.light.textSecondary;
    const textMut = isDark ? C.textMuted : C.light.textMuted;
    const borderS = isDark ? C.borderSubtle : C.light.borderSubtle;
    const cardBg = isDark ? C.surfaceCard : C.light.surfaceCard;

    const handleCTAAction = (action) => {
        if (action === 'login') { isAuthenticated ? navigate('/') : setShowLoginModal(true); }
        else if (action === 'video') { setShowVideoLightbox(true); }
        else if (action === 'docs') { window.open('/docs/huong-dan-nhan-su.md', '_blank'); }
        else if (action === 'contact') { window.location.href = `mailto:${APP_CONFIG.admin.email}`; }
    };

    return (
        <div className="relative font-sans" style={{ background: bg, scrollBehavior: 'smooth', fontFamily: "'Inter', system-ui, sans-serif" }}>
            <a href="#features" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:rounded-lg focus:text-white" style={{ background: C.coral }}>
                {t('auth.landing.skip_nav', 'Chuyển đến nội dung chính')}
            </a>
            <PWAInstallPrompt />

            {/* ═══ NAVBAR ═══ */}
            <nav className="fixed top-0 left-0 right-0 z-50" style={{
                opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? 'translateY(0)' : 'translateY(-100%)',
                transition: 'opacity 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s, transform 0.8s cubic-bezier(0.16,1,0.3,1) 0.2s',
                background: isDark ? 'rgba(5,8,16,0.85)' : 'rgba(252,254,255,0.9)',
                backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
                borderBottom: `1px solid ${borderS}`,
            }}>
                <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    <LogoFull />
                    <div className="flex items-center gap-2">
                        <LanguageSelector variant="ghost" />
                        <ThemeToggle />
                        <button onClick={() => isAuthenticated ? navigate('/') : setShowLoginModal(true)}
                            className="ml-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold cursor-pointer transition-all hover:brightness-110"
                            style={{ background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`, boxShadow: `0 2px 16px ${C.coralGlow}` }}>
                            {isAuthenticated ? t('sidebar.menu.main-dashboard') : t('auth.login_button')}
                        </button>
                    </div>
                </div>
            </nav>

            {/* ═══ FLOATING CTA ═══ */}
            <button onClick={() => isAuthenticated ? navigate('/') : setShowLoginModal(true)}
                className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-2.5 rounded-full text-white text-sm font-semibold cursor-pointer transition-all duration-500 ${showFloatingCTA ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}`}
                style={{ background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`, boxShadow: `0 4px 20px ${C.coralGlow}` }}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                <span className="hidden sm:inline">{isAuthenticated ? t('sidebar.menu.main-dashboard') : t('auth.landing.login_cta', 'Đăng nhập')}</span>
            </button>

            <main style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px' }}>
                {/* ═══════════════════════════════════════════════════
                    1. HERO SECTION — Starfield + Logo + Title
                ═══════════════════════════════════════════════════ */}
                <section className="relative" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
                    {/* Background: starfield (dark) / subtle gradient (light) */}
                    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
                        {isDark ? <Starfield /> : (
                            <div className="absolute inset-0" style={{
                                background: `radial-gradient(ellipse at 30% 20%, rgba(34,197,94,0.06) 0%, transparent 50%),
                                             radial-gradient(ellipse at 70% 60%, rgba(255,77,77,0.04) 0%, transparent 45%),
                                             radial-gradient(ellipse at 50% 90%, rgba(0,229,204,0.03) 0%, transparent 50%)`,
                            }} />
                        )}
                    </div>

                    <div className="relative z-10 text-center" style={{
                        opacity: pageLoaded ? 1 : 0, transform: pageLoaded ? 'translateY(0)' : 'translateY(30px)',
                        transition: 'opacity 1s cubic-bezier(0.16,1,0.3,1) 0.3s, transform 1s cubic-bezier(0.16,1,0.3,1) 0.3s',
                    }}>
                        {/* Tagline */}
                        <FadeIn delay={200}>
                            <span style={{
                                display: 'inline-block', fontSize: '0.7rem', fontWeight: 600,
                                letterSpacing: 5, textTransform: 'uppercase',
                                color: textMut, marginBottom: 16,
                            }}>
                                TH\u00C9P VI\u1EC6T STEEL &bull; STEEL ERP
                            </span>
                        </FadeIn>

                        {/* Hero Title with gradient */}
                        <FadeIn delay={400}>
                            <h1 style={{
                                fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1,
                                letterSpacing: '-0.03em', color: textPri, marginBottom: 20,
                            }}>
                                {t('auth.landing.hero_title', 'Quản lý sản xuất')}{' '}
                                <span className="oc-gradient-text">{t('auth.landing.hero_title_hl', 'Thép chuyên nghiệp')}</span>
                            </h1>
                        </FadeIn>

                        {/* Description */}
                        <FadeIn delay={600}>
                            <p style={{
                                fontSize: '1.1rem', color: textSec, maxWidth: 560,
                                margin: '0 auto 32px', lineHeight: 1.7, textWrap: 'balance',
                            }}>
                                {t('auth.landing.hero_subtitle', 'Nhập cuộn, xả băng, cắt tấm — kiểm soát toàn bộ quy trình với truy xuất LOT realtime')}
                            </p>
                        </FadeIn>

                        {/* Announcement Pill */}
                        <FadeIn delay={700}>
                            <div onClick={() => setShowVideoLightbox(true)} className="cursor-pointer" style={{
                                display: 'inline-flex', alignItems: 'center', gap: 8,
                                padding: '6px 16px 6px 6px', borderRadius: 999,
                                border: `1px solid ${borderS}`, background: cardBg,
                                backdropFilter: 'blur(8px)', marginBottom: 32,
                                transition: 'all 0.25s', fontSize: '0.85rem', color: textSec,
                            }}>
                                <span style={{
                                    padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                                    background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`, color: '#fff',
                                }}>Mới</span>
                                {t('auth.landing.announcement', 'Xem video Dấu Ấn 2025 - STEEL ERP')} →
                            </div>
                        </FadeIn>

                        {/* CTA Buttons */}
                        <FadeIn delay={800}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
                                <button onClick={() => isAuthenticated ? navigate('/') : setShowLoginModal(true)}
                                    className="cursor-pointer"
                                    style={{
                                        padding: '14px 32px', borderRadius: 12, border: 'none',
                                        background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`,
                                        color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                                        boxShadow: `0 4px 24px ${C.coralGlow}`,
                                        transition: 'all 0.3s', cursor: 'pointer',
                                    }}>
                                    {isAuthenticated ? t('sidebar.menu.main-dashboard') : t('auth.landing.login_system', 'Đăng nhập hệ thống')}
                                </button>
                                <button onClick={() => setShowVideoLightbox(true)}
                                    className="cursor-pointer"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 10,
                                        padding: '14px 24px', borderRadius: 12,
                                        border: `1px solid ${borderS}`, background: cardBg,
                                        backdropFilter: 'blur(8px)', color: textPri,
                                        fontWeight: 600, fontSize: '0.95rem',
                                        transition: 'all 0.3s', cursor: 'pointer',
                                    }}>
                                    <span style={{
                                        width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`,
                                    }}>
                                        <svg style={{ width: 14, height: 14, color: '#fff', marginLeft: 2 }} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                    </span>
                                    {t('auth.landing.watch_video', 'Xem Video')}
                                </button>
                            </div>
                        </FadeIn>
                    </div>

                    {/* Scroll indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20" style={{
                        opacity: pageLoaded ? 1 : 0, transition: 'opacity 1s ease 1.5s',
                    }}>
                        <div style={{
                            width: 20, height: 32, borderRadius: 999, display: 'flex', justifyContent: 'center', paddingTop: 6,
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'}`,
                        }}>
                            <div style={{ width: 2, height: 8, borderRadius: 999, background: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', animation: 'scrollBounce 2s ease-in-out infinite' }} />
                        </div>
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════
                    2. QUICK START — Terminal-style
                ═══════════════════════════════════════════════════ */}
                <section style={{ marginBottom: 56, position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <SectionHeader isDark={isDark}>{t('auth.landing.quickstart_title', 'Bắt đầu nhanh')}</SectionHeader>
                    </ScrollReveal>
                    <ScrollReveal delay={100}>
                        <QuickStartTerminal isDark={isDark} />
                    </ScrollReveal>
                </section>

                {/* ═══════════════════════════════════════════════════
                    4. FEATURES — 2x3 grid with glassmorphism
                ═══════════════════════════════════════════════════ */}
                <section id="features" style={{ marginBottom: 56, position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <SectionHeader isDark={isDark}>{t('auth.landing.features_section_title', 'Tính năng')}</SectionHeader>
                    </ScrollReveal>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {FEATURES.map((feat, i) => (
                            <ScrollReveal key={i} delay={100 + i * 80} direction="scale">
                                <div className="oc-feature-card" style={{
                                    padding: 20, borderRadius: 14,
                                    border: `1px solid ${borderS}`,
                                    background: cardBg,
                                    backdropFilter: 'blur(12px)',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'default', height: '100%',
                                }}>
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: isDark ? 'rgba(255,77,77,0.08)' : 'rgba(255,77,77,0.06)',
                                        border: `1px solid ${isDark ? 'rgba(255,77,77,0.15)' : 'rgba(255,77,77,0.12)'}`,
                                        marginBottom: 12, fontSize: 20,
                                    }}>
                                        {feat.emoji}
                                    </div>
                                    <h3 style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6, color: textPri }}>
                                        {t(feat.titleKey, feat.titleKey.split('.').pop())}
                                    </h3>
                                    <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: textSec, margin: 0 }}>
                                        {t(feat.descKey, feat.descKey.split('.').pop())}
                                    </p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════
                    5. INTEGRATIONS — Horizontal flex wrap of pills
                ═══════════════════════════════════════════════════ */}
                <section style={{ marginBottom: 56, position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <SectionHeader isDark={isDark}>{t('auth.landing.integrations_title', 'Công nghệ sử dụng')}</SectionHeader>
                    </ScrollReveal>
                    <ScrollReveal delay={100}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {INTEGRATIONS.map((item, i) => (
                                <div key={i} className="oc-integration-pill" style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 6,
                                    padding: '8px 14px', borderRadius: 20,
                                    border: `1px solid ${borderS}`, background: cardBg,
                                    backdropFilter: 'blur(8px)', fontSize: '0.85rem', color: textSec,
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    cursor: 'default',
                                }}>
                                    <span>{item.icon}</span> {item.name}
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </section>

                {/* ═══════════════════════════════════════════════════
                    6. PRESS / ACHIEVEMENTS — 2-column cards
                ═══════════════════════════════════════════════════ */}
                <section style={{ marginBottom: 56, position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <SectionHeader isDark={isDark}>{t('auth.landing.press_title', 'Thành tựu')}</SectionHeader>
                    </ScrollReveal>
                    <div className="oc-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        {PRESS_CARDS.map((card, i) => (
                            <ScrollReveal key={i} delay={100 + i * 100}>
                                <div className="oc-feature-card" style={{
                                    padding: 24, borderRadius: 14,
                                    border: `1px solid ${borderS}`, background: cardBg,
                                    backdropFilter: 'blur(12px)',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    height: '100%',
                                }}>
                                    <div style={{
                                        display: 'inline-flex', alignItems: 'baseline', gap: 6, marginBottom: 12,
                                    }}>
                                        <span style={{ fontSize: '2rem', fontWeight: 800, color: C.coral }}>{card.stat}</span>
                                        <span style={{ fontSize: '0.8rem', color: textMut, fontWeight: 500 }}>{card.statLabel}</span>
                                    </div>
                                    <h3 style={{ fontWeight: 600, fontSize: '0.95rem', color: textPri, marginBottom: 8 }}>{card.title}</h3>
                                    <p style={{ fontSize: '0.82rem', lineHeight: 1.6, color: textSec, margin: 0 }}>{card.desc}</p>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════
                    7. CTA GRID — 4-column action cards
                ═══════════════════════════════════════════════════ */}
                <section style={{ marginBottom: 56, position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <SectionHeader isDark={isDark}>{t('auth.landing.cta_title', 'Truy cập nhanh')}</SectionHeader>
                    </ScrollReveal>
                    <div className="oc-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                        {CTA_CARDS.map((card, i) => (
                            <ScrollReveal key={i} delay={100 + i * 80}>
                                <div className="oc-feature-card cursor-pointer" onClick={() => handleCTAAction(card.action)}
                                    style={{
                                        padding: 20, borderRadius: 14, textAlign: 'center',
                                        border: `1px solid ${borderS}`, background: cardBg,
                                        backdropFilter: 'blur(12px)',
                                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                        cursor: 'pointer',
                                    }}>
                                    <div style={{ fontSize: 28, marginBottom: 10 }}>{card.icon}</div>
                                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: textPri, marginBottom: 4 }}>{card.title}</div>
                                    <div style={{ fontSize: '0.78rem', color: textMut, lineHeight: 1.4 }}>{card.desc}</div>
                                </div>
                            </ScrollReveal>
                        ))}
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════
                    8. NEWSLETTER / LOGIN CTA
                ═══════════════════════════════════════════════════ */}
                <section style={{ marginBottom: 56, position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <div style={{
                            padding: '40px 32px', borderRadius: 16, textAlign: 'center',
                            background: isDark
                                ? `linear-gradient(135deg, rgba(255,77,77,0.08), rgba(0,229,204,0.05))`
                                : `linear-gradient(135deg, rgba(255,77,77,0.04), rgba(0,229,204,0.03))`,
                            border: `1px solid ${borderS}`,
                        }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: textPri, marginBottom: 10, letterSpacing: '-0.02em' }}>
                                {t('auth.landing.footer.cta_heading', 'Sẵn sàng số hóa sản xuất?')}
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: textSec, marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
                                {t('auth.landing.footer.cta_desc', 'Đăng nhập để trải nghiệm hệ thống quản lý sản xuất thép hiện đại.')}
                            </p>
                            <button onClick={() => isAuthenticated ? navigate('/') : setShowLoginModal(true)}
                                className="cursor-pointer"
                                style={{
                                    padding: '14px 32px', borderRadius: 12, border: 'none',
                                    background: `linear-gradient(135deg, ${C.coral}, #ff6b35)`,
                                    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                                    boxShadow: `0 4px 24px ${C.coralGlow}`,
                                    transition: 'all 0.3s', cursor: 'pointer',
                                }}>
                                {isAuthenticated ? t('sidebar.menu.main-dashboard') : t('auth.landing.footer.cta_button', 'Đăng nhập ngay')}
                            </button>
                        </div>
                    </ScrollReveal>
                </section>

                {/* ═══════════════════════════════════════════════════
                    9. PARTNERS — Technology & Platform
                ═══════════════════════════════════════════════════ */}
                <section style={{ marginBottom: 56, position: 'relative', zIndex: 1 }}>
                    <ScrollReveal>
                        <SectionHeader isDark={isDark}>{t('auth.landing.partners.title', 'Nền tảng & Công nghệ')}</SectionHeader>
                    </ScrollReveal>
                    <ScrollReveal delay={100}>
                        <div className="oc-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                            {PARTNER_BRANDS.map((brand, i) => (
                                <div key={i} className="oc-feature-card" style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    padding: '12px 14px', borderRadius: 12,
                                    border: `1px solid ${borderS}`, background: cardBg,
                                    borderLeft: `3px solid ${brand.color}`,
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: `${brand.color}15`, border: `1px solid ${brand.color}25`, flexShrink: 0,
                                    }}>
                                        {brand.logo ? (
                                            <img src={brand.logo} alt="" style={{ height: 20, width: 20, objectFit: 'contain', filter: isDark ? 'brightness(1.8) contrast(0.9)' : 'none' }} />
                                        ) : (
                                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: brand.color }}>{brand.name.charAt(0)}</span>
                                        )}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: isDark ? `${brand.color}dd` : brand.color, lineHeight: 1.2 }}>{brand.name}</div>
                                        <div style={{ fontSize: '0.65rem', color: textMut, lineHeight: 1.2, marginTop: 2 }}>{brand.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollReveal>
                </section>
            </main>

            {/* ═══ FOOTER ═══ */}
            <footer style={{
                position: 'relative', zIndex: 1,
                borderTop: `1px solid ${borderS}`,
                padding: '40px 0', background: isDark ? 'rgba(5,8,16,0.95)' : C.light.bgElevated,
            }}>
                <div style={{ maxWidth: 860, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <LogoFull className="scale-90 origin-left" />
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '0.75rem', color: textMut }}>{t('auth.landing.footer.copyright', '© 2026 Thép Việt Steel (TVS). All rights reserved.')}</p>
                        <p style={{ fontSize: '0.65rem', color: isDark ? C.textMuted : C.light.textMuted, marginTop: 4 }}>{t('auth.footer_powered')}</p>
                    </div>
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                        className="cursor-pointer"
                        style={{ color: textMut, padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', transition: 'all 0.3s' }}
                        aria-label="Scroll to top">
                        <svg style={{ width: 20, height: 20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                        </svg>
                    </button>
                </div>
            </footer>

            {/* ═══ LOGIN MODAL ═══ */}
            {showLoginModal && (
                <div className={`fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md ${isDark ? 'bg-black/70' : 'bg-black/30'}`}
                    role="dialog" aria-modal="true" aria-label={t('auth.login.title')}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowLoginModal(false); }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') { setShowLoginModal(false); return; }
                        if (e.key !== 'Tab') return;
                        const focusable = e.currentTarget.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
                        if (!focusable.length) return;
                        const first = focusable[0], last = focusable[focusable.length - 1];
                        if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
                        else { if (document.activeElement === last) { e.preventDefault(); first.focus(); } }
                    }}>
                    <div className="relative w-full max-w-[420px]" style={{
                        borderRadius: 20, animation: 'modalEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                        boxShadow: isDark
                            ? `0 0 0 1px rgba(255,77,77,0.1), 0 8px 48px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)`
                            : '0 0 0 1px rgba(0,0,0,0.06), 0 8px 48px rgba(0,0,0,0.12)',
                    }}>
                        <div style={{ position: 'absolute', inset: 0, borderRadius: 20,
                            background: isDark ? 'rgba(8,10,20,0.92)' : 'rgba(255,255,255,0.97)',
                            backdropFilter: 'blur(28px) saturate(1.3)', WebkitBackdropFilter: 'blur(28px) saturate(1.3)', zIndex: 0 }} />
                        {isDark && <AnimatedBorder />}

                        <button onClick={() => setShowLoginModal(false)} aria-label={t('common.close', 'Close')}
                            className={`absolute top-4 right-4 z-10 p-1.5 rounded-lg transition-all cursor-pointer ${isDark ? 'text-white/60 hover:text-white/70 hover:bg-white/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="relative z-[5] px-8 py-8">
                            <div className="mb-6"><LogoFull /></div>

                            {isAuthenticated ? authenticatedContent(() => navigate('/')) : modalAuthView === 'register' ? (
                                <RegisterView t={t} setAuthView={setModalAuthView} isDark={isDark} />
                            ) : modalAuthView === 'forgot-password' ? (
                                <ForgotPasswordView t={t} setAuthView={setModalAuthView} isDark={isDark} />
                            ) : loginFormContent('modal', setModalAuthView)}

                            <div className={`mt-6 pt-4 border-t text-center text-xs ${isDark ? 'border-white/6 text-white/40' : 'border-gray-200 text-gray-400'}`}>
                                <p>{t('auth.footer_rights')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ VIDEO LIGHTBOX ═══ */}
            {showVideoLightbox && (
                <div className="fixed inset-0 flex items-center justify-center p-4 md:p-8"
                    role="dialog" aria-modal="true" aria-label="Video Player"
                    onClick={(e) => { if (e.target === e.currentTarget) setShowVideoLightbox(false); }}
                    style={{ zIndex: 9999, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)' }}>
                    <div className="relative w-full max-w-5xl" style={{ animation: 'lightboxOpen 0.4s cubic-bezier(0.16,1,0.3,1) forwards' }}>
                        <button onClick={() => setShowVideoLightbox(false)} aria-label={t('common.close', 'Close')}
                            className="absolute -top-14 right-0 z-10 flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all duration-300 hover:scale-110 hover:bg-white/20"
                            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
                            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="relative rounded-2xl overflow-hidden" style={{ boxShadow: `0 0 60px ${C.coralGlow}, 0 8px 32px rgba(0,0,0,0.5)`, border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                                <iframe src="https://www.youtube.com/embed/HOXAk4XuKqg?autoplay=1&rel=0&modestbranding=1"
                                    title="DAU AN 2025 - STEEL ERP [4K]"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                    referrerPolicy="no-referrer-when-downgrade" allowFullScreen
                                    className="absolute inset-0 w-full h-full" style={{ border: 'none' }} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between px-1">
                            <div>
                                <h3 className="text-white text-lg font-bold">{t('auth.landing.video_tagline', 'Dấu Ấn 2025')} \u2014 STEEL ERP</h3>
                                <p className="text-white/60 text-sm mt-0.5">{t('auth.landing.video_subtitle', 'Hệ thống quản lý sản xuất thép cuộn hàng đầu')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ SCOPED STYLES ═══ */}
            <style>{`
                .oc-gradient-text {
                    background: linear-gradient(135deg, ${C.coral}, #ff6b35, ${C.cyan});
                    background-size: 200% 200%;
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    animation: oc-gradient-shift 4s ease infinite;
                }
                @keyframes oc-gradient-shift {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                @keyframes oc-nebula-drift {
                    0% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(2%, -1%) scale(1.05); }
                    100% { transform: translate(-1%, 2%) scale(1); }
                }
                /* Feature card — gradient border on hover */
                .oc-feature-card {
                    position: relative;
                    overflow: hidden;
                }
                .oc-feature-card::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 1px;
                    background: conic-gradient(from var(--ba, 0deg), transparent 0deg, ${C.coral} 90deg, ${C.cyan} 180deg, transparent 270deg);
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    opacity: 0;
                    transition: opacity 0.4s ease;
                    pointer-events: none;
                }
                .oc-feature-card:hover::before {
                    opacity: 1;
                }
                .oc-feature-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 40px rgba(255, 77, 77, 0.12);
                    border-color: transparent !important;
                }

                /* Integration pill hover */
                .oc-integration-pill {
                    position: relative;
                    overflow: hidden;
                }
                .oc-integration-pill::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    padding: 1px;
                    background: linear-gradient(135deg, ${C.coral}, ${C.cyan});
                    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
                    -webkit-mask-composite: xor;
                    mask-composite: exclude;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    pointer-events: none;
                }
                .oc-integration-pill:hover::before {
                    opacity: 1;
                }
                .oc-integration-pill:hover {
                    transform: translateY(-4px);
                    border-color: transparent !important;
                    box-shadow: 0 8px 24px rgba(255, 77, 77, 0.12);
                }

                /* Cursor blink */
                .oc-cursor-blink {
                    animation: oc-blink 1s step-end infinite;
                }
                @keyframes oc-blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }

                /* Responsive grids */
                @media (max-width: 768px) {
                    #features > div:last-child {
                        grid-template-columns: repeat(2, 1fr) !important;
                    }
                    .oc-grid-4 { grid-template-columns: repeat(2, 1fr) !important; }
                    .oc-grid-2 { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </div>
    );
};

export default Login;
