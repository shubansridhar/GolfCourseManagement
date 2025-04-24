// Add this near the top
const API_BASE_URL = 'http://localhost:3001/api'; // Your backend server address + /api prefix

// === DOM Elements ===
// --- Auth View ---
const authView = document.getElementById('auth-view');
const loginFormContainer = document.getElementById('login-form-container');
const signupFormContainer = document.getElementById('signup-form-container');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const signupRoleSelect = document.getElementById('signup-role');
const adminRoleInfo = document.getElementById('admin-role-info');
const loginError = document.getElementById('login-error');
console.log('Checking loginError element:', loginError); // Debug log
const signupError = document.getElementById('signup-error');
console.log('Checking signupError element:', signupError); // Debug log
const showSignupLink = document.getElementById('show-signup');
const showLoginLink = document.getElementById('show-login');

// --- Header ---
const userStatusDisplay = document.getElementById('user-status');
const usernameDisplay = document.getElementById('username-display');
const accountBtn = document.getElementById('account-btn');
const logoutBtn = document.getElementById('logout-btn');

// --- App View (Dashboard & Table) ---
const appView = document.getElementById('app-view');
const dashboardView = document.getElementById('dashboard-view');
const tableView = document.getElementById('table-view');
const statisticsView = document.getElementById('statistics-view');
const memberView = document.getElementById('member-view'); // Added member view
const dashboardContainer = document.getElementById('dashboard-container');
const selectedTableHeader = document.getElementById('selected-table');
const addRecordBtn = document.getElementById('add-record-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const backToDashboardFromStatsBtn = document.getElementById('back-to-dashboard-from-stats-btn');
const backToDashboardFromMemberBtn = document.getElementById('back-to-dashboard-from-member-btn'); // Added back button from member view
const refreshStatsBtn = document.getElementById('refresh-stats-btn');
const refreshMemberDataBtn = document.getElementById('refresh-member-data-btn'); // Added refresh button for member data
const dataTableContainer = tableView.querySelector('.table-container');

// --- Member View Elements ---
const memberContainer = document.querySelector('.member-container');
const memberLoading = document.querySelector('.member-container .loading');
const memberDashboardGrid = document.querySelector('.member-dashboard-grid');
const memberProfileContent = document.querySelector('.member-profile-content');
const membershipContent = document.querySelector('.membership-content');
const teeTimesContent = document.querySelector('.tee-times-content');
const equipmentContent = document.querySelector('.equipment-content');
const editProfileBtn = document.getElementById('edit-profile-btn');
const updatePlanBtn = document.getElementById('update-plan-btn');
const bookTeeTimeBtn = document.getElementById('book-tee-time-btn');
const rentEquipmentBtn = document.getElementById('rent-equipment-btn');

// --- Member-related Modals ---
const profileEditModal = document.getElementById('profile-edit-modal');
const profileEditForm = document.getElementById('profile-edit-form');
const saveProfileBtn = document.getElementById('save-profile-btn');
const cancelProfileEditBtn = document.getElementById('cancel-profile-edit-btn');

const planChangeModal = document.getElementById('plan-change-modal');
const availablePlans = document.querySelector('.available-plans');
const cancelPlanChangeBtn = document.getElementById('cancel-plan-change-btn');

const teeTimeModal = document.getElementById('tee-time-modal');
const teeTimeDate = document.getElementById('tee-time-date');
const availableTimes = document.querySelector('.available-times');
const bookSelectedTimeBtn = document.getElementById('book-selected-time-btn');
const cancelTeeTimeBtn = document.getElementById('cancel-tee-time-btn');

const equipmentRentalModal = document.getElementById('equipment-rental-modal');
const equipmentList = document.querySelector('.equipment-list');
const rentalSummary = document.querySelector('.rental-summary .summary-value');
const confirmRentalBtn = document.getElementById('confirm-rental-btn');
const cancelRentalBtn = document.getElementById('cancel-rental-btn');

// --- Statistics Elements ---
const statsContainer = document.querySelector('.stats-container');
const statsLoading = document.querySelector('.stats-container .loading');
const statsGrid = document.querySelector('.stats-grid');
const statsTableCounts = document.querySelector('.stats-table-counts');
const statsMembershipChart = document.querySelector('.stats-membership-chart');
const statsTeeTimeChart = document.querySelector('.stats-teetime-chart');
const statsEquipmentChart = document.querySelector('.stats-equipment-chart');

// --- Modals ---
// Add Record Modal
const addRecordModal = document.getElementById('add-record-modal');
const addRecordForm = document.getElementById('add-record-form');
const modalTitle = document.getElementById('modal-title');
const closeAddModalBtn = document.querySelector('#add-record-modal .close');
const submitRecordBtn = document.getElementById('submit-record');
const cancelRecordBtn = document.getElementById('cancel-record');
// Account Modal
const accountModal = document.getElementById('account-modal');
const closeAccountModalBtns = document.querySelectorAll('.close-account-modal, .close-account-modal-btn');
const accountUsername = document.getElementById('account-username');
const accountRole = document.getElementById('account-role');
const changePasswordForm = document.getElementById('change-password-form');
const changePasswordError = document.getElementById('change-password-error');

// --- Notification ---
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');
console.log('Checking notificationMessage element:', notificationMessage); // Debug log


// === State Variables ===
let currentTable = null;
let tableStructure = [];
let tableData = [];
let allTables = [];
let currentUser = null; // { username: '...', token: '...', role: '...' }

// Member-related state variables
let memberProfile = null;
let memberPlans = [];
let memberTeeTimes = [];
let memberEquipment = [];
let availableEquipment = [];
let selectedTimeSlot = null;
let selectedEquipment = [];


// === Initialization ===
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    // Check login status
    const token = localStorage.getItem('authToken');
    const storedUsername = localStorage.getItem('username');
    const storedRole = localStorage.getItem('userRole');

    if (token && storedUsername && storedRole) {
        currentUser = { username: storedUsername, token: token, role: storedRole };
        showAppView();

        // Initialize the appropriate view based on user role
        if (currentUser.role === 'member') {
            showMemberView();
        } else {
            fetchTablesAndPopulateDashboard();
        }
    } else {
        showAuthView();
        checkAdminExistsAndSetupSignup();
    }

    // Add event listeners
    loginForm?.addEventListener('submit', handleLogin);
    signupForm?.addEventListener('submit', handleSignup);
    logoutBtn?.addEventListener('click', handleLogout);
    showSignupLink?.addEventListener('click', (e) => { e.preventDefault(); showSignupForm(); });
    showLoginLink?.addEventListener('click', (e) => { e.preventDefault(); showLoginForm(); });
    backToDashboardBtn?.addEventListener('click', showDashboardOnly);
    backToDashboardFromStatsBtn?.addEventListener('click', showDashboardOnly);
    backToDashboardFromMemberBtn?.addEventListener('click', showDashboardOnly);
    refreshStatsBtn?.addEventListener('click', fetchAndDisplayStatistics);
    refreshMemberDataBtn?.addEventListener('click', refreshMemberData);
    addRecordBtn?.addEventListener('click', openAddRecordModal);
    closeAddModalBtn?.addEventListener('click', () => { addRecordModal.style.display = 'none'; });
    cancelRecordBtn?.addEventListener('click', () => { addRecordModal.style.display = 'none'; });
    submitRecordBtn?.addEventListener('click', handleSubmitRecord);
    accountBtn?.addEventListener('click', openAccountModal);
    closeAccountModalBtns.forEach(btn => btn.addEventListener('click', () => { accountModal.style.display = 'none'; }));
    changePasswordForm?.addEventListener('submit', handleChangePassword);

    // Member view event listeners
    editProfileBtn?.addEventListener('click', openProfileEditModal);
    saveProfileBtn?.addEventListener('click', handleProfileSave);
    cancelProfileEditBtn?.addEventListener('click', () => { profileEditModal.style.display = 'none'; });

    updatePlanBtn?.addEventListener('click', openPlanChangeModal);
    cancelPlanChangeBtn?.addEventListener('click', () => { planChangeModal.style.display = 'none'; });

    bookTeeTimeBtn?.addEventListener('click', openTeeTimeModal);
    teeTimeDate?.addEventListener('change', handleDateSelection);
    bookSelectedTimeBtn?.addEventListener('click', handleTeeTimeBooking);
    cancelTeeTimeBtn?.addEventListener('click', () => { teeTimeModal.style.display = 'none'; });

    rentEquipmentBtn?.addEventListener('click', openEquipmentRentalModal);
    confirmRentalBtn?.addEventListener('click', handleEquipmentRental);
    cancelRentalBtn?.addEventListener('click', () => { equipmentRentalModal.style.display = 'none'; });

    // Modal close on outside click
    window.addEventListener('click', (event) => {
        if (event.target === addRecordModal) addRecordModal.style.display = 'none';
        if (event.target === accountModal) accountModal.style.display = 'none';
        if (event.target === profileEditModal) profileEditModal.style.display = 'none';
        if (event.target === planChangeModal) planChangeModal.style.display = 'none';
        if (event.target === teeTimeModal) teeTimeModal.style.display = 'none';
        if (event.target === equipmentRentalModal) equipmentRentalModal.style.display = 'none';
    });
}

// === View Management ===
function showAuthView() {
    if (!authView || !appView || !userStatusDisplay) return;
    document.body.classList.add('auth-background'); // <-- ADD Class to body
    authView.style.display = 'flex';
    appView.style.display = 'none';
    userStatusDisplay.style.display = 'none';
    showLoginForm();
}

function showAppView() {
    if (!authView || !appView) return;
    document.body.classList.remove('auth-background'); // <-- REMOVE Class from body
    authView.style.display = 'none';
    appView.style.display = 'block';
    // Ensure dashboard is shown initially within app view
    if (dashboardView) dashboardView.style.display = 'block';
    if (tableView) tableView.style.display = 'none';
    updateHeader();
}
function showLoginForm() {
    if (!loginFormContainer || !signupFormContainer) return;
    loginFormContainer.style.display = 'block';
    signupFormContainer.style.display = 'none';
    if (loginError) loginError.style.display = 'none';
    loginForm?.reset();
}

function showSignupForm() {
    if (!loginFormContainer || !signupFormContainer) return;
    loginFormContainer.style.display = 'none';
    signupFormContainer.style.display = 'block';
    if (signupError) signupError.style.display = 'none';
    signupForm?.reset();
    checkAdminExistsAndSetupSignup();
}

// Update showDashboardOnly function to hide the statistics view
function showDashboardOnly() {
    if (!dashboardView || !tableView) return;
    document.body.classList.remove('auth-background'); // <-- REMOVE Class from body (Safety)
    console.log("showDashboardOnly called");
    dashboardView.style.display = 'block';
    tableView.style.display = 'none';
    if (statisticsView) statisticsView.style.display = 'none'; // Hide statistics view
    if (memberView) memberView.style.display = 'none'; // Hide member view
    if (selectedTableHeader) selectedTableHeader.textContent = 'Select a table';
    if (addRecordBtn) addRecordBtn.disabled = true;
    currentTable = null;
}

function showTableViewOnly() {
    if (!dashboardView || !tableView) return;
    dashboardView.style.display = 'none';
    tableView.style.display = 'block';
    if (statisticsView) statisticsView.style.display = 'none'; // Hide statistics view
    if (memberView) memberView.style.display = 'none'; // Hide member view
}

// Add showMemberView function
function showMemberView() {
    // Hide all content
    hideAllContent();

    // Show member view
    memberView.style.display = 'block';

    // Hide back to dashboard button for member users
    if (currentUser && currentUser.role === 'member') {
        const backToDashboardBtn = document.getElementById('back-to-dashboard-from-member-btn');
        if (backToDashboardBtn) {
            backToDashboardBtn.style.display = 'none';
        }
    }

    // Refresh member data
    refreshMemberData();
}

// Refresh member data
function refreshMemberData() {
    // Show loading
    const memberContainer = document.querySelector('.member-container');
    if (!memberContainer) return;

    const memberDashboard = memberContainer.querySelector('.member-dashboard-grid');
    const loading = memberContainer.querySelector('.loading');

    if (memberDashboard) memberDashboard.style.display = 'none';
    if (loading) loading.style.display = 'block';

    // Fetch member profile, membership plans, tee times, and equipment data
    Promise.all([
        fetchMemberProfile(currentUser.id),
        fetchMembershipPlans(),
        fetchTeeTimes(currentUser.id),
        fetchEquipmentData(currentUser.id)
    ])
        .then(() => {
            // Render member view components
            renderMemberProfile();
            renderMembershipPlan();
            renderTeeTimes();
            renderEquipmentSection();

            // Hide loading and show dashboard
            if (loading) loading.style.display = 'none';
            if (memberDashboard) memberDashboard.style.display = 'grid';
        })
        .catch(error => {
            console.error('Error refreshing member data:', error);
            showNotification('Failed to load member data. Please try again.', 'error');

            // Hide loading
            if (loading) loading.style.display = 'none';
        });
}

function updateHeader() {
    if (currentUser) {
        if (usernameDisplay) { usernameDisplay.textContent = `Welcome, ${currentUser.username}`; usernameDisplay.style.display = 'inline'; }
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

// === Authentication Logic ===
async function checkAdminExistsAndSetupSignup() {
    // **REAL APP:** Fetch from backend `/api/auth/check-admin-exists`
    try {
        // --- FAKE CHECK ---
        await new Promise(resolve => setTimeout(resolve, 100));
        const adminExists = localStorage.getItem('adminCreated');
        const data = { exists: !!adminExists };
        // --- END FAKE ---

        const adminOption = signupRoleSelect?.querySelector('option[value="admin"]');
        if (data.exists) {
            if (adminOption) adminOption.remove();
            if (adminRoleInfo) adminRoleInfo.style.display = 'none';
        } else {
            if (!adminOption && signupRoleSelect) {
                const option = document.createElement('option');
                option.value = 'admin';
                option.textContent = 'Admin (Initial Setup)';
                signupRoleSelect.appendChild(option);
            }
            if (adminRoleInfo) adminRoleInfo.style.display = 'block';
        }
    } catch (error) { /* ... error handling ... */ }
}

// Updated handleLogin function
async function handleLogin(event) {
    event.preventDefault();
    if (!loginForm) return;
    if (loginError) loginError.style.display = 'none';

    const usernameInput = loginForm.elements['username']?.value?.trim();
    const password = loginForm.elements['password']?.value;

    if (!usernameInput || !password) { if (loginError) { loginError.textContent = 'Please enter both username and password.'; loginError.style.display = 'block'; } return; }

    console.log(`Attempting login via API for: ${usernameInput}`);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, { // Use API URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: usernameInput, password: password }), // Send credentials
        });

        const data = await response.json(); // Parse the JSON response from backend

        if (!response.ok) {
            // Handle login errors from backend (invalid credentials, etc.)
            throw new Error(data.error || `Login failed with status: ${response.status}`);
        }

        // --- Login Successful ---
        console.log("Login successful via API. Response data:", data);

        // Set current user state using data from backend response
        currentUser = {
            username: data.username,
            token: data.token, // Get token from backend
            role: data.role      // Get role from backend
        };

        // Store session info in localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role);

        console.log("Stored currentUser after login:", currentUser);

        showNotification(data.message || 'Login successful!', 'success');
        showAppView(); // Switch to the main application view

        // Direct users to appropriate view based on role
        if (currentUser.role === 'member') {
            showMemberView();
        } else {
            fetchTablesAndPopulateDashboard(); // Load dashboard data using the new token
        }

    } catch (error) {
        console.error('Login error:', error);
        if (loginError) { loginError.textContent = error.message; loginError.style.display = 'block'; }
        showNotification(`Login failed: ${error.message}`, 'error');
        // Clear any potentially partially stored info on error
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        updateHeader(); // Ensure header reflects logged-out state
    }
}
// Updated handleSignup function
async function handleSignup(event) {
    event.preventDefault();
    if (!signupForm || !signupRoleSelect) return;
    if (signupError) signupError.style.display = 'none';

    const username = signupForm.elements['username']?.value?.trim();
    const password = signupForm.elements['password']?.value;
    const confirmPassword = signupForm.elements['confirmPassword']?.value;
    const role = signupRoleSelect.value;

    // Frontend Validations
    if (!username || !password || !confirmPassword) { if (signupError) { signupError.textContent = 'Please fill all fields.'; signupError.style.display = 'block'; } return; }
    if (password !== confirmPassword) { if (signupError) { signupError.textContent = 'Passwords do not match.'; signupError.style.display = 'block'; } return; }
    if (!role) { if (signupError) { signupError.textContent = 'Please select a role.'; signupError.style.display = 'block'; } return; }

    console.log(`Attempting signup via API for: ${username} with role: ${role}`);

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, { // Use API URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password, role }), // Send data to backend
        });

        const data = await response.json(); // Always try to parse JSON response

        if (!response.ok) {
            // Handle errors returned from the backend API (like username taken, admin exists)
            throw new Error(data.error || `Signup failed with status: ${response.status}`);
        }

        // Signup successful on backend
        showNotification(data.message || 'Signup successful! Please log in.', 'success');
        showAuthView(); // Show auth view
        showLoginForm(); // Switch specifically to login form

        // Clear the simulated adminCreated flag if an admin just signed up successfully
        // (The backend already handles the check, this is just for consistency if needed)
        if (role === 'admin') {
            localStorage.setItem('adminCreated', 'true');
        }

    } catch (error) {
        console.error('Signup error:', error);
        if (signupError) { signupError.textContent = error.message; signupError.style.display = 'block'; }
        showNotification(`Signup failed: ${error.message}`, 'error');
    }
}

// Make sure handleLogout calls showAuthView correctly
async function handleLogout() {
    console.log('Logging out');
    try { /* Optional backend call */ }
    finally {
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        // Don't call updateHeader() here, showAuthView will hide user status
        showAuthView(); // <-- This will now add the body class and show login
        showNotification('Logged out successfully.', 'info');
    }
}

// === Account Modal Logic ===
function openAccountModal() {
    if (!currentUser || !accountModal || !accountUsername || !accountRole || !changePasswordForm) return;
    accountUsername.textContent = currentUser.username;
    accountRole.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);
    changePasswordForm.reset();
    if (changePasswordError) changePasswordError.style.display = 'none';
    accountModal.style.display = 'block';
}

async function handleChangePassword(event) {
    event.preventDefault();
    if (!changePasswordForm || !changePasswordError) return;
    // ... (get passwords, validate) ...
    const currentPassword = changePasswordForm.elements['currentPassword'].value;
    const newPassword = changePasswordForm.elements['newPassword'].value;
    const confirmNewPassword = changePasswordForm.elements['confirmNewPassword'].value;

    if (!currentPassword || !newPassword || !confirmNewPassword) { /* ... handle empty fields ... */ return; }
    if (newPassword !== confirmNewPassword) { /* ... handle mismatch ... */ return; }
    if (newPassword === currentPassword) { /* ... handle same password ... */ return; }

    console.log("Attempting password change...");
    try {
        // --- FAKE SUCCESS ---
        await new Promise(resolve => setTimeout(resolve, 500));
        if (currentPassword === 'wrong') throw new Error("Incorrect current password.");
        const data = { message: 'Password updated successfully!' };
        // --- END FAKE ---

        showNotification(data.message || 'Password updated successfully!', 'success');
        changePasswordForm.reset();
        accountModal.style.display = 'none';
    } catch (error) { /* ... error handling ... */ }
}


// === API Data Fetching Wrapper ===
async function authenticatedFetch(url, options = {}) {
    const headers = getAuthHeaders(); // Use helper function below
    // Ensure options.headers exists before spreading, merge with auth headers
    options.headers = { ...(options.headers || {}), ...headers };

    try {
        const response = await fetch(url, options);

        // Check for auth errors specifically
        if (response.status === 401 || response.status === 403) {
            console.warn(`Auth error (${response.status}) fetching ${url}. Logging out.`);
            handleLogout(); // Force logout on auth failure
            // Throw a specific error that can be caught if needed, but logout already happened
            throw new Error('Authentication required or session expired. Please log in again.');
        }
        return response; // Return the raw response for the caller to handle .ok and .json()

    } catch (error) {
        console.error(`Workspace error for ${url}:`, error);
        // Avoid double-notifying if it was an auth error that triggered logout
        if (!(error.message.includes('Authentication required'))) {
            showNotification(`Network or server error: ${error.message}`, 'error');
        }
        throw error; // Re-throw error to be caught by the calling function (e.g., fetchTables)
    }
}

// Helper to get Authorization headers (ensure this is also present)
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
    return headers;
}

// Updated fetchTablesAndPopulateDashboard function
async function fetchTablesAndPopulateDashboard() {
    // currentUser should be set if user is logged in
    if (!currentUser) {
        console.log("fetchTablesAndPopulateDashboard: Not logged in. Dashboard may show limited info or nothing.");
        // Decide what to show if not logged in - perhaps nothing?
        if (dashboardContainer) dashboardContainer.innerHTML = '<p class="no-data">Please log in to view tables.</p>';
        return;
    }
    console.log("fetchTablesAndPopulateDashboard: Function called for logged-in user.");

    showDashboardOnly(); // Ensure dashboard view is displayed

    if (!dashboardContainer) {
        console.error("fetchTablesAndPopulateDashboard: Dashboard container element not found!");
        return;
    }
    dashboardContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>';

    try {
        // Make the actual API call using authenticatedFetch
        console.log("fetchTablesAndPopulateDashboard: Fetching tables from backend API...");
        const response = await authenticatedFetch(`${API_BASE_URL}/tables`); // GET request by default

        if (!response.ok) {
            // Attempt to parse error message from backend response
            let errorMsg = `Failed to fetch tables (Status: ${response.status})`;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error || errorMsg;
            } catch (e) { /* Ignore if response is not JSON */ }
            throw new Error(errorMsg);
        }

        allTables = await response.json(); // Get the actual list of tables from backend
        console.log("fetchTablesAndPopulateDashboard: Received tables from API:", allTables);

        // Populate dashboard with the real table list
        populateDashboard(allTables);

    } catch (error) {
        // Handle errors during fetch (network, auth, server errors)
        console.error("fetchTablesAndPopulateDashboard: Error fetching tables:", error);
        if (dashboardContainer) {
            // Display specific error message if available
            dashboardContainer.innerHTML = `<div class="error-container"><p><i class="fas fa-exclamation-triangle"></i> Error fetching tables: ${error.message}</p></div>`;
        }
        // No separate notification needed if error shown in container, unless desired
    }
}

// === Statistics Functions ===

// Add showStatisticsView function
function showStatisticsView() {
    if (!currentUser) return showAuthView();
    if (currentUser.role !== 'admin' && currentUser.role !== 'employee') {
        showNotification('Access denied. Statistics are only available to admins and employees.', 'error');
        return;
    }

    // Hide all views and show statistics view
    if (dashboardView) dashboardView.style.display = 'none';
    if (tableView) tableView.style.display = 'none';
    if (statisticsView) statisticsView.style.display = 'block';

    // Show loading indicator and hide grid
    if (statsLoading) statsLoading.style.display = 'block';
    if (statsGrid) statsGrid.style.display = 'none';

    // Fetch and display statistics data
    fetchAndDisplayStatistics();
}

// Add fetchAndDisplayStatistics function
async function fetchAndDisplayStatistics() {
    try {
        // Show loading indicator and hide grid
        if (statsLoading) statsLoading.style.display = 'block';
        if (statsGrid) statsGrid.style.display = 'none';

        // Fetch statistics data
        const response = await authenticatedFetch(`${API_BASE_URL}/statistics`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch statistics');
        }

        const statistics = await response.json();

        // Render statistics
        renderStatistics(statistics);

        // Hide loading indicator and show grid
        if (statsLoading) statsLoading.style.display = 'none';
        if (statsGrid) statsGrid.style.display = 'grid';
    } catch (error) {
        console.error('Error fetching statistics:', error);
        showNotification(`Error: ${error.message}`, 'error');

        // Hide loading indicator and show error message
        if (statsLoading) statsLoading.style.display = 'none';
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <h3>Error Loading Statistics</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="fetchAndDisplayStatistics()">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
        }
    }
}

// Add renderStatistics function
function renderStatistics(statistics) {
    // Render table counts (only for admin users)
    if (currentUser && currentUser.role === 'admin') {
        // Only show table counts to admin users
        renderTableCounts(statistics.tableCounts);
    } else {
        // Hide the table counts card for non-admin users
        const tableCountsCard = document.querySelector('.stats-card:has(.stats-table-counts)');
        if (tableCountsCard) {
            tableCountsCard.style.display = 'none';
        }
    }

    // Render membership by plan chart
    renderMembershipByPlanChart(statistics.membersByPlan);

    // Render tee time status chart
    renderTeeTimeStatusChart(statistics.teeTimeStatus);

    // Render equipment availability chart
    renderEquipmentAvailabilityChart(statistics.equipmentAvailability);

    // Render management reports (aggregate data for managers)
    renderManagementReports(statistics);
}

// New function for management reports
function renderManagementReports(statistics) {
    // Check if we already have a management reports card in the DOM
    let managementCard = document.querySelector('.stats-management-reports');

    // If no card exists yet, create one and add it to the grid
    if (!managementCard) {
        // Create a new card for management reports
        const statsGrid = document.querySelector('.stats-grid');
        if (!statsGrid) return;

        // Create a new card
        const newCard = document.createElement('div');
        newCard.className = 'stats-card';
        newCard.innerHTML = `
            <h3><i class="fas fa-chart-line"></i> Management Overview</h3>
            <div class="stats-management-reports"></div>
        `;
        statsGrid.appendChild(newCard);

        // Save reference to the new container
        managementCard = newCard.querySelector('.stats-management-reports');
    }

    if (!managementCard) return;
    managementCard.innerHTML = '';

    // Create overall database summary
    const summarySection = document.createElement('div');
    summarySection.className = 'management-summary';

    // Calculate total number of records across all tables
    let totalRecords = 0;
    if (statistics.tableCounts) {
        totalRecords = Object.values(statistics.tableCounts).reduce((sum, count) => sum + count, 0);
    }

    // Get totals from other statistics
    const totalMembers = statistics.membersByPlan ?
        statistics.membersByPlan.reduce((sum, item) => sum + item.count, 0) : 0;

    const totalTeeTimes = statistics.teeTimeStatus ?
        statistics.teeTimeStatus.reduce((sum, item) => sum + item.count, 0) : 0;

    const bookedTeeTimes = statistics.teeTimeStatus ?
        statistics.teeTimeStatus.find(item => item.Status === 'Booked')?.count || 0 : 0;

    const availableEquipmentCount = statistics.equipmentAvailability ?
        statistics.equipmentAvailability.reduce((sum, item) => sum + item.available, 0) : 0;

    const totalEquipmentCount = statistics.equipmentAvailability ?
        statistics.equipmentAvailability.reduce((sum, item) => sum + item.total, 0) : 0;

    // Create and populate summary boxes
    summarySection.innerHTML = `
        <div class="summary-grid">
            <div class="summary-box">
                <div class="summary-value">${totalMembers}</div>
                <div class="summary-label">Total Members</div>
            </div>
            <div class="summary-box">
                <div class="summary-value">${totalTeeTimes}</div>
                <div class="summary-label">Tee Times</div>
            </div>
            <div class="summary-box">
                <div class="summary-value">${Math.round((bookedTeeTimes / totalTeeTimes) * 100) || 0}%</div>
                <div class="summary-label">Booking Rate</div>
            </div>
            <div class="summary-box">
                <div class="summary-value">${Math.round((availableEquipmentCount / totalEquipmentCount) * 100) || 0}%</div>
                <div class="summary-label">Equipment Availability</div>
            </div>
        </div>
    `;

    managementCard.appendChild(summarySection);

    // Add recommendations section based on statistics
    const recommendationsSection = document.createElement('div');
    recommendationsSection.className = 'management-recommendations';
    recommendationsSection.innerHTML = '<h4>Insights & Recommendations</h4>';

    const recommendationsList = document.createElement('ul');

    // Generate recommendations based on the data
    const recommendations = [];

    // Check tee time booking rate
    const teeTimeBookingRate = (bookedTeeTimes / totalTeeTimes) * 100;
    if (teeTimeBookingRate < 50) {
        recommendations.push('Consider promotions to increase tee time bookings, current booking rate is low.');
    } else if (teeTimeBookingRate > 80) {
        recommendations.push('High demand for tee times - consider adding more slots or adjusting pricing.');
    }

    // Check equipment availability
    const equipmentAvailabilityRate = (availableEquipmentCount / totalEquipmentCount) * 100;
    if (equipmentAvailabilityRate < 30) {
        recommendations.push('Equipment availability is critically low - consider purchasing additional inventory.');
    } else if (equipmentAvailabilityRate > 70) {
        recommendations.push('Equipment usage is low - consider promotions or reducing excess inventory.');
    }

    // Analyze membership distribution
    if (statistics.membersByPlan && statistics.membersByPlan.length > 0) {
        const membershipDistribution = statistics.membersByPlan.map(item => {
            return {
                planType: item.Plan_type,
                percentage: (item.count / totalMembers) * 100
            };
        });

        // Find the most and least popular plans
        const mostPopular = membershipDistribution.reduce((max, plan) =>
            plan.percentage > max.percentage ? plan : max, membershipDistribution[0]);

        const leastPopular = membershipDistribution.reduce((min, plan) =>
            plan.percentage < min.percentage ? plan : min, membershipDistribution[0]);

        recommendations.push(`"${mostPopular.planType}" is your most popular membership plan (${Math.round(mostPopular.percentage)}% of members).`);

        if (leastPopular.percentage < 15) {
            recommendations.push(`"${leastPopular.planType}" membership plan is underperforming (only ${Math.round(leastPopular.percentage)}% of members).`);
        }
    }

    // Add default recommendation if none were generated
    if (recommendations.length === 0) {
        recommendations.push('All metrics are within optimal ranges.');
    }

    // Add all recommendations to the list
    recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        recommendationsList.appendChild(li);
    });

    recommendationsSection.appendChild(recommendationsList);
    managementCard.appendChild(recommendationsSection);
}

// Add renderTableCounts function
function renderTableCounts(tableCounts) {
    if (!statsTableCounts) return;

    statsTableCounts.innerHTML = '';

    if (!tableCounts || Object.keys(tableCounts).length === 0) {
        statsTableCounts.innerHTML = '<div class="no-data">No table data available.</div>';
        return;
    }

    // Sort table names alphabetically
    const tableNames = Object.keys(tableCounts).sort();

    // Create elements for each table
    tableNames.forEach(tableName => {
        const tableNameDiv = document.createElement('div');
        tableNameDiv.className = 'table-name';
        tableNameDiv.textContent = tableName.replace(/_/g, ' ');

        const tableCountDiv = document.createElement('div');
        tableCountDiv.className = 'table-count';
        tableCountDiv.textContent = tableCounts[tableName];

        statsTableCounts.appendChild(tableNameDiv);
        statsTableCounts.appendChild(tableCountDiv);
    });
}

// Add renderMembershipByPlanChart function
function renderMembershipByPlanChart(membersByPlan) {
    if (!statsMembershipChart) return;

    statsMembershipChart.innerHTML = '';

    if (!membersByPlan || membersByPlan.length === 0) {
        statsMembershipChart.innerHTML = '<div class="no-data">No membership data available.</div>';
        return;
    }

    statsMembershipChart.className = 'stats-membership-chart stats-chart';

    // Calculate total members for percentage
    const totalMembers = membersByPlan.reduce((sum, item) => sum + item.count, 0);

    // Create bar chart
    membersByPlan.forEach(item => {
        const percentage = Math.round((item.count / totalMembers) * 100);

        const chartBarContainer = document.createElement('div');
        chartBarContainer.className = 'chart-bar-container';

        const chartLabel = document.createElement('div');
        chartLabel.className = 'chart-label';
        chartLabel.textContent = item.Plan_type;

        const chartBarWrapper = document.createElement('div');
        chartBarWrapper.className = 'chart-bar-wrapper';

        const chartBar = document.createElement('div');
        chartBar.className = 'chart-bar';
        chartBar.style.width = '0%'; // Start at 0 for animation

        const chartValue = document.createElement('div');
        chartValue.className = 'chart-value';
        chartValue.textContent = item.count;

        chartBarWrapper.appendChild(chartBar);
        chartBarContainer.appendChild(chartLabel);
        chartBarContainer.appendChild(chartBarWrapper);
        chartBarContainer.appendChild(chartValue);
        statsMembershipChart.appendChild(chartBarContainer);

        // Animate the bar width
        setTimeout(() => {
            chartBar.style.width = `${percentage}%`;
        }, 100);
    });
}

// Add renderTeeTimeStatusChart function
function renderTeeTimeStatusChart(teeTimeStatus) {
    if (!statsTeeTimeChart) return;

    statsTeeTimeChart.innerHTML = '';

    if (!teeTimeStatus || teeTimeStatus.length === 0) {
        statsTeeTimeChart.innerHTML = '<div class="no-data">No tee time data available.</div>';
        return;
    }

    statsTeeTimeChart.className = 'stats-teetime-chart stats-chart';

    // Calculate total tee times for percentage
    const totalTeeTimes = teeTimeStatus.reduce((sum, item) => sum + item.count, 0);

    // Create bar chart
    teeTimeStatus.forEach(item => {
        const percentage = Math.round((item.count / totalTeeTimes) * 100);

        const chartBarContainer = document.createElement('div');
        chartBarContainer.className = 'chart-bar-container';

        const chartLabel = document.createElement('div');
        chartLabel.className = 'chart-label';
        chartLabel.textContent = item.Status;

        const chartBarWrapper = document.createElement('div');
        chartBarWrapper.className = 'chart-bar-wrapper';

        const chartBar = document.createElement('div');
        chartBar.className = 'chart-bar';
        chartBar.style.width = '0%'; // Start at 0 for animation

        const chartValue = document.createElement('div');
        chartValue.className = 'chart-value';
        chartValue.textContent = item.count;

        chartBarWrapper.appendChild(chartBar);
        chartBarContainer.appendChild(chartLabel);
        chartBarContainer.appendChild(chartBarWrapper);
        chartBarContainer.appendChild(chartValue);
        statsTeeTimeChart.appendChild(chartBarContainer);

        // Animate the bar width
        setTimeout(() => {
            chartBar.style.width = `${percentage}%`;
        }, 100);
    });
}

// Add renderEquipmentAvailabilityChart function
function renderEquipmentAvailabilityChart(equipmentAvailability) {
    if (!statsEquipmentChart) return;

    statsEquipmentChart.innerHTML = '';

    if (!equipmentAvailability || equipmentAvailability.length === 0) {
        statsEquipmentChart.innerHTML = '<div class="no-data">No equipment data available.</div>';
        return;
    }

    statsEquipmentChart.className = 'stats-equipment-chart stats-chart';

    // Create bar chart for each equipment type
    equipmentAvailability.forEach(item => {
        const percentage = Math.round((item.available / item.total) * 100);

        const chartBarContainer = document.createElement('div');
        chartBarContainer.className = 'chart-bar-container';

        const equipmentHeader = document.createElement('div');
        equipmentHeader.className = 'equipment-header';

        const equipmentTitle = document.createElement('div');
        equipmentTitle.className = 'equipment-title';
        equipmentTitle.textContent = item.Type;

        const equipmentRatio = document.createElement('div');
        equipmentRatio.className = 'equipment-ratio';
        equipmentRatio.textContent = `${item.available}/${item.total} Available`;

        const chartBarWrapper = document.createElement('div');
        chartBarWrapper.className = 'chart-bar-wrapper';
        chartBarWrapper.style.width = '100%';

        const chartBar = document.createElement('div');
        chartBar.className = 'chart-bar';
        chartBar.style.width = '0%'; // Start at 0 for animation

        equipmentHeader.appendChild(equipmentTitle);
        equipmentHeader.appendChild(equipmentRatio);
        chartBarWrapper.appendChild(chartBar);

        chartBarContainer.appendChild(equipmentHeader);
        chartBarContainer.appendChild(chartBarWrapper);

        statsEquipmentChart.appendChild(chartBarContainer);

        // Animate the bar width
        setTimeout(() => {
            chartBar.style.width = `${percentage}%`;
        }, 100);
    });
}

// === Modal & Form Submission (Add/Delete Records) ===
function openAddRecordModal() {
    if (!addRecordModal || !modalTitle || !addRecordForm || !tableStructure || !currentTable) {
        console.error("openAddRecordModal: Missing required elements or data.");
        return;
    }
    console.log(`openAddRecordModal: Opening for table ${currentTable}`);

    modalTitle.textContent = `Add Record to ${currentTable.replace(/_/g, ' ')}`;
    addRecordForm.innerHTML = ''; // Clear previous form

    tableStructure.forEach(column => {
        // Skip auto-increment primary keys for insert form
        if (column.Extra === 'auto_increment' && column.Key === 'PRI') return;

        const formGroup = document.createElement('div');
        formGroup.classList.add('form-group');
        const label = document.createElement('label');
        label.setAttribute('for', `field-${column.Field}`);
        label.textContent = column.Field;
        formGroup.appendChild(label);

        let inputElement;
        // Determine input type based on column type string
        if (column.Type.includes('text')) {
            inputElement = document.createElement('textarea');
            inputElement.rows = 3;
        } else {
            inputElement = document.createElement('input');
            if (column.Type.includes('int')) inputElement.type = 'number';
            else if (column.Type.includes('date') && !column.Type.includes('datetime')) inputElement.type = 'date';
            else if (column.Type.includes('time') && !column.Type.includes('datetime')) { inputElement.type = 'time'; inputElement.step = '1'; } // Allow seconds
            else if (column.Type.includes('datetime') || column.Type.includes('timestamp')) { inputElement.type = 'datetime-local'; inputElement.step = '1'; } // Allow seconds
            else { // Default to text (covers VARCHAR, etc.)
                inputElement.type = 'text';
                const match = column.Type.match(/varchar\((\d+)\)/i);
                if (match && match[1]) inputElement.maxLength = match[1];
            }
        }
        inputElement.id = `field-${column.Field}`;
        inputElement.name = column.Field;
        // Set required attribute if applicable (not nullable, no default value)
        if (column.Null === 'NO' && column.Default === null) {
            inputElement.required = true;
        }
        formGroup.appendChild(inputElement);
        addRecordForm.appendChild(formGroup);
    });
    addRecordModal.style.display = 'block';
}

// Updated handleSubmitRecord function (uses real API call)
async function handleSubmitRecord() {
    if (!addRecordForm || !currentTable) return;
    console.log(`handleSubmitRecord: Submitting for table ${currentTable}`);

    if (!addRecordForm.checkValidity()) {
        showNotification('Please fill out all required fields correctly.', 'error');
        addRecordForm.reportValidity();
        return;
    }

    // Collect form data
    const formData = {};
    const formElements = addRecordForm.elements;
    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        if (element.name) {
            if (element.type === 'number' && element.value === '' && !element.required) formData[element.name] = null;
            else formData[element.name] = element.value;
        }
    }
    console.log("handleSubmitRecord: Submitting data via API:", formData);

    try {
        // Make the actual API call using authenticatedFetch
        const response = await authenticatedFetch(`${API_BASE_URL}/tables/${currentTable}`, {
            method: 'POST',
            // headers added by authenticatedFetch
            body: JSON.stringify(formData)
        });

        const result = await response.json(); // Assume backend sends { message: '...', insertId: ... } or { error: '...' }

        if (!response.ok || response.status !== 201) { // Check for non-successful status (expect 201 Created)
            throw new Error(result.error || `Server error: ${response.status}`);
        }

        // --- Success ---
        addRecordModal.style.display = 'none';
        showNotification(result.message || 'Record added successfully!', 'success');

        // Refresh the table data from the backend to show the new record
        console.log("handleSubmitRecord: Record added, refreshing table data...");
        await selectTable(currentTable); // Call selectTable to re-fetch and re-render

    } catch (error) {
        console.error("handleSubmitRecord: Error adding record:", error);
        showNotification(`Failed to add record: ${error.message}`, 'error');
        // Keep modal open on error? Optional.
    }
}

// Updated deleteRecord function (uses real API call)
async function deleteRecord(id, primaryKeyName, rowIndex) { // rowIndex no longer needed for API call itself
    if (!currentTable) return;
    console.log(`deleteRecord: Attempting delete via API for ${currentTable}, ${primaryKeyName}=${id}`);

    // Ensure PK Name is valid (basic check)
    if (!primaryKeyName || typeof primaryKeyName !== 'string' || primaryKeyName.length === 0) {
        showNotification(`Cannot delete: Invalid primary key identifier provided.`, 'error');
        console.error("deleteRecord: primaryKeyName is invalid or missing:", primaryKeyName);
        return;
    }

    if (!confirm(`Are you sure you want to delete record with ${primaryKeyName} = ${id} from ${currentTable.replace(/_/g, ' ')}?`)) {
        console.log("Delete cancelled by user.");
        return;
    }

    try {
        // Make the actual API call using authenticatedFetch
        // Pass the primaryKeyName as a query parameter for the backend
        const response = await authenticatedFetch(
            `${API_BASE_URL}/tables/${currentTable}/${id}?primaryKey=${encodeURIComponent(primaryKeyName)}`,
            { method: 'DELETE' }
        );

        // Check if response is ok, then try parsing JSON
        if (!response.ok) {
            let errorMsg = `Failed to delete record (Status: ${response.status})`;
            try {
                const errorData = await response.json(); // Try to get error from body
                errorMsg = errorData.error || errorMsg;
            } catch (e) { /* Ignore if body isn't JSON */ }
            throw new Error(errorMsg);
        }

        // If response.ok, try to parse potential success message
        const result = await response.json(); // Expects { message: '...' }

        // --- Success ---
        showNotification(result.message || 'Record deleted successfully!', 'success');

        // Refresh the table data from the backend to show the change
        console.log("deleteRecord: Record deleted, refreshing table data...");
        await selectTable(currentTable); // Call selectTable to re-fetch and re-render

    } catch (error) {
        console.error("deleteRecord: Error deleting record:", error);
        showNotification(`Error deleting record: ${error.message}`, 'error');
    }
}

// === Notifications ===
function showNotification(message, type = 'info') {
    if (!notification || !notificationMessage) {
        console.error("showNotification: Notification elements not found.");
        return;
    }
    console.log(`showNotification: [${type}] ${message}`);

    notificationMessage.textContent = message;
    notification.className = 'notification'; // Reset classes
    setTimeout(() => {
        notification.classList.add('show', type);
    }, 10);

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// === Database Connection Error Handling ===
function showDatabaseConnectionError(message) {
    console.error("Database Connection Error:", message);
    const errorText = `Database Error: ${message}. Please check server status.`;
    if (authView.style.display !== 'none') {
        if (loginError) { loginError.textContent = errorText; loginError.style.display = 'block'; }
        if (signupError) { signupError.textContent = errorText; signupError.style.display = 'block'; }
    } else if (appView.style.display !== 'none') {
        const displayErrorIn = dashboardContainer?.style.display !== 'none' ? dashboardContainer : dataTableContainer;
        if (displayErrorIn) {
            displayErrorIn.innerHTML = `<div class="error-container"><h3>Database Connection Error</h3><p>${message}</p></div>`;
        } else {
            console.error("Cannot display DB connection error - no suitable container visible.");
        }
    }
    showNotification(`Database Error: ${message}`, 'error');
}

function populateDashboard(tables) {
    if (!dashboardContainer) return;
    dashboardContainer.innerHTML = ''; // Clear previous content

    if (!tables || tables.length === 0) {
        dashboardContainer.innerHTML = '<div class="no-data">No database tables found.</div>';
        return;
    }

    allTables = [...tables]; // Save tables for later

    // Add statistics card for admin and employee roles
    if (currentUser?.role === 'admin' || currentUser?.role === 'employee') {
        const statsCard = document.createElement('div');
        statsCard.className = 'table-card';
        statsCard.innerHTML = `
            <i class="fas fa-chart-bar"></i>
            <span>Statistics</span>
        `;
        statsCard.addEventListener('click', () => {
            showStatisticsView();
        });
        dashboardContainer.appendChild(statsCard);
    }

    // Add admin section for user management if admin role
    if (currentUser?.role === 'admin') {
        const userManagementCard = document.createElement('div');
        userManagementCard.className = 'table-card';
        userManagementCard.innerHTML = `
            <i class="fas fa-users-cog"></i>
            <span>User Management</span>
        `;
        userManagementCard.addEventListener('click', () => {
            navigateToUserManagement();
        });
        dashboardContainer.appendChild(userManagementCard);
    }

    // Sort tables alphabetically for display
    tables.sort();

    // Create a card for each table
    tables.forEach(tableName => {
        const tableCard = document.createElement('div');
        tableCard.className = 'table-card';
        tableCard.innerHTML = `
            <i class="${getIconForTable(tableName)}"></i>
           <span>${tableName.replace(/_/g, ' ')}</span>
       `;
        tableCard.addEventListener('click', () => {
            navigateToTable(tableName);
        });
        dashboardContainer.appendChild(tableCard);
    });
}

// Define getIconForTable function to assign appropriate icons to each table
function getIconForTable(tableName) {
    // Map table names to Font Awesome icons
    const tableIconMap = {
        'GOLF_COURSE': 'fas fa-flag',
        'HOLE': 'fas fa-golf-ball',
        'MEMBERSHIP_PLAN': 'fas fa-id-card',
        'MEMBER': 'fas fa-user',
        'MEMBER_CONTACT': 'fas fa-address-book',
        'PLAN_DISCOUNT': 'fas fa-percentage',
        'EQUIPMENT_TYPE': 'fas fa-tags',
        'EQUIPMENT': 'fas fa-golf-ball',
        'EMPLOYEE': 'fas fa-user-tie',
        'EMPLOYEE_CONTACT': 'fas fa-address-card',
        'TEE_TIME': 'fas fa-clock',
        'MANAGES': 'fas fa-tasks'
    };

    // Return the icon class or a default icon if no match
    return tableIconMap[tableName] || 'fas fa-table';
}

// Define function to navigate to tables
function navigateToTable(tableName) {
    console.log(`Navigating to table: ${tableName}`);
    showTableViewOnly();
    selectTable(tableName); // Fetch data for the selected table
}

// Define selectTable function to fetch and display table data
async function selectTable(tableName) {
    // currentUser check - important for authenticated routes
    if (!currentUser) {
        showNotification("Please log in to view table data.", "error");
        return;
    }
    if (!dataTableContainer || !selectedTableHeader || !addRecordBtn) {
        console.error("selectTable: Missing required DOM elements.");
        return; // Safety checks
    }

    dataTableContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading data...</div>';
    selectedTableHeader.textContent = `Loading ${tableName.replace(/_/g, ' ')}...`;
    addRecordBtn.disabled = true;
    currentTable = tableName;
    console.log(`selectTable: Fetching REAL structure and data for ${tableName}`);

    try {
        // --- Fetch REAL Structure ---
        console.log(`selectTable: Fetching structure from ${API_BASE_URL}/tables/${tableName}/structure`);
        // Use authenticatedFetch as these routes should be protected later
        const structureResponse = await authenticatedFetch(`${API_BASE_URL}/tables/${tableName}/structure`);
        if (!structureResponse.ok) {
            let errorMsg = `Failed structure fetch (Status: ${structureResponse.status})`;
            // Try to get more specific error from backend JSON response
            try { const errData = await structureResponse.json(); errorMsg = errData.error || errorMsg; } catch (e) { }
            throw new Error(errorMsg);
        }
        tableStructure = await structureResponse.json(); // Store real structure
        console.log(`selectTable: Received structure for ${tableName}:`, tableStructure);

        // --- Fetch REAL Data ---
        console.log(`selectTable: Fetching data from ${API_BASE_URL}/tables/${tableName}`);
        // Use authenticatedFetch here too
        const dataResponse = await authenticatedFetch(`${API_BASE_URL}/tables/${tableName}`);
        if (!dataResponse.ok) {
            let errorMsg = `Failed data fetch (Status: ${dataResponse.status})`;
            try { const errData = await dataResponse.json(); errorMsg = errData.error || errorMsg; } catch (e) { }
            throw new Error(errorMsg);
        }
        tableData = await dataResponse.json(); // Store real data
        console.log(`selectTable: Received data for ${tableName}:`, tableData);

        // --- Update UI ---
        selectedTableHeader.textContent = tableName.replace(/_/g, ' ');
        // Enable Add button ONLY if structure was successfully fetched
        addRecordBtn.disabled = false;
        renderTable(); // Render table with real structure and data

    } catch (error) {
        // Handle errors from either fetch call
        console.error(`Error selecting table ${tableName}:`, error);
        if (dataTableContainer) {
            // Display specific error message if available
            dataTableContainer.innerHTML = `<div class="error-container"><p><i class="fas fa-exclamation-triangle"></i> Failed to load data for ${tableName}: ${error.message}</p></div>`;
        }
        if (selectedTableHeader) selectedTableHeader.textContent = `Error loading ${tableName.replace(/_/g, ' ')}`;
        // Show notification for fetch errors
        showNotification(`Error loading ${tableName}: ${error.message}`, 'error');
    }
}

// Define renderTable function to display the table data
function renderTable() {
    // --- START: Safety Checks and Logging ---
    if (!dataTableContainer) { console.error("renderTable: dataTableContainer element not found!"); return; }
    if (!tableStructure) { console.error("renderTable: tableStructure is undefined or null!"); return; }
    if (!tableData) { console.error("renderTable: tableData is undefined or null!"); return; }
    console.log(`renderTable: Starting for table ${currentTable}. Structure:`, JSON.parse(JSON.stringify(tableStructure)), "Data:", JSON.parse(JSON.stringify(tableData))); // Log input data
    // --- END: Safety Checks and Logging ---

    // Reset container and get table elements
    dataTableContainer.innerHTML = `<table id="data-table"><thead><tr></tr></thead><tbody></tbody></table>`;
    const dataTable = dataTableContainer.querySelector('#data-table');
    const tableHead = dataTable?.querySelector('thead tr');
    const tableBody = dataTable?.querySelector('tbody');

    if (!tableHead || !tableBody) {
        console.error("renderTable: Could not find table head or body elements after creating table.");
        dataTableContainer.innerHTML = '<p class="error-container">Error: Could not create table structure.</p>'; // Show error
        return;
    }
    console.log("renderTable: Table shell created. Adding headers...");

    // Add headers
    if (!Array.isArray(tableStructure) || tableStructure.length === 0) {
        console.warn("renderTable: tableStructure is empty or not an array. Cannot add headers.");
        // Optionally display a message or default header
        const th = document.createElement('th'); th.textContent = 'No structure defined'; tableHead.appendChild(th);
    } else {
        tableStructure.forEach((column, index) => {
            if (!column || typeof column.Field !== 'string') {
                console.warn(`renderTable: Invalid column structure at index ${index}:`, column);
                return; // Skip invalid column
            }
            const th = document.createElement('th');
            th.textContent = column.Field;
            console.log(`renderTable: Adding header: ${column.Field}`);
            tableHead.appendChild(th);
        });
    }
    // Add Actions header
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Actions';
    actionsHeader.classList.add('action-column');
    tableHead.appendChild(actionsHeader);
    console.log("renderTable: Headers added. Processing rows...");

    // Add data rows
    tableBody.innerHTML = ''; // Clear any default content
    if (!Array.isArray(tableData)) {
        console.error("renderTable: tableData is not an array!", tableData);
        tableData = []; // Attempt recovery with empty array
    }

    if (tableData.length === 0) {
        console.log("renderTable: tableData is empty. Displaying 'No data'.");
        const noDataRow = tableBody.insertRow();
        const noDataCell = noDataRow.insertCell();
        noDataCell.colSpan = (tableStructure?.length || 0) + 1; // Use structure length + actions
        noDataCell.textContent = 'No data available';
        noDataCell.classList.add('no-data');
        return; // Exit after showing no data message
    }

    // Find Primary Key Column Info Once
    const primaryKeyColumn = tableStructure.find(col => col?.Key === 'PRI');
    let primaryKeyName = primaryKeyColumn?.Field;
    if (!primaryKeyName && tableStructure.length > 0) { // Fallback if Key='PRI' isn't set
        const commonPK = tableStructure.find(col => col?.Field?.toLowerCase() === 'id' || col?.Field?.toLowerCase() === `${currentTable?.toLowerCase()}_id`);
        primaryKeyName = commonPK?.Field || tableStructure[0]?.Field; // Fallback to first column name
    }
    console.log(`renderTable: Determined PK field name: ${primaryKeyName || 'Not Found'}`);


    // Loop through data rows
    tableData.forEach((row, rowIndex) => {
        if (typeof row !== 'object' || row === null) {
            console.warn(`renderTable: Invalid row data at index ${rowIndex}:`, row);
            return; // Skip invalid row
        }
        console.log(`renderTable: Processing row ${rowIndex}:`, row);
        const tr = tableBody.insertRow();

        // Add data cells based on structure
        tableStructure.forEach(column => {
            const td = tr.insertCell();
            const fieldName = column.Field;
            let value = row[fieldName]; // Access data using the Field name from structure

            // Format dates/times if applicable
            if (value !== null && value !== undefined) {
                if (column.Type?.includes('datetime') || column.Type?.includes('timestamp')) { try { value = new Date(value).toLocaleString(); } catch (e) { } }
                else if (column.Type?.includes('date')) { try { value = new Date(value).toLocaleDateString(); } catch (e) { } }
            }
            td.textContent = value ?? ''; // Display value or empty string
            // console.log(`renderTable: Added cell for ${fieldName}: ${td.textContent}`); // More verbose logging if needed
        });

        // Add action buttons cell
        const actionsTd = tr.insertCell();
        actionsTd.classList.add('action-column');
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.classList.add('action-btn', 'delete');
        deleteBtn.title = 'Delete Record';

        // Enable/disable delete button based on PK
        if (primaryKeyName && row[primaryKeyName] !== undefined) {
            const primaryKeyValue = row[primaryKeyName];
            console.log(`renderTable: Row ${rowIndex}, PK Value (${primaryKeyName}): ${primaryKeyValue}`);
            deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteRecord(primaryKeyValue, primaryKeyName, rowIndex); });
        } else {
            deleteBtn.disabled = true;
            deleteBtn.title = 'Cannot determine Primary Key for deletion';
            if (rowIndex === 0) console.warn(`renderTable: PK '${primaryKeyName}' not found in row data or PK undetermined for ${currentTable}. Disabling delete.`);
        }
        actionsTd.appendChild(deleteBtn);
        // Add edit button placeholder if needed later
    });
    console.log(`renderTable: Finished rendering ${tableData.length} rows for ${currentTable}`);
}

// Add navigateToUserManagement function
function navigateToUserManagement() {
    console.log("Navigating to User Management");
    if (currentUser?.role !== 'admin') {
        showNotification('Only admin users can access User Management.', 'error');
        return;
    }

    showTableViewOnly();
    selectedTableHeader.textContent = 'User Management';

    // Disable the Add Record button for users table
    if (addRecordBtn) {
        addRecordBtn.style.display = 'none';
    }

    // Show loading indicator
    dataTableContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading users...</div>';

    // Load and display users
    loadAndDisplayUsers();
}

// Add loadAndDisplayUsers function
async function loadAndDisplayUsers() {
    try {
        // Fetch users data from API
        const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch users');
        }

        const users = await response.json();

        // Render users table
        renderUsersTable(users);
    } catch (error) {
        console.error('Error loading users:', error);

        if (dataTableContainer) {
            dataTableContainer.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <h3>Error Loading Users</h3>
                    <p>${error.message}</p>
                    <button class="btn btn-primary" onclick="loadAndDisplayUsers()">
                        <i class="fas fa-sync-alt"></i> Try Again
                    </button>
                </div>
            `;
        }

        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Add renderUsersTable function
function renderUsersTable(users) {
    if (!dataTableContainer) return;

    // Create table structure
    dataTableContainer.innerHTML = `
        <table id="data-table">
            <thead>
                <tr>
                    <th>User ID</th>
                    <th>Username</th>
                    <th>Role</th>
                    <th>Created At</th>
                    <th class="action-column">Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    const tableBody = dataTableContainer.querySelector('tbody');

    if (!tableBody) {
        console.error("renderUsersTable: Could not find table body element.");
        return;
    }

    if (!users || users.length === 0) {
        const noDataRow = tableBody.insertRow();
        const noDataCell = noDataRow.insertCell();
        noDataCell.colSpan = 5;
        noDataCell.textContent = 'No users found';
        noDataCell.classList.add('no-data');
        return;
    }

    // Add user rows
    users.forEach(user => {
        const tr = tableBody.insertRow();

        // User ID cell
        const idCell = tr.insertCell();
        idCell.textContent = user.user_id;

        // Username cell
        const usernameCell = tr.insertCell();
        usernameCell.textContent = user.username;

        // Role cell
        const roleCell = tr.insertCell();
        roleCell.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1);

        // Created At cell
        const createdAtCell = tr.insertCell();
        createdAtCell.textContent = new Date(user.created_at).toLocaleString();

        // Actions cell
        const actionsCell = tr.insertCell();
        actionsCell.classList.add('action-column');

        // Don't allow deleting yourself or the only admin
        const canDelete = user.user_id !== currentUser.userId && !(user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1);

        if (canDelete) {
            const deleteBtn = document.createElement('button');
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
            deleteBtn.classList.add('action-btn', 'delete');
            deleteBtn.title = 'Delete User';
            deleteBtn.addEventListener('click', () => deleteUser(user.user_id));
            actionsCell.appendChild(deleteBtn);
        }
    });

    console.log(`renderUsersTable: Finished rendering ${users.length} users.`);
}

// Add deleteUser function (optional, for future implementation)
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    // This is a placeholder - in a real implementation, you would add code to call the API to delete the user
    showNotification('User deletion is not implemented in this demo.', 'info');

    // Refresh the user list
    loadAndDisplayUsers();
}

// === Member Modal and Action Handlers ===

// Profile Edit Modal
function openProfileEditModal() {
    if (!profileEditModal || !profileEditForm || !memberProfile) return;

    // Populate form with current profile data
    profileEditForm.innerHTML = `
        <div class="form-group">
            <label for="profile-fname">First Name</label>
            <input type="text" id="profile-fname" name="Fname" value="${memberProfile.Fname || ''}" required>
        </div>
        <div class="form-group">
            <label for="profile-lname">Last Name</label>
            <input type="text" id="profile-lname" name="Lname" value="${memberProfile.Lname || ''}" required>
        </div>
        <div class="form-group">
            <label for="profile-email">Email</label>
            <input type="email" id="profile-email" name="Email" value="${memberProfile.Email || ''}">
        </div>
        <div class="form-group">
            <label for="profile-phone">Phone Number</label>
            <input type="tel" id="profile-phone" name="Phone_number" value="${memberProfile.Phone_number || ''}">
        </div>
    `;

    profileEditModal.style.display = 'block';
}

async function handleProfileSave() {
    if (!profileEditForm || !memberProfile) return;

    // Validate form
    if (!profileEditForm.checkValidity()) {
        profileEditForm.reportValidity();
        return;
    }

    // Collect form data
    const formData = {
        Fname: profileEditForm.elements['Fname'].value,
        Lname: profileEditForm.elements['Lname'].value,
        Email: profileEditForm.elements['Email'].value,
        Phone_number: profileEditForm.elements['Phone_number'].value,
        Member_id: memberProfile.Member_id
    };

    try {
        // Update profile via API
        const response = await authenticatedFetch(`${API_BASE_URL}/member/profile`, {
            method: 'PUT',
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile');
        }

        // Success - close modal and refresh data
        profileEditModal.style.display = 'none';
        showNotification('Profile updated successfully!', 'success');
        await fetchMemberProfile();
        renderMemberProfile();
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Plan Change Modal
function openPlanChangeModal() {
    if (!planChangeModal || !availablePlans || !memberPlans) return;

    // Get current plan
    const currentPlanId = memberProfile.Member_plan_id;

    // Populate available plans
    availablePlans.innerHTML = '';

    memberPlans.forEach(plan => {
        const isCurrentPlan = plan.Plan_id === currentPlanId;

        const planCard = document.createElement('div');
        planCard.className = `plan-card ${isCurrentPlan ? 'current-plan' : ''}`;

        planCard.innerHTML = `
            <div class="plan-card-header">
                <h3>${plan.Plan_type}</h3>
                ${isCurrentPlan ? '<span class="current-plan-badge">Current Plan</span>' : ''}
            </div>
            <div class="plan-card-body">
                <div class="plan-price">$${plan.Fees.toFixed(2)}</div>
                <div class="plan-period">per year</div>
                <div class="plan-discount">
                    <i class="fas fa-tag"></i>
                    ${Math.round(plan.Rental_discount * 100)}% discount on rentals
                </div>
            </div>
            <div class="plan-card-footer">
                ${isCurrentPlan ?
                '<button class="btn btn-secondary" disabled>Current Plan</button>' :
                `<button class="btn btn-primary select-plan-btn" data-planid="${plan.Plan_id}">Select Plan</button>`
            }
            </div>
        `;

        availablePlans.appendChild(planCard);
    });

    // Add event listeners to plan selection buttons
    const selectPlanButtons = availablePlans.querySelectorAll('.select-plan-btn');
    selectPlanButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const planId = button.getAttribute('data-planid');
            await handlePlanChange(planId);
        });
    });

    planChangeModal.style.display = 'block';
}

async function handlePlanChange(planId) {
    if (!memberProfile || !planId) return;

    try {
        // Update membership plan via API
        const response = await authenticatedFetch(`${API_BASE_URL}/member/plan`, {
            method: 'PUT',
            body: JSON.stringify({
                Member_id: memberProfile.Member_id,
                Plan_id: planId
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update membership plan');
        }

        // Success - close modal and refresh data
        planChangeModal.style.display = 'none';
        showNotification('Membership plan updated successfully!', 'success');
        await fetchMemberProfile();
        renderMembershipPlan();
    } catch (error) {
        console.error('Error updating membership plan:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Tee Time Modal
function openTeeTimeModal() {
    if (!teeTimeModal || !teeTimeDate || !availableTimes) return;

    // Clear previous selections
    selectedTimeSlot = null;

    // Set minimum date to today
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    teeTimeDate.min = dateString;

    // Set maximum date to 2 weeks from today
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(today.getDate() + 14);
    const maxDateString = twoWeeksLater.toISOString().split('T')[0];
    teeTimeDate.max = maxDateString;

    // Default to today
    teeTimeDate.value = dateString;

    // Show available times for today
    handleDateSelection();

    teeTimeModal.style.display = 'block';
}

// Handle date selection for tee time booking
async function handleDateSelection() {
    const dateInput = teeTimeDate;
    if (!dateInput || !dateInput.value) {
        return;
    }

    const selectedDate = dateInput.value;
    const teeTimeOptions = document.getElementById('tee-time-options');

    if (!teeTimeOptions) {
        return;
    }

    // Show loading
    teeTimeOptions.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading available times...</div>';

    try {
        // Fetch available tee times for the selected date
        const response = await authenticatedFetch(`${API_BASE_URL}/member/available-tee-times?date=${selectedDate}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch available tee times');
        }

        const availableTimes = await response.json();

        // Render available time slots
        if (availableTimes.length === 0) {
            teeTimeOptions.innerHTML = '<p>No tee times available for this date.</p>';
            if (bookSelectedTimeBtn) bookSelectedTimeBtn.disabled = true;
            return;
        }

        let optionsHTML = '<div class="time-slots">';
        availableTimes.forEach((teeTime, index) => {
            optionsHTML += `
                <div class="time-slot">
                    <input type="radio" id="time-${teeTime.Tee_time_id}" name="teeTimeOption" value="${teeTime.Tee_time_id}" ${index === 0 ? 'checked' : ''}>
                    <label for="time-${teeTime.Tee_time_id}">
                        <div class="time">${teeTime.Time.substring(0, 5)}</div>
                        <div class="course">${teeTime.Course_name}</div>
                        <div class="availability">Available slots: ${teeTime.Available_slots}</div>
                    </label>
                </div>
            `;
        });
        optionsHTML += '</div>';

        teeTimeOptions.innerHTML = optionsHTML;
        if (bookSelectedTimeBtn) bookSelectedTimeBtn.disabled = false;
    } catch (error) {
        console.error('Error fetching available tee times:', error);
        teeTimeOptions.innerHTML = `<p class="error"><i class="fas fa-exclamation-triangle"></i> ${error.message}</p>`;
        if (bookSelectedTimeBtn) bookSelectedTimeBtn.disabled = true;
    }
}

// Book tee time
async function handleTeeTimeBooking(teeTimeId = null) {
    try {
        if (!teeTimeId) {
            // Get the selected tee time from the modal
            const selectedTimeOption = document.querySelector('input[name="teeTimeOption"]:checked');
            if (!selectedTimeOption) {
                showNotification('Please select a tee time.', 'error');
                return;
            }
            teeTimeId = selectedTimeOption.value;
        }

        const response = await authenticatedFetch(`${API_BASE_URL}/member/book-tee-time`, {
            method: 'POST',
            body: JSON.stringify({ teeTimeId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to book tee time');
        }

        const data = await response.json();
        showNotification(data.message || 'Tee time booked successfully!', 'success');
        teeTimeModal.style.display = 'none';
        await fetchTeeTimes();
        renderTeeTimes();
    } catch (error) {
        console.error('Error booking tee time:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Cancel tee time
async function cancelTeeTime(teeTimeId) {
    if (!confirm('Are you sure you want to cancel this tee time?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/cancel-tee-time`, {
            method: 'POST',
            body: JSON.stringify({ teeTimeId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to cancel tee time');
        }

        const data = await response.json();
        showNotification(data.message || 'Tee time cancelled successfully!', 'success');
        await fetchTeeTimes();
        renderTeeTimes();
    } catch (error) {
        console.error('Error cancelling tee time:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Equipment Rental Modal
function openEquipmentRentalModal() {
    if (!equipmentRentalModal || !equipmentList || !availableEquipment) return;

    // Clear previous selections
    selectedEquipment = [];

    // Reset rental summary
    if (rentalSummary) rentalSummary.textContent = '$0.00';

    // Populate equipment list
    equipmentList.innerHTML = '';

    availableEquipment.forEach(equipment => {
        if (equipment.available === 0) return; // Skip if none available

        const equipmentItem = document.createElement('div');
        equipmentItem.className = 'equipment-item';

        equipmentItem.innerHTML = `
            <div class="equipment-item-info">
                <div class="equipment-type">${equipment.Type}</div>
                <div class="equipment-fee">$${equipment.Rental_fee.toFixed(2)} per day</div>
                <div class="equipment-availability">${equipment.available} available</div>
            </div>
            <div class="equipment-item-actions">
                <div class="quantity-control">
                    <button class="btn-quantity decrease" data-type="${equipment.Type}">-</button>
                    <input type="number" class="quantity-input" value="0" min="0" max="${equipment.available}" data-type="${equipment.Type}" data-fee="${equipment.Rental_fee}">
                    <button class="btn-quantity increase" data-type="${equipment.Type}">+</button>
                </div>
            </div>
        `;

        equipmentList.appendChild(equipmentItem);
    });

    // Add event listeners to quantity controls
    equipmentList.querySelectorAll('.decrease').forEach(btn => {
        btn.addEventListener('click', e => {
            const type = e.target.getAttribute('data-type');
            const inputElement = equipmentList.querySelector(`.quantity-input[data-type="${type}"]`);
            let value = parseInt(inputElement.value) || 0;
            if (value > 0) {
                inputElement.value = --value;
                updateRentalSummary();
            }
        });
    });

    equipmentList.querySelectorAll('.increase').forEach(btn => {
        btn.addEventListener('click', e => {
            const type = e.target.getAttribute('data-type');
            const inputElement = equipmentList.querySelector(`.quantity-input[data-type="${type}"]`);
            let value = parseInt(inputElement.value) || 0;
            const max = parseInt(inputElement.getAttribute('max')) || 0;
            if (value < max) {
                inputElement.value = ++value;
                updateRentalSummary();
            }
        });
    });

    equipmentList.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('change', () => {
            updateRentalSummary();
        });
    });

    equipmentRentalModal.style.display = 'block';
}

function updateRentalSummary() {
    if (!equipmentList || !rentalSummary) return;

    // Calculate total rental cost
    let totalCost = 0;
    selectedEquipment = [];

    equipmentList.querySelectorAll('.quantity-input').forEach(input => {
        const quantity = parseInt(input.value) || 0;
        if (quantity > 0) {
            const type = input.getAttribute('data-type');
            const fee = parseFloat(input.getAttribute('data-fee')) || 0;
            const cost = quantity * fee;
            totalCost += cost;

            selectedEquipment.push({
                type,
                quantity,
                fee,
                cost
            });
        }
    });

    // Apply member discount if available
    let discountedCost = totalCost;
    if (memberProfile && memberProfile.Rental_discount) {
        discountedCost = totalCost * (1 - memberProfile.Rental_discount);
    }

    // Update summary display
    rentalSummary.textContent = `$${discountedCost.toFixed(2)}`;
}

async function handleEquipmentRental() {
    if (selectedEquipment.length === 0) {
        showNotification('Please select at least one item to rent.', 'error');
        return;
    }

    try {
        // Create rental data for API
        const rentalData = {
            items: selectedEquipment.map(item => ({
                type: item.type,
                quantity: item.quantity
            }))
        };

        // Book equipment via API
        const response = await authenticatedFetch(`${API_BASE_URL}/member/rent-equipment`, {
            method: 'POST',
            body: JSON.stringify(rentalData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to rent equipment');
        }

        // Success - close modal and refresh data
        equipmentRentalModal.style.display = 'none';
        showNotification('Equipment rented successfully!', 'success');
        await fetchEquipmentData();
        renderEquipmentSection();
    } catch (error) {
        console.error('Error renting equipment:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// === Member Data Fetching ===

// Fetch member profile
async function fetchMemberProfile() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/profile`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch member profile');
        }

        memberProfile = await response.json();
        console.log('Fetched member profile:', memberProfile);
        return memberProfile;
    } catch (error) {
        console.error('Error fetching member profile:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

// Fetch membership plans
async function fetchMembershipPlans() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/plans`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch membership plans');
        }

        memberPlans = await response.json();
        console.log('Fetched membership plans:', memberPlans);
        return memberPlans;
    } catch (error) {
        console.error('Error fetching membership plans:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

// Fetch tee times
async function fetchTeeTimes() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/tee-times`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch tee times');
        }

        memberTeeTimes = await response.json();
        console.log('Fetched tee times:', memberTeeTimes);
        return memberTeeTimes;
    } catch (error) {
        console.error('Error fetching tee times:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error; // Re-throw error to be handled by the calling function
    }
}

// Fetch equipment data
async function fetchEquipmentData() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/equipment`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch equipment data');
        }

        const data = await response.json();
        availableEquipment = data.available;
        memberEquipment = data.rentals;

        console.log('Fetched equipment data:', { available: availableEquipment, rentals: memberEquipment });
        return { available: availableEquipment, rentals: memberEquipment };
    } catch (error) {
        console.error('Error fetching equipment data:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error; // Re-throw error to be handled by the calling function
    }
}

// === Member View Rendering ===

// Main render function for member view
function renderMemberView() {
    // Call individual render functions for each part of the member view
    renderMemberProfile();
    renderMembershipPlan();
    renderTeeTimes();
    renderEquipmentSection();
}

// Render member profile card
function renderMemberProfile() {
    if (!memberProfileContent || !memberProfile) return;

    // Format first letter of first and last name as uppercase for the profile picture
    const initials = `${memberProfile.Fname ? memberProfile.Fname.charAt(0).toUpperCase() : ''}${memberProfile.Lname ? memberProfile.Lname.charAt(0).toUpperCase() : ''}`;

    memberProfileContent.innerHTML = `
        <div class="profile-info">
            <div class="profile-picture">
                ${initials}
            </div>
            <div class="profile-details">
                <div class="profile-name">${memberProfile.Fname || ''} ${memberProfile.Lname || ''}</div>
                <div class="profile-email">${memberProfile.Email || 'No email provided'}</div>
                <div class="profile-phone">${memberProfile.Phone_number || 'No phone number provided'}</div>
            </div>
        </div>
    `;
}

// Render membership plan card
function renderMembershipPlan() {
    if (!membershipContent || !memberProfile) return;

    // Find the current plan from the memberPlans array
    let currentPlan = null;
    if (memberPlans && memberPlans.length > 0 && memberProfile.Member_plan_id) {
        currentPlan = memberPlans.find(plan => plan.Plan_id === memberProfile.Member_plan_id);
    }

    if (currentPlan) {
        membershipContent.innerHTML = `
            <div class="plan-details">
                <div class="plan-type">${currentPlan.Plan_type}</div>
                <div class="plan-fee">$${currentPlan.Fees.toFixed(2)} per year</div>
                <div class="plan-discount">
                    <i class="fas fa-tag"></i> ${Math.round(currentPlan.Rental_discount * 100)}% discount on equipment rentals
                </div>
            </div>
            <div class="plan-benefits">
                <h4>Membership Benefits</h4>
                <ul>
                    <li>Access to all golf courses</li>
                    <li>Priority booking for tee times</li>
                    <li>${Math.round(currentPlan.Rental_discount * 100)}% discount on equipment rentals</li>
                    <li>Access to member-only events</li>
                </ul>
            </div>
        `;
    } else {
        membershipContent.innerHTML = `
            <div class="no-plan">
                <p>You don't have an active membership plan.</p>
                <button id="select-plan-btn" class="btn btn-primary">Select a Plan</button>
            </div>
        `;

        // Add event listener to the select plan button
        document.getElementById('select-plan-btn')?.addEventListener('click', openPlanChangeModal);
    }
}

// Render tee times section
function renderTeeTimes() {
    if (!teeTimesContent || !memberTeeTimes) return;

    // Set up tabs and content
    const teeTimeTabs = document.querySelectorAll('.tee-times-tabs .tab-btn');
    const teeTimesTabContent = teeTimesContent.querySelector('.tee-times-tab-content');

    if (!teeTimesTabContent) {
        console.error('tee-times-tab-content element not found');
        return;
    }

    teeTimeTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remove active class from all tabs
            teeTimeTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            e.target.classList.add('active');

            // Show the corresponding content
            const tabType = e.target.getAttribute('data-tab');
            renderTeeTimeContent(tabType, teeTimesTabContent);
        });
    });

    // Initial render of the active tab
    const activeTab = document.querySelector('.tee-times-tabs .tab-btn.active');
    if (activeTab) {
        renderTeeTimeContent(activeTab.getAttribute('data-tab'), teeTimesTabContent);
    } else {
        renderTeeTimeContent('upcoming', teeTimesTabContent);
    }
}

// Render tee time content based on tab
function renderTeeTimeContent(tabType, tabContentElement) {
    if (!tabContentElement || !memberTeeTimes) return;

    let teeTimesToShow = [];
    let titleText = '';

    switch (tabType) {
        case 'upcoming':
            teeTimesToShow = memberTeeTimes.upcoming || [];
            titleText = 'Upcoming Tee Times';
            break;
        case 'available':
            teeTimesToShow = memberTeeTimes.available || [];
            titleText = 'Available Tee Times';
            break;
        case 'history':
            teeTimesToShow = memberTeeTimes.history || [];
            titleText = 'Tee Time History';
            break;
        default:
            teeTimesToShow = memberTeeTimes.upcoming || [];
            titleText = 'Upcoming Tee Times';
    }

    if (teeTimesToShow.length === 0) {
        tabContentElement.innerHTML = `
            <div class="tab-content-header">${titleText}</div>
            <div class="no-data">No tee times to display.</div>
        `;
        return;
    }

    // Format the tee times for display
    const formattedTeeTimes = teeTimesToShow.map(teeTime => {
        // Format the date and time
        const date = new Date(teeTime.Date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        // Format the time (convert from 24h to 12h format)
        const timeParts = teeTime.Time.split(':');
        const hours = parseInt(timeParts[0]);
        const minutes = timeParts[1];
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = hours % 12 || 12;
        const formattedTime = `${formattedHours}:${minutes} ${ampm}`;

        // Add cancel button for upcoming tee times
        const cancelButton = tabType === 'upcoming' ?
            `<button class="btn btn-sm btn-danger cancel-tee-time-btn" data-teetime-id="${teeTime.Tee_time_id}">
                <i class="fas fa-times"></i> Cancel
            </button>` : '';

        // Add book button for available tee times
        const bookButton = tabType === 'available' ?
            `<button class="btn btn-sm btn-success book-tee-time-btn" data-teetime-id="${teeTime.Tee_time_id}">
                <i class="fas fa-check"></i> Book
            </button>` : '';

        return `
            <div class="tee-time-card">
                <div class="tee-time-info">
                    <div class="tee-time-date">${formattedDate}</div>
                    <div class="tee-time-time">${formattedTime}</div>
                    <div class="tee-time-course">${teeTime.Course_name}</div>
                </div>
                <div class="tee-time-actions">
                    ${cancelButton}
                    ${bookButton}
                </div>
            </div>
        `;
    }).join('');

    tabContentElement.innerHTML = `
        <div class="tab-content-header">${titleText}</div>
        <div class="tee-time-list">
            ${formattedTeeTimes}
        </div>
    `;

    // Add event listeners to the cancel buttons
    tabContentElement.querySelectorAll('.cancel-tee-time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const teeTimeId = e.target.closest('.cancel-tee-time-btn').getAttribute('data-teetime-id');
            cancelTeeTime(teeTimeId);
        });
    });

    // Add event listeners to the book buttons
    tabContentElement.querySelectorAll('.book-tee-time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const teeTimeId = e.target.closest('.book-tee-time-btn').getAttribute('data-teetime-id');
            handleTeeTimeBooking(teeTimeId);
        });
    });
}

// Render equipment section
function renderEquipmentSection() {
    if (!equipmentContent) return;

    // Set up tabs and content
    const equipmentTabs = document.querySelectorAll('.equipment-tabs .tab-btn');
    const equipmentTabContent = equipmentContent.querySelector('.equipment-tab-content');

    if (!equipmentTabContent) {
        console.error('equipment-tab-content element not found');
        return;
    }

    equipmentTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            // Remove active class from all tabs
            equipmentTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            e.target.classList.add('active');

            // Show the corresponding content
            const tabType = e.target.getAttribute('data-tab');
            renderEquipmentContent(tabType, equipmentTabContent);
        });
    });

    // Initial render of the active tab
    const activeTab = document.querySelector('.equipment-tabs .tab-btn.active');
    if (activeTab) {
        renderEquipmentContent(activeTab.getAttribute('data-tab'), equipmentTabContent);
    } else {
        renderEquipmentContent('available-equipment', equipmentTabContent);
    }
}

// Render equipment content based on tab
function renderEquipmentContent(tabType, tabContentElement) {
    if (!tabContentElement) return;

    if (tabType === 'available-equipment') {
        if (!availableEquipment || availableEquipment.length === 0) {
            tabContentElement.innerHTML = `
                <div class="tab-content-header">Available Equipment</div>
                <div class="no-data">No equipment available for rent.</div>
            `;
            return;
        }

        const equipmentList = availableEquipment.map(equipment => {
            return `
                <div class="equipment-card">
                    <div class="equipment-info">
                        <div class="equipment-type">${equipment.Type}</div>
                        <div class="equipment-fee">$${equipment.Rental_fee.toFixed(2)} per day</div>
                        <div class="equipment-availability">${equipment.available} available</div>
                    </div>
                </div>
            `;
        }).join('');

        tabContentElement.innerHTML = `
            <div class="tab-content-header">Available Equipment</div>
            <div class="equipment-grid">
                ${equipmentList}
            </div>
        `;
    } else if (tabType === 'my-rentals') {
        if (!memberEquipment || memberEquipment.length === 0) {
            tabContentElement.innerHTML = `
                <div class="tab-content-header">My Rentals</div>
                <div class="no-data">You have no rented equipment.</div>
            `;
            return;
        }

        const rentalsList = memberEquipment.map(rental => {
            // Format the dates
            const rentalDate = new Date(rental.Rental_date);
            const returnDate = new Date(rental.Return_date);

            const formattedRentalDate = rentalDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const formattedReturnDate = returnDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            // Determine if the rental is active (not returned and return date is in the future)
            const isActive = !rental.Returned && returnDate >= new Date();

            // Status badge
            let statusBadge = '';
            if (rental.Returned) {
                statusBadge = '<span class="status-badge returned">Returned</span>';
            } else if (returnDate < new Date()) {
                statusBadge = '<span class="status-badge overdue">Overdue</span>';
            } else {
                statusBadge = '<span class="status-badge active">Active</span>';
            }

            return `
                <div class="rental-card ${isActive ? 'active-rental' : ''}">
                    <div class="rental-info">
                        <div class="rental-type">${rental.Type}</div>
                        <div class="rental-dates">
                            <span>Rented: ${formattedRentalDate}</span>
                            <span>Return by: ${formattedReturnDate}</span>
                        </div>
                        <div class="rental-status">
                            ${statusBadge}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        tabContentElement.innerHTML = `
            <div class="tab-content-header">My Rentals</div>
            <div class="rental-list">
                ${rentalsList}
            </div>
        `;
    }
}

// Add the missing hideAllContent function after the view management functions
function hideAllContent() {
    // Hide all main content views
    if (dashboardView) dashboardView.style.display = 'none';
    if (tableView) tableView.style.display = 'none';
    if (statisticsView) statisticsView.style.display = 'none';
    if (memberView) memberView.style.display = 'none';
}