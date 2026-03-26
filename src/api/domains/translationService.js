/**
 * Translation Service
 *
 * Fetches field label translations from ERPNext backend.
 * ERPNext stores translations for all UI strings (including field labels)
 * which are returned as { "source_text": "translated_text" } mappings.
 *
 * Provides in-memory caching per language to avoid repeated API calls.
 */

import { apiClient } from '../gateway';

/**
 * In-memory translation cache: { [lang]: { [sourceText]: translatedText } }
 */
const translationCache = new Map();

/**
 * Track in-flight requests to avoid duplicate fetches for the same language
 */
const pendingRequests = new Map();

/**
 * Translation Service class
 */
class TranslationServiceClass {
    /**
     * Fetch all translations for a given language from ERPNext backend
     * @param {string} lang - Language code (e.g., 'en', 'km', 'zh')
     * @returns {Promise<object>} - Map of { sourceText: translatedText }
     */
    async fetchTranslations(lang) {
        // Vietnamese is the source language - no translation needed
        if (!lang || lang === 'vi') {
            return {};
        }

        // Return cached translations if available
        if (translationCache.has(lang)) {
            return translationCache.get(lang);
        }

        // Deduplicate concurrent requests for the same language
        if (pendingRequests.has(lang)) {
            return pendingRequests.get(lang);
        }

        const request = this._doFetch(lang);
        pendingRequests.set(lang, request);

        try {
            const result = await request;
            return result;
        } finally {
            pendingRequests.delete(lang);
        }
    }

    /**
     * Internal: perform the actual API call
     * Fetches from Translation DocType directly (get_all_translations reads compiled files only)
     * @param {string} lang
     * @returns {Promise<object>}
     */
    async _doFetch(lang) {
        try {
            const result = await apiClient.post(
                'frappe.client.get_list',
                {
                    doctype: 'Translation',
                    filters: { language: lang },
                    fields: ['source_text', 'translated_text'],
                    limit_page_length: 0,
                }
            );

            // Convert array to { "source_text": "translated_text" } map
            const list = result?.message || result || [];
            const translations = {};
            for (const row of list) {
                if (row.source_text && row.translated_text) {
                    translations[row.source_text] = row.translated_text;
                }
            }

            // Cache the result
            translationCache.set(lang, translations);

            return translations;
        } catch (error) {
            // On failure, cache an empty object to avoid repeated failed requests
            // The cache can be invalidated manually to retry
            console.warn(`[TranslationService] Failed to fetch translations for "${lang}":`, error);
            translationCache.set(lang, {});
            return {};
        }
    }

    /**
     * Get translation for a specific text in a given language
     * @param {string} text - Source text (Vietnamese label)
     * @param {string} lang - Target language code
     * @returns {string} - Translated text, or original text if no translation found
     */
    getTranslation(text, lang) {
        if (!text || !lang || lang === 'vi') {
            return text;
        }

        const langCache = translationCache.get(lang);
        if (!langCache) {
            return text;
        }

        return langCache[text] || text;
    }

    /**
     * Check if translations are loaded for a language
     * @param {string} lang
     * @returns {boolean}
     */
    isLoaded(lang) {
        return translationCache.has(lang);
    }

    /**
     * Invalidate cached translations for a language (or all languages)
     * @param {string} [lang] - Specific language to invalidate, or all if omitted
     */
    invalidate(lang) {
        if (lang) {
            translationCache.delete(lang);
        } else {
            translationCache.clear();
        }
    }
}

// Export singleton
export const TranslationService = new TranslationServiceClass();
export default TranslationService;
