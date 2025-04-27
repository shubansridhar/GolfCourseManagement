/**
 * views.js - View Management and UI Controls
 * 
 * This module handles all UI view-related functionality:
 * - Switching between different application views (auth, dashboard, table, etc.)
 * - Managing UI state and DOM manipulation
 * - Showing notifications
 * - Error display functions
 */

import { currentUser, checkAdminExistsAndSetupSignup } from './auth.js';

/**
 * Show the authentication view (login/signup)
 */
function showAuthView() {
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const userStatusDisplay = document.getElementById('user-status');

    if (!authView || !appView || !userStatusDisplay) return;

    document.body.classList.add('auth-background');
    authView.style.display = 'flex';
    appView.style.display = 'none';
    userStatusDisplay.style.display = 'none';
    showLoginForm();
}

/**
 * Show the main application view
 */
function showAppView() {
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');

    if (!authView || !appView) return;

    document.body.classList.remove('auth-background');
    authView.style.display = 'none';
    appView.style.display = 'block';

    // Ensure dashboard is shown initially within app view
    const dashboardView = document.getElementById('dashboard-view');
    const tableView = document.getElementById('table-view');

    if (dashboardView) dashboardView.style.display = 'block';
    if (tableView) tableView.style.display = 'none';

    updateHeader();
}

/**
 * Show the login form within the auth view
 */
function showLoginForm() {
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');
    const loginError = document.getElementById('login-error');
    const loginForm = document.getElementById('login-form');

    if (!loginFormContainer || !signupFormContainer) return;

    loginFormContainer.style.display = 'block';
    signupFormContainer.style.display = 'none';

    if (loginError) loginError.style.display = 'none';
    loginForm?.reset();
}

/**
 * Show the signup form within the auth view
 */
function showSignupForm() {
    console.log('showSignupForm called');
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');
    const signupError = document.getElementById('signup-error');
    const signupForm = document.getElementById('signup-form');

    console.log('Form containers:', {
        loginFormContainer,
        signupFormContainer,
        signupError,
        signupForm
    });

    if (!loginFormContainer || !signupFormContainer) {
        console.error('Form containers not found!');
        return;
    }

    loginFormContainer.style.display = 'none';
    signupFormContainer.style.display = 'block';

    console.log('Display switched to signup form');

    if (signupError) signupError.style.display = 'none';
    signupForm?.reset();

    // Check if admin exists to setup the signup form
    if (typeof checkAdminExistsAndSetupSignup === 'function') {
        console.log('Calling checkAdminExistsAndSetupSignup');
        checkAdminExistsAndSetupSignup();
    } else {
        console.warn('checkAdminExistsAndSetupSignup is not a function');
    }
}

/**
 * Show only the dashboard view
 */
function showDashboardOnly() {
    const dashboardView = document.getElementById('dashboard-view');
    const tableView = document.getElementById('table-view');
    const statisticsView = document.getElementById('statistics-view');
    const memberView = document.getElementById('member-view');
    const selectedTableHeader = document.getElementById('selected-table-header');
    const addRecordBtn = document.getElementById('add-record-btn');

    if (!dashboardView || !tableView) return;

    document.body.classList.remove('auth-background');
    console.log("showDashboardOnly called");

    dashboardView.style.display = 'block';
    tableView.style.display = 'none';

    if (statisticsView) statisticsView.style.display = 'none';
    if (memberView) memberView.style.display = 'none';

    if (selectedTableHeader) selectedTableHeader.textContent = 'Select a table';
    if (addRecordBtn) addRecordBtn.disabled = true;

    // Reset current table
    window.currentTable = null;
}

/**
 * Show only the table view
 */
function showTableViewOnly() {
    const dashboardView = document.getElementById('dashboard-view');
    const tableView = document.getElementById('table-view');
    const statisticsView = document.getElementById('statistics-view');
    const memberView = document.getElementById('member-view');

    if (!dashboardView || !tableView) return;

    dashboardView.style.display = 'none';
    tableView.style.display = 'block';

    if (statisticsView) statisticsView.style.display = 'none';
    if (memberView) memberView.style.display = 'none';
}

/**
 * Show the statistics view
 */
function showStatisticsView() {
    if (!currentUser) return showAuthView();

    if (currentUser.role !== 'admin' && currentUser.role !== 'employee') {
        showNotification('Access denied. Statistics are only available to admins and employees.', 'error');
        return;
    }

    // Hide all views
    hideAllContent();

    // Show statistics view
    const statisticsView = document.getElementById('statistics-view');
    if (statisticsView) statisticsView.style.display = 'block';

    // Show loading indicator and hide grid
    const statsLoading = document.getElementById('stats-loading');
    const statsGrid = document.getElementById('stats-grid');

    if (statsLoading) statsLoading.style.display = 'block';
    if (statsGrid) statsGrid.style.display = 'none';

    // Fetch and display statistics data
    if (typeof fetchAndDisplayStatistics === 'function') {
        fetchAndDisplayStatistics();
    }
}

/**
 * Hide all main content views
 */
function hideAllContent() {
    const dashboardView = document.getElementById('dashboard-view');
    const tableView = document.getElementById('table-view');
    const statisticsView = document.getElementById('statistics-view');
    const memberView = document.getElementById('member-view');

    if (dashboardView) dashboardView.style.display = 'none';
    if (tableView) tableView.style.display = 'none';
    if (statisticsView) statisticsView.style.display = 'none';
    if (memberView) memberView.style.display = 'none';
}

/**
 * Update the header with user information
 */
function updateHeader() {
    const usernameDisplay = document.getElementById('username-display');
    const accountBtn = document.getElementById('account-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userStatusDisplay = document.getElementById('user-status');

    if (currentUser) {
        if (usernameDisplay) {
            usernameDisplay.textContent = `Welcome, ${currentUser.username}`;
            usernameDisplay.style.display = 'inline';
        }
        if (accountBtn) accountBtn.style.display = 'inline-flex';
        if (logoutBtn) logoutBtn.style.display = 'inline-flex';
        if (userStatusDisplay) userStatusDisplay.style.display = 'flex';
    } else {
        if (usernameDisplay) usernameDisplay.style.display = 'none';
        if (accountBtn) accountBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userStatusDisplay) userStatusDisplay.style.display = 'none';
    }
}

/**
 * Show a notification message to the user
 * @param {string} message - Message to display
 * @param {string} type - Notification type: 'info', 'success', 'warning', 'error'
 */
function showNotification(message, type = 'info') {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('notification');

    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        document.body.appendChild(notification);
    }

    // Set notification content, class, and show it
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    // Slide in from bottom
    notification.style.bottom = '20px';

    // Hide notification after a delay
    setTimeout(() => {
        notification.style.bottom = '-100px'; // Slide out
        setTimeout(() => {
            notification.style.display = 'none';
        }, 500); // Hide after slide animation
    }, 3000);
}

/**
 * Show a database connection error message
 * @param {string} message - Error message
 */
function showDatabaseConnectionError(message) {
    const dashboardContainer = document.getElementById('dashboard-container');

    if (!dashboardContainer) return;

    dashboardContainer.innerHTML = `
        <div class="db-error-container">
            <div class="db-error-icon">
                <i class="fas fa-database"></i>
                <i class="fas fa-times error-x"></i>
            </div>
            <h2 class="db-error-title">Database Connection Error</h2>
            <p class="db-error-message">${message}</p>
            <p class="db-error-help">Please check your database configuration and ensure the MySQL server is running.</p>
        </div>
    `;
}

/**
 * Open the add record modal
 */
function openAddRecordModal() {
    const addRecordModal = document.getElementById('add-record-modal');
    const addRecordForm = document.getElementById('add-record-form');
    const addRecordFieldsContainer = document.getElementById('add-record-fields');

    if (!window.currentTable || !addRecordModal || !addRecordForm || !addRecordFieldsContainer) return;

    // Clear existing form fields
    addRecordFieldsContainer.innerHTML = '';

    // Get current table structure
    if (!window.currentTableStructure || window.currentTableStructure.length === 0) {
        showNotification('Table structure not available', 'error');
        return;
    }

    // Build form fields based on table structure
    window.currentTableStructure.forEach(column => {
        // Skip auto-increment primary keys for insert
        if (column.Key === 'PRI' && column.Extra === 'auto_increment') return;

        const fieldGroup = document.createElement('div');
        fieldGroup.className = 'form-group';

        const label = document.createElement('label');
        label.textContent = column.Field;
        label.htmlFor = `add-${column.Field}`;

        let input;

        // Choose input type based on column type
        if (column.Type.includes('text')) {
            // Textarea for text fields
            input = document.createElement('textarea');
            input.rows = 3;
        } else if (column.Type.includes('date')) {
            // Date input for date fields
            input = document.createElement('input');
            input.type = 'date';
        } else if (column.Type.includes('time') && !column.Type.includes('timestamp')) {
            // Time input for time fields
            input = document.createElement('input');
            input.type = 'time';
        } else if (column.Type.includes('int') || column.Type.includes('decimal') || column.Type.includes('float')) {
            // Number input for numeric fields
            input = document.createElement('input');
            input.type = 'number';

            if (column.Type.includes('decimal') || column.Type.includes('float')) {
                input.step = '0.01'; // Allow decimals
            }
        } else {
            // Default to text input
            input = document.createElement('input');
            input.type = 'text';
        }

        // Set common attributes
        input.id = `add-${column.Field}`;
        input.name = column.Field;
        input.className = 'form-control';

        // Add required attribute if column doesn't allow null
        if (column.Null === 'NO') {
            input.required = true;
            label.innerHTML += ' <span class="required">*</span>';
        }

        // Add field to form
        fieldGroup.appendChild(label);
        fieldGroup.appendChild(input);
        addRecordFieldsContainer.appendChild(fieldGroup);
    });

    // Update modal title
    const modalTitle = addRecordModal.querySelector('.modal-title');
    if (modalTitle) {
        modalTitle.textContent = `Add New ${window.currentTable} Record`;
    }

    // Show the modal
    addRecordModal.style.display = 'block';
}

/**
 * Navigate to the user management section
 */
function navigateToUserManagement() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Access denied. Admin role required.', 'error');
        return;
    }

    // Hide all content and show table view container
    hideAllContent();
    const tableView = document.getElementById('table-view');
    if (tableView) tableView.style.display = 'block';

    // Update table header
    const selectedTableHeader = document.getElementById('selected-table-header');
    if (selectedTableHeader) {
        selectedTableHeader.textContent = 'User Management';
    }

    // Hide add record button
    const addRecordBtn = document.getElementById('add-record-btn');
    if (addRecordBtn) addRecordBtn.style.display = 'none';

    // Show loading indicator in table content
    const tableContent = document.getElementById('table-content');
    if (tableContent) {
        tableContent.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading users...</div>';
    }

    // Override the table content with user management
    tableContent.innerHTML = '<div id="user-management-content"></div>';

    // Load and display users
    if (typeof loadAndDisplayUsers === 'function') {
        loadAndDisplayUsers();
    }
}

/**
 * Navigate to a specific table
 * @param {string} tableName - Name of the table to navigate to
 */
function navigateToTable(tableName) {
    if (typeof selectTable === 'function') {
        selectTable(tableName);
    }
}

// Export functions for use in other modules
export {
    showAuthView,
    showAppView,
    showLoginForm,
    showSignupForm,
    showDashboardOnly,
    showTableViewOnly,
    showStatisticsView,
    hideAllContent,
    updateHeader,
    showNotification,
    showDatabaseConnectionError,
    openAddRecordModal,
    navigateToUserManagement,
    navigateToTable
}; 