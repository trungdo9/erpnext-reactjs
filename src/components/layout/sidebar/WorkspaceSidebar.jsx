/**
 * WorkspaceSidebar - Steel Manufacturing ERP navigation
 * Driven by ERPNext Workspace backend — no hardcoded menu items.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Package, Scissors, LayoutGrid, Search, Warehouse, BarChart3,
    Moon, Sun, ChevronDown, LogOut, Key, Factory, Folder, FileText
} from 'lucide-react';
import { useWorkspaceSidebarWithState } from '../../../hooks/useDynamicSidebar';
import { useTranslation } from '../../../hooks/useTranslation';
import useLanguageStore from '../../../stores/useLanguageStore';
import SidebarSkeleton from './SidebarSkeleton';
import { cn } from '../../../lib/utils';
import { useAuth } from '../../../auth/useAuth';
import { resolveFrappeFileUrl } from '../../../utils/urlUtils';

// ─── Icon resolver ───────────────────────────────────────────

const ICON_MAP = {
    'stock-entry': Package,
    'cut': Scissors,
    'grid': LayoutGrid,
    'search': Search,
    'stock': Warehouse,
    'analytics': BarChart3,
    'factory': Factory,
    'branch': Search,
    'Folder': Folder,
    'file': FileText,
};

const resolveIcon = (iconName) => {
    if (!iconName) return Folder;
    if (ICON_MAP[iconName]) return ICON_MAP[iconName];
    if (iconName.includes('nhap-cuon')) return Package;
    if (iconName.includes('xa-bang')) return Scissors;
    if (iconName.includes('cat-tam')) return LayoutGrid;
    if (iconName.includes('theo-doi') || iconName.includes('batch')) return Search;
    if (iconName.includes('ton-kho')) return Warehouse;
    if (iconName.includes('bao-cao')) return BarChart3;
    return Folder;
};

// ─── Mobile User Menu ────────────────────────────────────────

const MobileUserMenu = ({ onNavigate }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, logout, fullName, email, avatar } = useAuth();
    const [isExpanded, setIsExpanded] = useState(false);

    const handleLogout = () => { logout(); navigate('/login'); onNavigate?.(); };
    const handleChangePassword = () => { navigate('/change-password'); onNavigate?.(); };

    const displayName = fullName || email || user || 'User';
    const resolvedAvatar = resolveFrappeFileUrl(avatar);
    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

    return (
        <div className="flex flex-col gap-1 mb-4">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={cn(
                    "flex items-center gap-3 p-2 rounded-xl border transition-colors duration-200 w-full text-left bg-muted/40 border-border/40 hover:bg-muted/60",
                    isExpanded && "bg-muted/60 border-border/60 ring-1 ring-border"
                )}
            >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold overflow-hidden shrink-0 ring-2 ring-background">
                    {resolvedAvatar ? <img src={resolvedAvatar} alt={displayName} className="w-full h-full object-cover" /> : getInitials(displayName)}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-foreground truncate">{displayName}</div>
                    <div className="text-xs text-muted-foreground truncate">{isExpanded ? 'Thu gọn' : 'Xem tùy chọn'}</div>
                </div>
                <ChevronDown size={16} className={cn("text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
            </button>
            <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-in-out overflow-hidden gap-1", isExpanded ? "grid-rows-[1fr] opacity-100 mt-1" : "grid-rows-[0fr] opacity-0")}>
                <div className="min-h-0 flex flex-col gap-1">
                    <button onClick={handleChangePassword} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted text-foreground/80 hover:text-foreground transition-colors ml-2 border-l-2 border-border/50 pl-4">
                        <Key className="w-4 h-4 text-muted-foreground" /><span className="text-sm">Đổi mật khẩu</span>
                    </button>
                    <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 text-red-600 dark:hover:bg-red-900/10 dark:text-red-400 transition-colors ml-2 border-l-2 border-border/50 pl-4">
                        <LogOut className="w-4 h-4" /><span className="text-sm">Đăng xuất</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─── Language & Settings ─────────────────────────────────────

const LANG_OPTIONS = [
    { code: 'vi', flag: '🇻🇳', name: 'Tiếng Việt' },
    { code: 'en', flag: '🇬🇧', name: 'English' },
];

const LanguageDropdown = ({ language, setLanguage }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const currentFlag = LANG_OPTIONS.find(l => l.code === language)?.flag || '🌐';

    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', handler);
        return () => document.removeEventListener('pointerdown', handler);
    }, [open]);

    return (
        <div className="relative" ref={ref}>
            <button onClick={() => setOpen(!open)} className="p-2.5 rounded-xl bg-background border border-border/50 text-sm transition-colors hover:border-primary/40" title="Language">{currentFlag}</button>
            {open && (
                <div className="absolute bottom-full left-0 mb-1 w-40 bg-popover/95 backdrop-blur-lg border border-border/60 rounded-xl shadow-2xl overflow-hidden z-50">
                    {LANG_OPTIONS.map(l => (
                        <button key={l.code} onClick={() => { setLanguage(l.code); setOpen(false); }}
                            className={cn("w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 transition-colors",
                                language === l.code ? "bg-primary/15 text-primary font-medium" : "hover:bg-muted/80 text-foreground/80")}>
                            <span>{l.flag}</span><span>{l.name}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

const MobileSettings = ({ onNavigate }) => {
    const { language, setLanguage } = useLanguageStore();
    const [theme, setTheme] = useState(() => localStorage.theme || 'dark');

    useEffect(() => {
        const root = document.documentElement;
        theme === 'dark' ? root.classList.add('dark') : root.classList.remove('dark');
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <div className="flex flex-col gap-3 px-1 pb-4">
            <MobileUserMenu onNavigate={onNavigate} />
            <div className="h-px bg-border/50 my-1" />
            <div className="px-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Cài đặt</div>
            <div className="flex items-center gap-2">
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2.5 rounded-xl bg-background border border-border/50 text-muted-foreground hover:text-foreground transition-colors">
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>
                <LanguageDropdown language={language} setLanguage={setLanguage} />
            </div>
        </div>
    );
};

// ─── Workspace Group (navigates to workspace page) ──────────

const WorkspaceGroup = ({ workspace, onNavigate, isMobile, isCollapsed }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const GroupIcon = resolveIcon(workspace.icon);

    const wsPath = `/app/workspace/${encodeURIComponent(workspace.name)}`;
    const isActive = location.pathname === wsPath;

    const handleClick = () => {
        navigate(wsPath);
        onNavigate?.();
    };

    return (
        <button
            onClick={handleClick}
            title={isCollapsed ? workspace.label : undefined}
            className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors duration-200 group mb-1",
                isCollapsed && "justify-center px-0",
                isActive
                    ? "bg-gradient-to-r from-primary/10 to-transparent text-primary"
                    : "text-foreground/70 hover:text-foreground hover:bg-muted/40"
            )}
        >
            <div className={cn(
                "flex items-center justify-center rounded-lg transition-all duration-200 w-7 h-7",
                isActive ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-transparent text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
            )}>
                <GroupIcon className="w-4 h-4 flex-shrink-0" />
            </div>
            {!isCollapsed && <span className="flex-1 text-left text-sm font-medium">{workspace.label}</span>}
        </button>
    );
};

// ─── Dashboard Item (always visible) ─────────────────────────

const DashboardItem = ({ onNavigate, isMobile, isCollapsed }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isActive = location.pathname === '/' || location.pathname === '/dashboard';

    return (
        <button
            onClick={() => { navigate('/dashboard'); onNavigate?.(); }}
            title={isCollapsed ? 'Tổng quan' : undefined}
            className={cn(
                "w-full flex items-center gap-3 rounded-xl transition-all duration-200 border border-transparent group mb-2",
                isMobile ? "py-3 text-[15px] px-3.5" : "py-2.5 text-sm px-3.5",
                isCollapsed && "justify-center px-0",
                isActive
                    ? "bg-gradient-to-r from-primary/10 to-transparent border-primary/10 text-primary"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
            )}
        >
            <div className={cn(
                "flex items-center justify-center rounded-lg transition-all duration-200 w-8 h-8",
                isActive ? "bg-primary text-primary-foreground ring-2 ring-primary/30" : "bg-transparent text-muted-foreground group-hover:text-primary group-hover:bg-primary/10"
            )}>
                <LayoutDashboard className="h-4 w-4" />
            </div>
            {!isCollapsed && <span className="font-medium">Tổng quan</span>}
        </button>
    );
};

// ─── Main Component ──────────────────────────────────────────

const WorkspaceSidebar = ({ onNavigate, isMobile, isCollapsed }) => {
    const { workspaces, isLoading, apiSuccess } = useWorkspaceSidebarWithState();

    if (isLoading && workspaces.length === 0) {
        return <SidebarSkeleton />;
    }

    return (
        <nav aria-label="Workspace navigation" className="space-y-0.5">
            {/* Dashboard — always first */}
            <DashboardItem onNavigate={onNavigate} isMobile={isMobile} isCollapsed={isCollapsed} />

            {/* Workspaces from backend */}
            {workspaces.map(ws => (
                <WorkspaceGroup key={ws.name} workspace={ws} onNavigate={onNavigate} isMobile={isMobile} isCollapsed={isCollapsed} />
            ))}

            {/* Mobile settings */}
            {isMobile && <div className="mt-6 pt-4 border-t border-border/50"><MobileSettings onNavigate={onNavigate} /></div>}
        </nav>
    );
};

export default React.memo(WorkspaceSidebar);
