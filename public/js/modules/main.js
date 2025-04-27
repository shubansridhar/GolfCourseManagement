/**
 * main.js - Application Initialization and Core Logic
 * 
 * This module ties everything together:
 * - Initializes the application
 * - Sets up event listeners
 * - Handles the initial routing logic
 * - Defines global elements and references
 */

import * as Auth from './auth.js';
import * as Views from './views.js';
import * as Data from './data.js';
import * as Members from './members.js';

// DOM elements
let authView, appView, memberView, statisticsView;
let dashboardView, tableView;
let loginForm, signupForm;
let loginFormContainer, signupFormContainer;
let loginError, signupError;
let showSignupLink, showLoginLink;
let logoutBtn, accountBtn;
let usernameDisplay, userStatusDisplay;
let backToDashboardBtn, backToDashboardFromStatsBtn, backToDashboardFromMemberBtn;
let refreshStatsBtn, refreshMemberDataBtn;
let dashboardContainer, tableContent, statsContainer;
let addRecordBtn, addRecordModal, addRecordForm;
let closeAddModalBtn, cancelRecordBtn, submitRecordBtn;
let accountModal, accountUsername, accountRole;
let closeAccountModalBtns = [];
let changePasswordForm, changePasswordError;
let editProfileBtn, saveProfileBtn, cancelProfileEditBtn;
let updatePlanBtn, cancelPlanChangeBtn;
let profileEditModal, planChangeModal;

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('Initializing application...');

    // Find DOM elements
    findDomElements();
    console.log('DOM elements found:', {
        authView, appView, memberView, statisticsView,
        dashboardView, tableView
    });

    // Set up event listeners
    setupEventListeners();

    // Check for saved authentication
    const isAuthenticated = await Auth.initializeAuth();
    console.log('Authentication check result:', { isAuthenticated });
    console.log('Current user:', Auth.currentUser);

    // Show appropriate view based on authentication
    if (isAuthenticated) {
        console.log('User is authenticated, showing app view');
        if (Auth.currentUser && Auth.currentUser.role === 'member') {
            console.log('User is a member, showing member view');
            Views.hideAllContent();

            // Check if member view element exists before trying to show it
            if (memberView) {
                console.log('Member view element exists, calling Members.showMemberView()');
                Members.showMemberView();
            } else {
                console.error('Member view element is null or undefined!');
            }
        } else {
            console.log('User is not a member, showing regular app view');
            Views.showAppView();
            Data.fetchTablesAndPopulateDashboard();
        }
    } else {
        console.log('User is not authenticated, showing auth view');
        Views.showAuthView();
    }
}

/**
 * Find all required DOM elements
 */
function findDomElements() {
    // Main views
    authView = document.getElementById('auth-view');
    appView = document.getElementById('app-view');
    dashboardView = document.getElementById('dashboard-view');
    tableView = document.getElementById('table-view');
    memberView = document.getElementById('member-view');
    statisticsView = document.getElementById('statistics-view');

    // Auth forms
    loginForm = document.getElementById('login-form');
    signupForm = document.getElementById('signup-form');
    loginFormContainer = document.getElementById('login-form-container');
    signupFormContainer = document.getElementById('signup-form-container');
    loginError = document.getElementById('login-error');
    signupError = document.getElementById('signup-error');
    showSignupLink = document.getElementById('show-signup');
    showLoginLink = document.getElementById('show-login');

    // Header elements
    logoutBtn = document.getElementById('logout-btn');
    accountBtn = document.getElementById('account-btn');
    usernameDisplay = document.getElementById('username-display');
    userStatusDisplay = document.getElementById('user-status');

    // Navigation buttons
    backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    backToDashboardFromStatsBtn = document.getElementById('back-to-dashboard-from-stats-btn');
    backToDashboardFromMemberBtn = document.getElementById('back-to-dashboard-from-member-btn');
    refreshStatsBtn = document.getElementById('refresh-stats-btn');
    refreshMemberDataBtn = document.getElementById('refresh-member-data-btn');

    // Content containers
    dashboardContainer = document.getElementById('dashboard-container');
    tableContent = document.getElementById('table-content');
    statsContainer = document.getElementById('stats-container');

    // Add record functionality
    addRecordBtn = document.getElementById('add-record-btn');
    addRecordModal = document.getElementById('add-record-modal');
    addRecordForm = document.getElementById('add-record-form');
    closeAddModalBtn = document.getElementById('close-add-modal-btn');
    cancelRecordBtn = document.getElementById('cancel-record-btn');
    submitRecordBtn = document.getElementById('submit-record-btn');

    // Account modal
    accountModal = document.getElementById('account-modal');
    accountUsername = document.getElementById('account-username');
    accountRole = document.getElementById('account-role');
    closeAccountModalBtns = document.querySelectorAll('.close-account-modal-btn');
    changePasswordForm = document.getElementById('change-password-form');
    changePasswordError = document.getElementById('change-password-error');

    // Member profile edit
    editProfileBtn = document.getElementById('edit-profile-btn');
    profileEditModal = document.getElementById('profile-edit-modal');
    saveProfileBtn = document.getElementById('save-profile-btn');
    cancelProfileEditBtn = document.getElementById('cancel-profile-edit-btn');

    // Membership plan
    updatePlanBtn = document.getElementById('update-plan-btn');
    planChangeModal = document.getElementById('plan-change-modal');
    cancelPlanChangeBtn = document.getElementById('cancel-plan-change-btn');
}

/**
 * Set up event listeners for all interactive elements
 */
function setupEventListeners() {
    console.log('Setting up event listeners');
    console.log('Auth elements:', {
        loginForm,
        signupForm,
        logoutBtn,
        showSignupLink,
        showLoginLink
    });

    // Pass DOM elements to auth module for reference
    Auth.setDOMElements({
        accountModal,
        accountUsername,
        accountRole,
        changePasswordForm,
        changePasswordError,
        signupRoleSelect: document.getElementById('signup-role'),
        adminRoleInfo: document.getElementById('admin-role-info'),
        signupError: document.getElementById('signup-error')
    });

    // Auth forms
    loginForm?.addEventListener('submit', (e) => {
        // Use a callback to handle successful login
        Auth.handleLogin(e, (user) => {
            // Switch to the appropriate view based on user role
            if (user.role === 'member') {
                Members.showMemberView();
            } else {
                Views.showAppView();
                Data.fetchTablesAndPopulateDashboard();
            }
        });
    });

    signupForm?.addEventListener('submit', (e) => {
        // Use a callback to handle successful signup to avoid circular dependency
        Auth.handleSignup(e, () => {
            Views.showAuthView();
            Views.showLoginForm();
        });
    });

    logoutBtn?.addEventListener('click', () => {
        // Use a callback to handle successful logout
        Auth.handleLogout(() => {
            Views.showAuthView();
        });
    });

    // Auth navigation
    if (showSignupLink) {
        console.log('Adding click listener to showSignupLink');
        showSignupLink.addEventListener('click', (e) => {
            console.log('Sign-up link clicked');
            e.preventDefault();
            Views.showSignupForm();
        });
    } else {
        console.warn('showSignupLink element not found!');
    }

    if (showLoginLink) {
        console.log('Adding click listener to showLoginLink');
        showLoginLink.addEventListener('click', (e) => {
            console.log('Login link clicked');
            e.preventDefault();
            Views.showLoginForm();
        });
    } else {
        console.warn('showLoginLink element not found!');
    }

    // Navigation
    backToDashboardBtn?.addEventListener('click', Views.showDashboardOnly);
    backToDashboardFromStatsBtn?.addEventListener('click', Views.showDashboardOnly);
    backToDashboardFromMemberBtn?.addEventListener('click', Views.showDashboardOnly);
    refreshStatsBtn?.addEventListener('click', Data.fetchAndDisplayStatistics);
    refreshMemberDataBtn?.addEventListener('click', Members.refreshMemberData);

    // Record management
    addRecordBtn?.addEventListener('click', Views.openAddRecordModal);
    closeAddModalBtn?.addEventListener('click', () => { addRecordModal.style.display = 'none'; });
    cancelRecordBtn?.addEventListener('click', () => { addRecordModal.style.display = 'none'; });
    submitRecordBtn?.addEventListener('click', Data.handleSubmitRecord);

    // Account management
    accountBtn?.addEventListener('click', Auth.openAccountModal);
    closeAccountModalBtns.forEach(btn => btn.addEventListener('click', () => { accountModal.style.display = 'none'; }));
    changePasswordForm?.addEventListener('submit', Auth.handleChangePassword);

    // Member profile management
    editProfileBtn?.addEventListener('click', Members.openProfileEditModal);
    saveProfileBtn?.addEventListener('click', Members.handleProfileSave);
    cancelProfileEditBtn?.addEventListener('click', () => { profileEditModal.style.display = 'none'; });

    // Membership management
    updatePlanBtn?.addEventListener('click', Members.openPlanChangeModal);
    cancelPlanChangeBtn?.addEventListener('click', () => { planChangeModal.style.display = 'none'; });

    // Modal close on outside click
    window.addEventListener('click', (event) => {
        if (event.target === addRecordModal) addRecordModal.style.display = 'none';
        if (event.target === accountModal) accountModal.style.display = 'none';
        if (event.target === profileEditModal) profileEditModal.style.display = 'none';
        if (event.target === planChangeModal) planChangeModal.style.display = 'none';
    });

    // Expose functions to window for onclick handlers
    window.navigateToTable = Views.navigateToTable;
    window.deleteRecord = Data.deleteRecord;
    window.handlePlanChange = Members.handlePlanChange;
    window.showStatisticsView = Views.showStatisticsView;
    window.showMemberView = Members.showMemberView;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for potential use in other modules
export {
    initializeApp
}; 