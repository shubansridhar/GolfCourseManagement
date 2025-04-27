/**
 * auth.js - Authentication and User Management
 * 
 * This module handles all authentication-related functionality:
 * - User login and signup
 * - Token management
 * - User session handling
 * - Password change functionality
 * - Admin user management
 */

// Import view-related functions
// Importing only the specific functions needed to avoid circular dependency issues
import { showNotification } from './views.js';

// API base URL for backend requests
const API_BASE_URL = '/api';

// Current user information
let currentUser = null;

// DOM elements references for auth-related functionality
let accountModal, accountUsername, accountRole, changePasswordError;
let changePasswordForm, signupRoleSelect, adminRoleInfo, signupError;

/**
 * Set DOM element references
 * This function must be called from main.js to provide references to DOM elements
 * @param {Object} elements - Object containing DOM element references
 */
function setDOMElements(elements) {
    // Store DOM element references for later use
    accountModal = elements.accountModal;
    accountUsername = elements.accountUsername;
    accountRole = elements.accountRole;
    changePasswordForm = elements.changePasswordForm;
    changePasswordError = elements.changePasswordError;
    signupRoleSelect = elements.signupRoleSelect;
    adminRoleInfo = elements.adminRoleInfo;
    signupError = elements.signupError;
}

/**
 * Initialize authentication state from local storage (if available)
 * @returns {Promise<boolean>} True if user was authenticated from stored token
 */
async function initializeAuth() {
    // Check for saved auth token in localStorage
    const savedToken = localStorage.getItem('authToken');
    const savedUsername = localStorage.getItem('username');
    const savedRole = localStorage.getItem('userRole');

    if (savedToken && savedUsername && savedRole) {
        // Restore user session from saved data
        currentUser = {
            token: savedToken,
            username: savedUsername,
            role: savedRole
        };

        // Validate token is still good with a test request
        try {
            // Test the token with a lightweight API call
            const response = await authenticatedFetch(`${API_BASE_URL}/tables`);
            if (!response.ok) {
                throw new Error('Saved token is invalid');
            }
            console.log('User session restored for:', currentUser.username);
            return true;
        } catch (error) {
            console.warn('Saved auth token invalid:', error);
            handleLogout(); // Clear invalid token
            return false;
        }
    }
    return false;
}

/**
 * Authenticate API requests by adding auth headers
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
async function authenticatedFetch(url, options = {}) {
    const headers = getAuthHeaders();
    options.headers = { ...(options.headers || {}), ...headers };

    try {
        const response = await fetch(url, options);

        // Check for auth errors specifically
        if (response.status === 401 || response.status === 403) {
            console.warn(`Auth error (${response.status}) fetching ${url}. Logging out.`);
            handleLogout();
            throw new Error('Authentication required or session expired. Please log in again.');
        }
        return response;
    } catch (error) {
        console.error(`Network error for ${url}:`, error);
        if (!(error.message.includes('Authentication required'))) {
            showNotification(`Network or server error: ${error.message}`, 'error');
        }
        throw error;
    }
}

/**
 * Generate authorization headers for authenticated requests
 * @returns {Object} Headers object with auth token
 */
function getAuthHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (currentUser?.token) {
        headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
    return headers;
}

/**
 * Handle user login form submission
 * @param {Event} event - Form submit event
 * @param {Function} onLoginSuccess - Callback function to execute after successful login
 */
async function handleLogin(event, onLoginSuccess) {
    event.preventDefault();

    // Get form elements
    const form = event.target;
    const usernameInput = form.elements['username'];
    const passwordInput = form.elements['password'];
    const loginError = document.getElementById('login-error');

    // Clear previous errors
    if (loginError) loginError.style.display = 'none';

    // Validate inputs
    if (!usernameInput.value || !passwordInput.value) {
        if (loginError) {
            loginError.textContent = 'Username and password are required';
            loginError.style.display = 'block';
        }
        return;
    }

    try {
        // Send login request to backend
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Login failed with status: ${response.status}`);
        }

        // Store auth data
        currentUser = {
            token: data.token,
            username: data.username,
            role: data.role
        };

        // Save to localStorage for persistence
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userRole', data.role);

        // Show success and update UI
        showNotification('Login successful!', 'success');

        // Clear form
        form.reset();

        // Call the success callback if provided
        if (typeof onLoginSuccess === 'function') {
            onLoginSuccess(currentUser);
        }
    } catch (error) {
        console.error('Login error:', error);
        if (loginError) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
        }
        showNotification(`Login failed: ${error.message}`, 'error');
    }
}

/**
 * Handle user signup form submission
 * @param {Event} event - Form submit event
 * @param {Function} onSignupSuccess - Callback function to execute after successful signup
 */
async function handleSignup(event, onSignupSuccess) {
    event.preventDefault();

    // Get form elements
    const form = event.target;
    const usernameInput = form.elements['signup-username'];
    const passwordInput = form.elements['signup-password'];
    const confirmInput = form.elements['signup-confirm-password'];
    const roleSelect = form.elements['signup-role'];

    // Clear previous errors
    if (signupError) signupError.style.display = 'none';

    // Validate inputs
    if (!usernameInput.value || !passwordInput.value || !confirmInput.value) {
        if (signupError) {
            signupError.textContent = 'All fields are required';
            signupError.style.display = 'block';
        }
        return;
    }

    if (passwordInput.value !== confirmInput.value) {
        if (signupError) {
            signupError.textContent = 'Passwords do not match';
            signupError.style.display = 'block';
        }
        return;
    }

    const role = roleSelect.value || 'member';

    try {
        // Send signup request to backend
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: usernameInput.value,
                password: passwordInput.value,
                role: role
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Signup failed with status: ${response.status}`);
        }

        // Signup successful
        showNotification(data.message || 'Signup successful! Please log in.', 'success');

        // Call the success callback if provided instead of directly referencing view functions
        if (typeof onSignupSuccess === 'function') {
            onSignupSuccess();
        }

        // If admin was created, update local storage flag
        if (role === 'admin') {
            localStorage.setItem('adminCreated', 'true');
        }

        // Clear form
        form.reset();
    } catch (error) {
        console.error('Signup error:', error);
        if (signupError) {
            signupError.textContent = error.message;
            signupError.style.display = 'block';
        }
        showNotification(`Signup failed: ${error.message}`, 'error');
    }
}

/**
 * Handle user logout
 * @param {Function} onLogoutSuccess - Callback function to execute after successful logout
 */
async function handleLogout(onLogoutSuccess) {
    try {
        // Optional backend logout call can be added here
    } finally {
        // Clear user data
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');

        // Call the success callback if provided
        if (typeof onLogoutSuccess === 'function') {
            onLogoutSuccess();
        }

        showNotification('Logged out successfully.', 'info');
    }
}

/**
 * Open the account settings modal
 */
function openAccountModal() {
    if (!currentUser || !accountModal || !accountUsername || !accountRole || !changePasswordForm) return;

    // Update modal with user info
    accountUsername.textContent = currentUser.username;
    accountRole.textContent = currentUser.role.charAt(0).toUpperCase() + currentUser.role.slice(1);

    // Reset form and errors
    changePasswordForm.reset();
    if (changePasswordError) changePasswordError.style.display = 'none';

    // Show modal
    accountModal.style.display = 'block';
}

/**
 * Handle password change form submission
 * @param {Event} event - Form submit event
 */
async function handleChangePassword(event) {
    event.preventDefault();

    if (!changePasswordForm || !changePasswordError) return;

    // Get password values
    const currentPassword = changePasswordForm.elements['currentPassword'].value;
    const newPassword = changePasswordForm.elements['newPassword'].value;
    const confirmNewPassword = changePasswordForm.elements['confirmNewPassword'].value;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        changePasswordError.textContent = 'All fields are required';
        changePasswordError.style.display = 'block';
        return;
    }

    if (newPassword !== confirmNewPassword) {
        changePasswordError.textContent = 'New passwords do not match';
        changePasswordError.style.display = 'block';
        return;
    }

    if (newPassword === currentPassword) {
        changePasswordError.textContent = 'New password must be different from current password';
        changePasswordError.style.display = 'block';
        return;
    }

    try {
        // Send password change request to backend
        const response = await authenticatedFetch(`${API_BASE_URL}/auth/change-password`, {
            method: 'POST',
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to change password');
        }

        const data = await response.json();

        // Success
        showNotification(data.message || 'Password updated successfully!', 'success');
        changePasswordForm.reset();
        accountModal.style.display = 'none';
    } catch (error) {
        console.error('Password change error:', error);
        changePasswordError.textContent = error.message;
        changePasswordError.style.display = 'block';
        showNotification(`Password change failed: ${error.message}`, 'error');
    }
}

/**
 * Check if admin user exists and set up signup form accordingly
 */
async function checkAdminExistsAndSetupSignup() {
    try {
        // Check local storage flag first
        const adminExists = localStorage.getItem('adminCreated');

        // Update signup form based on admin existence
        const adminOption = signupRoleSelect?.querySelector('option[value="admin"]');

        if (adminExists) {
            // Remove admin option if admin already exists
            if (adminOption) adminOption.remove();
            if (adminRoleInfo) adminRoleInfo.style.display = 'none';
        } else {
            // Add admin option for initial setup
            if (!adminOption && signupRoleSelect) {
                const option = document.createElement('option');
                option.value = 'admin';
                option.textContent = 'Admin (Initial Setup)';
                signupRoleSelect.appendChild(option);
            }
            if (adminRoleInfo) adminRoleInfo.style.display = 'block';
        }
    } catch (error) {
        console.error('Error checking admin existence:', error);
    }
}

/**
 * Load and display users for admin management
 */
async function loadAndDisplayUsers() {
    if (!currentUser || currentUser.role !== 'admin') {
        showNotification('Access denied. Admin role required.', 'error');
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch users');
        }

        const users = await response.json();
        renderUsersTable(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Render users table for admin management
 * @param {Array} users - List of users
 */
function renderUsersTable(users) {
    const userManagementContent = document.getElementById('user-management-content');
    if (!userManagementContent) return;

    if (!users || users.length === 0) {
        userManagementContent.innerHTML = '<p>No users found.</p>';
        return;
    }

    let html = `
        <div class="users-table-container">
            <table class="data-table users-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    users.forEach(user => {
        // Format date
        const createdDate = new Date(user.created_at).toLocaleDateString();

        // Disable delete for current user and lone admin
        const isCurrentUser = user.username === currentUser.username;
        const isLoneAdmin = user.role === 'admin' && users.filter(u => u.role === 'admin').length === 1;
        const canDelete = !isCurrentUser && !isLoneAdmin;

        html += `
            <tr>
                <td>${user.user_id}</td>
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td>${createdDate}</td>
                <td>
                    <button class="btn btn-sm ${canDelete ? 'btn-danger' : 'btn-disabled'}" 
                            onclick="deleteUser(${user.user_id})" 
                            ${canDelete ? '' : 'disabled'}>
                        <i class="fas fa-trash-alt"></i> Delete
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    userManagementContent.innerHTML = html;
}

/**
 * Delete a user (admin function)
 * @param {number} userId - ID of user to delete
 */
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) {
        return;
    }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/admin/users/${userId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to delete user');
        }

        showNotification('User deleted successfully.', 'success');
        loadAndDisplayUsers(); // Refresh the list
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Export functions for use in other modules
export {
    currentUser,
    setDOMElements,
    initializeAuth,
    authenticatedFetch,
    getAuthHeaders,
    handleLogin,
    handleSignup,
    handleLogout,
    openAccountModal,
    handleChangePassword,
    checkAdminExistsAndSetupSignup,
    loadAndDisplayUsers,
    deleteUser
}; 