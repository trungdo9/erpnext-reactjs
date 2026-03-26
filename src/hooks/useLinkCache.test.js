import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock LinkCacheService
const mockGetOptions = vi.fn();
const mockIsCached = vi.fn();
const mockSubscribe = vi.fn();
const mockInvalidate = vi.fn();
const mockFilterOptions = vi.fn();

vi.mock('../services/LinkCacheService', () => ({
    LinkCacheService: {
        getOptions: (...args) => mockGetOptions(...args),
        isCached: (...args) => mockIsCached(...args),
        subscribe: (...args) => mockSubscribe(...args),
        invalidate: (...args) => mockInvalidate(...args),
        filterOptions: (...args) => mockFilterOptions(...args),
    }
}));

import { useLinkCache } from '../hooks/useLinkCache';

describe('useLinkCache', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockIsCached.mockReturnValue(false);
        mockSubscribe.mockReturnValue(() => {}); // Return unsubscribe function
        mockFilterOptions.mockReturnValue([]);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should initialize with empty state', () => {
        const { result } = renderHook(() => useLinkCache('User'));

        expect(result.current.options).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isCached).toBe(false);
    });

    it('should fetch options when fetchOptions is called', async () => {
        const mockData = [
            { value: 'user1', description: 'User 1' },
            { value: 'user2', description: 'User 2' },
        ];
        mockGetOptions.mockResolvedValue(mockData);

        const { result } = renderHook(() => useLinkCache('User'));

        await act(async () => {
            await result.current.fetchOptions();
        });

        expect(mockGetOptions).toHaveBeenCalledWith('User', false);
        expect(result.current.options).toEqual(mockData);
    });

    it('should use cached data on subsequent calls', async () => {
        const mockData = [{ value: 'user1' }];
        mockGetOptions.mockResolvedValue(mockData);

        const { result } = renderHook(() => useLinkCache('User'));

        // First fetch
        await act(async () => {
            await result.current.fetchOptions();
        });

        // Second fetch (should use cache via LinkCacheService)
        await act(async () => {
            await result.current.fetchOptions();
        });

        // Both calls go to LinkCacheService.getOptions which handles caching
        expect(mockGetOptions).toHaveBeenCalledTimes(2);
        // Both calls use forceRefresh=false
        expect(mockGetOptions).toHaveBeenCalledWith('User', false);
    });

    it('should force refresh when forceRefresh is true', async () => {
        const mockData = [{ value: 'user1' }];
        mockGetOptions.mockResolvedValue(mockData);

        const { result } = renderHook(() => useLinkCache('User'));

        // First fetch
        await act(async () => {
            await result.current.fetchOptions();
        });

        // Force refresh
        await act(async () => {
            await result.current.fetchOptions(true);
        });

        expect(mockGetOptions).toHaveBeenCalledTimes(2);
        // Second call should have forceRefresh=true
        expect(mockGetOptions).toHaveBeenLastCalledWith('User', true);
    });

    it('should filter options locally', async () => {
        const mockData = [
            { value: 'Apple' },
            { value: 'Banana' },
            { value: 'Cherry' },
        ];
        mockGetOptions.mockResolvedValue(mockData);
        mockFilterOptions.mockReturnValue([{ value: 'Banana' }]);

        const { result } = renderHook(() => useLinkCache('Fruit'));

        await act(async () => {
            await result.current.fetchOptions();
        });

        const filtered = result.current.filterOptions('ban');
        expect(filtered).toHaveLength(1);
        expect(filtered[0].value).toBe('Banana');
    });

    it('should invalidate cache when invalidate is called', async () => {
        const mockData = [{ value: 'user1' }];
        mockGetOptions.mockResolvedValue(mockData);

        const { result } = renderHook(() => useLinkCache('User'));

        await act(async () => {
            await result.current.fetchOptions();
        });

        act(() => {
            result.current.invalidate();
        });

        expect(mockInvalidate).toHaveBeenCalledWith('User');
        expect(result.current.options).toEqual([]);
    });

    it('should handle API errors gracefully', async () => {
        mockGetOptions.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useLinkCache('User'));

        await act(async () => {
            await result.current.fetchOptions();
        });

        expect(result.current.options).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBe('Network error');
    });
});
