// public/js/auth.js

/**
 * auth.js - Simplified Authentication Functions
 */

// Import views functions needed
import { showAuthView, showNotification, showLoginForm } from './views.js';

// Global variables
let currentUser = null;
const API_BASE_URL = '/api'; // Use relative path

/**
 * Set the current user data after successful login/validation
 */
function setCurrentUser(userData) {
    if (userData && userData.username && userData.role) {
        currentUser = {
            username: userData.username,
            role: userData.role,
            userId: userData.userId // Store userId if available from login/validation
        };
        console.log("Current user set:", currentUser);
    } else {
        currentUser = null;
        console.log("User data invalid or null, currentUser reset.");
    }
    return currentUser;
}

/**
 * Make an authenticated API request using the token from localStorage
 */
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };
    if (options.body && !headers['Content-Type'] && typeof options.body === 'string') {
        headers['Content-Type'] = 'application/json';
    }
    try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            console.warn(`Authentication error (${response.status}) fetching ${url}. Logging out.`);
            handleLogout();
            const errorData = await response.json().catch(() => ({ error: 'Authentication failed' }));
            throw new Error(errorData.error || `Authentication failed (${response.status})`);
        }
        return response; // Return response for further handling by caller
    } catch (error) {
        console.error(`Workspace error for ${url}:`, error);
        throw error; // Re-throw error for caller to handle
    }
}


/**
 * Handle the signup form submission
 */
async function handleSignup(e) {
    e.preventDefault();

    // Get standard form elements
    const usernameInput = document.getElementById('signup-username');
    const passwordInput = document.getElementById('signup-password');
    const confirmPasswordInput = document.getElementById('signup-confirm-password');
    const roleSelect = document.getElementById('signup-role');
    const signupError = document.getElementById('signup-error');

    // Get member-specific form elements
    const fnameInput = document.getElementById('signup-fname');
    const lnameInput = document.getElementById('signup-lname');
    const emailInput = document.getElementById('signup-email');
    const phoneInput = document.getElementById('signup-phone');

    // Collect basic fields
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const role = roleSelect.value;

    // Basic Client-Side Validation
    signupError.style.display = 'none';
    if (!username || !password || !role) { signupError.textContent = 'Username, password, and role are required.'; signupError.style.display = 'block'; return; }
    if (password !== confirmPassword) { signupError.textContent = 'Passwords do not match'; signupError.style.display = 'block'; return; }
    if (password.length < 4) { signupError.textContent = 'Password must be at least 4 characters long.'; signupError.style.display = 'block'; return; }

    // Construct initial payload
    const payload = { username, password, role };

    // Collect and validate member fields ONLY if role is 'member'
    if (role === 'member') {
        const fname = fnameInput?.value.trim();
        const lname = lnameInput?.value.trim();
        const email = emailInput?.value.trim();
        const phone = phoneInput?.value.trim();

        // Backend requires fname and lname for members with the new schema
        if (!fname || !lname) {
            signupError.textContent = 'First Name and Last Name are required for member signup.';
            signupError.style.display = 'block';
            return; // Stop submission
        }
        // Add member details to payload
        payload.fname = fname;
        payload.lname = lname;
        // Send optional fields as null if empty, otherwise backend might treat "" differently
        payload.email = email || null;
        payload.phone = phone || null;
    }

    console.log("Submitting signup payload:", payload); // Debugging

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();

        if (response.ok) {
            showNotification('Account created successfully! You can now log in.', 'success');
            showLoginForm(); // Switch to login view
        } else {
            signupError.textContent = data.error || 'Signup failed. Please try again.';
            signupError.style.display = 'block';
        }
    } catch (error) {
        console.error('Signup fetch error:', error);
        signupError.textContent = 'Network error or server issue. Please try again.';
        signupError.style.display = 'block';
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    console.log("Logging out...");
    localStorage.removeItem('token');
    setCurrentUser(null); // Clear the currentUser variable
    showAuthView(); // Use the imported function to switch view
    alert('You have been logged out successfully.'); // Simple immediate feedback
}

/**
 * Check if current user has admin permissions
 */
function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

/**
 * Check if current user has employee permissions (includes admin)
 */
function isEmployee() {
    return currentUser && (currentUser.role === 'employee' || currentUser.role === 'admin');
}


// Export functions for use in other files
export {
    currentUser, // Export the variable itself
    setCurrentUser,
    authenticatedFetch,
    handleSignup,
    handleLogout,
    isAdmin,
    isEmployee
};