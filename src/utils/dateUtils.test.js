import { describe, it, expect } from 'vitest';
import {
    formatDate,
    formatDateTime,
    formatTime,
    formatDateForInput,
    formatDatetimeForInput,
    DATE_FORMAT,
    DATETIME_FORMAT,
    TIME_FORMAT,
} from '../utils/dateUtils';

describe('dateUtils', () => {
    describe('constants', () => {
        it('should have correct date format', () => {
            expect(DATE_FORMAT).toBe('DD/MM/YYYY');
        });

        it('should have correct datetime format', () => {
            expect(DATETIME_FORMAT).toBe('DD/MM/YYYY HH:mm');
        });

        it('should have correct time format', () => {
            expect(TIME_FORMAT).toBe('HH:mm');
        });
    });

    describe('formatDate', () => {
        it('should format date correctly', () => {
            const result = formatDate('2024-01-15');
            expect(result).toBe('15/01/2024');
        });

        it('should return empty string for null', () => {
            expect(formatDate(null)).toBe('');
        });

        it('should return empty string for undefined', () => {
            expect(formatDate(undefined)).toBe('');
        });

        it('should handle Date object', () => {
            const date = new Date(2024, 0, 15); // January 15, 2024
            const result = formatDate(date);
            expect(result).toBe('15/01/2024');
        });
    });

    describe('formatDateTime', () => {
        it('should format datetime correctly', () => {
            const result = formatDateTime('2024-01-15 14:30:00');
            expect(result).toBe('15/01/2024 14:30');
        });

        it('should return empty string for null', () => {
            expect(formatDateTime(null)).toBe('');
        });

        it('should handle ISO format', () => {
            const result = formatDateTime('2024-01-15T14:30:00');
            expect(result).toBe('15/01/2024 14:30');
        });
    });

    describe('formatTime', () => {
        it('should format time correctly', () => {
            const result = formatTime('2024-01-15 14:30:00');
            expect(result).toBe('14:30');
        });

        it('should return empty string for null', () => {
            expect(formatTime(null)).toBe('');
        });
    });

    describe('formatDateForInput', () => {
        it('should extract date from datetime string', () => {
            const result = formatDateForInput('2024-01-15 14:30:00');
            expect(result).toBe('2024-01-15');
        });

        it('should return empty string for null', () => {
            expect(formatDateForInput(null)).toBe('');
        });

        it('should return date string as-is', () => {
            expect(formatDateForInput('2024-01-15')).toBe('2024-01-15');
        });
    });

    describe('formatDatetimeForInput', () => {
        it('should convert to datetime-local format', () => {
            const result = formatDatetimeForInput('2024-01-15 14:30:00');
            expect(result).toBe('2024-01-15T14:30');
        });

        it('should return empty string for null', () => {
            expect(formatDatetimeForInput(null)).toBe('');
        });
    });
});
