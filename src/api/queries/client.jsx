/**
 * React Query Client — Component exports only
 *
 * Constants/helpers live in queryConfig.js
 * to satisfy react-refresh (only components in .jsx files).
 */

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './queryConfig';

/**
 * Query Provider component
 */
export function QueryProvider({ children }) {
    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

/**
 * DevTools component (only in development)
 */
export function QueryDevtools() {
    if (import.meta.env.PROD) {
        return null;
    }

    return (
        <ReactQueryDevtools
            initialIsOpen={false}
            position="bottom-right"
        />
    );
}
