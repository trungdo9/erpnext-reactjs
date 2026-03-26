/**
 * App Component
 *
 * Root component that handles:
 * - PWA install prompt
 * - Main app rendering
 */

import { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { AuthProvider } from './auth/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import Toaster from './components/ui/Toaster';

const App = () => {
    const [debugError, setDebugError] = useState(null);

    // Debug: catch global errors (ignore WebSocket errors - non-critical)
    useEffect(() => {
        const handleError = (e) => {
            if (e.message?.includes('WebSocket')) return;
            setDebugError(e.message || String(e));
        };
        const handleRejection = (e) => {
            const msg = e.reason?.message || String(e.reason);
            if (msg?.includes('WebSocket')) return;
            setDebugError(msg);
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    // Hide native splash screen when React mounts
    useEffect(() => {
        const timer = setTimeout(() => {
            const nativeSplash = document.getElementById('splash-screen');
            if (nativeSplash) {
                nativeSplash.classList.add('fade-out');
                setTimeout(() => {
                    nativeSplash.remove();
                }, 500);
            }
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    // Show debug error if any
    if (debugError) {
        return (
            <div className="fixed inset-0 bg-red-900 text-white p-8 overflow-auto">
                <h1 className="text-2xl font-bold mb-4">Debug Error:</h1>
                <pre className="whitespace-pre-wrap">{debugError}</pre>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <AuthProvider>
                <RouterProvider router={router} />
                <Toaster />
            </AuthProvider>
        </ErrorBoundary>
    );
};

export default App;
