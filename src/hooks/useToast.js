import useToastStore from '../stores/useToastStore';

export const useToast = () => {
    const { addToast, removeToast } = useToastStore();

    return {
        toast: {
            success: (title, description, duration) => addToast({ title, description, type: 'success', duration }),
            error: (title, description, duration) => addToast({ title, description, type: 'error', duration }),
            warning: (title, description, duration) => addToast({ title, description, type: 'warning', duration }),
            info: (title, description, duration) => addToast({ title, description, type: 'info', duration }),
            custom: (options) => addToast(options),
        },
        dismiss: removeToast,
    };
};
