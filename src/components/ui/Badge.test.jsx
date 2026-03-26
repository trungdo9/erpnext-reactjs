import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Badge from './Badge';

describe('Badge', () => {
    it('should render with text content', () => {
        render(<Badge>Active</Badge>);
        expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should apply default variant', () => {
        render(<Badge>Default</Badge>);
        const badge = screen.getByText('Default');
        expect(badge).toBeInTheDocument();
    });

    it('should apply success variant', () => {
        render(<Badge variant="success">Success</Badge>);
        const badge = screen.getByText('Success');
        // Badge uses CSS variable-based success color
        expect(badge.className).toContain('success');
    });

    it('should apply secondary variant', () => {
        render(<Badge variant="secondary">Secondary</Badge>);
        const badge = screen.getByText('Secondary');
        expect(badge.className).toContain('secondary');
    });

    it('should apply destructive variant', () => {
        render(<Badge variant="destructive">Destructive</Badge>);
        const badge = screen.getByText('Destructive');
        expect(badge.className).toContain('destructive');
    });

    it('should apply custom className', () => {
        render(<Badge className="custom-badge">Custom</Badge>);
        const badge = screen.getByText('Custom');
        expect(badge.className).toContain('custom-badge');
    });
});
