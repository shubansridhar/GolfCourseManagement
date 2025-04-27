/**
 * data.js - Data Operations and API Handling
 * 
 * This module handles all data-related functionality:
 * - Database table operations (fetching, rendering)
 * - Statistics data handling
 * - Record management (add, delete)
 */

import { authenticatedFetch } from './auth.js';
import { showNotification, showTableViewOnly, showDatabaseConnectionError } from './views.js';

// API base URL for backend requests
const API_BASE_URL = '/api';

// Global state
let allTables = [];
let currentTable = null;
let currentTableStructure = [];
let currentTableData = [];

/**
 * Fetch tables and populate the dashboard
 */
async function fetchTablesAndPopulateDashboard() {
    try {
        // Ensure dashboard is shown
        if (typeof showDashboardOnly === 'function') {
            showDashboardOnly();
        }

        const dashboardContainer = document.getElementById('dashboard-container');
        if (!dashboardContainer) {
            console.error("Dashboard container element not found!");
            return;
        }

        dashboardContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>';

        // Fetch tables from API
        console.log("Fetching tables from backend API...");
        const response = await authenticatedFetch(`${API_BASE_URL}/tables`);

        if (!response.ok) {
            // Parse error message from backend
            let errorMsg = `Failed to fetch tables (Status: ${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorMsg);
        }

        allTables = await response.json();
        console.log("Received tables from API:", allTables);

        // Populate dashboard with tables
        populateDashboard(allTables);
    } catch (error) {
        console.error("Error fetching tables:", error);

        const dashboardContainer = document.getElementById('dashboard-container');
        if (dashboardContainer) {
            dashboardContainer.innerHTML = `
                <div class="error-container">
                    <p><i class="fas fa-exclamation-triangle"></i> Error fetching tables: ${error.message}</p>
                </div>
            `;
        }

        // Check for database connection errors
        if (error.message.includes('Database connection') || error.message.includes('connect ECONNREFUSED')) {
            showDatabaseConnectionError(error.message);
        }
    }
}

/**
 * Populate the dashboard with table cards
 * @param {Array} tables - List of table names
 */
function populateDashboard(tables) {
    const dashboardContainer = document.getElementById('dashboard-container');

    if (!dashboardContainer) return;

    if (!tables || tables.length === 0) {
        dashboardContainer.innerHTML = '<p class="no-data">No tables available.</p>';
        return;
    }

    let html = '<div class="table-grid">';

    tables.forEach(tableName => {
        const icon = getIconForTable(tableName);
        html += `
            <div class="table-card" onclick="navigateToTable('${tableName}')">
                <div class="table-icon">
                    <i class="${icon}"></i>
                </div>
                <h3 class="table-name">${tableName}</h3>
            </div>
        `;
    });

    html += '</div>';
    dashboardContainer.innerHTML = html;
}

/**
 * Get appropriate icon for table
 * @param {string} tableName - Table name
 * @returns {string} CSS class for the icon
 */
function getIconForTable(tableName) {
    const name = tableName.toLowerCase();

    // Map table names to appropriate Font Awesome icons
    if (name.includes('member')) return 'fas fa-user';
    if (name.includes('employee')) return 'fas fa-id-badge';
    if (name.includes('golf_course')) return 'fas fa-golf-ball';
    if (name.includes('tee_time')) return 'far fa-clock';
    if (name.includes('equipment')) return 'fas fa-tools';
    if (name.includes('tournament')) return 'fas fa-trophy';
    if (name.includes('contact')) return 'fas fa-address-book';
    if (name.includes('payment')) return 'fas fa-credit-card';
    if (name.includes('membership')) return 'fas fa-users';
    if (name.includes('plan')) return 'fas fa-tags';

    // Default icon
    return 'fas fa-table';
}

/**
 * Select and display a table
 * @param {string} tableName - Name of the table to select
 */
async function selectTable(tableName) {
    if (!tableName) return;

    currentTable = tableName;

    // Show table view
    showTableViewOnly();

    // Update table header
    const selectedTableHeader = document.getElementById('selected-table-header');
    if (selectedTableHeader) {
        selectedTableHeader.textContent = tableName;
    }

    // Enable add record button
    const addRecordBtn = document.getElementById('add-record-btn');
    if (addRecordBtn) {
        addRecordBtn.disabled = false;
        addRecordBtn.style.display = 'inline-block';
    }

    // Show loading indicator
    const tableContent = document.getElementById('table-content');
    if (tableContent) {
        tableContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading table data...</div>';
    }

    try {
        // Fetch table structure
        const structureResponse = await authenticatedFetch(`${API_BASE_URL}/tables/${tableName}/structure`);

        if (!structureResponse.ok) {
            const errorData = await structureResponse.json();
            throw new Error(errorData.error || `Failed to fetch table structure (Status: ${structureResponse.status})`);
        }

        currentTableStructure = await structureResponse.json();

        // Fetch table data
        const dataResponse = await authenticatedFetch(`${API_BASE_URL}/tables/${tableName}`);

        if (!dataResponse.ok) {
            const errorData = await dataResponse.json();
            throw new Error(errorData.error || `Failed to fetch table data (Status: ${dataResponse.status})`);
        }

        currentTableData = await dataResponse.json();

        // Render table
        renderTable();
    } catch (error) {
        console.error(`Error selecting table ${tableName}:`, error);

        if (tableContent) {
            tableContent.innerHTML = `
                <div class="error-container">
                    <p><i class="fas fa-exclamation-triangle"></i> Error: ${error.message}</p>
                </div>
            `;
        }

        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Render the current table with data
 */
function renderTable() {
    const tableContent = document.getElementById('table-content');

    if (!tableContent || !currentTableStructure || !currentTableData) return;

    if (currentTableStructure.length === 0) {
        tableContent.innerHTML = '<p class="no-data">No table structure available.</p>';
        return;
    }

    // Start building table HTML
    let html = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
    `;

    // Add column headers
    currentTableStructure.forEach(column => {
        html += `<th>${column.Field}</th>`;
    });

    // Add actions column
    html += `<th class="actions-column">Actions</th></tr></thead><tbody>`;

    // No data case
    if (currentTableData.length === 0) {
        const colSpan = currentTableStructure.length + 1;
        html += `
            <tr>
                <td colspan="${colSpan}" class="no-data-cell">
                    No records found in ${currentTable}.
                </td>
            </tr>
        `;
    } else {
        // Find primary key for delete operations
        let primaryKey = '';
        currentTableStructure.forEach(column => {
            if (column.Key === 'PRI') {
                primaryKey = column.Field;
            }
        });

        // Add data rows
        currentTableData.forEach((record, index) => {
            html += '<tr>';

            currentTableStructure.forEach(column => {
                let cellValue = record[column.Field];

                // Format value based on type
                if (cellValue === null || cellValue === undefined) {
                    cellValue = '<span class="null-value">NULL</span>';
                } else if (column.Type.includes('date')) {
                    const date = new Date(cellValue);
                    if (!isNaN(date.getTime())) {
                        cellValue = date.toLocaleDateString();
                    }
                } else if (column.Type.includes('time') && !column.Type.includes('timestamp')) {
                    cellValue = cellValue.substring(0, 5); // Show only HH:MM
                } else if (typeof cellValue === 'boolean') {
                    cellValue = cellValue ? 'Yes' : 'No';
                }

                html += `<td>${cellValue}</td>`;
            });

            // Add action buttons
            if (primaryKey && record[primaryKey]) {
                html += `
                    <td class="actions-cell">
                        <button class="btn btn-sm btn-danger" 
                                onclick="deleteRecord('${record[primaryKey]}', '${primaryKey}', ${index})">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    </td>
                `;
            } else {
                html += '<td class="actions-cell">No actions available</td>';
            }

            html += '</tr>';
        });
    }

    html += '</tbody></table></div>';
    tableContent.innerHTML = html;
}

/**
 * Delete a record from the current table
 * @param {string|number} id - ID of the record to delete
 * @param {string} primaryKeyName - Name of the primary key field
 * @param {number} rowIndex - Index of the row in the UI
 */
async function deleteRecord(id, primaryKeyName, rowIndex) {
    if (!id || !primaryKeyName || !currentTable) {
        showNotification('Cannot delete record: Missing information', 'error');
        return;
    }

    if (!confirm(`Are you sure you want to delete this record from ${currentTable}?`)) {
        return;
    }

    try {
        const response = await authenticatedFetch(
            `${API_BASE_URL}/tables/${currentTable}/${id}?primaryKey=${primaryKeyName}`,
            { method: 'DELETE' }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to delete record (Status: ${response.status})`);
        }

        const data = await response.json();

        // Remove row from local data
        currentTableData.splice(rowIndex, 1);

        // Re-render table
        renderTable();

        showNotification(data.message || 'Record deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting record:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Handle submitting a new record
 */
async function handleSubmitRecord() {
    const addRecordForm = document.getElementById('add-record-form');
    const addRecordModal = document.getElementById('add-record-modal');

    if (!addRecordForm || !currentTable) return;

    // Create form data object
    const formData = {};
    const formElements = addRecordForm.elements;

    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        if (element.name && element.name !== 'submit') {
            formData[element.name] = element.value;
        }
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/tables/${currentTable}`, {
            method: 'POST',
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to add record (Status: ${response.status})`);
        }

        const data = await response.json();

        // Close modal
        if (addRecordModal) {
            addRecordModal.style.display = 'none';
        }

        // Show success notification
        showNotification(data.message || 'Record added successfully', 'success');

        // Refresh table data
        await selectTable(currentTable);
    } catch (error) {
        console.error('Error adding record:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Fetch and display statistics
 */
async function fetchAndDisplayStatistics() {
    const statsLoading = document.getElementById('stats-loading');
    const statsGrid = document.getElementById('stats-grid');
    const statsContainer = document.getElementById('stats-container');

    try {
        // Show loading indicator and hide grid
        if (statsLoading) statsLoading.style.display = 'block';
        if (statsGrid) statsGrid.style.display = 'none';

        // Fetch statistics data
        const response = await authenticatedFetch(`${API_BASE_URL}/statistics`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch statistics');
        }

        const statistics = await response.json();

        // Render statistics
        renderStatistics(statistics);

        // Hide loading indicator and show grid
        if (statsLoading) statsLoading.style.display = 'none';
        if (statsGrid) statsGrid.style.display = 'grid';
    } catch (error) {
        console.error('Error fetching statistics:', error);
        showNotification(`Error: ${error.message}`, 'error');

        // Hide loading indicator and show error message
        if (statsLoading) statsLoading.style.display = 'none';
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <h3>Error Loading Statistics</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="fetchAndDisplayStatistics()">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

/**
 * Render statistics data
 * @param {Object} statistics - Statistics data from API
 */
function renderStatistics(statistics) {
    // Render table counts
    if (window.currentUser && window.currentUser.role === 'admin') {
        renderTableCounts(statistics.tableCounts);
    } else {
        // Hide table counts for non-admin users
        const tableCountsCard = document.querySelector('.stats-card:has(.stats-table-counts)');
        if (tableCountsCard) {
            tableCountsCard.style.display = 'none';
        }
    }

    // Render other charts
    renderMembershipByPlanChart(statistics.membersByPlan);
    renderTeeTimeStatusChart(statistics.teeTimeStatus);
    renderEquipmentAvailabilityChart(statistics.equipmentAvailability);
}

// Export functions and variables for use in other modules
export {
    API_BASE_URL,
    allTables,
    currentTable,
    currentTableStructure,
    currentTableData,
    fetchTablesAndPopulateDashboard,
    populateDashboard,
    getIconForTable,
    selectTable,
    renderTable,
    deleteRecord,
    handleSubmitRecord,
    fetchAndDisplayStatistics
}; 