/**
 * Chat Utilities — shared helpers for ChatWidget and ChatPage
 */

import { AVATAR_COLORS, ROOM_ICON_MAP } from '../../config/chat.config';
import { ONLINE_STATUS } from '../../config/chat.config';

// ─── Time formatting ──────────────────────────────────────────────────────────

export function formatTime(creation) {
    if (!creation) return '';
    const d = new Date(creation);
    const now = new Date();
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return time;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + time;
}

export function formatDateSeparator(dateStr) {
    const d = new Date(dateStr);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === now.toDateString()) return 'Hôm nay';
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatPreviewTime(creation) {
    if (!creation) return '';
    const d = new Date(creation);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hôm qua';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ─── Avatar helpers ───────────────────────────────────────────────────────────

export function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0].toUpperCase();
}

export function getAvatarStyle(name) {
    if (!name) return { background: `linear-gradient(135deg, ${AVATAR_COLORS[0][0]}, ${AVATAR_COLORS[0][1]})` };
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const pair = AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
    return { background: `linear-gradient(135deg, ${pair[0]}, ${pair[1]})` };
}

// ─── Online status ────────────────────────────────────────────────────────────

export function getOnlineStatus(lastActive) {
    if (!lastActive) return 'offline';
    const diff = Date.now() - new Date(lastActive).getTime();
    if (diff < ONLINE_STATUS.ONLINE_MS) return 'online';
    if (diff < ONLINE_STATUS.RECENT_MS) return 'recent';
    return 'offline';
}

// ─── Message grouping ─────────────────────────────────────────────────────────

export function groupMessages(messages) {
    if (!messages.length) return [];
    const result = [];
    let prevOwner = null;
    let prevDate = null;
    let prevTime = null;

    for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        const msgDate = new Date(msg.creation);
        const dateStr = msgDate.toDateString();
        const timeDiff = prevTime ? (msgDate - prevTime) : Infinity;

        if (dateStr !== prevDate) {
            result.push({ type: 'date', date: msg.creation });
            prevDate = dateStr;
        }

        const sameOwner = msg.owner === prevOwner;
        const withinWindow = timeDiff < 5 * 60 * 1000;
        const isGrouped = sameOwner && withinWindow;

        const nextMsg = messages[i + 1];
        const nextSameOwner = nextMsg && nextMsg.owner === msg.owner;
        const nextTimeDiff = nextMsg ? (new Date(nextMsg.creation) - msgDate) : Infinity;
        const nextGrouped = nextSameOwner && nextTimeDiff < 5 * 60 * 1000;

        result.push({
            type: 'message',
            msg,
            showName: !isGrouped,
            showAvatar: !nextGrouped,
            showTime: !nextGrouped,
            isGrouped,
        });

        prevOwner = msg.owner;
        prevTime = msgDate;
    }
    return result;
}

// ─── Reply helpers ────────────────────────────────────────────────────────────

export function parseReply(text) {
    if (!text) return null;
    const match = text.match(/^\[reply:([^|]+)\|([^|]*)\|([^\]]*)\]\n?([\s\S]*)$/);
    if (!match) return null;
    return {
        replyToName: match[1],
        replyToSender: match[2],
        replyToPreview: match[3],
        body: match[4] || '',
    };
}

export function formatReplyMessage(replyTo, text) {
    const senderName = replyTo.sender_name || replyTo.owner || '';
    const preview = (replyTo.message || '').slice(0, 60);
    return `[reply:${replyTo.name}|${senderName}|${preview}]\n${text}`;
}

// ─── Room icon ────────────────────────────────────────────────────────────────

export function getRoomIcon(room) {
    const name = (room.room_name || '').toLowerCase();
    const desc = (room.description || '').toLowerCase();
    const text = name + ' ' + desc;
    for (const entry of ROOM_ICON_MAP) {
        if (entry.keywords.some(kw => text.includes(kw))) {
            return { iconName: entry.icon, color: entry.color };
        }
    }
    return { iconName: 'Hash', color: 'bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' };
}

// ─── Preview text ─────────────────────────────────────────────────────────────

export function getPreviewText(text) {
    if (!text) return '';
    if (text.startsWith('![')) return '🖼️ Hình ảnh';
    if (text.startsWith('📎')) return '📎 Tệp đính kèm';
    if (text.startsWith('[reply:')) return '↩ Trả lời...';
    return text.length > 40 ? text.slice(0, 40) + '...' : text;
}
