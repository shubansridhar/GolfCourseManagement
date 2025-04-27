// public/js/data.js
import { authenticatedFetch } from './auth.js';
// Import BOTH showNotification and showTableView from views.js
import { showNotification, showTableView } from './views.js';

// API endpoints
const API_BASE_URL = '/api';

/**
 * Fetch the list of tables and populate the dynamic placeholder
 */
async function fetchTablesAndPopulateDashboard() {
    try {
        const placeholder = document.getElementById('dynamic-cards-placeholder');
        if (!placeholder) {
            console.error('Dynamic cards placeholder (#dynamic-cards-placeholder) not found.');
            return;
        }
        placeholder.innerHTML = '<div class="loading" style="grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>';
        const response = await authenticatedFetch(`${API_BASE_URL}/tables`);
        if (!response.ok) throw new Error('Failed to fetch tables');
        const tables = await response.json();
        populateDashboard(tables, placeholder);
    } catch (error) {
        console.error('Error fetching tables:', error);
        showNotification('Failed to load tables. Please try again.', 'error');
        const placeholder = document.getElementById('dynamic-cards-placeholder');
        if (placeholder) {
            placeholder.innerHTML = '<p class="no-tables error" style="grid-column: 1 / -1;">Failed to load tables.</p>';
        }
    }
}

/**
 * Populate the dynamic placeholder with table cards/categories
 */
function populateDashboard(tables, targetElement) {
    if (!targetElement) return;
    if (!tables || tables.length === 0) {
        targetElement.innerHTML = '<p class="no-tables" style="grid-column: 1 / -1;">No tables available.</p>';
        return;
    }
    const tableGroups = groupTablesByCategory(tables);
    let html = '';
    for (const category in tableGroups) {
        if(tableGroups[category].length > 0) {
             html += tableGroups[category].map(table => createTableCard(table)).join('');
        }
    }
    targetElement.innerHTML = html;

    // Add event listeners to the newly added table cards
    targetElement.querySelectorAll('.table-card.dynamic-card').forEach(card => {
        card.addEventListener('click', function () {
            const tableName = this.dataset.table;
            // ---> FIX: Call BOTH functions <---
            showTableView(tableName); // Show the table view first
            loadTableData(tableName); // Then load the data into it
        });
    });
}

/**
 * Group tables by category based on naming patterns
 */
function groupTablesByCategory(tables) {
    const groups = { 'member': [], 'course': [], 'equipment': [], 'employee': [], 'other': [] };
    tables.forEach(table => {
        if (table.startsWith('member') || table.includes('membership')) groups.member.push(table);
        else if (table.startsWith('course') || table.includes('hole') || table.includes('tee_time')) groups.course.push(table);
        else if (table.includes('equipment') || table.includes('rental')) groups.equipment.push(table);
        else if (table.includes('employee') || table.includes('staff')) groups.employee.push(table);
        else groups.other.push(table);
    });
    for (const category in groups) if (groups[category].length === 0) delete groups[category];
    return groups;
}

/**
 * Create a table card HTML
 */
function createTableCard(tableName) {
    let icon = 'table'; // Default
    if (tableName.includes('member')) icon = 'users';
    else if (tableName.includes('course') || tableName.includes('hole')) icon = 'golf-ball';
    else if (tableName.includes('tee_time')) icon = 'calendar-alt';
    else if (tableName.includes('equipment') || tableName.includes('rental')) icon = 'tools';
    else if (tableName.includes('employee')) icon = 'user-tie';
    else if (tableName.includes('manage')) icon = 'tasks';
    // Added 'dynamic-card' class
    return `
        <div class="table-card dynamic-card" data-table="${tableName}" style="cursor: pointer;">
            <div class="card-icon"><i class="fas fa-${icon}"></i></div>
            <div class="card-details"><h4>${formatTableName(tableName)}</h4></div>
        </div>`;
}

/**
 * Format a table name for display
 */
function formatTableName(tableName) {
    return tableName.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Format a category name for display
 */
function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1) + ' Tables';
}

/**
 * Load data for a specific table (does NOT change the view)
 */
async function loadTableData(tableName) {
    try {
        // Update UI elements specific to the table view
        const selectedTableElement = document.getElementById('selected-table');
         if (selectedTableElement && tableName) {
            selectedTableElement.textContent = formatTableName(tableName);
        }
         const addRecordBtn = document.getElementById('add-record-btn');
         if (addRecordBtn) { addRecordBtn.disabled = false; }
         window.currentTable = tableName;

        // Prepare table for loading
        const dataTable = document.getElementById('data-table');
        if (!dataTable) return;
        const thead = dataTable.querySelector('thead tr');
        const tbody = dataTable.querySelector('tbody');
        if (!thead || !tbody) return;
        thead.innerHTML = '<th>Loading...</th>';
        tbody.innerHTML = '<tr><td colspan="1" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading data...</td></tr>';

        // Fetch structure and data
        const [structureResponse, dataResponse] = await Promise.all([
            authenticatedFetch(`${API_BASE_URL}/tables/${tableName}/structure`),
            authenticatedFetch(`${API_BASE_URL}/tables/${tableName}`)
        ]);
        if (!structureResponse.ok || !dataResponse.ok) throw new Error('Failed to fetch table data');
        const structure = await structureResponse.json();
        const data = await dataResponse.json();
        renderTableData(structure, data); // Render fetched data

    } catch (error) {
        console.error('Error loading table data:', error);
        showNotification('Failed to load table data. Please try again.', 'error');
         const tbody = document.querySelector('#data-table tbody');
         if (tbody) tbody.innerHTML = `<tr><td colspan="1" class="error-table">Failed to load data.</td></tr>`;
    }
}

/**
 * Render table data to the DOM
 */
function renderTableData(structure, data) {
    const dataTable = document.getElementById('data-table');
    if (!dataTable) return;
    const thead = dataTable.querySelector('thead tr');
    const tbody = dataTable.querySelector('tbody');
    if (!thead || !tbody) return;

    thead.innerHTML = structure.map(col => `<th>${col.Field}</th>`).join('') + '<th>Actions</th>';

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${structure.length + 1}" class="empty-table">No records found</td></tr>`;
        return;
    }
    tbody.innerHTML = data.map(row => {
         const primaryKeyField = structure[0]?.Field || '';
         const recordId = primaryKeyField ? row[primaryKeyField] : null;
         const actionsDisabled = !recordId ? 'disabled' : '';
         return `
            <tr ${recordId ? `data-id="${recordId}"` : ''}>
                ${structure.map(col => `<td>${escapeHtml(formatCellValue(row[col.Field]))}</td>`).join('')}
                <td class="actions">
                    <button class="btn-edit" ${actionsDisabled} title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" ${actionsDisabled} title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
    }).join('');

    // Add event listeners to action buttons
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function (e) { e.stopPropagation(); const row = this.closest('tr'); if (row && row.dataset.id) editRecord(row.dataset.id); });
    });
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function (e) { e.stopPropagation(); const row = this.closest('tr'); if (row && row.dataset.id) deleteRecord(row.dataset.id); });
    });
}

/**
 * Format a cell value for display
 */
function formatCellValue(value) {
    if (value === null || value === undefined) return '-';
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/;
    if (typeof value === 'string' && dateRegex.test(value)) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) return date.toLocaleDateString();
    }
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object' && value !== null && value.type === 'Buffer' && Array.isArray(value.data)) return value.data[0] === 1 ? 'Yes' : 'No';
    return value.toString();
}

/**
 * Load user data from the admin endpoint and render it to the table
 */
async function loadAndRenderUsers() {
    const container = document.getElementById('user-list-container');
    const tableBody = document.querySelector('#user-list-table tbody');
    const loadingIndicator = container?.querySelector('.loading');
    if (!container || !tableBody || !loadingIndicator) { console.error('User management view elements not found.'); return; }
    loadingIndicator.style.display = 'block';
    tableBody.innerHTML = '';
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`);
        if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Server error'); }
        const users = await response.json();
        if (users.length === 0) { tableBody.innerHTML = `<tr><td colspan="4" class="empty-table">No users found.</td></tr>`; }
        else { tableBody.innerHTML = users.map(user => `<tr><td>${user.user_id}</td><td>${escapeHtml(user.username)}</td><td>${escapeHtml(user.role)}</td><td>${new Date(user.created_at).toLocaleString()}</td></tr>`).join(''); }
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification(`Failed to load users: ${error.message}`, 'error');
        tableBody.innerHTML = `<tr><td colspan="4" class="error-table">Failed to load users.</td></tr>`;
    } finally { loadingIndicator.style.display = 'none'; }
}

// Helper to prevent basic XSS
function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

// Placeholder functions for CRUD
function editRecord(recordId) { console.log('Edit record:', recordId, 'in table', window.currentTable); showNotification("Edit functionality not implemented yet.", "info"); }
function deleteRecord(recordId) { console.log('Delete record:', recordId, 'from table', window.currentTable); showNotification("Delete functionality not implemented yet.", "info");}

// Export functions
export {
    fetchTablesAndPopulateDashboard,
    loadTableData,
    loadAndRenderUsers
};