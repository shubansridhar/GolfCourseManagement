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
    authView.style.display = 'flex';
    appView.style.display = 'none';
    userStatusDisplay.style.display = 'none';
    showLoginForm();
}

function showAppView() {
    authView.style.display = 'none';
    appView.style.display = 'block';
    dashboardView.style.display = 'block';
    tableView.style.display = 'none';
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

function showDashboardOnly() {
     if (!dashboardView || !tableView) return;
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

async function handleLogin(event) {
    event.preventDefault();
    if (!loginForm) return;
    if (loginError) loginError.style.display = 'none';
    const usernameInput = loginForm.elements['username']?.value;
    const password = loginForm.elements['password']?.value;
    if (!usernameInput || !password) { /* ... handle missing input ... */ return; }
    console.log(`Attempting login for: ${usernameInput}`);
    try {
        // --- FAKE SUCCESS ---
        await new Promise(resolve => setTimeout(resolve, 500));
        const fakeToken = `fake-token-${Date.now()}`;
        let fakeRole = 'member';
        if (usernameInput.toLowerCase() === 'admin' && localStorage.getItem('adminCreated')) fakeRole = 'admin';
        if (usernameInput.toLowerCase() === 'emp') fakeRole = 'employee';
        const data = { username: usernameInput, token: fakeToken, role: fakeRole, message: 'Login successful!' };
        // --- END FAKE ---

        currentUser = { username: data.username, token: data.token, role: data.role };
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role);
        showNotification(data.message || 'Login successful!', 'success');
        showAppView();
        fetchTablesAndPopulateDashboard();
    } catch (error) { /* ... error handling ... */ }
}

async function handleSignup(event) {
    event.preventDefault();
    if (!signupForm || !signupRoleSelect) return;
    if (signupError) signupError.style.display = 'none';
    const username = signupForm.elements['username']?.value;
    const password = signupForm.elements['password']?.value;
    const confirmPassword = signupForm.elements['confirmPassword']?.value;
    const role = signupRoleSelect.value;

    if (password !== confirmPassword) { /* ... handle password mismatch ... */ return; }
    if (!role) { /* ... handle role missing ... */ return; }
    console.log(`Attempting signup for: ${username} with role: ${role}`);
    try {
        // --- FAKE SUCCESS ---
        await new Promise(resolve => setTimeout(resolve, 500));
        if (role === 'admin') {
            if (localStorage.getItem('adminCreated')) throw new Error("Admin user already exists.");
            localStorage.setItem('adminCreated', 'true');
        }
        const data = { message: `Signup successful as ${role}! Please log in.` };
        // --- END FAKE ---

        showNotification(data.message || 'Signup successful! Please log in.', 'success');
        showLoginForm();
    } catch (error) {
        console.error('Signup error:', error);
        if (signupError) { signupError.textContent = error.message; signupError.style.display = 'block'; }
        showNotification(`Signup failed: ${error.message}`, 'error');
    }
}

async function handleLogout() {
    console.log('Logging out');
    try { /* Optional backend call */ }
    finally {
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        showAuthView();
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

// === Dashboard & Table Logic ===
async function fetchTablesAndPopulateDashboard() {
    if (!currentUser) {
        console.log("fetchTablesAndPopulateDashboard: Not logged in, cannot fetch tables.");
        return;
    }
    console.log("fetchTablesAndPopulateDashboard: Function called."); // Log: Check if function starts

    showDashboardOnly(); // Ensure dashboard view is displayed

    if (!dashboardContainer) {
         console.error("fetchTablesAndPopulateDashboard: Dashboard container element not found!");
         return;
     }
    dashboardContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>';

    try {
        // **REAL APP:** Use authenticatedFetch to get tables user has access to
        // const response = await authenticatedFetch('/api/tables');
        // if (!response.ok) {
        //     let errorMsg = `Failed to fetch tables (Status: ${response.status})`;
        //      try { const errorData = await response.json(); errorMsg = errorData.error || errorMsg; } catch (e) {}
        //     throw new Error(errorMsg);
        // }
        // allTables = await response.json();
        // --- FAKE DATA ---
        console.log("fetchTablesAndPopulateDashboard: Simulating API call to get tables...");
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
        // Updated list based on original screenshot + previous list
        const fakeTables = [
            'EMPLOYEE',
            'EMPLOYEE_CONTACT', // Added
            'EQUIPMENT',
            'EQUIPMENT_TYPE',   // Added
            'GOLF_COURSE',
            'HOLE',             // Added
            'MAINTENANCE_LOG',  // Was present
            'MANAGER',          // Added
            'MEMBERSHIP_PLAN',  // Was present
            'PLAYERACCOUNT',    // Added
            'TEE_TIME'          // Was present
        ];
        allTables = fakeTables; // Use the updated list
        // --- END FAKE DATA ---
        console.log("fetchTablesAndPopulateDashboard: Using table list:", allTables);

        populateDashboard(allTables);

    } catch (error) {
        console.error("fetchTablesAndPopulateDashboard: Error fetching tables:", error);
        if (dashboardContainer) {
             dashboardContainer.innerHTML = `<div class="error-container"><p><i class="fas fa-exclamation-triangle"></i> Error fetching tables: ${error.message}</p></div>`;
             // Add retry logic if needed
         }
    }
}

function populateDashboard(tables) {
     console.log("populateDashboard: Function called with tables:", tables); // Log: Check tables received
     if (!dashboardContainer) {
          console.error("populateDashboard: Dashboard container not found!");
          return;
      }
     dashboardContainer.innerHTML = ''; // Clear loading/error

    if (!tables || tables.length === 0) {
        console.log("populateDashboard: No tables to display."); // Log: Check if tables array is empty
        dashboardContainer.innerHTML = '<p class="no-data">No tables found or accessible.</p>';
        return;
    }

    // Function to get an appropriate icon
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

    tables.forEach(tableName => {
        console.log(`populateDashboard: Creating card for ${tableName}`); // Log: Check loop execution
        const card = document.createElement('div');
        card.classList.add('table-card');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        const iconClass = getIconForTable(tableName);
        card.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${tableName.replace(/_/g, ' ')}</span>
        `;
        card.addEventListener('click', () => navigateToTable(tableName));
        card.addEventListener('keypress', (e) => { if (e.key === 'Enter') navigateToTable(tableName); });
        console.log(`populateDashboard: Appending card for ${tableName} to`, dashboardContainer);
        dashboardContainer.appendChild(card);
    });
    console.log("populateDashboard: Finished adding cards.");
}

function navigateToTable(tableName) {
    console.log(`Navigating to table: ${tableName}`); // Log navigation
    showTableViewOnly();
    selectTable(tableName); // Fetch data for the selected table
}

async function selectTable(tableName) {
    if (!currentUser) return;
    if (!dataTableContainer || !selectedTableHeader || !addRecordBtn) return;

    dataTableContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading data...</div>';
    selectedTableHeader.textContent = `Loading ${tableName.replace(/_/g, ' ')}...`;
    addRecordBtn.disabled = true;
    currentTable = tableName;
    console.log(`selectTable: Fetching data for ${tableName}`);

    try {
         // --- FAKE DATA SIMULATION ---
         console.log(`selectTable: Simulating API calls for ${tableName}...`);
         await new Promise(resolve => setTimeout(resolve, 600)); // Simulate delay

         let simulatedStructure = [];
         let simulatedData = [];
         const lowerTableName = tableName.toLowerCase();
         let pkField = `${lowerTableName}_id`; // Default guess

         // Add specific structures/data for known tables
         switch (tableName) {
             case 'EMPLOYEE':
                 pkField = 'employee_id';
                 simulatedStructure = [ { Field: pkField, Type: 'int', Key: 'PRI', Extra: 'auto_increment' }, { Field: 'first_name', Type: 'varchar(50)', Null: 'NO' }, { Field: 'last_name', Type: 'varchar(50)', Null: 'NO' }, { Field: 'role', Type: 'varchar(30)' }, { Field: 'hire_date', Type: 'date' } ];
                 simulatedData = [ { [pkField]: 1, first_name: 'John', last_name: 'Doe', role: 'Manager', hire_date: '2022-08-15'}, { [pkField]: 2, first_name: 'Jane', last_name: 'Smith', role: 'Greenskeeper', hire_date: '2023-01-20'}, ];
                 break;
            case 'EMPLOYEE_CONTACT':
                 pkField = 'contact_id'; // Guess PK
                 simulatedStructure = [ { Field: pkField, Type: 'int', Key: 'PRI', Extra: 'auto_increment' }, { Field: 'employee_id', Type: 'int', Null: 'NO' }, { Field: 'phone', Type: 'varchar(20)' }, { Field: 'email', Type: 'varchar(100)' } ];
                 simulatedData = [ { [pkField]: 1, employee_id: 1, phone: '555-1234', email: 'john.doe@golf.com'}, { [pkField]: 2, employee_id: 2, phone: '555-5678', email: 'jane.s@golf.com'} ];
                 break;
            case 'GOLF_COURSE':
                 pkField = 'course_id';
                 simulatedStructure = [ { Field: pkField, Type: 'int', Key: 'PRI', Extra: 'auto_increment' }, { Field: 'name', Type: 'varchar(100)', Null: 'NO' }, { Field: 'location', Type: 'varchar(150)'}, { Field: 'par', Type: 'int'} ];
                 simulatedData = [ { [pkField]: 1, name: 'Sunset Hills', location: 'Main Street', par: 72 }, { [pkField]: 2, name: 'Ocean Breeze', location: 'Coastal Way', par: 70 }, ];
                 break;
            case 'EQUIPMENT':
                 pkField = 'equipment_id';
                 simulatedStructure = [ { Field: pkField, Type: 'int', Key: 'PRI', Extra: 'auto_increment'}, { Field: 'name', Type: 'varchar(100)', Null: 'NO'}, { Field: 'type', Type: 'varchar(50)'}, { Field: 'purchase_date', Type: 'date'}, { Field: 'condition', Type: 'varchar(50)'} ];
                 simulatedData = [ { [pkField]: 101, name: 'Lawn Mower X1', type: 'Mower', purchase_date: '2023-03-01', condition: 'Good'}, { [pkField]: 102, name: 'Golf Cart #5', type: 'Vehicle', purchase_date: '2022-11-15', condition: 'Fair'} ];
                 break;
            case 'EQUIPMENT_TYPE':
                 pkField = 'type_id'; // Guess PK
                 simulatedStructure = [ { Field: pkField, Type: 'int', Key: 'PRI', Extra: 'auto_increment'}, { Field: 'type_name', Type: 'varchar(50)', Null: 'NO'}, { Field: 'description', Type: 'text'} ];
                 simulatedData = [ { [pkField]: 1, type_name: 'Mower', description: 'Grass cutting equipment'}, { [pkField]: 2, type_name: 'Vehicle', description: 'Transport vehicles'} ];
                 break;
            case 'HOLE':
                 pkField = 'hole_id'; // Guess PK
                 simulatedStructure = [ { Field: pkField, Type: 'int', Key: 'PRI', Extra: 'auto_increment' }, { Field: 'course_id', Type: 'int', Null: 'NO' }, { Field: 'hole_number', Type: 'int', Null: 'NO' }, { Field: 'par', Type: 'int' }, { Field: 'length_yards', Type: 'int' } ];
                 simulatedData = [ { [pkField]: 1, course_id: 1, hole_number: 1, par: 4, length_yards: 380 }, { [pkField]: 2, course_id: 1, hole_number: 2, par: 5, length_yards: 510 } ];
                 break;
            // *** ADD MORE CASE STATEMENTS FOR YOUR TABLES HERE ***
            // e.g., case 'MANAGER': ... ; break;
            // e.g., case 'PLAYERACCOUNT': ... ; break;

             default:
                 // Generic fallback - ENSURE PK IS MARKED
                 console.warn(`selectTable: Using generic structure/data for table ${tableName}`);
                 pkField = `${lowerTableName}_id`; // Default PK name guess
                 simulatedStructure = [
                    { Field: pkField, Type: 'int', Key: 'PRI', Extra: 'auto_increment'}, // IMPORTANT: Mark as PK
                    { Field: 'name', Type: 'varchar(100)', Null: 'NO'},
                    { Field: 'description', Type: 'text'},
                    { Field: 'created_at', Type: 'datetime', Default: 'CURRENT_TIMESTAMP'}
                 ];
                 simulatedData = [
                     { [pkField]: 1, name: `Sample ${tableName} 1`, description: `Description for ${tableName} 1`, created_at: new Date().toISOString() },
                     { [pkField]: 2, name: `Sample ${tableName} 2`, description: null, created_at: new Date().toISOString() }
                 ];
                 break;
         }

         tableStructure = simulatedStructure;
         tableData = simulatedData;
         console.log(`selectTable: Fake data/structure loaded for ${tableName}`);
         // --- END FAKE DATA ---

        selectedTableHeader.textContent = tableName.replace(/_/g, ' ');
        addRecordBtn.disabled = false;
        renderTable();

    } catch (error) {
        console.error(`Error selecting table ${tableName}:`, error);
        if (dataTableContainer) {
             dataTableContainer.innerHTML = `<div class="error-container"><p><i class="fas fa-exclamation-triangle"></i> Failed to load data for ${tableName}: ${error.message}</p></div>`;
         }
        if (selectedTableHeader) selectedTableHeader.textContent = `Error loading ${tableName.replace(/_/g, ' ')}`;
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

async function handleSubmitRecord() {
    if (!addRecordForm || !currentTable) return;
    console.log(`handleSubmitRecord: Submitting for table ${currentTable}`);

    if (!addRecordForm.checkValidity()) {
        showNotification('Please fill out all required fields correctly.', 'error');
        addRecordForm.reportValidity(); // Highlight invalid fields
        return;
    }

    const formData = {};
    const formElements = addRecordForm.elements;
    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        if (element.name) {
             // Handle empty optional numbers as null (check required attribute)
             if (element.type === 'number' && element.value === '' && !element.required) {
                 formData[element.name] = null;
             } else {
                formData[element.name] = element.value; // Send empty strings for text if not required
             }
        }
    }
    console.log("handleSubmitRecord: Submitting data:", formData);

    try {
        // **REAL APP:** Use authenticatedFetch POST
        // const response = await authenticatedFetch(`/api/tables/${currentTable}`, { method: 'POST', body: JSON.stringify(formData) });
        // const result = await response.json();
        // if (!response.ok) throw new Error(result.error || `Server error: ${response.status}`);
        // --- FAKE SUCCESS ---
         console.log(`handleSubmitRecord: Simulating API POST for ${currentTable}...`);
         await new Promise(resolve => setTimeout(resolve, 500));
         // Add to local tableData for simulation
         const pkCol = tableStructure.find(col => col.Key === 'PRI')?.Field || (tableStructure.length > 0 ? tableStructure[0].Field : null);
         let newId = 1;
         if (pkCol && tableData.length > 0) {
             newId = Math.max(0, ...tableData.map(r => parseInt(r[pkCol]) || 0)) + 1;
         }
         const newRecord = { ...formData };
         if (pkCol) newRecord[pkCol] = newId; // Add simulated PK if found
         tableData.push(newRecord); // Add to the array
         const result = { message: 'Record added successfully!' };
         console.log(`handleSubmitRecord: Simulated adding record (ID ${newId}):`, newRecord);
        // --- END FAKE ---

        addRecordModal.style.display = 'none';
        showNotification(result.message || 'Record added successfully!', 'success');
        renderTable(); // Re-render table with the new data

    } catch (error) {
        console.error("handleSubmitRecord: Error adding record:", error);
        showNotification(`Failed to add record: ${error.message}`, 'error');
    }
}

async function deleteRecord(id, primaryKeyName, rowIndex) {
     if (!currentTable) return;
     console.log(`deleteRecord: Attempting delete for ${currentTable}, ${primaryKeyName}=${id}, rowIndex=${rowIndex}`);

     if (!confirm(`Are you sure you want to delete record with ${primaryKeyName} = ${id} from ${currentTable.replace(/_/g, ' ')}?`)) {
          console.log("Delete cancelled by user.");
          return;
      }

    try {
         // **REAL APP:** Use authenticatedFetch DELETE
        // const response = await authenticatedFetch(`/api/tables/${currentTable}/${id}?primaryKey=${encodeURIComponent(primaryKeyName)}`, { method: 'DELETE' });
        // const result = await response.json(); // Expects { message: '...' } or { error: '...' }
        // if (!response.ok) throw new Error(result.error || `Failed to delete record. Status: ${response.status}`);
         // --- FAKE SUCCESS ---
          console.log(`deleteRecord: Simulating API DELETE for ${currentTable}, ${primaryKeyName}=${id}...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          // Remove from local tableData using rowIndex (more reliable than searching by ID if types mismatch)
          if (rowIndex >= 0 && rowIndex < tableData.length) {
              const deletedItem = tableData.splice(rowIndex, 1);
               console.log(`deleteRecord: Simulated removing record at index ${rowIndex}:`, deletedItem);
          } else {
               console.warn(`deleteRecord: Invalid rowIndex ${rowIndex} provided. Attempting findById.`);
               // Fallback: Try finding by ID (less efficient, potential type mismatch)
               const indexById = tableData.findIndex(item => item[primaryKeyName] == id); // Loose equality
               if (indexById !== -1) {
                   const deletedItem = tableData.splice(indexById, 1);
                    console.log(`deleteRecord: Simulated removing record at index ${indexById} (found by ID):`, deletedItem);
               } else {
                    throw new Error(`Simulated delete failed: Record with ${primaryKeyName}=${id} not found in local data.`);
               }
          }
          const result = { message: 'Record deleted successfully!' };
         // --- END FAKE ---

        showNotification(result.message || 'Record deleted successfully!', 'success');
        renderTable(); // Re-render table without the deleted data

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