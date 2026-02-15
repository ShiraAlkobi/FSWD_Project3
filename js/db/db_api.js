/**
 * Database API - Interface for LocalStorage operations
 */

const DB_API = {
    /**
     * Get data from LocalStorage
     */
    get: function(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error(`DB_API: Error getting data for key ${key}:`, e);
            return null;
        }
    },
    
    /**
     * Set data in LocalStorage
     */
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error(`DB_API: Error setting data for key ${key}:`, e);
            return false;
        }
    },
    
    /**
     * Remove data from LocalStorage
     */
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error(`DB_API: Error removing data for key ${key}:`, e);
            return false;
        }
    },
    
    /**
     * Check if key exists
     */
    exists: function(key) {
        return localStorage.getItem(key) !== null;
    },
    
    /**
     * Clear all data (use with caution!)
     */
    clearAll: function() {
        try {
            localStorage.clear();
            return true;
        } catch (e) {
            console.error('DB_API: Error clearing all data:', e);
            return false;
        }
    },
    
    /**
     * Initialize storage with default data if not exists
     */
    initialize: function(key, defaultValue) {
        if (!this.exists(key)) {
            return this.set(key, defaultValue);
        }
        return true;
    }
};

// Make DB_API globally available
if (typeof window !== 'undefined') {
    window.DB_API = DB_API;
}