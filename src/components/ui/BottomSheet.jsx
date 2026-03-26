/**
 * BottomSheet - Mobile-friendly modal from bottom
 *
 * Better UX than modal dialogs on mobile devices.
 */

import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';

export function BottomSheet({
    isOpen,
    onClose,
    title,
    children,
    className,
    showHandle = true,
    closeOnOverlayClick = true,
    height = 'auto', // 'auto' | 'half' | 'full'
}) {
    const sheetRef = useRef(null);

    // Lock body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    const getHeightClass = () => {
        switch (height) {
            case 'full':
                return 'h-[95vh]';
            case 'half':
                return 'h-[50vh]';
            default:
                return 'max-h-[85vh]';
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 z-50"
                        onClick={closeOnOverlayClick ? onClose : undefined}
                    />

                    {/* Sheet */}
                    <motion.div
                        ref={sheetRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={title || 'Bottom sheet'}
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className={cn(
                            'fixed bottom-0 left-0 right-0 z-50',
                            'bg-card',
                            'rounded-t-xl shadow-2xl border-t border-border',
                            'flex flex-col',
                            getHeightClass(),
                            className
                        )}
                    >
                        {/* Handle */}
                        {showHandle && (
                            <div className="flex justify-center pt-3 pb-2">
                                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                            </div>
                        )}

                        {/* Header */}
                        {title && (
                            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                                <h2 className="text-lg font-semibold text-foreground">
                                    {title}
                                </h2>
                                <button
                                    onClick={onClose}
                                    aria-label="Close"
                                    className="p-2 rounded-full hover:bg-muted transition-colors"
                                >
                                    <X className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

BottomSheet.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    title: PropTypes.string,
    children: PropTypes.node,
    className: PropTypes.string,
    showHandle: PropTypes.bool,
    closeOnOverlayClick: PropTypes.bool,
    height: PropTypes.oneOf(['auto', 'half', 'full']),
};

export default BottomSheet;
