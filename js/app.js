/**
 * Main Application Controller
 * Handles SPA routing, UI interactions, and Business Logic
 */

// MOCK CLIENT FOR FUNCTIONALITY (Replace with your actual TestClient)
        const TestClient = {
            currentUser: null,
            tasks: [],
            login: async (e, p) => ({ data: { user: { name: 'Alex Johnson', email: e } } }),
            register: async (e, p, n) => ({ data: { user: { name: n, email: e } } }),
            getTasks: async () => ({ data: { tasks: TestClient.tasks } }),
            createTask: async (t) => { t.id = Math.random().toString(36).substr(2, 9); TestClient.tasks.push(t); return { data: t }; },
            updateTask: async (id, data) => { 
                const idx = TestClient.tasks.findIndex(t => t.id === id);
                if(idx > -1) TestClient.tasks[idx] = { ...TestClient.tasks[idx], ...data };
            },
            deleteTask: async (id) => { TestClient.tasks = TestClient.tasks.filter(t => t.id !== id); },
            restoreSession: () => {
                const saved = localStorage.getItem('study_user');
                return saved ? JSON.parse(saved) : null;
            },
            logout: () => localStorage.removeItem('study_user')
        };

        const app = {
            currentUser: null,
            tasks: [],
            currentDate: new Date(),

            init: function() {
                this.currentUser = TestClient.restoreSession();
                this.navigate(this.currentUser ? 'dashboard' : 'login');
            },

            navigate: function(view, params = {}) {
                const container = document.getElementById('app');
                const template = document.getElementById(`${view}-template`);
                container.innerHTML = '';
                container.appendChild(template.content.cloneNode(true));
                
                if (view === 'dashboard') this.initDashboard();
                if (view === 'task-form') this.initTaskForm(params);
            },

            // --- AUTH ---
            handleLogin: async function(e) {
                e.preventDefault();
                const resp = await TestClient.login(document.getElementById('loginEmail').value, '');
                this.currentUser = resp.data.user;
                localStorage.setItem('study_user', JSON.stringify(this.currentUser));
                this.navigate('dashboard');
            },

            handleRegister: async function(e) {
                e.preventDefault();
                const resp = await TestClient.register(document.getElementById('regEmail').value, '', document.getElementById('regName').value);
                this.currentUser = resp.data.user;
                localStorage.setItem('study_user', JSON.stringify(this.currentUser));
                this.navigate('dashboard');
            },

            handleLogout: function() {
                TestClient.logout();
                this.currentUser = null;
                this.navigate('login');
            },

            // --- DASHBOARD ---
            initDashboard: function() {
                document.getElementById('userNameDisplay').textContent = this.currentUser.name;
                this.loadTasks();
            },

            loadTasks: async function() {
                const resp = await TestClient.getTasks();
                this.tasks = resp.data.tasks;
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
                container.innerHTML = '';
                this.tasks.forEach(t => {
                    const card = document.createElement('div');
                    card.className = `task-card ${t.completed ? 'completed' : ''}`;
                    card.style.borderLeftColor = t.priority === 'high' ? 'var(--danger)' : (t.priority === 'medium' ? 'var(--warning)' : 'var(--success)');
                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between;">
                            <span class="badge badge-${t.priority}">${t.priority}</span>
                            <div>
                                <button class="btn" onclick="app.initTaskForm({task:'${t.id}'}); app.navigate('task-form', {task: app.tasks.find(x=>x.id==='${t.id}')})"><i class="fa-solid fa-pen"></i></button>
                                <button class="btn" onclick="app.handleDelete('${t.id}')"><i class="fa-solid fa-trash" style="color:var(--danger)"></i></button>
                            </div>
                        </div>
                        <div style="color:var(--primary); font-size:0.8rem; font-weight:bold; margin:5px 0;">${t.subject}</div>
                        <h3 style="margin-bottom:10px;">${t.title}</h3>
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:0.8rem; color:var(--text-muted)"><i class="fa-regular fa-calendar"></i> ${t.dueDate}</span>
                            <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="app.handleToggle('${t.id}', this.checked)">
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

                // Weekday Labels
                ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(day => {
                    const div = document.createElement('div');
                    div.className = 'calendar-day-label';
                    div.textContent = day;
                    grid.appendChild(div);
                });

                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const prevDays = new Date(year, month, 0).getDate();

                // Empty cells for previous month
                for (let i = firstDay; i > 0; i--) {
                    this.createDayCell(prevDays - i + 1, true, grid);
                }

                // Actual days
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
                            dot.onclick = () => this.showTaskDetail(task);
                            dotContainer.appendChild(dot);
                        });
                        cell.appendChild(dotContainer);
                    }
                }
                grid.appendChild(cell);
            },

            // --- POPUP / MODAL ---
            showTaskDetail: function(task) {
                const temp = document.getElementById('task-detail-modal');
                const clone = temp.content.cloneNode(true);
                
                clone.getElementById('modalTitle').textContent = task.title;
                clone.getElementById('modalSubject').textContent = task.subject;
                clone.getElementById('modalDesc').textContent = task.description || 'No additional details.';
                clone.getElementById('modalDate').innerHTML = `<i class="fa-regular fa-calendar"></i> Due: ${task.dueDate}`;
                
                clone.getElementById('modalEditBtn').onclick = () => {
                    this.closeModal();
                    this.navigate('task-form', { task: task });
                };

                document.body.appendChild(clone);
            },

            closeModal: function() {
                const modal = document.querySelector('.modal-overlay');
                if (modal) modal.remove();
            },

            // --- TASK ACTIONS ---
            initTaskForm: function(params) {
                const task = params.task;
                setTimeout(() => {
                    if (task) {
                        document.getElementById('formTitle').textContent = 'Edit Task';
                        document.getElementById('taskId').value = task.id;
                        document.getElementById('taskTitle').value = task.title;
                        document.getElementById('taskSubject').value = task.subject;
                        document.getElementById('taskPriority').value = task.priority;
                        document.getElementById('taskDueDate').value = task.dueDate;
                        document.getElementById('taskDescription').value = task.description;
                    }
                }, 0);
            },

            handleTaskSubmit: async function(e) {
                e.preventDefault();
                const id = document.getElementById('taskId').value;
                const data = {
                    title: document.getElementById('taskTitle').value,
                    subject: document.getElementById('taskSubject').value,
                    priority: document.getElementById('taskPriority').value,
                    dueDate: document.getElementById('taskDueDate').value,
                    description: document.getElementById('taskDescription').value,
                    completed: false
                };

                if (id) await TestClient.updateTask(id, data);
                else await TestClient.createTask(data);

                this.navigate('dashboard');
            },

            handleToggle: async function(id, val) {
                await TestClient.updateTask(id, { completed: val });
                this.loadTasks();
            },

            handleDelete: async function(id) {
                if(confirm('Delete this task?')) {
                    await TestClient.deleteTask(id);
                    this.loadTasks();
                }
            }
        };

        window.onload = () => app.init();

document.addEventListener('DOMContentLoaded', () => app.init());