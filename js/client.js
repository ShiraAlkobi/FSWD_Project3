/**
 * Simple Client for Testing the Backend System
 * Authentication is based on userId
 */

const TestClient = {
    currentUserId: null,
    currentUser: null,
    
    /**
     * Check if user is logged in
     */
    isLoggedIn: function() {
        return this.currentUserId !== null;
    },

    /**
     * Register a new user
     */
    register: function(email, password, name) {
        return new Promise((resolve, reject) => {
            const xhr = new FXMLHttpRequest();
            
            xhr.open('POST', CONFIG.API.REGISTER);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = () => {
                const response = Utils.parseJSON(xhr.responseText);
                if (xhr.status === CONFIG.STATUS.CREATED && response.success) {
                    this.currentUserId = response.data.user.id;
                    this.currentUser = response.data.user;
                    console.log('Registration successful:', response);
                    resolve(response);
                } else {
                    console.log('Registration failed:', response);
                    reject(response);
                }
            };
            
            xhr.onerror = () => {
                const response = Utils.parseJSON(xhr.responseText);
                console.log('Registration error:', response);
                reject(response);
            };
            
            const requestBody = JSON.stringify({ email, password, name });
            xhr.send(requestBody);
        });
    },
    
    /**
     * Login existing user
     */
    login: function(email, password) {
        return new Promise((resolve, reject) => {
            const xhr = new FXMLHttpRequest();
            
            xhr.open('POST', CONFIG.API.LOGIN);
            xhr.setRequestHeader('Content-Type', 'application/json');
            
            xhr.onload = () => {
                const response = Utils.parseJSON(xhr.responseText);
                if (xhr.status === CONFIG.STATUS.OK && response.success) {
                    this.currentUserId = response.data.user.id;
                    this.currentUser = response.data.user;
                    console.log('Login successful:', response);
                    resolve(response);
                } else {
                    console.log('Login failed:', response);
                    reject(response);
                }
            };
            
            xhr.onerror = () => {
                const response = Utils.parseJSON(xhr.responseText);
                console.log('Login error:', response);
                reject(response);
            };
            
            const requestBody = JSON.stringify({ email, password });
            xhr.send(requestBody);
        });
    },
    
    /**
     * Logout - clear user data and cookies
     */
    logout: function() {
        this.currentUserId = null;
        this.currentUser = null;
        AuthServer.logout();
        console.log('Logged out, cookies cleared');
    },

    /**
     * Restore session from cookies (call on page load)
     */
    restoreSession: function() {
        if (typeof CookieManager === 'undefined') return null;
        
        const userId = CookieManager.get(COOKIE_NAMES.USER_ID);
        const email = CookieManager.get(COOKIE_NAMES.USER_EMAIL);
        
        if (userId && email) {
            // Verify user still exists in DB
            const user = UsersDB.getUserById(userId);
            if (user) {
                this.currentUserId = user.id;
                this.currentUser = { id: user.id, email: user.email, name: user.name };
                console.log('Session restored from cookies for:', email);
                return this.currentUser;
            }
        }
        return null;
    },

    /**
     * Get all tasks
     */
    getTasks: function(filters = {}) {
        return new Promise((resolve, reject) => {
            if (!this.isLoggedIn()) {
                reject({ success: false, message: 'Not authenticated' });
                return;
            }
            
            let url = CONFIG.API.TASKS;
            
            // Add query parameters if filters provided
            const params = new URLSearchParams(filters);
            if (params.toString()) {
                url += '?' + params.toString();
            }
            
            const xhr = new FXMLHttpRequest();
            
            xhr.open('GET', url);
            xhr.setRequestHeader('UserId', this.currentUserId);
            
            xhr.onload = () => {
                const response = Utils.parseJSON(xhr.responseText);
                if (xhr.status === CONFIG.STATUS.OK && response.success) {
                    console.log('Tasks retrieved:', response);
                    resolve(response);
                } else {
                    console.log('Get tasks failed:', response);
                    reject(response);
                }
            };
            
            xhr.onerror = () => {
                const response = Utils.parseJSON(xhr.responseText);
                console.log('Get tasks error:', response);
                reject(response);
            };
            
            xhr.send();
        });
    },
    
    /**
     * Get task by ID
     */
    getTaskById: function(taskId) {
        return new Promise((resolve, reject) => {
            if (!this.isLoggedIn()) {
                reject({ success: false, message: 'Not authenticated' });
                return;
            }
            
            const xhr = new FXMLHttpRequest();
            
            xhr.open('GET', CONFIG.API.TASK_BY_ID(taskId));
            xhr.setRequestHeader('UserId', this.currentUserId);
            
            xhr.onload = () => {
                const response = Utils.parseJSON(xhr.responseText);
                if (xhr.status === CONFIG.STATUS.OK && response.success) {
                    console.log('Task retrieved:', response);
                    resolve(response);
                } else {
                    console.log('Get task failed:', response);
                    reject(response);
                }
            };
            
            xhr.onerror = () => {
                const response = Utils.parseJSON(xhr.responseText);
                console.log('Get task error:', response);
                reject(response);
            };
            
            xhr.send();
        });
    },
    
    /**
     * Create new task
     */
    createTask: function(taskData) {
        return new Promise((resolve, reject) => {
            if (!this.isLoggedIn()) {
                reject({ success: false, message: 'Not authenticated' });
                return;
            }
            
            const xhr = new FXMLHttpRequest();
            
            xhr.open('POST', CONFIG.API.TASKS);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('UserId', this.currentUserId);
            
            xhr.onload = () => {
                const response = Utils.parseJSON(xhr.responseText);
                if (xhr.status === CONFIG.STATUS.CREATED && response.success) {
                    console.log('Task created:', response);
                    resolve(response);
                } else {
                    console.log('Create task failed:', response);
                    reject(response);
                }
            };
            
            xhr.onerror = () => {
                const response = Utils.parseJSON(xhr.responseText);
                console.log('Create task error:', response);
                reject(response);
            };
            
            xhr.send(JSON.stringify(taskData));
        });
    },
    
    /**
     * Update task
     */
    updateTask: function(taskId, updates) {
        return new Promise((resolve, reject) => {
            if (!this.isLoggedIn()) {
                reject({ success: false, message: 'Not authenticated' });
                return;
            }
            
            const xhr = new FXMLHttpRequest();
            
            xhr.open('PUT', CONFIG.API.TASK_BY_ID(taskId));
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.setRequestHeader('UserId', this.currentUserId);
            
            xhr.onload = () => {
                const response = Utils.parseJSON(xhr.responseText);
                if (xhr.status === CONFIG.STATUS.OK && response.success) {
                    console.log('Task updated:', response);
                    resolve(response);
                } else {
                    console.log('Update task failed:', response);
                    reject(response);
                }
            };
            
            xhr.onerror = () => {
                const response = Utils.parseJSON(xhr.responseText);
                console.log('Update task error:', response);
                reject(response);
            };
            
            xhr.send(JSON.stringify(updates));
        });
    },
    
    /**
     * Delete task
     */
    deleteTask: function(taskId) {
        return new Promise((resolve, reject) => {
            if (!this.isLoggedIn()) {
                reject({ success: false, message: 'Not authenticated' });
                return;
            }
            
            const xhr = new FXMLHttpRequest();
            
            xhr.open('DELETE', CONFIG.API.TASK_BY_ID(taskId));
            xhr.setRequestHeader('UserId', this.currentUserId);
            
            xhr.onload = () => {
                const response = Utils.parseJSON(xhr.responseText);
                if (xhr.status === CONFIG.STATUS.OK && response.success) {
                    console.log('Task deleted:', response);
                    resolve(response);
                } else {
                    console.log('Delete task failed:', response);
                    reject(response);
                }
            };
            
            xhr.onerror = () => {
                const response = Utils.parseJSON(xhr.responseText);
                console.log('Delete task error:', response);
                reject(response);
            };
            
            xhr.send();
        });
    }
};

// Make TestClient globally available
if (typeof window !== 'undefined') {
    window.TestClient = TestClient;
}