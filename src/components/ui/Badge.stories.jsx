import Badge from './Badge';

export default {
    title: 'UI/Badge',
    component: Badge,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'],
        },
    },
};

// Default
export const Default = {
    args: {
        children: 'Badge',
    },
};

// All variants
export const Variants = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Badge variant="default">Default</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="destructive">Destructive</Badge>
            <Badge variant="outline">Outline</Badge>
        </div>
    ),
};

// Status badges
export const StatusBadges = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Pending</Badge>
            <Badge variant="destructive">Cancelled</Badge>
            <Badge variant="secondary">Draft</Badge>
        </div>
    ),
};

// In context
export const InContext = {
    render: () => (
        <div className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border">
            <div>
                <h3 className="font-medium">Order #12345</h3>
                <p className="text-sm text-gray-500">Placed on Jan 15, 2024</p>
            </div>
            <Badge variant="success">Completed</Badge>
        </div>
    ),
};
