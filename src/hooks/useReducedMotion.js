import { useState, useEffect } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Returns true when the user has enabled "Reduce motion" in their OS settings.
 * Listens for live changes so the UI updates immediately if the preference toggles.
 */
export function useReducedMotion() {
    const [prefersReduced, setPrefersReduced] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(QUERY).matches;
    });

    useEffect(() => {
        const mql = window.matchMedia(QUERY);
        const handler = (e) => setPrefersReduced(e.matches);
        mql.addEventListener('change', handler);
        return () => mql.removeEventListener('change', handler);
    }, []);

    return prefersReduced;
}

export default useReducedMotion;
