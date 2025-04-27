// public/js/app.js

// Import necessary functions from other modules
import * as auth from './auth.js';
import * as views from './views.js';
import * as data from './data.js';
import * as member from './member.js';
import * as employee from './employee.js';
import * as statistics from './statistics.js';


document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // --- Initial Setup ---
    // Check token - TODO: Add proper token validation later via a backend call
    const token = localStorage.getItem('token');
    if (token) {
        console.log("Token found, attempting initial view (validation needed)");
        // Ideally, validate token with backend here and call handleLoginSuccess if valid
        // fetch('/api/auth/validate-token', { headers: {'Authorization': `Bearer ${token}`} })...
        // For now, default to auth view if validation isn't implemented
        views.showAuthView();
    } else {
        views.showAuthView();
    }

    // --- Event Listeners ---

    // Auth Form Switching & Submission
    document.getElementById('show-signup')?.addEventListener('click', (e) => { e.preventDefault(); views.showSignupForm(); });
    document.getElementById('show-login')?.addEventListener('click', (e) => { e.preventDefault(); views.showLoginForm(); });
    document.getElementById('login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('signup-form')?.addEventListener('submit', auth.handleSignup);

    // Header Buttons
    document.getElementById('logout-btn')?.addEventListener('click', auth.handleLogout);
    document.getElementById('statistics-btn')?.addEventListener('click', views.showStatisticsView);
    document.getElementById('account-btn')?.addEventListener('click', openAccountModal);

    // Dashboard Navigation (User Management Card)
    document.getElementById('user-management-card')?.addEventListener('click', () => {
        if (auth.isAdmin()) {
            views.showUserManagementView(); // Show the view
            data.loadAndRenderUsers();      // Load the data for the view
        } else {
            views.showNotification('Access Denied: Admin role required.', 'error');
        }
    });
    // NOTE: Dynamic dashboard card listeners are added in data.js

    // Table View Navigation & Actions
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('add-record-btn')?.addEventListener('click', data.openAddRecordModal); // Listener for Add Record button

    // Statistics View Navigation
    document.getElementById('back-to-dashboard-from-stats-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('refresh-stats-btn')?.addEventListener('click', statistics.loadStatisticsData);

    // User Management View Navigation & Actions
    document.getElementById('back-to-dashboard-from-users-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('refresh-users-btn')?.addEventListener('click', data.loadAndRenderUsers);
    document.getElementById('add-admin-btn')?.addEventListener('click', openAddAdminModal); // Listener for Add Admin button

    // Employee View Refresh
    document.getElementById('refresh-employee-data-btn')?.addEventListener('click', employee.loadEmployeeData);

    // Member View Setup & Refresh
    member.setupMemberEventListeners(); // Adds its internal listeners
    document.getElementById('refresh-member-data-btn')?.addEventListener('click', member.loadMemberData);


    // Modals Setup
    setupModalListeners();

    // Listener for Add Record Modal Submit Button
    document.getElementById('submit-record')?.addEventListener('click', data.handleAddRecordSubmit);
    // Listener for Add Admin Modal Submit Button
    document.getElementById('submit-new-admin')?.addEventListener('click', data.handleAddAdminSubmit);


}); // End DOMContentLoaded

// --- Handler Functions ---

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const loginError = document.getElementById('login-error');
    loginError.style.display = 'none';
    try {
        const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Login failed');
        handleLoginSuccess(result);
    } catch (error) { console.error('Login error:', error); loginError.textContent = error.message; loginError.style.display = 'block'; }
}

function handleLoginSuccess(loginData) {
    localStorage.setItem('token', loginData.token);
    auth.setCurrentUser({ username: loginData.username, role: loginData.role }); // Store user info locally
    // Navigate to appropriate view AND load its initial data
    if (auth.isAdmin()) {
        views.showDashboardView();
        data.fetchTablesAndPopulateDashboard(); // Load admin dashboard tables
    } else if (auth.isEmployee()) {
        views.showEmployeeView(); // Calls loadEmployeeData internally via views.js
    } else {
        views.showMemberView(); // Calls loadMemberData internally via views.js
    }
    views.updateHeader(); // Update header display immediately
}

// Handler for "Back to Dashboard" buttons
function handleBackToDashboard() {
     if (auth.isAdmin()) {
        views.showDashboardView();
        // Re-fetch tables for admin dashboard for consistency
        data.fetchTablesAndPopulateDashboard();
    } else if (auth.isEmployee()) {
         // Go back to employee portal view
         views.showEmployeeView();
         // Optionally refresh employee data if needed
         // employee.loadEmployeeData();
    } else {
         // Members shouldn't normally see these buttons
         views.showMemberView();
    }
}

// Opens the Account Settings Modal
function openAccountModal() {
    const accountModal = document.getElementById('account-modal');
    if (accountModal && auth.currentUser) {
        document.getElementById('account-username').textContent = auth.currentUser.username;
        document.getElementById('account-role').textContent = auth.currentUser.role;
        document.getElementById('change-password-form')?.reset();
        document.getElementById('change-password-error').style.display = 'none';
        accountModal.style.display = 'block';
    }
}

// Opens the Add Admin Modal
function openAddAdminModal() {
    const modal = document.getElementById('add-admin-modal');
    if (modal) {
        document.getElementById('add-admin-form')?.reset();
        document.getElementById('add-admin-error').style.display = 'none';
        modal.style.display = 'block';
    } else {
        console.error("Add admin modal (#add-admin-modal) not found");
    }
}

// Setup listeners for all modal close buttons and specific forms
function setupModalListeners() {
     // General close buttons (using class 'close' on the span/button)
     document.querySelectorAll('.modal .close').forEach(btn => {
         btn.addEventListener('click', () => {
             btn.closest('.modal').style.display = 'none';
         });
     });
     // Specific cancel button for add record modal by ID
     document.getElementById('cancel-record')?.addEventListener('click', () => {
          document.getElementById('add-record-modal').style.display = 'none';
     });

     // Change Password Form Submission
     document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);

     // Add other specific modal form submit/cancel listeners here if needed...
     // e.g., Profile Edit, Plan Change, Tee Time, Equipment Rental modals
}

// Handles password change submission (Requires backend endpoint)
async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const errorDiv = document.getElementById('change-password-error');
    errorDiv.style.display = 'none';
    if (newPassword !== confirmNewPassword) { errorDiv.textContent = "New passwords don't match."; errorDiv.style.display = 'block'; return; }
    // Add length check consistent with signup
    if (newPassword.length < 4) { errorDiv.textContent = "New password must be at least 4 characters."; errorDiv.style.display = 'block'; return; }
    if (!currentPassword || !newPassword) { errorDiv.textContent = "All password fields required."; errorDiv.style.display = 'block'; return; }
    try {
        // !!! Ensure '/api/user/change-password' endpoint exists on backend !!!
        const response = await auth.authenticatedFetch('/api/user/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update password');
        views.showNotification('Password updated successfully!', 'success');
        document.getElementById('account-modal').style.display = 'none';
    } catch (error) { console.error("Change password error:", error); errorDiv.textContent = error.message; errorDiv.style.display = 'block'; }
}