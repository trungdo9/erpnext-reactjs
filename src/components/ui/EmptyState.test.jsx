import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmptyState from './EmptyState';

// No wrapper needed — Zustand store manages state directly
const wrapper = ({ children }) => <>{children}</>;

describe('EmptyState', () => {
    it('should render with default type', () => {
        render(<EmptyState />, { wrapper });
        expect(screen.getByRole('heading')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
        render(<EmptyState title="No items found" />, { wrapper });
        expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should render with description', () => {
        render(<EmptyState description="Try adding some items" />, { wrapper });
        expect(screen.getByText('Try adding some items')).toBeInTheDocument();
    });

    it('should render action button when provided', () => {
        const action = { label: 'Add Item', onClick: vi.fn() };
        render(<EmptyState action={action} />, { wrapper });
        expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    });

    it('should apply size classes', () => {
        const { container } = render(<EmptyState size="lg" />, { wrapper });
        expect(container.firstChild.className).toContain('py-16');
    });

    it('should render no-results type', () => {
        render(<EmptyState type="no-results" />, { wrapper });
        expect(screen.getByRole('heading')).toBeInTheDocument();
    });
});
