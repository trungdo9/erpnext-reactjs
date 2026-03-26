import { describe, it, expect } from 'vitest';
import { cn } from '../lib/utils';

describe('cn utility', () => {
    it('should merge class names', () => {
        const result = cn('class1', 'class2');
        expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
        const isActive = true;
        const result = cn('base', isActive && 'active');
        expect(result).toContain('base');
        expect(result).toContain('active');
    });

    it('should filter falsy values', () => {
        const result = cn('base', false, null, undefined, 'valid');
        expect(result).toBe('base valid');
    });

    it('should merge tailwind classes correctly', () => {
        // tailwind-merge should keep only the last conflicting class
        const result = cn('p-4', 'p-8');
        expect(result).toBe('p-8');
    });

    it('should handle object syntax', () => {
        const result = cn({
            'base-class': true,
            'active-class': true,
            'disabled-class': false,
        });
        expect(result).toContain('base-class');
        expect(result).toContain('active-class');
        expect(result).not.toContain('disabled-class');
    });

    it('should handle array syntax', () => {
        const result = cn(['class1', 'class2']);
        expect(result).toBe('class1 class2');
    });

    it('should handle mixed inputs', () => {
        const result = cn(
            'base',
            ['arr1', 'arr2'],
            { 'obj-class': true },
            'final'
        );
        expect(result).toContain('base');
        expect(result).toContain('arr1');
        expect(result).toContain('obj-class');
        expect(result).toContain('final');
    });
});
