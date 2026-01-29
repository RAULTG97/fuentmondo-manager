const CACHE_PREFIX = 'futmondo_cache_';
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes

export const apiCache = {
    /**
     * Get data from cache
     * @param {string} key 
     * @returns {any|null}
     */
    get: (key) => {
        try {
            const itemStr = localStorage.getItem(CACHE_PREFIX + key);
            if (!itemStr) return null;

            const item = JSON.parse(itemStr);
            const now = new Date().getTime();

            // Check if expired
            if (now > item.expiry) {
                localStorage.removeItem(CACHE_PREFIX + key);
                return null;
            }

            return item.value;
        } catch (error) {
            console.warn('Cache error:', error);
            return null;
        }
    },

    /**
     * Set data to cache
     * @param {string} key 
     * @param {any} value 
     * @param {number} ttl - Time to live in ms 
     */
    set: (key, value, ttl = DEFAULT_TTL) => {
        try {
            const now = new Date().getTime();
            const item = {
                value: value,
                expiry: now + ttl
            };
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
        } catch (error) {
            console.warn('Cache write error (quota exceeded?):', error);
            // Optionally clear old cache items here if needed
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
