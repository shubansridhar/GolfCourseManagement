// public/js/employee.js
// Employee-specific data and UI logic

import { authenticatedFetch } from './auth.js';
import { showNotification } from './views.js';
import { loadTableData } from './data.js';

const API_BASE_URL = '/api';

// Map of table-specific descriptions for employee dashboard
const tableDescriptions = {
    EMPLOYEE: 'Manage staff information and roles',
    EMPLOYEE_CONTACT: 'View and update staff contact details',
    EQUIPMENT: 'Browse and adjust equipment inventory',
    EQUIPMENT_TYPE: 'Edit equipment categories',
    HOLE: 'Configure course hole layouts',
    // add other table descriptions as needed
};

/**
 * Load and render tables for employee use
 */
async function loadEmployeeData() {
    const container = document.getElementById('employee-dashboard-container');
    if (!container) return;

    // Show loading state
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>';

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/tables`);
        if (!response.ok) throw new Error('Failed to fetch tables');

        const tables = await response.json();
        // Exclude member-only tables
        const filtered = tables
            .filter(name => !name.startsWith('member') && !name.includes('membership'))
            .sort((a, b) => a.localeCompare(b));

        if (filtered.length === 0) {
            container.innerHTML = '<p class="no-tables">No tables available for employees.</p>';
            return;
        }

        // Render table cards with descriptions
        container.innerHTML = filtered.map(tableName => {
            const desc = tableDescriptions[tableName] || 'View and manage records';
            return `
                <div class="table-card" data-table="${tableName}">
                    <div class="card-icon"><i class="fas fa-${getIcon(tableName)}"></i></div>
                    <div class="card-details">
                        <h4>${formatTableName(tableName)}</h4>
                        <p class="card-desc">${desc}</p>
                    </div>
                </div>
            `;
        }).join('');

        // Attach click handlers
        container.querySelectorAll('.table-card').forEach(card => {
            card.addEventListener('click', () => loadTableData(card.dataset.table));
        });
    } catch (error) {
        console.error('Error loading employee tables:', error);
        showNotification('Failed to load employee tables. Please try again.', 'error');
    }
}

/**
 * Determine icon based on table name
 */
function getIcon(tableName) {
    if (tableName.includes('course') || tableName.includes('tee_time')) return 'calendar-alt';
    if (tableName.includes('equipment') || tableName.includes('rental')) return 'tools';
    if (tableName.includes('employee') || tableName.includes('staff')) return 'user-tie';
    return 'table';
}

/**
 * Format table name for display
 */
function formatTableName(tableName) {
    return tableName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
}

export { loadEmployeeData }; 