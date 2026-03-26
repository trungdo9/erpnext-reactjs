import { useState, useEffect, useRef } from "react";
import { SearchService } from "../../api/domains";
import { Loader2, ChevronDown } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

export default function Autocomplete({ doctype, value, onChange, placeholder, className, inputClassName }) {
    const { t } = useTranslation();
    const [query, setQuery] = useState(value || "");
    const [results, setResults] = useState([]);
    const [show, setShow] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const wrapperRef = useRef();

    // Sync internal query when value prop changes (e.g. initial load or reset)
    useEffect(() => {
        setQuery(value || "");
    }, [value]);

    useEffect(() => {
        const delay = setTimeout(async () => {
            if (!doctype) return;

            setIsLoading(true);
            try {
                const res = await SearchService.searchLink(doctype, query || "");
                const list = Array.isArray(res) ? res : (res.results || res.message || []);
                setResults(list);
                setShow(true);
            } catch (e) {
                console.error("Link search failed", e);
                setResults([]);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(delay);
    }, [query, doctype]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!wrapperRef.current?.contains(e.target)) {
                setShow(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    const handleSelect = (item) => {
        const val = item.value || item;
        onChange(val);
        setQuery(val);
        setShow(false);
    };

    const handleFocus = async () => {
        setShow(true);
        if (results.length === 0 && !isLoading) {
            setIsLoading(true);
            try {
                const res = await SearchService.searchLink(doctype, query || "");
                const list = Array.isArray(res) ? res : (res.results || res.message || []);
                setResults(list);
            } catch (e) {
                console.error("Link search failed", e);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className={`relative ${className || ''}`} ref={wrapperRef}>
            <div className="relative">
                <input
                    type="text"
                    className={`w-full h-11 px-4 pr-10 border border-input bg-background rounded-lg text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-0 transition-colors duration-200 ${inputClassName || ''}`}
                    value={query}
                    placeholder={placeholder || t('link.select', { label: doctype })}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={handleFocus}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                    {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                </div>
            </div>

            {show && (
                <ul className="absolute z-50 bg-popover border border-border w-full max-h-64 overflow-y-auto shadow-xl rounded-lg mt-1">
                    {isLoading ? (
                        <li className="px-4 py-3 text-base text-muted-foreground text-center">
                            {t('common.loading')}
                        </li>
                    ) : results.length > 0 ? (
                        results.map((item, idx) => {
                            const val = item.value || item;
                            const desc = item.description;

                            return (
                                <li
                                    key={val + idx}
                                    className="px-4 py-3 hover:bg-accent cursor-pointer border-b border-border last:border-0 transition-colors duration-200"
                                    onClick={() => handleSelect(item)}
                                >
                                    <div className="font-medium text-base text-foreground">{val}</div>
                                    {desc && (
                                        <div className="text-sm text-muted-foreground mt-0.5">{desc}</div>
                                    )}
                                </li>
                            );
                        })
                    ) : (
                        <li className="px-4 py-3 text-base text-muted-foreground text-center">
                            {query ? t('autocomplete.no_results') : t('autocomplete.type_to_search')}
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
