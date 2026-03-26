import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock import.meta.env for tests
globalThis.import = {
    meta: {
        env: {
            DEV: true,
            PROD: false,
            VITE_FRAPPE_URL: 'http://localhost:8080',
        },
    },
};

// ---------------------------------------------------------------------------
// Global mock: useBackendTranslation
// ---------------------------------------------------------------------------
// useTranslation -> useBackendTranslation -> useQuery (requires QueryClientProvider)
// By mocking useBackendTranslation globally, we remove the need for
// QueryClientProvider in every test that happens to import useTranslation.
// ---------------------------------------------------------------------------
vi.mock('../hooks/useBackendTranslation', () => ({
    useBackendTranslation: () => ({
        translateLabel: (text) => text,
        isLoading: false,
    }),
    default: () => ({
        translateLabel: (text) => text,
        isLoading: false,
    }),
}));
