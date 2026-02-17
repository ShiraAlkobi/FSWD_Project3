/**
 * Main Application Controller
 * Handles SPA routing, UI interactions, and Business Logic
 */

const app = {
    // Application State
    currentUser: null,
    tasks: [],
    currentView: 'login',
    editingTask: null, // Holds task object when editing

    /**
     * Initialize the Application
     */
    init: function() {
        console.log('🚀 Study Planner App Initializing...');
        
        // Check for existing session using the Client's restore method
        const user = TestClient.restoreSession();
        
        if (user) {
            this.currentUser = user;
            this.navigate('dashboard');
        } else {
            this.navigate('login');
        }
    },

    /**
     * Router: Switches between templates
     * @param {string} viewName - The ID suffix of the template
     * @param {object} params - Optional parameters for the view
     */
    navigate: function(viewName, params = {}) {
        const appContainer = document.getElementById('app');
        const template = document.getElementById(`${viewName}-template`);
        
        if (!template) {
            console.error(`View '${viewName}' not found`);
            return;
        }

        this.currentView = viewName;

        // Clear current view
        appContainer.innerHTML = '';
        
        // Clone template content and append to app container
        const clone = template.content.cloneNode(true);
        appContainer.appendChild(clone);

        // Run specific logic for views after rendering
        if (viewName === 'dashboard') {
            this.initDashboard();
        } else if (viewName === 'task-form') {
            this.initTaskForm(params);
        }
    },

    // ================== AUTHENTICATION ==================

    handleLogin: async function(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const errorDiv = document.getElementById('loginError');
        const btn = event.target.querySelector('button');

        errorDiv.textContent = '';
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Logging in...';

        try {
            const response = await TestClient.login(email, password);
            this.currentUser = response.data.user;
            this.navigate('dashboard');
        } catch (error) {
            errorDiv.textContent = error.message || 'Login failed.';
            btn.disabled = false;
            btn.innerHTML = '<span>Login</span> <i class="fa-solid fa-arrow-right"></i>';
        }
    },

    handleRegister: async function(event) {
        event.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        const errorDiv = document.getElementById('registerError');
        const btn = event.target.querySelector('button');

        errorDiv.textContent = '';
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Creating Account...';

        try {
            const response = await TestClient.register(email, password, name);
            this.currentUser = response.data.user;
            this.navigate('dashboard');
        } catch (error) {
            errorDiv.textContent = error.message || 'Registration failed.';
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    },

    handleLogout: function() {
        TestClient.logout();
        this.currentUser = null;
        this.navigate('login');
    },

    // ================== DASHBOARD LOGIC ==================

    initDashboard: function() {
        if (this.currentUser) {
            document.getElementById('userNameDisplay').textContent = this.currentUser.name.split(' ')[0];
            this.loadTasks();
        }
    },

    /**
     * Load tasks from server with optional filters
     */
    loadTasks: async function(filters = {}) {
        const container = document.getElementById('tasksContainer');
        container.innerHTML = '<div class="loading-spinner"><i class="fa-solid fa-circle-notch fa-spin"></i> Loading tasks...</div>';

        try {
            const response = await TestClient.getTasks(filters);
            this.tasks = response.data.tasks;
            this.renderTasks();
            this.updateStats();
        } catch (error) {
            console.error('Failed to load tasks:', error);
            container.innerHTML = `<div class="error-message">Failed to load tasks: ${error.message}</div>`;
        }
    },

    /**
     * Render tasks to the DOM
     */
    renderTasks: function() {
        const container = document.getElementById('tasksContainer');
        container.innerHTML = '';

        if (this.tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-clipboard-list" style="font-size: 3rem; color: var(--border); margin-bottom: 1rem;"></i>
                    <h3>No tasks found</h3>
                    <p>Click "Add Task" to create your first task.</p>
                </div>
            `;
            return;
        }

        this.tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = `task-card fade-in ${task.completed ? 'completed' : ''}`;
            
            // Format Date
            const date = new Date(task.dueDate);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            // Check overdue
            const isOverdue = !task.completed && new Date() > date;
            const dateClass = isOverdue ? 'color: var(--danger); font-weight: bold;' : '';

            card.innerHTML = `
                <div class="task-header">
                    <span class="badge badge-${task.priority}">${task.priority}</span>
                    <div class="task-actions-menu">
                        <button class="btn-icon-sm" onclick="app.handleEditTask('${task.id}')" title="Edit">
                            <i class="fa-solid fa-pen"></i>
                        </button>
                        <button class="btn-icon-sm delete" onclick="app.handleDeleteTask('${task.id}')" title="Delete">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="task-subject">${task.subject}</div>
                <h3 class="task-title">${task.title}</h3>
                <p class="task-desc">${task.description || 'No description provided.'}</p>
                <div class="task-footer">
                    <span style="${dateClass}">
                        <i class="fa-regular fa-calendar"></i> ${dateStr}
                    </span>
                    <label style="cursor: pointer; display: flex; align-items: center; gap: 5px;">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                            onchange="app.handleToggleComplete('${task.id}', this.checked)">
                        ${task.completed ? 'Completed' : 'Mark Done'}
                    </label>
                </div>
            `;
            container.appendChild(card);
        });
    },

    updateStats: function() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(t => t.completed).length;
        const pending = total - completed;

        document.getElementById('totalTasksCount').textContent = total;
        document.getElementById('pendingTasksCount').textContent = pending;
        document.getElementById('completedTasksCount').textContent = completed;
    },

    // ================== TASK ACTIONS ==================

    handleSearch: function(event) {
        // Use timeout to debounce search inputs slightly
        if (this.searchTimeout) clearTimeout(this.searchTimeout);
        
        this.searchTimeout = setTimeout(() => {
            const query = event.target.value;
            // The backend supports a 'search' query parameter
            if (query.length > 0) {
                this.loadTasks({ search: query });
            } else {
                this.loadTasks(); // Load all if empty
            }
        }, 500);
    },

    handleFilter: function(event) {
        const priority = event.target.value;
        const filters = priority ? { priority: priority } : {};
        // Add current search text if exists
        const searchText = document.getElementById('searchInput').value;
        if(searchText) filters.search = searchText;
        
        this.loadTasks(filters);
    },

    handleToggleComplete: async function(taskId, isCompleted) {
        try {
            // Optimistic update
            const task = this.tasks.find(t => t.id === taskId);
            if (task) task.completed = isCompleted;
            this.renderTasks(); // Re-render immediately
            this.updateStats();

            // Send to server
            await TestClient.updateTask(taskId, { completed: isCompleted });
            
            // Note: In a real app we might revert if server fails
        } catch (error) {
            console.error('Failed to update task:', error);
            alert('Failed to update task status');
            this.loadTasks(); // Revert to server state
        }
    },

    handleDeleteTask: async function(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            await TestClient.deleteTask(taskId);
            // Remove locally to avoid reload
            this.tasks = this.tasks.filter(t => t.id !== taskId);
            this.renderTasks();
            this.updateStats();
        } catch (error) {
            console.error('Failed to delete task:', error);
            alert('Failed to delete task');
        }
    },

    handleEditTask: function(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            this.navigate('task-form', { task: task });
        }
    },

    // ================== TASK FORM LOGIC ==================

    initTaskForm: function(params) {
        if (params && params.task) {
            // Editing Mode
            this.editingTask = params.task;
            document.getElementById('formTitle').textContent = 'Edit Task';
            document.getElementById('taskId').value = params.task.id;
            document.getElementById('taskTitle').value = params.task.title;
            document.getElementById('taskSubject').value = params.task.subject;
            document.getElementById('taskPriority').value = params.task.priority;
            document.getElementById('taskDescription').value = params.task.description;
            
            // Format date for input type="date" (YYYY-MM-DD)
            if (params.task.dueDate) {
                const date = new Date(params.task.dueDate);
                const isoDate = date.toISOString().split('T')[0];
                document.getElementById('taskDueDate').value = isoDate;
            }
        } else {
            // Create Mode
            this.editingTask = null;
            document.getElementById('formTitle').textContent = 'Add New Task';
            document.getElementById('taskId').value = '';
            // Set default date to today
            document.getElementById('taskDueDate').value = new Date().toISOString().split('T')[0];
        }
    },

    handleTaskSubmit: async function(event) {
        event.preventDefault();
        
        const taskId = document.getElementById('taskId').value;
        const taskData = {
            title: document.getElementById('taskTitle').value,
            subject: document.getElementById('taskSubject').value,
            priority: document.getElementById('taskPriority').value,
            dueDate: document.getElementById('taskDueDate').value,
            description: document.getElementById('taskDescription').value
        };

        const btn = event.target.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            if (taskId) {
                // Update
                await TestClient.updateTask(taskId, taskData);
            } else {
                // Create
                await TestClient.createTask(taskData);
            }
            // Navigate back on success
            this.navigate('dashboard');
        } catch (error) {
            console.error('Save failed:', error);
            document.getElementById('formError').textContent = error.message || 'Failed to save task.';
            btn.disabled = false;
            btn.textContent = 'Save Task';
        }
    }
};

// Start the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});