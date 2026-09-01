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
const TASK_CATEGORIES = ['Škola', 'Finance', 'Osobní', 'Cvičení'];
const TASK_PRIORITIES = ['Nízká', 'Střední', 'Vysoká'];

/**
 * Application state manager
 */
const AppState = {
    tasks: [],
    currentFilter: 'all',        // 'all', 'active', 'completed'
    currentCategoryFilter: 'all', // category name or 'all'

    /**
     * Load all tasks from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            this.tasks = stored ? JSON.parse(stored) : [];
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
     * @param {Object} taskData - { text, category, priority }
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
        };

        this.tasks.unshift(task); // Add to beginning for chronological display
        this.save();
        return task;
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
        this.save();
    },

    /**
     * Get filtered tasks based on current filters
     * @returns {Array} Filtered tasks
     */
    getFilteredTasks() {
        return this.tasks.filter(task => {
            // Status filter
            if (this.currentFilter === 'active' && task.completed) return false;
            if (this.currentFilter === 'completed' && !task.completed) return false;

            // Category filter
            if (this.currentCategoryFilter !== 'all' && task.category !== this.currentCategoryFilter) {
                return false;
            }

            return true;
        });
    },

    /**
     * Get count of incomplete tasks
     * @returns {number}
     */
    getRemainingCount() {
        return this.tasks.filter(t => !t.completed).length;
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
    taskList: document.getElementById('task-list'),
    emptyState: document.getElementById('empty-state'),
    remainingCount: document.getElementById('remaining-count'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    categoryFilterBtns: document.querySelectorAll('.category-filter-btn'),
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
    if (!text) {
        DOM.taskInput.focus();
        return;
    }

    if (text.length > 200) {
        alert('Úkol je příliš dlouhý. Maximálně 200 znaků.');
        return;
    }

    // Create task
    AppState.addTask({
        text,
        category: DOM.taskCategory.value,
        priority: DOM.taskPriority.value,
    });

    // Reset form
    DOM.taskInput.value = '';
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
        const taskElement = createTaskElement(task);
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

    const priorityInfo = getPriorityInfo(task.priority);

    li.innerHTML = `
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
            </div>
        </div>
        <div class="task-actions">
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

    checkbox.addEventListener('change', () => handleTaskToggle(task.id));
    deleteBtn.addEventListener('click', () => handleTaskDelete(task.id, li));

    return li;
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
 * Escape HTML special characters to prevent XSS
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

    // Initial render
    render();

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
