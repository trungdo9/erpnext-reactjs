import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from './Card';

describe('Card', () => {
    it('should render children', () => {
        render(<Card>Card content</Card>);
        expect(screen.getByText('Card content')).toBeInTheDocument();
    });

    it('should render with title', () => {
        render(<Card title="Card Title">Content</Card>);
        expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
        const { container } = render(<Card className="custom-card">Content</Card>);
        expect(container.firstChild.className).toContain('custom-card');
    });

    it('should handle click when interactive', async () => {
        const handleClick = vi.fn();
        render(<Card interactive onClick={handleClick}>Clickable</Card>);

        await userEvent.click(screen.getByText('Clickable'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have hover effects when interactive', () => {
        const { container } = render(<Card interactive>Interactive</Card>);
        expect(container.firstChild.className).toContain('hover');
    });

    it('should render footer when provided', () => {
        render(<Card footer={<button>Action</button>}>Content</Card>);
        expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });
});
