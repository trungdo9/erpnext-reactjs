/**
 * AI Chat Service
 *
 * Proxies chat messages to Anthropic Claude via Frappe backend.
 * Backend endpoint: steel_erp.ai_chat.chat_ai_respond
 */

import { apiClient } from '../gateway';

class AiServiceClass {
    /**
     * Send messages to AI and get a response.
     * @param {Array<{role: string, content: string}>} messages - Conversation history
     * @param {string} [systemPrompt] - Optional system prompt override
     * @returns {Promise<string>} AI response text
     */
    async chat(messages, systemPrompt) {
        const args = {
            messages: JSON.stringify(messages),
        };
        if (systemPrompt) {
            args.system_prompt = systemPrompt;
        }

        // AI chat not implemented yet
        const res = { message: { text: 'AI chat chưa được cài đặt.' } };
        return res?.message?.text || '';
    }
}

export const AiService = new AiServiceClass();
export default AiService;
