const CACHE_PREFIX = 'futmondo_cache_';
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

export const apiCache = {
    /**
     * Get data from cache
     */
    get: (key) => {
        try {
            const itemStr = localStorage.getItem(CACHE_PREFIX + key);
            if (!itemStr) return null;

            const item = JSON.parse(itemStr);
            const now = Date.now();

            if (now > item.expiry) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }

            return item.value;
        } catch (error) {
            return null;
        }
    },

    /**
     * Set data to cache with quota management
     */
    set: (key, value, ttl = DEFAULT_TTL) => {
        const fullKey = CACHE_PREFIX + key;
        const now = Date.now();
        const item = {
            value: value,
            expiry: now + ttl,
            createdAt: now // Added to track age
        };

        try {
            localStorage.setItem(fullKey, JSON.stringify(item));
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || error.code === 22) {
                console.warn('Cache quota exceeded, pruning...');
                apiCache.prune(30); // Remove more items when quota hit

                // Try again after pruning
                try {
                    localStorage.setItem(fullKey, JSON.stringify(item));
                } catch (retryError) {
                    // Last resort: clear all cache
                    console.warn('Still over quota after pruning, clearing all cache...');
                    apiCache.clear();
                    try {
                        localStorage.setItem(fullKey, JSON.stringify(item));
                    } catch (finalError) {
                        console.error('Cache write failed completely:', finalError);
                    }
                }
            } else {
                console.warn('Cache write error:', error);
            }
        }
    },

    /**
     * Prune expired items and then oldest items if still near limit
     */
    prune: (itemsToRemove = 20) => {
        try {
            const now = Date.now();
            const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));

            // 1. Remove expired items
            keys.forEach(k => {
                try {
                    const item = JSON.parse(localStorage.getItem(k));
                    if (!item || now > item.expiry) {
                        localStorage.removeItem(k);
                    }
                } catch (e) {
                    localStorage.removeItem(k);
                }
            });

            // 2. Remove oldest items if we have many
            const updatedKeys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
            if (updatedKeys.length > 40) {
                const items = [];
                updatedKeys.forEach(k => {
                    try {
                        const data = JSON.parse(localStorage.getItem(k));
                        items.push({ key: k, createdAt: data?.createdAt || 0 });
                    } catch (e) {
                        items.push({ key: k, createdAt: 0 });
                    }
                });

                // Sort by createdAt ascending (oldest first)
                items.sort((a, b) => a.createdAt - b.createdAt);

                // Remove oldest items
                items.slice(0, itemsToRemove).forEach(item => {
                    localStorage.removeItem(item.key);
                });
            }
        } catch (error) {
            console.error('Error during cache pruning:', error);
        }
    },

    /**
     * Clear all specific application cache
     */
    clear: () => {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    }
};
