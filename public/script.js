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
const dashboardContainer = document.getElementById('dashboard-container');
const selectedTableHeader = document.getElementById('selected-table');
const addRecordBtn = document.getElementById('add-record-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
const dataTableContainer = tableView.querySelector('.table-container');

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
        fetchTablesAndPopulateDashboard();
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
    addRecordBtn?.addEventListener('click', openAddRecordModal);
    closeAddModalBtn?.addEventListener('click', () => { addRecordModal.style.display = 'none'; });
    cancelRecordBtn?.addEventListener('click', () => { addRecordModal.style.display = 'none'; });
    submitRecordBtn?.addEventListener('click', handleSubmitRecord);
    accountBtn?.addEventListener('click', openAccountModal);
    closeAccountModalBtns.forEach(btn => btn.addEventListener('click', () => { accountModal.style.display = 'none'; }));
    changePasswordForm?.addEventListener('submit', handleChangePassword);
    window.addEventListener('click', (event) => {
        if (event.target === addRecordModal) addRecordModal.style.display = 'none';
        if (event.target === accountModal) accountModal.style.display = 'none';
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

// Make sure showDashboardOnly also removes the background if needed,
// although showAppView should handle it when logging in. Add for safety.
function showDashboardOnly() {
    if (!dashboardView || !tableView) return;
    document.body.classList.remove('auth-background'); // <-- REMOVE Class from body (Safety)
    console.log("showDashboardOnly called");
    dashboardView.style.display = 'block';
    tableView.style.display = 'none';
    if (selectedTableHeader) selectedTableHeader.textContent = 'Select a table';
    if (addRecordBtn) addRecordBtn.disabled = true;
    currentTable = null;
}

function showTableViewOnly() {
    if (!dashboardView || !tableView) return;
    dashboardView.style.display = 'none';
    tableView.style.display = 'block';
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
        fetchTablesAndPopulateDashboard(); // Load dashboard data using the new token

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

// --- MODIFY this function in public/script.js ---
function populateDashboard(tables) {
    console.log("populateDashboard: Function called with tables:", tables);
    if (!dashboardContainer) {
         console.error("populateDashboard: Dashboard container not found!");
         return;
     }
    dashboardContainer.innerHTML = ''; // Clear loading/error

    // --- START: Add User Management Card for Admin ---
    if (currentUser && currentUser.role === 'admin') {
        console.log("populateDashboard: Adding User Management card for admin.");
        const userCard = document.createElement('div');
        userCard.classList.add('table-card', 'admin-card'); // Add specific class if needed
        userCard.setAttribute('role', 'button');
        userCard.setAttribute('tabindex', '0');
        // Use a suitable icon for user management
        userCard.innerHTML = `
            <i class="fas fa-users-cog"></i>
            <span>User Management</span>
        `;
        // Add event listener to call a NEW function to load users
        userCard.addEventListener('click', () => loadAndDisplayUsers());
        userCard.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadAndDisplayUsers(); });
        dashboardContainer.appendChild(userCard); // Add admin card first
    }
    // --- END: Add User Management Card ---


   if (!tables || tables.length === 0) {
       // Check if the *only* thing missing is tables, but admin card was added
       if (dashboardContainer.children.length === 0) {
            console.log("populateDashboard: No tables or admin cards to display.");
            dashboardContainer.innerHTML = '<p class="no-data">No tables found or accessible.</p>';
        } else {
            console.log("populateDashboard: No regular tables found, but admin card present.");
        }
       return;
   }

   // Function to get an appropriate icon (keep this helper)
   function getIconForTable(tableName) {
    const lowerName = tableName.toLowerCase();
    if (lowerName.includes('employee_contact')) return 'fa-address-book';
    if (lowerName.includes('employee') || lowerName.includes('user') || lowerName.includes('manager') || lowerName.includes('playeraccount')) return 'fa-users';
    if (lowerName.includes('golf') || lowerName.includes('course') || lowerName.includes('hole')) return 'fa-golf-ball-tee';
    if (lowerName.includes('equipment_type')) return 'fa-tags';
    if (lowerName.includes('equipment')) return 'fa-wrench';
    if (lowerName.includes('booking') || lowerName.includes('reserv') || lowerName.includes('tee_time')) return 'fa-calendar-check';
    if (lowerName.includes('member')) return 'fa-id-card';
    if (lowerName.includes('report') || lowerName.includes('log')) return 'fa-chart-line';
    if (lowerName.includes('player')) return 'fa-person-running'; // Might be covered by 'users' above
    return 'fa-table'; // Default icon
}

   // Add cards for the regular database tables
   tables.forEach(tableName => {
       console.log(`populateDashboard: Creating card for table ${tableName}`);
       const card = document.createElement('div');
       card.classList.add('table-card');
       card.setAttribute('role', 'button');
       card.setAttribute('tabindex', '0');
       const iconClass = getIconForTable(tableName);
       card.innerHTML = `
           <i class="fas ${iconClass}"></i>
           <span>${tableName.replace(/_/g, ' ')}</span>
       `;
       // Regular table cards still navigate normally
       card.addEventListener('click', () => navigateToTable(tableName));
       card.addEventListener('keypress', (e) => { if (e.key === 'Enter') navigateToTable(tableName); });
       dashboardContainer.appendChild(card);
   });
   console.log("populateDashboard: Finished adding cards.");
}



function navigateToTable(tableName) {
    console.log(`Navigating to table: ${tableName}`); // Log navigation
    showTableViewOnly();
    selectTable(tableName); // Fetch data for the selected table
}

// Updated selectTable function (uses real API calls)
async function selectTable(tableName) {
    // currentUser check - important for authenticated routes
    if (!currentUser) {
        showNotification("Please log in to view table data.", "error");
        // Optionally redirect to login view: showAuthView(); showLoginForm();
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
            try { const errData = await structureResponse.json(); errorMsg = errData.error || errorMsg; } catch(e) {}
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
             try { const errData = await dataResponse.json(); errorMsg = errData.error || errorMsg; } catch(e) {}
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
                if (column.Type?.includes('datetime') || column.Type?.includes('timestamp')) { try { value = new Date(value).toLocaleString(); } catch (e) {} }
                 else if (column.Type?.includes('date')) { try { value = new Date(value).toLocaleDateString(); } catch (e) {} }
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

// --- ADD these two new functions to public/script.js ---

// Function to fetch user data from the admin endpoint and display it
async function loadAndDisplayUsers() {
    // Check if logged in user is admin (should be, if they clicked the card, but double-check)
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification("Access Denied: Admin role required.", "error");
        return;
    }
    // Ensure necessary elements exist
    if (!dataTableContainer || !selectedTableHeader || !addRecordBtn || !backToDashboardBtn) {
        console.error("loadAndDisplayUsers: Missing required DOM elements for table view.");
        return;
    }

    console.log("loadAndDisplayUsers: Fetching user list for admin...");
    showTableViewOnly(); // Switch to the table view area

    // Update header and disable 'Add Record' for user view
    selectedTableHeader.textContent = 'User Management';
    addRecordBtn.disabled = true; // Can't add users via the generic 'Add Record'
    addRecordBtn.style.display = 'none'; // Hide the button entirely
    backToDashboardBtn.style.display = 'inline-flex'; // Ensure back button is visible

    dataTableContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading users...</div>';
    currentTable = null; // Clear currentTable context when viewing users

    try {
        console.log(`loadAndDisplayUsers: Fetching from ${API_BASE_URL}/admin/users`);
        const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`);

        if (!response.ok) {
            let errorMsg = `Failed user fetch (Status: ${response.status})`;
            try { const errData = await response.json(); errorMsg = errData.error || errorMsg; } catch(e) {}
            throw new Error(errorMsg);
        }

        const users = await response.json(); // Get the list of users
        console.log("loadAndDisplayUsers: Received users:", users);

        renderUsersTable(users); // Call function to display the users

    } catch (error) {
        console.error("Error loading users:", error);
        if (dataTableContainer) {
            dataTableContainer.innerHTML = `<div class="error-container"><p><i class="fas fa-exclamation-triangle"></i> Failed to load user list: ${error.message}</p></div>`;
        }
        // Also update header to show error
        selectedTableHeader.textContent = 'Error Loading Users';
    }
}

// Function to render the user data into a table
function renderUsersTable(users) {
    if (!dataTableContainer) { console.error("renderUsersTable: dataTableContainer element not found!"); return; }
    console.log(`renderUsersTable: Rendering ${users?.length ?? 0} users.`);

    // Reset container and create table structure
    dataTableContainer.innerHTML = `<table id="user-data-table"><thead><tr></tr></thead><tbody></tbody></table>`;
    const dataTable = dataTableContainer.querySelector('#user-data-table');
    const tableHead = dataTable?.querySelector('thead tr');
    const tableBody = dataTable?.querySelector('tbody');

    if (!tableHead || !tableBody) {
        console.error("renderUsersTable: Could not find table head or body elements.");
        dataTableContainer.innerHTML = '<p class="error-container">Error: Could not create user table structure.</p>';
        return;
    }

    // Define Headers for User Table
    const headers = ['User ID', 'Username', 'Role', 'Created At']; // Add 'Actions' if needed later
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        tableHead.appendChild(th);
    });
    // Example: Add Actions header if planning delete/edit role later
    // const actionsHeader = document.createElement('th');
    // actionsHeader.textContent = 'Actions';
    // actionsHeader.classList.add('action-column');
    // tableHead.appendChild(actionsHeader);


    // Populate Table Body
    tableBody.innerHTML = ''; // Clear any default

    if (!users || users.length === 0) {
        console.log("renderUsersTable: No users found.");
        const noDataRow = tableBody.insertRow();
        const noDataCell = noDataRow.insertCell();
        // Adjust colspan based on number of headers (including potential Actions)
        noDataCell.colSpan = headers.length; // + (actionsHeader ? 1 : 0);
        noDataCell.textContent = 'No users found in the database.';
        noDataCell.classList.add('no-data');
        return;
    }

    // Loop through user data
    users.forEach(user => {
        const tr = tableBody.insertRow();

        // User ID
        let td = tr.insertCell();
        td.textContent = user.user_id;

        // Username
        td = tr.insertCell();
        td.textContent = user.username;

        // Role
        td = tr.insertCell();
        td.textContent = user.role;
        // Optionally add styling based on role
        // td.classList.add(`role-${user.role}`);

        // Created At
        td = tr.insertCell();
        try {
            td.textContent = user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A';
        } catch (e) {
            td.textContent = 'Invalid Date';
        }

        // Example: Actions Cell (if header added)
        // const actionsTd = tr.insertCell();
        // actionsTd.classList.add('action-column');
        // // Add buttons here later (e.g., delete user, change role)
        // actionsTd.innerHTML = `
        //    <button class="action-btn delete" title="Delete User (NYI)"><i class="fas fa-trash"></i></button>
        //    <button class="action-btn edit" title="Edit Role (NYI)"><i class="fas fa-user-edit"></i></button>
        // `;
        // Add event listeners to these buttons later
    });

    console.log(`renderUsersTable: Finished rendering user table.`);
}

// --- Also MODIFY navigateToTable ---
// Ensure Add button is re-enabled when navigating AWAY from user management
function navigateToTable(tableName) {
    console.log(`Navigating to table: ${tableName}`);
    if (addRecordBtn) addRecordBtn.style.display = 'inline-flex'; // Ensure Add button is visible again
    showTableViewOnly();
    selectTable(tableName); // Fetch data for the selected table
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
        awaitselectTable(currentTable); // Call selectTable to re-fetch and re-render

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
         if (signupError) { signupError.textContent = errorText; signupError.style.display = 'block';}
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