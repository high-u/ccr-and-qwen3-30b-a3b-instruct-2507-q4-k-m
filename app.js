// IndexedDB setup
const DB_NAME = 'TaskManager';
const DB_VERSION = 1;
let db;

// Initialize database
function initDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains('tasks')) {
                const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
                taskStore.createIndex('date', 'date', { unique: false });
                taskStore.createIndex('completed', 'completed', { unique: false });
            }
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// Get all tasks from IndexedDB
function getAllTasks() {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tasks'], 'readonly');
        const store = transaction.objectStore('tasks');
        const request = store.getAll();

        request.onsuccess = function(event) {
            resolve(event.target.result);
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// Add a new task to IndexedDB
function addTask(taskText) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        const now = new Date().toISOString();
        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            date: now
        };
        const request = store.add(task);

        request.onsuccess = function(event) {
            resolve(task);
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// Update a task in IndexedDB
function updateTask(taskId, updates) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        const request = store.get(taskId);

        request.onsuccess = function(event) {
            const task = event.target.result;
            if (task) {
                Object.assign(task, updates);
                const updateRequest = store.put(task);
                
                updateRequest.onsuccess = function() {
                    resolve(task);
                };
                
                updateRequest.onerror = function(event) {
                    reject(event.target.error);
                };
            } else {
                reject(new Error('Task not found'));
            }
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// Delete a task from IndexedDB
function deleteTask(taskId) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        const request = store.delete(taskId);

        request.onsuccess = function(event) {
            resolve();
        };

        request.onerror = function(event) {
            reject(event.target.error);
        };
    });
}

// DOM Elements
const taskInput = document.getElementById('taskInput');
const addTaskBtn = document.getElementById('addTask');
const tasksList = document.getElementById('tasks');
const filters = document.querySelectorAll('.filters button');
const sortSelect = document.getElementById('sortBy');

// State
let currentTasks = [];
let currentFilter = 'all';
let currentSort = 'date-desc';

// Initialize app
async function init() {
    try {
        await initDatabase();
        await loadTasks();
        setupEventListeners();
        renderTasks();
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

// Load tasks from IndexedDB
async function loadTasks() {
    try {
        const tasks = await getAllTasks();
        currentTasks = tasks;
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add task button
    addTaskBtn.addEventListener('click', async () => {
        const text = taskInput.value.trim();
        if (text) {
            try {
                await addTask(text);
                taskInput.value = '';
                await loadTasks();
                renderTasks();
            } catch (error) {
                console.error('Failed to add task:', error);
            }
        }
    });

    // Add task on Enter key
    taskInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            const text = taskInput.value.trim();
            if (text) {
                try {
                    await addTask(text);
                    taskInput.value = '';
                    await loadTasks();
                    renderTasks();
                } catch (error) {
                    console.error('Failed to add task:', error);
                }
            }
        }
    });

    // Filter buttons
    filters.forEach(button => {
        button.addEventListener('click', () => {
            filters.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.filter;
            renderTasks();
        });
    });

    // Sort options
    sortSelect.addEventListener('change', (e) => {
        currentSort = e.target.value;
        renderTasks();
    });
}

// Render tasks to DOM
function renderTasks() {
    // Filter tasks based on current filter
    let filteredTasks = [...currentTasks];
    
    if (currentFilter === 'active') {
        filteredTasks = filteredTasks.filter(task => !task.completed);
    } else if (currentFilter === 'completed') {
        filteredTasks = filteredTasks.filter(task => task.completed);
    }

    // Sort tasks based on current sort option
    filteredTasks.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        
        if (currentSort === 'date-asc') {
            return dateA - dateB;
        } else if (currentSort === 'date-desc') {
            return dateB - dateA;
        }
    });

    // Clear the task list
    tasksList.innerHTML = '';

    // Add each task to the DOM
    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        // Task date
        const date = new Date(task.date);
        const formattedDate = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        li.innerHTML = `
            <span class="task-text">${task.text}</span>
            <span class="task-date">${formattedDate}</span>
            <div class="task-actions">
                ${!task.completed ? `<button class="complete-btn" data-id="${task.id}">完了</button>` : ''}
                <button class="delete-btn" data-id="${task.id}">削除</button>
            </div>
        `;
        
        tasksList.appendChild(li);
    });

    // Add event listeners to dynamically created buttons
    document.querySelectorAll('.complete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const taskId = parseInt(e.target.dataset.id);
            try {
                await updateTask(taskId, { completed: true });
                await loadTasks();
                renderTasks();
            } catch (error) {
                console.error('Failed to complete task:', error);
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const taskId = parseInt(e.target.dataset.id);
            try {
                await deleteTask(taskId);
                await loadTasks();
                renderTasks();
            } catch (error) {
                console.error('Failed to delete task:', error);
            }
        });
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
