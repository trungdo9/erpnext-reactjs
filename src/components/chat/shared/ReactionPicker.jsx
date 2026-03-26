import { memo } from 'react';
import { cn } from '../../../lib/utils';
import { CHAT_REACTION_EMOJIS } from '../../../config/chat.config';

const ReactionPicker = memo(({ onSelect, isMobile = false, className = '' }) => {
    return (
        <div className={cn(
            'flex items-center bg-card border border-border shadow-lg',
            isMobile ? 'gap-1 rounded-2xl px-2 py-1.5' : 'gap-0.5 rounded-full px-1.5 py-1',
            className,
        )}>
            {CHAT_REACTION_EMOJIS.map(emoji => (
                <button
                    key={emoji}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onSelect(emoji); }}
                    className={cn(
                        'flex items-center justify-center rounded-full transition-[background-color,transform]',
                        isMobile
                            ? 'w-11 h-11 text-xl active:scale-110 active:bg-muted'
                            : 'w-7 h-7 text-base hover:bg-muted hover:scale-125',
                    )}
                >
                    {emoji}
                </button>
            ))}
        </div>
    );
});
ReactionPicker.displayName = 'ReactionPicker';

export default ReactionPicker;
