/**
 * data.js - Simplified Data Access Operations
 * 
 * Handles interaction with the backend API for:
 * - Fetching table data
 * - Adding/editing/deleting records
 * - Dashboard data management
 */

import { authenticatedFetch } from './auth.js';
import { showNotification } from './views.js';

// API endpoints
const API_BASE_URL = '/api';

/**
 * Fetch the list of tables and populate the dashboard
 */
async function fetchTablesAndPopulateDashboard() {
    try {
        const dashboardContainer = document.getElementById('dashboard-container');

        if (!dashboardContainer) return;

        dashboardContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>';

        const response = await authenticatedFetch(`${API_BASE_URL}/tables`);

        if (!response.ok) {
            throw new Error('Failed to fetch tables');
        }

        const tables = await response.json();

        populateDashboard(tables);
    } catch (error) {
        console.error('Error fetching tables:', error);
        showNotification('Failed to load tables. Please try again.', 'error');
    }
}

/**
 * Populate the dashboard with table cards
 */
function populateDashboard(tables) {
    const dashboardContainer = document.getElementById('dashboard-container');

    if (!dashboardContainer) return;

    if (!tables || tables.length === 0) {
        dashboardContainer.innerHTML = '<p class="no-tables">No tables available.</p>';
        return;
    }

    // Group tables by category for better organization
    const tableGroups = groupTablesByCategory(tables);

    let html = '';

    // Create a section for each group
    for (const [category, categoryTables] of Object.entries(tableGroups)) {
        html += `
            <div class="table-category">
                <h3>${formatCategoryName(category)}</h3>
                <div class="table-cards">
                    ${categoryTables.map(table => createTableCard(table)).join('')}
                </div>
            </div>
        `;
    }

    dashboardContainer.innerHTML = html;

    // Add event listeners to table cards
    document.querySelectorAll('.table-card').forEach(card => {
        card.addEventListener('click', function () {
            const tableName = this.dataset.table;
            loadTableData(tableName);
        });
    });
}

/**
 * Group tables by category based on naming patterns
 */
function groupTablesByCategory(tables) {
    const groups = {
        'member': [],
        'course': [],
        'equipment': [],
        'employee': [],
        'other': []
    };

    tables.forEach(table => {
        if (table.startsWith('member') || table.includes('membership')) {
            groups.member.push(table);
        } else if (table.startsWith('course') || table.includes('hole') || table.includes('tee_time')) {
            groups.course.push(table);
        } else if (table.includes('equipment') || table.includes('rental')) {
            groups.equipment.push(table);
        } else if (table.includes('employee') || table.includes('staff')) {
            groups.employee.push(table);
        } else {
            groups.other.push(table);
        }
    });

    // Remove empty categories
    for (const category in groups) {
        if (groups[category].length === 0) {
            delete groups[category];
        }
    }

    return groups;
}

/**
 * Create a table card HTML
 */
function createTableCard(tableName) {
    // Determine icon based on table name
    let icon = 'table';

    if (tableName.includes('member')) icon = 'users';
    else if (tableName.includes('course')) icon = 'golf-ball';
    else if (tableName.includes('tee_time')) icon = 'calendar-alt';
    else if (tableName.includes('equipment')) icon = 'tools';
    else if (tableName.includes('employee')) icon = 'user-tie';

    return `
        <div class="table-card" data-table="${tableName}">
            <div class="card-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="card-details">
                <h4>${formatTableName(tableName)}</h4>
            </div>
        </div>
    `;
}

/**
 * Format a table name for display
 */
function formatTableName(tableName) {
    return tableName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Format a category name for display
 */
function formatCategoryName(category) {
    return category.charAt(0).toUpperCase() + category.slice(1) + ' Tables';
}

/**
 * Load data for a specific table
 */
async function loadTableData(tableName) {
    try {
        // Show table view
        const appView = document.getElementById('app-view');
        const dashboardView = document.getElementById('dashboard-view');
        const tableView = document.getElementById('table-view');

        if (!appView || !dashboardView || !tableView) return;

        dashboardView.style.display = 'none';
        tableView.style.display = 'block';

        // Update selected table heading
        const selectedTableElement = document.getElementById('selected-table');
        if (selectedTableElement) {
            selectedTableElement.textContent = formatTableName(tableName);
        }

        // Enable add record button
        const addRecordBtn = document.getElementById('add-record-btn');
        if (addRecordBtn) {
            addRecordBtn.disabled = false;
        }

        // Save current table name
        window.currentTable = tableName;

        // Clear existing table
        const dataTable = document.getElementById('data-table');
        if (dataTable) {
            const thead = dataTable.querySelector('thead tr');
            const tbody = dataTable.querySelector('tbody');

            if (thead && tbody) {
                thead.innerHTML = '<th>Loading...</th>';
                tbody.innerHTML = '<tr><td colspan="1" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading data...</td></tr>';
            }
        }

        // Fetch table structure and data in parallel
        const [structureResponse, dataResponse] = await Promise.all([
            authenticatedFetch(`${API_BASE_URL}/tables/${tableName}/structure`),
            authenticatedFetch(`${API_BASE_URL}/tables/${tableName}`)
        ]);

        if (!structureResponse.ok || !dataResponse.ok) {
            throw new Error('Failed to fetch table data');
        }

        const structure = await structureResponse.json();
        const data = await dataResponse.json();

        renderTableData(structure, data);
    } catch (error) {
        console.error('Error loading table data:', error);
        showNotification('Failed to load table data. Please try again.', 'error');
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

    // Populate header
    thead.innerHTML = structure.map(col => `<th>${col.Field}</th>`).join('') + '<th>Actions</th>';

    // Populate body
    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${structure.length + 1}" class="empty-table">No records found</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(row => {
        return `
            <tr data-id="${row[structure[0].Field]}">
                ${structure.map(col => `<td>${formatCellValue(row[col.Field])}</td>`).join('')}
                <td class="actions">
                    <button class="btn-edit" title="Edit"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" title="Delete"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    }).join('');

    // Add event listeners to action buttons
    tbody.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const row = this.closest('tr');
            const recordId = row.dataset.id;
            editRecord(recordId);
        });
    });

    tbody.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const row = this.closest('tr');
            const recordId = row.dataset.id;
            deleteRecord(recordId);
        });
    });
}

/**
 * Format a cell value for display
 */
function formatCellValue(value) {
    if (value === null || value === undefined) return '-';

    // Check if it's a date
    if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString();
        }
    }

    // Check if it's a boolean
    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    return value.toString();
}

/**
 * Placeholder functions for CRUD operations (implemented later)
 */
function editRecord(recordId) {
    console.log('Edit record:', recordId);
}

function deleteRecord(recordId) {
    console.log('Delete record:', recordId);
}

// Export functions for use in other files
export {
    fetchTablesAndPopulateDashboard,
    loadTableData
}; 