// public/js/statistics.js
// Statistics-specific data fetching and UI logic

import { authenticatedFetch } from './auth.js';
import { showNotification } from './views.js';

const API_BASE_URL = '/api';

/**
 * Load and render statistics data.
 */
async function loadStatisticsData() {
    const container = document.querySelector('#statistics-view .stats-container');
    if (!container) return;

    // Show loading, hide stats grid
    const loading = container.querySelector('.loading');
    const grid = container.querySelector('.stats-grid');
    if (loading) loading.style.display = 'block';
    if (grid) grid.style.display = 'none';

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/statistics`);
        if (!response.ok) throw new Error('Failed to fetch statistics');

        const { tableCounts, membersByPlan, teeTimeStatus, equipmentAvailability } = await response.json();

        // Populate table record counts
        const countsDiv = container.querySelector('.stats-table-counts');
        if (countsDiv) {
            countsDiv.innerHTML = '<ul>' + Object.entries(tableCounts)
                .map(([name, count]) => `<li><strong>${name}:</strong> ${count}</li>`)
                .join('') + '</ul>';
        }

        // Populate membership by plan type
        const planDiv = container.querySelector('.stats-membership-chart');
        if (planDiv) {
            planDiv.innerHTML = '<ul>' + membersByPlan
                .map(item => `<li><strong>${item.Plan_type}:</strong> ${item.count}</li>`)
                .join('') + '</ul>';
        }

        // Populate tee time status
        const teeDiv = container.querySelector('.stats-teetime-chart');
        if (teeDiv) {
            teeDiv.innerHTML = '<ul>' + teeTimeStatus
                .map(item => `<li><strong>${item.Status}:</strong> ${item.count}</li>`)
                .join('') + '</ul>';
        }

        // Populate equipment availability
        const equipDiv = container.querySelector('.stats-equipment-chart');
        if (equipDiv) {
            equipDiv.innerHTML = '<ul>' + equipmentAvailability
                .map(item => `<li><strong>${item.Type}:</strong> ${item.available}/${item.total} available</li>`)
                .join('') + '</ul>';
        }

        // Hide loading, show grid
        if (loading) loading.style.display = 'none';
        if (grid) grid.style.display = 'grid';
    } catch (error) {
        console.error('Error loading statistics:', error);
        showNotification('Failed to load statistics. Please try again.', 'error');
        if (loading) loading.style.display = 'none';
    }
}

export { loadStatisticsData }; 