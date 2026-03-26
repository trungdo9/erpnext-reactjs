import React, { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import Button from '../ui/Button';

const ThemeToggle = () => {
    const [theme, setTheme] = useState(() => {
        if (typeof localStorage !== 'undefined' && localStorage.theme) {
            return localStorage.theme;
        }
        // Mobile defaults to light, desktop defaults to dark
        return window.innerWidth < 768 ? 'light' : 'dark';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label={theme === 'dark' ? "Switch to light mode" : "Switch to dark mode"}
            className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-muted/50"
        >
            {theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
            ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
            )}
        </Button>
    );
};

export default ThemeToggle;
