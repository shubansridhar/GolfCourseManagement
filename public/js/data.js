// public/js/data.js
import { authenticatedFetch } from './auth.js';
import { showNotification, showTableView } from './views.js';

const API_BASE_URL = '/api';

let currentTableStructure = [];
let currentPrimaryKeyField = '';

async function fetchTablesAndPopulateDashboard() {
    try {
        const placeholder = document.getElementById('dynamic-cards-placeholder');
        if (!placeholder) { console.error('#dynamic-cards-placeholder not found.'); return; }
        placeholder.innerHTML = '<div class="loading" style="grid-column: 1 / -1;"><i class="fas fa-spinner fa-spin"></i> Loading tables...</div>';
        const response = await authenticatedFetch(`${API_BASE_URL}/tables`);
        if (!response.ok) throw new Error('Failed to fetch tables');
        const tables = await response.json();
        populateDashboard(tables, placeholder);
    } catch (error) {
        console.error('Error fetching tables:', error);
        showNotification('Failed to load tables. Please try again.', 'error');
        const placeholder = document.getElementById('dynamic-cards-placeholder');
        if (placeholder) { placeholder.innerHTML = '<p class="no-tables error" style="grid-column: 1 / -1;">Failed to load tables.</p>'; }
    }
}

function populateDashboard(tables, targetElement) {
    if (!targetElement) return;
    if (!tables || tables.length === 0) { targetElement.innerHTML = '<p class="no-tables" style="grid-column: 1 / -1;">No tables available.</p>'; return; }
    const tableGroups = groupTablesByCategory(tables);
    let html = '';
    for (const category in tableGroups) {
        if(tableGroups[category].length > 0) { html += tableGroups[category].map(table => createTableCard(table)).join(''); }
    }
    targetElement.innerHTML = html;
    targetElement.querySelectorAll('.table-card.dynamic-card').forEach(card => {
        card.addEventListener('click', function () {
            const tableName = this.dataset.table;
            showTableView(tableName);
            loadTableData(tableName);
        });
    });
}

function groupTablesByCategory(tables) { const groups = { 'member': [], 'course': [], 'equipment': [], 'employee': [], 'other': [] }; tables.forEach(table => { if (table.startsWith('member') || table.includes('membership')) groups.member.push(table); else if (table.startsWith('course') || table.includes('hole') || table.includes('tee_time')) groups.course.push(table); else if (table.includes('equipment') || table.includes('rental')) groups.equipment.push(table); else if (table.includes('employee') || table.includes('staff')) groups.employee.push(table); else groups.other.push(table); }); for (const category in groups) if (groups[category].length === 0) delete groups[category]; return groups; }
function createTableCard(tableName) { let icon = 'table'; if (tableName.includes('member')) icon = 'users'; else if (tableName.includes('course') || tableName.includes('hole')) icon = 'golf-ball'; else if (tableName.includes('tee_time')) icon = 'calendar-alt'; else if (tableName.includes('equipment') || tableName.includes('rental')) icon = 'tools'; else if (tableName.includes('employee')) icon = 'user-tie'; else if (tableName.includes('manage')) icon = 'tasks'; return `<div class="table-card dynamic-card" data-table="${tableName}" style="cursor: pointer;"><div class="card-icon"><i class="fas fa-${icon}"></i></div><div class="card-details"><h4>${formatTableName(tableName)}</h4></div></div>`; }
function formatTableName(tableName) { return tableName.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase()); }
function formatCategoryName(category) { return category.charAt(0).toUpperCase() + category.slice(1) + ' Tables'; }


async function loadTableData(tableName) {
    currentTableStructure = []; currentPrimaryKeyField = '';
    try {
        const selectedTableElement = document.getElementById('selected-table');
        if (selectedTableElement && tableName) { selectedTableElement.textContent = formatTableName(tableName); }
        const addRecordBtn = document.getElementById('add-record-btn');
        if (addRecordBtn) { addRecordBtn.disabled = false; }
        window.currentTable = tableName;
        const dataTable = document.getElementById('data-table'); if (!dataTable) return; const thead = dataTable.querySelector('thead tr'); const tbody = dataTable.querySelector('tbody'); if (!thead || !tbody) return; thead.innerHTML = '<th>Loading...</th>'; tbody.innerHTML = '<tr><td colspan="1" class="loading-cell"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
        const [structureResponse, dataResponse] = await Promise.all([ authenticatedFetch(`${API_BASE_URL}/tables/${tableName}/structure`), authenticatedFetch(`${API_BASE_URL}/tables/${tableName}`)]); if (!structureResponse.ok || !dataResponse.ok) throw new Error('Failed fetch'); const structure = await structureResponse.json(); const tableData = await dataResponse.json(); currentTableStructure = structure; const pkCol = structure.find(c => c.Key === 'PRI'); currentPrimaryKeyField = pkCol ? pkCol.Field : (structure[0]?.Field || ''); if (!currentPrimaryKeyField) console.warn(`PK missing ${tableName}`); renderTableData(structure, tableData);
    } catch (error) { console.error('Err load table:', error); showNotification('Failed load table', 'error'); const tbody = document.querySelector('#data-table tbody'); if (tbody) tbody.innerHTML = `<tr><td colspan="1" class="error-table">Error loading data.</td></tr>`; }
}

function renderTableData(structure, tableData) {
    const dataTable = document.getElementById('data-table'); if (!dataTable) return; const thead = dataTable.querySelector('thead tr'); const tbody = dataTable.querySelector('tbody'); if (!thead || !tbody) return; thead.innerHTML = structure.map(col => `<th>${col.Field}</th>`).join('') + '<th>Actions</th>'; if (tableData.length === 0) { tbody.innerHTML = `<tr><td colspan="${structure.length + 1}" class="empty-table">No records</td></tr>`; return; }
    tbody.innerHTML = tableData.map(row => { const recordId = currentPrimaryKeyField ? row[currentPrimaryKeyField] : null; const actionsDisabled = !recordId ? 'disabled' : ''; return `<tr ${recordId ? `data-id="${recordId}"` : ''}> ${structure.map(col => `<td>${escapeHtml(formatCellValue(row[col.Field]))}</td>`).join('')} <td class="actions"><button class="btn-edit" ${actionsDisabled} title="Edit"><i class="fas fa-edit"></i></button><button class="btn-delete" ${actionsDisabled} title="Delete"><i class="fas fa-trash"></i></button></td></tr>`; }).join('');
    tbody.querySelectorAll('.btn-edit').forEach(btn => { btn.addEventListener('click', function (e) { e.stopPropagation(); const row = this.closest('tr'); if (row && row.dataset.id) editRecord(row.dataset.id); }); }); tbody.querySelectorAll('.btn-delete').forEach(btn => { btn.addEventListener('click', function (e) { e.stopPropagation(); const row = this.closest('tr'); if (row && row.dataset.id) deleteRecord(row.dataset.id); }); });
}

function formatCellValue(value) { if (value === null || value === undefined) return '-'; const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(.\d+)?Z?$/; if (typeof value === 'string' && dateRegex.test(value)) { const date = new Date(value); if (!isNaN(date.getTime())) return date.toLocaleDateString(); } if (typeof value === 'boolean') return value ? 'Yes' : 'No'; if (typeof value === 'object' && value !== null && value.type === 'Buffer' && Array.isArray(value.data)) return value.data[0] === 1 ? 'Yes' : 'No'; return value.toString(); }

async function loadAndRenderUsers() { const container = document.getElementById('user-list-container'); const tableBody = document.querySelector('#user-list-table tbody'); const loadingIndicator = container?.querySelector('.loading'); if (!container || !tableBody || !loadingIndicator) { console.error('User management elements missing.'); return; } loadingIndicator.style.display = 'block'; tableBody.innerHTML = ''; try { const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`); if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Server error'); } const users = await response.json(); if (users.length === 0) { tableBody.innerHTML = `<tr><td colspan="4" class="empty-table">No users found.</td></tr>`; } else { tableBody.innerHTML = users.map(user => `<tr><td>${user.user_id}</td><td>${escapeHtml(user.username)}</td><td>${escapeHtml(user.role)}</td><td>${new Date(user.created_at).toLocaleString()}</td></tr>`).join(''); } } catch (error) { console.error('Err load users:', error); showNotification(`Failed load users: ${error.message}`, 'error'); tableBody.innerHTML = `<tr><td colspan="4" class="error-table">Failed load users.</td></tr>`; } finally { loadingIndicator.style.display = 'none'; } }

function escapeHtml(unsafe) { if (unsafe === null || unsafe === undefined) return ''; return unsafe.toString().replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }

async function openAddRecordModal() {
    const tableName = window.currentTable; if (!tableName) { showNotification("No table selected.", "warning"); return; }
    let structure = currentTableStructure; if (!structure || structure.length === 0) { try { const response = await authenticatedFetch(`${API_BASE_URL}/tables/${tableName}/structure`); if (!response.ok) throw new Error('Failed fetch structure'); structure = await response.json(); currentTableStructure = structure; const pkCol = structure.find(c => c.Key === 'PRI'); currentPrimaryKeyField = pkCol ? pkCol.Field : (structure[0]?.Field || ''); } catch (error) { showNotification(error.message, "error"); return; } }
    const modal = document.getElementById('add-record-modal'); const modalTitle = document.getElementById('modal-title'); const form = document.getElementById('add-record-form'); if (!modal || !modalTitle || !form) { console.error("Add modal elements missing."); return; } modalTitle.textContent = `Add New Record to ${formatTableName(tableName)}`; form.innerHTML = '';
    structure.forEach(col => { if (col.Key === 'PRI' && col.Extra?.toLowerCase().includes('auto_increment')) return; const formGroup = document.createElement('div'); formGroup.className = 'form-group'; const label = document.createElement('label'); label.htmlFor = `add-${col.Field}`; label.textContent = col.Field; if (col.Null === 'NO' && !col.Extra?.toLowerCase().includes('auto_increment')) { label.textContent += ' *'; } formGroup.appendChild(label); let input; const fieldType = col.Type.toLowerCase(); if (fieldType.includes('text')) { input = document.createElement('textarea'); input.rows = 3; } else if (fieldType.includes('date')) { input = document.createElement('input'); input.type = 'date'; } else if (fieldType.includes('time')) { input = document.createElement('input'); input.type = 'time'; input.step = '1'; } else if (fieldType.includes('datetime') || fieldType.includes('timestamp')) { input = document.createElement('input'); input.type = 'datetime-local'; input.step = '1'; } else if (fieldType.includes('int') || fieldType.includes('decimal') || fieldType.includes('float') || fieldType.includes('double')) { input = document.createElement('input'); input.type = 'number'; if (!fieldType.includes('int')) input.step = 'any'; } else if (fieldType.includes('enum') || fieldType.includes('boolean') || fieldType.includes('tinyint(1)')) { input = document.createElement('select'); const defaultOpt = document.createElement('option'); defaultOpt.value = ""; defaultOpt.textContent = "-- Select --"; input.appendChild(defaultOpt); if (fieldType.includes('boolean') || fieldType.includes('tinyint(1)')) { const optT = document.createElement('option'); optT.value = "1"; optT.textContent = "Yes"; input.appendChild(optT); const optF = document.createElement('option'); optF.value = "0"; optF.textContent = "No"; input.appendChild(optF); } else { const matches = fieldType.match(/enum\((.*)\)/); if (matches && matches[1]) { matches[1].split(',').map(v => v.trim().replace(/^'|'$/g, '')).forEach(val => { const option = document.createElement('option'); option.value = val; option.textContent = val; input.appendChild(option); }); } else { input = document.createElement('input'); input.type = 'text'; } } } else { input = document.createElement('input'); input.type = 'text'; } input.id = `add-${col.Field}`; input.name = col.Field; formGroup.appendChild(input); form.appendChild(formGroup); }); modal.style.display = 'block';
}

async function handleAddRecordSubmit() {
    const tableName = window.currentTable; const form = document.getElementById('add-record-form'); if (!tableName || !form) { showNotification("Cannot submit: context missing.", "error"); return; }
    const formData = new FormData(form); const dataToSubmit = {}; let isValid = true; let missingRequiredFields = [];
    for (const [key, value] of formData.entries()) { const fieldStructure = currentTableStructure.find(col => col.Field === key); if (!fieldStructure) continue; const allowEmpty = fieldStructure.Null === 'YES'; const isAutoIncrement = fieldStructure.Extra?.toLowerCase().includes('auto_increment'); if (value === '' && !allowEmpty && !isAutoIncrement) { isValid = false; missingRequiredFields.push(key); } else if (value === '' && allowEmpty) { dataToSubmit[key] = null; } else if (value !== '') { dataToSubmit[key] = value; } }
    if (!isValid) { showNotification(`Fill required: ${missingRequiredFields.join(', ')}`, "error"); return; } if (Object.keys(dataToSubmit).length === 0 && currentTableStructure.some(col => !col.Extra?.toLowerCase().includes('auto_increment'))) { showNotification("No data entered.", "warning"); return; }
    try { const response = await authenticatedFetch(`${API_BASE_URL}/tables/${tableName}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSubmit) }); const result = await response.json(); if (!response.ok) { throw new Error(result.error || `Server error ${response.status}`); } showNotification('Record added!', 'success'); document.getElementById('add-record-modal').style.display = 'none'; loadTableData(tableName); } catch (error) { console.error("Error adding record:", error); showNotification(`Error adding: ${error.message}`, 'error'); }
}

async function deleteRecord(recordId) {
    const tableName = window.currentTable; const pkField = currentPrimaryKeyField; if (!tableName || !recordId || !pkField) { showNotification("Cannot delete: context missing.", "error"); return; } if (!confirm(`DELETE record where ${pkField}=${recordId} from ${formatTableName(tableName)}?`)) return;
    try { const url = `${API_BASE_URL}/tables/${tableName}/${recordId}?primaryKey=${encodeURIComponent(pkField)}`; const response = await authenticatedFetch(url, { method: 'DELETE' }); const result = await response.json(); if (!response.ok) { throw new Error(result.error || `Server error ${response.status}`); } showNotification('Deleted!', 'success'); loadTableData(tableName); } catch (error) { console.error("Error deleting:", error); showNotification(`Error deleting: ${error.message}`, 'error'); }
}

function editRecord(recordId) { console.log('Edit record:', recordId); showNotification("Edit functionality not implemented yet.", "info"); /* TODO */ }


// ---> ADD NEW FUNCTION to handle Add Admin submission <---
async function handleAddAdminSubmit() {
    const usernameInput = document.getElementById('add-admin-username');
    const passwordInput = document.getElementById('add-admin-password');
    const errorDiv = document.getElementById('add-admin-error');
    errorDiv.style.display = 'none';

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // *** Update password length check ***
    if (!username || !password) { errorDiv.textContent = 'Username and password required.'; errorDiv.style.display = 'block'; return; }
    if (password.length < 4) { errorDiv.textContent = 'Password must be at least 4 characters.'; errorDiv.style.display = 'block'; return; }

    try {
        const response = await authenticatedFetch(`${API_BASE_URL}/admin/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const result = await response.json();
        if (!response.ok) { throw new Error(result.error || `Failed add admin (Status: ${response.status})`); }
        showNotification(result.message || 'Admin created!', 'success');
        document.getElementById('add-admin-modal').style.display = 'none';
        loadAndRenderUsers(); // Refresh user list
    } catch (error) { console.error("Error adding admin:", error); errorDiv.textContent = error.message; errorDiv.style.display = 'block'; }
}
// ---------------------------------------------------------


// Export necessary functions including the new one
export {
    fetchTablesAndPopulateDashboard,
    loadTableData,
    loadAndRenderUsers,
    openAddRecordModal,
    handleAddRecordSubmit,
    handleAddAdminSubmit // <-- Export new function
};