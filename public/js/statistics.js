// public/js/statistics.js
// Statistics-specific data fetching and UI logic

import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.esm.js';
import { authenticatedFetch } from './auth.js';
import { showNotification } from './views.js';

// store references to Chart instances for cleanup
let chartInstances = {};

const API_BASE_URL = '/api';

// Register all necessary Chart.js components
Chart.register(...registerables);

/**
 * Load and render statistics data.
 * @param {string} context - 'admin', 'employee', or 'member' to determine which stats to load.
 * @param {string|null} [overrideContainerSelector=null] - Optional selector for the target container, overrides default map.
 */
async function loadStatisticsData(context = 'admin', overrideContainerSelector = null) {
    let containerSelector;
    if (overrideContainerSelector) {
        containerSelector = overrideContainerSelector;
    } else {
        // Determine which container to use based *only* on context
        const selectorMap = {
            admin: '#statistics-view .stats-container',         // Main statistics page
            employee: '#employee-view .stats-container.employee-stats', // Employee portal
            member: '#member-view .stats-container.member-stats'    // Member portal
        };
        // Always use the map based on context, default to admin if needed
        containerSelector = selectorMap[context] || selectorMap.admin;
    }

    const container = document.querySelector(containerSelector);
    if (!container) {
        console.error(`Statistics container not found for selector: ${containerSelector}`);
        return; // Exit if container doesn't exist
    }

    // Show loading, hide stats grid
    const loading = container.querySelector('.loading');
    const grid = container.querySelector('.stats-grid');
    if (loading) loading.style.display = 'block';
    if (grid) grid.style.display = 'none';

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/statistics`);
        if (!response.ok) throw new Error('Failed to fetch statistics');

        // Load all metrics from server
        const stats = await response.json();

        // Destroy old chart instances
        Object.values(chartInstances).forEach(c => c.destroy());
        chartInstances = {};
        // Clear existing cards
        grid.innerHTML = '';
        // Global chart configs
        const chartConfigs = {
            usersByRole: { title: 'Users by Role', type: 'pie', icon: 'fas fa-user-tag' },
            avgAccountAge: { title: 'Avg Account Age (days)', type: 'bar', icon: 'fas fa-hourglass-half' },
            totalPlans: { title: 'Total Plans', type: 'bar', icon: 'fas fa-list-alt' },
            coursesByStatus: { title: 'Courses by Status', type: 'bar', icon: 'fas fa-golf-ball' },
            holesByPar: { title: 'Holes by Par', type: 'bar', icon: 'fas fa-hashtag' },
            bookingsToday: { title: 'Bookings Today', type: 'bar', icon: 'fas fa-calendar-day' },
            upcomingBookings: { title: 'Upcoming Bookings', type: 'bar', icon: 'fas fa-calendar-plus' },
            avgAvailSlots: { title: 'Avg Available Slots', type: 'bar', icon: 'fas fa-th-list' },
            rentalsThisMonth: { title: 'Rentals This Month', type: 'bar', icon: 'fas fa-shopping-cart' },
            pendingReturns: { title: 'Pending Returns', type: 'bar', icon: 'fas fa-box-open' },
            myUpcomingTeeTimes: { title: 'My Upcoming Tee Times', type: 'bar', icon: 'fas fa-calendar-check' },
            myPastTeeTimes: { title: 'My Past Tee Times', type: 'bar', icon: 'fas fa-history' },
            myActiveRentals: { title: 'My Active Rentals', type: 'bar', icon: 'fas fa-warehouse' },
            myReturnedRentals: { title: 'My Returned Rentals', type: 'bar', icon: 'fas fa-undo-alt' },
            myAvgRentalDuration: { title: 'My Avg Rental Duration (days)', type: 'bar', icon: 'fas fa-hourglass-end' }
        };
        // Define which metrics belong to each context
        const contextMap = {
            admin: ['usersByRole', 'avgAccountAge', 'totalPlans', 'coursesByStatus', 'holesByPar'],
            employee: ['bookingsToday', 'upcomingBookings', 'avgAvailSlots', 'rentalsThisMonth', 'pendingReturns'],
            member: ['myUpcomingTeeTimes', 'myPastTeeTimes', 'myActiveRentals', 'myReturnedRentals', 'myAvgRentalDuration']
        };
        const metricKeys = contextMap[context] || contextMap.admin;
        // Dynamically render each metric card and chart
        for (const key of metricKeys) {
            const cfg = chartConfigs[key];
            const dataRows = stats[key] || [];
            // build card
            const card = document.createElement('div'); card.className = 'stats-card';
            const title = document.createElement('h3'); title.innerHTML = `<i class="${cfg.icon}"></i> ${cfg.title}`; card.appendChild(title);
            const canvas = document.createElement('canvas'); canvas.id = `chart-${key}`; card.appendChild(canvas);
            grid.appendChild(card);
            // map rows to labels/values
            let labels = [], values = [];
            if (dataRows.length > 1 && dataRows[0].label !== undefined) {
                labels = dataRows.map(r => r.label);
                values = dataRows.map(r => r.value);
            } else if (dataRows.length === 1) {
                labels = [cfg.title];
                values = [dataRows[0].value];
            }
            const ctx = canvas.getContext('2d');
            chartInstances[key] = new Chart(ctx, {
                type: cfg.type,
                data: { labels, datasets: [{ label: cfg.title, data: values, backgroundColor: 'rgba(54, 162, 235, 0.5)' }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }

        // Hide loading, show stats grid
        if (loading) loading.style.display = 'none';
        if (grid) grid.style.display = 'grid';
    } catch (error) {
        console.error('Error loading statistics:', error);
        showNotification('Failed to load statistics. Please try again.', 'error');
        if (loading) loading.style.display = 'none';
    }
}

export { loadStatisticsData }; 