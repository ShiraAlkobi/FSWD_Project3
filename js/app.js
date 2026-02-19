
        /**
         * LOCAL STORAGE CLIENT
         * Logic: Users are stored in an array. Tasks are stored per email key.
         */
        const StudyStorage = {
            USERS_KEY: 'study_planner_users',
            
            getUsers: () => JSON.parse(localStorage.getItem(StudyStorage.USERS_KEY) || '[]'),
            
            register: (email, password, name) => {
                const users = StudyStorage.getUsers();
                if (users.find(u => u.email === email)) return { success: false, message: "User exists" };
                const newUser = { email, password, name };
                users.push(newUser);
                localStorage.setItem(StudyStorage.USERS_KEY, JSON.stringify(users));
                return { success: true, user: { email, name } };
            },

            login: (email, password) => {
                const users = StudyStorage.getUsers();
                const user = users.find(u => u.email === email && u.password === password);
                if (!user) return { success: false, message: "Invalid credentials" };
                return { success: true, user: { email: user.email, name: user.name } };
            },

            getTasks: (email) => JSON.parse(localStorage.getItem(`tasks_${email}`) || '[]'),
            
            saveTasks: (email, tasks) => localStorage.setItem(`tasks_${email}`, JSON.stringify(tasks))
        };

        const app = {
            currentUser: null,
            tasks: [],
            filteredTasks: [],
            currentDate: new Date(),
            searchQuery: '',
            filterPriority: 'all',

            init: function() {
                const savedUser = localStorage.getItem('study_current_session');
                if (savedUser) {
                    this.currentUser = JSON.parse(savedUser);
                    this.navigate('dashboard');
                } else {
                    this.navigate('login');
                }
            },

            // --- NAVIGATION ---
            navigate: function(view, params = {}) {
                const container = document.getElementById('app');
                const template = document.getElementById(`${view}-template`);
                if (!template) return;
                
                container.innerHTML = '';
                container.appendChild(template.content.cloneNode(true));
                
                if (view === 'dashboard') this.initDashboard();
                if (view === 'task-form') this.initTaskForm(params);
            },

            // --- AUTH LOGIC ---
            handleLogin: function(e) {
                e.preventDefault();
                const email = document.getElementById('loginEmail').value;
                const pass = document.getElementById('loginPassword').value;
                const result = StudyStorage.login(email, pass);
                
                if (result.success) {
                    this.currentUser = result.user;
                    localStorage.setItem('study_current_session', JSON.stringify(this.currentUser));
                    this.navigate('dashboard');
                } else {
                    const err = document.getElementById('loginError');
                    err.textContent = result.message;
                    err.style.display = 'block';
                }
            },

            handleRegister: function(e) {
                e.preventDefault();
                const name = document.getElementById('regName').value;
                const email = document.getElementById('regEmail').value;
                const pass = document.getElementById('regPassword').value;
                
                const result = StudyStorage.register(email, pass, name);
                if (result.success) {
                    this.currentUser = result.user;
                    localStorage.setItem('study_current_session', JSON.stringify(this.currentUser));
                    this.navigate('dashboard');
                } else {
                    alert(result.message);
                }
            },

            handleLogout: function() {
                localStorage.removeItem('study_current_session');
                this.currentUser = null;
                this.navigate('login');
            },

            // --- DASHBOARD LOGIC ---
            initDashboard: function() {
                document.getElementById('userNameDisplay').textContent = this.currentUser.name;
                this.loadTasks();
            },

            loadTasks: function() {
                this.tasks = StudyStorage.getTasks(this.currentUser.email);
                this.applyFiltersAndRender();
            },

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
                    const matchesSearch = t.title.toLowerCase().includes(this.searchQuery) || 
                                          t.subject.toLowerCase().includes(this.searchQuery);
                    const matchesPriority = this.filterPriority === 'all' || t.priority === this.filterPriority;
                    return matchesSearch && matchesPriority;
                });
                
                this.renderTasks();
                this.renderCalendar();
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
                    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted)">No tasks found.</div>`;
                    return;
                }

                this.filteredTasks.sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate)).forEach(t => {
                    const card = document.createElement('div');
                    card.className = `task-card ${t.completed ? 'completed' : ''}`;
                    card.style.borderLeftColor = t.priority === 'high' ? 'var(--danger)' : (t.priority === 'medium' ? 'var(--warning)' : 'var(--success)');
                    
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items: flex-start; margin-bottom: 8px;">
                            <span class="badge badge-${t.priority}">${t.priority}</span>
                            <div style="display: flex; gap: 10px; align-items: center;">
                                <button class="btn btn-outline" style="padding: 4px 8px; font-size: 0.8rem;" onclick="app.navigate('task-form', {editId:'${t.id}'})"><i class="fa-solid fa-pen"></i></button>
                                <input type="checkbox" class="custom-checkbox" ${t.completed ? 'checked' : ''} onchange="app.handleToggle('${t.id}', this.checked)">
                            </div>
                        </div>
                        <div style="color:var(--primary); font-size:0.75rem; font-weight:700; text-transform: uppercase;">${t.subject}</div>
                        <h3 style="margin: 5px 0 12px 0; font-size: 1.1rem; cursor:pointer;" onclick="app.showTaskDetail('${t.id}')">${t.title}</h3>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.8rem; color:var(--text-muted)"><i class="fa-regular fa-calendar"></i> ${new Date(t.dueDate).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}</span>
                            <button class="btn" style="background:none; padding:0; color:var(--danger)" onclick="app.handleDelete('${t.id}')"><i class="fa-solid fa-trash-can"></i></button>
                        </div>
                    `;
                    container.appendChild(card);
                });
            },

            // --- CALENDAR LOGIC ---
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

                // Prev month padding
                for (let i = firstDay; i > 0; i--) {
                    this.createDayCell(prevMonthDays - i + 1, true, grid);
                }

                // Current month
                for (let i = 1; i <= daysInMonth; i++) {
                    this.createDayCell(i, false, grid, year, month);
                }
            },

            createDayCell: function(num, isOther, grid, year, month) {
                const cell = document.createElement('div');
                cell.className = `day-cell ${isOther ? 'other-month' : ''}`;
                
                const today = new Date();
                if (!isOther && num === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
                    cell.classList.add('today');
                }

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
                            dot.title = task.title;
                            dot.onclick = () => this.showTaskDetail(task.id);
                            dotContainer.appendChild(dot);
                        });
                        cell.appendChild(dotContainer);
                    }
                }
                grid.appendChild(cell);
            },

            // --- MODALS ---
            showTaskDetail: function(id) {
                const task = this.tasks.find(t => t.id === id);
                if (!task) return;

                const temp = document.getElementById('task-detail-modal');
                const clone = temp.content.cloneNode(true);
                
                clone.getElementById('modalTitle').textContent = task.title;
                clone.getElementById('modalSubject').textContent = task.subject;
                clone.getElementById('modalDesc').textContent = task.description || 'No additional details provided for this task.';
                clone.getElementById('modalDate').innerHTML = `<i class="fa-regular fa-calendar"></i> Due: ${new Date(task.dueDate).toLocaleDateString('en-US', {dateStyle: 'full'})}`;
                
                const badge = document.createElement('span');
                badge.className = `badge badge-${task.priority}`;
                badge.textContent = task.priority + ' priority';
                clone.getElementById('modalBadgeContainer').appendChild(badge);

                clone.getElementById('modalEditBtn').onclick = () => {
                    this.closeModal();
                    this.navigate('task-form', { editId: id });
                };

                clone.getElementById('modalDeleteBtn').onclick = () => {
                    this.closeModal();
                    this.handleDelete(id);
                };

                document.body.appendChild(clone);
            },

            closeModal: function() {
                const modal = document.getElementById('modalOverlay');
                if (modal) modal.remove();
            },

            // --- TASK MUTATION ---
            initTaskForm: function(params) {
                const id = params.editId;
                const task = id ? this.tasks.find(t => t.id === id) : null;

                // Use timeout to ensure template is injected first
                setTimeout(() => {
                    if (task) {
                        document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Edit Task';
                        document.getElementById('taskId').value = task.id;
                        document.getElementById('taskTitle').value = task.title;
                        document.getElementById('taskSubject').value = task.subject;
                        document.getElementById('taskPriority').value = task.priority;
                        document.getElementById('taskDueDate').value = task.dueDate;
                        document.getElementById('taskDescription').value = task.description;
                    } else {
                        // Set default date to today
                        document.getElementById('taskDueDate').valueAsDate = new Date();
                    }
                }, 0);
            },

            handleTaskSubmit: function(e) {
                e.preventDefault();
                const id = document.getElementById('taskId').value;
                const data = {
                    title: document.getElementById('taskTitle').value,
                    subject: document.getElementById('taskSubject').value,
                    priority: document.getElementById('taskPriority').value,
                    dueDate: document.getElementById('taskDueDate').value,
                    description: document.getElementById('taskDescription').value,
                };

                if (id) {
                    const idx = this.tasks.findIndex(t => t.id === id);
                    if (idx > -1) this.tasks[idx] = { ...this.tasks[idx], ...data };
                } else {
                    data.id = 'task_' + Date.now();
                    data.completed = false;
                    this.tasks.push(data);
                }

                StudyStorage.saveTasks(this.currentUser.email, this.tasks);
                this.navigate('dashboard');
            },

            handleToggle: function(id, val) {
                const idx = this.tasks.findIndex(t => t.id === id);
                if (idx > -1) {
                    this.tasks[idx].completed = val;
                    StudyStorage.saveTasks(this.currentUser.email, this.tasks);
                    this.loadTasks();
                }
            },

            handleDelete: function(id) {
                // Inline confirmation for simplicity in SPA environment
                const confirmation = confirm("Are you sure you want to delete this task?");
                if (confirmation) {
                    this.tasks = this.tasks.filter(t => t.id !== id);
                    StudyStorage.saveTasks(this.currentUser.email, this.tasks);
                    this.loadTasks();
                }
            }
        };

        // Boot
        window.onload = () => app.init();
    