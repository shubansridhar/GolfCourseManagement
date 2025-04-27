/**
 * index.js - Main Entry Point
 * 
 * This file imports and initializes all modules for the Golf Course Management System.
 * It serves as the single entry point for the modular JavaScript application.
 */

import { initializeApp } from './modules/main.js';

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);

// Expose showNotification to window object for use in inline event handlers
import { showNotification } from './modules/views.js';
window.showNotification = showNotification;

// Add global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    showNotification(`Unexpected error: ${event.reason?.message || 'Unknown error'}`, 'error');
}); 