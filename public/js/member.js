/**
 * member.js - Simplified Member Functionality
 * 
 * Handles all member-specific functionality:
 * - Profile display and editing
 * - Membership plan management
 * - Tee time booking
 * - Equipment rental
 */

import { authenticatedFetch } from './auth.js';
import { showNotification } from './views.js';

// API endpoints
const MEMBER_API = '/api/member';

// Member data cache
let memberProfile = null;
let membershipPlan = null;
let memberTeeTimes = null;
let availableTeeTimes = null;
let availableEquipment = null;
let memberRentals = null;

/**
 * Load all member data
 */
async function loadMemberData() {
    showLoading(true);

    try {
        // Fetch all member data in parallel
        const [profile, plan, teeTimes, equipment] = await Promise.all([
            fetchMemberProfile(),
            fetchMembershipPlan(),
            fetchTeeTimes(),
            fetchEquipment()
        ]);

        // Cache the data
        memberProfile = profile;
        membershipPlan = plan;
        memberTeeTimes = teeTimes.booked;
        availableTeeTimes = teeTimes.available;
        availableEquipment = equipment.available;
        memberRentals = equipment.rentals;

        // Render all sections
        renderMemberProfile();
        renderMembershipPlan();
        renderTeeTimes('upcoming');
        renderEquipment('available');

        showLoading(false);
    } catch (error) {
        console.error('Error loading member data:', error);
        showNotification('Failed to load member data. Please try again.', 'error');
        showLoading(false);
    }
}

/**
 * Fetch member profile
 */
async function fetchMemberProfile() {
    const response = await authenticatedFetch(`${MEMBER_API}/profile`);
    if (!response.ok) throw new Error('Failed to fetch profile data');
    return response.json();
}

/**
 * Fetch membership plan
 */
async function fetchMembershipPlan() {
    try {
        const response = await authenticatedFetch(`${MEMBER_API}/plans`);
        if (!response.ok) throw new Error('Failed to fetch membership plan data');

        const data = await response.json();

        // Ensure we return a valid object with all expected properties
        return {
            name: data.name || 'Standard Membership',
            type: data.type || 'Regular',
            status: data.status || 'Active',
            startDate: data.startDate || new Date().toISOString(),
            renewalDate: data.renewalDate || new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            fee: data.fee || 0,
            benefits: Array.isArray(data.benefits) ? data.benefits : ['Basic course access']
        };
    } catch (error) {
        console.error('Error in fetchMembershipPlan:', error);
        // Return fallback data on error
        return {
            name: 'Standard Membership',
            type: 'Regular',
            status: 'Active',
            startDate: new Date().toISOString(),
            renewalDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString(),
            fee: 0,
            benefits: ['Basic course access']
        };
    }
}

/**
 * Fetch tee times
 */
async function fetchTeeTimes() {
    const response = await authenticatedFetch(`${MEMBER_API}/tee-times`);
    if (!response.ok) throw new Error('Failed to fetch tee time data');
    return response.json();
}

/**
 * Fetch equipment data
 */
async function fetchEquipment() {
    const response = await authenticatedFetch(`${MEMBER_API}/equipment`);
    if (!response.ok) throw new Error('Failed to fetch equipment data');
    return response.json();
}

/**
 * Render member profile section
 */
function renderMemberProfile() {
    if (!memberProfile) return;

    const profileContent = document.getElementById('member-profile-content');
    if (!profileContent) return;

    profileContent.innerHTML = `
        <div class="profile-info">
            <p><strong>Name:</strong> ${memberProfile.name || 'Not provided'}</p>
            <p><strong>Email:</strong> ${memberProfile.email || 'Not provided'}</p>
            <p><strong>Phone:</strong> ${memberProfile.phone || 'Not provided'}</p>
            <p><strong>Address:</strong> ${memberProfile.address || 'Not provided'}</p>
            <p><strong>Handicap:</strong> ${memberProfile.handicap || 'Not provided'}</p>
            <p><strong>Member Since:</strong> ${new Date(memberProfile.joinDate).toLocaleDateString()}</p>
        </div>
    `;
}

/**
 * Render membership plan section
 */
function renderMembershipPlan() {
    if (!membershipPlan) return;

    const membershipContent = document.getElementById('membership-content');
    if (!membershipContent) return;

    // Add safe property access with fallbacks for all properties
    const name = membershipPlan.name || 'Standard';
    const type = membershipPlan.type || 'Regular';
    const status = membershipPlan.status || 'Active';
    const statusClass = status ? status.toLowerCase() : 'active';
    const startDate = membershipPlan.startDate ? new Date(membershipPlan.startDate).toLocaleDateString() : 'N/A';
    const renewalDate = membershipPlan.renewalDate ? new Date(membershipPlan.renewalDate).toLocaleDateString() : 'N/A';
    const fee = membershipPlan.fee !== undefined ? membershipPlan.fee.toFixed(2) : '0.00';
    const benefits = Array.isArray(membershipPlan.benefits) ? membershipPlan.benefits : [];

    membershipContent.innerHTML = `
        <div class="plan-info">
            <p><strong>Current Plan:</strong> ${name}</p>
            <p><strong>Plan Type:</strong> ${type}</p>
            <p><strong>Status:</strong> <span class="status ${statusClass}">${status}</span></p>
            <p><strong>Start Date:</strong> ${startDate}</p>
            <p><strong>Renewal Date:</strong> ${renewalDate}</p>
            <p><strong>Monthly Fee:</strong> $${fee}</p>
            <p><strong>Benefits:</strong></p>
            <ul class="benefits-list">
                ${benefits.length > 0 ? benefits.map(benefit => `<li>${benefit}</li>`).join('') : '<li>No specific benefits</li>'}
            </ul>
        </div>
    `;
}

/**
 * Render tee times section
 */
function renderTeeTimes(tab = 'upcoming') {
    const teeTimesTabContent = document.querySelector('.tee-times-tab-content');
    if (!teeTimesTabContent) return;

    // Update active tab
    const tabButtons = document.querySelectorAll('.tee-times-tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    let content = '';

    switch (tab) {
        case 'upcoming':
            if (!memberTeeTimes || memberTeeTimes.length === 0) {
                content = '<p class="empty-state">You have no upcoming tee times.</p>';
            } else {
                content = `
                    <div class="tee-times-list">
                        ${memberTeeTimes.map(teeTime => {
                    // Safe property access
                    const date = teeTime.date ? new Date(teeTime.date).toLocaleDateString() : 'N/A';
                    const time = teeTime.time || 'N/A';
                    const players = teeTime.players || '1';
                    const status = teeTime.status || 'Pending';
                    const statusClass = status ? status.toLowerCase() : 'pending';
                    const id = teeTime.id || '';

                    return `
                            <div class="tee-time-card">
                                <div class="tee-time-info">
                                    <h4>Date: ${date}</h4>
                                    <p>Time: ${time}</p>
                                    <p>Players: ${players}</p>
                                    <p>Status: <span class="status ${statusClass}">${status}</span></p>
                                </div>
                                <div class="tee-time-actions">
                                    <button class="btn btn-sm btn-danger cancel-tee-time" data-id="${id}">
                                        <i class="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </div>`;
                }).join('')}
                    </div>
                `;
            }
            break;

        case 'available':
            if (!availableTeeTimes || availableTeeTimes.length === 0) {
                content = '<p class="empty-state">No available tee times to show.</p>';
            } else {
                content = `
                    <div class="tee-times-list">
                        ${availableTeeTimes.map(teeTime => {
                    // Safe property access
                    const date = teeTime.date ? new Date(teeTime.date).toLocaleDateString() : 'N/A';
                    const time = teeTime.time || 'N/A';
                    const spotsAvailable = teeTime.spotsAvailable || '0';
                    const id = teeTime.id || '';

                    return `
                            <div class="tee-time-card">
                                <div class="tee-time-info">
                                    <h4>Date: ${date}</h4>
                                    <p>Time: ${time}</p>
                                    <p>Spots Available: ${spotsAvailable}</p>
                                </div>
                                <div class="tee-time-actions">
                                    <button class="btn btn-sm btn-success book-tee-time" data-id="${id}">
                                        <i class="fas fa-check"></i> Book
                                    </button>
                                </div>
                            </div>`;
                }).join('')}
                    </div>
                `;
            }
            break;

        case 'history':
            content = '<p class="empty-state">Tee time history will be available soon.</p>';
            break;
    }

    teeTimesTabContent.innerHTML = content;

    // Add event listeners to buttons
    if (tab === 'upcoming') {
        document.querySelectorAll('.cancel-tee-time').forEach(btn => {
            btn.addEventListener('click', () => cancelTeeTime(btn.dataset.id));
        });
    } else if (tab === 'available') {
        document.querySelectorAll('.book-tee-time').forEach(btn => {
            btn.addEventListener('click', () => bookTeeTime(btn.dataset.id));
        });
    }
}

/**
 * Render equipment section
 */
function renderEquipment(tab = 'available') {
    const equipmentTabContent = document.querySelector('.equipment-tab-content');
    if (!equipmentTabContent) return;

    // Update active tab
    const tabButtons = document.querySelectorAll('.equipment-tabs .tab-btn');
    tabButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    let content = '';

    switch (tab) {
        case 'available':
            if (!availableEquipment || availableEquipment.length === 0) {
                content = '<p class="empty-state">No equipment available for rent.</p>';
            } else {
                content = `
                    <div class="equipment-list">
                        ${availableEquipment.map(equipment => {
                    // Safe property access
                    const type = equipment.type || 'Equipment';
                    const brand = equipment.brand || 'Generic';
                    const condition = equipment.condition || 'Good';
                    const fee = equipment.fee !== undefined ? equipment.fee.toFixed(2) : '0.00';
                    const id = equipment.id || '';

                    return `
                            <div class="equipment-card">
                                <div class="equipment-info">
                                    <h4>${type}</h4>
                                    <p>Brand: ${brand}</p>
                                    <p>Condition: ${condition}</p>
                                    <p>Rental Fee: $${fee}</p>
                                </div>
                                <div class="equipment-actions">
                                    <button class="btn btn-sm btn-success rent-equipment" data-id="${id}">
                                        <i class="fas fa-shopping-cart"></i> Rent
                                    </button>
                                </div>
                            </div>`;
                }).join('')}
                    </div>
                `;
            }
            break;

        case 'my-rentals':
            if (!memberRentals || memberRentals.length === 0) {
                content = '<p class="empty-state">You have no equipment rentals.</p>';
            } else {
                content = `
                    <div class="equipment-list">
                        ${memberRentals.map(rental => {
                    // Safe property access
                    const type = rental.type || 'Equipment';
                    const brand = rental.brand || 'Generic';
                    const rentalDate = rental.rentalDate ? new Date(rental.rentalDate).toLocaleDateString() : 'N/A';
                    const dueDate = rental.dueDate ? new Date(rental.dueDate).toLocaleDateString() : 'N/A';
                    const status = rental.status || 'Active';
                    const statusClass = status ? status.toLowerCase() : 'active';
                    const id = rental.id || '';

                    return `
                            <div class="equipment-card">
                                <div class="equipment-info">
                                    <h4>${type}</h4>
                                    <p>Brand: ${brand}</p>
                                    <p>Rented: ${rentalDate}</p>
                                    <p>Due: ${dueDate}</p>
                                    <p>Status: <span class="status ${statusClass}">${status}</span></p>
                                </div>
                                <div class="equipment-actions">
                                    <button class="btn btn-sm btn-warning return-equipment" data-id="${id}">
                                        <i class="fas fa-undo"></i> Return
                                    </button>
                                </div>
                            </div>`;
                }).join('')}
                    </div>
                `;
            }
            break;
    }

    equipmentTabContent.innerHTML = content;

    // Add event listeners to buttons
    if (tab === 'available') {
        document.querySelectorAll('.rent-equipment').forEach(btn => {
            btn.addEventListener('click', () => rentEquipment(btn.dataset.id));
        });
    } else if (tab === 'my-rentals') {
        document.querySelectorAll('.return-equipment').forEach(btn => {
            btn.addEventListener('click', () => returnEquipment(btn.dataset.id));
        });
    }
}

/**
 * Book a tee time
 */
async function bookTeeTime(teeTimeId) {
    try {
        const response = await authenticatedFetch(`${MEMBER_API}/tee-times/${teeTimeId}/book`, {
            method: 'POST'
        });

        if (response.ok) {
            showNotification('Tee time booked successfully!', 'success');
            await loadMemberData();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to book tee time', 'error');
        }
    } catch (error) {
        console.error('Error booking tee time:', error);
        showNotification('Error booking tee time. Please try again.', 'error');
    }
}

/**
 * Cancel a tee time
 */
async function cancelTeeTime(teeTimeId) {
    try {
        const response = await authenticatedFetch(`${MEMBER_API}/tee-times/${teeTimeId}/cancel`, {
            method: 'POST'
        });

        if (response.ok) {
            showNotification('Tee time cancelled successfully!', 'success');
            await loadMemberData();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to cancel tee time', 'error');
        }
    } catch (error) {
        console.error('Error cancelling tee time:', error);
        showNotification('Error cancelling tee time. Please try again.', 'error');
    }
}

/**
 * Rent equipment
 */
async function rentEquipment(equipmentId) {
    try {
        const response = await authenticatedFetch(`${MEMBER_API}/equipment/${equipmentId}/rent`, {
            method: 'POST'
        });

        if (response.ok) {
            showNotification('Equipment rented successfully!', 'success');
            await loadMemberData();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to rent equipment', 'error');
        }
    } catch (error) {
        console.error('Error renting equipment:', error);
        showNotification('Error renting equipment. Please try again.', 'error');
    }
}

/**
 * Return equipment
 */
async function returnEquipment(rentalId) {
    try {
        const response = await authenticatedFetch(`${MEMBER_API}/equipment/${rentalId}/return`, {
            method: 'POST'
        });

        if (response.ok) {
            showNotification('Equipment returned successfully!', 'success');
            await loadMemberData();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Failed to return equipment', 'error');
        }
    } catch (error) {
        console.error('Error returning equipment:', error);
        showNotification('Error returning equipment. Please try again.', 'error');
    }
}

/**
 * Show or hide loading indicator
 */
function showLoading(show = true) {
    const loadingElement = document.querySelector('.member-container .loading');
    const dashboardGrid = document.querySelector('.member-dashboard-grid');

    if (loadingElement && dashboardGrid) {
        loadingElement.style.display = show ? 'flex' : 'none';
        dashboardGrid.style.display = show ? 'none' : 'grid';
    }
}

/**
 * Set up event listeners for member view
 */
function setupMemberEventListeners() {
    // Profile edit button
    document.getElementById('edit-profile-btn')?.addEventListener('click', openProfileEditModal);

    // Update plan button
    document.getElementById('update-plan-btn')?.addEventListener('click', openPlanChangeModal);

    // Book tee time button
    document.getElementById('book-tee-time-btn')?.addEventListener('click', openBookTeeTimeModal);

    // Rent equipment button
    document.getElementById('rent-equipment-btn')?.addEventListener('click', openRentEquipmentModal);

    // Tab navigation
    document.querySelectorAll('.tee-times-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => renderTeeTimes(btn.dataset.tab));
    });

    document.querySelectorAll('.equipment-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', () => renderEquipment(btn.dataset.tab));
    });

    // Refresh data button
    document.getElementById('refresh-member-data-btn')?.addEventListener('click', loadMemberData);
}

// Placeholder functions for modals (will be implemented later)
function openProfileEditModal() {
    console.log('Open profile edit modal');
}

function openPlanChangeModal() {
    console.log('Open plan change modal');
}

function openBookTeeTimeModal() {
    console.log('Open book tee time modal');
}

function openRentEquipmentModal() {
    console.log('Open rent equipment modal');
}

// Export functions
export {
    loadMemberData,
    setupMemberEventListeners
}; 