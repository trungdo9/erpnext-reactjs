/**
 * ChatWidget — Floating AI assistant widget
 *
 * Pure AI chat powered by Gemini (function calling) with Groq fallback.
 * No team chat, no knowledge base — everything goes to AI.
 *
 * Mobile: button at bottom-left (above BottomNav), panel nearly full-screen.
 * Desktop: button at bottom-right, panel 380px wide.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Minimize2, Maximize2, Trash2, Sparkles } from 'lucide-react';
import { AiService } from '../../api/domains/aiService';
import { MOBILE } from '../../config/layout';

// ─── Main Widget ─────────────────────────────────────────────────────────────
const ChatWidget = () => {
    const location = useLocation();
    const isOnChatPage = location.pathname === '/app/chat';

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [aiHistory, setAiHistory] = useState([]);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Mobile detection
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE.breakpoint);

    useEffect(() => {
        const mq = window.matchMedia(`(max-width: ${MOBILE.breakpoint - 1}px)`);
        const handler = (e) => setIsMobile(e.matches);
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    // Auto-scroll on new messages
    useEffect(() => {
        if (isOpen && !isMinimized) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isTyping, isOpen, isMinimized]);

    // Focus input when opened — skip on mobile to avoid auto-keyboard
    useEffect(() => {
        if (isOpen && !isMinimized && !isMobile) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen, isMinimized, isMobile]);

    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return;
        const userMsg = text.trim();

        setMessages(prev => [...prev, { type: 'user', text: userMsg }]);
        setInput('');

        const newHistory = [...aiHistory, { role: 'user', content: userMsg }];
        setAiHistory(newHistory);
        setIsTyping(true);

        try {
            const reply = await AiService.chat(newHistory);
            setAiHistory(prev => [...prev, { role: 'assistant', content: reply }]);
            setMessages(prev => [...prev, { type: 'bot', text: reply }]);
        } catch (err) {
            const errMsg = err?.message || 'Lỗi kết nối AI';
            setMessages(prev => [...prev, { type: 'bot', text: errMsg }]);
        } finally {
            setIsTyping(false);
        }
    }, [aiHistory]);

    const handleSubmit = useCallback((e) => {
        e.preventDefault();
        sendMessage(input);
    }, [input, sendMessage]);

    const handleClear = useCallback(() => {
        setMessages([]);
        setAiHistory([]);
    }, []);

    const renderText = useCallback((text) => {
        // Parse **bold**, *italic*, and bullet points
        const lines = text.split('\n');
        return lines.map((line, lineIdx) => {
            const isBullet = /^\s*[-*•]\s/.test(line);
            const content = line.replace(/^\s*[-*•]\s/, '');

            const parts = content.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
                }
                if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
                    return <em key={i}>{part.slice(1, -1)}</em>;
                }
                return part;
            });

            if (isBullet) {
                return (
                    <div key={lineIdx} className="flex gap-1.5 ml-1">
                        <span className="text-emerald-500 shrink-0">•</span>
                        <span>{parts}</span>
                    </div>
                );
            }
            return <div key={lineIdx}>{parts}{line === '' && <br />}</div>;
        });
    }, []);

    if (isOnChatPage) return null;

    const hasMessages = messages.length > 0;

    // Mobile: right-4 bottom-24 (above BottomNav), items-end
    // Desktop: right-5 bottom-5, items-end
    const wrapperClass = isMobile
        ? 'fixed z-[80] flex flex-col right-4 bottom-24 items-end pointer-events-none font-sans'
        : 'fixed z-[80] flex flex-col right-5 bottom-5 items-end pointer-events-none font-sans';

    // Panel sizing
    const panelSizeClass = isMinimized
        ? 'h-[56px]'
        : (isMobile ? 'h-[70vh]' : 'h-[560px] max-h-[75vh]');
    const panelWidthClass = isMobile
        ? 'w-[calc(100vw-2rem)]'
        : 'w-[380px] max-w-[calc(100vw-2.5rem)]';

    return (
        <div className={wrapperClass}>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`pointer-events-auto bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col mb-3 transition-[height,width] duration-300 ${panelSizeClass} ${panelWidthClass}`}
                        style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.3)' }}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-emerald-600 via-green-700 to-emerald-700 shrink-0">
                            <div className="flex items-center justify-between px-4 py-3 text-white">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-semibold leading-tight">Steel ERP AI</div>
                                        <div className="text-[10px] text-white/70 leading-tight">Trợ lý hệ thống</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    {hasMessages && !isMinimized && (
                                        <button
                                            onClick={handleClear}
                                            className="p-1.5 hover:bg-white/15 rounded-full transition-colors"
                                            title="Xóa hội thoại"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/15 rounded-full transition-colors">
                                        {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                                    </button>
                                    <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/15 rounded-full transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Chat area */}
                        {!isMinimized && (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
                                    {/* Welcome message when empty */}
                                    {!hasMessages && !isTyping && (
                                        <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center mb-4">
                                                <Sparkles size={28} className="text-emerald-500" />
                                            </div>
                                            <p className="text-sm font-medium text-foreground mb-1">Xin chào!</p>
                                            <p className="text-xs text-muted-foreground mb-4 max-w-[260px]">
                                                Tôi là trợ lý AI của Steel ERP. Hỏi tôi bất cứ điều gì về sản xuất, kho, nhân sự, kế toán...
                                            </p>
                                            <div className="flex flex-wrap justify-center gap-1.5">
                                                {['Tồn kho hôm nay?', 'Bao nhiêu nhân viên?', 'Sản lượng tuần này?'].map((q) => (
                                                    <button
                                                        key={q}
                                                        onClick={() => sendMessage(q)}
                                                        className="px-3 py-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                                                    >
                                                        {q}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Messages */}
                                    {messages.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            {msg.type === 'bot' && (
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white mr-2 shrink-0 self-end mb-1 shadow">
                                                    <Bot size={14} />
                                                </div>
                                            )}
                                            <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm ${
                                                msg.type === 'user'
                                                    ? 'bg-emerald-600 text-white rounded-br-sm'
                                                    : 'bg-card border border-border rounded-bl-sm text-foreground'
                                            }`}>
                                                {renderText(msg.text)}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Typing indicator */}
                                    {isTyping && (
                                        <div className="flex justify-start">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white mr-2 shrink-0 self-end mb-1 shadow">
                                                <Bot size={14} />
                                            </div>
                                            <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input */}
                                <form
                                    onSubmit={handleSubmit}
                                    className="p-3 bg-background border-t border-border flex items-center gap-2 shrink-0"
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Hỏi bất cứ điều gì..."
                                        disabled={isTyping}
                                        className="flex-1 text-sm bg-muted/50 border border-border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:bg-background transition-colors outline-none placeholder:text-muted-foreground text-foreground disabled:opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || isTyping}
                                        className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-[color,background-color,transform] active:scale-95"
                                    >
                                        <Send size={16} />
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => { setIsOpen(true); setIsMinimized(false); }}
                        className="pointer-events-auto group relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center"
                    >
                        <Sparkles size={26} className="group-hover:rotate-12 transition-transform duration-300" />
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500 border-2 border-white dark:border-gray-900" />
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatWidget;
