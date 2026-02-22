/**
 * Authentication Server - Handles user login and registration
 * Authentication is based on userId (stored in cookies for persistence)
 */

const AuthServer = {
    /**
     * Initialize authentication server
     */
    init: function() {
        // Register this server with the network
        Network.registerServer(CONFIG.API.AUTH_BASE, this);
        Utils.log('AuthServer', 'Authentication server initialized and registered');
    },
    
    /**
     * Main request handler - routes to appropriate function
     */
    handleRequest: function(request, callback) {
        Utils.log('AuthServer', `Processing ${request.method} request to ${request.url}`);
        
        try {
            // Parse URL to determine action
            const url = request.url;
            
            if (url === CONFIG.API.REGISTER && request.method === 'POST') {
                this.handleRegister(request, callback);
            } else if (url === CONFIG.API.LOGIN && request.method === 'POST') {
                this.handleLogin(request, callback);
            } else if (url === CONFIG.API.PROFILE && request.method === 'GET') {
                this.handleProfile(request, callback);
            } else {
                // Unknown endpoint
                this.sendResponse(callback, CONFIG.STATUS.NOT_FOUND, false, 
                    'Endpoint not found', null);
            }
        } catch (error) {
            Utils.log('AuthServer', 'Error processing request:', error);
            this.sendResponse(callback, CONFIG.STATUS.INTERNAL_ERROR, false, 
                'Internal server error', null);
        }
    },
    
    /**
     * Handle user registration
     */
    handleRegister: function(request, callback) {
        Utils.log('AuthServer', 'Handling registration request');
        
        // Parse request body
        const data = Utils.parseJSON(request.body);
        
        if (!data) {
            return this.sendResponse(callback, CONFIG.STATUS.BAD_REQUEST, false, 
                'Invalid request data', null);
        }
        
        // Validate required fields
        if (!data.email || !data.password || !data.name) {
            return this.sendResponse(callback, CONFIG.STATUS.BAD_REQUEST, false, 
                CONFIG.MESSAGES.MISSING_FIELDS, null);
        }
        
        // Validate email format
        if (!Utils.isValidEmail(data.email)) {
            return this.sendResponse(callback, CONFIG.STATUS.BAD_REQUEST, false, 
                'Invalid email format', null);
        }
        
        // Check if user already exists
        if (UsersDB.userExists(data.email)) {
            return this.sendResponse(callback, CONFIG.STATUS.CONFLICT, false, 
                CONFIG.MESSAGES.USER_EXISTS, null);
        }
        
        // Create new user
        const newUser = UsersDB.addUser({
            email: data.email,
            password: data.password,
            name: data.name
        });
        
        // Return success response (without password)
        const userData = {
            id: newUser.id,
            email: newUser.email,
            name: newUser.name,
            createdAt: newUser.createdAt
        };
        
        // Set cookies in response for session persistence
        const setCookieHeaders = this.createAuthCookies(newUser.id, newUser.email);
        
        this.sendResponse(callback, CONFIG.STATUS.CREATED, true, 
            CONFIG.MESSAGES.REGISTER_SUCCESS, 
            { user: userData },
            { 'Set-Cookie': setCookieHeaders });
    },
    
    /**
     * Handle user login
     */
    handleLogin: function(request, callback) {
        Utils.log('AuthServer', 'Handling login request');
        
        // Parse request body
        const data = Utils.parseJSON(request.body);
        
        if (!data) {
            return this.sendResponse(callback, CONFIG.STATUS.BAD_REQUEST, false, 
                'Invalid request data', null);
        }
        
        // Validate required fields
        if (!data.email || !data.password) {
            return this.sendResponse(callback, CONFIG.STATUS.BAD_REQUEST, false, 
                CONFIG.MESSAGES.MISSING_FIELDS, null);
        }
        
        // Validate credentials
        const validation = UsersDB.validateCredentials(data.email, data.password);
        
        if (!validation.valid) {
            return this.sendResponse(callback, CONFIG.STATUS.UNAUTHORIZED, false, 
                CONFIG.MESSAGES.INVALID_CREDENTIALS, null);
        }
        
        const user = validation.user;
        
        // Return success response (without password)
        const userData = {
            id: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt
        };
        
        // Set cookies in response for session persistence
        const setCookieHeaders = this.createAuthCookies(user.id, user.email);
        
        this.sendResponse(callback, CONFIG.STATUS.OK, true, 
            CONFIG.MESSAGES.LOGIN_SUCCESS, 
            { user: userData },
            { 'Set-Cookie': setCookieHeaders });
    },
    
    /**
     * Handle GET /api/auth/profile — validate session and return user data
     */
    handleProfile: function(request, callback) {
        Utils.log('AuthServer', 'Handling profile request');

        let userId = request.headers[CONFIG.HEADERS.USER_ID];
        if (!userId && request.headers['Cookie']) {
            const cookies = request.headers['Cookie'].split(';').reduce((acc, c) => {
                const [k, v] = c.trim().split('=');
                if (k && v) acc[k] = v;
                return acc;
            }, {});
            userId = cookies[COOKIE_NAMES.USER_ID] || null;
        }

        if (!userId) {
            return this.sendResponse(callback, CONFIG.STATUS.UNAUTHORIZED, false,
                CONFIG.MESSAGES.UNAUTHORIZED_ACCESS, null);
        }

        const user = UsersDB.getUserById(userId);
        if (!user) {
            return this.sendResponse(callback, CONFIG.STATUS.NOT_FOUND, false,
                CONFIG.MESSAGES.USER_NOT_FOUND, null);
        }

        this.sendResponse(callback, CONFIG.STATUS.OK, true, 'Profile retrieved', {
            user: { id: user.id, email: user.email, name: user.name }
        });
    },

    /**
     * Validate user authentication by userId
     * Checks header first, then cookies
     */
    validateUser: function(userId) {
        // Try to get userId from cookies if not provided
        if (!userId && typeof CookieManager !== 'undefined') {
            userId = CookieManager.get(COOKIE_NAMES.USER_ID);
        }
        
        if (!userId) {
            return { valid: false, userId: null };
        }
        
        // Verify user exists in DB
        const user = UsersDB.getUserById(userId);
        if (!user) {
            return { valid: false, userId: null };
        }
        
        return {
            valid: true,
            userId: user.id,
            email: user.email
        };
    },
    
    /**
     * Create authentication cookies (userId + email for session persistence)
     */
    createAuthCookies: function(userId, email) {
        const cookies = [
            `${COOKIE_NAMES.USER_ID}=${userId}; Path=/; Max-Age=604800; SameSite=Lax`,
            `${COOKIE_NAMES.USER_EMAIL}=${encodeURIComponent(email)}; Path=/; Max-Age=604800; SameSite=Lax`
        ];
        
        Utils.log('AuthServer', 'Auth cookies created', { userId, email });
        return cookies;
    },
    
    /**
     * Logout - clear cookies
     */
    logout: function() {
        if (typeof CookieManager !== 'undefined') {
            CookieManager.delete(COOKIE_NAMES.USER_ID);
            CookieManager.delete(COOKIE_NAMES.USER_EMAIL);
        }
        Utils.log('AuthServer', 'User logged out, cookies cleared');
        return true;
    },
    
    /**
     * Send standardized response
     */
    sendResponse: function(callback, status, success, message, data, headers = {}) {
        const response = {
            status: status,
            statusText: CONFIG.STATUS_TEXT[status] || 'Unknown',
            headers: headers,
            body: JSON.stringify({
                success: success,
                message: message,
                data: data
            })
        };
        
        Utils.log('AuthServer', 'Sending response', {
            status: status,
            success: success,
            message: message
        });
        
        callback(response);
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.AuthServer = AuthServer;
    AuthServer.init();
}