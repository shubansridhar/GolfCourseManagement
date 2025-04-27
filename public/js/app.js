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
    // Check token - TODO: Add proper token validation later
    const token = localStorage.getItem('token');
    if (token) {
        console.log("Token found, attempting to determine view (validation needed)");
        // Placeholder: Assume token is valid and try to show appropriate view
        // Needs backend call to verify token and get user data
        // fetch('/api/auth/validate', { headers: {'Authorization': `Bearer ${token}`} }) ...
        // For now, just default to auth view if refresh happens
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

    // --- Dashboard Navigation ---
    // Listener for dynamically loaded table cards is added in data.js/populateDashboard

    // Listener for STATIC User Management card
    document.getElementById('user-management-card')?.addEventListener('click', () => {
        if (auth.isAdmin()) {
            views.showUserManagementView(); // Show the view first
            data.loadAndRenderUsers();      // THEN load the data for the view
        } else {
            views.showNotification('Access Denied: Admin role required.', 'error');
        }
    });

    // Table View Navigation
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('add-record-btn')?.addEventListener('click', openAddRecordModal);

    // Statistics View Navigation
    document.getElementById('back-to-dashboard-from-stats-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('refresh-stats-btn')?.addEventListener('click', statistics.loadStatisticsData);

    // User Management View Navigation
    document.getElementById('back-to-dashboard-from-users-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('refresh-users-btn')?.addEventListener('click', data.loadAndRenderUsers);

    // Employee View Refresh
    document.getElementById('refresh-employee-data-btn')?.addEventListener('click', employee.loadEmployeeData);

    // Member View Setup & Refresh
    member.setupMemberEventListeners(); // Adds its internal listeners
    document.getElementById('refresh-member-data-btn')?.addEventListener('click', member.loadMemberData);


    // Modals Setup
    setupModalListeners();

}); // End DOMContentLoaded

// --- Handler Functions ---

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const loginError = document.getElementById('login-error');
    loginError.style.display = 'none';

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Login failed');

        handleLoginSuccess(result); // Handle successful login steps

    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = error.message;
        loginError.style.display = 'block';
    }
}

function handleLoginSuccess(loginData) {
    localStorage.setItem('token', loginData.token);
    auth.setCurrentUser({ username: loginData.username, role: loginData.role });

    // Navigate to appropriate view AND load its initial data
    if (auth.isAdmin()) {
        views.showDashboardView(); // Shows the dashboard view container
        data.fetchTablesAndPopulateDashboard(); // Populates the dynamic part
    } else if (auth.isEmployee()) {
        views.showEmployeeView(); // Calls loadEmployeeData internally
    } else {
        views.showMemberView(); // Calls loadMemberData internally
    }
    views.updateHeader();
}

// Handler for "Back to Dashboard" buttons
function handleBackToDashboard() {
     if (auth.isAdmin()) {
        views.showDashboardView();
        data.fetchTablesAndPopulateDashboard(); // Reload tables for admin consistency
    } else if (auth.isEmployee()) {
         views.showEmployeeView(); // Go back to employee portal
         // employee.loadEmployeeData(); // Optionally refresh if needed
    } else {
         // Members shouldn't see this button typically
         views.showMemberView();
    }
}

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

function openAddRecordModal() {
     console.log("Add record for table:", window.currentTable);
     views.showNotification("Add record functionality not yet implemented.", "warning");
     // TODO: Fetch table structure for window.currentTable
     // TODO: Dynamically build form in #add-record-form based on structure
     // TODO: Show #add-record-modal
}

function setupModalListeners() {
     // General close buttons (using class 'close')
     document.querySelectorAll('.modal .close').forEach(btn => {
         btn.addEventListener('click', () => {
             btn.closest('.modal').style.display = 'none';
         });
     });
      // Specific cancel buttons by ID if needed
     document.getElementById('cancel-record')?.addEventListener('click', () => {
          document.getElementById('add-record-modal').style.display = 'none';
     });

     // Change Password Form Submission
     document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);

     // Add listeners for other modal submissions here (profile edit, etc.)
}

async function handleChangePassword(e) {
    e.preventDefault();
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmNewPassword = document.getElementById('confirm-new-password').value;
    const errorDiv = document.getElementById('change-password-error');
    errorDiv.style.display = 'none';

    if (newPassword !== confirmNewPassword) {
        errorDiv.textContent = "New passwords do not match.";
        errorDiv.style.display = 'block'; return;
    }
    if (!currentPassword || !newPassword) {
         errorDiv.textContent = "All password fields are required.";
        errorDiv.style.display = 'block'; return;
    }

    try {
        // !! IMPORTANT: Ensure you have a '/api/user/change-password' endpoint in server.js !!
        const response = await auth.authenticatedFetch('/api/user/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPassword, newPassword })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to update password');

        views.showNotification('Password updated successfully!', 'success');
        document.getElementById('account-modal').style.display = 'none';

    } catch (error) {
        console.error("Change password error:", error);
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    }
}