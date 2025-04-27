/**
 * views.js - Simplified View Management
 * 
 * Handles showing and hiding different views in the application:
 * - Auth view (login/signup)
 * - Dashboard view
 * - Table view
 * - Member view
 */

import { currentUser, isAdmin, isEmployee } from './auth.js';
import { loadEmployeeData } from './employee.js';
import { loadStatisticsData } from './statistics.js';

/**
 * Show the authentication view (login/signup)
 */
function showAuthView() {
    // Hide all views first
    hideAllViews();

    // Show auth view
    const authView = document.getElementById('auth-view');
    if (authView) {
        authView.style.display = 'flex';
        document.body.classList.add('auth-background');
    }

    // Hide user status
    const userStatusDisplay = document.getElementById('user-status');
    if (userStatusDisplay) {
        userStatusDisplay.style.display = 'none';
    }

    // Show login form initially
    showLoginForm();
}

/**
 * Show the login form
 */
function showLoginForm() {
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');

    if (loginFormContainer && signupFormContainer) {
        loginFormContainer.style.display = 'block';
        signupFormContainer.style.display = 'none';

        // Clear any error messages
        const loginError = document.getElementById('login-error');
        if (loginError) loginError.style.display = 'none';

        // Reset the form
        const loginForm = document.getElementById('login-form');
        if (loginForm) loginForm.reset();
    }
}

/**
 * Show the signup form
 */
function showSignupForm() {
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');

    if (loginFormContainer && signupFormContainer) {
        loginFormContainer.style.display = 'none';
        signupFormContainer.style.display = 'block';

        // Clear any error messages
        const signupError = document.getElementById('signup-error');
        if (signupError) signupError.style.display = 'none';

        // Reset the form
        const signupForm = document.getElementById('signup-form');
        if (signupForm) signupForm.reset();
    }
}

/**
 * Show the dashboard view
 */
function showDashboardView() {
    // Ensure user is authenticated
    if (!currentUser) {
        showAuthView();
        return;
    }

    // Hide all views first
    hideAllViews();

    // Show app view
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }

    // Show dashboard view
    const dashboardView = document.getElementById('dashboard-view');
    if (dashboardView) {
        dashboardView.style.display = 'block';
    }

    // Update header
    updateHeader();
}

/**
 * Show the table view
 */
function showTableView(tableName) {
    // Ensure user is authenticated
    if (!currentUser) {
        showAuthView();
        return;
    }

    // Hide all views first
    hideAllViews();

    // Show app view
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
    }

    // Show table view
    const tableView = document.getElementById('table-view');
    if (tableView) {
        tableView.style.display = 'block';
    }

    // Update selected table
    const selectedTableElement = document.getElementById('selected-table');
    if (selectedTableElement && tableName) {
        selectedTableElement.textContent = tableName;
    }

    // Enable add record button
    const addRecordBtn = document.getElementById('add-record-btn');
    if (addRecordBtn) {
        addRecordBtn.disabled = false;
    }

    // Save current table name
    window.currentTable = tableName;
}

/**
 * Show the member view
 */
function showMemberView() {
    // Ensure user is authenticated and is a member
    if (!currentUser) {
        showAuthView();
        return;
    }

    // Hide all views first
    hideAllViews();

    // Show app view
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }

    // Show member view
    const memberView = document.getElementById('member-view');
    if (memberView) {
        memberView.style.display = 'block';
    }

    // Update header
    updateHeader();

    // Load member data
    loadMemberData();
}

/**
 * Show the employee view
 */
function showEmployeeView() {
    // Ensure user is authenticated and is an employee
    if (!currentUser || !isEmployee()) {
        showAuthView();
        return;
    }

    // Hide all views first
    hideAllViews();

    // Show app view
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }

    // Show employee view
    const employeeView = document.getElementById('employee-view');
    if (employeeView) {
        employeeView.style.display = 'block';
    }

    // Update header
    updateHeader();

    // Load employee data
    loadEmployeeData();
}

/**
 * Show the statistics view
 */
function showStatisticsView() {
    // Only admin or employee can see statistics
    if (!currentUser || (!isAdmin() && !isEmployee())) {
        showAuthView();
        return;
    }

    // Hide all views first
    hideAllViews();

    // Show app view
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }

    // Show statistics view
    const statsView = document.getElementById('statistics-view');
    if (statsView) {
        statsView.style.display = 'block';
    }

    // Update header
    updateHeader();

    // Load statistics data
    loadStatisticsData();
}

/**
 * Hide all views
 */
function hideAllViews() {
    // Auth view
    const authView = document.getElementById('auth-view');
    if (authView) {
        authView.style.display = 'none';
    }

    // App view content
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'none';
    }

    const dashboardView = document.getElementById('dashboard-view');
    if (dashboardView) {
        dashboardView.style.display = 'none';
    }

    const tableView = document.getElementById('table-view');
    if (tableView) {
        tableView.style.display = 'none';
    }

    const memberView = document.getElementById('member-view');
    if (memberView) {
        memberView.style.display = 'none';
    }

    const statisticsView = document.getElementById('statistics-view');
    if (statisticsView) {
        statisticsView.style.display = 'none';
    }

    // Hide the employee view
    const employeeView = document.getElementById('employee-view');
    if (employeeView) {
        employeeView.style.display = 'none';
    }
}

/**
 * Update the header based on current user
 */
function updateHeader() {
    if (!currentUser) return;

    const usernameDisplay = document.getElementById('username-display');
    const userStatusDisplay = document.getElementById('user-status');

    if (usernameDisplay && userStatusDisplay) {
        usernameDisplay.textContent = `${currentUser.username} (${currentUser.role})`;
        userStatusDisplay.style.display = 'flex';
    }

    // Show stats button only for admin or employee
    const statsBtn = document.getElementById('statistics-btn');
    if (statsBtn) {
        statsBtn.style.display = (isAdmin() || isEmployee()) ? 'inline-flex' : 'none';
    }
}

/**
 * Show a notification message
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');

    if (!notification || !notificationMessage) return;

    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';

    setTimeout(() => {
        notification.style.display = 'none';
    }, 5000);
}

// Placeholder functions that will be implemented elsewhere
function loadMemberData() {
    // This will be implemented in the member module
    console.log('Loading member data...');
}

// Export functions for use in other files
export {
    showAuthView,
    showLoginForm,
    showSignupForm,
    showDashboardView,
    showTableView,
    showMemberView,
    showEmployeeView,
    showStatisticsView,
    hideAllViews,
    updateHeader,
    showNotification
}; 