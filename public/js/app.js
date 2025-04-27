/**
 * app.js - Main Application Logic
 * 
 * This is the main entry point of the application that:
 * - Initializes the application
 * - Handles authentication
 * - Manages view switching
 * - Sets up global event listeners
 */

import { showAuthView, showDashboardView, showNotification, showLoginForm, showSignupForm, showMemberView, showEmployeeView, showStatisticsView } from './views.js';
import { currentUser, authenticatedFetch, handleSignup, handleLogout, checkAdminExists, setCurrentUser } from './auth.js';
import { fetchTablesAndPopulateDashboard } from './data.js';
import { loadMemberData, setupMemberEventListeners } from './member.js';

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Global error handler
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    showNotification(`Unexpected error: ${event.reason?.message || 'Unknown error'}`, 'error');
});

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('Initializing application...');

    // Set up global event listeners
    setupEventListeners();

    // Check for existing auth token
    await checkAuthentication();
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Auth forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }

    // Auth navigation
    document.getElementById('show-signup')?.addEventListener('click', (e) => {
        e.preventDefault();
        showSignupForm();
    });

    document.getElementById('show-login')?.addEventListener('click', (e) => {
        e.preventDefault();
        showLoginForm();
    });

    // User actions
    document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
    document.getElementById('statistics-btn')?.addEventListener('click', () => {
        showStatisticsView();
    });

    // Navigation
    document.getElementById('back-to-dashboard-btn')?.addEventListener('click', () => {
        showDashboardView();
        fetchTablesAndPopulateDashboard();
    });

    document.getElementById('back-to-dashboard-from-stats-btn')?.addEventListener('click', () => {
        showDashboardView();
        fetchTablesAndPopulateDashboard();
    });

    document.getElementById('refresh-stats-btn')?.addEventListener('click', () => {
        showStatisticsView();
    });

    document.getElementById('back-to-dashboard-from-member-btn')?.addEventListener('click', () => {
        showDashboardView();
        fetchTablesAndPopulateDashboard();
    });

    // Employee view refresh
    document.getElementById('refresh-employee-data-btn')?.addEventListener('click', () => {
        showEmployeeView();
    });

    // Add record modal
    document.getElementById('add-record-btn')?.addEventListener('click', openAddRecordModal);

    // Modal close buttons
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    document.getElementById('cancel-record')?.addEventListener('click', closeModal);

    // Member event listeners
    setupMemberEventListeners();
}

/**
 * Check if user is authenticated
 */
async function checkAuthentication() {
    const token = localStorage.getItem('token');

    if (token) {
        try {
            // Try to fetch user data to verify token
            const response = await fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const userData = await response.json();

                // Set global user data
                window.currentUser = userData;

                // Update user display
                updateUserDisplay(userData);

                // Show appropriate view based on role
                if (userData.role === 'member') {
                    showMemberView();
                } else if (userData.role === 'employee') {
                    showEmployeeView();
                } else {
                    showDashboardView();
                    fetchTablesAndPopulateDashboard();
                }

                return;
            }
        } catch (error) {
            console.error('Authentication error:', error);
        }

        // If we reach here, authentication failed
        localStorage.removeItem('token');
    }

    // No token or invalid token, show auth view
    showAuthView();
}

/**
 * Handle login form submission
 */
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const loginError = document.getElementById('login-error');

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store token and user data
            localStorage.setItem('token', data.token);
            const userData = {
                username: data.username,
                role: data.role
            };

            // Update user data in auth.js and global reference
            window.currentUser = setCurrentUser(userData);

            // Update user display
            updateUserDisplay(window.currentUser);

            // Show appropriate view
            if (data.role === 'member') {
                showMemberView();
            } else if (data.role === 'employee') {
                showEmployeeView();
            } else {
                showDashboardView();
                fetchTablesAndPopulateDashboard();
            }

            //showNotification('Login successful!', 'success');
        } else {
            loginError.textContent = data.error || 'Login failed';
            loginError.style.display = 'block';
        }
    } catch (error) {
        console.error('Login error:', error);
        loginError.textContent = 'Network error. Please try again.';
        loginError.style.display = 'block';
    }
}

/**
 * Update user display in header
 */
function updateUserDisplay(user) {
    const usernameDisplay = document.getElementById('username-display');
    const userStatusDisplay = document.getElementById('user-status');

    if (user && usernameDisplay && userStatusDisplay) {
        usernameDisplay.textContent = `${user.username} (${user.role})`;
        userStatusDisplay.style.display = 'flex';
    }
}

/**
 * Open the add record modal
 */
function openAddRecordModal() {
    const modal = document.getElementById('add-record-modal');
    if (modal) modal.style.display = 'block';
}

/**
 * Close all modals
 */
function closeModal() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.style.display = 'none';
    });
} 