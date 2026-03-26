import { useState } from 'react';
import MobileDataCard from './MobileDataCard';
import ResponsiveTable from './ResponsiveTable';
import BottomSheet from './BottomSheet';
import FloatingActionButton from './FloatingActionButton';
import SwipeActions from './SwipeActions';
import PullToRefresh from './PullToRefresh';
import Button from './Button';
import { Plus, Edit, Trash2, Share } from 'lucide-react';

export default {
    title: 'Mobile/Components',
    parameters: {
        layout: 'fullscreen',
        viewport: {
            defaultViewport: 'mobile1',
        },
    },
    tags: ['autodocs'],
};

const sampleData = [
    { name: 'ORD-001', customer: 'John Doe', amount: '$150', status: 'Completed', date: '2024-01-15' },
    { name: 'ORD-002', customer: 'Jane Smith', amount: '$250', status: 'Pending', date: '2024-01-14' },
    { name: 'ORD-003', customer: 'Bob Johnson', amount: '$75', status: 'Cancelled', date: '2024-01-13' },
];

const columns = [
    { fieldname: 'name', label: 'Order' },
    { fieldname: 'customer', label: 'Customer' },
    { fieldname: 'amount', label: 'Amount' },
    { fieldname: 'status', label: 'Status' },
    { fieldname: 'date', label: 'Date' },
];

// Mobile Data Card
export const DataCard = {
    render: () => (
        <div className="p-4 space-y-3">
            {sampleData.map((item) => (
                <MobileDataCard
                    key={item.name}
                    data={item}
                    columns={columns}
                    primaryField="name"
                    secondaryField="customer"
                    statusField="status"
                    onClick={() => alert(`Clicked: ${item.name}`)}
                />
            ))}
        </div>
    ),
};

// Responsive Table
export const ResponsiveTableDemo = {
    render: () => (
        <div className="p-4">
            <ResponsiveTable
                data={sampleData}
                columns={columns}
                primaryField="name"
                secondaryField="customer"
                statusField="status"
                onRowClick={(row) => alert(`Clicked: ${row.name}`)}
            />
        </div>
    ),
};

// Bottom Sheet
export const BottomSheetDemo = {
    render: () => {
        const [isOpen, setIsOpen] = useState(false);
        return (
            <div className="p-4">
                <Button onClick={() => setIsOpen(true)}>Open Bottom Sheet</Button>
                <BottomSheet
                    isOpen={isOpen}
                    onClose={() => setIsOpen(false)}
                    title="Select Action"
                >
                    <div className="space-y-2">
                        <button className="w-full p-4 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3">
                            <Edit className="w-5 h-5" />
                            Edit Item
                        </button>
                        <button className="w-full p-4 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3">
                            <Share className="w-5 h-5" />
                            Share
                        </button>
                        <button className="w-full p-4 text-left hover:bg-gray-100 rounded-lg flex items-center gap-3 text-red-600">
                            <Trash2 className="w-5 h-5" />
                            Delete
                        </button>
                    </div>
                </BottomSheet>
            </div>
        );
    },
};

// Floating Action Button
export const FABDemo = {
    render: () => {
        const [expanded, setExpanded] = useState(false);
        return (
            <div className="h-[400px] relative bg-gray-100">
                <FloatingActionButton
                    onClick={() => setExpanded(!expanded)}
                    expanded={expanded}
                    label="Add New"
                    actions={[
                        { label: 'Add Order', icon: Plus, onClick: () => alert('Add Order') },
                        { label: 'Add Customer', icon: Plus, onClick: () => alert('Add Customer') },
                    ]}
                />
            </div>
        );
    },
};

// Swipe Actions
export const SwipeActionsDemo = {
    render: () => (
        <div className="space-y-2">
            {sampleData.map((item) => (
                <SwipeActions
                    key={item.name}
                    onEdit={() => alert(`Edit: ${item.name}`)}
                    onDelete={() => alert(`Delete: ${item.name}`)}
                >
                    <div className="p-4 bg-white border-b">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-500">{item.customer}</div>
                    </div>
                </SwipeActions>
            ))}
            <p className="text-center text-sm text-gray-500 mt-4">
                Swipe left to reveal actions
            </p>
        </div>
    ),
};

// Pull to Refresh
export const PullToRefreshDemo = {
    render: () => {
        const [items, setItems] = useState(sampleData);
        const [, setRefreshing] = useState(false);

        const handleRefresh = async () => {
            setRefreshing(true);
            await new Promise((resolve) => setTimeout(resolve, 1500));
            setItems([...items, { name: `ORD-00${items.length + 1}`, customer: 'New Customer', amount: '$100', status: 'Pending' }]);
            setRefreshing(false);
        };

        return (
            <PullToRefresh onRefresh={handleRefresh} className="h-[400px]">
                <div className="p-4 space-y-3">
                    <p className="text-center text-sm text-gray-500 mb-4">
                        Pull down to refresh
                    </p>
                    {items.map((item) => (
                        <MobileDataCard
                            key={item.name}
                            data={item}
                            columns={columns}
                            primaryField="name"
                            secondaryField="customer"
                            statusField="status"
                        />
                    ))}
                </div>
            </PullToRefresh>
        );
    },
};
