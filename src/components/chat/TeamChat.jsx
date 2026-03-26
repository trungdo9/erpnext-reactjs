/**
 * TeamChat — Floating team chat panel
 *
 * Features:
 * - Multiple chat rooms (fetched from ERPNext "Chat Room" DocType)
 * - Real-time polling (3s active, 15s background)
 * - Unread badge on floating button
 * - Message bubbles with sender name + timestamp
 * - Keyboard: Enter to send
 */

import { useState, useEffect, useRef, useCallback, memo } from 'react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, ChevronLeft, Hash, Users } from 'lucide-react';
import useChatStore from '../../stores/useChatStore';
import { useAuth } from '../../auth/useAuth';

const POLL_ACTIVE_MS = 3000;
const POLL_BG_MS = 15000;

/** Format creation timestamp for display */
function formatTime(creation) {
    if (!creation) return '';
    const d = new Date(creation);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + time;
}

/** Single message bubble */
const MessageBubble = memo(({ msg, isOwn }) => (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className={`max-w-[75%] px-3 py-2 rounded-2xl ${
            isOwn
                ? 'bg-emerald-600 text-white rounded-br-md'
                : 'bg-muted dark:bg-white/10 text-foreground rounded-bl-md'
        }`}>
            {!isOwn && (
                <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                    {msg.sender_name || msg.owner}
                </p>
            )}
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
            <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'} text-right`}>
                {formatTime(msg.creation)}
            </p>
        </div>
    </div>
));
MessageBubble.displayName = 'MessageBubble';

/** Room list view */
function RoomList({ rooms, unreadCounts, onSelect, isLoading }) {
    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-500 border-t-transparent" />
            </div>
        );
    }

    if (rooms.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                Chưa có phòng chat nào
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-border">
                {rooms.map(room => {
                    const unread = unreadCounts[room.name] || 0;
                    return (
                        <button
                            key={room.name}
                            onClick={() => onSelect(room.name)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-left"
                        >
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Hash className="w-5 h-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground truncate">
                                        {room.room_name}
                                    </span>
                                    {unread > 0 && (
                                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white min-w-[18px] text-center">
                                            {unread > 99 ? '99+' : unread}
                                        </span>
                                    )}
                                </div>
                                {room.description && (
                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                        {room.description}
                                    </p>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/** Chat room view with messages + input */
function ChatRoom({ roomName, currentUser }) {
    const messages = useChatStore(s => s.messages[roomName] || []);
    const isLoading = useChatStore(s => s.isLoadingMessages);
    const isSending = useChatStore(s => s.isSending);
    const sendMessage = useChatStore(s => s.sendMessage);

    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const containerRef = useRef(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        // Only auto-scroll if user is near the bottom
        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
        if (isNearBottom) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    // Scroll to bottom on mount
    useEffect(() => {
        setTimeout(() => messagesEndRef.current?.scrollIntoView(), 50);
        inputRef.current?.focus();
    }, []);

    const handleSend = useCallback(async () => {
        const text = input.trim();
        if (!text) return;
        setInput('');
        await sendMessage(roomName, text);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, [input, roomName, sendMessage]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }, [handleSend]);

    return (
        <>
            {/* Messages area */}
            <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-3">
                {isLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-emerald-500 border-t-transparent" />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Chưa có tin nhắn</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Hãy bắt đầu cuộc trò chuyện!</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <MessageBubble key={msg.name} msg={msg} isOwn={msg.owner === currentUser} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-3 py-2.5 border-t border-border bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Nhập tin nhắn..."
                        className="flex-1 px-3.5 py-2 rounded-full border border-border bg-muted/50 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isSending}
                        className="p-2.5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                        {isSending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
        </>
    );
}

/** Main TeamChat floating widget */
export default function TeamChat() {
    const rooms = useChatStore(s => s.rooms);
    const currentRoom = useChatStore(s => s.currentRoom);
    const unreadCounts = useChatStore(s => s.unreadCounts);
    const isOpen = useChatStore(s => s.isOpen);
    const isLoadingRooms = useChatStore(s => s.isLoadingRooms);
    const togglePanel = useChatStore(s => s.togglePanel);
    const setCurrentRoom = useChatStore(s => s.setCurrentRoom);
    const fetchRooms = useChatStore(s => s.fetchRooms);
    const fetchMessages = useChatStore(s => s.fetchMessages);
    const markAsRead = useChatStore(s => s.markAsRead);
    const pollGlobalUnread = useChatStore(s => s.pollGlobalUnread);

    const { currentUser, profile } = useAuth();
    const chatUser = profile?.name || currentUser;

    // Fetch rooms on mount
    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // Active polling: poll current room every 3s when panel open
    useEffect(() => {
        if (!isOpen || !currentRoom) return;
        const id = setInterval(() => fetchMessages(currentRoom, true), POLL_ACTIVE_MS);
        return () => clearInterval(id);
    }, [isOpen, currentRoom, fetchMessages]);

    // Mark as read when viewing
    useEffect(() => {
        if (isOpen && currentRoom) markAsRead(currentRoom);
    }, [isOpen, currentRoom, markAsRead]);

    // Background polling: check unread every 15s
    useEffect(() => {
        if (!currentUser) return;
        const id = setInterval(() => pollGlobalUnread(currentUser), POLL_BG_MS);
        return () => clearInterval(id);
    }, [currentUser, pollGlobalUnread]);

    const totalUnread = Object.values(unreadCounts).reduce((s, n) => s + n, 0);
    const handleBack = useCallback(() => setCurrentRoom(null), [setCurrentRoom]);

    // Find room display name
    const currentRoomLabel = rooms.find(r => r.name === currentRoom)?.room_name || currentRoom;

    return (
        <>
            {/* Floating button */}
            <motion.button
                onClick={togglePanel}
                className="fixed bottom-5 left-5 z-[80] p-3.5 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.95 }}
                title="Chat nhóm"
            >
                <MessageCircle className="w-6 h-6" />
                {totalUnread > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white min-w-[18px] text-center shadow-sm"
                    >
                        {totalUnread > 99 ? '99+' : totalUnread}
                    </motion.span>
                )}
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
            </motion.button>

            {/* Chat panel */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="fixed bottom-20 left-5 z-[80] w-[380px] h-[520px] rounded-2xl shadow-2xl border border-border bg-card flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 via-green-700 to-emerald-700 text-white shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                {currentRoom ? (
                                    <>
                                        <button
                                            onClick={handleBack}
                                            className="p-1 -ml-1 rounded-md hover:bg-white/20 transition-colors shrink-0"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <Hash className="w-4 h-4 shrink-0" />
                                        <span className="font-semibold text-sm truncate">{currentRoomLabel}</span>
                                    </>
                                ) : (
                                    <>
                                        <Users className="w-5 h-5 shrink-0" />
                                        <span className="font-semibold text-sm">Chat nhóm</span>
                                    </>
                                )}
                            </div>
                            <button
                                onClick={togglePanel}
                                className="p-1 rounded-md hover:bg-white/20 transition-colors shrink-0"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Content */}
                        {currentRoom ? (
                            <ChatRoom roomName={currentRoom} currentUser={chatUser} />
                        ) : (
                            <RoomList
                                rooms={rooms}
                                unreadCounts={unreadCounts}
                                onSelect={setCurrentRoom}
                                isLoading={isLoadingRooms}
                            />
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
