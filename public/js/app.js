// public/js/app.js

import * as auth from './auth.js';
import * as views from './views.js';
import * as data from './data.js';
import * as member from './member.js';
import * as employee from './employee.js';
import * as statistics from './statistics.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded and parsed');

    // --- Initial Setup ---
    const token = localStorage.getItem('token');
    if (token) {
        console.log("Token found, initial validation needed (TODO)");
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

    // ---> CHANGE 'input' to 'change' for the role dropdown listener <---
    const roleDropdown = document.getElementById('signup-role');
    if (roleDropdown) {
        roleDropdown.addEventListener('change', handleRoleChange); // Use 'change' event
        console.log("Event listener ('change') attached to #signup-role");
    } else {
        console.error("#signup-role dropdown not found!");
    }
    // -------------------------------------------------------------------

    // Header Buttons
    document.getElementById('logout-btn')?.addEventListener('click', auth.handleLogout);
    document.getElementById('statistics-btn')?.addEventListener('click', views.showStatisticsView);
    document.getElementById('account-btn')?.addEventListener('click', openAccountModal);

    // Dashboard Navigation
    document.getElementById('user-management-card')?.addEventListener('click', () => { if (auth.isAdmin()) { views.showUserManagementView(); data.loadAndRenderUsers(); } else { views.showNotification('Access Denied', 'error'); } });

    // Table View Navigation & Actions
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('add-record-btn')?.addEventListener('click', data.openAddRecordModal);

    // Statistics View Navigation
    document.getElementById('back-to-dashboard-from-stats-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('refresh-stats-btn')?.addEventListener('click', statistics.loadStatisticsData);

    // User Management View Navigation & Actions
    document.getElementById('back-to-dashboard-from-users-btn')?.addEventListener('click', handleBackToDashboard);
    document.getElementById('refresh-users-btn')?.addEventListener('click', data.loadAndRenderUsers);
    document.getElementById('add-admin-btn')?.addEventListener('click', openAddAdminModal);

    // Employee View Refresh
    document.getElementById('refresh-employee-data-btn')?.addEventListener('click', employee.loadEmployeeData);

    // Member View Setup & Refresh
    member.setupMemberEventListeners();
    document.getElementById('refresh-member-data-btn')?.addEventListener('click', member.loadMemberData);


    // Modals Setup
    setupModalListeners();
    document.getElementById('submit-record')?.addEventListener('click', data.handleAddRecordSubmit);
    document.getElementById('submit-new-admin')?.addEventListener('click', data.handleAddAdminSubmit);
    document.getElementById('change-password-form')?.addEventListener('submit', handleChangePassword);


}); // End DOMContentLoaded

// --- Handler Functions ---

function handleRoleChange(e) {
    const selectedRole = e.target.value;
    console.log("Role changed to:", selectedRole); // Keep this log
    const memberFieldsDiv = document.getElementById('member-fields');
    const fnameInput = document.getElementById('signup-fname');
    const lnameInput = document.getElementById('signup-lname');

    if (memberFieldsDiv) {
        if (selectedRole === 'member') {
            console.log("Showing member fields"); // Keep this log
            memberFieldsDiv.style.display = 'block';
            if (fnameInput) fnameInput.required = true;
            if (lnameInput) lnameInput.required = true;
        } else {
            console.log("Hiding member fields"); // Keep this log
            memberFieldsDiv.style.display = 'none';
            if (fnameInput) fnameInput.required = false;
            if (lnameInput) lnameInput.required = false;
        }
    } else {
        console.error("CRITICAL: Could not find the #member-fields container div!");
    }
}

async function handleLogin(e) { e.preventDefault(); const u=document.getElementById('login-username').value; const p=document.getElementById('login-password').value; const err=document.getElementById('login-error'); err.style.display='none'; try { const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username:u, password:p }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Login failed'); handleLoginSuccess(d); } catch (error) { console.error('Login err:', error); err.textContent = error.message; err.style.display = 'block'; } }
function handleLoginSuccess(loginData) { localStorage.setItem('token', loginData.token); auth.setCurrentUser({ username: loginData.username, role: loginData.role, userId: loginData.userId }); if (auth.isAdmin()) { views.showDashboardView(); data.fetchTablesAndPopulateDashboard(); } else if (auth.isEmployee()) { views.showEmployeeView(); } else { views.showMemberView(); } views.updateHeader(); }
function handleBackToDashboard() { if (auth.isAdmin()) { views.showDashboardView(); data.fetchTablesAndPopulateDashboard(); } else if (auth.isEmployee()) { views.showEmployeeView(); } else { views.showMemberView(); } }
function openAccountModal() { const m = document.getElementById('account-modal'); if (m && auth.currentUser) { document.getElementById('account-username').textContent = auth.currentUser.username; document.getElementById('account-role').textContent = auth.currentUser.role; document.getElementById('change-password-form')?.reset(); document.getElementById('change-password-error').style.display = 'none'; m.style.display = 'block'; } }
function openAddAdminModal() { const m = document.getElementById('add-admin-modal'); if (m) { document.getElementById('add-admin-form')?.reset(); document.getElementById('add-admin-error').style.display = 'none'; m.style.display = 'block'; } else { console.error("Add admin modal missing"); } }
function setupModalListeners() { document.querySelectorAll('.modal .close').forEach(btn => { btn.addEventListener('click', (e) => { e.preventDefault(); btn.closest('.modal').style.display = 'none'; }); }); document.getElementById('cancel-record')?.addEventListener('click', () => { document.getElementById('add-record-modal').style.display = 'none'; }); /* submit listeners attached directly */ }
async function handleChangePassword(e) { e.preventDefault(); const cur=document.getElementById('current-password').value; const nw=document.getElementById('new-password').value; const cnf=document.getElementById('confirm-new-password').value; const err=document.getElementById('change-password-error'); err.style.display='none'; if(nw!==cnf){err.textContent="New passwords don't match.";err.style.display='block';return;} if(nw.length<4){err.textContent="New password min 4 chars.";err.style.display='block';return;} if(!cur||!nw){err.textContent="All fields required.";err.style.display='block';return;} try { const resp = await auth.authenticatedFetch('/api/user/change-password', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:cur, newPassword:nw})}); const res = await resp.json(); if (!resp.ok) throw new Error(res.error||'Update failed'); views.showNotification('Password updated!', 'success'); document.getElementById('account-modal').style.display='none'; } catch(error){console.error("Change pw error:", error); err.textContent=error.message; err.style.display='block';} }