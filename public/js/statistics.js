// public/js/statistics.js
// Statistics-specific data fetching and UI logic

import { Chart, registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.esm.js';
import { authenticatedFetch } from './auth.js';
import { showNotification } from './views.js';

let chartTableCounts, chartMembersByPlan, chartTeeTimeStatus, chartEquipmentAvailability;

const API_BASE_URL = '/api';

// Register all necessary Chart.js components
Chart.register(...registerables);

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

        // Destroy old charts if they exist
        if (chartTableCounts) chartTableCounts.destroy();
        if (chartMembersByPlan) chartMembersByPlan.destroy();
        if (chartTeeTimeStatus) chartTeeTimeStatus.destroy();
        if (chartEquipmentAvailability) chartEquipmentAvailability.destroy();

        // Record Counts Chart
        const countsDiv = container.querySelector('.stats-table-counts');
        countsDiv.innerHTML = '<canvas id="chart-record-counts"></canvas>';
        const ctx1 = document.getElementById('chart-record-counts').getContext('2d');
        chartTableCounts = new Chart(ctx1, {
            type: 'bar',
            data: {
                labels: Object.keys(tableCounts),
                datasets: [{ label: 'Records', data: Object.values(tableCounts), backgroundColor: 'rgba(54, 162, 235, 0.5)' }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });

        // Membership by Plan Pie Chart
        const planDiv = container.querySelector('.stats-membership-chart');
        planDiv.innerHTML = '<canvas id="chart-membership-plan"></canvas>';
        const ctx2 = document.getElementById('chart-membership-plan').getContext('2d');
        chartMembersByPlan = new Chart(ctx2, {
            type: 'pie',
            data: {
                labels: membersByPlan.map(i => i.Plan_type),
                datasets: [{ data: membersByPlan.map(i => i.count), backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'] }]
            },
            options: { responsive: true }
        });

        // Tee Time Status Doughnut Chart
        const teeDiv = container.querySelector('.stats-teetime-chart');
        teeDiv.innerHTML = '<canvas id="chart-tee-status"></canvas>';
        const ctx3 = document.getElementById('chart-tee-status').getContext('2d');
        chartTeeTimeStatus = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: teeTimeStatus.map(i => i.Status),
                datasets: [{ data: teeTimeStatus.map(i => i.count), backgroundColor: ['#4BC0C0', '#FF9F40', '#9966FF'] }]
            },
            options: { responsive: true }
        });

        // Equipment Availability Bar Chart
        const equipDiv = container.querySelector('.stats-equipment-chart');
        equipDiv.innerHTML = '<canvas id="chart-equipment"></canvas>';
        const ctx4 = document.getElementById('chart-equipment').getContext('2d');
        chartEquipmentAvailability = new Chart(ctx4, {
            type: 'bar',
            data: {
                labels: equipmentAvailability.map(i => i.Type),
                datasets: [
                    { label: 'Available', data: equipmentAvailability.map(i => i.available), backgroundColor: 'rgba(75, 192, 192, 0.5)' },
                    { label: 'Total', data: equipmentAvailability.map(i => i.total), backgroundColor: 'rgba(153, 102, 255, 0.5)' }
                ]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } }
            }
        });

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