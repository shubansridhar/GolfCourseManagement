// public/js/employee.js
// Employee-specific data and UI logic

import { authenticatedFetch } from './auth.js';
import { showNotification, showTableView } from './views.js';
import { loadTableData } from './data.js';

const API_BASE_URL = '/api';

// Descriptions map - add more as needed for tables employees might see
const tableDescriptions = {
    EMPLOYEE: 'Manage staff information and roles',
    EMPLOYEE_CONTACT: 'View and update staff contact details',
    EQUIPMENT: 'Browse and adjust equipment inventory',
    EQUIPMENT_TYPE: 'Edit equipment categories',
    HOLE: 'Configure course hole layouts',
    GOLF_COURSE: 'Manage course details',
    MANAGES: 'View equipment management assignments',
    TEE_TIME: 'View and manage tee time slots',
    MEMBER: 'View member profiles',
    MEMBER_CONTACT: 'View member contact info',
    MEMBER_TEE_TIME: 'View member tee time bookings',
    MEMBERSHIP_PLAN: 'View membership plan details',
    PLAN_DISCOUNT: 'View plan discount rates',
    EQUIPMENT_RENTAL: 'View equipment rental records' // Assuming rentals table exists
};

// tables you don’t want employees to see
const excludeTables = [
    'GOLF_COURSE',
    'PLAN_DISCOUNT',
    'HOLE',
    'EMPLOYEE',
    'MANAGES'
  ];

/**
 * Load and render tables for employee use
 */
async function loadEmployeeData() {
    const container = document.getElementById('employee-dashboard-container');
    if (!container) return;

    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading accessible tables...</div>';

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/tables`);
        if (!response.ok) throw new Error('Failed to fetch tables');

        const tables = await response.json(); // API already excludes 'users' table

        // Filter out excluded tables, then sort alphabetically
         const filteredAndSorted = tables
        .filter(t => !excludeTables.includes(t.toUpperCase()))
        .sort((a, b) => a.localeCompare(b));

        if (filteredAndSorted.length === 0) {
        container.innerHTML = '<p class="no-tables">No data sections available.</p>';
        return;
        }

        // Render table cards
        container.innerHTML = filteredAndSorted.map(tableName => {
            // Use uppercase for description lookup, provide default
            const desc = tableDescriptions[tableName.toUpperCase()] || 'View and manage records';
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
            card.addEventListener('click', () => {
                const tableName = card.dataset.table;
                showTableView(tableName); // Switch view
                loadTableData(tableName); // Load data
            });
        });
    } catch (error) {
        console.error('Error loading employee tables:', error);
        showNotification('Failed to load employee sections. Please try again.', 'error');
        container.innerHTML = '<p class="no-tables error">Could not load sections.</p>';
    }
}

/**
 * Determine icon based on table name
 */
function getIcon(tableName) {
    tableName = tableName.toLowerCase();
    if (tableName.includes('course') || tableName.includes('tee_time') || tableName.includes('hole')) return 'calendar-alt';
    if (tableName.includes('equipment') || tableName.includes('rental')) return 'tools';
    if (tableName.includes('employee') || tableName.includes('staff')) return 'user-tie';
    if (tableName.includes('manage')) return 'tasks';
    if (tableName.includes('member') || tableName.includes('plan')) return 'users'; // Group member/plan related
    return 'table'; // Default
}

/**
 * Format table name for display
 */
function formatTableName(tableName) {
    const customTitles = {
        'EQUIPMENT': 'Equipment Inventory',
        'EQUIPMENT_RENTAL': 'Equipment Rentals',
        'EQUIPMENT_TYPE': 'Equipment Types',
        'MEMBER': 'Members',
        'MEMBER_TEE_TIME': 'Tee Time Bookings',
        'MEMBERSHIP_PLAN': 'Membership Plans',
        'TEE_TIME': 'Manage Tee Times'
    };

    return customTitles[tableName.toUpperCase()] || 
           tableName.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

export { loadEmployeeData };