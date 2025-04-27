/**
 * views.js - Simplified View Management
 * Handles showing and hiding different views in the application.
 */

import { currentUser, isAdmin, isEmployee } from './auth.js';
import { loadEmployeeData } from './employee.js';
import { loadStatisticsData } from './statistics.js';
// Import the member module to call its load function
import * as member from './member.js';


/**
 * Show the authentication view (login/signup)
 */
function showAuthView() {
    hideAllViews();
    const authView = document.getElementById('auth-view');
    if (authView) {
        authView.style.display = 'flex';
        document.body.classList.add('auth-background');
    }
    const userStatusDisplay = document.getElementById('user-status');
    if (userStatusDisplay) {
        userStatusDisplay.style.display = 'none';
    }
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
        const loginError = document.getElementById('login-error');
        if (loginError) loginError.style.display = 'none';
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
        const signupError = document.getElementById('signup-error');
        if (signupError) signupError.style.display = 'none';
        const signupForm = document.getElementById('signup-form');
        if (signupForm) signupForm.reset();
    }
}

/**
 * Show the dashboard view (routes based on role)
 */
function showDashboardView() {
    if (!currentUser) {
        showAuthView();
        return;
    }
    // Redirect non-admins immediately
    if (!isAdmin()) {
        if (isEmployee()) {
            showEmployeeView();
            return;
        }
        showMemberView(); // Default for non-admin, non-employee (member)
        return;
    }
    // Only Admins reach here
    hideAllViews();
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }
    const dashboardView = document.getElementById('dashboard-view');
    if (dashboardView) {
        dashboardView.style.display = 'block';
    }
    updateHeader();
    // NOTE: fetchTablesAndPopulateDashboard is called from app.js after login or back button
}

/**
 * Show the table view
 */
function showTableView(tableName) {
    if (!currentUser || (!isAdmin() && !isEmployee())) {
        showAuthView();
        return;
    }
    hideAllViews();
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
    }
    const tableView = document.getElementById('table-view');
    if (tableView) {
        tableView.style.display = 'block';
    }
    // Update UI elements - loadTableData called separately
}

/**
 * Show the member view
 */
function showMemberView() {
    if (!currentUser) {
        showAuthView();
        return;
    }
    hideAllViews();
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }
    const memberView = document.getElementById('member-view');
    if (memberView) {
        memberView.style.display = 'block';
    }
    updateHeader();
    // ---> Call the imported function <---
    member.loadMemberData();
}

/**
 * Show the employee view
 */
function showEmployeeView() {
    if (!currentUser || !isEmployee()) {
        showAuthView();
        return;
    }
    hideAllViews();
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }
    const employeeView = document.getElementById('employee-view');
    if (employeeView) {
        employeeView.style.display = 'block';
    }
    updateHeader();
    loadEmployeeData(); // Call imported function
}

/**
 * Show the statistics view
 */
function showStatisticsView() {
    if (!currentUser || (!isAdmin() && !isEmployee())) {
        showAuthView();
        return;
    }
    hideAllViews();
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }
    const statsView = document.getElementById('statistics-view');
    if (statsView) {
        statsView.style.display = 'block';
    }
    updateHeader();
    loadStatisticsData(); // Call imported function
}

/**
 * Show the User Management view (Admin only)
 */
function showUserManagementView() {
    if (!currentUser || !isAdmin()) {
        showDashboardView();
        return;
    }
    hideAllViews();
    const appView = document.getElementById('app-view');
    if (appView) {
        appView.style.display = 'block';
        document.body.classList.remove('auth-background');
    }
    const userManagementView = document.getElementById('user-management-view');
    if (userManagementView) {
        userManagementView.style.display = 'block';
    }
    updateHeader();
    // loadAndRenderUsers is called from app.js now
}

/**
 * Hide all specific view sections
 */
function hideAllViews() {
    const viewsToHide = [
        'auth-view',
        'dashboard-view',
        'table-view',
        'member-view',
        'statistics-view',
        'employee-view',
        'user-management-view'
    ];

    viewsToHide.forEach(id => {
        const view = document.getElementById(id);
        if (view) {
            view.style.display = 'none';
        }
    });

    // Also ensure app-view container is hidden if auth is showing
    const appView = document.getElementById('app-view');
    const authViewCheck = document.getElementById('auth-view');
    if (appView && authViewCheck && authViewCheck.style.display !== 'none') {
         appView.style.display = 'none';
    }

    // Remove auth background if not on auth view
    if (authViewCheck && authViewCheck.style.display === 'none') {
        document.body.classList.remove('auth-background');
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
    const statsBtn = document.getElementById('statistics-btn');
    if (statsBtn) {
        statsBtn.style.display = (isAdmin() || isEmployee()) ? 'inline-flex' : 'none';
    }
}

/**
 * Show a global notification message (uses area in table-view currently)
 */
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    if (!notification || !notificationMessage) {
        console.warn('Notification elements (#notification / #notification-message) not found. Message:', message);
        alert(`${type.toUpperCase()}: ${message}`); // Fallback alert
        return;
    }
    // Make notification area visible if needed (e.g. if table-view is hidden)
    // Ideally, move notification HTML outside specific views for global use.
    // For now, let's ensure its parent (#table-view?) doesn't prevent visibility.
    // This is complex, assuming it just works for now.
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    // Consider adding 'show' class for animation if CSS uses it: notification.classList.add('show');

    setTimeout(() => {
        notification.style.display = 'none';
        // notification.classList.remove('show');
    }, 5000);
}

// Export functions
export {
    showAuthView,
    showLoginForm,
    showSignupForm,
    showDashboardView,
    showTableView,
    showMemberView,
    showEmployeeView,
    showStatisticsView,
    showUserManagementView,
    hideAllViews,
    updateHeader,
    showNotification
};