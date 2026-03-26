/**
 * Chat Configuration
 * Centralized config for chat features.
 */

/** Polling intervals (milliseconds) */
export const CHAT_POLL = {
    ACTIVE_MS: 3000,
    BACKGROUND_MS: 15000,
    TYPING_DEBOUNCE_MS: 3000,
};

/** Online status thresholds (milliseconds) */
export const ONLINE_STATUS = {
    ONLINE_MS: 2 * 60 * 1000,
    RECENT_MS: 15 * 60 * 1000,
};

/** Available reaction emojis */
export const CHAT_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

/** Quick reaction (single-click default) */
export const CHAT_QUICK_REACTION = '❤️';

/** Emoji grid for text input */
export const EMOJI_LIST = [
    '😀','😂','🥰','😎','🤔','👍','👋','🎉','❤️','🔥',
    '😅','😊','😢','😡','🤣','💪','🙏','👏','✅','⭐',
    '😍','🤗','😴','🤝','💯','🚀','📌','⚠️','🍌','🌿',
];

/** Room icon mapping by keywords */
export const ROOM_ICON_MAP = [
    { keywords: ['general', 'chung', 'tổng'], icon: 'Globe', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
    { keywords: ['announce', 'thông báo', 'tb'], icon: 'Megaphone', color: 'bg-green-500/15 text-green-600 dark:text-green-400' },
    { keywords: ['private', 'riêng', 'secret'], icon: 'Lock', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' },
    { keywords: ['team', 'nhóm', 'group'], icon: 'Users', color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
];

/** Avatar color pairs */
export const AVATAR_COLORS = [
    ['#3B82F6', '#2563EB'],
    ['#10B981', '#059669'],
    ['#8B5CF6', '#7C3AED'],
    ['#F43F5E', '#E11D48'],
    ['#06B6D4', '#0891B2'],
    ['#F97316', '#EA580C'],
    ['#6366F1', '#4F46E5'],
    ['#14B8A6', '#0D9488'],
];

/** UI Variants for widget vs full-page vs mobile */
export const CHAT_VARIANTS = {
    widget: {
        bubbleMaxWidth: 'max-w-[70%]',
        bubblePadding: 'px-3 py-1.5',
        avatarSize: 'sm',
        containerPx: 'px-3',
        containerPy: 'py-3',
        inputPx: 'px-3',
        iconBtnSize: 'w-8 h-8',
        iconSize: 'w-4 h-4',
        messageText: 'text-sm',
        messageSpacingGrouped: 'mb-0.5',
        messageSpacingNormal: 'mb-3',
    },
    fullPage: {
        bubbleMaxWidth: 'max-w-[55%]',
        bubblePadding: 'px-3 py-1.5',
        avatarSize: 'md',
        containerPx: 'px-6',
        containerPy: 'py-4',
        inputPx: 'px-4',
        iconBtnSize: 'w-8 h-8',
        iconSize: 'w-4 h-4',
        messageText: 'text-sm',
        messageSpacingGrouped: 'mb-0.5',
        messageSpacingNormal: 'mb-3',
    },
    mobile: {
        bubbleMaxWidth: 'max-w-[75%]',
        bubblePadding: 'px-3.5 py-2.5',
        avatarSize: 'md',
        containerPx: 'px-3',
        containerPy: 'py-3',
        inputPx: 'px-3',
        iconBtnSize: 'w-11 h-11',
        iconSize: 'w-5 h-5',
        messageText: 'text-[15px]',
        messageSpacingGrouped: 'mb-1',
        messageSpacingNormal: 'mb-4',
    },
};
