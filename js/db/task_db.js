/**
 * Tasks Database - Manages study tasks in LocalStorage
 */

const TasksDB = {
    /**
     * Initialize tasks database
     */
    init: function() {
        DB_API.initialize(CONFIG.STORAGE.TASKS_KEY, []);
        Utils.log('TasksDB', 'Database initialized');
    },
    
    /**
     * Get all tasks
     */
    getAllTasks: function() {
        return DB_API.get(CONFIG.STORAGE.TASKS_KEY) || [];
    },
    
    /**
     * Get tasks by user ID
     */
    getTasksByUserId: function(userId) {
        const tasks = this.getAllTasks();
        return tasks.filter(task => task.userId === userId);
    },
    
    /**
     * Get task by ID
     */
    getTaskById: function(taskId) {
        const tasks = this.getAllTasks();
        return tasks.find(task => task.id === taskId) || null;
    },
    
    /**
     * Add new task
     */
    addTask: function(taskData) {
        const tasks = this.getAllTasks();
        
        // Create task object
        const newTask = {
            id: Utils.generateId(),
            userId: taskData.userId,
            title: taskData.title,
            description: taskData.description || '',
            subject: taskData.subject || '',
            dueDate: taskData.dueDate || null,
            priority: taskData.priority || 'medium', // low, medium, high
            completed: false,
            createdAt: Utils.getCurrentTimestamp(),
            updatedAt: Utils.getCurrentTimestamp()
        };
        
        tasks.push(newTask);
        DB_API.set(CONFIG.STORAGE.TASKS_KEY, tasks);
        
        Utils.log('TasksDB', 'Task added', { id: newTask.id, title: newTask.title });
        return newTask;
    },
    
    /**
     * Update task
     */
    updateTask: function(taskId, updates) {
        const tasks = this.getAllTasks();
        const taskIndex = tasks.findIndex(task => task.id === taskId);
        
        if (taskIndex === -1) {
            return null;
        }
        
        tasks[taskIndex] = {
            ...tasks[taskIndex],
            ...updates,
            id: taskId, // Ensure ID doesn't change
            userId: tasks[taskIndex].userId, // Ensure userId doesn't change
            updatedAt: Utils.getCurrentTimestamp()
        };
        
        DB_API.set(CONFIG.STORAGE.TASKS_KEY, tasks);
        Utils.log('TasksDB', 'Task updated', { id: taskId });
        return tasks[taskIndex];
    },
    
    /**
     * Delete task
     */
    deleteTask: function(taskId) {
        const tasks = this.getAllTasks();
        const filteredTasks = tasks.filter(task => task.id !== taskId);
        
        if (tasks.length === filteredTasks.length) {
            return false; // Task not found
        }
        
        DB_API.set(CONFIG.STORAGE.TASKS_KEY, filteredTasks);
        Utils.log('TasksDB', 'Task deleted', { id: taskId });
        return true;
    },
    
    /**
     * Mark task as completed/incomplete
     */
    toggleTaskCompletion: function(taskId) {
        const task = this.getTaskById(taskId);
        if (!task) return null;
        
        return this.updateTask(taskId, { completed: !task.completed });
    },
    
    /**
     * Search tasks by keyword (in title, description, or subject)
     */
    searchTasks: function(userId, keyword) {
        const userTasks = this.getTasksByUserId(userId);
        const lowerKeyword = keyword.toLowerCase();
        
        return userTasks.filter(task => 
            task.title.toLowerCase().includes(lowerKeyword) ||
            task.description.toLowerCase().includes(lowerKeyword) ||
            task.subject.toLowerCase().includes(lowerKeyword)
        );
    },
    
    /**
     * Get tasks by completion status
     */
    getTasksByStatus: function(userId, completed) {
        const userTasks = this.getTasksByUserId(userId);
        return userTasks.filter(task => task.completed === completed);
    },
    
    /**
     * Get tasks by priority
     */
    getTasksByPriority: function(userId, priority) {
        const userTasks = this.getTasksByUserId(userId);
        return userTasks.filter(task => task.priority === priority);
    },
    
    /**
     * Get overdue tasks
     */
    getOverdueTasks: function(userId) {
        const userTasks = this.getTasksByUserId(userId);
        const now = new Date();
        
        return userTasks.filter(task => {
            if (!task.dueDate || task.completed) return false;
            return new Date(task.dueDate) < now;
        });
    },
    
    /**
     * Get task count for user
     */
    getUserTaskCount: function(userId) {
        return this.getTasksByUserId(userId).length;
    },
    
    /**
     * Clear all tasks for user
     */
    clearUserTasks: function(userId) {
        const tasks = this.getAllTasks();
        const filteredTasks = tasks.filter(task => task.userId !== userId);
        DB_API.set(CONFIG.STORAGE.TASKS_KEY, filteredTasks);
        Utils.log('TasksDB', 'User tasks cleared', { userId });
    },
    
    /**
     * Clear all tasks (for testing)
     */
    clearAllTasks: function() {
        DB_API.set(CONFIG.STORAGE.TASKS_KEY, []);
        Utils.log('TasksDB', 'All tasks cleared');
    }
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.TasksDB = TasksDB;
    TasksDB.init();
}