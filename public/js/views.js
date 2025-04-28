// public/js/views.js

/**
 * views.js - Simplified View Management
 */

import { currentUser, isAdmin, isEmployee } from './auth.js';
import { loadEmployeeData } from './employee.js';
import { loadStatisticsData } from './statistics.js';
import * as member from './member.js';

// Helper function to check admin existence via API
async function checkAdminExists() {
     try { const resp = await fetch('/api/auth/admin-exists'); if (!resp.ok) { console.error("API Err check admin:", resp.status); return true; } const data = await resp.json(); return data.exists; } catch (error) { console.error('Net err check admin:', error); return true; }
}

// --- Show/Hide Functions ---

function showAuthView() { hideAllViews(); const aV=document.getElementById('auth-view'); if(aV){aV.style.display='flex'; document.body.classList.add('auth-background');} const uS=document.getElementById('user-status'); if(uS)uS.style.display='none'; showLoginForm(); }
function showLoginForm() { const lFC=document.getElementById('login-form-container'); const sFC=document.getElementById('signup-form-container'); if(lFC&&sFC){lFC.style.display='block'; sFC.style.display='none'; const lE=document.getElementById('login-error'); if(lE)lE.style.display='none'; const lF=document.getElementById('login-form'); if(lF)lF.reset();} }

/**
 * Show the signup form AND dynamically add Admin option AND set initial field visibility
 */
async function showSignupForm() { // Make async
    const loginFormContainer = document.getElementById('login-form-container');
    const signupFormContainer = document.getElementById('signup-form-container');
    const roleSelect = document.getElementById('signup-role');
    const adminRoleInfo = document.getElementById('admin-role-info');
    const memberFieldsDiv = document.getElementById('member-fields'); // Get member fields container
    const fnameInput = document.getElementById('signup-fname');
    const lnameInput = document.getElementById('signup-lname');


    if (loginFormContainer && signupFormContainer && roleSelect && adminRoleInfo && memberFieldsDiv) {
        // Show signup, hide login
        loginFormContainer.style.display = 'none';
        signupFormContainer.style.display = 'block';

        // Dynamic Admin Option Logic
        const adminExists = await checkAdminExists();
        const existingAdminOption = roleSelect.querySelector('option[value="admin"]');
        if (existingAdminOption) existingAdminOption.remove();
        const existingEmployeeOption = roleSelect.querySelector('option[value="employee"]');
        if (existingEmployeeOption) existingEmployeeOption.remove(); // Ensure employee removed
        if (!adminExists) {
            console.log("No admin exists, adding Admin option.");
            const adminOption = document.createElement('option'); adminOption.value = 'admin'; adminOption.textContent = 'Admin (First Setup)'; roleSelect.appendChild(adminOption); adminRoleInfo.style.display = 'block';
        } else {
            adminRoleInfo.style.display = 'none';
        }

        // Clear errors & reset form
        const signupError = document.getElementById('signup-error'); if (signupError) signupError.style.display = 'none';
        const signupForm = document.getElementById('signup-form'); if (signupForm) signupForm.reset();

        // ---> FIX: Set initial visibility DIRECTLY based on default dropdown value <---
        const initialRole = roleSelect.value; // Get the default selected value
        console.log("Setting initial field visibility for role:", initialRole);
        if (initialRole === 'member') {
            memberFieldsDiv.style.display = 'block'; // Show member fields
            if (fnameInput) fnameInput.required = true;
            if (lnameInput) lnameInput.required = true;
        } else {
            memberFieldsDiv.style.display = 'none'; // Hide member fields
            if (fnameInput) fnameInput.required = false;
            if (lnameInput) lnameInput.required = false;
        }
        // --------------------------------------------------------------------------

        // REMOVED: Dispatching event - we now handle initial state directly above.
        // if (roleSelect) {
        //     console.log("Dispatching initial change event for role select");
        //     roleSelect.dispatchEvent(new Event('change'));
        // }
    } else {
         console.error("One or more signup form elements not found in showSignupForm!");
    }
}


function showDashboardView() { if(!currentUser){showAuthView(); return;} if(!isAdmin()){if(isEmployee()){showEmployeeView(); return;} showMemberView(); return;} hideAllViews(); const aV=document.getElementById('app-view'); if(aV)aV.style.display='block'; const dV=document.getElementById('dashboard-view'); if(dV)dV.style.display='block'; updateHeader(); }
function showTableView(tableName) { if(!currentUser||(!isAdmin()&&!isEmployee())){showAuthView();return;} hideAllViews(); const aV=document.getElementById('app-view'); if(aV)aV.style.display='block'; const tV=document.getElementById('table-view'); if(tV)tV.style.display='block'; }
function showMemberView() { if(!currentUser){showAuthView(); return;} hideAllViews(); const aV=document.getElementById('app-view'); if(aV)aV.style.display='block'; const mV=document.getElementById('member-view'); if(mV)mV.style.display='block'; updateHeader(); member.loadMemberData(); }
function showEmployeeView() { if(!currentUser||!isEmployee()){showAuthView(); return;} hideAllViews(); const aV=document.getElementById('app-view'); if(aV)aV.style.display='block'; const eV=document.getElementById('employee-view'); if(eV)eV.style.display='block'; updateHeader(); loadEmployeeData(); }
function showStatisticsView() { if(!currentUser||(!isAdmin()&&!isEmployee())){showAuthView();return;} hideAllViews(); const aV=document.getElementById('app-view'); if(aV)aV.style.display='block'; const sV=document.getElementById('statistics-view'); if(sV)sV.style.display='block'; updateHeader(); loadStatisticsData(); }
function showUserManagementView() { if (!currentUser||!isAdmin()){showDashboardView();return;} hideAllViews(); const aV=document.getElementById('app-view'); if(aV)aV.style.display='block'; const uMV=document.getElementById('user-management-view'); if(uMV)uMV.style.display='block'; updateHeader(); }

function hideAllViews() { const views=['auth-view','dashboard-view','table-view','member-view','statistics-view','employee-view','user-management-view']; views.forEach(id=>{const v=document.getElementById(id); if(v)v.style.display='none';}); const aV=document.getElementById('app-view'); const aVC=document.getElementById('auth-view'); if(aV&&aVC){aV.style.display=(aVC.style.display==='none')?'block':'none';} if(aVC&&aVC.style.display!=='none'){document.body.classList.add('auth-background');}else{document.body.classList.remove('auth-background');} const uS=document.getElementById('user-status'); if(uS&&aVC&&aVC.style.display!=='none'){uS.style.display='none';} }
function updateHeader() { const uS=document.getElementById('user-status'); if(!currentUser){if(uS)uS.style.display='none';return;} const uD=document.getElementById('username-display'); if(uD&&uS){uD.textContent=`${currentUser.username} (${currentUser.role})`;uS.style.display='flex';} const sB=document.getElementById('statistics-btn'); if(sB){sB.style.display=(isAdmin()||isEmployee())?'inline-flex':'none';} }
function showNotification(message, type='info') { const n=document.getElementById('notification'); const nM=document.getElementById('notification-message'); if(!n||!nM){console.warn('Notification missing:',message);alert(`${type.toUpperCase()}: ${message}`);return;} nM.textContent=message; n.className=`notification ${type}`; n.style.display='block'; setTimeout(()=>{n.style.display='none';},5000); }

// Export functions
export {
    showAuthView, showLoginForm, showSignupForm, showDashboardView, showTableView,
    showMemberView, showEmployeeView, showStatisticsView, showUserManagementView,
    hideAllViews, updateHeader, showNotification
};