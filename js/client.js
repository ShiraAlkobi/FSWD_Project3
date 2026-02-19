/**
 * Client Network Utilities
 * Provides a reusable sendRequest helper for making requests through the simulated network.
 * Used by both app.js (the real client) and TestClient (for the test page).
 */
const ClientAPI = {
    /**
     * Send a request through the simulated network stack.
     * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
     * @param {string} url - API endpoint URL
     * @param {object} options - { headers: {}, body: string|null }
     * @returns {Promise} resolves with parsed response, rejects on error/failure
     */
    sendRequest: function(method, url, options = {}) {
        return new Promise((resolve, reject) => {
            const xhr = new FXMLHttpRequest();
            xhr.open(method, url);

            if (options.headers) {
                Object.entries(options.headers).forEach(([key, val]) => {
                    xhr.setRequestHeader(key, val);
                });
            }

            xhr.onload = () => {
                const response = Utils.parseJSON(xhr.responseText);
                if ((xhr.status === CONFIG.STATUS.OK || xhr.status === CONFIG.STATUS.CREATED) && response.success) {
                    resolve(response);
                } else {
                    reject(response);
                }
            };

            xhr.onerror = () => {
                const response = Utils.parseJSON(xhr.responseText);
                reject(response);
            };

            xhr.send(options.body || null);
        });
    }
};

// ============================================================
// TestClient — kept for backwards compatibility with index.html
// ============================================================
const TestClient = {
    currentUserId: null,
    currentUser: null,
    
    isLoggedIn: function() {
        return this.currentUserId !== null;
    },

    register: function(email, password, name) {
        return ClientAPI.sendRequest('POST', CONFIG.API.REGISTER, {
            headers: { [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON },
            body: JSON.stringify({ email, password, name })
        }).then(response => {
            this.currentUserId = response.data.user.id;
            this.currentUser = response.data.user;
            console.log('Registration successful:', response);
            return response;
        });
    },
    
    login: function(email, password) {
        return ClientAPI.sendRequest('POST', CONFIG.API.LOGIN, {
            headers: { [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON },
            body: JSON.stringify({ email, password })
        }).then(response => {
            this.currentUserId = response.data.user.id;
            this.currentUser = response.data.user;
            console.log('Login successful:', response);
            return response;
        });
    },
    
    logout: function() {
        this.currentUserId = null;
        this.currentUser = null;
        AuthServer.logout();
        console.log('Logged out, cookies cleared');
    },

    restoreSession: function() {
        if (typeof CookieManager === 'undefined') return null;
        const userId = CookieManager.get(COOKIE_NAMES.USER_ID);
        const email = CookieManager.get(COOKIE_NAMES.USER_EMAIL);
        if (userId && email) {
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

    getTasks: function(filters = {}) {
        if (!this.isLoggedIn()) return Promise.reject({ success: false, message: CONFIG.MESSAGES.UNAUTHORIZED_ACCESS });
        let url = CONFIG.API.TASKS;
        const params = new URLSearchParams(filters);
        if (params.toString()) url += '?' + params.toString();
        return ClientAPI.sendRequest('GET', url, {
            headers: { [CONFIG.HEADERS.USER_ID]: this.currentUserId }
        });
    },
    
    getTaskById: function(taskId) {
        if (!this.isLoggedIn()) return Promise.reject({ success: false, message: CONFIG.MESSAGES.UNAUTHORIZED_ACCESS });
        return ClientAPI.sendRequest('GET', CONFIG.API.TASK_BY_ID(taskId), {
            headers: { [CONFIG.HEADERS.USER_ID]: this.currentUserId }
        });
    },
    
    createTask: function(taskData) {
        if (!this.isLoggedIn()) return Promise.reject({ success: false, message: CONFIG.MESSAGES.UNAUTHORIZED_ACCESS });
        return ClientAPI.sendRequest('POST', CONFIG.API.TASKS, {
            headers: { [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON, [CONFIG.HEADERS.USER_ID]: this.currentUserId },
            body: JSON.stringify(taskData)
        });
    },
    
    updateTask: function(taskId, updates) {
        if (!this.isLoggedIn()) return Promise.reject({ success: false, message: CONFIG.MESSAGES.UNAUTHORIZED_ACCESS });
        return ClientAPI.sendRequest('PUT', CONFIG.API.TASK_BY_ID(taskId), {
            headers: { [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON, [CONFIG.HEADERS.USER_ID]: this.currentUserId },
            body: JSON.stringify(updates)
        });
    },
    
    deleteTask: function(taskId) {
        if (!this.isLoggedIn()) return Promise.reject({ success: false, message: CONFIG.MESSAGES.UNAUTHORIZED_ACCESS });
        return ClientAPI.sendRequest('DELETE', CONFIG.API.TASK_BY_ID(taskId), {
            headers: { [CONFIG.HEADERS.USER_ID]: this.currentUserId }
        });
    }
};

if (typeof window !== 'undefined') {
    window.ClientAPI = ClientAPI;
    window.TestClient = TestClient;
}