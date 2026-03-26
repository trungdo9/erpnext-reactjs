import { useRef, useEffect, useMemo, memo } from 'react';
import { MessageCircle } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { CHAT_VARIANTS } from '../../../config/chat.config';
import { groupMessages, formatDateSeparator } from '../chatUtils';
import MessageBubble from './MessageBubble';

const EMPTY_MESSAGES = [];

const MessageList = memo(({
    messages = EMPTY_MESSAGES,
    currentUser,
    userProfiles = {},
    reactions = {},
    onReply,
    onReact,
    variant = 'widget',
    isMobile = false,
}) => {
    const containerRef = useRef(null);
    const messagesEndRef = useRef(null);
    const prevLenRef = useRef(0);
    const grouped = useMemo(() => groupMessages(messages), [messages]);

    const variantConfig = CHAT_VARIANTS[variant] || CHAT_VARIANTS.widget;

    // Auto-scroll: always on first load, then only if near bottom
    useEffect(() => {
        if (messages.length === 0) return;
        const wasEmpty = prevLenRef.current === 0;
        prevLenRef.current = messages.length;

        if (wasEmpty) {
            requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView());
            return;
        }

        const el = containerRef.current;
        if (!el) return;
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (isNearBottom) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    return (
        <div ref={containerRef} className={cn('flex-1 overflow-y-auto', variantConfig.containerPx, variantConfig.containerPy)}>
            {messages.length === 0 ? (
                <div className="text-center py-8">
                    <MessageCircle className={cn('text-muted-foreground/40 mx-auto mb-2', isMobile ? 'w-10 h-10' : 'w-8 h-8')} />
                    <p className={cn('text-muted-foreground', isMobile ? 'text-base' : 'text-sm')}>Chua co tin nhan</p>
                    <p className={cn('text-muted-foreground/60 mt-1', isMobile ? 'text-sm' : 'text-xs')}>Hay bat dau cuoc tro chuyen!</p>
                </div>
            ) : (
                grouped.map((item, idx) => {
                    if (item.type === 'date') {
                        return (
                            <div key={`date-${idx}`} className={cn('flex items-center gap-3', isMobile ? 'my-5' : 'my-4')}>
                                <div className="flex-1 h-px bg-border" />
                                <span className={cn(
                                    'font-medium text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border',
                                    isMobile ? 'text-[11px]' : 'text-[10px]',
                                )}>
                                    {formatDateSeparator(item.date)}
                                </span>
                                <div className="flex-1 h-px bg-border" />
                            </div>
                        );
                    }
                    const { msg, showName, showAvatar, showTime, isGrouped: grouped_ } = item;
                    return (
                        <MessageBubble
                            key={msg.name}
                            msg={msg}
                            isOwn={msg.owner === currentUser}
                            profile={userProfiles[msg.owner]}
                            showName={showName}
                            showAvatar={showAvatar}
                            showTime={showTime}
                            isGrouped={grouped_}
                            reactions={reactions[msg.name] || {}}
                            currentUser={currentUser}
                            onReply={onReply}
                            onReact={onReact}
                            variant={variant}
                            isMobile={isMobile}
                        />
                    );
                })
            )}
            <div ref={messagesEndRef} />
        </div>
    );
});
MessageList.displayName = 'MessageList';

export default MessageList;
