/**
 * usePWAInstall Hook
 *
 * Manages PWA installation prompt and state.
 * Intercepts the browser's beforeinstallprompt event.
 */

import { useState, useEffect, useCallback } from 'react';

/**
 * Check if the app is running as installed PWA
 */
export const isInstalledPWA = () => {
    // Check display-mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
        return true;
    }
    // iOS Safari
    if (window.navigator.standalone === true) {
        return true;
    }
    // Check if launched from home screen (Android)
    if (document.referrer.includes('android-app://')) {
        return true;
    }
    return false;
};

/**
 * Get the user's device/browser info for install instructions
 */
export const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /Android/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
    const isChrome = /Chrome/.test(ua);
    const isFirefox = /Firefox/.test(ua);
    const isSamsung = /SamsungBrowser/.test(ua);

    return {
        isIOS,
        isAndroid,
        isSafari,
        isChrome,
        isFirefox,
        isSamsung,
        isMobile: isIOS || isAndroid,
        canInstall: !isIOS || isSafari, // iOS only supports Safari PWA
    };
};

/**
 * Hook to manage PWA installation
 *
 * @returns {{
 *   canInstall: boolean,
 *   isInstalled: boolean,
 *   isInstalling: boolean,
 *   install: () => Promise<boolean>,
 *   deviceInfo: Object
 * }}
 */
export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);
    const [canInstall, setCanInstall] = useState(false);

    const deviceInfo = getDeviceInfo();

    // Check if already installed on mount
    useEffect(() => {
        setIsInstalled(isInstalledPWA());

        // Listen for app installed event
        const handleAppInstalled = () => {
            console.log('[PWA] App installed successfully');
            setIsInstalled(true);
            setDeferredPrompt(null);
            setCanInstall(false);
        };

        window.addEventListener('appinstalled', handleAppInstalled);
        return () => window.removeEventListener('appinstalled', handleAppInstalled);
    }, []);

    // Intercept beforeinstallprompt event (also check early-captured event)
    useEffect(() => {
        // Check if event was captured early in index.html before React loaded
        if (window.__pwaInstallPrompt) {
            console.log('[PWA] Using early-captured install prompt');
            setDeferredPrompt(window.__pwaInstallPrompt);
            setCanInstall(true);
        }

        const handleBeforeInstallPrompt = (e) => {
            // Prevent Chrome 67+ from automatically showing the prompt
            e.preventDefault();
            console.log('[PWA] Install prompt available');
            setDeferredPrompt(e);
            setCanInstall(true);
            window.__pwaInstallPrompt = e;
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    /**
     * Trigger the install prompt
     * @returns {Promise<boolean>} Whether installation was accepted
     */
    const install = useCallback(async () => {
        if (!deferredPrompt) {
            console.log('[PWA] No install prompt available');
            return false;
        }

        setIsInstalling(true);

        try {
            // Show the install prompt
            deferredPrompt.prompt();

            // Wait for the user's response
            const { outcome } = await deferredPrompt.userChoice;
            console.log('[PWA] User choice:', outcome);

            if (outcome === 'accepted') {
                setDeferredPrompt(null);
                setCanInstall(false);
                return true;
            }
            return false;
        } catch (error) {
            console.error('[PWA] Install error:', error);
            return false;
        } finally {
            setIsInstalling(false);
        }
    }, [deferredPrompt]);

    return {
        canInstall: canInstall && !isInstalled,
        isInstalled,
        isInstalling,
        install,
        deviceInfo,
        // For iOS, we can't trigger install but can show instructions
        showIOSInstructions: deviceInfo.isIOS && !isInstalled,
    };
}

export default usePWAInstall;
