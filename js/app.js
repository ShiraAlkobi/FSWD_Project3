/**
 * App Controller — the real client of the application.
 * Uses ClientAPI.sendRequest() (from client.js) to talk to the simulated backend.
 * Data flow: App → ClientAPI → FXMLHttpRequest → Network → Server → DB
 */
const app = {
    // ── auth state ──
    currentUserId: null,
    currentUser: null,

    // ── UI state ──
    tasks: [],
    filteredTasks: [],
    currentDate: new Date(),
    searchQuery: '',
    filterPriority: 'all',

    // ── helpers ──
    isLoggedIn: function() {
        return this.currentUserId !== null;
    },

    /** Build the headers object every authenticated request needs */
    _authHeaders: function(extra) {
        return Object.assign({ [CONFIG.HEADERS.USER_ID]: this.currentUserId }, extra || {});
    },

    // ══════════════════════════════════════════
    //  Session / Auth
    // ══════════════════════════════════════════

    restoreSession: function() {
        if (typeof CookieManager === 'undefined') return null;
        const userId = CookieManager.get(COOKIE_NAMES.USER_ID);
        const email  = CookieManager.get(COOKIE_NAMES.USER_EMAIL);
        if (userId && email) {
            const user = UsersDB.getUserById(userId);
            if (user) {
                this.currentUserId = user.id;
                this.currentUser = { id: user.id, email: user.email, name: user.name };
                Utils.log('App', 'Session restored from cookies for: ' + email);
                return this.currentUser;
            }
        }
        return null;
    },

    init: function() {
        Utils.log('App', 'Initializing application...');
        const restored = this.restoreSession();
        if (restored) {
            this.navigate('dashboard');
        } else {
            Utils.log('App', 'No session found, showing login');
            this.navigate('login');
        }
    },

    handleLogin: async function(e) {
        e.preventDefault();
        const email    = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        Utils.log('App', 'Login attempt for: ' + email);
        try {
            const res = await ClientAPI.sendRequest('POST', CONFIG.API.LOGIN, {
                headers: { [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON },
                body: JSON.stringify({ email, password })
            });
            this.currentUserId = res.data.user.id;
            this.currentUser   = res.data.user;
            Utils.log('App', 'Login successful', this.currentUser);
            this.navigate('dashboard');
        } catch (error) {
            Utils.log('App', 'Login failed', error);
            const err = document.getElementById('loginError');
            err.textContent = error.message || 'Login failed';
            err.style.display = 'block';
        }
    },

    handleRegister: async function(e) {
        e.preventDefault();
        const name     = document.getElementById('regName').value.trim();
        const email    = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;
        const confirm  = document.getElementById('regConfirmPassword').value;
        const errEl    = document.getElementById('regError');

        // Client-side validation
        if (name.length < 2) {
            errEl.textContent = 'Name must be at least 2 characters.';
            errEl.style.display = 'block';
            return;
        }
        if (password.length < 6) {
            errEl.textContent = 'Password must be at least 6 characters.';
            errEl.style.display = 'block';
            return;
        }
        if (password !== confirm) {
            errEl.textContent = 'Passwords do not match.';
            errEl.style.display = 'block';
            return;
        }
        errEl.style.display = 'none';

        Utils.log('App', 'Register attempt for: ' + email);
        try {
            const res = await ClientAPI.sendRequest('POST', CONFIG.API.REGISTER, {
                headers: { [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON },
                body: JSON.stringify({ email, password, name })
            });
            this.currentUserId = res.data.user.id;
            this.currentUser   = res.data.user;
            Utils.log('App', 'Registration successful', this.currentUser);
            this.navigate('dashboard');
        } catch (error) {
            Utils.log('App', 'Registration failed', error);
            errEl.textContent = error.message || 'Registration failed';
            errEl.style.display = 'block';
        }
    },

    checkPasswordMatch: function() {
        const pw   = document.getElementById('regPassword');
        const conf = document.getElementById('regConfirmPassword');
        const err  = document.getElementById('regError');
        if (!pw || !conf || !err) return;
        if (conf.value.length === 0) {
            err.style.display = 'none';
        } else if (pw.value === conf.value) {
            err.style.display = 'none';
        } else {
            err.textContent = 'Passwords do not match';
            err.style.display = 'block';
        }
    },

    handleLogout: function() {
        Utils.log('App', 'Logging out...');
        this.currentUserId = null;
        this.currentUser   = null;
        AuthServer.logout();
        this.navigate('login');
    },

    // ══════════════════════════════════════════
    //  Task CRUD (via network)
    // ══════════════════════════════════════════

    loadTasks: async function() {
        if (!this.isLoggedIn()) return;
        Utils.log('App', 'Loading tasks...');
        try {
            const res = await ClientAPI.sendRequest('GET', CONFIG.API.TASKS, {
                headers: this._authHeaders()
            });
            this.tasks = res.data.tasks || [];
            Utils.log('App', 'Loaded ' + this.tasks.length + ' tasks');
            this.applyFiltersAndRender();
        } catch (error) {
            Utils.log('App', 'Failed to load tasks', error);
            this.tasks = [];
            this.applyFiltersAndRender();
        }
    },

    handleTaskSubmit: async function(e) {
        e.preventDefault();
        const id = document.getElementById('taskId').value;
        const data = {
            title:       document.getElementById('taskTitle').value,
            subject:     document.getElementById('taskSubject').value,
            priority:    document.getElementById('taskPriority').value,
            dueDate:     document.getElementById('taskDueDate').value,
            description: document.getElementById('taskDescription').value,
        };
        try {
            if (id) {
                Utils.log('App', 'Updating task: ' + id);
                await ClientAPI.sendRequest('PUT', CONFIG.API.TASK_BY_ID(id), {
                    headers: this._authHeaders({ [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON }),
                    body: JSON.stringify(data)
                });
            } else {
                Utils.log('App', 'Creating new task');
                await ClientAPI.sendRequest('POST', CONFIG.API.TASKS, {
                    headers: this._authHeaders({ [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON }),
                    body: JSON.stringify(data)
                });
            }
            this.navigate('dashboard');
        } catch (error) {
            Utils.log('App', 'Task save failed', error);
            alert(error.message || 'Failed to save task');
        }
    },

    handleToggle: async function(id, val) {
        Utils.log('App', 'Toggling task ' + id + ' completed=' + val);
        try {
            await ClientAPI.sendRequest('PUT', CONFIG.API.TASK_BY_ID(id), {
                headers: this._authHeaders({ [CONFIG.HEADERS.CONTENT_TYPE]: CONFIG.HEADERS.CONTENT_TYPE_JSON }),
                body: JSON.stringify({ completed: val })
            });
            this.loadTasks();
        } catch (error) {
            Utils.log('App', 'Toggle failed', error);
        }
    },

    handleDelete: async function(id) {
        if (!confirm('Delete this task?')) return;
        Utils.log('App', 'Deleting task: ' + id);
        try {
            await ClientAPI.sendRequest('DELETE', CONFIG.API.TASK_BY_ID(id), {
                headers: this._authHeaders()
            });
            this.loadTasks();
        } catch (error) {
            Utils.log('App', 'Delete failed', error);
        }
    },

    // ══════════════════════════════════════════
    //  Navigation & Dashboard
    // ══════════════════════════════════════════

    navigate: function(view, params = {}) {
        Utils.log('App', 'Navigating to: ' + view);
        const container = document.getElementById('app');
        const template = document.getElementById(view + '-template');
        if (!template) return;
        container.innerHTML = '';
        container.appendChild(template.content.cloneNode(true));
        if (view === 'dashboard') this.initDashboard();
        if (view === 'task-form') this.initTaskForm(params);
    },

    initDashboard: function() {
        const initials = this.currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('profileCircle').textContent = initials;
        document.getElementById('profileName').textContent = this.currentUser.name;
        document.getElementById('profileEmail').textContent = this.currentUser.email;
        this.loadTasks();
    },

    // ══════════════════════════════════════════
    //  Filtering & Rendering
    // ══════════════════════════════════════════

    handleSearch: function(e) {
        this.searchQuery = e.target.value.toLowerCase();
        this.applyFiltersAndRender();
    },

    handleFilter: function() {
        this.filterPriority = document.getElementById('filterPriority').value;
        this.applyFiltersAndRender();
    },

    applyFiltersAndRender: function() {
        this.filteredTasks = this.tasks.filter(t => {
            const matchesSearch = t.title.toLowerCase().includes(this.searchQuery) || t.subject.toLowerCase().includes(this.searchQuery);
            const matchesPriority = this.filterPriority === 'all' || t.priority === this.filterPriority;
            return matchesSearch && matchesPriority;
        });
        this.renderTasks();
        this.renderCalendar();
        this.renderUrgentTasks();
        this.updateStats();
    },

    updateStats: function() {
        const total = this.tasks.length;
        const done = this.tasks.filter(t => t.completed).length;
        document.getElementById('totalTasksCount').textContent = total;
        document.getElementById('pendingTasksCount').textContent = total - done;
        document.getElementById('completedTasksCount').textContent = done;
    },

    renderTasks: function() {
        const container = document.getElementById('tasksContainer');
        if (!container) return;
        container.innerHTML = '';
        if (this.filteredTasks.length === 0) {
            container.innerHTML = `<div class="no-tasks-message">No tasks found.</div>`;
            return;
        }
        this.filteredTasks.sort((a,b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        }).forEach(t => {
            const card = document.createElement('div');
            card.className = `task-card ${t.completed ? 'completed' : ''}`;
            card.style.borderLeftColor = t.priority === 'high' ? 'var(--danger)' : (t.priority === 'medium' ? 'var(--warning)' : 'var(--success)');
            card.innerHTML = `
                <div class="task-card-top">
                    <span class="badge badge-${t.priority}">${t.priority}</span>
                    <div class="task-card-actions">
                        <button class="btn btn-outline task-card-edit-btn" onclick="app.navigate('task-form', {editId:'${t.id}'})"><i class="fa-solid fa-pen"></i></button>
                        <input type="checkbox" class="custom-checkbox" ${t.completed ? 'checked' : ''} onchange="app.handleToggle('${t.id}', this.checked)">
                    </div>
                </div>
                <div class="task-card-subject">${t.subject}</div>
                <h3 class="task-card-title" onclick="app.showTaskDetail('${t.id}')">${t.title}</h3>
                <div class="task-card-bottom">
                    <span class="task-card-date"><i class="fa-regular fa-calendar"></i> ${new Date(t.dueDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                    <button class="btn task-card-delete-btn" onclick="app.handleDelete('${t.id}')"><i class="fa-solid fa-trash-can"></i></button>
                </div>`;
            container.appendChild(card);
        });
    },

    // ══════════════════════════════════════════
    //  Urgent Tasks
    // ══════════════════════════════════════════

    renderUrgentTasks: function() {
        const container = document.getElementById('urgentTasksList');
        if (!container) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const priorityWeight = { high: 3, medium: 2, low: 1 };

        const pending = this.tasks.filter(t => !t.completed);

        // Score = priority weight * 10  +  closeness bonus (higher = more urgent)
        const scored = pending.map(t => {
            const due = new Date(t.dueDate);
            due.setHours(0, 0, 0, 0);
            const daysLeft = Math.round((due - today) / (1000 * 60 * 60 * 24));
            // Closer / overdue = larger closeness score
            const closeness = Math.max(0, 30 - daysLeft);
            const score = (priorityWeight[t.priority] || 1) * 10 + closeness;
            return { task: t, score };
        });

        scored.sort((a, b) => b.score - a.score);
        const top3 = scored.slice(0, 3);

        if (top3.length === 0) {
            container.innerHTML = '<p class="urgent-empty">No pending tasks!</p>';
            return;
        }

        container.innerHTML = top3.map(({ task: t }) => {
            const due = new Date(t.dueDate);
            const daysLeft = Math.round((due - today) / (1000 * 60 * 60 * 24));
            let dueLabel;
            if (daysLeft < 0) dueLabel = `<span class="urgent-overdue">${Math.abs(daysLeft)}d overdue</span>`;
            else if (daysLeft === 0) dueLabel = '<span class="urgent-today">Today</span>';
            else dueLabel = `<span class="urgent-days">${daysLeft}d left</span>`;
            return `
                <div class="urgent-item" onclick="app.showTaskDetail('${t.id}')">
                    <div class="urgent-item-left">
                        <span class="urgent-dot dot-${t.priority}"></span>
                        <div>
                            <div class="urgent-item-title">${t.title}</div>
                            <div class="urgent-item-subject">${t.subject}</div>
                        </div>
                    </div>
                    <div class="urgent-item-due">${dueLabel}</div>
                </div>`;
        }).join('');
    },

    // ══════════════════════════════════════════
    //  Subject Management
    // ══════════════════════════════════════════

    _defaultSubjects: ['Mathematics', 'Physics', 'Computer Science', 'Literature', 'History'],

    getSubjects: function() {
        if (!this.currentUserId) return this._defaultSubjects;
        const key = CONFIG.STORAGE.SUBJECTS_KEY + '_' + this.currentUserId;
        const stored = DB_API.get(key);
        return stored || this._defaultSubjects.slice();
    },

    saveSubjects: function(subjects) {
        if (!this.currentUserId) return;
        const key = CONFIG.STORAGE.SUBJECTS_KEY + '_' + this.currentUserId;
        DB_API.set(key, subjects);
    },

    addSubject: function(name) {
        const trimmed = name.trim();
        if (!trimmed) return false;
        const subjects = this.getSubjects();
        if (subjects.some(s => s.toLowerCase() === trimmed.toLowerCase())) return false;
        subjects.push(trimmed);
        this.saveSubjects(subjects);
        return true;
    },

    populateSubjectSelect: function(selectedValue) {
        const select = document.getElementById('taskSubject');
        if (!select) return;
        const subjects = this.getSubjects();
        select.innerHTML = subjects.map(s =>
            `<option value="${s}"${s === selectedValue ? ' selected' : ''}>${s}</option>`
        ).join('');
    },

    handleAddSubject: function() {
        const input = document.getElementById('newSubjectInput');
        const value = input.value.trim();
        if (!value) return;
        if (this.addSubject(value)) {
            this.populateSubjectSelect(value);
            input.value = '';
            document.getElementById('addSubjectRow').classList.remove('show');
            Utils.log('App', 'Added new subject: ' + value);
        } else {
            alert('Subject already exists or is invalid.');
        }
    },

    toggleAddSubject: function() {
        const row = document.getElementById('addSubjectRow');
        row.classList.toggle('show');
        if (row.classList.contains('show')) {
            document.getElementById('newSubjectInput').focus();
        }
    },

    changeMonth: function(dir) {
        this.currentDate.setMonth(this.currentDate.getMonth() + dir);
        this.renderCalendar();
    },

    renderCalendar: function() {
        const grid = document.getElementById('calendarGrid');
        const title = document.getElementById('calendarMonthYear');
        if (!grid || !title) return;
        grid.innerHTML = '';
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        title.textContent = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(this.currentDate);
        ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
            const div = document.createElement('div');
            div.className = 'calendar-day-label';
            div.textContent = day;
            grid.appendChild(div);
        });
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        for (let i = firstDay; i > 0; i--) this.createDayCell(prevMonthDays - i + 1, true, grid);
        for (let i = 1; i <= daysInMonth; i++) this.createDayCell(i, false, grid, year, month);
    },

    createDayCell: function(num, isOther, grid, year, month) {
        const cell = document.createElement('div');
        cell.className = `day-cell ${isOther ? 'other-month' : ''}`;
        const today = new Date();
        if (!isOther && num === today.getDate() && month === today.getMonth() && year === today.getFullYear()) cell.classList.add('today');
        cell.innerHTML = `<span class="day-number">${num}</span>`;
        if (!isOther) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(num).padStart(2, '0')}`;
            const dayTasks = this.tasks.filter(t => t.dueDate === dateStr);
            if (dayTasks.length > 0) {
                const dotContainer = document.createElement('div');
                dotContainer.className = 'task-dot-container';
                dayTasks.forEach(task => {
                    const dot = document.createElement('div');
                    dot.className = `task-dot dot-${task.priority}`;
                    dot.onclick = () => this.showTaskDetail(task.id);
                    dotContainer.appendChild(dot);
                });
                cell.appendChild(dotContainer);
            }
        }
        grid.appendChild(cell);
    },

    showTaskDetail: function(id) {
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        const temp = document.getElementById('task-detail-modal');
        const clone = temp.content.cloneNode(true);
        clone.getElementById('modalTitle').textContent = task.title;
        clone.getElementById('modalDesc').textContent = task.description || 'No additional details provided.';
        clone.getElementById('modalDate').innerHTML = `<i class="fa-regular fa-calendar"></i> Due: ${new Date(task.dueDate).toLocaleDateString('en-US', {dateStyle: 'full'})}`;
        const badge = document.createElement('span');
        badge.className = `badge badge-${task.priority}`;
        badge.textContent = task.priority + ' priority';
        clone.getElementById('modalBadgeContainer').appendChild(badge);
        clone.getElementById('modalEditBtn').onclick = () => { this.closeModal(); this.navigate('task-form', { editId: id }); };
        clone.getElementById('modalDeleteBtn').onclick = () => { this.closeModal(); this.handleDelete(id); };
        document.body.appendChild(clone);
    },

    closeModal: () => { const modal = document.getElementById('modalOverlay'); if (modal) modal.remove(); },

    initTaskForm: function(params) {
        const task = params.editId ? this.tasks.find(t => t.id === params.editId) : null;
        setTimeout(() => {
            this.populateSubjectSelect(task ? task.subject : null);
            if (task) {
                document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Task';
                document.getElementById('taskId').value = task.id;
                document.getElementById('taskTitle').value = task.title;
                document.getElementById('taskPriority').value = task.priority;
                document.getElementById('taskDueDate').value = task.dueDate;
                document.getElementById('taskDescription').value = task.description;
            } else { document.getElementById('taskDueDate').valueAsDate = new Date(); }
        }, 0);
    }
};

window.onload = () => app.init();