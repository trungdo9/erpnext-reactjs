/**
 * Request Queue
 *
 * Manages offline requests and syncs when online.
 * Features:
 * - Queue requests when offline
 * - Persist queue to localStorage
 * - Process queue when back online
 * - Conflict resolution (last-write-wins + dedup)
 * - Max queue size to prevent localStorage overflow
 */

const STORAGE_KEY = 'erp_request_queue';
const MAX_QUEUE_SIZE = 200;
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Request Queue class
 */
export class RequestQueue {
    constructor() {
        this.queue = [];
        this.isOnline = navigator.onLine;
        this.isProcessing = false;
        this.listeners = new Set();

        // Load persisted queue
        this.loadFromStorage();

        // Evict stale entries on startup
        this.evictStale();

        // Listen for online/offline events
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    /**
     * Build a conflict key for deduplication.
     * Multiple updates to the same doc collapse into the latest one.
     */
    _conflictKey(request) {
        const { endpoint, data } = request;
        // Frappe update/set_value calls include doctype+name
        const doctype = data?.doctype || '';
        const name = data?.name || '';
        if (doctype && name) return `${endpoint}:${doctype}:${name}`;
        return null; // non-dedup-able
    }

    /**
     * Add a request to the queue (with last-write-wins conflict resolution)
     */
    enqueue(request) {
        const queuedRequest = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            status: 'pending',
            retries: 0,
            ...request,
        };

        // Conflict resolution: if a pending request targets the same doc,
        // replace it (last-write-wins) instead of queuing a duplicate.
        const key = this._conflictKey(queuedRequest);
        if (key) {
            const existingIdx = this.queue.findIndex(
                r => r.status === 'pending' && this._conflictKey(r) === key
            );
            if (existingIdx > -1) {
                const old = this.queue[existingIdx];
                queuedRequest.replacedId = old.id;
                this.queue[existingIdx] = queuedRequest;
                this.saveToStorage();
                this.notifyListeners('replaced', { old, new: queuedRequest });
                return queuedRequest.id;
            }
        }

        // Enforce max queue size — drop oldest pending
        if (this.queue.length >= MAX_QUEUE_SIZE) {
            const oldestPending = this.queue.findIndex(r => r.status === 'pending');
            if (oldestPending > -1) {
                const dropped = this.queue.splice(oldestPending, 1)[0];
                this.notifyListeners('dropped', dropped);
            }
        }

        this.queue.push(queuedRequest);
        this.saveToStorage();
        this.notifyListeners('enqueue', queuedRequest);

        // Try to process immediately if online
        if (this.isOnline && !this.isProcessing) {
            this.processQueue();
        }

        return queuedRequest.id;
    }

    /**
     * Remove entries older than MAX_AGE_MS
     */
    evictStale() {
        const now = Date.now();
        const before = this.queue.length;
        this.queue = this.queue.filter(r => (now - r.timestamp) < MAX_AGE_MS);
        if (this.queue.length < before) {
            this.saveToStorage();
        }
    }

    /**
     * Remove a request from the queue
     */
    dequeue(id) {
        const index = this.queue.findIndex(r => r.id === id);
        if (index > -1) {
            const removed = this.queue.splice(index, 1)[0];
            this.saveToStorage();
            this.notifyListeners('dequeue', removed);
            return removed;
        }
        return null;
    }

    /**
     * Get queue length
     */
    get length() {
        return this.queue.length;
    }

    /**
     * Get pending requests
     */
    getPending() {
        return this.queue.filter(r => r.status === 'pending');
    }

    /**
     * Get failed requests
     */
    getFailed() {
        return this.queue.filter(r => r.status === 'failed');
    }

    /**
     * Handle coming online
     */
    handleOnline() {
        this.isOnline = true;
        this.notifyListeners('online', null);

        // Process queue
        if (this.queue.length > 0) {
            this.processQueue();
        }
    }

    /**
     * Handle going offline
     */
    handleOffline() {
        this.isOnline = false;
        this.notifyListeners('offline', null);
    }

    /**
     * Process the queue
     */
    async processQueue() {
        if (this.isProcessing || !this.isOnline) return;

        this.isProcessing = true;
        this.notifyListeners('processing:start', null);

        const pending = this.getPending();

        for (const request of pending) {
            try {
                // Execute the request
                request.status = 'processing';
                await this.executeRequest(request);

                // Mark as completed and remove
                request.status = 'completed';
                this.dequeue(request.id);
                this.notifyListeners('success', request);

            } catch (error) {
                request.retries++;
                request.lastError = error.message;

                if (request.retries >= 3) {
                    request.status = 'failed';
                    this.notifyListeners('failed', request);
                } else {
                    request.status = 'pending';
                }
            }
        }

        this.saveToStorage();
        this.isProcessing = false;
        this.notifyListeners('processing:end', null);
    }

    /**
     * Execute a queued request
     * This should be overridden by the API client
     */
    async executeRequest(request) {
        // Default implementation - override this
        const { method, endpoint, data } = request;

        const response = await fetch(endpoint, {
            method: method || 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: data ? JSON.stringify(data) : undefined,
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
    }

    /**
     * Set custom request executor
     */
    setExecutor(executor) {
        this.executeRequest = executor;
    }

    /**
     * Subscribe to queue events
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    /**
     * Notify all listeners
     */
    notifyListeners(event, data) {
        for (const listener of this.listeners) {
            try {
                listener(event, data);
            } catch (e) {
                console.error('Queue listener error:', e);
            }
        }
    }

    /**
     * Save queue to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            console.warn('Failed to persist queue:', e);
        }
    }

    /**
     * Load queue from localStorage
     */
    loadFromStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                this.queue = JSON.parse(data);
                // Reset processing status on load
                this.queue.forEach(r => {
                    if (r.status === 'processing') {
                        r.status = 'pending';
                    }
                });
            }
        } catch (e) {
            console.warn('Failed to load queue from storage:', e);
            this.queue = [];
        }
    }

    /**
     * Clear the queue
     */
    clear() {
        this.queue = [];
        this.saveToStorage();
        this.notifyListeners('clear', null);
    }

    /**
     * Retry failed requests
     */
    retryFailed() {
        const failed = this.getFailed();
        for (const request of failed) {
            request.status = 'pending';
            request.retries = 0;
        }
        this.saveToStorage();

        if (this.isOnline) {
            this.processQueue();
        }
    }

    /**
     * Destroy the queue
     */
    destroy() {
        window.removeEventListener('online', this.handleOnline);
        window.removeEventListener('offline', this.handleOffline);
        this.listeners.clear();
    }
}

export default RequestQueue;
