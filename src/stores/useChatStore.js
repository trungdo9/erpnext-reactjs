/**
 * Team Chat Store (Zustand)
 *
 * Manages chat rooms, messages, unread counts, user profiles, and polling state.
 * Uses Frappe API (frappe.client.get_list / insert) as backend.
 */

import { create } from 'zustand';
import { apiClient } from '../api/gateway';

const useChatStore = create((set, get) => ({
    rooms: [],
    messages: {},          // { [roomName]: ChatMessage[] }
    currentRoom: null,
    unreadCounts: {},      // { [roomName]: number }
    isOpen: false,
    lastFetched: {},       // { [roomName]: ISO string }
    lastGlobalCheck: null, // For background unread polling
    isLoadingRooms: false,
    isLoadingMessages: false,
    isSending: false,

    // User profile cache: { [email]: { name, fullName, avatar, lastActive } }
    userProfiles: {},
    // Last message preview per room: { [roomName]: { message, owner, senderName, creation } }
    roomPreviews: {},
    // Reactions: { [msgName]: { [emoji]: [userEmail, ...] } }
    reactions: {},
    // Typing users per room: { [roomName]: [email, ...] }
    typingUsers: {},
    // Flag: full-page chat is active (widget skips polling)
    fullPageMode: false,

    togglePanel: () => {
        const was = get().isOpen;
        set({ isOpen: !was });
        if (!was && get().rooms.length === 0) get().fetchRooms();
    },

    setCurrentRoom: (roomName) => {
        set({ currentRoom: roomName });
        if (roomName) {
            get().fetchMessages(roomName);
            get().markAsRead(roomName);
        }
    },

    markAsRead: (roomName) => {
        set(state => ({
            unreadCounts: { ...state.unreadCounts, [roomName]: 0 },
        }));
    },

    toggleReaction: (msgName, emoji, userEmail) => {
        set(state => {
            const msgReactions = { ...(state.reactions[msgName] || {}) };
            const users = [...(msgReactions[emoji] || [])];
            const idx = users.indexOf(userEmail);
            if (idx >= 0) {
                users.splice(idx, 1);
                if (users.length === 0) delete msgReactions[emoji];
                else msgReactions[emoji] = users;
            } else {
                msgReactions[emoji] = [...users, userEmail];
            }
            return { reactions: { ...state.reactions, [msgName]: msgReactions } };
        });
    },

    fetchRooms: async () => {
        set({ isLoadingRooms: true });
        try {
            const res = await apiClient.post('frappe.client.get_list', {
                doctype: 'Chat Room',
                fields: ['name', 'room_name', 'description'],
                order_by: 'creation asc',
                limit_page_length: 50,
            });
            set({ rooms: res?.message || [], isLoadingRooms: false });
            // Also fetch latest message previews
            get().fetchRoomPreviews();
        } catch {
            set({ isLoadingRooms: false });
        }
    },

    fetchRoomPreviews: async () => {
        try {
            const res = await apiClient.post('frappe.client.get_list', {
                doctype: 'Chat Message',
                fields: ['room', 'message', 'owner', 'sender_name', 'creation'],
                order_by: 'creation desc',
                limit_page_length: 100,
            });
            const msgs = res?.message || [];
            const previews = {};
            for (const m of msgs) {
                if (!previews[m.room]) {
                    previews[m.room] = {
                        message: m.message,
                        owner: m.owner,
                        senderName: m.sender_name,
                        creation: m.creation,
                    };
                }
            }
            set({ roomPreviews: previews });
        } catch {
            // silent
        }
    },

    /**
     * Fetch user profiles (avatar, name) for a list of emails.
     * Caches results to avoid re-fetching.
     */
    fetchUserProfiles: async (emails) => {
        if (!emails || emails.length === 0) return;
        const { userProfiles } = get();
        const toFetch = emails.filter(e => e && !userProfiles[e]);
        if (toFetch.length === 0) return;

        try {
            const res = await apiClient.post('frappe.client.get_list', {
                doctype: 'User',
                filters: { name: ['in', toFetch] },
                fields: ['name', 'full_name', 'user_image', 'last_active'],
                limit_page_length: 100,
            });
            const users = res?.message || [];
            const newProfiles = {};
            for (const u of users) {
                newProfiles[u.name] = {
                    email: u.name,
                    fullName: u.full_name || u.name,
                    avatar: u.user_image || null,
                    lastActive: u.last_active,
                };
            }
            // Mark emails not found so we don't retry
            for (const email of toFetch) {
                if (!newProfiles[email]) {
                    newProfiles[email] = { email, fullName: email, avatar: null, lastActive: null };
                }
            }
            set(state => ({
                userProfiles: { ...state.userProfiles, ...newProfiles },
            }));
        } catch {
            // silent - will retry next time
        }
    },

    fetchMessages: async (roomName, isBackground = false) => {
        if (!roomName) return;
        const { lastFetched, messages } = get();
        const since = lastFetched[roomName];

        if (!isBackground) set({ isLoadingMessages: true });

        try {
            const filters = { room: roomName };
            if (since) filters.creation = ['>', since];

            const res = await apiClient.post('frappe.client.get_list', {
                doctype: 'Chat Message',
                filters,
                fields: ['name', 'message', 'room', 'sender_name', 'owner', 'creation'],
                order_by: 'creation asc',
                limit_page_length: since ? 50 : 100,
            });
            const newMsgs = res?.message || [];

            if (newMsgs.length > 0) {
                const existing = messages[roomName] || [];
                const existingNames = new Set(existing.map(m => m.name));
                const uniqueNew = newMsgs.filter(m => !existingNames.has(m.name));

                set(state => ({
                    messages: { ...state.messages, [roomName]: [...existing, ...uniqueNew] },
                    lastFetched: { ...state.lastFetched, [roomName]: newMsgs[newMsgs.length - 1].creation },
                    isLoadingMessages: false,
                }));

                // Auto-fetch profiles for new senders
                const senderEmails = [...new Set(uniqueNew.map(m => m.owner))];
                if (senderEmails.length > 0) get().fetchUserProfiles(senderEmails);
            } else {
                set(state => ({
                    isLoadingMessages: false,
                    lastFetched: since ? state.lastFetched : { ...state.lastFetched, [roomName]: new Date().toISOString() },
                }));
            }
        } catch {
            set({ isLoadingMessages: false });
        }
    },

    sendMessage: async (roomName, text) => {
        if (!text.trim() || !roomName) return false;
        set({ isSending: true });
        try {
            const res = await apiClient.post('frappe.client.insert', {
                doc: {
                    doctype: 'Chat Message',
                    room: roomName,
                    message: text.trim(),
                },
            });
            const msg = res?.message;
            if (msg) {
                set(state => ({
                    messages: {
                        ...state.messages,
                        [roomName]: [...(state.messages[roomName] || []), msg],
                    },
                    lastFetched: { ...state.lastFetched, [roomName]: msg.creation },
                    isSending: false,
                }));
                return true;
            }
        } catch {
            // silent
        }
        set({ isSending: false });
        return false;
    },

    /**
     * Send typing signal for a room (calls Server Script).
     * Frontend debounces at 3s via ChatInput.
     */
    sendTypingSignal: async (roomName) => {
        if (!roomName) return;
        try {
            await apiClient.post('frappe.client.get_list', {
                doctype: 'Chat Room',
                filters: { name: roomName },
                fields: ['name'],
                limit_page_length: 0,
            });
            // When backend Server Script `chat_typing` is available, replace above with:
            // await apiClient.post('run_doc_method', { dt: 'Chat Room', dn: roomName, method: 'chat_typing' });
        } catch {
            // silent
        }
    },

    /**
     * Fetch typing users for current room (from backend cache).
     * Placeholder until Server Script is deployed.
     */
    fetchTypingUsers: async (roomName) => {
        if (!roomName) return;
        // When backend `get_typing_users` is available, uncomment:
        // try {
        //     const res = await apiClient.post('run_doc_method', { ... });
        //     set(state => ({ typingUsers: { ...state.typingUsers, [roomName]: res?.message || [] } }));
        // } catch {}
    },

    /**
     * Background poll: single API call to count new messages across all rooms.
     * Called every ~15s when panel is closed to update unread badges.
     */
    pollGlobalUnread: async (currentUserEmail) => {
        const { lastGlobalCheck } = get();
        const since = lastGlobalCheck || new Date(Date.now() - 86400000).toISOString();
        const now = new Date().toISOString();

        try {
            const res = await apiClient.post('frappe.client.get_list', {
                doctype: 'Chat Message',
                filters: { creation: ['>', since] },
                fields: ['room', 'owner'],
                order_by: 'creation desc',
                limit_page_length: 100,
            });
            const msgs = res?.message || [];

            const { isOpen, currentRoom } = get();
            const newCounts = {};
            for (const m of msgs) {
                if (m.owner === currentUserEmail) continue;
                if (isOpen && m.room === currentRoom) continue;
                newCounts[m.room] = (newCounts[m.room] || 0) + 1;
            }

            set(state => {
                const updated = { ...state.unreadCounts };
                for (const [room, count] of Object.entries(newCounts)) {
                    updated[room] = (updated[room] || 0) + count;
                }
                return { unreadCounts: updated, lastGlobalCheck: now };
            });
        } catch {
            // silent
        }
    },
}));

export default useChatStore;
