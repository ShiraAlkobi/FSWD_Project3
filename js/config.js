/**
 * Configuration Constants for Study Planner System
 */

const CONFIG = {
    // API Endpoints
    API: {
        AUTH_BASE: '/api/auth',
        TASKS_BASE: '/api/tasks',
        
        REGISTER: '/api/auth/register',
        LOGIN: '/api/auth/login',
        PROFILE: '/api/auth/profile',
        
        TASKS: '/api/tasks',
        TASK_BY_ID: (id) => `/api/tasks/${id}`
    },
    
    // Network Configuration
    NETWORK: {
        MIN_DELAY: 1000,      // Minimum delay in milliseconds (1 second)
        MAX_DELAY: 3000,      // Maximum delay in milliseconds (3 seconds)
        DROP_RATE: 0.2        // Message drop probability (20%)
    },
    
    // LocalStorage Keys
    STORAGE: {
        USERS_KEY: 'study_planner_users',
        TASKS_KEY: 'study_planner_tasks',
        CURRENT_USER_KEY: 'study_planner_current_user',
        SUBJECTS_KEY: 'study_planner_subjects'
    },
    
    // HTTP Status Codes
    STATUS: {
        OK: 200,
        CREATED: 201,
        BAD_REQUEST: 400,
        UNAUTHORIZED: 401,
        NOT_FOUND: 404,
        CONFLICT: 409,
        INTERNAL_ERROR: 500,
        NETWORK_ERROR: 0
    },

    // HTTP Status Text (maps code to human-readable text)
    STATUS_TEXT: {
        200: 'OK',
        201: 'Created',
        400: 'Bad Request',
        401: 'Unauthorized',
        404: 'Not Found',
        409: 'Conflict',
        500: 'Internal Server Error'
    },
    
    // Header Names
    HEADERS: {
        CONTENT_TYPE: 'Content-Type',
        CONTENT_TYPE_JSON: 'application/json',
        USER_ID: 'UserId'
    },

    // Response Messages
    MESSAGES: {
        // Success
        LOGIN_SUCCESS: 'Login successful',
        REGISTER_SUCCESS: 'Registration successful',
        TASK_CREATED: 'Task created successfully',
        TASK_UPDATED: 'Task updated successfully',
        TASK_DELETED: 'Task deleted successfully',
        
        // Errors
        INVALID_CREDENTIALS: 'Invalid email or password',
        USER_EXISTS: 'User already exists',
        USER_NOT_FOUND: 'User not found',
        TASK_NOT_FOUND: 'Task not found',
        UNAUTHORIZED_ACCESS: 'Unauthorized access',
        MISSING_FIELDS: 'Missing required fields',
        NETWORK_TIMEOUT: 'Network request timed out',
        NETWORK_DROPPED: 'Network connection lost',
        SERVER_NOT_FOUND: 'Server not found'
    }
};

// Make CONFIG globally available
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}