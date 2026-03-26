/**
 * NetworkStatusBar
 *
 * Displays network connectivity status and sync progress.
 * Shows at the top of the app when offline or syncing.
 *
 * States:
 * - Online: Hidden (no distraction)
 * - Syncing: Yellow bar with progress
 * - Offline: Red bar with message
 * - Sync Error: Orange bar with retry button
 */

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Check } from 'lucide-react';
import { useNetworkStore } from '../../stores';
import { useTranslation } from '../../hooks/useTranslation';

const NetworkStatusBar = () => {
    const { t } = useTranslation();
    const isOnline = useNetworkStore((s) => s.isOnline);
    const isSyncing = useNetworkStore((s) => s.isSyncing);
    const pendingSyncCount = useNetworkStore((s) => s.pendingSyncCount);
    const syncProgress = useNetworkStore((s) => s.syncProgress);
    const syncErrors = useNetworkStore((s) => s.syncErrors);
    const forceSync = useNetworkStore((s) => s.forceSync);

    const [visible, setVisible] = useState(false);
    const [justSynced, setJustSynced] = useState(false);

    // Show bar when offline, syncing, or has pending items
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        if (!isOnline || isSyncing || pendingSyncCount > 0 || syncErrors.length > 0) {
            setVisible(true);
            setJustSynced(false);
        } else if (visible) {
            // Show success briefly then hide
            setJustSynced(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setJustSynced(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, isSyncing, pendingSyncCount, syncErrors.length, visible]);
    /* eslint-enable react-hooks/set-state-in-effect */

    if (!visible) return null;

    // Determine state
    let bgColor, icon, message;

    if (!isOnline) {
        bgColor = 'bg-red-600';
        icon = <WifiOff className="w-4 h-4" />;
        message = t('network.offline') || 'Offline - Dữ liệu sẽ đồng bộ khi có mạng';
    } else if (isSyncing) {
        bgColor = 'bg-emerald-600';
        icon = <RefreshCw className="w-4 h-4 animate-spin" />;
        message = `${t('network.syncing') || 'Đang đồng bộ'} (${syncProgress.current}/${syncProgress.total})`;
    } else if (syncErrors.length > 0) {
        bgColor = 'bg-green-600';
        icon = <AlertTriangle className="w-4 h-4" />;
        message = `${syncErrors.length} ${t('network.sync_errors') || 'lỗi đồng bộ'}`;
    } else if (pendingSyncCount > 0) {
        bgColor = 'bg-emerald-600';
        icon = <RefreshCw className="w-4 h-4" />;
        message = `${pendingSyncCount} ${t('network.pending_sync') || 'đang chờ đồng bộ'}`;
    } else if (justSynced) {
        bgColor = 'bg-green-500';
        icon = <Check className="w-4 h-4" />;
        message = t('network.synced') || 'Đã đồng bộ xong';
    }

    return (
        <div
            className={`${bgColor} text-white text-sm py-1.5 px-4 flex items-center justify-between transition-colors duration-300`}
            role="status"
            aria-live="polite"
        >
            <div className="flex items-center gap-2">
                {icon}
                <span className="font-medium">{message}</span>
            </div>

            <div className="flex items-center gap-2">
                {/* Pending count badge */}
                {pendingSyncCount > 0 && isOnline && !isSyncing && (
                    <button
                        onClick={forceSync}
                        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 text-xs font-medium transition-colors"
                        aria-label={t('network.force_sync') || 'Đồng bộ ngay'}
                    >
                        <RefreshCw className="w-3 h-3" />
                        {t('network.sync_now') || 'Sync'}
                    </button>
                )}

                {/* Retry button for errors */}
                {syncErrors.length > 0 && (
                    <button
                        onClick={forceSync}
                        className="flex items-center gap-1 bg-white/20 hover:bg-white/30 rounded px-2 py-0.5 text-xs font-medium transition-colors"
                        aria-label={t('network.retry') || 'Thử lại'}
                    >
                        <RefreshCw className="w-3 h-3" />
                        {t('network.retry') || 'Thử lại'}
                    </button>
                )}

                {/* Online indicator */}
                {isOnline && !isSyncing && pendingSyncCount === 0 && !justSynced && (
                    <Wifi className="w-4 h-4 opacity-70" />
                )}
            </div>

            {/* Sync progress bar */}
            {isSyncing && syncProgress.total > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                    <div
                        className="h-full bg-white/60 transition-[width] duration-300"
                        style={{ width: `${syncProgress.percentage}%` }}
                    />
                </div>
            )}
        </div>
    );
};

export default NetworkStatusBar;
