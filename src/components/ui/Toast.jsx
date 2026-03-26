import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const icons = {
    success: <CheckCircle className="w-5 h-5 text-primary" />,
    error: <AlertCircle className="w-5 h-5 text-destructive" />,
    warning: <AlertTriangle className="w-5 h-5 text-foreground" />,
    info: <Info className="w-5 h-5 text-primary" />,
    default: <Info className="w-5 h-5 text-muted-foreground" />,
};

const bgColors = {
    success: 'bg-card border-border',
    error: 'bg-card border-border',
    warning: 'bg-card border-border',
    info: 'bg-card border-border',
    default: 'bg-card border-border',
};

const Toast = ({ id, title, description, type = 'default', onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger enter animation
        requestAnimationFrame(() => setIsVisible(true));
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Wait for animation to finish before removing from DOM
        setTimeout(() => {
            onClose(id);
        }, 300);
    };

    return (
        <div
            className={`
                flex items-start gap-3 p-4 mb-3 w-80 md:w-96 rounded-xl shadow-lg border transition-[transform,opacity] duration-300
                ${bgColors[type] || bgColors.default}
                ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
            `}
            role="alert"
        >
            <div className="flex-shrink-0 mt-0.5">
                {icons[type] || icons.default}
            </div>
            <div className="flex-1 min-w-0">
                {title && (
                    <h3 className="text-[14px] font-semibold text-foreground">
                        {title}
                    </h3>
                )}
                {description && (
                    <p className={`text-[13px] text-muted-foreground ${title ? 'mt-1' : ''}`}>
                        {description}
                    </p>
                )}
            </div>
            <button
                onClick={handleClose}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Close"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

export default Toast;
