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
 */
async function loadStatisticsData(context = 'admin') {
    // Determine which container to use based *only* on context
    const selectorMap = {
        admin: '#statistics-view .stats-container',         // Main statistics page
        employee: '#statistics-view .stats-container',      // fixed bug made them all the same
        member: '#statistics-view .stats-container'         // ...was only displaying admin stats
    };
    // Always use the map based on context, default to admin if needed
    const containerSelector = selectorMap[context] || selectorMap.admin;

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
            usersByRole: { title: 'Users by Role', type: 'pie', icon: 'fas fa-user-tag', colors: ['#FF6384','#36A2EB','#FFCE56']  },
            avgAccountAge: { title: 'Avg Account Age', type: 'bar', icon: 'fas fa-hourglass-half', numberOnly: true },
            totalPlans:     { title: 'Total Plans',     type: 'bar', icon: 'fas fa-list-alt',      numberOnly: true },
            coursesByStatus: { title: 'Course Status', type: 'bar', icon: 'fas fa-golf-ball',  textOnly: true },
            holesByPar: { title: 'Holes by Par', type: 'bar', icon: 'fas fa-hashtag', colors: ['#FF6384','#36A2EB','#FFCE56'] },
            bookingsToday: { title: 'Bookings Today', type: 'bar', icon: 'fas fa-calendar-day', numberOnly: true },
            upcomingBookings: { title: 'Upcoming Bookings', type: 'bar', icon: 'fas fa-calendar-plus', numberOnly: true  },
            avgAvailSlots: { title: 'Avg Available Tee Time Slots', type: 'bar', icon: 'fas fa-th-list', numberOnly: true },
            rentalsThisMonth: { title: 'Rentals This Month', type: 'bar', icon: 'fas fa-shopping-cart', numberOnly: true },
            pendingReturns: { title: 'Pending Returns', type: 'bar', icon: 'fas fa-box-open', numberOnly: true },
            myUpcomingTeeTimes: { title: 'My Upcoming Tee Times', type: 'bar', icon: 'fas fa-calendar-check', numberOnly: true },
            myPastTeeTimes: { title: 'My Past Tee Times', type: 'bar', icon: 'fas fa-history', numberOnly: true },
            myActiveRentals: { title: 'My Active Rentals', type: 'bar', icon: 'fas fa-warehouse', numberOnly: true },
            myReturnedRentals: { title: 'My Returned Rentals', type: 'bar', icon: 'fas fa-undo-alt', numberOnly: true },
            myAvgRentalDuration: { title: 'My Avg Rental Duration (days)', type: 'bar', icon: 'fas fa-hourglass-end', numberOnly: true }
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
            const cfg      = chartConfigs[key];
            const dataRows = stats[key] || [];
          
            // build card + title
            const card = document.createElement('div');
            card.className = 'stats-card';
            card.innerHTML = `<h3><i class="${cfg.icon}"></i> ${cfg.title}</h3>`;
          
            // special text-only for Course Status
            if (cfg.textOnly && dataRows.length === 1) {
              const v = dataRows[0].value;
              const text = v === 1 ? 'Open' : 'Closed';
              const el = document.createElement('div');
              el.className = 'stat-number';
              el.textContent = text;
              el.style.color = v === 1 ? 'green' : 'red';
              card.appendChild(el);
          
            // numeric-only stats 
            } else if (cfg.numberOnly && dataRows.length === 1) {
              const val = dataRows[0].value;
              const numEl = document.createElement('div');
              numEl.className = 'stat-number';
              numEl.textContent = val;
              card.appendChild(numEl);
          
            // everything else falls back to Chart.js
            } else {
              const canvas = document.createElement('canvas');
              canvas.id = `chart-${key}`;
              card.appendChild(canvas);
          
              let labels = [], values = [];
              if (dataRows.length > 1 && dataRows[0].label !== undefined) {
                labels = dataRows.map(r => r.label);
                values = dataRows.map(r => r.value);
              } else if (dataRows.length === 1) {
                labels = [cfg.title];
                values = [dataRows[0].value];
              }
          
              const hideLegend = key === 'holesByPar';
              const ctx = canvas.getContext('2d');
              chartInstances[key] = new Chart(ctx, {
                type: cfg.type,
                data: {
                  labels,
                  datasets: [{
                    label: cfg.title,
                    data: values,
                    backgroundColor: cfg.colors || 'rgba(54, 162, 235, 0.5)'
                  }]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: !hideLegend } }
                }
              });
            }
          
            grid.appendChild(card);
          }

        // Hide loading, show stats grid no longer necessary
        if (loading) loading.style.display = 'none';
        if (grid) grid.style.display = 'grid';
    } catch (error) {
        console.error('Error loading statistics:', error);
        showNotification('Failed to load statistics. Please try again.', 'error');
        if (loading) loading.style.display = 'none';
    }
}

export { loadStatisticsData }; 