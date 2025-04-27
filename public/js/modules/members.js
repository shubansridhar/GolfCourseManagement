/**
 * members.js - Member-specific Functionality
 * 
 * This module handles all functionality related to golf club members:
 * - Member profile management
 * - Membership plans and changes
 * - Tee time booking and management
 * - Equipment rental functionality
 */

import { authenticatedFetch } from './auth.js';
import { showNotification, hideAllContent } from './views.js';

// API base URL
const API_BASE_URL = '/api';

// Member data
let memberProfile = null;
let memberPlans = null;
let memberTeeTimes = null;
let availableEquipment = null;
let memberEquipment = null;
let selectedEquipment = [];

/**
 * Check if all essential member view elements exist
 * This is a debug function to help identify missing elements
 */
function checkMemberViewElements() {
    console.log('*** CHECKING MEMBER VIEW DOM ELEMENTS ***');

    // Check main containers
    const memberView = document.getElementById('member-view');
    console.log('member-view exists:', !!memberView);

    const memberContainer = document.querySelector('.member-container');
    console.log('.member-container exists:', !!memberContainer);

    if (memberContainer) {
        const memberDashboardGrid = memberContainer.querySelector('.member-dashboard-grid');
        console.log('.member-dashboard-grid exists:', !!memberDashboardGrid);

        const loading = memberContainer.querySelector('.loading');
        console.log('.loading exists:', !!loading);
    } else {
        console.error('Cannot check child elements: .member-container not found');
    }

    // Check card elements
    const memberProfileContent = document.getElementById('member-profile-content');
    console.log('member-profile-content exists:', !!memberProfileContent);

    const membershipContent = document.querySelector('.membership-content');
    console.log('.membership-content exists:', !!membershipContent);

    const teeTimesTabContent = document.querySelector('.tee-times-tab-content');
    console.log('.tee-times-tab-content exists:', !!teeTimesTabContent);

    const equipmentTabContent = document.querySelector('.equipment-tab-content');
    console.log('.equipment-tab-content exists:', !!equipmentTabContent);

    // Check button elements
    const editProfileBtn = document.getElementById('edit-profile-btn');
    console.log('edit-profile-btn exists:', !!editProfileBtn);

    const updatePlanBtn = document.getElementById('update-plan-btn');
    console.log('update-plan-btn exists:', !!updatePlanBtn);

    const bookTeeTimeBtn = document.getElementById('book-tee-time-btn');
    console.log('book-tee-time-btn exists:', !!bookTeeTimeBtn);

    const rentEquipmentBtn = document.getElementById('rent-equipment-btn');
    console.log('rent-equipment-btn exists:', !!rentEquipmentBtn);

    console.log('*** END OF DOM ELEMENT CHECK ***');
}

/**
 * Show the member view
 */
function showMemberView() {
    console.log('showMemberView called');

    // Hide all content
    hideAllContent();

    // Show member view
    const memberView = document.getElementById('member-view');
    console.log('Member view element:', memberView);

    if (memberView) {
        memberView.style.display = 'block';
        console.log('Set member view display to block');
    } else {
        console.error('Member view element not found!');
    }

    // Hide back to dashboard button for member users
    if (window.currentUser && window.currentUser.role === 'member') {
        const backToDashboardBtn = document.getElementById('back-to-dashboard-from-member-btn');
        if (backToDashboardBtn) {
            backToDashboardBtn.style.display = 'none';
        }
    }

    // Check if all elements are in the DOM
    checkMemberViewElements();

    // Refresh member data
    refreshMemberData();
}

/**
 * Refresh all member data
 */
function refreshMemberData() {
    console.log('refreshMemberData called');

    // Show loading
    const memberContainer = document.querySelector('.member-container');
    console.log('Member container element:', memberContainer);

    if (!memberContainer) {
        console.error('Member container not found!');
        return;
    }

    const memberDashboard = memberContainer.querySelector('.member-dashboard-grid');
    const loading = memberContainer.querySelector('.loading');

    console.log('Member dashboard grid:', memberDashboard);
    console.log('Loading element:', loading);

    if (memberDashboard) memberDashboard.style.display = 'none';
    if (loading) loading.style.display = 'block';

    // Fetch member profile, membership plans, tee times, and equipment data
    console.log('Starting data fetching...');
    Promise.all([
        fetchMemberProfile(),
        fetchMembershipPlans(),
        fetchTeeTimes(),
        fetchEquipmentData()
    ])
        .then(() => {
            console.log('All data fetched successfully!');
            console.log('Member profile:', memberProfile);
            console.log('Member plans:', memberPlans);
            console.log('Member tee times:', memberTeeTimes);
            console.log('Available equipment:', availableEquipment);
            console.log('Member equipment:', memberEquipment);

            // Render member view components
            console.log('Rendering member view components...');
            renderMemberProfile();
            renderMembershipPlan();
            renderTeeTimes();
            renderEquipmentSection();

            // Hide loading and show dashboard
            console.log('Showing dashboard and hiding loading...');
            if (loading) loading.style.display = 'none';
            if (memberDashboard) memberDashboard.style.display = 'grid';
            console.log('Member dashboard display set to grid');
        })
        .catch(error => {
            console.error('Error refreshing member data:', error);
            showNotification('Failed to load member data. Please try again.', 'error');

            // Hide loading
            if (loading) loading.style.display = 'none';
        });
}

/**
 * Fetch member profile data
 * @returns {Promise<Object>} Member profile data
 */
async function fetchMemberProfile() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/profile`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch member profile');
        }

        memberProfile = await response.json();
        console.log('Fetched member profile:', memberProfile);
        return memberProfile;
    } catch (error) {
        console.error('Error fetching member profile:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Fetch membership plans
 * @returns {Promise<Array>} Membership plans
 */
async function fetchMembershipPlans() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/plans`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch membership plans');
        }

        memberPlans = await response.json();
        console.log('Fetched membership plans:', memberPlans);
        return memberPlans;
    } catch (error) {
        console.error('Error fetching membership plans:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Fetch tee times
 * @returns {Promise<Object>} Tee time data
 */
async function fetchTeeTimes() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/tee-times`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch tee times');
        }

        memberTeeTimes = await response.json();
        console.log('Fetched tee times:', memberTeeTimes);
        return memberTeeTimes;
    } catch (error) {
        console.error('Error fetching tee times:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Fetch equipment data
 * @returns {Promise<Object>} Equipment data
 */
async function fetchEquipmentData() {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/equipment`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch equipment data');
        }

        const data = await response.json();
        availableEquipment = data.available;
        memberEquipment = data.rentals;

        console.log('Fetched equipment data:', { available: availableEquipment, rentals: memberEquipment });
        return { available: availableEquipment, rentals: memberEquipment };
    } catch (error) {
        console.error('Error fetching equipment data:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

/**
 * Render member profile card
 */
function renderMemberProfile() {
    console.log('renderMemberProfile called');
    const memberProfileContent = document.getElementById('member-profile-content');
    console.log('Member profile content element:', memberProfileContent);

    if (!memberProfileContent) {
        console.error('Member profile content element not found!');
        return;
    }

    if (!memberProfile) {
        console.error('Member profile data is null or undefined!');
        return;
    }

    console.log('Rendering profile with data:', memberProfile);

    // Format first letter of first and last name as uppercase for the profile picture
    const initials = `${memberProfile.Fname ? memberProfile.Fname.charAt(0).toUpperCase() : ''}${memberProfile.Lname ? memberProfile.Lname.charAt(0).toUpperCase() : ''}`;

    memberProfileContent.innerHTML = `
        <div class="profile-info">
            <div class="profile-picture">
                ${initials}
            </div>
            <div class="profile-details">
                <div class="profile-name">${memberProfile.Fname || ''} ${memberProfile.Lname || ''}</div>
                <div class="profile-email">${memberProfile.Email || 'No email provided'}</div>
                <div class="profile-phone">${memberProfile.Phone_number || 'No phone number provided'}</div>
            </div>
        </div>
    `;

    console.log('Member profile rendered successfully');
}

/**
 * Render membership plan card
 */
function renderMembershipPlan() {
    console.log('renderMembershipPlan called');
    const membershipContent = document.getElementById('membership-content');
    console.log('Membership content element:', membershipContent);

    if (!membershipContent) {
        console.error('Membership content element not found!');
        return;
    }

    if (!memberProfile) {
        console.error('Member profile data is null or undefined!');
        return;
    }

    console.log('Rendering membership plan with profile:', memberProfile);
    console.log('Available plans:', memberPlans);

    // Find the current plan from the memberPlans array
    let currentPlan = null;
    if (memberPlans && memberPlans.length > 0 && memberProfile.Member_plan_id) {
        currentPlan = memberPlans.find(plan => plan.Plan_id === memberProfile.Member_plan_id);
    }

    console.log('Current plan:', currentPlan);

    if (currentPlan) {
        membershipContent.innerHTML = `
            <div class="plan-details">
                <div class="plan-type">${currentPlan.Plan_type}</div>
                <div class="plan-fee">$${currentPlan.Fees.toFixed(2)} per year</div>
                <div class="plan-discount">
                    <i class="fas fa-tag"></i> ${Math.round(currentPlan.Rental_discount * 100)}% discount on equipment rentals
                </div>
            </div>
            <div class="plan-benefits">
                <h4>Membership Benefits</h4>
                <ul>
                    <li>Access to all golf courses</li>
                    <li>Priority booking for tee times</li>
                    <li>${Math.round(currentPlan.Rental_discount * 100)}% discount on equipment rentals</li>
                    <li>Access to member-only events</li>
                </ul>
            </div>
        `;
    } else {
        membershipContent.innerHTML = `
            <div class="no-plan">
                <p>You don't have an active membership plan.</p>
                <button id="select-plan-btn" class="btn btn-primary">Select a Plan</button>
            </div>
        `;

        // Add event listener to the select plan button
        const selectPlanBtn = document.getElementById('select-plan-btn');
        if (selectPlanBtn) {
            selectPlanBtn.addEventListener('click', openPlanChangeModal);
        }
    }

    console.log('Membership plan rendered successfully');
}

/**
 * Open the profile edit modal
 */
function openProfileEditModal() {
    const profileEditModal = document.getElementById('profile-edit-modal');

    if (!profileEditModal || !memberProfile) return;

    // Populate form fields with current profile data
    const fnameInput = document.getElementById('edit-fname');
    const lnameInput = document.getElementById('edit-lname');
    const emailInput = document.getElementById('edit-email');
    const phoneInput = document.getElementById('edit-phone');

    if (fnameInput) fnameInput.value = memberProfile.Fname || '';
    if (lnameInput) lnameInput.value = memberProfile.Lname || '';
    if (emailInput) emailInput.value = memberProfile.Email || '';
    if (phoneInput) phoneInput.value = memberProfile.Phone_number || '';

    // Show modal
    profileEditModal.style.display = 'block';
}

/**
 * Handle profile save button click
 */
async function handleProfileSave() {
    const profileEditModal = document.getElementById('profile-edit-modal');

    if (!profileEditModal || !memberProfile) return;

    // Get form values
    const fnameInput = document.getElementById('edit-fname');
    const lnameInput = document.getElementById('edit-lname');
    const emailInput = document.getElementById('edit-email');
    const phoneInput = document.getElementById('edit-phone');

    const profileData = {
        Member_id: memberProfile.Member_id,
        Fname: fnameInput?.value || '',
        Lname: lnameInput?.value || '',
        Email: emailInput?.value || '',
        Phone_number: phoneInput?.value || ''
    };

    try {
        // Update profile via API
        const response = await authenticatedFetch(`${API_BASE_URL}/member/profile`, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile');
        }

        // Success
        profileEditModal.style.display = 'none';
        showNotification('Profile updated successfully!', 'success');

        // Refresh profile data
        await fetchMemberProfile();
        renderMemberProfile();
    } catch (error) {
        console.error('Error updating profile:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Open the plan change modal
 */
function openPlanChangeModal() {
    const planChangeModal = document.getElementById('plan-change-modal');
    const planOptions = document.getElementById('plan-options');

    if (!planChangeModal || !planOptions) return;

    // Populate plan options
    let optionsHTML = '';

    if (memberPlans && memberPlans.length > 0) {
        memberPlans.forEach(plan => {
            const isCurrentPlan = memberProfile && memberProfile.Member_plan_id === plan.Plan_id;

            optionsHTML += `
                <div class="plan-option ${isCurrentPlan ? 'current-plan' : ''}">
                    <div class="plan-header">
                        <h3>${plan.Plan_type}</h3>
                        <div class="plan-price">$${plan.Fees.toFixed(2)}/year</div>
                    </div>
                    <div class="plan-features">
                        <ul>
                            <li><i class="fas fa-check"></i> Access to all courses</li>
                            <li><i class="fas fa-check"></i> ${Math.round(plan.Rental_discount * 100)}% equipment rental discount</li>
                            <li><i class="fas fa-check"></i> Member events access</li>
                        </ul>
                    </div>
                    <button class="btn ${isCurrentPlan ? 'btn-disabled' : 'btn-primary'}" 
                            onclick="handlePlanChange(${plan.Plan_id})" 
                            ${isCurrentPlan ? 'disabled' : ''}>
                        ${isCurrentPlan ? 'Current Plan' : 'Select Plan'}
                    </button>
                </div>
            `;
        });
    } else {
        optionsHTML = '<p>No membership plans available.</p>';
    }

    planOptions.innerHTML = optionsHTML;
    planChangeModal.style.display = 'block';
}

/**
 * Handle plan change
 * @param {number} planId - ID of the selected plan
 */
async function handlePlanChange(planId) {
    if (!planId || !memberProfile) return;

    try {
        // Update plan via API
        const response = await authenticatedFetch(`${API_BASE_URL}/member/plan`, {
            method: 'PUT',
            body: JSON.stringify({
                Member_id: memberProfile.Member_id,
                Plan_id: planId
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update membership plan');
        }

        // Close modal
        const planChangeModal = document.getElementById('plan-change-modal');
        if (planChangeModal) planChangeModal.style.display = 'none';

        showNotification('Membership plan updated successfully!', 'success');

        // Refresh profile data
        await fetchMemberProfile();
        renderMembershipPlan();
    } catch (error) {
        console.error('Error updating plan:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Render tee times card
 */
function renderTeeTimes() {
    const teeTimesContent = document.querySelector('.tee-times-tab-content');

    if (!teeTimesContent || !memberTeeTimes) return;

    // Set up the tabs functionality
    const tabBtns = document.querySelectorAll('.tee-times-tabs .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Show the corresponding tab content
            const tabName = btn.getAttribute('data-tab');
            renderTeeTimeTabContent(tabName);
        });
    });

    // Render initial tab (upcoming)
    renderTeeTimeTabContent('upcoming');

    /**
     * Render the content for a specific tee time tab
     * @param {string} tabName - The name of the tab to render
     */
    function renderTeeTimeTabContent(tabName) {
        if (!teeTimesContent) return;

        let content = '';

        switch (tabName) {
            case 'upcoming':
                content = renderUpcomingTeeTimes();
                break;
            case 'history':
                content = renderTeeTimeHistory();
                break;
            case 'available':
                content = renderAvailableTeeTimes();
                break;
        }

        teeTimesContent.innerHTML = content;

        // Add event listeners for cancel buttons if needed
        const cancelButtons = teeTimesContent.querySelectorAll('.cancel-tee-time-btn');
        cancelButtons.forEach(btn => {
            const teeTimeId = btn.getAttribute('data-id');
            btn.addEventListener('click', () => cancelTeeTime(teeTimeId));
        });
    }

    /**
     * Render upcoming tee times
     * @returns {string} HTML content for upcoming tee times
     */
    function renderUpcomingTeeTimes() {
        if (!memberTeeTimes || !memberTeeTimes.upcoming || memberTeeTimes.upcoming.length === 0) {
            return `
                <div class="no-data">
                    <p>You don't have any upcoming tee times.</p>
                    <button id="book-now-btn" class="btn btn-primary">Book Now</button>
                </div>
            `;
        }

        let html = `
            <div class="tab-content-header">Your Upcoming Tee Times</div>
            <div class="tee-time-list">
        `;

        memberTeeTimes.upcoming.forEach(teeTime => {
            const date = new Date(teeTime.Date).toLocaleDateString();
            html += `
                <div class="tee-time-card">
                    <div class="tee-time-info">
                        <div class="tee-time-date">${date}</div>
                        <div class="tee-time-time">${teeTime.Time}</div>
                        <div class="tee-time-course">${teeTime.Course_name}</div>
                    </div>
                    <div class="tee-time-actions">
                        <button class="btn btn-sm btn-danger cancel-tee-time-btn" data-id="${teeTime.Tee_time_id}">
                            Cancel
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    /**
     * Render tee time history
     * @returns {string} HTML content for tee time history
     */
    function renderTeeTimeHistory() {
        if (!memberTeeTimes || !memberTeeTimes.history || memberTeeTimes.history.length === 0) {
            return `
                <div class="no-data">
                    <p>You don't have any tee time history.</p>
                </div>
            `;
        }

        let html = `
            <div class="tab-content-header">Your Tee Time History</div>
            <div class="tee-time-list">
        `;

        memberTeeTimes.history.forEach(teeTime => {
            const date = new Date(teeTime.Date).toLocaleDateString();
            html += `
                <div class="tee-time-card">
                    <div class="tee-time-info">
                        <div class="tee-time-date">${date}</div>
                        <div class="tee-time-time">${teeTime.Time}</div>
                        <div class="tee-time-course">${teeTime.Course_name}</div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    /**
     * Render available tee times
     * @returns {string} HTML content for available tee times
     */
    function renderAvailableTeeTimes() {
        return `
            <div class="tab-content-header">Available Tee Times</div>
            <div class="available-tee-times-form">
                <div class="form-group">
                    <label for="available-date">Select Date</label>
                    <input type="date" id="available-date" class="form-control">
                </div>
                <button id="search-tee-times-btn" class="btn btn-primary">
                    Search Available Times
                </button>
            </div>
            <div id="available-tee-times-results" class="tee-time-list">
                <!-- Results will be loaded here after search -->
                <div class="no-data">
                    <p>Select a date to see available tee times.</p>
                </div>
            </div>
        `;
    }

    // Add event listener for the book now button if it exists
    setTimeout(() => {
        const bookNowBtn = document.getElementById('book-now-btn');
        if (bookNowBtn) {
            bookNowBtn.addEventListener('click', () => {
                // Find and click the book tee time button in the header
                const bookTeeTimeBtn = document.getElementById('book-tee-time-btn');
                if (bookTeeTimeBtn) {
                    bookTeeTimeBtn.click();
                }
            });
        }

        // Add event listener for search tee times button
        const searchTeeTimesBtn = document.getElementById('search-tee-times-btn');
        if (searchTeeTimesBtn) {
            searchTeeTimesBtn.addEventListener('click', searchAvailableTeeTimes);
        }
    }, 0);
}

/**
 * Search for available tee times
 */
async function searchAvailableTeeTimes() {
    const dateInput = document.getElementById('available-date');
    const resultsContainer = document.getElementById('available-tee-times-results');

    if (!dateInput || !resultsContainer) return;

    const selectedDate = dateInput.value;
    if (!selectedDate) {
        showNotification('Please select a date', 'error');
        return;
    }

    try {
        resultsContainer.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

        const response = await authenticatedFetch(`${API_BASE_URL}/member/available-tee-times?date=${selectedDate}`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch available tee times');
        }

        const availableTimes = await response.json();

        if (availableTimes.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-data">
                    <p>No available tee times on this date.</p>
                </div>
            `;
            return;
        }

        let html = '';

        availableTimes.forEach(teeTime => {
            const date = new Date(teeTime.Date).toLocaleDateString();
            html += `
                <div class="tee-time-card">
                    <div class="tee-time-info">
                        <div class="tee-time-date">${date}</div>
                        <div class="tee-time-time">${teeTime.Time}</div>
                        <div class="tee-time-course">${teeTime.Course_name}</div>
                        <div class="tee-time-slots">Available slots: ${teeTime.Available_slots}</div>
                    </div>
                    <div class="tee-time-actions">
                        <button class="btn btn-sm btn-success book-available-time-btn" data-id="${teeTime.Tee_time_id}">
                            Book
                        </button>
                    </div>
                </div>
            `;
        });

        resultsContainer.innerHTML = html;

        // Add event listeners for book buttons
        const bookButtons = resultsContainer.querySelectorAll('.book-available-time-btn');
        bookButtons.forEach(btn => {
            const teeTimeId = btn.getAttribute('data-id');
            btn.addEventListener('click', () => bookTeeTime(teeTimeId));
        });

    } catch (error) {
        console.error('Error searching for available tee times:', error);
        showNotification(`Error: ${error.message}`, 'error');

        resultsContainer.innerHTML = `
            <div class="no-data">
                <p>Error loading available tee times.</p>
            </div>
        `;
    }
}

/**
 * Book a tee time
 * @param {number} teeTimeId - The ID of the tee time to book
 */
async function bookTeeTime(teeTimeId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/book-tee-time`, {
            method: 'POST',
            body: JSON.stringify({ teeTimeId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to book tee time');
        }

        const result = await response.json();
        showNotification(result.message, 'success');

        // Refresh tee times data
        await fetchTeeTimes();
        renderTeeTimes();

        // Switch to the upcoming tab
        const upcomingTab = document.querySelector('.tee-times-tabs .tab-btn[data-tab="upcoming"]');
        if (upcomingTab) {
            upcomingTab.click();
        }

    } catch (error) {
        console.error('Error booking tee time:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Cancel a tee time
 * @param {number} teeTimeId - The ID of the tee time to cancel
 */
async function cancelTeeTime(teeTimeId) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/cancel-tee-time`, {
            method: 'POST',
            body: JSON.stringify({ teeTimeId })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to cancel tee time');
        }

        const result = await response.json();
        showNotification(result.message, 'success');

        // Refresh tee times data
        await fetchTeeTimes();
        renderTeeTimes();

    } catch (error) {
        console.error('Error cancelling tee time:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

/**
 * Render equipment rental section
 */
function renderEquipmentSection() {
    const equipmentTabContent = document.querySelector('.equipment-tab-content');

    if (!equipmentTabContent) return;

    // Set up the tabs functionality
    const tabBtns = document.querySelectorAll('.equipment-tabs .tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons
            tabBtns.forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Show the corresponding tab content
            const tabName = btn.getAttribute('data-tab');
            renderEquipmentTabContent(tabName);
        });
    });

    // Render initial tab (available equipment)
    renderEquipmentTabContent('available-equipment');

    /**
     * Render the content for a specific equipment tab
     * @param {string} tabName - The name of the tab to render
     */
    function renderEquipmentTabContent(tabName) {
        if (!equipmentTabContent) return;

        let content = '';

        switch (tabName) {
            case 'available-equipment':
                content = renderAvailableEquipment();
                break;
            case 'my-rentals':
                content = renderMyRentals();
                break;
        }

        equipmentTabContent.innerHTML = content;
    }

    /**
     * Render available equipment
     * @returns {string} HTML content for available equipment
     */
    function renderAvailableEquipment() {
        if (!availableEquipment || availableEquipment.length === 0) {
            return `
                <div class="no-data">
                    <p>No equipment is currently available.</p>
                </div>
            `;
        }

        let html = `
            <div class="tab-content-header">Available Equipment</div>
            <div class="equipment-list">
        `;

        availableEquipment.forEach(equipment => {
            html += `
                <div class="equipment-card">
                    <div class="equipment-info">
                        <div class="equipment-type">${equipment.Type}</div>
                        <div class="equipment-fee">$${equipment.Rental_fee ? equipment.Rental_fee.toFixed(2) : '0.00'} per rental</div>
                        <div class="equipment-availability">Available: ${equipment.available}</div>
                    </div>
                    <div class="equipment-actions">
                        <button class="btn btn-sm btn-primary rent-btn" data-type="${equipment.Type}"
                            ${equipment.available <= 0 ? 'disabled' : ''}>
                            <i class="fas fa-shopping-cart"></i> Rent
                        </button>
                    </div>
                </div>
            `;
        });

        html += `</div>`;

        // Add event listeners after a short delay to ensure DOM is ready
        setTimeout(() => {
            const rentButtons = document.querySelectorAll('.rent-btn');
            rentButtons.forEach(btn => {
                const equipmentType = btn.getAttribute('data-type');
                btn.addEventListener('click', () => rentEquipment(equipmentType));
            });
        }, 0);

        return html;
    }

    /**
     * Render my equipment rentals
     * @returns {string} HTML content for my equipment rentals
     */
    function renderMyRentals() {
        if (!memberEquipment || memberEquipment.length === 0) {
            return `
                <div class="no-data">
                    <p>You don't have any equipment rentals.</p>
                </div>
            `;
        }

        let html = `
            <div class="tab-content-header">Your Equipment Rentals</div>
            <div class="rental-list">
        `;

        memberEquipment.forEach(rental => {
            const rentalDate = rental.Rental_date ? new Date(rental.Rental_date).toLocaleDateString() : 'N/A';
            const returnDate = rental.Return_date ? new Date(rental.Return_date).toLocaleDateString() : 'N/A';
            const isReturned = rental.Returned ? 'Returned' : 'Active';
            const statusClass = rental.Returned ? 'rental-returned' : 'rental-active';

            html += `
                <div class="rental-card ${statusClass}">
                    <div class="rental-info">
                        <div class="rental-type">${rental.Type}</div>
                        <div class="rental-dates">
                            <span>Rented: ${rentalDate}</span>
                            <span>Return by: ${returnDate}</span>
                        </div>
                        <div class="rental-status">${isReturned}</div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }
}

/**
 * Rent equipment
 * @param {string} type - Equipment type
 */
async function rentEquipment(type) {
    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/member/rent-equipment`, {
            method: 'POST',
            body: JSON.stringify({
                items: [{ type, quantity: 1 }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to rent equipment');
        }

        const result = await response.json();
        showNotification(result.message, 'success');

        // Refresh equipment data
        await fetchEquipmentData();
        renderEquipmentSection();

        // Switch to the my rentals tab
        const myRentalsTab = document.querySelector('.equipment-tabs .tab-btn[data-tab="my-rentals"]');
        if (myRentalsTab) {
            myRentalsTab.click();
        }

    } catch (error) {
        console.error('Error renting equipment:', error);
        showNotification(`Error: ${error.message}`, 'error');
    }
}

// Export functions and variables for use in other modules
export {
    memberProfile,
    memberPlans,
    memberTeeTimes,
    availableEquipment,
    memberEquipment,
    selectedEquipment,
    showMemberView,
    refreshMemberData,
    fetchMemberProfile,
    fetchMembershipPlans,
    fetchTeeTimes,
    fetchEquipmentData,
    renderMemberProfile,
    renderMembershipPlan,
    renderTeeTimes,
    renderEquipmentSection,
    openProfileEditModal,
    handleProfileSave,
    openPlanChangeModal,
    handlePlanChange,
    searchAvailableTeeTimes,
    bookTeeTime,
    cancelTeeTime,
    rentEquipment
}; 