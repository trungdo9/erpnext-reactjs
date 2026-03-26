import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Button from './Button';

describe('Button', () => {
    it('should render with text', () => {
        render(<Button>Click me</Button>);
        expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should handle click events', async () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>Click</Button>);

        await userEvent.click(screen.getByRole('button'));
        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should be disabled when disabled prop is true', () => {
        render(<Button disabled>Disabled</Button>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show loading state with isLoading prop', () => {
        render(<Button isLoading>Loading</Button>);
        const button = screen.getByRole('button');
        // Button is disabled when loading
        expect(button).toBeDisabled();
        // Has aria-busy attribute
        expect(button).toHaveAttribute('aria-busy', 'true');
    });

    it('should apply primary variant styles (emerald gradient)', () => {
        render(<Button variant="primary">Primary</Button>);
        const button = screen.getByRole('button');
        // Primary uses emerald gradient
        expect(button.className).toContain('emerald');
    });

    it('should apply outline variant styles', () => {
        render(<Button variant="outline">Outline</Button>);
        const button = screen.getByRole('button');
        expect(button.className).toContain('border');
    });

    it('should apply small size classes', () => {
        render(<Button size="sm">Small</Button>);
        const button = screen.getByRole('button');
        // sm size uses h-10 (mobile-first) and text-xs
        expect(button.className).toContain('h-10');
        expect(button.className).toContain('text-xs');
    });

    it('should render with custom className', () => {
        render(<Button className="custom-class">Custom</Button>);
        const button = screen.getByRole('button');
        expect(button.className).toContain('custom-class');
    });

    it('should apply danger variant styles', () => {
        render(<Button variant="danger">Delete</Button>);
        const button = screen.getByRole('button');
        // Danger uses red gradient
        expect(button.className).toContain('red');
    });
});
