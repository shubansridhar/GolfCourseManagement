// DOM Elements
const tableList = document.getElementById('table-list');
const selectedTableHeader = document.getElementById('selected-table');
const addRecordBtn = document.getElementById('add-record-btn');
const dataTable = document.getElementById('data-table');
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

// Initialize the application
document.addEventListener('DOMContentLoaded', initApp);

// Fetch all tables from the database
async function initApp() {
    try {
        const response = await fetch('/api/tables');

        if (response.status === 503) {
            const data = await response.json();
            showDatabaseError(data.message || "Database connection is not available");
            return;
        }

        if (!response.ok) throw new Error('Failed to fetch tables');

        const tables = await response.json();
        populateTableList(tables);
    } catch (error) {
        console.error("Error initializing app:", error);
        showNotification(error.message, 'error');
    }
}

// Show database connection error
function showDatabaseError(message) {
    // Clear table list and add message
    tableList.innerHTML = '';
    const errorItem = document.createElement('li');
    errorItem.classList.add('error');
    errorItem.textContent = "Database Error";
    tableList.appendChild(errorItem);

    // Add message to main content
    selectedTableHeader.textContent = "Database Connection Error";
    const tableContainer = document.querySelector('.table-container');
    tableContainer.innerHTML = `
        <div class="error-container">
            <div class="error-icon"><i class="fas fa-database"></i></div>
            <h3>Cannot Connect to Database</h3>
            <p>${message}</p>
            <p>Please check your MySQL connection and make sure the database is created.</p>
            <button id="retry-connection" class="btn btn-primary">
                <i class="fas fa-sync"></i> Retry Connection
            </button>
        </div>
    `;

    // Add retry button functionality
    document.getElementById('retry-connection').addEventListener('click', initApp);

    // Disable add record button
    addRecordBtn.disabled = true;
}

// Populate the sidebar with table names
function populateTableList(tables) {
    tableList.innerHTML = '';

    if (tables.length === 0) {
        const emptyItem = document.createElement('li');
        emptyItem.textContent = "No tables found";
        tableList.appendChild(emptyItem);
        return;
    }

    tables.forEach(table => {
        const li = document.createElement('li');
        li.textContent = table;
        li.addEventListener('click', () => selectTable(table));
        tableList.appendChild(li);
    });
}

// Handle table selection
async function selectTable(tableName) {
    // Update UI
    document.querySelectorAll('#table-list li').forEach(item => {
        item.classList.remove('active');
    });

    document.querySelector(`#table-list li:nth-child(${Array.from(tableList.children).findIndex(item => item.textContent === tableName) + 1})`).classList.add('active');

    selectedTableHeader.textContent = tableName;
    addRecordBtn.disabled = false;
    currentTable = tableName;

    try {
        // Show loading state
        const tableContainer = document.querySelector('.table-container');
        tableContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading data...</div>';

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

        // Update table display
        renderTable();
    } catch (error) {
        console.error("Error selecting table:", error);
        showNotification(error.message, 'error');

        // Show error in table container
        const tableContainer = document.querySelector('.table-container');
        tableContainer.innerHTML = `
            <div class="error-container">
                <p><i class="fas fa-exclamation-triangle"></i> ${error.message}</p>
                <button id="retry-table" class="btn btn-primary">
                    <i class="fas fa-sync"></i> Retry
                </button>
            </div>
        `;

        // Add retry button functionality
        document.getElementById('retry-table').addEventListener('click', () => selectTable(tableName));
    }
}

// Render the data table
function renderTable() {
    // Clear existing table
    const tableContainer = document.querySelector('.table-container');
    tableContainer.innerHTML = `
        <table id="data-table">
            <thead>
                <tr></tr>
            </thead>
            <tbody></tbody>
        </table>
    `;

    const dataTable = document.getElementById('data-table');
    const tableHead = dataTable.querySelector('thead tr');
    const tableBody = dataTable.querySelector('tbody');

    // Add table headers
    tableStructure.forEach(column => {
        const th = document.createElement('th');
        th.textContent = column.Field;
        tableHead.appendChild(th);
    });

    // Add actions column
    const actionsHeader = document.createElement('th');
    actionsHeader.textContent = 'Actions';
    actionsHeader.classList.add('action-column');
    tableHead.appendChild(actionsHeader);

    if (tableData.length === 0) {
        // Show no data message
        const noDataRow = document.createElement('tr');
        const noDataCell = document.createElement('td');
        noDataCell.colSpan = tableStructure.length + 1;
        noDataCell.textContent = 'No data available';
        noDataCell.classList.add('no-data');
        noDataRow.appendChild(noDataCell);
        tableBody.appendChild(noDataRow);
        return;
    }

    // Add table data
    tableData.forEach(row => {
        const tr = document.createElement('tr');

        tableStructure.forEach(column => {
            const td = document.createElement('td');
            td.textContent = row[column.Field] !== null ? row[column.Field] : '';
            tr.appendChild(td);
        });

        // Add action buttons
        const actionsTd = document.createElement('td');
        actionsTd.classList.add('action-column');

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
        deleteBtn.classList.add('action-btn', 'delete');
        deleteBtn.title = 'Delete Record';

        // Get primary key column and value
        const primaryKeyColumn = tableStructure.find(col => col.Key === 'PRI');
        const primaryKeyName = primaryKeyColumn ? primaryKeyColumn.Field : `${currentTable}_id`;
        const primaryKeyValue = row[primaryKeyName];

        deleteBtn.addEventListener('click', () => deleteRecord(primaryKeyValue));

        actionsTd.appendChild(deleteBtn);
        tr.appendChild(actionsTd);

        tableBody.appendChild(tr);
    });
}

// Open the add record modal
addRecordBtn.addEventListener('click', () => {
    modalTitle.textContent = `Add Record to ${currentTable}`;

    // Clear the form
    addRecordForm.innerHTML = '';

    // Create form fields based on table structure
    tableStructure.forEach(column => {
        // Skip auto-increment primary keys for insert
        if (column.Extra === 'auto_increment' && column.Key === 'PRI') {
            return;
        }

        const formGroup = document.createElement('div');
        formGroup.classList.add('form-group');

        const label = document.createElement('label');
        label.setAttribute('for', column.Field);
        label.textContent = column.Field;

        const input = document.createElement('input');
        input.setAttribute('id', column.Field);
        input.setAttribute('name', column.Field);

        // Determine input type based on column type
        if (column.Type.includes('int')) {
            input.setAttribute('type', 'number');
        } else if (column.Type.includes('date')) {
            input.setAttribute('type', 'date');
        } else if (column.Type.includes('time') && !column.Type.includes('datetime')) {
            input.setAttribute('type', 'time');
        } else if (column.Type.includes('datetime')) {
            input.setAttribute('type', 'datetime-local');
        } else {
            input.setAttribute('type', 'text');
        }

        // Set required attribute
        if (column.Null === 'NO' && column.Default === null) {
            input.setAttribute('required', 'true');
        }

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        addRecordForm.appendChild(formGroup);
    });

    addRecordModal.style.display = 'block';
});

// Close the modal
closeModal.addEventListener('click', () => {
    addRecordModal.style.display = 'none';
});

cancelRecordBtn.addEventListener('click', () => {
    addRecordModal.style.display = 'none';
});

// Submit the form
submitRecordBtn.addEventListener('click', async () => {
    const formData = {};

    // Collect form data
    const formElements = addRecordForm.elements;
    for (let i = 0; i < formElements.length; i++) {
        const element = formElements[i];
        if (element.name && element.value) {
            formData[element.name] = element.value;
        }
    }

    try {
        const response = await fetch(`/api/tables/${currentTable}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to add record');
        }

        // Close modal and refresh table
        addRecordModal.style.display = 'none';
        showNotification('Record added successfully!', 'success');
        selectTable(currentTable);
    } catch (error) {
        showNotification(error.message, 'error');
    }
});

// Delete a record
async function deleteRecord(id) {
    if (!confirm('Are you sure you want to delete this record?')) {
        return;
    }

    try {
        // Get primary key column name
        const primaryKeyColumn = tableStructure.find(col => col.Key === 'PRI');
        const primaryKeyName = primaryKeyColumn ? primaryKeyColumn.Field : `${currentTable}_id`;

        const response = await fetch(`/api/tables/${currentTable}/${id}?primaryKey=${primaryKeyName}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete record');
        }

        showNotification('Record deleted successfully!', 'success');
        selectTable(currentTable);
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Show notification
function showNotification(message, type = 'success') {
    notificationMessage.textContent = message;
    notification.className = 'notification show';

    if (type) {
        notification.classList.add(type);
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === addRecordModal) {
        addRecordModal.style.display = 'none';
    }
}); 