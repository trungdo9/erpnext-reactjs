import { useNavigate } from 'react-router-dom';
import useSidebarStore from '../../stores/useSidebarStore';
import WorkspaceSidebar from './sidebar/WorkspaceSidebar';
import Logo from '../ui/Logo';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SIDEBAR, Z_INDEX } from '../../config/layout';

const Sidebar = () => {
    const navigate = useNavigate();
    const { isOpen, isMobile, close, isCollapsed, toggleCollapse } = useSidebarStore();
    // Handle navigation: close mobile sidebar
    const handleNavigate = () => {
        if (isMobile) close();
    };

    // Don't render if closed on mobile
    if (!isOpen && isMobile) {
        return null;
    }

    return (
        <>
            {/* Mobile Overlay — blurred backdrop */}
            {isMobile && isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
                    style={{ zIndex: Z_INDEX.sidebarOverlay }}
                    onClick={close}
                    role="button"
                    aria-label="Close sidebar overlay"
                    tabIndex={-1}
                />
            )}

            {/* Sidebar */}
            <aside aria-label="Navigation" className={`
                h-screen fixed left-0 top-0 flex flex-col
                transition-[transform,width] duration-300 ease-out
                border-r border-border/60
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `} style={{
                zIndex: Z_INDEX.sidebar,
                width: isMobile ? SIDEBAR.mobileWidth : (isCollapsed ? SIDEBAR.collapsedWidth : SIDEBAR.desktopWidth),
                background: 'var(--gradient-sidebar)',
            }}>

                {/* Logo area */}
                <div className={`flex items-center justify-between border-b border-border/50 ${isMobile ? 'h-14 px-4' : 'h-14 px-3'}`}>
                    <div
                        className={`flex items-center cursor-pointer hover:opacity-70 transition-opacity duration-200 ${isCollapsed && !isMobile ? 'justify-center w-full' : ''}`}
                        onClick={() => { navigate('/dashboard'); handleNavigate(); }}
                    >
                        <Logo size={isCollapsed && !isMobile ? "sm" : "md"} variant="default" showText={!isCollapsed || isMobile} />
                    </div>

                    {/* Close button - mobile only, bigger tap target */}
                    {isMobile && (
                        <button
                            onClick={close}
                            aria-label="Close menu"
                            className="p-2 -mr-1 rounded-xl hover:bg-foreground/10 active:bg-foreground/15 transition-colors duration-150"
                        >
                            <X className="w-5 h-5 text-foreground/60" aria-hidden="true" />
                        </button>
                    )}
                </div>

                {/* Menu — bigger padding on mobile for better touch */}
                <div className={`flex-1 overflow-y-auto overflow-x-hidden ${isMobile ? 'py-4 px-3' : 'py-3 px-2'} scrollbar-hide`}>
                    <WorkspaceSidebar onNavigate={handleNavigate} isMobile={isMobile} isCollapsed={isCollapsed && !isMobile} />
                </div>

                {/* Sidebar Toggle Button (Desktop Only) */}
                {!isMobile && (
                    <div className="p-3 border-t border-border/50">
                        <button
                            onClick={toggleCollapse}
                            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors duration-200"
                            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        >
                            {isCollapsed ? (
                                <ChevronRight className="w-5 h-5" aria-hidden="true" />
                            ) : (
                                <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                )}

            </aside>
        </>
    );
};

export default Sidebar;
