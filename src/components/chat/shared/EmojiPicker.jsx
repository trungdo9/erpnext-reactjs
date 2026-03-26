import { memo, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { EMOJI_LIST } from '../../../config/chat.config';

const EmojiPicker = memo(({ onSelect, onClose, isMobile = false }) => {
    const pickerRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Mobile: bottom sheet overlay
    if (isMobile) {
        return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30" onClick={onClose}>
                <div
                    ref={pickerRef}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-card rounded-t-2xl shadow-2xl border-t border-border animate-in slide-in-from-bottom duration-200 pb-safe"
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                        <span className="text-sm font-semibold text-foreground">Emoji</span>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted"
                        >
                            <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                    <div className="grid grid-cols-8 gap-1 p-3 max-h-[40vh] overflow-y-auto">
                        {EMOJI_LIST.map(emoji => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => onSelect(emoji)}
                                className="w-11 h-11 flex items-center justify-center text-xl rounded-xl active:bg-muted transition-colors"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Desktop: floating dropdown
    return (
        <div ref={pickerRef} className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-xl shadow-lg p-2 w-[220px] z-10">
            <div className="grid grid-cols-6 gap-1">
                {EMOJI_LIST.map(emoji => (
                    <button
                        key={emoji}
                        type="button"
                        onClick={() => onSelect(emoji)}
                        className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-muted transition-colors"
                    >
                        {emoji}
                    </button>
                ))}
            </div>
        </div>
    );
});
EmojiPicker.displayName = 'EmojiPicker';

export default EmojiPicker;
