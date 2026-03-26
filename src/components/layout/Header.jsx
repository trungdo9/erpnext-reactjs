import { useLocation, useNavigate, Link } from 'react-router-dom';
import Logo from '../ui/Logo';
import { useTranslation } from '../../hooks/useTranslation';
import useSidebarStore from '../../stores/useSidebarStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import Button from '../ui/Button';
import { Bell, Menu, Download, ChevronRight } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
import LanguageSelector from '../ui/LanguageSelector';
import UserProfile from './UserProfile';
import { useMemo } from 'react';
import { PAGE_WORKSPACE_MAP } from '../../config/doctype.behaviors';
import { useDoctypeWorkspaceMap } from '../../hooks/useDynamicSidebar';

/**
 * Build breadcrumb segments from current pathname.
 * Rule: Workspace > Doctype > Form/Record
 *
 * Workspace parent is resolved from:
 * 1. location.state.workspace (set by SidebarItem on navigate)
 * 2. PAGE_WORKSPACE_MAP config (for custom pages like /app/mon-an)
 * 3. useDoctypeWorkspaceMap (preloaded reverse map from ERPNext metadata)
 */
function useBreadcrumbs() {
    const location = useLocation();
    const { t, getDoctypeLabel, getWidgetLabel } = useTranslation();
    const doctypeMap = useDoctypeWorkspaceMap();

    const stateWorkspace = location.state?.workspace || null;

    return useMemo(() => {
        const path = location.pathname;
        const crumbs = [];

        // --- Extract doctype from path for workspace lookup ---
        let doctype = null;
        if (path.startsWith('/app/doctype/')) {
            doctype = decodeURIComponent(path.split('/')[3] || '');
        } else if (path.startsWith('/form/')) {
            doctype = decodeURIComponent(path.split('/')[2] || '');
        } else if (path.match(/^\/app\/[^/]+\/tree$/)) {
            doctype = decodeURIComponent(path.split('/')[2]);
        } else if (path.startsWith('/list/')) {
            doctype = decodeURIComponent(path.split('/')[2] || '');
        }

        // --- Resolve workspace: state > config > preloaded doctype map ---
        const pageConfig = PAGE_WORKSPACE_MAP[path];
        let wsName = stateWorkspace || pageConfig?.workspace || null;

        if (!wsName && doctype && doctypeMap[doctype]) {
            wsName = doctypeMap[doctype].name;
        }

        // Dashboard / Home
        if (path === '/' || path === '/dashboard') {
            crumbs.push({ label: t('dashboard.title') });
            return crumbs;
        }

        // Workspace page itself
        if (path.startsWith('/app/workspace/')) {
            const name = decodeURIComponent(path.split('/')[3] || '');
            crumbs.push({ label: getWidgetLabel(name) });
            return crumbs;
        }

        // --- Add workspace as parent crumb ---
        if (wsName) {
            crumbs.push({
                label: getWidgetLabel(wsName),
                path: `/app/workspace/${encodeURIComponent(wsName)}`,
            });
        }

        // --- Custom pages (from PAGE_WORKSPACE_MAP) ---
        if (pageConfig) {
            crumbs.push({ label: t(pageConfig.label) });
            return crumbs;
        }

        // --- /app/doctype/:doctype ---
        if (path.startsWith('/app/doctype/')) {
            crumbs.push({ label: getDoctypeLabel(doctype) });
            return crumbs;
        }

        // --- /app/:doctype/tree ---
        if (path.match(/^\/app\/[^/]+\/tree$/)) {
            crumbs.push({
                label: getDoctypeLabel(doctype),
                path: `/app/doctype/${encodeURIComponent(doctype)}`,
            });
            crumbs.push({ label: 'Tree' });
            return crumbs;
        }

        // --- /app/report/:name or /app/query-report/:name ---
        if (path.startsWith('/app/report/') || path.startsWith('/app/query-report/')) {
            const reportName = decodeURIComponent(path.split('/').pop() || '');
            crumbs.push({ label: reportName.replace(/-/g, ' ') });
            return crumbs;
        }

        // --- /form/:doctype/bulk ---
        if (path.match(/^\/form\/[^/]+\/bulk$/)) {
            crumbs.push({
                label: getDoctypeLabel(doctype),
                path: `/app/doctype/${encodeURIComponent(doctype)}`,
            });
            crumbs.push({ label: t('common.bulkCreate') });
            return crumbs;
        }

        // --- /form/:doctype/:name? ---
        if (path.startsWith('/form/')) {
            const name = decodeURIComponent(path.split('/')[3] || '');
            crumbs.push({
                label: getDoctypeLabel(doctype),
                path: `/app/doctype/${encodeURIComponent(doctype)}`,
            });
            crumbs.push({ label: name || t('common.new') });
            return crumbs;
        }

        // --- /list/:doctype ---
        if (path.startsWith('/list/')) {
            crumbs.push({ label: getDoctypeLabel(doctype) });
            return crumbs;
        }

        // --- /app/:anything (fallback) ---
        if (path.startsWith('/app/')) {
            const segment = decodeURIComponent(path.split('/')[2] || '');
            crumbs.push({ label: getDoctypeLabel(segment) });
            return crumbs;
        }

        crumbs.push({ label: path });
        return crumbs;
    }, [location.pathname, stateWorkspace, t, getDoctypeLabel, getWidgetLabel, doctypeMap]);
}

const Header = () => {
    const navigate = useNavigate();
    const { isMobile, toggle, isOpen } = useSidebarStore();
    const { canInstall, install } = usePWAInstall();
    const crumbs = useBreadcrumbs();

    // Mobile View
    if (isMobile) {
        return (
            <header
                className="h-14 border-b border-border/60 sticky top-0 z-30 px-4 flex items-center justify-between transition-colors duration-200"
                style={{
                    background: 'var(--gradient-header)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                }}
            >
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggle}
                        className={`p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-[color,background-color,opacity,transform] duration-200 ${isOpen ? 'opacity-0 pointer-events-none scale-90' : 'opacity-100 scale-100'}`}
                        aria-label="Toggle Sidebar"
                    >
                        <Menu className="w-6 h-6" strokeWidth={2} />
                    </button>

                    <div
                        onClick={() => navigate('/dashboard')}
                        className="active:opacity-70 transition-opacity"
                    >
                        <Logo size="sm" />
                    </div>
                </div>
            </header>
        );
    }

    // Desktop View with Breadcrumb
    return (
        <header
            className="h-12 border-b border-border/60 sticky top-0 z-10 px-4 flex items-center justify-between"
            style={{
                background: 'var(--gradient-header)',
                backdropFilter: 'blur(var(--glass-blur))'
            }}
        >
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {/* Sidebar Toggle */}
                <button
                    onClick={toggle}
                    className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors duration-200 flex-shrink-0"
                    aria-label="Toggle Sidebar"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {/* Breadcrumb */}
                <nav className="flex items-center gap-1 min-w-0 text-sm" aria-label="Breadcrumb">
                    {crumbs.map((crumb, i) => {
                        const isLast = i === crumbs.length - 1;
                        return (
                            <div key={i} className="flex items-center gap-1 min-w-0">
                                {i > 0 && (
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                                )}
                                {isLast || !crumb.path ? (
                                    <span className={`truncate ${isLast ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                                        {crumb.label}
                                    </span>
                                ) : (
                                    <Link
                                        to={crumb.path}
                                        className="text-muted-foreground hover:text-foreground transition-colors truncate"
                                    >
                                        {crumb.label}
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
                {canInstall && (
                    <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={install}
                        className="text-muted-foreground hover:text-primary hover:bg-muted/50"
                        aria-label="Install app"
                    >
                        <Download className="h-4 w-4" aria-hidden="true" />
                    </Button>
                )}

                <div className="hidden sm:block">
                    <ThemeToggle />
                </div>

                <div className="hidden sm:block">
                    <LanguageSelector variant="ghost" />
                </div>

                <div className="hidden sm:block">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted/50 relative"
                        aria-label="Notifications"
                    >
                        <Bell className="h-4 w-4" aria-hidden="true" />
                        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-card"></span>
                    </Button>
                </div>

                <div className="h-5 w-px bg-border/60 mx-2 hidden sm:block" />

                <UserProfile />
            </div>
        </header>
    );
};

export default Header;
