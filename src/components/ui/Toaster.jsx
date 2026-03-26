import useToastStore from '../../stores/useToastStore';
import Toast from './Toast';

const Toaster = () => {
    const { toasts, removeToast } = useToastStore();

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
            {/* Wrapper to re-enable pointer events for toasts */}
            <div className="pointer-events-auto">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onClose={removeToast}
                    />
                ))}
            </div>
        </div>
    );
};

export default Toaster;
