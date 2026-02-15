/**
 * Utility Functions for Study Planner System
 */

const Utils = {
    /**
     * Generate a unique ID
     */
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    /**
     * Generate a random delay between min and max
     */
    randomDelay: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * Check if a message should be dropped based on probability
     */
    shouldDropMessage: function(dropRate) {
        return Math.random() < dropRate;
    },
    
    /**
     * Parse JSON safely
     */
    parseJSON: function(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to parse JSON:', e);
            return null;
        }
    },
    
    /**
     * Stringify JSON safely
     */
    stringifyJSON: function(obj) {
        try {
            return JSON.stringify(obj);
        } catch (e) {
            console.error('Failed to stringify JSON:', e);
            return null;
        }
    },
    
    /**
     * Validate email format
     */
    isValidEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    

    
    /**
     * Clone an object deeply
     */
    deepClone: function(obj) {
        return JSON.parse(JSON.stringify(obj));
    },
    
    /**
     * Get current timestamp
     */
    getCurrentTimestamp: function() {
        return new Date().toISOString();
    },
    
    /**
     * Log with timestamp
     */
    log: function(component, message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] [${component}]`, message, data || '');
    }
};

// Make Utils globally available
if (typeof window !== 'undefined') {
    window.Utils = Utils;
}