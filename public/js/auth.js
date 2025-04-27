/**
 * auth.js - Simplified Authentication Functions
 * 
 * Handles user authentication functionality including:
 * - Login and signup
 * - Token management
 * - User session
 */

import { showAuthView, showNotification } from './views.js';

// Global variables
let currentUser = null;
const API_BASE_URL = '/api';

/**
 * Set the current user data
 */
function setCurrentUser(userData) {
    currentUser = userData;
    return currentUser;
}

/**
 * Make an authenticated API request
 */
async function authenticatedFetch(url, options = {}) {
    const token = localStorage.getItem('token');

    if (!token) {
        throw new Error('No authentication token found');
    }

    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    return fetch(url, {
        ...options,
        headers
    });
}

/**
 * Handle the signup form submission
 */
async function handleSignup(e) {
    e.preventDefault();

    const username = document.getElementById('signup-username').value;
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm-password').value;
    const role = document.getElementById('signup-role').value;
    const signupError = document.getElementById('signup-error');

    // Simple validation
    if (password !== confirmPassword) {
        signupError.textContent = 'Passwords do not match';
        signupError.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, role })
        });

        const data = await response.json();

        if (response.ok) {
            showNotification('Account created successfully! You can now log in.', 'success');
            showLoginForm();
        } else {
            signupError.textContent = data.error || 'Signup failed. Please try again.';
            signupError.style.display = 'block';
        }
    } catch (error) {
        console.error('Signup error:', error);
        signupError.textContent = 'Network error. Please try again.';
        signupError.style.display = 'block';
    }
}

/**
 * Handle logout
 */
function handleLogout() {
    // Clear stored auth data
    localStorage.removeItem('token');
    currentUser = null;
    window.currentUser = null;

    // Return to auth view
    showAuthView();
    showNotification('You have been logged out successfully.', 'info');
}

/**
 * Check if user has admin permissions
 */
function isAdmin() {
    return currentUser && currentUser.role === 'admin';
}

/**
 * Check if user has employee permissions
 */
function isEmployee() {
    return currentUser && (currentUser.role === 'employee' || currentUser.role === 'admin');
}

/**
 * Check if admin user exists
 */
async function checkAdminExists() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/admin-exists`);
        const data = await response.json();
        return data.exists;
    } catch (error) {
        console.error('Error checking if admin exists:', error);
        return true; // Assume admin exists on error to prevent security issues
    }
}

/**
 * Update user display in the header
 */
function updateUserDisplay() {
    const usernameDisplay = document.getElementById('username-display');
    const userStatusDisplay = document.getElementById('user-status');

    if (currentUser && usernameDisplay && userStatusDisplay) {
        usernameDisplay.textContent = `${currentUser.username} (${currentUser.role})`;
        userStatusDisplay.style.display = 'flex';
    }
}

// Export functions for use in other files
export {
    currentUser,
    setCurrentUser,
    authenticatedFetch,
    handleSignup,
    handleLogout,
    isAdmin,
    isEmployee,
    checkAdminExists,
    updateUserDisplay
}; 