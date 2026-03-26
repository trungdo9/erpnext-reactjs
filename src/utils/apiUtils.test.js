import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    debounce,
    throttle,
    requestCache,
    cachedRequest,
    retryRequest,
    requestDeduplicator,
    rateLimiter
} from './apiUtils';

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should delay function execution', async () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced();
        expect(fn).not.toHaveBeenCalled();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should only call once for rapid calls', async () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced();
        debounced();
        debounced();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should cancel pending call', () => {
        const fn = vi.fn();
        const debounced = debounce(fn, 100);

        debounced();
        debounced.cancel();

        vi.advanceTimersByTime(100);
        expect(fn).not.toHaveBeenCalled();
    });

    it('should flush immediately', () => {
        const fn = vi.fn().mockReturnValue('result');
        const debounced = debounce(fn, 100);

        debounced();
        const result = debounced.flush();

        expect(fn).toHaveBeenCalledTimes(1);
        expect(result).toBe('result');
    });
});

describe('throttle', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should execute immediately on first call', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled();
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should throttle subsequent calls', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled();
        throttled();
        throttled();

        expect(fn).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should cancel pending call', () => {
        const fn = vi.fn();
        const throttled = throttle(fn, 100);

        throttled();
        throttled();
        throttled.cancel();

        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledTimes(1);
    });
});

describe('RequestCache', () => {
    beforeEach(() => {
        requestCache.clear();
    });

    it('should store and retrieve data', () => {
        requestCache.set('key1', { data: 'test' });
        expect(requestCache.get('key1')).toEqual({ data: 'test' });
    });

    it('should return null for missing keys', () => {
        expect(requestCache.get('nonexistent')).toBeNull();
    });

    it('should expire data after TTL', () => {
        vi.useFakeTimers();
        requestCache.set('key1', { data: 'test' }, 1000);

        vi.advanceTimersByTime(1001);
        expect(requestCache.get('key1')).toBeNull();

        vi.useRealTimers();
    });

    it('should generate consistent cache keys', () => {
        const key1 = requestCache.generateKey('/api/test', { a: 1, b: 2 });
        const key2 = requestCache.generateKey('/api/test', { a: 1, b: 2 });
        expect(key1).toBe(key2);
    });
});

describe('cachedRequest', () => {
    beforeEach(() => {
        requestCache.clear();
    });

    it('should cache API response', async () => {
        const apiCall = vi.fn().mockResolvedValue({ data: 'test' });

        const result1 = await cachedRequest(apiCall, 'test-key');
        const result2 = await cachedRequest(apiCall, 'test-key');

        expect(apiCall).toHaveBeenCalledTimes(1);
        expect(result1).toEqual({ data: 'test' });
        expect(result2).toEqual({ data: 'test' });
    });
});

describe('retryRequest', () => {
    it('should succeed on first try', async () => {
        const apiCall = vi.fn().mockResolvedValue('success');

        const result = await retryRequest(apiCall, { maxRetries: 3, delay: 10 });

        expect(result).toBe('success');
        expect(apiCall).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
        const apiCall = vi.fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce('success');

        const result = await retryRequest(apiCall, { maxRetries: 3, delay: 10, backoff: 1 });

        expect(result).toBe('success');
        expect(apiCall).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries', async () => {
        const apiCall = vi.fn().mockRejectedValue(new Error('always fails'));

        await expect(
            retryRequest(apiCall, { maxRetries: 2, delay: 10, backoff: 1 })
        ).rejects.toThrow('always fails');

        expect(apiCall).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
        const error = { httpStatus: 400, message: 'Bad request' };
        const apiCall = vi.fn().mockRejectedValue(error);

        await expect(
            retryRequest(apiCall, { maxRetries: 3, delay: 10 })
        ).rejects.toEqual(error);

        expect(apiCall).toHaveBeenCalledTimes(1);
    });
});

describe('requestDeduplicator', () => {
    it('should deduplicate concurrent requests', async () => {
        const apiCall = vi.fn().mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve('result'), 50))
        );

        const promise1 = requestDeduplicator.execute('key', apiCall);
        const promise2 = requestDeduplicator.execute('key', apiCall);

        const [result1, result2] = await Promise.all([promise1, promise2]);

        expect(apiCall).toHaveBeenCalledTimes(1);
        expect(result1).toBe('result');
        expect(result2).toBe('result');
    });

    it('should allow new requests after completion', async () => {
        const apiCall = vi.fn().mockResolvedValue('result');

        await requestDeduplicator.execute('key', apiCall);
        await requestDeduplicator.execute('key', apiCall);

        expect(apiCall).toHaveBeenCalledTimes(2);
    });
});

describe('rateLimiter', () => {
    it('should allow requests within limit', async () => {
        const calls = [];
        for (let i = 0; i < 5; i++) {
            calls.push(rateLimiter.execute(() => Promise.resolve(i)));
        }

        const results = await Promise.all(calls);
        expect(results).toEqual([0, 1, 2, 3, 4]);
    });
});
