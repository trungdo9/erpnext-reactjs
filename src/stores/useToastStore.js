/**
 * Toast Store - Zustand
 *
 * Manages toast notification state.
 * Replaces ToastContext.jsx.
 *
 * Usage:
 * import useToastStore from '../stores/useToastStore';
 * const { toasts, addToast, removeToast } = useToastStore();
 */

import { create } from 'zustand';

let toastIdCounter = 0;

const useToastStore = create((set) => ({
    toasts: [],

    addToast: ({ title, description, type = 'default', duration = 3000 }) => {
        const id = ++toastIdCounter;
        const newToast = { id, title, description, type, duration };

        set((state) => ({ toasts: [...state.toasts, newToast] }));

        if (duration > 0) {
            setTimeout(() => {
                useToastStore.getState().removeToast(id);
            }, duration);
        }

        return id;
    },

    removeToast: (id) => {
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    },
}));

export default useToastStore;
