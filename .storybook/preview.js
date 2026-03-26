import '../src/index.css';

/** @type { import('@storybook/react-vite').Preview } */
const preview = {
    parameters: {
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        backgrounds: {
            default: 'light',
            values: [
                { name: 'light', value: '#f9fafb' },
                { name: 'dark', value: '#111827' },
            ],
        },
    },
    globalTypes: {
        theme: {
            name: 'Theme',
            description: 'Global theme for components',
            defaultValue: 'light',
            toolbar: {
                icon: 'circlehollow',
                items: ['light', 'dark'],
                showName: true,
            },
        },
    },
    decorators: [
        (Story, context) => {
            const theme = context.globals.theme;
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            return (
                <div className={theme === 'dark' ? 'dark bg-gray-900 p-4' : 'bg-gray-50 p-4'}>
                    <Story />
                </div>
            );
        },
    ],
};

export default preview;