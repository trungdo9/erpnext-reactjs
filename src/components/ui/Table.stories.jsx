import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from './Table';
import Badge from './Badge';

export default {
    title: 'UI/Table',
    component: Table,
    parameters: {
        layout: 'padded',
    },
    tags: ['autodocs'],
};

const sampleData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'Active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Viewer', status: 'Pending' },
    { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Inactive' },
];

// Default table
export const Default = {
    render: () => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sampleData.map((row) => (
                    <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>
                            <Badge
                                variant={
                                    row.status === 'Active'
                                        ? 'success'
                                        : row.status === 'Pending'
                                          ? 'warning'
                                          : 'secondary'
                                }
                            >
                                {row.status}
                            </Badge>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    ),
};

// With footer
export const WithFooter = {
    render: () => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Total</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell>Widget A</TableCell>
                    <TableCell>10</TableCell>
                    <TableCell>$15.00</TableCell>
                    <TableCell>$150.00</TableCell>
                </TableRow>
                <TableRow>
                    <TableCell>Widget B</TableCell>
                    <TableCell>5</TableCell>
                    <TableCell>$25.00</TableCell>
                    <TableCell>$125.00</TableCell>
                </TableRow>
            </TableBody>
            <TableFooter>
                <TableRow>
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="font-bold">$275.00</TableCell>
                </TableRow>
            </TableFooter>
        </Table>
    ),
};

// Empty table
export const Empty = {
    render: () => (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        No data available
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
    ),
};
