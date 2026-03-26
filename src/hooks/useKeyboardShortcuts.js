/**
 * useKeyboardShortcuts - Global keyboard shortcuts
 *
 * Registers and manages keyboard shortcuts across the app.
 */

import { useEffect, useCallback, useRef } from 'react';

/**
 * Default shortcuts configuration
 */
export const defaultShortcuts = {
    // Navigation
    'g h': { action: 'navigate', path: '/', description: 'Go to Home' },
    'g c': { action: 'navigate', path: '/app/doctype/Customer', description: 'Go to Customers' },
    'g o': { action: 'navigate', path: '/app/doctype/Sales Order', description: 'Go to Orders' },
    'g i': { action: 'navigate', path: '/app/doctype/Item', description: 'Go to Items' },
    'g s': { action: 'navigate', path: '/settings', description: 'Go to Settings' },

    // Actions
    'c n': { action: 'create', doctype: 'Customer', description: 'Create new Customer' },
    'o n': { action: 'create', doctype: 'Sales Order', description: 'Create new Order' },
    'i n': { action: 'create', doctype: 'Item', description: 'Create new Item' },

    // Form actions
    'ctrl+s': { action: 'save', description: 'Save current form' },
    'ctrl+shift+s': { action: 'submit', description: 'Submit document' },
    'escape': { action: 'cancel', description: 'Cancel / Close' },

    // UI
    'ctrl+k': { action: 'command-palette', description: 'Open command palette' },
    'ctrl+/': { action: 'shortcuts-help', description: 'Show shortcuts help' },
    'ctrl+b': { action: 'toggle-sidebar', description: 'Toggle sidebar' },
    'ctrl+shift+d': { action: 'toggle-theme', description: 'Toggle dark mode' },

    // Search
    '/': { action: 'focus-search', description: 'Focus search input' },
};

/**
 * Parse key string into components
 */
function parseKeyString(keyString) {
    const parts = keyString.toLowerCase().split('+');
    return {
        ctrl: parts.includes('ctrl'),
        shift: parts.includes('shift'),
        alt: parts.includes('alt'),
        meta: parts.includes('meta') || parts.includes('cmd'),
        key: parts.filter((p) => !['ctrl', 'shift', 'alt', 'meta', 'cmd'].includes(p)).join('+'),
    };
}

/**
 * Check if event matches key combo
 */
function matchesKeyCombo(event, parsed) {
    if (parsed.ctrl !== event.ctrlKey) return false;
    if (parsed.shift !== event.shiftKey) return false;
    if (parsed.alt !== event.altKey) return false;
    if (parsed.meta !== event.metaKey) return false;

    const eventKey = event.key.toLowerCase();
    return eventKey === parsed.key;
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts = defaultShortcuts, handlers = {}) {
    const sequenceRef = useRef('');
    const sequenceTimeoutRef = useRef(null);

    const handleKeyDown = useCallback(
        (event) => {
            // Don't trigger shortcuts when typing in inputs
            const target = event.target;
            const isInput =
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable;

            // Allow some shortcuts even in inputs
            const allowInInput = ['ctrl+s', 'ctrl+shift+s', 'escape', 'ctrl+k'];

            // Build current key string
            const parts = [];
            if (event.ctrlKey) parts.push('ctrl');
            if (event.shiftKey) parts.push('shift');
            if (event.altKey) parts.push('alt');
            if (event.metaKey) parts.push('meta');
            parts.push(event.key.toLowerCase());

            // Check single-key shortcuts first
            for (const [combo, config] of Object.entries(shortcuts)) {
                const parsed = parseKeyString(combo);

                // Skip if in input and not allowed
                if (isInput && !allowInInput.includes(combo)) continue;

                // Check for sequence shortcuts (like 'g h')
                if (combo.includes(' ')) {
                    const [first, second] = combo.split(' ');

                    if (sequenceRef.current === first && event.key.toLowerCase() === second) {
                        event.preventDefault();
                        clearTimeout(sequenceTimeoutRef.current);
                        sequenceRef.current = '';

                        if (handlers[config.action]) {
                            handlers[config.action](config);
                        }
                        return;
                    }

                    // Start sequence
                    if (event.key.toLowerCase() === first && !event.ctrlKey && !event.shiftKey) {
                        sequenceRef.current = first;
                        clearTimeout(sequenceTimeoutRef.current);
                        sequenceTimeoutRef.current = setTimeout(() => {
                            sequenceRef.current = '';
                        }, 1000);
                        return;
                    }
                }

                // Check regular shortcuts
                if (matchesKeyCombo(event, parsed)) {
                    event.preventDefault();

                    if (handlers[config.action]) {
                        handlers[config.action](config);
                    }
                    return;
                }
            }
        },
        [shortcuts, handlers]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            clearTimeout(sequenceTimeoutRef.current);
        };
    }, [handleKeyDown]);

    return {
        shortcuts,
    };
}

/**
 * Keyboard shortcuts help modal data
 */
export function getShortcutsHelpData(shortcuts = defaultShortcuts) {
    const categories = {
        Navigation: [],
        Actions: [],
        Form: [],
        UI: [],
        Search: [],
    };

    for (const [combo, config] of Object.entries(shortcuts)) {
        const item = { combo, ...config };

        if (combo.startsWith('g ')) {
            categories.Navigation.push(item);
        } else if (config.action === 'create') {
            categories.Actions.push(item);
        } else if (['save', 'submit', 'cancel'].includes(config.action)) {
            categories.Form.push(item);
        } else if (config.action.includes('toggle') || config.action.includes('palette')) {
            categories.UI.push(item);
        } else {
            categories.Search.push(item);
        }
    }

    return categories;
}

export default useKeyboardShortcuts;
