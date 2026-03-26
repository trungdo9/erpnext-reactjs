import Button from './Button';
import { Save, Trash2, Plus, Download } from 'lucide-react';

export default {
    title: 'UI/Button',
    component: Button,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'success', 'link', 'cyan'],
        },
        size: {
            control: 'select',
            options: ['sm', 'default', 'lg', 'icon'],
        },
        isLoading: { control: 'boolean' },
        disabled: { control: 'boolean' },
    },
};

// Default story
export const Default = {
    args: {
        children: 'Button',
        variant: 'primary',
    },
};

// All variants
export const Variants = {
    render: () => (
        <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="cyan">Cyan</Button>
            <Button variant="link">Link</Button>
        </div>
    ),
};

// All sizes
export const Sizes = {
    render: () => (
        <div className="flex items-center gap-4">
            <Button size="sm">Small</Button>
            <Button size="default">Default</Button>
            <Button size="lg">Large</Button>
            <Button size="icon">
                <Plus className="w-4 h-4" />
            </Button>
        </div>
    ),
};

// With icons
export const WithIcons = {
    render: () => (
        <div className="flex flex-wrap gap-4">
            <Button variant="primary">
                <Save className="w-4 h-4" />
                Save
            </Button>
            <Button variant="danger">
                <Trash2 className="w-4 h-4" />
                Delete
            </Button>
            <Button variant="outline">
                <Download className="w-4 h-4" />
                Export
            </Button>
        </div>
    ),
};

// Loading state
export const Loading = {
    args: {
        children: 'Saving...',
        isLoading: true,
    },
};

// Disabled state
export const Disabled = {
    args: {
        children: 'Disabled',
        disabled: true,
    },
};

// Dark mode variants
export const DarkMode = {
    render: () => (
        <div className="dark bg-gray-900 p-8 rounded-xl">
            <div className="flex flex-wrap gap-4">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
            </div>
        </div>
    ),
};
