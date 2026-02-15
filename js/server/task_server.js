/**
 * Tasks Server - Handles CRUD operations for study tasks
 */

const TasksServer = {
    /**
     * Initialize tasks server
     */
    init: function() {
        // Register this server with the network
        Network.registerServer(CONFIG.API.TASKS_BASE, this);
        Utils.log('TasksServer', 'Tasks server initialized and registered');
    },
    
    /**
     * Main request handler - routes to appropriate function
     */
    handleRequest: function(request, callback) {
        Utils.log('TasksServer', `Processing ${request.method} request to ${request.url}`);
        
        try {
            // Verify authentication - check UserId header first, then cookies
            let userId = request.headers['UserId'];
            
            // If no UserId header, try to get from cookies
            if (!userId && request.headers['Cookie']) {
                userId = this.extractUserIdFromCookies(request.headers['Cookie']);
            }
            
            const authValidation = AuthServer.validateUser(userId);
            
            if (!authValidation.valid) {
                return this.sendResponse(callback, CONFIG.STATUS.UNAUTHORIZED, false, 
                    CONFIG.MESSAGES.UNAUTHORIZED_ACCESS, null);
            }
            
            userId = authValidation.userId;
            
            // Parse URL to determine action (strip query string for routing)
            const url = request.url.split('?')[0];
            const method = request.method;
            
            // Extract task ID if present (e.g., /api/tasks/123)
            const taskIdMatch = url.match(/\/api\/tasks\/([^\/]+)$/);
            const taskId = taskIdMatch ? taskIdMatch[1] : null;
            
            // Route to appropriate handler
            if (url === CONFIG.API.TASKS && method === 'GET') {
                // GET all tasks
                this.handleGetAllTasks(userId, request, callback);
            } else if (taskId && method === 'GET') {
                // GET specific task
                this.handleGetTaskById(userId, taskId, request, callback);
            } else if (url === CONFIG.API.TASKS && method === 'POST') {
                // CREATE new task
                this.handleCreateTask(userId, request, callback);
            } else if (taskId && method === 'PUT') {
                // UPDATE task
                this.handleUpdateTask(userId, taskId, request, callback);
            } else if (taskId && method === 'DELETE') {
                // DELETE task
                this.handleDeleteTask(userId, taskId, request, callback);
            } else {
                // Unknown endpoint or method
                this.sendResponse(callback, CONFIG.STATUS.NOT_FOUND, false, 
                    'Endpoint not found', null);
            }
        } catch (error) {
            Utils.log('TasksServer', 'Error processing request:', error);
            this.sendResponse(callback, CONFIG.STATUS.INTERNAL_ERROR, false, 
                'Internal server error', null);
        }
    },
    
    /**
     * Extract userId from Cookie header
     */
    extractUserIdFromCookies: function(cookieHeader) {
        if (!cookieHeader || typeof COOKIE_NAMES === 'undefined') {
            return null;
        }
        
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [name, value] = cookie.trim().split('=');
            if (name && value) {
                acc[name] = value;
            }
            return acc;
        }, {});
        
        return cookies[COOKIE_NAMES.USER_ID] || null;
    },
    
    /**
     * Handle GET all tasks
     */
    handleGetAllTasks: function(userId, request, callback) {
        Utils.log('TasksServer', 'Getting all tasks for user', userId);
        
        // Check for search query parameter
        const urlParams = this.parseUrlParams(request.url);
        
        let tasks;
        if (urlParams.search) {
            tasks = TasksDB.searchTasks(userId, urlParams.search);
        } else if (urlParams.completed !== undefined) {
            tasks = TasksDB.getTasksByStatus(userId, urlParams.completed === 'true');
        } else if (urlParams.priority) {
            tasks = TasksDB.getTasksByPriority(userId, urlParams.priority);
        } else {
            tasks = TasksDB.getTasksByUserId(userId);
        }
        
        this.sendResponse(callback, CONFIG.STATUS.OK, true, 
            'Tasks retrieved successfully', { tasks: tasks });
    },
    
    /**
     * Handle GET task by ID
     */
    handleGetTaskById: function(userId, taskId, request, callback) {
        Utils.log('TasksServer', `Getting task ${taskId} for user ${userId}`);
        
        const task = TasksDB.getTaskById(taskId);
        
        if (!task) {
            return this.sendResponse(callback, CONFIG.STATUS.NOT_FOUND, false, 
                CONFIG.MESSAGES.TASK_NOT_FOUND, null);
        }
        
        // Verify task belongs to user
        if (task.userId !== userId) {
            return this.sendResponse(callback, CONFIG.STATUS.UNAUTHORIZED, false, 
                CONFIG.MESSAGES.UNAUTHORIZED_ACCESS, null);
        }
        
        this.sendResponse(callback, CONFIG.STATUS.OK, true, 
            'Task retrieved successfully', { task: task });
    },
    
    /**
     * Handle CREATE new task
     */
    handleCreateTask: function(userId, request, callback) {
        Utils.log('TasksServer', 'Creating new task for user', userId);
        
        // Parse request body
        const data = Utils.parseJSON(request.body);
        
        if (!data) {
            return this.sendResponse(callback, CONFIG.STATUS.BAD_REQUEST, false, 
                'Invalid request data', null);
        }
        
        // Validate required fields
        if (!data.title) {
            return this.sendResponse(callback, CONFIG.STATUS.BAD_REQUEST, false, 
                CONFIG.MESSAGES.MISSING_FIELDS, null);
        }
        
        // Create task
        const taskData = {
            userId: userId,
            title: data.title,
            description: data.description || '',
            subject: data.subject || '',
            dueDate: data.dueDate || null,
            priority: data.priority || 'medium'
        };
        
        const newTask = TasksDB.addTask(taskData);
        
        this.sendResponse(callback, CONFIG.STATUS.CREATED, true, 
            CONFIG.MESSAGES.TASK_CREATED, { task: newTask });
    },
    
    /**
     * Handle UPDATE task
     */
    handleUpdateTask: function(userId, taskId, request, callback) {
        Utils.log('TasksServer', `Updating task ${taskId} for user ${userId}`);
        
        // Check if task exists
        const existingTask = TasksDB.getTaskById(taskId);
        
        if (!existingTask) {
            return this.sendResponse(callback, CONFIG.STATUS.NOT_FOUND, false, 
                CONFIG.MESSAGES.TASK_NOT_FOUND, null);
        }
        
        // Verify task belongs to user
        if (existingTask.userId !== userId) {
            return this.sendResponse(callback, CONFIG.STATUS.UNAUTHORIZED, false, 
                CONFIG.MESSAGES.UNAUTHORIZED_ACCESS, null);
        }
        
        // Parse request body
        const data = Utils.parseJSON(request.body);
        
        if (!data) {
            return this.sendResponse(callback, CONFIG.STATUS.BAD_REQUEST, false, 
                'Invalid request data', null);
        }
        
        // Update task
        const updatedTask = TasksDB.updateTask(taskId, data);
        
        this.sendResponse(callback, CONFIG.STATUS.OK, true, 
            CONFIG.MESSAGES.TASK_UPDATED, { task: updatedTask });
    },
    
    /**
     * Handle DELETE task
     */
    handleDeleteTask: function(userId, taskId, request, callback) {
        Utils.log('TasksServer', `Deleting task ${taskId} for user ${userId}`);
        
        // Check if task exists
        const existingTask = TasksDB.getTaskById(taskId);
        
        if (!existingTask) {
            return this.sendResponse(callback, CONFIG.STATUS.NOT_FOUND, false, 
                CONFIG.MESSAGES.TASK_NOT_FOUND, null);
        }
        
        // Verify task belongs to user
        if (existingTask.userId !== userId) {
            return this.sendResponse(callback, CONFIG.STATUS.UNAUTHORIZED, false, 
                CONFIG.MESSAGES.UNAUTHORIZED_ACCESS, null);
        }
        
        // Delete task
        TasksDB.deleteTask(taskId);
        
        this.sendResponse(callback, CONFIG.STATUS.OK, true, 
            CONFIG.MESSAGES.TASK_DELETED, { taskId: taskId });
    },
    
    /**
     * Parse URL query parameters
     */
    parseUrlParams: function(url) {
        const params = {};
        const queryString = url.split('?')[1];
        
        if (!queryString) return params;
        
        queryString.split('&').forEach(param => {
            const [key, value] = param.split('=');
            params[decodeURIComponent(key)] = decodeURIComponent(value);
        });
        
        return params;
    },
    
    /**
     * Send standardized response
     */
    sendResponse: function(callback, status, success, message, data) {
        const response = {
            status: status,
            statusText: CONFIG.STATUS_TEXT[status] || 'Unknown',
            body: JSON.stringify({
                success: success,
                message: message,
                data: data
            })
        };
        
        Utils.log('TasksServer', 'Sending response', {
            status: status,
            success: success,
            message: message
        });
        
        callback(response);
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.TasksServer = TasksServer;
    TasksServer.init();
}