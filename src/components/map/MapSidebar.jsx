/**
 * MapSidebar Component
 *
 * A collapsible right sidebar panel containing the map.
 * Can be toggled open/close from any page.
 */

import { useState, useEffect, createContext, useContext } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
import { OpenLayersMap } from './OpenLayersMap';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';

// Context for map sidebar state
const MapSidebarContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useMapSidebar = () => {
    const context = useContext(MapSidebarContext);
    if (!context) {
        throw new Error('useMapSidebar must be used within MapSidebarProvider');
    }
    return context;
};

export const MapSidebarProvider = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    const toggle = () => setIsOpen(prev => !prev);
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    const toggleMinimize = () => setIsMinimized(prev => !prev);

    return (
        <MapSidebarContext.Provider value={{
            isOpen,
            isMinimized,
            toggle,
            open,
            close,
            toggleMinimize
        }}>
            {children}
        </MapSidebarContext.Provider>
    );
};

/**
 * MapSidebar Panel Component
 */
export const MapSidebarPanel = () => {
    const { close } = useMapSidebar();
    const { t } = useTranslation();

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                close();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [close]);

    return (
        <div className="flex flex-col h-full w-full bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2">
                    <MapIcon className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-base">{t('map.title')}</span>
                </div>
                <button
                    onClick={close}
                    className="p-2 hover:bg-accent rounded-lg transition-colors"
                    title={t('map.close_map_esc')}
                >
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Map Container - full height */}
            <div className="flex-1 relative">
                <OpenLayersMap
                    className="absolute inset-0"
                    initialCenter={[106.645, 12.212]}
                    initialZoom={14}
                />
            </div>
        </div>
    );
};

/**
 * Toggle button for the header
 */
export const MapToggleButton = ({ className }) => {
    const { isOpen, toggle } = useMapSidebar();
    const { t } = useTranslation();

    return (
        <button
            onClick={toggle}
            className={cn(
                "p-2 rounded-lg transition-colors",
                isOpen
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent",
                className
            )}
            title={isOpen ? t('map.close_map') : t('map.open_map')}
        >
            <MapIcon className="h-5 w-5" />
        </button>
    );
};

export default MapSidebarPanel;
