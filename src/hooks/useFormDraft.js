import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from '../utils/apiUtils';
import { formatDateTime } from '../utils/dateUtils';

/**
 * Key prefix for localStorage draft storage
 */
const DRAFT_PREFIX = 'form_draft_';

/**
 * Hook for auto-saving form drafts to localStorage
 *
 * @param {string} doctype - Document type
 * @param {string} docname - Document name (use 'new' for new documents)
 * @param {Object} options - Configuration options
 * @returns {Object} Draft management methods
 *
 * @example
 * function MyForm({ doctype, docname }) {
 *   const [formData, setFormData] = useState({});
 *   const { hasDraft, loadDraft, clearDraft } = useFormDraft(doctype, docname, {
 *     data: formData,
 *     onLoad: (draft) => setFormData(draft),
 *     autoSave: true,
 *     debounceMs: 1000,
 *   });
 *
 *   return (
 *     <div>
 *       {hasDraft && (
 *         <button onClick={loadDraft}>Restore draft</button>
 *       )}
 *       <form>...</form>
 *     </div>
 *   );
 * }
 */
export function useFormDraft(doctype, docname, options = {}) {
    const {
        data = {},
        onLoad,
        autoSave = true,
        debounceMs = 2000,
        excludeFields = ['name', 'modified', 'creation', 'owner', 'docstatus'],
    } = options;

    const [hasDraft, setHasDraft] = useState(false);
    const [draftTimestamp, setDraftTimestamp] = useState(null);
    const isInitialMount = useRef(true);

    // Generate storage key
    const storageKey = `${DRAFT_PREFIX}${doctype}_${docname || 'new'}`;

    /**
     * Save draft to localStorage
     */
    const saveDraft = useCallback((dataToSave) => {
        try {
            // Filter out excluded fields
            const filteredData = { ...dataToSave };
            excludeFields.forEach(field => delete filteredData[field]);

            // Don't save empty drafts
            if (Object.keys(filteredData).length === 0) {
                return;
            }

            const draft = {
                data: filteredData,
                timestamp: Date.now(),
                doctype,
                docname,
            };

            localStorage.setItem(storageKey, JSON.stringify(draft));
            setHasDraft(true);
            setDraftTimestamp(draft.timestamp);

            if (import.meta.env.DEV) {
                console.log('[FormDraft] Saved draft:', storageKey);
            }
        } catch (error) {
            console.warn('[FormDraft] Failed to save draft:', error);
        }
    }, [storageKey, doctype, docname, excludeFields]);

    /**
     * Debounced save for auto-save
     */
    const debouncedSave = useMemo(
        () => debounce((data) => saveDraft(data), debounceMs),
        [saveDraft, debounceMs]
    );

    /**
     * Load draft from localStorage
     */
    const loadDraft = useCallback(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) return null;

            const draft = JSON.parse(stored);

            if (onLoad) {
                onLoad(draft.data);
            }

            if (import.meta.env.DEV) {
                console.log('[FormDraft] Loaded draft:', draft);
            }

            return draft.data;
        } catch (error) {
            console.warn('[FormDraft] Failed to load draft:', error);
            return null;
        }
    }, [storageKey, onLoad]);

    /**
     * Clear draft from localStorage
     */
    const clearDraft = useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            setHasDraft(false);
            setDraftTimestamp(null);

            if (import.meta.env.DEV) {
                console.log('[FormDraft] Cleared draft:', storageKey);
            }
        } catch (error) {
            console.warn('[FormDraft] Failed to clear draft:', error);
        }
    }, [storageKey]);

    /**
     * Get draft info without loading
     */
    const getDraftInfo = useCallback(() => {
        try {
            const stored = localStorage.getItem(storageKey);
            if (!stored) return null;

            const draft = JSON.parse(stored);
            return {
                timestamp: draft.timestamp,
                age: Date.now() - draft.timestamp,
                formattedTime: formatDateTime(new Date(draft.timestamp)),
            };
        } catch {
            return null;
        }
    }, [storageKey]);

    // Check for existing draft on mount
    /* eslint-disable react-hooks/set-state-in-effect */
    useEffect(() => {
        const info = getDraftInfo();
        if (info) {
            setHasDraft(true);
            setDraftTimestamp(info.timestamp);
        }
    }, [getDraftInfo]);
    /* eslint-enable react-hooks/set-state-in-effect */

    // Auto-save when data changes
    useEffect(() => {
        // Skip initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (autoSave && data && Object.keys(data).length > 0) {
            debouncedSave(data);
        }

        return () => {
            debouncedSave.cancel?.();
        };
    }, [data, autoSave, debouncedSave]);

    return {
        hasDraft,
        draftTimestamp,
        saveDraft,
        loadDraft,
        clearDraft,
        getDraftInfo,
    };
}

/**
 * Clear all form drafts (useful for cleanup)
 */
export function clearAllDrafts() {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(DRAFT_PREFIX)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));

    if (import.meta.env.DEV) {
        console.log('[FormDraft] Cleared all drafts:', keysToRemove.length);
    }

    return keysToRemove.length;
}

/**
 * Get all stored drafts
 */
export function getAllDrafts() {
    const drafts = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(DRAFT_PREFIX)) {
            try {
                const draft = JSON.parse(localStorage.getItem(key));
                drafts.push({
                    key,
                    ...draft,
                });
            } catch {
                // Ignore invalid entries
            }
        }
    }

    return drafts.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Clean up old drafts (older than specified days)
 */
export function cleanupOldDrafts(maxAgeDays = 7) {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cleaned = 0;

    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith(DRAFT_PREFIX)) {
            try {
                const draft = JSON.parse(localStorage.getItem(key));
                if (now - draft.timestamp > maxAgeMs) {
                    localStorage.removeItem(key);
                    cleaned++;
                }
            } catch {
                // Remove invalid entries
                localStorage.removeItem(key);
                cleaned++;
            }
        }
    }

    if (import.meta.env.DEV && cleaned > 0) {
        console.log('[FormDraft] Cleaned up old drafts:', cleaned);
    }

    return cleaned;
}

export default useFormDraft;
