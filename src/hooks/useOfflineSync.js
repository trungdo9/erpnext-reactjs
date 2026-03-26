/**
 * useOfflineSync Hook
 *
 * Manages offline data persistence and background sync.
 * Uses IndexedDB for local storage, syncs to ERPNext when online.
 *
 * Usage:
 * const { saveOffline, syncAll, syncStatus, pendingCount } = useOfflineSync();
 *
 * // Save document offline (works with or without network)
 * await saveOffline('Work Order', formData, 'create');
 *
 * // Manual sync trigger
 * await syncAll();
 */

import { useCallback, useEffect, useRef } from 'react';
import { useNetworkStore } from '../stores';

// ===== IndexedDB Setup =====

const DB_NAME = 'erp-offline';
const DB_VERSION = 1;

const STORES = {
    SYNC_QUEUE: 'sync_queue',
    DOCUMENTS: 'documents',
    METADATA: 'metadata',
    ATTACHMENTS: 'attachments',
};

/**
 * Open IndexedDB connection
 */
const openDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Sync queue - pending mutations
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                syncStore.createIndex('status', 'status', { unique: false });
                syncStore.createIndex('doctype', 'doctype', { unique: false });
                syncStore.createIndex('priority', 'priority', { unique: false });
                syncStore.createIndex('created_at', 'created_at', { unique: false });
            }

            // Cached documents
            if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
                const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'key' });
                docStore.createIndex('doctype', 'doctype', { unique: false });
                docStore.createIndex('synced', 'synced', { unique: false });
            }

            // DocType metadata cache
            if (!db.objectStoreNames.contains(STORES.METADATA)) {
                db.createObjectStore(STORES.METADATA, { keyPath: 'doctype' });
            }

            // Offline attachments (photos, files)
            if (!db.objectStoreNames.contains(STORES.ATTACHMENTS)) {
                const attachStore = db.createObjectStore(STORES.ATTACHMENTS, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                attachStore.createIndex('document_key', 'document_key', { unique: false });
                attachStore.createIndex('synced', 'synced', { unique: false });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

/**
 * Generic IndexedDB transaction helper
 */
const dbTransaction = async (storeName, mode, callback) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const result = callback(store);

        if (result && result.onsuccess !== undefined) {
            result.onsuccess = () => resolve(result.result);
            result.onerror = () => reject(result.error);
        } else {
            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
        }
    });
};

// ===== Priority Levels =====
const PRIORITY = {
    CRITICAL: 1, // Financial, stock
    HIGH: 2, // Production records
    NORMAL: 3, // General data entry
    LOW: 4, // Preferences, drafts
};

// ===== Hook =====

export function useOfflineSync() {
    const isOnline = useNetworkStore((s) => s.isOnline);
    const isSyncing = useNetworkStore((s) => s.isSyncing);
    const pendingSyncCount = useNetworkStore((s) => s.pendingSyncCount);
    const syncProgress = useNetworkStore((s) => s.syncProgress);
    const {
        addToSyncQueue,
        removeFromSyncQueue,
        setSyncProgress,
        startSync,
        finishSync,
    } = useNetworkStore.getState();

    const syncLock = useRef(false);

    /**
     * Save a document offline (add to sync queue)
     */
    const saveOffline = useCallback(
        async (doctype, data, action = 'create', priority = PRIORITY.NORMAL) => {
            const entry = {
                doctype,
                data,
                action, // 'create' | 'update' | 'delete'
                priority,
                status: 'pending',
                retries: 0,
                max_retries: 5,
                created_at: new Date().toISOString(),
                error: null,
            };

            await dbTransaction(STORES.SYNC_QUEUE, 'readwrite', (store) => store.add(entry));
            addToSyncQueue();

            // Also cache the document locally for offline read
            const docKey = data.name ? `${doctype}:${data.name}` : `${doctype}:new_${Date.now()}`;
            await dbTransaction(STORES.DOCUMENTS, 'readwrite', (store) =>
                store.put({
                    key: docKey,
                    doctype,
                    data,
                    synced: false,
                    updated_at: new Date().toISOString(),
                })
            );

            // Try immediate sync if online
            if (isOnline && !syncLock.current) {
                syncAll();
            }

            return { success: true, offline: true, key: docKey };
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [isOnline, addToSyncQueue]
    );

    /**
     * Cache a document for offline reading
     */
    const cacheDocument = useCallback(async (doctype, name, data) => {
        const key = `${doctype}:${name}`;
        await dbTransaction(STORES.DOCUMENTS, 'readwrite', (store) =>
            store.put({
                key,
                doctype,
                data,
                synced: true,
                updated_at: new Date().toISOString(),
            })
        );
    }, []);

    /**
     * Get cached document (for offline read)
     */
    const getCachedDocument = useCallback(async (doctype, name) => {
        const key = `${doctype}:${name}`;
        return dbTransaction(STORES.DOCUMENTS, 'readonly', (store) => store.get(key));
    }, []);

    /**
     * Cache metadata for offline form rendering
     */
    const cacheMetadata = useCallback(async (doctype, metadata) => {
        await dbTransaction(STORES.METADATA, 'readwrite', (store) =>
            store.put({ doctype, ...metadata, cached_at: new Date().toISOString() })
        );
    }, []);

    /**
     * Get cached metadata
     */
    const getCachedMetadata = useCallback(async (doctype) => {
        return dbTransaction(STORES.METADATA, 'readonly', (store) => store.get(doctype));
    }, []);

    /**
     * Save attachment offline (photo, file)
     */
    const saveAttachmentOffline = useCallback(async (documentKey, file, fileType) => {
        // Convert File to ArrayBuffer for IndexedDB storage
        const buffer = await file.arrayBuffer();
        await dbTransaction(STORES.ATTACHMENTS, 'readwrite', (store) =>
            store.add({
                document_key: documentKey,
                file_name: file.name,
                file_type: fileType || file.type,
                file_size: file.size,
                data: buffer,
                synced: false,
                created_at: new Date().toISOString(),
            })
        );
    }, []);

    /**
     * Get all pending items in sync queue
     */
    const getPendingItems = useCallback(async () => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
            const store = tx.objectStore(STORES.SYNC_QUEUE);
            const index = store.index('status');
            const request = index.getAll('pending');
            request.onsuccess = () => {
                // Sort by priority (1=highest) then by created_at
                const items = request.result.sort((a, b) => {
                    if (a.priority !== b.priority) return a.priority - b.priority;
                    return new Date(a.created_at) - new Date(b.created_at);
                });
                resolve(items);
            };
            request.onerror = () => reject(request.error);
        });
    }, []);

    /**
     * Sync all pending items to server
     */
    const syncAll = useCallback(async () => {
        if (syncLock.current || !isOnline) return;
        syncLock.current = true;
        startSync();

        try {
            const pending = await getPendingItems();
            if (pending.length === 0) {
                finishSync();
                syncLock.current = false;
                return;
            }

            setSyncProgress(0, pending.length);
            const errors = [];

            for (let i = 0; i < pending.length; i++) {
                const item = pending[i];
                setSyncProgress(i + 1, pending.length);

                try {
                    await syncItem(item);
                    // Remove from queue on success
                    await dbTransaction(STORES.SYNC_QUEUE, 'readwrite', (store) =>
                        store.delete(item.id)
                    );
                    removeFromSyncQueue();
                } catch (err) {
                    // Increment retry, keep in queue
                    item.retries += 1;
                    item.error = err.message;

                    if (item.retries >= item.max_retries) {
                        item.status = 'failed';
                    }

                    await dbTransaction(STORES.SYNC_QUEUE, 'readwrite', (store) =>
                        store.put(item)
                    );
                    errors.push({ item, error: err.message });
                }
            }

            finishSync(errors);
        } catch (err) {
            finishSync([{ error: err.message }]);
        } finally {
            syncLock.current = false;
        }
    }, [isOnline, getPendingItems, startSync, finishSync, setSyncProgress, removeFromSyncQueue]);

    /**
     * Sync a single item to ERPNext via apiClient (retry + error interceptors)
     */
    const syncItem = async (item) => {
        const { apiClient } = await import('../api/gateway');
        const { doctype, data, action } = item;

        switch (action) {
            case 'create':
                return apiClient.createDoc(doctype, data);
            case 'update':
                return apiClient.updateDoc(doctype, data.name, data);
            case 'delete':
                return apiClient.deleteDoc(doctype, data.name);
            default:
                throw new Error(`Unknown sync action: ${action}`);
        }
    };

    // Auto-sync when coming back online
    useEffect(() => {
        if (isOnline && pendingSyncCount > 0 && !syncLock.current) {
            // Small delay to let connection stabilize
            const timer = setTimeout(() => syncAll(), 2000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, pendingSyncCount, syncAll]);

    return {
        // State
        isOnline,
        isSyncing,
        pendingSyncCount,
        syncProgress,

        // Actions
        saveOffline,
        syncAll,
        cacheDocument,
        getCachedDocument,
        cacheMetadata,
        getCachedMetadata,
        saveAttachmentOffline,
        getPendingItems,

        // Constants
        PRIORITY,
    };
}

export { PRIORITY, openDB, STORES };
export default useOfflineSync;
