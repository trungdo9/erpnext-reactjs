import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTranslation } from '../hooks/useTranslation';

// The language store defaults to 'en' in test environment (no localStorage).
// We test against English translations which are loaded by default.

// No wrapper needed -- useBackendTranslation is globally mocked in test setup.
const wrapper = ({ children }) => <>{children}</>;

describe('useTranslation', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it('should return translation function', async () => {
        const { result } = renderHook(() => useTranslation(), { wrapper });

        expect(typeof result.current.t).toBe('function');
    });

    it('should translate known keys', async () => {
        const { result } = renderHook(() => useTranslation(), { wrapper });

        // Wait for English translations to load (async import)
        await waitFor(() => {
            expect(result.current.t('common.save')).toBe('Save');
        });
    });

    it('should return key if translation not found', async () => {
        const { result } = renderHook(() => useTranslation(), { wrapper });

        await waitFor(() => {
            // Non-existent keys return the key itself
            expect(result.current.t('nonexistent.key')).toBe('nonexistent.key');
        });
    });

    it('should handle parameterized translations', async () => {
        const { result } = renderHook(() => useTranslation(), { wrapper });

        await waitFor(() => {
            const translation = result.current.t('list.deleted_success', { count: 5 });
            expect(translation).toContain('5');
        });
    });

    it('should translate common UI labels', async () => {
        const { result } = renderHook(() => useTranslation(), { wrapper });

        await waitFor(() => {
            expect(result.current.t('common.loading')).toBe('Loading...');
        });
    });

    it('should translate status labels', async () => {
        const { result } = renderHook(() => useTranslation(), { wrapper });

        await waitFor(() => {
            expect(result.current.t('status.draft')).toBe('Draft');
        });
    });
});
