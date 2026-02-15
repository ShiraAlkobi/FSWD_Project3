/**
 * Cookie Management Utilities
 * Handles setting, getting, and deleting cookies
 */

const CookieManager = {
    /**
     * Set a cookie
     * @param {string} name - Cookie name
     * @param {string} value - Cookie value
     * @param {number} days - Expiration in days (optional)
     * @param {object} options - Additional options (path, domain, secure, sameSite)
     */
    set: function(name, value, days = 7, options = {}) {
        let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
        
        // Set expiration
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            cookieString += `; expires=${date.toUTCString()}`;
        }
        
        // Set path (default to root)
        cookieString += `; path=${options.path || '/'}`;
        
        // Set domain if specified
        if (options.domain) {
            cookieString += `; domain=${options.domain}`;
        }
        
        // Set secure flag if specified
        if (options.secure) {
            cookieString += `; secure`;
        }
        
        // Set SameSite attribute (default to Lax)
        cookieString += `; SameSite=${options.sameSite || 'Lax'}`;
        
        document.cookie = cookieString;
        
        Utils.log('CookieManager', `Cookie set: ${name}`, { 
            value: value.substring(0, 20) + '...', 
            days 
        });
    },
    
    /**
     * Get a cookie value by name
     * @param {string} name - Cookie name
     * @returns {string|null} - Cookie value or null if not found
     */
    get: function(name) {
        const nameEQ = encodeURIComponent(name) + "=";
        const cookies = document.cookie.split(';');
        
        for (let i = 0; i < cookies.length; i++) {
            let cookie = cookies[i].trim();
            if (cookie.indexOf(nameEQ) === 0) {
                const value = decodeURIComponent(cookie.substring(nameEQ.length));
                Utils.log('CookieManager', `Cookie retrieved: ${name}`);
                return value;
            }
        }
        
        return null;
    },
    
    /**
     * Delete a cookie
     * @param {string} name - Cookie name
     * @param {object} options - Must match the path/domain used when setting
     */
    delete: function(name, options = {}) {
        // Set cookie with past expiration date
        this.set(name, '', -1, options);
        Utils.log('CookieManager', `Cookie deleted: ${name}`);
    },
    
    /**
     * Check if a cookie exists
     * @param {string} name - Cookie name
     * @returns {boolean}
     */
    exists: function(name) {
        return this.get(name) !== null;
    },
    
    /**
     * Get all cookies as an object
     * @returns {object} - All cookies as key-value pairs
     */
    getAll: function() {
        const cookies = {};
        const cookieArray = document.cookie.split(';');
        
        cookieArray.forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if (name) {
                cookies[decodeURIComponent(name)] = decodeURIComponent(value || '');
            }
        });
        
        return cookies;
    },
    
    /**
     * Clear all cookies (for testing)
     */
    clearAll: function() {
        const cookies = this.getAll();
        Object.keys(cookies).forEach(name => {
            this.delete(name);
        });
        Utils.log('CookieManager', 'All cookies cleared');
    }
};

// Cookie names used in the application
const COOKIE_NAMES = {
    USER_ID: 'study_planner_user_id',
    USER_EMAIL: 'study_planner_email'
};

// Make CookieManager globally available
if (typeof window !== 'undefined') {
    window.CookieManager = CookieManager;
    window.COOKIE_NAMES = COOKIE_NAMES;
}