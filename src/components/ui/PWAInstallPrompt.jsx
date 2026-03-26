import { useState, useEffect } from 'react';
import { usePWAInstall, getDeviceInfo } from '../../hooks/usePWAInstall';
import { useTranslation } from '../../hooks/useTranslation';
import { Download, X, Share, Plus, Menu, MoreHorizontal, Monitor } from 'lucide-react';

const DISMISS_KEY = 'pwa_install_dismissed_v2';
const DISMISS_DAYS = 1;

/**
 * Get browser-specific install guide type
 */
function getBrowserGuide(deviceInfo) {
    if (deviceInfo.isIOS) return 'ios';
    // Edge UA also contains "Chrome", so check Edge first
    if (/Edg\//.test(navigator.userAgent)) return 'edge';
    if (deviceInfo.isChrome) return 'chrome';
    if (deviceInfo.isFirefox) return 'firefox';
    return 'generic';
}

export default function PWAInstallPrompt() {
    const { canInstall, isInstalled, install } = usePWAInstall();
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const deviceInfo = getDeviceInfo();
    const browserGuide = getBrowserGuide(deviceInfo);

    useEffect(() => {
        if (isInstalled) return;

        const dismissed = localStorage.getItem(DISMISS_KEY);
        if (dismissed) {
            const dismissedAt = parseInt(dismissed, 10);
            const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
            if (daysSince < DISMISS_DAYS) return;
        }

        const timer = setTimeout(() => setVisible(true), 1000);
        return () => clearTimeout(timer);
    }, [isInstalled]);

    const handleDismiss = () => {
        setVisible(false);
        localStorage.setItem(DISMISS_KEY, Date.now().toString());
    };

    const handleInstall = async () => {
        // Native install available (Chrome/Edge/Samsung - beforeinstallprompt fired)
        if (canInstall) {
            const accepted = await install();
            if (accepted) setVisible(false);
            return;
        }
        // Fallback: check global prompt (may have been captured by another component)
        if (window.__pwaInstallPrompt) {
            try {
                window.__pwaInstallPrompt.prompt();
                const { outcome } = await window.__pwaInstallPrompt.userChoice;
                if (outcome === 'accepted') {
                    window.__pwaInstallPrompt = null;
                    setVisible(false);
                    return;
                }
            } catch { /* prompt already used */ }
        }
        // No native prompt - show browser-specific instructions
        setShowGuide(true);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm animate-in slide-in-from-bottom-5 duration-300" role="dialog" aria-label="Install application">
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-primary/10 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                            <Download className="w-4 h-4 text-primary" />
                        </div>
                        <span className="font-semibold text-sm text-foreground">
                            {t('pwa.install_title')}
                        </span>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Dismiss install prompt"
                    >
                        <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-4 py-3">
                    <p className="text-sm text-muted-foreground mb-3">
                        {t('pwa.install_desc')}
                    </p>

                    {/* Browser-specific install guide */}
                    {showGuide && (
                        <div className="space-y-2 mb-3 p-2.5 bg-muted/30 rounded-lg border border-border/50">
                            {browserGuide === 'ios' && (
                                <>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Share className="w-3 h-3 text-primary" />
                                        </div>
                                        <span>{t('pwa.ios_step1')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Plus className="w-3 h-3 text-primary" />
                                        </div>
                                        <span>{t('pwa.ios_step2')}</span>
                                    </div>
                                </>
                            )}
                            {browserGuide === 'chrome' && (
                                <>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Menu className="w-3 h-3 text-primary" />
                                        </div>
                                        <span>{t('pwa.chrome_step1')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Download className="w-3 h-3 text-primary" />
                                        </div>
                                        <span>{t('pwa.chrome_step2')}</span>
                                    </div>
                                </>
                            )}
                            {browserGuide === 'edge' && (
                                <>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <MoreHorizontal className="w-3 h-3 text-primary" />
                                        </div>
                                        <span>{t('pwa.edge_step1')}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-foreground">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                            <Download className="w-3 h-3 text-primary" />
                                        </div>
                                        <span>{t('pwa.edge_step2')}</span>
                                    </div>
                                </>
                            )}
                            {(browserGuide === 'firefox' || browserGuide === 'generic') && (
                                <div className="flex items-center gap-2 text-sm text-foreground">
                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <Monitor className="w-3 h-3 text-primary" />
                                    </div>
                                    <span>{t('pwa.generic_step')}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleInstall}
                            className="flex-1 py-2.5 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            {t('pwa.install_button')}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="py-2.5 px-4 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                        >
                            {t('pwa.later')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
