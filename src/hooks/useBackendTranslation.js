/**
 * useBackendTranslation Hook
 *
 * Fetches field label translations from ERPNext backend via TranslationService.
 * Uses React Query for caching and automatic refetch on language change.
 *
 * Usage:
 *   const { translateLabel, isLoading } = useBackendTranslation();
 *   const translated = translateLabel("Tên nhà cung cấp"); // -> "Supplier Name" (in English)
 */

import { useQuery } from '@tanstack/react-query';
import useLanguageStore from '../stores/useLanguageStore';
import { TranslationService } from '../api/domains/translationService';

/**
 * Hook that loads backend translations for the current language
 * and provides a translateLabel function.
 *
 * @returns {{ translateLabel: (text: string) => string, isLoading: boolean }}
 */
export function useBackendTranslation() {
    const { language } = useLanguageStore();

    // Fetch backend translations when language changes
    // Vietnamese is the source language, so skip fetching for 'vi'
    const { data: translations, isLoading } = useQuery({
        queryKey: ['backendTranslations', language],
        queryFn: () => TranslationService.fetchTranslations(language),
        enabled: !!language && language !== 'vi',
        staleTime: 30 * 60 * 1000,  // 30 minutes
        gcTime: 30 * 60 * 1000,     // 30 minutes
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        retry: 1,
    });

    /**
     * Translate a Vietnamese label to the current language.
     * Falls back to the original text if no translation is found.
     *
     * @param {string} text - Source text (typically a Vietnamese field label)
     * @returns {string} - Translated text or original
     */
    const translateLabel = (text) => {
        if (!text || language === 'vi') {
            return text;
        }

        // Check loaded translations from React Query cache
        if (translations && translations[text]) {
            return translations[text];
        }

        // Fallback: check TranslationService in-memory cache directly
        // (covers cases where data was fetched outside React Query)
        return TranslationService.getTranslation(text, language);
    };

    return {
        translateLabel,
        isLoading: language !== 'vi' && isLoading,
    };
}

export default useBackendTranslation;
