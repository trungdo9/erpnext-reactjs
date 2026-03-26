import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Minimize2, Maximize2, Bot, User, HelpCircle, ArrowLeft } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { APP_CONFIG } from '../../config/app';
import { useTranslation } from '../../hooks/useTranslation';
import { ChatService } from '../../api/chat';

// ─── Chat Assistant Component ────────────────────────────────────────────────
const ChatAssistant = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState('categories'); // 'categories' | 'questions' | 'chat'
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isMinimized, setIsMinimized] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // ─── Knowledge Base (Constructed inside component to use t) ─────────────────
    const KNOWLEDGE_BASE = useMemo(() => [
        {
            category: t('chatbot.cat.lookup'),
            icon: '🔍',
            items: [
                {
                    keywords: ['công việc', 'task', 'todo', 'my task'],
                    question: t('chatbot.q.my_tasks'),
                    action: 'get_open_tasks',
                    answer: ''
                },
                {
                    keywords: ['thực đơn', 'menu', 'ăn gì', 'today menu'],
                    question: t('chatbot.q.today_menu'),
                    action: 'get_today_menu',
                    answer: ''
                }
            ]
        },
        {
            category: t('chatbot.cat.system_intro'),
            icon: '🏢',
            items: [
                {
                    keywords: ['hệ thống', 'là gì', 'giới thiệu', 'steel', 'erp', 'nền tảng', 'chuyển đổi số', 'mục đích', 'system', 'what is', 'intro', 'platform'],
                    question: t('chatbot.q.what_is_system'),
                    answer: t('chatbot.a.what_is_system')
                },
                {
                    keywords: ['ai quản lý', 'quản trị viên', 'admin', 'liên hệ ai', 'hỗ trợ', 'contact', 'support'],
                    question: t('chatbot.q.contact_admin'),
                    answer: `Quản trị viên hệ thống:\n\n👤 **${APP_CONFIG.admin.name}**\n📧 Email: ${APP_CONFIG.admin.email}\n💬 Zalo: ${APP_CONFIG.admin.zalo}\n\nBạn có thể liên hệ qua email hoặc Zalo để được hỗ trợ.`
                },
                {
                    keywords: ['trình duyệt', 'browser', 'chrome', 'firefox', 'edge', 'safari', 'yêu cầu', 'support'],
                    question: t('chatbot.q.supported_browsers'),
                    answer: t('chatbot.a.supported_browsers')
                },
                {
                    keywords: ['cài app', 'pwa', 'điện thoại', 'cài đặt ứng dụng', 'mobile', 'install', 'phone'],
                    question: t('chatbot.q.install_app'),
                    answer: t('chatbot.a.install_app')
                },
            ]
        },
        {
            category: t('chatbot.cat.account_login'),
            icon: '🔐',
            items: [
                {
                    keywords: ['đăng nhập', 'login', 'vào hệ thống', 'không vào được', 'signin'],
                    question: t('chatbot.q.how_to_login'),
                    answer: t('chatbot.a.how_to_login')
                },
                {
                    keywords: ['đổi mật khẩu', 'thay mật khẩu', 'change password'],
                    question: t('chatbot.q.change_password'),
                    answer: t('chatbot.a.change_password')
                },
                {
                    keywords: ['quên mật khẩu', 'reset password', 'mất mật khẩu', 'không nhớ', 'forgot'],
                    question: t('chatbot.q.forgot_password'),
                    answer: `Vui lòng liên hệ **quản trị viên hệ thống** để được đặt lại mật khẩu:\n\n👤 ${APP_CONFIG.admin.name}\n📧 ${APP_CONFIG.admin.email}\n💬 Zalo: ${APP_CONFIG.admin.zalo}`
                },
                {
                    keywords: ['đăng xuất', 'logout', 'thoát', 'đăng xuất ở đâu', 'signout'],
                    question: t('chatbot.q.logout'),
                    answer: t('chatbot.a.logout')
                },
            ]
        },
        {
            category: t('chatbot.cat.core_features'),
            icon: '📋',
            items: [
                {
                    keywords: ['dashboard', 'tổng quan', 'trang chủ', 'màn hình chính', 'home'],
                    question: t('chatbot.q.dashboard'),
                    answer: t('chatbot.a.dashboard')
                },
                {
                    keywords: ['công việc', 'todo', 'nhiệm vụ', 'tạo công việc', 'task'],
                    question: t('chatbot.q.todo'),
                    answer: t('chatbot.a.todo')
                },
                {
                    keywords: ['vật tư', 'sản phẩm', 'item', 'kho', 'quản lý vật tư', 'material', 'product'],
                    question: t('chatbot.q.items'),
                    answer: t('chatbot.a.items')
                },
                {
                    keywords: ['báo cáo', 'report', 'xem báo cáo', 'báo cáo công việc', 'work report'],
                    question: t('chatbot.q.reports'),
                    answer: t('chatbot.a.reports')
                },
                {
                    keywords: ['đề xuất mua hàng', 'purchase', 'mua hàng', 'yêu cầu mua', 'request'],
                    question: t('chatbot.q.purchase'),
                    answer: t('chatbot.a.purchase')
                },
            ]
        },
        {
            category: t('chatbot.cat.production'),
            icon: '🏭',
            items: [
                {
                    keywords: ['sản xuất', 'work order', 'lệnh sản xuất', 'production', 'manufacturing'],
                    question: t('chatbot.q.production_overview'),
                    answer: t('chatbot.a.production_overview')
                },
                {
                    keywords: ['kho', 'tồn kho', 'stock', 'warehouse', 'vật tư', 'inventory'],
                    question: t('chatbot.q.inventory_check'),
                    answer: t('chatbot.a.inventory_check')
                },
            ]
        },
        {
            category: t('chatbot.cat.general_ops'),
            icon: '⚙️',
            items: [
                {
                    keywords: ['ngôn ngữ', 'language', 'tiếng việt', 'tiếng anh', 'khmer', 'đổi ngôn ngữ', 'change language'],
                    question: t('chatbot.q.change_language'),
                    answer: t('chatbot.a.change_language')
                },
                {
                    keywords: ['tạo mới', 'thêm mới', 'tạo biểu mẫu', 'new form', 'create'],
                    question: t('chatbot.q.create_record'),
                    answer: t('chatbot.a.create_record')
                },
                {
                    keywords: ['tìm kiếm', 'search', 'tìm', 'lọc', 'filter'],
                    question: t('chatbot.q.search_filter'),
                    answer: t('chatbot.a.search_filter')
                },
                {
                    keywords: ['phím tắt', 'keyboard', 'shortcut', 'tổ hợp phím'],
                    question: t('chatbot.q.shortcuts'),
                    answer: t('chatbot.a.shortcuts')
                },
            ]
        },
    ], [t]);

    // ─── Smart Search ────────────────────────────────────────────────────────────
    const searchKnowledge = (query) => {
        if (!query || query.trim().length < 2) return null;

        const q = query.toLowerCase().trim();
        const words = q.split(/\s+/).filter(w => w.length > 1);
        let bestMatch = null;
        let bestScore = 0;

        for (const category of KNOWLEDGE_BASE) {
            for (const item of category.items) {
                let score = 0;

                // Keyword matching
                for (const keyword of item.keywords) {
                    const kw = keyword.toLowerCase();
                    if (q.includes(kw)) score += 10;
                    else if (kw.includes(q)) score += 8;
                    else {
                        for (const word of words) {
                            if (kw.includes(word)) score += 3;
                        }
                    }
                }

                // Question matching
                const questionLower = item.question.toLowerCase();
                for (const word of words) {
                    if (questionLower.includes(word)) score += 2;
                }

                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = item;
                }
            }
        }

        return bestScore >= 3 ? bestMatch : null;
    }

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen && view === 'chat') scrollToBottom();
    }, [messages, isOpen, view]);

    const addBotMessage = (text) => {
        setIsTyping(true);
        setTimeout(() => {
            setMessages(prev => [...prev, { type: 'bot', text }]);
            setIsTyping(false);
        }, 400);
    };

    const handleOpen = () => {
        setIsOpen(true);
        setIsMinimized(false);
        if (messages.length === 0) {
            setView('categories');
        }
    };

    const executeAction = async (action) => {
        setIsTyping(true);
        try {
            if (action === 'get_open_tasks') {
                const tasks = await ChatService.getOpenTasks();
                let responseText = '';
                if (!tasks || tasks.length === 0) {
                    responseText = "Bạn không có công việc nào đang mở! 🎉";
                } else {
                    const taskList = tasks.map(t => `• **${t.date ? t.date : ''}**: ${t.description} (${t.priority})`).join('\n');
                    responseText = `**Danh sách công việc của bạn:**\n\n${taskList}`;
                }
                setMessages(prev => [...prev, { type: 'bot', text: responseText }]);
            }
        } catch (error) {
            console.error('Chat Action Error:', error);
            const errorMsg = error?.message || "Unknown error";
            setMessages(prev => [...prev, { type: 'bot', text: `${t('chatbot.no_answer')}\n\n⚠️ Debug: ${errorMsg}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleCategoryClick = (cat) => {
        setSelectedCategory(cat);
        setView('questions');
    };

    const handleQuestionClick = (item) => {
        setMessages(prev => [...prev, { type: 'user', text: item.question }]);
        setView('chat');

        if (item.action) {
            executeAction(item.action);
        } else {
            addBotMessage(item.answer);
        }
    };

    const handleSendMessage = (text) => {
        if (!text.trim()) return;
        setMessages(prev => [...prev, { type: 'user', text }]);
        setInputValue('');
        setView('chat');

        const match = searchKnowledge(text);
        if (match) {
            if (match.action) {
                executeAction(match.action);
            } else {
                addBotMessage(match.answer);
            }
        } else {
            addBotMessage(`${t('chatbot.no_answer')}\n\n${t('chatbot.no_answer_suggestion')}\n• ${t('chatbot.no_answer_browse')}\n• ${t('chatbot.no_answer_contact')} **${APP_CONFIG.admin.name}**\n  📧 ${APP_CONFIG.admin.email}\n  💬 Zalo: ${APP_CONFIG.admin.zalo}`);
        }
    };

    const handleBack = () => {
        if (view === 'questions') setView('categories');
        else if (view === 'chat') {
            if (selectedCategory) setView('questions');
            else setView('categories');
        }
    };

    // Parse markdown-like bold text
    const renderText = (text) => {
        return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    };

    return (
        <div className="fixed bottom-5 right-5 z-[80] flex flex-col items-end pointer-events-none font-sans">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`pointer-events-auto bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden flex flex-col mb-3 w-[360px] sm:w-[400px] max-w-[calc(100vw-2.5rem)] transition-[height] duration-300 ${isMinimized ? 'h-[56px]' : 'h-[560px] max-h-[75vh]'}`}
                        style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)' }}
                    >
                        {/* ── Header ── */}
                        <div
                            className="bg-gradient-to-r from-emerald-600 via-green-700 to-emerald-700 px-4 py-3 flex items-center justify-between text-white shrink-0 cursor-pointer select-none"
                            onClick={() => setIsMinimized(!isMinimized)}
                        >
                            <div className="flex items-center gap-3">
                                {view !== 'categories' && !isMinimized && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleBack(); }}
                                        className="p-1 hover:bg-white/20 rounded-full transition-colors active:scale-95 -ml-1"
                                    >
                                        <ArrowLeft size={18} />
                                    </button>
                                )}
                                <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center backdrop-blur-sm border border-white/10">
                                    <Bot size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">{t('chatbot.title')}</h3>
                                    <p className="text-[10px] text-emerald-200/90 flex items-center gap-1.5 font-medium">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400"></span>
                                        </span>
                                        {t('chatbot.status')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                                    className="p-1.5 hover:bg-white/15 rounded-full transition-colors"
                                    title={isMinimized ? t('chatbot.expand') : t('chatbot.minimize')}
                                >
                                    {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                                </button>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                                    className="p-1.5 hover:bg-white/15 rounded-full transition-colors"
                                    title={t('chatbot.close')}
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        </div>

                        {!isMinimized && (
                            <>
                                {/* ── Category View ── */}
                                {view === 'categories' && (
                                    <div className="flex-1 overflow-y-auto">
                                        <div className="p-4 pb-2">
                                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                                {renderText(t('chatbot.greeting'))}
                                            </p>
                                        </div>
                                        <div className="px-3 pb-3 space-y-1.5">
                                            {KNOWLEDGE_BASE.map((cat, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleCategoryClick(cat)}
                                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800/40 group"
                                                >
                                                    <span className="text-lg shrink-0">{cat.icon}</span>
                                                    <span className="flex-1">{cat.category}</span>
                                                    <span className="text-xs text-slate-400 group-hover:text-emerald-400 transition-colors">{cat.items.length} {t('chatbot.questions_count')}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Questions View ── */}
                                {view === 'questions' && selectedCategory && (
                                    <div className="flex-1 overflow-y-auto">
                                        <div className="p-4 pb-2">
                                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{selectedCategory.category}</p>
                                        </div>
                                        <div className="px-3 pb-3 space-y-1.5">
                                            {selectedCategory.items.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleQuestionClick(item)}
                                                    className="w-full flex items-start gap-3 px-4 py-3 rounded-xl text-left text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/50 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-300 transition-colors border border-transparent hover:border-emerald-100 dark:hover:border-emerald-800/40"
                                                >
                                                    <HelpCircle size={16} className="mt-0.5 shrink-0 text-emerald-400" />
                                                    <span>{item.question}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Chat View ── */}
                                {view === 'chat' && (
                                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 dark:bg-slate-950/30">
                                        {messages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {msg.type === 'bot' && (
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white mr-2 shrink-0 self-end mb-1 shadow">
                                                        <Bot size={14} />
                                                    </div>
                                                )}
                                                <div
                                                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm whitespace-pre-line ${msg.type === 'user'
                                                        ? 'bg-emerald-600 text-white rounded-br-sm'
                                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-sm'
                                                        }`}
                                                >
                                                    {renderText(msg.text)}
                                                </div>
                                                {msg.type === 'user' && (
                                                    <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center ml-2 shrink-0 self-end mb-1">
                                                        <User size={14} className="text-slate-500 dark:text-slate-300" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {isTyping && (
                                            <div className="flex justify-start">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mr-2 shrink-0 self-end mb-1 shadow">
                                                    <Bot size={14} />
                                                </div>
                                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                                                    <div className="flex gap-1">
                                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
                                )}

                                {/* ── Quick FAQ chips (visible in chat view) ── */}
                                {view === 'chat' && (
                                    <div className="px-3 py-2 border-t border-slate-100 dark:border-slate-800/50 bg-white dark:bg-slate-900">
                                        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                                            {KNOWLEDGE_BASE.map((cat) => (
                                                <button
                                                    key={cat.category}
                                                    onClick={() => { setSelectedCategory(cat); setView('questions'); }}
                                                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 transition-colors whitespace-nowrap"
                                                >
                                                    {cat.icon} {cat.category}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* ── Input Area ── */}
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }}
                                    className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
                                >
                                    <input
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder={t('chatbot.placeholder')}
                                        className="flex-1 text-sm bg-slate-100 dark:bg-slate-800/60 border-none rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white dark:focus:bg-slate-800 transition-colors outline-none placeholder:text-slate-400 text-slate-700 dark:text-slate-200"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputValue.trim()}
                                        className="p-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-[color,background-color,transform] shadow-md shadow-emerald-500/20 active:scale-95"
                                    >
                                        <Send size={16} />
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Floating Button ── */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={handleOpen}
                        className="pointer-events-auto group relative w-14 h-14 rounded-full bg-gradient-to-br from-emerald-600 to-green-700 text-white shadow-lg shadow-emerald-500/30 flex items-center justify-center z-50"
                    >
                        <MessageCircle size={26} className="group-hover:rotate-12 transition-transform duration-300" />
                        <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white dark:border-slate-900"></span>
                        </span>
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ChatAssistant;
