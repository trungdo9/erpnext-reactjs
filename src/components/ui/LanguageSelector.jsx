import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import useLanguageStore, { FLAGS, LANGUAGES } from '../../stores/useLanguageStore';
import { cn } from '../../lib/utils';

/**
 * Language Selector Dropdown
 * Displays current language flag and allows switching between languages
 */
const LanguageSelector = ({ className, variant = 'default' }) => {
    const { language, setLanguage, availableLanguages } = useLanguageStore();
    const currentLanguage = LANGUAGES[language] || LANGUAGES['en'];
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (langCode) => {
        setLanguage(langCode);
        setIsOpen(false);
    };

    const handleToggle = () => {
        const willOpen = !isOpen;
        setIsOpen(willOpen);
        // Prefetch all locale chunks when opening dropdown for instant switching
        if (willOpen) {
            useLanguageStore.getState().prefetchAllLanguages();
        }
    };

    const variants = {
        default: {
            button: 'h-9 px-3 bg-background border border-input hover:bg-accent hover:border-accent-foreground/20',
            dropdown: 'bg-background border border-input shadow-lg',
            item: 'hover:bg-accent',
        },
        ghost: {
            button: 'h-9 px-3 bg-transparent hover:bg-accent/50',
            dropdown: 'bg-background border border-border/50 shadow-xl',
            item: 'hover:bg-accent/50',
        },
        minimal: {
            button: 'h-8 px-2 bg-transparent hover:bg-white/10',
            dropdown: 'bg-card border border-white/10 shadow-xl',
            item: 'hover:bg-white/10 text-white',
        },
    };

    const style = variants[variant] || variants.default;

    return (
        <div ref={dropdownRef} className={cn('relative inline-block', className)}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={handleToggle}
                className={cn(
                    'flex items-center gap-2 rounded-lg text-sm font-medium transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary/30',
                    style.button
                )}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                aria-label="Select language"
            >
                <span className="leading-none">{FLAGS[language]}</span>
                <span className="hidden sm:inline text-foreground">{currentLanguage.code.toUpperCase()}</span>
                <svg
                    className={cn(
                        'w-4 h-4 text-muted-foreground transition-transform',
                        isOpen && 'rotate-180'
                    )}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div
                    className={cn(
                        'absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50',
                        'animate-in fade-in slide-in-from-top-2 duration-200',
                        style.dropdown
                    )}
                    role="listbox"
                    aria-label="Available languages"
                >
                    <div className="py-1">
                        {availableLanguages.map((lang) => (
                            <button
                                key={lang.code}
                                type="button"
                                onClick={() => handleSelect(lang.code)}
                                className={cn(
                                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                                    language === lang.code && 'bg-primary/10 text-primary',
                                    style.item
                                )}
                                role="option"
                                aria-selected={language === lang.code}
                            >
                                <span>{FLAGS[lang.code]}</span>
                                <div className="flex-1 text-left">
                                    <span className="font-medium">{lang.nativeName}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">
                                        ({lang.name})
                                    </span>
                                </div>
                                {language === lang.code && (
                                    <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

LanguageSelector.propTypes = {
    className: PropTypes.string,
    variant: PropTypes.oneOf(['default', 'ghost', 'minimal']),
};

export default LanguageSelector;
