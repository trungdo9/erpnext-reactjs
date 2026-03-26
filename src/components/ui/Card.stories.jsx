import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import Button from './Button';

export default {
    title: 'UI/Card',
    component: Card,
    parameters: {
        layout: 'centered',
    },
    tags: ['autodocs'],
};

// Default card
export const Default = {
    render: () => (
        <Card className="w-[350px]">
            <CardHeader>
                <CardTitle>Card Title</CardTitle>
                <CardDescription>Card description goes here</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Card content with some text explaining the feature.</p>
            </CardContent>
            <CardFooter>
                <Button variant="primary" size="sm">Action</Button>
            </CardFooter>
        </Card>
    ),
};

// Stats card
export const StatsCard = {
    render: () => (
        <Card className="w-[200px]">
            <CardHeader className="pb-2">
                <CardDescription>Total Revenue</CardDescription>
                <CardTitle className="text-3xl">$45,231</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-xs text-emerald-600">+20.1% from last month</p>
            </CardContent>
        </Card>
    ),
};

// Form card
export const FormCard = {
    render: () => (
        <Card className="w-[400px]">
            <CardHeader>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Enter your details below</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <label className="text-sm font-medium">Email</label>
                    <input
                        type="email"
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        placeholder="email@example.com"
                    />
                </div>
                <div>
                    <label className="text-sm font-medium">Password</label>
                    <input
                        type="password"
                        className="w-full mt-1 px-3 py-2 border rounded-lg"
                        placeholder="********"
                    />
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost">Cancel</Button>
                <Button variant="primary">Create</Button>
            </CardFooter>
        </Card>
    ),
};

// Grid of cards
export const CardGrid = {
    render: () => (
        <div className="grid grid-cols-3 gap-4">
            {['Orders', 'Products', 'Customers'].map((title) => (
                <Card key={title} className="w-[180px]">
                    <CardHeader className="pb-2">
                        <CardDescription>{title}</CardDescription>
                        <CardTitle className="text-2xl">{Math.floor(Math.random() * 1000)}</CardTitle>
                    </CardHeader>
                </Card>
            ))}
        </div>
    ),
};
