import { useState, useRef, useCallback, memo } from 'react';
import { Send, Smile, Paperclip, Image, X } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { formatReplyMessage } from '../chatUtils';
import { FileService } from '../../../api/domains/fileService';
import EmojiPicker from './EmojiPicker';

const ChatInput = memo(({
    roomName,
    sendMessage,
    isSending = false,
    replyTo = null,
    onCancelReply,
    onTyping,
    variant = 'widget',
    isMobile = false,
}) => {
    const [input, setInput] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const lastTypingRef = useRef(0);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        setShowEmoji(false);

        const finalText = replyTo ? formatReplyMessage(replyTo, text) : text;
        await sendMessage(roomName, finalText);
        onCancelReply?.();
    }, [input, roomName, sendMessage, replyTo, onCancelReply]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    const handleInputChange = useCallback((e) => {
        setInput(e.target.value);
        const now = Date.now();
        if (now - lastTypingRef.current > 3000 && e.target.value.trim()) {
            lastTypingRef.current = now;
            onTyping?.();
        }
    }, [onTyping]);

    const handleEmojiSelect = useCallback((emoji) => {
        setInput(prev => prev + emoji);
        if (!isMobile) inputRef.current?.focus();
    }, [isMobile]);

    const handleFileUpload = useCallback(async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        const validation = FileService.validate(file, { maxSize: 300 * 1024 * 1024 });
        if (!validation.valid) {
            await sendMessage(roomName, `\u26A0\uFE0F ${validation.error}`);
            return;
        }

        setIsUploading(true);
        try {
            const result = await FileService.upload(file, {
                isPrivate: false,
                folder: 'Home/Attachments',
            });
            const fileType = FileService.getFileType(file.name);
            let msg;
            if (fileType === 'image') {
                msg = `![${file.name}](${result.url})`;
            } else {
                const size = FileService.formatSize(file.size);
                msg = `\uD83D\uDCCE [${file.name}](${result.url}) (${size})`;
            }
            await sendMessage(roomName, msg);
        } catch (err) {
            await sendMessage(roomName, `\u26A0\uFE0F Upload that bai: ${err.message}`);
        } finally {
            setIsUploading(false);
        }
    }, [roomName, sendMessage]);

    const inputPx = variant === 'fullPage' || variant === 'mobile' ? 'px-4' : 'px-3';
    const iconBtnClass = isMobile
        ? 'w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors'
        : 'p-2 rounded-full shrink-0 transition-colors';
    const iconClass = isMobile ? 'w-5 h-5' : 'w-4 h-4';

    return (
        <div className={cn(
            'border-t border-border bg-background/80 relative',
            inputPx,
            isMobile ? 'py-2 pb-safe' : 'py-2.5',
        )}>
            {/* Reply preview */}
            {replyTo && (
                <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-lg bg-muted/50 border-l-2 border-emerald-500">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Tra loi {replyTo.sender_name || replyTo.owner}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{replyTo.message}</p>
                    </div>
                    <button onClick={onCancelReply} className={cn(
                        'rounded-full hover:bg-muted shrink-0',
                        isMobile ? 'p-2' : 'p-1',
                    )}>
                        <X className={cn('text-muted-foreground', isMobile ? 'w-5 h-5' : 'w-3.5 h-3.5')} />
                    </button>
                </div>
            )}

            {showEmoji && (
                <EmojiPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowEmoji(false)}
                    isMobile={isMobile}
                />
            )}

            {/* Hidden file inputs */}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />

            <div className={cn('flex items-center', isMobile ? 'gap-1' : 'gap-1.5')}>
                <button
                    type="button"
                    onClick={() => setShowEmoji(prev => !prev)}
                    className={cn(
                        iconBtnClass,
                        showEmoji
                            ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                            : 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    )}
                    title="Emoji"
                >
                    <Smile className={iconClass} />
                </button>
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className={cn(iconBtnClass, 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-40')}
                    title="Dinh kem"
                >
                    <Paperclip className={iconClass} />
                </button>
                <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={isUploading}
                    className={cn(iconBtnClass, 'text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 disabled:opacity-40')}
                    title="Hinh anh"
                >
                    <Image className={iconClass} />
                </button>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={isUploading ? 'Dang tai len...' : replyTo ? 'Nhap phan hoi...' : 'Nhap tin nhan...'}
                    disabled={isUploading}
                    autoFocus={!isMobile}
                    className={cn(
                        'flex-1 rounded-full border border-border bg-muted/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 disabled:opacity-50',
                        isMobile ? 'px-4 py-2.5 text-base' : 'px-3.5 py-2 text-sm',
                    )}
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isSending || isUploading}
                    className={cn(
                        'rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center',
                        isMobile ? 'w-11 h-11' : 'p-2.5',
                    )}
                >
                    {(isSending || isUploading) ? (
                        <div className={cn('animate-spin rounded-full border-2 border-white border-t-transparent', isMobile ? 'h-5 w-5' : 'h-4 w-4')} />
                    ) : (
                        <Send className={isMobile ? 'w-5 h-5' : 'w-4 h-4'} />
                    )}
                </button>
            </div>
        </div>
    );
});
ChatInput.displayName = 'ChatInput';

export default ChatInput;
