/**
 * ÚKOLOVNÍK - Czech Task Management Application
 * 
 * A production-ready task manager with localStorage persistence,
 * filtering, categorization, priority levels, and full Czech localization
 * including proper grammatical declension.
 */

/* ================================================================
   APPLICATION STATE & CONSTANTS
   ================================================================ */

const STORAGE_KEY = 'arch_ukoly_v1';
const TASK_CATEGORIES = ['Škola', 'Finance', 'Osobní', 'Cvičení', 'Práce', 'Zdraví', 'Nákupy', 'Domácnost'];
const TASK_PRIORITIES = ['Nízká', 'Střední', 'Vysoká'];
const DEFAULT_CATEGORY = 'Osobní';
const DEFAULT_PRIORITY = 'Nízká';
const MAX_TASK_LENGTH = 200;
const DUE_CHECK_INTERVAL_MS = 1000;

/**
 * Application state manager
 */
const AppState = {
    tasks: [],
    currentFilter: 'all',        // 'all', 'active', 'completed'
    currentCategoryFilter: 'all', // category name or 'all'
    editingTaskId: null,          // id of the task currently being edited

    /**
     * Load all tasks from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            const parsed = stored ? JSON.parse(stored) : [];
            this.tasks = normalizeTasks(parsed);
            return this.tasks;
        } catch (err) {
            console.error('Failed to load tasks from localStorage:', err);
            this.tasks = [];
            return [];
        }
    },

    /**
     * Persist all tasks to localStorage
     */
    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks));
        } catch (err) {
            console.error('Failed to save tasks to localStorage:', err);
        }
    },

    /**
     * Add a new task
     * @param {Object} taskData - { text, category, priority, dueAt }
     * @returns {Object} Created task
     */
    addTask(taskData) {
        const task = {
            id: crypto.randomUUID(),
            text: taskData.text.trim(),
            category: taskData.category,
            priority: taskData.priority,
            completed: false,
            createdAt: Date.now(),
            dueAt: taskData.dueAt ?? null,
            dueAlerted: false,
            order: 0,
        };

        this.tasks.unshift(task); // Add to beginning for chronological display
        this.reindexOrder();
        this.save();
        return task;
    },

    /**
     * Update an existing task
     * @param {string} taskId
     * @param {Object} taskData - { text, category, priority, dueAt }
     * @returns {boolean} Whether the task was found and updated
     */
    updateTask(taskId, taskData) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return false;

        task.text = taskData.text.trim();
        task.category = taskData.category;
        task.priority = taskData.priority;

        const dueAt = taskData.dueAt ?? null;
        if (dueAt !== task.dueAt) {
            task.dueAt = dueAt;
            task.dueAlerted = false; // New due time may trigger a new alert
        }

        this.save();
        return true;
    },

    /**
     * Toggle task completion status
     * @param {string} taskId
     */
    toggleTaskCompletion(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.save();
        }
    },

    /**
     * Delete a task
     * @param {string} taskId
     */
    deleteTask(taskId) {
        this.tasks = this.tasks.filter(t => t.id !== taskId);
        this.reindexOrder();
        this.save();
    },

    /**
     * Move a task next to another task (drag and drop reordering)
     * @param {string} draggedId
     * @param {string} targetId
     * @param {boolean} placeAfter - Insert below the target instead of above
     * @returns {boolean} Whether the order changed
     */
    moveTask(draggedId, targetId, placeAfter) {
        if (draggedId === targetId) return false;

        this.sortByOrder();

        const fromIndex = this.tasks.findIndex(t => t.id === draggedId);
        const targetIndex = this.tasks.findIndex(t => t.id === targetId);
        if (fromIndex === -1 || targetIndex === -1) return false;

        const [dragged] = this.tasks.splice(fromIndex, 1);
        const newTargetIndex = this.tasks.findIndex(t => t.id === targetId);
        this.tasks.splice(newTargetIndex + (placeAfter ? 1 : 0), 0, dragged);

        this.reindexOrder();
        this.save();
        return true;
    },

    /**
     * Move a task one position up or down within the current filtered view
     * @param {string} taskId
     * @param {number} direction - -1 for up, 1 for down
     * @returns {boolean} Whether the order changed
     */
    moveTaskByStep(taskId, direction) {
        const visible = this.getFilteredTasks();
        const index = visible.findIndex(t => t.id === taskId);
        const neighbour = visible[index + direction];
        if (index === -1 || !neighbour) return false;

        return this.moveTask(taskId, neighbour.id, direction > 0);
    },

    /**
     * Replace all tasks (used by import)
     * @param {Array} tasks - Already normalized tasks
     */
    replaceTasks(tasks) {
        this.tasks = tasks;
        this.reindexOrder();
        this.save();
    },

    /**
     * Sort the internal task array by its persisted manual order
     */
    sortByOrder() {
        this.tasks.sort((a, b) => a.order - b.order);
    },

    /**
     * Renumber the manual order so it matches the array positions
     */
    reindexOrder() {
        this.tasks.forEach((task, index) => {
            task.order = index;
        });
    },

    /**
     * Get filtered tasks based on current filters
     * @returns {Array} Filtered tasks in their manual order
     */
    getFilteredTasks() {
        const filtered = this.tasks.filter(task => {
            // Status filter
            if (this.currentFilter === 'active' && task.completed) return false;
            if (this.currentFilter === 'completed' && !task.completed) return false;

            // Category filter
            if (this.currentCategoryFilter !== 'all' && task.category !== this.currentCategoryFilter) {
                return false;
            }

            return true;
        });

        // Respect the manual (drag and drop) order
        return filtered.sort((a, b) => a.order - b.order);
    },

    /**
     * Get count of incomplete tasks
     * @returns {number}
     */
    getRemainingCount() {
        return this.tasks.filter(t => !t.completed).length;
    },

    /**
     * Get count of completed tasks
     * @returns {number}
     */
    getCompletedCount() {
        return this.tasks.filter(t => t.completed).length;
    },

    /**
     * Set status filter
     * @param {string} filter - 'all', 'active', or 'completed'
     */
    setStatusFilter(filter) {
        this.currentFilter = filter;
    },

    /**
     * Set category filter
     * @param {string} category - category name or 'all'
     */
    setCategoryFilter(category) {
        this.currentCategoryFilter = category;
    },
};

/* ================================================================
   TASK VALIDATION & NORMALIZATION
   ================================================================ */

/**
 * Validate and normalize a single task coming from storage or an import file
 * @param {*} raw
 * @returns {Object|null} Normalized task, or null if the data is unusable
 */
function normalizeTask(raw) {
    if (!raw || typeof raw !== 'object') return null;

    const text = typeof raw.text === 'string' ? raw.text.trim() : '';
    if (!text || text.length > MAX_TASK_LENGTH) return null;

    const dueAt = Number.isFinite(raw.dueAt) ? raw.dueAt : null;

    return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
        text,
        category: TASK_CATEGORIES.includes(raw.category) ? raw.category : DEFAULT_CATEGORY,
        priority: TASK_PRIORITIES.includes(raw.priority) ? raw.priority : DEFAULT_PRIORITY,
        completed: raw.completed === true,
        createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now(),
        dueAt,
        dueAlerted: raw.dueAlerted === true,
        order: Number.isFinite(raw.order) ? raw.order : null,
    };
}

/**
 * Validate and normalize a list of tasks, assigning a manual order to
 * tasks that do not have one yet (data saved before reordering existed).
 * @param {*} rawList
 * @returns {Array} Normalized tasks sorted by their manual order
 */
function normalizeTasks(rawList) {
    if (!Array.isArray(rawList)) return [];

    const tasks = rawList.map(normalizeTask).filter(Boolean);

    // Legacy tasks without an order get one derived from the original
    // priority / creation date sorting so the list looks unchanged.
    const legacy = tasks.filter(t => t.order === null);
    if (legacy.length) {
        const priorityOrder = { 'Vysoká': 0, 'Střední': 1, 'Nízká': 2 };
        legacy.sort((a, b) => {
            const aPriority = priorityOrder[a.priority] ?? 2;
            const bPriority = priorityOrder[b.priority] ?? 2;
            if (aPriority !== bPriority) return aPriority - bPriority;
            return b.createdAt - a.createdAt;
        });

        const maxOrder = tasks.reduce((max, t) => (t.order === null ? max : Math.max(max, t.order)), -1);
        legacy.forEach((task, index) => {
            task.order = maxOrder + 1 + index;
        });
    }

    tasks.sort((a, b) => a.order - b.order);
    tasks.forEach((task, index) => {
        task.order = index;
    });

    return tasks;
}

/* ================================================================
   CZECH LOCALIZATION UTILITIES
   ================================================================ */

/**
 * Generate Czech plural form with correct declension
 * Rules:
 * - 1 zbývající úkol
 * - 2-4 zbývající úkoly
 * - 0 nebo 5+ zbývajících úkolů
 * 
 * @param {number} count
 * @returns {string}
 */
function getTaskCountText(count) {
    if (count === 1) {
        return `${count} zbývající úkol`;
    } else if (count >= 2 && count <= 4) {
        return `${count} zbývající úkoly`;
    } else {
        return `${count} zbývajících úkolů`;
    }
}

/**
 * Map priority to display name and CSS class suffix
 * @param {string} priority
 * @returns {Object} { name, cssClass }
 */
function getPriorityInfo(priority) {
    const map = {
        'Vysoká': { name: 'Vysoká', cssClass: 'high' },
        'Střední': { name: 'Střední', cssClass: 'medium' },
        'Nízká': { name: 'Nízká', cssClass: 'low' },
    };
    return map[priority] || { name: priority, cssClass: 'low' };
}

/* ================================================================
   DOM ELEMENTS & CACHE
   ================================================================ */

const DOM = {
    taskForm: document.getElementById('task-form'),
    taskInput: document.getElementById('task-input'),
    taskCategory: document.getElementById('task-category'),
    taskPriority: document.getElementById('task-priority'),
    taskDue: document.getElementById('task-due'),
    taskList: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    remainingCount: document.getElementById('remaining-count'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    categoryFilterBtns: document.querySelectorAll('.category-filter-btn'),
    exportBtn: document.getElementById('export-btn'),
    importBtn: document.getElementById('import-btn'),
    importInput: document.getElementById('import-input'),
    progressChart: document.getElementById('progress-chart'),
    chartFallback: document.getElementById('chart-fallback'),
};

/* ================================================================
   FORM HANDLING
   ================================================================ */

/**
 * Initialize form event listeners
 */
function initializeForm() {
    DOM.taskForm.addEventListener('submit', handleFormSubmit);
    DOM.taskInput.addEventListener('keydown', handleInputKeydown);
}

/**
 * Handle form submission
 * @param {Event} event
 */
function handleFormSubmit(event) {
    event.preventDefault();

    const text = DOM.taskInput.value.trim();

    // Validation
    if (!isValidTaskText(text)) {
        DOM.taskInput.focus();
        return;
    }

    // Create task
    AppState.addTask({
        text,
        category: DOM.taskCategory.value,
        priority: DOM.taskPriority.value,
        dueAt: parseDateTimeLocal(DOM.taskDue.value),
    });

    // Reset form
    DOM.taskInput.value = '';
    DOM.taskDue.value = '';
    DOM.taskInput.focus();

    // Re-render UI
    render();
}

/**
 * Handle keyboard events in task input
 * - Enter: submit form
 * - Escape: clear input
 * 
 * @param {KeyboardEvent} event
 */
function handleInputKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        DOM.taskForm.dispatchEvent(new Event('submit'));
    }

    if (event.key === 'Escape') {
        event.preventDefault();
        DOM.taskInput.value = '';
    }
}

/* ================================================================
   FILTER HANDLING
   ================================================================ */

/**
 * Initialize filter button event listeners
 */
function initializeFilters() {
    // Status filters
    DOM.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleStatusFilterChange(btn));
    });

    // Category filters
    DOM.categoryFilterBtns.forEach(btn => {
        btn.addEventListener('click', () => handleCategoryFilterChange(btn));
    });
}

/**
 * Handle status filter (all/active/completed) change
 * @param {HTMLElement} clickedBtn
 */
function handleStatusFilterChange(clickedBtn) {
    const filter = clickedBtn.dataset.filter;

    // Update state
    AppState.setStatusFilter(filter);

    // Update UI
    DOM.filterBtns.forEach(btn => {
        const isActive = btn.dataset.filter === filter;
        btn.classList.toggle('filter-btn--active', isActive);
        btn.setAttribute('aria-pressed', isActive);
    });

    // Re-render
    render();
}

/**
 * Handle category filter change
 * @param {HTMLElement} clickedBtn
 */
function handleCategoryFilterChange(clickedBtn) {
    const category = clickedBtn.dataset.category;

    // Update state
    AppState.setCategoryFilter(category);

    // Update UI
    DOM.categoryFilterBtns.forEach(btn => {
        const isActive = btn.dataset.category === category;
        btn.setAttribute('aria-pressed', isActive);
    });

    // Re-render
    render();
}

/* ================================================================
   TASK LIST RENDERING
   ================================================================ */

/**
 * Render the entire application
 */
function render() {
    renderTasks();
    updateCounter();
    renderChart();
}

/**
 * Render task list based on current filters
 */
function renderTasks() {
    const filteredTasks = AppState.getFilteredTasks();

    // Clear list
    DOM.taskList.innerHTML = '';

    // Show/hide empty state
    const isEmpty = filteredTasks.length === 0;
    DOM.emptyState.classList.toggle('hidden', !isEmpty);

    // Render each task
    filteredTasks.forEach(task => {
        const taskElement = AppState.editingTaskId === task.id
            ? createTaskEditElement(task)
            : createTaskElement(task);
        DOM.taskList.appendChild(taskElement);
    });
}

/**
 * Create a task list item element
 * @param {Object} task
 * @returns {HTMLElement}
 */
function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'task-item--completed' : ''}`;
    li.dataset.taskId = task.id;
    li.draggable = true;

    const priorityInfo = getPriorityInfo(task.priority);
    const dueBadge = task.dueAt
        ? `<span class="task-badge task-due ${!task.completed && task.dueAt <= Date.now() ? 'task-due--overdue' : ''}">
                ${escapeHtml(formatDueDate(task.dueAt))}
            </span>`
        : '';

    li.innerHTML = `
        <span class="task-drag-handle" aria-hidden="true" title="Přetažením změníte pořadí">⠿</span>
        <input
            type="checkbox"
            class="task-checkbox"
            ${task.completed ? 'checked' : ''}
            aria-label="Označit úkol jako ${task.completed ? 'nehotový' : 'hotový'}"
        />
        <div class="task-content">
            <span class="task-text">${escapeHtml(task.text)}</span>
            <div class="task-meta">
                <span class="task-badge task-category">${escapeHtml(task.category)}</span>
                <span class="task-badge task-priority task-priority--${priorityInfo.cssClass}">
                    ${priorityInfo.name}
                </span>
                ${dueBadge}
            </div>
        </div>
        <div class="task-actions">
            <button
                class="task-move-btn task-move-btn--up"
                aria-label="Posunout úkol nahoru"
                title="Nahoru"
            >↑</button>
            <button
                class="task-move-btn task-move-btn--down"
                aria-label="Posunout úkol dolů"
                title="Dolů"
            >↓</button>
            <button
                class="task-edit-btn"
                aria-label="Upravit úkol"
                title="Upravit"
            >✎</button>
            <button
                class="task-delete-btn"
                aria-label="Smazat úkol"
                title="Smazat"
            ></button>
        </div>
    `;

    // Attach event listeners
    const checkbox = li.querySelector('.task-checkbox');
    const deleteBtn = li.querySelector('.task-delete-btn');
    const editBtn = li.querySelector('.task-edit-btn');
    const upBtn = li.querySelector('.task-move-btn--up');
    const downBtn = li.querySelector('.task-move-btn--down');

    checkbox.addEventListener('change', () => handleTaskToggle(task.id));
    deleteBtn.addEventListener('click', () => handleTaskDelete(task.id, li));
    editBtn.addEventListener('click', () => handleTaskEditStart(task.id));
    upBtn.addEventListener('click', () => handleTaskMove(task.id, -1));
    downBtn.addEventListener('click', () => handleTaskMove(task.id, 1));

    attachDragHandlers(li, task.id);

    return li;
}

/**
 * Create the inline edit form for a task
 * @param {Object} task
 * @returns {HTMLElement}
 */
function createTaskEditElement(task) {
    const li = document.createElement('li');
    li.className = 'task-item task-item--editing';
    li.dataset.taskId = task.id;

    li.innerHTML = `
        <form class="task-edit-form">
            <input
                type="text"
                class="task-input task-edit-text"
                value="${escapeHtml(task.text)}"
                maxlength="${MAX_TASK_LENGTH}"
                autocomplete="off"
                aria-label="Upravit text úkolu"
            >
            <div class="task-edit-row">
                <select class="form-select task-edit-category" aria-label="Upravit kategorii">
                    ${buildOptionsHtml(TASK_CATEGORIES, task.category)}
                </select>
                <select class="form-select task-edit-priority" aria-label="Upravit prioritu">
                    ${buildOptionsHtml(TASK_PRIORITIES, task.priority)}
                </select>
                <input
                    type="datetime-local"
                    class="task-input task-edit-due"
                    value="${escapeHtml(toDateTimeLocal(task.dueAt))}"
                    aria-label="Upravit termín úkolu"
                >
            </div>
            <div class="task-edit-actions">
                <button type="submit" class="btn btn--small btn--primary">Uložit</button>
                <button type="button" class="btn btn--small task-edit-cancel">Zrušit</button>
            </div>
        </form>
    `;

    const form = li.querySelector('.task-edit-form');
    const textInput = li.querySelector('.task-edit-text');

    form.addEventListener('submit', event => {
        event.preventDefault();
        handleTaskEditSave(task.id, li);
    });
    li.querySelector('.task-edit-cancel').addEventListener('click', handleTaskEditCancel);
    textInput.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            handleTaskEditCancel();
        }
    });

    // Focus the text field as soon as the edit mode opens
    setTimeout(() => textInput.focus(), 0);

    return li;
}

/**
 * Build <option> markup for a select element
 * @param {Array<string>} values
 * @param {string} selected
 * @returns {string}
 */
function buildOptionsHtml(values, selected) {
    return values
        .map(value => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(value)}</option>`)
        .join('');
}

/* ================================================================
   DRAG AND DROP REORDERING
   ================================================================ */

let draggedTaskId = null;

/**
 * Attach drag and drop handlers to a task element
 * @param {HTMLElement} li
 * @param {string} taskId
 */
function attachDragHandlers(li, taskId) {
    li.addEventListener('dragstart', event => {
        draggedTaskId = taskId;
        li.classList.add('task-item--dragging');
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', taskId);
        }
    });

    li.addEventListener('dragend', () => {
        draggedTaskId = null;
        li.classList.remove('task-item--dragging');
        clearDropIndicators();
    });

    li.addEventListener('dragover', event => {
        if (!draggedTaskId || draggedTaskId === taskId) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';

        const placeAfter = isPointerBelowMiddle(event, li);
        li.classList.toggle('task-item--drop-below', placeAfter);
        li.classList.toggle('task-item--drop-above', !placeAfter);
    });

    li.addEventListener('dragleave', () => {
        li.classList.remove('task-item--drop-above', 'task-item--drop-below');
    });

    li.addEventListener('drop', event => {
        event.preventDefault();
        const sourceId = draggedTaskId || (event.dataTransfer && event.dataTransfer.getData('text/plain'));
        clearDropIndicators();
        if (!sourceId || sourceId === taskId) return;

        if (AppState.moveTask(sourceId, taskId, isPointerBelowMiddle(event, li))) {
            render();
        }
    });
}

/**
 * Whether the pointer is in the lower half of an element
 * @param {DragEvent} event
 * @param {HTMLElement} element
 * @returns {boolean}
 */
function isPointerBelowMiddle(event, element) {
    const rect = element.getBoundingClientRect();
    return event.clientY > rect.top + rect.height / 2;
}

/**
 * Remove all drop position indicators
 */
function clearDropIndicators() {
    DOM.taskList.querySelectorAll('.task-item--drop-above, .task-item--drop-below').forEach(item => {
        item.classList.remove('task-item--drop-above', 'task-item--drop-below');
    });
}

/**
 * Update task counter with proper Czech declension
 */
function updateCounter() {
    const count = AppState.getRemainingCount();
    DOM.remainingCount.textContent = getTaskCountText(count);
}

/* ================================================================
   TASK INTERACTIONS
   ================================================================ */

/**
 * Handle task completion toggle
 * @param {string} taskId
 */
function handleTaskToggle(taskId) {
    AppState.toggleTaskCompletion(taskId);
    render();
}

/**
 * Enter edit mode for a task
 * @param {string} taskId
 */
function handleTaskEditStart(taskId) {
    AppState.editingTaskId = taskId;
    render();
}

/**
 * Leave edit mode without saving
 */
function handleTaskEditCancel() {
    AppState.editingTaskId = null;
    render();
}

/**
 * Save the values from the inline edit form
 * @param {string} taskId
 * @param {HTMLElement} element - The list item holding the edit form
 */
function handleTaskEditSave(taskId, element) {
    const textInput = element.querySelector('.task-edit-text');
    const text = textInput.value.trim();

    // Validation (same rules as when creating a task)
    if (!isValidTaskText(text)) {
        textInput.focus();
        return;
    }

    AppState.updateTask(taskId, {
        text,
        category: element.querySelector('.task-edit-category').value,
        priority: element.querySelector('.task-edit-priority').value,
        dueAt: parseDateTimeLocal(element.querySelector('.task-edit-due').value),
    });

    AppState.editingTaskId = null;
    render();
}

/**
 * Move a task one position up (-1) or down (1)
 * @param {string} taskId
 * @param {number} direction
 */
function handleTaskMove(taskId, direction) {
    if (AppState.moveTaskByStep(taskId, direction)) {
        render();
    }
}

/**
 * Handle task deletion with animation
 * @param {string} taskId
 * @param {HTMLElement} element
 */
function handleTaskDelete(taskId, element) {
    // Add delete animation
    element.classList.add('deleting');

    // Wait for animation to complete, then delete
    setTimeout(() => {
        AppState.deleteTask(taskId);
        render();
    }, 300);
}

/* ================================================================
   UTILITY FUNCTIONS
   ================================================================ */

/**
 * Escape HTML special characters (including quotes, so the result is also
 * safe inside attribute values) to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Validate task text, alerting the user when it is too long
 * @param {string} text
 * @returns {boolean}
 */
function isValidTaskText(text) {
    if (!text) return false;

    if (text.length > MAX_TASK_LENGTH) {
        alert(`Úkol je příliš dlouhý. Maximálně ${MAX_TASK_LENGTH} znaků.`);
        return false;
    }

    return true;
}

/**
 * Convert a timestamp into a value usable by <input type="datetime-local">
 * @param {number|null} timestamp
 * @returns {string}
 */
function toDateTimeLocal(timestamp) {
    if (!Number.isFinite(timestamp)) return '';

    const date = new Date(timestamp);
    const pad = value => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Convert a <input type="datetime-local"> value into a timestamp
 * @param {string} value
 * @returns {number|null}
 */
function parseDateTimeLocal(value) {
    if (!value) return null;

    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * Format a due date for display in Czech
 * @param {number} timestamp
 * @returns {string}
 */
function formatDueDate(timestamp) {
    return new Date(timestamp).toLocaleString('cs-CZ', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/* ================================================================
   DUE TIME ALERTS
   ================================================================ */

/**
 * Alert about tasks that have reached their due time.
 * Each task is announced only once - the flag is persisted so the
 * alert is not repeated after a re-render or a page reload.
 */
function checkDueTasks() {
    const now = Date.now();
    const dueTasks = AppState.tasks.filter(
        task => !task.completed && !task.dueAlerted && Number.isFinite(task.dueAt) && task.dueAt <= now
    );

    if (!dueTasks.length) return;

    // Persist the flag before alerting, so a blocking alert cannot cause duplicates
    dueTasks.forEach(task => {
        task.dueAlerted = true;
    });
    AppState.save();
    render();

    dueTasks.forEach(task => {
        alert(`Úkol "${task.text}" je splatný.`);
    });
}

/**
 * Start periodic checking of due tasks
 */
function initializeDueWatcher() {
    checkDueTasks();
    setInterval(checkDueTasks, DUE_CHECK_INTERVAL_MS);
}

/* ================================================================
   EXPORT / IMPORT
   ================================================================ */

/**
 * Initialize export and import controls
 */
function initializeDataTransfer() {
    DOM.exportBtn.addEventListener('click', handleExport);
    DOM.importBtn.addEventListener('click', () => DOM.importInput.click());
    DOM.importInput.addEventListener('change', handleImport);
}

/**
 * Download the current tasks as a JSON file
 */
function handleExport() {
    const data = JSON.stringify({ version: 1, exportedAt: Date.now(), tasks: AppState.tasks }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `ukoly-${toDateTimeLocal(Date.now()).slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/**
 * Read a JSON file and replace the current tasks with its contents
 * @param {Event} event
 */
function handleImport(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
        const tasks = parseImportedTasks(reader.result);

        if (!tasks) {
            alert('Soubor se nepodařilo načíst. Zkontrolujte, že jde o platný export úkolů ve formátu JSON.');
        } else {
            AppState.editingTaskId = null;
            AppState.replaceTasks(tasks);
            render();
            alert(`Import dokončen: ${tasks.length} úkolů.`);
        }

        DOM.importInput.value = ''; // Allow importing the same file again
    };

    reader.onerror = () => {
        alert('Soubor se nepodařilo přečíst.');
        DOM.importInput.value = '';
    };

    reader.readAsText(file);
}

/**
 * Validate and normalize the contents of an import file
 * @param {string} rawContent
 * @returns {Array|null} Normalized tasks, or null when the file is malformed
 */
function parseImportedTasks(rawContent) {
    let parsed;

    try {
        parsed = JSON.parse(rawContent);
    } catch (err) {
        console.error('Failed to parse imported file:', err);
        return null;
    }

    const rawTasks = Array.isArray(parsed) ? parsed : parsed && parsed.tasks;
    if (!Array.isArray(rawTasks)) return null;

    return normalizeTasks(rawTasks);
}

/* ================================================================
   PROGRESS CHART (Chart.js)
   ================================================================ */

let progressChart = null;

/**
 * Render (or update) the chart showing completed tasks out of all tasks
 */
function renderChart() {
    if (!DOM.progressChart) return;

    if (typeof Chart === 'undefined') {
        DOM.progressChart.classList.add('hidden');
        if (DOM.chartFallback) DOM.chartFallback.classList.remove('hidden');
        return;
    }

    const completed = AppState.getCompletedCount();
    const remaining = AppState.getRemainingCount();

    if (progressChart) {
        progressChart.data.datasets[0].data = [completed, remaining];
        progressChart.update();
        return;
    }

    progressChart = new Chart(DOM.progressChart, {
        type: 'doughnut',
        data: {
            labels: ['Hotové', 'Zbývající'],
            datasets: [{
                data: [completed, remaining],
                backgroundColor: ['#10b981', '#475569'],
                borderColor: '#0f172a',
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: '#cbd5e1' },
                },
            },
        },
    });
}

/* ================================================================
   INITIALIZATION
   ================================================================ */

/**
 * Initialize the application
 */
function initializeApp() {
    // Load tasks from storage
    AppState.load();

    // Set up event listeners
    initializeForm();
    initializeFilters();
    initializeDataTransfer();

    // Initial render
    render();

    // Start watching for tasks that reach their due time
    initializeDueWatcher();

    // Set focus to input for better UX
    DOM.taskInput.focus();
}

/**
 * Auto-save on visibility change (tabs/windows switch)
 * Ensures data persistence even if page is closed unexpectedly
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        AppState.save();
    }
});

/**
 * Prevent data loss on page unload
 */
window.addEventListener('beforeunload', () => {
    AppState.save();
});

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
