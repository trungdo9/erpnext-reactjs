import useLanguageStore, { LANGUAGES } from '../stores/useLanguageStore';
import { useBackendTranslation } from './useBackendTranslation';

/**
 * Translation hook with multi-language support
 * Uses LanguageContext for current language and translations
 * Uses useBackendTranslation for field label translations from ERPNext backend
 */
export const useTranslation = () => {
    const { translations, language, setLanguage, availableLanguages } = useLanguageStore();
    const currentLanguage = LANGUAGES[language] || LANGUAGES['en'];
    const { translateLabel, isLoading: isBackendTranslationLoading } = useBackendTranslation();

    /**
     * Translate a key to the current language
     * Supports interpolation: t('key', { count: 5 }) -> "5 items"
     * Or: t('key', 'default', { count: 5 })
     */
    const t = (key, defaultValOrParams, params) => {
        // Smart detection: if second arg is object and no third arg, it's params
        let defaultVal = defaultValOrParams;
        let interpolationParams = params || {};

        if (typeof defaultValOrParams === 'object' && defaultValOrParams !== null && !params) {
            defaultVal = null;
            interpolationParams = defaultValOrParams;
        }

        let text = translations[key] || defaultVal || key;

        // Handle interpolation {param}
        if (interpolationParams && typeof text === 'string') {
            Object.entries(interpolationParams).forEach(([param, value]) => {
                text = text.replace(new RegExp(`\\{${param}\\}`, 'g'), value);
            });
        }

        return text;
    };

    /**
     * Get doctype label in current language
     */
    const getDoctypeLabel = (doctype) => {
        const spaceKey = `doctype.${doctype}`;
        const underscoreKey = `doctype.${doctype.replace(/ /g, '_')}`;
        return translations[spaceKey] || translations[underscoreKey] || doctype;
    };

    /**
     * Translate a field label from ERPNext metadata.
     * Priority:
     * 1. Frontend locale files (field.{fieldname} key)
     * 2. Backend translations cache (Vietnamese -> target language)
     * 3. Original label as fallback
     *
     * @param {string} label - The field label (typically Vietnamese from ERPNext)
     * @param {string} [fieldname] - Optional fieldname for frontend locale lookup
     * @returns {string} - Translated label
     */
    const getFieldLabel = (label, fieldname) => {
        if (!label) return label;

        // Priority 1: Check frontend locale files with field.{fieldname} key (ALL languages)
        if (fieldname) {
            const localeKey = `field.${fieldname}`;
            if (translations[localeKey]) {
                return translations[localeKey];
            }
        }

        // For Vietnamese, return as-is after locale check (source language)
        if (language === 'vi') return label;

        // Priority 2: Check backend translations (Vietnamese label -> translated label)
        const backendTranslation = translateLabel(label);
        if (backendTranslation !== label) {
            return backendTranslation;
        }

        // Priority 3: Fall back to original label
        return label;
    };

    /**
     * Translate a widget label (Number Card, Shortcut, Quick List, etc.)
     * These labels come from ERPNext Workspace configuration and are often Vietnamese.
     * Priority:
     * 1. Frontend locale files (widget.label.{label} key)
     * 2. Backend translations cache (Vietnamese -> target language)
     * 3. Original label as fallback
     */
    const getWidgetLabel = (label) => {
        if (!label) return label;

        // Priority 1: Check frontend locale with widget.label.{label} key
        const localeKey = `widget.label.${label}`;
        if (translations[localeKey]) {
            return translations[localeKey];
        }

        // Priority 2: Check doctype.{label} key (covers standard ERPNext doctypes)
        const dtKey = `doctype.${label}`;
        const dtKeyUnderscore = `doctype.${label.replace(/ /g, '_')}`;
        if (translations[dtKey]) return translations[dtKey];
        if (translations[dtKeyUnderscore]) return translations[dtKeyUnderscore];

        // For Vietnamese, return as-is (custom workspace labels are already Vietnamese)
        if (language === 'vi') return label;

        // Priority 3: Check backend translations
        const backendTranslation = translateLabel(label);
        if (backendTranslation !== label) {
            return backendTranslation;
        }

        // Priority 4: Fall back to original
        return label;
    };

    return {
        t,
        translateLabel,
        getDoctypeLabel,
        getFieldLabel,
        getWidgetLabel,
        language,
        setLanguage,
        currentLanguage,
        availableLanguages,
        isBackendTranslationLoading,
    };
};
