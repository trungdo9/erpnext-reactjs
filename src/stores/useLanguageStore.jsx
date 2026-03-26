/**
 * Language Store - Zustand
 *
 * Manages language/locale state and translations.
 * Replaces LanguageContext.jsx.
 *
 * Usage:
 * import useLanguageStore from '../stores/useLanguageStore';
 * const { language, setLanguage, translations } = useLanguageStore();
 */

import { create } from 'zustand';

// SVG Flag components
export const FLAGS = {
    vi: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" className="w-6 h-4">
            <rect width="30" height="20" fill="#DA251D" />
            <polygon points="15,4 11.5,13 18.5,7.5 11.5,7.5 18.5,13" fill="#FFFF00" />
        </svg>
    ),
    en: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-6 h-4">
            <clipPath id="s"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
            <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" /></clipPath>
            <g clipPath="url(#s)">
                <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#t)" stroke="#C8102E" strokeWidth="4" />
                <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
            </g>
        </svg>
    ),
    km: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" className="w-6 h-4">
            <rect width="30" height="5" fill="#032EA1" />
            <rect y="5" width="30" height="10" fill="#E00025" />
            <rect y="15" width="30" height="5" fill="#032EA1" />
            <rect x="10" y="6" width="10" height="8" fill="#fff" />
        </svg>
    ),
    zh: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" className="w-6 h-4">
            <rect width="30" height="20" fill="#DE2910" />
            <g fill="#FFDE00">
                <polygon points="5,3.5 5.9,6.3 3,4.5 7,4.5 4.1,6.3" />
                <polygon points="9,1.5 9.4,2.7 8.2,2 9.8,2 8.6,2.7" />
                <polygon points="11,3.5 11.4,4.7 10.2,4 11.8,4 10.6,4.7" />
                <polygon points="11,6.5 11.4,7.7 10.2,7 11.8,7 10.6,7.7" />
                <polygon points="9,8.5 9.4,9.7 8.2,9 9.8,9 8.6,9.7" />
            </g>
        </svg>
    ),
    lo: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 20" className="w-6 h-4">
            <rect width="30" height="5" fill="#CE1126" />
            <rect y="5" width="30" height="10" fill="#002868" />
            <rect y="15" width="30" height="5" fill="#CE1126" />
            <circle cx="15" cy="10" r="3.5" fill="#FFFFFF" />
        </svg>
    ),
};

// Supported languages
export const LANGUAGES = {
    vi: { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', order: 1 },
    en: { code: 'en', name: 'English', nativeName: 'English', order: 2 },
    km: { code: 'km', name: 'Khmer', nativeName: 'ភាសាខ្មែរ', order: 3 },
    zh: { code: 'zh', name: 'Chinese', nativeName: '中文', order: 4 },
    lo: { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', order: 5 },
};

const STORAGE_KEY = 'erp_language';
const DEFAULT_LANGUAGE = 'en';

const getInitialLanguage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored && LANGUAGES[stored] ? stored : DEFAULT_LANGUAGE;
    } catch {
        return DEFAULT_LANGUAGE;
    }
};

const translationCache = new Map();

const useLanguageStore = create((set, get) => ({
    language: getInitialLanguage(),
    translations: {},
    isLoading: true,

    // Computed
    get currentLanguage() {
        return LANGUAGES[get().language] || LANGUAGES[DEFAULT_LANGUAGE];
    },

    availableLanguages: Object.values(LANGUAGES).sort((a, b) => a.order - b.order),
    flags: FLAGS,

    // Actions
    setLanguage: (lang) => {
        if (!LANGUAGES[lang]) return;
        set({ language: lang });
        try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
        document.documentElement.lang = lang;
        get().loadTranslations(lang);
    },

    loadTranslations: async (lang) => {
        const targetLang = lang || get().language;

        // Use cache if available
        if (translationCache.has(targetLang)) {
            set({ translations: translationCache.get(targetLang), isLoading: false });
            return;
        }

        set({ isLoading: true });
        try {
            const module = await import(`../locales/${targetLang}.js`);
            const translations = module.default || module[targetLang] || {};
            translationCache.set(targetLang, translations);
            set({ translations, isLoading: false });
        } catch {
            console.warn(`Failed to load translations for ${targetLang}, falling back to Vietnamese`);
            try {
                const viModule = await import('../locales/vi.js');
                const translations = viModule.default || viModule.vi || {};
                translationCache.set('vi', translations);
                set({ translations, isLoading: false });
            } catch {
                set({ isLoading: false });
            }
        }
    },

    /**
     * Prefetch all locale chunks in the background.
     * Call this when user opens the language selector for instant switching.
     */
    prefetchAllLanguages: () => {
        Object.keys(LANGUAGES).forEach((lang) => {
            if (!translationCache.has(lang)) {
                import(`../locales/${lang}.js`).then((module) => {
                    translationCache.set(lang, module.default || module[lang] || {});
                }).catch(() => { /* silently ignore */ });
            }
        });
    },
}));

// Load initial translations and set initial HTML lang attribute
document.documentElement.lang = useLanguageStore.getState().language;
useLanguageStore.getState().loadTranslations();

export default useLanguageStore;

