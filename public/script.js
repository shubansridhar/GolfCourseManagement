// DOM Elements
const dashboardView = document.getElementById('dashboard-view');
const tableView = document.getElementById('table-view');
const dashboardContainer = document.getElementById('dashboard-container');
const selectedTableHeader = document.getElementById('selected-table');
const addRecordBtn = document.getElementById('add-record-btn');
const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
// Keep modal, form, notification elements as they were
const dataTableContainer = tableView.querySelector('.table-container'); // Target container within table view
const addRecordModal = document.getElementById('add-record-modal');
const addRecordForm = document.getElementById('add-record-form');
const modalTitle = document.getElementById('modal-title');
const closeModal = document.querySelector('.close');
const submitRecordBtn = document.getElementById('submit-record');
const cancelRecordBtn = document.getElementById('cancel-record');
const notification = document.getElementById('notification');
const notificationMessage = document.getElementById('notification-message');

// State variables
let currentTable = null;
let tableStructure = [];
let tableData = [];
let allTables = []; // Store fetched table names

// --- View Management Functions ---
function showDashboardView() {
    dashboardView.style.display = 'block';
    tableView.style.display = 'none';
    selectedTableHeader.textContent = 'Select a table'; // Reset header
    addRecordBtn.disabled = true; // Disable button when on dashboard
    currentTable = null; // Reset current table
}

function showTableView() {
    dashboardView.style.display = 'none';
    tableView.style.display = 'block';
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    showDashboardView(); // Start on dashboard
    dashboardContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>'; // Show loading indicator

    try {
        const response = await fetch('/api/tables'); // Assuming this endpoint returns an array of table names like ['EMPLOYEE', 'GOLF_COURSE', ...]

        if (response.status === 503) {
            const data = await response.json();
            showDatabaseConnectionError(data.message || "Database connection is not available");
            return;
        }

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to fetch tables');
        }

        allTables = await response.json();
        populateDashboard(allTables);
    } catch (error) {
        console.error("Error initializing app:", error);
        dashboardContainer.innerHTML = `<div class="error-container"><p><i class="fas fa-exclamation-triangle"></i> Error fetching tables: ${error.message}</p><button id="retry-connection" class="btn btn-primary"><i class="fas fa-sync"></i> Retry</button></div>`;
        document.getElementById('retry-connection')?.addEventListener('click', initApp);
        showNotification(`Error initializing: ${error.message}`, 'error');
    }
}

// --- Dashboard Population ---
function populateDashboard(tables) {
    dashboardContainer.innerHTML = ''; // Clear loading/error message

    if (tables.length === 0) {
        dashboardContainer.innerHTML = '<p class="no-data">No tables found in the database.</p>';
        return;
    }

    // Function to get an appropriate icon (customize as needed)
    function getIconForTable(tableName) {
        const lowerName = tableName.toLowerCase();
        if (lowerName.includes('employee') || lowerName.includes('user')) return 'fa-users';
        if (lowerName.includes('golf') || lowerName.includes('course')) return 'fa-golf-ball-tee'; // Updated Font Awesome 6 icon
        if (lowerName.includes('equipment')) return 'fa-wrench';
        if (lowerName.includes('booking') || lowerName.includes('reserv')) return 'fa-calendar-check';
        if (lowerName.includes('member')) return 'fa-id-card';
        if (lowerName.includes('report')) return 'fa-chart-line';
        if (lowerName.includes('player')) return 'fa-person-running'; // Example
        // Add more specific icons based on your table names
        return 'fa-table'; // Default icon
    }

    tables.forEach(tableName => {
        const card = document.createElement('div');
        card.classList.add('table-card');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0'); // Make it focusable

        const iconClass = getIconForTable(tableName);
        card.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${tableName.replace(/_/g, ' ')}</span>
        `; // Replace underscores for readability

        card.addEventListener('click', () => navigateToTable(tableName));
        card.addEventListener('keypress', (e) => { // Accessibility: allow activation with Enter key
            if (e.key === 'Enter') {
                navigateToTable(tableName);
            }
        });

        dashboardContainer.appendChild(card);
    });
}

// --- Navigation ---
function navigateToTable(tableName) {
    showTableView();
    selectTable(tableName);
}

// Add event listener for the back button
backToDashboardBtn.addEventListener('click', showDashboardView);

// --- Database Connection Error ---
function showDatabaseConnectionError(message) {
    dashboardContainer.innerHTML = `
        <div class="error-container">
            <div class="error-icon"><i class="fas fa-database"></i></div>
            <h3>Cannot Connect to Database</h3>
            <p>${message}</p>
            <p>Please check your server and database connection.</p>
            <button id="retry-connection" class="btn btn-primary">
                <i class="fas fa-sync"></i> Retry Connection
            </button>
        </div>
    `;
    document.getElementById('retry-connection')?.addEventListener('click', initApp);
}

// --- Table Selection and Rendering (Mostly unchanged, but ensure it targets correct container) ---
async function selectTable(tableName) {
    // Clear previous table data and show loading state
    dataTableContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading data...</div>';
    selectedTableHeader.textContent = `Loading ${tableName.replace(/_/g, ' ')}...`;
    addRecordBtn.disabled = true; // Disable while loading
    currentTable = tableName;

    try {
        // Fetch table structure
        const structureResponse = await fetch(`/api/tables/${tableName}/structure`);
        if (!structureResponse.ok) {
            const errorData = await structureResponse.json();
            throw new Error(errorData.error || `Failed to fetch structure for ${tableName}`);
        }
        tableStructure = await structureResponse.json();

        // Fetch table data
        const dataResponse = await fetch(`/api/tables/${tableName}`);
        if (!dataResponse.ok) {
            const errorData = await dataResponse.json();
            throw new Error(errorData.error || `Failed to fetch data for ${tableName}`);
        }
        tableData = await dataResponse.json();

        // Update header and enable add button
        selectedTableHeader.textContent = tableName.replace(/_/g, ' ');
        addRecordBtn.disabled = false;

        // Update table display
        renderTable();

    } catch (error) {
        console.error(`Error selecting table ${tableName}:`, error);
        dataTableContainer.innerHTML = `
            <div class="error-container">
                <p><i class="fas fa-exclamation-triangle"></i> Failed to load data for ${tableName}: ${error.message}</p>
                <button id="retry-table" class="btn btn-primary">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;
        document.getElementById('retry-table')?.addEventListener('click', () => selectTable(tableName));
        selectedTableHeader.textContent = `Error loading ${tableName.replace(/_/g, ' ')}`;
        showNotification(`Error loading ${tableName}: ${error.message}`, 'error');
    }
}

function renderTable() {
    // Clear existing table and recreate structure
    dataTableContainer.innerHTML = `
        <table id="data-table">
            <thead><tr></tr></thead>
            <tbody></tbody>
        </table>
    `;
    const dataTable = dataTableContainer.querySelector('#data-table'); // Ensure we select the new table
    const tableHead = dataTable.querySelector('thead tr');
    const tableBody = dataTable.querySelector('tbody');

    // Add table headers (unchanged)
    tableStructure.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.Field;
        tableHead.appendChild(th);
    });
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Actions';
    actionsHeader.classList.add('action-column');
    tableHead.appendChild(actionsHeader);

    // Add table data (unchanged logic, just ensure it targets tableBody)
    if (tableData.length === 0) {
        const noDataRow = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = tableStructure.length + 1;
        noDataCell.textContent = 'No data available';
        noDataCell.classList.add('no-data');
        noDataRow.appendChild(noDataCell);
        tableBody.appendChild(noDataRow);
        return;
    }

    tableData.forEach(row => {
        const tr = document.createElement('tr');
        tableStructure.forEach(column => {
            const td = document.createElement('td');
            // Format date/datetime columns if needed (example)
            let value = row[column.Field];
             if (value !== null) {
                if (column.Type.includes('datetime') || column.Type.includes('timestamp')) {
                    try { value = new Date(value).toLocaleString(); } catch (e) { /* ignore parsing error */ }
                } else if (column.Type.includes('date')) {
                     try { value = new Date(value).toLocaleDateString(); } catch (e) { /* ignore parsing error */ }
                }
            }
            td.textContent = value !== null ? value : '';
            // You could add data attributes here like data-field="${column.Field}"
            tr.appendChild(td);
        });

        // Add action buttons (unchanged logic)
        const actionsTd = document.createElement('td');
        actionsTd.classList.add('action-column');

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.classList.add('action-btn', 'delete');
        deleteBtn.title = 'Delete Record';

        const primaryKeyColumn = tableStructure.find(col => col.Key === 'PRI');
        // More robust primary key finding (handle cases with no PRI flag or composite keys if necessary)
        // For now, assumes simple single primary key, potentially named 'id' or '[tableName]_id' if not flagged
        let primaryKeyName = primaryKeyColumn ? primaryKeyColumn.Field : null;
        if (!primaryKeyName) {
             // Fallback: Look for common patterns like 'id' or 'table_name_id'
            const potentialPK = tableStructure.find(col => col.Field.toLowerCase() === 'id' || col.Field.toLowerCase() === `${currentTable.toLowerCase()}_id`);
            if (potentialPK) primaryKeyName = potentialPK.Field;
            else primaryKeyName = tableStructure[0]?.Field; // Last resort: use the first column (might be wrong!)
        }

        if (primaryKeyName && row[primaryKeyName] !== undefined) {
             const primaryKeyValue = row[primaryKeyName];
             deleteBtn.addEventListener('click', (e) => {
                 e.stopPropagation(); // Prevent row click if applicable
                 deleteRecord(primaryKeyValue, primaryKeyName);
             });
             actionsTd.appendChild(deleteBtn);
        } else {
            // Cannot determine primary key for deletion reliably
            deleteBtn.disabled = true;
            deleteBtn.title = 'Cannot determine primary key for deletion';
             actionsTd.appendChild(deleteBtn);
            console.warn(`Could not reliably determine primary key for table ${currentTable} to delete row:`, row);
        }

        tr.appendChild(actionsTd);
        tableBody.appendChild(tr);
    });
}


// --- Modal and Form Handling (Mostly unchanged) ---

// Open the add record modal
addRecordBtn.addEventListener('click', () => {
    modalTitle.textContent = `Add Record to ${currentTable.replace(/_/g, ' ')}`;
    addRecordForm.innerHTML = ''; // Clear previous form

    tableStructure.forEach(column => {
        if (column.Extra === 'auto_increment') { // Skip auto-increment columns
            return;
        }

        const formGroup = document.createElement('div');
        formGroup.classList.add('form-group');

        const label = document.createElement('label');
        label.setAttribute('for', `field-${column.Field}`); // Prefix id to avoid conflicts
        label.textContent = column.Field;

        const input = document.createElement('input');
        input.setAttribute('id', `field-${column.Field}`);
        input.setAttribute('name', column.Field);

        // Determine input type based on column type
        if (column.Type.includes('int')) {
            input.setAttribute('type', 'number');
        } else if (column.Type.includes('date') && !column.Type.includes('datetime')) {
            input.setAttribute('type', 'date');
         } else if (column.Type.includes('time') && !column.Type.includes('datetime')) {
             input.setAttribute('type', 'time');
             input.step = '1'; // Allow seconds if needed
         } else if (column.Type.includes('datetime') || column.Type.includes('timestamp')) {
            input.setAttribute('type', 'datetime-local');
            input.step = '1'; // Allow seconds if needed
        } else if (column.Type.includes('text')) {
             // Use textarea for TEXT types
            const textarea = document.createElement('textarea');
            textarea.setAttribute('id', `field-${column.Field}`);
            textarea.setAttribute('name', column.Field);
            textarea.rows = 3; // Default rows
            if (column.Null === 'NO' && column.Default === null) {
                textarea.setAttribute('required', 'true');
            }
             formGroup.appendChild(label);
            formGroup.appendChild(textarea);
            addRecordForm.appendChild(formGroup);
            return; // Skip adding the default input
        } else { // Default to text (covers VARCHAR, etc.)
            input.setAttribute('type', 'text');
            // Set max length for VARCHAR if available
            const match = column.Type.match(/varchar\((\d+)\)/i);
            if (match && match[1]) {
                input.setAttribute('maxlength', match[1]);
            }
        }

        // Set required attribute if applicable (not nullable, no default value)
        if (column.Null === 'NO' && column.Default === null) {
            input.setAttribute('required', 'true');
        }

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        addRecordForm.appendChild(formGroup);
    });

    addRecordModal.style.display = 'block';
});

// Close the modal (unchanged)
closeModal.addEventListener('click', () => { addRecordModal.style.display = 'none'; });
cancelRecordBtn.addEventListener('click', () => { addRecordModal.style.display = 'none'; });
window.addEventListener('click', (event) => {
    if (event.target === addRecordModal) {
        addRecordModal.style.display = 'none';
    }
});

// Submit the form (unchanged)
submitRecordBtn.addEventListener('click', async () => {
    const form = document.getElementById('add-record-form');
    if (!form.checkValidity()) {
        showNotification('Please fill out all required fields correctly.', 'error');
        form.reportValidity(); // Highlight invalid fields
        return;
    }

    const formData = {};
    const formElements = form.elements;

    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        if (element.name) {
            // Handle empty strings for optional fields - send null or omit? Depends on backend.
            // Sending empty string '' might be preferred over null for text fields by some backends.
            // Sending null for empty optional numbers might be necessary.
             if (element.type === 'number' && element.value === '' && !element.required) {
                 formData[element.name] = null; // Or omit if backend handles it
             } else {
                formData[element.name] = element.value;
             }
        }
    }

    console.log("Submitting:", formData); // Debugging

    try {
        const response = await fetch(`/api/tables/${currentTable}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Server error: ${response.status}`);
        }

        addRecordModal.style.display = 'none';
        showNotification('Record added successfully!', 'success');
        selectTable(currentTable); // Refresh table data
    } catch (error) {
        console.error("Error adding record:", error);
        showNotification(`Failed to add record: ${error.message}`, 'error');
    }
});


// --- Deletion (Modified to accept primaryKeyName) ---
async function deleteRecord(id, primaryKeyName) {
     if (!primaryKeyName) {
         showNotification('Cannot delete record: Primary key name is missing.', 'error');
         return;
     }
     if (!confirm(`Are you sure you want to delete this record (ID: ${id}) from ${currentTable.replace(/_/g, ' ')}?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/tables/${currentTable}/${id}?primaryKey=${encodeURIComponent(primaryKeyName)}`, {
            method: 'DELETE'
        });

        const result = await response.json(); // Try to parse JSON even for errors

        if (!response.ok) {
            throw new Error(result.error || `Failed to delete record. Status: ${response.status}`);
        }

        showNotification('Record deleted successfully!', 'success');
        selectTable(currentTable); // Refresh table data
    } catch (error) {
         console.error("Error deleting record:", error);
        showNotification(`Error deleting record: ${error.message}`, 'error');
    }
}

// --- Notification (Unchanged) ---
function showNotification(message, type = 'info') { // Default to 'info'
    notificationMessage.textContent = message;
    // Reset classes: remove previous type classes
    notification.className = 'notification';
    // Add 'show' and the new type class
    setTimeout(() => { // Timeout ensures repaint before adding classes for animation
        notification.classList.add('show', type);
    }, 10);


    // Auto-hide after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        // Optionally remove type class after fade out animation completes
        // setTimeout(() => notification.classList.remove(type), 500);
    }, 3000);
}

// Add styles for notification types if not already present in CSS
/*
.notification.info { background-color: #17a2b8; } // Example info color
.notification.success { background-color: #28a745; }
.notification.error { background-color: #dc3545; }
.notification.warning { background-color: #ffc107; color: #333; } // Example warning
*/