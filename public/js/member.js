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
let currentEquipmentTab = 'available';

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
        memberTeeTimes = teeTimes.upcoming;
        availableTeeTimes = teeTimes.available;
        availableEquipment = equipment.available;
        memberRentals = equipment.rentals;

        // Render all sections
        renderMemberProfile();
        renderMembershipPlan();
        renderTeeTimes('upcoming');
        renderEquipment(currentEquipmentTab);

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
    const profile = await response.json();
    memberProfile = profile;
    return profile;
  }
/**
 * Fetch membership plan
 */
async function fetchMembershipPlan() {
    try {
        const response = await authenticatedFetch(`${MEMBER_API}/profile`);
        if (!response.ok) throw new Error('Failed to fetch membership profile data');

        const profile = await response.json();

        // Map backend fields to frontend-friendly structure
        return {
            name: profile.planType || 'No Plan Selected',
            type: profile.planType || 'Regular',
            status: profile.planType ? 'Active' : 'Inactive',
            startDate: profile.joinDate || new Date().toISOString(),
            renewalDate: new Date(new Date(profile.joinDate).setFullYear(new Date(profile.joinDate).getFullYear() + 1)).toISOString(),
            fee: profile.planFees || 0,
            benefits: profile.rentalDiscount
                ? [`${(profile.rentalDiscount * 100).toFixed(0)}% Rental Discount`]
                : ['Basic course access']
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
    const { firstName, lastName, email, phone, joinDate } = memberProfile;
    const profileContent = document.getElementById('member-profile-content');
    profileContent.innerHTML = `
      <div class="profile-info">
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email || 'Not provided'}</p>
        <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
        <p><strong>Member Since:</strong> ${new Date(joinDate).toLocaleDateString()}</p>
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
    let fee = parseFloat(membershipPlan.fee);
    if (isNaN(fee)) fee = 0;
    fee = fee.toFixed(2);
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
                            const type = equipment.Type || 'Equipment';
                            let fee = equipment.Rental_fee;
                            if (typeof fee !== 'number') fee = parseFloat(fee);
                            if (isNaN(fee)) fee = 0;
                            const available = equipment.available || 0;
                            return `
                                <div class="equipment-card">
                                    <div class="equipment-info">
                                        <h4>${type}</h4>
                                        <p>Rental Fee: $${fee.toFixed(2)}</p>
                                        <p>Available: ${available}</p>
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
                            console.log('Rendering rental:', rental);
                            const type = rental.Type || 'Equipment';
                            const rentalDate = rental.Rental_date ? new Date(rental.Rental_date).toLocaleDateString() : 'N/A';
                            const returnDate = rental.Return_date ? new Date(rental.Return_date).toLocaleDateString() : 'N/A';
                            const returned = rental.Returned ? 'Yes' : 'No';
                            return `
                                <div class="equipment-card">
                                    <div class="equipment-info">
                                        <h4>${type}</h4>
                                        <p>Rental Date: ${rentalDate}</p>
                                        <p>Return Date: ${returnDate}</p>
                                        <p>Returned: ${returned}</p>
                                    </div>
                                    ${!rental.Returned ? `
                                    <div class="equipment-actions">
                                        <button class="btn btn-sm btn-warning return-equipment" data-id="${rental.Rental_id}">
                                            <i class="fas fa-undo"></i> Return
                                        </button>
                                    </div>
                                    ` : ''}
                                </div>`;
                        }).join('')}
                    </div>
                `;
            }
            break;
    }

    equipmentTabContent.innerHTML = content;

    if (tab === 'my-rentals') {
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
      const res = await authenticatedFetch(`${MEMBER_API}/book-tee-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teeTimeId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Booking failed');
      }
      showNotification('Tee time booked!', 'success');
      await loadMemberData();
    } catch (e) {
      console.error(e);
      showNotification(e.message, 'error');
    }
  }

/**
 * Cancel a tee time
 */
async function cancelTeeTime(teeTimeId) {
    try {
      const res = await authenticatedFetch(`${MEMBER_API}/cancel-tee-time`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teeTimeId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Cancel failed');
      }
      showNotification('Tee time cancelled!', 'success');
      await loadMemberData();
    } catch (e) {
      console.error(e);
      showNotification(e.message, 'error');
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
        btn.addEventListener('click', async () => {
            // Map tab names to match renderEquipment cases
            if (btn.dataset.tab === 'available-equipment') {
                currentEquipmentTab = 'available';
            } else if (btn.dataset.tab === 'my-rentals') {
                currentEquipmentTab = 'my-rentals';
            } else {
                currentEquipmentTab = btn.dataset.tab;
            }
            await loadMemberData();
        });
    });

    // Refresh data button
    document.getElementById('refresh-member-data-btn')?.addEventListener('click', loadMemberData);
}

// edit profile
function openProfileEditModal() {
    console.log('🔔 openProfileEditModal() called, memberProfile=', memberProfile);
    if (!memberProfile) return;
  
    const modal = document.getElementById('profile-edit-modal');
    const form  = document.getElementById('profile-edit-form');
    if (!modal || !form) return;
  
    // Format the joinDate nicely
    const since = memberProfile.joinDate
      ? new Date(memberProfile.joinDate).toLocaleDateString()
      : '';
  
    // Populate the form
    form.innerHTML = `
      <div class="form-group">
        <label for="profile-firstName">First Name</label>
        <input type="text" id="profile-firstName" name="firstName" class="form-control"
               value="${memberProfile.firstName || ''}" required />
      </div>
      <div class="form-group">
        <label for="profile-lastName">Last Name</label>
        <input type="text" id="profile-lastName" name="lastName" class="form-control"
               value="${memberProfile.lastName || ''}" required />
      </div>
      <div class="form-group">
        <label for="profile-email">Email</label>
        <input type="email" id="profile-email" name="email" class="form-control"
               value="${memberProfile.email || ''}" />
      </div>
      <div class="form-group">
        <label for="profile-phone">Phone</label>
        <input type="tel" id="profile-phone" name="phone" class="form-control"
               value="${memberProfile.phone || ''}" />
      </div>
    `;
  
    // Show the modal
    modal.style.display = 'block';
  
    // Close handlers
    document.getElementById('close-profile-modal')
      .onclick = () => modal.style.display = 'none';
    document.getElementById('cancel-profile-edit-btn')
      .onclick = () => modal.style.display = 'none';
  
    // Save handler
    const saveBtn = document.getElementById('save-profile-btn');
    saveBtn.onclick = handleProfileSave;
  }
  
  // save profile
  async function handleProfileSave() {
    const form  = document.getElementById('profile-edit-form');
    const modal = document.getElementById('profile-edit-modal');
    if (!form) return;
  
    // Build the payload with camelCase keys
    const payload = {
      firstName: form.elements['firstName'].value.trim(),
      lastName:  form.elements['lastName'].value.trim(),
      email:     form.elements['email'].value.trim(),
      phone:     form.elements['phone'].value.trim(),
    };
  
    try {
      const res = await authenticatedFetch(`${MEMBER_API}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update profile');
      }
  
      showNotification('Profile updated successfully!', 'success');
      modal.style.display = 'none';
      // Re-fetch and re-render your profile view
      await loadMemberData();
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification(error.message, 'error');
    }
  }
  
// book tee time modal
async function openBookTeeTimeModal() {
    const modal = document.getElementById('tee-time-modal');
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Book Tee Time</h2>
          <span class="close">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="book-date">Select Date</label>
            <input type="date" id="book-date" class="form-control" />
            <button id="load-tee-times-btn" class="btn btn-sm btn-primary" style="margin-left:8px;">
              Load
            </button>
          </div>
          <div id="available-tee-times-list" style="margin-top:1rem;"></div>
        </div>
        <div class="modal-footer">
          <button id="cancel-booking-btn" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    `;
    modal.style.display = 'block';
  
    // close handlers
    modal.querySelector('.close').onclick = () => modal.style.display = 'none';
    document.getElementById('cancel-booking-btn').onclick = () => modal.style.display = 'none';
  
    // hook up the Load button
    document.getElementById('load-tee-times-btn').onclick = loadAvailableTeeTimes;
  }
  
  // load tee times
  async function loadAvailableTeeTimes() {
    const date = document.getElementById('book-date').value;
    if (!date) {
      showNotification('Please pick a date first.', 'warning');
      return;
    }
  
    let times;
    try {
      const resp = await authenticatedFetch(`${MEMBER_API}/available-tee-times?date=${date}`);
      if (!resp.ok) throw await resp.json();
      times = await resp.json();
    } catch (err) {
      console.error(err);
      showNotification(err.error || 'Failed to load tee times', 'error');
      return;
    }
  
    const list = document.getElementById('available-tee-times-list');
    if (times.length === 0) {
      list.innerHTML = '<p>No available slots on that date.</p>';
      return;
    }
  
    list.innerHTML = times.map(tt => `
      <div class="tee-time-card">
        <div class="tee-time-info">
          <h4>${new Date(tt.Date).toLocaleDateString()} @ ${tt.Time}</h4>
          <p><strong>Course:</strong> ${tt.Course_name}</p>
          <p><strong>Slots:</strong> ${tt.Available_slots}</p>
        </div>
        <button class="btn btn-sm btn-success book-btn" data-id="${tt.Tee_time_id}">
          <i class="fas fa-check"></i> Book
        </button>
      </div>
    `).join('');
  
    // attach booking handlers
    list.querySelectorAll('.book-btn').forEach(btn => {
        btn.onclick = () => bookTeeTime(btn.dataset.id)
          .then(() => document.getElementById('tee-time-modal').style.display = 'none');
      });
  }
  
// rent equipment modal
function openRentEquipmentModal() {
    // Remove any existing modal
    let modal = document.getElementById('rentEquipmentModal');
    if (modal) modal.remove();

    // Debug log
    console.log('Available equipment for modal:', availableEquipment);

    // Create modal
    modal = document.createElement('div');
    modal.id = 'rentEquipmentModal';
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Rent Equipment</h3>
                <span class="close" id="closeRentEquipmentModal">&times;</span>
            </div>
            <div class="modal-body">
                <div id="rent-equipment-error" class="error-message" style="display:none;color:red;"></div>
                <form id="rent-equipment-form">
                    <div class="equipment-list">
                        ${availableEquipment && availableEquipment.length > 0 ? availableEquipment.map(eq => {
                            let fee = eq.Rental_fee;
                            if (typeof fee !== 'number') fee = parseFloat(fee);
                            if (isNaN(fee)) fee = 0;
                            return `
                                <div class="equipment-item">
                                    <div class="equipment-item-info">
                                        <strong>${eq.Type}</strong><br>
                                        Rental Fee: $${fee.toFixed(2)}<br>
                                        Available: ${eq.available}
                                    </div>
                                    <div class="equipment-item-action">
                                        <input type="number" min="0" max="${eq.available}" value="0" data-type="${eq.Type}" class="quantity-input" style="width:60px;">
                                    </div>
                                </div>
                            `;
                        }).join('') : '<p>No equipment available for rent.</p>'}
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" id="cancelRentEquipment">Cancel</button>
                <button class="btn btn-primary" id="submitRentEquipment">Rent Selected</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Close modal handlers
    document.getElementById('closeRentEquipmentModal').onclick = () => modal.remove();
    document.getElementById('cancelRentEquipment').onclick = (e) => { e.preventDefault(); modal.remove(); };
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    // Submit rental
    document.getElementById('submitRentEquipment').onclick = async (e) => {
        e.preventDefault();
        const errorDiv = document.getElementById('rent-equipment-error');
        errorDiv.style.display = 'none';
        const items = [];
        document.querySelectorAll('.quantity-input').forEach(input => {
            const qty = parseInt(input.value);
            if (qty > 0) {
                items.push({ type: input.dataset.type, quantity: qty });
            }
        });
        if (items.length === 0) {
            errorDiv.textContent = 'Please select at least one equipment to rent.';
            errorDiv.style.display = 'block';
            return;
        }
        try {
            const response = await authenticatedFetch(`${MEMBER_API}/rent-equipment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items })
            });
            if (response.ok) {
                showNotification('Equipment rented successfully!', 'success');
                modal.remove();
                await loadMemberData();
            } else {
                const error = await response.json();
                errorDiv.textContent = error.error || 'Failed to rent equipment.';
                errorDiv.style.display = 'block';
            }
        } catch (err) {
            errorDiv.textContent = 'Error renting equipment. Please try again.';
            errorDiv.style.display = 'block';
        }
    };
}

// Export functions
export {
    openProfileEditModal,
    handleProfileSave,
    fetchMemberProfile,
    loadMemberData,
    setupMemberEventListeners,
    openBookTeeTimeModal,
    bookTeeTime,
    cancelTeeTime
}; 