import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Reply, Paperclip } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatTime, parseReply } from '../chatUtils';
import { CHAT_QUICK_REACTION, CHAT_VARIANTS } from '../../../config/chat.config';
import UserAvatar from './UserAvatar';
import ReactionPicker from './ReactionPicker';

// Render message content (images, links, text)
function renderMessageContent(text, isOwn, isMobile) {
    const textClass = isMobile ? 'text-[15px]' : 'text-sm';

    const imgMatch = text.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) {
        return (
            <a href={imgMatch[2]} target="_blank" rel="noopener noreferrer">
                <img
                    src={imgMatch[2]}
                    alt={imgMatch[1]}
                    className="max-w-full rounded-lg max-h-48 object-cover cursor-pointer"
                    loading="lazy"
                />
            </a>
        );
    }
    const fileMatch = text.match(/^📎\s*\[([^\]]+)\]\(([^)]+)\)\s*(\([^)]*\))?$/);
    if (fileMatch) {
        return (
            <a
                href={fileMatch[2]}
                target="_blank"
                rel="noopener noreferrer"
                className={cn('flex items-center gap-2', textClass, isOwn ? 'text-white underline' : 'text-emerald-600 dark:text-emerald-400 underline')}
            >
                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{fileMatch[1]}</span>
                {fileMatch[3] && <span className="text-[10px] opacity-70 shrink-0">{fileMatch[3]}</span>}
            </a>
        );
    }
    return <p className={cn(textClass, 'whitespace-pre-wrap break-words leading-relaxed')}>{text}</p>;
}

const MessageBubble = memo(({
    msg,
    isOwn,
    profile,
    showName,
    showAvatar,
    showTime,
    isGrouped,
    reactions = {},
    currentUser,
    onReply,
    onReact,
    variant = 'widget',
    isMobile = false,
}) => {
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const bubbleRef = useRef(null);

    const variantConfig = CHAT_VARIANTS[variant] || CHAT_VARIANTS.widget;
    const senderName = profile?.fullName || msg.sender_name || msg.owner;
    const spacing = isGrouped ? variantConfig.messageSpacingGrouped : variantConfig.messageSpacingNormal;

    const reply = parseReply(msg.message);
    const displayText = reply ? reply.body : msg.message;

    const handleQuickReact = useCallback(() => {
        onReact?.(msg.name, CHAT_QUICK_REACTION);
    }, [msg.name, onReact]);

    const handleReact = useCallback((emoji) => {
        onReact?.(msg.name, emoji);
        setShowReactionPicker(false);
        setShowActions(false);
    }, [msg.name, onReact]);

    // Mobile: tap bubble to toggle actions
    const handleBubbleTap = useCallback(() => {
        if (!isMobile) return;
        setShowActions(prev => !prev);
        setShowReactionPicker(false);
    }, [isMobile]);

    // Mobile: close actions when tapping outside
    useEffect(() => {
        if (!isMobile || !showActions) return;
        const handler = (e) => {
            if (bubbleRef.current && !bubbleRef.current.contains(e.target)) {
                setShowActions(false);
                setShowReactionPicker(false);
            }
        };
        document.addEventListener('touchstart', handler);
        return () => document.removeEventListener('touchstart', handler);
    }, [isMobile, showActions]);

    const reactionEntries = Object.entries(reactions);
    const hasReactions = reactionEntries.length > 0;

    // Show action buttons: hover on desktop, tap on mobile
    const actionsVisible = isMobile ? showActions : false; // desktop uses group-hover

    return (
        <div
            ref={bubbleRef}
            className={cn('flex group/msg relative', isOwn ? 'justify-end' : 'justify-start', spacing)}
            onMouseLeave={() => { if (!isMobile) { setShowReactionPicker(false); } }}
        >
            {/* Avatar (left for others) */}
            {!isOwn && (
                <div className={cn('mr-2 shrink-0 flex items-end', isMobile ? 'w-9' : 'w-8')}>
                    {showAvatar && <UserAvatar profile={profile} name={senderName} size={variantConfig.avatarSize} />}
                </div>
            )}

            <div className={cn(variantConfig.bubbleMaxWidth, 'flex flex-col', isOwn ? 'items-end' : 'items-start')}>
                {/* Sender name */}
                {!isOwn && showName && (
                    <p className={cn(
                        'font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5 ml-1',
                        isMobile ? 'text-[11px]' : 'text-[10px]',
                    )}>
                        {senderName}
                    </p>
                )}

                {/* Bubble */}
                <div className="relative">
                    <div
                        onClick={handleBubbleTap}
                        className={cn(
                            variantConfig.bubblePadding,
                            'rounded-2xl',
                            isOwn
                                ? 'bg-emerald-600 text-white' + (showAvatar ? ' rounded-br-md' : '')
                                : 'bg-muted dark:bg-white/10 text-foreground' + (showAvatar ? ' rounded-bl-md' : ''),
                            isMobile && 'select-none',
                        )}
                    >
                        {/* Reply quote */}
                        {reply && (
                            <div className={cn(
                                'mb-1.5 px-2 py-1 rounded-lg border-l-2 text-[11px]',
                                isOwn
                                    ? 'bg-white/15 border-white/40 text-white/80'
                                    : 'bg-muted-foreground/10 border-emerald-500/50 text-muted-foreground'
                            )}>
                                <p className="font-semibold truncate">{reply.replyToSender}</p>
                                <p className="truncate">{reply.replyToPreview}</p>
                            </div>
                        )}
                        {renderMessageContent(displayText, isOwn, isMobile)}
                    </div>

                    {/* Action buttons — desktop: hover, mobile: tap-to-show */}
                    <div className={cn(
                        'absolute top-0 flex items-center gap-0.5 transition-opacity z-10',
                        isOwn ? 'right-full mr-1' : 'left-full ml-1',
                        isMobile
                            ? (actionsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none')
                            : 'opacity-0 group-hover/msg:opacity-100',
                    )}>
                        {onReply && (
                            <button
                                onClick={() => { onReply(msg); setShowActions(false); }}
                                className={cn(
                                    'rounded-full text-muted-foreground transition-colors',
                                    isMobile
                                        ? 'p-2 bg-card border border-border shadow-md active:bg-muted'
                                        : 'p-1 hover:bg-muted hover:text-foreground',
                                )}
                                title="Tra loi"
                            >
                                <Reply className={isMobile ? 'w-5 h-5' : 'w-3.5 h-3.5'} />
                            </button>
                        )}
                        {onReact && (
                            <button
                                onClick={() => {
                                    if (isMobile) setShowReactionPicker(prev => !prev);
                                    else handleQuickReact();
                                }}
                                onContextMenu={(e) => { e.preventDefault(); setShowReactionPicker(true); }}
                                className={cn(
                                    'rounded-full text-muted-foreground transition-colors',
                                    isMobile
                                        ? 'p-2 bg-card border border-border shadow-md active:bg-muted text-sm'
                                        : 'p-1 hover:bg-muted hover:text-foreground text-xs',
                                )}
                                title="Tha cam xuc"
                            >
                                {'\u2764\uFE0F'}
                            </button>
                        )}
                    </div>

                    {/* Reaction picker popup */}
                    {showReactionPicker && (
                        <div className={cn(
                            'absolute z-20',
                            isOwn ? 'right-0 bottom-full mb-1' : 'left-0 bottom-full mb-1'
                        )}>
                            <ReactionPicker onSelect={handleReact} isMobile={isMobile} />
                        </div>
                    )}
                </div>

                {/* Reaction badges */}
                {hasReactions && (
                    <div className={cn('flex flex-wrap gap-1 mt-0.5', isOwn ? 'mr-1' : 'ml-1')}>
                        {reactionEntries.map(([emoji, users]) => {
                            const isMine = users.includes(currentUser);
                            return (
                                <button
                                    key={emoji}
                                    onClick={() => onReact?.(msg.name, emoji)}
                                    className={cn(
                                        'flex items-center gap-0.5 rounded-full border transition-colors',
                                        isMobile ? 'px-2 py-1 text-xs' : 'px-1.5 py-0.5 text-[11px]',
                                        isMine
                                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted'
                                    )}
                                >
                                    <span>{emoji}</span>
                                    <span className="font-medium">{users.length}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Timestamp */}
                {showTime && (
                    <p className={cn('text-[10px] mt-0.5 text-muted-foreground', isOwn ? 'mr-1' : 'ml-1')}>
                        {formatTime(msg.creation)}
                    </p>
                )}
            </div>

            {/* Avatar (right for own) */}
            {isOwn && (
                <div className={cn('ml-2 shrink-0 flex items-end', isMobile ? 'w-9' : 'w-8')}>
                    {showAvatar && <UserAvatar profile={profile} name={senderName} size={variantConfig.avatarSize} />}
                </div>
            )}
        </div>
    );
});
MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
