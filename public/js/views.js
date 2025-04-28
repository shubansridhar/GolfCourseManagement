// public/js/views.js

/**
 * views.js - Simplified View Management
 * Handles showing and hiding different views in the application.
 */

import { currentUser, isAdmin, isEmployee } from './auth.js';
import { loadEmployeeData } from './employee.js';
import { loadStatisticsData } from './statistics.js';
// Import the member module to call its load function
import * as member from './member.js';

// --- Helper function to check admin existence via API ---
async function checkAdminExists() {
     try {
        // Use relative path for API call from frontend JS
        const response = await fetch('/api/auth/admin-exists');
        if (!response.ok) {
            console.error("API Error checking admin existence:", response.status);
            return true; // Assume exists on error for safety
        }
        const data = await response.json();
        return data.exists;
    } catch (error) {
        console.error('Network error checking admin existence:', error);
        return true; // Assume exists on error for safety
    }
}
// -------------------------------------------------------


/**
 * Show the authentication view (login/signup)
 */
function showAuthView() {
    hideAllViews(); // Hide all other views first
    const authView = document.getElementById('auth-view');
    if (authView) {
        authView.style.display = 'flex'; // Use flex for centering auth-container
        document.body.classList.add('auth-background');
    }
    const userStatusDisplay = document.getElementById('user-status');
    if (userStatusDisplay) {
        userStatusDisplay.style.display = 'none'; // Hide user status/logout in auth view
    }
    showLoginForm(); // Default to showing the login form
}

/**
 * Show the login form within the auth view
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
        if (loginForm) loginForm.reset(); // Reset form fields
    }
}

/**
 * Show the signup form AND dynamically add Admin option AND trigger initial role check
 */
async function showSignupForm() { // Make async to await checkAdminExists
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');
    const roleSelect = document.getElementById('signup-role'); // Get role dropdown
    const adminRoleInfo = document.getElementById('admin-role-info'); // Get info text

    if (loginFormContainer && signupFormContainer && roleSelect && adminRoleInfo) {
        // Show signup, hide login
        loginFormContainer.style.display = 'none';
        signupFormContainer.style.display = 'block';

        // --- Dynamic Admin Option Logic ---
        const adminExists = await checkAdminExists(); // Check backend if admin exists

        // Remove existing admin option first (if present from previous call)
        const existingAdminOption = roleSelect.querySelector('option[value="admin"]');
        if (existingAdminOption) {
            existingAdminOption.remove();
        }

        if (!adminExists) {
            // If no admin exists, add the 'Admin' option to the select dropdown
            console.log("No admin exists, adding Admin option to signup.");
            const adminOption = document.createElement('option');
            adminOption.value = 'admin';
            adminOption.textContent = 'Admin (First Setup)';
            roleSelect.appendChild(adminOption); // Add it
            adminRoleInfo.style.display = 'block'; // Show info text
        } else {
            // If admin exists, ensure the info text is hidden
            console.log("Admin exists, hiding Admin option/info.");
            adminRoleInfo.style.display = 'none';
        }
        // ---------------------------------

        // Clear any previous signup error messages
        const signupError = document.getElementById('signup-error');
        if (signupError) signupError.style.display = 'none';

        // Reset the signup form fields
        const signupForm = document.getElementById('signup-form');
        if (signupForm) signupForm.reset();

        // --- Manually trigger role check based on current value ---
        // This makes the #member-fields show/hide correctly on initial display
        if (roleSelect) {
            // Create and dispatch a 'change' event
            // The existing listener in app.js should pick this up
            console.log("Dispatching initial change event for role select");
            roleSelect.dispatchEvent(new Event('change')); // Dispatch event
        }
        // -----------------------------------------------------------
    }
}


/**
 * Show the main dashboard view (routes based on role)
 */
function showDashboardView() {
    if (!currentUser) { showAuthView(); return; }
    // Redirect non-admins immediately
    if (!isAdmin()) {
        if (isEmployee()) { showEmployeeView(); return; }
        showMemberView(); return; // Default for non-admin, non-employee
    }
    // Only Admins reach here
    hideAllViews();
    const appView = document.getElementById('app-view'); if (appView) { appView.style.display = 'block'; }
    const dashboardView = document.getElementById('dashboard-view'); if (dashboardView) { dashboardView.style.display = 'block'; }
    updateHeader();
    // Note: Data for admin dashboard (fetchTablesAndPopulateDashboard) is loaded from app.js
}

/**
 * Show the generic table view - data loading is separate
 */
function showTableView(tableName) { // tableName is used by loadTableData to update header
    if (!currentUser || (!isAdmin() && !isEmployee())) { showAuthView(); return; } // Auth check
    hideAllViews();
    const appView = document.getElementById('app-view'); if (appView) { appView.style.display = 'block'; }
    const tableView = document.getElementById('table-view'); if (tableView) { tableView.style.display = 'block'; }
    // Header update and data loading happen in loadTableData (triggered by listener)
}

/**
 * Show the member view
 */
function showMemberView() {
    if (!currentUser) { showAuthView(); return; } // Any logged-in user can see this if not admin/employee
    hideAllViews();
    const appView = document.getElementById('app-view'); if (appView) { appView.style.display = 'block'; }
    const memberView = document.getElementById('member-view'); if (memberView) { memberView.style.display = 'block'; }
    updateHeader();
    member.loadMemberData(); // Call imported function from member.js
}

/**
 * Show the employee view
 */
function showEmployeeView() {
    if (!currentUser || !isEmployee()) { showAuthView(); return; } // isEmployee includes admin check
    hideAllViews();
    const appView = document.getElementById('app-view'); if (appView) { appView.style.display = 'block'; }
    const employeeView = document.getElementById('employee-view'); if (employeeView) { employeeView.style.display = 'block'; }
    updateHeader();
    loadEmployeeData(); // Call imported function from employee.js
}

/**
 * Show the statistics view
 */
function showStatisticsView() {
    if (!currentUser || (!isAdmin() && !isEmployee())) { showAuthView(); return; }
    hideAllViews();
    const appView = document.getElementById('app-view'); if (appView) { appView.style.display = 'block'; }
    const statsView = document.getElementById('statistics-view'); if (statsView) { statsView.style.display = 'block'; }
    updateHeader();
    loadStatisticsData(); // Call imported function from statistics.js
}

/**
 * Show the User Management view (Admin only)
 */
function showUserManagementView() {
    if (!currentUser || !isAdmin()) { showDashboardView(); return; } // Redirect if not admin
    hideAllViews();
    const appView = document.getElementById('app-view'); if (appView) { appView.style.display = 'block'; }
    const userManagementView = document.getElementById('user-management-view'); if (userManagementView) { userManagementView.style.display = 'block'; }
    updateHeader();
    // Note: loadAndRenderUsers is called from app.js after this function
}

/**
 * Hide all specific view sections within main and manage body class/header status
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
    let isAuthViewVisible = false; // Flag to check if auth view ends up visible

    viewsToHide.forEach(id => {
        const view = document.getElementById(id);
        if (view) {
            if (id === 'auth-view' && view.style.display !== 'none') {
                isAuthViewVisible = true; // Check before hiding
            }
            view.style.display = 'none';
        }
    });

    // Manage app-view container and body class based on final state
    const appView = document.getElementById('app-view');
    if (appView) {
         // Show app-view only if auth-view is hidden (meaning user should be logged in)
         // This logic might need refinement depending on exact flow after hiding all
         // Let's assume if auth-view was hidden, app-view should show (unless specifically showing auth-view)
         // If showAuthView called hideAllViews, isAuthViewVisible will be true *before* hiding,
         // but showAuthView explicitly shows auth-view *after* hideAllViews.
         // Let's simplify: showing any view other than auth should ensure appView is visible.
         // HideAllViews just hides everything; the subsequent show* function handles appView visibility.
         // So, just manage body class and header here.
    }

    // Manage body background class
    const authViewCheck = document.getElementById('auth-view'); // Check again after potential hide
    if (authViewCheck && authViewCheck.style.display !== 'none') {
        document.body.classList.add('auth-background');
    } else {
         document.body.classList.remove('auth-background');
    }

     // Hide user status display when in auth view
    const userStatusDisplay = document.getElementById('user-status');
    if (userStatusDisplay && authViewCheck && authViewCheck.style.display !== 'none') {
        userStatusDisplay.style.display = 'none';
    }
}


/**
 * Update the header display based on current user
 */
function updateHeader() {
    const userStatusDisplay = document.getElementById('user-status');
    if (!currentUser) { // Hide header elements if logged out
         if (userStatusDisplay) userStatusDisplay.style.display = 'none';
         return;
    }
    // If logged in, show elements
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay && userStatusDisplay) {
        usernameDisplay.textContent = `${currentUser.username} (${currentUser.role})`;
        userStatusDisplay.style.display = 'flex'; // Show the whole user status area
    }
    // Conditionally show stats button
    const statsBtn = document.getElementById('statistics-btn');
    if (statsBtn) {
        statsBtn.style.display = (isAdmin() || isEmployee()) ? 'inline-flex' : 'none';
    }
}

/**
 * Show a global notification message (uses area in table-view currently)
 */
function showNotification(message, type = 'info') {
    // Ideally, notification HTML should be global
    const notification = document.getElementById('notification');
    const notificationMessage = document.getElementById('notification-message');
    if (!notification || !notificationMessage) {
        console.warn('Notification elements (#notification / #notification-message) not found. Message:', message);
        alert(`${type.toUpperCase()}: ${message}`); // Fallback alert
        return;
    }
    notificationMessage.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'block';
    // Consider adding 'show' class for animation if CSS uses it: notification.classList.add('show');

    setTimeout(() => {
        notification.style.display = 'none';
        // notification.classList.remove('show');
    }, 5000);
}


// Export functions needed by other modules
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