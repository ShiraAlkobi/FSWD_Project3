/**
 * Users Database - Manages user accounts in LocalStorage
 */

const UsersDB = {
    /**
     * Initialize users database
     */
    init: function() {
        DB_API.initialize(CONFIG.STORAGE.USERS_KEY, []);
        Utils.log('UsersDB', 'Database initialized');
    },
    
    /**
     * Get all users
     */
    getAllUsers: function() {
        return DB_API.get(CONFIG.STORAGE.USERS_KEY) || [];
    },
    
    /**
     * Get user by ID
     */
    getUserById: function(userId) {
        const users = this.getAllUsers();
        return users.find(user => user.id === userId) || null;
    },
    
    /**
     * Get user by email
     */
    getUserByEmail: function(email) {
        const users = this.getAllUsers();
        return users.find(user => user.email === email.toLowerCase()) || null;
    },
    
    /**
     * Check if user exists by email
     */
    userExists: function(email) {
        return this.getUserByEmail(email) !== null;
    },
    
    /**
     * Add new user
     */
    addUser: function(userData) {
        const users = this.getAllUsers();
        
        // Create user object
        const newUser = {
            id: Utils.generateId(),
            email: userData.email.toLowerCase(),
            password: userData.password, // In real app, this should be hashed!
            name: userData.name || '',
            createdAt: Utils.getCurrentTimestamp(),
            updatedAt: Utils.getCurrentTimestamp()
        };
        
        users.push(newUser);
        DB_API.set(CONFIG.STORAGE.USERS_KEY, users);
        
        Utils.log('UsersDB', 'User added', { id: newUser.id, email: newUser.email });
        return newUser;
    },
    
    /**
     * Update user
     */
    updateUser: function(userId, updates) {
        const users = this.getAllUsers();
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex === -1) {
            return null;
        }
        
        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            id: userId, // Ensure ID doesn't change
            updatedAt: Utils.getCurrentTimestamp()
        };
        
        DB_API.set(CONFIG.STORAGE.USERS_KEY, users);
        Utils.log('UsersDB', 'User updated', { id: userId });
        return users[userIndex];
    },
    
    /**
     * Delete user
     */
    deleteUser: function(userId) {
        const users = this.getAllUsers();
        const filteredUsers = users.filter(user => user.id !== userId);
        
        if (users.length === filteredUsers.length) {
            return false; // User not found
        }
        
        DB_API.set(CONFIG.STORAGE.USERS_KEY, filteredUsers);
        Utils.log('UsersDB', 'User deleted', { id: userId });
        return true;
    },
    
    /**
     * Validate user credentials
     */
    validateCredentials: function(email, password) {
        const user = this.getUserByEmail(email);
        
        if (!user) {
            return { valid: false, message: 'User not found' };
        }
        
        if (user.password !== password) {
            return { valid: false, message: 'Invalid password' };
        }
        
        return { valid: true, user: user };
    },
    
    /**
     * Get user count
     */
    getUserCount: function() {
        return this.getAllUsers().length;
    },
    
    /**
     * Clear all users (for testing)
     */
    clearAllUsers: function() {
        DB_API.set(CONFIG.STORAGE.USERS_KEY, []);
        Utils.log('UsersDB', 'All users cleared');
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.UsersDB = UsersDB;
    UsersDB.init();
}